'use strict';

function evaluateRemainingEvidenceRequest(request = {}, kind) {
  const rollback = kind === 'rollback';
  const blockers = [];
  const exact = rollback ? {
    schemaVersion: 1,
    taskId: 'CM-2096',
    requestType: 'phase8_rollback_drill_evidence_authorization_preparation',
    requestedEvidenceField: 'rollbackDrillPassed',
    independentFromFailureRecovery: true,
    futureExactActionRequired: true,
    syntheticCm2094RecordOnly: true,
    compensationCountsAsNativeWrite: true
  } : {
    schemaVersion: 1,
    taskId: 'CM-2097',
    requestType: 'phase8_failure_recovery_evidence_authorization_preparation',
    requestedEvidenceField: 'failureRecoveryProofPassed',
    independentFromRollbackDrill: true,
    futureExactFailureInjectionRequired: true,
    syntheticEvidenceOnly: true
  };
  for (const [field, expected] of Object.entries(exact)) {
    if (request[field] !== expected) blockers.push(`request.${field}`);
  }
  for (const field of [
    'requestPrepared', 'futureFrozenExecutorRequired', 'futureOneShotRegistryRequired',
    'futureLowDisclosureReceiptRequired', 'futureIndependentReceiptReviewRequired'
  ]) if (request[field] !== true) blockers.push(`request.${field}`);
  for (const field of [
    'authorizationRequestedNow', 'executionRequestedNow', 'rollbackDrillPassed',
    'failureRecoveryProofPassed', 'phase8Completed', 'fullPlanPackCompleted',
    'readinessClaimed', 'existingRealMemoryModificationAllowed', 'realMemoryReadAllowed',
    'rawPrivateMemoryAccessAllowed', 'localFallbackAllowed', 'automaticRetryAllowed',
    'automaticRollbackAllowed', 'registryMarkerDeletionAllowed', 'registryRebuildAllowed'
  ]) if (request[field] !== false) blockers.push(`request.${field}`);
  const counters = rollback
    ? ['nativeActionsAuthorizedNow', 'verifyOperationsAuthorizedNow', 'rollbackOrCompensationOperationsAuthorizedNow']
    : ['nativeActionsAuthorizedNow', 'verifyOperationsAuthorizedNow', 'failureRecoveryOperationsAuthorizedNow'];
  for (const field of counters) if (request[field] !== 0) blockers.push(`request.${field}`);
  if (!rollback) {
    if (request.rollbackOrCompensationAllowed !== false) blockers.push('request.rollbackOrCompensationAllowed');
    const cases = ['pre_claim_failure_no_side_effect', 'pre_commit_failure_consumes_claim_without_retry', 'ambiguous_post_commit_stops_without_retry_or_compensation'];
    if (JSON.stringify(request.requiredFutureCases) !== JSON.stringify(cases)) blockers.push('request.requiredFutureCases');
  }
  return {
    accepted: blockers.length === 0,
    blockers,
    requestPrepared: blockers.length === 0,
    executionAuthorized: false,
    phase8Completed: false
  };
}

module.exports = { evaluateRemainingEvidenceRequest };
