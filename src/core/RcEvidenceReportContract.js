const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p61-mainline-strict-gate-rc-evidence-report-boundary-v1';
const EXPECTED_POLICY_VERSION = 'p61-rc-evidence-report-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p61-rc-evidence-report-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_fixture',
  'committed_test',
  'committed_report_shape',
  'sanitized_local_validation_log'
]);

const DENIED_SOURCE_TYPES = Object.freeze([
  'live_provider_output',
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'real_recall_audit',
  'raw_http_header',
  'raw_bearer_token',
  'operator_free_text',
  'unverified_gate_summary'
]);

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p52_runtime_schema_version_enforcement_helper',
  'p53_validation_aggregator_inventory_and_posture',
  'p54_final_rc_runner_local_chain',
  'p56_governance_loop_boundary_helper',
  'p57_recall_isolation_runtime_proof_helper',
  'p58_migration_import_export_backup_restore_helper',
  'p59_http_observability_helper',
  'p60_no_touch_no_leak_redaction_regression'
]);

const REQUIRED_EVIDENCE_GROUPS = Object.freeze([
  'schema_runtime_enforcement',
  'validation_aggregator_full_implementation',
  'final_rc_runner_execution',
  'governance_review_approval_audit_loop',
  'recall_isolation_runtime_proof',
  'migration_import_export_backup_restore_approval',
  'http_observability_operation_hardening',
  'no_touch_no_leak_redaction_regression',
  'mainline_strict_gate_execution',
  'machine_readable_rc_evidence_report'
]);

const REQUIRED_UNSATISFIED_EVIDENCE_GROUPS = Object.freeze([
  'schema_runtime_enforcement',
  'validation_aggregator_full_implementation',
  'final_rc_runner_execution',
  'governance_review_approval_audit_loop',
  'recall_isolation_runtime_proof',
  'migration_import_export_backup_restore_approval',
  'http_observability_operation_hardening',
  'mainline_strict_gate_execution',
  'machine_readable_rc_evidence_report'
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
  'gate_not_executed',
  'report_not_generated',
  'runtime_evidence_missing',
  'a5_authorization_missing',
  'readiness_overclaim'
]);

