'use strict';

const {
  MEMORY_ID_ALIASES,
  firstNonEmptyAliasString,
  isPlainObject,
  normalizeScopeTuple,
  normalizeString,
  sideEffectCounterFlagged,
  sideEffectValueFlagged
} = require('./FieldAliasNormalizer');

const CLIENT_SCOPE_VISIBILITY_BOUNDARY_CONSISTENCY_VERSION =
  'phase-h-client-scope-visibility-boundary-consistency-v1';

const READABLE_LIFECYCLE_STATUSES = Object.freeze(['active', 'stale']);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function normalizeRequestScope(requestContext = {}) {
  const safeContext = isPlainObject(requestContext) ? requestContext : {};
  const executionContext = isPlainObject(safeContext.executionContext)
    ? safeContext.executionContext
    : {};
  return normalizeScopeTuple(executionContext);
}

function normalizeCallerScope(scope = {}) {
  const safeScope = isPlainObject(scope) ? scope : {};
  return normalizeScopeTuple(safeScope.scope || safeScope);
}

function normalizeCandidate(candidate = {}) {
  const safeCandidate = isPlainObject(candidate) ? candidate : {};
  const candidateScope = normalizeScopeTuple(safeCandidate.scope || safeCandidate);
  const visibility = normalizeLower(
    candidateScope.visibility ||
    firstNonEmptyAliasString(safeCandidate, ['visibility', 'visibilityPolicy', 'visibility_policy'])
  ) || 'project';
  const lifecycleStatus = normalizeLower(firstNonEmptyAliasString(
    safeCandidate,
    ['lifecycleStatus', 'lifecycle_status', 'status']
  ) || 'active');

  return {
    memoryId: firstNonEmptyAliasString(safeCandidate, MEMORY_ID_ALIASES) || null,
    lifecycleStatus,
    visibility,
    scope: {
      ...candidateScope,
      visibility
    }
  };
}

function sanitizeCandidate(candidate, blockers = []) {
  return {
    memoryId: candidate.memoryId,
    lifecycleStatus: candidate.lifecycleStatus,
    visibility: candidate.visibility,
    ownerClientId: candidate.visibility === 'private'
      ? candidate.scope.clientId || null
      : null,
    ownerClientIdPresent: Boolean(candidate.scope.clientId),
    workspacePresent: Boolean(candidate.scope.workspaceId),
    blockers
  };
}

function evaluateVisibilityBoundary(candidates = [], requestScope = {}) {
  const acceptedCandidates = [];
  const suppressedCandidates = [];
  const requestClientId = normalizeString(requestScope.clientId);
  const normalizedCandidates = Array.isArray(candidates)
    ? candidates.map(normalizeCandidate)
    : [];

  for (const candidate of normalizedCandidates) {
    const blockers = [];
    const visibility = candidate.visibility || 'project';
    const privateCandidate = visibility === 'private';
    const ownerClientId = normalizeString(candidate.scope.clientId);

    if (!READABLE_LIFECYCLE_STATUSES.includes(candidate.lifecycleStatus)) {
      blockers.push('lifecycle_status_not_readable');
    }

    if (privateCandidate && !requestClientId) {
      blockers.push('request_client_id_missing_fail_closed');
    }

    if (privateCandidate && !ownerClientId) {
      blockers.push('owner_client_id_missing_fail_closed');
    }

    if (privateCandidate && requestClientId && ownerClientId && ownerClientId !== requestClientId) {
      blockers.push('cross_client_private_suppressed');
    }

    if (blockers.length > 0) {
      suppressedCandidates.push(sanitizeCandidate(candidate, blockers));
      continue;
    }

    acceptedCandidates.push(sanitizeCandidate(candidate));
  }

  return {
    acceptedCandidates,
    suppressedCandidates
  };
}

function serializedIncludesRawCandidateData(value) {
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

  const serialized = JSON.stringify(value);
  return inspect(value) ||
    /workspace-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /task-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /conversation-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /workspace_id"\s*:/i.test(serialized) ||
    /workspaceId"\s*:/i.test(serialized) ||
    /task_id"\s*:/i.test(serialized) ||
    /taskId"\s*:/i.test(serialized) ||
    /conversation_id"\s*:/i.test(serialized) ||
    /conversationId"\s*:/i.test(serialized);
}

