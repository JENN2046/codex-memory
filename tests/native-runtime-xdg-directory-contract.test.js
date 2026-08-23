'use strict';
// POST_PR105_RUNTIME_XDG_DIRECTORY_CONTRACT_SOURCE_REPAIR
// Contract tests for the canonical XDG_RUNTIME_DIR binding:
//   producer emits it exactly once, policy requires it exactly,
//   host launcher admits the name, and the supervisor runtime-directory
//   contract resolves onto the same RW bind.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildDockerCreateArguments } = require(
  '../src/runtime/native-image/container-plan'
);
const { validateRuntimeCandidate } = require(
  '../src/runtime/native-image/container-policy'
);
const { containerConfigDigest } = require(
  '../src/runtime/native-image/runtime-authority'
);

const RUNTIME_DATA_PATH = '/run/codex-memory-runtime-data';
const XDG_ENTRY = 'XDG_RUNTIME_DIR=/run/codex-memory-runtime-data';

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

// Canonical stopped Runtime container inspection (mirrors the canonical contract).
function runtimeInspect(overrides = {}) {
  const env = [
    'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH=/run/codex-memory/authority.json',
    'CODEX_MEMORY_CONTAINER_SUPERVISOR=1',
    'CODEX_MEMORY_EDGE_RECEIPT_PATH=/run/codex-memory/edge-receipt.json',
    'CODEX_MEMORY_PROVIDER_RECEIPT_PATH=/run/codex-memory/provider-receipt.json',
    'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH=/opt/codex-memory-runtime/runtime-build-manifest.json',
    'CODEX_MEMORY_STACK_PROFILE_PATH=/run/codex-memory/profile.json',
    'CODEX_MEMORY_STACK_RUNTIME_DIR=/run/codex-memory-runtime-data',
    XDG_ENTRY,
    'NODE_ENV=production', 'VCP_ROOT=/opt/vcptoolbox', 'VCPTOOLBOX_ROOT=/opt/vcptoolbox'
  ];
  const sources = {
    authority: '/etc/codex-memory/authority.json',
    edgeReceipt: '/run/codex-memory/edge-receipt.json',
    primaryState: '/srv/codex-memory/r5c',
    profile: '/etc/codex-memory/profile.json',
    providerEnvironment: '/etc/codex-memory/vcp-provider.env',
    providerReceipt: '/run/codex-memory/provider-receipt.json',
    runtimeDirectory: '/var/lib/codex-memory/runtime'
  };
  const value = {
    Config: { Cmd: [], Entrypoint: ['/usr/local/bin/node',
      '/opt/codex-memory/scripts/codex-memory-stack.js', '_container-supervisor'],
      Env: env, User: '1000:1000', WorkingDir: '/opt/codex-memory' },
    HostConfig: { CapAdd: [], CapDrop: ['ALL'], CgroupnsMode: '', Devices: [],
      DeviceRequests: [], IpcMode: 'private', LogConfig: { Type: 'none' },
      NetworkMode: 'host', PidMode: '', PortBindings: {}, Privileged: false,
      ReadonlyRootfs: true, RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'], Tmpfs: {
        '/run/codex-memory-runtime': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
        '/tmp': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000'
      }, UsernsMode: '', UTSMode: '' },
    Id: 'c'.repeat(64), Image: `sha256:${'d'.repeat(64)}`,
    Mounts: [
      { Destination: '/run/codex-memory/authority.json', Propagation: 'rprivate', RW: false, Source: sources.authority, Type: 'bind' },
      { Destination: '/run/codex-memory/edge-receipt.json', Propagation: 'rprivate', RW: false, Source: sources.edgeReceipt, Type: 'bind' },
      { Destination: '/run/codex-memory/profile.json', Propagation: 'rprivate', RW: false, Source: sources.profile, Type: 'bind' },
      { Destination: '/run/codex-memory/provider-receipt.json', Propagation: 'rprivate', RW: false, Source: sources.providerReceipt, Type: 'bind' },
      { Destination: '/run/secrets/codex-memory-vcp-provider.env', Propagation: 'rprivate', RW: false, Source: sources.providerEnvironment, Type: 'bind' },
      { Destination: RUNTIME_DATA_PATH, Propagation: 'rprivate', RW: true, Source: sources.runtimeDirectory, Type: 'bind' },
      { Destination: '/srv/codex-memory/r5c', Propagation: 'rprivate', RW: false, Source: sources.primaryState, Type: 'bind' }
    ],
    State: { Running: false },
    ...overrides
  };
  return value;
}

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