const REQUIRED_BLOCKED_ACTIONS = Object.freeze([
  'mainline_strict_gate_execute',
  'final_rc_runner_execute',
  'live_http_observe',
  'service_start',
  'service_stop',
  'watchdog_install',
  'startup_install',
  'config_switch',
  'provider_call',
  'real_memory_read',
  'real_memory_scan',
  'diary_scan',
  'sqlite_scan',
  'vector_index_scan',
  'candidate_cache_scan',
  'recall_audit_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
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
    reportAuthority: normalizeBoolean(safeSource.reportAuthority)
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
    mainlineStrictGateReady: normalizeBoolean(safeReadiness.mainlineStrictGateReady),
    rcEvidenceReportReady: normalizeBoolean(safeReadiness.rcEvidenceReportReady),
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

function normalizeRcEvidenceReportInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    localOnly: normalizeBoolean(safeInput.localOnly),
    readOnly: normalizeBoolean(safeInput.readOnly),
    boundaryInventoryOnly: normalizeBoolean(safeInput.boundaryInventoryOnly),
    mainlineStrictGateExecuted: normalizeBoolean(safeInput.mainlineStrictGateExecuted),
    finalRcRunnerExecuted: normalizeBoolean(safeInput.finalRcRunnerExecuted),
    runtimeEvidenceCollected: normalizeBoolean(safeInput.runtimeEvidenceCollected),
    liveHttpObserved: normalizeBoolean(safeInput.liveHttpObserved),
    providerCalls: normalizeNumber(safeInput.providerCalls),
    realMemoryScanned: normalizeBoolean(safeInput.realMemoryScanned),
    runtimeStoreScanned: normalizeBoolean(safeInput.runtimeStoreScanned),
    durableMemoryWritten: normalizeBoolean(safeInput.durableMemoryWritten),
    durableAuditWritten: normalizeBoolean(safeInput.durableAuditWritten),
    publicMcpExpanded: normalizeBoolean(safeInput.publicMcpExpanded),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    acceptedForPlanning: normalizeBoolean(safeInput.acceptedForPlanning),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    allowedSourceTypes: normalizeStringArray(safeInput.allowedSourceTypes),
    deniedSourceTypes: normalizeStringArray(safeInput.deniedSourceTypes),
    sourceEvidence: cloneArray(safeInput.sourceEvidence).map(normalizeSourceEvidence),
    requiredEvidenceGroups: normalizeStringArray(safeInput.requiredEvidenceGroups),
    unsatisfiedEvidenceGroups: normalizeStringArray(safeInput.unsatisfiedEvidenceGroups),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evaluateRcEvidenceReport(input = {}) {
  const normalized = normalizeRcEvidenceReportInput(input);
  const sourceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const unsafeSources = normalized.sourceEvidence.filter(source =>
    source.runtimeAuthority === true ||
    source.readinessAuthority === true ||
    source.reportAuthority === true ||
    !SAFE_SOURCE_TYPES.includes(source.sourceType) ||
    source.artifactRefs.length === 0
  );
  const exactContract =
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(normalized.allowedSourceTypes, SAFE_SOURCE_TYPES) &&
    hasExactSet(normalized.deniedSourceTypes, DENIED_SOURCE_TYPES) &&
    hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS) &&
    hasExactSet(normalized.requiredEvidenceGroups, REQUIRED_EVIDENCE_GROUPS) &&
    hasExactSet(normalized.unsatisfiedEvidenceGroups, REQUIRED_UNSATISFIED_EVIDENCE_GROUPS) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.blockedActions, REQUIRED_BLOCKED_ACTIONS);
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.mainlineStrictGateExecuted === true ||
    normalized.finalRcRunnerExecuted === true ||
    normalized.runtimeEvidenceCollected === true ||
    normalized.liveHttpObserved === true ||
    normalized.providerCalls !== 0 ||
    normalized.realMemoryScanned === true ||
    normalized.runtimeStoreScanned === true ||
    normalized.durableMemoryWritten === true ||
    normalized.durableAuditWritten === true ||
    normalized.publicMcpExpanded === true ||
    normalized.readiness.mainlineStrictGateReady === true ||
    normalized.readiness.rcEvidenceReportReady === true ||
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
    normalized.localOnly === true &&
    normalized.readOnly === true &&
    normalized.boundaryInventoryOnly === true &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.acceptedForPlanning === true &&
    normalized.readiness.localBoundaryInventoryReady === true &&
    exactContract &&
    duplicateSourceIds.length === 0 &&
    unsafeSources.length === 0 &&
    safetyLeaked === false &&
    readinessClaimed === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!exactContract) failClosedReasons.push('non_exact_rc_evidence_report_contract');
  if (duplicateSourceIds.length > 0) failClosedReasons.push('duplicate_rc_evidence_source_id');
  if (unsafeSources.length > 0) failClosedReasons.push('source_claims_authority_or_unsupported_type');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'boundary_accepted_rc_evidence_report_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    rcEvidenceReportReady: false,
    mainlineStrictGateReady: false,
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
    evidenceGroups: {
      requiredExact: hasExactSet(normalized.requiredEvidenceGroups, REQUIRED_EVIDENCE_GROUPS),
      unsatisfiedExact: hasExactSet(normalized.unsatisfiedEvidenceGroups, REQUIRED_UNSATISFIED_EVIDENCE_GROUPS)
    },
    readiness: {
      localBoundaryInventoryReady: normalized.readiness.localBoundaryInventoryReady,
      mainlineStrictGateReady: false,
      rcEvidenceReportReady: false,
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
  REQUIRED_BLOCKED_ACTIONS,
  REQUIRED_EVIDENCE_GROUPS,
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  REQUIRED_UNSATISFIED_EVIDENCE_GROUPS,
  SAFE_SOURCE_TYPES,
  evaluateRcEvidenceReport,
  normalizeRcEvidenceReportInput
};
