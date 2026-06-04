const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-scope-pollution-read-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_BLOCKED_RECORD_STATES = Object.freeze([
  'excluded',
  'forgotten',
  'scope_suppressed',
  'governance_suppressed'
]);

const REQUIRED_BLOCKED_READ_CONTEXTS = Object.freeze([
  'normal_recall',
  'candidate_generation',
  'cache_hit_projection'
]);

const ALLOWED_GOVERNANCE_REVIEW_CONTEXTS = Object.freeze([
  'append_only_audit_review',
  'governance_admin_review'
]);

const REQUIRED_POLICY_FLAGS = Object.freeze([
  'normalRecallBlocksSuppressedRecords',
  'candidateGenerationBlocksSuppressedRecords',
  'cacheHitProjectionBlocksSuppressedRecords',
  'governanceAuditOnlyReviewAllowed',
  'rawContentNotExposedForSuppressedRecords',
  'scopeMismatchFailsClosed',
  'pollutionCountersRequired',
  'candidateCacheInvalidationRequired',
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
    blockedRecordStates: normalizeStringArray(safePolicy.blockedRecordStates),
    blockedReadContexts: normalizeStringArray(safePolicy.blockedReadContexts),
    allowedGovernanceReviewContexts: normalizeStringArray(safePolicy.allowedGovernanceReviewContexts),
    normalRecallBlocked: normalizeBoolean(safePolicy.normalRecallBlocked),
    candidateGenerationBlocked: normalizeBoolean(safePolicy.candidateGenerationBlocked),
    cacheHitProjectionBlocked: normalizeBoolean(safePolicy.cacheHitProjectionBlocked),
    scopeMismatchFailsClosed: normalizeBoolean(safePolicy.scopeMismatchFailsClosed),
    pollutionCountersRequired: normalizeBoolean(safePolicy.pollutionCountersRequired),
    rawContentExposed: normalizeBoolean(safePolicy.rawContentExposed),
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
    hasExactSet(policy.blockedRecordStates, REQUIRED_BLOCKED_RECORD_STATES) &&
    hasExactSet(policy.blockedReadContexts, REQUIRED_BLOCKED_READ_CONTEXTS) &&
    hasExactSet(policy.allowedGovernanceReviewContexts, ALLOWED_GOVERNANCE_REVIEW_CONTEXTS) &&
    policy.normalRecallBlocked === true &&
    policy.candidateGenerationBlocked === true &&
    policy.cacheHitProjectionBlocked === true &&
    policy.scopeMismatchFailsClosed === true &&
    policy.pollutionCountersRequired === true &&
    policy.rawContentExposed === false &&
    policy.publicMcpTool === false &&
    policy.executionApproved === false &&
    policy.runtimeIntegrated === false &&
    policy.mutatesDurableState === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false &&
    hasExactSet(policy.policyFlags, REQUIRED_POLICY_FLAGS);
}

function summarizeDeferredGovernanceScopePollutionReadPolicy(policy = {}) {
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
    missingBlockedRecordStates: REQUIRED_BLOCKED_RECORD_STATES
      .filter(state => !item.blockedRecordStates.includes(state)),
    unexpectedBlockedRecordStates: item.blockedRecordStates
      .filter(state => !REQUIRED_BLOCKED_RECORD_STATES.includes(state)),
    missingBlockedReadContexts: REQUIRED_BLOCKED_READ_CONTEXTS
      .filter(context => !item.blockedReadContexts.includes(context)),
    unexpectedBlockedReadContexts: item.blockedReadContexts
      .filter(context => !REQUIRED_BLOCKED_READ_CONTEXTS.includes(context)),
    missingPolicyFlags: REQUIRED_POLICY_FLAGS.filter(flag => !item.policyFlags.includes(flag)),
    unexpectedPolicyFlags: item.policyFlags.filter(flag => !REQUIRED_POLICY_FLAGS.includes(flag)),
    normalRecallBlocked: item.normalRecallBlocked,
    candidateGenerationBlocked: item.candidateGenerationBlocked,
    cacheHitProjectionBlocked: item.cacheHitProjectionBlocked,
    scopeMismatchFailsClosed: item.scopeMismatchFailsClosed,
    pollutionCountersRequired: item.pollutionCountersRequired,
    rawContentExposed: item.rawContentExposed,
    executionApproved: false,
    publicMcpTool: false,
    runtimeIntegrated: false,
    readinessClaimed: false
  }));
  const scopePollutionReadPolicyAccepted =
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
    scopePollutionReadPolicyAccepted,
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
    requiredBlockedRecordStates: REQUIRED_BLOCKED_RECORD_STATES,
    requiredBlockedReadContexts: REQUIRED_BLOCKED_READ_CONTEXTS,
    allowedGovernanceReviewContexts: ALLOWED_GOVERNANCE_REVIEW_CONTEXTS,
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
  ALLOWED_GOVERNANCE_REVIEW_CONTEXTS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_READ_CONTEXTS,
  REQUIRED_BLOCKED_RECORD_STATES,
  REQUIRED_POLICY_FLAGS,
  normalizePolicy,
  summarizeDeferredGovernanceScopePollutionReadPolicy
};
