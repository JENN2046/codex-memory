const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-revision-policy-v1';
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

const REQUIRED_REVISION_INPUTS = Object.freeze([
  'targetMemoryIds',
  'changedMemoryIds',
  'auditCorrelationId',
  'projectionRevisionToken',
  'candidateCacheRevision',
  'readSuppressionRevision',
  'scopeTuple',
  'requestSource',
  'contextFlag',
  'plannedAt'
]);

const REQUIRED_REVISION_OUTPUTS = Object.freeze([
  'governanceRevision',
  'revisionToken',
  'revisionBasis',
  'auditRevisionRef',
  'projectionRevisionRef',
  'changedMemoryIdsRevisionRef',
  'candidateCacheRevisionRef',
  'readSuppressionRevisionRef',
  'rollbackOrCleanupRevisionRef',
  'blockingFindings'
]);

const REQUIRED_REVISION_FLAGS = Object.freeze([
  'governanceRevisionRequired',
  'deterministicRevisionRequired',
  'auditProjectionChangedIdsParityRequired',
  'candidateCacheRevisionRequired',
  'readSuppressionRevisionRequired',
  'rollbackOrCleanupRevisionRequired',
  'staleRevisionRejected',
  'noProviderRequired',
  'noBroadScanRequired',
  'publicMcpFrozen'
]);

