const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p58-migration-import-export-backup-restore-approval-boundary-v1';
const EXPECTED_POLICY_VERSION = 'p58-approval-framework-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p58-approval-framework-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  'synthetic_fixture',
  'sanitized_metadata'
]);

const DENIED_SOURCE_TYPES = Object.freeze([
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'real_recall_audit',
  'operator_free_text',
  'provider_output'
]);

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p27_migration_import_export_approval_packet_contract',
  'p39_synthetic_migration_dry_run_contract',
  'p43_recall_migration_isolation_helper',
  'p55_evidence_runtime_trace_contract',
  'p57_recall_isolation_runtime_proof_helper'
]);

const REQUIRED_FRAMEWORK_STAGE_IDS = Object.freeze([
  'source_scope_review',
  'migration_plan_review',
  'import_export_plan_review',
  'backup_plan_review',
  'restore_plan_review',
  'parity_and_rollback_readiness_review',
  'approval_packet_review',
  'failure_path_review',
  'execution_gate'
]);

const REQUIRED_APPROVAL_STATE_IDS = Object.freeze([
  'not_requested',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired',
  'approval_scope_mismatch',
  'reviewed_not_executable',
  'approved_but_a5_blocked'
]);

const PLANNING_APPROVAL_STATE_IDS = Object.freeze([
  'not_requested',
  'reviewed_not_executable',
  'approved_but_a5_blocked'
]);

const REQUIRED_APPROVAL_EVIDENCE = Object.freeze([
  'source_scope_evidence',
  'actor_scope_evidence',
  'operation_plan',
  'dry_run_report',
  'parity_report',
  'rollback_readiness_report',
  'backup_plan',
  'restore_plan',
  'redaction_report',
  'no_real_data_access_report',
  'explicit_a5_authorization_packet',
  'post_action_validation_plan',
  'failure_path_plan'
]);

const REQUIRED_FAIL_CLOSED_STATES = Object.freeze([
  'missing',
  'unknown',
  'skipped',
  'warning',
  'warning_only',
  'failed',
  'stale',
  'ambiguous',
  'unparsable',
  'unsupported',
  'duplicate',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired',
  'scope_mismatch',
  'source_scope_mismatch',
  'rollback_not_ready',
  'backup_unverified',
  'restore_unverified',
  'real_data_requested',
  'apply_requested'
]);

