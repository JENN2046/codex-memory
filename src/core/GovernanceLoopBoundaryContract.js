const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p56-governance-executable-loop-boundary-v1';
const EXPECTED_POLICY_VERSION = 'p56-governance-loop-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p56-governance-loop-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p31_lifecycle_contract_helper',
  'p32_approval_packet_helper',
  'p33_audit_evidence_helper',
  'p34_review_surface_helper',
  'p55_evidence_runtime_trace_helper'
]);

const REQUIRED_LOOP_STAGE_IDS = Object.freeze([
  'review_packet_intake',
  'approval_packet_evaluation',
  'audit_evidence_shape_evaluation',
  'execution_gate_evaluation',
  'durable_write_gate',
  'post_action_evidence_gate'
]);

const REQUIRED_APPROVAL_STATE_IDS = Object.freeze([
  'reviewed_not_approved',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired_or_stale',
  'approval_scope_mismatch'
]);

const REQUIRED_RUNTIME_EVIDENCE = Object.freeze([
  'runtime_schema_version_enforcement',
  'validation_aggregator_full_implementation',
  'final_rc_matrix_runner_execution',
  'governance_review_runtime_path',
  'approval_execution_runtime_path',
  'durable_audit_writer',
  'durable_memory_mutation_policy',
  'recall_isolation_runtime_proof'
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
  'scope_mismatch',
  'approval_missing',
  'approval_expired',
  'fixture_only',
  'dry_run_only'
]);

const REQUIRED_BLOCKED_ACTIONS = Object.freeze([
  'governed_action_execution',
  'approval_execution',
  'runtime_governance_integration',
  'durable_memory_write',
  'durable_audit_write',
  'audit_writer_implementation',
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
  'import_export_apply',
  'backup_restore_apply',
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
    executionAuthority: normalizeBoolean(safeSource.executionAuthority),
    readinessAuthority: normalizeBoolean(safeSource.readinessAuthority)
  };
}

