const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-append-only-audit-plan-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_AUDIT_PHASES = Object.freeze([
  'pending',
  'committed',
  'cancelled'
]);

const REQUIRED_AUDIT_EVENT_FIELDS = Object.freeze([
  'event_id',
  'correlation_id',
  'event_type',
  'audit_phase',
  'tool_name',
  'memory_ids',
  'actor_client_id',
  'request_source',
  'reason',
  'scope_tuple_ref',
  'mutation_applied',
  'redaction_applied',
  'rollback_ref'
]);

const REQUIRED_AUDIT_PLAN_OUTPUTS = Object.freeze([
  'appendOnlyAuditPreview',
  'pendingEventPreview',
  'committedEventPreview',
  'cancelledEventPreview',
  'auditCorrelationId',
  'previousSnapshotRefs',
  'rollbackOrCleanupPlan'
]);

const REQUIRED_AUDIT_PLAN_FLAGS = Object.freeze([
  'appendOnlyRequired',
  'pendingBeforeMutationRequired',
  'committedAfterMutationRequired',
  'cancelledOnFailureRequired',
  'sharedCorrelationRequired',
  'redactionRequired',
  'previousSnapshotRefsRequired',
  'rollbackOrCleanupPlanRequired',
  'noOverwriteOrDelete',
  'noRawPayload',
  'publicMcpFrozen'
]);

const REQUIRED_FAMILY_AUDIT_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    eventType: 'memory_exclude',
    toolName: 'internal_memory_exclude',
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    eventType: 'memory_forget',
    toolName: 'internal_memory_forget',
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

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

function requiredSurfaceForFamily(family) {
  return REQUIRED_FAMILY_AUDIT_SURFACES[family] || {
    eventType: '',
    toolName: '',
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilyPlan(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};

  return {
    family: normalizeString(safePlan.family),
    eventType: normalizeString(safePlan.eventType),
    toolName: normalizeString(safePlan.toolName),
    requestSource: normalizeString(safePlan.requestSource),
    contextFlag: normalizeString(safePlan.contextFlag),
    auditPhases: normalizeStringArray(safePlan.auditPhases),
    requiredAuditEventFields: normalizeStringArray(safePlan.requiredAuditEventFields),
    requiredAuditPlanOutputs: normalizeStringArray(safePlan.requiredAuditPlanOutputs),
    auditPlanFlags: normalizeStringArray(safePlan.auditPlanFlags),
    appendOnlyRequired: normalizeBoolean(safePlan.appendOnlyRequired),
    pendingBeforeMutationRequired: normalizeBoolean(safePlan.pendingBeforeMutationRequired),
    committedAfterMutationRequired: normalizeBoolean(safePlan.committedAfterMutationRequired),
    cancelledOnFailureRequired: normalizeBoolean(safePlan.cancelledOnFailureRequired),
    sharedCorrelationRequired: normalizeBoolean(safePlan.sharedCorrelationRequired),
    redactionRequired: normalizeBoolean(safePlan.redactionRequired),
    noOverwriteOrDelete: normalizeBoolean(safePlan.noOverwriteOrDelete),
    noRawPayload: normalizeBoolean(safePlan.noRawPayload),
    publicMcpTool: normalizeBoolean(safePlan.publicMcpTool),
    executionApproved: normalizeBoolean(safePlan.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePlan.runtimeIntegrated),
    auditWriterImplemented: normalizeBoolean(safePlan.auditWriterImplemented),
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
    plan.eventType === requiredSurface.eventType &&
    plan.toolName === requiredSurface.toolName &&
    plan.requestSource === requiredSurface.requestSource &&
    plan.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(plan.auditPhases, REQUIRED_AUDIT_PHASES) &&
    hasExactSet(plan.requiredAuditEventFields, REQUIRED_AUDIT_EVENT_FIELDS) &&
    hasExactSet(plan.requiredAuditPlanOutputs, REQUIRED_AUDIT_PLAN_OUTPUTS) &&
    hasExactSet(plan.auditPlanFlags, REQUIRED_AUDIT_PLAN_FLAGS) &&
    plan.appendOnlyRequired === true &&
    plan.pendingBeforeMutationRequired === true &&
    plan.committedAfterMutationRequired === true &&
    plan.cancelledOnFailureRequired === true &&
    plan.sharedCorrelationRequired === true &&
    plan.redactionRequired === true &&
    plan.noOverwriteOrDelete === true &&
    plan.noRawPayload === true &&
    plan.publicMcpTool === false &&
    plan.executionApproved === false &&
    plan.runtimeIntegrated === false &&
    plan.auditWriterImplemented === false &&
    plan.mutatesDurableState === false &&
    plan.providerCalls === 0 &&
    plan.readinessClaimed === false;
}

function summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy(policy = {}) {
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
      requiredEventType: requiredSurface.eventType,
      eventType: item.eventType,
      requiredToolName: requiredSurface.toolName,
      toolName: item.toolName,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingAuditPhases: REQUIRED_AUDIT_PHASES.filter(phase => !item.auditPhases.includes(phase)),
      unexpectedAuditPhases: item.auditPhases.filter(phase => !REQUIRED_AUDIT_PHASES.includes(phase)),
      missingAuditEventFields: REQUIRED_AUDIT_EVENT_FIELDS
        .filter(field => !item.requiredAuditEventFields.includes(field)),
      unexpectedAuditEventFields: item.requiredAuditEventFields
        .filter(field => !REQUIRED_AUDIT_EVENT_FIELDS.includes(field)),
      missingAuditPlanOutputs: REQUIRED_AUDIT_PLAN_OUTPUTS
        .filter(output => !item.requiredAuditPlanOutputs.includes(output)),
      unexpectedAuditPlanOutputs: item.requiredAuditPlanOutputs
        .filter(output => !REQUIRED_AUDIT_PLAN_OUTPUTS.includes(output)),
      missingAuditPlanFlags: REQUIRED_AUDIT_PLAN_FLAGS.filter(flag => !item.auditPlanFlags.includes(flag)),
      unexpectedAuditPlanFlags: item.auditPlanFlags.filter(flag => !REQUIRED_AUDIT_PLAN_FLAGS.includes(flag)),
      appendOnlyRequired: item.appendOnlyRequired,
      sharedCorrelationRequired: item.sharedCorrelationRequired,
      executionApproved: false,
      runtimeIntegrated: false,
      auditWriterImplemented: false,
      readinessClaimed: false
    };
  });
  const appendOnlyAuditPlanPolicyAccepted =
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
    appendOnlyAuditPlanPolicyAccepted,
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
    requiredAuditPhases: REQUIRED_AUDIT_PHASES,
    requiredAuditEventFields: REQUIRED_AUDIT_EVENT_FIELDS,
    requiredAuditPlanOutputs: REQUIRED_AUDIT_PLAN_OUTPUTS,
    requiredAuditPlanFlags: REQUIRED_AUDIT_PLAN_FLAGS,
    requiredFamilyAuditSurfaces: REQUIRED_FAMILY_AUDIT_SURFACES,
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
  REQUIRED_AUDIT_EVENT_FIELDS,
  REQUIRED_AUDIT_PHASES,
  REQUIRED_AUDIT_PLAN_FLAGS,
  REQUIRED_AUDIT_PLAN_OUTPUTS,
  REQUIRED_FAMILY_AUDIT_SURFACES,
  normalizePolicy,
  summarizeDeferredGovernanceAppendOnlyAuditPlanPolicy
};
