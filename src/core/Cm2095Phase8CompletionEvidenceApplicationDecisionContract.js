'use strict';

function evaluateCm2095Phase8CompletionEvidenceApplicationDecision(decision = {}) {
  const blockers = [];
  const exact = {
    schemaVersion: 1,
    taskId: 'CM-2095',
    result: 'PASS',
    decisionReference: 'CM-2095-ER-20260711-COMPLETION-EVIDENCE-APPLICATION-PASS-2E98CE0C',
    completionEvidenceApplicationAuthorized: true,
    applicationAuthorizationUseCount: 1,
    applicationAuthorizationReplayAllowed: false,
    applicationRequestCommit: 'a593b73fe1b53a4d00d572d5f72157acf033285c',
    applicationRequestTree: '4aa60d0324ed13977f7d4018afc369084b2a45f3',
    applicationRequestJsonBlobOid: 'd5e94b7a6f7e497e2de8b2429a401baead245eed',
    applicationRequestJsonBytes: 1616,
    applicationRequestJsonSha256: '2e98ce0c6614d668ff4f6f93d7e48e475c37c8f493480ae7564a880497819477',
    receiptReviewReference: 'CM-2094-ER-20260711-NATIVE-WRITE-RECEIPT-PASS-FD22CEC6',
    executionReceiptCommit: '91c20ce4c9b85966ef2da6b7c37563ebbce0f365',
    executionReceiptJsonSha256: 'fd22cec67c8d95eab2f95c10a52207529847d83942354331ba372f5edc41f277',
    completionEvidenceAlreadyApplied: false,
    completionAuditPatchAlreadyApplied: false,
    phase8ReceiptBundleAppliedToCompletionAudit: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    additionalNativeWriteAuthorized: false,
    verifyExecutionAuthorized: false,
    rollbackOrCompensationAuthorized: false
  };
  for (const [field, expected] of Object.entries(exact)) if (decision[field] !== expected) blockers.push(`decision.${field}`);
  const allowedEvidenceFields = ['exactApprovalEnforcementPassed', 'nativeSideEffectReceiptPassed', 'realRootDurableWriteProofPassed', 'verifyWritePassed', 'outputDisclosureBudgetPassed', 'auditReceiptPassed'];
  const requiredFalseEvidenceFields = ['rollbackDrillPassed', 'failureRecoveryProofPassed', 'derivedIndexProofAccepted', 'providerExecutionProofAccepted', 'productionProviderProofAccepted'];
  for (const field of allowedEvidenceFields) if (decision.allowedEvidence?.[field] !== true) blockers.push(`decision.allowedEvidence.${field}`);
  for (const field of requiredFalseEvidenceFields) if (decision.requiredFalseEvidence?.[field] !== false) blockers.push(`decision.requiredFalseEvidence.${field}`);
  for (const field of Object.keys(decision.allowedEvidence || {})) if (!allowedEvidenceFields.includes(field)) blockers.push(`decision.allowedEvidence.${field}`);
  for (const field of Object.keys(decision.requiredFalseEvidence || {})) if (!requiredFalseEvidenceFields.includes(field)) blockers.push(`decision.requiredFalseEvidence.${field}`);
  return {
    accepted: blockers.length === 0,
    blockers,
    applicationAuthorized: blockers.length === 0,
    applicationAlreadyExecuted: false,
    phase8Completed: false,
    additionalNativeWriteAuthorized: false
  };
}

module.exports = { evaluateCm2095Phase8CompletionEvidenceApplicationDecision };
