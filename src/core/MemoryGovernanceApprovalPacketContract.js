const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_doc',
  'committed_fixture',
  'committed_test',
  'explicit_input',
  'static_report_shape',
  'local_git_status',
  'local_validation_summary'
]);

const REQUIRED_ACTION_IDS = Object.freeze([
  'proposal_accept',
  'proposal_reject',
  'supersession_apply',
  'tombstone_apply',
  'validate_memory_internal_apply',
  'governance_audit_write',
  'governance_report_write',
  'public_mcp_governance_expansion',
  'real_memory_governance_preview',
  'backup_before_governance_apply',
  'restore_after_governance_apply'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'phaseId',
  'objective',
  'governedAction',
  'actionOwner',
  'approvalOwner',
  'targetSurfaces',
  'sourceEvidence',
  'sourceType',
  'redactionPolicy',
  'lifecycleTransition',
  'auditEventFamily',
  'publicMcpImpact',
  'durableWriteSurfaces',
  'backupRequirement',
  'rollbackPath',
  'validationCommands',
  'stopConditions',
  'approvalScopeStatement'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'runtime_governance_integration_not_implemented',
  'durable_mutation_not_approved',
  'public_mcp_governance_expansion_not_approved',
  'real_memory_scan_blocked',
  'migration_import_export_apply_blocked',
  'backup_restore_blocked',
  'provider_service_config_action_blocked',
  'schema_version_runtime_enforcement_incomplete',
  'validation_aggregator_full_implementation_incomplete',
  'final_rc_matrix_not_executed',
  'v1_rc_not_ready_blocked'
]);

const REQUIRED_APPROVALS = Object.freeze([
  'proposal_accept',
  'proposal_reject',
  'supersession_apply',
  'tombstone_apply',
  'validate_memory_internal_apply',
  'governance_audit_write',
  'governance_report_write',
  'public_mcp_governance_expansion',
  'real_memory_governance_preview',
  'backup_before_governance_apply',
  'restore_after_governance_apply',
  'provider_service_config_action',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeGovernanceIntegration',
  'noDurableMemoryWrite',
  'noPublicMcpExpansion',
  'noRealMemoryScan',
  'noMigrationImportExportApply',
  'noBackupRestore',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noPackageScriptChange',
  'noRemoteWrite'
]);

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

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

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeGovernedAction(action = {}) {
  const safeAction = isPlainObject(action) ? action : {};

  return {
    id: normalizeString(safeAction.id),
    status: normalizeString(safeAction.status),
    requiredFields: normalizeStringArray(safeAction.requiredFields),
    requiresExplicitApproval: normalizeBoolean(safeAction.requiresExplicitApproval),
    executionApproved: normalizeBoolean(safeAction.executionApproved),
    mutated: normalizeBoolean(safeAction.mutated),
    publicMcpTool: normalizeBoolean(safeAction.publicMcpTool),
    publicMcpExpanded: normalizeBoolean(safeAction.publicMcpExpanded),
    realMemoryScanned: normalizeBoolean(safeAction.realMemoryScanned),
    backupCreated: normalizeBoolean(safeAction.backupCreated),
    restorePerformed: normalizeBoolean(safeAction.restorePerformed),
    hardDeleteAllowed: normalizeBoolean(safeAction.hardDeleteAllowed)
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

function normalizeMemoryGovernanceApprovalPacketContract(contract = {}) {
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
    providerCalls: normalizeNumber(safeContract.providerCalls),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    safeSourceTypes: normalizeStringArray(safeContract.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeContract.unsupportedSourceTypes),
    acceptedForPlanning: normalizeBoolean(safeContract.acceptedForPlanning),
    requiredPacketFields: normalizeStringArray(safeContract.requiredPacketFields),
    governedActions: cloneArray(safeContract.governedActions).map(normalizeGovernedAction),
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

function hasBlockedGovernedActions(actions) {
  return actions.every(action =>
    action.status === 'BLOCKED_PENDING_APPROVAL' &&
    action.requiresExplicitApproval === true &&
    action.executionApproved === false &&
    action.mutated === false &&
    action.requiredFields.length >= 5
  );
}

function summarizeMemoryGovernanceApprovalPacketContract(contract = {}) {
  const normalized = normalizeMemoryGovernanceApprovalPacketContract(contract);
  const safeSourceTypes = SAFE_SOURCE_TYPES;
  const unsupportedSourceTypes = normalized.acceptedSourceTypes
    .filter(sourceType => !safeSourceTypes.includes(sourceType));
  const unsupportedDeclaredSafeSourceTypes = normalized.safeSourceTypes
    .filter(sourceType => !safeSourceTypes.includes(sourceType));
  const sourceTypesWhitelisted =
    normalized.acceptedSourceTypes.length > 0 &&
    unsupportedSourceTypes.length === 0 &&
    unsupportedDeclaredSafeSourceTypes.length === 0 &&
    normalized.unsupportedSourceTypes.length === 0;
  const actionIds = normalized.governedActions.map(action => action.id).filter(Boolean);
  const requiredActionsPresent = hasEveryValue(actionIds, REQUIRED_ACTION_IDS);
  const requiredPacketFieldsPresent =
    hasEveryValue(normalized.requiredPacketFields, REQUIRED_PACKET_FIELDS);
  const requiredBlockersPresent = hasEveryValue(normalized.blockers, REQUIRED_BLOCKERS);
  const requiredApprovalsPresent = hasEveryValue(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const governedActionsBlocked = hasBlockedGovernedActions(normalized.governedActions);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
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
    normalized.fixtureOnly === true &&
    normalized.reviewOnly === true &&
    normalized.synthetic === true &&
    normalized.acceptedForPlanning === true &&
    sourceTypesWhitelisted &&
    requiredActionsPresent &&
    requiredPacketFieldsPresent &&
    requiredBlockersPresent &&
    requiredApprovalsPresent &&
    governedActionsBlocked &&
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
      missingRequired: REQUIRED_PACKET_FIELDS.filter(field =>
        !normalized.requiredPacketFields.includes(field)
      )
    },
    governedActions: {
      count: actionIds.length,
      ids: actionIds,
      requiredPresent: requiredActionsPresent,
      blocked: governedActionsBlocked,
      missingRequired: REQUIRED_ACTION_IDS.filter(action => !actionIds.includes(action))
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools,
      validateMemoryInternalOnly:
        normalized.governedActions.some(action =>
          action.id === 'validate_memory_internal_apply' &&
          action.publicMcpTool === false
        )
    },
    blockers: {
      count: normalized.blockers.length,
      ids: normalized.blockers,
      requiredPresent: requiredBlockersPresent,
      missingRequired: REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker))
    },
    requiredApprovals: {
      count: normalized.requiredApprovals.length,
      ids: normalized.requiredApprovals,
      requiredPresent: requiredApprovalsPresent,
      missingRequired: REQUIRED_APPROVALS.filter(approval =>
        !normalized.requiredApprovals.includes(approval)
      )
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
  PUBLIC_MCP_TOOLS,
  REQUIRED_ACTION_IDS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_PACKET_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceApprovalPacketContract,
  summarizeMemoryGovernanceApprovalPacketContract
};
