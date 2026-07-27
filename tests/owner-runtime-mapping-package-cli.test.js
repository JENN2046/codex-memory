'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const cliPath = path.join('src', 'cli', 'owner-runtime-mapping-package.js');
const workspaceRoot = path.resolve(__dirname, '..');

function syntheticMapping() {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [{
      partitionReference: 'synthetic-owner-cli-project-v1',
      diaryName: 'SYNTHETIC_OWNER_CLI_DIARY',
      classification: 'project_shared',
      clientId: null,
      projectId: 'codex-memory',
      workspaceId: null,
      readProfiles: ['exact_visibility', 'task_start_context'],
      writeEligible: false
    }]
  };
}

function makeFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-mapping-cli-'));
  fs.chmodSync(base, 0o700);
  const sourceDirectory = path.join(base, 'source');
  const privateRoot = path.join(base, 'private-root');
  fs.mkdirSync(sourceDirectory, { mode: 0o700 });
  fs.mkdirSync(privateRoot, { mode: 0o700 });
  fs.chmodSync(sourceDirectory, 0o700);
  fs.chmodSync(privateRoot, 0o700);
  const mappingSource = path.join(sourceDirectory, 'mapping.json');
  fs.writeFileSync(mappingSource, JSON.stringify(syntheticMapping()), { mode: 0o600 });
  fs.chmodSync(mappingSource, 0o600);
  return {
    base,
    mappingSource,
    packageName: 'readonly-context-v2',
    privateRoot
  };
}

function cleanup(base) {
  fs.rmSync(base, { recursive: true, force: true });
}

function runCli(args, { timeout = 30_000 } = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout
  });
}

function commonArgs(fixture) {
  return [
    '--mapping-source', fixture.mappingSource,
    '--private-root', fixture.privateRoot,
    '--package-name', fixture.packageName,
    '--json'
  ];
}

function assertLowDisclosure(stdout, fixture) {
  assert.equal(stdout.includes(fixture.mappingSource), false);
  assert.equal(stdout.includes(fixture.privateRoot), false);
  assert.equal(stdout.includes('SYNTHETIC_OWNER_CLI_DIARY'), false);
  assert.equal(stdout.includes('jenn-vcp-diary-scope-v1'), false);
  assert.equal(stdout.includes('sha256:'), false);
}

test('CLI separates plan, confirmed apply, and check with low-disclosure receipts', () => {
  const fixture = makeFixture();
  try {
    const planned = runCli(['plan', ...commonArgs(fixture)]);
    assert.equal(planned.status, 0, planned.stderr);
    assert.equal(JSON.parse(planned.stdout).status, 'PLAN_VALID');
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
    assertLowDisclosure(planned.stdout, fixture);

    const unconfirmed = runCli(['apply', ...commonArgs(fixture)]);
    assert.equal(unconfirmed.status, 1);
    const unconfirmedReport = JSON.parse(unconfirmed.stdout);
    assert.equal(
      unconfirmedReport.code,
      'owner_mapping_private_config_confirmation_required'
    );
    assert.equal(unconfirmedReport.config_write_performed, false);
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
    assertLowDisclosure(unconfirmed.stdout, fixture);

    const applied = runCli([
      'apply',
      ...commonArgs(fixture),
      '--confirm-private-config-write'
    ]);
    assert.equal(applied.status, 0, applied.stderr);
    const appliedReport = JSON.parse(applied.stdout);
    assert.equal(appliedReport.status, 'APPLIED');
    assert.equal(appliedReport.config_write_performed, true);
    assert.equal(appliedReport.durably_committed, true);
    assertLowDisclosure(applied.stdout, fixture);

    const checked = runCli([
      'check',
      '--private-root', fixture.privateRoot,
      '--package-name', fixture.packageName,
      '--json'
    ]);
    assert.equal(checked.status, 0, checked.stderr);
    assert.equal(JSON.parse(checked.stdout).status, 'VALID');
    assertLowDisclosure(checked.stdout, fixture);
  } finally {
    cleanup(fixture.base);
  }
});

