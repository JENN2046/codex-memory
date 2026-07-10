const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p62-a5-runtime-authorization-precondition-matrix-v1';
const EXPECTED_POLICY_VERSION = 'p62-authorization-precondition-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p62-authorization-precondition-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_PRE_AUTHORIZATION_EVIDENCE_IDS = Object.freeze([
  'runtime_schema_version_enforcement_proof',
  'validation_aggregator_full_evidence_report',
  'final_rc_matrix_execution_report',
  'governance_runtime_loop_evidence',
  'recall_isolation_runtime_proof',
  'migration_import_export_backup_restore_readiness',
  'http_operation_observability_evidence',
  'mainline_strict_gate_rc_evidence'
]);

const SAFE_ACCEPTED_EVIDENCE_TYPES = Object.freeze([
  'runtime_boundary_test_report',
  'schema_policy_enforcement_report',
  'aggregated_committed_local_runtime_evidence_report',
  'stale_missing_unsupported_gate_report',
  'allowlisted_command_execution_report',
  'machine_readable_rc_matrix_report',
  'review_packet_runtime_report',
  'approval_decision_runtime_report',
  'audit_runtime_report',
  'runtime_recall_isolation_report',
  'contamination_absence_report',
  'synthetic_dry_run_parity_report',
  'rollback_readiness_report',
  'backup_restore_preflight_report',
  'http_health_evidence_report',
  'http_failure_reporting_report',
  'safe_shutdown_start_preflight_report',
  'mainline_strict_gate_report',
  'rc_evidence_report'
]);

const REQUIRED_AUTHORIZATION_ACTION_IDS = Object.freeze([
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
  'provider_call',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'rc_ready_claim'
]);

const REQUIRED_FORBIDDEN_BUNDLED_APPROVALS = Object.freeze([
  'push_implies_release',
  'release_implies_deploy',
  'deploy_implies_config_switch',
  'config_switch_implies_watchdog_install',
  'provider_call_implies_runtime_ready',
  'real_memory_scan_implies_export_or_migration',
  'dry_run_implies_apply',
  'local_evidence_implies_rc_ready',
  'rc_ready_claim_implies_tag_or_release'
]);

const REQUIRED_FAIL_CLOSED_STATES = Object.freeze([
  'unknown_authorization',
  'missing_authorization',
  'ambiguous_authorization',
  'bundled_authorization',
  'stale_evidence',
  'warning_only_evidence',
  'skipped_critical_gate',
  'unsupported_evidence_type',
  'unparsable_evidence',
  'duplicate_authorization_action',
  'runtime_claim_without_runtime_report'
]);

