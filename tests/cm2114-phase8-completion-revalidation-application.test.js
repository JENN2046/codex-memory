'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BASELINE, BUNDLE, DECISION, PROOF, REQUIRED_FIELDS,
  evaluateApplicationReceipt, evaluateBundle, evaluateDecision,
  executeCm2114Phase8CompletionRevalidationApplication
} = require('../src/core/Cm2114Phase8CompletionRevalidationApplication');

const DOCS = path.join(__dirname, '../docs/near-model-memory-plan-pack');
const bundle = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_revalidation_evidence_bundle_cm2114.json')));
const decision = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_revalidation_application_decision_cm2114.json')));
const proofReceipt = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json')));
const applicationReceipt = JSON.parse(fs.readFileSync(path.join(DOCS, 'phase8_completion_revalidation_application_receipt_cm2114.json')));

function input() {
  return {
    bundle: structuredClone(bundle), decision: structuredClone(decision), proofReceipt: structuredClone(proofReceipt),
    bindings: {
      bundleCommit: BUNDLE.commit, bundleBlobOid: BUNDLE.blobOid, bundleBytes: BUNDLE.bytes, bundleSha256: BUNDLE.rawSha256,
      decisionCommit: DECISION.commit, decisionBlobOid: DECISION.blobOid, decisionBytes: DECISION.bytes, decisionSha256: DECISION.rawSha256,
      proofCommit: PROOF.commit, proofBlobOid: PROOF.blobOid, proofBytes: PROOF.bytes, proofSha256: PROOF.rawSha256
    },
    baseline: {
      completionAuditBlobOid: BASELINE.completionAuditBlobOid, traceMatrixBlobOid: BASELINE.traceMatrixBlobOid,
      completionAuditWorktreeMatchesHead: true, traceMatrixWorktreeMatchesHead: true, applicationReceiptAbsent: true,
      phase8Completed: false, phase8CompletionStatus: 'needs_revalidation'
    },
    runtimeFacts: { clean: true, commit: '1'.repeat(40), tree: '2'.repeat(40) }
  };
}

test('CM-2114 applies the three exact proof fields and revalidates Phase 8 only', () => {
  assert.equal(REQUIRED_FIELDS.length, 18);
  assert.equal(evaluateBundle(bundle, proofReceipt).accepted, true);
  assert.equal(evaluateDecision(decision).accepted, true);
  const result = executeCm2114Phase8CompletionRevalidationApplication(input());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase8Completed, true);
  assert.equal(result.phase8CompletionStatus, 'revalidated_complete');
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
  assert.equal(evaluateApplicationReceipt({ receiptPayload: result.receiptPayload, receiptPayloadSha256: result.receiptPayloadSha256 }).accepted, true);
});

test('CM-2114 fails closed on proof, bundle, replay, baseline, side effect, or readiness drift', () => {
  for (const mutate of [
    value => { value.bundle.evidence.actualTransportBindingPassed = false; },
    value => { value.proofReceipt.store.identityMatchedBeforeAndAfter = false; },
    value => { value.decision.applicationAuthorization.replayAllowed = true; },
    value => { value.baseline.phase8CompletionStatus = 'complete'; },
    value => { value.decision.applicationSideEffectLimits.nativeWrites = 1; },
    value => { value.decision.allowedCompletionResult.fullPlanPackCompleted = true; },
    value => { value.decision.nonClaims.derivedIndexProofAccepted = true; },
    value => { value.decision.nonClaims.productionProviderProofAccepted = true; },
    value => { value.bundle.nonClaims.derivedIndexProofAccepted = true; },
    value => { value.bundle.nonClaims.productionProviderProofAccepted = true; },
    value => { value.runtimeFacts.clean = false; }
  ]) {
    const value = input();
    mutate(value);
    const result = executeCm2114Phase8CompletionRevalidationApplication(value);
    assert.equal(result.accepted, false);
    assert.equal(result.phase8Completed, false);
    assert.equal(result.additionalNativeWriteAuthorized, false);
  }
});

test('CM-2114 application receipt rejects replay, new runtime action, or readiness overclaim', () => {
  const result = executeCm2114Phase8CompletionRevalidationApplication(input());
  for (const mutate of [
    payload => { payload.schemaVersion = 2; },
    payload => { payload.taskId = 'CM-FORGED'; },
    payload => { payload.receiptType = 'forged_receipt'; },
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.applicationCounters.nativeWrites = 1; },
    payload => { payload.appliedState.readinessClaimed = true; },
    payload => { payload.nonClaims.additionalNativeWriteAuthorized = true; },
    payload => { payload.nonClaims.derivedIndexProofAccepted = true; },
    payload => { payload.nonClaims.productionProviderProofAccepted = true; },
    payload => { payload.nonClaims.completeV8 = true; },
    payload => { payload.nonClaims.productionProviderProofAcceptedV2 = false; }
  ]) {
    const payload = structuredClone(result.receiptPayload);
    mutate(payload);
    const receipt = { receiptPayload: payload, receiptPayloadSha256: require('../src/core/Cm2114Phase8CompletionRevalidationApplication').sha256Canonical(payload) };
    assert.equal(evaluateApplicationReceipt(receipt).accepted, false);
  }
});

test('CM-2114 application receipt binds the exact three applied proof flags', () => {
  const result = executeCm2114Phase8CompletionRevalidationApplication(input());
  for (const mutate of [
    payload => { payload.appliedEvidence.vcpToolBoxOwnedRuntimeWritePassed = false; },
    payload => { payload.appliedEvidence.actualTransportBindingPassed = false; },
    payload => { payload.appliedEvidence.stableTargetStoreIdentityPassed = false; },
    payload => { payload.appliedEvidence.unreviewedProofPassed = true; }
  ]) {
    const payload = structuredClone(result.receiptPayload);
    mutate(payload);
    assert.equal(evaluateApplicationReceipt({
      receiptPayload: payload,
      receiptPayloadSha256: require('../src/core/Cm2114Phase8CompletionRevalidationApplication').sha256Canonical(payload)
    }).accepted, false);
  }
});

test('CM-2114 application receipt rejects rehashed top-level receipt or payload overclaims', () => {
  const result = executeCm2114Phase8CompletionRevalidationApplication(input());
  assert.equal(evaluateApplicationReceipt({
    receiptPayload: result.receiptPayload,
    receiptPayloadSha256: result.receiptPayloadSha256,
    productionReady: true
  }).accepted, false);
  const payload = structuredClone(result.receiptPayload);
  payload.productionReady = true;
  const receipt = {
    receiptPayload: payload,
    receiptPayloadSha256: require('../src/core/Cm2114Phase8CompletionRevalidationApplication').sha256Canonical(payload)
  };
  assert.equal(evaluateApplicationReceipt(receipt).accepted, false);
});

test('CM-2114 frozen application receipt passes the exact receipt contract', () => {
  const result = evaluateApplicationReceipt(applicationReceipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase8Completed, true);
  assert.equal(result.phase8CompletionStatus, 'revalidated_complete');
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});
