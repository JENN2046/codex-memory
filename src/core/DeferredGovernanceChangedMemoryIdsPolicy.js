const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-changed-memory-ids-policy-v1';
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

const REQUIRED_CHANGED_ID_INPUTS = Object.freeze([
  'targetMemoryIds',
  'projectionAffectedRecords',
  'auditCorrelationId',
  'governanceRevision',
  'scopeTuple',
  'requestSource',
  'contextFlag',
  'reason',
  'plannedAt'
]);

const REQUIRED_CHANGED_ID_OUTPUTS = Object.freeze([
  'changedMemoryIds',
  'changedMemoryIdSet',
  'changedMemoryIdCount',
  'changeReasonsByMemoryId',
  'auditChangedMemoryIds',
  'projectionChangedMemoryIds',
  'invalidationTargetMemoryIds',
  'governanceRevision',
  'candidateCacheInvalidationPlan',
  'readSuppressionRecheckPlan',
  'rollbackOrCleanupPlan',
  'blockingFindings'
]);

const REQUIRED_CHANGED_ID_FLAGS = Object.freeze([
  'exactTargetSetRequired',
  'dedupeRequired',
  'nonEmptyWhenTargetsPresent',
  'auditProjectionParityRequired',
  'governanceRevisionRequired',
  'candidateCacheInvalidationRequired',
  'readSuppressionRecheckRequired',
  'rollbackOrCleanupPlanRequired',
  'noBroadScanRequired',
  'publicMcpFrozen'
]);

