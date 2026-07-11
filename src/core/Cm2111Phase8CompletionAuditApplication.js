'use strict';

const crypto = require('node:crypto');
const {
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('./NearModelMemoryPlanPackCompletionAudit');

const PHASE_ID = 'phase8_native_write_production_proof';
const FREEZE_COMMIT = '1de196fb4e986d715570335dc2bd7b551968ac5f';
const BUNDLE = Object.freeze({
  commit: FREEZE_COMMIT,
  blobOid: '4535ebac2d58ac48a3c388ed917004df5b0cba9e',
  bytes: 3465,
  rawSha256: 'd629f341710fcd4d95a5107a5913bf172b58cd19c77eb08a972f36b3df57eba8',
  payloadSha256: '77d162edba2dc7c6911653c1f251cc0ea5b1a96a1db5c1748fd4ba2b2f84fe9d'
});
const DECISION = Object.freeze({
  reference: 'CM-2111-SELF-PHASE8-COMPLETION-AUDIT-77D162ED',
  commit: FREEZE_COMMIT,
  blobOid: '47190af4ac3326e4fe8031871d93e3e35285e052',
  bytes: 1601,
  rawSha256: '04bd1a964743c17f7693f4903ee2722805b6acffbfec6974169f0c883bdf068f',
  payloadSha256: '541eee91eb45e4c3526bdcfb5426a7afb74e4feb00aa953873af11cf30006f12'
});
const BASELINE = Object.freeze({
  completionAuditBlobOid: 'e6b310f920356eb9689b3eff0f2c1ddfc14e0f59',
  traceMatrixBlobOid: 'e7ff98e96b811b66390d900d7e7dc890e4f0d4f0'
});
const REQUIRED_FIELDS = Object.freeze([
  ...PHASE_REQUIREMENTS.find(item => item.id === PHASE_ID).requiredEvidence
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function sha256Canonical(value) { return sha256(JSON.stringify(canonicalize(value))); }

function expectedPatch() {
  return { rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: true, fullPlanPackCompleted: false, readinessClaimed: false };
}

function expectedBundleResult() {
  return { phase8Completed: true, fullPlanPackCompleted: false, readinessClaimed: false };
}

function evaluateBundle(bundle = {}) {
  const blockers = [];
  if (sha256Canonical(bundle) !== BUNDLE.payloadSha256) blockers.push('bundle.payloadSha256');
  if (bundle.phaseId !== PHASE_ID || bundle.bundleType !== 'phase8_completion_audit_evidence_bundle') blockers.push('bundle.identity');
  const evidenceKeys = Object.keys(bundle.evidence || {}).sort();
  if (JSON.stringify(evidenceKeys) !== JSON.stringify([...REQUIRED_FIELDS].sort())) blockers.push('bundle.evidence.fields');
  for (const field of REQUIRED_FIELDS) if (bundle.evidence?.[field] !== true) blockers.push(`bundle.evidence.${field}`);
  if (bundle.currentState?.phase8Completed !== false || bundle.currentState?.fullPlanPackCompleted !== false || bundle.currentState?.readinessClaimed !== false) blockers.push('bundle.currentState');
  for (const [field, expected] of Object.entries(expectedBundleResult())) if (bundle.allowedCompletionResult?.[field] !== expected) blockers.push(`bundle.allowedCompletionResult.${field}`);
  for (const field of ['nativeReads', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (bundle.sideEffectCounters?.[field] !== 0) blockers.push(`bundle.sideEffectCounters.${field}`);
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence: bundle.evidence });
  const phase = audit.phaseResults.find(item => item.id === PHASE_ID);
  if (!phase || phase.accepted !== true || phase.missingEvidence.length !== 0) blockers.push('bundle.phaseAudit');
  if (audit.fullPlanPackCompleted !== false || audit.stopReasons.length !== 0) blockers.push('bundle.auditBoundary');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)], phaseAudit: phase, fullAudit: audit };
}

