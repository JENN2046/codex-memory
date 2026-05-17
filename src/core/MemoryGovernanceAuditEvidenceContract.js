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

const REQUIRED_EVENT_FAMILY_IDS = Object.freeze([
  'memory_proposal_accept',
  'memory_proposal_reject',
  'memory_supersede',
  'memory_tombstone',
  'memory_validate_internal',
  'governance_approval_decision',
  'governance_report_write',
  'governance_backup_created',
  'governance_restore_performed',
  'public_mcp_governance_expansion_review'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'phaseId',
  'governedActionId',
  'eventFamily',
  'status',
  'approvalPacketRef',
  'sourceEvidence',
  'sourceType',
  'redactedSubjectRefs',
  'lifecycleSummary',
  'actorPolicy',
  'reviewerPolicy',
  'reason',
  'evidenceSummary',
  'publicMcpImpact',
  'durableWriteSurface',
  'backupOrRollbackRequirement',
  'validationEvidence',
  'mutated',
  'stopConditions',
  'executionApprovalStatement'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'audit_writer_not_implemented',
  'durable_audit_write_not_approved',
  'governed_action_execution_not_approved',
  'runtime_governance_integration_not_implemented',
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
  'audit_writer_implementation',
  'durable_audit_write',
  'proposal_accept_reject',
  'supersession_tombstone',
  'validate_memory_internal_apply',
  'governance_report_write',
  'backup_restore',
  'public_mcp_governance_expansion',
  'provider_service_config_action',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noAuditWriterImplementation',
  'noDurableAuditWrite',
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

function normalizeEventFamily(eventFamily = {}) {
  const safeEventFamily = isPlainObject(eventFamily) ? eventFamily : {};

  return {
    id: normalizeString(safeEventFamily.id),
    status: normalizeString(safeEventFamily.status),
    requiresExplicitApproval: normalizeBoolean(safeEventFamily.requiresExplicitApproval),
    executionApproved: normalizeBoolean(safeEventFamily.executionApproved),
    durableAuditWritten: normalizeBoolean(safeEventFamily.durableAuditWritten),
    mutated: normalizeBoolean(safeEventFamily.mutated),
    publicMcpTool: normalizeBoolean(safeEventFamily.publicMcpTool),
    publicMcpExpanded: normalizeBoolean(safeEventFamily.publicMcpExpanded),
    backupCreated: normalizeBoolean(safeEventFamily.backupCreated),
    restorePerformed: normalizeBoolean(safeEventFamily.restorePerformed),
    hardDeleteAllowed: normalizeBoolean(safeEventFamily.hardDeleteAllowed)
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

function normalizeMemoryGovernanceAuditEvidenceContract(contract = {}) {
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
    auditWriterImplemented: normalizeBoolean(safeContract.auditWriterImplemented),
    durableAuditWritten: normalizeBoolean(safeContract.durableAuditWritten),
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
    requiredEvidenceFields: normalizeStringArray(safeContract.requiredEvidenceFields),
    eventFamilies: cloneArray(safeContract.eventFamilies).map(normalizeEventFamily),
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

function hasBlockedEventFamilies(eventFamilies) {
  return eventFamilies.every(eventFamily =>
    eventFamily.status === 'BLOCKED_PENDING_APPROVAL' &&
    eventFamily.requiresExplicitApproval === true &&
    eventFamily.executionApproved === false &&
    eventFamily.durableAuditWritten === false
  );
}

function summarizeMemoryGovernanceAuditEvidenceContract(contract = {}) {
  const normalized = normalizeMemoryGovernanceAuditEvidenceContract(contract);
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
  const eventFamilyIds = normalized.eventFamilies.map(eventFamily => eventFamily.id).filter(Boolean);
  const requiredEventFamiliesPresent = hasEveryValue(eventFamilyIds, REQUIRED_EVENT_FAMILY_IDS);
  const requiredEvidenceFieldsPresent =
    hasEveryValue(normalized.requiredEvidenceFields, REQUIRED_EVIDENCE_FIELDS);
  const requiredBlockersPresent = hasEveryValue(normalized.blockers, REQUIRED_BLOCKERS);
  const requiredApprovalsPresent = hasEveryValue(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const eventFamiliesBlocked = hasBlockedEventFamilies(normalized.eventFamilies);
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
    normalized.auditWriterImplemented === false &&
    normalized.durableAuditWritten === false &&
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
    requiredEventFamiliesPresent &&
    requiredEvidenceFieldsPresent &&
    requiredBlockersPresent &&
    requiredApprovalsPresent &&
    eventFamiliesBlocked &&
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
    auditWriterImplemented: false,
    durableAuditWritten: false,
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
    requiredEvidenceFields: {
      count: normalized.requiredEvidenceFields.length,
      ids: normalized.requiredEvidenceFields,
      requiredPresent: requiredEvidenceFieldsPresent,
      missingRequired: REQUIRED_EVIDENCE_FIELDS.filter(field =>
        !normalized.requiredEvidenceFields.includes(field)
      )
    },
    eventFamilies: {
      count: eventFamilyIds.length,
      ids: eventFamilyIds,
      requiredPresent: requiredEventFamiliesPresent,
      blocked: eventFamiliesBlocked,
      missingRequired: REQUIRED_EVENT_FAMILY_IDS.filter(id => !eventFamilyIds.includes(id))
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools,
      validateMemoryInternalOnly:
        normalized.eventFamilies.some(eventFamily =>
          eventFamily.id === 'memory_validate_internal' &&
          eventFamily.publicMcpTool === false
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
      writesDurableAudit: false,
      scansRealMemory: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed
    }
  };
}

module.exports = {
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_EVENT_FAMILY_IDS,
  REQUIRED_EVIDENCE_FIELDS,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceAuditEvidenceContract,
  summarizeMemoryGovernanceAuditEvidenceContract
};
