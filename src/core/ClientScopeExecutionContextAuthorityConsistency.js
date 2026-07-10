'use strict';

const {
  isPlainObject,
  normalizeScopeTuple,
  normalizeString,
  sideEffectCounterFlagged,
  sideEffectValueFlagged
} = require('./FieldAliasNormalizer');

const CLIENT_SCOPE_EXECUTION_CONTEXT_AUTHORITY_CONSISTENCY_VERSION =
  'phase-h-client-scope-execution-context-authority-consistency-v1';

const EXPECTED_PUBLIC_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const AUTHORITY_FIELDS = Object.freeze([
  { key: 'projectId', publicValue: true },
  { key: 'workspaceId', presenceOnly: true },
  { key: 'clientId', publicValue: true },
  { key: 'taskId', presenceOnly: true },
  { key: 'conversationId', presenceOnly: true },
  { key: 'visibility', publicValue: true },
  { key: 'retentionPolicy', publicValue: true }
]);

const IDENTITY_FIELDS = Object.freeze(['projectId', 'workspaceId', 'clientId']);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function normalizeExecutionContext(requestContext = {}) {
  const safeContext = isPlainObject(requestContext) ? requestContext : {};
  const executionContext = isPlainObject(safeContext.executionContext)
    ? safeContext.executionContext
    : {};
  return normalizeScopeTuple(executionContext);
}

function normalizeDeclaredScope(scope = {}) {
  const safeScope = isPlainObject(scope) ? scope : {};
  return normalizeScopeTuple(safeScope.scope || safeScope);
}

function sameAuthorityTuple(left = {}, right = {}) {
  return AUTHORITY_FIELDS.every(field => {
    return normalizeString(left[field.key]) === normalizeString(right[field.key]);
  });
}

function scopeFieldMismatches(authorityScope = {}, declaredScope = {}) {
  return AUTHORITY_FIELDS
    .map(field => field.key)
    .filter(field => {
      const declaredValue = normalizeString(declaredScope[field]);
      return declaredValue && declaredValue !== normalizeString(authorityScope[field]);
    });
}

function summarizeDeclaredScope(name, authorityScope = {}, rawScope = {}) {
  const declaredScope = normalizeDeclaredScope(rawScope);
  const mismatches = scopeFieldMismatches(authorityScope, declaredScope);

  return {
    name,
    clientId: declaredScope.clientId || null,
    projectId: declaredScope.projectId || null,
    workspacePresent: Boolean(declaredScope.workspaceId),
    taskPresent: Boolean(declaredScope.taskId),
    conversationPresent: Boolean(declaredScope.conversationId),
    visibility: declaredScope.visibility || null,
    mismatchFields: mismatches,
    identityMismatchBlocked: IDENTITY_FIELDS.some(field => mismatches.includes(field))
  };
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeString(item)).filter(Boolean)
    : [];
}

function sameStringSet(left = [], right = []) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return left.length === right.length &&
    leftSet.size === rightSet.size &&
    [...leftSet].every(item => rightSet.has(item));
}

function buildSafeAuthorityScope(scope = {}) {
  const output = {};

  for (const field of AUTHORITY_FIELDS) {
    if (field.presenceOnly) {
      output[`${field.key}Present`] = Boolean(scope[field.key]);
    } else if (field.publicValue) {
      output[field.key] = scope[field.key] || null;
    }
  }

  return output;
}

