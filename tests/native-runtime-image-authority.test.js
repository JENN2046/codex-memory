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
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  STATE_MOUNT_SCHEMA,
  authorityRecordDigest,
  buildManifestDigest,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  profileV7MigrationCandidate,
  validateAuthorityRecord,
  validateBuildManifest,
  validateContainerInspection,
  validateEdgeReceipt,
  validateImageInspection,
  validateRuntimeSelfEvidence
} = require('../src/runtime/native-image/runtime-authority');
const {
  containerSupervisorAuthorityMatchesProfile,
  validateProfile
} = require('../scripts/codex-memory-stack');
const {
  buildEdgeReceipt,
  validateEdgeContainer,
  validateImageForHost
} = require('../deploy/native-runtime/host-launcher');

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);

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
      Env: ['NODE_ENV=production'],
      User: '1000:1000'
    },
    HostConfig: {
      CapAdd: [],
      CapDrop: ['ALL'],
      IpcMode: '',
      NetworkMode: 'host',
      PidMode: '',
      Privileged: false,
      ReadonlyRootfs: true,
      RestartPolicy: { Name: 'no' },
      SecurityOpt: ['no-new-privileges:true'],
      Tmpfs: { '/run/codex-memory-runtime': 'rw,noexec,nosuid,nodev' }
    },
    Id: I('c'),
    Image: S('d'),
    Mounts: [
      { Destination: '/run/codex-memory/authority.json', Propagation: 'rprivate', RW: false, Source: '/etc/codex-memory/authority.json', Type: 'bind' },
      { Destination: '/run/codex-memory/edge-receipt.json', Propagation: 'rprivate', RW: false, Source: '/run/codex-memory/edge-receipt.json', Type: 'bind' },
      { Destination: '/srv/codex-memory/r5c', Propagation: 'rprivate', RW: false, Source: '/synthetic/r5c', Type: 'bind' }
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
    acceptedOciManifestDigest: S('e'),
    authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: buildManifestDigest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit,
    containerConfigDigest: containerConfigDigest(inspect),
    edgeConfigDigest: S('f'),
    edgeContainerId: I('1'),
    edgeImageIdentity: S('2'),
    edgeLifecycleAuthority: 'host_launcher',
    expectedRuntimeContainerId: inspect.Id,
    hostLauncherDigest: S('3'),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    rootfsChainDigest: digest([S('4'), S('5')]),
    stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit,
    ...overrides
  };
}

function edgeInspect(a = authority(), overrides = {}) {
  return {
    Config: { Cmd: [], Entrypoint: [], Env: [], User: '1000:1000' },
    HostConfig: {
      CapAdd: [], CapDrop: ['ALL'], IpcMode: '', NetworkMode: 'bridge',
      PidMode: '', Privileged: false, ReadonlyRootfs: true,
      RestartPolicy: { Name: 'no' }, SecurityOpt: ['no-new-privileges:true']
    },
    Id: a.edgeContainerId,
    Image: a.edgeImageIdentity,
    Mounts: [],
    State: { Health: { Status: 'healthy' }, Running: true },
    ...overrides
  };
}

function authorityWithEdge(inspect = baseInspect()) {
  const initial = authority(inspect);
  const edge = edgeInspect(initial);
  return authority(inspect, { edgeConfigDigest: containerConfigDigest(edge) });
}

function edgeReceipt(a, now = Date.now()) {
  return {
    edgeConfigDigest: a.edgeConfigDigest,
    edgeContainerId: a.edgeContainerId,
    edgeHealth: 'healthy',
    edgeImageIdentity: a.edgeImageIdentity,
    launchEpoch: 'boot-identity-0001',
    launcherAuthorityDigest: authorityRecordDigest(a),
    observedAt: now,
    schemaVersion: EDGE_RECEIPT_SCHEMA
  };
}

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code);
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

test('host trust bundle binds launcher and first-party authority module bytes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-host-bundle-'));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const launcherFile = path.join(root, 'launcher.js');
  const authorityModuleFile = path.join(root, 'authority.js');
  fs.writeFileSync(launcherFile, 'launcher-a\n');
  fs.writeFileSync(authorityModuleFile, 'authority-a\n');
  const accepted = hostTrustBundleDigest({ launcherFile, authorityModuleFile });
  fs.writeFileSync(authorityModuleFile, 'authority-b\n');
  assert.notEqual(hostTrustBundleDigest({ launcherFile, authorityModuleFile }), accepted);
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
    allowedEnvironmentNames: ['NODE_ENV']
  }), 'runtime_container_code_mount_forbidden');
});

