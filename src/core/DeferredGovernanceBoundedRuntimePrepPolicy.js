const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-bounded-runtime-prep-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_RUNTIME_PREP_FIELDS = Object.freeze([
  'targetMemoryIds',
  'scopeTuple',
  'actorClientId',
  'approvalId',
  'requestSource',
  'contextFlag',
  'reason',
  'auditCorrelationId',
  'plannedAt'
]);

const REQUIRED_RUNTIME_PREP_OUTPUTS = Object.freeze([
  'suppressionProjectionPreview',
  'appendOnlyAuditPreview',
  'changedMemoryIds',
  'governanceRevision',
  'candidateCacheInvalidation',
  'readPolicySuppression',
  'rollbackOrCleanupPlan'
]);

const REQUIRED_FAMILY_RUNTIME_PREP_ACTIONS = Object.freeze({
  memory_exclude: Object.freeze(['scope_suppression_projection']),
  memory_forget: Object.freeze(['governed_forget_suppression_projection'])
});

const REQUIRED_FAMILY_PROJECTION_STATES = Object.freeze({
  memory_exclude: Object.freeze(['excluded', 'scope_suppressed']),
  memory_forget: Object.freeze(['forgotten', 'governance_suppressed'])
});

const REQUIRED_FAMILY_CONTEXTS = Object.freeze({
  memory_exclude: Object.freeze({
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const REQUIRED_POLICY_FLAGS = Object.freeze([
  'dryRunOnly',
  'runtimeApplyBlocked',
  'approvedContextGateRequired',
  'exactExecutionApprovalRequired',
  'appendOnlyAuditPreviewRequired',
  'shadowProjectionPreviewRequired',
  'changedMemoryIdsRequired',
  'governanceRevisionRequired',
  'candidateCacheInvalidationRequired',
  'readPolicySuppressionRequired',
  'rollbackOrCleanupPlanRequired',
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
  return REQUIRED_FAMILY_RUNTIME_PREP_ACTIONS[family] || [];
}

function requiredProjectionStatesForFamily(family) {
  return REQUIRED_FAMILY_PROJECTION_STATES[family] || [];
}

function requiredContextForFamily(family) {
  return REQUIRED_FAMILY_CONTEXTS[family] || { requestSource: '', contextFlag: '' };
}

function normalizeFamilyPolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    family: normalizeString(safePolicy.family),
    runtimePrepActions: normalizeStringArray(safePolicy.runtimePrepActions),
    projectionStates: normalizeStringArray(safePolicy.projectionStates),
    requestSource: normalizeString(safePolicy.requestSource),
    contextFlag: normalizeString(safePolicy.contextFlag),
    requiredRuntimePrepFields: normalizeStringArray(safePolicy.requiredRuntimePrepFields),
    requiredRuntimePrepOutputs: normalizeStringArray(safePolicy.requiredRuntimePrepOutputs),
    dryRunOnly: normalizeBoolean(safePolicy.dryRunOnly),
    runtimeApplyBlocked: normalizeBoolean(safePolicy.runtimeApplyBlocked),
    approvedContextGateRequired: normalizeBoolean(safePolicy.approvedContextGateRequired),
    exactExecutionApprovalRequired: normalizeBoolean(safePolicy.exactExecutionApprovalRequired),
    appendOnlyAuditPreviewRequired: normalizeBoolean(safePolicy.appendOnlyAuditPreviewRequired),
    shadowProjectionPreviewRequired: normalizeBoolean(safePolicy.shadowProjectionPreviewRequired),
    changedMemoryIdsRequired: normalizeBoolean(safePolicy.changedMemoryIdsRequired),
    governanceRevisionRequired: normalizeBoolean(safePolicy.governanceRevisionRequired),
    candidateCacheInvalidationRequired: normalizeBoolean(safePolicy.candidateCacheInvalidationRequired),
    readPolicySuppressionRequired: normalizeBoolean(safePolicy.readPolicySuppressionRequired),
    rollbackOrCleanupPlanRequired: normalizeBoolean(safePolicy.rollbackOrCleanupPlanRequired),
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
  const requiredContext = requiredContextForFamily(policy.family);

  return GOVERNANCE_FAMILIES.includes(policy.family) &&
    hasExactSet(policy.runtimePrepActions, requiredActionsForFamily(policy.family)) &&
    hasExactSet(policy.projectionStates, requiredProjectionStatesForFamily(policy.family)) &&
    policy.requestSource === requiredContext.requestSource &&
    policy.contextFlag === requiredContext.contextFlag &&
    hasExactSet(policy.requiredRuntimePrepFields, REQUIRED_RUNTIME_PREP_FIELDS) &&
    hasExactSet(policy.requiredRuntimePrepOutputs, REQUIRED_RUNTIME_PREP_OUTPUTS) &&
    policy.dryRunOnly === true &&
    policy.runtimeApplyBlocked === true &&
    policy.approvedContextGateRequired === true &&
    policy.exactExecutionApprovalRequired === true &&
    policy.appendOnlyAuditPreviewRequired === true &&
    policy.shadowProjectionPreviewRequired === true &&
    policy.changedMemoryIdsRequired === true &&
    policy.governanceRevisionRequired === true &&
    policy.candidateCacheInvalidationRequired === true &&
    policy.readPolicySuppressionRequired === true &&
    policy.rollbackOrCleanupPlanRequired === true &&
    policy.publicMcpTool === false &&
    policy.executionApproved === false &&
    policy.runtimeIntegrated === false &&
    policy.mutatesDurableState === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false &&
    hasExactSet(policy.policyFlags, REQUIRED_POLICY_FLAGS);
}

function summarizeDeferredGovernanceBoundedRuntimePrepPolicy(policy = {}) {
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
  const familyReports = normalized.familyPolicies.map(item => {
    const requiredContext = requiredContextForFamily(item.family);
    return {
      family: item.family,
      accepted: familyPolicyAccepted(item),
      requiredRuntimePrepActions: requiredActionsForFamily(item.family),
      missingRuntimePrepActions: requiredActionsForFamily(item.family)
        .filter(action => !item.runtimePrepActions.includes(action)),
      unexpectedRuntimePrepActions: item.runtimePrepActions
        .filter(action => !requiredActionsForFamily(item.family).includes(action)),
      requiredProjectionStates: requiredProjectionStatesForFamily(item.family),
      missingProjectionStates: requiredProjectionStatesForFamily(item.family)
        .filter(state => !item.projectionStates.includes(state)),
      unexpectedProjectionStates: item.projectionStates
        .filter(state => !requiredProjectionStatesForFamily(item.family).includes(state)),
      requiredRequestSource: requiredContext.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredContext.contextFlag,
      contextFlag: item.contextFlag,
      missingRuntimePrepFields: REQUIRED_RUNTIME_PREP_FIELDS
        .filter(field => !item.requiredRuntimePrepFields.includes(field)),
      unexpectedRuntimePrepFields: item.requiredRuntimePrepFields
        .filter(field => !REQUIRED_RUNTIME_PREP_FIELDS.includes(field)),
      missingRuntimePrepOutputs: REQUIRED_RUNTIME_PREP_OUTPUTS
        .filter(output => !item.requiredRuntimePrepOutputs.includes(output)),
      unexpectedRuntimePrepOutputs: item.requiredRuntimePrepOutputs
        .filter(output => !REQUIRED_RUNTIME_PREP_OUTPUTS.includes(output)),
      missingPolicyFlags: REQUIRED_POLICY_FLAGS.filter(flag => !item.policyFlags.includes(flag)),
      unexpectedPolicyFlags: item.policyFlags.filter(flag => !REQUIRED_POLICY_FLAGS.includes(flag)),
      dryRunOnly: item.dryRunOnly,
      runtimeApplyBlocked: item.runtimeApplyBlocked,
      executionApproved: false,
      publicMcpTool: false,
      runtimeIntegrated: false,
      readinessClaimed: false
    };
  });
  const boundedRuntimePrepPolicyAccepted =
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
    boundedRuntimePrepPolicyAccepted,
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
    requiredRuntimePrepFields: REQUIRED_RUNTIME_PREP_FIELDS,
    requiredRuntimePrepOutputs: REQUIRED_RUNTIME_PREP_OUTPUTS,
    requiredFamilyRuntimePrepActions: REQUIRED_FAMILY_RUNTIME_PREP_ACTIONS,
    requiredFamilyProjectionStates: REQUIRED_FAMILY_PROJECTION_STATES,
    requiredFamilyContexts: REQUIRED_FAMILY_CONTEXTS,
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
  REQUIRED_FAMILY_CONTEXTS,
  REQUIRED_FAMILY_PROJECTION_STATES,
  REQUIRED_FAMILY_RUNTIME_PREP_ACTIONS,
  REQUIRED_POLICY_FLAGS,
  REQUIRED_RUNTIME_PREP_FIELDS,
  REQUIRED_RUNTIME_PREP_OUTPUTS,
  normalizePolicy,
  summarizeDeferredGovernanceBoundedRuntimePrepPolicy
};