function sideEffectFlagged(sideEffects = {}) {
  const safeSideEffects = isPlainObject(sideEffects) ? sideEffects : {};

  function flag(...keys) {
    return keys.some(key => sideEffectValueFlagged(safeSideEffects[key]));
  }

  function nonZero(...keys) {
    return keys.some(key => sideEffectValueFlagged(safeSideEffects[key]));
  }

  function normalizedNonZero(...keys) {
    return sideEffectCounterFlagged(safeSideEffects, { counterKeys: keys });
  }

  return flag('runtimeApplied', 'runtime_applied') ||
    flag('memoryToolsExecuted', 'memory_tools_executed') ||
    nonZero('memoryToolsExecuted', 'memory_tools_executed') ||
    flag('mcpToolsCalled', 'mcp_tools_called') ||
    nonZero('mcpToolsCalled', 'mcp_tools_called') ||
    flag('recordMemoryCalled', 'record_memory_called') ||
    nonZero('recordMemoryCalls', 'record_memory_calls') ||
    flag('searchMemoryCalled', 'search_memory_called') ||
    nonZero('searchMemoryCalls', 'search_memory_calls') ||
    flag('providerCalls', 'provider_calls', 'providerCallsExecuted', 'provider_calls_executed') ||
    nonZero('providerCalls', 'provider_calls') ||
    flag('realMemoryScanned', 'real_memory_scanned') ||
    flag('durableMutationExecuted', 'durable_mutation_executed') ||
    flag('durableAuditWritten', 'durable_audit_written') ||
    nonZero('durableMemoryWrites', 'durable_memory_writes') ||
    nonZero('durableAuditWrites', 'durable_audit_writes') ||
    flag('configChanged', 'config_changed') ||
    flag('watchdogStartupChanged', 'watchdog_startup_changed') ||
    flag('publicMcpExpanded', 'public_mcp_expanded') ||
    nonZero('publicMcpExpansions', 'public_mcp_expansions') ||
    flag('readinessClaimed', 'readiness_claimed') ||
    nonZero('readinessClaims', 'readiness_claims') ||
    flag('reliabilityClaimed', 'reliability_claimed') ||
    nonZero('reliabilityClaims', 'reliability_claims') ||
    normalizedNonZero(
      'providerCalls',
      'apiCalls',
      'trueRecordMemoryCalls',
      'trueSearchMemoryCalls',
      'recordMemoryCalls',
      'searchMemoryCalls',
      'realMemoryReads',
      'rawJsonlReads',
      'directJsonlReads',
      'rawAuditReads',
      'durableMemoryWrites',
      'durableAuditWrites',
      'governedActionExecutions',
      'cleanupApplyRuns',
      'rollbackApplyRuns',
      'publicMcpExpansions',
      'publicMcpExpansion',
      'configWatchdogStartupChanges',
      'dependencyActions',
      'syncCalls',
      'candidateCacheWrites',
      'vectorFlushes',
      'readinessClaims',
      'reliabilityClaims'
    );
}

function summarizeClientScopeVisibilityBoundaryConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const requestScope = normalizeRequestScope(safeInput.requestContext);
  const callerScope = normalizeCallerScope(safeInput.callerScope || safeInput.searchScope);
  const primaryEvaluation = evaluateVisibilityBoundary(safeInput.candidates, requestScope);
  const missingIdentityEvaluation = evaluateVisibilityBoundary(
    safeInput.missingRequestIdentityProbeCandidates,
    {}
  );
  const acceptedCandidates = primaryEvaluation.acceptedCandidates;
  const suppressedCandidates = [
    ...primaryEvaluation.suppressedCandidates,
    ...missingIdentityEvaluation.suppressedCandidates
  ];
  const suppressedBlockers = new Set(suppressedCandidates.flatMap(candidate => candidate.blockers));
  const acceptedPrivateClientIds = new Set(acceptedCandidates
    .filter(candidate => candidate.visibility === 'private')
    .map(candidate => candidate.ownerClientId)
    .filter(Boolean));
  const acceptedPublicVisibilityValues = new Set(acceptedCandidates
    .filter(candidate => candidate.visibility !== 'private')
    .map(candidate => candidate.visibility || 'project'));
  const requestClientId = normalizeString(requestScope.clientId);
  const callerClientId = normalizeString(callerScope.clientId);

  const sameClientPrivateAccepted =
    Boolean(requestClientId) && acceptedPrivateClientIds.has(requestClientId);
  const nonPrivateVisibilityAccepted =
    acceptedPublicVisibilityValues.has('shared') || acceptedPublicVisibilityValues.has('project');
  const crossClientPrivateSuppressed = suppressedBlockers.has('cross_client_private_suppressed');
  const ownerlessPrivateSuppressed =
    suppressedBlockers.has('owner_client_id_missing_fail_closed');
  const missingRequestIdentityPrivateSuppressed =
    suppressedBlockers.has('request_client_id_missing_fail_closed');
  const blockedLifecycleSuppressed =
    suppressedBlockers.has('lifecycle_status_not_readable');
  const callerScopeCandidateFilterOnly =
    Boolean(callerClientId) &&
    Boolean(requestClientId) &&
    callerClientId !== requestClientId &&
    !acceptedPrivateClientIds.has(callerClientId);
  const sanitizedPolicyTrace = {
    acceptedCandidates,
    suppressedCandidates
  };
  const rawCandidateDataExposed = serializedIncludesRawCandidateData(sanitizedPolicyTrace);
  const noApplyInvariant = sideEffectFlagged(safeInput.sideEffects) === false;

  const acceptedForVisibilityBoundaryConsistency =
    sourceMode === 'explicit_input' &&
    sameClientPrivateAccepted === true &&
    nonPrivateVisibilityAccepted === true &&
    crossClientPrivateSuppressed === true &&
    ownerlessPrivateSuppressed === true &&
    missingRequestIdentityPrivateSuppressed === true &&
    blockedLifecycleSuppressed === true &&
    callerScopeCandidateFilterOnly === true &&
    rawCandidateDataExposed === false &&
    noApplyInvariant === true;

  return {
    consistencyVersion: CLIENT_SCOPE_VISIBILITY_BOUNDARY_CONSISTENCY_VERSION,
    sourceMode,
    acceptedForVisibilityBoundaryConsistency,
    decision: acceptedForVisibilityBoundaryConsistency
      ? 'NO_APPLY_CLIENT_SCOPE_VISIBILITY_BOUNDARY_CONSISTENCY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    authority: {
      requestClientId: requestClientId || null,
      callerScopeClientId: callerClientId || null,
      requestWorkspacePresent: Boolean(requestScope.workspaceId),
      callerScopeWorkspacePresent: Boolean(callerScope.workspaceId),
      callerScopeCandidateFilterOnly
    },
    visibilityPolicy: {
      readableLifecycleStatuses: [...READABLE_LIFECYCLE_STATUSES],
      sameClientPrivateAccepted,
      nonPrivateVisibilityAccepted,
      crossClientPrivateSuppressed,
      ownerlessPrivateSuppressed,
      missingRequestIdentityPrivateSuppressed,
      blockedLifecycleSuppressed,
      acceptedCount: acceptedCandidates.length,
      suppressedCount: suppressedCandidates.length
    },
    sanitizedPolicyTrace,
    rawCandidateDataExposed,
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
        !sameClientPrivateAccepted ? 'same_client_private_not_accepted' : null,
        !nonPrivateVisibilityAccepted ? 'non_private_visibility_not_accepted' : null,
        !crossClientPrivateSuppressed ? 'cross_client_private_not_suppressed' : null,
        !ownerlessPrivateSuppressed ? 'ownerless_private_not_suppressed' : null,
        !missingRequestIdentityPrivateSuppressed ? 'missing_request_identity_private_not_suppressed' : null,
        !blockedLifecycleSuppressed ? 'blocked_lifecycle_status_not_suppressed' : null,
        !callerScopeCandidateFilterOnly ? 'caller_scope_identity_spoof_not_proven_blocked' : null,
        rawCandidateDataExposed ? 'raw_candidate_data_exposed' : null,
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
      rawCandidateDataExposed
    }
  };
}

module.exports = {
  CLIENT_SCOPE_VISIBILITY_BOUNDARY_CONSISTENCY_VERSION,
  READABLE_LIFECYCLE_STATUSES,
  summarizeClientScopeVisibilityBoundaryConsistency
};
