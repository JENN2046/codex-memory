'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  expectedIdentityBytes
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  createRecordMarkdown
} = require('./GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  sha256Canonical
} = require('./Phase8OneShotNativeWriteExecutionGate');

const PAYLOAD_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_record_payload_cm2106.json';
const PACKET_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_record_execution_packet_cm2106_r1.json';
const CONTENT_DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_record_authorization_content_cm2106_r1.json';
const FINAL_RELEASE_DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_record_final_release_cm2106_r1.json';

const EXPECTED = Object.freeze({
  payloadBytes: 731,
  payloadFileSha256: '241428987a1c0df6e5ef1020c581456382af5856216d8266340a8ba25e1943af',
  payloadCanonicalSha256: 'ec9965ae813ced18da163e4585a81f3b20ff0dcdefe0602a08720a5daabf3682',
  durableRecordBytes: 327,
  durableRecordSha256: '5b140bdb1f30f1b0d08ad3f066bde9a07b56940eecef20a9a196ef278970a5c3',
  memoryIdRef: 'vcp-kb-5b140bdb1f30f1b0',
  contentDecisionReference: 'CM-2106-R1-SELF-IDENTITY-BOUND-RECORD-CONTENT-5B140BDB',
  finalReleaseDecisionReference: 'CM-2106-R1-SELF-IDENTITY-BOUND-RECORD-FINAL-5B140BDB',
  nonce: 'cm2106-r1-identity-bound-record-write-001',
  receiptId: 'cm2106-r1-identity-bound-record-write-receipt-001',
  registryReference: 'cm2106-r1-identity-bound-record-write-registry-001',
  runtimeTargetReference: 'cm2106-r1-identity-bound-vcptoolbox-native-target',
  appStateReference: 'cm2106-r1-identity-bound-record-write-app-state-001',
  derivedRuntimeStoreReference: 'cm2106-r1-identity-bound-record-write-derived-store-001',
  scopeFingerprint: 'ff5cacbe8b6723514c127b35e0ddb6f14e45f3d0afdb1e88f3780978421984ad'
});

const ALLOWED_SCOPE = Object.freeze({
  scope_id: 'cm2106-phase8-identity-bound-rollback-001',
  project_id: 'codex-memory',
  workspace_id: 'codex-memory-phase8-rollback-proof',
  client_id: 'Codex',
  visibility: 'project'
});

const REGISTRY_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});

