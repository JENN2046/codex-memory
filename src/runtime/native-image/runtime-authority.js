'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BUILD_MANIFEST_SCHEMA = 'codex-memory-runtime-build-manifest/v1';
const AUTHORITY_SCHEMA = 'codex-memory-native-runtime-authority/v1';
const EDGE_RECEIPT_SCHEMA = 'codex-memory-edge-runtime-receipt/v1';
const PROVIDER_RECEIPT_SCHEMA = 'codex-memory-provider-runtime-receipt/v1';
const STATE_MOUNT_SCHEMA = 'codex-memory-primary-state-mount/v1';
const PROFILE_AUTHORITY_COMPONENT_SCHEMA =
  'codex-memory-profile-runtime-authority-components/v1';
const AUTHORITY_DEPENDENCY_GRAPH = Object.freeze({
  buildContext: Object.freeze(['runtimeImage']),
  canonicalPolicies: Object.freeze(['profileCandidate', 'hostAuthority']),
  edgeObservation: Object.freeze(['profileCandidate', 'hostAuthority']),
  hostAuthority: Object.freeze(['hostLauncherAdmission']),
  hostLauncherAdmission: Object.freeze(['edgeReceipt', 'providerReceipt', 'runtimeActivation']),
  launcherBundle: Object.freeze(['profileCandidate', 'hostAuthority']),
  nativeClosure: Object.freeze(['hostAuthority']),
  profileCandidate: Object.freeze(['hostAuthority']),
  providerObservation: Object.freeze(['profileCandidate', 'hostAuthority']),
  reviewedSource: Object.freeze(['buildContext', 'canonicalPolicies', 'launcherBundle']),
  runtimeContainer: Object.freeze(['profileCandidate', 'hostAuthority']),
  runtimeImage: Object.freeze(['nativeClosure', 'runtimeContainer'])
});
const PROFILE_SCHEMA_VERSION = 7;
const IMAGE_RUNTIME_ROOT = '/opt/codex-memory';
const IMAGE_VCP_ROOT = '/opt/vcptoolbox';
const IMAGE_BUILD_MANIFEST_PATH =
  '/opt/codex-memory-runtime/runtime-build-manifest.json';
const AUTHORITY_RECORD_PATH = '/run/codex-memory/authority.json';
const EDGE_RECEIPT_PATH = '/run/codex-memory/edge-receipt.json';
const PROVIDER_RECEIPT_PATH = '/run/codex-memory/provider-receipt.json';
const DOCKER_SOCKET_PATH = '/var/run/docker.sock';
const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const SAFE_ABSOLUTE_PATH = /^\/(?:[A-Za-z0-9._-]+\/?)+$/u;

