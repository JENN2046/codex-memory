'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256 } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const {
  evaluatePhase8ExternalAuthorizationDecisionIntake,
  isMachineBoundPhase8AuthorizationDecision
} = require('../src/core/Phase8ExternalAuthorizationDecisionIntake');

function fixture(overrides = {}) {
  const decision = {
    decisionReference: 'CM-TEST-PHASE8-PASS',
    authorizationContentApproved: true,
    phase8NativeWriteAuthorized: false,
    nativeWriteMayExecute: false,
    finalExecutionReleaseReviewRequired: true,
    registryRootBootstrapAuthorized: true,
    registryRootIdentitySha256: '9'.repeat(64),
    allowedAction: 'live_bridge_record_memory_proof',
    expectedContextHash: 'a'.repeat(64),
    expectedAllowlistHash: 'b'.repeat(64),
    payloadCanonicalSha256: 'c'.repeat(64),
    nonce: 'test-nonce',
    receiptId: 'test-receipt',
    authorizationUseCount: 1,
    expectedFinalReleaseDecisionReference: 'CM-TEST-PHASE8-FINAL-RELEASE',
    expiresAt: '2030-01-01T00:00:00.000Z',
    ...overrides
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
    receiptId: decision.receiptId,
    registryRootIdentitySha256: decision.registryRootIdentitySha256,
    expectedFinalReleaseDecisionReference: decision.expectedFinalReleaseDecisionReference
  };
  return { decisionBytes, expectedBinding };
}

test('external Phase 8 content decision intake binds Git identity and remains non-executable', () => {
  const value = fixture();
  const result = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes: value.decisionBytes,
    observedBinding: value.expectedBinding,
    expectedBinding: value.expectedBinding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decisionIdentityMachineBound, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(Object.isFrozen(result.decision), true);
  assert.equal(isMachineBoundPhase8AuthorizationDecision(result.decision), true);
  assert.throws(() => {
    result.decision.decisionReference = 'CM-MUTATED-AFTER-INTAKE';
  }, TypeError);
  assert.equal(result.decision.decisionReference, 'CM-TEST-PHASE8-PASS');

  const replayCopy = { ...result.decision };
  assert.equal(Object.isFrozen(replayCopy), false);
  assert.equal(isMachineBoundPhase8AuthorizationDecision(replayCopy), false);
});

test('decision intake rejects forged reference blob hash or public-token-only packet', () => {
  const value = fixture();
  const observed = { ...value.expectedBinding, decisionReference: 'CM-FORGED', decisionBlobOid: '0'.repeat(40) };
  const forged = JSON.parse(value.decisionBytes);
  forged.decisionReference = 'CM-FORGED';
  forged.phase8NativeWriteAuthorized = true;
  forged.token = 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT';
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
  assert.ok(result.blockers.includes('decision.phase8NativeWriteAuthorized'));
});

test('external Phase 8 content decision intake rejects invalid expiry timestamps', () => {
  const value = fixture({ expiresAt: 'not-a-timestamp' });
  const result = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes: value.decisionBytes,
    observedBinding: value.expectedBinding,
    expectedBinding: value.expectedBinding,
    now: new Date('2026-07-11T00:00:00.000Z')
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('decision.expiresAt'));
});

test('registry rejects missing or drifting durable identity', async () => {
  const { Phase8OneShotAuthorizationRegistry } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const governanceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-registry-identity-'));
  assert.throws(() => new Phase8OneShotAuthorizationRegistry({ directory: governanceRoot }), /governance_root_required/);
  const identity = { authorizationRegistryReference: 'stable-registry', registryStorageRole: 'durable-local-governance-state', registryReinitializationAllowed: false, registryDeletionAllowed: false };
  const rootIdentity = { registryRootInstanceId: 'root-001', registryRootReference: 'stable-root', registryRootReinitializationAllowed: false, registryRootReplacementAllowed: false };
  const first = new Phase8OneShotAuthorizationRegistry({ governanceRoot, rootIdentity, identity });
  await assert.rejects(first.ensureIdentity(), /root_identity_missing/);
  await fs.writeFile(path.join(governanceRoot, '.phase8-registry-root-identity.json'), JSON.stringify(rootIdentity));
  await first.ensureIdentity();
  const drifted = new Phase8OneShotAuthorizationRegistry({ governanceRoot, rootIdentity, identity: { ...identity, registryStorageRole: 'other-role' } });
  await assert.rejects(drifted.ensureIdentity(), /identity_mismatch/);
  const replacedRoot = new Phase8OneShotAuthorizationRegistry({ governanceRoot, rootIdentity: { ...rootIdentity, registryRootInstanceId: 'root-002' }, identity });
  await assert.rejects(replacedRoot.ensureIdentity(), /root_identity_mismatch/);
});

test('switching application dataDir cannot reset nonce state under one Git governance root', async () => {
  const { Phase8OneShotAuthorizationRegistry } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const gitGovernanceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phase8-git-common-root-'));
  const rootIdentity = { registryRootInstanceId: 'shared-root-001', registryRootReference: 'stable-root', registryRootReinitializationAllowed: false, registryRootReplacementAllowed: false };
  const identity = { authorizationRegistryReference: 'stable-registry', registryStorageRole: 'durable-local-governance-state', registryReinitializationAllowed: false, registryDeletionAllowed: false };
  await fs.writeFile(path.join(gitGovernanceRoot, '.phase8-registry-root-identity.json'), JSON.stringify(rootIdentity));
  const fromDataA = new Phase8OneShotAuthorizationRegistry({ governanceRoot: gitGovernanceRoot, rootIdentity, identity });
  await fromDataA.claim({ nonce: 'same-nonce', receiptId: 'same-receipt', bindingHash: 'a'.repeat(64) });
  const fromDataB = new Phase8OneShotAuthorizationRegistry({ governanceRoot: gitGovernanceRoot, rootIdentity, identity });
  await assert.rejects(fromDataB.claim({ nonce: 'same-nonce', receiptId: 'same-receipt', bindingHash: 'a'.repeat(64) }), /authorization_already_claimed/);
});