function normalizeLoopStage(stage = {}) {
  const safeStage = isPlainObject(stage) ? stage : {};

  return {
    id: normalizeString(safeStage.id),
    status: normalizeString(safeStage.status),
    inputMode: normalizeString(safeStage.inputMode),
    canExecute: normalizeBoolean(safeStage.canExecute),
    requiresApproval: normalizeBoolean(safeStage.requiresApproval),
    durableWriteAllowed: normalizeBoolean(safeStage.durableWriteAllowed)
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
    localBoundaryContractReady: normalizeBoolean(safeReadiness.localBoundaryContractReady),
    governanceRuntimeReady: normalizeBoolean(safeReadiness.governanceRuntimeReady),
    approvalExecutionReady: normalizeBoolean(safeReadiness.approvalExecutionReady),
    auditWriterReady: normalizeBoolean(safeReadiness.auditWriterReady),
    durableWriteReady: normalizeBoolean(safeReadiness.durableWriteReady),
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

function normalizeGovernanceLoopBoundaryInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    synthetic: normalizeBoolean(safeInput.synthetic),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    dryRunOnly: normalizeBoolean(safeInput.dryRunOnly),
    localOnly: normalizeBoolean(safeInput.localOnly),
    boundaryOnly: normalizeBoolean(safeInput.boundaryOnly),
    runtimeIntegrated: normalizeBoolean(safeInput.runtimeIntegrated),
    governanceLoopImplemented: normalizeBoolean(safeInput.governanceLoopImplemented),
    governedActionExecutionApproved: normalizeBoolean(safeInput.governedActionExecutionApproved),
    governedActionExecuted: normalizeBoolean(safeInput.governedActionExecuted),
    approvalExecutionReady: normalizeBoolean(safeInput.approvalExecutionReady),
    auditWriterImplemented: normalizeBoolean(safeInput.auditWriterImplemented),
    durableAuditWritten: normalizeBoolean(safeInput.durableAuditWritten),
    durableMemoryWritten: normalizeBoolean(safeInput.durableMemoryWritten),
    publicMcpExpanded: normalizeBoolean(safeInput.publicMcpExpanded),
    realMemoryScanned: normalizeBoolean(safeInput.realMemoryScanned),
    providerCalls: normalizeNumber(safeInput.providerCalls),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    acceptedForPlanning: normalizeBoolean(safeInput.acceptedForPlanning),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    sourceEvidence: cloneArray(safeInput.sourceEvidence).map(normalizeSourceEvidence),
    loopStages: cloneArray(safeInput.loopStages).map(normalizeLoopStage),
    approvalStates: cloneArray(safeInput.approvalStates).map(normalizeApprovalState),
    requiredRuntimeEvidence: normalizeStringArray(safeInput.requiredRuntimeEvidence),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evaluateGovernanceLoopBoundary(input = {}) {
  const normalized = normalizeGovernanceLoopBoundaryInput(input);
  const sourceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const stageIds = normalized.loopStages.map(stage => stage.id).filter(Boolean);
  const approvalStateIds = normalized.approvalStates.map(state => state.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const duplicateStageIds = collectDuplicateValues(stageIds);
  const duplicateApprovalStateIds = collectDuplicateValues(approvalStateIds);
  const unsafeSources = normalized.sourceEvidence.filter(source =>
    source.runtimeAuthority === true ||
    source.executionAuthority === true ||
    source.readinessAuthority === true ||
    source.artifactRefs.length === 0
  );
  const unsafeStages = normalized.loopStages.filter(stage =>
    stage.inputMode !== 'explicit_input' ||
    stage.canExecute === true ||
    stage.durableWriteAllowed === true ||
    stage.status === 'ready' ||
    stage.status === 'executed'
  );
  const unsafeApprovalStates = normalized.approvalStates.filter(state =>
    state.executionAllowed === true ||
    (state.id !== 'reviewed_not_approved' && state.acceptedForPlanning === true)
  );
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.runtimeIntegrated === true ||
    normalized.governanceLoopImplemented === true ||
    normalized.governedActionExecutionApproved === true ||
    normalized.governedActionExecuted === true ||
    normalized.approvalExecutionReady === true ||
    normalized.auditWriterImplemented === true ||
    normalized.durableAuditWritten === true ||
    normalized.durableMemoryWritten === true ||
    normalized.publicMcpExpanded === true ||
    normalized.realMemoryScanned === true ||
    normalized.providerCalls !== 0 ||
    normalized.readiness.governanceRuntimeReady === true ||
    normalized.readiness.approvalExecutionReady === true ||
    normalized.readiness.auditWriterReady === true ||
    normalized.readiness.durableWriteReady === true ||
    normalized.readiness.runtimeReady === true ||
    normalized.readiness.finalRcMatrixReady === true ||
    normalized.readiness.v1RcReady === true ||
    normalized.readiness.pushReady === true ||
    normalized.readiness.releaseReady === true ||
    normalized.readiness.deployReady === true ||
    normalized.readiness.configSwitchReady === true ||
    normalized.readiness.watchdogReady === true;
  const exactContract =
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS) &&
    hasExactSet(stageIds, REQUIRED_LOOP_STAGE_IDS) &&
    hasExactSet(approvalStateIds, REQUIRED_APPROVAL_STATE_IDS) &&
    hasExactSet(normalized.requiredRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.blockedActions, REQUIRED_BLOCKED_ACTIONS);
  const accepted =
    isPlainObject(input) &&
    normalized.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.policyVersion === EXPECTED_POLICY_VERSION &&
    normalized.manifestVersion === EXPECTED_MANIFEST_VERSION &&
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.explicitInputOnly === true &&
    normalized.dryRunOnly === true &&
    normalized.localOnly === true &&
    normalized.boundaryOnly === true &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.acceptedForPlanning === true &&
    normalized.readiness.localBoundaryContractReady === true &&
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
  if (!exactContract) failClosedReasons.push('non_exact_governance_loop_contract');
  if (duplicateSourceIds.length > 0 || duplicateStageIds.length > 0 || duplicateApprovalStateIds.length > 0) {
    failClosedReasons.push('duplicate_loop_id');
  }
  if (unsafeSources.length > 0) failClosedReasons.push('source_claims_authority');
  if (unsafeStages.length > 0) failClosedReasons.push('stage_claims_execution');
  if (unsafeApprovalStates.length > 0) failClosedReasons.push('approval_state_allows_execution');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'boundary_accepted_governance_runtime_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    governanceRuntimeReady: false,
    approvalExecutionReady: false,
    auditWriterReady: false,
    durableWriteReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    sourceEvidence: {
      count: sourceIds.length,
      exact: hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS),
      duplicateIds: duplicateSourceIds,
      unsafeIds: unsafeSources.map(source => source.id).filter(Boolean)
    },
    loopStages: {
      count: stageIds.length,
      exact: hasExactSet(stageIds, REQUIRED_LOOP_STAGE_IDS),
      duplicateIds: duplicateStageIds,
      unsafeIds: unsafeStages.map(stage => stage.id).filter(Boolean)
    },
    approvalStates: {
      count: approvalStateIds.length,
      exact: hasExactSet(approvalStateIds, REQUIRED_APPROVAL_STATE_IDS),
      duplicateIds: duplicateApprovalStateIds,
      unsafeIds: unsafeApprovalStates.map(state => state.id).filter(Boolean)
    },
    readiness: {
      localBoundaryContractReady: normalized.readiness.localBoundaryContractReady,
      governanceRuntimeReady: false,
      approvalExecutionReady: false,
      auditWriterReady: false,
      durableWriteReady: false,
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
      scansRuntimeStores: false,
      readsRealMemory: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    }
  };
}

module.exports = {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_STATE_IDS,
  REQUIRED_BLOCKED_ACTIONS,
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_LOOP_STAGE_IDS,
  REQUIRED_RUNTIME_EVIDENCE,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  evaluateGovernanceLoopBoundary,
  normalizeGovernanceLoopBoundaryInput
};
