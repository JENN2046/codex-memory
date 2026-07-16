'use strict';

const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');

const EXPECTED_BINDING_KEYS = Object.freeze([
  'preflightDecisionReference',
  'preflightDecisionCommit',
  'preflightDecisionBlobOid',
  'preflightDecisionSha256',
  'bootstrapDecisionReference',
  'bootstrapDecisionCommit',
  'bootstrapDecisionBlobOid',
  'bootstrapDecisionSha256',
  'bootstrapReceiptReviewReference',
  'bootstrapReceiptCommit',
  'bootstrapReceiptSha256',
  'storeRootBindingSha256'
]);

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion',
  'taskId',
  'receiptType',
  'result',
  'stage',
  'lifecycleReference',
  'storeReference',
  'storeInstanceId',
  'storeRole',
  'storeRootBindingSha256',
  'identityFilename',
  'identityBytes',
  'identitySha256',
  'preflightDecisionReference',
  'preflightDecisionCommit',
  'preflightDecisionBlobOid',
  'preflightDecisionSha256',
  'preflightAuthorizationUseCount',
  'preflightAuthorizationConsumed',
  'preflightAuthorizationReplayAllowed',
  'bootstrapDecisionReference',
  'bootstrapDecisionCommit',
  'bootstrapDecisionBlobOid',
  'bootstrapDecisionSha256',
  'bootstrapReceiptReviewReference',
  'bootstrapReceiptCommit',
  'bootstrapReceiptSha256',
  'bootstrapReceiptReviewPassed',
  'storeIdentityMatched',
  'syntheticStoreEmpty',
  'observedMarkdownCount',
  'unexpectedEntries',
  'identityReadOperations',
  'directoryEnumerationOperations',
  'recordContentReadOperations',
  'nativeReadDelegationMode',
  'nativeReadCalls',
  'nativeWritePerformed',
  'recordMemoryCalls',
  'tombstoneMemoryCalls',
  'verifyOperations',
  'realMemoryRead',
  'realMemoryModified',
  'providerCalled',
  'embeddingProviderCalled',
  'localFallbackUsed',
  'rawMemoryReturned',
  'rawAuditReturned',
  'rawPathDisclosed',
  'readinessClaimed',
  'rollbackDrillPassed',
  'phase8Completed'
]);

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hash40(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
}

function hash64(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function evaluateCm2102EmptyStorePreflightReceiptShape({ receipt, expectedBinding } = {}) {
  const blockers = [];
  if (!exactKeys(expectedBinding, EXPECTED_BINDING_KEYS)) blockers.push('expectedBinding.keys');
  if (!exactKeys(receipt, RECEIPT_KEYS)) blockers.push('receipt.keys');
  if (blockers.length) return {
    shapeAccepted: false,
    blockers,
    preflightAuthorizedByThisContract: false,
    preflightExecutedByThisContract: false,
    acceptedAsExecutionEvidenceNow: false
  };
  for (const field of ['preflightDecisionReference', 'bootstrapDecisionReference', 'bootstrapReceiptReviewReference']) {
    if (!nonempty(expectedBinding[field])) blockers.push(`expectedBinding.${field}`);
  }
  for (const field of ['preflightDecisionCommit', 'preflightDecisionBlobOid', 'bootstrapDecisionCommit', 'bootstrapDecisionBlobOid', 'bootstrapReceiptCommit']) {
    if (!hash40(expectedBinding[field])) blockers.push(`expectedBinding.${field}`);
  }
  for (const field of ['preflightDecisionSha256', 'bootstrapDecisionSha256', 'bootstrapReceiptSha256', 'storeRootBindingSha256']) {
    if (!hash64(expectedBinding[field])) blockers.push(`expectedBinding.${field}`);
  }
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2102',
    receiptType: 'identity_bound_synthetic_store_empty_preflight_receipt',
    result: 'accepted',
    stage: 'pre_record_write',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    storeRootBindingSha256: expectedBinding.storeRootBindingSha256,
    identityFilename: IDENTITY_FILENAME,
    identityBytes: IDENTITY_CANONICAL_BYTES,
    identitySha256: IDENTITY_CANONICAL_SHA256,
    preflightDecisionReference: expectedBinding.preflightDecisionReference,
    preflightDecisionCommit: expectedBinding.preflightDecisionCommit,
    preflightDecisionBlobOid: expectedBinding.preflightDecisionBlobOid,
    preflightDecisionSha256: expectedBinding.preflightDecisionSha256,
    preflightAuthorizationUseCount: 1,
    preflightAuthorizationConsumed: true,
    preflightAuthorizationReplayAllowed: false,
    bootstrapDecisionReference: expectedBinding.bootstrapDecisionReference,
    bootstrapDecisionCommit: expectedBinding.bootstrapDecisionCommit,
    bootstrapDecisionBlobOid: expectedBinding.bootstrapDecisionBlobOid,
    bootstrapDecisionSha256: expectedBinding.bootstrapDecisionSha256,
    bootstrapReceiptReviewReference: expectedBinding.bootstrapReceiptReviewReference,
    bootstrapReceiptCommit: expectedBinding.bootstrapReceiptCommit,
    bootstrapReceiptSha256: expectedBinding.bootstrapReceiptSha256,
    bootstrapReceiptReviewPassed: true,
    storeIdentityMatched: true,
    syntheticStoreEmpty: true,
    observedMarkdownCount: 0,
    unexpectedEntries: 0,
    identityReadOperations: 1,
    directoryEnumerationOperations: 1,
    recordContentReadOperations: 0,
    nativeReadDelegationMode: 'off',
    nativeReadCalls: 0,
    nativeWritePerformed: false,
    recordMemoryCalls: 0,
    tombstoneMemoryCalls: 0,
    verifyOperations: 0,
    realMemoryRead: false,
    realMemoryModified: false,
    providerCalled: false,
    embeddingProviderCalled: false,
    localFallbackUsed: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawPathDisclosed: false,
    readinessClaimed: false,
    rollbackDrillPassed: false,
    phase8Completed: false
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (receipt[field] !== expected) blockers.push(`receipt.${field}`);
  }
  return {
    shapeAccepted: blockers.length === 0,
    blockers,
    storeIdentityMatched: blockers.length === 0,
    syntheticStoreEmpty: blockers.length === 0,
    preflightAuthorizedByThisContract: false,
    preflightExecutedByThisContract: false,
    acceptedAsExecutionEvidenceNow: false,
    nativeActionsPerformedByThisContract: 0,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

module.exports = {
  EXPECTED_BINDING_KEYS,
  RECEIPT_KEYS,
  evaluateCm2102EmptyStorePreflightReceiptShape
};
