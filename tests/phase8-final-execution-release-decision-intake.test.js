'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256 } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const { evaluatePhase8FinalExecutionReleaseDecisionIntake } = require('../src/core/Phase8FinalExecutionReleaseDecisionIntake');

function fixture(overrides = {}) {
  const expectedBinding = {
    decisionSourceCommit: '4'.repeat(40),
    decisionBlobOid: '5'.repeat(40),
    expectedFinalReleaseDecisionReference: 'CM-TEST-FINAL-RELEASE',
    authorizationContentDecisionReference: 'CM-TEST-CONTENT',
    authorizationContentSourceCommit: 'a'.repeat(40),
    authorizationContentBlobOid: 'b'.repeat(40),
    authorizationContentPayloadSha256: 'c'.repeat(64),
    executionPacketCommit: 'd'.repeat(40),
    executionManifestBlobOid: 'e'.repeat(40),
    executionManifestSha256: 'f'.repeat(64),
    expectedContextHash: '1'.repeat(64),
    expectedAllowlistHash: '2'.repeat(64),
    payloadCanonicalSha256: '3'.repeat(64),
    nonce: 'one-shot-nonce',
    receiptId: 'one-shot-receipt'
  };
  const decision = {
    decisionReference: expectedBinding.expectedFinalReleaseDecisionReference,
    executionReleaseAuthorized: true,
    phase8NativeWriteAuthorized: true,
    token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
    allowedAction: 'live_bridge_record_memory_proof',
    authorizationContentDecisionReference: expectedBinding.authorizationContentDecisionReference,
    authorizationContentSourceCommit: expectedBinding.authorizationContentSourceCommit,
    authorizationContentBlobOid: expectedBinding.authorizationContentBlobOid,
    authorizationContentPayloadSha256: expectedBinding.authorizationContentPayloadSha256,
    executionPacketCommit: expectedBinding.executionPacketCommit,
    executionManifestBlobOid: expectedBinding.executionManifestBlobOid,
    executionManifestSha256: expectedBinding.executionManifestSha256,
    expectedContextHash: expectedBinding.expectedContextHash,
    expectedAllowlistHash: expectedBinding.expectedAllowlistHash,
    payloadCanonicalSha256: expectedBinding.payloadCanonicalSha256,
    nonce: expectedBinding.nonce,
    receiptId: expectedBinding.receiptId,
    authorizationUseCount: 1,
    expiresAt: '2030-01-01T00:00:00.000Z',
    ...overrides
  };
  const decisionBytes = Buffer.from(JSON.stringify(decision));
  return { decisionBytes, expectedBinding, observedBinding: { decisionSourceCommit: '4'.repeat(40), decisionBlobOid: '5'.repeat(40), decisionPayloadSha256: sha256(decisionBytes) } };
}

test('final execution release intake binds content and exact execution manifest', () => {
  const value = fixture();
  const result = evaluatePhase8FinalExecutionReleaseDecisionIntake({ ...value, now: new Date('2026-07-11T00:00:00.000Z') });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, true);
});

test('final release intake rejects packet, manifest, expiry, or copied decision drift', () => {
  for (const [name, overrides] of [
    ['packet', { executionPacketCommit: '0'.repeat(40) }],
    ['blob', { executionManifestBlobOid: '0'.repeat(40) }],
    ['manifest hash', { executionManifestSha256: '0'.repeat(64) }],
    ['invalid expiry', { expiresAt: 'not-a-timestamp' }],
    ['expired', { expiresAt: '2020-01-01T00:00:00.000Z' }]
  ]) {
    const value = fixture(overrides);
    const result = evaluatePhase8FinalExecutionReleaseDecisionIntake({ ...value, now: new Date('2026-07-11T00:00:00.000Z') });
    assert.equal(result.accepted, false, name);
  }
  for (const field of ['decisionSourceCommit', 'decisionBlobOid']) {
    const value = fixture();
    value.observedBinding[field] = '0'.repeat(40);
    const result = evaluatePhase8FinalExecutionReleaseDecisionIntake({
      ...value,
      now: new Date('2026-07-11T00:00:00.000Z')
    });
    assert.equal(result.accepted, false, field);
  }
});