test('CLI rejects command-specific argument drift and documents authority boundaries', () => {
  const fixture = makeFixture();
  try {
    const invalid = runCli([
      'check',
      ...commonArgs(fixture),
      '--confirm-private-config-write'
    ]);
    assert.equal(invalid.status, 1);
    assert.equal(JSON.parse(invalid.stdout).code, 'owner_mapping_argument_invalid');
    assertLowDisclosure(invalid.stdout, fixture);

    const help = runCli(['--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /plan validates without writing/);
    assert.match(help.stdout, /apply performs an explicit private-configuration write/);
    assert.match(help.stdout, /does not grant an agent authorization/);
  } finally {
    cleanup(fixture.base);
  }
});

test('check rejects FIFO package entries without blocking', (t) => {
  const fixture = makeFixture();
  try {
    const applied = runCli([
      'apply',
      ...commonArgs(fixture),
      '--confirm-private-config-write'
    ]);
    assert.equal(applied.status, 0, applied.stderr);

    const mappingPath = path.join(
      fixture.privateRoot,
      fixture.packageName,
      'diary-scope-mapping.json'
    );
    fs.unlinkSync(mappingPath);
    const mkfifo = spawnSync('mkfifo', [mappingPath], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      timeout: 5_000
    });
    if (mkfifo.status !== 0) {
      t.skip('mkfifo is unavailable on this platform');
      return;
    }
    fs.chmodSync(mappingPath, 0o600);

    const checked = runCli([
      'check',
      '--private-root', fixture.privateRoot,
      '--package-name', fixture.packageName,
      '--json'
    ], {
      timeout: 5_000
    });
    assert.equal(checked.error, undefined, checked.error?.message);
    assert.equal(checked.status, 1, checked.stderr);
    assert.equal(
      JSON.parse(checked.stdout).code,
      'owner_mapping_package_mapping_invalid'
    );
    assertLowDisclosure(checked.stdout, fixture);
  } finally {
    cleanup(fixture.base);
  }
});

test('desktop launchers are repository-relative and WSL distribution is configurable', () => {
  const linuxPath = path.join(
    workspaceRoot,
    'scripts',
    'launch-owner-runtime-mapping-package.sh'
  );
  const windowsPath = path.join(
    workspaceRoot,
    'scripts',
    'launch-owner-runtime-mapping-package-windows.bat'
  );
  const noReplaceHelperPath = path.join(
    workspaceRoot,
    'scripts',
    'owner-mapping-rename-noreplace.py'
  );
  const linux = fs.readFileSync(linuxPath, 'utf8');
  const windows = fs.readFileSync(windowsPath, 'utf8');
  const noReplaceHelper = fs.readFileSync(noReplaceHelperPath, 'utf8');

  assert.match(linux, /owner-runtime:mapping-package/);
  assert.match(linux, /WRITE PRIVATE CONFIG/);
  assert.doesNotMatch(linux, /\/home\/jenn/);

  const shellCheck = spawnSync('bash', ['-n', linuxPath], { encoding: 'utf8' });
  assert.equal(shellCheck.status, 0, shellCheck.stderr);

  assert.match(windows, /for %%I in \("%~dp0\.\."\) do set "REPO_ROOT=%%~fI"/);
  assert.match(windows, /CODEX_MEMORY_WSL_DISTRO/);
  assert.match(windows, /--cd "%REPO_ROOT%"/);
  assert.doesNotMatch(windows, /\/home\/jenn/);
  assert.doesNotMatch(windows, /Ubuntu-24\.04/);

  assert.equal(fs.statSync(noReplaceHelperPath).mode & 0o777, 0o755);
  assert.match(noReplaceHelper, /RENAME_NOREPLACE = 1/);
  assert.match(noReplaceHelper, /\.renameat2/);
  assert.doesNotMatch(noReplaceHelper, /\bprint\s*\(/);
});
