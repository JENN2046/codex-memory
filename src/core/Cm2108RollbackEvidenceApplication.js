'use strict';

const crypto = require('node:crypto');
const { evaluateRollbackReceipt } = require('./Cm2107IdentityBoundTombstoneRollback');

const CONTRACT_NAME = 'Cm2108RollbackEvidenceApplication';
const DECISION = Object.freeze({
  reference: 'CM-2108-SELF-ROLLBACK-EVIDENCE-APPLICATION-928DA067',
  commit: '8bd6ac205d093975f77e817e3ea0f945f6962985',
  blobOid: '3926d8d58f3cc868a7cba662a8e1a58305db4376',
  bytes: 1895,
  rawSha256: 'bec1e447a207ee16bf90f85b251ea02588da702a05e39652d982091c862e32b9',
  payloadSha256: '08d12863d4abd6bb8c4edf618bc40afb57dd8eea8adc4001eab018a28a975ae9'
});
const SOURCE_RECEIPT = Object.freeze({
  commit: '32eb63b891647d1794d51e025883bbc12b521db1',
  tree: '62c90e7d0dfa717554bd12d0417a26d38d00839f',
  blobOid: '8b6720bf04d7d9c2d7e1bbee7194dcae72b010a5',
  bytes: 3234,
  rawSha256: '86701dd223ef054406df846faffb958708795465205b8ba84ee2cbde8abec609',
  payloadSha256: '928da067bed3fc6e840fd903e8012c248753a82b9fdb9a4b6d259a68b4fbe95d'
});
const BASELINE = Object.freeze({
  completionAuditBlobOid: '194a9ddea400fe835a3191f015db20ba3e47ac03',
  traceMatrixBlobOid: '746da6c456160b764ab71e151fc01b89b7551d6f'
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function hasExactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function expectedPatch() {
  return {
    rollbackDrillPassed: true,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function expectedReceiptBoundaries() {
  return {
    defaultProductRetrievalTombstoneAwarenessProven: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function evaluateDecision(decision = {}) {
  const blockers = [];
  if (sha256Canonical(decision) !== DECISION.payloadSha256) blockers.push('decision.payloadSha256');
  if (decision.decisionReference !== DECISION.reference) blockers.push('decision.decisionReference');
  if (decision.rollbackEvidenceApplicationAuthorized !== true) blockers.push('decision.rollbackEvidenceApplicationAuthorized');
  if (decision.decisionRequiresGitFreezeBeforeApplication !== true) blockers.push('decision.decisionRequiresGitFreezeBeforeApplication');
  if (decision.applicationAuthorization?.useCount !== 1 || decision.applicationAuthorization?.replayAllowed !== false) blockers.push('decision.applicationAuthorization');
  for (const [field, expected] of Object.entries(expectedPatch())) {
    if (decision.allowedPatch?.[field] !== expected) blockers.push(`decision.allowedPatch.${field}`);
  }
  const limits = decision.applicationSideEffectLimits || {};
  if (limits.completionAuditPatchApplications !== 1) blockers.push('decision.applicationSideEffectLimits.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'recordMemoryCalls', 'tombstoneMemoryCalls', 'verifyOperations', 'retryOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) {
    if (limits[field] !== 0) blockers.push(`decision.applicationSideEffectLimits.${field}`);
  }
  return { accepted: blockers.length === 0, blockers };
}

function executeRollbackEvidenceApplication(input = {}) {
  const blockers = [];
  const decisionResult = evaluateDecision(input.decision);
  if (!decisionResult.accepted) blockers.push(...decisionResult.blockers);
  const rollbackResult = evaluateRollbackReceipt(input.sourceReceipt);
  if (!rollbackResult.accepted || rollbackResult.acceptedAsRollbackEvidence !== true) {
    blockers.push(...rollbackResult.blockers.map(item => `sourceReceipt.${item}`));
  }
  const exactBindings = {
    decisionCommit: DECISION.commit,
    decisionBlobOid: DECISION.blobOid,
    decisionBytes: DECISION.bytes,
    decisionSha256: DECISION.rawSha256,
    sourceReceiptCommit: SOURCE_RECEIPT.commit,
    sourceReceiptTree: SOURCE_RECEIPT.tree,
    sourceReceiptBlobOid: SOURCE_RECEIPT.blobOid,
    sourceReceiptBytes: SOURCE_RECEIPT.bytes,
    sourceReceiptSha256: SOURCE_RECEIPT.rawSha256,
    sourceReceiptPayloadSha256: SOURCE_RECEIPT.payloadSha256
  };
  for (const [field, expected] of Object.entries(exactBindings)) {
    if (input.bindings?.[field] !== expected) blockers.push(`bindings.${field}`);
  }
  if (input.baseline?.completionAuditBlobOid !== BASELINE.completionAuditBlobOid) blockers.push('baseline.completionAuditBlobOid');
  if (input.baseline?.traceMatrixBlobOid !== BASELINE.traceMatrixBlobOid) blockers.push('baseline.traceMatrixBlobOid');
  if (input.baseline?.completionAuditWorktreeMatchesHead !== true) blockers.push('baseline.completionAuditWorktreeMatchesHead');
  if (input.baseline?.traceMatrixWorktreeMatchesHead !== true) blockers.push('baseline.traceMatrixWorktreeMatchesHead');
  if (input.baseline?.applicationReceiptAbsent !== true) blockers.push('baseline.applicationReceiptAbsent');
  for (const field of ['rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed']) {
    if (input.baseline?.[field] !== false) blockers.push(`baseline.${field}`);
  }
  if (input.runtimeFacts?.clean !== true) blockers.push('runtimeFacts.clean');
  if (!/^[a-f0-9]{40}$/.test(input.runtimeFacts?.commit || '')) blockers.push('runtimeFacts.commit');
  if (!/^[a-f0-9]{40}$/.test(input.runtimeFacts?.tree || '')) blockers.push('runtimeFacts.tree');
  if (blockers.length) return failure('application_gate', blockers);

  const patch = expectedPatch();
  const receiptPayload = {
    schemaVersion: 1,
    taskId: 'CM-2108',
    receiptType: 'rollback_evidence_completion_audit_application_receipt',
    decision: {
      reference: DECISION.reference,
      commit: DECISION.commit,
      blobOid: DECISION.blobOid,
      bytes: DECISION.bytes,
      sha256: DECISION.rawSha256
    },
    sourceRollbackReceipt: {
      commit: SOURCE_RECEIPT.commit,
      tree: SOURCE_RECEIPT.tree,
      blobOid: SOURCE_RECEIPT.blobOid,
      bytes: SOURCE_RECEIPT.bytes,
      sha256: SOURCE_RECEIPT.rawSha256,
      payloadSha256: SOURCE_RECEIPT.payloadSha256,
      acceptedAsRollbackEvidence: true
    },
    applicationRuntime: {
      commit: input.runtimeFacts.commit,
      tree: input.runtimeFacts.tree,
      cleanBeforeApplication: true,
      completionAuditBaselineBlobOid: BASELINE.completionAuditBlobOid,
      traceMatrixBaselineBlobOid: BASELINE.traceMatrixBlobOid
    },
    contractResults: {
      applicationGate: 'cm2108_rollback_evidence_application_gate_accepted',
      patchBoundary: 'cm2108_rollback_evidence_patch_boundary_accepted',
      patchApplication: 'cm2108_rollback_evidence_patch_application_accepted'
    },
    appliedEvidence: patch,
    authorization: { useCount: 1, consumed: true, replayAllowed: false },
    applicationCounters: {
      completionAuditPatchApplications: 1,
      nativeReads: 0,
      nativeWrites: 0,
      recordMemoryCalls: 0,
      tombstoneMemoryCalls: 0,
      verifyOperations: 0,
      retryOperations: 0,
      rollbackOrCompensationOperations: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    boundaries: expectedReceiptBoundaries()
  };
  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    blockers: [],
    applicationGateAccepted: true,
    patchBoundaryAccepted: true,
    patchApplicationAccepted: true,
    receiptPayload,
    receiptPayloadSha256: sha256Canonical(receiptPayload),
    appliedEvidence: patch,
    rollbackDrillPassed: true,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    additionalNativeActionAuthorized: false
  };
}

function evaluateApplicationReceipt(receipt = {}) {
  const blockers = [];
  const payload = receipt.receiptPayload || {};
  if (!hasExactKeys(receipt, ['receiptPayload', 'receiptPayloadSha256'])) blockers.push('receipt.fields');
  if (!hasExactKeys(payload, [
    'schemaVersion', 'taskId', 'receiptType', 'decision', 'sourceRollbackReceipt',
    'applicationRuntime', 'contractResults', 'appliedEvidence', 'authorization',
    'applicationCounters', 'boundaries'
  ])) blockers.push('receipt.payload.fields');
  if (payload.schemaVersion !== 1 || payload.taskId !== 'CM-2108' || payload.receiptType !== 'rollback_evidence_completion_audit_application_receipt') blockers.push('receipt.payload.identity');
  if (sha256Canonical(payload) !== receipt.receiptPayloadSha256) blockers.push('receipt.receiptPayloadSha256');
  if (payload.decision?.reference !== DECISION.reference || payload.decision?.commit !== DECISION.commit || payload.decision?.blobOid !== DECISION.blobOid || payload.decision?.sha256 !== DECISION.rawSha256) blockers.push('receipt.decision');
  if (payload.sourceRollbackReceipt?.commit !== SOURCE_RECEIPT.commit || payload.sourceRollbackReceipt?.blobOid !== SOURCE_RECEIPT.blobOid || payload.sourceRollbackReceipt?.sha256 !== SOURCE_RECEIPT.rawSha256 || payload.sourceRollbackReceipt?.payloadSha256 !== SOURCE_RECEIPT.payloadSha256 || payload.sourceRollbackReceipt?.acceptedAsRollbackEvidence !== true) blockers.push('receipt.sourceRollbackReceipt');
  const appliedEvidence = expectedPatch();
  if (!hasExactKeys(payload.appliedEvidence, Object.keys(appliedEvidence))) blockers.push('receipt.appliedEvidence.fields');
  for (const [field, expected] of Object.entries(appliedEvidence)) {
    if (payload.appliedEvidence?.[field] !== expected) blockers.push(`receipt.appliedEvidence.${field}`);
  }
  const expectedBoundaries = expectedReceiptBoundaries();
  const boundaryKeys = Object.keys(payload.boundaries || {}).sort();
  if (JSON.stringify(boundaryKeys) !== JSON.stringify(Object.keys(expectedBoundaries).sort())) {
    blockers.push('receipt.boundaries.fields');
  }
  for (const [field, expected] of Object.entries(expectedBoundaries)) {
    if (payload.boundaries?.[field] !== expected) blockers.push(`receipt.boundaries.${field}`);
  }
  if (payload.authorization?.useCount !== 1 || payload.authorization?.consumed !== true || payload.authorization?.replayAllowed !== false) blockers.push('receipt.authorization');
  if (payload.applicationCounters?.completionAuditPatchApplications !== 1) blockers.push('receipt.applicationCounters.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'recordMemoryCalls', 'tombstoneMemoryCalls', 'verifyOperations', 'retryOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) {
    if (payload.applicationCounters?.[field] !== 0) blockers.push(`receipt.applicationCounters.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    applicationReceiptAccepted: blockers.length === 0,
    rollbackDrillPassed: blockers.length === 0,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    additionalNativeActionAuthorized: false
  };
}

function failure(step, blockers) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    failedStep: step,
    blockers: [...new Set(blockers)],
    applicationGateAccepted: false,
    patchBoundaryAccepted: false,
    patchApplicationAccepted: false,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    additionalNativeActionAuthorized: false
  };
}

module.exports = {
  BASELINE,
  DECISION,
  SOURCE_RECEIPT,
  evaluateApplicationReceipt,
  evaluateDecision,
  executeRollbackEvidenceApplication,
  expectedPatch,
  sha256Canonical
};
