'use strict';

const {
  firstNonEmptyAliasString,
  isPlainObject,
  normalizeString,
  sideEffectCounterFlagged,
  sideEffectValueFlagged
} = require('./FieldAliasNormalizer');

const RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_PREFLIGHT_VERSION =
  'record-memory-principal-scope-authorization-preflight-v1';

const REQUIRED_CONTEXT_FIELDS = Object.freeze([
  'agentAlias',
  'agentId',
  'requestSource',
  'projectId',
  'workspaceId',
  'clientId'
]);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => normalizeString(item)).filter(Boolean);
}

function normalizeExecutionContext(executionContext = {}) {
  const context = isPlainObject(executionContext) ? executionContext : {};
  return {
    agentAlias: normalizeString(context.agentAlias),
    agentId: normalizeString(context.agentId),
    requestSource: normalizeString(context.requestSource),
    projectId: firstNonEmptyAliasString(context, ['projectId', 'project_id']),
    workspaceId: firstNonEmptyAliasString(context, ['workspaceId', 'workspace_id']),
    clientId: firstNonEmptyAliasString(context, ['clientId', 'client_id']),
    taskId: firstNonEmptyAliasString(context, ['taskId', 'task_id']),
    conversationId: firstNonEmptyAliasString(context, ['conversationId', 'conversation_id']),
    visibility: firstNonEmptyAliasString(context, ['visibility', 'visibility_policy']),
    retentionPolicy: firstNonEmptyAliasString(context, ['retentionPolicy', 'retention_policy'])
  };
}

function valueAllowed(value, allowedValues = []) {
  return Boolean(value) && allowedValues.includes(value);
}

function sideEffectFlagged(sideEffects = {}) {
  const safeSideEffects = isPlainObject(sideEffects) ? sideEffects : {};

  function flag(...keys) {
    return keys.some(key => sideEffectValueFlagged(safeSideEffects[key]));
  }

  return flag('runtimeApplied', 'runtime_applied') ||
    flag('recordMemoryCalled', 'record_memory_called') ||
    flag('memoryToolsExecuted', 'memory_tools_executed') ||
    flag('providerCalls', 'provider_calls') ||
    flag('realMemoryScanned', 'real_memory_scanned') ||
    flag('durableMutationExecuted', 'durable_mutation_executed') ||
    flag('durableAuditWritten', 'durable_audit_written') ||
    flag('configChanged', 'config_changed') ||
    flag('watchdogStartupChanged', 'watchdog_startup_changed') ||
    flag('publicMcpExpanded', 'public_mcp_expanded') ||
    flag('readinessClaimed', 'readiness_claimed') ||
    flag('reliabilityClaimed', 'reliability_claimed') ||
    sideEffectCounterFlagged(safeSideEffects, {
      counterKeys: [
        'providerCalls',
        'apiCalls',
        'recordMemoryCalls',
        'trueRecordMemoryCalls',
        'memoryToolCalls',
        'realMemoryReads',
        'rawJsonlReads',
        'rawAuditReads',
        'durableMemoryWrites',
        'durableAuditWrites',
        'publicMcpExpansions',
        'configWatchdogStartupChanges',
        'dependencyActions',
        'readinessClaims',
        'reliabilityClaims'
      ]
    });
}

function buildSafeContextSummary(context = {}) {
  return {
    agentAlias: context.agentAlias || null,
    agentId: context.agentId || null,
    requestSource: context.requestSource || null,
    projectId: context.projectId || null,
    workspaceIdPresent: Boolean(context.workspaceId),
    clientId: context.clientId || null,
    taskIdPresent: Boolean(context.taskId),
    conversationIdPresent: Boolean(context.conversationId),
    visibility: context.visibility || null,
    retentionPolicy: context.retentionPolicy || null
  };
}

function serializedIncludesRawWorkspace(value) {
  const serialized = JSON.stringify(value);
  return /workspace-(alpha|beta|gamma|private|payload|context|unexpected)/i.test(serialized) ||
    /workspace_id"\s*:/i.test(serialized) ||
    /workspaceId"\s*:/i.test(serialized);
}

