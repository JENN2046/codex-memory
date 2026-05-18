const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-readiness-overclaim-rejection-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-readiness-overclaim-rejection-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-readiness-overclaim-rejection-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const REQUIRED_READINESS_CLAIMS = Object.freeze([
  'validation-aggregator-full-implementation-ready',
  'runtime-ready',
  'final-rc-matrix-ready',
  'v1-rc-ready',
  'rc-ready',
  'cutover-ready'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'missing_readiness_overclaim_rejection_proof',
  'partial_evidence_claims_validation_aggregator_full_implementation',
  'static_evidence_claims_runtime_ready',
  'fixture_evidence_claims_final_rc_matrix_ready',
  'stale_gate_evidence_claims_v1_rc_ready',
  'local_runner_evidence_claims_rc_ready',
  'runtime_gap_count_nonzero_claims_ready',
  'a5_hard_stop_count_nonzero_claims_ready',
  'public_mcp_expansion_claims_ready',
  'validate_memory_public_claims_ready',
  'config_switch_claims_cutover_ready',
  'startup_watchdog_claims_cutover_ready',
  'provider_call_claims_ready',
  'real_memory_preview_claims_ready',
  'durable_write_claims_ready',
  'migration_apply_claims_ready',
  'import_export_apply_claims_ready',
  'tag_release_deploy_claims_ready'
]);

const REQUIRED_ALLOWED_EVIDENCE_POSTURE = Object.freeze([
  'fixture_acceptance_defined',
  'pure_helper_available',
  'static_report_shape_evidence',
  'sanitized_local_command_evidence_recorded'
]);

const REQUIRED_DISALLOWED_READINESS_POSTURE = Object.freeze([
  'runtime_collector_complete',
  'runtime_gap_zero_count',
  'a5_hard_stop_zero_count',
  'final_rc_matrix_ready',
  'v1_rc_ready',
  'rc_ready',
  'cutover_ready'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_required_readiness_claim',
  'duplicate_readiness_claim',
  'unknown_readiness_claim',
  'readiness_claim_not_rejected',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'runtime_gap_count_overclaim',
  'a5_hard_stop_count_overclaim',
  'evidence_posture_drift',
  'readiness_posture_drift',
  'unsafe_low_risk_summary',
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

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
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

function normalizeReadinessClaims(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      claim: normalizeString(item.claim),
      allowed: normalizeBoolean(item.allowed),
      expectedStatus: normalizeString(item.expectedStatus),
      expectedDecision: normalizeString(item.expectedDecision),
      failClosed: normalizeBoolean(item.failClosed),
      readinessAuthority: normalizeBoolean(item.readinessAuthority),
      requiredMissingEvidence: normalizeStringArray(item.requiredMissingEvidence)
    }));
}

function normalizeRuntimeGapStatus(runtimeGapStatus = {}) {
  const safeStatus = isPlainObject(runtimeGapStatus) ? runtimeGapStatus : {};

  return {
    remainingRuntimeGapCount: normalizeNumber(safeStatus.remainingRuntimeGapCount),
    allRuntimeGapsClosed: normalizeBoolean(safeStatus.allRuntimeGapsClosed),
    closedByThisPhase: normalizeNumber(safeStatus.closedByThisPhase),
    mustRemainBlockedWhenGapCountNonZero:
      normalizeBoolean(safeStatus.mustRemainBlockedWhenGapCountNonZero)
  };
}

function normalizeA5HardStopStatus(a5HardStopStatus = {}) {
  const safeStatus = isPlainObject(a5HardStopStatus) ? a5HardStopStatus : {};

  return {
    remainingA5HardStopCount: normalizeNumber(safeStatus.remainingA5HardStopCount),
    allA5HardStopsCleared: normalizeBoolean(safeStatus.allA5HardStopsCleared),
    clearedByThisPhase: normalizeNumber(safeStatus.clearedByThisPhase),
    mustRemainBlockedWhenHardStopCountNonZero:
      normalizeBoolean(safeStatus.mustRemainBlockedWhenHardStopCountNonZero)
  };
}

