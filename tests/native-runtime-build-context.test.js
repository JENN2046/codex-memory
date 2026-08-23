'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  assertContextGitAuthority,
  assertCleanExactRepository,
  materializeGitArchive,
  materializeExactRepository,
  pruneRuntimePackageLock,
  visitFiles
} = require('../scripts/generate-codex-memory-runtime-context');
const {
  buildDockerCreateArguments
} = require('../src/runtime/native-image/container-plan');
const {
  parseArguments
} = require('../deploy/native-runtime/host-launcher');

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-context-git-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Runtime Test']);
  git(root, ['config', 'user.email', 'runtime@example.invalid']);
  fs.writeFileSync(path.join(root, 'accepted.js'), 'module.exports = "A";\n');
  git(root, ['add', 'accepted.js']);
  git(root, ['commit', '-m', 'accepted']);
  return root;
}

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

test('exact clean Git repository is admitted', t => {
  const root = repository(t);
  assert.equal(assertCleanExactRepository(root, git(root, ['rev-parse', 'HEAD']), 'fixture'), root);
});
test('dirty tracked source is rejected before build-context materialization', t => {
  const root = repository(t);
  const head = git(root, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'accepted.js'), 'module.exports = "B";\n');
  expectCode(() => assertCleanExactRepository(root, head, 'fixture'),
    'fixture_repository_not_clean_exact');
});

test('untracked source is rejected before build-context materialization', t => {
  const root = repository(t);
  const head = git(root, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'untracked.js'), 'nope\n');
  expectCode(() => assertCleanExactRepository(root, head, 'fixture'),
    'fixture_repository_not_clean_exact');
});

test('wrong repository HEAD is rejected', t => {
  const root = repository(t);
  const first = git(root, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'second.js'), 'two\n');
  git(root, ['add', 'second.js']); git(root, ['commit', '-m', 'second']);
  expectCode(() => assertCleanExactRepository(root, first, 'fixture'),
    'fixture_repository_not_clean_exact');
});

test('Git archive materialization uses accepted commit after checkout mutation', t => {
  const root = repository(t);
  const head = git(root, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'accepted.js'), 'module.exports = "B";\n');
  const destination = path.join(os.tmpdir(), `runtime-archive-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(destination, { recursive: true, force: true }));
  materializeGitArchive(root, head, ['accepted.js'], destination, 'fixture');
  assert.equal(fs.readFileSync(path.join(destination, 'accepted.js'), 'utf8'),
    'module.exports = "A";\n');
});

test('final context artifact bytes are independently bound back to accepted Git blobs', t => {
  const root = repository(t);
  const head = git(root, ['rev-parse', 'HEAD']);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-context-authority-'));
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));
  fs.mkdirSync(path.join(staging, 'codex-memory'));
  const source = path.join(staging, 'codex-memory', 'accepted.js');
  const create = () => {
    const result = spawnSync('tar', ['--create', '--format=ustar', '--file=-',
      '--directory', staging, 'codex-memory'], { encoding: null });
    assert.equal(result.status, 0, result.stderr?.toString());
    return result.stdout;
  };
  fs.writeFileSync(source, 'module.exports = "A";\n');
  assert.equal(assertContextGitAuthority(create(), [{ commit: head,
    prefix: 'codex-memory', repository: root, selectedPaths: ['accepted.js'] }]), true);
  fs.writeFileSync(source, 'module.exports = "substituted";\n');
  expectCode(() => assertContextGitAuthority(create(), [{ commit: head,
    prefix: 'codex-memory', repository: root, selectedPaths: ['accepted.js'] }]),
  'runtime_context_git_authority_mismatch');
});

test('isolated authority repository has the exact accepted Git tree', t => {
  const root = repository(t);
  fs.writeFileSync(path.join(root, '.gitignore'), '*.node\n');
  fs.writeFileSync(path.join(root, 'governed.node'), 'tracked-native-artifact\n');
  git(root, ['add', '.gitignore']);
  git(root, ['add', '--force', 'governed.node']);
  git(root, ['commit', '-m', 'tracked ignored artifact']);
  const head = git(root, ['rev-parse', 'HEAD']);
  const destination = path.join(os.tmpdir(), `runtime-exact-repo-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(destination, { recursive: true, force: true }));
  materializeExactRepository(root, head, destination, 'fixture');
  assert.equal(git(destination, ['rev-parse', 'HEAD^{tree}']),
    git(root, ['rev-parse', `${head}^{tree}`]));
});

