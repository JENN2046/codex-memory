const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-evidence-freshness-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-evidence-freshness-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-evidence-freshness-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_FRESHNESS_FIELDS = Object.freeze([
  'evidence_id',
  'source_id',
  'source_kind',
  'source_registry_version',
  'baseline_commit',
  'evidence_generated_at',
  'evidence_validated_at',
  'evidence_observed_hash',
  'validation_status',
  'validation_ref'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_explicit_as_of',
  'missing_expected_baseline_commit',
  'missing_expected_source_registry_version',
  'missing_evidence_record',
  'missing_required_freshness_field',
  'duplicate_evidence_id',
  'non_iso8601_utc_timestamp',
  'generated_after_validated',
  'validated_after_as_of',
  'baseline_commit_mismatch',
  'source_registry_version_mismatch',
  'validation_status_not_passed',
  'missing_freshness_window',
  'expired_freshness_window',
  'unsafe_low_risk_summary',
  'unsafe_no_touch_boundary',
  'readiness_overclaim'
]);

const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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
  return cloneArray(values).map(normalizeString).filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : null;
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

function parseIsoUtcTimestamp(value) {
  if (!ISO_UTC_TIMESTAMP.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEvidenceRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    evidence_id: normalizeString(safeRecord.evidence_id),
    source_id: normalizeString(safeRecord.source_id),
    source_kind: normalizeString(safeRecord.source_kind),
    source_registry_version: normalizeString(safeRecord.source_registry_version),
    baseline_commit: normalizeString(safeRecord.baseline_commit),
    evidence_generated_at: normalizeString(safeRecord.evidence_generated_at),
    evidence_validated_at: normalizeString(safeRecord.evidence_validated_at),
    evidence_observed_hash: normalizeString(safeRecord.evidence_observed_hash),
    validation_status: normalizeString(safeRecord.validation_status),
    validation_ref: normalizeString(safeRecord.validation_ref)
  };
}

