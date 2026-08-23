 'use strict';
// POST_PR106_RUNTIME_GENERATION_TRANSITION_SOURCE_REPAIR — Repair B
// Contract tests for host-bootstrap/transition-runtime-generation.js:
//   candidate mode (zero mutation)
//   negative security (wrong digests, staged bundle topology, ownership,
//     running containers, lifecycle lock, target injection)
//   failure injection at every transaction stage
//   interrupted-state recovery matrix
// All mutation is exercised against tmp sandboxes / fake filesystem /
// injected docker + launcher — never against production paths.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  AUTHORITY_SCHEMA,
  STATE_MOUNT_SCHEMA,
  buildManifestDigest,
  canonicalJson,
  containerConfigDigest,
  digest,
  profileAuthorityComponents,
  profileV7GenerationRolloverCandidate,
  profileV7InitialBootstrapCandidate,
  sha256Buffer,
  validateAuthorityRecord,
  validateImageProfile
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY_DIGEST,
  PROVIDER_POLICY,
  PROVIDER_POLICY_DIGEST,
  RUNTIME_POLICY_DIGEST
} = require('../src/runtime/native-image/container-policy');
const { EXPECTED_BETTER_SQLITE_PATH, EXPECTED_VEXUS_PATH,
  EXPECTED_VEXUS_SHA256, nativeClosureDigest } =
  require('../src/runtime/native-image/native-closure');
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

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

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
    schemaVersion: STATE_MOUNT_SCHEMA, stateRootClass: 'external_primary_r5c' };
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
      User: '1000:1000', WorkingDir: '/opt/codex-memory'
    },
    HostConfig: {
      CapAdd: [], CapDrop: ['ALL'], CgroupnsMode: '', Devices: [],
      DeviceRequests: [], IpcMode: 'private', LogConfig: { Type: 'none' },
      NetworkMode: 'host', PidMode: '', PortBindings: {}, Privileged: false,
      ReadonlyRootfs: true, RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'],
      Tmpfs: {
        '/run/codex-memory-runtime': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
        '/tmp': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000'
      }, UsernsMode: '', UTSMode: ''
    },
    Id: id, Image: imageId,
    Mounts: [
      { Destination: '/run/codex-memory/authority.json', Propagation: 'rprivate', RW: false, Source: '/etc/codex-memory/authority.json', Type: 'bind' },
      { Destination: '/run/codex-memory/edge-receipt.json', Propagation: 'rprivate', RW: false, Source: '/run/codex-memory/edge-receipt.json', Type: 'bind' },
      { Destination: '/run/codex-memory/profile.json', Propagation: 'rprivate', RW: false, Source: '/etc/codex-memory/profile.json', Type: 'bind' },
      { Destination: '/run/codex-memory/provider-receipt.json', Propagation: 'rprivate', RW: false, Source: '/run/codex-memory/provider-receipt.json', Type: 'bind' },
      { Destination: '/run/secrets/codex-memory-vcp-provider.env', Propagation: 'rprivate', RW: false, Source: '/etc/codex-memory/vcp-provider.env', Type: 'bind' },
      { Destination: '/run/codex-memory-runtime-data', Propagation: 'rprivate', RW: true, Source: '/var/lib/codex-memory/runtime', Type: 'bind' },
      { Destination: '/srv/codex-memory/r5c', Propagation: 'rprivate', RW: false, Source: '/srv/codex-memory/r5c', Type: 'bind' }
    ],
    State: { Running: false },
    ...overrides
  };
}

