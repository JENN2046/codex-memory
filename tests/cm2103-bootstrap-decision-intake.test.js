'use strict';

const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateCm2103BootstrapDecisionIntake,
  isMachineBoundCm2103BootstrapDecision
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapDecisionIntake');

const expectedBinding = Object.freeze({
  expectedDecisionReference: 'CM-2103-TEST-EXACT-BOOTSTRAP',
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

function buildDecision() {
  return {
    schemaVersion: 1,
    taskId: 'CM-2103-R2',
    decisionType: 'exact_identity_bound_synthetic_store_bootstrap_authorization_r2',
    decisionReference: expectedBinding.expectedDecisionReference,
    bootstrapExecutionAuthorized: true,
    storeDirectoryCreationAuthorized: true,
    storeIdentityCreationAuthorized: true,
    identityReadbackVerificationAuthorized: true,
    token: 'APPROVE_CM2103_R2_IDENTITY_BOUND_STORE_BOOTSTRAP_EXACT',
    allowedAction: 'initialize_identity_bound_synthetic_store',
    foundationDecisionReference: expectedBinding.foundationDecisionReference,
    foundationDecisionSourceCommit: expectedBinding.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: expectedBinding.foundationDecisionBlobOid,
    foundationDecisionSha256: expectedBinding.foundationDecisionSha256,
    foundationPacketCommit: expectedBinding.foundationPacketCommit,
    foundationPacketBlobOid: expectedBinding.foundationPacketBlobOid,
    foundationPacketSha256: expectedBinding.foundationPacketSha256,
    bootstrapRequestCommit: expectedBinding.bootstrapRequestCommit,
    bootstrapRequestBlobOid: expectedBinding.bootstrapRequestBlobOid,
    bootstrapRequestSha256: expectedBinding.bootstrapRequestSha256,
    executionPacketCommit: expectedBinding.executionPacketCommit,
    executionPacketBlobOid: expectedBinding.executionPacketBlobOid,
    executionPacketSha256: expectedBinding.executionPacketSha256,
    implementationCommit: expectedBinding.implementationCommit,
    implementationTree: expectedBinding.implementationTree,
    lifecycleReference: expectedBinding.lifecycleReference,
    storeReference: expectedBinding.storeReference,
    storeInstanceId: expectedBinding.storeInstanceId,
    storeRole: expectedBinding.storeRole,
    storeRootBindingSha256: expectedBinding.storeRootBindingSha256,
    governanceRootIdentityReference: expectedBinding.governanceRootIdentityReference,
    governanceRootIdentitySha256: expectedBinding.governanceRootIdentitySha256,
    identityFilename: expectedBinding.identityFilename,
    identityBytes: expectedBinding.identityBytes,
    identitySha256: expectedBinding.identitySha256,
    authorizationRegistryReference: expectedBinding.authorizationRegistryReference,
    claimStorageModel: 'single_atomic_claim_envelope_in_existing_governance_root',
    claimEnvelopeAtomicCreateRequired: true,
    partialAmbiguousReceiptUnionRequired: true,
    durableClaimReentryRequired: true,
    terminalReceiptReconstructionRequired: true,
    nonterminalReceiptProjectionRequired: true,
    corruptEnvelopeLowDisclosureProjectionRequired: true,
    governanceFilesystemEffectsTristateRequired: true,
    reentryTerminalStatePersistenceAllowed: false,
    maxStoreFilesystemAccessesDuringReentry: 0,
    maxStoreFilesystemWritesDuringReentry: 0,
    governanceRegistryDirectoryCreates: 0,
    governanceRegistryIdentityWrites: 0,
    authorizationMarkerWrites: 0,
    nonce: expectedBinding.nonce,
    receiptId: expectedBinding.receiptId,
    authorizationUseCount: 1,
    maxStoreDirectoryCreates: 1,
    maxIdentityWrites: 1,
    maxIdentityReadbackVerifications: 1,
    maxDirectoryEnumerations: 0,
    maxRecordContentReads: 0,
    maxNativeReads: 0,
    maxNativeWrites: 0,
    maxRecordMemoryCalls: 0,
    maxTombstoneMemoryCalls: 0,
    maxVerifyOperations: 0,
    maxRetries: 0,
    emptyStorePreflightAuthorized: false,
    recordMemoryAuthorized: false,
    tombstoneMemoryAuthorized: false,
    verifyAuthorized: false,
    nativeMemoryAuthorized: false,
    parentDirectoryCreationAllowed: false,
    identityOverwriteAllowed: false,
    identityReplacementAllowed: false,
    identityReinitializationAllowed: false,
    identityDeletionAllowed: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    reconciliationRequiredAfterPartialOrAmbiguous: true,
    existingStoreDirectoryOutcome: 'stop_without_read_delete_replace_or_reconcile',
    expiresAt: '2026-07-15T18:00:00+08:00',
    approvedAt: '2026-07-11T15:00:00+08:00'
  };
}

function evaluate(decision, overrides = {}) {
  const bytes = Buffer.from(JSON.stringify(decision), 'utf8');
  return evaluateCm2103BootstrapDecisionIntake({
    decisionBytes: bytes,
    observedBinding: {
      decisionSourceCommit: 'f'.repeat(40),
      decisionBlobOid: '0'.repeat(40),
      decisionSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      ...overrides
    },
    expectedBinding,
    now: new Date('2026-07-11T16:00:00+08:00')
  });
}

test('CM-2103 intake machine-binds only the exact future bootstrap decision', () => {
  const result = evaluate(buildDecision());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, true);
  assert.equal(result.nativeActionsAuthorized, 0);
  assert.equal(isMachineBoundCm2103BootstrapDecision(result.decision), true);
});

test('CM-2103 intake fails closed on schema, authority, identity, limit, replay, or expiry drift', () => {
  const cases = [
    value => ({ ...value, unexpected: true }),
    value => ({ ...value, bootstrapExecutionAuthorized: false }),
    value => ({ ...value, emptyStorePreflightAuthorized: true }),
    value => ({ ...value, nativeMemoryAuthorized: true }),
    value => ({ ...value, storeRootBindingSha256: '0'.repeat(64) }),
    value => ({ ...value, maxStoreDirectoryCreates: 2 }),
    value => ({ ...value, durableClaimReentryRequired: false }),
    value => ({ ...value, governanceFilesystemEffectsTristateRequired: false }),
    value => ({ ...value, maxStoreFilesystemWritesDuringReentry: 1 }),
    value => ({ ...value, maxRetries: 1 }),
    value => ({ ...value, identityOverwriteAllowed: true }),
    value => ({ ...value, expiresAt: '2026-07-11T15:30:00+08:00' })
  ];
  for (const mutate of cases) {
    const result = evaluate(mutate(buildDecision()));
    assert.equal(result.accepted, false);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.decision, null);
  }
});

test('CM-2103 intake rejects raw-byte SHA or Git identity drift', () => {
  const badSha = evaluate(buildDecision(), { decisionSha256: '0'.repeat(64) });
  assert.equal(badSha.accepted, false);
  const badCommit = evaluate(buildDecision(), { decisionSourceCommit: 'not-a-commit' });
  assert.equal(badCommit.accepted, false);
});
