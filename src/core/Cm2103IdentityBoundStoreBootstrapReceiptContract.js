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
  'decisionReference', 'decisionSourceCommit', 'decisionBlobOid', 'decisionSha256',
  'executionPacketCommit', 'executionPacketBlobOid', 'executionPacketSha256',
  'foundationDecisionReference', 'foundationDecisionSourceCommit', 'foundationDecisionBlobOid',
  'foundationDecisionSha256', 'bootstrapRequestCommit', 'bootstrapRequestBlobOid',
  'bootstrapRequestSha256', 'implementationCommit', 'implementationTree', 'bindingHash',
  'nonce', 'receiptId'
]);

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'receiptType', 'result', 'finalState', 'outcomeStage',
  'decisionReference', 'decisionSourceCommit', 'decisionBlobOid', 'decisionSha256',
  'executionPacketCommit', 'executionPacketBlobOid', 'executionPacketSha256',
  'foundationDecisionReference', 'foundationDecisionSourceCommit', 'foundationDecisionBlobOid',
  'foundationDecisionSha256', 'bootstrapRequestCommit', 'bootstrapRequestBlobOid',
  'bootstrapRequestSha256', 'implementationCommit', 'implementationTree', 'action',
  'lifecycleReference', 'storeReference', 'storeInstanceId', 'storeRole',
  'storeRootBindingSha256', 'governanceRootIdentityReference', 'governanceRootIdentitySha256',
  'authorizationRegistryReference', 'bindingHash', 'nonce', 'receiptId',
  'storeDirectoryExistenceCheckedBeforeClaim', 'storeDirectoryAbsentBeforeClaim',
  'existingStoreDirectoryRead', 'storeDirectoryCreateAttempts', 'storeDirectoryCreates',
  'storeDirectoryCreated', 'identityFilename', 'identityWriteAttempts', 'identityWrites',
  'identityWriteAttempted', 'identityCreated', 'identityBytes', 'identitySha256',
  'identityReadbackAttempts', 'identityReadbackVerifications', 'identityReadbackMatched',
  'governanceRegistryDirectoryCreates', 'governanceRegistryIdentityWrites',
  'authorizationMarkerWrites', 'claimEnvelopeCreateAttempts', 'claimEnvelopeCreates',
  'claimStateWriteAttempts', 'claimStateWrites', 'terminalStateDurablyRecorded',
  'governanceFilesystemEffectsPresent', 'authorizationUseCount', 'authorizationConsumed',
  'authorizationReplayAllowed', 'automaticRetryPerformed', 'automaticCleanupPerformed',
  'reconciliationRequired', 'directoryEnumerations', 'recordContentReads', 'nativeReads',
  'nativeWrites', 'recordMemoryCalls', 'tombstoneMemoryCalls', 'verifyOperations',
  'rollbackOrCompensationOperations', 'realMemoryRead', 'realMemoryModified',
  'providerCalled', 'embeddingProviderCalled', 'remoteActionPerformed', 'rawMemoryReturned',
  'rawAuditReturned', 'rawPathDisclosed', 'emptyStorePreflightExecuted',
  'rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed',
  'fullPlanPackCompleted', 'readinessClaimed'
]);

const VARIANT_STATES = Object.freeze({
  identity_bound_store_bootstrap_completed: 'CONSUMED_SUCCESS',
  claim_envelope_persisted_but_acknowledgement_ambiguous: 'CLAIM_REGISTRY_AMBIGUOUS',
  claim_envelope_terminal_state_persistence_failed: 'CLAIM_REGISTRY_AMBIGUOUS',
  claim_envelope_persistence_unknown: 'CLAIM_REGISTRY_AMBIGUOUS',
  directory_attempt_state_persistence_failed: 'CLAIM_REGISTRY_AMBIGUOUS',
  directory_create_acknowledgement_ambiguous: 'CONSUMED_AMBIGUOUS',
  directory_state_persistence_failed: 'CONSUMED_AMBIGUOUS',
  identity_attempt_state_persistence_failed: 'CONSUMED_PARTIAL_BOOTSTRAP',
  identity_write_acknowledgement_ambiguous: 'CONSUMED_PARTIAL_BOOTSTRAP',
  identity_state_persistence_failed: 'CONSUMED_AMBIGUOUS',
  readback_attempt_state_persistence_failed: 'CONSUMED_AMBIGUOUS',
  identity_readback_failed: 'CONSUMED_AMBIGUOUS',
  identity_readback_mismatch: 'CONSUMED_PARTIAL_BOOTSTRAP',
  success_state_persistence_failed: 'CONSUMED_AMBIGUOUS'
});

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

