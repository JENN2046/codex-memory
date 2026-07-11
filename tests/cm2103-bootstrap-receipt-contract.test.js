'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCm2103BootstrapReceipt } = require('../src/cli/cm2103-identity-bound-store-bootstrap');
const { evaluateCm2103BootstrapReceipt } = require('../src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract');

const packet = Object.freeze({
  foundationDecisionReference: 'CM-2102-TEST',
  foundationDecisionSourceCommit: '1'.repeat(40),
  foundationDecisionBlobOid: '2'.repeat(40),
  foundationDecisionSha256: '3'.repeat(64),
  bootstrapRequestSourceCommit: '4'.repeat(40),
  bootstrapRequestBlobOid: '5'.repeat(40),
  bootstrapRequestSha256: '6'.repeat(64),
  implementationCommit: '7'.repeat(40),
  implementationTree: '8'.repeat(40),
  action: 'initialize_identity_bound_synthetic_store',
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  storeReference: 'phase8-identity-bound-synthetic-rollback-store-001',
  storeInstanceId: 'phase8-identity-bound-synthetic-rollback-store-instance-001',
  storeRole: 'phase8_identity_bound_synthetic_rollback_store',
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
  governanceRootIdentity: { registryRootReference: 'codex-memory-phase8-governance-root' },
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  authorizationRegistryIdentity: { authorizationRegistryReference: 'cm2103-identity-bound-store-bootstrap-registry-001' },
  nonce: 'cm2102-identity-bound-store-bootstrap-001',
  receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001'
});

const executionPacketCommit = '9'.repeat(40);
const executionPacketBlobOid = 'a'.repeat(40);
const executionPacketBytes = Buffer.from('packet');
const bindingHash = 'b'.repeat(64);
const observedDecision = Object.freeze({
  decision: { decisionReference: 'CM-2103-TEST-BOOTSTRAP' },
  sourceCommit: 'c'.repeat(40),
  blobOid: 'd'.repeat(40),
  sha256: 'e'.repeat(64)
});

function baseClaim(overrides = {}) {
  return {
    state: 'CONSUMED_SUCCESS',
    directoryCreateAttempts: 1,
    directoryCreates: 1,
    storeDirectoryCreated: true,
    identityWriteAttempts: 1,
    identityWrites: 1,
    identityWriteAttempted: true,
    identityCreated: true,
    identityBytes: 633,
    identitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
    identityReadbackAttempts: 1,
    identityReadbackVerifications: 1,
    identityReadbackMatched: true,
    governanceRegistryDirectoryCreates: 0,
    governanceRegistryIdentityWrites: 0,
    authorizationMarkerWrites: 0,
    claimEnvelopeCreateAttempts: 1,
    claimEnvelopeCreates: 1,
    claimStateWriteAttempts: 7,
    claimStateWrites: 7,
    terminalStateDurablyRecorded: true,
    ...overrides
  };
}

function buildReceipt(outcomeStage, overrides = {}) {
  return buildCm2103BootstrapReceipt({
    packet,
    observedDecision,
    executionPacketCommit,
    executionPacketBlobOid,
    executionPacketBytes,
    bindingHash,
    outcomeStage,
    claim: baseClaim(overrides)
  });
}

function expectedBinding(receipt) {
  return {
    decisionReference: receipt.decisionReference,
    decisionSourceCommit: receipt.decisionSourceCommit,
    decisionBlobOid: receipt.decisionBlobOid,
    decisionSha256: receipt.decisionSha256,
    executionPacketCommit: receipt.executionPacketCommit,
    executionPacketBlobOid: receipt.executionPacketBlobOid,
    executionPacketSha256: receipt.executionPacketSha256,
    foundationDecisionReference: receipt.foundationDecisionReference,
    foundationDecisionSourceCommit: receipt.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: receipt.foundationDecisionBlobOid,
    foundationDecisionSha256: receipt.foundationDecisionSha256,
    bootstrapRequestCommit: receipt.bootstrapRequestCommit,
    bootstrapRequestBlobOid: receipt.bootstrapRequestBlobOid,
    bootstrapRequestSha256: receipt.bootstrapRequestSha256,
    implementationCommit: receipt.implementationCommit,
    implementationTree: receipt.implementationTree,
    bindingHash: receipt.bindingHash,
    nonce: receipt.nonce,
    receiptId: receipt.receiptId
  };
}

