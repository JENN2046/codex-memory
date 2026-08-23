'use strict';
// POST_PR107_GENERATION_TRANSITION_PRODUCTION_CLI_SOURCE_REPAIR
//
// Real production-CLI boundary tests. Unlike the unit tests (which call
// T.main(..., deps) with dependency injection), these spawn the ACTUAL
// host-bootstrap/transition-runtime-generation.js entrypoint as a child
// process so the `require.main === module` branch really executes with
// deps = {}.
//
// A test-only preload (injected via NODE_OPTIONS so it also survives the
// lifecycle-lock re-entry) does three things inside the throwaway child:
//   (a) fakes root via process.getuid = () => 0
//   (b) redirects the fixed production paths into a tmp root sandbox
//   (c) fakes /usr/bin/docker container inspect + the installed launcher
//       activate/verify boundary
// The production wiring itself (canonical host-launcher dockerInspect,
// lifecycle-lock bash re-entry, fs usage) is the real code.
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
  profileAuthorityComponents,
  profileV7GenerationRolloverCandidate,
  profileV7InitialBootstrapCandidate,
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
const T = require('../host-bootstrap/transition-runtime-generation');

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);

const OLD_IMAGE_ID = S('d');
const NEW_IMAGE_ID = S('9');
const OLD_RUNTIME_ID = I('c');
const NEW_RUNTIME_ID = I('d');
const EDGE_ID = I('1');
const PROVIDER_ID = I('8');
const OLD_BUNDLE_CONTENT = '// old bundle generation\nmodule.exports = {};\n';
const NEW_BUNDLE_CONTENT = '// new bundle generation\nmodule.exports = {};\n';

const NODE = process.execPath;

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

function runtimeInspect(id, imageId, overrides = {}) {
  return {
    Config: {
      Cmd: [], Entrypoint: ['/usr/local/bin/node',
        '/opt/codex-memory/scripts/codex-memory-stack.js', '_container-supervisor'],
      Env: [
        'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH=/run/codex-memory/authority.json',
        'CODEX_MEMORY_CONTAINER_SUPERVISOR=1',
        'CODEX_MEMORY_EDGE_RECEIPT_PATH=/run/codex-memory/edge-receipt.json',
        'CODEX_MEMORY_PROVIDER_RECEIPT_PATH=/run/codex-memory/provider-receipt.json',
        'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH=/opt/codex-memory-runtime/runtime-build-manifest.json',
        'CODEX_MEMORY_STACK_PROFILE_PATH=/run/codex-memory/profile.json',
        'CODEX_MEMORY_STACK_RUNTIME_DIR=/run/codex-memory-runtime-data',
        'XDG_RUNTIME_DIR=/run/codex-memory-runtime-data',
        'NODE_ENV=production', 'VCP_ROOT=/opt/vcptoolbox',
        'VCPTOOLBOX_ROOT=/opt/vcptoolbox'
      ],
      User: '1000:1000',
      WorkingDir: '/opt/codex-memory-runtime'
    },
    Id: id, Image: imageId,
    Mounts: [{ Destination: '/srv/codex-memory/r5c', Mode: '', Propagation: 'rprivate',
      RW: false, Source: '/srv/codex-memory/r5c', Type: 'bind' }],
    Name: `/codex-memory-native-runtime-${id.slice(0, 12)}`,
    State: { Running: false, Status: 'exited' },
    ...overrides
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

function profileSeed() {
  return {
    controllerSourceManifestDigest: S('c1'), controllerSourceManifestVersion: 1,
    edgeContainer: 'codex-memory-full-stack-001-edge',
    governanceEnvironment: 'governance/runtime.env',
    governanceEnvironmentConfigDigest: S('c2'), privateRoot: '/srv/codex-memory/r5c',
    providerContainer: 'new-api-wsl', relayEnvironment: 'relay/runtime.env',
    relayEnvironmentConfigDigest: S('c4'), retainedBinding: 'binding.json',
    retainedBindingSource: C('c4'), vcpProviderConfigDigest: S('c5'),
    vcpRuntimeScopeDigest: S('c7')
  };
}

function writeBundle(root, content) {
  for (const relative of T.BUNDLE_FILES) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, content, { mode: 0o644 });
  }
}

