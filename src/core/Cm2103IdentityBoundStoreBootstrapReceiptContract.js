'use strict';

const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING_CANONICAL_SHA256
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256
} = require('./Cm2103IdentityBoundStoreGovernance');
const { REGISTRY_IDENTITY } = require('./Cm2103IdentityBoundStoreBootstrapRegistry');

const EXPECTED_BINDING_KEYS = Object.freeze([
  'decisionReference',
  'decisionSourceCommit',
  'decisionBlobOid',
  'decisionSha256',
  'executionPacketCommit',
  'executionPacketBlobOid',
  'executionPacketSha256',
  'foundationDecisionReference',
  'foundationDecisionSourceCommit',
  'foundationDecisionBlobOid',
  'foundationDecisionSha256',
  'bootstrapRequestCommit',
  'bootstrapRequestBlobOid',
  'bootstrapRequestSha256',
  'implementationCommit',
  'implementationTree',
  'bindingHash',
  'nonce',
  'receiptId'
]);

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion',
  'taskId',
  'receiptType',
  'result',
  'finalState',
  'outcomeCategory',
  'decisionReference',
  'decisionSourceCommit',
  'decisionBlobOid',
  'decisionSha256',
  'executionPacketCommit',
  'executionPacketBlobOid',
  'executionPacketSha256',
  'foundationDecisionReference',
  'foundationDecisionSourceCommit',
  'foundationDecisionBlobOid',
  'foundationDecisionSha256',
  'bootstrapRequestCommit',
  'bootstrapRequestBlobOid',
  'bootstrapRequestSha256',
  'implementationCommit',
  'implementationTree',
  'action',
  'lifecycleReference',
  'storeReference',
  'storeInstanceId',
  'storeRole',
  'storeRootBindingSha256',
  'governanceRootIdentityReference',
  'governanceRootIdentitySha256',
  'authorizationRegistryReference',
  'bindingHash',
  'nonce',
  'receiptId',
  'storeDirectoryExistenceCheckedBeforeClaim',
  'storeDirectoryAbsentBeforeClaim',
  'existingStoreDirectoryRead',
  'storeDirectoryCreateAttempts',
  'storeDirectoryCreates',
  'storeDirectoryCreated',
  'identityFilename',
  'identityWriteAttempts',
  'identityWrites',
  'identityCreated',
  'identityBytes',
  'identitySha256',
  'identityReadbackVerifications',
  'identityReadbackMatched',
  'authorizationUseCount',
  'authorizationConsumed',
  'authorizationReplayAllowed',
  'automaticRetryPerformed',
  'automaticCleanupPerformed',
  'reconciliationRequired',
  'directoryEnumerations',
  'recordContentReads',
  'nativeReads',
  'nativeWrites',
  'recordMemoryCalls',
  'tombstoneMemoryCalls',
  'verifyOperations',
  'rollbackOrCompensationOperations',
  'realMemoryRead',
  'realMemoryModified',
  'providerCalled',
  'embeddingProviderCalled',
  'remoteActionPerformed',
  'rawMemoryReturned',
  'rawAuditReturned',
  'rawPathDisclosed',
  'emptyStorePreflightExecuted',
  'rollbackDrillPassed',
  'failureRecoveryProofPassed',
  'phase8Completed',
  'fullPlanPackCompleted',
  'readinessClaimed'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hash(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function evaluateCm2103BootstrapReceipt({ receipt, expectedBinding } = {}) {
  const blockers = [];
  if (!exactKeys(expectedBinding, EXPECTED_BINDING_KEYS)) blockers.push('expectedBinding.keys');
  if (!exactKeys(receipt, RECEIPT_KEYS)) blockers.push('receipt.keys');
  if (blockers.length) return {
    shapeAccepted: false,
    acceptedAsBootstrapEvidence: false,
    blockers,
    bootstrapAuthorizedByThisContract: false,
    bootstrapExecutedByThisContract: false
  };

  for (const field of ['decisionReference', 'foundationDecisionReference', 'nonce', 'receiptId']) {
    if (!nonempty(expectedBinding[field])) blockers.push(`expectedBinding.${field}`);
  }
  for (const field of [
    'decisionSourceCommit', 'decisionBlobOid', 'executionPacketCommit', 'executionPacketBlobOid',
    'foundationDecisionSourceCommit', 'foundationDecisionBlobOid', 'bootstrapRequestCommit',
    'bootstrapRequestBlobOid', 'implementationCommit', 'implementationTree'
  ]) if (!hash(expectedBinding[field], 40)) blockers.push(`expectedBinding.${field}`);
  for (const field of [
    'decisionSha256', 'executionPacketSha256', 'foundationDecisionSha256',
    'bootstrapRequestSha256', 'bindingHash'
  ]) if (!hash(expectedBinding[field], 64)) blockers.push(`expectedBinding.${field}`);

  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2103',
    receiptType: 'identity_bound_synthetic_store_bootstrap_receipt',
    result: 'PASS',
    finalState: 'CONSUMED_SUCCESS',
    outcomeCategory: 'identity_bound_store_bootstrap_completed',
    decisionReference: expectedBinding.decisionReference,
    decisionSourceCommit: expectedBinding.decisionSourceCommit,
    decisionBlobOid: expectedBinding.decisionBlobOid,
    decisionSha256: expectedBinding.decisionSha256,
    executionPacketCommit: expectedBinding.executionPacketCommit,
    executionPacketBlobOid: expectedBinding.executionPacketBlobOid,
    executionPacketSha256: expectedBinding.executionPacketSha256,
    foundationDecisionReference: expectedBinding.foundationDecisionReference,
    foundationDecisionSourceCommit: expectedBinding.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: expectedBinding.foundationDecisionBlobOid,
    foundationDecisionSha256: expectedBinding.foundationDecisionSha256,
    bootstrapRequestCommit: expectedBinding.bootstrapRequestCommit,
    bootstrapRequestBlobOid: expectedBinding.bootstrapRequestBlobOid,
    bootstrapRequestSha256: expectedBinding.bootstrapRequestSha256,
    implementationCommit: expectedBinding.implementationCommit,
    implementationTree: expectedBinding.implementationTree,
    action: 'initialize_identity_bound_synthetic_store',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    governanceRootIdentityReference: GOVERNANCE_ROOT_IDENTITY.registryRootReference,
    governanceRootIdentitySha256: GOVERNANCE_ROOT_IDENTITY_SHA256,
    authorizationRegistryReference: REGISTRY_IDENTITY.authorizationRegistryReference,
    bindingHash: expectedBinding.bindingHash,
    nonce: expectedBinding.nonce,
    receiptId: expectedBinding.receiptId,
    storeDirectoryExistenceCheckedBeforeClaim: true,
    storeDirectoryAbsentBeforeClaim: true,
    existingStoreDirectoryRead: false,
    storeDirectoryCreateAttempts: 1,
    storeDirectoryCreates: 1,
    storeDirectoryCreated: true,
    identityFilename: IDENTITY_FILENAME,
    identityWriteAttempts: 1,
    identityWrites: 1,
    identityCreated: true,
    identityBytes: IDENTITY_CANONICAL_BYTES,
    identitySha256: IDENTITY_CANONICAL_SHA256,
    identityReadbackVerifications: 1,
    identityReadbackMatched: true,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    automaticRetryPerformed: false,
    automaticCleanupPerformed: false,
    reconciliationRequired: false,
    directoryEnumerations: 0,
    recordContentReads: 0,
    nativeReads: 0,
    nativeWrites: 0,
    recordMemoryCalls: 0,
    tombstoneMemoryCalls: 0,
    verifyOperations: 0,
    rollbackOrCompensationOperations: 0,
    realMemoryRead: false,
    realMemoryModified: false,
    providerCalled: false,
    embeddingProviderCalled: false,
    remoteActionPerformed: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawPathDisclosed: false,
    emptyStorePreflightExecuted: false,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (receipt[field] !== expected) blockers.push(`receipt.${field}`);
  }
  return {
    shapeAccepted: blockers.length === 0,
    acceptedAsBootstrapEvidence: blockers.length === 0,
    blockers,
    bootstrapAuthorizedByThisContract: false,
    bootstrapExecutedByThisContract: false,
    emptyStorePreflightAuthorizedByThisContract: false,
    nativeActionsPerformedByThisContract: 0,
    rawPathDisclosed: false
  };
}

module.exports = {
  EXPECTED_BINDING_KEYS,
  RECEIPT_KEYS,
  evaluateCm2103BootstrapReceipt
};
