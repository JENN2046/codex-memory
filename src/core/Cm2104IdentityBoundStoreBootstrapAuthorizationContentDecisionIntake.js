'use strict';

const crypto = require('node:crypto');

const MACHINE_BOUND_CONTENT_DECISIONS = new WeakSet();

const CONTENT_DECISION_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'decisionType', 'decisionReference',
  'authorizationContentApproved', 'bootstrapExecutionAuthorized',
  'storeDirectoryCreationAuthorized', 'storeIdentityCreationAuthorized',
  'identityReadbackVerificationAuthorized', 'finalExecutionReleaseReviewRequired',
  'expectedFinalReleaseDecisionReference', 'token', 'allowedAction',
  'foundationDecisionReference', 'foundationDecisionSourceCommit',
  'foundationDecisionBlobOid', 'foundationDecisionSha256',
  'foundationPacketCommit', 'foundationPacketBlobOid', 'foundationPacketSha256',
  'bootstrapRequestCommit', 'bootstrapRequestBlobOid', 'bootstrapRequestSha256',
  'executionPacketCommit', 'executionPacketBlobOid', 'executionPacketSha256',
  'implementationCommit', 'implementationTree', 'lifecycleReference',
  'storeReference', 'storeInstanceId', 'storeRole', 'storeRootBindingSha256',
  'governanceRootIdentityReference', 'governanceRootIdentitySha256',
  'identityFilename', 'identityBytes', 'identitySha256',
  'authorizationRegistryReference', 'claimStorageModel',
  'claimEnvelopeAtomicCreateRequired', 'durableClaimReentryRequired',
  'governanceFilesystemEffectsTristateRequired',
  'reentryTerminalStatePersistenceAllowed',
  'maxStoreFilesystemAccessesDuringReentry', 'maxStoreFilesystemWritesDuringReentry',
  'nonce', 'receiptId', 'authorizationUseCount', 'maxStoreDirectoryCreates',
  'maxIdentityWrites', 'maxIdentityReadbackVerifications', 'maxDirectoryEnumerations',
  'maxRecordContentReads', 'maxNativeReads', 'maxNativeWrites',
  'maxRecordMemoryCalls', 'maxTombstoneMemoryCalls', 'maxVerifyOperations',
  'maxRetries', 'emptyStorePreflightAuthorized', 'recordMemoryAuthorized',
  'tombstoneMemoryAuthorized', 'verifyAuthorized', 'nativeMemoryAuthorized',
  'parentDirectoryCreationAllowed', 'identityOverwriteAllowed',
  'identityReplacementAllowed', 'identityReinitializationAllowed',
  'identityDeletionAllowed', 'automaticRetryAllowed', 'automaticCleanupAllowed',
  'expiresAt', 'approvedAt'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function isHash(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function isMachineBoundCm2104BootstrapAuthorizationContentDecision(decision) {
  return Boolean(decision && typeof decision === 'object' && MACHINE_BOUND_CONTENT_DECISIONS.has(decision));
}

function expectedContentDecision(expectedBinding) {
  return {
    schemaVersion: 1,
    taskId: 'CM-2104',
    decisionType: 'exact_identity_bound_synthetic_store_bootstrap_authorization_content',
    decisionReference: expectedBinding.expectedContentDecisionReference,
    authorizationContentApproved: true,
    bootstrapExecutionAuthorized: false,
    storeDirectoryCreationAuthorized: false,
    storeIdentityCreationAuthorized: false,
    identityReadbackVerificationAuthorized: false,
    finalExecutionReleaseReviewRequired: true,
    expectedFinalReleaseDecisionReference: expectedBinding.expectedFinalReleaseDecisionReference,
    token: 'APPROVE_CM2104_IDENTITY_BOUND_STORE_BOOTSTRAP_CONTENT_EXACT',
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
    durableClaimReentryRequired: true,
    governanceFilesystemEffectsTristateRequired: true,
    reentryTerminalStatePersistenceAllowed: false,
    maxStoreFilesystemAccessesDuringReentry: 0,
    maxStoreFilesystemWritesDuringReentry: 0,
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
    automaticCleanupAllowed: false
  };
}

function evaluateCm2104BootstrapAuthorizationContentDecisionIntake({
  decisionBytes,
  observedBinding,
  expectedBinding,
  now = new Date()
} = {}) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes) || !observedBinding || !expectedBinding) {
    return { accepted: false, blockers: ['missing_input'], decision: null, executionAuthorized: false };
  }
  if (!exactKeys(observedBinding, ['decisionSourceCommit', 'decisionBlobOid', 'decisionSha256'])) {
    blockers.push('observedBinding.keys');
  }
  if (!isHash(observedBinding.decisionSourceCommit, 40)) blockers.push('observedBinding.decisionSourceCommit');
  if (!isHash(observedBinding.decisionBlobOid, 40)) blockers.push('observedBinding.decisionBlobOid');
  if (!isHash(observedBinding.decisionSha256, 64) || sha256(decisionBytes) !== observedBinding.decisionSha256) {
    blockers.push('observedBinding.decisionSha256');
  }

  let decision = null;
  try { decision = JSON.parse(decisionBytes.toString('utf8')); } catch { blockers.push('decision.invalidJson'); }
  if (decision && !exactKeys(decision, CONTENT_DECISION_KEYS)) blockers.push('decision.keys');
  if (decision) {
    for (const [field, expected] of Object.entries(expectedContentDecision(expectedBinding))) {
      if (decision[field] !== expected) blockers.push(`decision.${field}`);
    }
    if (decision.expiresAt !== expectedBinding.expectedExpiresAt) blockers.push('decision.expiresAt.binding');
    const approvedAt = Date.parse(decision.approvedAt || '');
    const expiresAt = Date.parse(decision.expiresAt || '');
    if (!Number.isFinite(approvedAt)) blockers.push('decision.approvedAt');
    if (!Number.isFinite(expiresAt) || expiresAt <= new Date(now).getTime() || expiresAt <= approvedAt) {
      blockers.push('decision.expiresAt');
    }
  }
  if (blockers.length) {
    return { accepted: false, blockers: [...new Set(blockers)], decision: null, executionAuthorized: false };
  }
  MACHINE_BOUND_CONTENT_DECISIONS.add(decision);
  return {
    accepted: true,
    blockers: [],
    decision,
    decisionIdentityMachineBound: true,
    authorizationContentApproved: true,
    executionAuthorized: false,
    finalExecutionReleaseRequired: true
  };
}

module.exports = {
  CONTENT_DECISION_KEYS,
  evaluateCm2104BootstrapAuthorizationContentDecisionIntake,
  expectedContentDecision,
  isMachineBoundCm2104BootstrapAuthorizationContentDecision
};
