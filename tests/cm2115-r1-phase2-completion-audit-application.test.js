'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  CM2080,
  DECISION_PATH,
  EXACT_PHASE2_FIELDS,
  PHASE2_MANIFEST,
  WINDOWS_WSL_RECEIPT,
  buildDecision,
  canonicalize,
  evaluateApplicationReceipt,
  evaluateDecision,
  executeApplication,
  gitBlobOid,
  serializeArtifact,
  sha256,
  sha256Canonical
} = require('../src/core/Cm2115R1Phase2CompletionAuditApplication');
const {
  canonicalCallHash
} = require('../src/core/Phase2MachineExecutionEvidenceManifestContract');

const ROOT = path.join(__dirname, '..');
const readJson = sourcePath => JSON.parse(fs.readFileSync(path.join(ROOT, sourcePath), 'utf8'));

function fixedIdentity(value) {
  return { ...value };
}

function decisionIdentity() {
  const bytes = Buffer.from(serializeArtifact(buildDecision()));
  return {
    sourceCommit: '1'.repeat(40),
    sourceTree: '2'.repeat(40),
    sourcePath: DECISION_PATH,
    blobOid: gitBlobOid(bytes),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

function validInput() {
  const decision = buildDecision();
  return {
    decision,
    decisionGitIdentity: decisionIdentity(),
    decisionRawBytes: Buffer.from(serializeArtifact(decision)),
    externalReviewDecision: readJson(CM2080.sourcePath),
    externalReviewGitIdentity: fixedIdentity(CM2080),
    phase2Manifest: readJson(PHASE2_MANIFEST.sourcePath),
    phase2ManifestGitIdentity: fixedIdentity(PHASE2_MANIFEST),
    windowsWslReceipt: readJson(WINDOWS_WSL_RECEIPT.sourcePath),
    windowsWslReceiptGitIdentity: fixedIdentity(WINDOWS_WSL_RECEIPT),
    baseline: {
      cleanWorktree: true,
      applicationReceiptAbsent: true,
      completionAuditWorktreeMatchesHead: true,
      traceMatrixWorktreeMatchesHead: true,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false,
      oldCm2074UsedAsCurrentAuthority: false
    }
  };
}

function cloneInput() {
  const value = validInput();
  for (const field of [
    'decision', 'decisionGitIdentity', 'externalReviewDecision', 'externalReviewGitIdentity',
    'phase2Manifest', 'phase2ManifestGitIdentity', 'windowsWslReceipt',
    'windowsWslReceiptGitIdentity', 'baseline'
  ]) value[field] = structuredClone(value[field]);
  value.decisionRawBytes = Buffer.from(value.decisionRawBytes);
  return value;
}

test('CM-2115-R1 decision authorizes one exact low-disclosure Phase 2 application only', () => {
  const decision = buildDecision();
  const result = evaluateDecision(decision);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(decision.payload.authority.applicationAuthorized, true);
  assert.equal(decision.payload.authority.authorizationUseCount, 1);
  assert.equal(decision.payload.authority.authorizationReplayAllowed, false);
  assert.equal(decision.payload.acceptedMachineEvidence.oldCm2074ApplicationMayActAsCurrentAuthority, false);
  assert.deepEqual(Object.keys(decision.payload.requiredEvidencePatch), [...EXACT_PHASE2_FIELDS]);
  assert.ok(EXACT_PHASE2_FIELDS.every(field => decision.payload.requiredEvidencePatch[field] === true));
  assert.equal(decision.payload.allowedStateAfterApplication.independentReviewPassed, false);
  assert.equal(decision.payload.allowedStateAfterApplication.fullPlanPackCompleted, false);
  assert.equal(decision.payload.allowedStateAfterApplication.readinessClaimed, false);
  assert.equal(decision.canonicalPayloadSha256, sha256Canonical(decision.payload));
});

test('CM-2115-R1 applies the exact CM-2080-reviewed machine evidence once', () => {
  const result = executeApplication(validInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(result.appliedEvidence, Object.fromEntries(EXACT_PHASE2_FIELDS.map(field => [field, true])));
  assert.equal(result.receiptPayload.authorization.consumed, true);
  assert.equal(result.receiptPayload.authorization.replayAllowed, false);
  assert.equal(result.receiptPayload.acceptedMachineEvidence.oldCm2074ApplicationUsedAsCurrentAuthority, false);
  assert.equal(result.independentReviewPassed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  const receipt = { receiptPayload: result.receiptPayload, receiptPayloadSha256: result.receiptPayloadSha256 };
  assert.equal(evaluateApplicationReceipt(receipt).accepted, true);
});

test('CM-2115-R1 fails closed on decision, Git identity, external review, machine, or baseline drift', () => {
  const mutations = [
    value => { value.decision.payload.requiredEvidencePatch.nativeReadProofPassed = false; value.decision.canonicalPayloadSha256 = sha256Canonical(value.decision.payload); },
    value => { value.decisionGitIdentity.blobOid = 'f'.repeat(40); },
    value => { value.decisionRawBytes = Buffer.from('not-the-frozen-decision'); },
    value => { value.externalReviewDecision.decisions.externalReviewPassed = false; },
    value => { value.externalReviewGitIdentity.sha256 = 'f'.repeat(64); },
    value => {
      value.phase2Manifest.calls[0].nativeInvocationSucceeded = false;
      value.phase2Manifest.calls[0].receiptSummarySha256 = canonicalCallHash(value.phase2Manifest.calls[0]);
    },
    value => { value.windowsWslReceipt.rawOutputCaptured = true; },
    value => { value.baseline.oldCm2074UsedAsCurrentAuthority = true; },
    value => { value.baseline.independentReviewPassed = true; },
    value => { value.baseline.fullPlanPackCompleted = true; },
    value => { value.baseline.readinessClaimed = true; }
  ];
  for (const mutate of mutations) {
    const value = cloneInput();
    mutate(value);
    const result = executeApplication(value);
    assert.equal(result.accepted, false, JSON.stringify(result));
    assert.equal(result.fullPlanPackCompleted, false);
    assert.equal(result.readinessClaimed, false);
  }
});

test('CM-2115-R1 receipt rejects replay, evidence drift, or completion/readiness overclaim', () => {
  const result = executeApplication(validInput());
  const mutations = [
    payload => { payload.authorization.replayAllowed = true; },
    payload => { payload.applicationResult.exactEvidencePatchApplied.nativeTargetBindingPassed = false; },
    payload => { payload.currentState.independentReviewPassed = true; },
    payload => { payload.currentState.fullPlanPackCompleted = true; },
    payload => { payload.currentState.readinessClaimed = true; },
    payload => { payload.sideEffects.nativeReads = 1; },
    payload => { payload.nonClaims.additionalNativeActionAuthorized = true; }
  ];
  for (const mutate of mutations) {
    const payload = structuredClone(result.receiptPayload);
    mutate(payload);
    const receipt = { receiptPayload: payload, receiptPayloadSha256: sha256Canonical(payload) };
    const evaluation = evaluateApplicationReceipt(receipt);
    assert.equal(evaluation.accepted, false);
    assert.equal(evaluation.fullPlanPackCompleted, false);
    assert.equal(evaluation.readinessClaimed, false);
  }
});

test('CM-2115-R1 decision and receipt serializers are canonical and low disclosure', () => {
  const text = serializeArtifact(buildDecision());
  assert.deepEqual(JSON.parse(text), canonicalize(buildDecision()));
  for (const forbidden of ['responseBody', 'rawMemory', 'rawAudit', 'endpoint', 'locator', 'tokenMaterial']) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test('CM-2115-R1 frozen application receipt passes the exact receipt contract', () => {
  const receiptPath = path.join(
    ROOT,
    'docs/near-model-memory-plan-pack/phase2_completion_audit_application_receipt_cm2115_r1.json'
  );
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const evaluation = evaluateApplicationReceipt(receipt);
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(', '));
  assert.equal(evaluation.phase2ReceiptBundleAppliedToCompletionAudit, true);
  assert.equal(evaluation.independentReviewPassed, false);
  assert.equal(evaluation.fullPlanPackCompleted, false);
  assert.equal(evaluation.readinessClaimed, false);
});
