'use strict';

const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS
} = require('./AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');
const {
  buildV1RcValidationAggregatorReport
} = require('./ValidationAggregatorService');

const AGGREGATION_PREFLIGHT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-runtime-evidence-aggregation-preflight-v1';
const EXPECTED_REPORT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-report-v1';
const EXPECTED_ARTIFACT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-artifact-v1';

const FORBIDDEN_REPORT_PATTERNS = Object.freeze([
  /https?:\/\//i,
  /\bBearer\b/i,
  /\bAuthorization\b/i,
  /\/tmp\/|\\AppData\\|\\Users\\|[A-Z]:\\/i,
  /\.env\b/i,
  /Synthetic temp-local chunk/i,
  /codex-memory-http-bounded-mutation-proof/i,
  /bounded-cleanup-proof-runner/i,
  /http-runner-tombstone-memory/i,
  /http-runner-supersede-old-memory/i,
  /http-runner-supersede-new-memory/i,
  /sk-[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /BEGIN (RSA|OPENSSH|PRIVATE)/i
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function containsForbiddenReportMaterial(value) {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_REPORT_PATTERNS.some(pattern => pattern.test(serialized));
}

function repeatBucket(prefix, count) {
  const safeCount = Math.max(0, Math.min(normalizeNumber(count), 20));
  return Array.from({ length: safeCount }, (_, index) => `${prefix}_${index + 1}`);
}

function buildRuntimeEvidenceSummaryForAggregatorReplay(report = {}) {
  const artifact = isPlainObject(report.runtimeEvidenceArtifact)
    ? report.runtimeEvidenceArtifact
    : {};
  const summary = isPlainObject(artifact.runtimeEvidenceSummary)
    ? artifact.runtimeEvidenceSummary
    : {};
  const bridge = isPlainObject(artifact.validationAggregatorBridge)
    ? artifact.validationAggregatorBridge
    : {};
  const evidenceUnitsComplete =
    bridge.evidenceUnitsComplete === true &&
    normalizeNumber(summary.evidenceUnitCount) === REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS.length &&
    normalizeNumber(summary.requiredEvidenceUnitCount) === REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS.length;

  return {
    status: normalizeString(summary.sourceStatus) || normalizeString(artifact.status),
    decision: normalizeString(summary.sourceDecision) || 'NOT_READY_BLOCKED',
    runnerExecuted: summary.runnerExecuted === true,
    commandsExecuted: summary.commandsExecuted === true,
    localRuntimeEvidenceMatrixExecuted:
      summary.localRuntimeEvidenceMatrixExecuted === true,
    allowlistedFinalRcEvidenceRunnerExecuted:
      summary.allowlistedFinalRcEvidenceRunnerExecuted === true,
    finalRcMatrixExecuted: false,
    fullFinalRcMatrixExecuted: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    criticalGates: {
      total: normalizeNumber(summary.criticalGateCount),
      passed: normalizeNumber(summary.criticalGatePassedCount),
      failed: normalizeNumber(summary.criticalGateFailedCount),
      allCriticalCommandsPassed: summary.allCriticalCommandsPassed === true
    },
    currentHeadCommit: '',
    expectedCurrentHeadCommit: '',
    evidenceGeneratedAt: '',
    evidenceUnitIds: evidenceUnitsComplete
      ? [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS]
      : [],
    locallyEvidencedRuntimeGaps: repeatBucket(
      'sanitized_local_runtime_gap_bucket',
      summary.locallyEvidencedRuntimeGapCount
    ),
    remainingRuntimeGaps: repeatBucket(
      'sanitized_remaining_runtime_gap_bucket',
      summary.remainingRuntimeGapCount
    ),
    safety: {
      mutated: false,
      providerCalls: 0,
      serviceStarted: false,
      writesDurableMemory: false,
      durableMemoryTouched: false,
      durableMemoryWrite: false,
      realMemoryPreview: false,
      readsRealMemory: false,
      remoteWrites: false,
      pushed: false,
      tagged: false,
      released: false,
      deployed: false,
      migrationApplied: false,
      importExportApplied: false,
      configChanged: false,
      watchdogStartupInstalled: false
    }
  };
}

function collectSourceBlockers(report = {}) {
  const blockers = [];
  const artifact = isPlainObject(report.runtimeEvidenceArtifact)
    ? report.runtimeEvidenceArtifact
    : {};
  const summary = isPlainObject(artifact.runtimeEvidenceSummary)
    ? artifact.runtimeEvidenceSummary
    : {};
  const bridge = isPlainObject(artifact.validationAggregatorBridge)
    ? artifact.validationAggregatorBridge
    : {};
  const disclosure = isPlainObject(artifact.disclosure) ? artifact.disclosure : {};
  const safety = isPlainObject(artifact.safety) ? artifact.safety : {};

  if (!isPlainObject(report)) blockers.push('report_shape_invalid');
  if (report.schemaVersion !== EXPECTED_REPORT_SCHEMA_VERSION) {
    blockers.push('report_schema_version_mismatch');
  }
  if (artifact.schemaVersion !== EXPECTED_ARTIFACT_SCHEMA_VERSION) {
    blockers.push('artifact_schema_version_mismatch');
  }
  if (report.accepted !== true) blockers.push('source_report_not_accepted');
  if (artifact.aggregatorInputFed !== true) blockers.push('source_artifact_not_fed_to_aggregator');
  if (bridge.accepted !== true) blockers.push('source_bridge_not_accepted');
  if (bridge.canClaimV1RcReady === true) blockers.push('source_bridge_readiness_overclaim');
  if (disclosure.lowDisclosure !== true) blockers.push('source_artifact_not_low_disclosure');
  for (const key of [
    'endpointOrLocatorIncluded',
    'tokenIncluded',
    'pathIncluded',
    'memoryIdIncluded',
    'rawContentIncluded',
    'rawResponseIncluded',
    'rawErrorIncluded',
    'secretIncluded',
    'currentHeadCommitIncluded',
    'expectedCurrentHeadCommitIncluded'
  ]) {
    if (disclosure[key] === true) blockers.push(`source_disclosure_${key}`);
  }
  if (
    safety.providerCalls !== 0 ||
    safety.publicMcpExpansion === true ||
    safety.durablePrivateMemoryWrite === true ||
    safety.realPrivateMemoryAccess === true ||
    safety.remoteWrites === true ||
    safety.configChanged === true ||
    safety.readinessClaimed === true ||
    safety.releaseClaimed === true ||
    safety.rcReadyClaimed === true
  ) {
    blockers.push('source_safety_boundary_broken');
  }
  if (
    summary.runnerExecuted !== true ||
    summary.commandsExecuted !== true ||
    summary.localRuntimeEvidenceMatrixExecuted !== true ||
    summary.allowlistedFinalRcEvidenceRunnerExecuted !== true ||
    summary.allCriticalCommandsPassed !== true
  ) {
    blockers.push('source_runtime_evidence_execution_not_complete');
  }
  if (
    summary.runtimeReady === true ||
    summary.finalRcMatrixReady === true ||
    summary.v1RcReady === true ||
    summary.rcReady === true ||
    summary.finalRcMatrixExecuted === true ||
    summary.fullFinalRcMatrixExecuted === true
  ) {
    blockers.push('source_runtime_evidence_readiness_overclaim');
  }
  if (containsForbiddenReportMaterial(report)) {
    blockers.push('source_report_contains_forbidden_material');
  }

  return [...new Set(blockers)].sort();
}

function summarizeAggregatorReplay(aggregatorReport = {}) {
  const bridge = isPlainObject(aggregatorReport.evidence?.p65ValidationAggregatorRuntimeEvidenceBridge)
    ? aggregatorReport.evidence.p65ValidationAggregatorRuntimeEvidenceBridge
    : {};

  return {
    fed: true,
    decision: normalizeString(aggregatorReport.decision),
    runtimeEvidenceSummaryStatus:
      normalizeString(aggregatorReport.summary?.runtimeEvidenceSummaryStatus),
    accepted: aggregatorReport.summary?.runtimeEvidenceSummaryAccepted === true,
    rejected: aggregatorReport.summary?.runtimeEvidenceSummaryRejected === true,
    rejectReason: normalizeString(bridge.rejectReason),
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false,
    canClaimRcReady: false
  };
}

function buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
  report = {},
  { generatedAt = new Date().toISOString() } = {}
) {
  const sourceBlockers = collectSourceBlockers(report);
  const runtimeEvidenceSummaryForAggregator =
    buildRuntimeEvidenceSummaryForAggregatorReplay(report);
  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt,
    runtimeEvidenceSummary: runtimeEvidenceSummaryForAggregator
  });
  const aggregatorReplay = summarizeAggregatorReplay(aggregatorReport);
  const standardInputSourceAccepted = sourceBlockers.length === 0;
  const blockers = [...sourceBlockers];

  if (aggregatorReplay.decision !== 'NOT_READY_BLOCKED') {
    blockers.push('aggregator_decision_unexpected');
  }
  if (aggregatorReplay.canClaimV1RcReady === true) {
    blockers.push('aggregator_replay_readiness_overclaim');
  }

  return {
    schemaVersion: AGGREGATION_PREFLIGHT_SCHEMA_VERSION,
    preflightType:
      'authenticated_http_bounded_mutation_runtime_evidence_standard_input_preflight',
    status: standardInputSourceAccepted
      ? 'standard_source_accepted_aggregator_replay_blocked_not_ready'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    standardInputSourceAccepted,
    sourceReport: {
      schemaVersion: normalizeString(report.schemaVersion),
      accepted: report.accepted === true,
      status: normalizeString(report.status),
      decision: normalizeString(report.decision)
    },
    sourceArtifact: {
      schemaVersion: normalizeString(report.runtimeEvidenceArtifact?.schemaVersion),
      artifactType: normalizeString(report.runtimeEvidenceArtifact?.artifactType),
      status: normalizeString(report.runtimeEvidenceArtifact?.status),
      aggregatorInputFed: report.runtimeEvidenceArtifact?.aggregatorInputFed === true,
      sourcePriorAggregatorBridgeAccepted:
        report.runtimeEvidenceArtifact?.validationAggregatorBridge?.accepted === true,
      lowDisclosure: report.runtimeEvidenceArtifact?.disclosure?.lowDisclosure === true
    },
    runtimeEvidenceSummaryForAggregator,
    aggregatorReplay,
    disclosure: {
      lowDisclosure: true,
      endpointOrLocatorIncluded: false,
      tokenIncluded: false,
      pathIncluded: false,
      memoryIdIncluded: false,
      rawContentIncluded: false,
      rawResponseIncluded: false,
      rawErrorIncluded: false,
      secretIncluded: false,
      currentHeadCommitIncluded: false,
      expectedCurrentHeadCommitIncluded: false,
      evidenceGeneratedAtIncluded: false
    },
    safety: {
      readsExplicitInputOnly: true,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      mutatesConfig: false,
      remoteWrites: false,
      readinessClaimed: false
    },
    blockers,
    nextStep: standardInputSourceAccepted
      ? 'Use this as a low-disclosure standard input preflight only; provide a separate exact head-bound runtime summary if aggregator acceptance is required.'
      : 'Regenerate the runtime evidence report with exact metadata and low-disclosure output, then rerun the preflight.'
  };
}

module.exports = {
  AGGREGATION_PREFLIGHT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight,
  buildRuntimeEvidenceSummaryForAggregatorReplay,
  containsForbiddenReportMaterial
};