// Fake-root sandbox: reports root ownership and translates fixed production
// paths into the backing root (paths already inside backing pass through).
function rootSandbox(backingRoot) {
  const translate = target => {
    if (target === '/') return backingRoot;
    const absolute = path.resolve(target);
    if (absolute === backingRoot ||
        absolute.startsWith(backingRoot + path.sep)) {
      return absolute;
    }
    return path.join(backingRoot, absolute.replace(/^\//, ''));
  };
  const owned = stat => ({
    ...stat, uid: 0, gid: 0,
    isFile: stat.isFile.bind(stat),
    isDirectory: stat.isDirectory.bind(stat),
    isSymbolicLink: stat.isSymbolicLink.bind(stat)
  });
  return {
    ...fs,
    existsSync(target) { return fs.existsSync(translate(target)); },
    lstatSync(target) { return owned(fs.lstatSync(translate(target))); },
    fstatSync(descriptor) { return owned(fs.fstatSync(descriptor)); },
    readFileSync(target, ...args) {
      if (typeof target === 'number') return fs.readFileSync(target, ...args);
      return fs.readFileSync(translate(target), ...args);
    },
    writeFileSync(target, ...args) {
      if (typeof target === 'number') return fs.writeFileSync(target, ...args);
      return fs.writeFileSync(translate(target), ...args);
    },
    mkdirSync(target, options) { return fs.mkdirSync(translate(target), options); },
    renameSync(from, to) { return fs.renameSync(translate(from), translate(to)); },
    readdirSync(target, ...args) { return fs.readdirSync(translate(target), ...args); },
    realpathSync(target, ...args) { return target; },
    openSync(target, ...args) { return fs.openSync(translate(target), ...args); },
    fchownSync() {}
  };
}

function hostBundleDigest(root) {
  return T.stagedBundleDigest(root, { fsModule: rootSandbox(root) });
}

// Build a coherent OLD bundle + OLD authority + NEW candidate fixture inside a
// tmp backing that mirrors the fixed production paths.
function buildWorld(t) {
  const backing = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-'));
  t.after(() => fs.rmSync(backing, { force: true, recursive: true }));

  const oldRoot = path.join(backing, 'usr/local/lib/codex-memory-native-runtime');
  writeBundle(oldRoot, OLD_BUNDLE_CONTENT);

  const oldAuthority = authorityBase({ hostLauncherDigest: hostBundleDigest(oldRoot) });
  const oldProfile = profileV7InitialBootstrapCandidate(
    profileSeed(), profileAuthorityComponents(validateAuthorityRecord(oldAuthority))
  ).nextProfile;
  oldAuthority.profileSha256 = sha256Buffer(Buffer.from(canonicalJson(oldProfile)));

  const oldAuthorityPath = path.join(backing, 'etc/codex-memory/native-runtime-authority.json');
  fs.mkdirSync(path.dirname(oldAuthorityPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(oldAuthorityPath, canonicalJson(oldAuthority), { mode: 0o644 });
  const oldProfilePath = path.join(backing, 'etc/codex-memory/bootstrap/old/profile-v7.json');
  fs.mkdirSync(path.dirname(oldProfilePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(oldProfilePath, canonicalJson(oldProfile), { mode: 0o644 });

  const stagedRoot = path.join(backing, 'staged-bundle');
  writeBundle(stagedRoot, NEW_BUNDLE_CONTENT);
  const newBundleDigest = hostBundleDigest(stagedRoot);
  const newRuntime = runtimeInspect(NEW_RUNTIME_ID, NEW_IMAGE_ID);
  const next = {
    ...authorityBase({
      acceptedImageConfigId: NEW_IMAGE_ID,
      acceptedOciArchiveSha256: S('a1'),
      acceptedOciManifestDigest: S('e1'),
      buildManifestDigest: S('b1'),
      codexMemoryCommit: C('cc'),
      containerConfigDigest: containerConfigDigest(newRuntime),
      expectedRuntimeContainerId: NEW_RUNTIME_ID,
      hostLauncherDigest: newBundleDigest,
      profilePath: '/etc/codex-memory/bootstrap/new/profile-v7.json',
      profileSha256: S('0'),
      rootfsChainDigest: digest([S('6'), S('7')]),
      vcpCommit: C('dd'),
      runtimeMountSources: {
        ...authorityBase().runtimeMountSources,
        profile: '/etc/codex-memory/bootstrap/new/profile-v7.json',
        runtimeDirectory: '/var/lib/codex-memory/runtime-new'
      }
    })
  };
  const newProfile = profileV7GenerationRolloverCandidate(
    oldProfile,
    profileAuthorityComponents(validateAuthorityRecord(next)),
    { expectedCurrentFingerprint: digest(oldProfile) }
  ).nextProfile;
  next.profileSha256 = sha256Buffer(Buffer.from(canonicalJson(newProfile)));
  const newCandidatePath = path.join(backing, 'etc/codex-memory/bootstrap/new/candidate.json');
  fs.mkdirSync(path.dirname(newCandidatePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(newCandidatePath, canonicalJson(next), { mode: 0o600 });
  const newProfilePath = path.join(backing, 'etc/codex-memory/bootstrap/new/profile-v7.json');
  fs.mkdirSync(path.dirname(newProfilePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(newProfilePath, canonicalJson(newProfile), { mode: 0o644 });

  const dockerRecords = {
    [OLD_RUNTIME_ID]: runtimeInspect(OLD_RUNTIME_ID, OLD_IMAGE_ID),
    [NEW_RUNTIME_ID]: newRuntime,
    [EDGE_ID]: { Id: EDGE_ID, State: { Running: true, Health: { Status: 'healthy' } } },
    [PROVIDER_ID]: { Id: PROVIDER_ID, State: { Running: true } }
  };

  return {
    backing,
    oldAuthorityDigest: digest(oldAuthority),
    oldBundleDigest: hostBundleDigest(oldRoot),
    newCandidatePath,
    newAuthorityDigest: digest(next),
    newBundleDigest,
    newBundleRoot: stagedRoot,
    dockerRecords
  };
}

// Test-only preload: fakes root, redirects fixed production paths into the
// backing sandbox, and fakes /usr/bin/docker + the installed launcher.
function writePreload(backing, dockerRecords) {
  const file = path.join(backing, 'cli-preload.js');
  const source = `'use strict';
const realFs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const BACKING = ${JSON.stringify(backing)};
const DOCKER_RECORDS = ${JSON.stringify(dockerRecords)};
const ADMITTED_NODE = ${JSON.stringify(T.ADMITTED_NODE)};
const LAUNCHER = ${JSON.stringify(T.INSTALLED_LAUNCHER)};
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
realFs.fchownSync = function () { return undefined; }; // faked via stat ownership
realFs.linkSync = function (from, to, ...args) { return origLinkSync(translate(from), translate(to), ...args); };
realFs.unlinkSync = function (target, ...args) { return origUnlinkSync(translate(target), ...args); };
realFs.copyFileSync = function (from, to, ...args) { return origCopyFileSync(translate(from), translate(to), ...args); };
realFs.closeSync = function (descriptor, ...args) { return origCloseSync(descriptor, ...args); };
// Lifecycle-lock re-entry: the real CLI spawns /bin/bash with the fixed
// LIFECYCLE_LOCK path as $1. Bash is not covered by the fs patch, so rewrite
// that argument to the sandbox lock path (transition code still runs with
// deps = {}).
const origSpawnSync = childProcess.spawnSync;
childProcess.spawnSync = function (file, args, options) {
  const argv = Array.isArray(args) ? args.slice() : args;
  if (file === '/bin/bash' && argv && String(argv[1]).includes('exec 9>"$1"')) {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '/run/codex-memory/host-lifecycle.lock') {
        argv[i] = path.join(BACKING, 'run/codex-memory/host-lifecycle.lock');
      }
    }
  }
  return origSpawnSync.call(this, file, argv, options);
};
const realExecFileSync = childProcess.execFileSync;
childProcess.execFileSync = function (file, args, options) {
  const argv = Array.isArray(args) ? args : [];
  if (file === '/usr/bin/docker' && argv[0] === 'container' && argv[1] === 'inspect') {
    const id = argv[2];
    if (!DOCKER_RECORDS[id]) {
      const error = new Error('no such container ' + id);
      error.status = 1;
      throw error;
    }
    return JSON.stringify([DOCKER_RECORDS[id]]);
  }
  if (file === ADMITTED_NODE && argv[0] === LAUNCHER &&
      (argv[1] === 'activate' || argv[1] === 'verify')) {
    return JSON.stringify(argv[1] === 'activate'
      ? { accepted: true, action: 'authority_activated', authorityDigest: 'sha256:' + '0'.repeat(64) }
      : { accepted: true, action: 'verified' });
  }
  return realExecFileSync.apply(this, arguments);
};
`;
  fs.writeFileSync(file, source, { mode: 0o600 });
  return file;
}

function runCli(preload, args, { cwd, extraEnv = {} } = {}) {
  const result = spawnSync(NODE, [path.join(__dirname, '..', 'host-bootstrap', 'transition-runtime-generation.js'), ...args], {
    encoding: 'utf8',
    cwd,
    env: {
      ...process.env,
      NODE_OPTIONS: `--require=${preload}`,
      ...extraEnv
    },
    timeout: 60_000
  });
  return result;
}

test('invokeInstalledLauncher inherits the held lifecycle FD across a real child boundary', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-lock-fd-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lockPath = path.join(root, 'lifecycle.lock');
  const runner = path.join(root, 'runner.js');
  const launcherProbe = path.join(root, 'launcher-probe.js');
  fs.writeFileSync(launcherProbe, `
    const { requireLifecycleLock } = require(${JSON.stringify(
      path.join(__dirname, '..', 'deploy/native-runtime/host-launcher.js')
    )});
    try {
      requireLifecycleLock({ lockPath: process.env.REPRO_LOCK });
      process.stdout.write(JSON.stringify({ accepted: true, fd: Number(
        process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD
      ) }));
    } catch (error) {
      process.stderr.write(error.code || error.message);
      process.exitCode = 17;
    }
  `, { mode: 0o600 });
  fs.writeFileSync(runner, `
    const fs = require('node:fs');
    const T = require(${JSON.stringify(path.join(__dirname, '..', 'host-bootstrap/transition-runtime-generation.js'))});
    const result = T.invokeInstalledLauncher('activate', '/dev/null', {
      node: process.execPath,
      launcher: ${JSON.stringify(launcherProbe)},
      env: {
        CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD: '9',
        REPRO_LOCK: process.env.REPRO_LOCK
      }
    });
    process.stdout.write(JSON.stringify({
      parentFdOpen: (() => { try { fs.fstatSync(9); return true; } catch { return false; } })(),
      result
    }));
  `, { mode: 0o600 });
  const child = spawnSync('/bin/bash', [
    '-c',
    'exec 9>"$1"; /usr/bin/flock --exclusive --nonblock 9 || exit $?; export REPRO_LOCK="$1"; exec "$2" "$3"',
    'codex-memory-lock-fd-reproducer', lockPath, NODE, runner
  ], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  const observed = JSON.parse(child.stdout);
  assert.equal(observed.parentFdOpen, true);
  assert.deepEqual(observed.result, { accepted: true, fd: 9 });
});

test('invokeInstalledLauncher rejects invalid and closed lifecycle FDs before spawning', () => {
  for (const value of ['not-a-fd', '2', '999']) {
    let spawned = false;
    const result = T.invokeInstalledLauncher('activate', '/dev/null', {
      env: { CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD: value },
      execFile: () => { spawned = true; return '{}'; }
    });
    assert.equal(result, null, value);
    assert.equal(spawned, false, value);
  }
});

test('production CLI: candidate mode real entrypoint without DI', t => {
  const world = buildWorld(t);
  const preload = writePreload(world.backing, world.dockerRecords);
  const args = [
    '--old-authority-digest=' + world.oldAuthorityDigest,
    '--old-bundle-digest=' + world.oldBundleDigest,
    '--new-authority-candidate=' + world.newCandidatePath,
    '--new-authority-digest=' + world.newAuthorityDigest,
    '--new-bundle-root=' + world.newBundleRoot,
    '--new-bundle-digest=' + world.newBundleDigest
  ];
  const result = runCli(preload, args, { cwd: world.backing });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.accepted, true);
  assert.equal(parsed.action, 'generation_transition_candidate');
  assert.equal(parsed.mutation, false);
});

test('production CLI: execute mode real entrypoint without DI survives lifecycle-lock re-entry', t => {
  const world = buildWorld(t);
  const preload = writePreload(world.backing, world.dockerRecords);
  const args = [
    '--old-authority-digest=' + world.oldAuthorityDigest,
    '--old-bundle-digest=' + world.oldBundleDigest,
    '--new-authority-candidate=' + world.newCandidatePath,
    '--new-authority-digest=' + world.newAuthorityDigest,
    '--new-bundle-root=' + world.newBundleRoot,
    '--new-bundle-digest=' + world.newBundleDigest,
    '--execute=true'
  ];
  const result = runCli(preload, args, { cwd: world.backing });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  // The outer process prints the re-entry ack; the re-entered process (under
  // the real flock lifecycle lock) prints the committed result. The real CLI
  // re-entry uses the canonical docker observer with no DI.
  const lines = result.stdout.split('\n').map(line => line.trim()).filter(Boolean);
  const committed = lines
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .find(entry => entry && entry.action === 'generation_transition_committed');
  assert.ok(committed, `no committed result in stdout: ${result.stdout}`);
  assert.equal(committed.accepted, true);
});

test('production CLI: docker path injection rejected through real entrypoint', t => {
  const world = buildWorld(t);
  const preload = writePreload(world.backing, world.dockerRecords);
  const args = [
    '--old-authority-digest=' + world.oldAuthorityDigest,
    '--old-bundle-digest=' + world.oldBundleDigest,
    '--new-authority-candidate=' + world.newCandidatePath,
    '--new-authority-digest=' + world.newAuthorityDigest,
    '--new-bundle-root=' + world.newBundleRoot,
    '--new-bundle-digest=' + world.newBundleDigest,
    '--docker=/evil/docker'
  ];
  const result = runCli(preload, args, { cwd: world.backing });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /generation_transition_target_injection_rejected/);
});
