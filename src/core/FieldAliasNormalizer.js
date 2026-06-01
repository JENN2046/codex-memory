'use strict';

const MEMORY_ID_ALIASES = Object.freeze(['memoryId', 'memory_id']);
const RECORD_ID_ALIASES = Object.freeze(['recordId', 'record_id', 'memoryId', 'memory_id', 'id']);
const UPDATED_AT_ALIASES = Object.freeze(['updatedAt', 'updated_at']);
const LIFECYCLE_STATUS_ALIASES = Object.freeze(['status', 'lifecycleStatus', 'lifecycle_status']);
const VISIBILITY_POLICY_ALIASES = Object.freeze(['visibility', 'visibilityPolicy', 'visibility_policy']);
const SCOPE_TUPLE_ALIASES = Object.freeze({
  projectId: Object.freeze(['projectId', 'project_id']),
  workspaceId: Object.freeze(['workspaceId', 'workspace_id']),
  clientId: Object.freeze(['clientId', 'client_id']),
  taskId: Object.freeze(['taskId', 'task_id']),
  conversationId: Object.freeze(['conversationId', 'conversation_id']),
  visibility: VISIBILITY_POLICY_ALIASES,
  retentionPolicy: Object.freeze(['retentionPolicy', 'retention_policy'])
});
const SIDE_EFFECT_COUNTER_ALIASES = Object.freeze({
  providerCalls: Object.freeze(['providerCalls', 'provider_calls']),
  apiCalls: Object.freeze(['apiCalls', 'api_calls']),
  trueRecordMemoryCalls: Object.freeze(['trueRecordMemoryCalls', 'true_record_memory_calls']),
  trueSearchMemoryCalls: Object.freeze(['trueSearchMemoryCalls', 'true_search_memory_calls']),
  recordMemoryCalls: Object.freeze(['recordMemoryCalls', 'record_memory_calls']),
  searchMemoryCalls: Object.freeze(['searchMemoryCalls', 'search_memory_calls']),
  realMemoryReads: Object.freeze(['realMemoryReads', 'real_memory_reads']),
  rawJsonlReads: Object.freeze(['rawJsonlReads', 'raw_jsonl_reads']),
  directJsonlReads: Object.freeze(['directJsonlReads', 'direct_jsonl_reads']),
  rawAuditReads: Object.freeze(['rawAuditReads', 'raw_audit_reads']),
  durableMemoryWrites: Object.freeze(['durableMemoryWrites', 'durable_memory_writes']),
  durableAuditWrites: Object.freeze(['durableAuditWrites', 'durable_audit_writes']),
  governedActionExecutions: Object.freeze(['governedActionExecutions', 'governed_action_executions']),
  cleanupApplyRuns: Object.freeze(['cleanupApplyRuns', 'cleanup_apply_runs']),
  rollbackApplyRuns: Object.freeze(['rollbackApplyRuns', 'rollback_apply_runs']),
  publicMcpExpansions: Object.freeze(['publicMcpExpansions', 'public_mcp_expansions']),
  publicMcpExpansion: Object.freeze(['publicMcpExpansion', 'public_mcp_expansion']),
  configWatchdogStartupChanges: Object.freeze([
    'configWatchdogStartupChanges',
    'config_watchdog_startup_changes'
  ]),
  dependencyActions: Object.freeze(['dependencyActions', 'dependency_actions']),
  syncCalls: Object.freeze(['syncCalls', 'sync_calls']),
  candidateCacheWrites: Object.freeze(['candidateCacheWrites', 'candidate_cache_writes']),
  vectorFlushes: Object.freeze(['vectorFlushes', 'vector_flushes']),
  readinessClaims: Object.freeze(['readinessClaims', 'readiness_claims']),
  reliabilityClaims: Object.freeze(['reliabilityClaims', 'reliability_claims'])
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNonEmptyNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function firstDefinedAliasValue(source = {}, aliases = []) {
  const safeSource = isPlainObject(source) ? source : {};
  for (const alias of aliases) {
    if (!Object.prototype.hasOwnProperty.call(safeSource, alias)) continue;
    const value = safeSource[alias];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function firstNonEmptyAliasString(source = {}, aliases = []) {
  const safeSource = isPlainObject(source) ? source : {};
  return firstNonEmptyNormalizedString(...aliases.map(alias => safeSource[alias]));
}

function firstAliasBoolean(source = {}, aliases = []) {
  const safeSource = isPlainObject(source) ? source : {};
  for (const alias of aliases) {
    if (!Object.prototype.hasOwnProperty.call(safeSource, alias)) continue;
    const value = safeSource[alias];
    if (value === true || value === false) return value;
  }
  return false;
}

function normalizeMemoryId(source = {}) {
  return firstNonEmptyAliasString(source, MEMORY_ID_ALIASES);
}

function normalizeRecordId(source = {}) {
  return firstNonEmptyAliasString(source, RECORD_ID_ALIASES);
}

function normalizeLifecycleStatus(source = {}) {
  const value = isPlainObject(source)
    ? firstNonEmptyAliasString(source, LIFECYCLE_STATUS_ALIASES)
    : normalizeString(source);
  return value.toLowerCase();
}

function normalizeVisibilityPolicy(source = {}) {
  const value = isPlainObject(source)
    ? firstNonEmptyAliasString(source, VISIBILITY_POLICY_ALIASES)
    : normalizeString(source);
  return value.toLowerCase();
}

function normalizeScopeTuple(source = {}) {
  const safeSource = isPlainObject(source) ? source : {};
  return Object.fromEntries(Object.entries(SCOPE_TUPLE_ALIASES).map(([key, aliases]) => {
    return [
      key,
      key === 'visibility'
        ? normalizeVisibilityPolicy(safeSource)
        : firstNonEmptyAliasString(safeSource, aliases)
    ];
  }));
}

function normalizeSideEffectCounters(counters = {}, {
  counterKeys = Object.keys(SIDE_EFFECT_COUNTER_ALIASES),
  aliasesByKey = SIDE_EFFECT_COUNTER_ALIASES
} = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  const normalized = {};
  for (const key of counterKeys) {
    normalized[key] = firstDefinedAliasValue(safeCounters, aliasesByKey[key] || [key]);
  }
  return normalized;
}

function normalizeAuditSnapshotRef(source = {}) {
  const safeSource = isPlainObject(source) ? source : {};
  return {
    memory_id: normalizeMemoryId(safeSource),
    status: normalizeLifecycleStatus(safeSource),
    updated_at: firstNonEmptyAliasString(safeSource, UPDATED_AT_ALIASES) || null
  };
}

module.exports = {
  LIFECYCLE_STATUS_ALIASES,
  MEMORY_ID_ALIASES,
  RECORD_ID_ALIASES,
  SCOPE_TUPLE_ALIASES,
  SIDE_EFFECT_COUNTER_ALIASES,
  UPDATED_AT_ALIASES,
  VISIBILITY_POLICY_ALIASES,
  firstAliasBoolean,
  firstDefinedAliasValue,
  firstNonEmptyAliasString,
  firstNonEmptyNormalizedString,
  isPlainObject,
  normalizeAuditSnapshotRef,
  normalizeLifecycleStatus,
  normalizeMemoryId,
  normalizeRecordId,
  normalizeScopeTuple,
  normalizeSideEffectCounters,
  normalizeString,
  normalizeVisibilityPolicy
};
