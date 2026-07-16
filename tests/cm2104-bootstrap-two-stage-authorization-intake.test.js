'use strict';

const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateCm2104BootstrapAuthorizationContentDecisionIntake,
  evaluateCm2104BootstrapAuthorizationContentDecisionReconciliationIdentity,
  expectedContentDecision,
  isMachineBoundCm2104BootstrapAuthorizationContentDecision
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapAuthorizationContentDecisionIntake');
const {
  evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake,
  evaluateCm2104BootstrapFinalExecutionReleaseDecisionReconciliationIdentity,
  expectedFinalReleaseDecision,
  isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision
} = require('../src/core/Cm2104IdentityBoundStoreBootstrapFinalExecutionReleaseDecisionIntake');
const {
  selectCm2103BootstrapDecisionIntakes
} = require('../src/cli/cm2103-identity-bound-store-bootstrap');

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
  assert.equal(Object.isFrozen(result.decision), true);
  assert.throws(() => { result.decision.bootstrapExecutionAuthorized = true; }, TypeError);
  assert.throws(() => { result.decision.allowedAction = 'caller-drift'; }, TypeError);
  assert.equal(result.decision.bootstrapExecutionAuthorized, false);
  assert.equal(result.decision.allowedAction, 'initialize_identity_bound_synthetic_store');
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
  assert.equal(Object.isFrozen(result.decision), true);
  assert.throws(() => { result.decision.bootstrapExecutionAuthorized = false; }, TypeError);
  assert.throws(() => { result.decision.allowedAction = 'caller-drift'; }, TypeError);
  assert.equal(result.decision.bootstrapExecutionAuthorized, true);
  assert.equal(result.decision.allowedAction, 'initialize_identity_bound_synthetic_store');

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

test('CM-2104 expired exact decisions are reconciliation-only for an existing durable claim', async () => {
  const now = new Date('2026-07-16T00:00:00+08:00');
  const contentFixture = bytesAndBinding(contentDecision(), 'f', '0');
  const historicalContent = evaluateCm2104BootstrapAuthorizationContentDecisionReconciliationIdentity({
    ...contentFixture,
    expectedBinding: expectedContentBinding,
    now
  });
  assert.equal(historicalContent.accepted, true, historicalContent.blockers.join(', '));
  assert.equal(historicalContent.reconciliationIdentityAccepted, true);
  assert.equal(historicalContent.executionAuthorized, false);
  assert.equal(isMachineBoundCm2104BootstrapAuthorizationContentDecision(historicalContent.decision), false);

  const binding = finalBinding(contentFixture.observedBinding);
  const finalDecision = {
    ...expectedFinalReleaseDecision(binding),
    expiresAt: binding.expectedExpiresAt,
    approvedAt: '2026-07-12T11:00:00+08:00'
  };
  const finalFixture = bytesAndBinding(finalDecision, '1', '2');
  const historicalFinal = evaluateCm2104BootstrapFinalExecutionReleaseDecisionReconciliationIdentity({
    ...finalFixture,
    expectedBinding: binding,
    now
  });
  assert.equal(historicalFinal.accepted, true, historicalFinal.blockers.join(', '));
  assert.equal(historicalFinal.reconciliationIdentityAccepted, true);
  assert.equal(historicalFinal.executionAuthorized, false);
  assert.equal(isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision(historicalFinal.decision), false);

  let activeIntakeCalls = 0;
  const selected = await selectCm2103BootstrapDecisionIntakes({
    registry: {
      async preflightUnused() { return { accepted: false, unused: false }; }
    },
    nonce: expectedContentBinding.nonce,
    receiptId: expectedContentBinding.receiptId,
    historicalContentDecisionIntake: historicalContent,
    historicalFinalReleaseDecisionIntake: historicalFinal,
    evaluateActiveContentDecision() { activeIntakeCalls += 1; throw new Error('must_not_run'); },
    evaluateActiveFinalReleaseDecision() { activeIntakeCalls += 1; throw new Error('must_not_run'); }
  });
  assert.equal(selected.existingDurableClaim, true);
  assert.equal(selected.contentDecisionIntake, historicalContent);
  assert.equal(selected.finalReleaseDecisionIntake, historicalFinal);
  assert.equal(activeIntakeCalls, 0);
});

test('CM-2104 expired decisions remain rejected when no durable claim exists', async () => {
  const now = new Date('2026-07-16T00:00:00+08:00');
  const contentFixture = bytesAndBinding(contentDecision(), 'f', '0');
  const historicalContent = evaluateCm2104BootstrapAuthorizationContentDecisionReconciliationIdentity({
    ...contentFixture,
    expectedBinding: expectedContentBinding,
    now
  });
  const binding = finalBinding(contentFixture.observedBinding);
  const finalDecision = {
    ...expectedFinalReleaseDecision(binding),
    expiresAt: binding.expectedExpiresAt,
    approvedAt: '2026-07-12T11:00:00+08:00'
  };
  const finalFixture = bytesAndBinding(finalDecision, '1', '2');
  const historicalFinal = evaluateCm2104BootstrapFinalExecutionReleaseDecisionReconciliationIdentity({
    ...finalFixture,
    expectedBinding: binding,
    now
  });
  let preflightCalls = 0;
  let finalActiveIntakeCalls = 0;
  await assert.rejects(
    selectCm2103BootstrapDecisionIntakes({
      registry: {
        async preflightUnused() {
          preflightCalls += 1;
          return { accepted: true, unused: true };
        }
      },
      nonce: expectedContentBinding.nonce,
      receiptId: expectedContentBinding.receiptId,
      historicalContentDecisionIntake: historicalContent,
      historicalFinalReleaseDecisionIntake: historicalFinal,
      evaluateActiveContentDecision: () => evaluateCm2104BootstrapAuthorizationContentDecisionIntake({
        ...contentFixture,
        expectedBinding: expectedContentBinding,
        now
      }),
      evaluateActiveFinalReleaseDecision() {
        finalActiveIntakeCalls += 1;
        return evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake({
          ...finalFixture,
          expectedBinding: binding,
          now
        });
      }
    }),
    /cm2103_authorization_content_decision_intake_rejected/
  );
  assert.equal(preflightCalls, 1);
  assert.equal(finalActiveIntakeCalls, 0);
});
