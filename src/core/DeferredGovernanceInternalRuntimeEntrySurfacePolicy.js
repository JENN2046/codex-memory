const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-internal-runtime-entry-surface-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_ENTRY_INPUTS = Object.freeze([
  'args',
  'requestContext',
  'executionContext',
  'requestSource',
  'contextFlag',
  'actorClientId',
  'approvalId',
  'auditCorrelationId',
  'dryRun'
]);

const REQUIRED_PAYLOAD_FIELDS = Object.freeze([
  'target_memory_ids',
  'scope_tuple',
  'actor_client_id',
  'approval_id',
  'request_source',
  'context_flag',
  'reason',
  'audit_correlation_id',
  'dry_run'
]);

const REQUIRED_ENTRY_OUTPUTS = Object.freeze([
  'ok',
  'reason',
  'payload',
  'blockedBeforeService',
  'serviceName',
  'serviceMethod',
  'executionStarted',
  'mutated'
]);

const REQUIRED_ENTRY_FLAGS = Object.freeze([
  'defaultDisabled',
  'approvedExecutionContextRequired',
  'exactRequestSourceRequired',
  'familyContextFlagRequired',
  'actorClientIdDerivedFromContext',
  'dryRunDefaultTrue',
  'confirmRequiresExactApproval',
  'routesOnlyToInternalService',
  'boundedRuntimePrepRequired',
  'publicMcpFrozen',
  'noPublicCallToolExposure'
]);

