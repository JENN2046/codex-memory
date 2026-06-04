const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const EXPECTED_SCHEMA_VERSION = 'durable-governance-mutation-packet-v1';
const EXPECTED_VERSION = 'v1';

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_doc',
  'committed_fixture',
  'committed_test',
  'explicit_input',
  'static_report_shape',
  'local_validation_summary'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'phaseId',
  'mutationFamily',
  'targetMemoryIds',
  'scopeTuple',
  'actorClientId',
  'requestSource',
  'reason',
  'evidenceSummary',
  'lifecycleTransition',
  'auditIntentPolicy',
  'auditCommitPolicy',
  'projectionPolicy',
  'revisionEmitter',
  'changedMemoryIdsPolicy',
  'rollbackPath',
  'validationMode',
  'executionApprovalStatement'
]);

const REQUIRED_MUTATION_PACKET_IDS = Object.freeze([
  'memory_validate',
  'memory_supersede',
  'memory_tombstone',
  'memory_exclude',
  'memory_forget'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'durable_governance_runtime_apply_not_implemented',
  'append_only_audit_writer_runtime_not_implemented',
  'shadow_projection_runtime_not_implemented',
  'sqlite_schema_apply_not_approved',
  'public_mcp_governance_expansion_not_approved',
  'real_memory_governance_preview_blocked',
  'provider_service_config_action_blocked',
  'push_tag_release_deploy_blocked',
  'v1_rc_not_ready_blocked'
]);

const REQUIRED_APPROVALS = Object.freeze([
  'durable_governance_runtime_apply',
  'append_only_audit_write',
  'shadow_projection_update',
  'sqlite_schema_apply',
  'real_memory_governance_preview',
  'public_mcp_governance_expansion',
  'provider_service_config_action',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeGovernanceMutation',
  'noDurableAuditWrite',
  'noDurableMemoryWrite',
  'noPublicMcpExpansion',
  'noRealMemoryScan',
  'noSqliteSchemaApply',
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

function normalizeMutationPacket(packet = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};

  return {
    id: normalizeString(safePacket.id),
    status: normalizeString(safePacket.status),
    requiresExplicitApproval: normalizeBoolean(safePacket.requiresExplicitApproval),
    requiredFields: normalizeStringArray(safePacket.requiredFields),
    executionApproved: normalizeBoolean(safePacket.executionApproved),
    internalOnly: normalizeBoolean(safePacket.internalOnly),
    publicMcpTool: normalizeBoolean(safePacket.publicMcpTool),
    appendOnlyAuditRequired: normalizeBoolean(safePacket.appendOnlyAuditRequired),
    shadowProjectionRequired: normalizeBoolean(safePacket.shadowProjectionRequired),
    revisionEmissionRequired: normalizeBoolean(safePacket.revisionEmissionRequired),
    changedMemoryIdsRequired: normalizeBoolean(safePacket.changedMemoryIdsRequired),
    mutated: normalizeBoolean(safePacket.mutated),
    hardDeleteAllowed: normalizeBoolean(safePacket.hardDeleteAllowed),
    targetCardinality: normalizeString(safePacket.targetCardinality)
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

function normalizeDurableGovernanceMutationPacketContract(contract = {}) {
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
    requiredPacketFields: normalizeStringArray(safeContract.requiredPacketFields),
    mutationPackets: cloneArray(safeContract.mutationPackets).map(normalizeMutationPacket),
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

function summarizeDurableGovernanceMutationPacketContract(contract = {}) {
  const normalized = normalizeDurableGovernanceMutationPacketContract(contract);
  const safeSourceTypes = SAFE_SOURCE_TYPES;
  const schemaVersionSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const unsupportedSourceTypes = normalized.acceptedSourceTypes
    .filter(sourceType => !safeSourceTypes.includes(sourceType));
  const unsupportedDeclaredSafeSourceTypes = normalized.safeSourceTypes
    .filter(sourceType => !safeSourceTypes.includes(sourceType));
  const sourceTypesWhitelisted =
    hasExactSet(normalized.acceptedSourceTypes, safeSourceTypes) &&
    hasExactSet(normalized.safeSourceTypes, safeSourceTypes) &&
    unsupportedSourceTypes.length === 0 &&
    unsupportedDeclaredSafeSourceTypes.length === 0 &&
    normalized.unsupportedSourceTypes.length === 0;
  const packetIds = normalized.mutationPackets.map(packet => packet.id).filter(Boolean);
  const requiredPacketFieldsPresent = hasEveryValue(normalized.requiredPacketFields, REQUIRED_PACKET_FIELDS);
  const requiredMutationPacketsPresent = hasEveryValue(packetIds, REQUIRED_MUTATION_PACKET_IDS);
  const packetFieldsExact = hasExactSet(normalized.requiredPacketFields, REQUIRED_PACKET_FIELDS);
  const mutationPacketsExact = hasExactSet(packetIds, REQUIRED_MUTATION_PACKET_IDS);
  const mutationPacketsBlocked = normalized.mutationPackets.every(packet =>
    packet.status === 'BLOCKED_PENDING_APPROVAL' &&
    packet.requiresExplicitApproval === true &&
    packet.executionApproved === false &&
    packet.mutated === false &&
    packet.publicMcpTool === false
  );
  const requiredBlockersPresent = hasEveryValue(normalized.blockers, REQUIRED_BLOCKERS);
  const requiredApprovalsPresent = hasEveryValue(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const blockersExact = hasExactSet(normalized.blockers, REQUIRED_BLOCKERS);
  const approvalsExact = hasExactSet(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false;
  const decisionBlocked = normalized.decision === 'NOT_READY_BLOCKED';
  const approvalBlocked = normalized.approvalStatus === 'BLOCKED_PENDING_APPROVAL';
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
    normalized.reviewOnly === true &&
    normalized.synthetic === true &&
    normalized.acceptedForPlanning === true &&
    sourceTypesWhitelisted &&
    packetFieldsExact &&
    mutationPacketsExact &&
    mutationPacketsBlocked &&
    blockersExact &&
    approvalsExact &&
    publicMcpFrozen &&
    safetyFlagsClear &&
    decisionBlocked &&
    approvalBlocked &&
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
      safeSourceTypes,
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
    requiredPacketFields: {
      count: normalized.requiredPacketFields.length,
      ids: normalized.requiredPacketFields,
      requiredPresent: requiredPacketFieldsPresent,
      exact: packetFieldsExact,
      missingRequired: REQUIRED_PACKET_FIELDS.filter(field => !normalized.requiredPacketFields.includes(field))
    },
    mutationPackets: {
      count: packetIds.length,
      ids: packetIds,
      requiredPresent: requiredMutationPacketsPresent,
      exact: mutationPacketsExact,
      blocked: mutationPacketsBlocked,
      missingRequired: REQUIRED_MUTATION_PACKET_IDS.filter(id => !packetIds.includes(id))
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    blockers: {
      count: normalized.blockers.length,
      ids: normalized.blockers,
      requiredPresent: requiredBlockersPresent,
      exact: blockersExact,
      missingRequired: REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker))
    },
    requiredApprovals: {
      count: normalized.requiredApprovals.length,
      ids: normalized.requiredApprovals,
      requiredPresent: requiredApprovalsPresent,
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
  REQUIRED_MUTATION_PACKET_IDS,
  REQUIRED_PACKET_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeDurableGovernanceMutationPacketContract,
  summarizeDurableGovernanceMutationPacketContract
};
