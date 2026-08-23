'use strict';
// HOST_LAUNCHER_LIFECYCLE_REENTRY_AND_LOCK_OWNERSHIP_REPAIR
//
// Real production-CLI boundary tests for deploy/native-runtime/host-launcher.js.
// Unlike unit tests (which call exported functions with DI), these spawn the
// ACTUAL host-launcher entrypoint as a child process so the
// `require.main === module` branch really executes.
//
// A test-only preload (injected via NODE_OPTIONS, which survives the
// lifecycle-lock re-entry because bash re-execs with the same env) does:
//   (a) fakes root via process.getuid = () => 0
//   (b) redirects the fixed production paths into a tmp sandbox
//   (c) records re-entry evidence (execPath, argv, lock fd identity)
//   (d) after the FD-form lock proof succeeds, probes an independent OFD to
//       prove the inherited FD really owns the lifecycle lock
//   (e) rewrites the fixed lock path argument for the bash re-entry and fails
//       loudly if any docker boundary is reached
//
// The post-lock command (`activate`) is a schema-valid authority candidate
// whose hostLauncherDigest is intentionally not the live checkout digest, so
// the re-entered launcher deterministically stops at
// host_launcher_trust_bundle_mismatch — AFTER requireLifecycleLock() succeeded
// and the authority was read — proving the full re-entry path without
// synthesizing the OCI image supply chain.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  AUTHORITY_SCHEMA,
  STATE_MOUNT_SCHEMA,
  canonicalJson,
  containerConfigDigest,
  digest,
  sha256Buffer,
  validateAuthorityRecord
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY_DIGEST,
  PROVIDER_POLICY,
  PROVIDER_POLICY_DIGEST,
  RUNTIME_POLICY_DIGEST
} = require('../src/runtime/native-image/container-policy');
const {
  EXPECTED_BETTER_SQLITE_PATH,
  EXPECTED_VEXUS_PATH,
  EXPECTED_VEXUS_SHA256,
  nativeClosureDigest
} = require('../src/runtime/native-image/native-closure');
const {
  ADMITTED_NODE,
  DEFAULT_LOCK_PATH
} = require('../deploy/native-runtime/host-launcher');

const LAUNCHER = require.resolve('../deploy/native-runtime/host-launcher');
const NODE = process.execPath;

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);

const OLD_IMAGE_ID = S('d');
const OLD_RUNTIME_ID = I('c');
const EDGE_ID = I('1');
const PROVIDER_ID = I('8');

function buildManifest() {
  const fileManifest = [
    { mode: '100644', path: 'codex-memory/package.json', sha256: S('1'), size: 2 },
    { mode: '100755', path: 'vcptoolbox/KnowledgeBaseManager.js', sha256: S('2'), size: 3 }
  ];
  return {
    baseImageIndexDigest: S('3'), baseImagePlatformDigest: S('4'),
    buildContextFileManifestDigest: digest(fileManifest),
    buildToolVersions: { buildx: 'buildx-v1', docker: '29.7.2' },
    codexMemoryCommit: C('aa'), codexMemoryTree: S('5'), fileManifest,
    lockfileDigests: { codexMemory: S('6'), vcp: S('7') }, nodeVersion: '22.23.1',
    runtimeBuildManifestVersion: 'codex-memory-runtime-build-manifest/v1',
    sourceDateEpoch: 1_700_000_000, vcpCommit: C('bb'), vcpTree: S('8'), vexusSha256: S('9')
  };
}

function nativeClosure() {
  const artifact = (nativePath, nativeSha, marker) => ({
    buildId: C(marker), elfClass: 'ELF64', interpreter: null,
    machine: 'Advanced Micro Devices X86-64', maximumGlibc: '2.35',
    needed: ['libc.so.6'], path: nativePath,
    resolvedLibraries: [{ name: 'libc.so.6', path: '/lib/x86_64-linux-gnu/libc.so.6',
      sha256: S('a') }], rpath: null, runpath: null, sha256: nativeSha,
    type: 'DYN (Shared object file)'
  });
  return {
    artifacts: [artifact(EXPECTED_BETTER_SQLITE_PATH, S('b'), '2'),
      artifact(EXPECTED_VEXUS_PATH, EXPECTED_VEXUS_SHA256, '1')],
    libraries: [{ buildId: '', elfClass: 'ELF64', interpreter: null,
      machine: 'Advanced Micro Devices X86-64', needed: [],
      path: '/lib/x86_64-linux-gnu/libc.so.6', resolvedLibraries: [],
      rpath: null, runpath: null, sha256: S('a'),
      type: 'DYN (Shared object file)' }],
    schemaVersion: 'codex-memory-native-closure/v1'
  };
}