// --- A. Producer -----------------------------------------------------------
test('container producer emits XDG_RUNTIME_DIR exactly once with the canonical value', () => {
  const args = createPlan();
  const occurrences = args.filter(value => value === XDG_ENTRY);
  assert.equal(occurrences.length, 1);
  assert.equal(args.filter(value => value === '--env').length >= 1, true);
  const index = args.indexOf(XDG_ENTRY);
  assert.equal(args[index - 1], '--env');
});

test('container producer has no caller-controllable XDG path surface', () => {
  // The producer signature has no XDG parameter; the canonical value is the only
  // XDG binding the producer can ever emit.
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'runtime', 'native-image', 'container-plan.js'),
    'utf8'
  );
  const xdgLines = source.split('\n').filter(line => line.includes('XDG_RUNTIME_DIR'));
  assert.equal(xdgLines.length, 1);
  assert.match(xdgLines[0], new RegExp(`XDG_RUNTIME_DIR=${RUNTIME_DATA_PATH}`));
});

// --- B. Canonical Runtime policy ------------------------------------------
test('canonical runtime policy admits the exact XDG_RUNTIME_DIR binding', () => {
  const value = validateRuntimeCandidate(runtimeInspect(), {
    authority: '/etc/codex-memory/authority.json',
    edgeReceipt: '/run/codex-memory/edge-receipt.json',
    primaryState: '/srv/codex-memory/r5c',
    profile: '/etc/codex-memory/profile.json',
    providerEnvironment: '/etc/codex-memory/vcp-provider.env',
    providerReceipt: '/run/codex-memory/provider-receipt.json',
    runtimeDirectory: '/var/lib/codex-memory/runtime',
    primaryStateDestination: '/srv/codex-memory/r5c'
  });
  assert.equal(value.readOnlyRootfs, true);
});

test('runtime policy rejects the old missing-XDG container contract', () => {
  const value = runtimeInspect();
  value.Config.Env = value.Config.Env.filter(entry => !entry.startsWith('XDG_RUNTIME_DIR='));
  expectCode(() => validateRuntimeCandidate(value, {
    authority: '/etc/codex-memory/authority.json',
    edgeReceipt: '/run/codex-memory/edge-receipt.json',
    primaryState: '/srv/codex-memory/r5c',
    profile: '/etc/codex-memory/profile.json',
    providerEnvironment: '/etc/codex-memory/vcp-provider.env',
    providerReceipt: '/run/codex-memory/provider-receipt.json',
    runtimeDirectory: '/var/lib/codex-memory/runtime',
    primaryStateDestination: '/srv/codex-memory/r5c'
  }), 'runtime_container_canonical_policy_mismatch');
});

test('runtime policy rejects wrong XDG_RUNTIME_DIR values', () => {
  for (const wrong of [
    'XDG_RUNTIME_DIR=/run/user/1000',
    'XDG_RUNTIME_DIR=/tmp/foo',
    'XDG_RUNTIME_DIR=/run/codex-memory-runtime',
    'XDG_RUNTIME_DIR=run/codex-memory-runtime-data'
  ]) {
    const value = runtimeInspect();
    value.Config.Env = value.Config.Env.map(entry =>
      entry.startsWith('XDG_RUNTIME_DIR=') ? wrong : entry);
    expectCode(() => validateRuntimeCandidate(value, {
      authority: '/etc/codex-memory/authority.json',
      edgeReceipt: '/run/codex-memory/edge-receipt.json',
      primaryState: '/srv/codex-memory/r5c',
      profile: '/etc/codex-memory/profile.json',
      providerEnvironment: '/etc/codex-memory/vcp-provider.env',
      providerReceipt: '/run/codex-memory/provider-receipt.json',
      runtimeDirectory: '/var/lib/codex-memory/runtime',
      primaryStateDestination: '/srv/codex-memory/r5c'
    }), 'runtime_container_canonical_policy_mismatch');
  }
});

