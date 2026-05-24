const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-exact-execution-approval-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const REQUIRED_APPROVAL_FIELDS = Object.freeze([
  'approvalId',
  'approvedFamily',
  'approvedAction',
  'approvedTargetMemoryIds',
  'approvedScope',
  'approvedActor',
  'approvedReason',
  'approvalTimestamp',
  'expiresAt',
  'auditCorrelationId',
  'rollbackOrCleanupPlan'
]);

const DENIED_APPROVAL_SHORTCUTS = Object.freeze([
  'standing_authorization_only',
  'blanket_go_ahead',
  'dirty_worktree_inference',
  'public_mcp_call',
  'runtime_default',
  'stale_packet_reuse'
]);

const REQUIRED_FAMILY_APPROVAL_ACTIONS = Object.freeze({
  memory_exclude: Object.freeze(['exclude_scope_suppression']),
  memory_forget: Object.freeze(['forget_governed_suppression'])
});

const REQUIRED_POLICY_FLAGS = Object.freeze([
  'exactExecutionApprovalRequired',
  'familySpecificApprovalRequired',
  'targetMemoryIdsRequired',
  'scopeBindingRequired',
  'actorAndReasonRequired',
  'expiryRequired',
  'auditCorrelationRequired',
  'rollbackOrCleanupPlanRequired',
  'noBundledApproval',
  'noImplicitExecution',
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

function requiredActionsForFamily(family) {
  return REQUIRED_FAMILY_APPROVAL_ACTIONS[family] || [];
}

function normalizeFamilyPolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    family: normalizeString(safePolicy.family),
    approvalActions: normalizeStringArray(safePolicy.approvalActions),
    requiredApprovalFields: normalizeStringArray(safePolicy.requiredApprovalFields),
    deniedApprovalShortcuts: normalizeStringArray(safePolicy.deniedApprovalShortcuts),
    exactExecutionApprovalRequired: normalizeBoolean(safePolicy.exactExecutionApprovalRequired),
    familySpecificApprovalRequired: normalizeBoolean(safePolicy.familySpecificApprovalRequired),
    targetMemoryIdsRequired: normalizeBoolean(safePolicy.targetMemoryIdsRequired),
    scopeBindingRequired: normalizeBoolean(safePolicy.scopeBindingRequired),
    approvalExpiryRequired: normalizeBoolean(safePolicy.approvalExpiryRequired),
    auditCorrelationRequired: normalizeBoolean(safePolicy.auditCorrelationRequired),
    rollbackOrCleanupPlanRequired: normalizeBoolean(safePolicy.rollbackOrCleanupPlanRequired),
    implicitApprovalAllowed: normalizeBoolean(safePolicy.implicitApprovalAllowed),
    bundledApprovalAllowed: normalizeBoolean(safePolicy.bundledApprovalAllowed),
    wildcardTargetAllowed: normalizeBoolean(safePolicy.wildcardTargetAllowed),
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
    hasExactSet(policy.approvalActions, requiredActionsForFamily(policy.family)) &&
    hasExactSet(policy.requiredApprovalFields, REQUIRED_APPROVAL_FIELDS) &&
    hasExactSet(policy.deniedApprovalShortcuts, DENIED_APPROVAL_SHORTCUTS) &&
    policy.exactExecutionApprovalRequired === true &&
    policy.familySpecificApprovalRequired === true &&
    policy.targetMemoryIdsRequired === true &&
    policy.scopeBindingRequired === true &&
    policy.approvalExpiryRequired === true &&
    policy.auditCorrelationRequired === true &&
    policy.rollbackOrCleanupPlanRequired === true &&
    policy.implicitApprovalAllowed === false &&
    policy.bundledApprovalAllowed === false &&
    policy.wildcardTargetAllowed === false &&
    policy.publicMcpTool === false &&
    policy.executionApproved === false &&
    policy.runtimeIntegrated === false &&
    policy.mutatesDurableState === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false &&
    hasExactSet(policy.policyFlags, REQUIRED_POLICY_FLAGS);
}

function summarizeDeferredGovernanceExactExecutionApprovalPolicy(policy = {}) {
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
    requiredApprovalActions: requiredActionsForFamily(item.family),
    missingApprovalActions: requiredActionsForFamily(item.family)
      .filter(action => !item.approvalActions.includes(action)),
    unexpectedApprovalActions: item.approvalActions
      .filter(action => !requiredActionsForFamily(item.family).includes(action)),
    missingApprovalFields: REQUIRED_APPROVAL_FIELDS
      .filter(field => !item.requiredApprovalFields.includes(field)),
    unexpectedApprovalFields: item.requiredApprovalFields
      .filter(field => !REQUIRED_APPROVAL_FIELDS.includes(field)),
    missingDeniedApprovalShortcuts: DENIED_APPROVAL_SHORTCUTS
      .filter(shortcut => !item.deniedApprovalShortcuts.includes(shortcut)),
    unexpectedDeniedApprovalShortcuts: item.deniedApprovalShortcuts
      .filter(shortcut => !DENIED_APPROVAL_SHORTCUTS.includes(shortcut)),
    missingPolicyFlags: REQUIRED_POLICY_FLAGS.filter(flag => !item.policyFlags.includes(flag)),
    unexpectedPolicyFlags: item.policyFlags.filter(flag => !REQUIRED_POLICY_FLAGS.includes(flag)),
    exactExecutionApprovalRequired: item.exactExecutionApprovalRequired,
    implicitApprovalAllowed: item.implicitApprovalAllowed,
    bundledApprovalAllowed: item.bundledApprovalAllowed,
    wildcardTargetAllowed: item.wildcardTargetAllowed,
    executionApproved: false,
    publicMcpTool: false,
    runtimeIntegrated: false,
    readinessClaimed: false
  }));
  const exactExecutionApprovalPolicyAccepted =
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
    exactExecutionApprovalPolicyAccepted,
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
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    deniedApprovalShortcuts: DENIED_APPROVAL_SHORTCUTS,
    requiredFamilyApprovalActions: REQUIRED_FAMILY_APPROVAL_ACTIONS,
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
  DENIED_APPROVAL_SHORTCUTS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_FIELDS,
  REQUIRED_FAMILY_APPROVAL_ACTIONS,
  REQUIRED_POLICY_FLAGS,
  normalizePolicy,
  summarizeDeferredGovernanceExactExecutionApprovalPolicy
};
