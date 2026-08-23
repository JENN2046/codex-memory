'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  AUTHORITY_DEPENDENCY_GRAPH,
  AUTHORITY_SCHEMA,
  BUILD_MANIFEST_SCHEMA,
  EDGE_RECEIPT_SCHEMA,
  PROVIDER_RECEIPT_SCHEMA,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  STATE_MOUNT_SCHEMA,
  VCP_IMAGE_RUNTIME_AUTHORITY_SCHEMA,
  VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION,
  authorityGraphPrecedes,
  authorityRecordDigest,
  buildManifestDigest,
  canonicalJson,
  containerConfigDigest,
  countAuthorityGraphCycles,
  digest,
  hostTrustBundleDigest,
  INITIAL_PROFILE_SEED_KEYS,
  profileAuthorityComponents,
  profileV7InitialBootstrapCandidate,
  profileV7MigrationCandidate,
  readBoundedJson,
  sha256Buffer,
  validateAuthorityRecord,
  validateBuildManifest,
  validateContainerInspection,
  validateEdgeReceipt,
  validateImageProfile,
  validateProviderReceipt,
  validateImageInspection,
  validateRuntimeSelfEvidence,
  validateStateMountContract,
  vcpImageRuntimeAuthorityDigest
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY, EDGE_POLICY_DIGEST, PROVIDER_POLICY, PROVIDER_POLICY_DIGEST,
  RUNTIME_POLICY_DIGEST,
  validateEdgeCandidate, validateProviderCandidate, validateRuntimeCandidate
} = require('../src/runtime/native-image/container-policy');
const {
  EXPECTED_BETTER_SQLITE_PATH, EXPECTED_VEXUS_PATH, EXPECTED_VEXUS_SHA256,
  NATIVE_CLOSURE_SCHEMA,
  nativeClosureDigest, validateNativeClosure
} = require('../src/runtime/native-image/native-closure');
const {
  deriveContainerVcpRuntimeIdentity,
  containerSupervisorAuthorityMatchesProfile,
  profileVcpRuntimeIdentityMatches,
  profileVcpRuntimeIdentityMode,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  atomicRootReceipt,
  buildEdgeReceipt,
  buildProviderReceipt,
  start,
  validateEdgeContainer,
  validateHostProfileBytes,
  validateImageForHost,
  validateProviderContainer,
  validateStableHostMountSource,
  verifyHostAuthority
} = require('../deploy/native-runtime/host-launcher');
const {
  main: createRuntimeAuthorityMain,
  readInitialProfileSeed,
  validateAuthorityProfileBytes
} = require('../scripts/create-codex-memory-runtime-authority');
const {
  HISTORICAL_PROVIDER_REVISION,
  historicalProviderInspect
} = require('./fixtures/native-provider-inspect-v2');
const {
  stage: stageInitialMounts,
  materialize: materializeInitialMounts
} = require('../host-bootstrap/prepare-initial-runtime-mounts');

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);
const ALLOWED_RUNTIME_ENV = Object.freeze([
  'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH', 'CODEX_MEMORY_CONTAINER_SUPERVISOR',
  'CODEX_MEMORY_EDGE_RECEIPT_PATH', 'CODEX_MEMORY_PROVIDER_RECEIPT_PATH',
  'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH', 'CODEX_MEMORY_STACK_PROFILE_PATH',
  'CODEX_MEMORY_STACK_RUNTIME_DIR', 'XDG_RUNTIME_DIR', 'NODE_ENV', 'VCP_ROOT', 'VCPTOOLBOX_ROOT'
]);
const SOURCES = Object.freeze({
  authority: '/etc/codex-memory/authority.json',
  edgeReceipt: '/run/codex-memory/edge-receipt.json',
  primaryState: '/synthetic/r5c',
  profile: '/etc/codex-memory/profile.json',
  providerEnvironment: '/etc/codex-memory/vcp-provider.env',
  providerReceipt: '/run/codex-memory/provider-receipt.json',
  runtimeDirectory: '/var/lib/codex-memory/runtime'
});

function providerElf() {
  const value = Buffer.alloc(64);
  value.writeUInt32BE(0x7f454c46, 0);
  value[4] = 2;
  value[5] = 1;
  value.writeUInt16LE(62, 18);
  return value;
}

function providerEvidenceOptions(overrides = {}) {
  return {
    containerFile: () => providerElf(),
    providerContainerChanges: () => [],
    providerImageAdmission: () => ({
      daemonImageIdentity: PROVIDER_POLICY.daemonImageIdentity,
      imageConfigDigest: PROVIDER_POLICY.imageConfigDigest,
      imageInheritedEnvironment: {
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      },
      imageStoreIdentityModel: PROVIDER_POLICY.imageStoreIdentityModel,
      ociManifestDigest: PROVIDER_POLICY.ociManifestDigest
    }),
    providerImageArchive: () => Buffer.alloc(0),
    providerImageInspect: () => ({
      Architecture: 'amd64', Config: { Env: [
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      ], Labels: {} },
      Descriptor: { digest: PROVIDER_POLICY.ociManifestDigest },
      Id: PROVIDER_POLICY.daemonImageIdentity, Os: 'linux',
      RepoDigests: [
        `${PROVIDER_POLICY.imageRepository}@${PROVIDER_POLICY.ociManifestDigest}`
      ]
    }),
    ...overrides
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
    schemaVersion: NATIVE_CLOSURE_SCHEMA
  };
}

function buildManifest(overrides = {}) {
  const fileManifest = [
    { mode: '100644', path: 'codex-memory/package.json', sha256: S('1'), size: 2 },
    { mode: '100755', path: 'vcptoolbox/KnowledgeBaseManager.js', sha256: S('2'), size: 3 }
  ];
  return {
    baseImageIndexDigest: S('3'),
    baseImagePlatformDigest: S('4'),
    buildContextFileManifestDigest: digest(fileManifest),
    buildToolVersions: { buildx: 'buildx-v1', docker: '29.7.2' },
    codexMemoryCommit: C('a'),
    codexMemoryTree: S('5'),
    fileManifest,
    lockfileDigests: { codexMemory: S('6'), vcp: S('7') },
    nodeVersion: '22.23.1',
    runtimeBuildManifestVersion: BUILD_MANIFEST_SCHEMA,
    sourceDateEpoch: 1_700_000_000,
    vcpCommit: C('b'),
    vcpTree: S('8'),
    vexusSha256: S('9'),
    ...overrides
  };
}

function baseInspect(overrides = {}) {
  return {
    Config: {
      Cmd: [],
      Entrypoint: [
        '/usr/local/bin/node',
        '/opt/codex-memory/scripts/codex-memory-stack.js',
        '_container-supervisor'
      ],
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
      CapAdd: [],
      CapDrop: ['ALL'],
      CgroupnsMode: '', Devices: [], DeviceRequests: [],
      IpcMode: 'private', LogConfig: { Type: 'none' },
      NetworkMode: 'host',
      PidMode: '', PortBindings: {},
      Privileged: false,
      ReadonlyRootfs: true,
      RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'],
      Tmpfs: {
        '/run/codex-memory-runtime': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
        '/tmp': 'rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000'
      }, UsernsMode: '', UTSMode: ''
    },
    Id: I('c'),
    Image: S('d'),
    Mounts: [
      { Destination: '/run/codex-memory/authority.json', Propagation: 'rprivate', RW: false, Source: SOURCES.authority, Type: 'bind' },
      { Destination: '/run/codex-memory/edge-receipt.json', Propagation: 'rprivate', RW: false, Source: SOURCES.edgeReceipt, Type: 'bind' },
      { Destination: '/run/codex-memory/profile.json', Propagation: 'rprivate', RW: false, Source: SOURCES.profile, Type: 'bind' },
      { Destination: '/run/codex-memory/provider-receipt.json', Propagation: 'rprivate', RW: false, Source: SOURCES.providerReceipt, Type: 'bind' },
      { Destination: '/run/secrets/codex-memory-vcp-provider.env', Propagation: 'rprivate', RW: false, Source: SOURCES.providerEnvironment, Type: 'bind' },
      { Destination: '/run/codex-memory-runtime-data', Propagation: 'rprivate', RW: true, Source: SOURCES.runtimeDirectory, Type: 'bind' },
      { Destination: '/srv/codex-memory/r5c', Propagation: 'rprivate', RW: false, Source: SOURCES.primaryState, Type: 'bind' }
    ],
    State: { Running: false },
    ...overrides
  };
}

function stateContract(containerPath = '/srv/codex-memory/r5c') {
  return {
    containerPath,
    readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c'
  };
}

function authority(inspect = baseInspect(), overrides = {}) {
  const stateMountContract = stateContract('/srv/codex-memory/r5c');
  const manifest = buildManifest();
  const value = {
    acceptedImageConfigId: S('d'),
    acceptedOciArchiveSha256: S('a'),
    acceptedOciManifestDigest: S('e'),
    authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: buildManifestDigest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit,
    containerConfigDigest: containerConfigDigest(inspect),
    edgeConfigDigest: S('f'),
    edgeContainerId: I('1'),
    edgeArtifactSha256: S('2'),
    edgeBindingDigest: S('b'),
    edgeBindingReference: 'binding:r4:accepted',
    edgeBuildContextDigest: S('3'),
    edgeBuildManifestDigest: S('4'),
    edgeDaemonImageIdentity: S('5'),
    edgeHostProjectReference: 'host:private-development',
    edgeImageConfigDigest: S('6'),
    edgeImageStoreIdentityModel: 'docker-containerd-manifest-identity/v1',
    edgeLifecycleAuthority: 'host_launcher',
    edgeLockfileSha256: S('7'),
    edgeOciManifestDigest: S('5'),
    edgeOperatorReference: 'operator:jenn-owner',
    edgeRevision: manifest.codexMemoryCommit,
    edgePreviousBindingReference: 'binding:r4:previous',
    edgeSourceCommit: manifest.codexMemoryCommit,
    edgePolicyDigest: EDGE_POLICY_DIGEST,
    expectedRuntimeContainerId: inspect.Id,
    hostLauncherDigest: S('3'),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    nativeClosureDigest: nativeClosureDigest(nativeClosure()),
    profilePath: SOURCES.profile,
    profileSchemaVersion: 7,
    profileSha256: S('0'),
    providerContainerConfigDigest: S('8'),
    providerContainerId: I('8'),
    providerDaemonImageIdentity: PROVIDER_POLICY.daemonImageIdentity,
    providerImageConfigDigest: PROVIDER_POLICY.imageConfigDigest,
    providerImageStoreIdentityModel: PROVIDER_POLICY.imageStoreIdentityModel,
    providerOciManifestDigest: PROVIDER_POLICY.ociManifestDigest,
    providerPolicyDigest: PROVIDER_POLICY_DIGEST,
    providerRevision: HISTORICAL_PROVIDER_REVISION,
    rootfsChainDigest: digest([S('4'), S('5')]),
    runtimeMountSources: SOURCES,
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST,
    stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit,
    ...overrides
  };
  if (!Object.hasOwn(overrides, 'profileSha256')) {
    value.profileSha256 = sha256Buffer(profileBytes(value));
  }
  return value;
}

function currentProfile(a) {
  return {
    adoptedRepositoryHead: C('1'),
    controllerSourceManifestDigest: S('1'),
    controllerSourceManifestVersion: 1,
    edgeContainer: 'codex-memory-full-stack-001-edge',
    edgeContainerId: a.edgeContainerId,
    governanceEnvironment: 'governance/runtime.env',
    governanceEnvironmentConfigDigest: S('2'),
    privateRoot: '/srv/codex-memory/r5c',
    providerContainer: 'new-api-wsl',
    providerContainerId: a.providerContainerId,
    providerImageId: a.providerDaemonImageIdentity,
    providerRevision: a.providerRevision,
    relayEnvironment: 'relay/runtime.env',
    relayEnvironmentConfigDigest: S('4'),
    retainedBinding: 'binding.json',
    retainedBindingSource: C('4'),
    runtimeBaseline: C('5'),
    runtimeRepository: '/repo',
    schemaVersion: 6,
    vcpProviderConfigDigest: S('5'),
    vcpRuntimeBaseline: C('6'),
    vcpRuntimeContractDigest: S('6'),
    vcpRuntimeIdentitySchemaVersion: 1,
    vcpRuntimeRepository: '/vcp',
    vcpRuntimeScopeDigest: S('7')
  };
}

function historicalProfile(a, overrides = {}) {
  const {
    vcpRuntimeContractDigest: _vcpRuntimeContractDigest,
    vcpRuntimeIdentitySchemaVersion: _vcpRuntimeIdentitySchemaVersion,
    ...historical
  } = currentProfile(a);
  return { ...historical, ...overrides };
}

