const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-no-touch-boundary-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-no-touch-boundary-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-no-touch-boundary-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_TARGET_FAMILIES = Object.freeze([
  'validation_aggregator_service',
  'validation_aggregator_proof_helpers',
  'final_rc_runner_helpers',
  'governance_contract_helpers',
  'evidence_contract_helpers'
]);

const REQUIRED_DISALLOWED_IMPORTS = Object.freeze([
  'fs',
  'node:fs',
  'child_process',
  'node:child_process',
  'http',
  'node:http',
  'https',
  'node:https',
  'net',
  'node:net',
  'tls',
  'node:tls',
  'dgram',
  'node:dgram',
  'node:sqlite',
  'sqlite3',
  'better-sqlite3',
  'src/storage',
  'src/recall',
  'src/adapters'
]);

const REQUIRED_DISALLOWED_RUNTIME_CALLS = Object.freeze([
  'readFileSync',
  'readdirSync',
  'opendirSync',
  'createReadStream',
  'writeFileSync',
  'appendFileSync',
  'createWriteStream',
  'mkdirSync',
  'rmSync',
  'unlinkSync',
  'spawn',
  'spawnSync',
  'exec',
  'execFile',
  'execSync',
  'execFileSync',
  'fork',
  'fetch',
  'request',
  'connect'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'missing_no_touch_proof',
  'unsafe_import_detected',
  'unsafe_runtime_call_detected',
  'fs_read_detected',
  'fs_write_detected',
  'command_execution_detected',
  'network_call_detected',
  'runtime_store_import_detected',
  'storage_recall_adapter_import_detected',
  'provider_call_claim',
  'service_start_claim',
  'real_memory_scan_claim',
  'durable_write_claim',
  'public_mcp_expansion_claim',
  'readiness_claim_without_authority',
  'a5_action_without_approval'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'target_family_drift',
  'disallowed_import_set_drift',
  'disallowed_runtime_call_set_drift',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'unsafe_case_not_blocked',
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

function normalizeFailClosedCases(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      status: normalizeString(item.status),
      decision: normalizeString(item.decision),
      blockedReason: normalizeString(item.blockedReason),
      failClosed: normalizeBoolean(item.failClosed),
      detected: normalizeBoolean(item.detected),
      accepted: normalizeBoolean(item.accepted),
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
    scansSourceAtRuntime: normalizeBoolean(safeSafety.scansSourceAtRuntime),
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
    noTouchBoundaryProofReady: normalizeBoolean(safeReadiness.noTouchBoundaryProofReady),
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeValidationAggregatorNoTouchBoundaryProofInput(input = {}) {
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
    targetFamilies: normalizeStringArray(safeInput.targetFamilies),
    disallowedImports: normalizeStringArray(safeInput.disallowedImports),
    disallowedRuntimeCalls: normalizeStringArray(safeInput.disallowedRuntimeCalls),
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

function findUnsafeCasesNotBlocked(cases) {
  return cases
    .filter(item => item.accepted || item.failClosed !== true || item.decision !== 'NOT_READY_BLOCKED')
    .map(item => item.id)
    .filter(Boolean);
}

function evaluateValidationAggregatorNoTouchBoundaryProof(input = {}) {
  const normalized = normalizeValidationAggregatorNoTouchBoundaryProofInput(input);
  const failClosedReasons = [];
  const caseIds = normalized.failClosedCases.map(item => item.id).filter(Boolean);
  const missingRequiredFailClosedCases = findMissingRequiredFailClosedCases(caseIds);
  const duplicateFailClosedCases = findDuplicates(caseIds);
  const unknownFailClosedCases = findUnknownFailClosedCases(caseIds);
  const unsafeCasesNotBlocked = findUnsafeCasesNotBlocked(normalized.failClosedCases);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (!hasExactSet(normalized.targetFamilies, REQUIRED_TARGET_FAMILIES)) failClosedReasons.push('target_family_drift');
  if (!hasExactSet(normalized.disallowedImports, REQUIRED_DISALLOWED_IMPORTS)) {
    failClosedReasons.push('disallowed_import_set_drift');
  }
  if (!hasExactSet(normalized.disallowedRuntimeCalls, REQUIRED_DISALLOWED_RUNTIME_CALLS)) {
    failClosedReasons.push('disallowed_runtime_call_set_drift');
  }
  if (missingRequiredFailClosedCases.length > 0) failClosedReasons.push('missing_required_fail_closed_case');
  if (duplicateFailClosedCases.length > 0) failClosedReasons.push('duplicate_fail_closed_case');
  if (unknownFailClosedCases.length > 0) failClosedReasons.push('unknown_fail_closed_case');
  if (unsafeCasesNotBlocked.length > 0) failClosedReasons.push('unsafe_case_not_blocked');
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
      ? 'no_touch_boundary_proof_accepted_runtime_still_blocked'
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
    unsafeCasesNotBlocked,
    failClosedReasons: uniqueFailClosedReasons,
    summary: {
      requiredFailClosedCaseCount: REQUIRED_FAIL_CLOSED_CASES.length,
      providedFailClosedCaseCount: caseIds.length,
      missingRequiredFailClosedCaseCount: missingRequiredFailClosedCases.length,
      duplicateFailClosedCaseCount: duplicateFailClosedCases.length,
      unknownFailClosedCaseCount: unknownFailClosedCases.length,
      unsafeCaseNotBlockedCount: unsafeCasesNotBlocked.length,
      failClosed: !accepted,
      sourceScannedAtRuntime: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    safety: {
      scansSourceAtRuntime: normalized.safety.scansSourceAtRuntime,
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
      noTouchBoundaryProofReady: accepted,
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
  REQUIRED_DISALLOWED_IMPORTS,
  REQUIRED_DISALLOWED_RUNTIME_CALLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_TARGET_FAMILIES,
  evaluateValidationAggregatorNoTouchBoundaryProof,
  normalizeValidationAggregatorNoTouchBoundaryProofInput
};
