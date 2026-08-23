'use strict';
// POST_PR106_RUNTIME_GENERATION_TRANSITION_SOURCE_REPAIR — creator mode
// End-to-end contract for create-codex-memory-runtime-authority.js
// generation-rollover mode:
//   accepted CURRENT authority/profile -> observe NEW stopped Runtime/image ->
//   profile-independent NEW components -> profileV7GenerationRolloverCandidate()
//   -> NEW exact profile bytes -> final NEW authority -> mutual validation PASS.
// Negatives (wrong current authority / bytes / fingerprint, running Runtime,
// config mismatch) fail closed. The output classification is generation_rollover
// and must never masquerade as initial_bootstrap.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  BUILD_MANIFEST_SCHEMA,
  AUTHORITY_SCHEMA,
  STATE_MOUNT_SCHEMA,
  buildManifestDigest,
  canonicalJson,
  containerConfigDigest,
  digest,
  profileAuthorityComponents,
  profileV7InitialBootstrapCandidate,
  sha256Buffer,
  validateAuthorityRecord,
  validateImageProfile
} = require('../src/runtime/native-image/runtime-authority');
const {
  EDGE_POLICY,
  EDGE_POLICY_DIGEST,
  PROVIDER_POLICY,
  PROVIDER_POLICY_DIGEST,
  RUNTIME_POLICY_DIGEST
} = require('../src/runtime/native-image/container-policy');
const { EXPECTED_BETTER_SQLITE_PATH, EXPECTED_VEXUS_PATH,
  EXPECTED_VEXUS_SHA256, nativeClosureDigest } =
  require('../src/runtime/native-image/native-closure');
const { main: createRuntimeAuthorityMain } = require(
  '../scripts/create-codex-memory-runtime-authority'
);
const { historicalProviderInspect } = require(
  './fixtures/native-provider-inspect-v2'
);

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);

const NEW_IMAGE_ID = S('9');
const NEW_CONTAINER_ID = I('d');
const SOURCES = Object.freeze({
  authority: '/etc/codex-memory/authority.json',
  edgeReceipt: '/run/codex-memory/edge-receipt.json',
  primaryState: '/srv/codex-memory/r5c',
  profile: '/etc/codex-memory/bootstrap/next/profile-v7.json',
  providerEnvironment: '/etc/codex-memory/vcp-provider.env',
  providerReceipt: '/run/codex-memory/provider-receipt.json',
  runtimeDirectory: '/var/lib/codex-memory/runtime-next'
});

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

