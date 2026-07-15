'use strict';

const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateCm2104BootstrapAuthorizationContentDecisionIntake,
  expectedContentDecision,
  isMachineBoundCm2104BootstrapAuthorizationContentDecision
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationContentDecisionIntake');
const {
  evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake,
  expectedFinalReleaseDecision,
  isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapFinalExecutionReleaseDecisionIntake');

const expectedContentBinding = Object.freeze({
  expectedContentDecisionReference: 'CM-2104-TEST-CONTENT',
  expectedFinalReleaseDecisionReference: 'CM-2104-TEST-FINAL-RELEASE',
  foundationDecisionReference: 'CM-2102-TEST-FOUNDATION',
  foundationDecisionSourceCommit: '1'.repeat(40),
  foundationDecisionBlobOid: '2'.repeat(40),
  foundationDecisionSha256: '3'.repeat(64),
  foundationPacketCommit: '4'.repeat(40),
  foundationPacketBlobOid: '5'.repeat(40),
  foundationPacketSha256: '6'.repeat(64),
  bootstrapRequestCommit: '7'.repeat(40),
  bootstrapRequestBlobOid: '8'.repeat(40),
  bootstrapRequestSha256: '9'.repeat(64),
  executionPacketCommit: 'a'.repeat(40),
  executionPacketBlobOid: 'b'.repeat(40),
  executionPacketSha256: 'c'.repeat(64),
  implementationCommit: 'd'.repeat(40),
  implementationTree: 'e'.repeat(40),
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  storeReference: 'phase8-identity-bound-synthetic-rollback-store-001',
  storeInstanceId: 'phase8-identity-bound-synthetic-rollback-store-instance-001',
  storeRole: 'phase8_identity_bound_synthetic_rollback_store',
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
  governanceRootIdentityReference: 'codex-memory-phase8-governance-root',
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  identityFilename: '.codex-memory-cm2102-store-identity.json',
  identityBytes: 633,
  identitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
  authorizationRegistryReference: 'cm2103-identity-bound-store-bootstrap-registry-001',
  nonce: 'cm2102-identity-bound-store-bootstrap-001',
  receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001',
  expectedExpiresAt: '2026-07-15T18:00:00+08:00'
});

function bytesAndBinding(decision, commitChar, blobChar) {
  const decisionBytes = Buffer.from(JSON.stringify(decision), 'utf8');
  return {
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: commitChar.repeat(40),
      decisionBlobOid: blobChar.repeat(40),
      decisionSha256: crypto.createHash('sha256').update(decisionBytes).digest('hex')
    }
  };
}

function contentDecision(overrides = {}) {
  return {
    ...expectedContentDecision(expectedContentBinding),
    expiresAt: expectedContentBinding.expectedExpiresAt,
    approvedAt: '2026-07-12T09:00:00+08:00',
    ...overrides
  };
}

function finalBinding(contentObserved) {
  return {
    expectedFinalReleaseDecisionReference: expectedContentBinding.expectedFinalReleaseDecisionReference,
    authorizationContentDecisionReference: expectedContentBinding.expectedContentDecisionReference,
    authorizationContentDecisionSourceCommit: contentObserved.decisionSourceCommit,
    authorizationContentDecisionBlobOid: contentObserved.decisionBlobOid,
    authorizationContentDecisionSha256: contentObserved.decisionSha256,
    authorizationContentDecisionApprovedAt: contentDecision().approvedAt,
    executionPacketCommit: expectedContentBinding.executionPacketCommit,
    executionPacketBlobOid: expectedContentBinding.executionPacketBlobOid,
    executionPacketSha256: expectedContentBinding.executionPacketSha256,
    implementationCommit: expectedContentBinding.implementationCommit,
    implementationTree: expectedContentBinding.implementationTree,
    lifecycleReference: expectedContentBinding.lifecycleReference,
    storeReference: expectedContentBinding.storeReference,
    storeInstanceId: expectedContentBinding.storeInstanceId,
    storeRole: expectedContentBinding.storeRole,
    storeRootBindingSha256: expectedContentBinding.storeRootBindingSha256,
    governanceRootIdentityReference: expectedContentBinding.governanceRootIdentityReference,
    governanceRootIdentitySha256: expectedContentBinding.governanceRootIdentitySha256,
    identityFilename: expectedContentBinding.identityFilename,
    identityBytes: expectedContentBinding.identityBytes,
    identitySha256: expectedContentBinding.identitySha256,
    authorizationRegistryReference: expectedContentBinding.authorizationRegistryReference,
    nonce: expectedContentBinding.nonce,
    receiptId: expectedContentBinding.receiptId,
    expectedExpiresAt: expectedContentBinding.expectedExpiresAt
  };
}

