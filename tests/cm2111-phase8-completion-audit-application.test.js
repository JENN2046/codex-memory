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

function otherwiseValidReceipt() {
  const receipt = JSON.parse(fs.readFileSync(path.join(
    DOCS,
    'phase8_completion_audit_application_receipt_cm2111.json'
  ), 'utf8'));
  Object.assign(receipt.receiptPayload.evidenceBundle, {
    commit: BUNDLE.commit,
    blobOid: BUNDLE.blobOid,
    bytes: BUNDLE.bytes,
    sha256: BUNDLE.rawSha256,
    payloadSha256: BUNDLE.payloadSha256,
    requiredEvidenceCount: REQUIRED_FIELDS.length
  });
  receipt.receiptPayloadSha256 = sha256Canonical(receipt.receiptPayload);
  return receipt;
}

function input() {
  return {
    bundle: structuredClone(bundle),
    decision: structuredClone(decision),
    bindings: { bundleCommit: BUNDLE.commit, bundleBlobOid: BUNDLE.blobOid, bundleBytes: BUNDLE.bytes, bundleSha256: BUNDLE.rawSha256, decisionCommit: DECISION.commit, decisionBlobOid: DECISION.blobOid, decisionBytes: DECISION.bytes, decisionSha256: DECISION.rawSha256 },
    baseline: { completionAuditBlobOid: BASELINE.completionAuditBlobOid, traceMatrixBlobOid: BASELINE.traceMatrixBlobOid, completionAuditWorktreeMatchesHead: true, traceMatrixWorktreeMatchesHead: true, applicationReceiptAbsent: true, rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: false },
    runtimeFacts: { clean: true, commit: '1'.repeat(40), tree: '2'.repeat(40) }
  };
}

test('CM-2111 historical bundle no longer satisfies the reopened Phase 8 requirements', () => {
  const result = evaluateBundle(bundle);
  assert.equal(result.accepted, false);
  assert.equal(result.phaseAudit.accepted, false);
  assert.deepEqual(result.phaseAudit.missingEvidence, [
    'vcpToolBoxOwnedRuntimeWritePassed',
    'actualTransportBindingPassed',
    'stableTargetStoreIdentityPassed'
  ]);
  assert.equal(result.fullAudit.fullPlanPackCompleted, false);
  assert.equal(REQUIRED_FIELDS.length, 18);
});

test('CM-2111 historical decision cannot be replayed after Phase 8 revalidation', () => {
  assert.equal(evaluateDecision(decision).accepted, true);
  const result = executePhase8CompletionAuditApplication(input());
  assert.equal(result.accepted, false);
  assert.equal(result.phase8Completed, false);
  assert.ok(result.blockers.includes('bundle.evidence.fields'));
  for (const field of [
    'vcpToolBoxOwnedRuntimeWritePassed',
    'actualTransportBindingPassed',
    'stableTargetStoreIdentityPassed'
  ]) assert.ok(result.blockers.includes(`bundle.evidence.${field}`));
  assert.equal(result.additionalNativeActionAuthorized, false);
});

test('CM-2111 frozen application receipt is historical and not current completion authority', () => {
  const receipt = JSON.parse(fs.readFileSync(path.join(
    DOCS,
    'phase8_completion_audit_application_receipt_cm2111.json'
  ), 'utf8'));
  const result = evaluateApplicationReceipt(receipt);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receipt.evidenceBundle'));
  assert.equal(result.phase8Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
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
  const receipt = JSON.parse(fs.readFileSync(path.join(
    DOCS,
    'phase8_completion_audit_application_receipt_cm2111.json'
  ), 'utf8'));
  for (const mutate of [
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.applicationCounters.remoteActions = 1; },
    payload => { payload.appliedState.fullPlanPackCompleted = true; },
    payload => { payload.appliedState.readinessClaimed = true; },
    payload => { payload.appliedState.productionReady = true; },
    payload => { payload.nonClaims.completeV8 = true; },
    payload => { payload.nonClaims.derivedIndexProofAccepted = false; }
  ]) { const payload = structuredClone(receipt.receiptPayload); mutate(payload); assert.equal(evaluateApplicationReceipt({ receiptPayload: payload, receiptPayloadSha256: sha256Canonical(payload) }).accepted, false); }
});

test('CM-2111 receipt rejects rehashed identity drift and top-level field expansion', () => {
  assert.equal(evaluateApplicationReceipt(otherwiseValidReceipt()).accepted, true);
  for (const mutate of [
    receipt => { receipt.receiptPayload.schemaVersion = 2; },
    receipt => { receipt.receiptPayload.taskId = 'CM-FORGED'; },
    receipt => { receipt.receiptPayload.receiptType = 'forged_receipt'; },
    receipt => { receipt.receiptPayload.decision.bytes += 1; },
    receipt => { receipt.receiptPayload.decision.productionReady = true; },
    receipt => { receipt.receiptPayload.evidenceBundle.bytes += 1; },
    receipt => { receipt.receiptPayload.evidenceBundle.productionReady = true; },
    receipt => { receipt.receiptPayload.applicationRuntime.cleanBeforeApplication = false; },
    receipt => { receipt.receiptPayload.applicationRuntime.completionAuditBaselineBlobOid = '0'.repeat(40); },
    receipt => { receipt.receiptPayload.applicationRuntime.traceMatrixBaselineBlobOid = '0'.repeat(40); },
    receipt => { receipt.receiptPayload.applicationRuntime.unreviewedRuntimeClaim = false; },
    receipt => { receipt.receiptPayload.unreviewedClaim = false; },
    receipt => { receipt.unreviewedClaim = false; }
  ]) {
    const receipt = otherwiseValidReceipt();
    mutate(receipt);
    receipt.receiptPayloadSha256 = sha256Canonical(receipt.receiptPayload);
    assert.equal(evaluateApplicationReceipt(receipt).accepted, false);
  }
});
