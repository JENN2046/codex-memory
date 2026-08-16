'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const BUILD_MANIFEST_SCHEMA = 'codex-memory-runtime-build-manifest/v1';
const AUTHORITY_SCHEMA = 'codex-memory-native-runtime-authority/v1';
const EDGE_RECEIPT_SCHEMA = 'codex-memory-edge-runtime-receipt/v1';
const STATE_MOUNT_SCHEMA = 'codex-memory-primary-state-mount/v1';
const PROFILE_SCHEMA_VERSION = 7;
const IMAGE_RUNTIME_ROOT = '/opt/codex-memory';
const IMAGE_VCP_ROOT = '/opt/vcptoolbox';
const IMAGE_BUILD_MANIFEST_PATH =
  '/opt/codex-memory-runtime/runtime-build-manifest.json';
const AUTHORITY_RECORD_PATH = '/run/codex-memory/authority.json';
const EDGE_RECEIPT_PATH = '/run/codex-memory/edge-receipt.json';
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

function hostTrustBundleDigest({ launcherFile, authorityModuleFile }) {
  const files = [
    { installPath: 'deploy/native-runtime/host-launcher.js', source: launcherFile },
    { installPath: 'src/runtime/native-image/runtime-authority.js', source: authorityModuleFile }
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
    'acceptedOciManifestDigest',
    'authoritySchemaVersion',
    'buildManifestDigest',
    'codexMemoryCommit',
    'containerConfigDigest',
    'edgeConfigDigest',
    'edgeContainerId',
    'edgeImageIdentity',
    'edgeLifecycleAuthority',
    'expectedRuntimeContainerId',
    'hostLauncherDigest',
    'hostLauncherVersion',
    'rootfsChainDigest',
    'stateMountContract',
    'stateMountContractDigest',
    'vcpCommit'
  ];
  if (!exactKeys(value, keys) ||
      value.authoritySchemaVersion !== AUTHORITY_SCHEMA ||
      value.edgeLifecycleAuthority !== 'host_launcher' ||
      value.hostLauncherVersion !== 'codex-memory-native-host-launcher/v1' ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
      !CONTAINER_ID.test(value.expectedRuntimeContainerId || '')) {
    reject('runtime_authority_record_invalid');
  }
  assertCommit(value.codexMemoryCommit);
  assertCommit(value.vcpCommit);
  for (const item of [
    value.acceptedImageConfigId,
    value.acceptedOciManifestDigest,
    value.buildManifestDigest,
    value.containerConfigDigest,
    value.edgeConfigDigest,
    value.edgeImageIdentity,
    value.hostLauncherDigest,
    value.rootfsChainDigest,
    value.stateMountContractDigest
  ]) assertDigest(item);
  const state = validateStateMountContract(value.stateMountContract);
  if (digest(state) !== value.stateMountContractDigest) {
    reject('runtime_state_mount_contract_digest_mismatch');
  }
  return Object.freeze({ ...value, stateMountContract: state });
}

function authorityRecordDigest(value) {
  return digest(validateAuthorityRecord(value));
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
    'launchEpoch',
    'launcherAuthorityDigest',
    'observedAt',
    'schemaVersion'
  ];
  if (!exactKeys(value, keys) || value.schemaVersion !== EDGE_RECEIPT_SCHEMA ||
      !CONTAINER_ID.test(value.edgeContainerId || '') ||
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
      value.edgeConfigDigest !== accepted.edgeConfigDigest) {
    reject('runtime_edge_receipt_identity_mismatch');
  }
  if (bootId !== undefined && value.launchEpoch !== bootId) {
    reject('runtime_edge_receipt_stale');
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
    command: config.Cmd || [],
    entrypoint: config.Entrypoint || [],
    environment: [...(config.Env || [])].sort(),
    image: inspect?.Image || '',
    ipcMode: host.IpcMode || '',
    mounts,
    networkMode: host.NetworkMode || '',
    pidMode: host.PidMode || '',
    privileged: host.Privileged === true,
    readOnlyRootfs: host.ReadonlyRootfs === true,
    restartPolicy: host.RestartPolicy?.Name || '',
    securityOpt: [...(host.SecurityOpt || [])].sort(),
    tmpfs: host.Tmpfs || {},
    user: config.User || ''
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
      projected.pidMode || projected.ipcMode ||
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
  for (const required of [AUTHORITY_RECORD_PATH, EDGE_RECEIPT_PATH]) {
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
  requireRootOwner = false
} = {}) {
  let stat;
  try {
    stat = fsModule.lstatSync(file);
  } catch {
    reject('runtime_authority_file_unavailable');
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 ||
      stat.size > maximumBytes || (stat.mode & 0o022) !== 0 ||
      (requireRootOwner && stat.uid !== 0)) {
    reject('runtime_authority_file_insecure');
  }
  let value;
  try {
    value = JSON.parse(fsModule.readFileSync(file, 'utf8'));
  } catch {
    reject('runtime_authority_file_invalid');
  }
  return value;
}