function authorityBase(overrides = {}) {
  const manifest = buildManifest();
  const stateMountContract = stateContract();
  return {
    acceptedImageConfigId: OLD_IMAGE_ID, acceptedOciArchiveSha256: S('a'),
    acceptedOciManifestDigest: S('e'), authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: buildManifestDigest(manifest),
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

function derivedProfile(authority) {
  return profileV7InitialBootstrapCandidate(
    profileSeed(), profileAuthorityComponents(validateAuthorityRecord(authority))
  ).nextProfile;
}

// Root sandbox: translates the fixed production paths to a tmp backing root and
// reports root ownership. Mutation never touches real /etc, /usr/local/lib, or
// /var/lib.
function rootSandbox(backingRoot) {
  const translate = target => {
    if (target === '/') return backingRoot;
    const absolute = path.resolve(target);
    if (absolute === backingRoot ||
        absolute.startsWith(backingRoot + path.sep)) {
      // Already inside the tmp backing root: use the path as-is.
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
    // Root ownership is simulated via stat reporting; the real fchown to uid 0
    // requires privileges this test does not have.
    fchownSync() {}
  };
}

function writeBundle(root, content) {
  for (const relative of T.BUNDLE_FILES) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, content, { mode: 0o644 });
  }
}

function setupWorld(t, {
  oldBundleContent = OLD_BUNDLE_CONTENT,
  newBundleContent = NEW_BUNDLE_CONTENT,
  oldAuthorityOverrides = {},
  newAuthorityOverrides = {},
  oldRuntimeRunning = false,
  newRuntimeRunning = false,
  oldBundleMutation = null,
  newBundleMutation = null
} = {}) {
  const backing = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transition-'));
  const sandbox = rootSandbox(backing);
  t.after(() => fs.rmSync(backing, { force: true, recursive: true }));

  const oldRoot = path.join(backing, T.INSTALLED_BUNDLE_ROOT.replace(/^\//, ''));
  writeBundle(oldRoot, oldBundleContent);
  const oldAuthority = authorityBase({
    hostLauncherDigest: T.installedBundleDigest({ fsModule: sandbox }),
    ...oldAuthorityOverrides
  });
  const oldProfile = derivedProfile(oldAuthority);
  oldAuthority.profileSha256 = sha256Buffer(Buffer.from(canonicalJson(oldProfile)));
  const oldAuthorityPath = path.join(backing, T.CONTROL_AUTHORITY.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(oldAuthorityPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(oldAuthorityPath, canonicalJson(oldAuthority), { mode: 0o644 });
  const oldProfilePath = path.join(backing, oldAuthority.profilePath.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(oldProfilePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(oldProfilePath, canonicalJson(oldProfile), { mode: 0o644 });

  const stagedRoot = path.join(backing, 'staged-bundle');
  writeBundle(stagedRoot, newBundleContent);
  const newBundleDigest = T.stagedBundleDigest(stagedRoot, { fsModule: sandbox });
  const newRuntime = runtimeInspect(NEW_RUNTIME_ID, NEW_IMAGE_ID,
    newRuntimeRunning ? { State: { Running: true } } : {});
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
    }),
    ...newAuthorityOverrides
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
  const newProfilePath = path.join(backing, next.profilePath.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(newProfilePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(newProfilePath, canonicalJson(newProfile), { mode: 0o644 });

  if (oldBundleMutation) oldBundleMutation(oldRoot);
  if (newBundleMutation) newBundleMutation(stagedRoot);

  const oldRuntime = runtimeInspect(OLD_RUNTIME_ID, OLD_IMAGE_ID,
    oldRuntimeRunning ? { State: { Running: true } } : {});
  const containers = {
    [OLD_RUNTIME_ID]: oldRuntime,
    [NEW_RUNTIME_ID]: newRuntime,
    [EDGE_ID]: { Id: EDGE_ID, State: { Running: true, Health: { Status: 'healthy' } } },
    [PROVIDER_ID]: { Id: PROVIDER_ID, State: { Running: true } }
  };
  // Canonical host-launcher dockerInspect(id) signature (transition only
  // observes containers).
  const dockerInspect = id => {
    if (!containers[id]) throw new Error('missing');
    return containers[id];
  };

  const oldBundleDigest = T.installedBundleDigest({ fsModule: sandbox });
  const oldAuthorityDigest = digest(oldAuthority);
  const newAuthorityDigest = digest(next);

  return {
    sandbox,
    oldAuthority, oldProfile, oldBundleDigest, oldAuthorityDigest,
    next, newProfile, newBundleDigest, newAuthorityDigest,
    newCandidatePath, stagedRoot, dockerInspect, containers,
    journalRoot: path.join(backing, T.JOURNAL_ROOT.replace(/^\//, '')),
    backing
  };
}

function makeFakeExecFile(world, {
  activateShouldFail = false,
  verifyShouldFail = false,
  verifyFailFirst = 0,
  activateShouldSkipWrite = false
} = {}) {
  const { sandbox } = world;
  let verifyCalls = 0;
  return (node, argv, opts) => {
    const command = argv[1];
    const authorityFile = argv[2].split('=')[1];
    if (command === 'activate') {
      if (activateShouldFail) throw new Error('activation failure injected');
      const candidate = JSON.parse(sandbox.readFileSync(authorityFile, 'utf8'));
      if (T.installedBundleDigest({ fsModule: sandbox }) !== candidate.hostLauncherDigest) {
        throw new Error('host_launcher_trust_bundle_mismatch');
      }
      if (!activateShouldSkipWrite) {
        sandbox.writeFileSync(T.CONTROL_AUTHORITY,
          sandbox.readFileSync(authorityFile), { mode: 0o644 });
      }
      return JSON.stringify({ accepted: true, action: 'authority_activated',
        authorityDigest: digest(validateAuthorityRecord(candidate)) });
    }
    if (command === 'verify') {
      verifyCalls += 1;
      if (verifyShouldFail || verifyCalls <= verifyFailFirst) {
        throw new Error('final verify failure injected');
      }
      const authority = JSON.parse(sandbox.readFileSync(T.CONTROL_AUTHORITY, 'utf8'));
      if (T.installedBundleDigest({ fsModule: sandbox }) !== authority.hostLauncherDigest) {
        throw new Error('host_launcher_trust_bundle_mismatch');
      }
      return JSON.stringify({ accepted: true, action: 'verified' });
    }
    throw new Error('unknown launcher command');
  };
}

function transitionOptions(world, extra = {}) {
  return {
    fsModule: world.sandbox,
    journalRoot: world.journalRoot,
    dockerInspect: world.dockerInspect,
    oldAuthorityDigest: world.oldAuthorityDigest,
    oldBundleDigest: world.oldBundleDigest,
    newAuthorityCandidate: world.newCandidatePath,
    newAuthorityDigest: world.newAuthorityDigest,
    newBundleRoot: world.stagedRoot,
    newBundleDigest: world.newBundleDigest,
    ...extra
  };
}

// ===========================================================================
// Candidate mode
// ===========================================================================
test('transition candidate mode accepts a coherent OLD->NEW pair with zero mutation', t => {
  const world = setupWorld(t);
  const result = T.candidateTransition(transitionOptions(world));
  assert.equal(result.accepted, true);
  assert.equal(result.mutation, false);
  assert.equal(result.plannedTransition.oldAuthorityDigest, world.oldAuthorityDigest);
  assert.equal(result.plannedTransition.oldBundleDigest, world.oldBundleDigest);
  assert.equal(result.plannedTransition.newAuthorityDigest, world.newAuthorityDigest);
  assert.equal(result.plannedTransition.newBundleDigest, world.newBundleDigest);
  assert.equal(result.plannedTransition.newRuntimeContainerId, NEW_RUNTIME_ID);
  // zero mutation: control authority + installed bundle unchanged.
  const authority = JSON.parse(world.sandbox.readFileSync(T.CONTROL_AUTHORITY, 'utf8'));
  assert.equal(digest(authority), world.oldAuthorityDigest);
  assert.equal(T.installedBundleDigest({ fsModule: world.sandbox }), world.oldBundleDigest);
  assert.equal(fs.existsSync(path.join(world.journalRoot)), false);
});

// ===========================================================================
// Negative security
// ===========================================================================
test('transition rejects wrong old bundle digest', t => {
  const world = setupWorld(t);
  expectCode(
    () => T.candidateTransition(transitionOptions(world, { oldBundleDigest: S('bad') })),
    'generation_transition_old_bundle_digest_mismatch'
  );
});

test('transition rejects wrong new bundle digest', t => {
  const world = setupWorld(t);
  expectCode(
    () => T.candidateTransition(transitionOptions(world, { newBundleDigest: S('bad') })),
    'generation_transition_new_bundle_digest_mismatch'
  );
});

test('transition rejects wrong old authority digest', t => {
  const world = setupWorld(t);
  expectCode(
    () => T.candidateTransition(transitionOptions(world, { oldAuthorityDigest: S('bad') })),
    'generation_transition_old_authority_digest_mismatch'
  );
});

test('transition rejects wrong new authority digest', t => {
  const world = setupWorld(t);
  expectCode(
    () => T.candidateTransition(transitionOptions(world, { newAuthorityDigest: S('bad') })),
    'generation_transition_new_authority_digest_mismatch'
  );
});

test('transition rejects a staged bundle symlink', t => {
  const world = setupWorld(t, {
    newBundleMutation: root => {
      const target = path.join(root, T.BUNDLE_FILES[0]);
      fs.unlinkSync(target);
      fs.symlinkSync('/etc/passwd', target);
    }
  });
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_source_unsafe'
  );
});

test('transition rejects a staged bundle extra file', t => {
  const world = setupWorld(t, {
    newBundleMutation: root => {
      fs.writeFileSync(path.join(root, 'deploy/native-runtime/evil.js'), 'x');
    }
  });
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_staged_bundle_extra_file'
  );
});

test('transition rejects a staged bundle missing file', t => {
  const world = setupWorld(t, {
    newBundleMutation: root => {
      fs.unlinkSync(path.join(root, T.BUNDLE_FILES[T.BUNDLE_FILES.length - 1]));
    }
  });
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_source_unavailable'
  );
});

test('transition rejects a staged bundle group/other writable', t => {
  const world = setupWorld(t, {
    newBundleMutation: root => {
      fs.chmodSync(path.join(root, T.BUNDLE_FILES[0]), 0o666);
    }
  });
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_source_unsafe'
  );
});

test('transition rejects a running NEW runtime', t => {
  const world = setupWorld(t, { newRuntimeRunning: true });
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_new_runtime_active'
  );
});

test('transition rejects a running OLD runtime', t => {
  const world = setupWorld(t, { oldRuntimeRunning: true });
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_old_runtime_active'
  );
});

test('transition rejects lifecycle identity mismatch', t => {
  const world = setupWorld(t);
  world.containers[EDGE_ID].State.Running = false;
  expectCode(
    () => T.candidateTransition(transitionOptions(world)),
    'generation_transition_lifecycle_not_running'
  );
});

test('transition CLI rejects caller target-path injection', () => {
  const args = [
    '--old-authority-digest=' + S('a'), '--old-bundle-digest=' + S('b'),
    '--new-authority-candidate=/x', '--new-authority-digest=' + S('c'),
    '--new-bundle-root=/y', '--new-bundle-digest=' + S('d'),
    '--installed-bundle-root=/evil'
  ];
  expectCode(() => T.parseArguments(args), 'generation_transition_target_injection_rejected');
});

test('transition CLI rejects caller Node-path injection', () => {
  const args = [
    '--old-authority-digest=' + S('a'), '--old-bundle-digest=' + S('b'),
    '--new-authority-candidate=/x', '--new-authority-digest=' + S('c'),
    '--new-bundle-root=/y', '--new-bundle-digest=' + S('d'),
    '--node=/evil/node'
  ];
  expectCode(() => T.parseArguments(args), 'generation_transition_target_injection_rejected');
});

test('transition main requires root', () => {
  expectCode(
    () => T.main(['--old-authority-digest=' + S('a')], { getuid: () => 1000 }),
    'generation_transition_root_required'
  );
});

test('transition main rejects lifecycle lock busy', () => {
  const args = [
    '--old-authority-digest=' + S('a'), '--old-bundle-digest=' + S('b'),
    '--new-authority-candidate=/x', '--new-authority-digest=' + S('c'),
    '--new-bundle-root=/y', '--new-bundle-digest=' + S('d'),
    '--execute=true'
  ];
  const lockPath = path.join(os.tmpdir(), `lock-${process.pid}-${Math.random()}`);
  expectCode(
    () => T.main(args, {
      getuid: () => 0,
      dockerInspect: () => { throw new Error('not reached'); },
      fsModule: { mkdirSync: () => {} },
      lockPath,
      spawnFile: () => ({ status: 75 })
    }),
    'generation_transition_lifecycle_lock_busy'
  );
});

test('transition main rejects lifecycle lock wrong inode', () => {
  const lockPath = path.join(os.tmpdir(), `lock-${process.pid}-${Math.random()}`);
  fs.writeFileSync(lockPath, '');
  const other = path.join(os.tmpdir(), `other-${process.pid}-${Math.random()}`);
  fs.writeFileSync(other, '');
  const fd = fs.openSync(other, 'r+');
  try {
    process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD = String(fd);
    const args = [
      '--old-authority-digest=' + S('a'), '--old-bundle-digest=' + S('b'),
      '--new-authority-candidate=/x', '--new-authority-digest=' + S('c'),
      '--new-bundle-root=/y', '--new-bundle-digest=' + S('d'),
      '--execute=true'
    ];
    expectCode(
      () => T.main(args, {
        getuid: () => 0,
        dockerInspect: () => { throw new Error('not reached'); },
        lockPath
      }),
      'host_launcher_lifecycle_lock_proof_invalid'
    );
  } finally {
    delete process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD;
    fs.closeSync(fd);
    fs.unlinkSync(lockPath);
    fs.unlinkSync(other);
  }
});

// ===========================================================================
// Execute mode (failure injection)
// ===========================================================================
function executeWorld(t, launcherOverrides = {}) {
  const world = setupWorld(t);
  const options = transitionOptions(world, {
    execFile: makeFakeExecFile(world, launcherOverrides),
    randomBytes: () => Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaa', 'hex')
  });
  return { world, options };
}

function pairState(world) {
  let authority = null;
  try { authority = JSON.parse(world.sandbox.readFileSync(T.CONTROL_AUTHORITY, 'utf8')); } catch {}
  let bundle = null;
  try { bundle = T.installedBundleDigest({ fsModule: world.sandbox }); } catch {}
  return {
    bundleNew: bundle === world.newBundleDigest,
    bundleOld: bundle === world.oldBundleDigest,
    authorityNew: authority !== null && digest(authority) === world.newAuthorityDigest,
    authorityOld: authority !== null && digest(authority) === world.oldAuthorityDigest
  };
}

function assertCoherentPair(world) {
  const state = pairState(world);
  assert.ok(
    (state.bundleOld && state.authorityOld) || (state.bundleNew && state.authorityNew),
    `cross-generation pair leaked: ${JSON.stringify(state)}`
  );
}

test('transition execute commits NEW+NEW and leaves a COMMITTED journal', t => {
  const { world, options } = executeWorld(t);
  const result = T.executeTransition(options);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'generation_transition_committed');
  assert.equal(result.transactionId, 'aaaaaaaaaaaaaaaaaaaaaaaa');
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityNew);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'COMMITTED');
  assert.equal(journal.transactionId, result.transactionId);
});