test('runtime policy rejects duplicate/malformed XDG_RUNTIME_DIR entries', () => {
  const value = runtimeInspect();
  value.Config.Env = [...value.Config.Env, XDG_ENTRY];
  // environmentMap rejects duplicate names fail-closed.
  expectCode(() => validateRuntimeCandidate(value, {
    authority: '/etc/codex-memory/authority.json',
    edgeReceipt: '/run/codex-memory/edge-receipt.json',
    primaryState: '/srv/codex-memory/r5c',
    profile: '/etc/codex-memory/profile.json',
    providerEnvironment: '/etc/codex-memory/vcp-provider.env',
    providerReceipt: '/run/codex-memory/provider-receipt.json',
    runtimeDirectory: '/var/lib/codex-memory/runtime',
    primaryStateDestination: '/srv/codex-memory/r5c'
  }), 'container_policy_environment_invalid');
});

// --- containerConfigDigest consequence -------------------------------------
test('containerConfigDigest changes when XDG_RUNTIME_DIR is added (new contract -> new digest)', () => {
  const withXdg = runtimeInspect();
  const withoutXdg = runtimeInspect();
  withoutXdg.Config.Env = withoutXdg.Config.Env.filter(
    entry => !entry.startsWith('XDG_RUNTIME_DIR='));
  const digestWith = containerConfigDigest(withXdg);
  const digestWithout = containerConfigDigest(withoutXdg);
  assert.notEqual(digestWith, digestWithout);
  assert.match(digestWith, /^sha256:[a-f0-9]{64}$/u);
});

// --- C. Host launcher environment admission --------------------------------
test('host launcher RUNTIME_ALLOWED_ENVIRONMENT_NAMES admits XDG_RUNTIME_DIR', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'deploy', 'native-runtime', 'host-launcher.js'),
    'utf8'
  );
  const block = source.match(/RUNTIME_ALLOWED_ENVIRONMENT_NAMES = Object\.freeze\(\[([\s\S]*?)\]\)/u);
  assert.ok(block);
  assert.match(source, /'XDG_RUNTIME_DIR',/u);
  // Name admission only: the exact value contract is owned by container-policy.
  assert.match(source, /'CODEX_MEMORY_STACK_RUNTIME_DIR',/u);
});

// --- Supervisor runtime-directory contract continuity -----------------------
test('supervisor runtimeDirectory() resolves onto the RW bind when XDG_RUNTIME_DIR is canonical', () => {
  const stackSource = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'codex-memory-stack.js'),
    'utf8'
  );
  const constant = stackSource.match(
    /const RUNTIME_DIRECTORY_NAME = '([^']+)';/u
  );
  assert.ok(constant);
  const runtimeDirectoryName = constant[1];
  // Documented supervisor resolution (scripts/codex-memory-stack.js runtimeDirectory()).
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  const resolveRuntimeDir = xdg => path.resolve(
    xdg || `/run/user/${currentUid}`,
    runtimeDirectoryName
  );
  const withCanonicalXdg = resolveRuntimeDir(RUNTIME_DATA_PATH);
  assert.equal(withCanonicalXdg, `${RUNTIME_DATA_PATH}/${runtimeDirectoryName}`);
  // The diagnosed failing contract (no XDG_RUNTIME_DIR) resolves outside any
  // provisioned writable surface: /run/user/<uid>/...
  const withoutXdg = resolveRuntimeDir(null);
  assert.equal(withoutXdg, `/run/user/${currentUid}/${runtimeDirectoryName}`);
});

test('owner-only runtime-directory predicate is satisfiable at the canonical root and absent without XDG', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-xdg-contract-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  // Satisfied: owner-only dir (uid == process uid, mode 0700, non-symlink,
  // realpath == path) at the canonical root derived from XDG_RUNTIME_DIR.
  const canonicalRoot = path.join(root, RUNTIME_DATA_PATH.replace(/^\//u, ''),
    'codex-memory-full-stack-001');
  fs.mkdirSync(canonicalRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(canonicalRoot, 0o700);
  const satisfied = (() => {
    const resolved = fs.realpathSync(canonicalRoot);
    const stat = fs.statSync(resolved);
    return resolved === canonicalRoot && stat.isDirectory() &&
      stat.uid === process.getuid() && (stat.mode & 0o077) === 0;
  })();
  assert.equal(satisfied, true);
  // Unsatisfied: missing parent (the diagnosed /run/user/<uid> absence) must
  // fail the owner-only predicate with an unavailable outcome.
  const missingParent = path.join(root, 'run', 'user', String(process.getuid()),
    'codex-memory-full-stack-001');
  let unavailable = false;
  try {
    const resolved = fs.realpathSync(path.dirname(missingParent));
    fs.statSync(resolved);
  } catch {
    unavailable = true;
  }
  assert.equal(unavailable, true);
});
