'use strict';

const {
  isPlainObject,
  normalizeString
} = require('./FieldAliasNormalizer');

const CLIENT_SCOPE_WRITE_EFFECTIVE_SCOPE_CONSISTENCY_VERSION =
  'phase-h-client-scope-write-effective-scope-consistency-v1';

const WRITE_SCOPE_FIELDS = Object.freeze([
  { key: 'projectId', snakeKey: 'project_id', publicValue: true },
  { key: 'workspaceId', snakeKey: 'workspace_id', presenceOnly: true },
  { key: 'clientId', snakeKey: 'client_id', publicValue: true },
  { key: 'taskId', snakeKey: 'task_id', presenceOnly: true },
  { key: 'conversationId', snakeKey: 'conversation_id', presenceOnly: true },
  { key: 'visibility', snakeKey: 'visibility_policy', payloadAlias: 'visibility', publicValue: true },
  { key: 'retentionPolicy', snakeKey: 'retention_policy', publicValue: true }
]);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function normalizeExecutionContext(requestContext = {}) {
  const safeContext = isPlainObject(requestContext) ? requestContext : {};
  return isPlainObject(safeContext.executionContext) ? safeContext.executionContext : {};
}

function firstScopedValue(payload = {}, executionContext = {}, field) {
  const payloadAlias = field.payloadAlias || field.key;
  const candidates = [
    { value: executionContext[field.key], source: 'execution_context_camel' },
    { value: executionContext[field.snakeKey], source: 'execution_context_snake' },
    { value: payload[field.snakeKey], source: 'payload_snake' },
    { value: payload[payloadAlias], source: 'payload_camel' }
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate.value);
    if (normalized) {
      return {
        value: normalized,
        source: candidate.source
      };
    }
  }

  return {
    value: '',
    source: 'missing'
  };
}

function buildEffectiveScope(payload = {}, executionContext = {}) {
  const safePayload = isPlainObject(payload) ? payload : {};
  const safeExecutionContext = isPlainObject(executionContext) ? executionContext : {};
  const effectiveScope = {};
  const scopeSources = {};

  for (const field of WRITE_SCOPE_FIELDS) {
    const resolved = firstScopedValue(safePayload, safeExecutionContext, field);
    effectiveScope[field.key] = resolved.value;
    scopeSources[field.key] = resolved.source;
  }

  return {
    effectiveScope,
    scopeSources
  };
}

function hasExecutionContextValue(executionContext = {}, field) {
  return Boolean(normalizeString(executionContext[field.key])) ||
    Boolean(normalizeString(executionContext[field.snakeKey]));
}

function hasPayloadValue(payload = {}, field) {
  const payloadAlias = field.payloadAlias || field.key;
  return Boolean(normalizeString(payload[field.snakeKey])) ||
    Boolean(normalizeString(payload[payloadAlias]));
}

function payloadPreferredValue(payload = {}, field) {
  const payloadAlias = field.payloadAlias || field.key;
  return normalizeString(payload[field.snakeKey]) || normalizeString(payload[payloadAlias]);
}

function executionContextPreferredValue(executionContext = {}, field) {
  return normalizeString(executionContext[field.key]) || normalizeString(executionContext[field.snakeKey]);
}

function summarizeScopePrecedence(payload = {}, executionContext = {}, effectiveScope = {}, scopeSources = {}) {
  const contextWonOverPayloadFields = [];
  const payloadFallbackFields = [];
  const payloadSpoofBlockedFields = [];
  const missingFields = [];

  for (const field of WRITE_SCOPE_FIELDS) {
    const contextValue = executionContextPreferredValue(executionContext, field);
    const payloadValue = payloadPreferredValue(payload, field);
    const source = scopeSources[field.key];

    if (!effectiveScope[field.key]) {
      missingFields.push(field.key);
    }

    if (contextValue && payloadValue && contextValue !== payloadValue && source.startsWith('execution_context')) {
      contextWonOverPayloadFields.push(field.key);
      if (['projectId', 'workspaceId', 'clientId'].includes(field.key)) {
        payloadSpoofBlockedFields.push(field.key);
      }
    }

    if (!contextValue && payloadValue && source.startsWith('payload')) {
      payloadFallbackFields.push(field.key);
    }
  }

  return {
    contextWonOverPayloadFields,
    payloadFallbackFields,
    payloadSpoofBlockedFields,
    missingFields
  };
}

function buildSafeEffectiveScopeSummary(effectiveScope = {}, scopeSources = {}) {
  const summary = {};

  for (const field of WRITE_SCOPE_FIELDS) {
    if (field.presenceOnly) {
      summary[`${field.key}Present`] = Boolean(effectiveScope[field.key]);
    } else if (field.publicValue) {
      summary[field.key] = effectiveScope[field.key] || null;
    }
    summary[`${field.key}Source`] = scopeSources[field.key] || 'missing';
  }

  return summary;
}