function stateContract() {
  return { containerPath: '/srv/codex-memory/r5c', readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c' };
}

function authorityBase(overrides = {}) {
  const manifest = buildManifest();
  const stateMountContract = stateContract();
  return {
    acceptedImageConfigId: OLD_IMAGE_ID, acceptedOciArchiveSha256: S('a'),
    acceptedOciManifestDigest: S('e'), authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: digest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit, containerConfigDigest: S('11'),
    edgeConfigDigest: S('12'), edgeContainerId: EDGE_ID, edgeArtifactSha256: S('2'),
    edgeBindingDigest: S('b'), edgeBindingReference: 'binding:r4:accepted',
    edgeBuildContextDigest: S('3'), edgeBuildManifestDigest: S('4'),
    edgeDaemonImageIdentity: S('5'), edgeHostProjectReference: 'host:private-development',
    edgeImageConfigDigest: S('6'),
    edgeImageStoreIdentityModel: 'docker-containerd-manifest-identity/v1',
    edgeLifecycleAuthority: 'host_launcher', edgeLockfileSha256: S('7'),
    edgeOciManifestDigest: S('5'), edgeOperatorReference: 'operator:jenn-owner',
    edgeRevision: manifest.codexMemoryCommit,
    edgePreviousBindingReference: 'binding:r4:previous',
    edgeSourceCommit: manifest.codexMemoryCommit, edgePolicyDigest: EDGE_POLICY_DIGEST,
    expectedRuntimeContainerId: OLD_RUNTIME_ID, hostLauncherDigest: S('3'),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    nativeClosureDigest: nativeClosureDigest(nativeClosure()),
    profilePath: '/etc/codex-memory/bootstrap/old/profile-v7.json',
    profileSchemaVersion: 7, profileSha256: S('0'),
    providerContainerConfigDigest: S('8'), providerContainerId: PROVIDER_ID,
    providerDaemonImageIdentity: PROVIDER_POLICY.daemonImageIdentity,
    providerImageConfigDigest: PROVIDER_POLICY.imageConfigDigest,
    providerImageStoreIdentityModel: PROVIDER_POLICY.imageStoreIdentityModel,
    providerOciManifestDigest: PROVIDER_POLICY.ociManifestDigest,
    providerPolicyDigest: PROVIDER_POLICY_DIGEST,
    providerRevision: PROVIDER_POLICY.imageRevision,
    rootfsChainDigest: digest([S('4'), S('5')]),
    runtimeMountSources: {
      authority: '/etc/codex-memory/authority.json',
      edgeReceipt: '/run/codex-memory/edge-receipt.json',
      primaryState: '/srv/codex-memory/r5c',
      profile: '/etc/codex-memory/bootstrap/old/profile-v7.json',
      providerEnvironment: '/etc/codex-memory/vcp-provider.env',
      providerReceipt: '/run/codex-memory/provider-receipt.json',
      runtimeDirectory: '/var/lib/codex-memory/runtime-old'
    },
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST, stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit, ...overrides
  };
}

function buildWorld(t) {
  const backing = fs.mkdtempSync(path.join(os.tmpdir(), 'host-cli-'));
  t.after(() => fs.rmSync(backing, { recursive: true, force: true }));
  const authority = authorityBase();
  validateAuthorityRecord(authority);
  const candidatePath = path.join(
    backing, 'etc/codex-memory/bootstrap/activate-candidate.json');
  fs.mkdirSync(path.dirname(candidatePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(candidatePath, canonicalJson(authority), { mode: 0o644 });
  const cwdSandbox = path.join(backing, 'cwd-sandbox');
  fs.mkdirSync(cwdSandbox, { mode: 0o700 });
  const evidencePath = path.join(backing, 'evidence.jsonl');
  return { backing, authority, candidatePath, cwdSandbox, evidencePath };
}

// Test-only preload: fakes root, redirects fixed production paths into the
// backing sandbox, records re-entry evidence, probes lock ownership after the
// FD-form proof, and fails loudly on any docker boundary.
function writePreload(backing, evidencePath) {
  const file = path.join(backing, 'cli-preload.js');
  const source = `'use strict';
const realFs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const BACKING = ${JSON.stringify(backing)};
const EVIDENCE = ${JSON.stringify(evidencePath)};
const LOCK_PATH = ${JSON.stringify(DEFAULT_LOCK_PATH)};
const SANDBOX_LOCK = path.join(BACKING, 'run/codex-memory/host-lifecycle.lock');
process.getuid = () => 0;
const FIXED_ROOTS = ['/etc/codex-memory', '/usr/local/lib/codex-memory-native-runtime', '/var/lib/codex-memory', '/run/codex-memory'];
function translate(target) {
  if (typeof target !== 'string') return target;
  if (target === '/') return BACKING;
  const absolute = path.resolve(target);
  if (absolute === BACKING || absolute.startsWith(BACKING + path.sep)) return absolute;
  for (const root of FIXED_ROOTS) {
    if (absolute === root || absolute.startsWith(root + path.sep)) {
      return path.join(BACKING, absolute.replace(/^\\//, ''));
    }
  }
  return absolute;
}
function owned(stat) {
  if (!stat || typeof stat !== 'object') return stat;
  const copy = { ...stat, uid: 0, gid: 0 };
  for (const m of ['isFile','isDirectory','isSymbolicLink','isBlockDevice','isCharacterDevice','isFIFO','isSocket']) {
    if (typeof stat[m] === 'function') copy[m] = stat[m].bind(stat);
  }
  return copy;
}
const origReadFileSync = realFs.readFileSync;
const origWriteFileSync = realFs.writeFileSync;
const origMkdirSync = realFs.mkdirSync;
const origRenameSync = realFs.renameSync;
const origReaddirSync = realFs.readdirSync;
const origOpenSync = realFs.openSync;
const origLstatSync = realFs.lstatSync;
const origStatSync = realFs.statSync;
const origFstatSync = realFs.fstatSync;
const origRealpathSync = realFs.realpathSync;
const origExistsSync = realFs.existsSync;
const origChmodSync = realFs.chmodSync;
const origFchmodSync = realFs.fchmodSync;
const origFsyncSync = realFs.fsyncSync;
const origFchownSync = realFs.fchownSync;
const origLinkSync = realFs.linkSync;
const origUnlinkSync = realFs.unlinkSync;
const origCopyFileSync = realFs.copyFileSync;
const origCloseSync = realFs.closeSync;
realFs.readFileSync = function (target, ...args) {
  if (typeof target === 'number') return origReadFileSync(target, ...args);
  return origReadFileSync(translate(target), ...args);
};
realFs.writeFileSync = function (target, ...args) {
  if (typeof target === 'number') return origWriteFileSync(target, ...args);
  return origWriteFileSync(translate(target), ...args);
};
realFs.mkdirSync = function (target, ...args) { return origMkdirSync(translate(target), ...args); };
realFs.renameSync = function (from, to, ...args) { return origRenameSync(translate(from), translate(to), ...args); };
realFs.readdirSync = function (target, ...args) { return origReaddirSync(translate(target), ...args); };
realFs.openSync = function (target, ...args) { return origOpenSync(translate(target), ...args); };
realFs.lstatSync = function (target, ...args) { return owned(origLstatSync(translate(target), ...args)); };
realFs.statSync = function (target, ...args) { return owned(origStatSync(translate(target), ...args)); };
realFs.fstatSync = function (descriptor, ...args) { return owned(origFstatSync(descriptor, ...args)); };
realFs.realpathSync = function (target, ...args) { return target; };
realFs.existsSync = function (target, ...args) { return origExistsSync(translate(target), ...args); };
realFs.chmodSync = function (target, ...args) { return origChmodSync(translate(target), ...args); };
realFs.fchmodSync = function (descriptor, ...args) { return origFchmodSync(descriptor, ...args); };
realFs.fsyncSync = function (descriptor, ...args) { return origFsyncSync(descriptor, ...args); };
realFs.fchownSync = function () { return undefined; };
realFs.linkSync = function (from, to, ...args) { return origLinkSync(translate(from), translate(to), ...args); };
realFs.unlinkSync = function (target, ...args) { return origUnlinkSync(translate(target), ...args); };
realFs.copyFileSync = function (from, to, ...args) { return origCopyFileSync(translate(from), translate(to), ...args); };
realFs.closeSync = function (descriptor, ...args) { return origCloseSync(descriptor, ...args); };
// Re-entry evidence (one line per process start).
const record = {
  execPath: process.execPath,
  argv: process.argv.slice(),
  lockFd: process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD || null
};
if (record.lockFd) {
  try {
    const st = origFstatSync(Number(record.lockFd));
    record.fdIdentity = { dev: st.dev, ino: st.ino };
  } catch (_) { record.fdIdentity = null; }
  try {
    const ls = origStatSync(SANDBOX_LOCK);
    record.lockInode = { dev: ls.dev, ino: ls.ino };
  } catch (_) { record.lockInode = null; }
}
realFs.appendFileSync(EVIDENCE, JSON.stringify(record) + '\\n');
const origSpawnSync = childProcess.spawnSync;
childProcess.spawnSync = function (file, args, options) {
  const argv = Array.isArray(args) ? args.slice() : args;
  if (file === '/bin/bash' && argv && String(argv[1]).includes('exec 9>"$1"')) {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === LOCK_PATH) argv[i] = SANDBOX_LOCK;
    }
    return origSpawnSync.call(this, file, argv, options);
  }
  const result = origSpawnSync.apply(this, arguments);
  if (file === '/usr/bin/flock' && Array.isArray(args) &&
      args.includes('--exclusive') && args.includes('--nonblock') &&
      args.includes('--conflict-exit-code') && !args.includes('/bin/true') &&
      result && result.status === 0 &&
      process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD) {
    const probeFd = origOpenSync(SANDBOX_LOCK, 'r+');
    const probeStdio = ['ignore', 'ignore', 'ignore'];
    while (probeStdio.length <= probeFd) probeStdio.push('ignore');
    probeStdio[probeFd] = probeFd;
    const probe = origSpawnSync.call(childProcess, '/usr/bin/flock',
      ['--exclusive', '--nonblock', '--conflict-exit-code', '75', String(probeFd)],
      { stdio: probeStdio });
    origCloseSync(probeFd);
    realFs.appendFileSync(EVIDENCE, JSON.stringify({
      lockHeldAfterProof: probe.status === 75,
      lockFd: process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD
    }) + '\\n');
  }
  return result;
};
const realExecFileSync = childProcess.execFileSync;
childProcess.execFileSync = function (file, args) {
  const argv = Array.isArray(args) ? args : [];
  if (file === '/usr/bin/docker') {
    const error = new Error('docker_unexpected_in_reentry_test ' + argv.join(' '));
    error.status = 1;
    throw error;
  }
  return realExecFileSync.apply(this, arguments);
};
`;
  fs.writeFileSync(file, source, { mode: 0o600 });
  return file;
}

function readEvidence(evidencePath) {
  if (!fs.existsSync(evidencePath)) return [];
  return fs.readFileSync(evidencePath, 'utf8')
    .split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function runCli(preload, args, { cwd, extraEnv = {} } = {}) {
  return spawnSync(NODE, [LAUNCHER, ...args], {
    encoding: 'utf8',
    cwd,
    env: {
      ...process.env,
      NODE_OPTIONS: `--require=${preload}`,
      ...extraEnv
    },
    timeout: 60_000
  });
}

const ACTIVATE_ARGS = [
  'activate', '--authority=/etc/codex-memory/bootstrap/activate-candidate.json'
];

test('production CLI: real lifecycle-lock re-entry runs launcher with admitted Node 22 and correct argv', t => {
  const world = buildWorld(t);
  const preload = writePreload(world.backing, world.evidencePath);
  const result = runCli(preload, ACTIVATE_ARGS, { cwd: world.cwdSandbox });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /host_launcher_trust_bundle_mismatch/,
    'launcher must execute past the lock proof and reach post-lock validation');

  const evidence = readEvidence(world.evidencePath);
  assert.ok(evidence.length >= 2, 'expected initial + re-entered evidence');
  const initial = evidence[0];
  const reentered = evidence.find(e => e.lockFd && Array.isArray(e.argv));
  assert.ok(reentered, 're-entered process evidence missing');

  // (C) re-entry uses the admitted Node 22 binary
  assert.equal(reentered.execPath, ADMITTED_NODE);
  // (B) argv after shift: script is the launcher, lock path never a script
  assert.equal(reentered.argv[1], LAUNCHER);
  assert.deepEqual(reentered.argv.slice(2), ACTIVATE_ARGS,
    'original command argv preserved');
  assert.notEqual(reentered.argv[1], DEFAULT_LOCK_PATH,
    'lock path must not be executed as a node script');
  // inherited fd: present, same inode as the canonical lock path
  assert.equal(reentered.lockFd, '9');
  assert.deepEqual(reentered.fdIdentity, reentered.lockInode,
    'inherited fd must point at the lock inode');
  // postcondition: this OFD owns the lifecycle lock after require
  const proof = evidence.find(e => e.lockHeldAfterProof !== undefined);
  assert.ok(proof, 'lock ownership probe evidence missing');
  assert.equal(proof.lockHeldAfterProof, true,
    'an independent OFD must conflict after the proof succeeds');
  // initial invocation argv preserved as well
  assert.deepEqual(initial.argv.slice(2), ACTIVATE_ARGS);
  // (regression) no numeric garbage file in the child cwd
  assert.deepEqual(fs.readdirSync(world.cwdSandbox), []);
});

test('production CLI: concurrent second lifecycle entry is rejected as busy', t => {
  const world = buildWorld(t);
  const preload = writePreload(world.backing, world.evidencePath);
  // Process A holds the lifecycle lock on an independent OFD for the duration.
  const lockPath = path.join(world.backing, 'run/codex-memory/host-lifecycle.lock');
  fs.mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(lockPath, '');
  const holderFd = fs.openSync(lockPath, 'r+');
  t.after(() => fs.closeSync(holderFd));
  const stdio = ['ignore', 'ignore', 'ignore'];
  while (stdio.length <= holderFd) stdio.push('ignore');
  stdio[holderFd] = holderFd;
  const lockResult = spawnSync('/usr/bin/flock', [
    '--exclusive', '--nonblock', '--conflict-exit-code', '75', String(holderFd)
  ], { stdio });
  assert.equal(lockResult.status, 0);

  const result = runCli(preload, ACTIVATE_ARGS, { cwd: world.cwdSandbox });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /host_launcher_lifecycle_lock_busy/);
  // No re-entry happened: only the initial preload evidence line exists.
  const evidence = readEvidence(world.evidencePath);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].lockFd, null);
  // And the holder still owns the lock afterwards.
  assert.equal(spawnSync('/usr/bin/flock', [
    '--exclusive', '--nonblock', '--conflict-exit-code', '75', String(holderFd)
  ], { stdio }).status, 0);
});

