'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const {
  DOCKER_CONTAINERD_MANIFEST_IDENTITY
} = require('./provider-image-authority');

const BUILD_MANIFEST_SCHEMA = 'codex-memory-runtime-build-manifest/v1';
const AUTHORITY_SCHEMA = 'codex-memory-native-runtime-authority/v3';
const EDGE_RECEIPT_SCHEMA = 'codex-memory-edge-runtime-receipt/v2';
const PROVIDER_RECEIPT_SCHEMA = 'codex-memory-provider-runtime-receipt/v2';
const STATE_MOUNT_SCHEMA = 'codex-memory-primary-state-mount/v1';
const PROFILE_AUTHORITY_COMPONENT_SCHEMA =
  'codex-memory-profile-runtime-authority-components/v3';
// Edges point from a prerequisite to the node that depends on / follows it, so
// `A: [B]` means "A precedes B". The initial bootstrap base case is derived
// from observed runtime/edge/provider/policy inputs (which precede
// authorityComponents), then produces the initial profile candidate ahead of
// the host authority. Receipts remain terminal sinks: they can never precede
// (and therefore never mint) authority.
const AUTHORITY_DEPENDENCY_GRAPH = Object.freeze({
  authorityComponents: Object.freeze(['initialProfileCandidate']),
  buildContext: Object.freeze(['runtimeImage']),
  canonicalPolicies: Object.freeze([
    'authorityComponents', 'hostAuthority', 'profileCandidate'
  ]),
  edgeBuildContext: Object.freeze(['edgeImageArtifact']),
  edgeImageArtifact: Object.freeze(['edgeObservation']),
  edgeObservation: Object.freeze([
    'authorityComponents', 'hostAuthority', 'profileCandidate'
  ]),
  hostAuthority: Object.freeze(['hostLauncherAdmission']),
  hostLauncherAdmission: Object.freeze(['edgeReceipt', 'providerReceipt', 'runtimeActivation']),
  initialProfileCandidate: Object.freeze(['hostAuthority']),
  launcherBundle: Object.freeze([
    'authorityComponents', 'hostAuthority', 'profileCandidate'
  ]),
  nativeClosure: Object.freeze(['hostAuthority']),
  profileCandidate: Object.freeze(['hostAuthority']),
  providerObservation: Object.freeze([
    'authorityComponents', 'hostAuthority', 'profileCandidate'
  ]),
  reviewedSource: Object.freeze([
    'buildContext', 'canonicalPolicies', 'edgeBuildContext', 'launcherBundle'
  ]),
  runtimeContainer: Object.freeze([
    'authorityComponents', 'hostAuthority', 'profileCandidate'
  ]),
  runtimeImage: Object.freeze(['nativeClosure', 'runtimeContainer'])
});
const PROFILE_SCHEMA_VERSION = 7;
const VCP_IMAGE_RUNTIME_AUTHORITY_SCHEMA =
  'codex-memory-vcp-image-runtime-authority/v1';
const VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION = 2;
const IMAGE_RUNTIME_ROOT = '/opt/codex-memory';
const IMAGE_VCP_ROOT = '/opt/vcptoolbox';
const IMAGE_PROFILE_KEYS = Object.freeze([
  'adoptedRepositoryHead',
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion',
  'edgeArtifactSha256',
  'edgeBindingDigest',
  'edgeBindingReference',
  'edgeBuildContextDigest',
  'edgeBuildManifestDigest',
  'edgeContainer',
  'edgeContainerId',
  'edgeDaemonImageIdentity',
  'edgeHostProjectReference',
  'edgeImageConfigDigest',
  'edgeImageStoreIdentityModel',
  'edgeLifecycleAuthority',
  'edgeLockfileSha256',
  'edgeOciManifestDigest',
  'edgeOperatorReference',
  'edgePolicyDigest',
  'edgePreviousBindingReference',
  'edgeRuntimeConfigDigest',
  'edgeSourceCommit',
  'governanceEnvironment',
  'governanceEnvironmentConfigDigest',
  'hostLauncherAuthorityVersion',
  'hostLauncherDigest',
  'nativeClosureDigest',
  'privateRoot',
  'profileAuthorityComponentSchemaVersion',
  'providerContainer',
  'providerContainerId',
  'providerDaemonImageIdentity',
  'providerImageConfigDigest',
  'providerImageStoreIdentityModel',
  'providerOciManifestDigest',
  'providerPolicyDigest',
  'providerRevision',
  'providerRuntimeConfigDigest',
  'relayEnvironment',
  'relayEnvironmentConfigDigest',
  'retainedBinding',
  'retainedBindingSource',
  'runtimeAuthorityMode',
  'runtimeBaseline',
  'runtimeBuildManifestDigest',
  'runtimeContainerId',
  'runtimeImageConfigId',
  'runtimeImageManifestDigest',
  'runtimeOciArchiveSha256',
  'runtimePolicyDigest',
  'runtimeRepository',
  'runtimeRootfsChainDigest',
  'schemaVersion',
  'stateMountContractDigest',
  'vcpProviderConfigDigest',
  'vcpRuntimeBaseline',
  'vcpRuntimeContractDigest',
  'vcpRuntimeIdentitySchemaVersion',
  'vcpRuntimeRepository',
  'vcpRuntimeScopeDigest'
]);
const INITIAL_PROFILE_SEED_KEYS = Object.freeze([
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion',
  'edgeContainer',
  'governanceEnvironment',
  'governanceEnvironmentConfigDigest',
  'privateRoot',
  'providerContainer',
  'relayEnvironment',
  'relayEnvironmentConfigDigest',
  'retainedBinding',
  'retainedBindingSource',
  'vcpProviderConfigDigest',
  'vcpRuntimeScopeDigest'
]);
const IMAGE_BUILD_MANIFEST_PATH =
  '/opt/codex-memory-runtime/runtime-build-manifest.json';
const AUTHORITY_RECORD_PATH = '/run/codex-memory/authority.json';
const EDGE_RECEIPT_PATH = '/run/codex-memory/edge-receipt.json';
const PROVIDER_RECEIPT_PATH = '/run/codex-memory/provider-receipt.json';
const VCP_PROVIDER_HOST_ENVIRONMENT_PATH = '/etc/codex-memory/vcp-provider.env';
const VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH =
  '/run/secrets/codex-memory-vcp-provider.env';
const VCP_PROVIDER_ENVIRONMENT_MAX_BYTES = 262_144;
const VCP_PROVIDER_HOST_UID = 0;
const VCP_PROVIDER_RUNTIME_UID = 1000;
const VCP_PROVIDER_RUNTIME_GID = 1000;
const VCP_PROVIDER_HOST_MODE = 0o440;
const DOCKER_SOCKET_PATH = '/var/run/docker.sock';
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const SAFE_ABSOLUTE_PATH = /^\/(?:[A-Za-z0-9._-]+\/?)+$/u;
const OPAQUE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;

class RuntimeAuthorityError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function reject(code) {
  throw new RuntimeAuthorityError(code);
}

function validateEdgeSupplyChainReferences(value) {
  const references = [value?.edgeBindingReference, value?.edgeOperatorReference,
    value?.edgeHostProjectReference, value?.edgePreviousBindingReference];
  if (!SHA256.test(value?.edgeBindingDigest || '') ||
      references.some(reference => !OPAQUE_REFERENCE.test(reference || '') ||
        /placeholder|example|todo/iu.test(reference))) {
    reject('runtime_edge_supply_chain_reference_invalid');
  }
  return true;
}

function countAuthorityGraphCycles(graph = AUTHORITY_DEPENDENCY_GRAPH) {
  const visiting = new Set();
  const visited = new Set();
  let cycles = 0;
  const visit = node => {
    if (visiting.has(node)) { cycles += 1; return; }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of graph[node] || []) visit(next);
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of Object.keys(graph)) visit(node);
  return cycles;
}

