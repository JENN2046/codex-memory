const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const EXPECTED_SCHEMA_VERSION = 'memory-supersede-pair-outcome-v1';
const EXPECTED_VERSION = 'v1';

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_doc',
  'committed_fixture',
  'committed_test',
  'explicit_input',
  'static_report_shape',
  'local_validation_summary'
]);

const REQUIRED_PAIR_OUTCOME_FIELDS = Object.freeze([
  'oldMemoryId',
  'newMemoryId',
  'intentEventId',
  'committedEventId',
  'cancelledEventId',
  'pairCorrelationId',
  'oldPreviousSnapshotRef',
  'newPreviousSnapshotRef',
  'oldFromStatus',
  'oldToStatus',
  'newFromStatus',
  'newToStatus',
  'supersededByLink',
  'supersedesLink',
  'actorClientId',
  'requestSource',
  'reason',
  'evidence',
  'createdAt'
]);

const REQUIRED_EVENT_PHASES = Object.freeze([
  'pending',
  'committed',
  'cancelled'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'supersede_pair_outcome_helper_not_implemented',
  'supersede_audit_correlation_helper_not_implemented',
  'supersede_runtime_prep_not_implemented',
  'internal_supersede_service_not_implemented',
  'durable_audit_write_not_approved',
  'public_mcp_governance_expansion_not_approved',
  'v1_rc_not_ready_blocked'
]);

