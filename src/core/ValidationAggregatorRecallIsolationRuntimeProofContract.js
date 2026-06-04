const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION =
  'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1';
const EXPECTED_POLICY_VERSION =
  'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-policy-v1';
const EXPECTED_MANIFEST_VERSION =
  'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
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

const REQUIRED_PROOF_SURFACES = Object.freeze([
  'normal_recall_namespace',
  'vector_index',
  'candidate_cache',
  'ranking',
  'projection',
  'user_visible_audit_summary',
  'recall_audit_summary'
]);

const REQUIRED_RUNTIME_EVIDENCE_GROUPS = Object.freeze([
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

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'missing_isolated_record_family',
  'duplicate_isolated_record_family',
  'unknown_isolated_record_family',
  'missing_proof_surface',
  'duplicate_proof_surface',
  'unknown_proof_surface',
  'missing_required_runtime_evidence',
  'duplicate_runtime_evidence',
  'unknown_runtime_evidence',
  'missing_positive_control',
  'missing_negative_control',
  'isolated_record_contaminates_normal_recall',
  'isolated_record_contaminates_vector_index',
  'isolated_record_contaminates_candidate_cache',
  'isolated_record_contaminates_ranking',
  'isolated_record_contaminates_projection',
  'isolated_record_contaminates_user_visible_audit_summary',
  'isolated_record_contaminates_recall_audit_summary',
  'positive_control_missing_from_normal_recall',
  'real_memory_scan_claim',
  'runtime_store_scan_claim',
  'contamination_report_from_real_data_claim',
  'durable_write_claim',
  'unsupported_source',
  'unsafe_summary_claim',
  'public_mcp_expansion_claim',
  'readiness_claim_without_authority'
]);

const REQUIRED_DISALLOWED_WORK = Object.freeze([
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
  'command_execution',
  'gate_execution',
  'runner_execution',
  'service_start',
  'provider_call',
  'config_mutation',
  'startup_watchdog_operation',
  'durable_memory_writer',
  'durable_audit_writer',
  'migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'public_mcp_expansion',
  'validate_memory_public_exposure',
  'package_lockfile_change',
  'env_secret_change',
  'push',
  'tag',
  'release',
  'deploy',
  'rc_ready_claim'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'selected_gap_drift',
  'source_plan_drift',
  'isolated_record_family_drift',
  'proof_surface_drift',
  'control_case_drift',
  'missing_required_runtime_evidence',
  'duplicate_runtime_evidence',
  'unknown_runtime_evidence',
  'runtime_evidence_not_missing',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'disallowed_work_drift',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
]);

const SENSITIVE_FRAGMENT_PATTERN = /(\bBearer\s+[A-Za-z0-9._-]+|(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[:=]|password\s*[:=]|token\s*[:=]|set-cookie|authorization\s*:|workspace-[A-Za-z0-9_-]{8,}|https?:\/\/|[A-Z]:[\\/])/i;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function hasExactSet(values, expectedValues) {
  return values.length === expectedValues.length &&
    findDuplicates(values).length === 0 &&
    expectedValues.every(value => values.includes(value));
}

function includesSensitiveFragment(value) {
  if (typeof value === 'string') return SENSITIVE_FRAGMENT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(includesSensitiveFragment);
  if (!isPlainObject(value)) return false;

  return Object.values(value).some(includesSensitiveFragment);
}

function normalizeSelectedGap(selectedGap = {}) {
  const safeGap = isPlainObject(selectedGap) ? selectedGap : {};

  return {
    id: normalizeString(safeGap.id),
    priority: Number.isFinite(safeGap.priority) ? safeGap.priority : 0,
    currentStatus: normalizeString(safeGap.currentStatus),
    requiresA5ApprovalBeforeRuntime: normalizeBoolean(safeGap.requiresA5ApprovalBeforeRuntime),
    remainsOpenAfterThisPhase: normalizeBoolean(safeGap.remainsOpenAfterThisPhase),
    readinessAuthority: normalizeBoolean(safeGap.readinessAuthority)
  };
}

function normalizeSourcePlan(sourcePlan = {}) {
  const safePlan = isPlainObject(sourcePlan) ? sourcePlan : {};

  return {
    phase: normalizeString(safePlan.phase),
    fixture: normalizeString(safePlan.fixture),
    test: normalizeString(safePlan.test),
    runtimeAuthority: normalizeBoolean(safePlan.runtimeAuthority),
    readinessAuthority: normalizeBoolean(safePlan.readinessAuthority)
  };
}

function normalizeIsolatedRecordFamilyAcceptanceCases(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      required: normalizeBoolean(item.required),
      currentStatus: normalizeString(item.currentStatus),
      mustBeExcludedFromAllProofSurfaces:
        normalizeBoolean(item.mustBeExcludedFromAllProofSurfaces),
      mustFailClosedWhenObserved: normalizeBoolean(item.mustFailClosedWhenObserved)
    }));
}

