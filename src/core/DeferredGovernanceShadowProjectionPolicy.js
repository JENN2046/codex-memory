const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-shadow-projection-policy-v1';
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

const REQUIRED_PROJECTION_INPUTS = Object.freeze([
  'targetMemoryIds',
  'scopeTuple',
  'currentProjectionRecords',
  'plannedAt',
  'actorClientId',
  'requestSource',
  'contextFlag',
  'reason',
  'auditCorrelationId'
]);

const REQUIRED_PROJECTION_OUTPUTS = Object.freeze([
  'suppressionProjectionPreview',
  'affectedRecords',
  'beforeSqliteColumns',
  'afterSqliteColumns',
  'fieldChangesSqliteColumns',
  'projectedChangedMemoryIds',
  'projectedGovernanceRevision',
  'projectedRevisionToken',
  'scopeVerification',
  'blockingFindings',
  'rollbackOrCleanupPlan'
]);

const REQUIRED_SQLITE_PROJECTION_COLUMNS = Object.freeze([
  'status',
  'status_reason',
  'lifecycle_updated_at',
  'lifecycle_actor_client_id',
  'governance_revision',
  'suppression_reason',
  'suppression_scope_hash',
  'suppression_audit_correlation_id',
  'read_suppression_state',
  'candidate_cache_revision'
]);

const REQUIRED_PROJECTION_FLAGS = Object.freeze([
  'shadowProjectionPreviewRequired',
  'durableProjectionApplyBlocked',
  'sqliteColumnMappingRequired',
  'beforeAfterPreviewRequired',
  'scopeVerificationRequired',
  'projectedChangedMemoryIdsRequired',
  'governanceRevisionRequired',
  'candidateCacheRevisionRequired',
  'readSuppressionStateRequired',
  'rollbackOrCleanupPlanRequired',
  'publicMcpFrozen'
]);

const REQUIRED_FAMILY_PROJECTION_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    action: 'scope_suppression_projection',
    projectionStates: Object.freeze(['excluded', 'scope_suppressed']),
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    action: 'governed_forget_suppression_projection',
    projectionStates: Object.freeze(['forgotten', 'governance_suppressed']),
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noDurableProjectionApply',
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