const REQUIRED_BLOCKED_ACTIONS = Object.freeze([
  'real_memory_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'diary_scan',
  'sqlite_scan',
  'vector_index_scan',
  'candidate_cache_scan',
  'recall_audit_scan',
  'sqlite_migration_apply',
  'import_apply',
  'export_apply',
  'backup_create',
  'restore_perform',
  'approval_execution',
  'durable_memory_write',
  'durable_audit_write',
  'provider_call',
  'service_start',
  'config_switch',
  'watchdog_install',
  'public_mcp_expansion',
  'dependency_change',
  'push_tag_release_deploy'
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

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function collectDuplicateValues(values) {
  return uniqueValues(values).filter(value => values.filter(candidate => candidate === value).length > 1);
}

function hasExactSet(values, expectedValues) {
  return values.length === expectedValues.length &&
    uniqueValues(values).length === values.length &&
    expectedValues.every(value => values.includes(value));
}

function normalizeSourceEvidence(source = {}) {
  const safeSource = isPlainObject(source) ? source : {};

  return {
    id: normalizeString(safeSource.id),
    sourceType: normalizeString(safeSource.sourceType),
    artifactRefs: normalizeStringArray(safeSource.artifactRefs),
    runtimeAuthority: normalizeBoolean(safeSource.runtimeAuthority),
    readinessAuthority: normalizeBoolean(safeSource.readinessAuthority),
    executionAuthority: normalizeBoolean(safeSource.executionAuthority)
  };
}

function normalizeFrameworkStage(stage = {}) {
  const safeStage = isPlainObject(stage) ? stage : {};

  return {
    id: normalizeString(safeStage.id),
    operationFamily: normalizeString(safeStage.operationFamily),
    inputMode: normalizeString(safeStage.inputMode),
    acceptedSources: normalizeStringArray(safeStage.acceptedSources),
    executionAllowed: normalizeBoolean(safeStage.executionAllowed),
    durableWriteAllowed: normalizeBoolean(safeStage.durableWriteAllowed),
    requiresExplicitA5Approval: normalizeBoolean(safeStage.requiresExplicitA5Approval)
  };
}

function normalizeApprovalState(state = {}) {
  const safeState = isPlainObject(state) ? state : {};

  return {
    id: normalizeString(safeState.id),
    acceptedForPlanning: normalizeBoolean(safeState.acceptedForPlanning),
    executionAllowed: normalizeBoolean(safeState.executionAllowed)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    readsFilesImplicitly: normalizeBoolean(safeSafety.readsFilesImplicitly),
    scansDirectories: normalizeBoolean(safeSafety.scansDirectories),
    executesCommands: normalizeBoolean(safeSafety.executesCommands),
    startsServices: normalizeBoolean(safeSafety.startsServices),
    callsProviders: normalizeBoolean(safeSafety.callsProviders),
    readsRealMemory: normalizeBoolean(safeSafety.readsRealMemory),
    scansRuntimeStores: normalizeBoolean(safeSafety.scansRuntimeStores),
    writesDurableMemory: normalizeBoolean(safeSafety.writesDurableMemory),
    writesDurableAudit: normalizeBoolean(safeSafety.writesDurableAudit),
    expandsPublicMcp: normalizeBoolean(safeSafety.expandsPublicMcp),
    remoteWrites: normalizeBoolean(safeSafety.remoteWrites),
    rawSensitiveOutputExposed: normalizeBoolean(safeSafety.rawSensitiveOutputExposed)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    localBoundaryInventoryReady: normalizeBoolean(safeReadiness.localBoundaryInventoryReady),
    approvalFrameworkReady: normalizeBoolean(safeReadiness.approvalFrameworkReady),
    approvalExecutionReady: normalizeBoolean(safeReadiness.approvalExecutionReady),
    migrationFrameworkReady: normalizeBoolean(safeReadiness.migrationFrameworkReady),
    importExportFrameworkReady: normalizeBoolean(safeReadiness.importExportFrameworkReady),
    backupRestoreFrameworkReady: normalizeBoolean(safeReadiness.backupRestoreFrameworkReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    pushReady: normalizeBoolean(safeReadiness.pushReady),
    releaseReady: normalizeBoolean(safeReadiness.releaseReady),
    deployReady: normalizeBoolean(safeReadiness.deployReady),
    configSwitchReady: normalizeBoolean(safeReadiness.configSwitchReady),
    watchdogReady: normalizeBoolean(safeReadiness.watchdogReady)
  };
}

function normalizeMigrationImportExportBackupRestoreApprovalInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    synthetic: normalizeBoolean(safeInput.synthetic),
    localOnly: normalizeBoolean(safeInput.localOnly),
    dryRunOnly: normalizeBoolean(safeInput.dryRunOnly),
    boundaryInventoryOnly: normalizeBoolean(safeInput.boundaryInventoryOnly),
    runtimeIntegrated: normalizeBoolean(safeInput.runtimeIntegrated),
    approvalFrameworkImplemented: normalizeBoolean(safeInput.approvalFrameworkImplemented),
    approvalExecutionReady: normalizeBoolean(safeInput.approvalExecutionReady),
    approvalExecuted: normalizeBoolean(safeInput.approvalExecuted),
    migrationFrameworkReady: normalizeBoolean(safeInput.migrationFrameworkReady),
    migrationApplyReady: normalizeBoolean(safeInput.migrationApplyReady),
    importExportFrameworkReady: normalizeBoolean(safeInput.importExportFrameworkReady),
    importExportApplyReady: normalizeBoolean(safeInput.importExportApplyReady),
    backupRestoreFrameworkReady: normalizeBoolean(safeInput.backupRestoreFrameworkReady),
    backupRestoreApplyReady: normalizeBoolean(safeInput.backupRestoreApplyReady),
    migrationApplied: normalizeBoolean(safeInput.migrationApplied),
    importApplied: normalizeBoolean(safeInput.importApplied),
    exportApplied: normalizeBoolean(safeInput.exportApplied),
    backupCreated: normalizeBoolean(safeInput.backupCreated),
    restorePerformed: normalizeBoolean(safeInput.restorePerformed),
    realMemoryScanned: normalizeBoolean(safeInput.realMemoryScanned),
    runtimeStoreScanned: normalizeBoolean(safeInput.runtimeStoreScanned),
    durableMemoryWritten: normalizeBoolean(safeInput.durableMemoryWritten),
    durableAuditWritten: normalizeBoolean(safeInput.durableAuditWritten),
    publicMcpExpanded: normalizeBoolean(safeInput.publicMcpExpanded),
    providerCalls: normalizeNumber(safeInput.providerCalls),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    acceptedForPlanning: normalizeBoolean(safeInput.acceptedForPlanning),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    allowedSourceTypes: normalizeStringArray(safeInput.allowedSourceTypes),
    deniedSourceTypes: normalizeStringArray(safeInput.deniedSourceTypes),
    sourceEvidence: cloneArray(safeInput.sourceEvidence).map(normalizeSourceEvidence),
    frameworkStages: cloneArray(safeInput.frameworkStages).map(normalizeFrameworkStage),
    approvalStates: cloneArray(safeInput.approvalStates).map(normalizeApprovalState),
    requiredApprovalEvidence: normalizeStringArray(safeInput.requiredApprovalEvidence),
    unsatisfiedApprovalEvidence: normalizeStringArray(safeInput.unsatisfiedApprovalEvidence),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function stageIsUnsafe(stage) {
  if (stage.inputMode !== 'explicit_input') return true;
  if (stage.executionAllowed === true || stage.durableWriteAllowed === true) return true;
  if (stage.requiresExplicitA5Approval !== true) return true;
  if (stage.id === 'source_scope_review') {
    return !hasExactSet(stage.acceptedSources, SAFE_SOURCE_TYPES);
  }

  return stage.acceptedSources.length > 0;
}

function approvalStateIsUnsafe(state) {
  if (state.executionAllowed === true) return true;

  return state.acceptedForPlanning !== PLANNING_APPROVAL_STATE_IDS.includes(state.id);
}

function evaluateMigrationImportExportBackupRestoreApproval(input = {}) {
  const normalized = normalizeMigrationImportExportBackupRestoreApprovalInput(input);
  const sourceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const stageIds = normalized.frameworkStages.map(stage => stage.id).filter(Boolean);
  const approvalStateIds = normalized.approvalStates.map(state => state.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const duplicateStageIds = collectDuplicateValues(stageIds);
  const duplicateApprovalStateIds = collectDuplicateValues(approvalStateIds);
  const unsafeSources = normalized.sourceEvidence.filter(source =>
    source.runtimeAuthority === true ||
    source.readinessAuthority === true ||
    source.executionAuthority === true ||
    source.artifactRefs.length === 0
  );
  const unsafeStages = normalized.frameworkStages.filter(stageIsUnsafe);
  const unsafeApprovalStates = normalized.approvalStates.filter(approvalStateIsUnsafe);
  const exactContract =
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(normalized.allowedSourceTypes, SAFE_SOURCE_TYPES) &&
    hasExactSet(normalized.deniedSourceTypes, DENIED_SOURCE_TYPES) &&
    hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS) &&
    hasExactSet(stageIds, REQUIRED_FRAMEWORK_STAGE_IDS) &&
    hasExactSet(approvalStateIds, REQUIRED_APPROVAL_STATE_IDS) &&
    hasExactSet(normalized.requiredApprovalEvidence, REQUIRED_APPROVAL_EVIDENCE) &&
    hasExactSet(normalized.unsatisfiedApprovalEvidence, REQUIRED_APPROVAL_EVIDENCE) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.blockedActions, REQUIRED_BLOCKED_ACTIONS);
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.runtimeIntegrated === true ||
    normalized.approvalFrameworkImplemented === true ||
    normalized.approvalExecutionReady === true ||
    normalized.approvalExecuted === true ||
    normalized.migrationFrameworkReady === true ||
    normalized.migrationApplyReady === true ||
    normalized.importExportFrameworkReady === true ||
    normalized.importExportApplyReady === true ||
    normalized.backupRestoreFrameworkReady === true ||
    normalized.backupRestoreApplyReady === true ||
    normalized.migrationApplied === true ||
    normalized.importApplied === true ||
    normalized.exportApplied === true ||
    normalized.backupCreated === true ||
    normalized.restorePerformed === true ||
    normalized.realMemoryScanned === true ||
    normalized.runtimeStoreScanned === true ||
    normalized.durableMemoryWritten === true ||
    normalized.durableAuditWritten === true ||
    normalized.publicMcpExpanded === true ||
    normalized.providerCalls !== 0 ||
    normalized.readiness.approvalFrameworkReady === true ||
    normalized.readiness.approvalExecutionReady === true ||
    normalized.readiness.migrationFrameworkReady === true ||
    normalized.readiness.importExportFrameworkReady === true ||
    normalized.readiness.backupRestoreFrameworkReady === true ||
    normalized.readiness.runtimeReady === true ||
    normalized.readiness.finalRcMatrixReady === true ||
    normalized.readiness.v1RcReady === true ||
    normalized.readiness.pushReady === true ||
    normalized.readiness.releaseReady === true ||
    normalized.readiness.deployReady === true ||
    normalized.readiness.configSwitchReady === true ||
    normalized.readiness.watchdogReady === true;
  const accepted =
    isPlainObject(input) &&
    normalized.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.policyVersion === EXPECTED_POLICY_VERSION &&
    normalized.manifestVersion === EXPECTED_MANIFEST_VERSION &&
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.localOnly === true &&
    normalized.dryRunOnly === true &&
    normalized.boundaryInventoryOnly === true &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.acceptedForPlanning === true &&
    normalized.readiness.localBoundaryInventoryReady === true &&
    exactContract &&
    duplicateSourceIds.length === 0 &&
    duplicateStageIds.length === 0 &&
    duplicateApprovalStateIds.length === 0 &&
    unsafeSources.length === 0 &&
    unsafeStages.length === 0 &&
    unsafeApprovalStates.length === 0 &&
    safetyLeaked === false &&
    readinessClaimed === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!exactContract) failClosedReasons.push('non_exact_approval_framework_contract');
  if (duplicateSourceIds.length > 0 || duplicateStageIds.length > 0 || duplicateApprovalStateIds.length > 0) {
    failClosedReasons.push('duplicate_approval_framework_id');
  }
  if (unsafeSources.length > 0) failClosedReasons.push('source_claims_authority');
  if (unsafeStages.length > 0) failClosedReasons.push('stage_allows_execution_or_unscoped_input');
  if (unsafeApprovalStates.length > 0) failClosedReasons.push('approval_state_allows_execution');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'boundary_accepted_approval_execution_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    approvalFrameworkReady: false,
    approvalExecutionReady: false,
    migrationFrameworkReady: false,
    importExportFrameworkReady: false,
    backupRestoreFrameworkReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    sourceTypes: {
      allowedExact: hasExactSet(normalized.allowedSourceTypes, SAFE_SOURCE_TYPES),
      deniedExact: hasExactSet(normalized.deniedSourceTypes, DENIED_SOURCE_TYPES),
      allowed: SAFE_SOURCE_TYPES,
      denied: DENIED_SOURCE_TYPES
    },
    sourceEvidence: {
      count: sourceIds.length,
      exact: hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS),
      duplicateIds: duplicateSourceIds,
      unsafeIds: unsafeSources.map(source => source.id).filter(Boolean)
    },
    frameworkStages: {
      count: stageIds.length,
      exact: hasExactSet(stageIds, REQUIRED_FRAMEWORK_STAGE_IDS),
      duplicateIds: duplicateStageIds,
      unsafeIds: unsafeStages.map(stage => stage.id).filter(Boolean)
    },
    approvalStates: {
      count: approvalStateIds.length,
      exact: hasExactSet(approvalStateIds, REQUIRED_APPROVAL_STATE_IDS),
      duplicateIds: duplicateApprovalStateIds,
      unsafeIds: unsafeApprovalStates.map(state => state.id).filter(Boolean)
    },
    approvalEvidence: {
      requiredExact: hasExactSet(normalized.requiredApprovalEvidence, REQUIRED_APPROVAL_EVIDENCE),
      unsatisfiedExact: hasExactSet(normalized.unsatisfiedApprovalEvidence, REQUIRED_APPROVAL_EVIDENCE)
    },
    readiness: {
      localBoundaryInventoryReady: normalized.readiness.localBoundaryInventoryReady,
      approvalFrameworkReady: false,
      approvalExecutionReady: false,
      migrationFrameworkReady: false,
      importExportFrameworkReady: false,
      backupRestoreFrameworkReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    }
  };
}

module.exports = {
  DENIED_SOURCE_TYPES,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_EVIDENCE,
  REQUIRED_APPROVAL_STATE_IDS,
  REQUIRED_BLOCKED_ACTIONS,
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_FRAMEWORK_STAGE_IDS,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES,
  evaluateMigrationImportExportBackupRestoreApproval,
  normalizeMigrationImportExportBackupRestoreApprovalInput
};
