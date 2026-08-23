'use strict';
// POST_PR106_RUNTIME_GENERATION_TRANSITION_SOURCE_REPAIR — Repair A
// Contract tests for profileV7GenerationRolloverCandidate():
//   accepted schema-v7 source -> deterministic schema-v7 next-generation candidate
//   exact semantic fingerprint + structural validity required, fail closed,
//   continuity fields preserved exactly, generation fields derived only from
//   the next authority components, candidate-only (no durable write), and the
//   historical migration/bootstrap producers keep their behavior.
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  BUILD_MANIFEST_SCHEMA,
  AUTHORITY_SCHEMA,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  PROFILE_SCHEMA_VERSION,
  STATE_MOUNT_SCHEMA,
  buildManifestDigest,
  canonicalJson,
  digest,
  hostTrustBundleDigest,
  profileAuthorityComponents,
  profileV7GenerationRolloverCandidate,
  profileV7InitialBootstrapCandidate,
  profileV7MigrationCandidate,
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

const S = value => `sha256:${String(value).repeat(64).slice(0, 64)}`;
const C = value => String(value).repeat(40).slice(0, 40);
const I = value => String(value).repeat(64).slice(0, 64);

const SOURCES = Object.freeze({
  authority: '/etc/codex-memory/authority.json',
  edgeReceipt: '/run/codex-memory/edge-receipt.json',
  primaryState: '/srv/codex-memory/r5c',
  profile: '/etc/codex-memory/bootstrap/next/profile-v7.json',
  providerEnvironment: '/etc/codex-memory/vcp-provider.env',
  providerReceipt: '/run/codex-memory/provider-receipt.json',
  runtimeDirectory: '/var/lib/codex-memory/runtime-next'
});

const CONTINUITY_KEYS = Object.freeze([
  'controllerSourceManifestDigest', 'controllerSourceManifestVersion',
  'edgeContainer', 'governanceEnvironment', 'governanceEnvironmentConfigDigest',
  'privateRoot', 'providerContainer', 'relayEnvironment',
  'relayEnvironmentConfigDigest', 'retainedBinding', 'retainedBindingSource',
  'vcpProviderConfigDigest', 'vcpRuntimeScopeDigest'
]);

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
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

