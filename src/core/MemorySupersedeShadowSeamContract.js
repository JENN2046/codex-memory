const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const EXPECTED_SCHEMA_VERSION = 'memory-supersede-shadow-seam-v1';
const EXPECTED_VERSION = 'v1';

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_doc',
  'committed_fixture',
  'committed_test',
  'explicit_input',
  'static_report_shape',
  'local_validation_summary'
]);

const REQUIRED_PAIR_FIELDS = Object.freeze([
  'oldMemoryId',
  'newMemoryId',
  'oldExpectedStatus',
  'newExpectedStatus',
  'oldExpectedClientId',
  'newExpectedClientId',
  'oldExpectedVisibility',
  'newExpectedVisibility',
  'oldToStatus',
  'newToStatus',
  'supersededByLink',
  'supersedesLink',
  'statusReason',
  'actorClientId',
  'updatedAt',
  'pairCorrelationId'
]);

const REQUIRED_LINK_COLUMNS = Object.freeze([
  'supersedes_memory_id',
  'superseded_by_memory_id'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'two_record_shadow_seam_not_implemented',
  'single_record_lifecycle_reuse_insufficient',
  'supersede_runtime_prep_not_implemented',
  'internal_supersede_service_not_implemented',
  'public_mcp_governance_expansion_not_approved',
  'v1_rc_not_ready_blocked'
]);

