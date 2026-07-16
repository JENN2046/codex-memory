'use strict';

const {
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING_CANONICAL_SHA256
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256
} = require('./Cm2103IdentityBoundStoreGovernance');
const { REGISTRY_IDENTITY } = require('./Cm2103IdentityBoundStoreBootstrapRegistry');
const {
  CLAIM_EFFECT_FIELDS,
  NONTERMINAL_REENTRY,
  ORIGINAL_OUTCOME_EFFECTS,
  ORIGINAL_OUTCOME_STATES,
  TERMINAL_REENTRY_OUTCOMES,
  validOriginalTerminalEffects
} = require('./Cm2103IdentityBoundStoreBootstrapState');

const EXPECTED_BINDING_KEYS = Object.freeze([
  'authorizationContentDecisionReference', 'authorizationContentDecisionSourceCommit',
  'authorizationContentDecisionBlobOid', 'authorizationContentDecisionSha256',
  'finalExecutionReleaseDecisionReference', 'finalExecutionReleaseDecisionSourceCommit',
  'finalExecutionReleaseDecisionBlobOid', 'finalExecutionReleaseDecisionSha256',
  'executionPacketCommit', 'executionPacketBlobOid', 'executionPacketSha256',
  'foundationDecisionReference', 'foundationDecisionSourceCommit', 'foundationDecisionBlobOid',
  'foundationDecisionSha256', 'bootstrapRequestCommit', 'bootstrapRequestBlobOid',
  'bootstrapRequestSha256', 'implementationCommit', 'implementationTree', 'bindingHash',
  'nonce', 'receiptId'
]);

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'receiptType', 'result', 'finalState', 'outcomeStage',
  'authorizationContentDecisionReference', 'authorizationContentDecisionSourceCommit',
  'authorizationContentDecisionBlobOid', 'authorizationContentDecisionSha256',
  'finalExecutionReleaseDecisionReference', 'finalExecutionReleaseDecisionSourceCommit',
  'finalExecutionReleaseDecisionBlobOid', 'finalExecutionReleaseDecisionSha256',
  'executionPacketCommit', 'executionPacketBlobOid', 'executionPacketSha256',
  'foundationDecisionReference', 'foundationDecisionSourceCommit', 'foundationDecisionBlobOid',
  'foundationDecisionSha256', 'bootstrapRequestCommit', 'bootstrapRequestBlobOid',
  'bootstrapRequestSha256', 'implementationCommit', 'implementationTree', 'action',
  'lifecycleReference', 'storeReference', 'storeInstanceId', 'storeRole',
  'storeRootBindingSha256', 'governanceRootIdentityReference', 'governanceRootIdentitySha256',
  'authorizationRegistryReference', 'bindingHash', 'nonce', 'receiptId',
  'claimEnvelopePresent', 'claimEnvelopeBindingVerified',
  'receiptReconstructedFromExistingEnvelope', 'reentrySourceState',
  'storeFilesystemAccessesDuringReentry', 'storeFilesystemWritesDuringReentry',
  'storeDirectoryExistenceCheckedBeforeClaim', 'storeDirectoryAbsentBeforeClaim',
  'existingStoreDirectoryRead', 'storeDirectoryCreateAttempts', 'storeDirectoryCreates',
  'storeDirectoryCreated', 'identityFilename', 'identityWriteAttempts', 'identityWrites',
  'identityWriteAttempted', 'identityCreated', 'identityBytes', 'identitySha256',
  'identityReadbackAttempts', 'identityReadbackVerifications', 'identityReadbackMatched',
  'governanceRegistryDirectoryCreates', 'governanceRegistryIdentityWrites',
  'authorizationMarkerWrites', 'governanceFilesystemEffectAttempted',
  'claimEnvelopeCreateAttempts', 'claimEnvelopeCreates', 'claimStateWriteAttempts',
  'claimStateWrites', 'terminalStateDurablyRecorded', 'governanceFilesystemEffectsPresent',
  'authorizationUseCount', 'authorizationConsumed', 'authorizationReplayAllowed',
  'automaticRetryPerformed', 'automaticCleanupPerformed', 'reconciliationRequired',
  'directoryEnumerations', 'recordContentReads', 'nativeReads', 'nativeWrites',
  'recordMemoryCalls', 'tombstoneMemoryCalls', 'verifyOperations',
  'rollbackOrCompensationOperations', 'realMemoryRead', 'realMemoryModified',
  'providerCalled', 'embeddingProviderCalled', 'remoteActionPerformed', 'rawMemoryReturned',
  'rawAuditReturned', 'rawPathDisclosed', 'emptyStorePreflightExecuted',
  'rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed',
  'fullPlanPackCompleted', 'readinessClaimed'
]);

