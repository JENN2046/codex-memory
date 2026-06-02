const {
  summarizeDeferredGovernanceCandidateCacheInvalidationPolicy
} = require('./DeferredGovernanceCandidateCacheInvalidationPolicy');

const INVALIDATION_BOUNDARY_VERSION = 'phase-g-governance-invalidation-boundary-consistency-v1';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function summarizeGovernanceInvalidationBoundaryConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const projectionPreview = isPlainObject(safeInput.projectionPreview)
    ? safeInput.projectionPreview
    : {};
  const projectionResult = isPlainObject(projectionPreview.projectionResult)
    ? projectionPreview.projectionResult
    : {};
  const candidateCachePolicy = summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(
    safeInput.candidateCacheInvalidationPolicy
  );
  const changedMemoryIds = cloneArray(projectionResult.projectedChangedMemoryIds)
    .map(normalizeString)
    .filter(Boolean);
  const projectedRevisionToken = normalizeString(projectionResult.projectedRevisionToken);
  const candidateCachePlan = isPlainObject(safeInput.candidateCachePlan)
    ? safeInput.candidateCachePlan
    : {};

  const projectionAccepted = projectionPreview.acceptedForProjectionPreview === true;
  const changedIdsPresent = changedMemoryIds.length > 0;
  const revisionPresent = Boolean(projectedRevisionToken);
  const candidateCachePolicyAccepted =
    candidateCachePolicy.candidateCacheInvalidationPolicyAccepted === true;
  const candidateCacheApplyBlocked =
    candidateCachePlan.applied !== true &&
    candidateCachePlan.candidateCacheCleared !== true &&
    candidateCachePlan.durableCacheMutationExecuted !== true;
  const noApplyInvariant =
    projectionPreview.executionApproved === false &&
    projectionPreview.runtimeIntegrated === false &&
    projectionPreview.mutated === false &&
    projectionPreview.durableProjectionApplied === false &&
    projectionPreview.durableAuditWritten === false &&
    projectionPreview.publicMcpExpanded === false &&
    projectionPreview.realMemoryScanned === false &&
    candidateCachePolicy.executionApproved === false &&
    candidateCachePolicy.runtimeIntegrated === false &&
    candidateCachePolicy.publicMcpExpanded === false &&
    candidateCachePolicy.readinessClaimed === false &&
    candidateCacheApplyBlocked;

  const acceptedForInvalidationBoundary =
    projectionAccepted &&
    changedIdsPresent &&
    revisionPresent &&
    candidateCachePolicyAccepted &&
    noApplyInvariant;

  return {
    invalidationBoundaryVersion: INVALIDATION_BOUNDARY_VERSION,
    sourceMode: normalizeString(safeInput.sourceMode) || 'explicit_input',
    acceptedForInvalidationBoundary,
    decision: acceptedForInvalidationBoundary
      ? 'NO_APPLY_INVALIDATION_BOUNDARY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    mutationFamily: normalizeString(projectionPreview.mutationFamily),
    projection: {
      accepted: projectionAccepted,
      changedMemoryIds,
      changedIdsPresent,
      projectedRevisionTokenPresent: revisionPresent,
      durableProjectionApplied: false
    },
    candidateCacheInvalidation: {
      policyAccepted: candidateCachePolicyAccepted,
      requiredTriggers: candidateCachePolicy.requiredInvalidationTriggers || [],
      requiredScopes: candidateCachePolicy.requiredInvalidationScopes || [],
      candidateCacheCleared: false,
      applied: false,
      cacheHitProjectionRecheckRequired: candidateCachePolicy.familyReports
        .every(report => report.cacheHitProjectionRechecked === true),
      staleSuppressedCacheReuseBlocked: candidateCachePolicy.familyReports
        .every(report => report.staleSuppressedCacheReuseBlocked === true)
    },
    noApplyInvariant,
    executionApproved: false,
    runtimeIntegrated: false,
    mutated: false,
    durableProjectionApplied: false,
    durableAuditWritten: false,
    publicMcpExpanded: false,
    realMemoryScanned: false,
    readinessClaimed: false,
    blockers: {
      blockingFindings: [
        !projectionAccepted ? 'projection_preview_not_accepted' : null,
        !changedIdsPresent ? 'projected_changed_memory_ids_missing' : null,
        !revisionPresent ? 'projected_revision_token_missing' : null,
        !candidateCachePolicyAccepted ? 'candidate_cache_invalidation_policy_not_accepted' : null,
        !candidateCacheApplyBlocked ? 'candidate_cache_apply_not_blocked' : null,
        !noApplyInvariant ? 'no_apply_invariant_failed' : null
      ].filter(Boolean)
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawPrivateMemoryExposed: false
    }
  };
}

module.exports = {
  INVALIDATION_BOUNDARY_VERSION,
  summarizeGovernanceInvalidationBoundaryConsistency
};