const REQUIRED_FAMILY_RUNTIME_ENTRY_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    entryName: 'executeInternalMemoryExclude',
    serviceName: 'MemoryExcludeGovernanceService',
    serviceMethod: 'planMemoryExclude',
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    entryName: 'executeInternalMemoryForget',
    serviceName: 'MemoryForgetGovernanceService',
    serviceMethod: 'planMemoryForget',
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
  return REQUIRED_FAMILY_RUNTIME_ENTRY_SURFACES[family] || {
    entryName: '',
    serviceName: '',
    serviceMethod: '',
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilySurface(surface = {}) {
  const safeSurface = isPlainObject(surface) ? surface : {};

  return {
    family: normalizeString(safeSurface.family),
    entryName: normalizeString(safeSurface.entryName),
    serviceName: normalizeString(safeSurface.serviceName),
    serviceMethod: normalizeString(safeSurface.serviceMethod),
    requestSource: normalizeString(safeSurface.requestSource),
    contextFlag: normalizeString(safeSurface.contextFlag),
    requiredEntryInputs: normalizeStringArray(safeSurface.requiredEntryInputs),
    requiredPayloadFields: normalizeStringArray(safeSurface.requiredPayloadFields),
    requiredEntryOutputs: normalizeStringArray(safeSurface.requiredEntryOutputs),
    entryFlags: normalizeStringArray(safeSurface.entryFlags),
    defaultDisabled: normalizeBoolean(safeSurface.defaultDisabled),
    approvedExecutionContextRequired: normalizeBoolean(safeSurface.approvedExecutionContextRequired),
    publicMcpTool: normalizeBoolean(safeSurface.publicMcpTool),
    callToolExposed: normalizeBoolean(safeSurface.callToolExposed),
    executionApproved: normalizeBoolean(safeSurface.executionApproved),
    runtimeIntegrated: normalizeBoolean(safeSurface.runtimeIntegrated),
    serviceImplemented: normalizeBoolean(safeSurface.serviceImplemented),
    executionStarted: normalizeBoolean(safeSurface.executionStarted),
    mutatesDurableState: normalizeBoolean(safeSurface.mutatesDurableState),
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
    callToolExpanded: normalizeBoolean(safePolicy.callToolExpanded),
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
    surface.entryName === requiredSurface.entryName &&
    surface.serviceName === requiredSurface.serviceName &&
    surface.serviceMethod === requiredSurface.serviceMethod &&
    surface.requestSource === requiredSurface.requestSource &&
    surface.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(surface.requiredEntryInputs, REQUIRED_ENTRY_INPUTS) &&
    hasExactSet(surface.requiredPayloadFields, REQUIRED_PAYLOAD_FIELDS) &&
    hasExactSet(surface.requiredEntryOutputs, REQUIRED_ENTRY_OUTPUTS) &&
    hasExactSet(surface.entryFlags, REQUIRED_ENTRY_FLAGS) &&
    surface.defaultDisabled === true &&
    surface.approvedExecutionContextRequired === true &&
    surface.publicMcpTool === false &&
    surface.callToolExposed === false &&
    surface.executionApproved === false &&
    surface.runtimeIntegrated === false &&
    surface.serviceImplemented === false &&
    surface.executionStarted === false &&
    surface.mutatesDurableState === false &&
    surface.providerCalls === 0 &&
    surface.readinessClaimed === false;
}

function summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy(policy = {}) {
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
    normalized.callToolExpanded === false &&
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
      requiredEntryName: requiredSurface.entryName,
      entryName: item.entryName,
      requiredServiceName: requiredSurface.serviceName,
      serviceName: item.serviceName,
      requiredServiceMethod: requiredSurface.serviceMethod,
      serviceMethod: item.serviceMethod,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingEntryInputs: REQUIRED_ENTRY_INPUTS
        .filter(input => !item.requiredEntryInputs.includes(input)),
      unexpectedEntryInputs: item.requiredEntryInputs
        .filter(input => !REQUIRED_ENTRY_INPUTS.includes(input)),
      missingPayloadFields: REQUIRED_PAYLOAD_FIELDS
        .filter(field => !item.requiredPayloadFields.includes(field)),
      unexpectedPayloadFields: item.requiredPayloadFields
        .filter(field => !REQUIRED_PAYLOAD_FIELDS.includes(field)),
      missingEntryOutputs: REQUIRED_ENTRY_OUTPUTS
        .filter(output => !item.requiredEntryOutputs.includes(output)),
      unexpectedEntryOutputs: item.requiredEntryOutputs
        .filter(output => !REQUIRED_ENTRY_OUTPUTS.includes(output)),
      missingEntryFlags: REQUIRED_ENTRY_FLAGS.filter(flag => !item.entryFlags.includes(flag)),
      unexpectedEntryFlags: item.entryFlags.filter(flag => !REQUIRED_ENTRY_FLAGS.includes(flag)),
      defaultDisabled: item.defaultDisabled,
      approvedExecutionContextRequired: item.approvedExecutionContextRequired,
      publicMcpTool: false,
      callToolExposed: false,
      executionApproved: false,
      runtimeIntegrated: false,
      serviceImplemented: false,
      executionStarted: false,
      readinessClaimed: false
    };
  });
  const internalRuntimeEntrySurfacePolicyAccepted =
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
    internalRuntimeEntrySurfacePolicyAccepted,
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    callToolExpanded: false,
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
    requiredEntryInputs: REQUIRED_ENTRY_INPUTS,
    requiredPayloadFields: REQUIRED_PAYLOAD_FIELDS,
    requiredEntryOutputs: REQUIRED_ENTRY_OUTPUTS,
    requiredEntryFlags: REQUIRED_ENTRY_FLAGS,
    requiredFamilyRuntimeEntrySurfaces: REQUIRED_FAMILY_RUNTIME_ENTRY_SURFACES,
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
  REQUIRED_ENTRY_FLAGS,
  REQUIRED_ENTRY_INPUTS,
  REQUIRED_ENTRY_OUTPUTS,
  REQUIRED_FAMILY_RUNTIME_ENTRY_SURFACES,
  REQUIRED_PAYLOAD_FIELDS,
  normalizePolicy,
  summarizeDeferredGovernanceInternalRuntimeEntrySurfacePolicy
};
