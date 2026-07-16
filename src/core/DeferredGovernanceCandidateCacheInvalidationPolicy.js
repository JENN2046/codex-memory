const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-candidate-cache-invalidation-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_INVALIDATION_TRIGGERS = Object.freeze([
  'governance_revision_changed',
  'changed_memory_ids_emitted',
  'suppression_state_changed',
  'scope_boundary_changed'
]);

const REQUIRED_INVALIDATION_SCOPES = Object.freeze([
  'current_embedding_fingerprint',
  'dependent_candidate_entries',
  'target_family_fallback',
  'cache_hit_projection_recheck'
]);

const REQUIRED_TARGET_FAMILIES = Object.freeze([
  'process',
  'knowledge',
  'both'
]);

const REQUIRED_POLICY_FLAGS = Object.freeze([
  'changedMemoryIdsRequired',
  'governanceRevisionRequired',
  'dependentCandidateEntriesCleared',
  'targetFamilyFallbackRequired',
  'cacheHitProjectionRechecked',
  'staleSuppressedCacheReuseBlocked',
  'scopeBoundaryInvalidatesCache',
  'publicMcpFrozen'
]);

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noDurableAuditWrite',
  'noDurableMemoryWrite',
  'noPublicMcpExpansion',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noPackageChange',
  'noRemoteWrite',
  'noReadinessClaim'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value) {
  return Number.isInteger(value) ? value : 0;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    hasEveryValue(values, requiredValues);
}

function normalizeFamilyPolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    family: normalizeString(safePolicy.family),
    invalidationTriggers: normalizeStringArray(safePolicy.invalidationTriggers),
    invalidationScopes: normalizeStringArray(safePolicy.invalidationScopes),
    targetFamilies: normalizeStringArray(safePolicy.targetFamilies),
    changedMemoryIdsRequired: normalizeBoolean(safePolicy.changedMemoryIdsRequired),
    governanceRevisionRequired: normalizeBoolean(safePolicy.governanceRevisionRequired),
    dependentCandidateEntriesCleared: normalizeBoolean(safePolicy.dependentCandidateEntriesCleared),
    targetFamilyFallbackRequired: normalizeBoolean(safePolicy.targetFamilyFallbackRequired),
    cacheHitProjectionRechecked: normalizeBoolean(safePolicy.cacheHitProjectionRechecked),
    staleSuppressedCacheReuseBlocked: normalizeBoolean(safePolicy.staleSuppressedCacheReuseBlocked),
    scopeBoundaryInvalidatesCache: normalizeBoolean(safePolicy.scopeBoundaryInvalidatesCache),
    publicMcpTool: normalizeBoolean(safePolicy.publicMcpTool),
    executionApproved: normalizeBoolean(safePolicy.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePolicy.runtimeIntegrated),
    mutatesDurableState: normalizeBoolean(safePolicy.mutatesDurableState),
    providerCalls: normalizeInteger(safePolicy.providerCalls),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed),
    policyFlags: normalizeStringArray(safePolicy.policyFlags)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};

  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawWorkspaceIdExposed = normalizeBoolean(safeSafety.rawWorkspaceIdExposed);
  normalized.rawPrivateMemoryExposed = normalizeBoolean(safeSafety.rawPrivateMemoryExposed);

  return normalized;
}

function normalizePolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    schemaVersion: normalizeString(safePolicy.schemaVersion),
    version: normalizeString(safePolicy.version),
    sourceMode: normalizeString(safePolicy.sourceMode),
    reviewOnly: normalizeBoolean(safePolicy.reviewOnly),
    internalOnly: normalizeBoolean(safePolicy.internalOnly),
    publicMcpExpanded: normalizeBoolean(safePolicy.publicMcpExpanded),
    executionApproved: normalizeBoolean(safePolicy.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePolicy.runtimeIntegrated),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed),
    publicToolsFrozen: normalizeBoolean(safePolicy.publicToolsFrozen),
    publicTools: normalizeStringArray(safePolicy.publicTools),
    familyPolicies: Array.isArray(safePolicy.familyPolicies)
      ? safePolicy.familyPolicies.map(normalizeFamilyPolicy)
      : [],
    safety: normalizeSafety(safePolicy.safety)
  };
}

