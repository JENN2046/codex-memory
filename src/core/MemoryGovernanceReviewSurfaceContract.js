const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const EXPECTED_SCHEMA_VERSION = 'memory-governance-review-surface-v1';
const EXPECTED_VERSION = 'v1';

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_doc',
  'committed_fixture',
  'committed_test',
  'explicit_input',
  'static_report_shape',
  'local_git_status',
  'local_validation_summary'
]);

const REQUIRED_SOURCE_SURFACES = Object.freeze([
  'lifecycle_contract',
  'approval_packet',
  'audit_evidence',
  'admin_review_surface',
  'validation_aggregator_report_shape'
]);

const REQUIRED_REVIEW_SECTIONS = Object.freeze([
  'lifecycleReview',
  'approvalReview',
  'auditEvidenceReview',
  'adminReviewSurface',
  'aggregatorReview'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'runtime_governance_integration_not_implemented',
  'governed_action_execution_not_approved',
  'audit_writer_not_implemented',
  'durable_audit_write_not_approved',
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
  'runtime_governance_integration',
  'governed_action_execution',
  'audit_writer_implementation',
  'durable_audit_write',
  'durable_memory_mutation',
  'public_mcp_governance_expansion',
  'real_memory_scan_export_import',
  'migration_import_export_apply',
  'backup_restore',
  'provider_service_config_action',
  'push_tag_release_deploy'
]);

const REQUIRED_LIFECYCLE_CASES = Object.freeze([
  'proposal_accept',
  'proposal_reject',
  'supersession_deferred',
  'tombstone_deferred',
  'validate_memory_internal'
]);

