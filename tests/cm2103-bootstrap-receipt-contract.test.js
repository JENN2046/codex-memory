'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCm2103BootstrapReceipt
} = require('../src/cli/cm2103-identity-bound-store-bootstrap');
const {
  evaluateCm2103BootstrapReceipt
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract');

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

function buildReceipt() {
  return buildCm2103BootstrapReceipt({
    packet,
    observedDecision,
    executionPacketCommit,
    executionPacketBlobOid,
    executionPacketBytes,
    bindingHash,
    claim: {
      state: 'CONSUMED_SUCCESS',
      directoryCreateAttempts: 1,
      directoryCreates: 1,
      identityWriteAttempts: 1,
      identityWrites: 1,
      identityReadbackVerifications: 1
    }
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

test('CM-2103 receipt contract accepts only the exact low-disclosure success receipt', () => {
  const receipt = buildReceipt();
  const result = evaluateCm2103BootstrapReceipt({ receipt, expectedBinding: expectedBinding(receipt) });
  assert.equal(result.shapeAccepted, true, result.blockers.join(', '));
  assert.equal(result.acceptedAsBootstrapEvidence, true);
  assert.equal(result.bootstrapExecutedByThisContract, false);
  assert.equal(result.emptyStorePreflightAuthorizedByThisContract, false);
  assert.equal(result.nativeActionsPerformedByThisContract, 0);
});

test('CM-2103 receipt contract rejects counter, replay, read, native, cleanup, path, or completion drift', () => {
  const base = buildReceipt();
  const drifts = [
    { extra: true },
    { storeDirectoryCreateAttempts: 2 },
    { identityWrites: 0 },
    { authorizationReplayAllowed: true },
    { automaticRetryPerformed: true },
    { automaticCleanupPerformed: true },
    { directoryEnumerations: 1 },
    { recordContentReads: 1 },
    { nativeReads: 1 },
    { nativeWrites: 1 },
    { recordMemoryCalls: 1 },
    { tombstoneMemoryCalls: 1 },
    { verifyOperations: 1 },
    { realMemoryRead: true },
    { providerCalled: true },
    { rawPathDisclosed: true },
    { emptyStorePreflightExecuted: true },
    { rollbackDrillPassed: true },
    { phase8Completed: true },
    { readinessClaimed: true }
  ];
  for (const drift of drifts) {
    const receipt = { ...base, ...drift };
    const result = evaluateCm2103BootstrapReceipt({ receipt, expectedBinding: expectedBinding(base) });
    assert.equal(result.acceptedAsBootstrapEvidence, false, JSON.stringify(drift));
    assert.equal(result.bootstrapExecutedByThisContract, false);
  }
});