function familyPolicyAccepted(policy) {
  return GOVERNANCE_FAMILIES.includes(policy.family) &&
    hasExactSet(policy.invalidationTriggers, REQUIRED_INVALIDATION_TRIGGERS) &&
    hasExactSet(policy.invalidationScopes, REQUIRED_INVALIDATION_SCOPES) &&
    hasExactSet(policy.targetFamilies, REQUIRED_TARGET_FAMILIES) &&
    policy.changedMemoryIdsRequired === true &&
    policy.governanceRevisionRequired === true &&
    policy.dependentCandidateEntriesCleared === true &&
    policy.targetFamilyFallbackRequired === true &&
    policy.cacheHitProjectionRechecked === true &&
    policy.staleSuppressedCacheReuseBlocked === true &&
    policy.scopeBoundaryInvalidatesCache === true &&
    policy.publicMcpTool === false &&
    policy.executionApproved === false &&
    policy.runtimeIntegrated === false &&
    policy.mutatesDurableState === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false &&
    hasExactSet(policy.policyFlags, REQUIRED_POLICY_FLAGS);
}

function summarizeDeferredGovernanceCandidateCacheInvalidationPolicy(policy = {}) {
  const normalized = normalizePolicy(policy);
  const familyIds = normalized.familyPolicies.map(item => item.family).filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const familySetExact = hasExactSet(familyIds, GOVERNANCE_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const noGlobalExecution =
    normalized.reviewOnly === true &&
    normalized.internalOnly === true &&
    normalized.publicMcpExpanded === false &&
    normalized.executionApproved === false &&
    normalized.runtimeIntegrated === false &&
    normalized.readinessClaimed === false;
  const safetyClear =
    NO_SIDE_EFFECT_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.rawPrivateMemoryExposed === false;
  const familyReports = normalized.familyPolicies.map(item => ({
    family: item.family,
    accepted: familyPolicyAccepted(item),
    missingInvalidationTriggers: REQUIRED_INVALIDATION_TRIGGERS
      .filter(trigger => !item.invalidationTriggers.includes(trigger)),
    unexpectedInvalidationTriggers: item.invalidationTriggers
      .filter(trigger => !REQUIRED_INVALIDATION_TRIGGERS.includes(trigger)),
    missingInvalidationScopes: REQUIRED_INVALIDATION_SCOPES
      .filter(scope => !item.invalidationScopes.includes(scope)),
    unexpectedInvalidationScopes: item.invalidationScopes
      .filter(scope => !REQUIRED_INVALIDATION_SCOPES.includes(scope)),
    missingTargetFamilies: REQUIRED_TARGET_FAMILIES
      .filter(target => !item.targetFamilies.includes(target)),
    unexpectedTargetFamilies: item.targetFamilies
      .filter(target => !REQUIRED_TARGET_FAMILIES.includes(target)),
    missingPolicyFlags: REQUIRED_POLICY_FLAGS.filter(flag => !item.policyFlags.includes(flag)),
    unexpectedPolicyFlags: item.policyFlags.filter(flag => !REQUIRED_POLICY_FLAGS.includes(flag)),
    changedMemoryIdsRequired: item.changedMemoryIdsRequired,
    governanceRevisionRequired: item.governanceRevisionRequired,
    dependentCandidateEntriesCleared: item.dependentCandidateEntriesCleared,
    targetFamilyFallbackRequired: item.targetFamilyFallbackRequired,
    cacheHitProjectionRechecked: item.cacheHitProjectionRechecked,
    staleSuppressedCacheReuseBlocked: item.staleSuppressedCacheReuseBlocked,
    scopeBoundaryInvalidatesCache: item.scopeBoundaryInvalidatesCache,
    executionApproved: false,
    publicMcpTool: false,
    runtimeIntegrated: false,
    readinessClaimed: false
  }));
  const candidateCacheInvalidationPolicyAccepted =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    familySetExact &&
    publicMcpFrozen &&
    noGlobalExecution &&
    safetyClear &&
    familyReports.every(report => report.accepted);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    candidateCacheInvalidationPolicyAccepted,
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    governedFamilies: {
      exact: familySetExact,
      required: GOVERNANCE_FAMILIES,
      present: familyIds,
      missing: GOVERNANCE_FAMILIES.filter(family => !familyIds.includes(family)),
      unexpected: familyIds.filter(family => !GOVERNANCE_FAMILIES.includes(family))
    },
    requiredInvalidationTriggers: REQUIRED_INVALIDATION_TRIGGERS,
    requiredInvalidationScopes: REQUIRED_INVALIDATION_SCOPES,
    requiredTargetFamilies: REQUIRED_TARGET_FAMILIES,
    requiredPolicyFlags: REQUIRED_POLICY_FLAGS,
    familyReports,
    safety: {
      noSideEffects: safetyClear,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed,
      rawPrivateMemoryExposed: normalized.safety.rawPrivateMemoryExposed
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_INVALIDATION_SCOPES,
  REQUIRED_INVALIDATION_TRIGGERS,
  REQUIRED_POLICY_FLAGS,
  REQUIRED_TARGET_FAMILIES,
  normalizePolicy,
  summarizeDeferredGovernanceCandidateCacheInvalidationPolicy
};