function normalizeProofSurfaceAcceptanceCases(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      required: normalizeBoolean(item.required),
      runtimeStoreReadAllowed: normalizeBoolean(item.runtimeStoreReadAllowed),
      contaminationAllowed: normalizeBoolean(item.contaminationAllowed),
      syntheticEvidenceAllowed: normalizeBoolean(item.syntheticEvidenceAllowed),
      realDataEvidenceAllowed: normalizeBoolean(item.realDataEvidenceAllowed),
      futureEvidenceRequired: normalizeBoolean(item.futureEvidenceRequired)
    }));
}

function normalizeControlCases(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      recordFamily: normalizeString(item.recordFamily),
      recordFamilies: normalizeStringArray(item.recordFamilies),
      required: normalizeBoolean(item.required),
      mayEnterNormalRecall: normalizeBoolean(item.mayEnterNormalRecall),
      mayEnterVectorIndex: normalizeBoolean(item.mayEnterVectorIndex),
      mayEnterCandidateCache: normalizeBoolean(item.mayEnterCandidateCache),
      mayEnterRanking: normalizeBoolean(item.mayEnterRanking),
      mayEnterProjection: normalizeBoolean(item.mayEnterProjection),
      mayEnterUserVisibleAuditSummary: normalizeBoolean(item.mayEnterUserVisibleAuditSummary),
      mayEnterRecallAuditSummary: normalizeBoolean(item.mayEnterRecallAuditSummary)
    }));
}

