'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BASELINE,
  BUNDLE,
  DECISION,
  REQUIRED_FIELDS,
  evaluateApplicationReceipt,
  evaluateBundle,
  evaluateDecision,
  executePhase8CompletionAuditApplication,
  sha256Canonical
} = require('../src/core/Cm2111Phase8CompletionAuditApplication');

const DOCS = path.join(__dirname, '../docs/near-model-memory-plan-pack');
const bundle = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_evidence_bundle_cm2111.json'), 'utf8'));
const decision = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_audit_decision_cm2111.json'), 'utf8'));

function input() {
  return {
    bundle: structuredClone(bundle),
    decision: structuredClone(decision),
    bindings: { bundleCommit: BUNDLE.commit, bundleBlobOid: BUNDLE.blobOid, bundleBytes: BUNDLE.bytes, bundleSha256: BUNDLE.rawSha256, decisionCommit: DECISION.commit, decisionBlobOid: DECISION.blobOid, decisionBytes: DECISION.bytes, decisionSha256: DECISION.rawSha256 },
    baseline: { completionAuditBlobOid: BASELINE.completionAuditBlobOid, traceMatrixBlobOid: BASELINE.traceMatrixBlobOid, completionAuditWorktreeMatchesHead: true, traceMatrixWorktreeMatchesHead: true, applicationReceiptAbsent: true, rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: false },
    runtimeFacts: { clean: true, commit: '1'.repeat(40), tree: '2'.repeat(40) }
  };
}

test('CM-2111 evidence bundle independently satisfies all Phase 8 requirements only', () => {
  const result = evaluateBundle(bundle);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phaseAudit.accepted, true);
  assert.equal(result.phaseAudit.missingEvidence.length, 0);
  assert.equal(result.fullAudit.fullPlanPackCompleted, false);
  assert.equal(REQUIRED_FIELDS.length, 15);
});

test('CM-2111 exact decision applies Phase 8 completion without full-plan or readiness claims', () => {
  assert.equal(evaluateDecision(decision).accepted, true);
  const result = executePhase8CompletionAuditApplication(input());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(result.appliedState, { rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: true, fullPlanPackCompleted: false, readinessClaimed: false });
  assert.equal(result.receiptPayload.applicationCounters.nativeWrites, 0);
  assert.equal(result.additionalNativeActionAuthorized, false);
  assert.equal(evaluateApplicationReceipt({ receiptPayload: result.receiptPayload, receiptPayloadSha256: result.receiptPayloadSha256 }).accepted, true);
});

test('CM-2111 fails closed on any missing Phase 8 field or boundary drift', () => {
  for (const mutate of [
    value => { value.bundle.evidence.failureRecoveryProofPassed = false; },
    value => { value.bundle.evidence.rollbackDrillPassed = false; },
    value => { value.bundle.sideEffectCounters.nativeWrites = 1; },
    value => { value.decision.allowedPatch.fullPlanPackCompleted = true; },
    value => { value.baseline.phase8Completed = true; },
    value => { value.runtimeFacts.clean = false; }
  ]) { const value = input(); mutate(value); assert.equal(executePhase8CompletionAuditApplication(value).accepted, false); }
});

test('CM-2111 receipt rejects replay, side effects, full-plan, readiness, or V8 overclaim', () => {
  const result = executePhase8CompletionAuditApplication(input());
  for (const mutate of [
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.applicationCounters.remoteActions = 1; },
    payload => { payload.appliedState.fullPlanPackCompleted = true; },
    payload => { payload.appliedState.readinessClaimed = true; },
    payload => { payload.nonClaims.completeV8 = true; }
  ]) { const payload = structuredClone(result.receiptPayload); mutate(payload); assert.equal(evaluateApplicationReceipt({ receiptPayload: payload, receiptPayloadSha256: sha256Canonical(payload) }).accepted, false); }
});
