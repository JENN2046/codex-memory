'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  buildCm2103BootstrapBindingHash,
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

test('CM-2103 bootstrap binding hash consumes the exact final release SHA field', () => {
  const input = {
    authorizationContentDecisionSourceCommit: '1'.repeat(40),
    authorizationContentDecisionBlobOid: '2'.repeat(40),
    authorizationContentDecisionSha256: '3'.repeat(64),
    finalExecutionReleaseDecisionSourceCommit: '4'.repeat(40),
    finalExecutionReleaseDecisionBlobOid: '5'.repeat(40),
    finalExecutionReleaseDecisionSha256: '6'.repeat(64),
    executionPacketCommit: '7'.repeat(40),
    executionPacketBlobOid: '8'.repeat(40),
    executionPacketSha256: '9'.repeat(64),
    implementationCommit: 'a'.repeat(40),
    implementationTree: 'b'.repeat(40),
    storeRootBindingSha256: 'c'.repeat(64),
    governanceRootIdentitySha256: 'd'.repeat(64),
    identitySha256: 'e'.repeat(64),
    nonce: 'cm2102-identity-bound-store-bootstrap-001',
    receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001'
  };
  const accepted = buildCm2103BootstrapBindingHash(input);
  const drifted = buildCm2103BootstrapBindingHash({
    ...input,
    finalExecutionReleaseDecisionSha256: 'f'.repeat(64)
  });
  assert.match(accepted, /^[a-f0-9]{64}$/);
  assert.notEqual(accepted, drifted);
});
