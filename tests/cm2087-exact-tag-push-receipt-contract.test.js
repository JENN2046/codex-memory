'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {evaluateCm2087ExactTagPushReceipt, sha256Canonical} = require('../src/core/Cm2087ExactTagPushReceiptContract');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', name), 'utf8'));
}
function input() {
  return {authorization: load('tag_push_authorization_decision_cm2087.json'), receipt: load('tag_push_receipt_cm2087.json')};
}

test('CM2087 accepts the exact consumed one-ref tag push receipt', () => {
  const value = input();
  const result = evaluateCm2087ExactTagPushReceipt(value);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.tagPushed, true);
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(value.receipt.receiptPayloadSha256, sha256Canonical(value.receipt.receiptPayload));
});

test('CM2087 fails closed on remote OID or refspec drift', () => {
  const value = input();
  value.receipt.receiptPayload.tag.remoteObjectOid = '0'.repeat(40);
  value.receipt.receiptPayload.refspec = 'refs/heads/main:refs/heads/main';
  const result = evaluateCm2087ExactTagPushReceipt(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receipt.tag.remoteObjectOid'));
  assert.ok(result.blockers.includes('receipt.pushResult'));
});

test('CM2087 fails closed on upstream Packet or receipt binding drift', () => {
  const value = input();
  value.authorization.binding.packetPayloadSha256 = '0'.repeat(64);
  value.authorization.binding.localTagReceiptPayloadSha256 = '0'.repeat(64);
  const result = evaluateCm2087ExactTagPushReceipt(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authorization.binding.packetPayloadSha256'));
  assert.ok(result.blockers.includes('authorization.binding.localTagReceiptPayloadSha256'));
});

test('CM2087 rejects force branch release or Phase 8 authority drift', () => {
  const value = input();
  value.authorization.authorization.forceAllowed = true;
  value.authorization.authorization.branchPushAuthorized = true;
  value.authorization.authorization.releaseCreationAuthorized = true;
  value.authorization.authorization.phase8NativeWriteAuthorized = true;
  const result = evaluateCm2087ExactTagPushReceipt(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('authorization.forceAllowed'));
  assert.ok(result.blockers.includes('authorization.branchPushAuthorized'));
  assert.ok(result.blockers.includes('authorization.releaseCreationAuthorized'));
  assert.ok(result.blockers.includes('authorization.phase8NativeWriteAuthorized'));
});
