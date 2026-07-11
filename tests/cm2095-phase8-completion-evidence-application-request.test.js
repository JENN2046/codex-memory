'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2095Phase8ExecutionReceiptReview } = require('../src/core/Cm2095Phase8ExecutionReceiptReviewContract');
const { evaluateCm2095Phase8CompletionEvidenceApplicationRequest } = require('../src/core/Cm2095Phase8CompletionEvidenceApplicationRequestContract');

const root = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack');
const review = JSON.parse(fs.readFileSync(path.join(root, 'phase8_native_write_execution_receipt_review_cm2095.json'), 'utf8'));
const request = JSON.parse(fs.readFileSync(path.join(root, 'phase8_completion_evidence_application_request_cm2095.json'), 'utf8'));

test('CM-2095 accepts exact receipt review without adding write or completion authority', () => {
  const result = evaluateCm2095Phase8ExecutionReceiptReview(review);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.completionEvidenceApplicationReviewMayBegin, true);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});

test('CM-2095 requests only supported completion evidence while retaining rollback and failure gaps', () => {
  const result = evaluateCm2095Phase8CompletionEvidenceApplicationRequest(request);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.completionEvidenceApplicationReviewRequested, true);
  assert.equal(result.applicationAlreadyPerformed, false);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});

test('CM-2095 fails closed on replay, unsupported evidence, premature application, or completion drift', () => {
  for (const drift of [
    { completionEvidenceAlreadyApplied: true },
    { proposedEvidence: { ...request.proposedEvidence, rollbackDrillPassed: true } },
    { unsupportedEvidence: { ...request.unsupportedEvidence, providerExecutionProofAccepted: true } },
    { resultingStateRequested: { ...request.resultingStateRequested, authorizationReplayAllowed: true } },
    { resultingStateRequested: { ...request.resultingStateRequested, phase8Completed: true } },
    { applicationCounters: { ...request.applicationCounters, nativeWriteCalls: 1 } }
  ]) {
    const result = evaluateCm2095Phase8CompletionEvidenceApplicationRequest({ ...request, ...drift });
    assert.equal(result.accepted, false);
    assert.equal(result.applicationAlreadyPerformed, false);
    assert.equal(result.phase8Completed, false);
    assert.equal(result.additionalNativeWriteAuthorized, false);
  }
});
