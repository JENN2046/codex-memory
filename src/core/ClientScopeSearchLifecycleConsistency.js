'use strict';

const {
  MEMORY_ID_ALIASES,
  firstNonEmptyAliasString,
  isPlainObject,
  normalizeScopeTuple,
  normalizeString
} = require('./FieldAliasNormalizer');
const {
  filterRecallCandidatesByLifecycleScope,
  normalizeScopeFields
} = require('./MemoryLifecycleScopeGovernanceContract');

const CLIENT_SCOPE_SEARCH_LIFECYCLE_CONSISTENCY_VERSION =
  'phase-h-client-scope-search-lifecycle-consistency-v1';

const DEFAULT_REQUIRED_SCOPE_FIELDS = Object.freeze([
  'projectId',
  'workspaceId',
  'clientId',
  'visibility'
]);

const SEARCH_SCOPE_FIELDS = Object.freeze([
  ['projectId', 'project_id'],
  ['workspaceId', 'workspace_id'],
  ['clientId', 'client_id'],
  ['visibility', 'visibility']
]);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function normalizeVisibilityValues(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeLower).filter(Boolean);
  }
  const normalized = normalizeLower(value);
  return normalized ? [normalized] : [];
}

function normalizeSearchScope(searchScope = {}) {
  const safeScope = isPlainObject(searchScope) ? searchScope : {};
  const normalizedTuple = normalizeScopeTuple(safeScope);
  const visibilityValues = normalizeVisibilityValues(
    safeScope.visibility || safeScope.visibility_policy || normalizedTuple.visibility
  );

  return {
    ...normalizedTuple,
    visibilityValues,
    strict: safeScope.strict === true
  };
}

function normalizeExecutionScope(requestContext = {}) {
  const safeContext = isPlainObject(requestContext) ? requestContext : {};
  const executionContext = isPlainObject(safeContext.executionContext)
    ? safeContext.executionContext
    : {};

  return normalizeScopeTuple(executionContext);
}

function normalizeCandidate(candidate = {}) {
  const safeCandidate = isPlainObject(candidate) ? candidate : {};
  const candidateScope = normalizeScopeTuple(safeCandidate.scope || safeCandidate);
  const lifecycleStatus = normalizeLower(firstNonEmptyAliasString(
    safeCandidate,
    ['lifecycleStatus', 'lifecycle_status', 'status']
  ) || 'active');

  return {
    memoryId: firstNonEmptyAliasString(safeCandidate, MEMORY_ID_ALIASES) || null,
    lifecycleStatus,
    scope: candidateScope,
    malformedLifecycle: safeCandidate.malformedLifecycle === true ||
      safeCandidate.malformed_lifecycle === true,
    malformedScope: safeCandidate.malformedScope === true ||
      safeCandidate.malformed_scope === true,
    unresolvedRemediation: safeCandidate.unresolvedRemediation === true ||
      safeCandidate.unresolved_remediation === true
  };
}

function searchScopeDimensionMismatches(candidateScope = {}, searchScope = {}) {
  const mismatches = [];

  for (const [camelKey] of SEARCH_SCOPE_FIELDS) {
    if (camelKey === 'visibility') {
      if (
        searchScope.visibilityValues.length > 0 &&
        !searchScope.visibilityValues.includes(normalizeLower(candidateScope.visibility))
      ) {
        mismatches.push('visibility');
      }
      continue;
    }

    const expected = normalizeString(searchScope[camelKey]);
    if (expected && normalizeString(candidateScope[camelKey]) !== expected) {
      mismatches.push(camelKey);
    }
  }

  return mismatches;
}

function filterCandidatesBySearchScope(candidates = [], searchScope = {}) {
  const acceptedCandidates = [];
  const excludedCandidates = [];
  const normalizedCandidates = Array.isArray(candidates) ? candidates.map(normalizeCandidate) : [];

  for (const candidate of normalizedCandidates) {
    const mismatches = searchScopeDimensionMismatches(candidate.scope, searchScope);
    if (mismatches.length > 0) {
      excludedCandidates.push({
        memoryId: candidate.memoryId,
        decision: 'excluded_by_search_scope_candidate_filter',
        blockers: ['search_scope_candidate_filter_mismatch'],
        scopeMismatches: mismatches
      });
      continue;
    }
    acceptedCandidates.push(candidate);
  }

  return {
    acceptedCandidates,
    excludedCandidates
  };
}

