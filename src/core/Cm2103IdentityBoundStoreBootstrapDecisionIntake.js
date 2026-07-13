'use strict';

const crypto = require('node:crypto');

const MACHINE_BOUND_DECISIONS = new WeakSet();

const DECISION_KEYS = Object.freeze([
  'schemaVersion',
  'taskId',
  'decisionType',
  'decisionReference',
  'bootstrapExecutionAuthorized',
  'storeDirectoryCreationAuthorized',
  'storeIdentityCreationAuthorized',
  'identityReadbackVerificationAuthorized',
  'token',
  'allowedAction',
  'foundationDecisionReference',
  'foundationDecisionSourceCommit',
  'foundationDecisionBlobOid',
  'foundationDecisionSha256',
  'foundationPacketCommit',
  'foundationPacketBlobOid',
  'foundationPacketSha256',
  'bootstrapRequestCommit',
  'bootstrapRequestBlobOid',
  'bootstrapRequestSha256',
  'executionPacketCommit',
  'executionPacketBlobOid',
  'executionPacketSha256',
  'implementationCommit',
  'implementationTree',
  'lifecycleReference',
  'storeReference',
  'storeInstanceId',
  'storeRole',
  'storeRootBindingSha256',
  'governanceRootIdentityReference',
  'governanceRootIdentitySha256',
  'identityFilename',
  'identityBytes',
  'identitySha256',
  'authorizationRegistryReference',
  'claimStorageModel',
  'claimEnvelopeAtomicCreateRequired',
  'partialAmbiguousReceiptUnionRequired',
  'durableClaimReentryRequired',
  'terminalReceiptReconstructionRequired',
  'nonterminalReceiptProjectionRequired',
  'corruptEnvelopeLowDisclosureProjectionRequired',
  'governanceFilesystemEffectsTristateRequired',
  'reentryTerminalStatePersistenceAllowed',
  'maxStoreFilesystemAccessesDuringReentry',
  'maxStoreFilesystemWritesDuringReentry',
  'governanceRegistryDirectoryCreates',
  'governanceRegistryIdentityWrites',
  'authorizationMarkerWrites',
  'nonce',
  'receiptId',
  'authorizationUseCount',
  'maxStoreDirectoryCreates',
  'maxIdentityWrites',
  'maxIdentityReadbackVerifications',
  'maxDirectoryEnumerations',
  'maxRecordContentReads',
  'maxNativeReads',
  'maxNativeWrites',
  'maxRecordMemoryCalls',
  'maxTombstoneMemoryCalls',
  'maxVerifyOperations',
  'maxRetries',
  'emptyStorePreflightAuthorized',
  'recordMemoryAuthorized',
  'tombstoneMemoryAuthorized',
  'verifyAuthorized',
  'nativeMemoryAuthorized',
  'parentDirectoryCreationAllowed',
  'identityOverwriteAllowed',
  'identityReplacementAllowed',
  'identityReinitializationAllowed',
  'identityDeletionAllowed',
  'automaticRetryAllowed',
  'automaticCleanupAllowed',
  'reconciliationRequiredAfterPartialOrAmbiguous',
  'existingStoreDirectoryOutcome',
  'expiresAt',
  'approvedAt'
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

function isMachineBoundCm2103BootstrapDecision(decision) {
  return Boolean(decision && typeof decision === 'object' && MACHINE_BOUND_DECISIONS.has(decision));
}

function evaluateCm2103BootstrapDecisionIntake({ decisionBytes, observedBinding, expectedBinding, now = new Date() } = {}) {
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
  try {
    decision = JSON.parse(decisionBytes.toString('utf8'));
  } catch {
    blockers.push('decision.invalidJson');
  }

  if (decision && !exactKeys(decision, DECISION_KEYS)) blockers.push('decision.keys');
  if (decision) {
    const exact = {
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
      existingStoreDirectoryOutcome: 'stop_without_read_delete_replace_or_reconcile'
    };
    for (const [field, expected] of Object.entries(exact)) {
      if (decision[field] !== expected) blockers.push(`decision.${field}`);
    }
    if (decision.expiresAt !== expectedBinding.expectedExpiresAt) blockers.push('decision.expiresAt.binding');
    const approvedAt = Date.parse(decision.approvedAt || '');
    const expiresAt = Date.parse(decision.expiresAt || '');
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(approvedAt)) blockers.push('decision.approvedAt');
    if (Number.isFinite(approvedAt) && approvedAt > nowMs) blockers.push('decision.approvedAt.future');
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs || expiresAt <= approvedAt) {
      blockers.push('decision.expiresAt');
    }
  }

  if (blockers.length) {
    return { accepted: false, blockers: [...new Set(blockers)], decision: null, executionAuthorized: false };
  }
  MACHINE_BOUND_DECISIONS.add(decision);
  return {
    accepted: true,
    blockers: [],
    decision,
    decisionIdentityMachineBound: true,
    executionAuthorized: true,
    emptyStorePreflightAuthorized: false,
    nativeActionsAuthorized: 0
  };
}

module.exports = {
  DECISION_KEYS,
  evaluateCm2103BootstrapDecisionIntake,
  isMachineBoundCm2103BootstrapDecision,
  sha256
};