function requiredSurfaceForFamily(family) {
  return REQUIRED_FAMILY_PROJECTION_SURFACES[family] || {
    action: '',
    projectionStates: [],
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilyPlan(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};

  return {
    family: normalizeString(safePlan.family),
    action: normalizeString(safePlan.action),
    projectionStates: normalizeStringArray(safePlan.projectionStates),
    requestSource: normalizeString(safePlan.requestSource),
    contextFlag: normalizeString(safePlan.contextFlag),
    requiredProjectionInputs: normalizeStringArray(safePlan.requiredProjectionInputs),
    requiredProjectionOutputs: normalizeStringArray(safePlan.requiredProjectionOutputs),
    sqliteProjectionColumns: normalizeStringArray(safePlan.sqliteProjectionColumns),
    projectionFlags: normalizeStringArray(safePlan.projectionFlags),
    shadowProjectionPreviewRequired: normalizeBoolean(safePlan.shadowProjectionPreviewRequired),
    durableProjectionApplyBlocked: normalizeBoolean(safePlan.durableProjectionApplyBlocked),
    sqliteColumnMappingRequired: normalizeBoolean(safePlan.sqliteColumnMappingRequired),
    beforeAfterPreviewRequired: normalizeBoolean(safePlan.beforeAfterPreviewRequired),
    scopeVerificationRequired: normalizeBoolean(safePlan.scopeVerificationRequired),
    projectedChangedMemoryIdsRequired: normalizeBoolean(safePlan.projectedChangedMemoryIdsRequired),
    governanceRevisionRequired: normalizeBoolean(safePlan.governanceRevisionRequired),
    candidateCacheRevisionRequired: normalizeBoolean(safePlan.candidateCacheRevisionRequired),
    readSuppressionStateRequired: normalizeBoolean(safePlan.readSuppressionStateRequired),
    rollbackOrCleanupPlanRequired: normalizeBoolean(safePlan.rollbackOrCleanupPlanRequired),
    publicMcpTool: normalizeBoolean(safePlan.publicMcpTool),
    executionApproved: normalizeBoolean(safePlan.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePlan.runtimeIntegrated),
    projectionImplemented: normalizeBoolean(safePlan.projectionImplemented),
    durableProjectionApplied: normalizeBoolean(safePlan.durableProjectionApplied),
    mutatesDurableState: normalizeBoolean(safePlan.mutatesDurableState),
    providerCalls: normalizeInteger(safePlan.providerCalls),
    readinessClaimed: normalizeBoolean(safePlan.readinessClaimed)
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
    familyPlans: Array.isArray(safePolicy.familyPlans)
      ? safePolicy.familyPlans.map(normalizeFamilyPlan)
      : [],
    safety: normalizeSafety(safePolicy.safety)
  };
}

function familyPlanAccepted(plan) {
  const requiredSurface = requiredSurfaceForFamily(plan.family);

  return GOVERNANCE_FAMILIES.includes(plan.family) &&
    plan.action === requiredSurface.action &&
    hasExactSet(plan.projectionStates, requiredSurface.projectionStates) &&
    plan.requestSource === requiredSurface.requestSource &&
    plan.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(plan.requiredProjectionInputs, REQUIRED_PROJECTION_INPUTS) &&
    hasExactSet(plan.requiredProjectionOutputs, REQUIRED_PROJECTION_OUTPUTS) &&
    hasExactSet(plan.sqliteProjectionColumns, REQUIRED_SQLITE_PROJECTION_COLUMNS) &&
    hasExactSet(plan.projectionFlags, REQUIRED_PROJECTION_FLAGS) &&
    plan.shadowProjectionPreviewRequired === true &&
    plan.durableProjectionApplyBlocked === true &&
    plan.sqliteColumnMappingRequired === true &&
    plan.beforeAfterPreviewRequired === true &&
    plan.scopeVerificationRequired === true &&
    plan.projectedChangedMemoryIdsRequired === true &&
    plan.governanceRevisionRequired === true &&
    plan.candidateCacheRevisionRequired === true &&
    plan.readSuppressionStateRequired === true &&
    plan.rollbackOrCleanupPlanRequired === true &&
    plan.publicMcpTool === false &&
    plan.executionApproved === false &&
    plan.runtimeIntegrated === false &&
    plan.projectionImplemented === false &&
    plan.durableProjectionApplied === false &&
    plan.mutatesDurableState === false &&
    plan.providerCalls === 0 &&
    plan.readinessClaimed === false;
}

function summarizeDeferredGovernanceShadowProjectionPolicy(policy = {}) {
  const normalized = normalizePolicy(policy);
  const familyIds = normalized.familyPlans.map(item => item.family).filter(Boolean);
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
  const familyReports = normalized.familyPlans.map(item => {
    const requiredSurface = requiredSurfaceForFamily(item.family);
    return {
      family: item.family,
      accepted: familyPlanAccepted(item),
      requiredAction: requiredSurface.action,
      action: item.action,
      requiredProjectionStates: requiredSurface.projectionStates,
      projectionStates: item.projectionStates,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingProjectionInputs: REQUIRED_PROJECTION_INPUTS
        .filter(input => !item.requiredProjectionInputs.includes(input)),
      unexpectedProjectionInputs: item.requiredProjectionInputs
        .filter(input => !REQUIRED_PROJECTION_INPUTS.includes(input)),
      missingProjectionOutputs: REQUIRED_PROJECTION_OUTPUTS
        .filter(output => !item.requiredProjectionOutputs.includes(output)),
      unexpectedProjectionOutputs: item.requiredProjectionOutputs
        .filter(output => !REQUIRED_PROJECTION_OUTPUTS.includes(output)),
      missingSqliteProjectionColumns: REQUIRED_SQLITE_PROJECTION_COLUMNS
        .filter(column => !item.sqliteProjectionColumns.includes(column)),
      unexpectedSqliteProjectionColumns: item.sqliteProjectionColumns
        .filter(column => !REQUIRED_SQLITE_PROJECTION_COLUMNS.includes(column)),
      missingProjectionFlags: REQUIRED_PROJECTION_FLAGS.filter(flag => !item.projectionFlags.includes(flag)),
      unexpectedProjectionFlags: item.projectionFlags.filter(flag => !REQUIRED_PROJECTION_FLAGS.includes(flag)),
      shadowProjectionPreviewRequired: item.shadowProjectionPreviewRequired,
      durableProjectionApplyBlocked: item.durableProjectionApplyBlocked,
      projectedChangedMemoryIdsRequired: item.projectedChangedMemoryIdsRequired,
      governanceRevisionRequired: item.governanceRevisionRequired,
      projectionImplemented: false,
      durableProjectionApplied: false,
      runtimeIntegrated: false,
      readinessClaimed: false
    };
  });
  const shadowProjectionPolicyAccepted =
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
    shadowProjectionPolicyAccepted,
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
    requiredProjectionInputs: REQUIRED_PROJECTION_INPUTS,
    requiredProjectionOutputs: REQUIRED_PROJECTION_OUTPUTS,
    requiredSqliteProjectionColumns: REQUIRED_SQLITE_PROJECTION_COLUMNS,
    requiredProjectionFlags: REQUIRED_PROJECTION_FLAGS,
    requiredFamilyProjectionSurfaces: REQUIRED_FAMILY_PROJECTION_SURFACES,
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
  REQUIRED_FAMILY_PROJECTION_SURFACES,
  REQUIRED_PROJECTION_FLAGS,
  REQUIRED_PROJECTION_INPUTS,
  REQUIRED_PROJECTION_OUTPUTS,
  REQUIRED_SQLITE_PROJECTION_COLUMNS,
  normalizePolicy,
  summarizeDeferredGovernanceShadowProjectionPolicy
};
