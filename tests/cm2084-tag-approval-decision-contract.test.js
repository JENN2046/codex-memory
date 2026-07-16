'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateCm2084TagApprovalDecision
} = require('../src/core/Cm2084TagApprovalDecisionContract');

function loadDecision() {
  return JSON.parse(fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    'tag_approval_final_decision_cm2084.json'
  ), 'utf8'));
}

test('CM2084 accepts exact Tag Approval while keeping every tag action unauthorized', () => {
  const result = evaluateCm2084TagApprovalDecision(loadDecision());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.tagApprovalPacketPassed, true);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.tagCreationAuthorized, false);
  assert.equal(result.tagPushAuthorized, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.tagPushed, false);
});

test('CM2084 fails closed on packet hash drift', () => {
  const input = loadDecision();
  input.binding.packetPayloadSha256 = '0'.repeat(64);
  const result = evaluateCm2084TagApprovalDecision(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('binding.packetPayloadSha256'));
  assert.equal(result.tagApprovalPacketPassed, false);
});

test('CM2084 rejects tag creation or push authority smuggled into the decision', () => {
  const input = loadDecision();
  input.actionAuthorizations.tagCreationAuthorized = true;
  input.actionAuthorizations.tagPushAuthorized = true;
  const result = evaluateCm2084TagApprovalDecision(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('actionAuthorizations.tagCreationAuthorized'));
  assert.ok(result.blockers.includes('actionAuthorizations.tagPushAuthorized'));
  assert.equal(result.tagCreated, false);
  assert.equal(result.tagPushed, false);
});