test('transition failure injection: transient final verify failure commits NEW+NEW', t => {
  const { world, options } = executeWorld(t, { verifyFailFirst: 1 });
  const result = T.executeTransition(options);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'generation_transition_committed_after_failure');
  assert.equal(result.transactionId, 'aaaaaaaaaaaaaaaaaaaaaaaa');
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityNew, 'verified NEW+NEW must commit after failure');
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'COMMITTED');
});

test('transition failure injection: persistent final verify failure rolls back to OLD+OLD', t => {
  const { world, options } = executeWorld(t, { verifyShouldFail: true });
  expectCode(
    () => T.executeTransition(options),
    'generation_transition_rollback_verify_failed'
  );
  const state = pairState(world);
  assert.ok(state.bundleOld && state.authorityOld, 'unverifiable NEW+NEW must roll back to OLD+OLD');
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'ROLLED_BACK');
});

test('transition failure injection: COMMITTED journal write failure keeps NEW+NEW', t => {
  const { world, options } = executeWorld(t);
  let committedWriteFailed = false;
  const journalFailingSandbox = new Proxy(world.sandbox, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'writeFileSync' && typeof value === 'function') {
        return (...args) => {
          const content = String(args[1] ?? '');
          if (!committedWriteFailed && content.includes('"state":"COMMITTED"')) {
            committedWriteFailed = true;
            throw new Error('committed journal write injected failure');
          }
          return value.apply(target, args);
        };
      }
      return value;
    }
  });
  const result = T.executeTransition({ ...options, fsModule: journalFailingSandbox });
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'generation_transition_committed_after_failure');
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityNew);
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'COMMITTED');
});