function summarizeRecordMemoryPrincipalScopeAuthorizationPreflight(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const policy = isPlainObject(safeInput.policy) ? safeInput.policy : {};
  const context = normalizeExecutionContext(safeInput.executionContext);
  const allowedAgentAlias = normalizeString(policy.allowedAgentAlias);
  const allowedAgentIds = normalizeStringArray(policy.allowedAgentIds);
  const allowedRequestSources = normalizeStringArray(policy.allowedRequestSources);
  const allowedProjectIds = normalizeStringArray(policy.allowedProjectIds);
  const allowedWorkspaceIds = normalizeStringArray(policy.allowedWorkspaceIds);
  const allowedClientIds = normalizeStringArray(policy.allowedClientIds);

  const missingRequiredContextFields = REQUIRED_CONTEXT_FIELDS.filter(field => !context[field]);
  const matches = {
    agentAlias: Boolean(allowedAgentAlias) && context.agentAlias === allowedAgentAlias,
    agentId: valueAllowed(context.agentId, allowedAgentIds),
    requestSource: valueAllowed(context.requestSource, allowedRequestSources),
    projectId: valueAllowed(context.projectId, allowedProjectIds),
    workspaceId: valueAllowed(context.workspaceId, allowedWorkspaceIds),
    clientId: valueAllowed(context.clientId, allowedClientIds)
  };
  const mismatchedFields = Object.entries(matches)
    .filter(([, matched]) => matched !== true)
    .map(([field]) => field);
  const requiredPolicyPresent = Boolean(allowedAgentAlias) &&
    allowedAgentIds.length > 0 &&
    allowedRequestSources.length > 0 &&
    allowedProjectIds.length > 0 &&
    allowedWorkspaceIds.length > 0 &&
    allowedClientIds.length > 0;
  const noApplyInvariant = sideEffectFlagged(safeInput.sideEffects) === false;
  const safeContext = buildSafeContextSummary(context);
  const rawWorkspaceIdExposed = serializedIncludesRawWorkspace({
    safeContext,
    missingRequiredContextFields,
    mismatchedFields
  });
  const allPrincipalScopeMatched =
    Object.values(matches).every(value => value === true) &&
    missingRequiredContextFields.length === 0;

  const acceptedForPrincipalScopeAuthorizationPreflight =
    sourceMode === 'explicit_input' &&
    requiredPolicyPresent === true &&
    allPrincipalScopeMatched === true &&
    rawWorkspaceIdExposed === false &&
    noApplyInvariant === true;

  return {
    preflightVersion: RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_PREFLIGHT_VERSION,
    sourceMode,
    acceptedForPrincipalScopeAuthorizationPreflight,
    decision: acceptedForPrincipalScopeAuthorizationPreflight
      ? 'NO_APPLY_RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_PREFLIGHT_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    authorizationModel: 'future_fail_closed_preflight_only',
    currentRuntimeAuthorizationChanged: false,
    recordMemoryRuntimeIntegrated: false,
    requiredPolicyPresent,
    requiredContextFieldsPresent: missingRequiredContextFields.length === 0,
    allPrincipalScopeMatched,
    matches,
    missingRequiredContextFields,
    mismatchedFields,
    safeContext,
    rawWorkspaceIdExposed,
    noApplyInvariant,
    runtimeApplied: false,
    recordMemoryCalled: false,
    providerCalls: 0,
    realMemoryScanned: false,
    durableMutationExecuted: false,
    durableAuditWritten: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    safety: {
      callsMemoryTools: false,
      callsProviders: false,
      scansRealMemory: false,
      mutatesDurableState: false,
      changesRuntimeAuth: false
    }
  };
}

module.exports = {
  RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_PREFLIGHT_VERSION,
  summarizeRecordMemoryPrincipalScopeAuthorizationPreflight
};
