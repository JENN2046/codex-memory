'use strict';

const { sha256Canonical } = require('./Cm2095Phase8CompletionEvidenceApplication');

function evaluateCm2095Phase8CompletionEvidenceApplicationReceipt(receipt = {}) {
  const blockers = [];
  if (sha256Canonical(receipt.receiptPayload) !== receipt.receiptPayloadSha256) blockers.push('receipt.receiptPayloadSha256');
  if (receipt.receiptPayloadSha256 !== '8c8a22f89863214ccbe2d0e64b75a0526cc32f1e21d83d7159e109e6fa200939') blockers.push('receipt.expectedPayloadSha256');
  const payload = receipt.receiptPayload || {};
  if (payload.decision?.reference !== 'CM-2095-ER-20260711-COMPLETION-EVIDENCE-APPLICATION-PASS-2E98CE0C') blockers.push('receipt.decision.reference');
  if (payload.decision?.commit !== '83ac6f8d45a92d04453e9f280d5dbd054a663132') blockers.push('receipt.decision.commit');
  if (payload.executionReceipt?.reviewReference !== 'CM-2094-ER-20260711-NATIVE-WRITE-RECEIPT-PASS-FD22CEC6') blockers.push('receipt.executionReceipt.reviewReference');
  for (const field of ['exactApprovalEnforcementPassed', 'nativeSideEffectReceiptPassed', 'realRootDurableWriteProofPassed', 'verifyWritePassed', 'outputDisclosureBudgetPassed', 'auditReceiptPassed', 'phase8ReceiptBundleAppliedToCompletionAudit']) if (payload.appliedEvidence?.[field] !== true) blockers.push(`receipt.appliedEvidence.${field}`);
  for (const field of ['rollbackDrillPassed', 'failureRecoveryProofPassed', 'phase8Completed', 'fullPlanPackCompleted', 'readinessClaimed']) if (payload.appliedEvidence?.[field] !== false) blockers.push(`receipt.appliedEvidence.${field}`);
  if (payload.authorization?.useCount !== 1 || payload.authorization?.consumed !== true || payload.authorization?.replayAllowed !== false) blockers.push('receipt.authorization');
  for (const field of ['nativeWriteCalls', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads', 'remoteActions', 'readinessClaims']) if (payload.applicationCounters?.[field] !== 0) blockers.push(`receipt.applicationCounters.${field}`);
  return {
    accepted: blockers.length === 0,
    blockers,
    applicationReceiptAccepted: blockers.length === 0,
    phase8ReceiptBundleAppliedToCompletionAudit: blockers.length === 0,
    phase8Completed: false,
    additionalNativeWriteAuthorized: false
  };
}

module.exports = { evaluateCm2095Phase8CompletionEvidenceApplicationReceipt };