test('CM-2104 content intake machine-binds approval content without execution authority', () => {
  const fixture = bytesAndBinding(contentDecision(), 'f', '0');
  const result = evaluateCm2104BootstrapAuthorizationContentDecisionIntake({
    ...fixture,
    expectedBinding: expectedContentBinding,
    now: new Date('2026-07-12T10:00:00+08:00')
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationContentApproved, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.finalExecutionReleaseRequired, true);
  assert.equal(isMachineBoundCm2104BootstrapAuthorizationContentDecision(result.decision), true);
  assert.equal(isMachineBoundCm2104BootstrapAuthorizationContentDecision({ ...result.decision }), false);
});

test('CM-2104 content intake rejects authority, packet, identity, or expiry drift', () => {
  const cases = [
    { bootstrapExecutionAuthorized: true },
    { finalExecutionReleaseReviewRequired: false },
    { executionPacketSha256: '0'.repeat(64) },
    { identitySha256: '0'.repeat(64) },
    { maxNativeWrites: 1 },
    { approvedAt: '2026-07-12T10:00:00.001+08:00' },
    { approvedAt: expectedContentBinding.expectedExpiresAt },
    { expiresAt: '2026-07-12T09:30:00+08:00' },
    { unexpected: true }
  ];
  for (const drift of cases) {
    const fixture = bytesAndBinding(contentDecision(drift), 'f', '0');
    const result = evaluateCm2104BootstrapAuthorizationContentDecisionIntake({
      ...fixture,
      expectedBinding: expectedContentBinding,
      now: new Date('2026-07-12T10:00:00+08:00')
    });
    assert.equal(result.accepted, false, JSON.stringify(drift));
    assert.equal(result.executionAuthorized, false);
  }
});

test('CM-2104 final release must bind the exact content Git identity before authorizing bootstrap', () => {
  const contentFixture = bytesAndBinding(contentDecision(), 'f', '0');
  const binding = finalBinding(contentFixture.observedBinding);
  const decision = {
    ...expectedFinalReleaseDecision(binding),
    expiresAt: binding.expectedExpiresAt,
    approvedAt: '2026-07-12T11:00:00+08:00'
  };
  const fixture = bytesAndBinding(decision, '1', '2');
  const result = evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake({
    ...fixture,
    expectedBinding: binding,
    now: new Date('2026-07-12T12:00:00+08:00')
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, true);
  assert.equal(isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision(result.decision), true);
  assert.equal(isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision({ ...result.decision }), false);

  for (const drift of [
    { authorizationContentDecisionSourceCommit: '3'.repeat(40) },
    { authorizationContentDecisionSha256: '4'.repeat(64) },
    { executionPacketCommit: '5'.repeat(40) },
    { bootstrapExecutionAuthorized: false },
    { maxStoreDirectoryCreates: 2 },
    { maxNativeWrites: 1 },
    { approvedAt: '2026-07-12T08:59:59+08:00' },
    { approvedAt: contentDecision().approvedAt },
    { approvedAt: '2026-07-12T12:00:00.001+08:00' },
    { approvedAt: binding.expectedExpiresAt },
    { expiresAt: '2026-07-12T11:30:00+08:00' }
  ]) {
    const driftFixture = bytesAndBinding({ ...decision, ...drift }, '1', '2');
    const rejected = evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake({
      ...driftFixture,
      expectedBinding: binding,
      now: new Date('2026-07-12T12:00:00+08:00')
    });
    assert.equal(rejected.accepted, false, JSON.stringify(drift));
    assert.equal(rejected.executionAuthorized, false);
  }
});