function imageProfile(a) {
  const current = currentProfile(a);
  return profileV7MigrationCandidate(current, profileAuthorityComponents(a), {
    expectedCurrentFingerprint: digest(current)
  }).nextProfile;
}

function initialProfileSeed(privateRoot = '/srv/codex-memory/r5c') {
  return {
    controllerSourceManifestDigest: S('1'),
    controllerSourceManifestVersion: 1,
    edgeContainer: 'codex-memory-current-edge',
    governanceEnvironment: 'governance/runtime.env',
    governanceEnvironmentConfigDigest: S('2'),
    privateRoot,
    providerContainer: 'new-api-wsl',
    relayEnvironment: 'relay/runtime.env',
    relayEnvironmentConfigDigest: S('4'),
    retainedBinding: 'binding.json',
    retainedBindingSource: C('4'),
    vcpProviderConfigDigest: S('5'),
    vcpRuntimeScopeDigest: S('7')
  };
}

function profileBytes(a) {
  return Buffer.from(canonicalJson(imageProfile(a)));
}

function edgeInspect(a = authority(), overrides = {}) {
  const environment = {
    ...EDGE_POLICY.imageEnvironment,
    CODEX_MEMORY_R4_AUTH0_ISSUER: 'https://tenant.invalid/',
    CODEX_MEMORY_R4_AUTH0_JWKS_URI: 'https://tenant.invalid/.well-known/jwks.json',
    CODEX_MEMORY_R4_BINDING_DIGEST: a.edgeBindingDigest,
    CODEX_MEMORY_R4_BINDING_REFERENCE: a.edgeBindingReference,
    CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256: a.edgeArtifactSha256,
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: 'edge-key-v1',
    CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY:
      'file:/run/secrets/codex-memory-r4/edge-private.pem',
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY:
      'file:/run/secrets/codex-memory-r4/edge-public.pem',
    CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE: a.edgeHostProjectReference,
    CODEX_MEMORY_R4_LOCKFILE_SHA256: a.edgeLockfileSha256,
    CODEX_MEMORY_R4_OAUTH_CLIENT_ID: 'oauth-client-v1',
    CODEX_MEMORY_R4_OPERATOR_REFERENCE: a.edgeOperatorReference,
    CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT: 'sha256:operator-fingerprint',
    CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE: a.edgePreviousBindingReference,
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: 'https://memory.invalid',
    CODEX_MEMORY_R4_RELAY_AUTH_TOKEN:
      'file:/run/secrets/codex-memory-r4/relay-token',
    CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID: 'relay-key-v1',
    CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY:
      'file:/run/secrets/codex-memory-r4/relay-public.pem',
    CODEX_MEMORY_R4_SOURCE_COMMIT: a.edgeSourceCommit
  };
  return {
    Config: { Cmd: [], Entrypoint: [...EDGE_POLICY.entrypoint],
      Env: Object.entries(environment).map(([name, value]) => `${name}=${value}`),
      Healthcheck: structuredClone(EDGE_POLICY.healthcheck), Labels: {
      'org.opencontainers.image.revision': a.edgeRevision
    }, User: '1000:1000', WorkingDir: EDGE_POLICY.workingDirectory },
    HostConfig: {
      CapAdd: [], CapDrop: ['ALL'], CgroupnsMode: '', Devices: [], DeviceRequests: [],
      IpcMode: 'private', LogConfig: { Type: 'none' }, NetworkMode: 'bridge',
      PidMode: '', Privileged: false, ReadonlyRootfs: true,
      PortBindings: { '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '18080' }] },
      RestartPolicy: { Name: 'no' }, SecurityOpt: ['no-new-privileges:true'],
      Tmpfs: {}, UsernsMode: '', UTSMode: ''
    },
    Id: a.edgeContainerId,
    Image: a.edgeDaemonImageIdentity,
    Mounts: [{ Destination: '/run/secrets/codex-memory-r4', Propagation: 'rprivate', RW: false, Source: '/etc/codex-memory/edge-secret', Type: 'bind' }],
    State: { Health: { Status: 'healthy' }, Running: true },
    ...overrides
  };
}

function edgeSecretFilesystem() {
  const source = '/etc/codex-memory/edge-secret';
  const names = ['edge-private.pem', 'edge-public.pem', 'relay-public.pem', 'relay-token'];
  const contents = Object.fromEntries(names.map(name =>
    [path.join(source, name), Buffer.from(`synthetic-${name}`)]));
  const directoryStat = (gid, mode) => ({ gid, mode, size: 0, uid: 0,
    isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false });
  const fileStat = bytes => ({ gid: 1000, mode: 0o440, size: bytes.length, uid: 0,
    isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false });
  return {
    ...fs,
    lstatSync(target) {
      if (target === '/' || target === '/etc' || target === '/etc/codex-memory') {
        return directoryStat(0, 0o755);
      }
      if (target === source) return directoryStat(1000, 0o750);
      if (contents[target]) return fileStat(contents[target]);
      return fs.lstatSync(target);
    },
    readFileSync(target, ...args) {
      return contents[target] || fs.readFileSync(target, ...args);
    },
    readdirSync(target, ...args) {
      return target === source ? [...names] : fs.readdirSync(target, ...args);
    },
    realpathSync(target, ...args) {
      return target === source || contents[target] ? target : fs.realpathSync(target, ...args);
    }
  };
}

function coldBootFilesystem(backingRoot) {
  const base = edgeSecretFilesystem();
  const canonicalRoot = '/run/codex-memory';
  const translate = target => target === canonicalRoot
    ? backingRoot
    : target.startsWith(`${canonicalRoot}/`)
      ? path.join(backingRoot, target.slice(canonicalRoot.length + 1))
      : target;
  const rootStat = mode => ({ dev: 1, gid: 0, ino: 1, mode, size: 0, uid: 0,
    isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false });
  const rootOwned = stat => ({
    dev: stat.dev, gid: 0, ino: stat.ino, mode: stat.mode, size: stat.size, uid: 0,
    isDirectory: () => stat.isDirectory(),
    isFile: () => stat.isFile(),
    isSymbolicLink: () => stat.isSymbolicLink()
  });
  return {
    ...base,
    existsSync(target) { return fs.existsSync(translate(target)); },
    fchmodSync: fs.fchmodSync,
    fchownSync() {},
    closeSync: fs.closeSync,
    fstatSync(descriptor) { return rootOwned(fs.fstatSync(descriptor)); },
    fsyncSync: fs.fsyncSync,
    lstatSync(target) {
      if (target === '/' || target === '/run') return rootStat(0o755);
      if (target === canonicalRoot || target.startsWith(`${canonicalRoot}/`)) {
        return rootOwned(fs.lstatSync(translate(target)));
      }
      return base.lstatSync(target);
    },
    mkdirSync(target, options) { return fs.mkdirSync(translate(target), options); },
    openSync(target, flags, mode) { return fs.openSync(translate(target), flags, mode); },
    readFileSync(target, ...args) {
      return typeof target === 'string' &&
        (target === canonicalRoot || target.startsWith(`${canonicalRoot}/`))
        ? fs.readFileSync(translate(target), ...args)
        : base.readFileSync(target, ...args);
    },
    realpathSync(target, ...args) {
      if (target === canonicalRoot || target.startsWith(`${canonicalRoot}/`)) {
        const real = fs.realpathSync(translate(target), ...args);
        return `${canonicalRoot}${real.slice(backingRoot.length)}`;
      }
      return base.realpathSync(target, ...args);
    },
    renameSync(from, to) { fs.renameSync(translate(from), translate(to)); },
    writeFileSync: fs.writeFileSync
  };
}

function providerInspect(a = authority(), overrides = {}) {
  const value = historicalProviderInspect();
  value.Id = a.providerContainerId;
  value.Image = a.providerDaemonImageIdentity;
  value.Config.Labels['org.opencontainers.image.revision'] = a.providerRevision;
  value.State.Running = true;
  return Object.assign(value, overrides);
}

function authorityWithEdge(inspect = baseInspect()) {
  const initial = authority(inspect);
  const edge = edgeInspect(initial);
  const provider = providerInspect(initial);
  return authority(inspect, {
    edgeConfigDigest: containerConfigDigest(edge),
    providerContainerConfigDigest: containerConfigDigest(provider)
  });
}

function edgeReceipt(a, now = Date.now()) {
  return {
    edgeConfigDigest: a.edgeConfigDigest,
    edgeContainerId: a.edgeContainerId,
    edgeArtifactSha256: a.edgeArtifactSha256,
    edgeBuildContextDigest: a.edgeBuildContextDigest,
    edgeDaemonImageIdentity: a.edgeDaemonImageIdentity,
    edgeHealth: 'healthy',
    edgeImageConfigDigest: a.edgeImageConfigDigest,
    edgeImageStoreIdentityModel: a.edgeImageStoreIdentityModel,
    edgeOciManifestDigest: a.edgeOciManifestDigest,
    edgeRevision: a.edgeRevision,
    launchEpoch: 'boot-identity-0001',
    launcherAuthorityDigest: authorityRecordDigest(a),
    observedAt: now,
    schemaVersion: EDGE_RECEIPT_SCHEMA
  };
}

function edgeEvidenceOptions(a, overrides = {}) {
  const evidence = {
    artifactSha256: S('a'),
    buildContextDigest: a.edgeBuildContextDigest,
    buildManifestDigest: a.edgeBuildManifestDigest,
    imageConfigDigest: a.edgeImageConfigDigest,
    imageStoreIdentityModel: a.edgeImageStoreIdentityModel,
    lockfileSha256: a.edgeLockfileSha256,
    ociManifestDigest: a.edgeOciManifestDigest,
    schemaVersion: 'codex-memory-edge-image-authority/v1',
    sourceCommit: a.edgeSourceCommit
  };
  return {
    edgeImageAdmission: () => evidence,
    edgeImageArchive: () => Buffer.alloc(0),
    edgeImageInspect: () => ({
      Architecture: 'amd64', Config: { Labels: {
        'io.codex-memory.edge.build-context-digest': a.edgeBuildContextDigest,
        'io.codex-memory.edge.build-manifest-digest': a.edgeBuildManifestDigest,
        'io.codex-memory.edge.lockfile-sha256': a.edgeLockfileSha256,
        'org.opencontainers.image.revision': a.edgeSourceCommit
      } }, Descriptor: { digest: a.edgeOciManifestDigest },
      Id: a.edgeDaemonImageIdentity, Os: 'linux',
      RepoDigests: [`codex-memory-chatgpt-edge@${a.edgeOciManifestDigest}`]
    }),
    ...overrides
  };
}
function providerReceipt(a, now = Date.now()) {
  return {
    launchEpoch: 'boot-identity-0001', launcherAuthorityDigest: authorityRecordDigest(a),
    observedAt: now, providerContainerConfigDigest: a.providerContainerConfigDigest,
    providerContainerId: a.providerContainerId, providerHealth: 'healthy',
    providerDaemonImageIdentity: a.providerDaemonImageIdentity,
    providerImageConfigDigest: a.providerImageConfigDigest,
    providerImageStoreIdentityModel: a.providerImageStoreIdentityModel,
    providerOciManifestDigest: a.providerOciManifestDigest,
    providerRevision: a.providerRevision,
    schemaVersion: PROVIDER_RECEIPT_SCHEMA
  };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code);
}

function selfEvidence(a, overrides = {}) {
  return {
    authority: a, buildManifest: buildManifest(), edgeReceipt: edgeReceipt(a),
    nativeClosure: nativeClosure(), profileBytes: profileBytes(a),
    providerReceipt: providerReceipt(a), runtimeRoot: IMAGE_RUNTIME_ROOT,
    vcpRoot: IMAGE_VCP_ROOT, dockerSocketExists: () => false, ...overrides
  };
}

test('build manifest is exact and content-bound', () => {
  assert.equal(validateBuildManifest(buildManifest()).nodeVersion, '22.23.1');
});

test('A checkout mutation cannot change accepted embedded manifest', () => {
  const accepted = buildManifest();
  const changed = buildManifest({ codexMemoryTree: S('a') });
  assert.notEqual(buildManifestDigest(accepted), buildManifestDigest(changed));
});

test('B VCP checkout replacement changes the content identity', () => {
  const accepted = buildManifest();
  assert.notEqual(buildManifestDigest(accepted), buildManifestDigest({
    ...accepted, vcpTree: S('b')
  }));
});

test('C dirty/untracked substitution cannot be represented in exact file manifest', () => {
  const value = buildManifest();
  value.fileManifest.push({ mode: '100644', path: 'untracked.js', sha256: S('1'), size: 1 });
  expectCode(() => validateBuildManifest(value), 'runtime_build_manifest_file_invalid');
});