test('committed symlink is rejected from build context', t => {
  const root = repository(t);
  fs.symlinkSync('/etc/passwd', path.join(root, 'escape'));
  git(root, ['add', 'escape']); git(root, ['commit', '-m', 'symlink']);
  const destination = path.join(os.tmpdir(), `runtime-symlink-${process.pid}-${Date.now()}`);
  expectCode(() => materializeGitArchive(root, git(root, ['rev-parse', 'HEAD']),
    ['escape'], destination, 'fixture'), 'fixture_archive_path_unsafe');
});

test('file manifest is sorted and content-bound without symlinks', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-files-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'z')); fs.writeFileSync(path.join(root, 'z', 'b'), 'b');
  fs.writeFileSync(path.join(root, 'a'), 'a');
  assert.deepEqual(visitFiles(root).map(entry => entry.path), ['a', 'z/b']);
});

test('runtime npm closure keeps required nested dependency version and excludes unrelated packages', () => {
  const integrity = `sha512-${Buffer.from('integrity').toString('base64')}`;
  const source = {
    lockfileVersion: 3,
    packages: {
      '': { dependencies: { accepted: '1.0.0', unrelated: '9.0.0' } },
      'node_modules/accepted': {
        dependencies: { nested: '^1.0.0' }, integrity, version: '1.0.0'
      },
      'node_modules/accepted/node_modules/nested': {
        integrity, version: '1.2.0'
      },
      'node_modules/nested': { integrity, version: '2.0.0' },
      'node_modules/unrelated': { integrity, version: '9.0.0' }
    }
  };
  const result = pruneRuntimePackageLock(source, { accepted: '1.0.0' });
  assert.deepEqual(Object.keys(result.lock.packages), [
    '', 'node_modules/accepted', 'node_modules/accepted/node_modules/nested'
  ]);
  assert.equal(Object.hasOwn(result.lock.packages, 'node_modules/unrelated'), false);
});

function createPlan() {
  return buildDockerCreateArguments({
    authoritySource: '/synthetic/authority.json',
    edgeReceiptSource: '/synthetic/edge-receipt.json',
    imageConfigId: `sha256:${'1'.repeat(64)}`,
    name: 'codex-memory-runtime-test',
    primaryStateDestination: '/synthetic/container/r5c',
    primaryStateSource: '/synthetic/r5c',
    profileSource: '/synthetic/profile.json',
    providerReceiptSource: '/synthetic/provider-receipt.json',
    providerEnvironmentSource: '/etc/codex-memory/vcp-provider.env',
    runtimeDirectorySource: '/synthetic/runtime'
  });
}

test('container plan is non-root, read-only, host-networked, capability-free', () => {
  const args = createPlan();
  for (const value of [
    '--read-only', '1000:1000', 'host', 'no', 'ALL',
    'no-new-privileges:true'
  ]) assert.equal(args.includes(value), true, value);
});

test('container plan has no Docker socket or application code bind mount', () => {
  const joined = createPlan().join('\n');
  assert.equal(joined.includes('/var/run/docker.sock'), false);
  assert.equal(joined.includes('dst=/opt/codex-memory'), false);
  assert.equal(joined.includes('dst=/opt/vcptoolbox'), false);
});

test('container plan emits XDG_RUNTIME_DIR exactly once with the canonical value', () => {
  const args = createPlan();
  const xdg = args.filter(value =>
    value === 'XDG_RUNTIME_DIR=/run/codex-memory-runtime-data');
  assert.equal(xdg.length, 1);
  assert.equal(args[args.indexOf(xdg[0]) - 1], '--env');
});

