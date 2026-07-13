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
  executeFailureRecoveryEvidenceApplication,
  sha256Canonical
} = require('../src/core/Cm2110FailureRecoveryEvidenceApplication');

const DOCS = path.join(__dirname, '../docs/near-model-memory-plan-pack');
const decision = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_failure_recovery_evidence_application_decision_cm2110.json'), 'utf8'));
const sourceReceipt = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_failure_recovery_execution_receipt_cm2109.json'), 'utf8'));

function input() {
  return {
    decision: structuredClone(decision),
    sourceReceipt: structuredClone(sourceReceipt),
    bindings: { decisionCommit: DECISION.commit, decisionBlobOid: DECISION.blobOid, decisionBytes: DECISION.bytes, decisionSha256: DECISION.rawSha256, sourceReceiptCommit: SOURCE_RECEIPT.commit, sourceReceiptTree: SOURCE_RECEIPT.tree, sourceReceiptBlobOid: SOURCE_RECEIPT.blobOid, sourceReceiptBytes: SOURCE_RECEIPT.bytes, sourceReceiptSha256: SOURCE_RECEIPT.rawSha256, sourceReceiptPayloadSha256: SOURCE_RECEIPT.payloadSha256 },
    baseline: { completionAuditBlobOid: BASELINE.completionAuditBlobOid, traceMatrixBlobOid: BASELINE.traceMatrixBlobOid, completionAuditWorktreeMatchesHead: true, traceMatrixWorktreeMatchesHead: true, applicationReceiptAbsent: true, rollbackDrillPassed: true, failureRecoveryProofPassed: false, phase8Completed: false },
    runtimeFacts: { clean: true, commit: '1'.repeat(40), tree: '2'.repeat(40) }
  };
}

test('CM-2110 exact decision and source receipt authorize only failure-recovery application', () => {
  assert.equal(evaluateDecision(decision).accepted, true);
  const result = executeFailureRecoveryEvidenceApplication(input());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(result.appliedEvidence, { rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: false, fullPlanPackCompleted: false, readinessClaimed: false });
  assert.equal(result.receiptPayload.applicationCounters.failureInjectionExecutions, 0);
  assert.equal(result.additionalNativeActionAuthorized, false);
  assert.equal(evaluateApplicationReceipt({ receiptPayload: result.receiptPayload, receiptPayloadSha256: result.receiptPayloadSha256 }).accepted, true);
});

test('CM-2110 frozen application receipt matches the accepted one-shot result', () => {
  const receipt = JSON.parse(fs.readFileSync(path.join(
    DOCS,
    'phase8_failure_recovery_evidence_application_receipt_cm2110.json'
  ), 'utf8'));
  const result = evaluateApplicationReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.failureRecoveryProofPassed, true);
  assert.equal(result.phase8Completed, false);
});

test('CM-2110 fails closed on receipt, rollback baseline, replay, side effect, or phase overclaim drift', () => {
  for (const mutate of [
    value => { value.sourceReceipt.receiptPayload.caseResults[2].retryCount = 1; value.sourceReceipt.receiptPayloadSha256 = '0'.repeat(64); },
    value => { value.baseline.rollbackDrillPassed = false; },
    value => { value.baseline.applicationReceiptAbsent = false; },
    value => { value.decision.applicationAuthorization.replayAllowed = true; },
    value => { value.decision.allowedPatch.phase8Completed = true; },
    value => { value.runtimeFacts.clean = false; }
  ]) {
    const value = input(); mutate(value); assert.equal(executeFailureRecoveryEvidenceApplication(value).accepted, false);
  }
});

test('CM-2110 application receipt rejects native actions or completion overclaim', () => {
  const result = executeFailureRecoveryEvidenceApplication(input());
  for (const mutate of [
    payload => { payload.schemaVersion = 2; },
    payload => { payload.taskId = 'CM-FORGED'; },
    payload => { payload.receiptType = 'forged_receipt'; },
    payload => { payload.applicationCounters.nativeWrites = 1; },
    payload => { payload.applicationCounters.failureInjectionExecutions = 1; },
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.appliedEvidence.phase8Completed = true; },
    payload => { payload.appliedEvidence.productionReady = true; },
    payload => { payload.boundaries.productionFailureRecoveryProven = true; },
    payload => { payload.boundaries.fullPlanPackCompleted = true; },
    payload => { payload.boundaries.readinessClaimed = true; },
    payload => { payload.boundaries.productionReady = true; }
  ]) {
    const payload = structuredClone(result.receiptPayload); mutate(payload);
    assert.equal(evaluateApplicationReceipt({ receiptPayload: payload, receiptPayloadSha256: sha256Canonical(payload) }).accepted, false);
  }
});

test('CM-2110 application receipt rejects rehashed top-level receipt or payload overclaims', () => {
  const result = executeFailureRecoveryEvidenceApplication(input());
  assert.equal(evaluateApplicationReceipt({
    receiptPayload: result.receiptPayload,
    receiptPayloadSha256: result.receiptPayloadSha256,
    productionReady: true
  }).accepted, false);
  const payload = structuredClone(result.receiptPayload);
  payload.productionReady = true;
  assert.equal(evaluateApplicationReceipt({
    receiptPayload: payload,
    receiptPayloadSha256: sha256Canonical(payload)
  }).accepted, false);
});
