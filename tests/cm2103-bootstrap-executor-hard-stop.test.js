'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXECUTION_PACKET_PATH,
  FUTURE_DECISION_PATH,
  runFrozenCm2103Bootstrap
} = require('../src/cli/cm2103-identity-bound-store-bootstrap');

test('CM-2103 frozen executor exposes only packet and future decision Git inputs', () => {
  assert.equal(
    EXECUTION_PACKET_PATH,
    'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_execution_packet_cm2103.json'
  );
  assert.equal(
    FUTURE_DECISION_PATH,
    'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_decision_cm2103.json'
  );
  assert.equal(runFrozenCm2103Bootstrap.length, 2);
});

test('CM-2103 frozen executor stops before Git or filesystem access when either exact commit is missing', async () => {
  await assert.rejects(runFrozenCm2103Bootstrap(null, null), /execution_packet_commit_required/);
  await assert.rejects(runFrozenCm2103Bootstrap('a'.repeat(40), null), /future_bootstrap_decision_commit_required/);
  await assert.rejects(runFrozenCm2103Bootstrap({ commit: 'a'.repeat(40) }, 'b'.repeat(40)), /execution_packet_commit_required/);
});