function exactField(receipt, blockers, field, expected) {
  if (receipt[field] !== expected) blockers.push(`receipt.${field}`);
}

function validateVariant(receipt, blockers) {
  const expectedState = VARIANT_STATES[receipt.outcomeStage];
  if (!expectedState) {
    blockers.push('receipt.outcomeStage');
    return;
  }
  exactField(receipt, blockers, 'finalState', expectedState);
  const success = expectedState === 'CONSUMED_SUCCESS';
  exactField(receipt, blockers, 'result', success ? 'PASS' : 'STOPPED');
  exactField(receipt, blockers, 'reconciliationRequired', !success);

  const exactEffectsByStage = {
    identity_bound_store_bootstrap_completed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
      identityCreated: true, identityBytes: IDENTITY_CANONICAL_BYTES,
      identitySha256: IDENTITY_CANONICAL_SHA256, identityReadbackAttempts: 1,
      identityReadbackVerifications: 1, identityReadbackMatched: true,
      terminalStateDurablyRecorded: true
    },
    claim_envelope_persisted_but_acknowledgement_ambiguous: {
      storeDirectoryCreateAttempts: 0, storeDirectoryCreates: 0, storeDirectoryCreated: false,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false, claimEnvelopeCreates: 1, terminalStateDurablyRecorded: true
    },
    claim_envelope_persistence_unknown: {
      storeDirectoryCreateAttempts: 0, storeDirectoryCreates: 0, storeDirectoryCreated: false,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false, claimEnvelopeCreates: null, terminalStateDurablyRecorded: false
    },
    claim_envelope_terminal_state_persistence_failed: {
      storeDirectoryCreateAttempts: 0, storeDirectoryCreates: 0, storeDirectoryCreated: false,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false, claimEnvelopeCreates: 1, terminalStateDurablyRecorded: false
    },
    directory_attempt_state_persistence_failed: {
      storeDirectoryCreateAttempts: 0, storeDirectoryCreates: 0, storeDirectoryCreated: false,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false
    },
    directory_create_acknowledgement_ambiguous: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: null, storeDirectoryCreated: null,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false
    },
    directory_state_persistence_failed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false
    },
    identity_attempt_state_persistence_failed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false
    },
    identity_write_acknowledgement_ambiguous: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: null, identityWriteAttempted: true,
      identityCreated: null, identityBytes: null, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false
    },
    identity_state_persistence_failed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
      identityCreated: true, identityBytes: IDENTITY_CANONICAL_BYTES,
      identitySha256: IDENTITY_CANONICAL_SHA256, identityReadbackAttempts: 0,
      identityReadbackVerifications: 0, identityReadbackMatched: false
    },
    readback_attempt_state_persistence_failed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
      identityCreated: true, identityBytes: IDENTITY_CANONICAL_BYTES,
      identitySha256: IDENTITY_CANONICAL_SHA256, identityReadbackAttempts: 0,
      identityReadbackVerifications: 0, identityReadbackMatched: false
    },
    identity_readback_failed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
      identityCreated: true, identityBytes: IDENTITY_CANONICAL_BYTES,
      identitySha256: IDENTITY_CANONICAL_SHA256, identityReadbackAttempts: 1,
      identityReadbackVerifications: 0, identityReadbackMatched: null
    },
    identity_readback_mismatch: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
      identityCreated: true, identityBytes: null, identitySha256: null,
      identityReadbackAttempts: 1, identityReadbackVerifications: 1,
      identityReadbackMatched: false
    },
    success_state_persistence_failed: {
      storeDirectoryCreateAttempts: 1, storeDirectoryCreates: 1, storeDirectoryCreated: true,
      identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
      identityCreated: true, identityBytes: IDENTITY_CANONICAL_BYTES,
      identitySha256: IDENTITY_CANONICAL_SHA256, identityReadbackAttempts: 1,
      identityReadbackVerifications: 1, identityReadbackMatched: true
    }
  };
  for (const [field, expected] of Object.entries(exactEffectsByStage[receipt.outcomeStage])) {
    exactField(receipt, blockers, field, expected);
  }
  if (receipt.outcomeStage !== 'claim_envelope_persistence_unknown' && receipt.claimEnvelopeCreates !== 1) {
    blockers.push('receipt.claimEnvelopeCreates');
  }
  if (receipt.outcomeStage !== 'success_state_persistence_failed' &&
      receipt.outcomeStage !== 'claim_envelope_persistence_unknown' &&
      receipt.outcomeStage !== 'claim_envelope_terminal_state_persistence_failed' &&
      receipt.terminalStateDurablyRecorded !== true) blockers.push('receipt.terminalStateDurablyRecorded');
}