const REGISTRY_IDENTITY = Object.freeze({
  authorizationRegistryReference: EXPECTED.registryReference,
  registryStorageRole: 'durable-local-governance-state',
  registryReinitializationAllowed: false,
  registryDeletionAllowed: false
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function expectedAllowlist() {
  return {
    nativeWriteTools: ['record_memory'],
    nativeWriteActions: ['live_bridge_record_memory_proof'],
    maxNativeWrites: 1,
    verifySurface: 'verifyPhase8NativeWriteAuditProjection',
    verifyTool: 'audit_memory',
    verifyAuditFamily: 'governance',
    verifyWindow: 10,
    selectedFieldsOnly: true,
    maxVerifyOperations: 1,
    rollbackOrCompensationActions: [],
    maxRollbackOrCompensationOperations: 0,
    localFallbackWriteAllowed: false,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    existingMemoryModificationAllowed: false,
    rawPrivateMemoryAccessAllowed: false,
    defaultMcpExpansionAllowed: false,
    remoteGitActionsAllowed: false,
    releaseDeployCutoverAllowed: false,
    readinessClaimAllowed: false
  };
}

function expectedRuntimeContext({ implementationCommit, implementationTree, payloadBlobOid,
  preflightReceiptCommit, preflightReceiptBlobOid, preflightReceiptSha256 } = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-2106',
    implementationCommit,
    implementationTree,
    cleanDetachedCheckoutRequired: true,
    outerTransport: 'frozen_local_executor',
    innerNativeTransport: 'local_http_mcp',
    primaryRuntime: 'VCPToolBox native memory',
    primaryWriteOnly: true,
    providerCallsAllowed: false,
    derivedIndexWritesAllowed: false,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    storeIdentitySha256: IDENTITY_CANONICAL_SHA256,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    writeSubdir: STORE_IDENTITY.writeSubdir,
    preflightReceiptCommit,
    preflightReceiptBlobOid,
    preflightReceiptSha256,
    payloadBlobOid,
    payloadBytes: EXPECTED.payloadBytes,
    payloadFileSha256: EXPECTED.payloadFileSha256,
    payloadCanonicalSha256: EXPECTED.payloadCanonicalSha256,
    durableRecordBytes: EXPECTED.durableRecordBytes,
    durableRecordSha256: EXPECTED.durableRecordSha256,
    expectedMemoryIdRef: EXPECTED.memoryIdRef,
    runtimeTargetReferenceName: EXPECTED.runtimeTargetReference,
    runtimeTargetKind: 'mcp_server',
    runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
    writeDelegationMode: 'primary',
    readDelegationMode: 'off',
    innerHttpTargetAccepted: true,
    innerHttpTargetConfigured: true,
    innerHttpAuthConfigured: true,
    innerRecordMemoryToolName: 'knowledge_base.record',
    authorizationRegistryReference: EXPECTED.registryReference,
    authorizationRegistryRootReference: REGISTRY_ROOT_IDENTITY.registryRootReference,
    authorizationRegistryRootIdentitySha256:
      sha256Canonical(REGISTRY_ROOT_IDENTITY),
    appStateReference: EXPECTED.appStateReference,
    derivedRuntimeStoreReference: EXPECTED.derivedRuntimeStoreReference,
    scope: ALLOWED_SCOPE,
    expectedScopeFingerprint: EXPECTED.scopeFingerprint
  };
}

function verifyPayloadBytes(payloadBytes) {
  if (!Buffer.isBuffer(payloadBytes) || payloadBytes.length !== EXPECTED.payloadBytes ||
      sha256(payloadBytes) !== EXPECTED.payloadFileSha256) {
    throw new Error('cm2106_payload_file_binding_mismatch');
  }
  const payload = JSON.parse(payloadBytes.toString('utf8'));
  const durable = Buffer.from(createRecordMarkdown(payload), 'utf8');
  if (sha256Canonical(payload) !== EXPECTED.payloadCanonicalSha256 ||
      durable.length !== EXPECTED.durableRecordBytes ||
      sha256(durable) !== EXPECTED.durableRecordSha256) {
    throw new Error('cm2106_payload_canonical_or_durable_binding_mismatch');
  }
  return { payload, durable };
}

function evaluateRecordWriteReceipt(receipt) {
  const blockers = [];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { accepted: false, blockers: ['receipt.missing'] };
  }
  const { receiptPayloadSha256, ...payload } = receipt;
  if (!/^[a-f0-9]{64}$/.test(receiptPayloadSha256 || '') ||
      sha256Canonical(payload) !== receiptPayloadSha256) {
    blockers.push('receipt.payloadHash');
  }
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2106',
    receiptType: 'identity_bound_synthetic_record_one_shot_execution_receipt',
    result: 'PASS',
    finalState: 'CONSUMED_SUCCESS',
    executionAccepted: true,
    implementationCommit: '40068a70fe4a04f54a2e24b04c70e11a7099f6fa',
    implementationTree: '1b032845712433c3f6235527f535e689b0470c24',
    executionPacketCommit: 'f65e903c9a21f2b6aba9b1bda5e9ee8d01c7c7a5',
    executionPacketBlobOid: '993ece4ed4b0dacb38fa8fc3718041f7975a4f05',
    executionPacketSha256: 'f9bae002a970c58e2bdeb746d5dcbcb67ce903cdc09f0b9c7cedf528abb7a669',
    contentDecisionReference: EXPECTED.contentDecisionReference,
    contentDecisionCommit: '88b504cd514acda93a37deee6a32b46607e6addf',
    contentDecisionBlobOid: 'b32c6b180d84f8ba24d1f76bcbf95bfcdeace0ca',
    contentDecisionSha256: '00d37b1671193df44b0795783f27c2963b354efae9ae06ad9a74271317afa28c',
    finalReleaseDecisionReference: EXPECTED.finalReleaseDecisionReference,
    finalReleaseDecisionCommit: 'f9df8cc23508d2a3215171ab9eb66bd14806ba80',
    finalReleaseDecisionBlobOid: '0710007a68bb253b9d51483a91d9b2c915018b90',
    finalReleaseDecisionSha256: '02acc1f83debfd4d79b799bf658f4942e710df316d7cd48e609664454d8a3a25',
    preflightReceiptCommit: '12090c995ee15818d0583567001248637e24e103',
    preflightReceiptBlobOid: '2b401bf0fd4e9601fd58ad8902744b8aed6cc700',
    preflightReceiptSha256: '2682943390cedb875527a57ec0c7766c33368367fbaf1a9a0513a382e522ef96',
    preflightReceiptAccepted: true,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    storeIdentityMatched: true,
    storeIdentitySha256: IDENTITY_CANONICAL_SHA256,
    payloadBlobOid: 'de20e372df724bc6668a308ff0bad1091475d300',
    payloadBytes: EXPECTED.payloadBytes,
    payloadFileSha256: EXPECTED.payloadFileSha256,
    payloadCanonicalSha256: EXPECTED.payloadCanonicalSha256,
    durableRecordCount: 1,
    durableRecordBytes: EXPECTED.durableRecordBytes,
    durableRecordSha256: EXPECTED.durableRecordSha256,
    memoryIdRef: EXPECTED.memoryIdRef,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    nonceMarkerCount: 1,
    authorizationReceiptMarkerCount: 1,
    writeInvocationMarkerCount: 1,
    writeInvocationCount: 1,
    nativeWriteCalls: 1,
    verifyOperations: 1,
    verifyAccepted: true,
    auditReceiptSelectedFieldsOnly: true,
    nativeInvocationReceiptBindingMatched: true,
    primaryMemoryStoreWritePerformed: true,
    durableWritePerformed: true,
    primaryWriteOnly: true,
    providerCalled: false,
    derivedIndexWritePerformed: false,
    derivedRuntimeStoreCreated: false,
    localFallbackUsed: false,
    automaticRetryPerformed: false,
    rollbackOrCompensationPerformed: false,
    existingMemoryModified: false,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawPathDisclosed: false,
    readinessClaimed: false,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false
  };
  const exactReceiptFields = [...Object.keys(exact), 'claimId', 'claimBindingHash'].sort();
  if (JSON.stringify(Object.keys(payload).sort()) !== JSON.stringify(exactReceiptFields)) blockers.push('receipt.fields');
  for (const [field, expected] of Object.entries(exact)) {
    if (receipt[field] !== expected) blockers.push(`receipt.${field}`);
  }
  for (const field of ['claimId', 'claimBindingHash']) {
    if (!/^[a-f0-9]{64}$/.test(receipt[field] || '')) blockers.push(`receipt.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    acceptedAsIdentityBoundRecordEvidence: blockers.length === 0,
    nativeWriteCalls: blockers.length === 0 ? 1 : 0,
    verifyOperations: blockers.length === 0 ? 1 : 0,
    additionalWriteAuthorized: false,
    tombstoneAuthorized: false,
    phase8Completed: false
  };
}

async function verifyIdentity(storeRoot, filesystem = fs) {
  const root = await filesystem.lstat(storeRoot);
  if (!root.isDirectory() || root.isSymbolicLink()) {
    throw new Error('cm2106_store_root_invalid');
  }
  const identityPath = path.join(storeRoot, IDENTITY_FILENAME);
  const stat = await filesystem.lstat(identityPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('cm2106_store_identity_invalid');
  }
  const identity = await filesystem.readFile(identityPath);
  if (!identity.equals(expectedIdentityBytes()) || identity.length !== IDENTITY_CANONICAL_BYTES ||
      sha256(identity) !== IDENTITY_CANONICAL_SHA256) {
    throw new Error('cm2106_store_identity_binding_mismatch');
  }
  return {
    storeIdentityMatched: true,
    identityBytes: identity.length,
    identitySha256: sha256(identity),
    rawPathDisclosed: false
  };
}

async function collectPreWriteProjection(storeRoot, filesystem = fs) {
  const identity = await verifyIdentity(storeRoot, filesystem);
  const entries = await filesystem.readdir(storeRoot, { withFileTypes: true });
  if (entries.length !== 1 || entries[0].name !== IDENTITY_FILENAME ||
      !entries[0].isFile() || entries[0].isSymbolicLink()) {
    throw new Error('cm2106_pre_write_store_not_empty');
  }
  return {
    accepted: true,
    stage: 'pre_record_write',
    ...identity,
    observedMarkdownCount: 0,
    unexpectedEntries: 0,
    recordContentReads: 0,
    realMemoryRead: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

async function collectPostWriteProjection(storeRoot, filesystem = fs) {
  const identity = await verifyIdentity(storeRoot, filesystem);
  const rootEntries = await filesystem.readdir(storeRoot, { withFileTypes: true });
  const writeDirEntry = rootEntries.find(entry => entry.name === STORE_IDENTITY.writeSubdir);
  if (rootEntries.length !== 2 || !writeDirEntry || !writeDirEntry.isDirectory() ||
      writeDirEntry.isSymbolicLink()) {
    throw new Error('cm2106_post_write_store_root_shape_mismatch');
  }
  const writeDir = path.join(storeRoot, STORE_IDENTITY.writeSubdir);
  const entries = await filesystem.readdir(writeDir, { withFileTypes: true });
  const suffix = `-${EXPECTED.durableRecordSha256.slice(0, 16)}.md`;
  const matches = entries.filter(entry => entry.isFile() && !entry.isSymbolicLink() &&
    entry.name.endsWith(suffix));
  if (entries.length !== 1 || matches.length !== 1) {
    throw new Error('cm2106_post_write_file_set_mismatch');
  }
  const durable = await filesystem.readFile(path.join(writeDir, matches[0].name));
  if (durable.length !== EXPECTED.durableRecordBytes ||
      sha256(durable) !== EXPECTED.durableRecordSha256) {
    throw new Error('cm2106_post_write_durable_record_mismatch');
  }
  return {
    accepted: true,
    stage: 'post_record_write',
    ...identity,
    markdownCount: 1,
    recordCount: 1,
    durableRecordBytes: durable.length,
    durableRecordSha256: sha256(durable),
    memoryIdRef: EXPECTED.memoryIdRef,
    originalRecordUnmodified: true,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

module.exports = {
  ALLOWED_SCOPE,
  CONTENT_DECISION_PATH,
  EXPECTED,
  FINAL_RELEASE_DECISION_PATH,
  PACKET_PATH,
  PAYLOAD_PATH,
  REGISTRY_IDENTITY,
  REGISTRY_ROOT_IDENTITY,
  collectPostWriteProjection,
  collectPreWriteProjection,
  evaluateRecordWriteReceipt,
  expectedAllowlist,
  expectedRuntimeContext,
  sha256,
  verifyPayloadBytes
};
