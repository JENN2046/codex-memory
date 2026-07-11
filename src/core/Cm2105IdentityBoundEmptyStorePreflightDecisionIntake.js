'use strict';

const crypto = require('node:crypto');

const MACHINE_BOUND_DECISIONS = new WeakSet();

const DECISION_KEYS = Object.freeze([
  'schemaVersion', 'taskId', 'decisionType', 'decisionReference',
  'emptyStorePreflightAuthorized', 'action', 'implementationCommit', 'implementationTree',
  'bootstrapDecisionReference', 'bootstrapDecisionCommit', 'bootstrapDecisionBlobOid',
  'bootstrapDecisionSha256', 'bootstrapReceiptReviewReference', 'bootstrapReceiptCommit',
  'bootstrapReceiptBlobOid', 'bootstrapReceiptSha256', 'storeRootBindingSha256',
  'identityFilename', 'identityBytes', 'identitySha256', 'authorizationUseCount',
  'maxIdentityReadOperations', 'maxDirectoryEnumerationOperations',
  'maxRecordContentReadOperations', 'maxNativeReadCalls', 'maxNativeWrites',
  'maxRecordMemoryCalls', 'maxTombstoneMemoryCalls', 'maxVerifyOperations',
  'realMemoryReadAuthorized', 'realMemoryModificationAuthorized', 'providerCallAuthorized',
  'localFallbackAuthorized', 'rawMemoryReturnAuthorized', 'rawAuditReturnAuthorized',
  'rawPathDisclosureAuthorized', 'expiresAt', 'approvedAt'
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hash(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function expectedCm2105PreflightDecision(expectedBinding) {
  return {
    schemaVersion: 1,
    taskId: 'CM-2105',
    decisionType: 'exact_identity_bound_empty_store_readonly_preflight',
    decisionReference: 'CM-2105-SELF-EMPTY-STORE-PREFLIGHT-017307C9-0622A6E4',
    emptyStorePreflightAuthorized: true,
    action: 'observe_identity_bound_synthetic_store_empty',
    implementationCommit: expectedBinding.implementationCommit,
    implementationTree: expectedBinding.implementationTree,
    bootstrapDecisionReference: 'CM-2104-ER-IDENTITY-BOUND-STORE-BOOTSTRAP-FINAL-RELEASE-0A7CEB6C-017307C9',
    bootstrapDecisionCommit: 'd691fe25cc14cb42f778c0d993a6d7f2582a9068',
    bootstrapDecisionBlobOid: 'ed92d720b34124853d8329580a1d1102ea56be19',
    bootstrapDecisionSha256: '6121eb25d34954cd15137788ab3e1775824c2695dd3e91a0a59e6d9c9a0b5ad2',
    bootstrapReceiptReviewReference: 'CM-2105-SELF-BOOTSTRAP-RECEIPT-PASS-0622A6E4',
    bootstrapReceiptCommit: '030d777fb90845c1c448c5f8e0c99c9681ab7b4f',
    bootstrapReceiptBlobOid: '9f9ea5e914e63c603da68fe0cb1a8c893b879ae1',
    bootstrapReceiptSha256: '0622a6e45262f5c127bc2a22394ed9567cbecec317c793daa2f4b3378e8930b8',
    storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
    identityFilename: '.codex-memory-cm2102-store-identity.json',
    identityBytes: 633,
    identitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57',
    authorizationUseCount: 1,
    maxIdentityReadOperations: 1,
    maxDirectoryEnumerationOperations: 1,
    maxRecordContentReadOperations: 0,
    maxNativeReadCalls: 0,
    maxNativeWrites: 0,
    maxRecordMemoryCalls: 0,
    maxTombstoneMemoryCalls: 0,
    maxVerifyOperations: 0,
    realMemoryReadAuthorized: false,
    realMemoryModificationAuthorized: false,
    providerCallAuthorized: false,
    localFallbackAuthorized: false,
    rawMemoryReturnAuthorized: false,
    rawAuditReturnAuthorized: false,
    rawPathDisclosureAuthorized: false
  };
}

function evaluateCm2105PreflightDecisionIntake({
  decisionBytes,
  observedBinding,
  expectedBinding,
  now = new Date()
} = {}) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes) || !observedBinding || !expectedBinding) {
    return failure(['missing_input']);
  }
  if (!exactKeys(observedBinding, ['decisionSourceCommit', 'decisionBlobOid', 'decisionSha256'])) {
    blockers.push('observedBinding.keys');
  }
  if (!hash(observedBinding.decisionSourceCommit, 40)) blockers.push('observedBinding.decisionSourceCommit');
  if (!hash(observedBinding.decisionBlobOid, 40)) blockers.push('observedBinding.decisionBlobOid');
  if (!hash(observedBinding.decisionSha256, 64) || sha256(decisionBytes) !== observedBinding.decisionSha256) {
    blockers.push('observedBinding.decisionSha256');
  }
  if (!exactKeys(expectedBinding, ['implementationCommit', 'implementationTree', 'expectedExpiresAt'])) {
    blockers.push('expectedBinding.keys');
  }
  let decision = null;
  try { decision = JSON.parse(decisionBytes.toString('utf8')); } catch { blockers.push('decision.invalidJson'); }
  if (decision && !exactKeys(decision, DECISION_KEYS)) blockers.push('decision.keys');
  if (decision) {
    for (const [field, expected] of Object.entries(expectedCm2105PreflightDecision(expectedBinding))) {
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
  if (blockers.length) return failure([...new Set(blockers)]);
  MACHINE_BOUND_DECISIONS.add(decision);
  return {
    accepted: true,
    blockers: [],
    decision,
    decisionIdentityMachineBound: true,
    emptyStorePreflightAuthorized: true,
    nativeActionsAuthorized: 0
  };
}

function isMachineBoundCm2105PreflightDecision(decision) {
  return Boolean(decision && MACHINE_BOUND_DECISIONS.has(decision));
}

function failure(blockers) {
  return {
    accepted: false,
    blockers,
    decision: null,
    decisionIdentityMachineBound: false,
    emptyStorePreflightAuthorized: false,
    nativeActionsAuthorized: 0
  };
}

module.exports = {
  DECISION_KEYS,
  evaluateCm2105PreflightDecisionIntake,
  expectedCm2105PreflightDecision,
  isMachineBoundCm2105PreflightDecision
};