test('D wrong Vexus binary digest is rejected by image authority', () => {
  const image = { Id: S('d'), RootFS: { Layers: [S('4'), S('5')] } };
  const a = authority();
  expectCode(() => validateImageInspection(image, a,
    buildManifest({ vexusSha256: S('0') })), 'runtime_image_identity_mismatch');
});

test('E correct Vexus filename with wrong SHA changes manifest identity', () => {
  assert.notEqual(buildManifestDigest(buildManifest()),
    buildManifestDigest(buildManifest({ vexusSha256: S('0') })));
});

test('F post-image node_modules mutation is outside image root identity', () => {
  assert.equal(digest([S('4'), S('5')]), authority().rootfsChainDigest);
});

test('Edge source authority is explicit and need not impersonate a later Runtime commit', () => {
  const a = authorityWithEdge();
  const edgeCommit = C('e');
  const accepted = validateAuthorityRecord({
    ...a, edgeRevision: edgeCommit, edgeSourceCommit: edgeCommit
  });
  assert.equal(accepted.codexMemoryCommit, C('a'));
  assert.equal(accepted.edgeSourceCommit, edgeCommit);
});

test('host trust bundle binds launcher and first-party authority module bytes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-host-bundle-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const launcherFile = path.join(root, 'launcher.js');
  const authorityModuleFile = path.join(root, 'authority.js');
  const policyModuleFile = path.join(root, 'policy.js');
  const nativeClosureModuleFile = path.join(root, 'native.js');
  const edgeImageAuthorityModuleFile = path.join(root, 'edge-image.js');
  const providerImageAuthorityModuleFile = path.join(root, 'provider-image.js');
  const tarArchiveModuleFile = path.join(root, 'tar.js');
  fs.writeFileSync(launcherFile, 'launcher-a\n');
  fs.writeFileSync(authorityModuleFile, 'authority-a\n');
  fs.writeFileSync(policyModuleFile, 'policy-a\n');
  fs.writeFileSync(nativeClosureModuleFile, 'native-a\n');
  fs.writeFileSync(edgeImageAuthorityModuleFile, 'edge-image-a\n');
  fs.writeFileSync(providerImageAuthorityModuleFile, 'provider-image-a\n');
  fs.writeFileSync(tarArchiveModuleFile, 'tar-a\n');
  const files = { launcherFile, authorityModuleFile, policyModuleFile,
    nativeClosureModuleFile, edgeImageAuthorityModuleFile,
    providerImageAuthorityModuleFile,
    tarArchiveModuleFile };
  const accepted = hostTrustBundleDigest(files);
  fs.writeFileSync(authorityModuleFile, 'authority-b\n');
  assert.notEqual(hostTrustBundleDigest(files), accepted);
});

test('bounded authority reads bind an opened regular file and reject symlinks', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-authority-read-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const target = path.join(root, 'authority.json');
  const link = path.join(root, 'authority-link.json');
  fs.writeFileSync(target, '{"accepted":true}\n', { mode: 0o600 });
  fs.symlinkSync(target, link);
  assert.deepEqual(readBoundedJson(target), { accepted: true });
  expectCode(() => readBoundedJson(link), 'runtime_authority_file_unavailable');
});

test('stable host mount source rejects lexical aliases and symlink replacement', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-stable-mount-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const real = path.join(root, 'real');
  const link = path.join(root, 'link');
  fs.writeFileSync(real, 'bounded');
  fs.symlinkSync(real, link);
  assert.equal(validateStableHostMountSource(real, { allowedRoots: [root] }), real);
  expectCode(() => validateStableHostMountSource(link, { allowedRoots: [root] }),
    'host_launcher_mount_source_symlink_forbidden');
  expectCode(() => validateStableHostMountSource(`${root}/../${path.basename(root)}/real`,
    { allowedRoots: [root] }), 'host_launcher_mount_source_root_invalid');
});

test('Provider named volume is identity-bound and local bind-driver options reject', () => {
  const base = authority();
  const provider = providerInspect(base);
  const accepted = authority(baseInspect(), {
    providerContainerConfigDigest: containerConfigDigest(provider)
  });
  const execFile = (_binary, args) => JSON.stringify([args[0] === 'network' ? {
    Driver: 'bridge', Internal: false, Name: args[2]
  } : { Driver: 'local', Name: args[2], Options: {}, Scope: 'local' }]);
  assert.equal(validateProviderContainer(provider, accepted,
    providerEvidenceOptions({ execFile })), true);
  expectCode(() => validateProviderContainer(provider, accepted, {
    ...providerEvidenceOptions(),
    execFile: (_binary, args) => JSON.stringify([args[0] === 'network' ? {
      Driver: 'host', Internal: false, Name: args[2]
    } : { Driver: 'local', Name: args[2], Options: {}, Scope: 'local' }])
  }), 'host_launcher_provider_network_authority_mismatch');
  expectCode(() => validateProviderContainer(provider, accepted, {
    ...providerEvidenceOptions(),
    execFile: (_binary, args) => JSON.stringify([args[0] === 'network' ? {
      Driver: 'bridge', Internal: false, Name: args[2]
    } : { Driver: 'local', Name: args[2], Scope: 'local',
      Options: { device: '/var/run', o: 'bind', type: 'none' } }])
  }), 'provider_volume_canonical_policy_mismatch');
});

test('G wrong image ID is rejected', () => {
  const inspect = baseInspect({ Image: S('0') });
  expectCode(() => validateContainerInspection(inspect, authority()),
    'runtime_container_identity_mismatch');
});

test('H correct tag is irrelevant when image ID differs', () => {
  const inspect = baseInspect();
  inspect.Config.Image = 'codex-memory:test';
  inspect.Image = S('0');
  expectCode(() => validateContainerInspection(inspect, authority()),
    'runtime_container_identity_mismatch');
});

test('I wrong RootFS chain is rejected', () => {
  const a = authority();
  const image = { Id: a.acceptedImageConfigId, RootFS: { Layers: [S('0')] } };
  expectCode(() => validateImageInspection(image, a, buildManifest()),
    'runtime_image_rootfs_mismatch');
});

test('J wrong build-manifest digest is rejected', () => {
  const a = authority(baseInspect(), { buildManifestDigest: S('0') });
  expectCode(() => validateImageInspection({
    Id: a.acceptedImageConfigId, RootFS: { Layers: [S('4'), S('5')] }
  }, a, buildManifest()), 'runtime_image_identity_mismatch');
});

test('K recreated container with same name is rejected by ID', () => {
  const inspect = baseInspect({ Id: I('0') });
  expectCode(() => validateContainerInspection(inspect, authority()),
    'runtime_container_identity_mismatch');
});

test('L application-code bind mount is rejected', () => {
  const inspect = baseInspect();
  inspect.Mounts.push({ Destination: '/opt/codex-memory/src', RW: false, Source: '/repo/src', Type: 'bind' });
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_code_mount_forbidden');
});

test('M Docker socket mount is rejected', () => {
  const inspect = baseInspect();
  inspect.Mounts.push({ Destination: '/var/run/docker.sock', RW: true, Source: '/var/run/docker.sock', Type: 'bind' });
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_docker_socket_forbidden');
});

for (const [label, mutate] of [
  ['N writable rootfs', i => { i.HostConfig.ReadonlyRootfs = false; }],
  ['O privileged', i => { i.HostConfig.Privileged = true; }],
  ['P no-new-privileges removed', i => { i.HostConfig.SecurityOpt = []; }],
  ['Q wrong network mode', i => { i.HostConfig.NetworkMode = 'bridge'; }]
]) test(`${label} is rejected`, () => {
  const inspect = baseInspect(); mutate(inspect);
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_security_contract_mismatch');
});

test('Docker private IPC is admitted while host IPC fails closed', () => {
  const inspect = baseInspect();
  inspect.HostConfig.IpcMode = 'private';
  validateContainerInspection(inspect, authority(inspect), {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  });
  inspect.HostConfig.IpcMode = 'host';
  expectCode(() => validateContainerInspection(inspect, authority(inspect), {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_security_contract_mismatch');
});

test('R non-loopback listener configuration is not an allowed environment', () => {
  const inspect = baseInspect();
  inspect.Config.Env.push('CODEX_MEMORY_HTTP_HOST=0.0.0.0');
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_environment_unapproved');
});

test('S writable primary state is rejected', () => {
  const inspect = baseInspect();
  inspect.Mounts.find(m => m.Destination === '/srv/codex-memory/r5c').RW = true;
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_state_mount_mismatch');
});

test('T unexpected secret environment is rejected', () => {
  const inspect = baseInspect();
  inspect.Config.Env.push('TOKEN=synthetic-not-real');
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  }), 'runtime_container_environment_unapproved');
});

test('XDG_RUNTIME_DIR env is admitted by host inspection allowlist', () => {
  const inspect = baseInspect(); // baseInspect carries the canonical XDG_RUNTIME_DIR binding
  const a = authority(inspect);
  validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ALLOWED_RUNTIME_ENV
  });
});

test('XDG_RUNTIME_DIR env is rejected when the host inspection allowlist omits the name', () => {
  const inspect = baseInspect();
  const a = authority(inspect);
  const withoutXdg = ALLOWED_RUNTIME_ENV.filter(name => name !== 'XDG_RUNTIME_DIR');
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: withoutXdg
  }), 'runtime_container_environment_unapproved');
});

test('U stale Edge receipt is rejected', () => {
  const a = authorityWithEdge();
  expectCode(() => validateEdgeReceipt(edgeReceipt(a, 100), a, { now: 100_000 }),
    'runtime_edge_receipt_invalid');
});

test('Edge receipt from another boot is rejected', () => {
  const a = authorityWithEdge();
  expectCode(() => validateEdgeReceipt(edgeReceipt(a), a, {
    bootId: 'different-boot-identity'
  }), 'runtime_edge_receipt_stale');
});

test('V wrong Edge identity receipt is rejected', () => {
  const a = authorityWithEdge();
  const receipt = edgeReceipt(a);
  receipt.edgeContainerId = I('9');
  expectCode(() => validateEdgeReceipt(receipt, a, { now: receipt.observedAt }),
    'runtime_edge_receipt_identity_mismatch');
});

test('W competing runtime candidate cannot satisfy accepted container ID', () => {
  const accepted = authority();
  const candidate = baseInspect({ Id: I('9') });
  expectCode(() => validateContainerInspection(candidate, accepted),
    'runtime_container_identity_mismatch');
});

test('X runtime self-evidence is independent of checkout availability', () => {
  const a = authorityWithEdge();
  const value = validateRuntimeSelfEvidence(selfEvidence(a));
  assert.equal(value.accepted, true);
});

test('Y mutable source fallback path fails self-evidence', () => {
  const a = authorityWithEdge();
  expectCode(() => validateRuntimeSelfEvidence(selfEvidence(a, {
    runtimeRoot: '/repo'
  })), 'runtime_self_evidence_mismatch');
});

test('Z Docker socket presence fails self-evidence', () => {
  const a = authorityWithEdge();
  expectCode(() => validateRuntimeSelfEvidence(selfEvidence(a, {
    dockerSocketExists: () => true
  })), 'runtime_self_evidence_mismatch');
});

test('host image verifier binds config, rootfs and build-manifest label', () => {
  const a = authority();
  assert.equal(validateImageForHost({
    Config: { Labels: { 'io.codex-memory.runtime.build-manifest-digest': a.buildManifestDigest } },
    Id: a.acceptedImageConfigId,
    RootFS: { Layers: [S('4'), S('5')] }
  }, a), true);
});