function normalizeLowRiskSummary(lowRiskSummary = {}) {
  const safeSummary = isPlainObject(lowRiskSummary) ? lowRiskSummary : {};

  return {
    rawWorkspaceIdExposed: normalizeBoolean(safeSummary.rawWorkspaceIdExposed),
    rawSecretExposed: normalizeBoolean(safeSummary.rawSecretExposed),
    rawSourcePayloadExposed: normalizeBoolean(safeSummary.rawSourcePayloadExposed)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    readsEvidenceFiles: normalizeBoolean(safeSafety.readsEvidenceFiles),
    executesCommands: normalizeBoolean(safeSafety.executesCommands),
    runsGates: normalizeBoolean(safeSafety.runsGates),
    runsRunners: normalizeBoolean(safeSafety.runsRunners),
    startsServices: normalizeBoolean(safeSafety.startsServices),
    callsProviders: normalizeBoolean(safeSafety.callsProviders),
    mutatesConfig: normalizeBoolean(safeSafety.mutatesConfig),
    operatesStartupWatchdog: normalizeBoolean(safeSafety.operatesStartupWatchdog),
    readsRealMemory: normalizeBoolean(safeSafety.readsRealMemory),
    scansRuntimeStores: normalizeBoolean(safeSafety.scansRuntimeStores),
    writesDurableState: normalizeBoolean(safeSafety.writesDurableState),
    expandsPublicMcp: normalizeBoolean(safeSafety.expandsPublicMcp),
    exposesValidateMemoryPublicly: normalizeBoolean(safeSafety.exposesValidateMemoryPublicly),
    remoteWrites: normalizeBoolean(safeSafety.remoteWrites),
    tagReleaseDeploy: normalizeBoolean(safeSafety.tagReleaseDeploy),
    rawSensitiveOutputExposed: normalizeBoolean(safeSafety.rawSensitiveOutputExposed)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    readinessOverclaimRejectionProofReady:
      normalizeBoolean(safeReadiness.readinessOverclaimRejectionProofReady),
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady),
    cutoverReady: normalizeBoolean(safeReadiness.cutoverReady)
  };
}

function normalizeValidationAggregatorReadinessOverclaimRejectionProofInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    validationAggregatorFullImplementation: normalizeBoolean(safeInput.validationAggregatorFullImplementation),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    readinessClaims: normalizeReadinessClaims(safeInput.readinessClaims),
    runtimeGapStatus: normalizeRuntimeGapStatus(safeInput.runtimeGapStatus),
    a5HardStopStatus: normalizeA5HardStopStatus(safeInput.a5HardStopStatus),
    failClosedCases: normalizeStringArray(safeInput.failClosedCases),
    allowedEvidencePosture: normalizeStringArray(safeInput.allowedEvidencePosture),
    disallowedReadinessPosture: normalizeStringArray(safeInput.disallowedReadinessPosture),
    lowRiskSummary: normalizeLowRiskSummary(safeInput.lowRiskSummary),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function findMissingRequiredReadinessClaims(claimIds) {
  return REQUIRED_READINESS_CLAIMS.filter(claimId => !claimIds.includes(claimId));
}

function findUnknownReadinessClaims(claimIds) {
  return uniqueValues(claimIds.filter(claimId => !REQUIRED_READINESS_CLAIMS.includes(claimId)));
}

function findReadinessClaimsNotRejected(claims) {
  return claims
    .filter(item => (
      item.allowed ||
      item.failClosed !== true ||
      item.expectedDecision !== 'NOT_READY_BLOCKED' ||
      !item.expectedStatus.startsWith('blocked_') ||
      item.readinessAuthority ||
      item.requiredMissingEvidence.length === 0
    ))
    .map(item => item.id)
    .filter(Boolean);
}

function findMissingRequiredFailClosedCases(caseIds) {
  return REQUIRED_FAIL_CLOSED_CASES.filter(caseId => !caseIds.includes(caseId));
}

function findUnknownFailClosedCases(caseIds) {
  return uniqueValues(caseIds.filter(caseId => !REQUIRED_FAIL_CLOSED_CASES.includes(caseId)));
}

