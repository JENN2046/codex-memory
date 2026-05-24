const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-internal-service-surface-policy-v1';
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

const REQUIRED_SERVICE_INPUTS = Object.freeze([
  'targetMemoryIds',
  'scopeTuple',
  'actorClientId',
  'approvalId',
  'requestSource',
  'contextFlag',
  'reason',
  'auditCorrelationId',
  'dryRun'
]);

const REQUIRED_SERVICE_OUTPUTS = Object.freeze([
  'decision',
  'dryRun',
  'mutated',
  'family',
  'targetMemoryIds',
  'suppressionProjectionPreview',
  'appendOnlyAuditPreview',
  'changedMemoryIds',
  'governanceRevision',
  'candidateCacheInvalidation',
  'readPolicySuppression',
  'rollbackOrCleanupPlan'
]);

const REQUIRED_SERVICE_DEPENDENCIES = Object.freeze([
  'shadowProjectionReader',
  'auditPreviewBuilder',
  'candidateCacheInvalidationPlanner',
  'readPolicySuppressionPlanner',
  'approvalContextGate',
  'runtimePrepPolicy'
]);

const REQUIRED_SERVICE_FLAGS = Object.freeze([
  'internalOnly',
  'defaultDisabled',
  'dryRunFirst',
  'boundedRuntimePrepRequired',
  'approvedContextGateRequired',
  'exactExecutionApprovalRequired',
  'appendOnlyAuditPreviewRequired',
  'shadowProjectionPreviewRequired',
  'changedMemoryIdsRequired',
  'governanceRevisionRequired',
  'candidateCacheInvalidationRequired',
  'readPolicySuppressionRequired',
  'rollbackOrCleanupPlanRequired',
  'noHardDeleteDefault',
  'publicMcpFrozen'
]);