function buildManifest(overrides = {}) {
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
    runtimeBuildManifestVersion: BUILD_MANIFEST_SCHEMA, sourceDateEpoch: 1_700_000_000,
    vcpCommit: C('bb'), vcpTree: S('8'), vexusSha256: S('9'), ...overrides
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

function newRuntimeInspect(overrides = {}) {
  return {
    Config: {
      Cmd: [],
      Entrypoint: ['/usr/local/bin/node',
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
    Id: NEW_CONTAINER_ID,
    Image: NEW_IMAGE_ID,
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

function currentAuthorityFixture(currentProfilePath) {
  const manifest = buildManifest();
  const stateMountContract = stateContract();
  return {
    acceptedImageConfigId: S('d'), acceptedOciArchiveSha256: S('a'),
    acceptedOciManifestDigest: S('e'), authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: buildManifestDigest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit, containerConfigDigest: S('11'),
    edgeConfigDigest: S('12'), edgeContainerId: I('1'), edgeArtifactSha256: S('2'),
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
    expectedRuntimeContainerId: I('c'), hostLauncherDigest: S('3'),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    nativeClosureDigest: nativeClosureDigest(nativeClosure()),
    profilePath: currentProfilePath, profileSchemaVersion: 7,
    profileSha256: S('0'),
    providerContainerConfigDigest: S('8'), providerContainerId: I('8'),
    providerDaemonImageIdentity: PROVIDER_POLICY.daemonImageIdentity,
    providerImageConfigDigest: PROVIDER_POLICY.imageConfigDigest,
    providerImageStoreIdentityModel: PROVIDER_POLICY.imageStoreIdentityModel,
    providerOciManifestDigest: PROVIDER_POLICY.ociManifestDigest,
    providerPolicyDigest: PROVIDER_POLICY_DIGEST,
    providerRevision: PROVIDER_POLICY.imageRevision,
    rootfsChainDigest: digest([S('4'), S('5')]),
    runtimeMountSources: { ...SOURCES, profile: currentProfilePath },
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST, stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit
  };
}

function currentProfileFor(authority, overrides = {}) {
  const seed = {
    controllerSourceManifestDigest: S('c1'), controllerSourceManifestVersion: 1,
    edgeContainer: 'codex-memory-full-stack-001-edge',
    governanceEnvironment: 'governance/runtime.env',
    governanceEnvironmentConfigDigest: S('c2'), privateRoot: '/srv/codex-memory/r5c',
    providerContainer: 'new-api-wsl', relayEnvironment: 'relay/runtime.env',
    relayEnvironmentConfigDigest: S('c4'), retainedBinding: 'binding.json',
    retainedBindingSource: C('c4'), vcpProviderConfigDigest: S('c5'),
    vcpRuntimeScopeDigest: S('c7')
  };
  return profileV7InitialBootstrapCandidate(
    seed, profileAuthorityComponents(validateAuthorityRecord(authority))
  ).nextProfile;
}

function expectedNextAuthority(runtime, current, currentProfilePath, manifest) {
  const stateMountContract = stateContract();
  const next = {
    ...current,
    acceptedImageConfigId: NEW_IMAGE_ID,
    acceptedOciArchiveSha256: S('a1'),
    acceptedOciManifestDigest: S('e1'),
    buildManifestDigest: buildManifestDigest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit,
    containerConfigDigest: containerConfigDigest(runtime),
    expectedRuntimeContainerId: NEW_CONTAINER_ID,
    hostLauncherDigest: S('3b'),
    profilePath: SOURCES.profile,
    profileSha256: S('0'),
    rootfsChainDigest: digest([S('6'), S('7')]),
    runtimeMountSources: SOURCES,
    vcpCommit: manifest.vcpCommit
  };
  return next;
}

function providerElf() {
  const value = Buffer.alloc(64);
  value.writeUInt32BE(0x7f454c46, 0);
  value[4] = 2;
  value[5] = 1;
  value.writeUInt16LE(62, 18);
  return value;
}

function edgeInspect(a = currentAuthorityFixture('/synthetic/profile.json')) {
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
    State: { Health: { Status: 'healthy' }, Running: true }
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

function providerInspect(a = currentAuthorityFixture('/synthetic/profile.json')) {
  const value = historicalProviderInspect();
  value.Id = a.providerContainerId;
  value.Image = a.providerDaemonImageIdentity;
  value.Config.Labels['org.opencontainers.image.revision'] = a.providerRevision;
  value.State.Running = true;
  return value;
}

function harness(t, {
  runtime = newRuntimeInspect(),
  currentAuthorityOverrides = {},
  currentProfileOverrides = {},
  expectedFingerprint = null,
  extraArgs = []
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-gen-rollover-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const currentProfilePath = path.join(root, 'current-profile.json');
  const currentAuthorityPath = path.join(root, 'current-authority.json');
  const currentAuth = currentAuthorityFixture(currentProfilePath);
  const baseProfile = currentProfileFor(currentAuth);
  // The ACTIVE authority binds the ORIGINAL profile bytes. When overrides are
  // supplied, the on-disk profile differs from those bound bytes, which the
  // creator must reject (runtime_authority_generation_source_not_active).
  const currentProfile = { ...baseProfile, ...currentProfileOverrides };
  fs.writeFileSync(currentProfilePath, canonicalJson(currentProfile), { mode: 0o600 });
  const bound = { ...currentAuth, ...currentAuthorityOverrides };
  if (bound.profileSha256 === S('0')) {
    bound.profileSha256 = sha256Buffer(Buffer.from(canonicalJson(baseProfile)));
  }
  fs.writeFileSync(currentAuthorityPath, canonicalJson(bound), { mode: 0o600 });
  const manifest = buildManifest();
  const expected = expectedNextAuthority(runtime, bound, currentProfilePath, manifest);
  const image = { Id: NEW_IMAGE_ID, RootFS: { Layers: [S('6'), S('7')] } };
  const archiveEvidence = Object.freeze({
    archiveSha256: expected.acceptedOciArchiveSha256,
    buildContextDigest: manifest.buildContextFileManifestDigest,
    buildManifestDigest: expected.buildManifestDigest,
    configDigest: NEW_IMAGE_ID,
    contextDigest: manifest.buildContextFileManifestDigest,
    manifestDigest: expected.acceptedOciManifestDigest,
    rootfsChainDigest: digest([S('6'), S('7')])
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
  const edge = edgeInspect(expected);
  const provider = providerInspect(expected);
  const edgeImageInspect = {
    Architecture: 'amd64',
    Config: { Labels: { 'org.opencontainers.image.revision': expected.edgeSourceCommit } },
    Descriptor: { digest: expected.edgeOciManifestDigest },
    Id: expected.edgeOciManifestDigest, Os: 'linux',
    RepoDigests: [`codex-memory-chatgpt-edge@${expected.edgeOciManifestDigest}`]
  };
  const providerImageInspect = {
    Architecture: 'amd64',
    Config: { Env: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'], Labels: {} },
    Descriptor: { digest: PROVIDER_POLICY.ociManifestDigest },
    Id: PROVIDER_POLICY.daemonImageIdentity, Os: 'linux',
    RepoDigests: [`${PROVIDER_POLICY.imageRepository}@${PROVIDER_POLICY.ociManifestDigest}`]
  };
  const providerImageEvidence = {
    daemonImageIdentity: PROVIDER_POLICY.daemonImageIdentity,
    imageConfigDigest: PROVIDER_POLICY.imageConfigDigest,
    imageInheritedEnvironment: { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
    imageStoreIdentityModel: PROVIDER_POLICY.imageStoreIdentityModel,
    ociManifestDigest: PROVIDER_POLICY.ociManifestDigest
  };
  const args = [
    `--runtime-container-id=${runtime.Id}`,
    `--edge-container-id=${edge.Id}`,
    `--provider-container-id=${provider.Id}`,
    `--image-config-id=${NEW_IMAGE_ID}`,
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
    `--authority-path=${SOURCES.authority}`,
    `--edge-receipt=${SOURCES.edgeReceipt}`,
    `--provider-receipt=${SOURCES.providerReceipt}`,
    `--provider-environment=${SOURCES.providerEnvironment}`,
    `--state=${SOURCES.primaryState}`,
    `--runtime-directory=${SOURCES.runtimeDirectory}`,
    '--state-destination=/srv/codex-memory/r5c',
    `--profile=${SOURCES.profile}`,
    '--runtime-authority-module=src/runtime/native-image/runtime-authority.js',
    '--edge-image-authority-module=src/runtime/native-image/edge-image-authority.js',
    '--host-launcher=deploy/native-runtime/host-launcher.js',
    '--native-closure-module=src/runtime/native-image/native-closure.js',
    '--container-policy-module=src/runtime/native-image/container-policy.js',
    '--provider-image-authority-module=src/runtime/native-image/provider-image-authority.js',
    '--tar-archive-module=src/runtime/native-image/tar-archive.js',
    `--generation-profile-source=${currentProfilePath}`,
    `--current-authority=${currentAuthorityPath}`,
    `--expected-current-profile-fingerprint=${expectedFingerprint || digest(currentProfile)}`,
    ...extraArgs
  ];
  const deps = {
    inspect(kind, id) {
      if (kind === 'image') {
        if (id === NEW_IMAGE_ID) return image;
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
    providerEnvironmentValidator: () => ({ configDigest: S('c5') }),
    fsModule: edgeSecretFilesystem(),
    seedReaderOptions: { requireRootFiles: false },
    writeOutput: () => {}
  };
  return { args, deps, currentProfile, bound, root };
}

test('creator generation-rollover emits a mutually-valid new profile+authority pair', t => {
  const { args, deps, currentProfile, bound } = harness(t);
  const output = JSON.parse(createRuntimeAuthorityMain(args, deps));
  assert.equal(output.classification, 'generation_rollover');
  const nextAuthority = validateAuthorityRecord(output.authority);
  const nextProfile = output.profile;
  assert.equal(output.profileSha256, nextAuthority.profileSha256);
  assert.equal(
    output.profileSha256,
    sha256Buffer(Buffer.from(canonicalJson(nextProfile)))
  );
  // mutual validation: profile against next authority components.
  assert.deepEqual(
    validateImageProfile(nextProfile, profileAuthorityComponents(nextAuthority)),
    nextProfile
  );
  // continuity preserved from the current accepted profile.
  for (const key of ['controllerSourceManifestDigest',
    'controllerSourceManifestVersion', 'edgeContainer', 'governanceEnvironment',
    'governanceEnvironmentConfigDigest', 'privateRoot', 'providerContainer',
    'relayEnvironment', 'relayEnvironmentConfigDigest', 'retainedBinding',
    'retainedBindingSource', 'vcpProviderConfigDigest', 'vcpRuntimeScopeDigest']) {
    assert.equal(nextProfile[key], currentProfile[key], `continuity ${key}`);
  }
  // generation fields rebound to the new observation.
  assert.equal(nextProfile.runtimeContainerId, NEW_CONTAINER_ID);
  assert.equal(nextProfile.runtimeImageConfigId, NEW_IMAGE_ID);
  assert.notEqual(nextProfile.vcpRuntimeContractDigest, bound.vcpRuntimeContractDigest);
});

test('creator generation-rollover rejects when current profile is not bound by current authority', t => {
  const { args, deps } = harness(t, {
    currentAuthorityOverrides: { profileSha256: S('deadbeef') }
  });
  expectCode(
    () => createRuntimeAuthorityMain(args, deps),
    'runtime_authority_generation_source_not_active'
  );
});

test('creator generation-rollover rejects when current profile bytes are not the bound bytes', t => {
  const { args, deps } = harness(t, {
    currentProfileOverrides: { governanceEnvironmentConfigDigest: S('c9') }
  });
  // The fixture's current profile bytes change, so the ACTIVE authority's
  // profileSha256 no longer matches the bytes on disk.
  expectCode(
    () => createRuntimeAuthorityMain(args, deps),
    'runtime_authority_generation_source_not_active'
  );
});

test('creator generation-rollover rejects a wrong current profile fingerprint', t => {
  const { args, deps } = harness(t, {
    expectedFingerprint: S('badbad')
  });
  expectCode(
    () => createRuntimeAuthorityMain(args, deps),
    'runtime_profile_v7_generation_rollover_source_invalid'
  );
});

test('creator generation-rollover rejects a running NEW runtime', t => {
  const { args, deps } = harness(t, {
    runtime: newRuntimeInspect({ State: { Running: true } })
  });
  expectCode(
    () => createRuntimeAuthorityMain(args, deps),
    'runtime_authority_generation_runtime_active'
  );
});

test('creator generation-rollover rejects a NEW runtime config mismatch', t => {
  const runtime = newRuntimeInspect();
  runtime.Config.Env = runtime.Config.Env.filter(
    entry => !entry.startsWith('XDG_RUNTIME_DIR=')
  );
  const { args, deps } = harness(t, { runtime });
  expectCode(
    () => createRuntimeAuthorityMain(args, deps),
    'runtime_container_canonical_policy_mismatch'
  );
});