const REQUIRED_FAMILY_CHANGED_ID_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    action: 'scope_suppression_changed_memory_ids',
    changeReason: 'excluded_scope_suppression',
    emittedStates: Object.freeze(['excluded', 'scope_suppressed']),
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    action: 'governed_forget_changed_memory_ids',
    changeReason: 'forgotten_governance_suppression',
    emittedStates: Object.freeze(['forgotten', 'governance_suppressed']),
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noBroadRealMemoryScan',
  'noDurableAuditWrite',
  'noDurableMemoryWrite',
  'noCandidateCacheClear',
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
  return REQUIRED_FAMILY_CHANGED_ID_SURFACES[family] || {
    action: '',
    changeReason: '',
    emittedStates: [],
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilyPlan(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};

  return {
    family: normalizeString(safePlan.family),
    action: normalizeString(safePlan.action),
    changeReason: normalizeString(safePlan.changeReason),
    emittedStates: normalizeStringArray(safePlan.emittedStates),
    requestSource: normalizeString(safePlan.requestSource),
    contextFlag: normalizeString(safePlan.contextFlag),
    requiredChangedIdInputs: normalizeStringArray(safePlan.requiredChangedIdInputs),
    requiredChangedIdOutputs: normalizeStringArray(safePlan.requiredChangedIdOutputs),
    changedIdFlags: normalizeStringArray(safePlan.changedIdFlags),
    exactTargetSetRequired: normalizeBoolean(safePlan.exactTargetSetRequired),
    dedupeRequired: normalizeBoolean(safePlan.dedupeRequired),
    nonEmptyWhenTargetsPresent: normalizeBoolean(safePlan.nonEmptyWhenTargetsPresent),
    auditProjectionParityRequired: normalizeBoolean(safePlan.auditProjectionParityRequired),
    governanceRevisionRequired: normalizeBoolean(safePlan.governanceRevisionRequired),
    candidateCacheInvalidationRequired: normalizeBoolean(safePlan.candidateCacheInvalidationRequired),
    readSuppressionRecheckRequired: normalizeBoolean(safePlan.readSuppressionRecheckRequired),
    rollbackOrCleanupPlanRequired: normalizeBoolean(safePlan.rollbackOrCleanupPlanRequired),
    noBroadScanRequired: normalizeBoolean(safePlan.noBroadScanRequired),
    publicMcpTool: normalizeBoolean(safePlan.publicMcpTool),
    executionApproved: normalizeBoolean(safePlan.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePlan.runtimeIntegrated),
    changedIdsEmitterImplemented: normalizeBoolean(safePlan.changedIdsEmitterImplemented),
    broadMemoryScanAllowed: normalizeBoolean(safePlan.broadMemoryScanAllowed),
    candidateCacheCleared: normalizeBoolean(safePlan.candidateCacheCleared),
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
    plan.changeReason === requiredSurface.changeReason &&
    hasExactSet(plan.emittedStates, requiredSurface.emittedStates) &&
    plan.requestSource === requiredSurface.requestSource &&
    plan.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(plan.requiredChangedIdInputs, REQUIRED_CHANGED_ID_INPUTS) &&
    hasExactSet(plan.requiredChangedIdOutputs, REQUIRED_CHANGED_ID_OUTPUTS) &&
    hasExactSet(plan.changedIdFlags, REQUIRED_CHANGED_ID_FLAGS) &&
    plan.exactTargetSetRequired === true &&
    plan.dedupeRequired === true &&
    plan.nonEmptyWhenTargetsPresent === true &&
    plan.auditProjectionParityRequired === true &&
    plan.governanceRevisionRequired === true &&
    plan.candidateCacheInvalidationRequired === true &&
    plan.readSuppressionRecheckRequired === true &&
    plan.rollbackOrCleanupPlanRequired === true &&
    plan.noBroadScanRequired === true &&
    plan.publicMcpTool === false &&
    plan.executionApproved === false &&
    plan.runtimeIntegrated === false &&
    plan.changedIdsEmitterImplemented === false &&
    plan.broadMemoryScanAllowed === false &&
    plan.candidateCacheCleared === false &&
    plan.mutatesDurableState === false &&
    plan.providerCalls === 0 &&
    plan.readinessClaimed === false;
}

function summarizeDeferredGovernanceChangedMemoryIdsPolicy(policy = {}) {
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
      requiredChangeReason: requiredSurface.changeReason,
      changeReason: item.changeReason,
      requiredEmittedStates: requiredSurface.emittedStates,
      emittedStates: item.emittedStates,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingChangedIdInputs: REQUIRED_CHANGED_ID_INPUTS
        .filter(input => !item.requiredChangedIdInputs.includes(input)),
      unexpectedChangedIdInputs: item.requiredChangedIdInputs
        .filter(input => !REQUIRED_CHANGED_ID_INPUTS.includes(input)),
      missingChangedIdOutputs: REQUIRED_CHANGED_ID_OUTPUTS
        .filter(output => !item.requiredChangedIdOutputs.includes(output)),
      unexpectedChangedIdOutputs: item.requiredChangedIdOutputs
        .filter(output => !REQUIRED_CHANGED_ID_OUTPUTS.includes(output)),
      missingChangedIdFlags: REQUIRED_CHANGED_ID_FLAGS.filter(flag => !item.changedIdFlags.includes(flag)),
      unexpectedChangedIdFlags: item.changedIdFlags.filter(flag => !REQUIRED_CHANGED_ID_FLAGS.includes(flag)),
      exactTargetSetRequired: item.exactTargetSetRequired,
      dedupeRequired: item.dedupeRequired,
      auditProjectionParityRequired: item.auditProjectionParityRequired,
      governanceRevisionRequired: item.governanceRevisionRequired,
      candidateCacheInvalidationRequired: item.candidateCacheInvalidationRequired,
      readSuppressionRecheckRequired: item.readSuppressionRecheckRequired,
      noBroadScanRequired: item.noBroadScanRequired,
      changedIdsEmitterImplemented: false,
      candidateCacheCleared: false,
      runtimeIntegrated: false,
      readinessClaimed: false
    };
  });
  const changedMemoryIdsPolicyAccepted =
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
    changedMemoryIdsPolicyAccepted,
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
    requiredChangedIdInputs: REQUIRED_CHANGED_ID_INPUTS,
    requiredChangedIdOutputs: REQUIRED_CHANGED_ID_OUTPUTS,
    requiredChangedIdFlags: REQUIRED_CHANGED_ID_FLAGS,
    requiredFamilyChangedIdSurfaces: REQUIRED_FAMILY_CHANGED_ID_SURFACES,
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
  REQUIRED_CHANGED_ID_FLAGS,
  REQUIRED_CHANGED_ID_INPUTS,
  REQUIRED_CHANGED_ID_OUTPUTS,
  REQUIRED_FAMILY_CHANGED_ID_SURFACES,
  normalizePolicy,
  summarizeDeferredGovernanceChangedMemoryIdsPolicy
};