test('container plan rejects a non-canonical Provider environment source', () => {
  const options = {
    authoritySource: '/synthetic/authority.json',
    edgeReceiptSource: '/synthetic/edge-receipt.json',
    imageConfigId: `sha256:${'1'.repeat(64)}`,
    name: 'codex-memory-runtime-test',
    primaryStateDestination: '/synthetic/container/r5c',
    primaryStateSource: '/synthetic/r5c',
    profileSource: '/synthetic/profile.json',
    providerReceiptSource: '/synthetic/provider-receipt.json',
    providerEnvironmentSource: '/var/lib/codex-memory/provider.env',
    runtimeDirectorySource: '/synthetic/runtime'
  };
  expectCode(() => buildDockerCreateArguments(options),
    'runtime_container_provider_environment_source_invalid');
});

test('host launcher accepts only bounded /etc authority path', () => {
  assert.deepEqual(parseArguments([
    'verify', '--authority=/etc/codex-memory/native-runtime-authority.json'
  ]), {
    authorityFile: '/etc/codex-memory/native-runtime-authority.json',
    command: 'verify'
  });
  expectCode(() => parseArguments([
    'verify', '--authority=/tmp/authority.json'
  ]), 'host_launcher_authority_path_invalid');
});

test('Dockerfile pins platform manifest and prohibits runtime installation', () => {
  const source = fs.readFileSync(path.join(
    __dirname, '..', 'deploy', 'native-runtime', 'Dockerfile'
  ), 'utf8');
  assert.match(source, /FROM node@sha256:8607a906/u);
  assert.match(source, /^# syntax=docker\/dockerfile:1\.7@sha256:[a-f0-9]{64}$/mu);
  assert.doesNotMatch(source, /FROM\s+node:[^@\s]+/u);
  assert.match(source, /USER 1000:1000/u);
  assert.match(source, /_container-supervisor/u);
  assert.match(source, /NODE_DISABLE_COMPILE_CACHE=1/u);
  assert.match(source, /rm -rf \/root\/\.npm \/tmp\/node-compile-cache/u);
  assert.match(source, /rm -f \/var\/cache\/ldconfig\/aux-cache \/var\/log\/dpkg\.log/u);
  assert.match(source, /rm -f \\\n+      rust-vexus-lite\/vexus-lite\.darwin-arm64\.node/u);
  assert.doesNotMatch(source, /rm -f \\\n+      rust-vexus-lite\/vexus-lite\.linux-x64-gnu\.node/u);
});

test('OCI builder normalizes layer timestamps and disables mutable attestations', () => {
  const source = fs.readFileSync(path.join(
    __dirname, '..', 'scripts', 'build-codex-memory-runtime-image.js'
  ), 'utf8');
  assert.match(source, /rewrite-timestamp=true/u);
  assert.match(source, /--provenance=false/u);
  assert.match(source, /--sbom=false/u);
});

test('systemd candidate uses root-owned installed launcher, not checkout', () => {
  const source = fs.readFileSync(path.join(
    __dirname, '..', 'deploy', 'systemd',
    'codex-memory-native-runtime.service'
  ), 'utf8');
  assert.match(source, /^User=root$/mu);
  assert.match(source, /^Type=simple$/mu);
  assert.match(source, /host-launcher\.js run --authority=/u);
  assert.match(source, /^Restart=on-failure$/mu);
  assert.match(source, /^RuntimeDirectory=codex-memory$/mu);
  assert.match(source,
    /\/usr\/local\/lib\/codex-memory-native-runtime\/deploy\/native-runtime\/host-launcher\.js/u);
  assert.doesNotMatch(source, /\/home\/jenn|AGENTS_OS_Workspace/u);
});

test('container-supervisor implementation has no Docker invocation or checkout fallback', () => {
  const source = fs.readFileSync(path.join(
    __dirname, '..', 'scripts', 'codex-memory-stack.js'
  ), 'utf8');
  const start = source.indexOf('async function runContainerSupervisor(');
  const end = source.indexOf('\nfunction printJson(', start);
  const supervisor = source.slice(start, end);
  assert.doesNotMatch(supervisor, /runDocker|dockerText|inspectSourceCompatibility|gitText/u);
});