function evaluate(receipt) {
  return evaluateCm2103BootstrapReceipt({ receipt, expectedBinding: expectedBinding(receipt) });
}

test('CM-2103 R1 contract accepts the exact success receipt only as bootstrap evidence', () => {
  const result = evaluate(buildReceipt('identity_bound_store_bootstrap_completed'));
  assert.equal(result.shapeAccepted, true, result.blockers.join(', '));
  assert.equal(result.acceptedAsBootstrapEvidence, true);
  assert.equal(result.acceptedAsReconciliationEvidence, false);
  assert.equal(result.receiptVariant, 'CONSUMED_SUCCESS');
  assert.equal(result.bootstrapExecutedByThisContract, false);
});

test('CM-2103 R1 contract accepts partial and ambiguous receipts only as reconciliation evidence', () => {
  const receipts = [
    buildReceipt('claim_envelope_persisted_but_acknowledgement_ambiguous', {
      state: 'CLAIM_REGISTRY_AMBIGUOUS',
      directoryCreateAttempts: 0, directoryCreates: 0, storeDirectoryCreated: false,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false, claimStateWriteAttempts: 2, claimStateWrites: 2
    }),
    buildReceipt('identity_write_acknowledgement_ambiguous', {
      state: 'CONSUMED_PARTIAL_BOOTSTRAP',
      identityWrites: null, identityCreated: null, identityBytes: null, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false, claimStateWriteAttempts: 5, claimStateWrites: 5
    }),
    buildReceipt('directory_create_acknowledgement_ambiguous', {
      state: 'CONSUMED_AMBIGUOUS', directoryCreates: null, storeDirectoryCreated: null,
      identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
      identityCreated: false, identityBytes: 0, identitySha256: null,
      identityReadbackAttempts: 0, identityReadbackVerifications: 0,
      identityReadbackMatched: false, claimStateWriteAttempts: 3, claimStateWrites: 3
    })
  ];
  for (const receipt of receipts) {
    const result = evaluate(receipt);
    assert.equal(result.shapeAccepted, true, `${receipt.outcomeStage}: ${result.blockers.join(', ')}`);
    assert.equal(result.acceptedAsBootstrapEvidence, false);
    assert.equal(result.acceptedAsReconciliationEvidence, true);
  }
  assert.equal(receipts[1].identityCreated, null);
  assert.equal(receipts[2].storeDirectoryCreated, null);
});

test('CM-2103 R1 union rejects unknown-to-false collapse, counter drift, retry, cleanup, native effects, or overclaims', () => {
  const base = buildReceipt('identity_write_acknowledgement_ambiguous', {
    state: 'CONSUMED_PARTIAL_BOOTSTRAP', identityWrites: null, identityCreated: null,
    identityBytes: null, identitySha256: null, identityReadbackAttempts: 0,
    identityReadbackVerifications: 0, identityReadbackMatched: false,
    claimStateWriteAttempts: 5, claimStateWrites: 5
  });
  const drifts = [
    { unexpected: true },
    { identityCreated: false },
    { identityBytes: 0 },
    { claimEnvelopeCreates: 2 },
    { governanceRegistryDirectoryCreates: 1 },
    { authorizationMarkerWrites: 1 },
    { authorizationReplayAllowed: true },
    { automaticRetryPerformed: true },
    { automaticCleanupPerformed: true },
    { nativeWrites: 1 },
    { recordMemoryCalls: 1 },
    { rawPathDisclosed: true },
    { emptyStorePreflightExecuted: true },
    { rollbackDrillPassed: true },
    { phase8Completed: true },
    { readinessClaimed: true }
  ];
  for (const drift of drifts) {
    const result = evaluate({ ...base, ...drift });
    assert.equal(result.shapeAccepted, false, JSON.stringify(drift));
    assert.equal(result.acceptedAsBootstrapEvidence, false);
    assert.equal(result.acceptedAsReconciliationEvidence, false);
  }
});