test('host verifier binds installed trust, profile, policies, Provider and native closure', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-host-verify-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const profilePath = path.join(root, 'profile.json');
  const sources = { ...SOURCES, profile: profilePath };
  const runtime = baseInspect();
  runtime.Mounts.find(m => m.Destination === '/run/codex-memory/profile.json').Source = profilePath;
  const initial = authorityWithEdge(runtime);
  const accepted = authority(runtime, {
    edgeConfigDigest: initial.edgeConfigDigest,
    profilePath,
    runtimeMountSources: sources,
    providerContainerConfigDigest: containerConfigDigest(providerInspect(initial)),
    hostLauncherDigest: hostTrustBundleDigest({
      authorityModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'runtime-authority.js'),
      edgeImageAuthorityModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'edge-image-authority.js'),
      launcherFile: path.join(__dirname, '..', 'deploy', 'native-runtime',
        'host-launcher.js'),
      nativeClosureModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'native-closure.js'),
      policyModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'container-policy.js'),
      providerImageAuthorityModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'provider-image-authority.js'),
      tarArchiveModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'tar-archive.js')
    })
  });
  const acceptedProfileBytes = profileBytes(accepted);
  fs.writeFileSync(profilePath, acceptedProfileBytes, { mode: 0o600 });
  const edge = edgeInspect(accepted);
  const provider = providerInspect(accepted);
  const image = {
    Config: { Labels: {
      'io.codex-memory.runtime.build-manifest-digest': accepted.buildManifestDigest
    } },
    Id: accepted.acceptedImageConfigId,
    RootFS: { Layers: [S('4'), S('5')] }
  };
  const execFile = (_binary, args) => JSON.stringify([args[0] === 'image' ? image :
    args[0] === 'network' ? { Driver: 'bridge', Internal: false, Name: args[2] } :
      args[0] === 'volume' ? { Driver: 'local', Name: args[2], Options: {}, Scope: 'local' } :
        args[2] === accepted.expectedRuntimeContainerId ? runtime :
          args[2] === accepted.edgeContainerId ? edge : provider]);
  const options = {
    ...edgeEvidenceOptions(accepted),
    ...providerEvidenceOptions(),
    containerFile: (_id, source) => source === PROVIDER_POLICY.executable
      ? providerElf() : Buffer.from(JSON.stringify(nativeClosure())),
    execFile, fsModule: edgeSecretFilesystem(), requireRootFiles: false,
    providerEnvironmentValidator: () => ({ configDigest: S('5') }),
    verifyNativeClosureBytes: value => validateNativeClosure(value)
  };
  assert.equal(verifyHostAuthority(accepted, options).runtime.Id, runtime.Id);
  expectCode(() => verifyHostAuthority(accepted, {
    ...options,
    providerEnvironmentValidator: () => ({ configDigest: S('0') })
  }), 'host_launcher_provider_environment_digest_mismatch');
  fs.writeFileSync(profilePath, Buffer.concat([
    acceptedProfileBytes, Buffer.from(' ')
  ]), { mode: 0o600 });
  expectCode(() => verifyHostAuthority(accepted, options),
    'host_launcher_profile_authority_mismatch');
  fs.writeFileSync(profilePath, acceptedProfileBytes, { mode: 0o600 });
  fs.writeFileSync(profilePath, '{"schemaVersion":6}\n', { mode: 0o600 });
  expectCode(() => verifyHostAuthority(accepted, options),
    'host_launcher_profile_authority_mismatch');
  const semanticInvalid = Buffer.from('{"schemaVersion":7}\n');
  fs.writeFileSync(profilePath, semanticInvalid, { mode: 0o600 });
  expectCode(() => verifyHostAuthority({
    ...accepted, profileSha256: sha256Buffer(semanticInvalid)
  }, options), 'host_launcher_profile_authority_mismatch');
  const wrongPathProfileBytes = Buffer.from(canonicalJson({
    ...imageProfile(accepted),
    privateRoot: '/srv/codex-memory/alternate-r5c'
  }));
  fs.writeFileSync(profilePath, wrongPathProfileBytes, { mode: 0o600 });
  expectCode(() => verifyHostAuthority({
    ...accepted, profileSha256: sha256Buffer(wrongPathProfileBytes)
  }, options), 'host_launcher_profile_authority_mismatch');
  fs.writeFileSync(profilePath, acceptedProfileBytes, { mode: 0o600 });
  const replacement = path.join(root, 'replacement-profile.json');
  fs.writeFileSync(replacement, acceptedProfileBytes, { mode: 0o600 });
  fs.unlinkSync(profilePath);
  fs.symlinkSync(replacement, profilePath);
  expectCode(() => verifyHostAuthority(accepted, options),
    'runtime_authority_file_unavailable');
  fs.unlinkSync(profilePath);
  fs.writeFileSync(profilePath, acceptedProfileBytes, { mode: 0o600 });
  expectCode(() => verifyHostAuthority({
    ...accepted, hostLauncherDigest: S('0')
  }, options), 'host_launcher_trust_bundle_mismatch');
});

test('simulated cold boot replaces placeholders with fresh receipts before Runtime start', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-cold-boot-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const receiptRoot = path.join(root, 'run');
  fs.mkdirSync(receiptRoot, { mode: 0o700 });
  const fsModule = coldBootFilesystem(receiptRoot);
  const profilePath = path.join(root, 'profile.json');
  const sources = { ...SOURCES, profile: profilePath };
  const runtime = baseInspect();
  runtime.Mounts.find(m => m.Destination === '/run/codex-memory/profile.json').Source =
    profilePath;
  const initial = authorityWithEdge(runtime);
  const accepted = authority(runtime, {
    edgeConfigDigest: initial.edgeConfigDigest,
    profilePath,
    runtimeMountSources: sources,
    providerContainerConfigDigest: containerConfigDigest(providerInspect(initial)),
    hostLauncherDigest: hostTrustBundleDigest({
      authorityModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'runtime-authority.js'),
      edgeImageAuthorityModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'edge-image-authority.js'),
      launcherFile: path.join(__dirname, '..', 'deploy', 'native-runtime',
        'host-launcher.js'),
      nativeClosureModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'native-closure.js'),
      policyModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'container-policy.js'),
      providerImageAuthorityModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'provider-image-authority.js'),
      tarArchiveModuleFile: path.join(__dirname, '..', 'src', 'runtime',
        'native-image', 'tar-archive.js')
    })
  });
  fs.writeFileSync(profilePath, profileBytes(accepted), { mode: 0o600 });
  const edge = edgeInspect(accepted);
  const provider = providerInspect(accepted);
  const image = {
    Config: { Labels: {
      'io.codex-memory.runtime.build-manifest-digest': accepted.buildManifestDigest
    } },
    Id: accepted.acceptedImageConfigId,
    RootFS: { Layers: [S('4'), S('5')] }
  };
  const bootId = 'boot-identity-cold-0001';
  const events = [];
  const execFile = (_binary, args) => {
    if (args[0] === 'start') {
      assert.equal(args[1], accepted.expectedRuntimeContainerId);
      const edgeValue = JSON.parse(fs.readFileSync(
        path.join(receiptRoot, 'edge-receipt.json'), 'utf8'));
      const providerValue = JSON.parse(fs.readFileSync(
        path.join(receiptRoot, 'provider-receipt.json'), 'utf8'));
      validateEdgeReceipt(edgeValue, accepted, { bootId, now: 100 });
      validateProviderReceipt(providerValue, accepted, { bootId, now: 100 });
      events.push('fresh-receipts-before-runtime-start');
      runtime.State.Running = true;
      return '';
    }
    return JSON.stringify([args[0] === 'image' ? image :
      args[0] === 'network' ? { Driver: 'bridge', Internal: false, Name: args[2] } :
        args[0] === 'volume' ? {
          Driver: 'local', Name: args[2], Options: {}, Scope: 'local'
        } : args[2] === accepted.expectedRuntimeContainerId ? runtime :
          args[2] === accepted.edgeContainerId ? edge : provider]);
  };
  const options = {
    ...edgeEvidenceOptions(accepted),
    ...providerEvidenceOptions(),
    bootId,
    containerFile: (_id, source) => source === PROVIDER_POLICY.executable
      ? providerElf() : Buffer.from(JSON.stringify(nativeClosure())),
    execFile,
    fsModule,
    now: () => 100,
    providerHealthProbe: async () => ({
      accepted: true,
      contractDigest: digest(PROVIDER_POLICY.health),
      providerHealth: 'healthy',
      statusCode: 200
    }),
    providerEnvironmentValidator: () => ({ configDigest: S('5') }),
    requireRootFiles: false,
    verifyNativeClosureBytes: value => validateNativeClosure(value)
  };
  assert.equal(fs.existsSync(path.join(receiptRoot, 'edge-receipt.json')), false);
  assert.equal(fs.existsSync(path.join(receiptRoot, 'provider-receipt.json')), false);
  const result = await start(accepted, options);
  assert.equal(result.runtimeContainerId, accepted.expectedRuntimeContainerId);
  assert.deepEqual(events, ['fresh-receipts-before-runtime-start']);
  assert.equal(runtime.State.Running, true);
  assert.equal(JSON.parse(fs.readFileSync(
    path.join(receiptRoot, 'edge-receipt.json'), 'utf8')).schemaVersion,
  EDGE_RECEIPT_SCHEMA);
  assert.equal(JSON.parse(fs.readFileSync(
    path.join(receiptRoot, 'provider-receipt.json'), 'utf8')).schemaVersion,
  PROVIDER_RECEIPT_SCHEMA);
});

test('host Edge receipt is derived from exact healthy Edge inspection', () => {
  const a = authorityWithEdge();
  const edge = edgeInspect(a);
  const receipt = buildEdgeReceipt(edge, a, 'boot-identity-0001',
    1_700_000_000_000, {
      ...edgeEvidenceOptions(a), fsModule: edgeSecretFilesystem()
    });
  assert.equal(receipt.edgeContainerId, a.edgeContainerId);
});

test('host Provider receipt requires exact running identity and canonical HTTP health', async () => {
  const a = authorityWithEdge();
  const provider = providerInspect(a);
  const execFile = (_binary, args) => JSON.stringify([args[0] === 'network' ? {
    Driver: 'bridge', Internal: false, Name: args[2]
  } : { Driver: 'local', Name: args[2], Options: {}, Scope: 'local' }]);
  const providerHealthProbe = async () => ({
    accepted: true,
    contractDigest: digest(require('../src/runtime/native-image/container-policy')
      .PROVIDER_POLICY.health),
    providerHealth: 'healthy',
    statusCode: 200
  });
  const receipt = await buildProviderReceipt(
    provider, a, 'boot-identity-0001', 1_700_000_000_000,
    providerEvidenceOptions({ execFile, providerHealthProbe })
  );
  assert.equal(receipt.providerHealth, 'healthy');
  assert.equal(receipt.providerContainerId, a.providerContainerId);

  const stopped = providerInspect(a);
  stopped.State.Running = false;
  await assert.rejects(buildProviderReceipt(
    stopped, a, 'boot-identity-0001', 1_700_000_000_000,
    providerEvidenceOptions({ execFile, providerHealthProbe })
  ), error => error?.code === 'host_launcher_provider_not_running');

  const replacement = providerInspect(a);
  replacement.Id = I('0');
  await assert.rejects(buildProviderReceipt(
    replacement, a, 'boot-identity-0001', 1_700_000_000_000,
    providerEvidenceOptions({ execFile, providerHealthProbe })
  ), error => error?.code === 'host_launcher_provider_identity_mismatch');

  const wrongImage = providerInspect(a);
  wrongImage.Image = S('0');
  await assert.rejects(buildProviderReceipt(
    wrongImage, a, 'boot-identity-0001', 1_700_000_000_000,
    providerEvidenceOptions({ execFile, providerHealthProbe })
  ), error => error?.code === 'host_launcher_provider_identity_mismatch');

  await assert.rejects(buildProviderReceipt(
    provider, a, 'boot-identity-0001', 1_700_000_000_000,
    providerEvidenceOptions({
      execFile, providerHealthProbe: async () => ({ accepted: false })
    })
  ), error => error?.code === 'host_launcher_provider_health_failed');
});