const REQUIRED_APPROVAL_ACTIONS = Object.freeze([
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

const REQUIRED_AUDIT_EVENT_FAMILIES = Object.freeze([
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

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeGovernanceIntegration',
  'noGovernedActionExecution',
  'noAuditWriterImplementation',
  'noDurableAuditWrite',
  'noDurableMemoryWrite',
  'noPublicMcpExpansion',
  'noRealMemoryScan',
  'noGovernanceReportExecution',
  'noRealDbReviewExecution',
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

function normalizeSourceSurface(surface = {}) {
  const safeSurface = isPlainObject(surface) ? surface : {};

  return {
    id: normalizeString(safeSurface.id),
    sourceType: normalizeString(safeSurface.sourceType),
    artifacts: normalizeStringArray(safeSurface.artifacts),
    acceptedForPlanning: normalizeBoolean(safeSurface.acceptedForPlanning),
    helperExecuted: normalizeBoolean(safeSurface.helperExecuted),
    fixtureReadByRuntime: normalizeBoolean(safeSurface.fixtureReadByRuntime),
    runtimeIntegrated: normalizeBoolean(safeSurface.runtimeIntegrated),
    executionApproved: normalizeBoolean(safeSurface.executionApproved),
    durableAuditWritten: normalizeBoolean(safeSurface.durableAuditWritten),
    governanceReportExecuted: normalizeBoolean(safeSurface.governanceReportExecuted),
    realDbReviewExecuted: normalizeBoolean(safeSurface.realDbReviewExecuted),
    unavailableSourceShapeRequired: normalizeBoolean(safeSurface.unavailableSourceShapeRequired),
    aggregatorExecutedHelpers: normalizeBoolean(safeSurface.aggregatorExecutedHelpers),
    fixtureReadByAggregator: normalizeBoolean(safeSurface.fixtureReadByAggregator)
  };
}

function normalizeReviewSections(reviewSections = {}) {
  const sections = isPlainObject(reviewSections) ? reviewSections : {};
  const lifecycleReview = isPlainObject(sections.lifecycleReview) ? sections.lifecycleReview : {};
  const approvalReview = isPlainObject(sections.approvalReview) ? sections.approvalReview : {};
  const auditEvidenceReview = isPlainObject(sections.auditEvidenceReview)
    ? sections.auditEvidenceReview
    : {};
  const adminReviewSurface = isPlainObject(sections.adminReviewSurface)
    ? sections.adminReviewSurface
    : {};
  const aggregatorReview = isPlainObject(sections.aggregatorReview) ? sections.aggregatorReview : {};

  return {
    lifecycleReview: {
      status: normalizeString(lifecycleReview.status),
      visibleCases: normalizeStringArray(lifecycleReview.visibleCases),
      runtimeIntegrated: normalizeBoolean(lifecycleReview.runtimeIntegrated),
      mutated: normalizeBoolean(lifecycleReview.mutated)
    },
    approvalReview: {
      status: normalizeString(approvalReview.status),
      visibleActions: normalizeStringArray(approvalReview.visibleActions),
      executionApproved: normalizeBoolean(approvalReview.executionApproved),
      mutated: normalizeBoolean(approvalReview.mutated)
    },
    auditEvidenceReview: {
      status: normalizeString(auditEvidenceReview.status),
      visibleEventFamilies: normalizeStringArray(auditEvidenceReview.visibleEventFamilies),
      auditWriterImplemented: normalizeBoolean(auditEvidenceReview.auditWriterImplemented),
      durableAuditWritten: normalizeBoolean(auditEvidenceReview.durableAuditWritten)
    },
    adminReviewSurface: {
      status: normalizeString(adminReviewSurface.status),
      sourceCommandsDocumented: normalizeBoolean(adminReviewSurface.sourceCommandsDocumented),
      commandsExecutedByP34: normalizeBoolean(adminReviewSurface.commandsExecutedByP34),
      governanceReportExecuted: normalizeBoolean(adminReviewSurface.governanceReportExecuted),
      realDbReviewExecuted: normalizeBoolean(adminReviewSurface.realDbReviewExecuted),
      unavailableSourceShapeRequired: normalizeBoolean(
        adminReviewSurface.unavailableSourceShapeRequired
      )
    },
    aggregatorReview: {
      status: normalizeString(aggregatorReview.status),
      helpersExecutedByAggregator: normalizeBoolean(aggregatorReview.helpersExecutedByAggregator),
      fixturesReadByAggregator: normalizeBoolean(aggregatorReview.fixturesReadByAggregator),
      canClaimGovernanceRuntimeReady: normalizeBoolean(
        aggregatorReview.canClaimGovernanceRuntimeReady
      ),
      canClaimV1RcReady: normalizeBoolean(aggregatorReview.canClaimV1RcReady)
    }
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
  normalized.authorizationHeaderExposed = normalizeBoolean(safeSafety.authorizationHeaderExposed);
  normalized.apiKeyExposed = normalizeBoolean(safeSafety.apiKeyExposed);

  return normalized;
}

function normalizeMemoryGovernanceReviewSurfaceContract(contract = {}) {
  const safeContract = isPlainObject(contract) ? contract : {};

  return {
    schemaVersion: normalizeString(safeContract.schemaVersion),
    version: normalizeString(safeContract.version),
    phase: normalizeString(safeContract.phase),
    fixtureOnly: normalizeBoolean(safeContract.fixtureOnly),
    synthetic: normalizeBoolean(safeContract.synthetic),
    reviewOnly: normalizeBoolean(safeContract.reviewOnly),
    status: normalizeString(safeContract.status),
    reviewStatus: normalizeString(safeContract.reviewStatus),
    reviewLevel: normalizeString(safeContract.reviewLevel),
    decision: normalizeString(safeContract.decision),
    approvalStatus: normalizeString(safeContract.approvalStatus),
    executionApproved: normalizeBoolean(safeContract.executionApproved),
    mutated: normalizeBoolean(safeContract.mutated),
    runtimeIntegrated: normalizeBoolean(safeContract.runtimeIntegrated),
    governanceReportExecuted: normalizeBoolean(safeContract.governanceReportExecuted),
    realDbReviewExecuted: normalizeBoolean(safeContract.realDbReviewExecuted),
    durableMemoryTouched: normalizeBoolean(safeContract.durableMemoryTouched),
    durableAuditWritten: normalizeBoolean(safeContract.durableAuditWritten),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    realMemoryScanned: normalizeBoolean(safeContract.realMemoryScanned),
    providerCalls: normalizeNumber(safeContract.providerCalls),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    safeSourceTypes: normalizeStringArray(safeContract.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeContract.unsupportedSourceTypes),
    acceptedForPlanning: normalizeBoolean(safeContract.acceptedForPlanning),
    sourceSurfaces: cloneArray(safeContract.sourceSurfaces).map(normalizeSourceSurface),
    reviewSections: normalizeReviewSections(safeContract.reviewSections),
    requiredApprovals: normalizeStringArray(safeContract.requiredApprovals),
    blockers: normalizeStringArray(safeContract.blockers),
    safety: normalizeSafety(safeContract.safety),
    requiredWording: normalizeStringArray(safeContract.requiredWording),
    forbiddenClaims: normalizeStringArray(safeContract.forbiddenClaims),
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

function summarizeReviewSections(reviewSections) {
  const sectionIds = REQUIRED_REVIEW_SECTIONS.filter(section =>
    isPlainObject(reviewSections[section]) &&
    normalizeString(reviewSections[section].status)
  );
  const lifecycleCasesPresent = hasEveryValue(
    reviewSections.lifecycleReview.visibleCases,
    REQUIRED_LIFECYCLE_CASES
  );
  const lifecycleCasesExact = hasExactSet(
    reviewSections.lifecycleReview.visibleCases,
    REQUIRED_LIFECYCLE_CASES
  );
  const approvalActionsPresent = hasEveryValue(
    reviewSections.approvalReview.visibleActions,
    REQUIRED_APPROVAL_ACTIONS
  );
  const approvalActionsExact = hasExactSet(
    reviewSections.approvalReview.visibleActions,
    REQUIRED_APPROVAL_ACTIONS
  );
  const auditEventFamiliesPresent = hasEveryValue(
    reviewSections.auditEvidenceReview.visibleEventFamilies,
    REQUIRED_AUDIT_EVENT_FAMILIES
  );
  const auditEventFamiliesExact = hasExactSet(
    reviewSections.auditEvidenceReview.visibleEventFamilies,
    REQUIRED_AUDIT_EVENT_FAMILIES
  );
  const blocked =
    reviewSections.lifecycleReview.status === 'evidence_only' &&
    reviewSections.lifecycleReview.runtimeIntegrated === false &&
    reviewSections.lifecycleReview.mutated === false &&
    lifecycleCasesExact &&
    reviewSections.approvalReview.status === 'BLOCKED_PENDING_APPROVAL' &&
    reviewSections.approvalReview.executionApproved === false &&
    reviewSections.approvalReview.mutated === false &&
    approvalActionsExact &&
    reviewSections.auditEvidenceReview.status === 'BLOCKED_PENDING_APPROVAL' &&
    reviewSections.auditEvidenceReview.auditWriterImplemented === false &&
    reviewSections.auditEvidenceReview.durableAuditWritten === false &&
    auditEventFamiliesExact &&
    reviewSections.adminReviewSurface.status === 'fixture_backed' &&
    reviewSections.adminReviewSurface.sourceCommandsDocumented === true &&
    reviewSections.adminReviewSurface.commandsExecutedByP34 === false &&
    reviewSections.adminReviewSurface.governanceReportExecuted === false &&
    reviewSections.adminReviewSurface.realDbReviewExecuted === false &&
    reviewSections.adminReviewSurface.unavailableSourceShapeRequired === true &&
    reviewSections.aggregatorReview.status === 'static_report_shape_only' &&
    reviewSections.aggregatorReview.helpersExecutedByAggregator === false &&
    reviewSections.aggregatorReview.fixturesReadByAggregator === false &&
    reviewSections.aggregatorReview.canClaimGovernanceRuntimeReady === false &&
    reviewSections.aggregatorReview.canClaimV1RcReady === false;

  return {
    count: sectionIds.length,
    ids: sectionIds,
    requiredPresent: sectionIds.length === REQUIRED_REVIEW_SECTIONS.length,
    missingRequired: REQUIRED_REVIEW_SECTIONS.filter(section => !sectionIds.includes(section)),
    blocked,
    lifecycleCases: {
      requiredPresent: lifecycleCasesPresent,
      exact: lifecycleCasesExact,
      missingRequired: REQUIRED_LIFECYCLE_CASES.filter(lifecycleCase =>
        !reviewSections.lifecycleReview.visibleCases.includes(lifecycleCase)
      )
    },
    approvalActions: {
      requiredPresent: approvalActionsPresent,
      exact: approvalActionsExact,
      missingRequired: REQUIRED_APPROVAL_ACTIONS.filter(action =>
        !reviewSections.approvalReview.visibleActions.includes(action)
      )
    },
    auditEventFamilies: {
      requiredPresent: auditEventFamiliesPresent,
      exact: auditEventFamiliesExact,
      missingRequired: REQUIRED_AUDIT_EVENT_FAMILIES.filter(eventFamily =>
        !reviewSections.auditEvidenceReview.visibleEventFamilies.includes(eventFamily)
      )
    }
  };
}

function summarizeMemoryGovernanceReviewSurfaceContract(contract = {}) {
  const normalized = normalizeMemoryGovernanceReviewSurfaceContract(contract);
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
  const sourceSurfaceIds = normalized.sourceSurfaces.map(surface => surface.id).filter(Boolean);
  const requiredSourceSurfacesPresent = hasEveryValue(sourceSurfaceIds, REQUIRED_SOURCE_SURFACES);
  const sourceSurfacesExact = hasExactSet(sourceSurfaceIds, REQUIRED_SOURCE_SURFACES);
  const sourceSurfacesSafe = normalized.sourceSurfaces.every(surface =>
    surface.acceptedForPlanning === true &&
    SAFE_SOURCE_TYPES.includes(surface.sourceType) &&
    surface.helperExecuted === false &&
    surface.fixtureReadByRuntime === false &&
    surface.runtimeIntegrated === false &&
    surface.executionApproved === false &&
    surface.durableAuditWritten === false &&
    surface.governanceReportExecuted === false &&
    surface.realDbReviewExecuted === false &&
    surface.aggregatorExecutedHelpers === false &&
    surface.fixtureReadByAggregator === false
  );
  const reviewSummary = summarizeReviewSections(normalized.reviewSections);
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
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.authorizationHeaderExposed === false &&
    normalized.safety.apiKeyExposed === false;
  const decisionBlocked =
    normalized.status === 'blocked' &&
    normalized.reviewStatus === 'evidence_only' &&
    normalized.reviewLevel === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.approvalStatus === 'BLOCKED_PENDING_APPROVAL';
  const noRuntimeClaims =
    normalized.executionApproved === false &&
    normalized.mutated === false &&
    normalized.runtimeIntegrated === false &&
    normalized.governanceReportExecuted === false &&
    normalized.realDbReviewExecuted === false &&
    normalized.durableMemoryTouched === false &&
    normalized.durableAuditWritten === false &&
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
    sourceSurfacesExact &&
    sourceSurfacesSafe &&
    reviewSummary.requiredPresent &&
    reviewSummary.blocked &&
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
    reviewStatus: normalized.reviewStatus || 'evidence_only',
    reviewLevel: normalized.reviewLevel || 'blocked',
    executionApproved: false,
    runtimeIntegrated: false,
    governanceReportExecuted: false,
    realDbReviewExecuted: false,
    durableMemoryTouched: false,
    durableAuditWritten: false,
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
    sourceSurfaces: {
      count: sourceSurfaceIds.length,
      ids: sourceSurfaceIds,
      requiredPresent: requiredSourceSurfacesPresent,
      exact: sourceSurfacesExact,
      safe: sourceSurfacesSafe,
      missingRequired: REQUIRED_SOURCE_SURFACES.filter(surface => !sourceSurfaceIds.includes(surface))
    },
    reviewSections: reviewSummary,
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
      executesGovernanceReport: false,
      reviewsRealDb: false,
      scansRealMemory: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed,
      authorizationHeaderExposed: normalized.safety.authorizationHeaderExposed,
      apiKeyExposed: normalized.safety.apiKeyExposed
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_ACTIONS,
  REQUIRED_APPROVALS,
  REQUIRED_AUDIT_EVENT_FAMILIES,
  REQUIRED_BLOCKERS,
  REQUIRED_LIFECYCLE_CASES,
  REQUIRED_REVIEW_SECTIONS,
  REQUIRED_SOURCE_SURFACES,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceReviewSurfaceContract,
  summarizeMemoryGovernanceReviewSurfaceContract
};