const REQUIRED_FAMILY_REVISION_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    action: 'scope_suppression_governance_revision',
    revisionReason: 'excluded_scope_suppression_revision',
    revisionStates: Object.freeze(['excluded', 'scope_suppressed']),
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    action: 'governed_forget_governance_revision',
    revisionReason: 'forgotten_governance_suppression_revision',
    revisionStates: Object.freeze(['forgotten', 'governance_suppressed']),
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noRevisionEmitterImplementation',
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
  return REQUIRED_FAMILY_REVISION_SURFACES[family] || {
    action: '',
    revisionReason: '',
    revisionStates: [],
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilyPlan(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};

  return {
    family: normalizeString(safePlan.family),
    action: normalizeString(safePlan.action),
    revisionReason: normalizeString(safePlan.revisionReason),
    revisionStates: normalizeStringArray(safePlan.revisionStates),
    requestSource: normalizeString(safePlan.requestSource),
    contextFlag: normalizeString(safePlan.contextFlag),
    requiredRevisionInputs: normalizeStringArray(safePlan.requiredRevisionInputs),
    requiredRevisionOutputs: normalizeStringArray(safePlan.requiredRevisionOutputs),
    revisionFlags: normalizeStringArray(safePlan.revisionFlags),
    governanceRevisionRequired: normalizeBoolean(safePlan.governanceRevisionRequired),
    deterministicRevisionRequired: normalizeBoolean(safePlan.deterministicRevisionRequired),
    auditProjectionChangedIdsParityRequired: normalizeBoolean(safePlan.auditProjectionChangedIdsParityRequired),
    candidateCacheRevisionRequired: normalizeBoolean(safePlan.candidateCacheRevisionRequired),
    readSuppressionRevisionRequired: normalizeBoolean(safePlan.readSuppressionRevisionRequired),
    rollbackOrCleanupRevisionRequired: normalizeBoolean(safePlan.rollbackOrCleanupRevisionRequired),
    staleRevisionRejected: normalizeBoolean(safePlan.staleRevisionRejected),
    noProviderRequired: normalizeBoolean(safePlan.noProviderRequired),
    noBroadScanRequired: normalizeBoolean(safePlan.noBroadScanRequired),
    publicMcpTool: normalizeBoolean(safePlan.publicMcpTool),
    executionApproved: normalizeBoolean(safePlan.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePlan.runtimeIntegrated),
    revisionEmitterImplemented: normalizeBoolean(safePlan.revisionEmitterImplemented),
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
    plan.revisionReason === requiredSurface.revisionReason &&
    hasExactSet(plan.revisionStates, requiredSurface.revisionStates) &&
    plan.requestSource === requiredSurface.requestSource &&
    plan.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(plan.requiredRevisionInputs, REQUIRED_REVISION_INPUTS) &&
    hasExactSet(plan.requiredRevisionOutputs, REQUIRED_REVISION_OUTPUTS) &&
    hasExactSet(plan.revisionFlags, REQUIRED_REVISION_FLAGS) &&
    plan.governanceRevisionRequired === true &&
    plan.deterministicRevisionRequired === true &&
    plan.auditProjectionChangedIdsParityRequired === true &&
    plan.candidateCacheRevisionRequired === true &&
    plan.readSuppressionRevisionRequired === true &&
    plan.rollbackOrCleanupRevisionRequired === true &&
    plan.staleRevisionRejected === true &&
    plan.noProviderRequired === true &&
    plan.noBroadScanRequired === true &&
    plan.publicMcpTool === false &&
    plan.executionApproved === false &&
    plan.runtimeIntegrated === false &&
    plan.revisionEmitterImplemented === false &&
    plan.broadMemoryScanAllowed === false &&
    plan.candidateCacheCleared === false &&
    plan.mutatesDurableState === false &&
    plan.providerCalls === 0 &&
    plan.readinessClaimed === false;
}

function summarizeDeferredGovernanceRevisionPolicy(policy = {}) {
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
      requiredRevisionReason: requiredSurface.revisionReason,
      revisionReason: item.revisionReason,
      requiredRevisionStates: requiredSurface.revisionStates,
      revisionStates: item.revisionStates,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingRevisionInputs: REQUIRED_REVISION_INPUTS
        .filter(input => !item.requiredRevisionInputs.includes(input)),
      unexpectedRevisionInputs: item.requiredRevisionInputs
        .filter(input => !REQUIRED_REVISION_INPUTS.includes(input)),
      missingRevisionOutputs: REQUIRED_REVISION_OUTPUTS
        .filter(output => !item.requiredRevisionOutputs.includes(output)),
      unexpectedRevisionOutputs: item.requiredRevisionOutputs
        .filter(output => !REQUIRED_REVISION_OUTPUTS.includes(output)),
      missingRevisionFlags: REQUIRED_REVISION_FLAGS.filter(flag => !item.revisionFlags.includes(flag)),
      unexpectedRevisionFlags: item.revisionFlags.filter(flag => !REQUIRED_REVISION_FLAGS.includes(flag)),
      governanceRevisionRequired: item.governanceRevisionRequired,
      deterministicRevisionRequired: item.deterministicRevisionRequired,
      auditProjectionChangedIdsParityRequired: item.auditProjectionChangedIdsParityRequired,
      candidateCacheRevisionRequired: item.candidateCacheRevisionRequired,
      readSuppressionRevisionRequired: item.readSuppressionRevisionRequired,
      staleRevisionRejected: item.staleRevisionRejected,
      revisionEmitterImplemented: false,
      candidateCacheCleared: false,
      runtimeIntegrated: false,
      readinessClaimed: false
    };
  });
  const governanceRevisionPolicyAccepted =
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
    governanceRevisionPolicyAccepted,
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
    requiredRevisionInputs: REQUIRED_REVISION_INPUTS,
    requiredRevisionOutputs: REQUIRED_REVISION_OUTPUTS,
    requiredRevisionFlags: REQUIRED_REVISION_FLAGS,
    requiredFamilyRevisionSurfaces: REQUIRED_FAMILY_REVISION_SURFACES,
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
  REQUIRED_FAMILY_REVISION_SURFACES,
  REQUIRED_REVISION_FLAGS,
  REQUIRED_REVISION_INPUTS,
  REQUIRED_REVISION_OUTPUTS,
  normalizePolicy,
  summarizeDeferredGovernanceRevisionPolicy
};
