const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  DEFAULT_FIXTURE_PATH,
  PUBLIC_MCP_TOOLS,
  getExitCode,
  parseArgs
} = require('../src/cli/migration-import-export-dry-run-gate');

const cliPath = path.join('src', 'cli', 'migration-import-export-dry-run-gate.js');
const workspaceRoot = path.resolve(__dirname, '..');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('migration import-export dry-run gate CLI emits fixture-only JSON', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.schema, 'codex-memory.migration-import-export-dry-run-gate.v1');
  assert.equal(report.phase, 'P26.1-migration-import-export-dry-run-gate-fixture-contract');
  assert.equal(report.fixtureOnly, true);
  assert.equal(report.synthetic, true);
  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.nextStep, 'review-dry-run-evidence-before-apply-approval');
});

test('migration import-export dry-run gate CLI preserves current bounded public MCP surface', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.deepEqual(report.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.equal(report.safetyFlags.publicMcpExpansion, false);
});

test('migration import-export dry-run gate CLI keeps all safety flags non-mutating', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.mutated, false);
  assert.equal(report.providerCalls, 0);
  assert.equal(report.safetyFlags.realMemoryScan, false);
  assert.equal(report.safetyFlags.realMemoryExport, false);
  assert.equal(report.safetyFlags.realMemoryImport, false);
  assert.equal(report.safetyFlags.migrationApply, false);
  assert.equal(report.safetyFlags.importExportApply, false);
  assert.equal(report.safetyFlags.backupRestore, false);
  assert.equal(report.safetyFlags.durableWrites, false);
  assert.equal(report.safetyFlags.providerCalls, false);
  assert.equal(report.safetyFlags.push, false);
  assert.equal(report.safetyFlags.tag, false);
  assert.equal(report.safetyFlags.release, false);
  assert.equal(report.safetyFlags.deploy, false);
  assert.equal(report.evidence.secretWorkspaceExposure.rawSecretExposed, false);
  assert.equal(report.evidence.secretWorkspaceExposure.rawWorkspaceExposed, false);
});

test('migration import-export dry-run gate CLI rejects unsafe flags with valid JSON', () => {
  for (const flag of ['--apply', '--confirm', '--migrate', '--import', '--export', '--backup', '--restore', '--real-memory', '--provider', '--push', '--tag', '--release', '--deploy']) {
    const result = runCli(['--json', flag]);

    assert.equal(result.status, 1, flag);
    const report = parseJsonResult(result);
    assert.equal(report.status, 'blocked', flag);
    assert.equal(report.decision, 'DRY_RUN_INVALID_INPUT', flag);
    assert.equal(report.error.code, 'UNSAFE_FLAG_REJECTED', flag);
    assert.equal(report.error.rejectedFlag, flag);
    assert.equal(report.error.failClosed, true);
    assert.equal(report.mutated, false, flag);
    assert.equal(report.providerCalls, 0, flag);
    assert.deepEqual(report.publicMcpTools, PUBLIC_MCP_TOOLS, flag);
    assert.equal(report.safetyFlags.realMemoryScan, false, flag);
    assert.equal(report.safetyFlags.realMemoryExport, false, flag);
    assert.equal(report.safetyFlags.realMemoryImport, false, flag);
    assert.equal(report.safetyFlags.migrationApply, false, flag);
    assert.equal(report.safetyFlags.importExportApply, false, flag);
    assert.equal(report.safetyFlags.backupRestore, false, flag);
    assert.equal(report.safetyFlags.durableWrites, false, flag);
    assert.equal(report.safetyFlags.providerCalls, false, flag);
    assert.equal(report.safetyFlags.publicMcpExpansion, false, flag);
    assert.equal(report.safetyFlags.push, false, flag);
    assert.equal(report.safetyFlags.tag, false, flag);
    assert.equal(report.safetyFlags.release, false, flag);
    assert.equal(report.safetyFlags.deploy, false, flag);
  }
});

test('migration import-export dry-run gate CLI rejects non-fixture source modes', () => {
  const result = runCli(['--json', '--source-mode', 'real-memory-preview']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.decision, 'DRY_RUN_INVALID_INPUT');
  assert.equal(report.error.code, 'INVALID_INPUT');
  assert.equal(report.error.failClosed, true);
  assert.equal(report.mutated, false);
  assert.equal(report.providerCalls, 0);
});

test('migration import-export dry-run gate CLI emits readable text without raw paths', () => {
  const result = runCli([]);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /fixtureOnly: true/);
  assert.match(result.stdout, /mutated: false/);
  assert.match(result.stdout, /providerCalls: 0/);
  assert.doesNotMatch(result.stdout, /[A-Z]:[\\/]/);
  assert.doesNotMatch(result.stdout, /tests[\\/]fixtures/);
});

test('migration import-export dry-run gate CLI help exits without reading live sources', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /Usage: node src\/cli\/migration-import-export-dry-run-gate\.js/);
  assert.match(result.stdout, /reads only tests\/fixtures\/migration-import-export-dry-run-gate-v1\.json/);
  assert.match(result.stdout, /never scans real memory/);
  assert.throws(() => JSON.parse(result.stdout), SyntaxError);
});

test('migration import-export dry-run gate CLI output does not expose raw secrets or raw workspace ids', () => {
  const output = runCli(['--json']).stdout;

  assert.equal(/password\s*[=:]/i.test(output), false);
  assert.equal(/bearer\s+[a-z0-9._-]+/i.test(output), false);
  assert.equal(/api[_-]?key\s*[=:]/i.test(output), false);
  assert.equal(/authorization\s*:/i.test(output), false);
  assert.equal(/raw_workspace_id/i.test(output), false);
  assert.equal(/workspace-[a-z0-9-]{8,}/i.test(output), false);
  assert.equal(/"workspace_id"\s*:/i.test(output), false);
});

test('migration import-export dry-run gate CLI parses supported flags', () => {
  assert.deepEqual(parseArgs(['--json', '--source-mode', 'fixture']), {
    json: true,
    help: false,
    sourceMode: 'fixture',
    rejectedFlag: null,
    invalidInput: null
  });
});

test('migration import-export dry-run gate CLI exports the default fixture path', () => {
  assert.equal(
    DEFAULT_FIXTURE_PATH,
    path.join(workspaceRoot, 'tests', 'fixtures', 'migration-import-export-dry-run-gate-v1.json')
  );
});

test('migration import-export dry-run gate CLI exit-code helper fails closed only for invalid input', () => {
  assert.equal(getExitCode({ decision: 'NOT_READY_BLOCKED' }), 0);
  assert.equal(getExitCode({ decision: 'DRY_RUN_INVALID_INPUT' }), 1);
});

test('migration import-export dry-run gate CLI package manifests remain untouched', () => {
  const result = spawnSync('git', ['diff', '--name-only', '--', 'package.json', 'package-lock.json'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '');
});
