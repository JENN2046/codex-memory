'use strict';

const crypto = require('node:crypto');
const { evaluateCm2095Phase8CompletionEvidenceApplicationDecision } = require('./Cm2095Phase8CompletionEvidenceApplicationDecisionContract');

const CONTRACT_NAME = 'Cm2095Phase8CompletionEvidenceApplication';
const DECISION_COMMIT = '83ac6f8d45a92d04453e9f280d5dbd054a663132';
const DECISION_BLOB_OID = 'd8e8f1d86d98bfc71c45f7fd2d3adb92c5a47818';
const DECISION_SHA256 = '8ddd5bd82bb8ddcfa10e17e61620688c0667daf5d6643fa9b8e1480fa019ae33';
const APPLICATION_REQUEST_COMMIT = 'a593b73fe1b53a4d00d572d5f72157acf033285c';
const APPLICATION_REQUEST_BLOB_OID = 'd5e94b7a6f7e497e2de8b2429a401baead245eed';
const APPLICATION_REQUEST_SHA256 = '2e98ce0c6614d668ff4f6f93d7e48e475c37c8f493480ae7564a880497819477';
const EXECUTION_RECEIPT_COMMIT = '91c20ce4c9b85966ef2da6b7c37563ebbce0f365';
const EXECUTION_RECEIPT_BLOB_OID = 'b310146b5219cb4db0e463275f10e8aae4d2f94a';
const EXECUTION_RECEIPT_SHA256 = 'fd22cec67c8d95eab2f95c10a52207529847d83942354331ba372f5edc41f277';

const ALLOWED_TRUE_FIELDS = Object.freeze([
  'exactApprovalEnforcementPassed',
  'nativeSideEffectReceiptPassed',
  'realRootDurableWriteProofPassed',
  'verifyWritePassed',
  'outputDisclosureBudgetPassed',
  'auditReceiptPassed'
]);
const REQUIRED_FALSE_FIELDS = Object.freeze([
  'rollbackDrillPassed',
  'failureRecoveryProofPassed'
]);

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