// Directed reachability over AUTHORITY_DEPENDENCY_GRAPH. Because an edge
// `A: [B]` encodes "A precedes B", a truthy result means `from` is an ordering
// prerequisite of `to`. This lets tests assert the real bootstrap ordering
// instead of only checking acyclicity.
function authorityGraphPrecedes(from, to, graph = AUTHORITY_DEPENDENCY_GRAPH) {
  const seen = new Set();
  const stack = [...(graph[from] || [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === to) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of graph[node] || []) stack.push(next);
  }
  return false;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])])
  );
}

function canonicalJson(value) {
  return `${JSON.stringify(canonical(value))}\n`;
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256')
    .update(canonicalJson(value), 'utf8').digest('hex')}`;
}

function parseVcpProviderEnvironment(content, { parse = parseEnv } = {}) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(
    typeof content === 'string' ? content : ''
  );
  if (buffer.length < 1 || buffer.length > VCP_PROVIDER_ENVIRONMENT_MAX_BYTES) {
    reject('runtime_vcp_provider_environment_invalid');
  }
  let parsed;
  try {
    parsed = parse(buffer.toString('utf8'));
  } catch {
    reject('runtime_vcp_provider_environment_invalid');
  }
  const apiKeyValue = parsed?.API_Key;
  if (typeof apiKeyValue !== 'string') {
    reject('runtime_vcp_provider_environment_invalid');
  }
  const apiKey = apiKeyValue.endsWith('\n')
    ? apiKeyValue.slice(0, -1) : apiKeyValue;
  const model = parsed?.WhitelistEmbeddingModel;
  const dimension = parsed?.VECTORDB_DIMENSION;
  if (!apiKey || apiKey.includes('\r') || apiKey.includes('\n') ||
      apiKey.trim() !== apiKey ||
      !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u.test(model || '') ||
      !/^[1-9][0-9]{0,5}$/u.test(dimension || '')) {
    reject('runtime_vcp_provider_environment_invalid');
  }
  return Object.freeze({ apiKey, model, dimension });
}

function vcpProviderConfigDigest(providerEnvironment) {
  const model = providerEnvironment?.model;
  const dimension = providerEnvironment?.dimension;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u.test(model || '') ||
      !/^[1-9][0-9]{0,5}$/u.test(dimension || '')) {
    reject('runtime_vcp_provider_environment_invalid');
  }
  return `sha256:${crypto.createHash('sha256').update(
    `model\0${model}\ndimension\0${dimension}\n`,
    'utf8'
  ).digest('hex')}`;
}

function vcpProviderEnvironmentRuntimeAccess(stat) {
  const mode = stat?.mode & 0o777;
  const permissionBits = stat?.uid === VCP_PROVIDER_RUNTIME_UID
    ? { read: 0o400, write: 0o200 }
    : stat?.gid === VCP_PROVIDER_RUNTIME_GID
      ? { read: 0o040, write: 0o020 }
      : { read: 0o004, write: 0o002 };
  return Object.freeze({
    runtimeCanRead: (mode & permissionBits.read) !== 0,
    runtimeCanWrite: (mode & permissionBits.write) !== 0
  });
}

function sha256File(file, { fsModule = fs } = {}) {
  return `sha256:${crypto.createHash('sha256')
    .update(fsModule.readFileSync(file)).digest('hex')}`;
}

function hostTrustBundleDigest({ launcherFile, authorityModuleFile,
  policyModuleFile, nativeClosureModuleFile, edgeImageAuthorityModuleFile,
  providerImageAuthorityModuleFile,
  tarArchiveModuleFile, fsModule = fs }) {
  const files = [
    { installPath: 'deploy/native-runtime/host-launcher.js', source: launcherFile },
    { installPath: 'src/runtime/native-image/runtime-authority.js', source: authorityModuleFile },
    { installPath: 'src/runtime/native-image/container-policy.js', source: policyModuleFile },
    { installPath: 'src/runtime/native-image/native-closure.js', source: nativeClosureModuleFile },
    { installPath: 'src/runtime/native-image/edge-image-authority.js',
      source: edgeImageAuthorityModuleFile },
    { installPath: 'src/runtime/native-image/provider-image-authority.js',
      source: providerImageAuthorityModuleFile },
    { installPath: 'src/runtime/native-image/tar-archive.js', source: tarArchiveModuleFile }
  ].map(entry => ({
    installPath: entry.installPath,
    sha256: sha256File(path.resolve(entry.source), { fsModule })
  }));
  return digest({
    files,
    installRoot: '/usr/local/lib/codex-memory-native-runtime',
    schemaVersion: 'codex-memory-host-trust-bundle/v1'
  });
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function assertDigest(value, code = 'runtime_authority_digest_invalid') {
  if (!SHA256.test(value || '')) reject(code);
  return value;
}

function assertCommit(value, code = 'runtime_authority_commit_invalid') {
  if (!SHA1.test(value || '')) reject(code);
  return value;
}

function assertAbsolutePath(value, code = 'runtime_authority_path_invalid') {
  if (typeof value !== 'string' || !SAFE_ABSOLUTE_PATH.test(value) ||
      path.posix.normalize(value) !== value) reject(code);
  return value;
}

function validateBuildManifest(value) {
  const keys = [
    'baseImageIndexDigest',
    'baseImagePlatformDigest',
    'buildContextFileManifestDigest',
    'buildToolVersions',
    'codexMemoryCommit',
    'codexMemoryTree',
    'fileManifest',
    'lockfileDigests',
    'nodeVersion',
    'runtimeBuildManifestVersion',
    'sourceDateEpoch',
    'vcpCommit',
    'vcpTree',
    'vexusSha256'
  ];
  if (!exactKeys(value, keys) ||
      value.runtimeBuildManifestVersion !== BUILD_MANIFEST_SCHEMA ||
      value.nodeVersion !== '22.23.1' ||
      !Number.isSafeInteger(value.sourceDateEpoch) ||
      value.sourceDateEpoch < 1 ||
      !Array.isArray(value.fileManifest) || value.fileManifest.length < 1 ||
      !exactKeys(value.lockfileDigests, ['codexMemory', 'vcp']) ||
      !exactKeys(value.buildToolVersions, ['buildx', 'docker'])) {
    reject('runtime_build_manifest_invalid');
  }
  for (const commit of [value.codexMemoryCommit, value.vcpCommit]) {
    assertCommit(commit, 'runtime_build_manifest_commit_invalid');
  }
  for (const item of [
    value.baseImageIndexDigest,
    value.baseImagePlatformDigest,
    value.buildContextFileManifestDigest,
    value.codexMemoryTree,
    value.vcpTree,
    value.vexusSha256,
    value.lockfileDigests.codexMemory,
    value.lockfileDigests.vcp
  ]) assertDigest(item, 'runtime_build_manifest_digest_invalid');
  let previous = '';
  for (const entry of value.fileManifest) {
    if (!exactKeys(entry, ['mode', 'path', 'sha256', 'size']) ||
        typeof entry.path !== 'string' || entry.path.length < 1 ||
        entry.path.startsWith('/') || entry.path.includes('..') ||
        entry.path <= previous ||
        !['100644', '100755'].includes(entry.mode) ||
        !Number.isSafeInteger(entry.size) || entry.size < 0) {
      reject('runtime_build_manifest_file_invalid');
    }
    assertDigest(entry.sha256, 'runtime_build_manifest_file_invalid');
    previous = entry.path;
  }
  const projection = { ...value, buildContextFileManifestDigest: undefined };
  delete projection.buildContextFileManifestDigest;
  const expected = digest(projection.fileManifest);
  if (expected !== value.buildContextFileManifestDigest) {
    reject('runtime_build_manifest_file_digest_mismatch');
  }
  return Object.freeze({ ...value });
}

function buildManifestDigest(value) {
  return digest(validateBuildManifest(value));
}

function validateStateMountContract(value) {
  if (!exactKeys(value, [
    'containerPath', 'readOnly', 'schemaVersion', 'stateRootClass'
  ]) || value.schemaVersion !== STATE_MOUNT_SCHEMA ||
      value.stateRootClass !== 'external_primary_r5c' ||
      value.readOnly !== true) reject('runtime_state_mount_contract_invalid');
  assertAbsolutePath(value.containerPath, 'runtime_state_mount_contract_invalid');
  return Object.freeze({ ...value });
}

function validateProviderAuthorityIdentity(value, code) {
  // Lazy import avoids making the canonical policy depend on a caller-supplied
  // authority record while keeping module initialization acyclic.
  const { PROVIDER_POLICY, PROVIDER_POLICY_DIGEST } = require('./container-policy');
  if (value.providerPolicyDigest !== PROVIDER_POLICY_DIGEST ||
      value.providerDaemonImageIdentity !== PROVIDER_POLICY.daemonImageIdentity ||
      value.providerImageConfigDigest !== PROVIDER_POLICY.imageConfigDigest ||
      value.providerImageStoreIdentityModel !== PROVIDER_POLICY.imageStoreIdentityModel ||
      value.providerOciManifestDigest !== PROVIDER_POLICY.ociManifestDigest) reject(code);
}

function validateEdgeAuthorityIdentity(value, code) {
  if (value.edgeImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.edgeDaemonImageIdentity !== value.edgeOciManifestDigest ||
      value.edgeSourceCommit !== value.edgeRevision) reject(code);
}

function validateAuthorityRecord(value) {
  const keys = [
    'acceptedImageConfigId',
    'acceptedOciArchiveSha256',
    'acceptedOciManifestDigest',
    'authoritySchemaVersion',
    'buildManifestDigest',
    'codexMemoryCommit',
    'containerConfigDigest',
    'edgePolicyDigest',
    'edgeArtifactSha256',
    'edgeBindingDigest',
    'edgeBindingReference',
    'edgeBuildContextDigest',
    'edgeBuildManifestDigest',
    'edgeConfigDigest',
    'edgeContainerId',
    'edgeDaemonImageIdentity',
    'edgeImageConfigDigest',
    'edgeImageStoreIdentityModel',
    'edgeLifecycleAuthority',
    'edgeLockfileSha256',
    'edgeHostProjectReference',
    'edgeOciManifestDigest',
    'edgeOperatorReference',
    'edgePreviousBindingReference',
    'edgeRevision',
    'edgeSourceCommit',
    'expectedRuntimeContainerId',
    'hostLauncherDigest',
    'hostLauncherVersion',
    'nativeClosureDigest',
    'profilePath',
    'profileSchemaVersion',
    'profileSha256',
    'providerContainerConfigDigest',
    'providerContainerId',
    'providerDaemonImageIdentity',
    'providerImageConfigDigest',
    'providerImageStoreIdentityModel',
    'providerOciManifestDigest',
    'providerPolicyDigest',
    'providerRevision',
    'rootfsChainDigest',
    'runtimeMountSources',
    'runtimePolicyDigest',
    'stateMountContract',
    'stateMountContractDigest',
    'vcpCommit'
  ];
  if (!exactKeys(value, keys) ||
      value.authoritySchemaVersion !== AUTHORITY_SCHEMA ||
      value.edgeLifecycleAuthority !== 'host_launcher' ||
      value.hostLauncherVersion !== 'codex-memory-native-host-launcher/v1' ||
      value.profileSchemaVersion !== 7 ||
      value.edgeImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.providerImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !CONTAINER_ID.test(value.providerContainerId || '') ||
      !CONTAINER_ID.test(value.expectedRuntimeContainerId || '')) {
    reject('runtime_authority_record_invalid');
  }
  assertCommit(value.codexMemoryCommit);
  assertCommit(value.vcpCommit);
  assertCommit(value.providerRevision);
  assertCommit(value.edgeRevision);
  assertCommit(value.edgeSourceCommit);
  for (const item of [
    value.acceptedImageConfigId,
    value.acceptedOciArchiveSha256,
    value.acceptedOciManifestDigest,
    value.buildManifestDigest,
    value.containerConfigDigest,
    value.edgeArtifactSha256,
    value.edgeBindingDigest,
    value.edgeBuildContextDigest,
    value.edgeBuildManifestDigest,
    value.edgeConfigDigest,
    value.edgeDaemonImageIdentity,
    value.edgeImageConfigDigest,
    value.edgeLockfileSha256,
    value.edgeOciManifestDigest,
    value.edgePolicyDigest,
    value.hostLauncherDigest,
    value.nativeClosureDigest,
    value.profileSha256,
    value.providerContainerConfigDigest,
    value.providerDaemonImageIdentity,
    value.providerImageConfigDigest,
    value.providerOciManifestDigest,
    value.providerPolicyDigest,
    value.rootfsChainDigest,
    value.runtimePolicyDigest,
    value.stateMountContractDigest
  ]) assertDigest(item);
  validateEdgeAuthorityIdentity(value, 'runtime_authority_edge_identity_invalid');
  validateEdgeSupplyChainReferences(value);
  validateProviderAuthorityIdentity(value, 'runtime_authority_provider_identity_invalid');
  assertAbsolutePath(value.profilePath);
  const mountKeys = [
    'authority', 'edgeReceipt', 'primaryState', 'profile',
    'providerEnvironment', 'providerReceipt', 'runtimeDirectory'
  ];
  if (!exactKeys(value.runtimeMountSources, mountKeys)) {
    reject('runtime_authority_mount_sources_invalid');
  }
  for (const source of Object.values(value.runtimeMountSources)) {
    assertAbsolutePath(source, 'runtime_authority_mount_sources_invalid');
  }
  if (value.runtimeMountSources.profile !== value.profilePath) {
    reject('runtime_authority_profile_path_mismatch');
  }
  if (value.runtimeMountSources.providerEnvironment !==
      VCP_PROVIDER_HOST_ENVIRONMENT_PATH) {
    reject('runtime_authority_provider_environment_path_mismatch');
  }
  const state = validateStateMountContract(value.stateMountContract);
  if (digest(state) !== value.stateMountContractDigest) {
    reject('runtime_state_mount_contract_digest_mismatch');
  }
  return Object.freeze({ ...value, stateMountContract: state });
}

function authorityRecordDigest(value) {
  return digest(validateAuthorityRecord(value));
}

function validateProfileAuthorityComponents(value) {
  const keys = [
    'acceptedImageConfigId', 'acceptedOciArchiveSha256',
    'acceptedOciManifestDigest', 'buildManifestDigest', 'codexMemoryCommit',
    'edgeConfigDigest', 'edgeContainerId', 'edgeLifecycleAuthority',
    'edgeArtifactSha256', 'edgeBuildContextDigest', 'edgeBuildManifestDigest',
    'edgeBindingDigest', 'edgeBindingReference',
    'edgeDaemonImageIdentity', 'edgeImageConfigDigest', 'edgeImageStoreIdentityModel',
    'edgeHostProjectReference', 'edgeLockfileSha256', 'edgeOciManifestDigest',
    'edgeOperatorReference', 'edgePolicyDigest', 'edgePreviousBindingReference',
    'edgeRevision', 'edgeSourceCommit', 'expectedRuntimeContainerId',
    'hostLauncherDigest', 'hostLauncherVersion', 'nativeClosureDigest',
    'profileAuthorityComponentSchemaVersion', 'providerContainerConfigDigest',
    'providerContainerId', 'providerDaemonImageIdentity',
    'providerImageConfigDigest', 'providerImageStoreIdentityModel',
    'providerOciManifestDigest', 'providerPolicyDigest',
    'providerRevision', 'rootfsChainDigest', 'runtimePolicyDigest',
    'stateMountContractDigest', 'vcpCommit'
  ];
  if (!exactKeys(value, keys) ||
      value.profileAuthorityComponentSchemaVersion !== PROFILE_AUTHORITY_COMPONENT_SCHEMA ||
      value.edgeImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.providerImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.edgeLifecycleAuthority !== 'host_launcher' ||
      value.hostLauncherVersion !== 'codex-memory-native-host-launcher/v1' ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !CONTAINER_ID.test(value.providerContainerId || '') ||
      !CONTAINER_ID.test(value.expectedRuntimeContainerId || '')) {
    reject('runtime_profile_authority_components_invalid');
  }
  for (const commit of [value.codexMemoryCommit, value.edgeRevision, value.edgeSourceCommit,
    value.providerRevision, value.vcpCommit]) assertCommit(
    commit, 'runtime_profile_authority_components_invalid'
  );
  for (const item of [
    value.acceptedImageConfigId, value.acceptedOciArchiveSha256,
    value.acceptedOciManifestDigest, value.buildManifestDigest,
    value.edgeArtifactSha256, value.edgeBuildContextDigest,
    value.edgeBindingDigest,
    value.edgeBuildManifestDigest, value.edgeConfigDigest,
    value.edgeDaemonImageIdentity, value.edgeImageConfigDigest,
    value.edgeLockfileSha256, value.edgeOciManifestDigest,
    value.edgePolicyDigest, value.hostLauncherDigest,
    value.nativeClosureDigest, value.providerContainerConfigDigest,
    value.providerDaemonImageIdentity, value.providerImageConfigDigest,
    value.providerOciManifestDigest, value.providerPolicyDigest,
    value.rootfsChainDigest, value.runtimePolicyDigest,
    value.stateMountContractDigest
  ]) assertDigest(item, 'runtime_profile_authority_components_invalid');
  validateEdgeAuthorityIdentity(value, 'runtime_profile_authority_components_invalid');
  validateEdgeSupplyChainReferences(value);
  validateProviderAuthorityIdentity(value, 'runtime_profile_authority_components_invalid');
  return Object.freeze({ ...value });
}

function vcpImageRuntimeAuthorityDigest(value) {
  const authority = validateProfileAuthorityComponents(value);
  return digest({
    buildManifestDigest: authority.buildManifestDigest,
    runtimeOciArchiveSha256: authority.acceptedOciArchiveSha256,
    runtimeOciManifestDigest: authority.acceptedOciManifestDigest,
    runtimeRootfsChainDigest: authority.rootfsChainDigest,
    schemaVersion: VCP_IMAGE_RUNTIME_AUTHORITY_SCHEMA,
    vcpCommit: authority.vcpCommit
  });
}

function validateImageProfileReference(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') ||
      path.isAbsolute(value) || path.normalize(value) !== value ||
      value === '..' || value.startsWith(`..${path.sep}`)) {
    reject('runtime_image_profile_invalid');
  }
  return value;
}

function validateImageProfile(value, expectedAuthorityComponents) {
  const digestFields = [
    'controllerSourceManifestDigest',
    'edgeArtifactSha256',
    'edgeBindingDigest',
    'edgeBuildContextDigest',
    'edgeBuildManifestDigest',
    'edgeDaemonImageIdentity',
    'edgeImageConfigDigest',
    'edgeLockfileSha256',
    'edgeOciManifestDigest',
    'edgePolicyDigest',
    'edgeRuntimeConfigDigest',
    'governanceEnvironmentConfigDigest',
    'hostLauncherDigest',
    'nativeClosureDigest',
    'providerDaemonImageIdentity',
    'providerImageConfigDigest',
    'providerOciManifestDigest',
    'providerPolicyDigest',
    'providerRuntimeConfigDigest',
    'relayEnvironmentConfigDigest',
    'runtimeBuildManifestDigest',
    'runtimeImageConfigId',
    'runtimeImageManifestDigest',
    'runtimeOciArchiveSha256',
    'runtimePolicyDigest',
    'runtimeRootfsChainDigest',
    'stateMountContractDigest',
    'vcpProviderConfigDigest',
    'vcpRuntimeContractDigest',
    'vcpRuntimeScopeDigest'
  ];
  const commitFields = [
    'adoptedRepositoryHead', 'edgeSourceCommit', 'providerRevision',
    'retainedBindingSource', 'runtimeBaseline', 'vcpRuntimeBaseline'
  ];
  const containerFields = [
    'edgeContainerId', 'providerContainerId', 'runtimeContainerId'
  ];
  const references = [
    value?.edgeBindingReference, value?.edgeHostProjectReference,
    value?.edgeOperatorReference, value?.edgePreviousBindingReference
  ];
  if (!exactKeys(value, IMAGE_PROFILE_KEYS) ||
      value.schemaVersion !== PROFILE_SCHEMA_VERSION ||
      value.runtimeAuthorityMode !== 'digest_pinned_read_only_image' ||
      value.runtimeRepository !== IMAGE_RUNTIME_ROOT ||
      value.vcpRuntimeRepository !== IMAGE_VCP_ROOT ||
      value.profileAuthorityComponentSchemaVersion !==
        PROFILE_AUTHORITY_COMPONENT_SCHEMA ||
      value.edgeLifecycleAuthority !== 'host_launcher' ||
      value.hostLauncherAuthorityVersion !==
        'codex-memory-native-host-launcher/v1' ||
      value.edgeImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.providerImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.providerContainer !== 'new-api-wsl' ||
      value.controllerSourceManifestVersion !== 1 ||
      value.vcpRuntimeIdentitySchemaVersion !==
        VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION ||
      !SAFE_NAME.test(value.edgeContainer || '') ||
      typeof value.privateRoot !== 'string' ||
      !path.isAbsolute(value.privateRoot) ||
      path.resolve(value.privateRoot) !== value.privateRoot ||
      value.runtimeBaseline !== value.adoptedRepositoryHead ||
      value.edgeDaemonImageIdentity !== value.edgeOciManifestDigest ||
      value.providerDaemonImageIdentity !== value.providerOciManifestDigest ||
      commitFields.some(field => !SHA1.test(value[field] || '')) ||
      containerFields.some(field => !CONTAINER_ID.test(value[field] || '')) ||
      digestFields.some(field => !SHA256.test(value[field] || '')) ||
      references.some(reference => !OPAQUE_REFERENCE.test(reference || '') ||
        /placeholder|example|todo/iu.test(reference))) {
    reject('runtime_image_profile_invalid');
  }
  validateImageProfileReference(value.governanceEnvironment);
  validateImageProfileReference(value.relayEnvironment);
  validateImageProfileReference(value.retainedBinding);
  const stateMountContract = validateStateMountContract({
    containerPath: value.privateRoot,
    readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c'
  });
  if (value.stateMountContractDigest !== digest(stateMountContract)) {
    reject('runtime_image_profile_state_mount_mismatch');
  }
  if (expectedAuthorityComponents !== undefined) {
    const authority = validateProfileAuthorityComponents(expectedAuthorityComponents);
    if (value.vcpRuntimeContractDigest !==
        vcpImageRuntimeAuthorityDigest(authority)) {
      reject('runtime_image_profile_vcp_image_authority_mismatch');
    }
    const bindings = {
      adoptedRepositoryHead: authority.codexMemoryCommit,
      edgeArtifactSha256: authority.edgeArtifactSha256,
      edgeBindingDigest: authority.edgeBindingDigest,
      edgeBindingReference: authority.edgeBindingReference,
      edgeBuildContextDigest: authority.edgeBuildContextDigest,
      edgeBuildManifestDigest: authority.edgeBuildManifestDigest,
      edgeContainerId: authority.edgeContainerId,
      edgeDaemonImageIdentity: authority.edgeDaemonImageIdentity,
      edgeHostProjectReference: authority.edgeHostProjectReference,
      edgeImageConfigDigest: authority.edgeImageConfigDigest,
      edgeImageStoreIdentityModel: authority.edgeImageStoreIdentityModel,
      edgeLifecycleAuthority: authority.edgeLifecycleAuthority,
      edgeLockfileSha256: authority.edgeLockfileSha256,
      edgeOciManifestDigest: authority.edgeOciManifestDigest,
      edgeOperatorReference: authority.edgeOperatorReference,
      edgePolicyDigest: authority.edgePolicyDigest,
      edgePreviousBindingReference: authority.edgePreviousBindingReference,
      edgeRuntimeConfigDigest: authority.edgeConfigDigest,
      edgeSourceCommit: authority.edgeSourceCommit,
      hostLauncherAuthorityVersion: authority.hostLauncherVersion,
      hostLauncherDigest: authority.hostLauncherDigest,
      nativeClosureDigest: authority.nativeClosureDigest,
      profileAuthorityComponentSchemaVersion:
        authority.profileAuthorityComponentSchemaVersion,
      providerContainerId: authority.providerContainerId,
      providerDaemonImageIdentity: authority.providerDaemonImageIdentity,
      providerImageConfigDigest: authority.providerImageConfigDigest,
      providerImageStoreIdentityModel: authority.providerImageStoreIdentityModel,
      providerOciManifestDigest: authority.providerOciManifestDigest,
      providerPolicyDigest: authority.providerPolicyDigest,
      providerRevision: authority.providerRevision,
      providerRuntimeConfigDigest: authority.providerContainerConfigDigest,
      runtimeBaseline: authority.codexMemoryCommit,
      runtimeBuildManifestDigest: authority.buildManifestDigest,
      runtimeContainerId: authority.expectedRuntimeContainerId,
      runtimeImageConfigId: authority.acceptedImageConfigId,
      runtimeImageManifestDigest: authority.acceptedOciManifestDigest,
      runtimeOciArchiveSha256: authority.acceptedOciArchiveSha256,
      runtimePolicyDigest: authority.runtimePolicyDigest,
      runtimeRootfsChainDigest: authority.rootfsChainDigest,
      stateMountContractDigest: authority.stateMountContractDigest,
      vcpRuntimeBaseline: authority.vcpCommit
    };
    if (Object.entries(bindings).some(([field, expected]) => value[field] !== expected)) {
      reject('runtime_image_profile_authority_mismatch');
    }
  }
  return Object.freeze({ ...value });
}

function profileAuthorityComponents(authority) {
  const value = validateAuthorityRecord(authority);
  return validateProfileAuthorityComponents({
    acceptedImageConfigId: value.acceptedImageConfigId,
    acceptedOciArchiveSha256: value.acceptedOciArchiveSha256,
    acceptedOciManifestDigest: value.acceptedOciManifestDigest,
    buildManifestDigest: value.buildManifestDigest,
    codexMemoryCommit: value.codexMemoryCommit,
    edgeConfigDigest: value.edgeConfigDigest,
    edgeContainerId: value.edgeContainerId,
    edgeArtifactSha256: value.edgeArtifactSha256,
    edgeBindingDigest: value.edgeBindingDigest,
    edgeBindingReference: value.edgeBindingReference,
    edgeBuildContextDigest: value.edgeBuildContextDigest,
    edgeBuildManifestDigest: value.edgeBuildManifestDigest,
    edgeDaemonImageIdentity: value.edgeDaemonImageIdentity,
    edgeImageConfigDigest: value.edgeImageConfigDigest,
    edgeImageStoreIdentityModel: value.edgeImageStoreIdentityModel,
    edgeHostProjectReference: value.edgeHostProjectReference,
    edgeLifecycleAuthority: value.edgeLifecycleAuthority,
    edgeLockfileSha256: value.edgeLockfileSha256,
    edgeOciManifestDigest: value.edgeOciManifestDigest,
    edgeOperatorReference: value.edgeOperatorReference,
    edgePolicyDigest: value.edgePolicyDigest,
    edgePreviousBindingReference: value.edgePreviousBindingReference,
    edgeRevision: value.edgeRevision,
    edgeSourceCommit: value.edgeSourceCommit,
    expectedRuntimeContainerId: value.expectedRuntimeContainerId,
    hostLauncherDigest: value.hostLauncherDigest,
    hostLauncherVersion: value.hostLauncherVersion,
    nativeClosureDigest: value.nativeClosureDigest,
    profileAuthorityComponentSchemaVersion: PROFILE_AUTHORITY_COMPONENT_SCHEMA,
    providerContainerConfigDigest: value.providerContainerConfigDigest,
    providerContainerId: value.providerContainerId,
    providerDaemonImageIdentity: value.providerDaemonImageIdentity,
    providerImageConfigDigest: value.providerImageConfigDigest,
    providerImageStoreIdentityModel: value.providerImageStoreIdentityModel,
    providerOciManifestDigest: value.providerOciManifestDigest,
    providerPolicyDigest: value.providerPolicyDigest,
    providerRevision: value.providerRevision,
    rootfsChainDigest: value.rootfsChainDigest,
    runtimePolicyDigest: value.runtimePolicyDigest,
    stateMountContractDigest: value.stateMountContractDigest,
    vcpCommit: value.vcpCommit
  });
}

function validateInitialProfileSeed(value) {
  if (!exactKeys(value, INITIAL_PROFILE_SEED_KEYS) ||
      value.controllerSourceManifestVersion !== 1 ||
      typeof value.edgeContainer !== 'string' ||
      typeof value.providerContainer !== 'string' ||
      value.providerContainer !== 'new-api-wsl' ||
      !SHA256.test(value.controllerSourceManifestDigest || '') ||
      !SHA256.test(value.governanceEnvironmentConfigDigest || '') ||
      !SHA256.test(value.relayEnvironmentConfigDigest || '') ||
      !SHA256.test(value.vcpProviderConfigDigest || '') ||
      !SHA256.test(value.vcpRuntimeScopeDigest || '') ||
      !SHA1.test(value.retainedBindingSource || '') ||
      typeof value.privateRoot !== 'string' || !path.isAbsolute(value.privateRoot) ||
      path.resolve(value.privateRoot) !== value.privateRoot) {
    reject('runtime_initial_profile_seed_invalid');
  }
  validateImageProfileReference(value.governanceEnvironment);
  validateImageProfileReference(value.relayEnvironment);
  validateImageProfileReference(value.retainedBinding);
  if (!SAFE_NAME.test(value.edgeContainer)) reject('runtime_initial_profile_seed_invalid');
  return Object.freeze({ ...value });
}

function imageProfileFromAuthoritySeed(seed, imageAuthority) {
  const authority = validateProfileAuthorityComponents(imageAuthority);
  const initial = validateInitialProfileSeed(seed);
  const stateMountContract = {
    containerPath: initial.privateRoot,
    readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c'
  };
  if (digest(stateMountContract) !== authority.stateMountContractDigest) {
    reject('runtime_image_profile_state_mount_mismatch');
  }
  return validateImageProfile({
    ...initial,
    adoptedRepositoryHead: authority.codexMemoryCommit,
    edgeArtifactSha256: authority.edgeArtifactSha256,
    edgeBindingDigest: authority.edgeBindingDigest,
    edgeBindingReference: authority.edgeBindingReference,
    edgeBuildContextDigest: authority.edgeBuildContextDigest,
    edgeBuildManifestDigest: authority.edgeBuildManifestDigest,
    edgeContainerId: authority.edgeContainerId,
    edgeDaemonImageIdentity: authority.edgeDaemonImageIdentity,
    edgeHostProjectReference: authority.edgeHostProjectReference,
    edgeImageConfigDigest: authority.edgeImageConfigDigest,
    edgeImageStoreIdentityModel: authority.edgeImageStoreIdentityModel,
    edgeLifecycleAuthority: authority.edgeLifecycleAuthority,
    edgeLockfileSha256: authority.edgeLockfileSha256,
    edgeOciManifestDigest: authority.edgeOciManifestDigest,
    edgeOperatorReference: authority.edgeOperatorReference,
    edgePolicyDigest: authority.edgePolicyDigest,
    edgePreviousBindingReference: authority.edgePreviousBindingReference,
    edgeRuntimeConfigDigest: authority.edgeConfigDigest,
    edgeSourceCommit: authority.edgeSourceCommit,
    hostLauncherAuthorityVersion: authority.hostLauncherVersion,
    hostLauncherDigest: authority.hostLauncherDigest,
    nativeClosureDigest: authority.nativeClosureDigest,
    profileAuthorityComponentSchemaVersion:
      authority.profileAuthorityComponentSchemaVersion,
    providerContainerId: authority.providerContainerId,
    providerDaemonImageIdentity: authority.providerDaemonImageIdentity,
    providerImageConfigDigest: authority.providerImageConfigDigest,
    providerImageStoreIdentityModel: authority.providerImageStoreIdentityModel,
    providerOciManifestDigest: authority.providerOciManifestDigest,
    providerPolicyDigest: authority.providerPolicyDigest,
    providerRevision: authority.providerRevision,
    providerRuntimeConfigDigest: authority.providerContainerConfigDigest,
    retainedBinding: initial.retainedBinding,
    runtimeAuthorityMode: 'digest_pinned_read_only_image',
    runtimeBaseline: authority.codexMemoryCommit,
    runtimeBuildManifestDigest: authority.buildManifestDigest,
    runtimeContainerId: authority.expectedRuntimeContainerId,
    runtimeImageConfigId: authority.acceptedImageConfigId,
    runtimeImageManifestDigest: authority.acceptedOciManifestDigest,
    runtimeOciArchiveSha256: authority.acceptedOciArchiveSha256,
    runtimePolicyDigest: authority.runtimePolicyDigest,
    runtimeRepository: IMAGE_RUNTIME_ROOT,
    runtimeRootfsChainDigest: authority.rootfsChainDigest,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    stateMountContractDigest: digest(stateMountContract),
    vcpRuntimeBaseline: authority.vcpCommit,
    vcpRuntimeContractDigest: vcpImageRuntimeAuthorityDigest(authority),
    vcpRuntimeIdentitySchemaVersion: VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION,
    vcpRuntimeRepository: IMAGE_VCP_ROOT
  }, authority);
}

function profileV7InitialBootstrapCandidate(seed, imageAuthority) {
  const nextProfile = imageProfileFromAuthoritySeed(seed, imageAuthority);
  const nextProfileBytes = canonicalJson(nextProfile);
  return Object.freeze({
    candidateOnly: true,
    nextProfile,
    nextProfileBytes,
    nextProfileFingerprint: digest(nextProfile),
    nextProfileSha256: sha256Buffer(Buffer.from(nextProfileBytes)),
    durableMutationPerformed: false
  });
}

function validateEdgeReceipt(value, authority, {
  now = Date.now(),
  maximumAgeMs = 60_000,
  bootId
} = {}) {
  const keys = [
    'edgeConfigDigest',
    'edgeContainerId',
    'edgeArtifactSha256',
    'edgeBuildContextDigest',
    'edgeDaemonImageIdentity',
    'edgeHealth',
    'edgeImageConfigDigest',
    'edgeImageStoreIdentityModel',
    'edgeOciManifestDigest',
    'edgeRevision',
    'launchEpoch',
    'launcherAuthorityDigest',
    'observedAt',
    'schemaVersion'
  ];
  if (!exactKeys(value, keys) || value.schemaVersion !== EDGE_RECEIPT_SCHEMA ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !SHA1.test(value.edgeRevision || '') ||
      value.edgeImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      value.edgeHealth !== 'healthy' ||
      typeof value.launchEpoch !== 'string' || value.launchEpoch.length < 16 ||
      !Number.isSafeInteger(value.observedAt) ||
      value.observedAt > now || now - value.observedAt > maximumAgeMs) {
    reject('runtime_edge_receipt_invalid');
  }
  for (const item of [
    value.edgeConfigDigest,
    value.edgeArtifactSha256,
    value.edgeBuildContextDigest,
    value.edgeDaemonImageIdentity,
    value.edgeImageConfigDigest,
    value.edgeOciManifestDigest,
    value.launcherAuthorityDigest
  ]) assertDigest(item, 'runtime_edge_receipt_invalid');
  const accepted = validateAuthorityRecord(authority);
  if (value.launcherAuthorityDigest !== authorityRecordDigest(accepted)) {
    reject('runtime_edge_receipt_launcher_mismatch');
  }
  if (value.edgeContainerId !== accepted.edgeContainerId ||
      value.edgeArtifactSha256 !== accepted.edgeArtifactSha256 ||
      value.edgeBuildContextDigest !== accepted.edgeBuildContextDigest ||
      value.edgeDaemonImageIdentity !== accepted.edgeDaemonImageIdentity ||
      value.edgeImageConfigDigest !== accepted.edgeImageConfigDigest ||
      value.edgeImageStoreIdentityModel !== accepted.edgeImageStoreIdentityModel ||
      value.edgeOciManifestDigest !== accepted.edgeOciManifestDigest ||
      value.edgeRevision !== accepted.edgeRevision ||
      value.edgeConfigDigest !== accepted.edgeConfigDigest) {
    reject('runtime_edge_receipt_identity_mismatch');
  }
  if (bootId !== undefined && value.launchEpoch !== bootId) {
    reject('runtime_edge_receipt_stale');
  }
  return Object.freeze({ ...value });
}

function validateProviderReceipt(value, authority, {
  now = Date.now(), maximumAgeMs = 60_000, bootId
} = {}) {
  const keys = [
    'launchEpoch', 'launcherAuthorityDigest', 'observedAt',
    'providerContainerConfigDigest', 'providerContainerId',
    'providerDaemonImageIdentity', 'providerHealth', 'providerImageConfigDigest',
    'providerImageStoreIdentityModel', 'providerOciManifestDigest',
    'providerRevision', 'schemaVersion'
  ];
  if (!exactKeys(value, keys) || value.schemaVersion !== PROVIDER_RECEIPT_SCHEMA ||
      value.providerHealth !== 'healthy' ||
      value.providerImageStoreIdentityModel !== DOCKER_CONTAINERD_MANIFEST_IDENTITY ||
      !CONTAINER_ID.test(value.providerContainerId || '') ||
      !Number.isSafeInteger(value.observedAt) || value.observedAt > now ||
      now - value.observedAt > maximumAgeMs ||
      typeof value.launchEpoch !== 'string' || value.launchEpoch.length < 16) {
    reject('runtime_provider_receipt_invalid');
  }
  assertCommit(value.providerRevision, 'runtime_provider_receipt_invalid');
  for (const item of [value.launcherAuthorityDigest,
    value.providerContainerConfigDigest, value.providerDaemonImageIdentity,
    value.providerImageConfigDigest, value.providerOciManifestDigest]) {
    assertDigest(item, 'runtime_provider_receipt_invalid');
  }
  const accepted = validateAuthorityRecord(authority);
  if (value.launcherAuthorityDigest !== authorityRecordDigest(accepted) ||
      value.providerContainerId !== accepted.providerContainerId ||
      value.providerDaemonImageIdentity !== accepted.providerDaemonImageIdentity ||
      value.providerImageConfigDigest !== accepted.providerImageConfigDigest ||
      value.providerImageStoreIdentityModel !== accepted.providerImageStoreIdentityModel ||
      value.providerOciManifestDigest !== accepted.providerOciManifestDigest ||
      value.providerContainerConfigDigest !== accepted.providerContainerConfigDigest ||
      value.providerRevision !== accepted.providerRevision) {
    reject('runtime_provider_receipt_identity_mismatch');
  }
  if (bootId !== undefined && value.launchEpoch !== bootId) {
    reject('runtime_provider_receipt_stale');
  }
  return Object.freeze({ ...value });
}

function normalizeMount(mount) {
  return Object.freeze({
    destination: mount?.Destination || '',
    name: mount?.Name || '',
    propagation: mount?.Propagation || '',
    rw: mount?.RW === true,
    source: mount?.Source || '',
    type: mount?.Type || ''
  });
}

function projectContainerConfig(inspect) {
  const host = inspect?.HostConfig || {};
  const config = inspect?.Config || {};
  const mounts = (inspect?.Mounts || []).map(normalizeMount)
    .sort((a, b) => a.destination.localeCompare(b.destination));
  const supplementaryGroups = host.GroupAdd;
  const projectedSupplementaryGroups = supplementaryGroups == null ||
    (Array.isArray(supplementaryGroups) && supplementaryGroups.length === 0)
    ? {} : { supplementaryGroups: Array.isArray(supplementaryGroups)
      ? [...supplementaryGroups].sort() : supplementaryGroups };
  return Object.freeze({
    capabilitiesAdd: [...(host.CapAdd || [])].sort(),
    capabilitiesDrop: [...(host.CapDrop || [])].sort(),
    cgroupnsMode: host.CgroupnsMode || '',
    command: config.Cmd || [],
    devices: [...(host.Devices || [])],
    deviceRequests: [...(host.DeviceRequests || [])],
    entrypoint: config.Entrypoint || [],
    environment: [...(config.Env || [])].sort(),
    healthcheck: config.Healthcheck || null,
    image: inspect?.Image || '',
    ipcMode: host.IpcMode || '',
    logConfig: host.LogConfig || {},
    labels: config.Labels || {},
    mounts,
    networkMode: host.NetworkMode || '',
    pidMode: host.PidMode || '',
    portBindings: host.PortBindings || {},
    privileged: host.Privileged === true,
    readOnlyRootfs: host.ReadonlyRootfs === true,
    restartPolicy: host.RestartPolicy?.Name || '',
    securityOpt: [...(host.SecurityOpt || [])].sort(),
    ...projectedSupplementaryGroups,
    tmpfs: host.Tmpfs || {},
    usernsMode: host.UsernsMode || '',
    utsMode: host.UTSMode || '',
    user: config.User || '',
    workingDirectory: config.WorkingDir || ''
  });
}

function containerConfigDigest(inspect) {
  return digest(projectContainerConfig(inspect));
}

function validateContainerInspection(inspect, authority, {
  allowedEnvironmentNames = [],
  expectedStateSource
} = {}) {
  const accepted = validateAuthorityRecord(authority);
  if (!CONTAINER_ID.test(inspect?.Id || '') ||
      inspect.Id !== accepted.expectedRuntimeContainerId ||
      inspect.Image !== accepted.acceptedImageConfigId) {
    reject('runtime_container_identity_mismatch');
  }
  const projected = projectContainerConfig(inspect);
  if (containerConfigDigest(inspect) !== accepted.containerConfigDigest) {
    reject('runtime_container_config_mismatch');
  }
  if (!['1000:1000', '1000'].includes(projected.user) ||
      projected.readOnlyRootfs !== true || projected.privileged ||
      projected.pidMode || !['', 'private'].includes(projected.ipcMode) ||
      projected.networkMode !== 'host' ||
      projected.restartPolicy !== 'no' ||
      projected.capabilitiesAdd.length !== 0 ||
      !projected.capabilitiesDrop.includes('ALL') ||
      !projected.securityOpt.includes('no-new-privileges:true')) {
    reject('runtime_container_security_contract_mismatch');
  }
  const allowedEnv = new Set(allowedEnvironmentNames);
  for (const entry of projected.environment) {
    const name = String(entry).split('=', 1)[0];
    if (!allowedEnv.has(name)) reject('runtime_container_environment_unapproved');
  }
  for (const mount of projected.mounts) {
    if (mount.source === DOCKER_SOCKET_PATH ||
        mount.destination === DOCKER_SOCKET_PATH) {
      reject('runtime_container_docker_socket_forbidden');
    }
    if ([IMAGE_RUNTIME_ROOT, IMAGE_VCP_ROOT].some(root =>
      mount.destination === root || mount.destination.startsWith(`${root}/`)
    )) reject('runtime_container_code_mount_forbidden');
  }
  const state = projected.mounts.find(mount =>
    mount.destination === accepted.stateMountContract.containerPath
  );
  if (!state || state.rw || state.type !== 'bind' ||
      (expectedStateSource && state.source !== expectedStateSource)) {
    reject('runtime_container_state_mount_mismatch');
  }
  for (const required of [AUTHORITY_RECORD_PATH, EDGE_RECEIPT_PATH,
    PROVIDER_RECEIPT_PATH]) {
    const mount = projected.mounts.find(item => item.destination === required);
    if (!mount || mount.rw || mount.type !== 'bind') {
      reject('runtime_container_receipt_mount_mismatch');
    }
  }
  return Object.freeze({ accepted: true, projected });
}

function validateImageInspection(image, authority, buildManifest) {
  const accepted = validateAuthorityRecord(authority);
  const manifest = validateBuildManifest(buildManifest);
  if (image?.Id !== accepted.acceptedImageConfigId ||
      buildManifestDigest(manifest) !== accepted.buildManifestDigest ||
      manifest.codexMemoryCommit !== accepted.codexMemoryCommit ||
      manifest.vcpCommit !== accepted.vcpCommit) {
    reject('runtime_image_identity_mismatch');
  }
  const diffIds = image?.RootFS?.Layers;
  if (!Array.isArray(diffIds) || diffIds.length < 1 ||
      digest(diffIds) !== accepted.rootfsChainDigest) {
    reject('runtime_image_rootfs_mismatch');
  }
  return Object.freeze({ accepted: true, manifest });
}

function readBoundedJson(file, {
  fsModule = fs,
  maximumBytes = 262_144,
  requireRootOwner = false,
  requireRootOwnedParent = false
} = {}) {
  let descriptor;
  if (requireRootOwnedParent) {
    let parent;
    try {
      parent = fsModule.lstatSync(path.dirname(file));
    } catch {
      reject('runtime_authority_file_unavailable');
    }
    if (!parent.isDirectory() || parent.isSymbolicLink() ||
        parent.uid !== 0 || (parent.mode & 0o022) !== 0) {
      reject('runtime_authority_parent_insecure');
    }
  }
  try {
    descriptor = fsModule.openSync(
      file,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
    );
  } catch {
    reject('runtime_authority_file_unavailable');
  }
  try {
    const stat = fsModule.fstatSync(descriptor);
    if (!stat.isFile() || stat.size < 2 || stat.size > maximumBytes ||
        (stat.mode & 0o022) !== 0 || (requireRootOwner && stat.uid !== 0)) {
      reject('runtime_authority_file_insecure');
    }
    try {
      return JSON.parse(fsModule.readFileSync(descriptor, 'utf8'));
    } catch {
      reject('runtime_authority_file_invalid');
    }
  } finally {
    fsModule.closeSync(descriptor);
  }
}

function readBoundedBuffer(file, {
  fsModule = fs, maximumBytes = 262_144,
  requireRootOwner = false, requireRootOwnedParent = false
} = {}) {
  let descriptor;
  if (requireRootOwnedParent) {
    const parent = fsModule.lstatSync(path.dirname(file));
    if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== 0 ||
        (parent.mode & 0o022) !== 0) reject('runtime_authority_parent_insecure');
  }
  try {
    descriptor = fsModule.openSync(file,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const before = fsModule.fstatSync(descriptor);
    if (!before.isFile() || before.size < 2 || before.size > maximumBytes ||
        (before.mode & 0o022) !== 0 || (requireRootOwner && before.uid !== 0)) {
      reject('runtime_authority_file_insecure');
    }
    const content = fsModule.readFileSync(descriptor);
    const after = fsModule.fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      reject('runtime_authority_file_changed');
    }
    return content;
  } catch (error) {
    if (error instanceof RuntimeAuthorityError) throw error;
    reject('runtime_authority_file_unavailable');
  } finally {
    if (descriptor !== undefined) fsModule.closeSync(descriptor);
  }
}

function validateRuntimeSelfEvidence({ authority, buildManifest, edgeReceipt,
  providerReceipt, profileBytes, nativeClosure,
  runtimeRoot = process.cwd(), vcpRoot, dockerSocketExists = fs.existsSync }) {
  const accepted = validateAuthorityRecord(authority);
  const manifest = validateBuildManifest(buildManifest);
  validateEdgeReceipt(edgeReceipt, accepted);
  validateProviderReceipt(providerReceipt, accepted);
  const { nativeClosureDigest, validateNativeClosure } = require('./native-closure');
  const closure = validateNativeClosure(nativeClosure);
  try {
    validateImageProfile(
      JSON.parse(profileBytes.toString('utf8')),
      profileAuthorityComponents(accepted)
    );
  } catch {
    reject('runtime_self_evidence_mismatch');
  }
  if (path.resolve(runtimeRoot) !== IMAGE_RUNTIME_ROOT ||
      path.resolve(vcpRoot || '') !== IMAGE_VCP_ROOT ||
      dockerSocketExists(DOCKER_SOCKET_PATH) ||
      manifest.codexMemoryCommit !== accepted.codexMemoryCommit ||
      manifest.vcpCommit !== accepted.vcpCommit ||
      sha256Buffer(profileBytes) !== accepted.profileSha256 ||
      nativeClosureDigest(closure) !== accepted.nativeClosureDigest ||
      buildManifestDigest(manifest) !== accepted.buildManifestDigest) {
    reject('runtime_self_evidence_mismatch');
  }
  return Object.freeze({
    accepted: true,
    authorityDigest: authorityRecordDigest(accepted),
    buildManifestDigest: accepted.buildManifestDigest,
    codexMemoryCommit: manifest.codexMemoryCommit,
    edgeLifecycleAuthority: accepted.edgeLifecycleAuthority,
    runtimeBuildManifestVersion: manifest.runtimeBuildManifestVersion,
    stateMountContractDigest: accepted.stateMountContractDigest,
    vcpCommit: manifest.vcpCommit,
    vexusSha256: manifest.vexusSha256
  });
}

function sha256Buffer(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function profileV7MigrationCandidate(profile, imageAuthority, {
  expectedCurrentFingerprint
} = {}) {
  if (profile?.schemaVersion !== 6 ||
      digest(profile) !== expectedCurrentFingerprint) {
    reject('runtime_profile_v7_migration_source_invalid');
  }
  const authority = validateProfileAuthorityComponents(imageAuthority);
  const nextProfile = imageProfileFromAuthoritySeed({
    controllerSourceManifestDigest: profile.controllerSourceManifestDigest,
    controllerSourceManifestVersion: profile.controllerSourceManifestVersion,
    edgeContainer: profile.edgeContainer,
    governanceEnvironment: profile.governanceEnvironment,
    governanceEnvironmentConfigDigest: profile.governanceEnvironmentConfigDigest,
    privateRoot: profile.privateRoot,
    providerContainer: profile.providerContainer,
    relayEnvironment: profile.relayEnvironment,
    relayEnvironmentConfigDigest: profile.relayEnvironmentConfigDigest,
    retainedBinding: profile.retainedBinding,
    retainedBindingSource: profile.retainedBindingSource,
    vcpProviderConfigDigest: profile.vcpProviderConfigDigest,
    vcpRuntimeScopeDigest: profile.vcpRuntimeScopeDigest
  }, authority);
  return Object.freeze({
    candidateOnly: true,
    currentProfileFingerprint: expectedCurrentFingerprint,
    nextProfile,
    nextProfileBytes: canonicalJson(nextProfile),
    nextProfileFingerprint: digest(nextProfile),
    nextProfileSha256: sha256Buffer(Buffer.from(canonicalJson(nextProfile))),
    durableMutationPerformed: false,
    stateRootUnchanged: nextProfile.privateRoot === profile.privateRoot,
    credentialReferencesUnchanged:
      nextProfile.governanceEnvironment === profile.governanceEnvironment &&
      nextProfile.relayEnvironment === profile.relayEnvironment
  });
}

// Steady-state v7 -> v7 generation rollover candidate. Unlike the migration
// producer (which accepts only schemaVersion === 6), this accepts the current
// schema-v7 profile as the rollover source. The source must be structurally
// valid (validateImageProfile without authority binding), carry schemaVersion 7,
// and match the caller-supplied exact semantic fingerprint. Continuity fields
// come exclusively from the source profile; generation-bound fields derive
// exclusively from the profile-independent next authority components through
// imageProfileFromAuthoritySeed(), which prevents a profile/authority
// self-hash cycle. The result is candidate-only and performs no durable write.
//
// The source's binding to the *active* authority (bytes sha256 ==
// authority.profileSha256 plus validateImageProfile against the active
// authority components) is a host-creator admission concern, not part of this
// pure candidate function.
function profileV7GenerationRolloverCandidate(profile, imageAuthority, {
  expectedCurrentFingerprint
} = {}) {
  if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
      digest(profile) !== expectedCurrentFingerprint) {
    reject('runtime_profile_v7_generation_rollover_source_invalid');
  }
  // Structural validity is required independently of the fingerprint so a
  // caller cannot mint continuity authority from an arbitrary malformed blob
  // that happens to match a caller-chosen hash.
  try {
    validateImageProfile(profile);
  } catch {
    reject('runtime_profile_v7_generation_rollover_source_invalid');
  }
  const authority = validateProfileAuthorityComponents(imageAuthority);
  const nextProfile = imageProfileFromAuthoritySeed({
    controllerSourceManifestDigest: profile.controllerSourceManifestDigest,
    controllerSourceManifestVersion: profile.controllerSourceManifestVersion,
    edgeContainer: profile.edgeContainer,
    governanceEnvironment: profile.governanceEnvironment,
    governanceEnvironmentConfigDigest: profile.governanceEnvironmentConfigDigest,
    privateRoot: profile.privateRoot,
    providerContainer: profile.providerContainer,
    relayEnvironment: profile.relayEnvironment,
    relayEnvironmentConfigDigest: profile.relayEnvironmentConfigDigest,
    retainedBinding: profile.retainedBinding,
    retainedBindingSource: profile.retainedBindingSource,
    vcpProviderConfigDigest: profile.vcpProviderConfigDigest,
    vcpRuntimeScopeDigest: profile.vcpRuntimeScopeDigest
  }, authority);
  return Object.freeze({
    candidateOnly: true,
    classification: 'generation_rollover',
    currentProfileFingerprint: expectedCurrentFingerprint,
    nextProfile,
    nextProfileBytes: canonicalJson(nextProfile),
    nextProfileFingerprint: digest(nextProfile),
    nextProfileSha256: sha256Buffer(Buffer.from(canonicalJson(nextProfile))),
    durableMutationPerformed: false,
    stateRootUnchanged: nextProfile.privateRoot === profile.privateRoot,
    credentialReferencesUnchanged:
      nextProfile.governanceEnvironment === profile.governanceEnvironment &&
      nextProfile.relayEnvironment === profile.relayEnvironment
  });
}

module.exports = {
  AUTHORITY_DEPENDENCY_GRAPH,
  AUTHORITY_RECORD_PATH,
  AUTHORITY_SCHEMA,
  BUILD_MANIFEST_SCHEMA,
  DOCKER_SOCKET_PATH,
  EDGE_RECEIPT_PATH,
  EDGE_RECEIPT_SCHEMA,
  PROVIDER_RECEIPT_PATH,
  PROVIDER_RECEIPT_SCHEMA,
  VCP_PROVIDER_ENVIRONMENT_MAX_BYTES,
  VCP_PROVIDER_HOST_ENVIRONMENT_PATH,
  VCP_PROVIDER_HOST_MODE,
  VCP_PROVIDER_HOST_UID,
  VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH,
  VCP_PROVIDER_RUNTIME_GID,
  VCP_PROVIDER_RUNTIME_UID,
  VCP_IMAGE_RUNTIME_AUTHORITY_SCHEMA,
  VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION,
  IMAGE_BUILD_MANIFEST_PATH,
  IMAGE_PROFILE_KEYS,
  INITIAL_PROFILE_SEED_KEYS,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  PROFILE_AUTHORITY_COMPONENT_SCHEMA,
  PROFILE_SCHEMA_VERSION,
  STATE_MOUNT_SCHEMA,
  RuntimeAuthorityError,
  authorityRecordDigest,
  authorityGraphPrecedes,
  buildManifestDigest,
  canonicalJson,
  countAuthorityGraphCycles,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  parseVcpProviderEnvironment,
  profileAuthorityComponents,
  profileV7InitialBootstrapCandidate,
  profileV7GenerationRolloverCandidate,
  profileV7MigrationCandidate,
  projectContainerConfig,
  readBoundedJson,
  readBoundedBuffer,
  sha256Buffer,
  sha256File,
  validateAuthorityRecord,
  validateBuildManifest,
  validateImageProfile,
  validateContainerInspection,
  validateEdgeReceipt,
  validateProviderReceipt,
  validateProfileAuthorityComponents,
  validateImageInspection,
  validateRuntimeSelfEvidence,
  validateStateMountContract,
  vcpImageRuntimeAuthorityDigest,
  vcpProviderEnvironmentRuntimeAccess,
  vcpProviderConfigDigest
};