test('transition failure injection: activation failure rolls back to OLD+OLD', t => {
  const { world, options } = executeWorld(t, { activateShouldFail: true });
  expectCode(
    () => T.executeTransition(options),
    'generation_transition_authority_activation_failed'
  );
  assert.equal(T.installedBundleDigest({ fsModule: world.sandbox }), world.oldBundleDigest);
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'ROLLED_BACK');
});

// ===========================================================================
// Interrupted-state recovery matrix (fixture-constructed, no real kill)
// ===========================================================================
// Fixture transaction ids use '0'*24 so the real transaction ('a'*24 from the
// injected randomBytes) sorts later and wins readLatestJournal after a commit.
const FIXTURE_TID = '0'.repeat(24);

function withInterruptedState(world, {
  bundle = 'old',
  authority = 'old',
  journalState = 'PREPARED'
} = {}) {
  const journalRoot = world.journalRoot;
  const backupRoot = path.join(journalRoot, FIXTURE_TID);
  const oldRoot = path.join(world.backing, T.INSTALLED_BUNDLE_ROOT.replace(/^\//, ''));
  fs.mkdirSync(path.join(backupRoot, 'old-bundle'), { recursive: true, mode: 0o700 });
  for (const rel of T.BUNDLE_FILES) {
    const src = path.join(oldRoot, rel);
    const dst = path.join(backupRoot, 'old-bundle', rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true, mode: 0o700 });
    fs.copyFileSync(src, dst);
  }
  fs.writeFileSync(path.join(backupRoot, 'old-authority.json'),
    canonicalJson(world.oldAuthority), { mode: 0o600 });
  const journal = {
    schemaVersion: T.JOURNAL_SCHEMA,
    transactionId: FIXTURE_TID,
    state: journalState,
    updatedAt: new Date().toISOString(),
    oldAuthorityDigest: world.oldAuthorityDigest,
    oldBundleDigest: world.oldBundleDigest,
    newAuthorityDigest: world.newAuthorityDigest,
    newBundleDigest: world.newBundleDigest
  };
  fs.writeFileSync(path.join(journalRoot, `${FIXTURE_TID}.json`),
    canonicalJson(journal), { mode: 0o600 });

  const installedRoot = path.join(world.backing, T.INSTALLED_BUNDLE_ROOT.replace(/^\//, ''));
  if (bundle === 'new') {
    writeBundle(installedRoot, NEW_BUNDLE_CONTENT);
  } else if (bundle === 'unknown') {
    writeBundle(installedRoot, '// unknown bundle generation\nmodule.exports = {};\n');
  }
  const authorityPath = path.join(world.backing, T.CONTROL_AUTHORITY.replace(/^\//, ''));
  if (authority === 'new') {
    fs.writeFileSync(authorityPath, canonicalJson(world.next), { mode: 0o644 });
  } else if (authority === 'unknown') {
    fs.writeFileSync(authorityPath,
      canonicalJson({ ...world.next, codexMemoryCommit: C('ff') }), { mode: 0o644 });
  }
}

test('transition recovery: OLD+OLD PREPARED needs no restore and commits NEW+NEW', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, { journalState: 'PREPARED' });
  const result = T.executeTransition(options);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'generation_transition_committed');
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityNew);
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'COMMITTED');
});