function normalizeRuntimeEvidenceGroups(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      required: normalizeBoolean(item.required),
      currentStatus: normalizeString(item.currentStatus),
      mustFailClosedWhenMissing: normalizeBoolean(item.mustFailClosedWhenMissing)
    }));
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    mutated: normalizeBoolean(safeSafety.mutated),
    fixtureOnly: normalizeBoolean(safeSafety.fixtureOnly),
    acceptanceContractOnly: normalizeBoolean(safeSafety.acceptanceContractOnly),
    noRuntimeImplementation: normalizeBoolean(safeSafety.noRuntimeImplementation),
    noRuntimeProofExecution: normalizeBoolean(safeSafety.noRuntimeProofExecution),
    noRecallExecution: normalizeBoolean(safeSafety.noRecallExecution),
    noRealMemoryRead: normalizeBoolean(safeSafety.noRealMemoryRead),
    noRealMemoryScan: normalizeBoolean(safeSafety.noRealMemoryScan),
    noDiaryScan: normalizeBoolean(safeSafety.noDiaryScan),
    noSqliteScan: normalizeBoolean(safeSafety.noSqliteScan),
    noVectorIndexScan: normalizeBoolean(safeSafety.noVectorIndexScan),
    noCandidateCacheScan: normalizeBoolean(safeSafety.noCandidateCacheScan),
    noRecallAuditScan: normalizeBoolean(safeSafety.noRecallAuditScan),
    noRuntimeStoreScan: normalizeBoolean(safeSafety.noRuntimeStoreScan),
    noContaminationReportFromRealData:
      normalizeBoolean(safeSafety.noContaminationReportFromRealData),
    noCommandExecution: normalizeBoolean(safeSafety.noCommandExecution),
    noGateExecution: normalizeBoolean(safeSafety.noGateExecution),
    noRunnerExecution: normalizeBoolean(safeSafety.noRunnerExecution),
    noServiceStart: normalizeBoolean(safeSafety.noServiceStart),
    noProviderCall: normalizeBoolean(safeSafety.noProviderCall),
    noConfigMutation: normalizeBoolean(safeSafety.noConfigMutation),
    noStartupWatchdogOperation: normalizeBoolean(safeSafety.noStartupWatchdogOperation),
    noDurableMemoryWrite: normalizeBoolean(safeSafety.noDurableMemoryWrite),
    noDurableAuditWrite: normalizeBoolean(safeSafety.noDurableAuditWrite),
    noMigrationApply: normalizeBoolean(safeSafety.noMigrationApply),
    noImportExportApply: normalizeBoolean(safeSafety.noImportExportApply),
    noBackupRestoreApply: normalizeBoolean(safeSafety.noBackupRestoreApply),
    noPublicMcpExpansion: normalizeBoolean(safeSafety.noPublicMcpExpansion),
    noPackageChange: normalizeBoolean(safeSafety.noPackageChange),
    noSecretChange: normalizeBoolean(safeSafety.noSecretChange),
    noRemoteWrite: normalizeBoolean(safeSafety.noRemoteWrite),
    noTagReleaseDeploy: normalizeBoolean(safeSafety.noTagReleaseDeploy)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    recallIsolationRuntimeProofReady:
      normalizeBoolean(safeReadiness.recallIsolationRuntimeProofReady),
    recallIsolationRuntimeProofExecuted:
      normalizeBoolean(safeReadiness.recallIsolationRuntimeProofExecuted),
    contaminationReportReady: normalizeBoolean(safeReadiness.contaminationReportReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady),
    cutoverReady: normalizeBoolean(safeReadiness.cutoverReady)
  };
}

function normalizeValidationAggregatorRecallIsolationRuntimeProofInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    selectedGap: normalizeSelectedGap(safeInput.selectedGap),
    sourcePlan: normalizeSourcePlan(safeInput.sourcePlan),
    validationAggregatorFullImplementation:
      normalizeBoolean(safeInput.validationAggregatorFullImplementation),
    recallIsolationRuntimeProofReady:
      normalizeBoolean(safeInput.recallIsolationRuntimeProofReady),
    recallIsolationRuntimeProofExecuted:
      normalizeBoolean(safeInput.recallIsolationRuntimeProofExecuted),
    contaminationReportReady: normalizeBoolean(safeInput.contaminationReportReady),
    contaminationReportProduced: normalizeBoolean(safeInput.contaminationReportProduced),
    realMemoryScanned: normalizeBoolean(safeInput.realMemoryScanned),
    runtimeStoreScanned: normalizeBoolean(safeInput.runtimeStoreScanned),
    runtimeReady: normalizeBoolean(safeInput.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeInput.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeInput.v1RcReady),
    rcReady: normalizeBoolean(safeInput.rcReady),
    cutoverReady: normalizeBoolean(safeInput.cutoverReady),
    publicToolsFrozen: normalizeBoolean(safeInput.publicToolsFrozen),
    publicTools: normalizeStringArray(safeInput.publicTools),
    internalOnlyTools: normalizeStringArray(safeInput.internalOnlyTools),
    isolatedRecordFamilyAcceptanceCases:
      normalizeIsolatedRecordFamilyAcceptanceCases(safeInput.isolatedRecordFamilyAcceptanceCases),
    proofSurfaceAcceptanceCases:
      normalizeProofSurfaceAcceptanceCases(safeInput.proofSurfaceAcceptanceCases),
    controlCases: normalizeControlCases(safeInput.controlCases),
    requiredRuntimeEvidenceGroups:
      normalizeRuntimeEvidenceGroups(safeInput.requiredRuntimeEvidenceGroups),
    failClosedCases: normalizeStringArray(safeInput.failClosedCases),
    disallowedWork: normalizeStringArray(safeInput.disallowedWork),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function findMissingRequired(values, requiredValues) {
  return requiredValues.filter(value => !values.includes(value));
}

