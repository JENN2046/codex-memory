'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateCm2085LocalAnnotatedTagCreationReceipt,
  sha256Canonical
} = require('../src/core/Cm2085LocalAnnotatedTagCreationReceiptContract');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    name
  ), 'utf8'));
}

function input() {
  return {
    authorization: load('local_tag_creation_authorization_decision_cm2085.json'),
    receipt: load('local_tag_creation_receipt_cm2085.json')
  };
}

test('CM2085 accepts the exact one-use local annotated tag creation receipt', () => {
  const value = input();
  const result = evaluateCm2085LocalAnnotatedTagCreationReceipt(value);

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.tagCreated, true);
  assert.equal(result.tagPushed, false);
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.remoteActionPerformed, false);
  assert.equal(value.receipt.receiptPayloadSha256, sha256Canonical(value.receipt.receiptPayload));
});

test('CM2085 fails closed on target or annotation drift', () => {
  const value = input();
  value.receipt.receiptPayload.tag.peeledCommit = '0'.repeat(40);
  value.receipt.receiptPayload.tag.annotation = 'drift';
  const result = evaluateCm2085LocalAnnotatedTagCreationReceipt(value);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receipt.tag.peeledCommit'));
  assert.ok(result.blockers.includes('receipt.tag.annotation'));
  assert.equal(result.tagCreated, false);
});

test('CM2085 rejects any push or signing authority drift', () => {
  const value = input();
  value.authorization.authorization.tagPushAuthorized = true;
  value.authorization.authorization.tagSigningAuthorized = true;
  const result = evaluateCm2085LocalAnnotatedTagCreationReceipt(value);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authorization.tagPushAuthorized'));
  assert.ok(result.blockers.includes('authorization.tagSigningAuthorized'));
  assert.equal(result.tagPushed, false);
});