test('transition recovery: NEW+OLD BUNDLE_PUBLISHED restores OLD bundle', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, { bundle: 'new', journalState: 'BUNDLE_PUBLISHED' });
  const result = T.executeTransition(options);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'rolled_back_before_transaction');
  const state = pairState(world);
  assert.ok(state.bundleOld && state.authorityOld, 'interrupted NEW+OLD must restore OLD+OLD');
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'ROLLED_BACK');
});

test('transition recovery: NEW+NEW BUNDLE_PUBLISHED verifies and commits NEW', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, {
    bundle: 'new', authority: 'new', journalState: 'BUNDLE_PUBLISHED'
  });
  const result = T.executeTransition(options);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'generation_transition_committed_after_recovery');
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityNew);
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'COMMITTED');
});

test('transition recovery: OLD+NEW AUTHORITY_ACTIVATED restores OLD authority', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, { authority: 'new', journalState: 'AUTHORITY_ACTIVATED' });
  const result = T.executeTransition(options);
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'rolled_back_before_transaction');
  const state = pairState(world);
  assert.ok(state.bundleOld && state.authorityOld, 'interrupted OLD+NEW must restore OLD+OLD');
  assertCoherentPair(world);
  const journal = T.readLatestJournal({ fsModule: world.sandbox, journalRoot: world.journalRoot });
  assert.equal(journal.state, 'ROLLED_BACK');
});