function findUnknown(values, requiredValues) {
  return uniqueValues(values.filter(value => !requiredValues.includes(value)));
}

function evaluateValidationAggregatorRecallIsolationRuntimeProof(input = {}) {
  const normalized = normalizeValidationAggregatorRecallIsolationRuntimeProofInput(input);
  const failClosedReasons = [];
  const familyIds = normalized.isolatedRecordFamilyAcceptanceCases.map(item => item.id).filter(Boolean);
  const proofSurfaceIds = normalized.proofSurfaceAcceptanceCases.map(item => item.id).filter(Boolean);
  const runtimeEvidenceIds = normalized.requiredRuntimeEvidenceGroups.map(item => item.id).filter(Boolean);
  const failClosedCaseIds = normalized.failClosedCases;
  const disallowedWorkIds = normalized.disallowedWork;

  const missingIsolatedRecordFamilies =
    findMissingRequired(familyIds, REQUIRED_ISOLATED_RECORD_FAMILIES);
  const duplicateIsolatedRecordFamilies = findDuplicates(familyIds);
  const unknownIsolatedRecordFamilies = findUnknown(familyIds, REQUIRED_ISOLATED_RECORD_FAMILIES);
  const unsafeIsolatedRecordFamilies = normalized.isolatedRecordFamilyAcceptanceCases
    .filter(item => (
      !item.required ||
      item.currentStatus !== 'acceptance_defined_not_runtime_executed' ||
      !item.mustBeExcludedFromAllProofSurfaces ||
      !item.mustFailClosedWhenObserved
    ))
    .map(item => item.id)
    .filter(Boolean);

  const missingProofSurfaces = findMissingRequired(proofSurfaceIds, REQUIRED_PROOF_SURFACES);
  const duplicateProofSurfaces = findDuplicates(proofSurfaceIds);
  const unknownProofSurfaces = findUnknown(proofSurfaceIds, REQUIRED_PROOF_SURFACES);
  const unsafeProofSurfaces = normalized.proofSurfaceAcceptanceCases
    .filter(item => (
      !item.required ||
      item.runtimeStoreReadAllowed ||
      item.contaminationAllowed ||
      !item.syntheticEvidenceAllowed ||
      item.realDataEvidenceAllowed ||
      !item.futureEvidenceRequired
    ))
    .map(item => item.id)
    .filter(Boolean);

  const positiveControl = normalized.controlCases
    .find(item => item.id === 'active_in_scope_user_memory_positive_control');
  const negativeControl = normalized.controlCases
    .find(item => item.id === 'isolated_record_negative_controls');
  const missingRequiredRuntimeEvidence =
    findMissingRequired(runtimeEvidenceIds, REQUIRED_RUNTIME_EVIDENCE_GROUPS);
  const duplicateRuntimeEvidence = findDuplicates(runtimeEvidenceIds);
  const unknownRuntimeEvidence = findUnknown(runtimeEvidenceIds, REQUIRED_RUNTIME_EVIDENCE_GROUPS);
  const runtimeEvidenceNotMissing = normalized.requiredRuntimeEvidenceGroups
    .filter(item => !item.required || item.currentStatus !== 'missing' || !item.mustFailClosedWhenMissing)
    .map(item => item.id)
    .filter(Boolean);
  const missingRequiredFailClosedCases = findMissingRequired(failClosedCaseIds, REQUIRED_FAIL_CLOSED_CASES);
  const duplicateFailClosedCases = findDuplicates(failClosedCaseIds);
  const unknownFailClosedCases = findUnknown(failClosedCaseIds, REQUIRED_FAIL_CLOSED_CASES);
  const missingRequiredDisallowedWork = findMissingRequired(disallowedWorkIds, REQUIRED_DISALLOWED_WORK);
  const duplicateDisallowedWork = findDuplicates(disallowedWorkIds);
  const unknownDisallowedWork = findUnknown(disallowedWorkIds, REQUIRED_DISALLOWED_WORK);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) {
    failClosedReasons.push('manifest_version_mismatch');
  }
  if (!normalized.publicToolsFrozen || !hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS)) {
    failClosedReasons.push('public_mcp_tools_drift');
  }
  if (
    normalized.selectedGap.id !== 'recall_isolation_runtime_proof_not_executed' ||
    normalized.selectedGap.priority !== 3 ||
    normalized.selectedGap.currentStatus !== 'open' ||
    !normalized.selectedGap.requiresA5ApprovalBeforeRuntime ||
    !normalized.selectedGap.remainsOpenAfterThisPhase ||
    normalized.selectedGap.readinessAuthority
  ) {
    failClosedReasons.push('selected_gap_drift');
  }
  if (
    normalized.sourcePlan.phase !== 'P66.42-validation-aggregator-recall-isolation-runtime-proof-gap-planning' ||
    normalized.sourcePlan.fixture !==
      'tests/fixtures/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-v1.json' ||
    normalized.sourcePlan.test !==
      'tests/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-fixture.test.js' ||
    normalized.sourcePlan.runtimeAuthority ||
    normalized.sourcePlan.readinessAuthority
  ) {
    failClosedReasons.push('source_plan_drift');
  }
  if (
    missingIsolatedRecordFamilies.length > 0 ||
    duplicateIsolatedRecordFamilies.length > 0 ||
    unknownIsolatedRecordFamilies.length > 0 ||
    unsafeIsolatedRecordFamilies.length > 0
  ) {
    failClosedReasons.push('isolated_record_family_drift');
  }
  if (
    missingProofSurfaces.length > 0 ||
    duplicateProofSurfaces.length > 0 ||
    unknownProofSurfaces.length > 0 ||
    unsafeProofSurfaces.length > 0
  ) {
    failClosedReasons.push('proof_surface_drift');
  }
  if (
    !positiveControl ||
    !positiveControl.required ||
    positiveControl.recordFamily !== 'active_in_scope_user_memory' ||
    !PROOF_SURFACES_AS_CONTROL_FIELDS.every(field => positiveControl[field])
  ) {
    failClosedReasons.push('control_case_drift');
  }
  if (
    !negativeControl ||
    !negativeControl.required ||
    !hasExactSet(negativeControl.recordFamilies, REQUIRED_ISOLATED_RECORD_FAMILIES) ||
    PROOF_SURFACES_AS_CONTROL_FIELDS.some(field => negativeControl[field])
  ) {
    failClosedReasons.push('control_case_drift');
  }
  if (missingRequiredRuntimeEvidence.length > 0) {
    failClosedReasons.push('missing_required_runtime_evidence');
  }
  if (duplicateRuntimeEvidence.length > 0) failClosedReasons.push('duplicate_runtime_evidence');
  if (unknownRuntimeEvidence.length > 0) failClosedReasons.push('unknown_runtime_evidence');
  if (runtimeEvidenceNotMissing.length > 0) failClosedReasons.push('runtime_evidence_not_missing');
  if (missingRequiredFailClosedCases.length > 0) failClosedReasons.push('missing_required_fail_closed_case');
  if (duplicateFailClosedCases.length > 0) failClosedReasons.push('duplicate_fail_closed_case');
  if (unknownFailClosedCases.length > 0) failClosedReasons.push('unknown_fail_closed_case');
  if (
    missingRequiredDisallowedWork.length > 0 ||
    duplicateDisallowedWork.length > 0 ||
    unknownDisallowedWork.length > 0
  ) {
    failClosedReasons.push('disallowed_work_drift');
  }
  if (Object.entries(normalized.safety).some(([key, value]) => (key === 'mutated' ? value : !value))) {
    failClosedReasons.push('unsafe_safety_flag');
  }
  if (includesSensitiveFragment(input)) failClosedReasons.push('sensitive_fragment_rejected');
  if (
    normalized.validationAggregatorFullImplementation ||
    normalized.recallIsolationRuntimeProofReady ||
    normalized.recallIsolationRuntimeProofExecuted ||
    normalized.contaminationReportReady ||
    normalized.contaminationReportProduced ||
    normalized.realMemoryScanned ||
    normalized.runtimeStoreScanned ||
    normalized.runtimeReady ||
    normalized.finalRcMatrixReady ||
    normalized.v1RcReady ||
    normalized.rcReady ||
    normalized.cutoverReady ||
    Object.values(normalized.readiness).some(Boolean)
  ) {
    failClosedReasons.push('readiness_overclaim');
  }

  const uniqueFailClosedReasons = uniqueValues(failClosedReasons);
  const accepted = uniqueFailClosedReasons.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted
      ? 'recall_isolation_acceptance_contract_accepted_runtime_still_blocked'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    selectedGapOpen: true,
    recallIsolationRuntimeProofReady: false,
    recallIsolationRuntimeProofExecuted: false,
    contaminationReportReady: false,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    cutoverReady: false,
    missingIsolatedRecordFamilies,
    duplicateIsolatedRecordFamilies,
    unknownIsolatedRecordFamilies,
    unsafeIsolatedRecordFamilies,
    missingProofSurfaces,
    duplicateProofSurfaces,
    unknownProofSurfaces,
    unsafeProofSurfaces,
    missingRequiredRuntimeEvidence,
    duplicateRuntimeEvidence,
    unknownRuntimeEvidence,
    runtimeEvidenceNotMissing,
    missingRequiredFailClosedCases,
    duplicateFailClosedCases,
    unknownFailClosedCases,
    missingRequiredDisallowedWork,
    duplicateDisallowedWork,
    unknownDisallowedWork,
    failClosedReasons: uniqueFailClosedReasons,
    summary: {
      isolatedRecordFamilyCount: familyIds.length,
      requiredIsolatedRecordFamilyCount: REQUIRED_ISOLATED_RECORD_FAMILIES.length,
      proofSurfaceCount: proofSurfaceIds.length,
      requiredProofSurfaceCount: REQUIRED_PROOF_SURFACES.length,
      requiredRuntimeEvidenceGroupCount: REQUIRED_RUNTIME_EVIDENCE_GROUPS.length,
      providedRuntimeEvidenceGroupCount: runtimeEvidenceIds.length,
      failClosedCaseCount: failClosedCaseIds.length,
      disallowedWorkCount: disallowedWorkIds.length,
      failClosed: !accepted,
      noRuntimeProofExecution: true,
      noRecallExecution: true,
      noRealMemoryScan: true,
      noRuntimeStoreScan: true,
      noDurableMemoryWrite: true,
      noDurableAuditWrite: true,
      noProvider: true,
      noRemoteWrite: true
    },
    safety: {
      mutated: false,
      readsEvidenceFiles: false,
      executesCommands: false,
      runsGates: false,
      runsRunners: false,
      startsServices: false,
      callsProviders: false,
      mutatesConfig: false,
      operatesStartupWatchdog: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      scansDiary: false,
      scansSqlite: false,
      scansVectorIndex: false,
      scansCandidateCache: false,
      scansRecallAudit: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      exposesValidateMemoryPublicly: false,
      remoteWrites: false,
      tagReleaseDeploy: false
    },
    readiness: {
      recallIsolationAcceptanceContractReady: accepted,
      recallIsolationRuntimeProofReady: false,
      recallIsolationRuntimeProofExecuted: false,
      contaminationReportReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    }
  };
}

const PROOF_SURFACES_AS_CONTROL_FIELDS = Object.freeze([
  'mayEnterNormalRecall',
  'mayEnterVectorIndex',
  'mayEnterCandidateCache',
  'mayEnterRanking',
  'mayEnterProjection',
  'mayEnterUserVisibleAuditSummary',
  'mayEnterRecallAuditSummary'
]);

module.exports = {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_DISALLOWED_WORK,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_ISOLATED_RECORD_FAMILIES,
  REQUIRED_PROOF_SURFACES,
  REQUIRED_RUNTIME_EVIDENCE_GROUPS,
  evaluateValidationAggregatorRecallIsolationRuntimeProof,
  normalizeValidationAggregatorRecallIsolationRuntimeProofInput
};