function evaluateValidationAggregatorReadinessOverclaimRejectionProof(input = {}) {
  const normalized = normalizeValidationAggregatorReadinessOverclaimRejectionProofInput(input);
  const failClosedReasons = [];
  const readinessClaimIds = normalized.readinessClaims.map(item => item.id).filter(Boolean);
  const missingRequiredReadinessClaims = findMissingRequiredReadinessClaims(readinessClaimIds);
  const duplicateReadinessClaims = findDuplicates(readinessClaimIds);
  const unknownReadinessClaims = findUnknownReadinessClaims(readinessClaimIds);
  const readinessClaimsNotRejected = findReadinessClaimsNotRejected(normalized.readinessClaims);
  const failClosedCaseIds = normalized.failClosedCases;
  const missingRequiredFailClosedCases = findMissingRequiredFailClosedCases(failClosedCaseIds);
  const duplicateFailClosedCases = findDuplicates(failClosedCaseIds);
  const unknownFailClosedCases = findUnknownFailClosedCases(failClosedCaseIds);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (missingRequiredReadinessClaims.length > 0) failClosedReasons.push('missing_required_readiness_claim');
  if (duplicateReadinessClaims.length > 0) failClosedReasons.push('duplicate_readiness_claim');
  if (unknownReadinessClaims.length > 0) failClosedReasons.push('unknown_readiness_claim');
  if (readinessClaimsNotRejected.length > 0) failClosedReasons.push('readiness_claim_not_rejected');
  if (missingRequiredFailClosedCases.length > 0) failClosedReasons.push('missing_required_fail_closed_case');
  if (duplicateFailClosedCases.length > 0) failClosedReasons.push('duplicate_fail_closed_case');
  if (unknownFailClosedCases.length > 0) failClosedReasons.push('unknown_fail_closed_case');
  if (
    normalized.runtimeGapStatus.remainingRuntimeGapCount <= 0 ||
    normalized.runtimeGapStatus.allRuntimeGapsClosed ||
    normalized.runtimeGapStatus.closedByThisPhase > 0 ||
    !normalized.runtimeGapStatus.mustRemainBlockedWhenGapCountNonZero
  ) {
    failClosedReasons.push('runtime_gap_count_overclaim');
  }
  if (
    normalized.a5HardStopStatus.remainingA5HardStopCount <= 0 ||
    normalized.a5HardStopStatus.allA5HardStopsCleared ||
    normalized.a5HardStopStatus.clearedByThisPhase > 0 ||
    !normalized.a5HardStopStatus.mustRemainBlockedWhenHardStopCountNonZero
  ) {
    failClosedReasons.push('a5_hard_stop_count_overclaim');
  }
  if (!hasExactSet(normalized.allowedEvidencePosture, REQUIRED_ALLOWED_EVIDENCE_POSTURE)) {
    failClosedReasons.push('evidence_posture_drift');
  }
  if (!hasExactSet(normalized.disallowedReadinessPosture, REQUIRED_DISALLOWED_READINESS_POSTURE)) {
    failClosedReasons.push('readiness_posture_drift');
  }
  if (
    normalized.lowRiskSummary.rawWorkspaceIdExposed ||
    normalized.lowRiskSummary.rawSecretExposed ||
    normalized.lowRiskSummary.rawSourcePayloadExposed
  ) {
    failClosedReasons.push('unsafe_low_risk_summary');
  }
  if (Object.values(normalized.safety).some(Boolean)) failClosedReasons.push('unsafe_safety_flag');
  if (includesSensitiveFragment(input)) failClosedReasons.push('sensitive_fragment_rejected');
  if (
    normalized.validationAggregatorFullImplementation ||
    normalized.readiness.validationAggregatorFullImplementationReady ||
    normalized.readiness.runtimeReady ||
    normalized.readiness.finalRcMatrixReady ||
    normalized.readiness.v1RcReady ||
    normalized.readiness.rcReady ||
    normalized.readiness.cutoverReady
  ) {
    failClosedReasons.push('readiness_overclaim');
  }

  const uniqueFailClosedReasons = uniqueValues(failClosedReasons);
  const accepted = uniqueFailClosedReasons.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted
      ? 'readiness_overclaim_rejection_proof_accepted_runtime_still_blocked'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    cutoverReady: false,
    missingRequiredReadinessClaims,
    duplicateReadinessClaims,
    unknownReadinessClaims,
    readinessClaimsNotRejected,
    missingRequiredFailClosedCases,
    duplicateFailClosedCases,
    unknownFailClosedCases,
    failClosedReasons: uniqueFailClosedReasons,
    summary: {
      requiredReadinessClaimCount: REQUIRED_READINESS_CLAIMS.length,
      providedReadinessClaimCount: readinessClaimIds.length,
      readinessClaimsNotRejectedCount: readinessClaimsNotRejected.length,
      requiredFailClosedCaseCount: REQUIRED_FAIL_CLOSED_CASES.length,
      providedFailClosedCaseCount: failClosedCaseIds.length,
      missingRequiredFailClosedCaseCount: missingRequiredFailClosedCases.length,
      runtimeGapCount: normalized.runtimeGapStatus.remainingRuntimeGapCount,
      a5HardStopCount: normalized.a5HardStopStatus.remainingA5HardStopCount,
      failClosed: !accepted,
      sourceScannedAtRuntime: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    safety: {
      readsEvidenceFiles: normalized.safety.readsEvidenceFiles,
      executesCommands: normalized.safety.executesCommands,
      runsGates: normalized.safety.runsGates,
      runsRunners: normalized.safety.runsRunners,
      startsServices: normalized.safety.startsServices,
      callsProviders: normalized.safety.callsProviders,
      mutatesConfig: normalized.safety.mutatesConfig,
      operatesStartupWatchdog: normalized.safety.operatesStartupWatchdog,
      readsRealMemory: normalized.safety.readsRealMemory,
      scansRuntimeStores: normalized.safety.scansRuntimeStores,
      writesDurableState: normalized.safety.writesDurableState,
      expandsPublicMcp: normalized.safety.expandsPublicMcp,
      exposesValidateMemoryPublicly: normalized.safety.exposesValidateMemoryPublicly,
      remoteWrites: normalized.safety.remoteWrites,
      tagReleaseDeploy: normalized.safety.tagReleaseDeploy,
      rawSensitiveOutputExposed: normalized.safety.rawSensitiveOutputExposed
    },
    readiness: {
      readinessOverclaimRejectionProofReady: accepted,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    }
  };
}

module.exports = {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_ALLOWED_EVIDENCE_POSTURE,
  REQUIRED_DISALLOWED_READINESS_POSTURE,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_READINESS_CLAIMS,
  evaluateValidationAggregatorReadinessOverclaimRejectionProof,
  normalizeValidationAggregatorReadinessOverclaimRejectionProofInput
};
