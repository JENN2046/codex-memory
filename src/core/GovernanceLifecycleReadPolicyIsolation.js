const {
  EXCLUDED_LIFECYCLE_STATUSES,
  filterRecallCandidatesByLifecycleScope
} = require('./MemoryLifecycleScopeGovernanceContract');

const ISOLATION_VERSION = 'phase-g-governance-lifecycle-read-policy-isolation-v1';

const REQUIRED_UNSAFE_STATUSES = Object.freeze([
  'proposal',
  'rejected',
  'superseded',
  'tombstoned',
  'forgotten',
  'excluded',
  'quarantined'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/-/g, '_') : '';
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function candidateHasRawFields(metadata) {
  const serialized = JSON.stringify(metadata);
  return /content|snippet|text|sourceFile|raw/i.test(serialized);
}

function summarizeGovernanceLifecycleReadPolicyIsolation(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const requiredUnsafeStatuses = cloneArray(safeInput.requiredUnsafeStatuses).length > 0
    ? cloneArray(safeInput.requiredUnsafeStatuses).map(normalizeString).filter(Boolean)
    : [...REQUIRED_UNSAFE_STATUSES];
  const filterReport = filterRecallCandidatesByLifecycleScope({
    candidates: cloneArray(safeInput.candidates),
    currentScope: isPlainObject(safeInput.currentScope) ? safeInput.currentScope : {},
    requiredScopeFields: cloneArray(safeInput.requiredScopeFields)
  });
  const acceptedStatuses = uniqueValues(filterReport.acceptedCandidates
    .map(candidate => normalizeString(candidate.lifecycleStatus))
    .filter(Boolean));
  const suppressedStatuses = uniqueValues(filterReport.suppressedCandidates
    .map(candidate => normalizeString(candidate.lifecycleStatus))
    .filter(Boolean));
  const missingUnsafeStatuses = requiredUnsafeStatuses
    .filter(status => !suppressedStatuses.includes(status));
  const unsafeStatusAccepted = filterReport.acceptedCandidates
    .some(candidate => EXCLUDED_LIFECYCLE_STATUSES.includes(normalizeString(candidate.lifecycleStatus)));
  const rawSuppressedMetadataExposed = filterReport.rawContentExposed === true ||
    candidateHasRawFields(filterReport.sanitizedAuditMetadata);
  const acceptedForReadPolicyIsolation =
    normalizeString(safeInput.sourceMode || 'explicit_input') === 'explicit_input' &&
    filterReport.acceptedCount > 0 &&
    filterReport.suppressedCount >= requiredUnsafeStatuses.length &&
    missingUnsafeStatuses.length === 0 &&
    unsafeStatusAccepted === false &&
    rawSuppressedMetadataExposed === false &&
    filterReport.durableMutationExecuted === false &&
    filterReport.publicMcpExpanded === false;

  return {
    isolationVersion: ISOLATION_VERSION,
    sourceMode: normalizeString(safeInput.sourceMode || 'explicit_input'),
    acceptedForReadPolicyIsolation,
    decision: acceptedForReadPolicyIsolation
      ? 'NO_APPLY_LIFECYCLE_READ_POLICY_ISOLATION_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    readPolicyMode: filterReport.readPolicyMode,
    acceptedCount: filterReport.acceptedCount,
    suppressedCount: filterReport.suppressedCount,
    acceptedStatuses,
    suppressedStatuses,
    requiredUnsafeStatuses,
    missingUnsafeStatuses,
    unsafeStatusAccepted,
    rawSuppressedMetadataExposed,
    durableMutationExecuted: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    sanitizedAuditMetadata: filterReport.sanitizedAuditMetadata,
    blockers: {
      blockingFindings: [
        filterReport.acceptedCount <= 0 ? 'active_control_candidate_missing' : null,
        filterReport.suppressedCount < requiredUnsafeStatuses.length ? 'unsafe_suppression_coverage_incomplete' : null,
        ...missingUnsafeStatuses.map(status => `unsafe_status_not_suppressed:${status}`),
        unsafeStatusAccepted ? 'unsafe_status_accepted_for_normal_recall' : null,
        rawSuppressedMetadataExposed ? 'raw_suppressed_metadata_exposed' : null,
        filterReport.durableMutationExecuted ? 'durable_mutation_executed' : null,
        filterReport.publicMcpExpanded ? 'public_mcp_expanded' : null
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
      rawPrivateMemoryExposed: rawSuppressedMetadataExposed
    }
  };
}

module.exports = {
  ISOLATION_VERSION,
  REQUIRED_UNSAFE_STATUSES,
  summarizeGovernanceLifecycleReadPolicyIsolation
};