test('transition recovery: unknown pair fails closed for any journal', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, {
    bundle: 'unknown', authority: 'unknown', journalState: 'AUTHORITY_ACTIVATED'
  });
  expectCode(
    () => T.executeTransition(options),
    'generation_transition_recovery_state_invalid'
  );
});

test('transition recovery: corrupted OLD authority backup fails closed', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, { authority: 'new', journalState: 'AUTHORITY_ACTIVATED' });
  // Corrupt the preserved OLD authority bytes so they no longer match the
  // OLD digest: recovery must fail closed instead of writing bad bytes.
  fs.writeFileSync(
    path.join(world.journalRoot, FIXTURE_TID, 'old-authority.json'),
    canonicalJson({ ...world.oldAuthority, codexMemoryCommit: C('ee') }),
    { mode: 0o600 }
  );
  expectCode(
    () => T.executeTransition(options),
    'generation_transition_old_authority_backup_invalid'
  );
  // The control authority must remain untouched (still NEW) because recovery
  // fails before any restore write.
  const state = pairState(world);
  assert.ok(state.bundleOld && state.authorityNew, 'no partial authority restore');
});

test('transition recovery: corrupted OLD bundle backup fails closed', t => {
  const { world, options } = executeWorld(t);
  withInterruptedState(world, { bundle: 'new', journalState: 'BUNDLE_PUBLISHED' });
  // Corrupt one preserved OLD bundle file so the backup no longer matches the
  // OLD bundle digest.
  fs.writeFileSync(
    path.join(world.journalRoot, FIXTURE_TID, 'old-bundle',
      T.BUNDLE_FILES[0]),
    '// corrupted preserved bundle\nmodule.exports = {};\n',
    { mode: 0o644 }
  );
  expectCode(
    () => T.executeTransition(options),
    'generation_transition_old_bundle_backup_invalid'
  );
  // No restore may have happened: the installed bundle stays NEW.
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityOld, 'no partial bundle restore');
});