function stateContract(containerPath = SOURCES.primaryState) {
  return { containerPath, readOnly: true, schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c' };
}

function oldAuthority(overrides = {}) {
  const manifest = buildManifest();
  const stateMountContract = stateContract();
  const value = {
    acceptedImageConfigId: S('d'),
    acceptedOciArchiveSha256: S('a'),
    acceptedOciManifestDigest: S('e'),
    authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: buildManifestDigest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit,
    containerConfigDigest: S('f'),
    edgeConfigDigest: S('11'),
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
    expectedRuntimeContainerId: I('c'),
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
    providerRevision: PROVIDER_POLICY.imageRevision,
    rootfsChainDigest: digest([S('4'), S('5')]),
    runtimeMountSources: SOURCES,
    runtimePolicyDigest: RUNTIME_POLICY_DIGEST,
    stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit,
    ...overrides
  };
  return value;
}

function nextAuthority(old = oldAuthority(), overrides = {}) {
  const next = JSON.parse(JSON.stringify(old));
  Object.assign(next, {
    acceptedImageConfigId: S('9'),
    acceptedOciArchiveSha256: S('a1'),
    acceptedOciManifestDigest: S('e1'),
    buildManifestDigest: S('b1'),
    codexMemoryCommit: C('aa'),
    containerConfigDigest: S('f1'),
    expectedRuntimeContainerId: I('d'),
    hostLauncherDigest: S('3b'),
    nativeClosureDigest: nativeClosureDigest(nativeClosure()),
    rootfsChainDigest: digest([S('6'), S('7')]),
    vcpCommit: C('bb')
  }, overrides);
  return next;
}

function seedFromProfile(profile) {
  const seed = {};
  for (const key of CONTINUITY_KEYS) seed[key] = profile[key];
  return seed;
}

// An accepted current v7 profile whose continuity fields are the source of the
// rollover, generated through the canonical seed->profile projection.
function currentProfileV7(a = oldAuthority()) {
  const seed = {
    controllerSourceManifestDigest: S('c1'),
    controllerSourceManifestVersion: 1,
    edgeContainer: 'codex-memory-full-stack-001-edge',
    governanceEnvironment: 'governance/runtime.env',
    governanceEnvironmentConfigDigest: S('c2'),
    privateRoot: '/srv/codex-memory/r5c',
    providerContainer: 'new-api-wsl',
    relayEnvironment: 'relay/runtime.env',
    relayEnvironmentConfigDigest: S('c4'),
    retainedBinding: 'binding.json',
    retainedBindingSource: C('c4'),
    vcpProviderConfigDigest: S('c5'),
    vcpRuntimeScopeDigest: S('c7')
  };
  return profileV7InitialBootstrapCandidate(
    seed, profileAuthorityComponents(validateAuthorityRecord(a))
  ).nextProfile;
}

test('profileV7GenerationRolloverCandidate: schema-7 valid source produces a candidate', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const result = profileV7GenerationRolloverCandidate(
    current,
    profileAuthorityComponents(validateAuthorityRecord(next)),
    { expectedCurrentFingerprint: digest(current) }
  );
  assert.equal(result.candidateOnly, true);
  assert.equal(result.classification, 'generation_rollover');
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.nextProfile.schemaVersion, PROFILE_SCHEMA_VERSION);
  assert.equal(result.currentProfileFingerprint, digest(current));
  assert.equal(result.stateRootUnchanged, true);
  assert.equal(result.credentialReferencesUnchanged, true);
});

test('profileV7GenerationRolloverCandidate: next profile validates against next components', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const components = profileAuthorityComponents(validateAuthorityRecord(next));
  const result = profileV7GenerationRolloverCandidate(
    current, components, { expectedCurrentFingerprint: digest(current) }
  );
  assert.deepEqual(validateImageProfile(result.nextProfile, components), result.nextProfile);
});

test('profileV7GenerationRolloverCandidate: continuity fields preserved exactly', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const result = profileV7GenerationRolloverCandidate(
    current,
    profileAuthorityComponents(validateAuthorityRecord(next)),
    { expectedCurrentFingerprint: digest(current) }
  );
  for (const key of CONTINUITY_KEYS) {
    assert.equal(result.nextProfile[key], current[key], `continuity field ${key}`);
  }
});

test('profileV7GenerationRolloverCandidate: generation fields derived only from next components', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const components = profileAuthorityComponents(validateAuthorityRecord(next));
  const result = profileV7GenerationRolloverCandidate(
    current, components, { expectedCurrentFingerprint: digest(current) }
  );
  const p = result.nextProfile;
  // generation-bound fields must track the NEXT authority, not the current one.
  assert.equal(p.runtimeBaseline, next.codexMemoryCommit);
  assert.equal(p.adoptedRepositoryHead, next.codexMemoryCommit);
  assert.equal(p.runtimeBuildManifestDigest, next.buildManifestDigest);
  assert.equal(p.runtimeImageConfigId, next.acceptedImageConfigId);
  assert.equal(p.runtimeImageManifestDigest, next.acceptedOciManifestDigest);
  assert.equal(p.runtimeOciArchiveSha256, next.acceptedOciArchiveSha256);
  assert.equal(p.runtimeRootfsChainDigest, next.rootfsChainDigest);
  assert.equal(p.runtimeContainerId, next.expectedRuntimeContainerId);
  assert.equal(p.hostLauncherDigest, next.hostLauncherDigest);
  assert.equal(p.nativeClosureDigest, next.nativeClosureDigest);
  assert.equal(p.vcpRuntimeBaseline, next.vcpCommit);
  // generation fields cannot be caller-injected: a tampered profile generation
  // field is not a continuity input and cannot leak into the next profile.
  const tampered = { ...current, runtimeImageConfigId: S('hax') };
  assert.throws(
    () => profileV7GenerationRolloverCandidate(
      tampered,
      profileAuthorityComponents(validateAuthorityRecord(next)),
      { expectedCurrentFingerprint: digest(current) }
    ),
    error => error?.code === 'runtime_profile_v7_generation_rollover_source_invalid'
  );
});