function evaluateDecision(decision = {}) {
  const blockers = [];
  if (sha256Canonical(decision) !== DECISION.payloadSha256) blockers.push('decision.payloadSha256');
  if (decision.decisionReference !== DECISION.reference || decision.phase8CompletionAuditApplicationAuthorized !== true || decision.decisionRequiresGitFreezeBeforeApplication !== true) blockers.push('decision.authority');
  if (decision.evidenceBundle?.bytes !== BUNDLE.bytes || decision.evidenceBundle?.rawSha256 !== BUNDLE.rawSha256 || decision.evidenceBundle?.payloadSha256 !== BUNDLE.payloadSha256) blockers.push('decision.evidenceBundle');
  for (const [field, expected] of Object.entries(expectedPatch())) if (decision.allowedPatch?.[field] !== expected) blockers.push(`decision.allowedPatch.${field}`);
  if (decision.applicationAuthorization?.useCount !== 1 || decision.applicationAuthorization?.replayAllowed !== false) blockers.push('decision.applicationAuthorization');
  if (decision.applicationSideEffectLimits?.completionAuditPatchApplications !== 1) blockers.push('decision.applicationSideEffectLimits.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (decision.applicationSideEffectLimits?.[field] !== 0) blockers.push(`decision.applicationSideEffectLimits.${field}`);
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function executePhase8CompletionAuditApplication(input = {}) {
  const blockers = [];
  const bundleResult = evaluateBundle(input.bundle);
  const decisionResult = evaluateDecision(input.decision);
  if (!bundleResult.accepted) blockers.push(...bundleResult.blockers);
  if (!decisionResult.accepted) blockers.push(...decisionResult.blockers);
  const exactBindings = {
    bundleCommit: BUNDLE.commit,
    bundleBlobOid: BUNDLE.blobOid,
    bundleBytes: BUNDLE.bytes,
    bundleSha256: BUNDLE.rawSha256,
    decisionCommit: DECISION.commit,
    decisionBlobOid: DECISION.blobOid,
    decisionBytes: DECISION.bytes,
    decisionSha256: DECISION.rawSha256
  };
  for (const [field, expected] of Object.entries(exactBindings)) if (input.bindings?.[field] !== expected) blockers.push(`bindings.${field}`);
  if (input.baseline?.completionAuditBlobOid !== BASELINE.completionAuditBlobOid || input.baseline?.traceMatrixBlobOid !== BASELINE.traceMatrixBlobOid) blockers.push('baseline.blobOid');
  if (input.baseline?.completionAuditWorktreeMatchesHead !== true || input.baseline?.traceMatrixWorktreeMatchesHead !== true || input.baseline?.applicationReceiptAbsent !== true) blockers.push('baseline.worktreeOrReceipt');
  if (input.baseline?.rollbackDrillPassed !== true || input.baseline?.failureRecoveryProofPassed !== true || input.baseline?.phase8Completed !== false) blockers.push('baseline.evidenceState');
  if (input.runtimeFacts?.clean !== true || !/^[a-f0-9]{40}$/.test(input.runtimeFacts?.commit || '') || !/^[a-f0-9]{40}$/.test(input.runtimeFacts?.tree || '')) blockers.push('runtimeFacts');
  if (blockers.length) return failure('completion_audit_gate', blockers);

  const patch = expectedPatch();
  const receiptPayload = {
    schemaVersion: 1,
    taskId: 'CM-2111',
    receiptType: 'phase8_completion_audit_application_receipt',
    decision: { reference: DECISION.reference, commit: DECISION.commit, blobOid: DECISION.blobOid, bytes: DECISION.bytes, sha256: DECISION.rawSha256 },
    evidenceBundle: { commit: BUNDLE.commit, blobOid: BUNDLE.blobOid, bytes: BUNDLE.bytes, sha256: BUNDLE.rawSha256, payloadSha256: BUNDLE.payloadSha256, requiredEvidenceCount: REQUIRED_FIELDS.length },
    phaseAudit: { phaseId: PHASE_ID, accepted: true, missingEvidence: [], fullPlanPackCompleted: false },
    applicationRuntime: { commit: input.runtimeFacts.commit, tree: input.runtimeFacts.tree, cleanBeforeApplication: true, completionAuditBaselineBlobOid: BASELINE.completionAuditBlobOid, traceMatrixBaselineBlobOid: BASELINE.traceMatrixBlobOid },
    contractResults: { completionAuditGate: 'cm2111_phase8_completion_audit_gate_accepted', patchBoundary: 'cm2111_phase8_completion_patch_boundary_accepted', patchApplication: 'cm2111_phase8_completion_patch_application_accepted' },
    appliedState: patch,
    authorization: { useCount: 1, consumed: true, replayAllowed: false },
    applicationCounters: { completionAuditPatchApplications: 1, nativeReads: 0, nativeWrites: 0, verifyOperations: 0, rollbackOrCompensationOperations: 0, remoteActions: 0, readinessClaims: 0 },
    nonClaims: { productionReady: false, releaseReady: false, rcReady: false, completeV8: false, fullPlanPackCompleted: false, readinessClaimed: false }
  };
  return { accepted: true, blockers: [], completionAuditGateAccepted: true, patchBoundaryAccepted: true, patchApplicationAccepted: true, receiptPayload, receiptPayloadSha256: sha256Canonical(receiptPayload), appliedState: patch, phase8Completed: true, fullPlanPackCompleted: false, readinessClaimed: false, additionalNativeActionAuthorized: false };
}

function evaluateApplicationReceipt(receipt = {}) {
  const blockers = [];
  const payload = receipt.receiptPayload || {};
  if (sha256Canonical(payload) !== receipt.receiptPayloadSha256) blockers.push('receipt.receiptPayloadSha256');
  if (payload.decision?.reference !== DECISION.reference || payload.decision?.commit !== DECISION.commit || payload.decision?.blobOid !== DECISION.blobOid || payload.decision?.sha256 !== DECISION.rawSha256) blockers.push('receipt.decision');
  if (payload.evidenceBundle?.commit !== BUNDLE.commit || payload.evidenceBundle?.blobOid !== BUNDLE.blobOid || payload.evidenceBundle?.sha256 !== BUNDLE.rawSha256 || payload.evidenceBundle?.payloadSha256 !== BUNDLE.payloadSha256 || payload.evidenceBundle?.requiredEvidenceCount !== REQUIRED_FIELDS.length) blockers.push('receipt.evidenceBundle');
  if (payload.phaseAudit?.phaseId !== PHASE_ID || payload.phaseAudit?.accepted !== true || payload.phaseAudit?.missingEvidence?.length !== 0 || payload.phaseAudit?.fullPlanPackCompleted !== false) blockers.push('receipt.phaseAudit');
  for (const [field, expected] of Object.entries(expectedPatch())) if (payload.appliedState?.[field] !== expected) blockers.push(`receipt.appliedState.${field}`);
  if (payload.authorization?.useCount !== 1 || payload.authorization?.consumed !== true || payload.authorization?.replayAllowed !== false) blockers.push('receipt.authorization');
  if (payload.applicationCounters?.completionAuditPatchApplications !== 1) blockers.push('receipt.applicationCounters.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (payload.applicationCounters?.[field] !== 0) blockers.push(`receipt.applicationCounters.${field}`);
  for (const field of ['productionReady', 'releaseReady', 'rcReady', 'completeV8', 'fullPlanPackCompleted', 'readinessClaimed']) if (payload.nonClaims?.[field] !== false) blockers.push(`receipt.nonClaims.${field}`);
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)], applicationReceiptAccepted: blockers.length === 0, phase8Completed: blockers.length === 0, fullPlanPackCompleted: false, readinessClaimed: false, additionalNativeActionAuthorized: false };
}

function failure(step, blockers) {
  return { accepted: false, failedStep: step, blockers: [...new Set(blockers)], completionAuditGateAccepted: false, patchBoundaryAccepted: false, patchApplicationAccepted: false, phase8Completed: false, fullPlanPackCompleted: false, readinessClaimed: false, additionalNativeActionAuthorized: false };
}

module.exports = { BASELINE, BUNDLE, DECISION, PHASE_ID, REQUIRED_FIELDS, evaluateApplicationReceipt, evaluateBundle, evaluateDecision, executePhase8CompletionAuditApplication, expectedPatch, sha256Canonical };
