const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-approved-context-gate-policy-v1';
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

const REQUIRED_CONTEXT_FIELDS = Object.freeze([
  'requestSource',
  'contextFlag',
  'actorClientId',
  'approvalId',
  'auditCorrelationId',
  'scope'
]);

const REQUIRED_GATE_PROPERTIES = Object.freeze([
  'defaultDisabled',
  'requiresExactRequestSource',
  'requiresFamilyContextFlag',
  'requiresActorClientId',
  'requiresApprovalId',
  'requiresAuditCorrelationId',
  'requiresScopeBinding',
  'rejectsPublicMcpContext',
  'rejectsMissingExecutionContext',
  'rejectsStaleApprovalContext',
  'publicMcpFrozen'
]);

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

function requiredContextForFamily(family) {
  return REQUIRED_FAMILY_CONTEXTS[family] || { requestSource: '', contextFlag: '' };
}

function normalizeFamilyPolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    family: normalizeString(safePolicy.family),
    requestSource: normalizeString(safePolicy.requestSource),
    contextFlag: normalizeString(safePolicy.contextFlag),
    requiredContextFields: normalizeStringArray(safePolicy.requiredContextFields),
    gateProperties: normalizeStringArray(safePolicy.gateProperties),
    defaultDisabled: normalizeBoolean(safePolicy.defaultDisabled),
    requiresExactRequestSource: normalizeBoolean(safePolicy.requiresExactRequestSource),
    requiresFamilyContextFlag: normalizeBoolean(safePolicy.requiresFamilyContextFlag),
    requiresActorClientId: normalizeBoolean(safePolicy.requiresActorClientId),
    requiresApprovalId: normalizeBoolean(safePolicy.requiresApprovalId),
    requiresAuditCorrelationId: normalizeBoolean(safePolicy.requiresAuditCorrelationId),
    requiresScopeBinding: normalizeBoolean(safePolicy.requiresScopeBinding),
    publicMcpContextAllowed: normalizeBoolean(safePolicy.publicMcpContextAllowed),
    missingExecutionContextAllowed: normalizeBoolean(safePolicy.missingExecutionContextAllowed),
    staleApprovalContextAllowed: normalizeBoolean(safePolicy.staleApprovalContextAllowed),
    publicMcpTool: normalizeBoolean(safePolicy.publicMcpTool),
    executionApproved: normalizeBoolean(safePolicy.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePolicy.runtimeIntegrated),
    mutatesDurableState: normalizeBoolean(safePolicy.mutatesDurableState),
    providerCalls: normalizeInteger(safePolicy.providerCalls),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed)
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
    policy.requestSource === requiredContext.requestSource &&
    policy.contextFlag === requiredContext.contextFlag &&
    hasExactSet(policy.requiredContextFields, REQUIRED_CONTEXT_FIELDS) &&
    hasExactSet(policy.gateProperties, REQUIRED_GATE_PROPERTIES) &&
    policy.defaultDisabled === true &&
    policy.requiresExactRequestSource === true &&
    policy.requiresFamilyContextFlag === true &&
    policy.requiresActorClientId === true &&
    policy.requiresApprovalId === true &&
    policy.requiresAuditCorrelationId === true &&
    policy.requiresScopeBinding === true &&
    policy.publicMcpContextAllowed === false &&
    policy.missingExecutionContextAllowed === false &&
    policy.staleApprovalContextAllowed === false &&
    policy.publicMcpTool === false &&
    policy.executionApproved === false &&
    policy.runtimeIntegrated === false &&
    policy.mutatesDurableState === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false;
}

function summarizeDeferredGovernanceApprovedContextGatePolicy(policy = {}) {
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
      requiredRequestSource: requiredContext.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredContext.contextFlag,
      contextFlag: item.contextFlag,
      missingContextFields: REQUIRED_CONTEXT_FIELDS
        .filter(field => !item.requiredContextFields.includes(field)),
      unexpectedContextFields: item.requiredContextFields
        .filter(field => !REQUIRED_CONTEXT_FIELDS.includes(field)),
      missingGateProperties: REQUIRED_GATE_PROPERTIES
        .filter(property => !item.gateProperties.includes(property)),
      unexpectedGateProperties: item.gateProperties
        .filter(property => !REQUIRED_GATE_PROPERTIES.includes(property)),
      defaultDisabled: item.defaultDisabled,
      publicMcpContextAllowed: item.publicMcpContextAllowed,
      missingExecutionContextAllowed: item.missingExecutionContextAllowed,
      staleApprovalContextAllowed: item.staleApprovalContextAllowed,
      executionApproved: false,
      publicMcpTool: false,
      runtimeIntegrated: false,
      readinessClaimed: false
    };
  });
  const approvedContextGatePolicyAccepted =
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
    approvedContextGatePolicyAccepted,
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
    requiredContextFields: REQUIRED_CONTEXT_FIELDS,
    requiredGateProperties: REQUIRED_GATE_PROPERTIES,
    requiredFamilyContexts: REQUIRED_FAMILY_CONTEXTS,
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
  REQUIRED_CONTEXT_FIELDS,
  REQUIRED_FAMILY_CONTEXTS,
  REQUIRED_GATE_PROPERTIES,
  normalizePolicy,
  summarizeDeferredGovernanceApprovedContextGatePolicy
};
