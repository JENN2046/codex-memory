'use strict';

const crypto = require('node:crypto');
const { evaluateFailureRecoveryReceipt } = require('./Cm2109IsolatedFailureRecoveryExecution');

const DECISION = Object.freeze({
  reference: 'CM-2110-SELF-FAILURE-RECOVERY-EVIDENCE-APPLICATION-07C1CF3B',
  commit: 'e82afd98e5f2a0d2723d3b8a2b40d97729c80964',
  blobOid: '38857977bc0b8d1e9989b6044bf216480d57c658',
  bytes: 1837,
  rawSha256: 'c99fdf7e3e5b6a3293494f12d51715b54d660029825e4249a657b520b23e20c2',
  payloadSha256: '66249b4309c70df00d6a58cdc4cd1573f1824199f6256fbaa16a287664052136'
});
const SOURCE_RECEIPT = Object.freeze({
  commit: 'f72229254a5dc302f2b544fe17388f151019d6d2',
  tree: '50754fbc07aedb1f5a2fdfd3d5ce55aa6492551d',
  blobOid: 'b697878825bf7c58df9a794764ecf382d39002ad',
  bytes: 6524,
  rawSha256: 'ff75c4d0ad6a1ce2f63ffbb71dcbf81f7e35a05af274841398c0bb4b7a2d38b8',
  payloadSha256: '07c1cf3ba9b609bd3249d195b2ba7a86c6e9d948e77de6b44751af975c99a882'
});
const SOURCE_EXECUTION_BINDING = Object.freeze({
  implementationCommit: '023a7769a900a4c4f3df880d04672d34c3a78853',
  implementationTree: '8e0cef69d6c5c1ba58bb185ceaf7d009e2deed60',
  executionPacketCommit: '1c007d9fe438c4a1f0b3393fcf67310da41e0c01',
  executionPacketBlobOid: '9f1923b05702cdf42eb9496a05bb75db464aa1d1',
  executionPacketSha256: '30eab534102574eeac3853f2b834b57c2be1be03b1ce621c46442a30673d7ede',
  decisionReference: 'CM-2109-SELF-ISOLATED-FAILURE-RECOVERY-EXECUTION',
  decisionCommit: '3d33b226014ae0a0ad79549d13397f0e0181b0bd',
  decisionBlobOid: '1f96770112964c88d22e6ae21e50a7d1a4b1c466',
  decisionSha256: '0fc37a90bf6322a8b946faf283f1ebf277c8cc1a02533ce0bc4abde4c412fa47',
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0'
});
const BASELINE = Object.freeze({
  completionAuditBlobOid: '477730cf3af4457a5c3696fbcf4fadf6bd5eb788',
  traceMatrixBlobOid: 'e1e846d85a415929e18ae90c791184a5e110c6a6'
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
  return { rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: false, fullPlanPackCompleted: false, readinessClaimed: false };
}

function evaluateDecision(decision = {}) {
  const blockers = [];
  if (sha256Canonical(decision) !== DECISION.payloadSha256) blockers.push('decision.payloadSha256');
  if (decision.decisionReference !== DECISION.reference || decision.failureRecoveryEvidenceApplicationAuthorized !== true || decision.decisionRequiresGitFreezeBeforeApplication !== true) blockers.push('decision.authority');
  if (decision.applicationAuthorization?.useCount !== 1 || decision.applicationAuthorization?.replayAllowed !== false) blockers.push('decision.applicationAuthorization');
  for (const [field, expected] of Object.entries(expectedPatch())) if (decision.allowedPatch?.[field] !== expected) blockers.push(`decision.allowedPatch.${field}`);
  const limits = decision.applicationSideEffectLimits || {};
  if (limits.completionAuditPatchApplications !== 1) blockers.push('decision.applicationSideEffectLimits.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'failureInjectionExecutions', 'verifyOperations', 'retryOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (limits[field] !== 0) blockers.push(`decision.applicationSideEffectLimits.${field}`);
  return { accepted: blockers.length === 0, blockers };
}

function executeFailureRecoveryEvidenceApplication(input = {}) {
  const blockers = [];
  const decisionResult = evaluateDecision(input.decision);
  if (!decisionResult.accepted) blockers.push(...decisionResult.blockers);
  const sourceResult = evaluateFailureRecoveryReceipt(input.sourceReceipt, SOURCE_EXECUTION_BINDING);
  if (!sourceResult.accepted || sourceResult.acceptedAsFailureRecoveryEvidence !== true) blockers.push(...sourceResult.blockers.map(value => `sourceReceipt.${value}`));
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
  for (const [field, expected] of Object.entries(exactBindings)) if (input.bindings?.[field] !== expected) blockers.push(`bindings.${field}`);
  if (input.baseline?.completionAuditBlobOid !== BASELINE.completionAuditBlobOid) blockers.push('baseline.completionAuditBlobOid');
  if (input.baseline?.traceMatrixBlobOid !== BASELINE.traceMatrixBlobOid) blockers.push('baseline.traceMatrixBlobOid');
  if (input.baseline?.completionAuditWorktreeMatchesHead !== true || input.baseline?.traceMatrixWorktreeMatchesHead !== true || input.baseline?.applicationReceiptAbsent !== true) blockers.push('baseline.worktreeOrReceipt');
  if (input.baseline?.rollbackDrillPassed !== true || input.baseline?.failureRecoveryProofPassed !== false || input.baseline?.phase8Completed !== false) blockers.push('baseline.evidenceState');
  if (input.runtimeFacts?.clean !== true || !/^[a-f0-9]{40}$/.test(input.runtimeFacts?.commit || '') || !/^[a-f0-9]{40}$/.test(input.runtimeFacts?.tree || '')) blockers.push('runtimeFacts');
  if (blockers.length) return failure('application_gate', blockers);

  const patch = expectedPatch();
  const receiptPayload = {
    schemaVersion: 1,
    taskId: 'CM-2110',
    receiptType: 'failure_recovery_evidence_completion_audit_application_receipt',
    decision: { reference: DECISION.reference, commit: DECISION.commit, blobOid: DECISION.blobOid, bytes: DECISION.bytes, sha256: DECISION.rawSha256 },
    sourceFailureRecoveryReceipt: { commit: SOURCE_RECEIPT.commit, tree: SOURCE_RECEIPT.tree, blobOid: SOURCE_RECEIPT.blobOid, bytes: SOURCE_RECEIPT.bytes, sha256: SOURCE_RECEIPT.rawSha256, payloadSha256: SOURCE_RECEIPT.payloadSha256, acceptedAsFailureRecoveryEvidence: true },
    applicationRuntime: { commit: input.runtimeFacts.commit, tree: input.runtimeFacts.tree, cleanBeforeApplication: true, completionAuditBaselineBlobOid: BASELINE.completionAuditBlobOid, traceMatrixBaselineBlobOid: BASELINE.traceMatrixBlobOid },
    contractResults: { applicationGate: 'cm2110_failure_recovery_evidence_application_gate_accepted', patchBoundary: 'cm2110_failure_recovery_evidence_patch_boundary_accepted', patchApplication: 'cm2110_failure_recovery_evidence_patch_application_accepted' },
    appliedEvidence: patch,
    authorization: { useCount: 1, consumed: true, replayAllowed: false },
    applicationCounters: { completionAuditPatchApplications: 1, nativeReads: 0, nativeWrites: 0, failureInjectionExecutions: 0, verifyOperations: 0, retryOperations: 0, rollbackOrCompensationOperations: 0, remoteActions: 0, readinessClaims: 0 },
    boundaries: { syntheticFailureRecoveryOnly: true, productionFailureRecoveryProven: false, phase8Completed: false, fullPlanPackCompleted: false, readinessClaimed: false }
  };
  return { accepted: true, blockers: [], applicationGateAccepted: true, patchBoundaryAccepted: true, patchApplicationAccepted: true, receiptPayload, receiptPayloadSha256: sha256Canonical(receiptPayload), appliedEvidence: patch, rollbackDrillPassed: true, failureRecoveryProofPassed: true, phase8Completed: false, additionalNativeActionAuthorized: false };
}

function evaluateApplicationReceipt(receipt = {}) {
  const blockers = [];
  const payload = receipt.receiptPayload || {};
  if (!hasExactKeys(receipt, ['receiptPayload', 'receiptPayloadSha256'])) blockers.push('receipt.fields');
  if (!hasExactKeys(payload, [
    'schemaVersion', 'taskId', 'receiptType', 'decision', 'sourceFailureRecoveryReceipt',
    'applicationRuntime', 'contractResults', 'appliedEvidence', 'authorization',
    'applicationCounters', 'boundaries'
  ])) blockers.push('receipt.payload.fields');
  if (payload.schemaVersion !== 1 || payload.taskId !== 'CM-2110' || payload.receiptType !== 'failure_recovery_evidence_completion_audit_application_receipt') blockers.push('receipt.payload.identity');
  if (sha256Canonical(payload) !== receipt.receiptPayloadSha256) blockers.push('receipt.receiptPayloadSha256');
  if (payload.decision?.reference !== DECISION.reference || payload.decision?.commit !== DECISION.commit || payload.decision?.blobOid !== DECISION.blobOid || payload.decision?.sha256 !== DECISION.rawSha256) blockers.push('receipt.decision');
  if (payload.sourceFailureRecoveryReceipt?.commit !== SOURCE_RECEIPT.commit || payload.sourceFailureRecoveryReceipt?.blobOid !== SOURCE_RECEIPT.blobOid || payload.sourceFailureRecoveryReceipt?.sha256 !== SOURCE_RECEIPT.rawSha256 || payload.sourceFailureRecoveryReceipt?.payloadSha256 !== SOURCE_RECEIPT.payloadSha256 || payload.sourceFailureRecoveryReceipt?.acceptedAsFailureRecoveryEvidence !== true) blockers.push('receipt.sourceFailureRecoveryReceipt');
  for (const [field, expected] of Object.entries(expectedPatch())) if (payload.appliedEvidence?.[field] !== expected) blockers.push(`receipt.appliedEvidence.${field}`);
  if (payload.authorization?.useCount !== 1 || payload.authorization?.consumed !== true || payload.authorization?.replayAllowed !== false) blockers.push('receipt.authorization');
  if (payload.applicationCounters?.completionAuditPatchApplications !== 1) blockers.push('receipt.applicationCounters.completionAuditPatchApplications');
  for (const field of ['nativeReads', 'nativeWrites', 'failureInjectionExecutions', 'verifyOperations', 'retryOperations', 'rollbackOrCompensationOperations', 'remoteActions', 'readinessClaims']) if (payload.applicationCounters?.[field] !== 0) blockers.push(`receipt.applicationCounters.${field}`);
  const expectedBoundaries = {
    syntheticFailureRecoveryOnly: true,
    productionFailureRecoveryProven: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  if (JSON.stringify(Object.keys(payload.boundaries || {}).sort()) !==
      JSON.stringify(Object.keys(expectedBoundaries).sort())) {
    blockers.push('receipt.boundaries.fields');
  }
  for (const [field, expected] of Object.entries(expectedBoundaries)) {
    if (payload.boundaries?.[field] !== expected) blockers.push(`receipt.boundaries.${field}`);
  }
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)], applicationReceiptAccepted: blockers.length === 0, failureRecoveryProofPassed: blockers.length === 0, phase8Completed: false, additionalNativeActionAuthorized: false };
}

function failure(step, blockers) {
  return { accepted: false, failedStep: step, blockers: [...new Set(blockers)], applicationGateAccepted: false, patchBoundaryAccepted: false, patchApplicationAccepted: false, rollbackDrillPassed: true, failureRecoveryProofPassed: false, phase8Completed: false, additionalNativeActionAuthorized: false };
}

module.exports = { BASELINE, DECISION, SOURCE_EXECUTION_BINDING, SOURCE_RECEIPT, evaluateApplicationReceipt, evaluateDecision, executeFailureRecoveryEvidenceApplication, expectedPatch, sha256Canonical };