test('production CLI: generation-transition inherited lifecycle FD is accepted', t => {
  const world = buildWorld(t);
  const preload = writePreload(world.backing, world.evidencePath);
  // The transition primitive holds the canonical lifecycle FD and passes it to
  // the installed launcher activate (no bash re-entry on this path).
  const lockPath = path.join(world.backing, 'run/codex-memory/host-lifecycle.lock');
  fs.mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(lockPath, '');
  const fd = fs.openSync(lockPath, 'r+');
  t.after(() => fs.closeSync(fd));
  const stdio = ['ignore', 'ignore', 'ignore'];
  while (stdio.length <= fd) stdio.push('ignore');
  stdio[fd] = fd;
  const lockResult = spawnSync('/usr/bin/flock', [
    '--exclusive', '--nonblock', '--conflict-exit-code', '75', String(fd)
  ], { stdio });
  assert.equal(lockResult.status, 0);

  const childStdio = ['ignore', 'pipe', 'pipe'];
  while (childStdio.length <= fd) childStdio.push('ignore');
  childStdio[fd] = fd;
  const result = spawnSync(NODE, [LAUNCHER, ...ACTIVATE_ARGS], {
    encoding: 'utf8',
    cwd: world.cwdSandbox,
    env: {
      ...process.env,
      NODE_OPTIONS: `--require=${preload}`,
      CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD: String(fd)
    },
    stdio: childStdio,
    timeout: 60_000
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /host_launcher_trust_bundle_mismatch/);
  assert.ok(!/lifecycle_lock_busy|lifecycle_lock_proof_invalid/.test(result.stderr),
    'inherited-FD path must pass the lock proof');

  const evidence = readEvidence(world.evidencePath);
  assert.equal(evidence.length, 2, 'initial evidence + lock ownership probe');
  const child = evidence[0];
  assert.equal(child.lockFd, String(fd));
  assert.deepEqual(child.fdIdentity, child.lockInode,
    'inherited fd must point at the lock inode');
  const proof = evidence[1];
  assert.equal(proof.lockHeldAfterProof, true);
  assert.equal(proof.lockFd, String(fd));
});