test('transition rollback: corrupted OLD authority backup fails closed before partial restore', t => {
  const { world, options } = executeWorld(t, { verifyShouldFail: true });
  // Corrupt the preserved OLD authority backup the moment backupOldPair writes
  // it (before activation), so rollback must reject it before touching either
  // installed object.
  const backupAuthorityPath = path.join(
    world.journalRoot, 'aaaaaaaaaaaaaaaaaaaaaaaa', 'old-authority.json'
  );
  const realRename = world.sandbox.renameSync.bind(world.sandbox);
  world.sandbox.renameSync = (from, to, ...rest) => {
    const result = realRename(from, to, ...rest);
    if (path.resolve(to) === path.resolve(backupAuthorityPath)) {
      fs.writeFileSync(
        backupAuthorityPath,
        canonicalJson({ ...world.oldAuthority, codexMemoryCommit: C('ee') }),
        { mode: 0o600 }
      );
    }
    return result;
  };
  expectCode(
    () => T.executeTransition(options),
    'generation_transition_old_authority_backup_invalid'
  );
  // Both backups are validated up front: the pair must remain NEW+NEW with no
  // partial bundle restore.
  const state = pairState(world);
  assert.ok(state.bundleNew && state.authorityNew, 'no partial restore on corrupt backup');
});