test('profileV7GenerationRolloverCandidate: deterministic same inputs same bytes', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const components = profileAuthorityComponents(validateAuthorityRecord(next));
  const a = profileV7GenerationRolloverCandidate(
    current, components, { expectedCurrentFingerprint: digest(current) }
  );
  const b = profileV7GenerationRolloverCandidate(
    current, components, { expectedCurrentFingerprint: digest(current) }
  );
  assert.equal(a.nextProfileBytes, b.nextProfileBytes);
  assert.equal(a.nextProfileSha256, b.nextProfileSha256);
  assert.equal(a.nextProfileFingerprint, b.nextProfileFingerprint);
});

test('profileV7GenerationRolloverCandidate: schema-6 source rejected', () => {
  const old = oldAuthority();
  const next = nextAuthority(old);
  const v6 = { ...currentProfileV7(old), schemaVersion: 6 };
  expectCode(
    () => profileV7GenerationRolloverCandidate(
      v6,
      profileAuthorityComponents(validateAuthorityRecord(next)),
      { expectedCurrentFingerprint: digest(v6) }
    ),
    'runtime_profile_v7_generation_rollover_source_invalid'
  );
});

test('profileV7GenerationRolloverCandidate: malformed source rejected', () => {
  const old = oldAuthority();
  const next = nextAuthority(old);
  const malformed = { schemaVersion: 7, runtimeBaseline: C('1') };
  expectCode(
    () => profileV7GenerationRolloverCandidate(
      malformed,
      profileAuthorityComponents(validateAuthorityRecord(next)),
      { expectedCurrentFingerprint: digest(malformed) }
    ),
    'runtime_profile_v7_generation_rollover_source_invalid'
  );
});

test('profileV7GenerationRolloverCandidate: fingerprint mismatch rejected', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  expectCode(
    () => profileV7GenerationRolloverCandidate(
      current,
      profileAuthorityComponents(validateAuthorityRecord(next)),
      { expectedCurrentFingerprint: S('deadbeef') }
    ),
    'runtime_profile_v7_generation_rollover_source_invalid'
  );
});

test('profileV7GenerationRolloverCandidate: candidate-only performs no durable write', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const result = profileV7GenerationRolloverCandidate(
    current,
    profileAuthorityComponents(validateAuthorityRecord(next)),
    { expectedCurrentFingerprint: digest(current) }
  );
  assert.equal(result.candidateOnly, true);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.nextProfileBytes.includes('\0'), false);
});

test('historical producers keep behavior: migration rejects v7, bootstrap unchanged', () => {
  const old = oldAuthority();
  const current = currentProfileV7(old);
  const next = nextAuthority(old);
  const components = profileAuthorityComponents(validateAuthorityRecord(next));
  // profileV7MigrationCandidate only accepts schemaVersion 6.
  expectCode(
    () => profileV7MigrationCandidate(
      current, components, { expectedCurrentFingerprint: digest(current) }
    ),
    'runtime_profile_v7_migration_source_invalid'
  );
  // profileV7InitialBootstrapCandidate still projects a valid v7 profile.
  const seed = seedFromProfile(current);
  const bootstrap = profileV7InitialBootstrapCandidate(seed, components);
  assert.equal(bootstrap.candidateOnly, true);
  assert.equal(bootstrap.nextProfile.schemaVersion, PROFILE_SCHEMA_VERSION);
  assert.deepEqual(
    validateImageProfile(bootstrap.nextProfile, components),
    bootstrap.nextProfile
  );
});