function serializedIncludesRawWorkspaceId(value) {
  const serialized = JSON.stringify(value);
  return /workspace-(alpha|beta|payload|context|private)/i.test(serialized) ||
    /\/workspace\//i.test(serialized) ||
    /workspace_id"\s*:/i.test(serialized) ||
    /workspaceId"\s*:/i.test(serialized);
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
    flag('recordMemoryCalled', 'record_memory_called') ||
    nonZero('recordMemoryCalls', 'record_memory_calls') ||
    flag('memoryToolsExecuted', 'memory_tools_executed') ||
    nonZero('memoryToolsExecuted', 'memory_tools_executed') ||
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
    nonZero('reliabilityClaims', 'reliability_claims');
}

function summarizeClientScopeWriteEffectiveScopeConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const payload = isPlainObject(safeInput.payload) ? safeInput.payload : {};
  const executionContext = normalizeExecutionContext(safeInput.requestContext);
  const { effectiveScope, scopeSources } = buildEffectiveScope(payload, executionContext);
  const precedence = summarizeScopePrecedence(payload, executionContext, effectiveScope, scopeSources);
  const safeEffectiveScope = buildSafeEffectiveScopeSummary(effectiveScope, scopeSources);

  const executionContextAuthorityFields = WRITE_SCOPE_FIELDS
    .filter(field => hasExecutionContextValue(executionContext, field))
    .map(field => field.key);
  const payloadProvidedFields = WRITE_SCOPE_FIELDS
    .filter(field => hasPayloadValue(payload, field))
    .map(field => field.key);
  const executionContextWinsOverPayload =
    ['projectId', 'workspaceId', 'clientId'].every(field =>
      precedence.payloadSpoofBlockedFields.includes(field)
    );
  const payloadFallbackOnlyForMissingContext =
    precedence.payloadFallbackFields.length > 0 &&
    precedence.payloadFallbackFields.every(field => {
      const fieldSpec = WRITE_SCOPE_FIELDS.find(item => item.key === field);
      return fieldSpec && !hasExecutionContextValue(executionContext, fieldSpec);
    });
  const aliasNormalizationCovered =
    ['projectId', 'workspaceId', 'clientId', 'visibility'].every(field =>
      executionContextAuthorityFields.includes(field)
    ) &&
    ['taskId'].every(field => precedence.payloadFallbackFields.includes(field));
  const rawWorkspaceIdExposed = serializedIncludesRawWorkspaceId({
    safeEffectiveScope,
    precedence,
    executionContextAuthorityFields,
    payloadProvidedFields
  });
  const noApplyInvariant = sideEffectFlagged(safeInput.sideEffects) === false;

  const acceptedForWriteEffectiveScopeConsistency =
    sourceMode === 'explicit_input' &&
    executionContextWinsOverPayload === true &&
    payloadFallbackOnlyForMissingContext === true &&
    aliasNormalizationCovered === true &&
    rawWorkspaceIdExposed === false &&
    noApplyInvariant === true;

  return {
    consistencyVersion: CLIENT_SCOPE_WRITE_EFFECTIVE_SCOPE_CONSISTENCY_VERSION,
    sourceMode,
    acceptedForWriteEffectiveScopeConsistency,
    decision: acceptedForWriteEffectiveScopeConsistency
      ? 'NO_APPLY_CLIENT_SCOPE_WRITE_EFFECTIVE_SCOPE_CONSISTENCY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    authority: {
      executionContextWinsOverPayload,
      payloadFallbackOnlyForMissingContext,
      aliasNormalizationCovered,
      executionContextAuthorityFields,
      payloadProvidedFields,
      contextWonOverPayloadFields: precedence.contextWonOverPayloadFields,
      payloadFallbackFields: precedence.payloadFallbackFields,
      payloadSpoofBlockedFields: precedence.payloadSpoofBlockedFields
    },
    effectiveScope: safeEffectiveScope,
    rawWorkspaceIdExposed,
    noApplyInvariant,
    runtimeApplied: false,
    recordMemoryCalled: false,
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
        !executionContextWinsOverPayload ? 'execution_context_did_not_win_over_payload_scope' : null,
        !payloadFallbackOnlyForMissingContext
          ? 'payload_fallback_not_limited_to_missing_context_fields'
          : null,
        !aliasNormalizationCovered ? 'scope_alias_normalization_not_covered' : null,
        rawWorkspaceIdExposed ? 'raw_workspace_id_exposed' : null,
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
      rawWorkspaceIdExposed
    }
  };
}

module.exports = {
  CLIENT_SCOPE_WRITE_EFFECTIVE_SCOPE_CONSISTENCY_VERSION,
  summarizeClientScopeWriteEffectiveScopeConsistency
};
