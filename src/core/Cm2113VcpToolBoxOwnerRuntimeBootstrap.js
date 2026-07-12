'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  RUNTIME_IDENTITY_FILENAME,
  DEFAULT_STORE_IDENTITY_FILENAME,
  canonicalize,
  sha256
} = require('./VcpToolBoxDailyNoteOwnerRuntimeAdapter');

const BOOTSTRAP_DIRECTORY_NAME = 'cm2113-vcptoolbox-owner-native-proof';

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
}

async function lstatAbsent(target) {
  try {
    await fs.lstat(target);
    return false;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}

async function exactWrite(filePath, bytes) {
  await fs.writeFile(filePath, bytes, { flag: 'wx' });
  const observed = await fs.readFile(filePath);
  if (!observed.equals(bytes)) throw new Error('cm2113_bootstrap_readback_mismatch');
}

function buildRuntimeIdentity(binding = {}) {
  return {
    memoryIntelligenceOwner: 'VCPToolBox',
    ownerRuntimeComponent: 'DailyNote',
    ownerRuntimeCommunication: 'stdio',
    runtimeSourceCommit: binding.runtimeSourceCommit,
    runtimeSourceTree: binding.runtimeSourceTree,
    pluginBlobOid: binding.pluginBlobOid,
    manifestBlobOid: binding.manifestBlobOid,
    pluginSha256: binding.pluginSha256,
    manifestSha256: binding.manifestSha256,
    preloadSha256: binding.preloadSha256,
    dependencyLockBlobOid: binding.dependencyLockBlobOid,
    dependencyLockSha256: binding.dependencyLockSha256,
    dotenvVersion: binding.dotenvVersion,
    dotenvPackageSha256: binding.dotenvPackageSha256,
    dotenvMainSha256: binding.dotenvMainSha256,
    sourceMaterializedFromGitObjects: true,
    configEnvMaterialized: false,
    runtimeReplacementAllowed: false,
    runtimeReinitializationAllowed: false
  };
}

function buildStoreIdentity(binding = {}) {
  return {
    lifecycleReference: binding.lifecycleReference,
    storeReference: binding.storeReference,
    storeInstanceId: binding.storeInstanceId,
    storeRole: 'phase8_vcptoolbox_owner_native_proof_store',
    syntheticOnly: true,
    identityPresentBeforeFirstNativeWrite: true,
    replacementAllowed: false,
    reinitializationAllowed: false,
    physicalDeleteAllowed: false,
    realMemoryAllowed: false,
    expectedMarkdownCountBeforeWrite: 0,
    expectedMarkdownCountAfterWrite: 1
  };
}

async function executeCm2113OwnerRuntimeBootstrap(input = {}) {
  const governanceRoot = path.resolve(input.governanceRoot || '');
  const bootstrapRoot = path.join(governanceRoot, BOOTSTRAP_DIRECTORY_NAME);
  const runtimeRoot = path.join(bootstrapRoot, 'owner-runtime');
  const pluginDirectory = path.join(runtimeRoot, 'Plugin', 'DailyNote');
  const storeRoot = path.join(bootstrapRoot, 'store');
  const binding = input.binding || {};
  const ownerSource = input.ownerSource || {};
  const preloadBytes = Buffer.isBuffer(input.preloadBytes) ? input.preloadBytes : Buffer.alloc(0);
  const expectedGovernanceIdentityBytes = Buffer.isBuffer(input.governanceRootIdentityBytes)
    ? input.governanceRootIdentityBytes
    : Buffer.alloc(0);
  const expected = input.expected || {};

  if (input.authorization?.authorized !== true || input.authorization?.useCount !== 1 || input.authorization?.replayAllowed !== false) {
    throw new Error('cm2113_bootstrap_authorization_required');
  }
  if (!await lstatAbsent(bootstrapRoot)) throw new Error('cm2113_bootstrap_root_already_exists');
  const governanceStat = await fs.lstat(governanceRoot);
  if (!governanceStat.isDirectory() || governanceStat.isSymbolicLink()) throw new Error('cm2113_governance_root_invalid');
  const governanceIdentityPath = path.join(governanceRoot, '.phase8-registry-root-identity.json');
  const observedGovernanceIdentity = await fs.readFile(governanceIdentityPath);
  if (
    !observedGovernanceIdentity.equals(expectedGovernanceIdentityBytes) ||
    sha256(observedGovernanceIdentity) !== expected.governanceRootIdentitySha256
  ) throw new Error('cm2113_governance_root_identity_mismatch');
  for (const [name, bytes, expectedSha] of [
    ['plugin', ownerSource.pluginBytes, binding.pluginSha256],
    ['manifest', ownerSource.manifestBytes, binding.manifestSha256],
    ['preload', preloadBytes, binding.preloadSha256]
  ]) {
    if (!Buffer.isBuffer(bytes) || sha256(bytes) !== expectedSha) throw new Error(`cm2113_${name}_source_binding_mismatch`);
  }
  const runtimeIdentityBytes = canonicalBytes(buildRuntimeIdentity(binding));
  const storeIdentityBytes = canonicalBytes(buildStoreIdentity(binding));
  if (
    sha256(runtimeIdentityBytes) !== expected.runtimeIdentitySha256 ||
    sha256(storeIdentityBytes) !== expected.storeIdentitySha256
  ) throw new Error('cm2113_bootstrap_identity_hash_mismatch');

  let state = 'UNCLAIMED';
  try {
    await fs.mkdir(bootstrapRoot);
    state = 'BOOTSTRAP_ROOT_CREATED';
    await fs.mkdir(runtimeRoot);
    await fs.mkdir(path.join(runtimeRoot, 'Plugin'));
    await fs.mkdir(pluginDirectory);
    await fs.mkdir(storeRoot);
    state = 'DIRECTORIES_CREATED';
    await exactWrite(path.join(pluginDirectory, 'dailynote.js'), ownerSource.pluginBytes);
    await exactWrite(path.join(pluginDirectory, 'plugin-manifest.json'), ownerSource.manifestBytes);
    await exactWrite(path.join(runtimeRoot, 'cm2113-frozen-clock-preload.js'), preloadBytes);
    await exactWrite(path.join(runtimeRoot, RUNTIME_IDENTITY_FILENAME), runtimeIdentityBytes);
    await exactWrite(path.join(storeRoot, DEFAULT_STORE_IDENTITY_FILENAME), storeIdentityBytes);
    state = 'CONSUMED_SUCCESS';
  } catch (error) {
    error.cm2113BootstrapState = state === 'UNCLAIMED' ? 'CONSUMED_AMBIGUOUS' : 'CONSUMED_PARTIAL_BOOTSTRAP';
    throw error;
  }

  return {
    schemaVersion: 1,
    taskId: 'CM-2113',
    receiptType: 'vcptoolbox_owner_runtime_store_bootstrap_receipt',
    result: 'PASS',
    finalState: state,
    memoryIntelligenceOwner: 'VCPToolBox',
    ownerRuntimeComponent: 'DailyNote',
    ownerRuntimeCommunication: 'stdio',
    runtimeSourceCommit: binding.runtimeSourceCommit,
    runtimeSourceTree: binding.runtimeSourceTree,
    pluginBlobOid: binding.pluginBlobOid,
    manifestBlobOid: binding.manifestBlobOid,
    pluginSha256: binding.pluginSha256,
    manifestSha256: binding.manifestSha256,
    preloadSha256: binding.preloadSha256,
    runtimeIdentitySha256: expected.runtimeIdentitySha256,
    storeIdentitySha256: expected.storeIdentitySha256,
    storeReference: binding.storeReference,
    storeInstanceId: binding.storeInstanceId,
    lifecycleReference: binding.lifecycleReference,
    identityPresentBeforeFirstNativeWrite: true,
    markdownCount: 0,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    nativeReads: 0,
    nativeWrites: 0,
    recordMemoryCalls: 0,
    verifyOperations: 0,
    providerCalls: 0,
    realMemoryReads: 0,
    rawPathDisclosed: false,
    readinessClaimed: false
  };
}

module.exports = {
  BOOTSTRAP_DIRECTORY_NAME,
  buildRuntimeIdentity,
  buildStoreIdentity,
  canonicalBytes,
  executeCm2113OwnerRuntimeBootstrap
};
