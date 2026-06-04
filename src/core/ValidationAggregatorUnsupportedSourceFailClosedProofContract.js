const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-unsupported-source-fail-closed-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-unsupported-source-fail-closed-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-unsupported-source-fail-closed-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const SUPPORTED_SOURCE_TYPES = Object.freeze([
  'committed_fixture',
  'committed_doc',
  'local_validation_summary',
  'static_report_shape'
]);

const SUPPORTED_SOURCE_CLASSES = Object.freeze([
  'committed_evidence',
  'local_validation'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'unsupported_source_type',
  'unsupported_source_class',
  'unknown_source_kind',
  'runtime_source_without_a5_approval',
  'provider_source_without_a5_approval',
  'real_memory_source_without_a5_approval',
  'durable_write_source_without_a5_approval',
  'migration_apply_source_without_a5_approval',
  'public_mcp_expansion_source_without_a5_approval',
  'readiness_claim_without_authority',
  'a5_action_without_approval'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'supported_source_type_drift',
  'supported_source_class_drift',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'unsupported_source_accepted',
  'unsupported_source_downgraded',
  'runtime_source_without_a5_not_blocked',
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

function normalizeFailClosedCases(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      sourceType: normalizeString(item.sourceType),
      sourceClass: normalizeString(item.sourceClass),
      sourceKind: normalizeString(item.sourceKind),
      status: normalizeString(item.status),
      decision: normalizeString(item.decision),
      blockedReason: normalizeString(item.blockedReason),
      failClosed: normalizeBoolean(item.failClosed),
      accepted: normalizeBoolean(item.accepted),
      downgradedToStatic: normalizeBoolean(item.downgradedToStatic),
      a5Approved: normalizeBoolean(item.a5Approved),
      readinessAuthority: normalizeBoolean(item.readinessAuthority)
    }));
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
    readsFiles: normalizeBoolean(safeSafety.readsFiles),
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
    unsupportedSourceFailClosedProofReady:
      normalizeBoolean(safeReadiness.unsupportedSourceFailClosedProofReady),
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput(input = {}) {
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
    supportedSourceTypes: normalizeStringArray(safeInput.supportedSourceTypes),
    supportedSourceClasses: normalizeStringArray(safeInput.supportedSourceClasses),
    failClosedCases: normalizeFailClosedCases(safeInput.failClosedCases),
    lowRiskSummary: normalizeLowRiskSummary(safeInput.lowRiskSummary),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function findMissingRequiredFailClosedCases(caseIds) {
  return REQUIRED_FAIL_CLOSED_CASES.filter(caseId => !caseIds.includes(caseId));
}

function findUnknownFailClosedCases(caseIds) {
  return uniqueValues(caseIds.filter(caseId => !REQUIRED_FAIL_CLOSED_CASES.includes(caseId)));
}

function findAcceptedUnsupportedCases(cases) {
  return cases
    .filter(item => item.accepted || item.failClosed !== true || item.decision !== 'NOT_READY_BLOCKED')
    .map(item => item.id)
    .filter(Boolean);
}

function findDowngradedUnsupportedCases(cases) {
  return cases
    .filter(item => item.downgradedToStatic)
    .map(item => item.id)
    .filter(Boolean);
}

function findUnblockedRuntimeCases(cases) {
  return cases
    .filter(item =>
      /_without_a5_approval$/.test(item.id) &&
      (item.a5Approved || item.status === 'accepted' || item.failClosed !== true)
    )
    .map(item => item.id)
    .filter(Boolean);
}

function evaluateValidationAggregatorUnsupportedSourceFailClosedProof(input = {}) {
  const normalized = normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput(input);
  const failClosedReasons = [];
  const caseIds = normalized.failClosedCases.map(item => item.id).filter(Boolean);
  const missingRequiredFailClosedCases = findMissingRequiredFailClosedCases(caseIds);
  const duplicateFailClosedCases = findDuplicates(caseIds);
  const unknownFailClosedCases = findUnknownFailClosedCases(caseIds);
  const acceptedUnsupportedCases = findAcceptedUnsupportedCases(normalized.failClosedCases);
  const downgradedUnsupportedCases = findDowngradedUnsupportedCases(normalized.failClosedCases);
  const unblockedRuntimeCases = findUnblockedRuntimeCases(normalized.failClosedCases);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (!hasExactSet(normalized.supportedSourceTypes, SUPPORTED_SOURCE_TYPES)) {
    failClosedReasons.push('supported_source_type_drift');
  }
  if (!hasExactSet(normalized.supportedSourceClasses, SUPPORTED_SOURCE_CLASSES)) {
    failClosedReasons.push('supported_source_class_drift');
  }
  if (missingRequiredFailClosedCases.length > 0) failClosedReasons.push('missing_required_fail_closed_case');
  if (duplicateFailClosedCases.length > 0) failClosedReasons.push('duplicate_fail_closed_case');
  if (unknownFailClosedCases.length > 0) failClosedReasons.push('unknown_fail_closed_case');
  if (acceptedUnsupportedCases.length > 0) failClosedReasons.push('unsupported_source_accepted');
  if (downgradedUnsupportedCases.length > 0) failClosedReasons.push('unsupported_source_downgraded');
  if (unblockedRuntimeCases.length > 0) failClosedReasons.push('runtime_source_without_a5_not_blocked');
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
      ? 'unsupported_source_fail_closed_proof_accepted_runtime_still_blocked'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    missingRequiredFailClosedCases,
    duplicateFailClosedCases,
    unknownFailClosedCases,
    acceptedUnsupportedCases,
    downgradedUnsupportedCases,
    unblockedRuntimeCases,
    failClosedReasons: uniqueFailClosedReasons,
    summary: {
      requiredFailClosedCaseCount: REQUIRED_FAIL_CLOSED_CASES.length,
      providedFailClosedCaseCount: caseIds.length,
      missingRequiredFailClosedCaseCount: missingRequiredFailClosedCases.length,
      duplicateFailClosedCaseCount: duplicateFailClosedCases.length,
      unknownFailClosedCaseCount: unknownFailClosedCases.length,
      acceptedUnsupportedCaseCount: acceptedUnsupportedCases.length,
      downgradedUnsupportedCaseCount: downgradedUnsupportedCases.length,
      unblockedRuntimeCaseCount: unblockedRuntimeCases.length,
      failClosed: !accepted,
      inferredSourceKind: false,
      downgradedUnsupportedSource: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
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
      unsupportedSourceFailClosedProofReady: accepted,
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
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  SUPPORTED_SOURCE_CLASSES,
  SUPPORTED_SOURCE_TYPES,
  evaluateValidationAggregatorUnsupportedSourceFailClosedProof,
  normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput
};