function executeCm2095Phase8CompletionEvidenceApplication(input = {}) {
  const blockers = [];
  const decisionResult = evaluateCm2095Phase8CompletionEvidenceApplicationDecision(input.decision);
  if (!decisionResult.accepted) blockers.push(...decisionResult.blockers);
  const exactBindings = {
    decisionCommit: DECISION_COMMIT,
    decisionBlobOid: DECISION_BLOB_OID,
    decisionSha256: DECISION_SHA256,
    applicationRequestCommit: APPLICATION_REQUEST_COMMIT,
    applicationRequestBlobOid: APPLICATION_REQUEST_BLOB_OID,
    applicationRequestSha256: APPLICATION_REQUEST_SHA256,
    executionReceiptCommit: EXECUTION_RECEIPT_COMMIT,
    executionReceiptBlobOid: EXECUTION_RECEIPT_BLOB_OID,
    executionReceiptSha256: EXECUTION_RECEIPT_SHA256
  };
  for (const [field, expected] of Object.entries(exactBindings)) if (input.bindings?.[field] !== expected) blockers.push(`bindings.${field}`);
  if (input.runtimeFacts?.clean !== true) blockers.push('runtimeFacts.clean');
  if (!/^[a-f0-9]{40}$/.test(input.runtimeFacts?.commit || '')) blockers.push('runtimeFacts.commit');
  if (!/^[a-f0-9]{40}$/.test(input.runtimeFacts?.tree || '')) blockers.push('runtimeFacts.tree');
  if (!/^[a-f0-9]{40}$/.test(input.baseline?.completionAuditBlobOid || '')) blockers.push('baseline.completionAuditBlobOid');
  if (!/^[a-f0-9]{40}$/.test(input.baseline?.traceMatrixBlobOid || '')) blockers.push('baseline.traceMatrixBlobOid');
  if (input.baseline?.completionAuditWorktreeMatchesHead !== true) blockers.push('baseline.completionAuditWorktreeMatchesHead');
  if (input.baseline?.traceMatrixWorktreeMatchesHead !== true) blockers.push('baseline.traceMatrixWorktreeMatchesHead');
  if (input.baseline?.applicationReceiptAbsent !== true) blockers.push('baseline.applicationReceiptAbsent');
  if (blockers.length) return failure('application_gate', blockers);

  const patch = {
    exactApprovalEnforcementPassed: true,
    nativeSideEffectReceiptPassed: true,
    realRootDurableWriteProofPassed: true,
    verifyWritePassed: true,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    outputDisclosureBudgetPassed: true,
    auditReceiptPassed: true,
    phase8ReceiptBundleAppliedToCompletionAudit: true,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  for (const field of ALLOWED_TRUE_FIELDS) if (patch[field] !== true) blockers.push(`patch.${field}`);
  for (const field of REQUIRED_FALSE_FIELDS) if (patch[field] !== false) blockers.push(`patch.${field}`);
  for (const field of ['phase8Completed', 'fullPlanPackCompleted', 'readinessClaimed']) if (patch[field] !== false) blockers.push(`patch.${field}`);
  if (patch.phase8ReceiptBundleAppliedToCompletionAudit !== true) blockers.push('patch.phase8ReceiptBundleAppliedToCompletionAudit');
  if (blockers.length) return failure('patch_boundary', blockers);

  const receiptPayload = {
    schemaVersion: 1,
    taskId: 'CM-2095',
    decision: {
      reference: input.decision.decisionReference,
      commit: DECISION_COMMIT,
      blobOid: DECISION_BLOB_OID,
      sha256: DECISION_SHA256
    },
    applicationRequest: {
      commit: APPLICATION_REQUEST_COMMIT,
      blobOid: APPLICATION_REQUEST_BLOB_OID,
      sha256: APPLICATION_REQUEST_SHA256
    },
    executionReceipt: {
      reviewReference: input.decision.receiptReviewReference,
      commit: EXECUTION_RECEIPT_COMMIT,
      blobOid: EXECUTION_RECEIPT_BLOB_OID,
      sha256: EXECUTION_RECEIPT_SHA256
    },
    applicationRuntime: {
      commit: input.runtimeFacts.commit,
      tree: input.runtimeFacts.tree,
      cleanBeforeApplication: true,
      completionAuditBaselineBlobOid: input.baseline.completionAuditBlobOid,
      traceMatrixBaselineBlobOid: input.baseline.traceMatrixBlobOid
    },
    contractResults: {
      applicationGate: 'phase8_completion_evidence_application_gate_accepted',
      patchBoundary: 'phase8_completion_evidence_patch_boundary_accepted',
      patchApplication: 'phase8_completion_evidence_patch_application_accepted'
    },
    appliedEvidence: patch,
    authorization: {
      useCount: 1,
      consumed: true,
      replayAllowed: false
    },
    applicationCounters: {
      completionEvidenceApplications: 1,
      completionAuditPatchApplications: 1,
      nativeWriteCalls: 0,
      verifyOperations: 0,
      rollbackOrCompensationOperations: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    unsupportedEvidence: {
      derivedIndexProofAccepted: false,
      providerExecutionProofAccepted: false,
      productionProviderProofAccepted: false
    }
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
    phase8Completed: false,
    additionalNativeWriteAuthorized: false
  };
}

function failure(step, blockers) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    failedStep: step,
    blockers,
    applicationGateAccepted: false,
    patchBoundaryAccepted: false,
    patchApplicationAccepted: false,
    phase8Completed: false,
    additionalNativeWriteAuthorized: false
  };
}

module.exports = {
  ALLOWED_TRUE_FIELDS,
  REQUIRED_FALSE_FIELDS,
  executeCm2095Phase8CompletionEvidenceApplication,
  sha256,
  sha256Canonical
};
