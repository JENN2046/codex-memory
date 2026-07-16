const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p57-recall-isolation-runtime-proof-boundary-v1';
const EXPECTED_POLICY_VERSION = 'p57-recall-isolation-runtime-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p57-recall-isolation-runtime-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p38_recall_isolation_fixture',
  'p43_recall_migration_isolation_helper',
  'p55_evidence_runtime_trace_contract',
  'p56_governance_loop_boundary_contract'
]);

const REQUIRED_ISOLATED_RECORD_FAMILIES = Object.freeze([
  'governance_records',
  'validation_transcripts',
  'redaction_samples',
  'policy_decisions',
  'readiness_reports',
  'migration_metadata',
  'blocked_memory',
  'tombstoned_memory',
  'out_of_scope_memory'
]);

const REQUIRED_PROOF_SURFACE_IDS = Object.freeze([
  'normal_recall_namespace',
  'vector_index',
  'candidate_cache',
  'ranking',
  'projection',
  'user_visible_audit_summary',
  'recall_audit_summary'
]);

const REQUIRED_CONTROL_IDS = Object.freeze([
  'active_in_scope_user_memory_positive_control',
  'governance_record_negative_control'
]);

const REQUIRED_RUNTIME_PROOF_EVIDENCE = Object.freeze([
  'synthetic_runtime_harness_plan',
  'instrumented_namespace_assertions',
  'vector_exclusion_assertions',
  'candidate_cache_exclusion_assertions',
  'ranking_exclusion_assertions',
  'projection_exclusion_assertions',
  'user_visible_audit_summary_exclusion_assertions',
  'recall_audit_summary_exclusion_assertions',
  'negative_controls_for_isolated_record_families',
  'positive_control_for_active_in_scope_user_memory',
  'no_durable_write_evidence',
  'no_public_mcp_expansion_evidence',
  'machine_readable_contamination_report'
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
  'contaminated',
  'runtime_store_scan_requested',
  'real_memory_scan_requested'
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
  'runtime_recall_execution',
  'runtime_store_scan',
  'contamination_report_from_real_data',
  'durable_memory_write',
  'durable_audit_write',
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
    readinessAuthority: normalizeBoolean(safeSource.readinessAuthority)
  };
}

function normalizeProofSurface(surface = {}) {
  const safeSurface = isPlainObject(surface) ? surface : {};

  return {
    id: normalizeString(safeSurface.id),
    runtimeStoreReadAllowed: normalizeBoolean(safeSurface.runtimeStoreReadAllowed),
    contaminationAllowed: normalizeBoolean(safeSurface.contaminationAllowed),
    futureEvidenceRequired: normalizeBoolean(safeSurface.futureEvidenceRequired)
  };
}

