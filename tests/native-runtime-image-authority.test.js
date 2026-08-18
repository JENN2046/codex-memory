'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  AUTHORITY_SCHEMA,
  BUILD_MANIFEST_SCHEMA,
  EDGE_RECEIPT_SCHEMA,
  PROVIDER_RECEIPT_SCHEMA,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  STATE_MOUNT_SCHEMA,
  authorityRecordDigest,
  buildManifestDigest,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  profileAuthorityComponents,
  profileV7MigrationCandidate,
  readBoundedJson,
  sha256Buffer,
  validateAuthorityRecord,
  validateBuildManifest,
  validateContainerInspection,
  validateEdgeReceipt,
  validateProviderReceipt,
  validateImageInspection,
  validateRuntimeSelfEvidence
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
  containerSupervisorAuthorityMatchesProfile,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  atomicRootReceipt,
  buildEdgeReceipt,
  buildProviderReceipt,
  validateEdgeContainer,
  validateImageForHost,
  validateProviderContainer,
  validateStableHostMountSource,
  verifyHostAuthority
} = require('../deploy/native-runtime/host-launcher');
const {
  HISTORICAL_PROVIDER_REVISION,
  historicalProviderInspect
} = require('./fixtures/native-provider-inspect-v2');

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);
const PROFILE_BYTES = Buffer.from('{"schemaVersion":7}\n');
const ALLOWED_RUNTIME_ENV = Object.freeze([
  'CODEX_MEMORY_CONTAINER_AUTHORITY_PATH', 'CODEX_MEMORY_CONTAINER_SUPERVISOR',
  'CODEX_MEMORY_EDGE_RECEIPT_PATH', 'CODEX_MEMORY_PROVIDER_RECEIPT_PATH',
  'CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH', 'CODEX_MEMORY_STACK_PROFILE_PATH',
  'CODEX_MEMORY_STACK_RUNTIME_DIR', 'NODE_ENV', 'VCP_ROOT', 'VCPTOOLBOX_ROOT'
]);
const SOURCES = Object.freeze({
  authority: '/etc/codex-memory/authority.json',
  edgeReceipt: '/run/codex-memory/edge-receipt.json',
  primaryState: '/synthetic/r5c',
  profile: '/etc/codex-memory/profile.json',
  providerEnvironment: '/etc/codex-memory/provider.env',
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

function authority(inspect = baseInspect(), overrides = {}) {
  const stateMountContract = {
    containerPath: '/srv/codex-memory/r5c',
    readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c'
  };
  const manifest = buildManifest();
  return {
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
    profileSha256: sha256Buffer(PROFILE_BYTES),
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
    nativeClosure: nativeClosure(), profileBytes: PROFILE_BYTES,
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
  fs.writeFileSync(profilePath, PROFILE_BYTES, { mode: 0o600 });
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
    execFile, requireRootFiles: false,
    verifyNativeClosureBytes: value => validateNativeClosure(value)
  };
  assert.equal(verifyHostAuthority(accepted, options).runtime.Id, runtime.Id);
  fs.writeFileSync(profilePath, Buffer.concat([PROFILE_BYTES, Buffer.from(' ')]), { mode: 0o600 });
  expectCode(() => verifyHostAuthority(accepted, options),
    'host_launcher_profile_authority_mismatch');
  fs.writeFileSync(profilePath, PROFILE_BYTES, { mode: 0o600 });
  fs.writeFileSync(profilePath, '{"schemaVersion":6}\n', { mode: 0o600 });
  expectCode(() => verifyHostAuthority(accepted, options),
    'host_launcher_profile_authority_mismatch');
  fs.writeFileSync(profilePath, PROFILE_BYTES, { mode: 0o600 });
  const replacement = path.join(root, 'replacement-profile.json');
  fs.writeFileSync(replacement, PROFILE_BYTES, { mode: 0o600 });
  fs.unlinkSync(profilePath);
  fs.symlinkSync(replacement, profilePath);
  expectCode(() => verifyHostAuthority(accepted, options),
    'runtime_authority_file_unavailable');
  fs.unlinkSync(profilePath);
  fs.writeFileSync(profilePath, PROFILE_BYTES, { mode: 0o600 });
  expectCode(() => verifyHostAuthority({
    ...accepted, hostLauncherDigest: S('0')
  }, options), 'host_launcher_trust_bundle_mismatch');
});

test('host Edge receipt is derived from exact healthy Edge inspection', () => {
  const a = authorityWithEdge();
  const edge = edgeInspect(a);
  const receipt = buildEdgeReceipt(edge, a, 'boot-identity-0001',
    1_700_000_000_000, edgeEvidenceOptions(a));
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
  assert.equal(containerSupervisorAuthorityMatchesProfile(result.nextProfile, a), true);
  assert.equal(validateProfile(result.nextProfile).schemaVersion, 7);
});
