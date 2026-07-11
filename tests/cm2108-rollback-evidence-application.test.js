'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BASELINE,
  DECISION,
  SOURCE_RECEIPT,
  evaluateApplicationReceipt,
  evaluateDecision,
  executeRollbackEvidenceApplication,
  sha256Canonical
} = require('../src/core/Cm2108RollbackEvidenceApplication');

const DOCS = path.join(__dirname, '../docs/near-model-memory-plan-pack');
const decision = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_rollback_evidence_application_decision_cm2108.json'), 'utf8'));
const sourceReceipt = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_identity_bound_tombstone_execution_receipt_cm2107.json'), 'utf8'));

function input() {
  return {
    decision: structuredClone(decision),
    sourceReceipt: structuredClone(sourceReceipt),
    bindings: {
      decisionCommit: DECISION.commit,
      decisionBlobOid: DECISION.blobOid,
      decisionBytes: DECISION.bytes,
      decisionSha256: DECISION.rawSha256,
      sourceReceiptCommit: SOURCE_RECEIPT.commit,
      sourceReceiptTree: SOURCE_RECEIPT.tree,
      sourceReceiptBlobOid: SOURCE_RECEIPT.blobOid,
      sourceReceiptBytes: SOURCE_RECEIPT.bytes,
      sourceReceiptSha256: SOURCE_RECEIPT.rawSha256,
      sourceReceiptPayloadSha256: SOURCE_RECEIPT.payloadSha256
    },
    baseline: {
      completionAuditBlobOid: BASELINE.completionAuditBlobOid,
      traceMatrixBlobOid: BASELINE.traceMatrixBlobOid,
      completionAuditWorktreeMatchesHead: true,
      traceMatrixWorktreeMatchesHead: true,
      applicationReceiptAbsent: true,
      rollbackDrillPassed: false,
      failureRecoveryProofPassed: false,
      phase8Completed: false
    },
    runtimeFacts: { clean: true, commit: '1'.repeat(40), tree: '2'.repeat(40) }
  };
}

test('CM-2108 exact self-governed decision is accepted only after Git freeze', () => {
  const result = evaluateDecision(decision);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(sha256Canonical(decision), DECISION.payloadSha256);
});

test('CM-2108 applies only rollbackDrillPassed and keeps Phase 8 incomplete', () => {
  const result = executeRollbackEvidenceApplication(input());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(result.appliedEvidence, {
    rollbackDrillPassed: true,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  });
  assert.equal(result.receiptPayload.applicationCounters.tombstoneMemoryCalls, 0);
  assert.equal(result.receiptPayload.applicationCounters.verifyOperations, 0);
  assert.equal(result.additionalNativeActionAuthorized, false);
  const receipt = { receiptPayload: result.receiptPayload, receiptPayloadSha256: result.receiptPayloadSha256 };
  assert.equal(evaluateApplicationReceipt(receipt).accepted, true);
});

test('CM-2108 frozen application receipt matches the accepted one-shot result', () => {
  const receipt = JSON.parse(fs.readFileSync(path.join(
    DOCS,
    'phase8_rollback_evidence_application_receipt_cm2108.json'
  ), 'utf8'));
  const result = evaluateApplicationReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.rollbackDrillPassed, true);
  assert.equal(result.failureRecoveryProofPassed, false);
  assert.equal(result.phase8Completed, false);
});

test('CM-2108 fails closed on decision, receipt, baseline, replay, or overclaim drift', () => {
  const cases = [
    value => { value.decision.allowedPatch.phase8Completed = true; },
    value => { value.bindings.sourceReceiptSha256 = 'f'.repeat(64); },
    value => { value.sourceReceipt.rollbackLifecycleProjectionTargetCount = 1; value.sourceReceipt.receiptPayloadSha256 = '0'.repeat(64); },
    value => { value.baseline.rollbackDrillPassed = true; },
    value => { value.baseline.applicationReceiptAbsent = false; },
    value => { value.runtimeFacts.clean = false; }
  ];
  for (const mutate of cases) {
    const value = input();
    mutate(value);
    assert.equal(executeRollbackEvidenceApplication(value).accepted, false);
  }
});

test('CM-2108 receipt contract rejects replay, native side effects, or completion overclaim', () => {
  const result = executeRollbackEvidenceApplication(input());
  for (const mutate of [
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.applicationCounters.nativeWrites = 1; },
    payload => { payload.appliedEvidence.failureRecoveryProofPassed = true; },
    payload => { payload.appliedEvidence.phase8Completed = true; }
  ]) {
    const payload = structuredClone(result.receiptPayload);
    mutate(payload);
    const receipt = { receiptPayload: payload, receiptPayloadSha256: sha256Canonical(payload) };
    assert.equal(evaluateApplicationReceipt(receipt).accepted, false);
  }
});