function validateRuntimeSelfEvidence({ authority, buildManifest, edgeReceipt,
  runtimeRoot = process.cwd(), vcpRoot, dockerSocketExists = fs.existsSync }) {
  const accepted = validateAuthorityRecord(authority);
  const manifest = validateBuildManifest(buildManifest);
  validateEdgeReceipt(edgeReceipt, accepted);
  if (path.resolve(runtimeRoot) !== IMAGE_RUNTIME_ROOT ||
      path.resolve(vcpRoot || '') !== IMAGE_VCP_ROOT ||
      dockerSocketExists(DOCKER_SOCKET_PATH) ||
      manifest.codexMemoryCommit !== accepted.codexMemoryCommit ||
      manifest.vcpCommit !== accepted.vcpCommit ||
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

function profileV7MigrationCandidate(profile, imageAuthority, {
  expectedCurrentFingerprint
} = {}) {
  if (profile?.schemaVersion !== 6 ||
      digest(profile) !== expectedCurrentFingerprint) {
    reject('runtime_profile_v7_migration_source_invalid');
  }
  const authority = validateAuthorityRecord(imageAuthority);
  const nextProfile = Object.freeze({
    ...profile,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    runtimeAuthorityMode: 'digest_pinned_read_only_image',
    runtimeImageManifestDigest: authority.acceptedOciManifestDigest,
    runtimeImageConfigId: authority.acceptedImageConfigId,
    runtimeRootfsChainDigest: authority.rootfsChainDigest,
    runtimeBuildManifestDigest: authority.buildManifestDigest,
    runtimeContainerId: authority.expectedRuntimeContainerId,
    stateMountContractDigest: authority.stateMountContractDigest,
    hostLauncherAuthorityVersion: authority.hostLauncherVersion,
    hostLauncherDigest: authority.hostLauncherDigest,
    edgeLifecycleAuthority: authority.edgeLifecycleAuthority,
    runtimeBaseline: authority.codexMemoryCommit,
    adoptedRepositoryHead: authority.codexMemoryCommit,
    runtimeRepository: IMAGE_RUNTIME_ROOT,
    vcpRuntimeBaseline: authority.vcpCommit,
    vcpRuntimeRepository: IMAGE_VCP_ROOT
  });
  return Object.freeze({
    candidateOnly: true,
    currentProfileFingerprint: expectedCurrentFingerprint,
    nextProfile,
    nextProfileFingerprint: digest(nextProfile),
    durableMutationPerformed: false,
    stateRootUnchanged: nextProfile.privateRoot === profile.privateRoot,
    credentialReferencesUnchanged:
      nextProfile.governanceEnvironment === profile.governanceEnvironment &&
      nextProfile.relayEnvironment === profile.relayEnvironment
  });
}

module.exports = {
  AUTHORITY_RECORD_PATH,
  AUTHORITY_SCHEMA,
  BUILD_MANIFEST_SCHEMA,
  DOCKER_SOCKET_PATH,
  EDGE_RECEIPT_PATH,
  EDGE_RECEIPT_SCHEMA,
  IMAGE_BUILD_MANIFEST_PATH,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  PROFILE_SCHEMA_VERSION,
  STATE_MOUNT_SCHEMA,
  RuntimeAuthorityError,
  authorityRecordDigest,
  buildManifestDigest,
  canonicalJson,
  containerConfigDigest,
  digest,
  hostTrustBundleDigest,
  profileV7MigrationCandidate,
  projectContainerConfig,
  readBoundedJson,
  validateAuthorityRecord,
  validateBuildManifest,
  validateContainerInspection,
  validateEdgeReceipt,
  validateImageInspection,
  validateRuntimeSelfEvidence,
  validateStateMountContract
};