const REQUIRED_APPROVALS = Object.freeze([
  'two_record_shadow_seam_implementation',
  'supersession_runtime_prep',
  'internal_supersede_service_apply',
  'durable_memory_mutation',
  'public_mcp_governance_expansion',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeImplementation',
  'noDurableMemoryWrite',
  'noPublicMcpExpansion',
  'noRealMemoryScan',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noPackageScriptChange',
  'noRemoteWrite'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return cloneArray(values)
    .map(normalizeString)
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value) {
  return Number.isInteger(value) ? value : 0;
}

function normalizeSeamProperties(properties = {}) {
  const safeProperties = isPlainObject(properties) ? properties : {};
  return {
    requiresTwoRecordGuard: normalizeBoolean(safeProperties.requiresTwoRecordGuard),
    singleRecordReuseAllowed: normalizeBoolean(safeProperties.singleRecordReuseAllowed),
    oldRecordLifecycleWriteRequired: normalizeBoolean(safeProperties.oldRecordLifecycleWriteRequired),
    newRecordLifecycleWriteRequired: normalizeBoolean(safeProperties.newRecordLifecycleWriteRequired),
    bidirectionalLinkWriteRequired: normalizeBoolean(safeProperties.bidirectionalLinkWriteRequired),
    sharedPolicyGuardRequired: normalizeBoolean(safeProperties.sharedPolicyGuardRequired),
    sharedCorrelationIdRequired: normalizeBoolean(safeProperties.sharedCorrelationIdRequired),
    atomicPairOutcomeRequired: normalizeBoolean(safeProperties.atomicPairOutcomeRequired),
    rollbackPreviewRequired: normalizeBoolean(safeProperties.rollbackPreviewRequired),
    runtimeImplemented: normalizeBoolean(safeProperties.runtimeImplemented),
    executionApproved: normalizeBoolean(safeProperties.executionApproved),
    mutated: normalizeBoolean(safeProperties.mutated)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};
  for (const flag of NO_SIDE_EFFECT_SAFETY_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }
  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawWorkspaceIdExposed = normalizeBoolean(safeSafety.rawWorkspaceIdExposed);
  return normalized;
}

function normalizeMemorySupersedeShadowSeamContract(contract = {}) {
  const safeContract = isPlainObject(contract) ? contract : {};
  return {
    schemaVersion: normalizeString(safeContract.schemaVersion),
    version: normalizeString(safeContract.version),
    phase: normalizeString(safeContract.phase),
    fixtureOnly: normalizeBoolean(safeContract.fixtureOnly),
    synthetic: normalizeBoolean(safeContract.synthetic),
    reviewOnly: normalizeBoolean(safeContract.reviewOnly),
    status: normalizeString(safeContract.status),
    decision: normalizeString(safeContract.decision),
    approvalStatus: normalizeString(safeContract.approvalStatus),
    executionApproved: normalizeBoolean(safeContract.executionApproved),
    mutated: normalizeBoolean(safeContract.mutated),
    runtimeIntegrated: normalizeBoolean(safeContract.runtimeIntegrated),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    realMemoryScanned: normalizeBoolean(safeContract.realMemoryScanned),
    providerCalls: normalizeInteger(safeContract.providerCalls),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    safeSourceTypes: normalizeStringArray(safeContract.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeContract.unsupportedSourceTypes),
    acceptedForPlanning: normalizeBoolean(safeContract.acceptedForPlanning),
    requiredPairFields: normalizeStringArray(safeContract.requiredPairFields),
    supportedLinkColumns: normalizeStringArray(safeContract.supportedLinkColumns),
    seamProperties: normalizeSeamProperties(safeContract.seamProperties),
    requiredApprovals: normalizeStringArray(safeContract.requiredApprovals),
    blockers: normalizeStringArray(safeContract.blockers),
    safety: normalizeSafety(safeContract.safety),
    requiredWording: normalizeStringArray(safeContract.requiredWording),
    forbiddenClaims: normalizeStringArray(safeContract.forbiddenClaims),
    evidenceSources: normalizeStringArray(safeContract.evidenceSources),
    next: normalizeString(safeContract.next)
  };
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    hasEveryValue(values, requiredValues);
}

function summarizeMemorySupersedeShadowSeamContract(contract = {}) {
  const normalized = normalizeMemorySupersedeShadowSeamContract(contract);
  const schemaVersionSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const unsupportedSourceTypes = normalized.acceptedSourceTypes
    .filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const unsupportedDeclaredSafeSourceTypes = normalized.safeSourceTypes
    .filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const sourceTypesWhitelisted =
    hasExactSet(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES) &&
    hasExactSet(normalized.safeSourceTypes, SAFE_SOURCE_TYPES) &&
    unsupportedSourceTypes.length === 0 &&
    unsupportedDeclaredSafeSourceTypes.length === 0 &&
    normalized.unsupportedSourceTypes.length === 0;
  const requiredPairFieldsPresent = hasEveryValue(normalized.requiredPairFields, REQUIRED_PAIR_FIELDS);
  const requiredPairFieldsExact = hasExactSet(normalized.requiredPairFields, REQUIRED_PAIR_FIELDS);
  const supportedLinkColumnsPresent = hasEveryValue(normalized.supportedLinkColumns, REQUIRED_LINK_COLUMNS);
  const supportedLinkColumnsExact = hasExactSet(normalized.supportedLinkColumns, REQUIRED_LINK_COLUMNS);
  const blockersPresent = hasEveryValue(normalized.blockers, REQUIRED_BLOCKERS);
  const blockersExact = hasExactSet(normalized.blockers, REQUIRED_BLOCKERS);
  const approvalsPresent = hasEveryValue(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const approvalsExact = hasExactSet(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const seamPropertiesBlocked =
    normalized.seamProperties.requiresTwoRecordGuard === true &&
    normalized.seamProperties.singleRecordReuseAllowed === false &&
    normalized.seamProperties.oldRecordLifecycleWriteRequired === true &&
    normalized.seamProperties.newRecordLifecycleWriteRequired === true &&
    normalized.seamProperties.bidirectionalLinkWriteRequired === true &&
    normalized.seamProperties.sharedPolicyGuardRequired === true &&
    normalized.seamProperties.sharedCorrelationIdRequired === true &&
    normalized.seamProperties.atomicPairOutcomeRequired === true &&
    normalized.seamProperties.rollbackPreviewRequired === true &&
    normalized.seamProperties.runtimeImplemented === false &&
    normalized.seamProperties.executionApproved === false &&
    normalized.seamProperties.mutated === false;
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false;
  const decisionBlocked =
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.approvalStatus === 'BLOCKED_PENDING_APPROVAL';
  const noRuntimeClaims =
    normalized.executionApproved === false &&
    normalized.mutated === false &&
    normalized.runtimeIntegrated === false &&
    normalized.publicMcpExpanded === false &&
    normalized.realMemoryScanned === false &&
    normalized.providerCalls === 0;
  const acceptedForPlanning =
    schemaVersionSafe &&
    versionSafe &&
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.reviewOnly === true &&
    normalized.acceptedForPlanning === true &&
    sourceTypesWhitelisted &&
    requiredPairFieldsExact &&
    supportedLinkColumnsExact &&
    seamPropertiesBlocked &&
    blockersExact &&
    approvalsExact &&
    publicMcpFrozen &&
    safetyFlagsClear &&
    decisionBlocked &&
    noRuntimeClaims;

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    phase: normalized.phase,
    acceptedForPlanning,
    decision: normalized.decision || 'NOT_READY_BLOCKED',
    approvalStatus: normalized.approvalStatus || 'BLOCKED_PENDING_APPROVAL',
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    mutated: false,
    realMemoryScanned: false,
    sourceContract: {
      safe: sourceTypesWhitelisted,
      safeSourceTypes: SAFE_SOURCE_TYPES,
      acceptedSourceTypes: normalized.acceptedSourceTypes,
      sourceTypesWhitelisted,
      unsupportedSourceTypes: [
        ...new Set([
          ...normalized.unsupportedSourceTypes,
          ...unsupportedSourceTypes,
          ...unsupportedDeclaredSafeSourceTypes
        ])
      ]
    },
    requiredPairFields: {
      count: normalized.requiredPairFields.length,
      ids: normalized.requiredPairFields,
      requiredPresent: requiredPairFieldsPresent,
      exact: requiredPairFieldsExact,
      missingRequired: REQUIRED_PAIR_FIELDS.filter(field => !normalized.requiredPairFields.includes(field))
    },
    supportedLinkColumns: {
      count: normalized.supportedLinkColumns.length,
      ids: normalized.supportedLinkColumns,
      requiredPresent: supportedLinkColumnsPresent,
      exact: supportedLinkColumnsExact,
      missingRequired: REQUIRED_LINK_COLUMNS.filter(column => !normalized.supportedLinkColumns.includes(column))
    },
    seamProperties: {
      ...normalized.seamProperties,
      blocked: seamPropertiesBlocked
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    blockers: {
      count: normalized.blockers.length,
      ids: normalized.blockers,
      requiredPresent: blockersPresent,
      exact: blockersExact,
      missingRequired: REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker))
    },
    requiredApprovals: {
      count: normalized.requiredApprovals.length,
      ids: normalized.requiredApprovals,
      requiredPresent: approvalsPresent,
      exact: approvalsExact,
      missingRequired: REQUIRED_APPROVALS.filter(approval => !normalized.requiredApprovals.includes(approval))
    },
    safety: {
      noSideEffects: safetyFlagsClear,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_LINK_COLUMNS,
  REQUIRED_PAIR_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeMemorySupersedeShadowSeamContract,
  summarizeMemorySupersedeShadowSeamContract
};
