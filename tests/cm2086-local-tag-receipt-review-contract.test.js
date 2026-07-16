'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateCm2086LocalTagReceiptReview
} = require('../src/core/Cm2086LocalTagReceiptReviewContract');

function loadReview() {
  return JSON.parse(fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    'local_tag_receipt_review_cm2086.json'
  ), 'utf8'));
}

test('CM2086 accepts the exact local tag receipt review without push authority', () => {
  const result = evaluateCm2086LocalTagReceiptReview(loadReview());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.localTagReceiptReviewPassed, true);
  assert.equal(result.tagPushAuthorized, false);
  assert.equal(result.tagPushed, false);
  assert.equal(result.remoteActionPerformed, false);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
});

test('CM2086 fails closed on tag OID or receipt hash drift', () => {
  const input = loadReview();
  input.localTag.objectOid = '0'.repeat(40);
  input.receipt.payloadSha256 = '0'.repeat(64);
  const result = evaluateCm2086LocalTagReceiptReview(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('localTag.objectOid'));
  assert.ok(result.blockers.includes('receipt.payloadSha256'));
});

test('CM2086 rejects remote action authority smuggled into the review', () => {
  const input = loadReview();
  input.remoteActions.tagPushAuthorized = true;
  input.remoteActions.tagPushed = true;
  const result = evaluateCm2086LocalTagReceiptReview(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('remoteActions.tagPushAuthorized'));
  assert.ok(result.blockers.includes('remoteActions.tagPushed'));
  assert.equal(result.tagPushed, false);
});

test('CM2086 rejects a missing explicit remote-action boundary', () => {
  const input = loadReview();
  delete input.remoteActions.branchPushAuthorized;
  const result = evaluateCm2086LocalTagReceiptReview(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('remoteActions.branchPushAuthorized'));
});