test('Provider identity schema revisions and semantic layers cannot be downgraded or swapped', () => {
  const a = authorityWithEdge();
  expectCode(() => validateAuthorityRecord({
    ...a, authoritySchemaVersion: 'codex-memory-native-runtime-authority/v1'
  }), 'runtime_authority_record_invalid');
  expectCode(() => validateAuthorityRecord({
    ...a, authoritySchemaVersion: 'codex-memory-native-runtime-authority/v2'
  }), 'runtime_authority_record_invalid');
  expectCode(() => validateAuthorityRecord({
    ...a,
    providerDaemonImageIdentity: a.providerImageConfigDigest,
    providerImageConfigDigest: a.providerDaemonImageIdentity
  }), 'runtime_authority_provider_identity_invalid');
  expectCode(() => validateAuthorityRecord({
    ...a,
    providerContainerConfigDigest: a.providerImageConfigDigest,
    providerImageConfigDigest: a.providerContainerConfigDigest
  }), 'runtime_authority_provider_identity_invalid');
  expectCode(() => validateAuthorityRecord({
    ...a, providerImageIdentity: a.providerDaemonImageIdentity
  }), 'runtime_authority_record_invalid');
  expectCode(() => validateAuthorityRecord({
    ...a, edgeImageIdentity: a.edgeDaemonImageIdentity
  }), 'runtime_authority_record_invalid');
  expectCode(() => validateAuthorityRecord({
    ...a,
    runtimeMountSources: {
      ...a.runtimeMountSources,
      providerEnvironment: '/var/lib/codex-memory/provider.env'
    }
  }), 'runtime_authority_provider_environment_path_mismatch');
  expectCode(() => validateAuthorityRecord({
    ...a,
    edgeImageConfigDigest: a.edgeOciManifestDigest,
    edgeOciManifestDigest: a.edgeImageConfigDigest
  }), 'runtime_authority_edge_identity_invalid');
  for (const field of ['providerDaemonImageIdentity', 'providerImageConfigDigest',
    'providerOciManifestDigest']) {
    const missingIdentity = { ...a };
    delete missingIdentity[field];
    expectCode(() => validateAuthorityRecord(missingIdentity),
      'runtime_authority_record_invalid');
  }
  const components = profileAuthorityComponents(a);
  expectCode(() => require('../src/runtime/native-image/runtime-authority')
    .validateProfileAuthorityComponents({
      ...components,
      profileAuthorityComponentSchemaVersion:
        'codex-memory-profile-runtime-authority-components/v1'
    }), 'runtime_profile_authority_components_invalid');
  expectCode(() => require('../src/runtime/native-image/runtime-authority')
    .validateProfileAuthorityComponents({
      ...components,
      profileAuthorityComponentSchemaVersion:
        'codex-memory-profile-runtime-authority-components/v2'
    }), 'runtime_profile_authority_components_invalid');
  expectCode(() => require('../src/runtime/native-image/runtime-authority')
    .validateProfileAuthorityComponents({
      ...components,
      providerImageConfigDigest: components.providerOciManifestDigest,
      providerOciManifestDigest: components.providerImageConfigDigest
    }), 'runtime_profile_authority_components_invalid');
  const receipt = providerReceipt(a, 100);
  expectCode(() => validateProviderReceipt({
    ...receipt, schemaVersion: 'codex-memory-provider-runtime-receipt/v1'
  }, a, { now: 100 }), 'runtime_provider_receipt_invalid');
  for (const field of ['providerDaemonImageIdentity', 'providerImageConfigDigest',
    'providerOciManifestDigest']) {
    const missingIdentity = { ...receipt };
    delete missingIdentity[field];
    expectCode(() => validateProviderReceipt(missingIdentity, a, { now: 100 }),
      'runtime_provider_receipt_invalid');
  }
  expectCode(() => validateProviderReceipt({
    ...receipt, providerDaemonImageIdentity: S('0')
  }, a, { now: 100 }), 'runtime_provider_receipt_identity_mismatch');
  expectCode(() => validateProviderReceipt({
    ...receipt, providerContainerId: I('0')
  }, a, { now: 100 }), 'runtime_provider_receipt_identity_mismatch');
  const oldEdgeReceipt = edgeReceipt(a, 100);
  expectCode(() => validateEdgeReceipt({
    ...oldEdgeReceipt, schemaVersion: 'codex-memory-edge-runtime-receipt/v1'
  }, a, { now: 100 }), 'runtime_edge_receipt_invalid');
  for (const field of ['edgeDaemonImageIdentity', 'edgeImageConfigDigest',
    'edgeOciManifestDigest']) {
    const missing = { ...oldEdgeReceipt };
    delete missing[field];
    expectCode(() => validateEdgeReceipt(missing, a, { now: 100 }),
      'runtime_edge_receipt_invalid');
  }
});

test('atomic Edge receipt is non-secret, root-replaceable and runtime-readable', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-edge-receipt-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  fs.chmodSync(root, 0o700);
  const file = path.join(root, 'edge.json');
  atomicRootReceipt(file, { accepted: true }, {
    gid: process.getgid(), uid: process.getuid()
  });
  const stat = fs.statSync(file);
  assert.equal(stat.mode & 0o777, 0o644);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { accepted: true });
});

test('schema-v7 shared admission rejects incomplete, extended and mutable profiles', () => {
  const a = authorityWithEdge();
  const valid = imageProfile(a);
  assert.deepEqual(validateImageProfile(valid), validateProfile(valid));
  const missing = { ...valid };
  delete missing.hostLauncherDigest;
  const cases = [
    { schemaVersion: 7 },
    missing,
    { ...valid, accepted: true },
    { ...valid, runtimeAuthorityMode: 'mutable_checkout' },
    { ...valid, runtimeRepository: '/home/jenn/src/codex-memory' },
    { ...valid, vcpRuntimeRepository: '/home/jenn/src/VCPToolBox' },
    { ...valid, profileAuthorityComponentSchemaVersion:
      'codex-memory-profile-runtime-authority-components/v2' }
  ];
  for (const candidate of cases) {
    expectCode(() => validateImageProfile(candidate), 'runtime_image_profile_invalid');
    expectCode(() => validateProfile(candidate), 'stack_profile_invalid');
  }
});

test('schema-v7 authority binding rejects every governed digest substitution', () => {
  const a = authorityWithEdge();
  const valid = imageProfile(a);
  const components = profileAuthorityComponents(a);
  for (const field of [
    'runtimeImageManifestDigest',
    'runtimeImageConfigId',
    'runtimeBuildManifestDigest',
    'hostLauncherDigest',
    'edgeRuntimeConfigDigest',
    'providerRuntimeConfigDigest',
    'stateMountContractDigest'
  ]) {
    expectCode(() => validateImageProfile({ ...valid, [field]: S('0') }, components),
      field === 'stateMountContractDigest'
        ? 'runtime_image_profile_state_mount_mismatch'
        : 'runtime_image_profile_authority_mismatch');
  }
  expectCode(() => validateImageProfile({
    ...valid,
    runtimeImageConfigId: valid.runtimeImageManifestDigest,
    runtimeImageManifestDigest: valid.runtimeImageConfigId
  }, components), 'runtime_image_profile_authority_mismatch');
});

test('image VCP authority digest is a components-v3 projection over the accepted image chain', () => {
  const a = authorityWithEdge();
  const components = profileAuthorityComponents(a);
  const accepted = vcpImageRuntimeAuthorityDigest(components);
  assert.equal(VCP_IMAGE_RUNTIME_AUTHORITY_SCHEMA,
    'codex-memory-vcp-image-runtime-authority/v1');
  assert.equal(VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION, 2);
  assert.equal(components.profileAuthorityComponentSchemaVersion,
    'codex-memory-profile-runtime-authority-components/v3');
  assert.equal(BUILD_MANIFEST_SCHEMA, 'codex-memory-runtime-build-manifest/v1');
  for (const [field, replacement] of [
    ['buildManifestDigest', S('0')],
    ['acceptedOciArchiveSha256', S('1')],
    ['acceptedOciManifestDigest', S('2')],
    ['rootfsChainDigest', S('3')],
    ['vcpCommit', C('0')]
  ]) {
    assert.notEqual(
      vcpImageRuntimeAuthorityDigest({ ...components, [field]: replacement }),
      accepted,
      field
    );
  }
});

test('historical schema-v6 migrates directly to independently bound image VCP identity', () => {
  const a = authorityWithEdge();
  const components = profileAuthorityComponents(a);
  const historical = historicalProfile(a, {
    vcpRuntimeRepository: '/unavailable/dirty-host-vcp-checkout'
  });
  const result = profileV7MigrationCandidate(historical, components, {
    expectedCurrentFingerprint: digest(historical)
  });
  assert.equal(result.nextProfile.schemaVersion, 7);
  assert.equal(result.nextProfile.vcpRuntimeIdentitySchemaVersion,
    VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION);
  assert.equal(result.nextProfile.vcpRuntimeContractDigest,
    vcpImageRuntimeAuthorityDigest(components));
  assert.equal(result.nextProfile.vcpRuntimeBaseline, components.vcpCommit);
  assert.equal(result.nextProfile.vcpRuntimeRepository, IMAGE_VCP_ROOT);
  assert.equal(Object.hasOwn(historical, 'vcpRuntimeContractDigest'), false);
  assert.equal(Object.hasOwn(historical, 'vcpRuntimeIdentitySchemaVersion'), false);
  assert.deepEqual(validateImageProfile(result.nextProfile, components),
    result.nextProfile);

  const otherHostCheckout = historicalProfile(a, {
    vcpRuntimeRepository: '/another/drifted-host-vcp-checkout',
    vcpRuntimeScopeDigest: S('0')
  });
  const otherResult = profileV7MigrationCandidate(otherHostCheckout, components, {
    expectedCurrentFingerprint: digest(otherHostCheckout)
  });
  assert.equal(otherResult.nextProfile.vcpRuntimeContractDigest,
    result.nextProfile.vcpRuntimeContractDigest);
});

test('contract-aware schema-v6 host identity is replaced, never replayed, in schema-v7', () => {
  const a = authorityWithEdge();
  const components = profileAuthorityComponents(a);
  const hostContractProfile = currentProfile(a);
  const hostContractDigest = hostContractProfile.vcpRuntimeContractDigest;
  const result = profileV7MigrationCandidate(hostContractProfile, components, {
    expectedCurrentFingerprint: digest(hostContractProfile)
  });
  assert.equal(result.nextProfile.vcpRuntimeIdentitySchemaVersion,
    VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION);
  assert.equal(result.nextProfile.vcpRuntimeContractDigest,
    vcpImageRuntimeAuthorityDigest(components));
  assert.notEqual(result.nextProfile.vcpRuntimeContractDigest, hostContractDigest);
  assert.equal(profileVcpRuntimeIdentityMode(result.nextProfile),
    'image_authority_v1');
});

test('schema-v7 rejects host-contract replay, arbitrary digest and authority substitution', () => {
  const a = authorityWithEdge();
  const components = profileAuthorityComponents(a);
  const valid = imageProfile(a);
  expectCode(() => validateImageProfile({
    ...valid,
    vcpRuntimeIdentitySchemaVersion: 1
  }, components), 'runtime_image_profile_invalid');
  expectCode(() => validateImageProfile({
    ...valid,
    vcpRuntimeContractDigest: S('0')
  }, components), 'runtime_image_profile_vcp_image_authority_mismatch');
  expectCode(() => validateImageProfile(valid, {
    ...components,
    buildManifestDigest: S('0')
  }), 'runtime_image_profile_vcp_image_authority_mismatch');
  expectCode(() => validateProfile({
    ...currentProfile(a),
    vcpRuntimeIdentitySchemaVersion:
      VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION
  }), 'stack_profile_invalid');
});

test('container VCP identity is rederived from authority and build evidence', () => {
  const a = authorityWithEdge();
  const profile = imageProfile(a);
  const manifest = buildManifest();
  const identity = deriveContainerVcpRuntimeIdentity(profile, {
    authority: a,
    buildManifest: manifest
  });
  assert.equal(identity.authorityVerified, true);
  assert.equal(identity.imageAuthorityDigest,
    vcpImageRuntimeAuthorityDigest(profileAuthorityComponents(a)));
  assert.equal(identity.revision, a.vcpCommit);
  assert.equal(identity.repository, IMAGE_VCP_ROOT);
  assert.equal(profileVcpRuntimeIdentityMatches(profile, identity), true);

  const selfAsserted = {
    ...profile,
    vcpRuntimeContractDigest: S('0')
  };
  expectCode(() => deriveContainerVcpRuntimeIdentity(selfAsserted, {
    authority: a,
    buildManifest: manifest
  }), 'stack_container_vcp_image_authority_mismatch');
  assert.equal(containerSupervisorAuthorityMatchesProfile(selfAsserted, a), false);

  expectCode(() => deriveContainerVcpRuntimeIdentity(profile, {
    authority: a,
    buildManifest: buildManifest({ vcpCommit: C('0') })
  }), 'stack_container_vcp_image_authority_mismatch');
  assert.equal(profileVcpRuntimeIdentityMatches(profile, {
    ...identity,
    imageAuthorityDigest: S('0')
  }), false);
});