const REQUIRED_FORBIDDEN_CLAIMS = Object.freeze([
  'authorization_granted',
  'runtime_ready',
  'final_rc_matrix_ready',
  'rc_ready',
  'v1_rc_ready',
  'cutover_ready',
  'release_ready',
  'deploy_ready',
  'config_switch_ready',
  'watchdog_ready'
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

function isSubset(values, allowedValues) {
  return values.every(value => allowedValues.includes(value));
}

function normalizePreAuthorizationEvidence(evidence = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};

  return {
    id: normalizeString(safeEvidence.id),
    required: normalizeBoolean(safeEvidence.required),
    currentStatus: normalizeString(safeEvidence.currentStatus),
    acceptedEvidenceTypes: normalizeStringArray(safeEvidence.acceptedEvidenceTypes),
    blockedBy: normalizeStringArray(safeEvidence.blockedBy)
  };
}

function normalizeAuthorizationAction(action = {}) {
  const safeAction = isPlainObject(action) ? action : {};

  return {
    id: normalizeString(safeAction.id),
    risk: normalizeString(safeAction.risk),
    requiresSeparateExplicitApproval: normalizeBoolean(safeAction.requiresSeparateExplicitApproval),
    granted: normalizeBoolean(safeAction.granted),
    doesNotAuthorize: normalizeStringArray(safeAction.doesNotAuthorize)
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
    authorizationMatrixReady: normalizeBoolean(safeReadiness.authorizationMatrixReady),
    authorizationGranted: normalizeBoolean(safeReadiness.authorizationGranted),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    cutoverReady: normalizeBoolean(safeReadiness.cutoverReady),
    pushReady: normalizeBoolean(safeReadiness.pushReady),
    tagReady: normalizeBoolean(safeReadiness.tagReady),
    releaseReady: normalizeBoolean(safeReadiness.releaseReady),
    deployReady: normalizeBoolean(safeReadiness.deployReady),
    configSwitchReady: normalizeBoolean(safeReadiness.configSwitchReady),
    watchdogReady: normalizeBoolean(safeReadiness.watchdogReady)
  };
}

function normalizeA5RuntimeAuthorizationPreconditionInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    phase: normalizeString(safeInput.phase),
    localOnly: normalizeBoolean(safeInput.localOnly),
    readOnly: normalizeBoolean(safeInput.readOnly),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    planningOnly: normalizeBoolean(safeInput.planningOnly),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    authorizationGranted: normalizeBoolean(safeInput.authorizationGranted),
    acceptedForPlanning: normalizeBoolean(safeInput.acceptedForPlanning),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    preAuthorizationEvidence: cloneArray(safeInput.preAuthorizationEvidence).map(normalizePreAuthorizationEvidence),
    authorizationActions: cloneArray(safeInput.authorizationActions).map(normalizeAuthorizationAction),
    forbiddenBundledApprovals: normalizeStringArray(safeInput.forbiddenBundledApprovals),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evidenceIsUnsafe(evidence) {
  return evidence.required !== true ||
    evidence.currentStatus === 'satisfied' ||
    evidence.acceptedEvidenceTypes.length === 0 ||
    evidence.blockedBy.length === 0 ||
    !isSubset(evidence.acceptedEvidenceTypes, SAFE_ACCEPTED_EVIDENCE_TYPES);
}

function actionIsUnsafe(action) {
  return action.risk !== 'A5-hard-stop' ||
    action.requiresSeparateExplicitApproval !== true ||
    action.granted === true ||
    action.doesNotAuthorize.length === 0;
}

function evaluateA5RuntimeAuthorizationPrecondition(input = {}) {
  const normalized = normalizeA5RuntimeAuthorizationPreconditionInput(input);
  const evidenceIds = normalized.preAuthorizationEvidence.map(evidence => evidence.id).filter(Boolean);
  const acceptedEvidenceTypes = normalized.preAuthorizationEvidence
    .flatMap(evidence => evidence.acceptedEvidenceTypes)
    .filter(Boolean);
  const actionIds = normalized.authorizationActions.map(action => action.id).filter(Boolean);
  const duplicateEvidenceIds = collectDuplicateValues(evidenceIds);
  const duplicateActionIds = collectDuplicateValues(actionIds);
  const unsafeEvidence = normalized.preAuthorizationEvidence.filter(evidenceIsUnsafe);
  const unsafeActions = normalized.authorizationActions.filter(actionIsUnsafe);
  const exactContract =
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(evidenceIds, REQUIRED_PRE_AUTHORIZATION_EVIDENCE_IDS) &&
    hasExactSet(acceptedEvidenceTypes, SAFE_ACCEPTED_EVIDENCE_TYPES) &&
    hasExactSet(actionIds, REQUIRED_AUTHORIZATION_ACTION_IDS) &&
    hasExactSet(normalized.forbiddenBundledApprovals, REQUIRED_FORBIDDEN_BUNDLED_APPROVALS) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.forbiddenClaims, REQUIRED_FORBIDDEN_CLAIMS);
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.authorizationGranted === true ||
    normalized.readiness.authorizationGranted === true ||
    normalized.readiness.runtimeReady === true ||
    normalized.readiness.finalRcMatrixReady === true ||
    normalized.readiness.v1RcReady === true ||
    normalized.readiness.cutoverReady === true ||
    normalized.readiness.pushReady === true ||
    normalized.readiness.tagReady === true ||
    normalized.readiness.releaseReady === true ||
    normalized.readiness.deployReady === true ||
    normalized.readiness.configSwitchReady === true ||
    normalized.readiness.watchdogReady === true;
  const accepted =
    isPlainObject(input) &&
    normalized.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.policyVersion === EXPECTED_POLICY_VERSION &&
    normalized.manifestVersion === EXPECTED_MANIFEST_VERSION &&
    normalized.localOnly === true &&
    normalized.readOnly === true &&
    normalized.fixtureOnly === true &&
    normalized.planningOnly === true &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.acceptedForPlanning === true &&
    normalized.readiness.authorizationMatrixReady === true &&
    exactContract &&
    duplicateEvidenceIds.length === 0 &&
    duplicateActionIds.length === 0 &&
    unsafeEvidence.length === 0 &&
    unsafeActions.length === 0 &&
    safetyLeaked === false &&
    readinessClaimed === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!exactContract) failClosedReasons.push('non_exact_authorization_precondition_contract');
  if (duplicateEvidenceIds.length > 0 || duplicateActionIds.length > 0) {
    failClosedReasons.push('duplicate_authorization_precondition_id');
  }
  if (unsafeEvidence.length > 0) failClosedReasons.push('evidence_satisfied_missing_blocker_or_unsupported_type');
  if (unsafeActions.length > 0) failClosedReasons.push('authorization_action_granted_or_not_separate_a5');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_or_authorization_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'boundary_accepted_authorization_precondition_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    authorizationGranted: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    cutoverReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    publicMcpTools: {
      exact: hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS),
      tools: PUBLIC_MCP_TOOLS
    },
    preAuthorizationEvidence: {
      count: evidenceIds.length,
      exact: hasExactSet(evidenceIds, REQUIRED_PRE_AUTHORIZATION_EVIDENCE_IDS),
      acceptedEvidenceTypesExact: hasExactSet(acceptedEvidenceTypes, SAFE_ACCEPTED_EVIDENCE_TYPES),
      duplicateIds: duplicateEvidenceIds,
      unsafeIds: unsafeEvidence.map(evidence => evidence.id).filter(Boolean),
      safeAcceptedEvidenceTypes: SAFE_ACCEPTED_EVIDENCE_TYPES
    },
    authorizationActions: {
      count: actionIds.length,
      exact: hasExactSet(actionIds, REQUIRED_AUTHORIZATION_ACTION_IDS),
      duplicateIds: duplicateActionIds,
      unsafeIds: unsafeActions.map(action => action.id).filter(Boolean)
    },
    bundledApprovals: {
      exact: hasExactSet(normalized.forbiddenBundledApprovals, REQUIRED_FORBIDDEN_BUNDLED_APPROVALS)
    },
    failClosedStates: {
      exact: hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES)
    },
    forbiddenClaims: {
      exact: hasExactSet(normalized.forbiddenClaims, REQUIRED_FORBIDDEN_CLAIMS)
    },
    readiness: {
      authorizationMatrixReady: normalized.readiness.authorizationMatrixReady,
      authorizationGranted: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      cutoverReady: false,
      pushReady: false,
      tagReady: false,
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
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_AUTHORIZATION_ACTION_IDS,
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_FORBIDDEN_BUNDLED_APPROVALS,
  REQUIRED_FORBIDDEN_CLAIMS,
  REQUIRED_PRE_AUTHORIZATION_EVIDENCE_IDS,
  SAFE_ACCEPTED_EVIDENCE_TYPES,
  evaluateA5RuntimeAuthorizationPrecondition,
  normalizeA5RuntimeAuthorizationPreconditionInput
};
