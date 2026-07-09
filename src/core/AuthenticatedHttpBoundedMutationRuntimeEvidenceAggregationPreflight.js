'use strict';

const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS,
  countUnsupportedRuntimeGapIds,
  normalizeAllowlistedRuntimeGapIds
} = require('./AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');
const {
  buildV1RcValidationAggregatorReport,
  markInProcessRuntimeEvidenceSummary
} = require('./ValidationAggregatorService');

const AGGREGATION_PREFLIGHT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-runtime-evidence-aggregation-preflight-v1';
const EXPECTED_REPORT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-report-v1';
const EXPECTED_ARTIFACT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-artifact-v1';
const RUNTIME_EVIDENCE_REPORT_IN_PROCESS_BRAND = Symbol(
  'authenticated-http-bounded-mutation-runtime-evidence-report-in-process-brand'
);

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

function markInProcessRuntimeEvidenceReport(report) {
  if (!isPlainObject(report)) return report;
  Object.defineProperty(report, RUNTIME_EVIDENCE_REPORT_IN_PROCESS_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return report;
}

function isInProcessRuntimeEvidenceReport(report) {
  return (
    isPlainObject(report) &&
    report[RUNTIME_EVIDENCE_REPORT_IN_PROCESS_BRAND] === true
  );
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeCommit(value) {
  const normalized = normalizeString(value).toLowerCase();
  return /^[a-f0-9]{7,40}$/.test(normalized) ? normalized : '';
}

function normalizeExactHeadBoundRuntimeSummaryInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const rawCurrentHeadCommit = normalizeString(safeInput.currentHeadCommit);
  const rawExpectedCurrentHeadCommit = normalizeString(safeInput.expectedCurrentHeadCommit);
  const evidenceGeneratedAt = normalizeString(safeInput.evidenceGeneratedAt);
  const generatedAt = normalizeString(safeInput.generatedAt);
  const provided =
    rawCurrentHeadCommit ||
    rawExpectedCurrentHeadCommit ||
    evidenceGeneratedAt;
  const timestamp = Date.parse(evidenceGeneratedAt);
  let rejectReason = '';

  if (provided && (!rawCurrentHeadCommit || !rawExpectedCurrentHeadCommit)) {
    rejectReason = 'exact_current_head_binding_required';
  } else if (provided && (!currentHeadCommit || !expectedCurrentHeadCommit)) {
    rejectReason = 'exact_current_head_binding_malformed';
  } else if (provided && currentHeadCommit !== expectedCurrentHeadCommit) {
    rejectReason = 'exact_current_head_binding_mismatch';
  } else if (provided && !evidenceGeneratedAt) {
    rejectReason = 'exact_evidence_generated_at_required';
  } else if (provided && !Number.isFinite(timestamp)) {
    rejectReason = 'exact_evidence_generated_at_malformed';
  }

  return {
    provided: Boolean(provided),
    accepted: Boolean(provided) && !rejectReason,
    rejected: Boolean(provided) && Boolean(rejectReason),
    rejectReason,
    currentHeadCommit,
    expectedCurrentHeadCommit,
    evidenceGeneratedAt,
    generatedAt,
    currentHeadCommitProvided: Boolean(rawCurrentHeadCommit),
    expectedCurrentHeadCommitProvided: Boolean(rawExpectedCurrentHeadCommit),
    evidenceGeneratedAtProvided: Boolean(evidenceGeneratedAt),
    currentHeadBindingMatched:
      Boolean(currentHeadCommit) &&
      Boolean(expectedCurrentHeadCommit) &&
      currentHeadCommit === expectedCurrentHeadCommit
  };
}

function containsForbiddenReportMaterial(value) {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_REPORT_PATTERNS.some(pattern => pattern.test(serialized));
}

function repeatBucket(prefix, count) {
  const safeCount = Math.max(0, Math.min(normalizeNumber(count), 20));
  return Array.from({ length: safeCount }, (_, index) => `${prefix}_${index + 1}`);
}

function buildRuntimeGapReplayValues(summary = {}, key = '', fallbackPrefix = '', fallbackCount = 0) {
  if (Object.hasOwn(summary, key) && Array.isArray(summary[key])) {
    return normalizeAllowlistedRuntimeGapIds(summary[key]);
  }
  return repeatBucket(fallbackPrefix, fallbackCount);
}

function countUnsupportedArtifactRuntimeGapIds(summary = {}) {
  return countUnsupportedRuntimeGapIds(summary.locallyEvidencedRuntimeGaps) +
    countUnsupportedRuntimeGapIds(summary.remainingRuntimeGaps);
}

function runtimeGapArrayShapeInvalid(summary = {}) {
  return [
    'locallyEvidencedRuntimeGaps',
    'remainingRuntimeGaps'
  ].some(key => Object.hasOwn(summary, key) && !Array.isArray(summary[key]));
}

function buildRuntimeEvidenceSummaryForAggregatorReplay(report = {}, options = {}) {
  const artifact = isPlainObject(report.runtimeEvidenceArtifact)
    ? report.runtimeEvidenceArtifact
    : {};
  const summary = isPlainObject(artifact.runtimeEvidenceSummary)
    ? artifact.runtimeEvidenceSummary
    : {};
  const bridge = isPlainObject(artifact.validationAggregatorBridge)
    ? artifact.validationAggregatorBridge
    : {};
  const exactHeadBoundInput = normalizeExactHeadBoundRuntimeSummaryInput(
    options.exactHeadBoundRuntimeSummaryInput
  );
  const includeExactValues = options.includeExactValues === true;
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
    currentHeadCommit: exactHeadBoundInput.accepted && includeExactValues
      ? exactHeadBoundInput.currentHeadCommit
      : '',
    expectedCurrentHeadCommit: exactHeadBoundInput.accepted && includeExactValues
      ? exactHeadBoundInput.expectedCurrentHeadCommit
      : '',
    evidenceGeneratedAt: exactHeadBoundInput.accepted && includeExactValues
      ? exactHeadBoundInput.evidenceGeneratedAt
      : '',
    exactHeadBoundInputProvided: exactHeadBoundInput.provided,
    exactHeadBoundInputAccepted: exactHeadBoundInput.accepted,
    currentHeadCommitProvided: exactHeadBoundInput.currentHeadCommitProvided,
    expectedCurrentHeadCommitProvided: exactHeadBoundInput.expectedCurrentHeadCommitProvided,
    evidenceGeneratedAtProvided: exactHeadBoundInput.evidenceGeneratedAtProvided,
    evidenceUnitIds: evidenceUnitsComplete
      ? [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS]
      : [],
    locallyEvidencedRuntimeGaps: buildRuntimeGapReplayValues(
      summary,
      'locallyEvidencedRuntimeGaps',
      'sanitized_local_runtime_gap_bucket',
      summary.locallyEvidencedRuntimeGapCount
    ),
    remainingRuntimeGaps: buildRuntimeGapReplayValues(
      summary,
      'remainingRuntimeGaps',
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
  if (!isInProcessRuntimeEvidenceReport(report)) {
    blockers.push('source_report_not_same_process');
  }
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
  if (countUnsupportedArtifactRuntimeGapIds(summary) > 0) {
    blockers.push('source_runtime_gap_allowlist_rejected');
  }
  if (runtimeGapArrayShapeInvalid(summary)) {
    blockers.push('source_runtime_gap_array_shape_invalid');
  }

  return [...new Set(blockers)].sort();
}

function summarizeAggregatorReplay(aggregatorReport = {}) {
  const bridge = isPlainObject(aggregatorReport.evidence?.p65ValidationAggregatorRuntimeEvidenceBridge)
    ? aggregatorReport.evidence.p65ValidationAggregatorRuntimeEvidenceBridge
    : {};
  const summary = isPlainObject(bridge.summary) ? bridge.summary : {};

  return {
    fed: true,
    decision: normalizeString(aggregatorReport.decision),
    runtimeEvidenceSummaryStatus:
      normalizeString(aggregatorReport.summary?.runtimeEvidenceSummaryStatus),
    accepted: aggregatorReport.summary?.runtimeEvidenceSummaryAccepted === true,
    rejected: aggregatorReport.summary?.runtimeEvidenceSummaryRejected === true,
    rejectReason: normalizeString(bridge.rejectReason),
    currentHeadBindingStatus: normalizeString(summary.currentHeadBindingStatus),
    currentHeadBindingMatched: summary.currentHeadBindingMatched === true,
    evidenceFreshnessStatus: normalizeString(summary.evidenceFreshnessStatus),
    evidenceUnitCount: normalizeNumber(summary.evidenceUnitCount),
    requiredEvidenceUnitCount: normalizeNumber(summary.requiredEvidenceUnitCount),
    missingEvidenceUnitCount: normalizeNumber(summary.missingEvidenceUnitCount),
    evidenceUnitsComplete: summary.evidenceUnitsComplete === true,
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false,
    canClaimRcReady: false
  };
}

function buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
  report = {},
  {
    exactHeadBoundRuntimeSummaryInput = {},
    generatedAt = new Date().toISOString()
  } = {}
) {
  const sourceBlockers = collectSourceBlockers(report);
  const exactHeadBoundInput = normalizeExactHeadBoundRuntimeSummaryInput(
    exactHeadBoundRuntimeSummaryInput
  );
  const runtimeEvidenceSummaryForAggregator =
    buildRuntimeEvidenceSummaryForAggregatorReplay(report, {
      exactHeadBoundRuntimeSummaryInput,
      includeExactValues: false
    });
  const replayRuntimeEvidenceSummaryForAggregator =
    buildRuntimeEvidenceSummaryForAggregatorReplay(report, {
      exactHeadBoundRuntimeSummaryInput,
      includeExactValues: true
    });
  const exactRuntimeEvidenceSummaryForAggregator = sourceBlockers.length === 0
    ? markInProcessRuntimeEvidenceSummary(replayRuntimeEvidenceSummaryForAggregator)
    : replayRuntimeEvidenceSummaryForAggregator;
  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt,
    runtimeEvidenceSummary: exactRuntimeEvidenceSummaryForAggregator
  });
  const aggregatorReplay = summarizeAggregatorReplay(aggregatorReport);
  const standardInputSourceAccepted = sourceBlockers.length === 0;
  const blockers = [...sourceBlockers];

  if (exactHeadBoundInput.rejected) {
    blockers.push(`exact_head_bound_runtime_summary_input_${exactHeadBoundInput.rejectReason}`);
  }
  if (aggregatorReplay.decision !== 'NOT_READY_BLOCKED') {
    blockers.push('aggregator_decision_unexpected');
  }
  if (aggregatorReplay.canClaimV1RcReady === true) {
    blockers.push('aggregator_replay_readiness_overclaim');
  }

  const status = blockers.length > 0
    ? 'blocked_fail_closed'
    : standardInputSourceAccepted && exactHeadBoundInput.accepted && aggregatorReplay.accepted
    ? 'standard_source_and_exact_head_bound_input_accepted_not_ready'
    : standardInputSourceAccepted
    ? 'standard_source_accepted_aggregator_replay_blocked_not_ready'
    : 'blocked_fail_closed';

  return {
    schemaVersion: AGGREGATION_PREFLIGHT_SCHEMA_VERSION,
    preflightType:
      'authenticated_http_bounded_mutation_runtime_evidence_standard_input_preflight',
    status,
    decision: 'NOT_READY_BLOCKED',
    standardInputSourceAccepted,
    exactHeadBoundRuntimeSummaryInput: {
      provided: exactHeadBoundInput.provided,
      accepted: exactHeadBoundInput.accepted,
      rejected: exactHeadBoundInput.rejected,
      rejectReason: exactHeadBoundInput.rejectReason,
      currentHeadCommitProvided: exactHeadBoundInput.currentHeadCommitProvided,
      expectedCurrentHeadCommitProvided: exactHeadBoundInput.expectedCurrentHeadCommitProvided,
      evidenceGeneratedAtProvided: exactHeadBoundInput.evidenceGeneratedAtProvided,
      currentHeadBindingMatched: exactHeadBoundInput.currentHeadBindingMatched,
      rawValuesOutput: false,
      rawValuesPersisted: false
    },
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
    nextStep: standardInputSourceAccepted && !exactHeadBoundInput.accepted
      ? 'Provide a separate exact head-bound runtime summary input if aggregator replay acceptance is required.'
      : standardInputSourceAccepted && exactHeadBoundInput.accepted
      ? 'Use this accepted exact-bound replay as local runtime evidence input only; do not claim readiness.'
      : 'Provide an in-process runtime evidence report from the local runner, or keep serialized JSON input review-only without promotion.'
  };
}

module.exports = {
  AGGREGATION_PREFLIGHT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight,
  buildRuntimeEvidenceSummaryForAggregatorReplay,
  containsForbiddenReportMaterial,
  isInProcessRuntimeEvidenceReport,
  markInProcessRuntimeEvidenceReport,
  normalizeExactHeadBoundRuntimeSummaryInput
};