test('schema-v7 private root is canonically bound to its state mount contract', () => {
  const a = authorityWithEdge();
  const valid = imageProfile(a);
  const components = profileAuthorityComponents(a);
  assert.equal(valid.privateRoot, a.stateMountContract.containerPath);
  assert.equal(valid.stateMountContractDigest, digest(stateContract(valid.privateRoot)));
  assert.deepEqual(validateImageProfile(valid, components), valid);

  const wrongPrivateRoot = {
    ...valid,
    privateRoot: '/srv/codex-memory/alternate-r5c'
  };
  expectCode(() => validateImageProfile(wrongPrivateRoot),
    'runtime_image_profile_state_mount_mismatch');
  expectCode(() => validateProfile(wrongPrivateRoot), 'stack_profile_invalid');
  assert.equal(containerSupervisorAuthorityMatchesProfile(wrongPrivateRoot, a), false);

  const otherContract = stateContract('/srv/codex-memory/other-r5c');
  const digestForOtherPath = {
    ...valid,
    stateMountContractDigest: digest(otherContract)
  };
  expectCode(() => validateImageProfile(digestForOtherPath),
    'runtime_image_profile_state_mount_mismatch');
  expectCode(() => validateAuthorityProfileBytes(
    Buffer.from(canonicalJson(digestForOtherPath))
  ), 'runtime_authority_profile_invalid');
  expectCode(() => validateHostProfileBytes(
    Buffer.from(canonicalJson(digestForOtherPath)), {
      ...a,
      profileSha256: sha256Buffer(Buffer.from(canonicalJson(digestForOtherPath)))
    }
  ), 'host_launcher_profile_authority_mismatch');

  assert.equal(valid.profileAuthorityComponentSchemaVersion,
    'codex-memory-profile-runtime-authority-components/v3');
  assert.equal(components.profileAuthorityComponentSchemaVersion,
    'codex-memory-profile-runtime-authority-components/v3');
});

test('initial bootstrap creates deterministic schema-v7 candidate from minimal seed', () => {
  const a = authorityWithEdge();
  const result = profileV7InitialBootstrapCandidate(
    initialProfileSeed(), profileAuthorityComponents(a)
  );
  assert.equal(result.candidateOnly, true);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.nextProfile.schemaVersion, 7);
  assert.equal(result.nextProfile.vcpRuntimeIdentitySchemaVersion, 2);
  assert.equal(result.nextProfile.vcpRuntimeContractDigest,
    vcpImageRuntimeAuthorityDigest(profileAuthorityComponents(a)));
  assert.equal(result.nextProfile.runtimeContainerId, a.expectedRuntimeContainerId);
  assert.deepEqual(validateImageProfile(
    result.nextProfile, profileAuthorityComponents(a)
  ), result.nextProfile);
  const again = profileV7InitialBootstrapCandidate(
    initialProfileSeed(), profileAuthorityComponents(a)
  );
  assert.equal(again.nextProfileFingerprint, result.nextProfileFingerprint);
  assert.equal(again.nextProfileBytes, result.nextProfileBytes);
  assert.deepEqual(INITIAL_PROFILE_SEED_KEYS, [
    'controllerSourceManifestDigest', 'controllerSourceManifestVersion',
    'edgeContainer', 'governanceEnvironment',
    'governanceEnvironmentConfigDigest', 'privateRoot', 'providerContainer',
    'relayEnvironment', 'relayEnvironmentConfigDigest', 'retainedBinding',
    'retainedBindingSource', 'vcpProviderConfigDigest', 'vcpRuntimeScopeDigest'
  ]);
});

test('initial bootstrap rejects authority-owned field injection and legacy VCP identity', () => {
  const a = authorityWithEdge();
  const components = profileAuthorityComponents(a);
  expectCode(() => profileV7InitialBootstrapCandidate({
    ...initialProfileSeed(), runtimeBuildManifestDigest: S('0')
  }, components), 'runtime_initial_profile_seed_invalid');
  expectCode(() => profileV7InitialBootstrapCandidate({
    ...initialProfileSeed(), vcpRuntimeContractDigest: S('0')
  }, components), 'runtime_initial_profile_seed_invalid');
  const candidate = profileV7InitialBootstrapCandidate(
    initialProfileSeed(), components
  ).nextProfile;
  expectCode(() => validateImageProfile({
    ...candidate, vcpRuntimeIdentitySchemaVersion: 1
  }, components), 'runtime_image_profile_invalid');
});

test('initial bootstrap rejects a seed whose private root differs from observed state', () => {
  const a = authorityWithEdge();
  expectCode(() => profileV7InitialBootstrapCandidate(
    initialProfileSeed('/srv/codex-memory/other-r5c'), profileAuthorityComponents(a)
  ), 'runtime_image_profile_state_mount_mismatch');
});

test('authority dependency graph orders bootstrap and keeps receipts as terminal sinks', () => {
  assert.equal(countAuthorityGraphCycles(AUTHORITY_DEPENDENCY_GRAPH), 0);
  const precedes = (from, to) => authorityGraphPrecedes(from, to, AUTHORITY_DEPENDENCY_GRAPH);
  for (const [from, to] of [
    ['reviewedSource', 'runtimeImage'],
    ['runtimeImage', 'runtimeContainer'],
    ['runtimeContainer', 'authorityComponents'],
    ['edgeObservation', 'authorityComponents'],
    ['providerObservation', 'authorityComponents'],
    ['canonicalPolicies', 'authorityComponents'],
    ['authorityComponents', 'initialProfileCandidate'],
    ['initialProfileCandidate', 'hostAuthority'],
    ['hostAuthority', 'hostLauncherAdmission'],
    ['hostLauncherAdmission', 'edgeReceipt'],
    ['hostLauncherAdmission', 'providerReceipt'],
    ['hostLauncherAdmission', 'runtimeActivation'],
    ['initialProfileCandidate', 'runtimeActivation']
  ]) {
    assert.equal(precedes(from, to), true, `${from} should precede ${to}`);
  }
  // Receipts are graph sinks: they must never be able to precede (and thus mint)
  // authority, the profile, or runtime activation.
  assert.equal(AUTHORITY_DEPENDENCY_GRAPH.edgeReceipt, undefined);
  assert.equal(AUTHORITY_DEPENDENCY_GRAPH.providerReceipt, undefined);
  assert.equal(AUTHORITY_DEPENDENCY_GRAPH.runtimeActivation, undefined);
  for (const [from, to] of [
    ['edgeReceipt', 'hostAuthority'],
    ['providerReceipt', 'authorityComponents'],
    ['runtimeActivation', 'hostAuthority'],
    ['hostAuthority', 'authorityComponents'],
    ['initialProfileCandidate', 'authorityComponents']
  ]) {
    assert.equal(precedes(from, to), false, `${from} must not precede ${to}`);
  }
});

function authorityCreatorHarness(runtime, extra = {}) {
  const profilePath = extra.profilePath || SOURCES.profile;
  const sources = {
    ...SOURCES,
    profile: profilePath,
    ...(extra.authorityPath ? { authority: extra.authorityPath } : {}),
    ...(extra.edgeReceiptPath ? { edgeReceipt: extra.edgeReceiptPath } : {}),
    ...(extra.providerReceiptPath ? { providerReceipt: extra.providerReceiptPath } : {})
  };
  const mountByDestination = {
    '/run/codex-memory/profile.json': sources.profile,
    '/run/codex-memory/authority.json': sources.authority,
    '/run/codex-memory/edge-receipt.json': sources.edgeReceipt,
    '/run/codex-memory/provider-receipt.json': sources.providerReceipt
  };
  for (const [destination, source] of Object.entries(mountByDestination)) {
    const mount = runtime.Mounts.find(m => m.Destination === destination);
    if (mount) mount.Source = source;
  }
  const base = authorityWithEdge(runtime);
  const expected = authority(runtime, {
      edgeConfigDigest: base.edgeConfigDigest,
      profilePath,
      runtimeMountSources: sources,
      providerContainerConfigDigest: base.providerContainerConfigDigest
    });
  const edge = edgeInspect(expected);
  const provider = providerInspect(expected);
  const manifest = buildManifest();
  const image = {
    Id: expected.acceptedImageConfigId,
    RootFS: { Layers: [S('4'), S('5')] }
  };
  const archiveEvidence = Object.freeze({
    archiveSha256: expected.acceptedOciArchiveSha256,
    buildContextDigest: manifest.buildContextFileManifestDigest,
    buildManifestDigest: buildManifestDigest(manifest),
    configDigest: expected.acceptedImageConfigId,
    contextDigest: manifest.buildContextFileManifestDigest,
    manifestDigest: expected.acceptedOciManifestDigest,
    rootfsChainDigest: digest([S('4'), S('5')])
  });
  const edgeEvidence = Object.freeze({
    artifactSha256: expected.edgeArtifactSha256,
    buildContextDigest: expected.edgeBuildContextDigest,
    buildManifestDigest: expected.edgeBuildManifestDigest,
    imageConfigDigest: expected.edgeImageConfigDigest,
    imageStoreIdentityModel: expected.edgeImageStoreIdentityModel,
    lockfileSha256: expected.edgeLockfileSha256,
    ociManifestDigest: expected.edgeOciManifestDigest,
    schemaVersion: 'codex-memory-edge-image-authority/v1',
    sourceCommit: expected.edgeSourceCommit
  });
  const edgeImageInspect = {
    Architecture: 'amd64',
    Config: { Labels: {
      'org.opencontainers.image.revision': expected.edgeSourceCommit
    } },
    Descriptor: { digest: expected.edgeOciManifestDigest },
    Id: expected.edgeOciManifestDigest, Os: 'linux',
    RepoDigests: [`codex-memory-chatgpt-edge@${expected.edgeOciManifestDigest}`]
  };
  const providerImageInspect = providerEvidenceOptions().providerImageInspect();
  const providerImageEvidence = providerEvidenceOptions().providerImageAdmission();
  const args = [
    `--runtime-container-id=${runtime.Id}`,
    `--edge-container-id=${edge.Id}`,
    `--provider-container-id=${provider.Id}`,
    `--image-config-id=${expected.acceptedImageConfigId}`,
    '--build-manifest=/synthetic/build-manifest.json',
    '--oci-archive=/synthetic/oci-archive.tar',
    `--expected-oci-archive-sha256=${archiveEvidence.archiveSha256}`,
    `--expected-build-manifest-digest=${archiveEvidence.buildManifestDigest}`,
    `--expected-image-config-id=${archiveEvidence.configDigest}`,
    `--expected-build-context-digest=${archiveEvidence.contextDigest}`,
    `--expected-oci-manifest-digest=${archiveEvidence.manifestDigest}`,
    `--expected-rootfs-chain-digest=${archiveEvidence.rootfsChainDigest}`,
    '--edge-oci-archive=/synthetic/edge-oci-archive.tar',
    '--edge-build-manifest=/synthetic/edge-build-manifest.json',
    `--expected-edge-artifact-sha256=${edgeEvidence.artifactSha256}`,
    `--expected-edge-build-context-digest=${edgeEvidence.buildContextDigest}`,
    `--expected-edge-build-manifest-digest=${edgeEvidence.buildManifestDigest}`,
    `--expected-edge-image-config-digest=${edgeEvidence.imageConfigDigest}`,
    `--expected-edge-lockfile-sha256=${edgeEvidence.lockfileSha256}`,
    `--expected-edge-oci-manifest-digest=${edgeEvidence.ociManifestDigest}`,
    `--expected-edge-source-commit=${edgeEvidence.sourceCommit}`,
    `--expected-edge-binding-digest=${expected.edgeBindingDigest}`,
    `--expected-edge-binding-reference=${expected.edgeBindingReference}`,
    `--expected-edge-host-project-reference=${expected.edgeHostProjectReference}`,
    `--expected-edge-operator-reference=${expected.edgeOperatorReference}`,
    `--expected-edge-previous-binding-reference=${expected.edgePreviousBindingReference}`,
    `--authority-path=${sources.authority}`,
    `--edge-receipt=${sources.edgeReceipt}`,
    `--provider-receipt=${sources.providerReceipt}`,
    `--provider-environment=${SOURCES.providerEnvironment}`,
    `--state=${SOURCES.primaryState}`,
    `--runtime-directory=${SOURCES.runtimeDirectory}`,
    '--state-destination=/srv/codex-memory/r5c',
    `--profile=${profilePath}`,
    '--runtime-authority-module=deploy/../src/runtime/native-image/runtime-authority.js',
    '--edge-image-authority-module=src/runtime/native-image/edge-image-authority.js',
    '--host-launcher=deploy/native-runtime/host-launcher.js',
    '--native-closure-module=src/runtime/native-image/native-closure.js',
    '--container-policy-module=src/runtime/native-image/container-policy.js',
    '--provider-image-authority-module=src/runtime/native-image/provider-image-authority.js',
    '--tar-archive-module=src/runtime/native-image/tar-archive.js',
    ...(extra.seedPath ? [`--initial-profile-seed=${extra.seedPath}`] : [])
  ];
  const deps = {
    inspect(kind, id) {
      if (kind === 'image') {
        if (id === expected.acceptedImageConfigId) return image;
        if (id === edge.Image) return edgeImageInspect;
        return providerImageInspect;
      }
      if (kind === 'volume') {
        return { Driver: 'local', Name: id, Options: {}, Scope: 'local' };
      }
      if (id === runtime.Id) return runtime;
      if (id === edge.Id) return edge;
      return provider;
    },
    containerFile: (_id, source) => source === PROVIDER_POLICY.executable
      ? providerElf() : Buffer.from(JSON.stringify(nativeClosure())),
    containerChanges: () => [],
    imageArchive: () => Buffer.alloc(0),
    verifyOciArchive: () => archiveEvidence,
    verifyEdgeOciArchive: () => edgeEvidence,
    validateEdgeLocalArchive: () => edgeEvidence,
    validateProviderImage: () => providerImageEvidence,
    verifyNativeClosureBytes: () => true,
    readBuildManifest: () => manifest,
    providerEnvironmentValidator: () => ({ configDigest: S('5') }),
    fsModule: edgeSecretFilesystem(),
    seedReaderOptions: { requireRootFiles: false },
    writeOutput: () => {}
  };
  return { args, deps, expected };
}