// ===========================================================================
// Production CLI wiring (no-DI docker observer) + DI support + injection
// ===========================================================================
test('transition main without DI provides canonical docker observer (no docker_unavailable)', t => {
  // Production main() runs with deps = {}: common.dockerInspect must fall back
  // to the canonical host-launcher observer, so the docker_unavailable failure
  // is unreachable. Use an empty root sandbox: the first failure happens in
  // verifyOldPair (authority read) BEFORE any docker invocation, proving the
  // observer check already passed.
  const backing = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cli-wiring-'));
  const sandbox = rootSandbox(backing);
  t.after(() => fs.rmSync(backing, { force: true, recursive: true }));
  const args = [
    '--old-authority-digest=' + S('a'), '--old-bundle-digest=' + S('b'),
    '--new-authority-candidate=/x', '--new-authority-digest=' + S('c'),
    '--new-bundle-root=/y', '--new-bundle-digest=' + S('d')
  ];
  // If the production wiring regressed, this would fail with
  // generation_transition_docker_unavailable; with the canonical observer
  // wired it proceeds into verifyOldPair and fails on the missing authority.
  expectCode(
    () => T.main(args, { getuid: () => 0, fsModule: sandbox, lockPath: '/tmp/unused.lock' }),
    'generation_transition_root_file_unavailable'
  );
});

test('transition main with custom dockerInspect DI still supported', t => {
  const world = setupWorld(t);
  const args = [
    '--old-authority-digest=' + world.oldAuthorityDigest,
    '--old-bundle-digest=' + world.oldBundleDigest,
    '--new-authority-candidate=' + world.newCandidatePath,
    '--new-authority-digest=' + world.newAuthorityDigest,
    '--new-bundle-root=' + world.stagedRoot,
    '--new-bundle-digest=' + world.newBundleDigest
  ];
  const result = T.main(args, {
    getuid: () => 0,
    fsModule: world.sandbox,
    dockerInspect: world.dockerInspect,
    journalRoot: world.journalRoot
  });
  assert.equal(result.accepted, true);
  assert.equal(result.action, 'generation_transition_candidate');
  assert.equal(result.mutation, false);
});

test('transition CLI rejects caller docker-path injection', () => {
  const args = [
    '--old-authority-digest=' + S('a'), '--old-bundle-digest=' + S('b'),
    '--new-authority-candidate=/x', '--new-authority-digest=' + S('c'),
    '--new-bundle-root=/y', '--new-bundle-digest=' + S('d'),
    '--docker=/evil/docker'
  ];
  expectCode(() => T.parseArguments(args), 'generation_transition_target_injection_rejected');
});