test('M Docker socket mount is rejected', () => {
  const inspect = baseInspect();
  inspect.Mounts.push({ Destination: '/var/run/docker.sock', RW: true, Source: '/var/run/docker.sock', Type: 'bind' });
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ['NODE_ENV']
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
    allowedEnvironmentNames: ['NODE_ENV']
  }), 'runtime_container_security_contract_mismatch');
});

test('R non-loopback listener configuration is not an allowed environment', () => {
  const inspect = baseInspect();
  inspect.Config.Env.push('CODEX_MEMORY_HTTP_HOST=0.0.0.0');
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ['NODE_ENV']
  }), 'runtime_container_environment_unapproved');
});

test('S writable primary state is rejected', () => {
  const inspect = baseInspect();
  inspect.Mounts.find(m => m.Destination === '/srv/codex-memory/r5c').RW = true;
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ['NODE_ENV']
  }), 'runtime_container_state_mount_mismatch');
});

test('T unexpected secret environment is rejected', () => {
  const inspect = baseInspect();
  inspect.Config.Env.push('TOKEN=synthetic-not-real');
  const a = authority(inspect);
  expectCode(() => validateContainerInspection(inspect, a, {
    allowedEnvironmentNames: ['NODE_ENV']
  }), 'runtime_container_environment_unapproved');
});

test('U stale Edge receipt is rejected', () => {
  const a = authorityWithEdge();
  expectCode(() => validateEdgeReceipt(edgeReceipt(a, 100), a, { now: 100_000 }),
    'runtime_edge_receipt_invalid');
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
  const value = validateRuntimeSelfEvidence({
    authority: a,
    buildManifest: buildManifest(),
    edgeReceipt: edgeReceipt(a),
    runtimeRoot: IMAGE_RUNTIME_ROOT,
    vcpRoot: IMAGE_VCP_ROOT,
    dockerSocketExists: () => false
  });
  assert.equal(value.accepted, true);
});

test('Y mutable source fallback path fails self-evidence', () => {
  const a = authorityWithEdge();
  expectCode(() => validateRuntimeSelfEvidence({
    authority: a, buildManifest: buildManifest(), edgeReceipt: edgeReceipt(a),
    runtimeRoot: '/repo', vcpRoot: IMAGE_VCP_ROOT,
    dockerSocketExists: () => false
  }), 'runtime_self_evidence_mismatch');
});

test('Z Docker socket presence fails self-evidence', () => {
  const a = authorityWithEdge();
  expectCode(() => validateRuntimeSelfEvidence({
    authority: a, buildManifest: buildManifest(), edgeReceipt: edgeReceipt(a),
    runtimeRoot: IMAGE_RUNTIME_ROOT, vcpRoot: IMAGE_VCP_ROOT,
    dockerSocketExists: () => true
  }), 'runtime_self_evidence_mismatch');
});

test('host image verifier binds config, rootfs and build-manifest label', () => {
  const a = authority();
  assert.equal(validateImageForHost({
    Config: { Labels: { 'io.codex-memory.runtime.build-manifest-digest': a.buildManifestDigest } },
    Id: a.acceptedImageConfigId,
    RootFS: { Layers: [S('4'), S('5')] }
  }, a), true);
});

test('host Edge receipt is derived from exact healthy Edge inspection', () => {
  const initial = authority();
  const edge = edgeInspect(initial);
  const a = authority(baseInspect(), { edgeConfigDigest: containerConfigDigest(edge) });
  const receipt = buildEdgeReceipt(edge, a, 'boot-identity-0001', 1_700_000_000_000);
  assert.equal(receipt.edgeContainerId, a.edgeContainerId);
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
    providerContainerId: I('2'),
    providerImageId: S('3'),
    providerRevision: C('3'),
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
  const result = profileV7MigrationCandidate(current, a, {
    expectedCurrentFingerprint: digest(current)
  });
  assert.equal(result.candidateOnly, true);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.stateRootUnchanged, true);
  assert.equal(result.credentialReferencesUnchanged, true);
  assert.equal(result.nextProfile.schemaVersion, 7);
  assert.equal(result.nextProfile.runtimeRepository, IMAGE_RUNTIME_ROOT);
  assert.equal(result.nextProfile.vcpRuntimeRepository, IMAGE_VCP_ROOT);
  assert.equal(containerSupervisorAuthorityMatchesProfile(result.nextProfile, a), true);
  assert.equal(validateProfile(result.nextProfile).schemaVersion, 7);
});