test('authority creator initial bootstrap emits a bound schema-v7 profile end to end', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-bootstrap-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, { seedPath });
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  assert.equal(output.authority.authoritySchemaVersion, AUTHORITY_SCHEMA);
  assert.equal(output.profile.schemaVersion, 7);
  assert.equal(output.profile.vcpRuntimeIdentitySchemaVersion,
    VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION);
  assert.equal(output.profile.vcpRuntimeContractDigest,
    vcpImageRuntimeAuthorityDigest(profileAuthorityComponents(output.authority)));
  assert.equal(output.profile.runtimeContainerId, runtime.Id);
  // The published digest must be the canonical profile bytes, never the
  // provisional bootstrap placeholder used while assembling components.
  const provisional = sha256Buffer(Buffer.from('initial-profile-bootstrap'));
  assert.notEqual(output.authority.profileSha256, provisional);
  assert.equal(output.authority.profileSha256,
    sha256Buffer(Buffer.from(canonicalJson(output.profile))));
  assert.equal(output.profileSha256, output.authority.profileSha256);
  assert.deepEqual(
    validateImageProfile(output.profile, profileAuthorityComponents(output.authority)),
    output.profile
  );
});

test('authority creator normal mode keeps the bare authority-record output contract', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-normal-authority-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const runtime = baseInspect();
  const profilePath = path.join(root, 'profile.json');
  // Derive the canonical profile from a bootstrap run so the normal-mode input
  // matches the exact authority the creator independently computes.
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const bootstrap = authorityCreatorHarness(runtime, { seedPath });
  const bootstrapOutput = JSON.parse(
    createRuntimeAuthorityMain(bootstrap.args, bootstrap.deps)
  );
  const canonicalProfileBytes = Buffer.from(canonicalJson(bootstrapOutput.profile));
  fs.writeFileSync(profilePath, canonicalProfileBytes, { mode: 0o600 });
  const { args, deps } = authorityCreatorHarness(runtime, { profilePath });
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  assert.equal(output.authority, undefined);
  assert.equal(output.profile, undefined);
  assert.equal(output.authoritySchemaVersion, AUTHORITY_SCHEMA);
  assert.notEqual(output.profileSha256,
    sha256Buffer(Buffer.from('initial-profile-bootstrap')));
  assert.equal(output.profileSha256, sha256Buffer(canonicalProfileBytes));
});

test('authority creator initial bootstrap rejects a seed carrying authority-owned fields', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-inject-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson({
    ...initialProfileSeed(), runtimeBuildManifestDigest: S('0')
  }), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, { seedPath });
  expectCode(() => createRuntimeAuthorityMain(args, deps),
    'runtime_initial_profile_seed_invalid');
});

test('authority creator initial bootstrap rejects a seed for a foreign private root', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-foreign-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(
    initialProfileSeed('/srv/codex-memory/other-r5c')
  ), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, { seedPath });
  expectCode(() => createRuntimeAuthorityMain(args, deps),
    'runtime_image_profile_state_mount_mismatch');
});

test('staged mounts carry creator initial-mode output through materialization end to end', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-e2e-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  const canonicalBase = path.join(root, 'bootstrap');
  fs.mkdirSync(canonicalBase, { recursive: true, mode: 0o700 });
  fs.chmodSync(canonicalBase, 0o700);
  const receipts = path.join(root, 'run');
  fs.mkdirSync(receipts, { recursive: true, mode: 0o700 });
  fs.chmodSync(receipts, 0o700);
  const generation = C('a');
  const stagingOptions = {
    generation,
    canonicalBase,
    root: path.join(canonicalBase, generation),
    uid,
    gid,
    requireRoot: false,
    edgeReceiptPath: path.join(receipts, 'edge-receipt.json'),
    providerReceiptPath: path.join(receipts, 'provider-receipt.json')
  };
  const staged = stageInitialMounts(stagingOptions);
  assert.equal(staged.authoritySource.status, 'created');
  assert.equal(staged.profileSource.status, 'created');
  assert.equal(staged.freshEdgeReceipt, false);
  assert.equal(staged.freshProviderReceipt, false);

  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, {
    seedPath,
    authorityPath: staged.authoritySource.path,
    profilePath: staged.profileSource.path,
    edgeReceiptPath: staged.edgeReceiptSource.path,
    providerReceiptPath: staged.providerReceiptSource.path
  });
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  assert.equal(output.authority.codexMemoryCommit, generation);

  const candidate = path.join(root, 'creator-output.json');
  fs.writeFileSync(candidate, canonicalJson(output), { mode: 0o600 });
  const materialized = materializeInitialMounts({ ...stagingOptions, candidate });
  assert.equal(materialized.installed, true);
  assert.equal(materialized.perFileAtomicReplacement, true);
  assert.equal(materialized.runtimeStarted, false);

  const installedAuthority = validateAuthorityRecord(JSON.parse(
    fs.readFileSync(staged.authoritySource.path, 'utf8')));
  const installedProfileBytes = fs.readFileSync(staged.profileSource.path);
  const installedProfile = validateImageProfile(
    JSON.parse(installedProfileBytes.toString('utf8')),
    profileAuthorityComponents(installedAuthority)
  );
  assert.equal(installedAuthority.profileSha256, sha256Buffer(installedProfileBytes));
  assert.equal(installedAuthority.profileSha256, output.profileSha256);
  assert.equal(installedAuthority.profilePath, staged.profileSource.path);
  assert.equal(installedAuthority.runtimeMountSources.authority, staged.authoritySource.path);
  assert.equal(installedAuthority.runtimeMountSources.profile, staged.profileSource.path);
  assert.equal(installedAuthority.runtimeMountSources.edgeReceipt, staged.edgeReceiptSource.path);
  assert.equal(installedAuthority.runtimeMountSources.providerReceipt,
    staged.providerReceiptSource.path);
  assert.equal(installedProfile.schemaVersion, 7);
  assert.equal(installedProfile.vcpRuntimeContractDigest,
    vcpImageRuntimeAuthorityDigest(profileAuthorityComponents(installedAuthority)));

  // Rerunning materialize on a fully installed pair is idempotent and does not rewrite.
  const rerun = materializeInitialMounts({ ...stagingOptions, candidate });
  assert.equal(rerun.alreadyMaterialized, true);
  assert.equal(rerun.installed, false);

  // Placeholder receipts must never be mistaken for fresh current receipts.
  const edgeReceiptValue = JSON.parse(fs.readFileSync(staged.edgeReceiptSource.path, 'utf8'));
  const providerReceiptValue = JSON.parse(
    fs.readFileSync(staged.providerReceiptSource.path, 'utf8'));
  assert.equal(edgeReceiptValue.placeholder, true);
  assert.equal(providerReceiptValue.placeholder, true);
  expectCode(() => validateEdgeReceipt(edgeReceiptValue, installedAuthority),
    'runtime_edge_receipt_invalid');
  expectCode(() => validateProviderReceipt(providerReceiptValue, installedAuthority),
    'runtime_provider_receipt_invalid');

  // A stage rerun over a fully materialized pair is recognized as already
  // materialized and never rewrites or downgrades the installed sources.
  const stagedRerun = stageInitialMounts(stagingOptions);
  assert.equal(stagedRerun.authoritySource.status, 'already_materialized');
  assert.equal(stagedRerun.profileSource.status, 'already_materialized');
  assert.equal(stagedRerun.productionAuthorityValid, true);
  assert.equal(stagedRerun.productionProfileValid, true);
  assert.equal(stagedRerun.freshEdgeReceipt, false);
  assert.equal(stagedRerun.freshProviderReceipt, false);
});

test('materialization recovers from a crash that installed only the authority', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-recovery-a-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  const canonicalBase = path.join(root, 'bootstrap');
  fs.mkdirSync(canonicalBase, { recursive: true, mode: 0o700 });
  fs.chmodSync(canonicalBase, 0o700);
  const receipts = path.join(root, 'run');
  fs.mkdirSync(receipts, { recursive: true, mode: 0o700 });
  fs.chmodSync(receipts, 0o700);
  const generation = C('a');
  const stagingOptions = {
    generation, canonicalBase, root: path.join(canonicalBase, generation),
    uid, gid, requireRoot: false,
    edgeReceiptPath: path.join(receipts, 'edge-receipt.json'),
    providerReceiptPath: path.join(receipts, 'provider-receipt.json')
  };
  const staged = stageInitialMounts(stagingOptions);
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, {
    seedPath,
    authorityPath: staged.authoritySource.path,
    profilePath: staged.profileSource.path,
    edgeReceiptPath: staged.edgeReceiptSource.path,
    providerReceiptPath: staged.providerReceiptSource.path
  });
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  const candidate = path.join(root, 'creator-output.json');
  fs.writeFileSync(candidate, canonicalJson(output), { mode: 0o600 });

  // Simulate a crash after the authority commit but before the profile commit.
  fs.writeFileSync(staged.authoritySource.path, canonicalJson(output.authority), { mode: 0o644 });
  fs.chmodSync(staged.authoritySource.path, 0o644);
  const recovered = materializeInitialMounts({ ...stagingOptions, candidate });
  assert.equal(recovered.installed, true);
  assert.equal(sha256Buffer(fs.readFileSync(staged.profileSource.path)), output.profileSha256);
  assert.equal(canonicalJson(JSON.parse(fs.readFileSync(staged.authoritySource.path, 'utf8'))),
    canonicalJson(output.authority));
});

test('materialization recovers from a crash that installed only the profile', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-recovery-b-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  const canonicalBase = path.join(root, 'bootstrap');
  fs.mkdirSync(canonicalBase, { recursive: true, mode: 0o700 });
  fs.chmodSync(canonicalBase, 0o700);
  const receipts = path.join(root, 'run');
  fs.mkdirSync(receipts, { recursive: true, mode: 0o700 });
  fs.chmodSync(receipts, 0o700);
  const generation = C('a');
  const stagingOptions = {
    generation, canonicalBase, root: path.join(canonicalBase, generation),
    uid, gid, requireRoot: false,
    edgeReceiptPath: path.join(receipts, 'edge-receipt.json'),
    providerReceiptPath: path.join(receipts, 'provider-receipt.json')
  };
  const staged = stageInitialMounts(stagingOptions);
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, {
    seedPath,
    authorityPath: staged.authoritySource.path,
    profilePath: staged.profileSource.path,
    edgeReceiptPath: staged.edgeReceiptSource.path,
    providerReceiptPath: staged.providerReceiptSource.path
  });
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  const candidate = path.join(root, 'creator-output.json');
  fs.writeFileSync(candidate, canonicalJson(output), { mode: 0o600 });

  // Simulate a crash after the profile commit but before the authority commit.
  fs.writeFileSync(staged.profileSource.path, canonicalJson(output.profile), { mode: 0o644 });
  fs.chmodSync(staged.profileSource.path, 0o644);
  const recovered = materializeInitialMounts({ ...stagingOptions, candidate });
  assert.equal(recovered.installed, true);
  assert.equal(canonicalJson(JSON.parse(fs.readFileSync(staged.authoritySource.path, 'utf8'))),
    canonicalJson(output.authority));
  assert.equal(sha256Buffer(fs.readFileSync(staged.profileSource.path)), output.profileSha256);
});

