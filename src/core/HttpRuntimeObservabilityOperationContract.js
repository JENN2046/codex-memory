const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p59-http-runtime-observability-operation-hardening-boundary-v1';
const EXPECTED_POLICY_VERSION = 'p59-http-observability-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p59-http-observability-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_fixture',
  'committed_test',
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
  'operator_free_text'
]);

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p46_http_no_token_mutation_redaction_tests',
  'p50_no_touch_boundary_regression',
  'p54_runner_allowlisted_execution_adapter',
  'p58_approval_framework_helper'
]);

const REQUIRED_OBSERVABILITY_SURFACE_IDS = Object.freeze([
  'http_health_endpoint',
  'mcp_initialize',
  'tools_list_public_mcp_freeze',
  'http_observe_cli',
  'no_token_mutation_guard',
  'bearer_mutation_guard',
  'failure_reporting',
  'safe_start_preflight',
  'safe_shutdown_preflight'
]);

const REQUIRED_RUNTIME_EVIDENCE = Object.freeze([
  'http_health_evidence',
  'mcp_initialize_evidence',
  'tools_list_public_mcp_freeze_evidence',
  'no_token_mutation_rejection_evidence',
  'bearer_token_mutation_guard_evidence',
  'failure_reporting_evidence',
  'redaction_evidence',
  'no_service_install_evidence',
  'no_config_switch_evidence',
  'no_provider_call_evidence',
  'safe_start_preflight_evidence',
  'safe_shutdown_preflight_evidence',
  'machine_readable_operation_report'
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
  'health_unavailable',
  'auth_boundary_unknown',
  'redaction_uncertain',
  'service_start_requested',
  'watchdog_install_requested',
  'config_switch_requested',
  'provider_call_requested'
]);

const REQUIRED_BLOCKED_ACTIONS = Object.freeze([
  'service_start',
  'service_stop',
  'watchdog_install',
  'startup_install',
  'config_switch',
  'env_secret_edit',
  'provider_call',
  'real_memory_read',
  'real_memory_scan',
  'diary_scan',
  'sqlite_scan',
  'vector_index_scan',
  'candidate_cache_scan',
  'recall_audit_scan',
  'durable_memory_write',
  'durable_audit_write',
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
    operationAuthority: normalizeBoolean(safeSource.operationAuthority)
  };
}