function normalizeControl(control = {}) {
  const safeControl = isPlainObject(control) ? control : {};

  return {
    id: normalizeString(safeControl.id),
    recordFamily: normalizeString(safeControl.recordFamily),
    mayEnterNormalRecall: normalizeBoolean(safeControl.mayEnterNormalRecall),
    mayEnterVectorIndex: normalizeBoolean(safeControl.mayEnterVectorIndex),
    mayEnterCandidateCache: normalizeBoolean(safeControl.mayEnterCandidateCache),
    mayEnterRanking: normalizeBoolean(safeControl.mayEnterRanking),
    mayEnterProjection: normalizeBoolean(safeControl.mayEnterProjection),
    mayEnterUserVisibleAuditSummary: normalizeBoolean(safeControl.mayEnterUserVisibleAuditSummary)
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
    runtimeProofReady: normalizeBoolean(safeReadiness.runtimeProofReady),
    recallIsolationRuntimeReady: normalizeBoolean(safeReadiness.recallIsolationRuntimeReady),
    contaminationReportReady: normalizeBoolean(safeReadiness.contaminationReportReady),
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

function normalizeRecallIsolationRuntimeProofInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    synthetic: normalizeBoolean(safeInput.synthetic),
    localOnly: normalizeBoolean(safeInput.localOnly),
    boundaryInventoryOnly: normalizeBoolean(safeInput.boundaryInventoryOnly),
    runtimeIntegrated: normalizeBoolean(safeInput.runtimeIntegrated),
    runtimeProofImplemented: normalizeBoolean(safeInput.runtimeProofImplemented),
    runtimeProofExecuted: normalizeBoolean(safeInput.runtimeProofExecuted),
    recallIsolationRuntimeReady: normalizeBoolean(safeInput.recallIsolationRuntimeReady),
    contaminationReportProduced: normalizeBoolean(safeInput.contaminationReportProduced),
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
    sourceEvidence: cloneArray(safeInput.sourceEvidence).map(normalizeSourceEvidence),
    isolatedRecordFamilies: normalizeStringArray(safeInput.isolatedRecordFamilies),
    proofSurfaces: cloneArray(safeInput.proofSurfaces).map(normalizeProofSurface),
    controls: cloneArray(safeInput.controls).map(normalizeControl),
    requiredRuntimeProofEvidence: normalizeStringArray(safeInput.requiredRuntimeProofEvidence),
    unsatisfiedRuntimeProofEvidence: normalizeStringArray(safeInput.unsatisfiedRuntimeProofEvidence),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function controlsSafe(controls) {
  const positive = controls.find(control => control.id === 'active_in_scope_user_memory_positive_control');
  const negative = controls.find(control => control.id === 'governance_record_negative_control');

  return Boolean(positive) &&
    Boolean(negative) &&
    positive.recordFamily === 'active_in_scope_user_memory' &&
    positive.mayEnterNormalRecall === true &&
    positive.mayEnterVectorIndex === true &&
    positive.mayEnterCandidateCache === true &&
    positive.mayEnterRanking === true &&
    positive.mayEnterProjection === true &&
    positive.mayEnterUserVisibleAuditSummary === true &&
    negative.recordFamily === 'governance_records' &&
    negative.mayEnterNormalRecall === false &&
    negative.mayEnterVectorIndex === false &&
    negative.mayEnterCandidateCache === false &&
    negative.mayEnterRanking === false &&
    negative.mayEnterProjection === false &&
    negative.mayEnterUserVisibleAuditSummary === false;
}

function evaluateRecallIsolationRuntimeProof(input = {}) {
  const normalized = normalizeRecallIsolationRuntimeProofInput(input);
  const sourceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const surfaceIds = normalized.proofSurfaces.map(surface => surface.id).filter(Boolean);
  const controlIds = normalized.controls.map(control => control.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const duplicateSurfaceIds = collectDuplicateValues(surfaceIds);
  const duplicateControlIds = collectDuplicateValues(controlIds);
  const unsafeSources = normalized.sourceEvidence.filter(source =>
    source.runtimeAuthority === true ||
    source.readinessAuthority === true ||
    source.artifactRefs.length === 0
  );
  const unsafeSurfaces = normalized.proofSurfaces.filter(surface =>
    surface.runtimeStoreReadAllowed === true ||
    surface.contaminationAllowed === true ||
    surface.futureEvidenceRequired !== true
  );
  const exactContract =
    hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS) &&
    hasExactSet(normalized.isolatedRecordFamilies, REQUIRED_ISOLATED_RECORD_FAMILIES) &&
    hasExactSet(surfaceIds, REQUIRED_PROOF_SURFACE_IDS) &&
    hasExactSet(controlIds, REQUIRED_CONTROL_IDS) &&
    hasExactSet(normalized.requiredRuntimeProofEvidence, REQUIRED_RUNTIME_PROOF_EVIDENCE) &&
    hasExactSet(normalized.unsatisfiedRuntimeProofEvidence, REQUIRED_RUNTIME_PROOF_EVIDENCE) &&
    hasExactSet(normalized.failClosedStates, REQUIRED_FAIL_CLOSED_STATES) &&
    hasExactSet(normalized.blockedActions, REQUIRED_BLOCKED_ACTIONS);
  const safetyLeaked = Object.values(normalized.safety).some(Boolean);
  const readinessClaimed =
    normalized.runtimeIntegrated === true ||
    normalized.runtimeProofImplemented === true ||
    normalized.runtimeProofExecuted === true ||
    normalized.recallIsolationRuntimeReady === true ||
    normalized.contaminationReportProduced === true ||
    normalized.realMemoryScanned === true ||
    normalized.runtimeStoreScanned === true ||
    normalized.durableMemoryWritten === true ||
    normalized.durableAuditWritten === true ||
    normalized.publicMcpExpanded === true ||
    normalized.providerCalls !== 0 ||
    normalized.readiness.runtimeProofReady === true ||
    normalized.readiness.recallIsolationRuntimeReady === true ||
    normalized.readiness.contaminationReportReady === true ||
    normalized.readiness.runtimeReady === true ||
    normalized.readiness.finalRcMatrixReady === true ||
    normalized.readiness.v1RcReady === true ||
    normalized.readiness.pushReady === true ||
    normalized.readiness.releaseReady === true ||
    normalized.readiness.deployReady === true ||
    normalized.readiness.configSwitchReady === true ||
    normalized.readiness.watchdogReady === true;
  const controlsAreSafe = controlsSafe(normalized.controls);
  const accepted =
    isPlainObject(input) &&
    normalized.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.policyVersion === EXPECTED_POLICY_VERSION &&
    normalized.manifestVersion === EXPECTED_MANIFEST_VERSION &&
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.localOnly === true &&
    normalized.boundaryInventoryOnly === true &&
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.acceptedForPlanning === true &&
    normalized.readiness.localBoundaryInventoryReady === true &&
    exactContract &&
    duplicateSourceIds.length === 0 &&
    duplicateSurfaceIds.length === 0 &&
    duplicateControlIds.length === 0 &&
    unsafeSources.length === 0 &&
    unsafeSurfaces.length === 0 &&
    controlsAreSafe &&
    safetyLeaked === false &&
    readinessClaimed === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!exactContract) failClosedReasons.push('non_exact_recall_isolation_runtime_proof_contract');
  if (duplicateSourceIds.length > 0 || duplicateSurfaceIds.length > 0 || duplicateControlIds.length > 0) {
    failClosedReasons.push('duplicate_proof_id');
  }
  if (unsafeSources.length > 0) failClosedReasons.push('source_claims_runtime_authority');
  if (unsafeSurfaces.length > 0) failClosedReasons.push('proof_surface_allows_runtime_access_or_contamination');
  if (!controlsAreSafe) failClosedReasons.push('unsafe_or_missing_controls');
  if (safetyLeaked) failClosedReasons.push('safety_boundary_leaked');
  if (readinessClaimed) failClosedReasons.push('readiness_overclaim');

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'boundary_inventory_accepted_runtime_proof_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    runtimeProofReady: false,
    recallIsolationRuntimeReady: false,
    contaminationReportReady: false,
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
    isolatedRecordFamilies: {
      count: normalized.isolatedRecordFamilies.length,
      exact: hasExactSet(normalized.isolatedRecordFamilies, REQUIRED_ISOLATED_RECORD_FAMILIES)
    },
    proofSurfaces: {
      count: surfaceIds.length,
      exact: hasExactSet(surfaceIds, REQUIRED_PROOF_SURFACE_IDS),
      duplicateIds: duplicateSurfaceIds,
      unsafeIds: unsafeSurfaces.map(surface => surface.id).filter(Boolean)
    },
    controls: {
      count: controlIds.length,
      exact: hasExactSet(controlIds, REQUIRED_CONTROL_IDS),
      duplicateIds: duplicateControlIds,
      safe: controlsAreSafe
    },
    runtimeProofEvidence: {
      requiredExact: hasExactSet(normalized.requiredRuntimeProofEvidence, REQUIRED_RUNTIME_PROOF_EVIDENCE),
      unsatisfiedExact: hasExactSet(normalized.unsatisfiedRuntimeProofEvidence, REQUIRED_RUNTIME_PROOF_EVIDENCE)
    },
    readiness: {
      localBoundaryInventoryReady: normalized.readiness.localBoundaryInventoryReady,
      runtimeProofReady: false,
      recallIsolationRuntimeReady: false,
      contaminationReportReady: false,
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
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_ACTIONS,
  REQUIRED_CONTROL_IDS,
  REQUIRED_FAIL_CLOSED_STATES,
  REQUIRED_ISOLATED_RECORD_FAMILIES,
  REQUIRED_PROOF_SURFACE_IDS,
  REQUIRED_RUNTIME_PROOF_EVIDENCE,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  evaluateRecallIsolationRuntimeProof,
  normalizeRecallIsolationRuntimeProofInput
};