function buildLifecycleCandidates(candidates = []) {
  return candidates.map(candidate => ({
    memoryId: candidate.memoryId,
    lifecycleStatus: candidate.lifecycleStatus,
    scope: candidate.scope,
    malformedLifecycle: candidate.malformedLifecycle,
    malformedScope: candidate.malformedScope,
    unresolvedRemediation: candidate.unresolvedRemediation
  }));
}

function stringsDiffer(left, right) {
  return Boolean(normalizeString(left)) &&
    Boolean(normalizeString(right)) &&
    normalizeString(left) !== normalizeString(right);
}

function scopesDiffer(left = {}, right = {}) {
  return SEARCH_SCOPE_FIELDS.some(([camelKey]) => {
    if (camelKey === 'visibility') {
      const rightVisibility = Array.isArray(right.visibilityValues)
        ? right.visibilityValues[0]
        : right.visibility;
      return stringsDiffer(left.visibility, rightVisibility);
    }
    return stringsDiffer(left[camelKey], right[camelKey]);
  });
}

function serializedIncludesRawPrivateData(value) {
  const rawFieldNames = new Set([
    'content',
    'snippet',
    'text',
    'sourceFile',
    'source_file',
    'filePath',
    'file_path',
    'raw',
    'title'
  ]);

  function inspect(candidate) {
    if (Array.isArray(candidate)) {
      return candidate.some(inspect);
    }
    if (!isPlainObject(candidate)) {
      return false;
    }
    return Object.entries(candidate).some(([key, nested]) => {
      return rawFieldNames.has(key) || inspect(nested);
    });
  }

  return inspect(value);
}

function sideEffectFlagged(sideEffects = {}) {
  const safeSideEffects = isPlainObject(sideEffects) ? sideEffects : {};

  function flag(...keys) {
    return keys.some(key => safeSideEffects[key] === true);
  }

  function nonZero(...keys) {
    return keys.some(key => {
      const value = safeSideEffects[key];
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    });
  }

  return flag('runtimeApplied', 'runtime_applied') ||
    flag('memoryToolsExecuted', 'memory_tools_executed') ||
    nonZero('memoryToolsExecuted', 'memory_tools_executed') ||
    flag('mcpToolsCalled', 'mcp_tools_called') ||
    nonZero('mcpToolsCalled', 'mcp_tools_called') ||
    flag('providerCalls', 'provider_calls', 'providerCallsExecuted', 'provider_calls_executed') ||
    nonZero('providerCalls', 'provider_calls') ||
    flag('realMemoryScanned', 'real_memory_scanned') ||
    flag('durableMutationExecuted', 'durable_mutation_executed') ||
    flag('durableAuditWritten', 'durable_audit_written') ||
    nonZero('durableAuditWrites', 'durable_audit_writes') ||
    flag('configChanged', 'config_changed') ||
    flag('watchdogStartupChanged', 'watchdog_startup_changed') ||
    flag('publicMcpExpanded', 'public_mcp_expanded') ||
    nonZero('publicMcpExpansions', 'public_mcp_expansions') ||
    flag('readinessClaimed', 'readiness_claimed') ||
    nonZero('readinessClaims', 'readiness_claims') ||
    flag('reliabilityClaimed', 'reliability_claimed') ||
    nonZero('reliabilityClaims', 'reliability_claims');
}

function summarizeClientScopeSearchLifecycleConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const requestScope = normalizeExecutionScope(safeInput.requestContext);
  const lifecycleCurrentScope = normalizeExecutionScope({
    executionContext: isPlainObject(safeInput.lifecycleExecutionContext)
      ? safeInput.lifecycleExecutionContext
      : isPlainObject(safeInput.requestContext)
        ? safeInput.requestContext.executionContext
        : {}
  });
  const searchScope = normalizeSearchScope(safeInput.searchScope || safeInput.scope || {});
  const spoofedSearchScope = normalizeSearchScope(
    safeInput.spoofedSearchScope || safeInput.spoofed_scope || {}
  );
  const requiredScopeFields = normalizeScopeFields(
    safeInput.requiredScopeFields || DEFAULT_REQUIRED_SCOPE_FIELDS
  );

  const primarySearchFiltered = filterCandidatesBySearchScope(safeInput.candidates, searchScope);
  const primaryLifecycleFiltered = filterRecallCandidatesByLifecycleScope({
    currentScope: lifecycleCurrentScope,
    requiredScopeFields,
    candidates: buildLifecycleCandidates(primarySearchFiltered.acceptedCandidates)
  });
  const spoofSearchFiltered = filterCandidatesBySearchScope(
    safeInput.spoofProbeCandidates,
    spoofedSearchScope
  );
  const spoofLifecycleFiltered = filterRecallCandidatesByLifecycleScope({
    currentScope: lifecycleCurrentScope,
    requiredScopeFields,
    candidates: buildLifecycleCandidates(spoofSearchFiltered.acceptedCandidates)
  });

  const searchFilteredOutCount = primarySearchFiltered.excludedCandidates.length;
  const searchFilterAcceptedCount = primarySearchFiltered.acceptedCandidates.length;
  const lifecycleAcceptedCount = primaryLifecycleFiltered.acceptedCount;
  const lifecycleSuppressedCount = primaryLifecycleFiltered.suppressedCount;
  const spoofProbeCandidateFilterAcceptedCount = spoofSearchFiltered.acceptedCandidates.length;
  const spoofProbeLifecycleSuppressedCount = spoofLifecycleFiltered.suppressedCount;
  const searchScopeAppliedAsCandidateFilter =
    searchFilterAcceptedCount > 0 && searchFilteredOutCount > 0;
  const lifecycleCurrentScopeFromExecutionContext =
    Boolean(requestScope.clientId) &&
    lifecycleCurrentScope.clientId === requestScope.clientId &&
    lifecycleCurrentScope.projectId === requestScope.projectId &&
    lifecycleCurrentScope.workspaceId === requestScope.workspaceId;
  const searchScopeDoesNotBecomeLifecycleIdentity =
    spoofProbeCandidateFilterAcceptedCount > 0 &&
    spoofProbeLifecycleSuppressedCount === spoofProbeCandidateFilterAcceptedCount &&
    scopesDiffer(lifecycleCurrentScope, spoofedSearchScope);
  const scopedSearchFiltersProjectWorkspaceClientVisibility =
    ['projectId', 'workspaceId', 'clientId', 'visibility'].every(field => {
      const filterPresent = field === 'visibility'
        ? searchScope.visibilityValues.length > 0
        : Boolean(normalizeString(searchScope[field]));
      if (!filterPresent) return false;
      return primarySearchFiltered.acceptedCandidates.every(candidate => {
        const mismatches = searchScopeDimensionMismatches(candidate.scope, searchScope);
        return mismatches.length === 0;
      });
    });
  const acceptedLifecycleCandidatePresent = lifecycleAcceptedCount > 0;
  const spoofScopeCandidateSuppressed = searchScopeDoesNotBecomeLifecycleIdentity;
  const sanitizedAuditMetadata = [
    ...primarySearchFiltered.excludedCandidates,
    ...primaryLifecycleFiltered.sanitizedAuditMetadata,
    ...spoofSearchFiltered.excludedCandidates,
    ...spoofLifecycleFiltered.sanitizedAuditMetadata
  ];
  const rawSuppressedMetadataExposed = serializedIncludesRawPrivateData(sanitizedAuditMetadata);
  const noApplyInvariant = sideEffectFlagged(safeInput.sideEffects) === false;

  const acceptedForSearchLifecycleConsistency =
    sourceMode === 'explicit_input' &&
    searchScopeAppliedAsCandidateFilter === true &&
    scopedSearchFiltersProjectWorkspaceClientVisibility === true &&
    acceptedLifecycleCandidatePresent === true &&
    lifecycleCurrentScopeFromExecutionContext === true &&
    searchScopeDoesNotBecomeLifecycleIdentity === true &&
    spoofScopeCandidateSuppressed === true &&
    rawSuppressedMetadataExposed === false &&
    noApplyInvariant === true;

  return {
    consistencyVersion: CLIENT_SCOPE_SEARCH_LIFECYCLE_CONSISTENCY_VERSION,
    sourceMode,
    acceptedForSearchLifecycleConsistency,
    decision: acceptedForSearchLifecycleConsistency
      ? 'NO_APPLY_CLIENT_SCOPE_SEARCH_LIFECYCLE_CONSISTENCY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    authority: {
      requestClientId: requestScope.clientId || null,
      requestProjectId: requestScope.projectId || null,
      requestWorkspacePresent: Boolean(requestScope.workspaceId),
      searchScopeClientId: searchScope.clientId || null,
      lifecycleCurrentScopeClientId: lifecycleCurrentScope.clientId || null,
      lifecycleCurrentScopeWorkspacePresent: Boolean(lifecycleCurrentScope.workspaceId),
      lifecycleCurrentScopeFromExecutionContext,
      searchScopeDoesNotBecomeLifecycleIdentity
    },
    searchScope: {
      strict: searchScope.strict,
      appliedAsCandidateFilter: searchScopeAppliedAsCandidateFilter,
      scopedSearchFiltersProjectWorkspaceClientVisibility,
      acceptedCount: searchFilterAcceptedCount,
      filteredOutCount: searchFilteredOutCount
    },
    lifecycleReadPolicy: {
      requiredScopeFields,
      acceptedCount: lifecycleAcceptedCount,
      suppressedCount: lifecycleSuppressedCount,
      acceptedLifecycleCandidatePresent,
      spoofProbeCandidateFilterAcceptedCount,
      spoofProbeLifecycleSuppressedCount,
      spoofScopeCandidateSuppressed
    },
    sanitizedAuditMetadata,
    rawSuppressedMetadataExposed,
    noApplyInvariant,
    runtimeApplied: false,
    memoryToolsExecuted: false,
    providerCalls: 0,
    realMemoryScanned: false,
    durableMutationExecuted: false,
    durableAuditWritten: false,
    configChanged: false,
    watchdogStartupChanged: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    blockers: {
      blockingFindings: [
        sourceMode !== 'explicit_input' ? 'source_mode_not_explicit_input' : null,
        !searchScopeAppliedAsCandidateFilter ? 'search_scope_candidate_filter_not_proven' : null,
        !scopedSearchFiltersProjectWorkspaceClientVisibility
          ? 'search_scope_dimension_filtering_not_proven'
          : null,
        !acceptedLifecycleCandidatePresent ? 'lifecycle_positive_control_missing' : null,
        !lifecycleCurrentScopeFromExecutionContext
          ? 'lifecycle_current_scope_not_execution_context'
          : null,
        !searchScopeDoesNotBecomeLifecycleIdentity
          ? 'search_scope_identity_spoof_not_proven_blocked'
          : null,
        rawSuppressedMetadataExposed ? 'raw_suppressed_metadata_exposed' : null,
        !noApplyInvariant ? 'no_apply_invariant_failed' : null
      ].filter(Boolean)
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsMcpTools: false,
      callsMemoryTools: false,
      callsProviders: false,
      usesBearerToken: false,
      mutatesClientConfig: false,
      mutatesWatchdogStartup: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawPrivateMemoryExposed: rawSuppressedMetadataExposed
    }
  };
}

module.exports = {
  CLIENT_SCOPE_SEARCH_LIFECYCLE_CONSISTENCY_VERSION,
  summarizeClientScopeSearchLifecycleConsistency
};