test('materialization rejects a valid but mismatched partial final and preserves staged files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-mismatch-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  const canonicalBase = path.join(root, 'bootstrap');
  fs.mkdirSync(canonicalBase, { recursive: true, mode: 0o700 });
  fs.chmodSync(canonicalBase, 0o700);
  const receipts = path.join(root, 'run');
  fs.mkdirSync(receipts, { recursive: true, mode: 0o700 });
  fs.chmodSync(receipts, 0o700);
  const generation = C('a');
  const stagingOptions = {
    generation, canonicalBase, root: path.join(canonicalBase, generation),
    uid, gid, requireRoot: false,
    edgeReceiptPath: path.join(receipts, 'edge-receipt.json'),
    providerReceiptPath: path.join(receipts, 'provider-receipt.json')
  };
  const staged = stageInitialMounts(stagingOptions);
  const runtime = baseInspect();
  const seedA = path.join(root, 'seed-a.json');
  fs.writeFileSync(seedA, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const { args: argsA, deps: depsA } = authorityCreatorHarness(runtime, {
    seedPath: seedA,
    authorityPath: staged.authoritySource.path,
    profilePath: staged.profileSource.path,
    edgeReceiptPath: staged.edgeReceiptSource.path,
    providerReceiptPath: staged.providerReceiptSource.path
  });
  const outputA = JSON.parse(createRuntimeAuthorityMain(argsA, depsA));
  const candidateA = path.join(root, 'candidate-a.json');
  fs.writeFileSync(candidateA, canonicalJson(outputA), { mode: 0o600 });

  // A second valid creator output for the same generation/bindings but a
  // different profile is used to build a mismatched partial-final crash state.
  const seedB = path.join(root, 'seed-b.json');
  fs.writeFileSync(seedB, canonicalJson({
    ...initialProfileSeed(), controllerSourceManifestDigest: S('9')
  }), { mode: 0o600 });
  const { args: argsB, deps: depsB } = authorityCreatorHarness(runtime, {
    seedPath: seedB,
    authorityPath: staged.authoritySource.path,
    profilePath: staged.profileSource.path,
    edgeReceiptPath: staged.edgeReceiptSource.path,
    providerReceiptPath: staged.providerReceiptSource.path
  });
  const outputB = JSON.parse(createRuntimeAuthorityMain(argsB, depsB));
  assert.notEqual(outputA.authority.profileSha256, outputB.authority.profileSha256);

  // Crash state: B's authority is final, the profile is still A's placeholder.
  fs.writeFileSync(staged.authoritySource.path, canonicalJson(outputB.authority), { mode: 0o644 });
  fs.chmodSync(staged.authoritySource.path, 0o644);
  expectCode(() => materializeInitialMounts({ ...stagingOptions, candidate: candidateA }),
    'blocked_bootstrap_materialization_binding_mismatch');
  assert.equal(JSON.parse(fs.readFileSync(staged.profileSource.path, 'utf8')).placeholder, true);
  assert.equal(canonicalJson(JSON.parse(fs.readFileSync(staged.authoritySource.path, 'utf8'))),
    canonicalJson(outputB.authority));
});

test('materialize removes its temporary file when a commit rename fails and rerun recovers', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-initial-cleanup-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  const canonicalBase = path.join(root, 'bootstrap');
  fs.mkdirSync(canonicalBase, { recursive: true, mode: 0o700 });
  fs.chmodSync(canonicalBase, 0o700);
  const receipts = path.join(root, 'run');
  fs.mkdirSync(receipts, { recursive: true, mode: 0o700 });
  fs.chmodSync(receipts, 0o700);
  const generation = C('a');
  const stagingOptions = {
    generation, canonicalBase, root: path.join(canonicalBase, generation),
    uid, gid, requireRoot: false,
    edgeReceiptPath: path.join(receipts, 'edge-receipt.json'),
    providerReceiptPath: path.join(receipts, 'provider-receipt.json')
  };
  const staged = stageInitialMounts(stagingOptions);
  const seedPath = path.join(root, 'seed.json');
  fs.writeFileSync(seedPath, canonicalJson(initialProfileSeed()), { mode: 0o600 });
  const runtime = baseInspect();
  const { args, deps } = authorityCreatorHarness(runtime, {
    seedPath,
    authorityPath: staged.authoritySource.path,
    profilePath: staged.profileSource.path,
    edgeReceiptPath: staged.edgeReceiptSource.path,
    providerReceiptPath: staged.providerReceiptSource.path
  });
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  const candidate = path.join(root, 'creator-output.json');
  fs.writeFileSync(candidate, canonicalJson(output), { mode: 0o600 });

  // Inject a rename failure for the profile commit so materialize stops after
  // the authority rename, leaving exactly the partial-crash state the
  // recoverable state machine is required to converge.
  const cleaned = [];
  const injectedFs = new Proxy(fs, {
    get(target, property) {
      if (property === 'renameSync') {
        return (from, to) => {
          if (path.basename(to) === 'profile-v7.json') {
            const error = new Error('injected rename failure');
            error.code = 'EIO';
            throw error;
          }
          return target.renameSync(from, to);
        };
      }
      if (property === 'unlinkSync') {
        return file => {
          cleaned.push(file);
          return target.unlinkSync(file);
        };
      }
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  expectCode(() => materializeInitialMounts({ ...stagingOptions, candidate, fsModule: injectedFs }),
    'EIO');
  assert.equal(cleaned.length, 1);
  assert.equal(path.basename(cleaned[0]).startsWith('.profile-v7.json.'), true);
  assert.deepEqual(fs.readdirSync(stagingOptions.root).filter(name => name.endsWith('.tmp')), []);
  // The authority commit landed and the profile is still the exact placeholder.
  assert.equal(canonicalJson(JSON.parse(fs.readFileSync(staged.authoritySource.path, 'utf8'))),
    canonicalJson(output.authority));
  assert.equal(JSON.parse(fs.readFileSync(staged.profileSource.path, 'utf8')).placeholder, true);

  // Rerunning materialize with the real filesystem converges the partial pair.
  const recovered = materializeInitialMounts({ ...stagingOptions, candidate });
  assert.equal(recovered.installed, true);
  assert.equal(sha256Buffer(fs.readFileSync(staged.profileSource.path)), output.profileSha256);
  assert.equal(canonicalJson(JSON.parse(fs.readFileSync(staged.authoritySource.path, 'utf8'))),
    canonicalJson(output.authority));
});

test('initial profile seed reader rejects symlinks and mid-read replacement', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-seed-read-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const seedFile = path.join(root, 'seed.json');
  const seedBytes = canonicalJson(initialProfileSeed());
  fs.writeFileSync(seedFile, seedBytes, { mode: 0o600 });
  assert.deepEqual(
    readInitialProfileSeed(seedFile, { requireRootFiles: false }),
    JSON.parse(seedBytes)
  );
  const link = path.join(root, 'seed-link.json');
  fs.symlinkSync(seedFile, link);
  expectCode(() => readInitialProfileSeed(link, { requireRootFiles: false }),
    'runtime_initial_profile_seed_unavailable');
  const groupWritable = path.join(root, 'seed-group.json');
  fs.writeFileSync(groupWritable, seedBytes, { mode: 0o660 });
  // writeFileSync mode is masked by the process umask, so force the
  // group-writable bit to make the permission-rejection deterministic.
  fs.chmodSync(groupWritable, 0o660);
  expectCode(() => readInitialProfileSeed(groupWritable, { requireRootFiles: false }),
    'runtime_initial_profile_seed_unavailable');
  const changing = path.join(root, 'seed-toctou.json');
  fs.writeFileSync(changing, seedBytes, { mode: 0o600 });
  let statCount = 0;
  const fsModule = {
    ...fs,
    fstatSync(descriptor) {
      const stat = fs.fstatSync(descriptor);
      statCount += 1;
      if (statCount > 1) {
        return { ...stat, isFile: () => stat.isFile(), size: stat.size + 1 };
      }
      return stat;
    }
  };
  expectCode(() => readInitialProfileSeed(changing, {
    requireRootFiles: false, fsModule
  }), 'runtime_initial_profile_seed_unavailable');
});

test('schema-v7 migration rejects state components for another private root', () => {
  const correctAuthority = authorityWithEdge();
  const current = currentProfile(correctAuthority);
  const correct = profileV7MigrationCandidate(
    current, profileAuthorityComponents(correctAuthority), {
      expectedCurrentFingerprint: digest(current)
    }
  );
  assert.equal(correct.stateRootUnchanged, true);
  assert.equal(correct.nextProfile.privateRoot, current.privateRoot);
  assert.equal(correct.nextProfile.stateMountContractDigest,
    digest(stateContract(current.privateRoot)));

  const otherContract = stateContract('/srv/codex-memory/other-r5c');
  const wrongAuthority = authority(baseInspect(), {
    profileSha256: S('0'),
    stateMountContract: otherContract,
    stateMountContractDigest: digest(otherContract)
  });
  expectCode(() => profileV7MigrationCandidate(
    currentProfile(wrongAuthority), profileAuthorityComponents(wrongAuthority), {
      expectedCurrentFingerprint: digest(currentProfile(wrongAuthority))
    }
  ), 'runtime_image_profile_state_mount_mismatch');
});

test('state mount contract semantics stay exact without a schema bump', () => {
  const valid = stateContract();
  assert.deepEqual(validateStateMountContract(valid), valid);
  for (const candidate of [
    { ...valid, readOnly: false },
    { ...valid, stateRootClass: 'external_secondary_r5c' },
    { ...valid, schemaVersion: 'codex-memory-runtime-state-mount/v2' }
  ]) {
    expectCode(() => validateStateMountContract(candidate),
      'runtime_state_mount_contract_invalid');
  }
});

test('authority creation and host admission reject schema-only profile bytes', () => {
  const invalidBytes = Buffer.from('{"schemaVersion":7}\n');
  expectCode(() => validateAuthorityProfileBytes(invalidBytes),
    'runtime_authority_profile_invalid');
  const a = {
    ...authorityWithEdge(),
    profileSha256: sha256Buffer(invalidBytes)
  };
  expectCode(() => validateHostProfileBytes(invalidBytes, a),
    'host_launcher_profile_authority_mismatch');
});

test('schema-v6 to v7 produces candidate only and preserves state/credential refs', () => {
  const inspect = baseInspect();
  const a = authority(inspect);
  const current = {
    adoptedRepositoryHead: C('1'),
    controllerSourceManifestDigest: S('1'),
    controllerSourceManifestVersion: 1,
    edgeContainer: 'codex-memory-full-stack-001-edge',
    edgeContainerId: a.edgeContainerId,
    governanceEnvironment: 'governance/runtime.env',
    governanceEnvironmentConfigDigest: S('2'),
    privateRoot: '/srv/codex-memory/r5c',
    providerContainer: 'new-api-wsl',
    providerContainerId: a.providerContainerId,
    providerImageId: a.providerDaemonImageIdentity,
    providerRevision: a.providerRevision,
    relayEnvironment: 'relay/runtime.env',
    relayEnvironmentConfigDigest: S('4'),
    retainedBinding: 'binding.json',
    retainedBindingSource: C('4'),
    runtimeBaseline: C('5'),
    runtimeRepository: '/repo',
    schemaVersion: 6,
    vcpProviderConfigDigest: S('5'),
    vcpRuntimeBaseline: C('6'),
    vcpRuntimeContractDigest: S('6'),
    vcpRuntimeIdentitySchemaVersion: 1,
    vcpRuntimeRepository: '/vcp',
    vcpRuntimeScopeDigest: S('7')
  };
  const result = profileV7MigrationCandidate(current, profileAuthorityComponents(a), {
    expectedCurrentFingerprint: digest(current)
  });
  assert.equal(result.candidateOnly, true);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.stateRootUnchanged, true);
  assert.equal(result.credentialReferencesUnchanged, true);
  assert.equal(result.nextProfile.schemaVersion, 7);
  assert.equal(result.nextProfile.runtimeRepository, IMAGE_RUNTIME_ROOT);
  assert.equal(result.nextProfile.vcpRuntimeRepository, IMAGE_VCP_ROOT);
  assert.equal(result.nextProfile.providerContainerId, a.providerContainerId);
  assert.equal(result.nextProfile.providerImageId, undefined);
  assert.equal(result.nextProfile.providerDaemonImageIdentity,
    a.providerDaemonImageIdentity);
  assert.equal(result.nextProfile.providerImageConfigDigest,
    a.providerImageConfigDigest);
  assert.equal(result.nextProfile.providerImageStoreIdentityModel,
    a.providerImageStoreIdentityModel);
  assert.equal(result.nextProfile.providerOciManifestDigest,
    a.providerOciManifestDigest);
  assert.equal(result.nextProfile.providerRevision, a.providerRevision);
  assert.equal(result.nextProfile.providerRuntimeConfigDigest,
    a.providerContainerConfigDigest);
  assert.equal(result.nextProfile.edgeRuntimeConfigDigest, a.edgeConfigDigest);
  assert.deepEqual(validateImageProfile(
    result.nextProfile, profileAuthorityComponents(a)
  ), result.nextProfile);
  assert.deepEqual(validateProfile(result.nextProfile), result.nextProfile);
  assert.equal(containerSupervisorAuthorityMatchesProfile(result.nextProfile, a), true);
  assert.equal(validateProfile(result.nextProfile).schemaVersion, 7);
});
