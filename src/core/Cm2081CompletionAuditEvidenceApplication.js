'use strict';

const crypto = require('node:crypto');

const {
  COUNTER_FIELDS: GATE_COUNTER_FIELDS,
  evaluatePlanPackExternalReviewEvidenceBundleApplicationGate
} = require('./PlanPackExternalReviewEvidenceBundleApplicationGate');
const {
  COUNTER_FIELDS: RECEIPT_COUNTER_FIELDS,
  REQUIRED_APPLICATION_GATE_RESULT_FIELDS,
  evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt
} = require('./PlanPackExternalReviewEvidenceBundleApplicationReceiptContract');
const {
  COUNTER_FIELDS: BOUNDARY_COUNTER_FIELDS,
  REQUIRED_APPLICATION_RECEIPT_RESULT_FIELDS,
  evaluatePlanPackExternalReviewCompletionAuditPatchBoundary
} = require('./PlanPackExternalReviewCompletionAuditPatchBoundaryContract');
const {
  COUNTER_FIELDS: APPLICATION_COUNTER_FIELDS,
  REQUIRED_PATCH_BOUNDARY_RESULT_FIELDS,
  evaluatePlanPackExternalReviewCompletionAuditPatchApplication
} = require('./PlanPackExternalReviewCompletionAuditPatchApplicationContract');

const CONTRACT_NAME = 'Cm2081CompletionAuditEvidenceApplication';
const TASK_ID = 'CM-2082';
const DECISION_REFERENCE = 'CM-2081-ER-20260711-APPROVE-COMPLETION-AUDIT-2215BB33';
const EXTERNAL_REVIEW_DECISION_REFERENCE = 'CM-2080-ER-20260711-PASS-F440C1BD-2215BB33';
const APPLICATION_REQUEST_COMMIT = '88d11e94dc238145ba9317589cebda52f73910e1';
const CANONICAL_PAYLOAD_SHA256 =
  '2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2';

const EXPECTED_AUTHORIZATION = Object.freeze({
  decisionReference: DECISION_REFERENCE,
  appliedExternalReviewDecisionReference: EXTERNAL_REVIEW_DECISION_REFERENCE,
  appliedCanonicalPayloadSha256: CANONICAL_PAYLOAD_SHA256,
  applicationRequestCommit: APPLICATION_REQUEST_COMMIT,
  externalReviewPassed: true,
  externalReviewEvidenceBundleAppliedToCompletionAudit: true,
  tagApprovalPacketPassed: false,
  phase8NativeWriteAuthorizationGranted: false,
  applicationAuthorized: true,
  applicationAlreadyExecutedByDecision: false,
  completionAuditPatchRequired: true,
  verifiedApplicationReceiptRequired: true
});

function zeroCounters(fields) {
  return Object.fromEntries(fields.map(field => [field, 0]));
}

function pick(value, fields) {
  return Object.fromEntries(fields.map(field => [field, value[field]]));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
  );
}

function sha256Canonical(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function validateAuthorization(authorization) {
  if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) {
    return ['authorization'];
  }
  return Object.entries(EXPECTED_AUTHORIZATION)
    .filter(([field, expected]) => authorization[field] !== expected)
    .map(([field]) => `authorization.${field}`);
}

