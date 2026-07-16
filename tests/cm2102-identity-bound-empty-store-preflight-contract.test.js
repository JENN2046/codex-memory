'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY
} = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  evaluateCm2102EmptyStorePreflightReceiptShape
} = require('../src/core/Cm2102IdentityBoundEmptyStorePreflightContract');

const expectedBinding = Object.freeze({
  preflightDecisionReference: 'CM-TEST-CM2102-PREFLIGHT',
  preflightDecisionCommit: '1'.repeat(40),
  preflightDecisionBlobOid: '2'.repeat(40),
  preflightDecisionSha256: '3'.repeat(64),
  bootstrapDecisionReference: 'CM-TEST-CM2102-BOOTSTRAP',
  bootstrapDecisionCommit: '4'.repeat(40),
  bootstrapDecisionBlobOid: '5'.repeat(40),
  bootstrapDecisionSha256: '6'.repeat(64),
  bootstrapReceiptReviewReference: 'CM-TEST-CM2102-BOOTSTRAP-RECEIPT',
  bootstrapReceiptCommit: '7'.repeat(40),
  bootstrapReceiptSha256: '8'.repeat(64),
  storeRootBindingSha256: '9'.repeat(64)
});

function buildReceipt() {
  return {
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
}

test('CM-2102 empty-store preflight contract accepts only the exact future receipt shape', () => {
  const result = evaluateCm2102EmptyStorePreflightReceiptShape({ receipt: buildReceipt(), expectedBinding });
  assert.equal(result.shapeAccepted, true, result.blockers.join(', '));
  assert.equal(result.storeIdentityMatched, true);
  assert.equal(result.syntheticStoreEmpty, true);
  assert.equal(result.preflightAuthorizedByThisContract, false);
  assert.equal(result.preflightExecutedByThisContract, false);
  assert.equal(result.acceptedAsExecutionEvidenceNow, false);
  assert.equal(result.nativeActionsPerformedByThisContract, 0);
  assert.equal(result.rawMemoryReturned, false);
  assert.equal(result.rawPathDisclosed, false);
});

test('CM-2102 empty-store preflight contract fails closed on read, write, provider, replay, or overclaim drift', () => {
  const drifts = [
    { unexpectedCapability: true },
    { observedMarkdownCount: 1 },
    { unexpectedEntries: 1 },
    { identitySha256: '0'.repeat(64) },
    { preflightAuthorizationReplayAllowed: true },
    { bootstrapReceiptReviewPassed: false },
    { nativeReadDelegationMode: 'primary' },
    { nativeReadCalls: 1 },
    { nativeWritePerformed: true },
    { recordMemoryCalls: 1 },
    { tombstoneMemoryCalls: 1 },
    { verifyOperations: 1 },
    { recordContentReadOperations: 1 },
    { realMemoryRead: true },
    { realMemoryModified: true },
    { providerCalled: true },
    { embeddingProviderCalled: true },
    { localFallbackUsed: true },
    { rawMemoryReturned: true },
    { rawAuditReturned: true },
    { rawPathDisclosed: true },
    { readinessClaimed: true },
    { rollbackDrillPassed: true },
    { phase8Completed: true }
  ];
  for (const drift of drifts) {
    const result = evaluateCm2102EmptyStorePreflightReceiptShape({
      receipt: { ...buildReceipt(), ...drift },
      expectedBinding
    });
    assert.equal(result.shapeAccepted, false, JSON.stringify(drift));
    assert.equal(result.preflightAuthorizedByThisContract, false);
    assert.equal(result.preflightExecutedByThisContract, false);
    assert.equal(result.acceptedAsExecutionEvidenceNow, false);
  }
});

test('CM-2102 empty-store preflight contract rejects incomplete or malformed decision lineage', () => {
  for (const binding of [
    { ...expectedBinding, unexpected: true },
    { ...expectedBinding, preflightDecisionCommit: 'bad' },
    { ...expectedBinding, bootstrapReceiptSha256: '0' },
    { ...expectedBinding, storeRootBindingSha256: '' }
  ]) {
    const result = evaluateCm2102EmptyStorePreflightReceiptShape({ receipt: buildReceipt(), expectedBinding: binding });
    assert.equal(result.shapeAccepted, false);
    assert.equal(result.acceptedAsExecutionEvidenceNow, false);
  }
});