function normalizeFreshnessWindow(window = {}) {
  const safeWindow = isPlainObject(window) ? window : {};

  return {
    source_kind: normalizeString(safeWindow.source_kind),
    max_age_ms: normalizeNumber(safeWindow.max_age_ms)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    readsFiles: normalizeBoolean(safeSafety.readsFiles),
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
    evidenceFreshnessProofReady: normalizeBoolean(safeReadiness.evidenceFreshnessProofReady),
    validationAggregatorFullImplementationReady: normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeValidationAggregatorEvidenceFreshnessProofInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    asOf: normalizeString(safeInput.asOf),
    expectedBaselineCommit: normalizeString(safeInput.expectedBaselineCommit),
    expectedSourceRegistryVersion: normalizeString(safeInput.expectedSourceRegistryVersion),
    validationAggregatorFullImplementation: normalizeBoolean(safeInput.validationAggregatorFullImplementation),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    evidenceRecords: cloneArray(safeInput.evidenceRecords).map(normalizeEvidenceRecord),
    freshnessWindows: cloneArray(safeInput.freshnessWindows).map(normalizeFreshnessWindow),
    lowRiskSummary: isPlainObject(safeInput.lowRiskSummary)
      ? {
          rawWorkspaceIdExposed: normalizeBoolean(safeInput.lowRiskSummary.rawWorkspaceIdExposed),
          rawSecretExposed: normalizeBoolean(safeInput.lowRiskSummary.rawSecretExposed)
        }
      : {
          rawWorkspaceIdExposed: false,
          rawSecretExposed: false
        },
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function ageBucket(ageMs, windowMs) {
  if (!Number.isFinite(ageMs) || !Number.isFinite(windowMs) || windowMs <= 0) return 'unknown';
  if (ageMs <= windowMs / 2) return 'fresh';
  if (ageMs <= windowMs) return 'near_window_limit';
  return 'expired';
}

function evaluateEvidenceRecord(record, normalized, asOfMs, freshnessWindowsByKind) {
  const failClosedReasons = [];
  const missingFields = REQUIRED_FRESHNESS_FIELDS.filter(field => !record[field]);
  const generatedAtMs = parseIsoUtcTimestamp(record.evidence_generated_at);
  const validatedAtMs = parseIsoUtcTimestamp(record.evidence_validated_at);
  const windowMs = freshnessWindowsByKind.get(record.source_kind);

  if (missingFields.length > 0) failClosedReasons.push('missing_required_freshness_field');
  if (record.evidence_generated_at && generatedAtMs === null) failClosedReasons.push('non_iso8601_utc_timestamp');
  if (record.evidence_validated_at && validatedAtMs === null) failClosedReasons.push('non_iso8601_utc_timestamp');
  if (generatedAtMs !== null && validatedAtMs !== null && generatedAtMs > validatedAtMs) {
    failClosedReasons.push('generated_after_validated');
  }
  if (validatedAtMs !== null && validatedAtMs > asOfMs) {
    failClosedReasons.push('validated_after_as_of');
  }
  if (record.baseline_commit && record.baseline_commit !== normalized.expectedBaselineCommit) {
    failClosedReasons.push('baseline_commit_mismatch');
  }
  if (record.source_registry_version && record.source_registry_version !== normalized.expectedSourceRegistryVersion) {
    failClosedReasons.push('source_registry_version_mismatch');
  }
  if (record.validation_status && record.validation_status !== 'passed') {
    failClosedReasons.push('validation_status_not_passed');
  }
  if (windowMs === undefined) {
    failClosedReasons.push('missing_freshness_window');
  } else if (validatedAtMs !== null && asOfMs - validatedAtMs > windowMs) {
    failClosedReasons.push('expired_freshness_window');
  }

  const ageMs = validatedAtMs === null ? null : asOfMs - validatedAtMs;

  return {
    id: record.evidence_id,
    sourceKind: record.source_kind,
    validationStatus: record.validation_status,
    freshnessStatus: failClosedReasons.length === 0 ? 'fresh' : 'blocked',
    ageBucket: ageBucket(ageMs, windowMs),
    missingFields,
    failClosedReasons
  };
}

function evaluateValidationAggregatorEvidenceFreshnessProof(input = {}) {
  const normalized = normalizeValidationAggregatorEvidenceFreshnessProofInput(input);
  const evidenceIds = normalized.evidenceRecords.map(record => record.evidence_id).filter(Boolean);
  const duplicateEvidenceIds = collectDuplicateValues(evidenceIds);
  const failClosedReasons = [];
  const asOfMs = parseIsoUtcTimestamp(normalized.asOf);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (asOfMs === null) failClosedReasons.push('missing_explicit_as_of');
  if (!normalized.expectedBaselineCommit) failClosedReasons.push('missing_expected_baseline_commit');
  if (!normalized.expectedSourceRegistryVersion) failClosedReasons.push('missing_expected_source_registry_version');
  if (normalized.evidenceRecords.length === 0) failClosedReasons.push('missing_evidence_record');
  if (duplicateEvidenceIds.length > 0) failClosedReasons.push('duplicate_evidence_id');
  if (
    normalized.lowRiskSummary.rawWorkspaceIdExposed ||
    normalized.lowRiskSummary.rawSecretExposed
  ) {
    failClosedReasons.push('unsafe_low_risk_summary');
  }
  if (Object.values(normalized.safety).some(Boolean)) failClosedReasons.push('unsafe_no_touch_boundary');
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

  const freshnessWindowsByKind = new Map(
    normalized.freshnessWindows
      .filter(window => window.source_kind && Number.isFinite(window.max_age_ms))
      .map(window => [window.source_kind, window.max_age_ms])
  );
  const evidenceSummaries = normalized.evidenceRecords.map(record =>
    evaluateEvidenceRecord(record, normalized, asOfMs ?? 0, freshnessWindowsByKind)
  );

  for (const summary of evidenceSummaries) {
    failClosedReasons.push(...summary.failClosedReasons);
  }

  const accepted = failClosedReasons.length === 0;
  const uniqueFailClosedReasons = uniqueValues(failClosedReasons);

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'evidence_freshness_proof_accepted_runtime_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    failClosedReasons: uniqueFailClosedReasons,
    evidenceFreshness: {
      count: normalized.evidenceRecords.length,
      duplicateIds: duplicateEvidenceIds,
      requiredFields: [...REQUIRED_FRESHNESS_FIELDS],
      summaries: evidenceSummaries.map(summary => ({
        id: summary.id,
        sourceKind: summary.sourceKind,
        validationStatus: summary.validationStatus,
        freshnessStatus: summary.freshnessStatus,
        ageBucket: summary.ageBucket,
        missingFields: summary.missingFields
      }))
    },
    safety: {
      readsFiles: normalized.safety.readsFiles,
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
      evidenceFreshnessProofReady: accepted,
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
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_FRESHNESS_FIELDS,
  evaluateValidationAggregatorEvidenceFreshnessProof,
  normalizeValidationAggregatorEvidenceFreshnessProofInput
};