function normalizeObservabilitySurface(surface = {}) {
  const safeSurface = isPlainObject(surface) ? surface : {};

  return {
    id: normalizeString(safeSurface.id),
    readOnly: normalizeBoolean(safeSurface.readOnly),
    requiresLiveService: normalizeBoolean(safeSurface.requiresLiveService),
    executedInThisPhase: normalizeBoolean(safeSurface.executedInThisPhase),
    canClaimRuntimeReady: normalizeBoolean(safeSurface.canClaimRuntimeReady)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    readsFilesImplicitly: normalizeBoolean(safeSafety.readsFilesImplicitly),
    scansDirectories: normalizeBoolean(safeSafety.scansDirectories),
    executesCommands: normalizeBoolean(safeSafety.executesCommands),
    startsServices: normalizeBoolean(safeSafety.startsServices),
    stopsServices: normalizeBoolean(safeSafety.stopsServices),
    installsWatchdog: normalizeBoolean(safeSafety.installsWatchdog),
    installsStartup: normalizeBoolean(safeSafety.installsStartup),
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
    httpRuntimeObserved: normalizeBoolean(safeReadiness.httpRuntimeObserved),
    operationHardeningReady: normalizeBoolean(safeReadiness.operationHardeningReady),
    safeStartPreflightReady: normalizeBoolean(safeReadiness.safeStartPreflightReady),
    safeShutdownPreflightReady: normalizeBoolean(safeReadiness.safeShutdownPreflightReady),
    watchdogReady: normalizeBoolean(safeReadiness.watchdogReady),
    configSwitchReady: normalizeBoolean(safeReadiness.configSwitchReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    pushReady: normalizeBoolean(safeReadiness.pushReady),
    releaseReady: normalizeBoolean(safeReadiness.releaseReady),
    deployReady: normalizeBoolean(safeReadiness.deployReady)
  };
}

function normalizeHttpRuntimeObservabilityOperationInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    localOnly: normalizeBoolean(safeInput.localOnly),
    readOnly: normalizeBoolean(safeInput.readOnly),
    boundaryInventoryOnly: normalizeBoolean(safeInput.boundaryInventoryOnly),
    runtimeObserved: normalizeBoolean(safeInput.runtimeObserved),
    httpServiceStarted: normalizeBoolean(safeInput.httpServiceStarted),
    httpServiceStopped: normalizeBoolean(safeInput.httpServiceStopped),
    watchdogInstalled: normalizeBoolean(safeInput.watchdogInstalled),
    startupInstalled: normalizeBoolean(safeInput.startupInstalled),
    configSwitched: normalizeBoolean(safeInput.configSwitched),
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
    observabilitySurfaces: cloneArray(safeInput.observabilitySurfaces).map(normalizeObservabilitySurface),
    requiredRuntimeEvidence: normalizeStringArray(safeInput.requiredRuntimeEvidence),
    unsatisfiedRuntimeEvidence: normalizeStringArray(safeInput.unsatisfiedRuntimeEvidence),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evaluateHttpRuntimeObservabilityOperation(input = {}) {
  const normalized = normalizeHttpRuntimeObservabilityOperationInput(input);
  const sourceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const surfaceIds = normalized.observabilitySurfaces.map(surface => surface.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const duplicateSurfaceIds = collectDuplicateValues(surfaceIds);
  const unsafeSources = normalized.sourceEvidence.filter(source =>
    source.runtimeAuthority === true ||
    source.readinessAuthority === true ||
    source.operationAuthority === true ||
    !SAFE_SOURCE_TYPES.includes(source.sourceType) ||
    source.artifactRefs.length === 0
  );
  const unsafeSurfaces = normalized.observabilitySurfaces.filter(surface =>
    surface.readOnly !== true ||
    surface.executedInThisPhase === true ||
    surface.canClaimRuntimeReady === true
  );
  const exactContract =
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(normalized.allowedSourceTypes, SAFE_SOURCE_TYPES) &&
    hasExactSet(normalized.deniedSourceTypes, DENIED_SOURCE_TYPES) &&
    hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS) &&
    hasExactSet(surfaceIds, REQUIRED_OBSERVABILITY_SURFACE_IDS) &&
    hasExactSet(normalized.requiredRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE) &&
    hasExactSet(normalized.unsatisfiedRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.blockedActions, REQUIRED_BLOCKED_ACTIONS);
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.runtimeObserved === true ||
    normalized.httpServiceStarted === true ||
    normalized.httpServiceStopped === true ||
    normalized.watchdogInstalled === true ||
    normalized.startupInstalled === true ||
    normalized.configSwitched === true ||
    normalized.providerCalls !== 0 ||
    normalized.realMemoryScanned === true ||
    normalized.runtimeStoreScanned === true ||
    normalized.durableMemoryWritten === true ||
    normalized.durableAuditWritten === true ||
    normalized.publicMcpExpanded === true ||
    normalized.readiness.httpRuntimeObserved === true ||
    normalized.readiness.operationHardeningReady === true ||
    normalized.readiness.safeStartPreflightReady === true ||
    normalized.readiness.safeShutdownPreflightReady === true ||
    normalized.readiness.watchdogReady === true ||
    normalized.readiness.configSwitchReady === true ||
    normalized.readiness.runtimeReady === true ||
    normalized.readiness.finalRcMatrixReady === true ||
    normalized.readiness.v1RcReady === true ||
    normalized.readiness.pushReady === true ||
    normalized.readiness.releaseReady === true ||
    normalized.readiness.deployReady === true;
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
    duplicateSurfaceIds.length === 0 &&
    unsafeSources.length === 0 &&
    unsafeSurfaces.length === 0 &&
    safetyLeaked === false &&
    readinessClaimed === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!exactContract) failClosedReasons.push('non_exact_http_observability_contract');
  if (duplicateSourceIds.length > 0 || duplicateSurfaceIds.length > 0) {
    failClosedReasons.push('duplicate_http_observability_id');
  }
  if (unsafeSources.length > 0) failClosedReasons.push('source_claims_authority_or_unsupported_type');
  if (unsafeSurfaces.length > 0) failClosedReasons.push('surface_claims_execution_or_readiness');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'boundary_accepted_http_operation_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    httpRuntimeObserved: false,
    operationHardeningReady: false,
    safeStartPreflightReady: false,
    safeShutdownPreflightReady: false,
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
    observabilitySurfaces: {
      count: surfaceIds.length,
      exact: hasExactSet(surfaceIds, REQUIRED_OBSERVABILITY_SURFACE_IDS),
      duplicateIds: duplicateSurfaceIds,
      unsafeIds: unsafeSurfaces.map(surface => surface.id).filter(Boolean)
    },
    runtimeEvidence: {
      requiredExact: hasExactSet(normalized.requiredRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE),
      unsatisfiedExact: hasExactSet(normalized.unsatisfiedRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE)
    },
    readiness: {
      localBoundaryInventoryReady: normalized.readiness.localBoundaryInventoryReady,
      httpRuntimeObserved: false,
      operationHardeningReady: false,
      safeStartPreflightReady: false,
      safeShutdownPreflightReady: false,
      watchdogReady: false,
      configSwitchReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      stopsServices: false,
      installsWatchdog: false,
      installsStartup: false,
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
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_OBSERVABILITY_SURFACE_IDS,
  REQUIRED_RUNTIME_EVIDENCE,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES,
  evaluateHttpRuntimeObservabilityOperation,
  normalizeHttpRuntimeObservabilityOperationInput
};
