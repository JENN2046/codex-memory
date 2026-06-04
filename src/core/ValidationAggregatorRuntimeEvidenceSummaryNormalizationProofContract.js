const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_SUMMARY_FIELDS = Object.freeze([
  'status',
  'decision',
  'runnerExecuted',
  'commandsExecuted',
  'localRuntimeEvidenceMatrixExecuted',
  'allowlistedFinalRcEvidenceRunnerExecuted',
  'criticalGates',
  'locallyEvidencedRuntimeGaps',
  'remainingRuntimeGaps',
  'safety'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_runtime_evidence_summary',
  'missing_required_summary_field',
  'invalid_critical_gates',
  'unsafe_low_risk_summary',
  'unsafe_summary_rejected',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
]);

const SENSITIVE_FRAGMENT_PATTERN = /(\bBearer\s+[A-Za-z0-9._-]+|(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[:=]|password\s*[:=]|token\s*[:=]|set-cookie|authorization\s*:|workspace-[A-Za-z0-9_-]{8,}|https?:\/\/|[A-Z]:[\\/])/i;

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
  return Number.isFinite(value) ? value : 0;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasExactSet(values, expectedValues) {
  return values.length === expectedValues.length &&
    uniqueValues(values).length === values.length &&
    expectedValues.every(value => values.includes(value));
}

function includesSensitiveFragment(value) {
  if (typeof value === 'string') return SENSITIVE_FRAGMENT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(includesSensitiveFragment);
  if (!isPlainObject(value)) return false;

  return Object.values(value).some(includesSensitiveFragment);
}

function normalizeCriticalGates(criticalGates = {}) {
  const safeCriticalGates = isPlainObject(criticalGates) ? criticalGates : {};

  return {
    total: normalizeNumber(safeCriticalGates.total),
    passed: normalizeNumber(safeCriticalGates.passed),
    failed: normalizeNumber(safeCriticalGates.failed),
    allCriticalCommandsPassed: normalizeBoolean(safeCriticalGates.allCriticalCommandsPassed)
  };
}

function normalizeSummarySafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    mutated: normalizeBoolean(safeSafety.mutated),
    providerCalls: normalizeNumber(safeSafety.providerCalls ?? safeSafety.callsProviders),
    serviceStarted: normalizeBoolean(safeSafety.serviceStarted),
    writesDurableMemory: normalizeBoolean(safeSafety.writesDurableMemory),
    durableMemoryTouched: normalizeBoolean(safeSafety.durableMemoryTouched),
    durableMemoryWrite: normalizeBoolean(safeSafety.durableMemoryWrite),
    realMemoryPreview: normalizeBoolean(safeSafety.realMemoryPreview),
    readsRealMemory: normalizeBoolean(safeSafety.readsRealMemory),
    remoteWrites: normalizeBoolean(safeSafety.remoteWrites),
    pushed: normalizeBoolean(safeSafety.pushed),
    tagged: normalizeBoolean(safeSafety.tagged),
    released: normalizeBoolean(safeSafety.released),
    deployed: normalizeBoolean(safeSafety.deployed),
    migrationApplied: normalizeBoolean(safeSafety.migrationApplied),
    importExportApplied: normalizeBoolean(safeSafety.importExportApplied),
    configChanged: normalizeBoolean(safeSafety.configChanged),
    watchdogStartupInstalled: normalizeBoolean(safeSafety.watchdogStartupInstalled)
  };
}

