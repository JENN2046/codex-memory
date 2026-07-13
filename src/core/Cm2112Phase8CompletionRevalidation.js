'use strict';

const {
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('./NearModelMemoryPlanPackCompletionAudit');
const {
  BUNDLE: CM2111_BUNDLE,
  sha256Canonical
} = require('./Cm2111Phase8CompletionAuditApplication');

const PHASE_ID = 'phase8_native_write_production_proof';
const DECISION_REFERENCE = 'CM-2112-SELF-PHASE8-NEEDS-REVALIDATION';
const HISTORICAL_RECEIPT_PAYLOAD_SHA256 = 'd261750552c5eb275d7d934a0c94c272468393ae7aff4de1801eec4cbdabfaec';
const LEGACY_REQUIRED_EVIDENCE_COUNT = 15;
const REVALIDATION_FIELDS = Object.freeze([
  'vcpToolBoxOwnedRuntimeWritePassed',
  'actualTransportBindingPassed',
  'stableTargetStoreIdentityPassed'
]);

function evaluateCm2112Phase8CompletionRevalidation(input = {}) {
  const blockers = [];
  const decision = input.decision || {};
  const historicalBundle = input.historicalBundle || {};
  const historicalReceipt = input.historicalReceipt || {};
  const requiredFields = PHASE_REQUIREMENTS.find(item => item.id === PHASE_ID).requiredEvidence;

  if (decision.schemaVersion !== 1 || decision.taskId !== 'CM-2112') blockers.push('decision.identity');
  if (decision.decisionReference !== DECISION_REFERENCE) blockers.push('decision.reference');
  if (decision.decisionType !== 'phase8_completion_revalidation') blockers.push('decision.type');
  if (
    decision.currentState?.phase8Completed !== false ||
    decision.currentState?.phase8CompletionStatus !== 'needs_revalidation' ||
    decision.currentState?.fullPlanPackCompleted !== false ||
    decision.currentState?.readinessClaimed !== false
  ) blockers.push('decision.currentState');
  if (
    decision.historicalCm2111?.receiptPayloadSha256 !== HISTORICAL_RECEIPT_PAYLOAD_SHA256 ||
    decision.historicalCm2111?.historicalReceiptAcceptedAtApplicationTime !== true ||
    decision.historicalCm2111?.historicalReceiptCurrentCompletionAuthority !== false
  ) blockers.push('decision.historicalCm2111');
  for (const field of REVALIDATION_FIELDS) {
    if (decision.requiredRevalidationEvidence?.[field] !== false) {
      blockers.push(`decision.requiredRevalidationEvidence.${field}`);
    }
  }
  if (
    decision.selectedRoute?.memoryIntelligenceOwner !== 'VCPToolBox' ||
    decision.selectedRoute?.outerTransport !== 'isolated_stdio_mcp' ||
    decision.selectedRoute?.innerTransport !== 'local_http_mcp' ||
    decision.selectedRoute?.stableTargetStoreIdentityRequired !== true ||
    decision.selectedRoute?.exactNativeProofRequired !== true ||
    decision.selectedRoute?.completionAuditReapplicationRequired !== true
  ) blockers.push('decision.selectedRoute');
  for (const field of [
    'nativeWriteAuthorized',
    'verifyAuthorized',
    'rollbackOrCompensationAuthorized',
    'realMemoryReadAuthorized',
    'remoteActionAuthorized',
    'readinessClaimAuthorized'
  ]) {
    if (decision.currentAuthority?.[field] !== false) blockers.push(`decision.currentAuthority.${field}`);
  }

  if (sha256Canonical(historicalBundle) !== CM2111_BUNDLE.payloadSha256) {
    blockers.push('historicalBundle.payloadSha256');
  }
  if (Object.keys(historicalBundle.evidence || {}).length !== LEGACY_REQUIRED_EVIDENCE_COUNT) {
    blockers.push('historicalBundle.legacyEvidenceCount');
  }
  if (historicalReceipt.receiptPayloadSha256 !== HISTORICAL_RECEIPT_PAYLOAD_SHA256) {
    blockers.push('historicalReceipt.payloadSha256');
  }
  if (sha256Canonical(historicalReceipt.receiptPayload || {}) !== historicalReceipt.receiptPayloadSha256) {
    blockers.push('historicalReceipt.payloadHashMismatch');
  }
  if (historicalReceipt.receiptPayload?.evidenceBundle?.requiredEvidenceCount !== LEGACY_REQUIRED_EVIDENCE_COUNT) {
    blockers.push('historicalReceipt.legacyEvidenceCount');
  }

  const evidence = {
    ...(historicalBundle.evidence || {}),
    ...Object.fromEntries(REVALIDATION_FIELDS.map(field => [field, false]))
  };
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  const phaseAudit = audit.phaseResults.find(item => item.id === PHASE_ID);
  const missingRevalidationFields = REVALIDATION_FIELDS.filter(field => (
    phaseAudit?.missingEvidence.includes(field)
  ));
  if (
    phaseAudit?.accepted !== false ||
    JSON.stringify(missingRevalidationFields) !== JSON.stringify(REVALIDATION_FIELDS)
  ) blockers.push('phaseAudit.revalidationBoundary');

  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    historicalCm2111Preserved: blockers.every(blocker => !blocker.startsWith('historical')),
    phase8Completed: false,
    phase8CompletionStatus: 'needs_revalidation',
    missingRevalidationFields,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    nativeWriteAuthorized: false,
    verifyAuthorized: false,
    rollbackOrCompensationAuthorized: false
  };
}

module.exports = {
  DECISION_REFERENCE,
  HISTORICAL_RECEIPT_PAYLOAD_SHA256,
  LEGACY_REQUIRED_EVIDENCE_COUNT,
  REVALIDATION_FIELDS,
  evaluateCm2112Phase8CompletionRevalidation
};
