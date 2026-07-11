'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256 } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const { evaluatePhase8ExternalAuthorizationDecisionIntake } = require('../src/core/Phase8ExternalAuthorizationDecisionIntake');

function fixture() {
  const decision = {
    decisionReference: 'CM-TEST-PHASE8-PASS',
    phase8NativeWriteAuthorized: true,
    token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
    allowedAction: 'live_bridge_record_memory_proof',
    expectedContextHash: 'a'.repeat(64),
    expectedAllowlistHash: 'b'.repeat(64),
    payloadCanonicalSha256: 'c'.repeat(64),
    nonce: 'test-nonce',
    receiptId: 'test-receipt',
    authorizationUseCount: 1,
    expiresAt: '2030-01-01T00:00:00.000Z'
  };
  const decisionBytes = Buffer.from(JSON.stringify(decision));
  const expectedBinding = {
    decisionReference: decision.decisionReference,
    decisionSourceCommit: 'd'.repeat(40),
    decisionBlobOid: 'e'.repeat(40),
    decisionPayloadSha256: sha256(decisionBytes),
    expectedContextHash: decision.expectedContextHash,
    expectedAllowlistHash: decision.expectedAllowlistHash,
    payloadCanonicalSha256: decision.payloadCanonicalSha256,
    nonce: decision.nonce,
    receiptId: decision.receiptId
  };
  return { decisionBytes, expectedBinding };
}

test('external Phase 8 decision intake binds exact Git identity and payload bytes', () => {
  const value = fixture();
  const result = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes: value.decisionBytes,
    observedBinding: value.expectedBinding,
    expectedBinding: value.expectedBinding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decisionIdentityMachineBound, true);
});

test('decision intake rejects forged reference blob hash or public-token-only packet', () => {
  const value = fixture();
  const observed = { ...value.expectedBinding, decisionReference: 'CM-FORGED', decisionBlobOid: '0'.repeat(40) };
  const forged = JSON.parse(value.decisionBytes);
  forged.decisionReference = 'CM-FORGED';
  const result = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes: Buffer.from(JSON.stringify(forged)),
    observedBinding: observed,
    expectedBinding: value.expectedBinding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('binding.decisionReference'));
  assert.ok(result.blockers.includes('binding.decisionBlobOid'));
  assert.ok(result.blockers.includes('binding.decisionPayloadSha256'));
  assert.ok(result.blockers.includes('decision.decisionReference'));
});

test('registry rejects missing or drifting durable identity', async () => {
  const { Phase8OneShotAuthorizationRegistry } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const governanceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-registry-identity-'));
  assert.throws(() => new Phase8OneShotAuthorizationRegistry({ directory: governanceRoot }), /governance_root_required/);
  const identity = { authorizationRegistryReference: 'stable-registry', registryStorageRole: 'durable-local-governance-state', registryReinitializationAllowed: false, registryDeletionAllowed: false };
  const first = new Phase8OneShotAuthorizationRegistry({ governanceRoot, identity });
  await first.ensureIdentity();
  const drifted = new Phase8OneShotAuthorizationRegistry({ governanceRoot, identity: { ...identity, registryStorageRole: 'other-role' } });
  await assert.rejects(drifted.ensureIdentity(), /identity_mismatch/);
});