const REQUIRED_FAMILY_SERVICE_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    serviceName: 'MemoryExcludeGovernanceService',
    serviceMethod: 'planMemoryExclude',
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry',
    action: 'scope_suppression_projection',
    projectionStates: Object.freeze(['excluded', 'scope_suppressed'])
  }),
  memory_forget: Object.freeze({
    serviceName: 'MemoryForgetGovernanceService',
    serviceMethod: 'planMemoryForget',
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry',
    action: 'governed_forget_suppression_projection',
    projectionStates: Object.freeze(['forgotten', 'governance_suppressed'])
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
  return REQUIRED_FAMILY_SERVICE_SURFACES[family] || {
    serviceName: '',
    serviceMethod: '',
    requestSource: '',
    contextFlag: '',
    action: '',
    projectionStates: []
  };
}

function normalizeFamilySurface(surface = {}) {
  const safeSurface = isPlainObject(surface) ? surface : {};

  return {
    family: normalizeString(safeSurface.family),
    serviceName: normalizeString(safeSurface.serviceName),
    serviceMethod: normalizeString(safeSurface.serviceMethod),
    requestSource: normalizeString(safeSurface.requestSource),
    contextFlag: normalizeString(safeSurface.contextFlag),
    action: normalizeString(safeSurface.action),
    projectionStates: normalizeStringArray(safeSurface.projectionStates),
    requiredServiceInputs: normalizeStringArray(safeSurface.requiredServiceInputs),
    requiredServiceOutputs: normalizeStringArray(safeSurface.requiredServiceOutputs),
    requiredServiceDependencies: normalizeStringArray(safeSurface.requiredServiceDependencies),
    serviceFlags: normalizeStringArray(safeSurface.serviceFlags),
    internalOnly: normalizeBoolean(safeSurface.internalOnly),
    defaultDisabled: normalizeBoolean(safeSurface.defaultDisabled),
    dryRunFirst: normalizeBoolean(safeSurface.dryRunFirst),
    runtimeEntryEnabledByDefault: normalizeBoolean(safeSurface.runtimeEntryEnabledByDefault),
    publicMcpTool: normalizeBoolean(safeSurface.publicMcpTool),
    executionApproved: normalizeBoolean(safeSurface.executionApproved),
    runtimeIntegrated: normalizeBoolean(safeSurface.runtimeIntegrated),
    mutatesDurableState: normalizeBoolean(safeSurface.mutatesDurableState),
    hardDeleteAllowed: normalizeBoolean(safeSurface.hardDeleteAllowed),
    providerCalls: normalizeInteger(safeSurface.providerCalls),
    readinessClaimed: normalizeBoolean(safeSurface.readinessClaimed)
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
    familySurfaces: Array.isArray(safePolicy.familySurfaces)
      ? safePolicy.familySurfaces.map(normalizeFamilySurface)
      : [],
    safety: normalizeSafety(safePolicy.safety)
  };
}

function familySurfaceAccepted(surface) {
  const requiredSurface = requiredSurfaceForFamily(surface.family);

  return GOVERNANCE_FAMILIES.includes(surface.family) &&
    surface.serviceName === requiredSurface.serviceName &&
    surface.serviceMethod === requiredSurface.serviceMethod &&
    surface.requestSource === requiredSurface.requestSource &&
    surface.contextFlag === requiredSurface.contextFlag &&
    surface.action === requiredSurface.action &&
    hasExactSet(surface.projectionStates, requiredSurface.projectionStates) &&
    hasExactSet(surface.requiredServiceInputs, REQUIRED_SERVICE_INPUTS) &&
    hasExactSet(surface.requiredServiceOutputs, REQUIRED_SERVICE_OUTPUTS) &&
    hasExactSet(surface.requiredServiceDependencies, REQUIRED_SERVICE_DEPENDENCIES) &&
    hasExactSet(surface.serviceFlags, REQUIRED_SERVICE_FLAGS) &&
    surface.internalOnly === true &&
    surface.defaultDisabled === true &&
    surface.dryRunFirst === true &&
    surface.runtimeEntryEnabledByDefault === false &&
    surface.publicMcpTool === false &&
    surface.executionApproved === false &&
    surface.runtimeIntegrated === false &&
    surface.mutatesDurableState === false &&
    surface.hardDeleteAllowed === false &&
    surface.providerCalls === 0 &&
    surface.readinessClaimed === false;
}

function summarizeDeferredGovernanceInternalServiceSurfacePolicy(policy = {}) {
  const normalized = normalizePolicy(policy);
  const familyIds = normalized.familySurfaces.map(item => item.family).filter(Boolean);
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
  const familyReports = normalized.familySurfaces.map(item => {
    const requiredSurface = requiredSurfaceForFamily(item.family);
    return {
      family: item.family,
      accepted: familySurfaceAccepted(item),
      requiredServiceName: requiredSurface.serviceName,
      serviceName: item.serviceName,
      requiredServiceMethod: requiredSurface.serviceMethod,
      serviceMethod: item.serviceMethod,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      requiredAction: requiredSurface.action,
      action: item.action,
      requiredProjectionStates: requiredSurface.projectionStates,
      missingProjectionStates: requiredSurface.projectionStates
        .filter(state => !item.projectionStates.includes(state)),
      unexpectedProjectionStates: item.projectionStates
        .filter(state => !requiredSurface.projectionStates.includes(state)),
      missingServiceInputs: REQUIRED_SERVICE_INPUTS
        .filter(input => !item.requiredServiceInputs.includes(input)),
      unexpectedServiceInputs: item.requiredServiceInputs
        .filter(input => !REQUIRED_SERVICE_INPUTS.includes(input)),
      missingServiceOutputs: REQUIRED_SERVICE_OUTPUTS
        .filter(output => !item.requiredServiceOutputs.includes(output)),
      unexpectedServiceOutputs: item.requiredServiceOutputs
        .filter(output => !REQUIRED_SERVICE_OUTPUTS.includes(output)),
      missingServiceDependencies: REQUIRED_SERVICE_DEPENDENCIES
        .filter(dependency => !item.requiredServiceDependencies.includes(dependency)),
      unexpectedServiceDependencies: item.requiredServiceDependencies
        .filter(dependency => !REQUIRED_SERVICE_DEPENDENCIES.includes(dependency)),
      missingServiceFlags: REQUIRED_SERVICE_FLAGS.filter(flag => !item.serviceFlags.includes(flag)),
      unexpectedServiceFlags: item.serviceFlags.filter(flag => !REQUIRED_SERVICE_FLAGS.includes(flag)),
      internalOnly: item.internalOnly,
      defaultDisabled: item.defaultDisabled,
      dryRunFirst: item.dryRunFirst,
      runtimeEntryEnabledByDefault: item.runtimeEntryEnabledByDefault,
      executionApproved: false,
      publicMcpTool: false,
      runtimeIntegrated: false,
      readinessClaimed: false
    };
  });
  const internalServiceSurfacePolicyAccepted =
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
    internalServiceSurfacePolicyAccepted,
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
    requiredServiceInputs: REQUIRED_SERVICE_INPUTS,
    requiredServiceOutputs: REQUIRED_SERVICE_OUTPUTS,
    requiredServiceDependencies: REQUIRED_SERVICE_DEPENDENCIES,
    requiredServiceFlags: REQUIRED_SERVICE_FLAGS,
    requiredFamilyServiceSurfaces: REQUIRED_FAMILY_SERVICE_SURFACES,
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
  REQUIRED_FAMILY_SERVICE_SURFACES,
  REQUIRED_SERVICE_DEPENDENCIES,
  REQUIRED_SERVICE_FLAGS,
  REQUIRED_SERVICE_INPUTS,
  REQUIRED_SERVICE_OUTPUTS,
  normalizePolicy,
  summarizeDeferredGovernanceInternalServiceSurfacePolicy
};