function executeCm2081CompletionAuditEvidenceApplication(authorization) {
  const authorizationBlockers = validateAuthorization(authorization);
  if (authorizationBlockers.length > 0) {
    return {
      accepted: false,
      contractName: CONTRACT_NAME,
      blockers: authorizationBlockers,
      externalReviewPassed: true,
      externalReviewEvidenceBundleAppliedToCompletionAudit: false,
      tagApprovalPacketPassed: false,
      phase8NativeWriteAuthorizationGranted: false
    };
  }

  const gateResult = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate({
    schemaVersion: 1,
    taskId: TASK_ID,
    mode: 'local-external-review-bundle-application-gate',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforeApplication: true
    },
    applicationGate: {
      gatePrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      reviewBundleApplicationRequired: true,
      completionAuditPatchStillSeparate: true,
      reviewBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    reviewEvidence: {
      observationOrDogfoodReviewPassed: true,
      externalReviewPassed: true,
      tagApprovalPacketPassed: false
    },
    expectedDecision:
      'external_review_bundle_application_gate_ready_for_future_completion_audit_patch',
    counters: zeroCounters(GATE_COUNTER_FIELDS)
  });

  if (!gateResult.accepted) return failedStep('application_gate', gateResult);

  const receiptResult = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt({
    schemaVersion: 1,
    taskId: TASK_ID,
    mode: 'local-external-review-bundle-application-receipt',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2049ApplicationGateAccepted: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforeReceipt: true
    },
    applicationGateResult: pick(gateResult, REQUIRED_APPLICATION_GATE_RESULT_FIELDS),
    applicationReceipt: {
      receiptPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      completionAuditPatchStillSeparate: true,
      applicationReceiptAcceptedAsLocalContractOnly: true,
      reviewBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    expectedDecision:
      'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch',
    counters: zeroCounters(RECEIPT_COUNTER_FIELDS)
  });

  if (!receiptResult.accepted) return failedStep('application_receipt', receiptResult);

  const boundaryResult = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary({
    schemaVersion: 1,
    taskId: TASK_ID,
    mode: 'local-external-review-completion-audit-patch-boundary',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2049ApplicationGateAccepted: true,
      cm2050ApplicationReceiptAccepted: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforePatch: true
    },
    applicationReceiptResult: pick(
      receiptResult,
      REQUIRED_APPLICATION_RECEIPT_RESULT_FIELDS
    ),
    patchBoundary: {
      patchBoundaryPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      exactCompletionAuditPatchRequired: true,
      applicationReceiptAcceptedAsLocalContractOnly: true,
      reviewBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    expectedDecision:
      'external_review_completion_audit_patch_boundary_ready_for_future_exact_application',
    counters: zeroCounters(BOUNDARY_COUNTER_FIELDS)
  });

  if (!boundaryResult.accepted) return failedStep('patch_boundary', boundaryResult);

  const applicationResult = evaluatePlanPackExternalReviewCompletionAuditPatchApplication({
    schemaVersion: 1,
    taskId: TASK_ID,
    mode: 'local-external-review-completion-audit-patch-application',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2049ApplicationGateAccepted: true,
      cm2050ApplicationReceiptAccepted: true,
      cm2051PatchBoundaryAccepted: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforeApplication: true
    },
    patchBoundaryResult: pick(boundaryResult, REQUIRED_PATCH_BOUNDARY_RESULT_FIELDS),
    externalReviewEvidenceBundle: {
      categoryOnly: true,
      lowDisclosureOnly: true,
      observationOrDogfoodReviewPassed: true,
      externalReviewPassed: true,
      tagApprovalPacketPassed: false,
      externalReviewEvidenceProvidedBySeparateProcess: true,
      tagApprovalPacketProvidedBySeparateProcess: false,
      reviewTranscriptIncluded: false,
      reviewerIdentityIncluded: false,
      tagApprovalLineIncluded: false,
      localContractAcceptedAsExternalReview: false
    },
    completionAuditPatch: {
      patchApplicationPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      exactExternalReviewEvidenceRequiredBeforeApplication: true,
      applicationReceiptAcceptedAsLocalContractOnly: true,
      reviewBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    expectedDecision:
      'external_review_completion_audit_patch_application_ready_for_completion_audit_evidence',
    counters: zeroCounters(APPLICATION_COUNTER_FIELDS)
  });

  if (!applicationResult.accepted) return failedStep('patch_application', applicationResult);

  const receiptPayload = {
    schemaVersion: 1,
    taskId: TASK_ID,
    authorization: {
      decisionReference: DECISION_REFERENCE,
      appliedExternalReviewDecisionReference: EXTERNAL_REVIEW_DECISION_REFERENCE,
      applicationRequestCommit: APPLICATION_REQUEST_COMMIT,
      canonicalPayloadSha256: CANONICAL_PAYLOAD_SHA256
    },
    decisions: {
      externalReviewPassed: true,
      externalReviewEvidenceBundleAppliedToCompletionAudit: true,
      tagApprovalPacketPassed: false,
      phase8NativeWriteAuthorizationGranted: false
    },
    contractResults: {
      applicationGate: gateResult.decision,
      applicationReceipt: receiptResult.decision,
      patchBoundary: boundaryResult.decision,
      patchApplication: applicationResult.decision
    },
    completionAuditEvidence: {
      field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
      evidenceKind: 'external_review',
      applied: true,
      controlledApplicationCount: 1
    },
    boundaries: {
      currentPhase9Completed: false,
      currentPhase10Completed: false,
      fullPlanPackCompleted: false,
      tagApprovalPacketAccepted: false,
      phase8NativeWriteAuthorized: false,
      defaultRuntimeExpanded: false,
      commitMemoryDeltaPublic: false,
      nativeMemoryWritePerformed: false,
      realMemoryReadOrModified: false,
      tagOrPushPerformed: false,
      releaseDeployOrCutoverPerformed: false,
      readinessClaimed: false
    }
  };

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    blockers: [],
    receiptPayload,
    receiptPayloadSha256: sha256Canonical(receiptPayload),
    externalReviewPassed: true,
    externalReviewEvidenceBundleAppliedToCompletionAudit: true,
    tagApprovalPacketPassed: false,
    phase8NativeWriteAuthorizationGranted: false,
    nextGate: 'separate_tag_approval_packet_review'
  };
}

function failedStep(step, result) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    failedStep: step,
    blockers: Array.isArray(result.blockers) ? result.blockers : [],
    reasonCode: result.reasonCode || null,
    externalReviewPassed: true,
    externalReviewEvidenceBundleAppliedToCompletionAudit: false,
    tagApprovalPacketPassed: false,
    phase8NativeWriteAuthorizationGranted: false
  };
}

module.exports = {
  APPLICATION_REQUEST_COMMIT,
  CANONICAL_PAYLOAD_SHA256,
  CONTRACT_NAME,
  DECISION_REFERENCE,
  EXPECTED_AUTHORIZATION,
  EXTERNAL_REVIEW_DECISION_REFERENCE,
  canonicalize,
  executeCm2081CompletionAuditEvidenceApplication,
  sha256Canonical,
  validateAuthorization
};
