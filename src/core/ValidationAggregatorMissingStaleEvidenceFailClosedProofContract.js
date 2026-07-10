const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_EVIDENCE_GROUPS = Object.freeze([
  'source_registry_exact_set_proof',
  'evidence_freshness_proof',
  'baseline_binding_proof',
  'runtime_evidence_summary_normalization_proof',
  'missing_or_stale_evidence_fail_closed_proof',
  'unsupported_source_fail_closed_proof',
  'no_touch_boundary_proof',
  'readiness_overclaim_rejection_proof'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_required_evidence_group',
  'stale_evidence_group',
  'duplicate_evidence_group',
  'unknown_evidence_group',
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

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
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

function normalizeEvidenceItems(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      group: normalizeString(item.group),
      status: normalizeString(item.status),
      createdAt: normalizeString(item.createdAt),
      ageSeconds: normalizeNumber(item.ageSeconds),
      stale: normalizeBoolean(item.stale)
    }));
}

function normalizeLowRiskSummary(lowRiskSummary = {}) {
  const safeSummary = isPlainObject(lowRiskSummary) ? lowRiskSummary : {};

  return {
    rawWorkspaceIdExposed: normalizeBoolean(safeSummary.rawWorkspaceIdExposed),
    rawSecretExposed: normalizeBoolean(safeSummary.rawSecretExposed),
    rawEvidencePayloadExposed: normalizeBoolean(safeSummary.rawEvidencePayloadExposed)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    readsFiles: normalizeBoolean(safeSafety.readsFiles),
    refreshesEvidenceImplicitly: normalizeBoolean(safeSafety.refreshesEvidenceImplicitly),
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
    missingOrStaleEvidenceFailClosedProofReady:
      normalizeBoolean(safeReadiness.missingOrStaleEvidenceFailClosedProofReady),
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const evidenceItems = normalizeEvidenceItems(safeInput.evidence);
  const providedEvidenceGroups = normalizeStringArray(safeInput.providedEvidenceGroups);
  const evidenceGroupsFromItems = evidenceItems.map(item => item.group).filter(Boolean);
  const combinedEvidenceGroups = providedEvidenceGroups.length > 0
    ? providedEvidenceGroups
    : evidenceGroupsFromItems;

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
    asOf: normalizeString(safeInput.asOf),
    freshnessWindowSeconds: normalizeNumber(safeInput.freshnessWindowSeconds),
    providedEvidenceGroups: combinedEvidenceGroups,
    evidence: evidenceItems,
    lowRiskSummary: normalizeLowRiskSummary(safeInput.lowRiskSummary),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function findMissingRequiredEvidenceGroups(groups) {
  return REQUIRED_EVIDENCE_GROUPS.filter(group => !groups.includes(group));
}

function findUnknownEvidenceGroups(groups) {
  return uniqueValues(groups.filter(group => !REQUIRED_EVIDENCE_GROUPS.includes(group)));
}

function findStaleEvidenceGroups(evidence, freshnessWindowSeconds) {
  return uniqueValues(evidence
    .filter(item =>
      REQUIRED_EVIDENCE_GROUPS.includes(item.group) &&
      (item.stale || (freshnessWindowSeconds > 0 && item.ageSeconds > freshnessWindowSeconds))
    )
    .map(item => item.group));
}

function evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(input = {}) {
  const normalized = normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput(input);
  const failClosedReasons = [];
  const missingRequiredEvidenceGroups = findMissingRequiredEvidenceGroups(normalized.providedEvidenceGroups);
  const staleRequiredEvidenceGroups = findStaleEvidenceGroups(
    normalized.evidence,
    normalized.freshnessWindowSeconds
  );
  const duplicateEvidenceGroups = findDuplicates(normalized.providedEvidenceGroups);
  const unknownEvidenceGroups = findUnknownEvidenceGroups(normalized.providedEvidenceGroups);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (missingRequiredEvidenceGroups.length > 0) failClosedReasons.push('missing_required_evidence_group');
  if (staleRequiredEvidenceGroups.length > 0) failClosedReasons.push('stale_evidence_group');
  if (duplicateEvidenceGroups.length > 0) failClosedReasons.push('duplicate_evidence_group');
  if (unknownEvidenceGroups.length > 0) failClosedReasons.push('unknown_evidence_group');
  if (
    normalized.lowRiskSummary.rawWorkspaceIdExposed ||
    normalized.lowRiskSummary.rawSecretExposed ||
    normalized.lowRiskSummary.rawEvidencePayloadExposed
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
    normalized.readiness.rcReady
  ) {
    failClosedReasons.push('readiness_overclaim');
  }

  const uniqueFailClosedReasons = uniqueValues(failClosedReasons);
  const accepted = uniqueFailClosedReasons.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted
      ? 'missing_or_stale_evidence_fail_closed_proof_accepted_runtime_still_blocked'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    missingRequiredEvidenceGroups,
    staleRequiredEvidenceGroups,
    duplicateEvidenceGroups,
    unknownEvidenceGroups,
    failClosedReasons: uniqueFailClosedReasons,
    summary: {
      requiredEvidenceGroupCount: REQUIRED_EVIDENCE_GROUPS.length,
      providedEvidenceGroupCount: normalized.providedEvidenceGroups.length,
      missingRequiredEvidenceGroupCount: missingRequiredEvidenceGroups.length,
      staleRequiredEvidenceGroupCount: staleRequiredEvidenceGroups.length,
      duplicateEvidenceGroupCount: duplicateEvidenceGroups.length,
      unknownEvidenceGroupCount: unknownEvidenceGroups.length,
      failClosed: !accepted,
      inferredMissingEvidence: false,
      refreshedEvidenceImplicitly: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    safety: {
      readsFiles: normalized.safety.readsFiles,
      refreshesEvidenceImplicitly: normalized.safety.refreshesEvidenceImplicitly,
      executesCommands: normalized.safety.executesCommands,
      startsServices: normalized.safety.startsServices,
      callsProviders: normalized.safety.callsProviders,
      readsRealMemory: normalized.safety.readsRealMemory,
      scansRuntimeStores: normalized.safety.scansRuntimeStores,
      writesDurableState: normalized.safety.writesDurableState,
      expandsPublicMcp: normalized.safety.expandsPublicMcp,
      remoteWrites: normalized.safety.remoteWrites,
      rawSensitiveOutputExposed: normalized.safety.rawSensitiveOutputExposed
    },
    readiness: {
      missingOrStaleEvidenceFailClosedProofReady: accepted,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    }
  };
}

module.exports = {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_EVIDENCE_GROUPS,
  REQUIRED_FAIL_CLOSED_REASONS,
  evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof,
  normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput
};
