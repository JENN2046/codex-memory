'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateCm2080ExternalReviewFinalDecision
} = require('../src/core/Cm2080ExternalReviewFinalDecisionContract');

const decisionPath = path.join(
  __dirname,
  '..',
  'docs',
  'near-model-memory-plan-pack',
  'external_review_final_decision_cm2080.json'
);

function loadDecision() {
  return JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
}

test('CM2080 accepts the exact external-review decision while preserving three false slots', () => {
  const result = evaluateCm2080ExternalReviewFinalDecision(loadDecision());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.externalReviewPassed, true);
  assert.equal(result.externalReviewEvidenceBundleAppliedToCompletionAudit, false);
  assert.equal(result.tagApprovalPacketPassed, false);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.completionAuditApplicationAuthorized, false);
  assert.equal(result.nextGate, 'request_separate_completion_audit_application_decision');
});

test('CM2080 fails closed when a frozen evidence binding drifts', () => {
  const input = loadDecision();
  input.evidenceObjects.phase9MachineObservation.bytes += 1;

  const result = evaluateCm2080ExternalReviewFinalDecision(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('evidenceObjects.phase9MachineObservation'));
  assert.equal(result.externalReviewPassed, false);
});

test('CM2080 rejects promotion of an independent decision slot', () => {
  const input = loadDecision();
  input.decisions.tagApprovalPacketPassed = true;

  const result = evaluateCm2080ExternalReviewFinalDecision(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('decisions.tagApprovalPacketPassed'));
  assert.equal(result.tagApprovalPacketPassed, false);
});
