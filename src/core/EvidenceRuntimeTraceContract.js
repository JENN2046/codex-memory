const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p55-evidence-to-runtime-enforcement-trace-v1';
const EXPECTED_POLICY_VERSION = 'p55-evidence-to-runtime-enforcement-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p55-evidence-to-runtime-enforcement-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p52_schema_version_boundary_contract',
  'p52_runtime_schema_version_helper_contract',
  'p53_validation_aggregator_inventory_contract',
  'p53_validation_aggregator_static_posture',
  'p54_final_rc_safe_command_inventory',
  'p54_final_rc_command_result_contract',
  'p54_final_rc_execution_preflight_contract',
  'p54_final_rc_injected_executor_adapter_contract'
]);

const REQUIRED_RUNTIME_GAP_IDS = Object.freeze([
  'runtime_schema_version_boundary_enforcement',
  'validation_aggregator_live_evidence_collection',
  'final_rc_matrix_real_runner_execution',
  'governance_review_approval_audit_runtime_loop',
  'recall_isolation_runtime_proof',
  'migration_import_export_backup_restore_approval_execution',
  'http_observability_runtime_health_evidence'
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
  'fixture_only'
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
  'execute_real_final_rc_runner',
  'execute_unlisted_command',
  'start_service',
  'provider_call',
  'runtime_governance_mutation',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'config_switch',
  'watchdog_install',
  'public_mcp_expansion',
  'dependency_change',
  'durable_memory_write',
  'durable_audit_write',
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
    phase: normalizeString(safeSource.phase),
    sourceType: normalizeString(safeSource.sourceType),
    evidenceClass: normalizeString(safeSource.evidenceClass),
    artifactRefs: normalizeStringArray(safeSource.artifactRefs),
    runtimeAuthority: normalizeBoolean(safeSource.runtimeAuthority),
    readinessAuthority: normalizeBoolean(safeSource.readinessAuthority)
  };
}

function normalizeRuntimeGap(gap = {}) {
  const safeGap = isPlainObject(gap) ? gap : {};

  return {
    id: normalizeString(safeGap.id),
    requiredRuntimeGate: normalizeString(safeGap.requiredRuntimeGate),
    currentDisposition: normalizeString(safeGap.currentDisposition),
    blocksRc: normalizeBoolean(safeGap.blocksRc)
  };
}

function normalizeTraceLink(link = {}) {
  const safeLink = isPlainObject(link) ? link : {};

  return {
    sourceEvidenceId: normalizeString(safeLink.sourceEvidenceId),
    runtimeGapId: normalizeString(safeLink.runtimeGapId),
    traceStatus: normalizeString(safeLink.traceStatus)
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
    writesDurableState: normalizeBoolean(safeSafety.writesDurableState),
    expandsPublicMcp: normalizeBoolean(safeSafety.expandsPublicMcp),
    remoteWrites: normalizeBoolean(safeSafety.remoteWrites),
    rawSensitiveOutputExposed: normalizeBoolean(safeSafety.rawSensitiveOutputExposed)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    localTraceContractReady: normalizeBoolean(safeReadiness.localTraceContractReady),
    runtimeEnforcementReady: normalizeBoolean(safeReadiness.runtimeEnforcementReady),
    validationAggregatorFullImplementationReady: normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    pushReady: normalizeBoolean(safeReadiness.pushReady),
    releaseReady: normalizeBoolean(safeReadiness.releaseReady),
    deployReady: normalizeBoolean(safeReadiness.deployReady),
    configSwitchReady: normalizeBoolean(safeReadiness.configSwitchReady),
    watchdogReady: normalizeBoolean(safeReadiness.watchdogReady)
  };
}

function normalizeEvidenceRuntimeTraceInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    synthetic: normalizeBoolean(safeInput.synthetic),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    traceOnly: normalizeBoolean(safeInput.traceOnly),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    acceptedForPlanning: normalizeBoolean(safeInput.acceptedForPlanning),
    runtimeEnforcementImplemented: normalizeBoolean(safeInput.runtimeEnforcementImplemented),
    runtimeIntegrated: normalizeBoolean(safeInput.runtimeIntegrated),
    runtimeReady: normalizeBoolean(safeInput.runtimeReady),
    validationAggregatorFullImplementation: normalizeBoolean(safeInput.validationAggregatorFullImplementation),
    finalRcMatrixExecuted: normalizeBoolean(safeInput.finalRcMatrixExecuted),
    finalRcMatrixReady: normalizeBoolean(safeInput.finalRcMatrixReady),
    rcReady: normalizeBoolean(safeInput.rcReady),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    sourceEvidence: cloneArray(safeInput.sourceEvidence).map(normalizeSourceEvidence),
    runtimeGaps: cloneArray(safeInput.runtimeGaps).map(normalizeRuntimeGap),
    traceLinks: cloneArray(safeInput.traceLinks).map(normalizeTraceLink),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evaluateEvidenceRuntimeTrace(input = {}) {
  const normalized = normalizeEvidenceRuntimeTraceInput(input);
  const sourceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const gapIds = normalized.runtimeGaps.map(gap => gap.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const duplicateGapIds = collectDuplicateValues(gapIds);
  const unknownTraceSourceIds = normalized.traceLinks
    .map(link => link.sourceEvidenceId)
    .filter(id => !sourceIds.includes(id));
  const unknownTraceGapIds = normalized.traceLinks
    .map(link => link.runtimeGapId)
    .filter(id => !gapIds.includes(id));
  const unsafeSources = normalized.sourceEvidence.filter(source =>
    source.runtimeAuthority === true ||
    source.readinessAuthority === true ||
    source.artifactRefs.length === 0
  );
  const unsafeGaps = normalized.runtimeGaps.filter(gap =>
    gap.blocksRc !== true ||
    gap.currentDisposition === 'enforced' ||
    gap.currentDisposition === 'ready' ||
    !gap.requiredRuntimeGate
  );
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.readiness.runtimeEnforcementReady === true ||
    normalized.readiness.validationAggregatorFullImplementationReady === true ||
    normalized.readiness.finalRcMatrixReady === true ||
    normalized.readiness.v1RcReady === true ||
    normalized.readiness.pushReady === true ||
    normalized.readiness.releaseReady === true ||
    normalized.readiness.deployReady === true ||
    normalized.readiness.configSwitchReady === true ||
    normalized.readiness.watchdogReady === true ||
    normalized.runtimeEnforcementImplemented === true ||
    normalized.runtimeIntegrated === true ||
    normalized.runtimeReady === true ||
    normalized.validationAggregatorFullImplementation === true ||
    normalized.finalRcMatrixExecuted === true ||
    normalized.finalRcMatrixReady === true ||
    normalized.rcReady === true;
  const exactTrace =
    hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS) &&
    hasExactSet(gapIds, REQUIRED_RUNTIME_GAP_IDS) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.blockedActions, REQUIRED_BLOCKED_ACTIONS) &&
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  const traceLinksSafe =
    normalized.traceLinks.length >= REQUIRED_SOURCE_EVIDENCE_IDS.length &&
    unknownTraceSourceIds.length === 0 &&
    unknownTraceGapIds.length === 0 &&
    normalized.traceLinks.every(link => link.traceStatus && !link.traceStatus.includes('ready'));
  const accepted =
    isPlainObject(input) &&
    normalized.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.policyVersion === EXPECTED_POLICY_VERSION &&
    normalized.manifestVersion === EXPECTED_MANIFEST_VERSION &&
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.explicitInputOnly === true &&
    normalized.traceOnly === true &&
    normalized.sourceMode === 'committed_fixture' &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.acceptedForPlanning === true &&
    normalized.readiness.localTraceContractReady === true &&
    exactTrace &&
    traceLinksSafe &&
    duplicateSourceIds.length === 0 &&
    duplicateGapIds.length === 0 &&
    unsafeSources.length === 0 &&
    unsafeGaps.length === 0 &&
    safetyLeaked === false &&
    readinessClaimed === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!exactTrace) failClosedReasons.push('non_exact_trace_contract');
  if (!traceLinksSafe) failClosedReasons.push('unsafe_trace_links');
  if (duplicateSourceIds.length > 0 || duplicateGapIds.length > 0) failClosedReasons.push('duplicate_trace_id');
  if (unsafeSources.length > 0) failClosedReasons.push('source_claims_runtime_authority');
  if (unsafeGaps.length > 0) failClosedReasons.push('runtime_gap_not_blocked');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'trace_accepted_runtime_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    runtimeEnforcementReady: false,
    validationAggregatorFullImplementationReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    sourceEvidence: {
      count: sourceIds.length,
      exact: hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS),
      duplicateIds: duplicateSourceIds,
      unsafeIds: unsafeSources.map(source => source.id).filter(Boolean)
    },
    runtimeGaps: {
      count: gapIds.length,
      exact: hasExactSet(gapIds, REQUIRED_RUNTIME_GAP_IDS),
      duplicateIds: duplicateGapIds,
      unsafeIds: unsafeGaps.map(gap => gap.id).filter(Boolean)
    },
    traceLinks: {
      count: normalized.traceLinks.length,
      safe: traceLinksSafe,
      unknownSourceIds: uniqueValues(unknownTraceSourceIds),
      unknownGapIds: uniqueValues(unknownTraceGapIds)
    },
    readiness: {
      localTraceContractReady: normalized.readiness.localTraceContractReady,
      runtimeEnforcementReady: false,
      validationAggregatorFullImplementationReady: false,
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
      writesDurableState: false,
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
  REQUIRED_BLOCKED_ACTIONS,
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_RUNTIME_GAP_IDS,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  evaluateEvidenceRuntimeTrace,
  normalizeEvidenceRuntimeTraceInput
};