const NONTERMINAL_REENTRY_BY_STAGE = Object.freeze(Object.fromEntries(
  Object.entries(NONTERMINAL_REENTRY).map(([sourceState, value]) => [
    value.outcomeStage,
    Object.freeze({ sourceState, effectiveState: value.effectiveState, effects: value.effects })
  ])
));

const TERMINAL_REENTRY_BY_STAGE = Object.freeze(Object.fromEntries(
  Object.entries(TERMINAL_REENTRY_OUTCOMES).map(([state, stage]) => [
    stage,
    Object.freeze({ sourceState: state, effectiveState: state })
  ])
));

const CORRUPT_REENTRY_STAGE = 'reentry_existing_claim_unreadable_or_corrupt';

const VARIANT_STATES = Object.freeze({
  ...ORIGINAL_OUTCOME_STATES,
  ...Object.fromEntries(Object.entries(NONTERMINAL_REENTRY_BY_STAGE).map(([stage, value]) => [
    stage, value.effectiveState
  ])),
  ...Object.fromEntries(Object.entries(TERMINAL_REENTRY_BY_STAGE).map(([stage, value]) => [
    stage, value.effectiveState
  ])),
  [CORRUPT_REENTRY_STAGE]: 'CLAIM_REGISTRY_AMBIGUOUS'
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

function exactEffects(receipt, blockers, expected) {
  for (const field of CLAIM_EFFECT_FIELDS) {
    const receiptField = field === 'directoryCreateAttempts'
      ? 'storeDirectoryCreateAttempts'
      : field === 'directoryCreates'
        ? 'storeDirectoryCreates'
        : field;
    exactField(receipt, blockers, receiptField, expected[field]);
  }
}

function claimEffectsFromReceipt(receipt) {
  return Object.fromEntries(CLAIM_EFFECT_FIELDS.map(field => [
    field,
    field === 'directoryCreateAttempts'
      ? receipt.storeDirectoryCreateAttempts
      : field === 'directoryCreates'
        ? receipt.storeDirectoryCreates
        : receipt[field]
  ]));
}

function validateEnvelopeProjection(receipt, blockers) {
  const reentry = receipt.outcomeStage.startsWith('reentry_');
  exactField(receipt, blockers, 'receiptReconstructedFromExistingEnvelope', reentry);
  exactField(receipt, blockers, 'storeFilesystemAccessesDuringReentry', 0);
  exactField(receipt, blockers, 'storeFilesystemWritesDuringReentry', 0);
  exactField(receipt, blockers, 'governanceFilesystemEffectAttempted', true);

  if (![true, null].includes(receipt.claimEnvelopePresent)) blockers.push('receipt.claimEnvelopePresent');
  if (typeof receipt.claimEnvelopeBindingVerified !== 'boolean') blockers.push('receipt.claimEnvelopeBindingVerified');
  if (![true, null].includes(receipt.governanceFilesystemEffectsPresent)) {
    blockers.push('receipt.governanceFilesystemEffectsPresent');
  }
  if (receipt.governanceFilesystemEffectsPresent !== receipt.claimEnvelopePresent) {
    blockers.push('receipt.governanceFilesystemEffectPresenceCorrelation');
  }
  if (receipt.claimEnvelopeBindingVerified && receipt.claimEnvelopePresent !== true) {
    blockers.push('receipt.claimEnvelopeBindingVerified');
  }

  if (reentry) {
    if (receipt.outcomeStage === CORRUPT_REENTRY_STAGE) {
      exactField(receipt, blockers, 'claimEnvelopeBindingVerified', false);
      exactField(receipt, blockers, 'reentrySourceState', null);
      if (![true, null].includes(receipt.claimEnvelopePresent)) blockers.push('receipt.claimEnvelopePresent');
      exactField(receipt, blockers, 'storeDirectoryExistenceCheckedBeforeClaim', null);
      exactField(receipt, blockers, 'storeDirectoryAbsentBeforeClaim', null);
    } else {
      exactField(receipt, blockers, 'claimEnvelopePresent', true);
      exactField(receipt, blockers, 'claimEnvelopeBindingVerified', true);
      exactField(receipt, blockers, 'storeDirectoryExistenceCheckedBeforeClaim', true);
      exactField(receipt, blockers, 'storeDirectoryAbsentBeforeClaim', true);
    }
  } else {
    exactField(receipt, blockers, 'reentrySourceState', null);
    exactField(receipt, blockers, 'storeDirectoryExistenceCheckedBeforeClaim', true);
    exactField(receipt, blockers, 'storeDirectoryAbsentBeforeClaim', true);
    if (receipt.outcomeStage === 'claim_envelope_persistence_unknown') {
      exactField(receipt, blockers, 'claimEnvelopePresent', null);
      exactField(receipt, blockers, 'claimEnvelopeBindingVerified', false);
      exactField(receipt, blockers, 'governanceFilesystemEffectsPresent', null);
    } else {
      exactField(receipt, blockers, 'claimEnvelopePresent', true);
      exactField(receipt, blockers, 'claimEnvelopeBindingVerified', true);
    }
  }
  exactField(receipt, blockers, 'existingStoreDirectoryRead', false);
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

  if (ORIGINAL_OUTCOME_EFFECTS[receipt.outcomeStage]) {
    exactEffects(receipt, blockers, ORIGINAL_OUTCOME_EFFECTS[receipt.outcomeStage]);
  } else if (NONTERMINAL_REENTRY_BY_STAGE[receipt.outcomeStage]) {
    const expected = NONTERMINAL_REENTRY_BY_STAGE[receipt.outcomeStage];
    exactField(receipt, blockers, 'reentrySourceState', expected.sourceState);
    exactEffects(receipt, blockers, expected.effects);
    exactField(receipt, blockers, 'terminalStateDurablyRecorded', false);
  } else if (TERMINAL_REENTRY_BY_STAGE[receipt.outcomeStage]) {
    const expected = TERMINAL_REENTRY_BY_STAGE[receipt.outcomeStage];
    exactField(receipt, blockers, 'reentrySourceState', expected.sourceState);
    exactField(receipt, blockers, 'terminalStateDurablyRecorded', true);
    if (!validOriginalTerminalEffects({
      state: receipt.finalState,
      ...claimEffectsFromReceipt(receipt)
    })) blockers.push('receipt.reentryTerminalEffects');
  } else if (receipt.outcomeStage === CORRUPT_REENTRY_STAGE) {
    exactEffects(receipt, blockers, Object.fromEntries(CLAIM_EFFECT_FIELDS.map(field => [field, null])));
    exactField(receipt, blockers, 'terminalStateDurablyRecorded', false);
  }

  const allowedTerminalDurability = new Set([
    'success_state_persistence_failed',
    'claim_envelope_persistence_unknown',
    'claim_envelope_terminal_state_persistence_failed'
  ]);
  const terminalDoubleFailure = /_state_persistence_failed$/.test(receipt.outcomeStage) &&
    Number.isInteger(receipt.claimStateWriteAttempts) && Number.isInteger(receipt.claimStateWrites) &&
    receipt.claimStateWriteAttempts - receipt.claimStateWrites >= 2;
  if (ORIGINAL_OUTCOME_EFFECTS[receipt.outcomeStage] &&
      !allowedTerminalDurability.has(receipt.outcomeStage) &&
      !terminalDoubleFailure &&
      receipt.terminalStateDurablyRecorded !== true) {
    blockers.push('receipt.terminalStateDurablyRecorded');
  }

  if (receipt.outcomeStage === 'claim_envelope_persistence_unknown' ||
      receipt.outcomeStage === CORRUPT_REENTRY_STAGE) {
    if (receipt.claimEnvelopeCreates !== null) blockers.push('receipt.claimEnvelopeCreates');
  } else if (receipt.claimEnvelopeCreates !== 1) {
    blockers.push('receipt.claimEnvelopeCreates');
  }
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

  for (const field of [
    'authorizationContentDecisionReference', 'finalExecutionReleaseDecisionReference',
    'foundationDecisionReference', 'nonce', 'receiptId'
  ]) {
    if (!nonempty(expectedBinding[field])) blockers.push(`expectedBinding.${field}`);
  }
  for (const field of [
    'authorizationContentDecisionSourceCommit', 'authorizationContentDecisionBlobOid',
    'finalExecutionReleaseDecisionSourceCommit', 'finalExecutionReleaseDecisionBlobOid',
    'executionPacketCommit', 'executionPacketBlobOid',
    'foundationDecisionSourceCommit', 'foundationDecisionBlobOid', 'bootstrapRequestCommit',
    'bootstrapRequestBlobOid', 'implementationCommit', 'implementationTree'
  ]) if (!hash(expectedBinding[field], 40)) blockers.push(`expectedBinding.${field}`);
  for (const field of [
    'authorizationContentDecisionSha256', 'finalExecutionReleaseDecisionSha256',
    'executionPacketSha256', 'foundationDecisionSha256',
    'bootstrapRequestSha256', 'bindingHash'
  ]) if (!hash(expectedBinding[field], 64)) blockers.push(`expectedBinding.${field}`);

  const exact = {
    schemaVersion: 4,
    taskId: 'CM-2104',
    receiptType: 'identity_bound_synthetic_store_bootstrap_two_stage_authorized_receipt_union',
    authorizationContentDecisionReference: expectedBinding.authorizationContentDecisionReference,
    authorizationContentDecisionSourceCommit: expectedBinding.authorizationContentDecisionSourceCommit,
    authorizationContentDecisionBlobOid: expectedBinding.authorizationContentDecisionBlobOid,
    authorizationContentDecisionSha256: expectedBinding.authorizationContentDecisionSha256,
    finalExecutionReleaseDecisionReference: expectedBinding.finalExecutionReleaseDecisionReference,
    finalExecutionReleaseDecisionSourceCommit: expectedBinding.finalExecutionReleaseDecisionSourceCommit,
    finalExecutionReleaseDecisionBlobOid: expectedBinding.finalExecutionReleaseDecisionBlobOid,
    finalExecutionReleaseDecisionSha256: expectedBinding.finalExecutionReleaseDecisionSha256,
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
    identityFilename: IDENTITY_FILENAME,
    governanceRegistryDirectoryCreates: 0,
    governanceRegistryIdentityWrites: 0,
    authorizationMarkerWrites: 0,
    claimEnvelopeCreateAttempts: 1,
    governanceFilesystemEffectAttempted: true,
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

  if (!(receipt.claimStateWriteAttempts === null ||
      (Number.isInteger(receipt.claimStateWriteAttempts) && receipt.claimStateWriteAttempts >= 1 &&
       receipt.claimStateWriteAttempts <= 10))) {
    blockers.push('receipt.claimStateWriteAttempts');
  }
  if (!(receipt.claimStateWrites === null ||
      (Number.isInteger(receipt.claimStateWrites) && receipt.claimStateWrites >= 1 &&
       receipt.claimStateWrites <= 10))) {
    blockers.push('receipt.claimStateWrites');
  }
  if (Number.isInteger(receipt.claimStateWrites) && Number.isInteger(receipt.claimStateWriteAttempts) &&
      receipt.claimStateWrites > receipt.claimStateWriteAttempts) blockers.push('receipt.claimStateWriteCounts');
  if (typeof receipt.terminalStateDurablyRecorded !== 'boolean') {
    blockers.push('receipt.terminalStateDurablyRecorded');
  }

  validateEnvelopeProjection(receipt, blockers);
  validateVariant(receipt, blockers);

  const success = receipt.finalState === 'CONSUMED_SUCCESS';
  return {
    shapeAccepted: blockers.length === 0,
    acceptedAsBootstrapEvidence: blockers.length === 0 && success &&
      receipt.claimEnvelopeBindingVerified === true,
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
  CORRUPT_REENTRY_STAGE,
  EXPECTED_BINDING_KEYS,
  NONTERMINAL_REENTRY_BY_STAGE,
  RECEIPT_KEYS,
  TERMINAL_REENTRY_BY_STAGE,
  VARIANT_STATES,
  evaluateCm2103BootstrapReceipt
};