const REQUIRED_APPROVALS = Object.freeze([
  'supersede_pair_outcome_helper_implementation',
  'supersede_audit_correlation_helper_implementation',
  'supersession_runtime_prep',
  'internal_supersede_service_apply',
  'durable_audit_write',
  'public_mcp_governance_expansion',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeImplementation',
  'noDurableAuditWrite',
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

function normalizeOutcomeProperties(properties = {}) {
  const safeProperties = isPlainObject(properties) ? properties : {};
  return {
    pairIntentRequired: normalizeBoolean(safeProperties.pairIntentRequired),
    pairCommittedFollowUpRequired: normalizeBoolean(safeProperties.pairCommittedFollowUpRequired),
    pairCancelledFollowUpRequired: normalizeBoolean(safeProperties.pairCancelledFollowUpRequired),
    sharedCorrelationIdRequired: normalizeBoolean(safeProperties.sharedCorrelationIdRequired),
    dualPreviousSnapshotRefsRequired: normalizeBoolean(safeProperties.dualPreviousSnapshotRefsRequired),
    dualLifecycleTransitionsRequired: normalizeBoolean(safeProperties.dualLifecycleTransitionsRequired),
    bidirectionalLinkFieldsRequired: normalizeBoolean(safeProperties.bidirectionalLinkFieldsRequired),
    pairAtomicityRequired: normalizeBoolean(safeProperties.pairAtomicityRequired),
    singleRecordAuditReuseAllowed: normalizeBoolean(safeProperties.singleRecordAuditReuseAllowed),
    runtimeImplemented: normalizeBoolean(safeProperties.runtimeImplemented),
    executionApproved: normalizeBoolean(safeProperties.executionApproved),
    durableAuditWritten: normalizeBoolean(safeProperties.durableAuditWritten),
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

function normalizeMemorySupersedePairOutcomeContract(contract = {}) {
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
    durableAuditWritten: normalizeBoolean(safeContract.durableAuditWritten),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    realMemoryScanned: normalizeBoolean(safeContract.realMemoryScanned),
    providerCalls: normalizeInteger(safeContract.providerCalls),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    safeSourceTypes: normalizeStringArray(safeContract.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeContract.unsupportedSourceTypes),
    acceptedForPlanning: normalizeBoolean(safeContract.acceptedForPlanning),
    requiredPairOutcomeFields: normalizeStringArray(safeContract.requiredPairOutcomeFields),
    requiredEventPhases: normalizeStringArray(safeContract.requiredEventPhases),
    outcomeProperties: normalizeOutcomeProperties(safeContract.outcomeProperties),
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

function summarizeMemorySupersedePairOutcomeContract(contract = {}) {
  const normalized = normalizeMemorySupersedePairOutcomeContract(contract);
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
  const requiredPairOutcomeFieldsPresent =
    hasEveryValue(normalized.requiredPairOutcomeFields, REQUIRED_PAIR_OUTCOME_FIELDS);
  const requiredPairOutcomeFieldsExact =
    hasExactSet(normalized.requiredPairOutcomeFields, REQUIRED_PAIR_OUTCOME_FIELDS);
  const requiredEventPhasesPresent =
    hasEveryValue(normalized.requiredEventPhases, REQUIRED_EVENT_PHASES);
  const requiredEventPhasesExact =
    hasExactSet(normalized.requiredEventPhases, REQUIRED_EVENT_PHASES);
  const blockersPresent = hasEveryValue(normalized.blockers, REQUIRED_BLOCKERS);
  const blockersExact = hasExactSet(normalized.blockers, REQUIRED_BLOCKERS);
  const approvalsPresent = hasEveryValue(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const approvalsExact = hasExactSet(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const outcomePropertiesBlocked =
    normalized.outcomeProperties.pairIntentRequired === true &&
    normalized.outcomeProperties.pairCommittedFollowUpRequired === true &&
    normalized.outcomeProperties.pairCancelledFollowUpRequired === true &&
    normalized.outcomeProperties.sharedCorrelationIdRequired === true &&
    normalized.outcomeProperties.dualPreviousSnapshotRefsRequired === true &&
    normalized.outcomeProperties.dualLifecycleTransitionsRequired === true &&
    normalized.outcomeProperties.bidirectionalLinkFieldsRequired === true &&
    normalized.outcomeProperties.pairAtomicityRequired === true &&
    normalized.outcomeProperties.singleRecordAuditReuseAllowed === false &&
    normalized.outcomeProperties.runtimeImplemented === false &&
    normalized.outcomeProperties.executionApproved === false &&
    normalized.outcomeProperties.durableAuditWritten === false &&
    normalized.outcomeProperties.mutated === false;
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false;
  const decisionBlocked =
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.reviewOnly === true &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.approvalStatus === 'BLOCKED_PENDING_APPROVAL' &&
    normalized.executionApproved === false &&
    normalized.mutated === false &&
    normalized.runtimeIntegrated === false &&
    normalized.durableAuditWritten === false &&
    normalized.publicMcpExpanded === false &&
    normalized.realMemoryScanned === false &&
    normalized.providerCalls === 0;
  const wordingPresent =
    normalized.requiredWording.some(line => line.includes('does not implement pair-outcome audit follow-up')) &&
    normalized.requiredWording.some(line => line.includes('shared correlation id')) &&
    normalized.requiredWording.some(line => line.includes('BLOCKED_PENDING_APPROVAL')) &&
    normalized.requiredWording.some(line => line.includes('Public MCP tools remain frozen')) &&
    normalized.requiredWording.some(line => line.includes('v1.0 RC remains NOT_READY_BLOCKED'));
  const claimsBlocked =
    normalized.forbiddenClaims.includes('supersede pair-outcome audit helper is implemented') &&
    normalized.forbiddenClaims.includes('single-record audit reuse is sufficient for supersede') &&
    normalized.forbiddenClaims.includes('public MCP supersede expansion is approved') &&
    normalized.forbiddenClaims.includes('v1.0 RC readiness is unblocked');
  const evidenceSourcesPresent = normalized.evidenceSources.length >= 4;
  const acceptedForContractHelper =
    schemaVersionSafe &&
    versionSafe &&
    sourceTypesWhitelisted &&
    requiredPairOutcomeFieldsPresent &&
    requiredPairOutcomeFieldsExact &&
    requiredEventPhasesPresent &&
    requiredEventPhasesExact &&
    blockersPresent &&
    blockersExact &&
    approvalsPresent &&
    approvalsExact &&
    publicMcpFrozen &&
    outcomePropertiesBlocked &&
    safetyFlagsClear &&
    decisionBlocked &&
    wordingPresent &&
    claimsBlocked &&
    evidenceSourcesPresent &&
    normalized.acceptedForPlanning === true;

  return {
    acceptedForContractHelper,
    schemaVersionSafe,
    versionSafe,
    sourceTypesWhitelisted,
    requiredPairOutcomeFieldsPresent,
    requiredPairOutcomeFieldsExact,
    requiredEventPhasesPresent,
    requiredEventPhasesExact,
    blockersPresent,
    blockersExact,
    approvalsPresent,
    approvalsExact,
    publicMcpFrozen,
    outcomePropertiesBlocked,
    safetyFlagsClear,
    decisionBlocked,
    wordingPresent,
    claimsBlocked,
    evidenceSourcesPresent,
    next: normalized.next,
    blockers: {
      unsupportedSourceTypes,
      unsupportedDeclaredSafeSourceTypes
    }
  };
}

module.exports = {
  normalizeMemorySupersedePairOutcomeContract,
  summarizeMemorySupersedePairOutcomeContract
};
