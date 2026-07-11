'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  runFrozenCm2103Bootstrap
} = require('../src/cli/cm2103-identity-bound-store-bootstrap');

test('CM-2103 frozen executor exposes only gate packet, content decision, and final release Git inputs', () => {
  assert.equal(
    AUTHORIZATION_GATE_PACKET_PATH,
    'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_gate_packet_cm2104.json'
  );
  assert.equal(
    AUTHORIZATION_CONTENT_DECISION_PATH,
    'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_content_decision_cm2104.json'
  );
  assert.equal(
    FINAL_EXECUTION_RELEASE_DECISION_PATH,
    'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_final_execution_release_decision_cm2104.json'
  );
  assert.equal(runFrozenCm2103Bootstrap.length, 3);
});

test('CM-2103 frozen executor stops before Git or filesystem access unless all three exact commits exist', async () => {
  await assert.rejects(runFrozenCm2103Bootstrap(null, null, null), /authorization_gate_packet_commit_required/);
  await assert.rejects(
    runFrozenCm2103Bootstrap('a'.repeat(40), null, null),
    /authorization_content_decision_commit_required/
  );
  await assert.rejects(
    runFrozenCm2103Bootstrap('a'.repeat(40), 'b'.repeat(40), null),
    /final_execution_release_decision_commit_required/
  );
  await assert.rejects(
    runFrozenCm2103Bootstrap({ commit: 'a'.repeat(40) }, 'b'.repeat(40), 'c'.repeat(40)),
    /authorization_gate_packet_commit_required/
  );
});
