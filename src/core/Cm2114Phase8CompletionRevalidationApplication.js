'use strict';

const crypto = require('node:crypto');
const {
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('./NearModelMemoryPlanPackCompletionAudit');
const { evaluateCm2113VcpToolBoxOwnerNativeProofReceipt } = require('./Cm2113VcpToolBoxOwnerNativeProofReceiptContract');

const PHASE_ID = 'phase8_native_write_production_proof';
const REQUIRED_FIELDS = Object.freeze([
  ...PHASE_REQUIREMENTS.find(item => item.id === PHASE_ID).requiredEvidence
]);
const BUNDLE = Object.freeze({
  commit: '8f33fd03e8055d57f8a65c5a7f00254c3232afe4',
  blobOid: '1b36f23e4a649c44c9882cbb33348e884dd2c55d',
  bytes: 2821,
  rawSha256: '6fc1b8374b33327681ad3ff410c85061b8b0a19c56e5eca9c6b3ce58cce34bba',
  payloadSha256: '01d72d5b8fec7725f6f437bcc20eda17d15afc6ee16a43be26e2773c9512345d'
});
const DECISION = Object.freeze({
  reference: 'CM-2114-SELF-PHASE8-REVALIDATION-APPLICATION-01D72D5B',
  commit: '20a1cc2bb33bdca9acb0bd099a5a96052a5df85c',
  blobOid: '1995858e5a01ada82ccf7aea86164cbd6f62af20',
  bytes: 1796,
  rawSha256: '869a3d637a03190c0b354f0dcd1d968d0137f5a1fe74de934d759d44247a90c2'
});
const PROOF = Object.freeze({
  commit: 'cd0b986420a0be33d197c00c7bc3906d3ebfe887',
  blobOid: 'd3b8cd54e70cdbb57b6c92443bc85a0eafb7ec92',
  bytes: 4089,
  rawSha256: '1996cdd696d607aa319749f897b6b5a795cf08998e12c69dc3a30e8741838162'
});
const BASELINE = Object.freeze({
  completionAuditBlobOid: '75d7fa92889c09e01afd5042c1074ddda608e551',
  traceMatrixBlobOid: '6ad7ac9453039be795b4be8318818cc53f13e00c'
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function sha256Canonical(value) { return sha256(JSON.stringify(canonicalize(value))); }

function hasExactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function expectedPatch() {
  return {
    vcpToolBoxOwnedRuntimeWritePassed: true,
    actualTransportBindingPassed: true,
    stableTargetStoreIdentityPassed: true,
    phase8Completed: true,
    phase8CompletionStatus: 'revalidated_complete',
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function evaluateBundle(bundle = {}, proofReceipt = {}) {
  const blockers = [];
  const { bundlePayloadSha256, ...payload } = bundle;
  if (bundlePayloadSha256 !== BUNDLE.payloadSha256 || sha256Canonical(payload) !== BUNDLE.payloadSha256) blockers.push('bundle.payloadSha256');
  if (bundle.schemaVersion !== 1 || bundle.taskId !== 'CM-2114' || bundle.bundleType !== 'phase8_completion_revalidation_evidence_bundle' || bundle.phaseId !== PHASE_ID) blockers.push('bundle.identity');
  const evidenceKeys = Object.keys(bundle.evidence || {}).sort();
  if (JSON.stringify(evidenceKeys) !== JSON.stringify([...REQUIRED_FIELDS].sort())) blockers.push('bundle.evidence.fields');
  for (const field of REQUIRED_FIELDS) if (bundle.evidence?.[field] !== true) blockers.push(`bundle.evidence.${field}`);
  if (bundle.newProofReceiptGitIdentity?.sourceCommit !== PROOF.commit || bundle.newProofReceiptGitIdentity?.blobOid !== PROOF.blobOid || bundle.newProofReceiptGitIdentity?.bytes !== PROOF.bytes || bundle.newProofReceiptGitIdentity?.sha256 !== PROOF.rawSha256) blockers.push('bundle.newProofReceiptGitIdentity');
  if (bundle.currentState?.phase8Completed !== false || bundle.currentState?.phase8CompletionStatus !== 'needs_revalidation' || bundle.currentState?.fullPlanPackCompleted !== false || bundle.currentState?.readinessClaimed !== false) blockers.push('bundle.currentState');
  const patch = expectedPatch();
  for (const field of ['phase8Completed', 'phase8CompletionStatus', 'fullPlanPackCompleted', 'readinessClaimed']) if (bundle.allowedCompletionResult?.[field] !== patch[field]) blockers.push(`bundle.allowedCompletionResult.${field}`);
  if (bundle.proofSideEffects?.ownerRuntimeNativeWrites !== 1 || bundle.proofSideEffects?.verifyOperations !== 1 || bundle.proofSideEffects?.durableRecordCount !== 1 || bundle.proofSideEffects?.automaticRetries !== 0 || bundle.proofSideEffects?.rollbackOrCompensationOperations !== 0 || bundle.proofSideEffects?.realMemoryReads !== 0 || bundle.proofSideEffects?.remoteActions !== 0) blockers.push('bundle.proofSideEffects');
  for (const field of ['completionAuditPatchApplications', 'nativeReads', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (bundle.applicationSideEffectCounters?.[field] !== 0) blockers.push(`bundle.applicationSideEffectCounters.${field}`);
  for (const field of ['derivedIndexProofAccepted', 'productionProviderProofAccepted', 'productionReady', 'releaseReady', 'rcReady', 'completeV8', 'fullPlanPackCompleted', 'readinessClaimed']) if (bundle.nonClaims?.[field] !== false) blockers.push(`bundle.nonClaims.${field}`);
  const proof = evaluateCm2113VcpToolBoxOwnerNativeProofReceipt(proofReceipt);
  if (!proof.accepted) blockers.push(...proof.blockers.map(item => `proof.${item}`));
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence: bundle.evidence });
  const phase = audit.phaseResults.find(item => item.id === PHASE_ID);
  if (!phase?.accepted || phase.missingEvidence.length !== 0 || audit.fullPlanPackCompleted !== false) blockers.push('bundle.phaseAudit');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)], phaseAudit: phase, fullAudit: audit };
}

function evaluateDecision(decision = {}) {
  const blockers = [];
  if (decision.schemaVersion !== 1 || decision.taskId !== 'CM-2114' || decision.decisionReference !== DECISION.reference || decision.completionAuditReapplicationAuthorized !== true) blockers.push('decision.authority');
  if (decision.evidenceBundleGitIdentity?.sourceCommit !== BUNDLE.commit || decision.evidenceBundleGitIdentity?.blobOid !== BUNDLE.blobOid || decision.evidenceBundleGitIdentity?.bytes !== BUNDLE.bytes || decision.evidenceBundleGitIdentity?.sha256 !== BUNDLE.rawSha256 || decision.evidenceBundleGitIdentity?.payloadSha256 !== BUNDLE.payloadSha256) blockers.push('decision.evidenceBundle');
  if (decision.newProofReceiptGitIdentity?.sourceCommit !== PROOF.commit || decision.newProofReceiptGitIdentity?.blobOid !== PROOF.blobOid || decision.newProofReceiptGitIdentity?.bytes !== PROOF.bytes || decision.newProofReceiptGitIdentity?.sha256 !== PROOF.rawSha256) blockers.push('decision.newProofReceipt');
  for (const field of ['vcpToolBoxOwnedRuntimeWritePassed', 'actualTransportBindingPassed', 'stableTargetStoreIdentityPassed']) if (decision.requiredEvidencePatch?.[field] !== true) blockers.push(`decision.requiredEvidencePatch.${field}`);
  const patch = expectedPatch();
  for (const field of ['phase8Completed', 'phase8CompletionStatus', 'fullPlanPackCompleted', 'readinessClaimed']) if (decision.allowedCompletionResult?.[field] !== patch[field]) blockers.push(`decision.allowedCompletionResult.${field}`);
  if (decision.applicationAuthorization?.useCount !== 1 || decision.applicationAuthorization?.replayAllowed !== false) blockers.push('decision.applicationAuthorization');
  if (decision.applicationSideEffectLimits?.completionAuditPatchApplications !== 1) blockers.push('decision.applicationSideEffectLimits.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (decision.applicationSideEffectLimits?.[field] !== 0) blockers.push(`decision.applicationSideEffectLimits.${field}`);
  for (const field of ['additionalNativeWriteAuthorized', 'derivedIndexProofAccepted', 'productionProviderProofAccepted', 'productionReady', 'releaseReady', 'rcReady', 'completeV8', 'fullPlanPackCompleted', 'readinessClaimed']) if (decision.nonClaims?.[field] !== false) blockers.push(`decision.nonClaims.${field}`);
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function executeCm2114Phase8CompletionRevalidationApplication(input = {}) {
  const blockers = [];
  const bundle = evaluateBundle(input.bundle, input.proofReceipt);
  const decision = evaluateDecision(input.decision);
  if (!bundle.accepted) blockers.push(...bundle.blockers);
  if (!decision.accepted) blockers.push(...decision.blockers);
  const exactBindings = {
    bundleCommit: BUNDLE.commit,
    bundleBlobOid: BUNDLE.blobOid,
    bundleBytes: BUNDLE.bytes,
    bundleSha256: BUNDLE.rawSha256,
    decisionCommit: DECISION.commit,
    decisionBlobOid: DECISION.blobOid,
    decisionBytes: DECISION.bytes,
    decisionSha256: DECISION.rawSha256,
    proofCommit: PROOF.commit,
    proofBlobOid: PROOF.blobOid,
    proofBytes: PROOF.bytes,
    proofSha256: PROOF.rawSha256
  };
  for (const [field, expected] of Object.entries(exactBindings)) if (input.bindings?.[field] !== expected) blockers.push(`bindings.${field}`);
  if (input.baseline?.completionAuditBlobOid !== BASELINE.completionAuditBlobOid || input.baseline?.traceMatrixBlobOid !== BASELINE.traceMatrixBlobOid) blockers.push('baseline.blobOid');
  if (input.baseline?.completionAuditWorktreeMatchesHead !== true || input.baseline?.traceMatrixWorktreeMatchesHead !== true || input.baseline?.applicationReceiptAbsent !== true) blockers.push('baseline.worktreeOrReceipt');
  if (input.baseline?.phase8Completed !== false || input.baseline?.phase8CompletionStatus !== 'needs_revalidation') blockers.push('baseline.phase8State');
  if (input.runtimeFacts?.clean !== true || !/^[a-f0-9]{40}$/.test(input.runtimeFacts?.commit || '') || !/^[a-f0-9]{40}$/.test(input.runtimeFacts?.tree || '')) blockers.push('runtimeFacts');
  if (blockers.length) return failure(blockers);
  const appliedState = expectedPatch();
  const receiptPayload = {
    schemaVersion: 1,
    taskId: 'CM-2114',
    receiptType: 'phase8_completion_revalidation_application_receipt',
    decision: { reference: DECISION.reference, commit: DECISION.commit, blobOid: DECISION.blobOid, bytes: DECISION.bytes, sha256: DECISION.rawSha256 },
    evidenceBundle: { commit: BUNDLE.commit, blobOid: BUNDLE.blobOid, bytes: BUNDLE.bytes, sha256: BUNDLE.rawSha256, payloadSha256: BUNDLE.payloadSha256, requiredEvidenceCount: REQUIRED_FIELDS.length },
    proofReceipt: { commit: PROOF.commit, blobOid: PROOF.blobOid, bytes: PROOF.bytes, sha256: PROOF.rawSha256 },
    phaseAudit: { phaseId: PHASE_ID, accepted: true, missingEvidence: [], fullPlanPackCompleted: false },
    appliedEvidence: {
      vcpToolBoxOwnedRuntimeWritePassed: true,
      actualTransportBindingPassed: true,
      stableTargetStoreIdentityPassed: true
    },
    appliedState,
    authorization: { useCount: 1, consumed: true, replayAllowed: false },
    applicationCounters: { completionAuditPatchApplications: 1, nativeReads: 0, nativeWrites: 0, verifyOperations: 0, rollbackOrCompensationOperations: 0, remoteActions: 0, readinessClaims: 0 },
    nonClaims: { additionalNativeWriteAuthorized: false, derivedIndexProofAccepted: false, productionProviderProofAccepted: false, productionReady: false, releaseReady: false, rcReady: false, completeV8: false, fullPlanPackCompleted: false, readinessClaimed: false }
  };
  return { accepted: true, blockers: [], appliedState, receiptPayload, receiptPayloadSha256: sha256Canonical(receiptPayload), phase8Completed: true, phase8CompletionStatus: 'revalidated_complete', fullPlanPackCompleted: false, readinessClaimed: false, additionalNativeWriteAuthorized: false };
}

function evaluateApplicationReceipt(receipt = {}) {
  const blockers = [];
  const payload = receipt.receiptPayload || {};
  if (!hasExactKeys(receipt, ['receiptPayload', 'receiptPayloadSha256'])) blockers.push('receipt.fields');
  if (!hasExactKeys(payload, [
    'schemaVersion', 'taskId', 'receiptType', 'decision', 'evidenceBundle', 'proofReceipt',
    'phaseAudit', 'appliedEvidence', 'appliedState', 'authorization', 'applicationCounters', 'nonClaims'
  ])) blockers.push('receipt.payload.fields');
  if (payload.schemaVersion !== 1 || payload.taskId !== 'CM-2114' || payload.receiptType !== 'phase8_completion_revalidation_application_receipt') blockers.push('receipt.payload.identity');
  if (sha256Canonical(payload) !== receipt.receiptPayloadSha256) blockers.push('receipt.payloadSha256');
  if (payload.decision?.reference !== DECISION.reference || payload.decision?.commit !== DECISION.commit || payload.decision?.blobOid !== DECISION.blobOid || payload.decision?.sha256 !== DECISION.rawSha256) blockers.push('receipt.decision');
  if (payload.evidenceBundle?.commit !== BUNDLE.commit || payload.evidenceBundle?.blobOid !== BUNDLE.blobOid || payload.evidenceBundle?.sha256 !== BUNDLE.rawSha256 || payload.evidenceBundle?.payloadSha256 !== BUNDLE.payloadSha256 || payload.evidenceBundle?.requiredEvidenceCount !== REQUIRED_FIELDS.length) blockers.push('receipt.bundle');
  if (payload.proofReceipt?.commit !== PROOF.commit || payload.proofReceipt?.blobOid !== PROOF.blobOid || payload.proofReceipt?.sha256 !== PROOF.rawSha256) blockers.push('receipt.proof');
  if (payload.phaseAudit?.accepted !== true || payload.phaseAudit?.missingEvidence?.length !== 0 || payload.phaseAudit?.fullPlanPackCompleted !== false) blockers.push('receipt.phaseAudit');
  const appliedEvidenceFields = ['vcpToolBoxOwnedRuntimeWritePassed', 'actualTransportBindingPassed', 'stableTargetStoreIdentityPassed'];
  if (!hasExactKeys(payload.appliedEvidence, appliedEvidenceFields)) blockers.push('receipt.appliedEvidence.fields');
  for (const field of appliedEvidenceFields) if (payload.appliedEvidence?.[field] !== true) blockers.push(`receipt.appliedEvidence.${field}`);
  for (const [field, expected] of Object.entries(expectedPatch())) if (payload.appliedState?.[field] !== expected) blockers.push(`receipt.appliedState.${field}`);
  if (payload.authorization?.useCount !== 1 || payload.authorization?.consumed !== true || payload.authorization?.replayAllowed !== false) blockers.push('receipt.authorization');
  if (payload.applicationCounters?.completionAuditPatchApplications !== 1) blockers.push('receipt.applicationCounters');
  for (const field of ['nativeReads', 'nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (payload.applicationCounters?.[field] !== 0) blockers.push(`receipt.applicationCounters.${field}`);
  const historicalNonClaimFields = ['additionalNativeWriteAuthorized', 'productionReady', 'releaseReady', 'rcReady', 'completeV8', 'fullPlanPackCompleted', 'readinessClaimed'];
  const currentNonClaimFields = ['additionalNativeWriteAuthorized', 'derivedIndexProofAccepted', 'productionProviderProofAccepted', 'productionReady', 'releaseReady', 'rcReady', 'completeV8', 'fullPlanPackCompleted', 'readinessClaimed'];
  const observedNonClaimFields = Object.keys(payload.nonClaims || {}).sort();
  const allowedNonClaimShapes = [historicalNonClaimFields, currentNonClaimFields]
    .map(fields => JSON.stringify([...fields].sort()));
  if (!allowedNonClaimShapes.includes(JSON.stringify(observedNonClaimFields))) blockers.push('receipt.nonClaims.fields');
  for (const field of observedNonClaimFields) if (payload.nonClaims?.[field] !== false) blockers.push(`receipt.nonClaims.${field}`);
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)], phase8Completed: blockers.length === 0, phase8CompletionStatus: blockers.length === 0 ? 'revalidated_complete' : 'needs_revalidation', fullPlanPackCompleted: false, readinessClaimed: false, additionalNativeWriteAuthorized: false };
}

function failure(blockers) {
  return { accepted: false, blockers: [...new Set(blockers)], phase8Completed: false, phase8CompletionStatus: 'needs_revalidation', fullPlanPackCompleted: false, readinessClaimed: false, additionalNativeWriteAuthorized: false };
}

module.exports = { BASELINE, BUNDLE, DECISION, PHASE_ID, PROOF, REQUIRED_FIELDS, evaluateApplicationReceipt, evaluateBundle, evaluateDecision, executeCm2114Phase8CompletionRevalidationApplication, expectedPatch, sha256Canonical };
