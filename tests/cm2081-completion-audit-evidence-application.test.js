'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  EXPECTED_AUTHORIZATION,
  executeCm2081CompletionAuditEvidenceApplication,
  sha256Canonical
} = require('../src/core/Cm2081CompletionAuditEvidenceApplication');

function authorization(overrides = {}) {
  return { ...EXPECTED_AUTHORIZATION, ...overrides };
}

function loadReceipt() {
  return JSON.parse(fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    'completion_audit_application_receipt_cm2082.json'
  ), 'utf8'));
}

test('CM2081 executes the authorized four-contract application chain exactly once', () => {
  const result = executeCm2081CompletionAuditEvidenceApplication(authorization());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.externalReviewPassed, true);
  assert.equal(result.externalReviewEvidenceBundleAppliedToCompletionAudit, true);
  assert.equal(result.tagApprovalPacketPassed, false);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.receiptPayload.completionAuditEvidence.controlledApplicationCount, 1);
  assert.equal(result.receiptPayload.boundaries.currentPhase9Completed, false);
  assert.equal(result.receiptPayload.boundaries.currentPhase10Completed, false);
  assert.equal(result.receiptPayload.boundaries.fullPlanPackCompleted, false);
  assert.equal(result.receiptPayload.boundaries.nativeMemoryWritePerformed, false);
  assert.equal(result.receiptPayloadSha256, sha256Canonical(result.receiptPayload));
  assert.equal(result.nextGate, 'separate_tag_approval_packet_review');
});

test('CM2081 persisted low-disclosure receipt matches the executed application', () => {
  const result = executeCm2081CompletionAuditEvidenceApplication(authorization());
  const persisted = loadReceipt();

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(persisted.receiptPayload, result.receiptPayload);
  assert.equal(persisted.receiptPayloadSha256, result.receiptPayloadSha256);
  assert.equal(persisted.receiptPayloadSha256, sha256Canonical(persisted.receiptPayload));
});

test('CM2081 fails closed when the application decision reference drifts', () => {
  const result = executeCm2081CompletionAuditEvidenceApplication(authorization({
    decisionReference: 'CM-2081-ER-DRIFT'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authorization.decisionReference'));
  assert.equal(result.externalReviewEvidenceBundleAppliedToCompletionAudit, false);
});

test('CM2081 fails closed when tag approval is promoted by the authorization input', () => {
  const result = executeCm2081CompletionAuditEvidenceApplication(authorization({
    tagApprovalPacketPassed: true
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authorization.tagApprovalPacketPassed'));
  assert.equal(result.tagApprovalPacketPassed, false);
  assert.equal(result.externalReviewEvidenceBundleAppliedToCompletionAudit, false);
});

test('CM2081 fails closed when Phase 8 authority is promoted by the authorization input', () => {
  const result = executeCm2081CompletionAuditEvidenceApplication(authorization({
    phase8NativeWriteAuthorizationGranted: true
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authorization.phase8NativeWriteAuthorizationGranted'));
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.externalReviewEvidenceBundleAppliedToCompletionAudit, false);
});