function normalizeHelperSafety(safety = {}) {
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
    runtimeEvidenceSummaryNormalizationProofReady:
      normalizeBoolean(safeReadiness.runtimeEvidenceSummaryNormalizationProofReady),
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeRuntimeEvidenceSummary(summary = {}) {
  const safeSummary = isPlainObject(summary) ? summary : {};

  return {
    status: normalizeString(safeSummary.status),
    decision: normalizeString(safeSummary.decision),
    runnerExecuted: normalizeBoolean(safeSummary.runnerExecuted),
    commandsExecuted: normalizeBoolean(safeSummary.commandsExecuted),
    localRuntimeEvidenceMatrixExecuted: normalizeBoolean(safeSummary.localRuntimeEvidenceMatrixExecuted),
    allowlistedFinalRcEvidenceRunnerExecuted:
      normalizeBoolean(safeSummary.allowlistedFinalRcEvidenceRunnerExecuted),
    finalRcMatrixExecuted: normalizeBoolean(safeSummary.finalRcMatrixExecuted),
    fullFinalRcMatrixExecuted: normalizeBoolean(safeSummary.fullFinalRcMatrixExecuted),
    runtimeReady: normalizeBoolean(safeSummary.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeSummary.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeSummary.v1RcReady),
    rcReady: normalizeBoolean(safeSummary.rcReady),
    criticalGates: normalizeCriticalGates(safeSummary.criticalGates),
    locallyEvidencedRuntimeGaps: normalizeStringArray(safeSummary.locallyEvidencedRuntimeGaps),
    remainingRuntimeGaps: normalizeStringArray(safeSummary.remainingRuntimeGaps),
    safety: normalizeSummarySafety(safeSummary.safety)
  };
}

function normalizeValidationAggregatorRuntimeEvidenceSummaryNormalizationProofInput(input = {}) {
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
    runtimeEvidenceSummary: normalizeRuntimeEvidenceSummary(safeInput.runtimeEvidenceSummary),
    hasRuntimeEvidenceSummary: isPlainObject(safeInput.runtimeEvidenceSummary),
    lowRiskSummary: isPlainObject(safeInput.lowRiskSummary)
      ? {
          rawWorkspaceIdExposed: normalizeBoolean(safeInput.lowRiskSummary.rawWorkspaceIdExposed),
          rawSecretExposed: normalizeBoolean(safeInput.lowRiskSummary.rawSecretExposed)
        }
      : {
          rawWorkspaceIdExposed: false,
          rawSecretExposed: false
        },
    safety: normalizeHelperSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function hasUnsafeSummarySideEffect(summary) {
  const safety = summary.safety;
  const durableWrite = safety.writesDurableMemory ||
    safety.durableMemoryTouched ||
    safety.durableMemoryWrite;
  const realMemoryPreview = safety.realMemoryPreview || safety.readsRealMemory;
  const remoteWrite = safety.remoteWrites ||
    safety.pushed ||
    safety.tagged ||
    safety.released ||
    safety.deployed;

  return summary.runtimeReady ||
    summary.finalRcMatrixReady ||
    summary.fullFinalRcMatrixExecuted ||
    summary.v1RcReady ||
    summary.rcReady ||
    summary.finalRcMatrixExecuted ||
    safety.mutated ||
    safety.providerCalls > 0 ||
    safety.serviceStarted ||
    durableWrite ||
    realMemoryPreview ||
    remoteWrite ||
    safety.migrationApplied ||
    safety.importExportApplied ||
    safety.configChanged ||
    safety.watchdogStartupInstalled;
}

function evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof(input = {}) {
  const normalized = normalizeValidationAggregatorRuntimeEvidenceSummaryNormalizationProofInput(input);
  const summary = normalized.runtimeEvidenceSummary;
  const failClosedReasons = [];
  const missingSummaryFields = REQUIRED_SUMMARY_FIELDS.filter(field =>
    !isPlainObject(input) ||
    !isPlainObject(input.runtimeEvidenceSummary) ||
    !(field in input.runtimeEvidenceSummary)
  );

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (!normalized.hasRuntimeEvidenceSummary) failClosedReasons.push('missing_runtime_evidence_summary');
  if (missingSummaryFields.length > 0) failClosedReasons.push('missing_required_summary_field');
  if (
    summary.criticalGates.total < 0 ||
    summary.criticalGates.passed < 0 ||
    summary.criticalGates.failed < 0 ||
    summary.criticalGates.passed + summary.criticalGates.failed > summary.criticalGates.total
  ) {
    failClosedReasons.push('invalid_critical_gates');
  }
  if (
    normalized.lowRiskSummary.rawWorkspaceIdExposed ||
    normalized.lowRiskSummary.rawSecretExposed
  ) {
    failClosedReasons.push('unsafe_low_risk_summary');
  }
  if (Object.values(normalized.safety).some(Boolean) || hasUnsafeSummarySideEffect(summary)) {
    failClosedReasons.push('unsafe_summary_rejected');
  }
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
      ? 'runtime_evidence_summary_normalization_accepted_runtime_still_blocked'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    failClosedReasons: uniqueFailClosedReasons,
    runtimeEvidenceSummary: {
      sourceStatus: summary.status || 'unknown',
      sourceDecision: summary.decision || 'unknown',
      runnerExecuted: summary.runnerExecuted,
      commandsExecutedBySource: summary.commandsExecuted,
      commandsExecutedByAggregator: false,
      localRuntimeEvidenceMatrixExecutedBySource: summary.localRuntimeEvidenceMatrixExecuted,
      allowlistedFinalRcEvidenceRunnerExecutedBySource:
        summary.allowlistedFinalRcEvidenceRunnerExecuted,
      finalRcMatrixExecutedBySource: false,
      fullFinalRcMatrixExecutedBySource: false,
      criticalGateCount: summary.criticalGates.total,
      criticalGatePassedCount: summary.criticalGates.passed,
      criticalGateFailedCount: summary.criticalGates.failed,
      allCriticalCommandsPassed: summary.criticalGates.allCriticalCommandsPassed,
      locallyEvidencedRuntimeGapCount: summary.locallyEvidencedRuntimeGaps.length,
      remainingRuntimeGapCount: summary.remainingRuntimeGaps.length,
      missingSummaryFields,
      providerCalls: 0,
      mutated: false,
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
      runtimeEvidenceSummaryNormalizationProofReady: accepted,
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
  REQUIRED_SUMMARY_FIELDS,
  evaluateValidationAggregatorRuntimeEvidenceSummaryNormalizationProof,
  normalizeValidationAggregatorRuntimeEvidenceSummaryNormalizationProofInput
};
