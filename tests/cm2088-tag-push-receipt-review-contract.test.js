'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {evaluateCm2088TagPushReceiptReview} = require('../src/core/Cm2088TagPushReceiptReviewContract');

function loadReview() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'tag_push_receipt_review_cm2088.json'), 'utf8'));
}

test('CM2088 accepts the exact push receipt review with no new authority', () => {
  const result = evaluateCm2088TagPushReceiptReview(loadReview());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.exactTagPushReceiptAccepted, true);
  assert.equal(result.remoteTagDeliveryRecorded, true);
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.newRemoteActionAuthorized, false);
});

test('CM2088 fails closed on OID receipt or replay drift', () => {
  const input = loadReview();
  input.tag.objectOid = '0'.repeat(40);
  input.receipt.payloadSha256 = '0'.repeat(64);
  input.authorization.replayAllowed = true;
  const result = evaluateCm2088TagPushReceiptReview(input);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('tag.objectOid'));
  assert.ok(result.blockers.includes('receipt'));
  assert.ok(result.blockers.includes('authorization.replayAllowed'));
});

test('CM2088 rejects any new remote Phase 8 or readiness authorization', () => {
  const input = loadReview();
  input.newRemoteActionAuthorized = true;
  input.remainingAuthorizations.releaseCreationAuthorized = true;
  input.remainingAuthorizations.phase8NativeWriteAuthorized = true;
  input.remainingAuthorizations.readinessClaimAuthorized = true;
  const result = evaluateCm2088TagPushReceiptReview(input);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('newRemoteActionAuthorized'));
  assert.ok(result.blockers.includes('remainingAuthorizations.releaseCreationAuthorized'));
  assert.ok(result.blockers.includes('remainingAuthorizations.phase8NativeWriteAuthorized'));
  assert.ok(result.blockers.includes('remainingAuthorizations.readinessClaimAuthorized'));
});
