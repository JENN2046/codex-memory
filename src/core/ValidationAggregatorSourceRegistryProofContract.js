const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-source-registry-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-source-registry-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-source-registry-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_SOURCE_REGISTRY_IDS = Object.freeze([
  'committed_fixture_evidence',
  'committed_contract_test_evidence',
  'static_report_shape_evidence',
  'explicit_sanitized_runtime_summary_evidence',
  'local_allowlisted_runner_evidence',
  'runtime_write_boundary_guard_evidence'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'non_exact_source_registry',
  'duplicate_source_registry_id',
  'source_claims_runtime_authority',
  'source_claims_readiness_authority',
  'unsafe_no_touch_boundary',
  'readiness_overclaim'
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
  return cloneArray(values).map(normalizeString).filter(Boolean);
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

function normalizeSourceRegistryEntry(entry = {}) {
  const safeEntry = isPlainObject(entry) ? entry : {};

  return {
    id: normalizeString(safeEntry.id),
    sourceType: normalizeString(safeEntry.sourceType),
    sourceClass: normalizeString(safeEntry.sourceClass),
    evidenceRef: normalizeString(safeEntry.evidenceRef),
    freshnessBound: normalizeBoolean(safeEntry.freshnessBound),
    baselineBound: normalizeBoolean(safeEntry.baselineBound),
    runtimeAuthority: normalizeBoolean(safeEntry.runtimeAuthority),
    readinessAuthority: normalizeBoolean(safeEntry.readinessAuthority)
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
    sourceRegistryProofReady: normalizeBoolean(safeReadiness.sourceRegistryProofReady),
    validationAggregatorFullImplementationReady: normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeValidationAggregatorSourceRegistryProofInput(input = {}) {
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
    sourceRegistry: cloneArray(safeInput.sourceRegistry).map(normalizeSourceRegistryEntry),
    failClosedReasons: normalizeStringArray(safeInput.failClosedReasons),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evaluateValidationAggregatorSourceRegistryProof(input = {}) {
  const normalized = normalizeValidationAggregatorSourceRegistryProofInput(input);
  const sourceIds = normalized.sourceRegistry.map(entry => entry.id).filter(Boolean);
  const duplicateSourceIds = collectDuplicateValues(sourceIds);
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (!hasExactSet(sourceIds, REQUIRED_SOURCE_REGISTRY_IDS)) failClosedReasons.push('non_exact_source_registry');
  if (duplicateSourceIds.length > 0) failClosedReasons.push('duplicate_source_registry_id');
  if (normalized.sourceRegistry.some(entry => entry.runtimeAuthority)) {
    failClosedReasons.push('source_claims_runtime_authority');
  }
  if (normalized.sourceRegistry.some(entry => entry.readinessAuthority)) {
    failClosedReasons.push('source_claims_readiness_authority');
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

  const accepted = failClosedReasons.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'source_registry_proof_accepted_runtime_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    failClosedReasons,
    sourceRegistry: {
      count: sourceIds.length,
      exact: hasExactSet(sourceIds, REQUIRED_SOURCE_REGISTRY_IDS),
      duplicateIds: duplicateSourceIds,
      requiredIds: [...REQUIRED_SOURCE_REGISTRY_IDS],
      observedIds: sourceIds
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
      sourceRegistryProofReady: accepted,
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
  REQUIRED_SOURCE_REGISTRY_IDS,
  evaluateValidationAggregatorSourceRegistryProof,
  normalizeValidationAggregatorSourceRegistryProofInput
};
