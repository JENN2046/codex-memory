'use strict';

function evaluateCm2095Phase8CompletionEvidenceApplicationRequest(request = {}) {
  const blockers = [];
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2095',
    requestType: 'phase8_completion_evidence_application_review',
    receiptReviewReference: 'CM-2094-ER-20260711-NATIVE-WRITE-RECEIPT-PASS-FD22CEC6',
    receiptReviewAccepted: true,
    executionReceiptCommit: '91c20ce4c9b85966ef2da6b7c37563ebbce0f365',
    executionReceiptJsonSha256: 'fd22cec67c8d95eab2f95c10a52207529847d83942354331ba372f5edc41f277',
    completionEvidenceApplicationRequested: true,
    completionEvidenceAlreadyApplied: false,
    completionAuditPatchAlreadyApplied: false
  };
  for (const [field, expected] of Object.entries(exact)) if (request[field] !== expected) blockers.push(`request.${field}`);
  const evidence = request.proposedEvidence || {};
  for (const field of ['exactApprovalEnforcementPassed', 'nativeSideEffectReceiptPassed', 'realRootDurableWriteProofPassed', 'verifyWritePassed', 'outputDisclosureBudgetPassed', 'auditReceiptPassed']) {
    if (evidence[field] !== true) blockers.push(`request.proposedEvidence.${field}`);
  }
  for (const field of ['rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8ReceiptBundleAppliedToCompletionAudit']) {
    if (evidence[field] !== false) blockers.push(`request.proposedEvidence.${field}`);
  }
  for (const field of ['derivedIndexProofAccepted', 'providerExecutionProofAccepted', 'productionProviderProofAccepted']) {
    if (request.unsupportedEvidence?.[field] !== false) blockers.push(`request.unsupportedEvidence.${field}`);
  }
  const resulting = request.resultingStateRequested || {};
  for (const field of ['phase8NativeWriteAuthorizationGranted', 'authorizationConsumed']) if (resulting[field] !== true) blockers.push(`request.resultingStateRequested.${field}`);
  for (const field of ['authorizationReplayAllowed', 'additionalNativeWriteAuthorized', 'phase8Completed', 'fullPlanPackCompleted', 'readinessClaimed']) if (resulting[field] !== false) blockers.push(`request.resultingStateRequested.${field}`);
  for (const field of ['nativeWriteCalls', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads', 'remoteActions', 'readinessClaims']) if (request.applicationCounters?.[field] !== 0) blockers.push(`request.applicationCounters.${field}`);
  return {
    accepted: blockers.length === 0,
    blockers,
    completionEvidenceApplicationReviewRequested: blockers.length === 0,
    applicationAlreadyPerformed: false,
    phase8Completed: false,
    additionalNativeWriteAuthorized: false,
    readinessClaimed: false
  };
}

module.exports = { evaluateCm2095Phase8CompletionEvidenceApplicationRequest };
