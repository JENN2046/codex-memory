'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2095Phase8CompletionEvidenceApplicationReceipt } = require('../src/core/Cm2095Phase8CompletionEvidenceApplicationReceiptContract');

const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_completion_evidence_application_receipt_cm2095.json'), 'utf8'));

test('CM-2095 application receipt accepts exact six-field patch while Phase 8 remains incomplete', () => {
  const result = evaluateCm2095Phase8CompletionEvidenceApplicationReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase8ReceiptBundleAppliedToCompletionAudit, true);
  assert.equal(result.phase8Completed, false);
  assert.equal(result.additionalNativeWriteAuthorized, false);
});

test('CM-2095 application receipt rejects hash, rollback, completion, replay, or side-effect drift', () => {
  for (const drift of [
    { receiptPayloadSha256: '0'.repeat(64) },
    { receiptPayload: { ...receipt.receiptPayload, appliedEvidence: { ...receipt.receiptPayload.appliedEvidence, rollbackDrillPassed: true } } },
    { receiptPayload: { ...receipt.receiptPayload, appliedEvidence: { ...receipt.receiptPayload.appliedEvidence, phase8Completed: true } } },
    { receiptPayload: { ...receipt.receiptPayload, authorization: { ...receipt.receiptPayload.authorization, replayAllowed: true } } },
    { receiptPayload: { ...receipt.receiptPayload, applicationCounters: { ...receipt.receiptPayload.applicationCounters, nativeWriteCalls: 1 } } }
  ]) assert.equal(evaluateCm2095Phase8CompletionEvidenceApplicationReceipt({ ...receipt, ...drift }).accepted, false);
});