function evaluateCm2103BootstrapReceipt({ receipt, expectedBinding } = {}) {
  const blockers = [];
  if (!exactKeys(expectedBinding, EXPECTED_BINDING_KEYS)) blockers.push('expectedBinding.keys');
  if (!exactKeys(receipt, RECEIPT_KEYS)) blockers.push('receipt.keys');
  if (blockers.length) return {
    shapeAccepted: false,
    acceptedAsBootstrapEvidence: false,
    acceptedAsReconciliationEvidence: false,
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
    schemaVersion: 2,
    taskId: 'CM-2103-R1',
    receiptType: 'identity_bound_synthetic_store_bootstrap_receipt_union',
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
    identityFilename: IDENTITY_FILENAME,
    governanceRegistryDirectoryCreates: 0,
    governanceRegistryIdentityWrites: 0,
    authorizationMarkerWrites: 0,
    claimEnvelopeCreateAttempts: 1,
    governanceFilesystemEffectsPresent: true,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    automaticRetryPerformed: false,
    automaticCleanupPerformed: false,
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
  for (const [field, expected] of Object.entries(exact)) exactField(receipt, blockers, field, expected);
  if (!Number.isInteger(receipt.claimStateWriteAttempts) || receipt.claimStateWriteAttempts < 1 || receipt.claimStateWriteAttempts > 8) {
    blockers.push('receipt.claimStateWriteAttempts');
  }
  if (!(receipt.claimStateWrites === null && receipt.outcomeStage === 'claim_envelope_persistence_unknown') &&
      (!Number.isInteger(receipt.claimStateWrites) || receipt.claimStateWrites < 1 || receipt.claimStateWrites > 8)) {
    blockers.push('receipt.claimStateWrites');
  }
  if (Number.isInteger(receipt.claimStateWrites) && Number.isInteger(receipt.claimStateWriteAttempts) &&
      receipt.claimStateWrites > receipt.claimStateWriteAttempts) blockers.push('receipt.claimStateWriteCounts');
  if (typeof receipt.terminalStateDurablyRecorded !== 'boolean') blockers.push('receipt.terminalStateDurablyRecorded');
  validateVariant(receipt, blockers);
  const success = receipt.finalState === 'CONSUMED_SUCCESS';
  return {
    shapeAccepted: blockers.length === 0,
    acceptedAsBootstrapEvidence: blockers.length === 0 && success,
    acceptedAsReconciliationEvidence: blockers.length === 0 && !success,
    receiptVariant: blockers.length === 0 ? receipt.finalState : null,
    blockers: [...new Set(blockers)],
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
  VARIANT_STATES,
  evaluateCm2103BootstrapReceipt
};