function serializedIncludesRawPrivateScope(value) {
  const serialized = JSON.stringify(value);
  return /workspace-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /task-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /conversation-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /\/workspace\//i.test(serialized) ||
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
    flag('recordMemoryCalled', 'record_memory_called') ||
    nonZero('recordMemoryCalls', 'record_memory_calls') ||
    flag('searchMemoryCalled', 'search_memory_called') ||
    nonZero('searchMemoryCalls', 'search_memory_calls') ||
    flag('memoryOverviewCalled', 'memory_overview_called') ||
    nonZero('memoryOverviewCalls', 'memory_overview_calls') ||
    flag('mcpToolsCalled', 'mcp_tools_called') ||
    nonZero('mcpToolsCalled', 'mcp_tools_called') ||
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

function evaluateMissingClientIdentityProbe(probe = {}) {
  const safeProbe = isPlainObject(probe) ? probe : {};
  const probeScope = normalizeExecutionContext(safeProbe.requestContext || {});
  const declaredScope = normalizeDeclaredScope(safeProbe.payloadScope || safeProbe.scope || {});
  const operation = normalizeLower(safeProbe.operation || 'private_write');
  const requiresClientIdentity = ['private_read', 'private_write', 'write'].includes(operation);
  const payloadClientIdPresent = Boolean(declaredScope.clientId);
  const requestClientIdMissing = !probeScope.clientId;

  return {
    operation,
    requestClientIdMissing,
    payloadClientIdPresent,
    failsClosed: requiresClientIdentity && requestClientIdMissing && payloadClientIdPresent
  };
}

function summarizeClientScopeExecutionContextAuthorityConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const authorityScope = normalizeExecutionContext(safeInput.requestContext);
  const aliasProbeScope = normalizeScopeTuple(safeInput.aliasProbeExecutionContext || {});
  const declaredScopeSummaries = [
    summarizeDeclaredScope('payload_scope', authorityScope, safeInput.payloadScope),
    summarizeDeclaredScope('search_scope', authorityScope, safeInput.searchScope),
    summarizeDeclaredScope('client_declared_scope', authorityScope, safeInput.clientDeclaredScope)
  ];
  const observedPublicTools = normalizeStringArray(
    safeInput.publicTools || safeInput.public_tools || safeInput.observedPublicTools
  );
  const publicToolsFrozen = sameStringSet(observedPublicTools, EXPECTED_PUBLIC_TOOLS);
  const missingClientIdentityProbe = evaluateMissingClientIdentityProbe(
    safeInput.missingClientIdentityProbe
  );
  const safeAuthorityScope = buildSafeAuthorityScope(authorityScope);

  const aliasNormalizationEquivalent = sameAuthorityTuple(authorityScope, aliasProbeScope);
  const executionContextIdentityPresent =
    Boolean(authorityScope.projectId) &&
    Boolean(authorityScope.workspaceId) &&
    Boolean(authorityScope.clientId);
  const declaredScopeIdentitySpoofBlocked =
    declaredScopeSummaries.every(summary => summary.identityMismatchBlocked === true);
  const missingClientIdentityFailsClosed = missingClientIdentityProbe.failsClosed === true;
  const rawPrivateScopeExposed = serializedIncludesRawPrivateScope({
    authorityScope: safeAuthorityScope,
    declaredScopes: declaredScopeSummaries,
    missingClientIdentityProbe
  });
  const noApplyInvariant = sideEffectFlagged(safeInput.sideEffects) === false;

  const acceptedForExecutionContextAuthorityConsistency =
    sourceMode === 'explicit_input' &&
    aliasNormalizationEquivalent === true &&
    executionContextIdentityPresent === true &&
    declaredScopeIdentitySpoofBlocked === true &&
    missingClientIdentityFailsClosed === true &&
    publicToolsFrozen === true &&
    rawPrivateScopeExposed === false &&
    noApplyInvariant === true;

  return {
    consistencyVersion: CLIENT_SCOPE_EXECUTION_CONTEXT_AUTHORITY_CONSISTENCY_VERSION,
    sourceMode,
    acceptedForExecutionContextAuthorityConsistency,
    decision: acceptedForExecutionContextAuthorityConsistency
      ? 'NO_APPLY_CLIENT_SCOPE_EXECUTION_CONTEXT_AUTHORITY_CONSISTENCY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    authority: {
      aliasNormalizationEquivalent,
      executionContextIdentityPresent,
      declaredScopeIdentitySpoofBlocked,
      missingClientIdentityFailsClosed,
      authorityScope: safeAuthorityScope
    },
    declaredScopes: declaredScopeSummaries,
    publicTools: {
      expected: [...EXPECTED_PUBLIC_TOOLS],
      observed: observedPublicTools,
      frozen: publicToolsFrozen
    },
    missingClientIdentityProbe,
    rawPrivateScopeExposed,
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
        !aliasNormalizationEquivalent ? 'execution_context_alias_normalization_drift' : null,
        !executionContextIdentityPresent ? 'execution_context_identity_missing' : null,
        !declaredScopeIdentitySpoofBlocked ? 'declared_scope_identity_spoof_not_blocked' : null,
        !missingClientIdentityFailsClosed ? 'missing_client_identity_not_fail_closed' : null,
        !publicToolsFrozen ? 'public_tools_not_frozen' : null,
        rawPrivateScopeExposed ? 'raw_private_scope_exposed' : null,
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
      rawPrivateScopeExposed
    }
  };
}

module.exports = {
  CLIENT_SCOPE_EXECUTION_CONTEXT_AUTHORITY_CONSISTENCY_VERSION,
  EXPECTED_PUBLIC_TOOLS,
  summarizeClientScopeExecutionContextAuthorityConsistency
};