class RuntimeAuthorityError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function reject(code) {
  throw new RuntimeAuthorityError(code);
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

function sha256File(file) {
  return `sha256:${crypto.createHash('sha256')
    .update(fs.readFileSync(file)).digest('hex')}`;
}

function hostTrustBundleDigest({ launcherFile, authorityModuleFile,
  policyModuleFile, nativeClosureModuleFile, tarArchiveModuleFile }) {
  const files = [
    { installPath: 'deploy/native-runtime/host-launcher.js', source: launcherFile },
    { installPath: 'src/runtime/native-image/runtime-authority.js', source: authorityModuleFile },
    { installPath: 'src/runtime/native-image/container-policy.js', source: policyModuleFile },
    { installPath: 'src/runtime/native-image/native-closure.js', source: nativeClosureModuleFile },
    { installPath: 'src/runtime/native-image/tar-archive.js', source: tarArchiveModuleFile }
  ].map(entry => ({
    installPath: entry.installPath,
    sha256: sha256File(path.resolve(entry.source))
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
    'edgeConfigDigest',
    'edgeContainerId',
    'edgeImageIdentity',
    'edgeLifecycleAuthority',
    'edgeRevision',
    'expectedRuntimeContainerId',
    'hostLauncherDigest',
    'hostLauncherVersion',
    'nativeClosureDigest',
    'profilePath',
    'profileSchemaVersion',
    'profileSha256',
    'providerConfigDigest',
    'providerContainerId',
    'providerImageIdentity',
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
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !CONTAINER_ID.test(value.providerContainerId || '') ||
      !CONTAINER_ID.test(value.expectedRuntimeContainerId || '')) {
    reject('runtime_authority_record_invalid');
  }
  assertCommit(value.codexMemoryCommit);
  assertCommit(value.vcpCommit);
  assertCommit(value.providerRevision);
  assertCommit(value.edgeRevision);
  if (value.edgeRevision !== value.codexMemoryCommit) {
    reject('runtime_authority_edge_revision_mismatch');
  }
  for (const item of [
    value.acceptedImageConfigId,
    value.acceptedOciArchiveSha256,
    value.acceptedOciManifestDigest,
    value.buildManifestDigest,
    value.containerConfigDigest,
    value.edgeConfigDigest,
    value.edgeImageIdentity,
    value.edgePolicyDigest,
    value.hostLauncherDigest,
    value.nativeClosureDigest,
    value.profileSha256,
    value.providerConfigDigest,
    value.providerImageIdentity,
    value.providerPolicyDigest,
    value.rootfsChainDigest,
    value.runtimePolicyDigest,
    value.stateMountContractDigest
  ]) assertDigest(item);
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
    'edgePolicyDigest', 'edgeRevision', 'expectedRuntimeContainerId',
    'hostLauncherDigest', 'hostLauncherVersion', 'nativeClosureDigest',
    'profileAuthorityComponentSchemaVersion', 'providerConfigDigest',
    'providerContainerId', 'providerImageIdentity', 'providerPolicyDigest',
    'providerRevision', 'rootfsChainDigest', 'runtimePolicyDigest',
    'stateMountContractDigest', 'vcpCommit'
  ];
  if (!exactKeys(value, keys) ||
      value.profileAuthorityComponentSchemaVersion !== PROFILE_AUTHORITY_COMPONENT_SCHEMA ||
      value.edgeLifecycleAuthority !== 'host_launcher' ||
      value.hostLauncherVersion !== 'codex-memory-native-host-launcher/v1' ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !CONTAINER_ID.test(value.providerContainerId || '') ||
      !CONTAINER_ID.test(value.expectedRuntimeContainerId || '')) {
    reject('runtime_profile_authority_components_invalid');
  }
  for (const commit of [value.codexMemoryCommit, value.edgeRevision,
    value.providerRevision, value.vcpCommit]) assertCommit(
    commit, 'runtime_profile_authority_components_invalid'
  );
  if (value.edgeRevision !== value.codexMemoryCommit) {
    reject('runtime_profile_authority_components_invalid');
  }
  for (const item of [
    value.acceptedImageConfigId, value.acceptedOciArchiveSha256,
    value.acceptedOciManifestDigest, value.buildManifestDigest,
    value.edgeConfigDigest, value.edgePolicyDigest, value.hostLauncherDigest,
    value.nativeClosureDigest, value.providerConfigDigest,
    value.providerImageIdentity, value.providerPolicyDigest,
    value.rootfsChainDigest, value.runtimePolicyDigest,
    value.stateMountContractDigest
  ]) assertDigest(item, 'runtime_profile_authority_components_invalid');
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
    edgeLifecycleAuthority: value.edgeLifecycleAuthority,
    edgePolicyDigest: value.edgePolicyDigest,
    edgeRevision: value.edgeRevision,
    expectedRuntimeContainerId: value.expectedRuntimeContainerId,
    hostLauncherDigest: value.hostLauncherDigest,
    hostLauncherVersion: value.hostLauncherVersion,
    nativeClosureDigest: value.nativeClosureDigest,
    profileAuthorityComponentSchemaVersion: PROFILE_AUTHORITY_COMPONENT_SCHEMA,
    providerConfigDigest: value.providerConfigDigest,
    providerContainerId: value.providerContainerId,
    providerImageIdentity: value.providerImageIdentity,
    providerPolicyDigest: value.providerPolicyDigest,
    providerRevision: value.providerRevision,
    rootfsChainDigest: value.rootfsChainDigest,
    runtimePolicyDigest: value.runtimePolicyDigest,
    stateMountContractDigest: value.stateMountContractDigest,
    vcpCommit: value.vcpCommit
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
    'edgeHealth',
    'edgeImageIdentity',
    'edgeRevision',
    'launchEpoch',
    'launcherAuthorityDigest',
    'observedAt',
    'schemaVersion'
  ];
  if (!exactKeys(value, keys) || value.schemaVersion !== EDGE_RECEIPT_SCHEMA ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !SHA1.test(value.edgeRevision || '') ||
      value.edgeHealth !== 'healthy' ||
      typeof value.launchEpoch !== 'string' || value.launchEpoch.length < 16 ||
      !Number.isSafeInteger(value.observedAt) ||
      value.observedAt > now || now - value.observedAt > maximumAgeMs) {
    reject('runtime_edge_receipt_invalid');
  }
  for (const item of [
    value.edgeConfigDigest,
    value.edgeImageIdentity,
    value.launcherAuthorityDigest
  ]) assertDigest(item, 'runtime_edge_receipt_invalid');
  const accepted = validateAuthorityRecord(authority);
  if (value.launcherAuthorityDigest !== authorityRecordDigest(accepted)) {
    reject('runtime_edge_receipt_launcher_mismatch');
  }
  if (value.edgeContainerId !== accepted.edgeContainerId ||
      value.edgeImageIdentity !== accepted.edgeImageIdentity ||
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
    'providerConfigDigest', 'providerContainerId', 'providerHealth',
    'providerImageIdentity', 'providerRevision', 'schemaVersion'
  ];
  if (!exactKeys(value, keys) || value.schemaVersion !== PROVIDER_RECEIPT_SCHEMA ||
      value.providerHealth !== 'healthy' ||
      !CONTAINER_ID.test(value.providerContainerId || '') ||
      !Number.isSafeInteger(value.observedAt) || value.observedAt > now ||
      now - value.observedAt > maximumAgeMs ||
      typeof value.launchEpoch !== 'string' || value.launchEpoch.length < 16) {
    reject('runtime_provider_receipt_invalid');
  }
  assertCommit(value.providerRevision, 'runtime_provider_receipt_invalid');
  for (const item of [value.launcherAuthorityDigest, value.providerConfigDigest,
    value.providerImageIdentity]) assertDigest(item, 'runtime_provider_receipt_invalid');
  const accepted = validateAuthorityRecord(authority);
  if (value.launcherAuthorityDigest !== authorityRecordDigest(accepted) ||
      value.providerContainerId !== accepted.providerContainerId ||
      value.providerImageIdentity !== accepted.providerImageIdentity ||
      value.providerConfigDigest !== accepted.providerConfigDigest ||
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
  const nextProfile = Object.freeze({
    ...profile,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    runtimeAuthorityMode: 'digest_pinned_read_only_image',
    runtimeImageManifestDigest: authority.acceptedOciManifestDigest,
    runtimeOciArchiveSha256: authority.acceptedOciArchiveSha256,
    runtimeImageConfigId: authority.acceptedImageConfigId,
    runtimeRootfsChainDigest: authority.rootfsChainDigest,
    runtimeBuildManifestDigest: authority.buildManifestDigest,
    nativeClosureDigest: authority.nativeClosureDigest,
    runtimePolicyDigest: authority.runtimePolicyDigest,
    edgePolicyDigest: authority.edgePolicyDigest,
    edgeRuntimeConfigDigest: authority.edgeConfigDigest,
    providerPolicyDigest: authority.providerPolicyDigest,
    providerRuntimeConfigDigest: authority.providerConfigDigest,
    runtimeContainerId: authority.expectedRuntimeContainerId,
    stateMountContractDigest: authority.stateMountContractDigest,
    hostLauncherAuthorityVersion: authority.hostLauncherVersion,
    hostLauncherDigest: authority.hostLauncherDigest,
    edgeLifecycleAuthority: authority.edgeLifecycleAuthority,
    edgeContainerId: authority.edgeContainerId,
    runtimeBaseline: authority.codexMemoryCommit,
    adoptedRepositoryHead: authority.codexMemoryCommit,
    runtimeRepository: IMAGE_RUNTIME_ROOT,
    providerContainerId: authority.providerContainerId,
    providerImageId: authority.providerImageIdentity,
    providerRevision: authority.providerRevision,
    vcpRuntimeBaseline: authority.vcpCommit,
    vcpRuntimeRepository: IMAGE_VCP_ROOT
  });
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
  IMAGE_BUILD_MANIFEST_PATH,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  PROFILE_AUTHORITY_COMPONENT_SCHEMA,
  PROFILE_SCHEMA_VERSION,
  STATE_MOUNT_SCHEMA,
  RuntimeAuthorityError,
  authorityRecordDigest,
  buildManifestDigest,
  canonicalJson,
  countAuthorityGraphCycles,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  profileAuthorityComponents,
  profileV7MigrationCandidate,
  projectContainerConfig,
  readBoundedJson,
  readBoundedBuffer,
  sha256Buffer,
  sha256File,
  validateAuthorityRecord,
  validateBuildManifest,
  validateContainerInspection,
  validateEdgeReceipt,
  validateProviderReceipt,
  validateProfileAuthorityComponents,
  validateImageInspection,
  validateRuntimeSelfEvidence,
  validateStateMountContract
};
