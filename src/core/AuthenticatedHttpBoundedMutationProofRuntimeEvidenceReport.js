'use strict';

const {
  runAuthenticatedHttpBoundedMutationProofReport
} = require('./AuthenticatedHttpBoundedMutationProofRunner');
const {
  buildAuthenticatedHttpBoundedMutationProofRouteSummary
} = require('./AuthenticatedHttpBoundedMutationProofRouteSummary');
const {
  INTAKE_SCHEMA_VERSION,
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS,
  buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake,
  buildRuntimeEvidenceSummaryForAggregatorIntake
} = require('./AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');

const RUNTIME_EVIDENCE_REPORT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-report-v1';
const RUNTIME_EVIDENCE_ARTIFACT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-artifact-v1';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function summarizeRuntimeEvidenceArtifact({
  routeSummary = {},
  runtimeEvidenceSummary = {},
  intake = {}
} = {}) {
  const intakeShape = intake.runtimeEvidenceSummaryIntake || {};
  const bridge = intake.validationAggregatorBridge || {};
  const report = intake.validationAggregatorReport || {};

  return {
    schemaVersion: RUNTIME_EVIDENCE_ARTIFACT_SCHEMA_VERSION,
    artifactType: 'explicit_sanitized_runtime_evidence_summary_artifact',
    sourceRouteFamily: normalizeString(routeSummary.routeFamily),
    sourceRouteSummaryAccepted: routeSummary.accepted === true,
    status: intake.accepted === true
      ? 'accepted_by_validation_aggregator'
      : 'blocked_by_validation_aggregator',
    decision: normalizeString(intake.decision),
    aggregatorInputFed: true,
    aggregationPath: 'ValidationAggregatorService.buildV1RcValidationAggregatorReport',
    runtimeEvidenceSummary: {
      sourceStatus: normalizeString(runtimeEvidenceSummary.status),
      sourceDecision: normalizeString(runtimeEvidenceSummary.decision),
      runnerExecuted: runtimeEvidenceSummary.runnerExecuted === true,
      commandsExecuted: runtimeEvidenceSummary.commandsExecuted === true,
      localRuntimeEvidenceMatrixExecuted:
        runtimeEvidenceSummary.localRuntimeEvidenceMatrixExecuted === true,
      allowlistedFinalRcEvidenceRunnerExecuted:
        runtimeEvidenceSummary.allowlistedFinalRcEvidenceRunnerExecuted === true,
      finalRcMatrixExecuted: false,
      fullFinalRcMatrixExecuted: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      criticalGateCount: normalizeNumber(intakeShape.criticalGateCount),
      criticalGatePassedCount: normalizeNumber(intakeShape.criticalGatePassedCount),
      criticalGateFailedCount: normalizeNumber(intakeShape.criticalGateFailedCount),
      allCriticalCommandsPassed: intakeShape.allCriticalCommandsPassed === true,
      evidenceUnitCount: normalizeNumber(intakeShape.evidenceUnitCount),
      requiredEvidenceUnitCount: REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS.length,
      currentHeadCommitProvided: Boolean(runtimeEvidenceSummary.currentHeadCommit),
      expectedCurrentHeadCommitProvided: Boolean(runtimeEvidenceSummary.expectedCurrentHeadCommit),
      evidenceGeneratedAtProvided: Boolean(runtimeEvidenceSummary.evidenceGeneratedAt),
      locallyEvidencedRuntimeGapCount:
        normalizeStringArray(runtimeEvidenceSummary.locallyEvidencedRuntimeGaps).length,
      remainingRuntimeGapCount:
        normalizeStringArray(runtimeEvidenceSummary.remainingRuntimeGaps).length
    },
    validationAggregatorBridge: {
      status: normalizeString(bridge.status),
      accepted: bridge.accepted === true,
      rejected: bridge.rejected === true,
      rejectReason: normalizeString(bridge.rejectReason),
      currentHeadBindingStatus: normalizeString(bridge.currentHeadBindingStatus),
      currentHeadBindingMatched: bridge.currentHeadBindingMatched === true,
      evidenceFreshnessStatus: normalizeString(bridge.evidenceFreshnessStatus),
      evidenceUnitCount: normalizeNumber(bridge.evidenceUnitCount),
      requiredEvidenceUnitCount: normalizeNumber(bridge.requiredEvidenceUnitCount),
      missingEvidenceUnitCount: normalizeNumber(bridge.missingEvidenceUnitCount),
      unknownEvidenceUnitCount: normalizeNumber(bridge.unknownEvidenceUnitCount),
      duplicateEvidenceUnitCount: normalizeNumber(bridge.duplicateEvidenceUnitCount),
      evidenceUnitsComplete: bridge.evidenceUnitsComplete === true,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false
    },
    validationAggregatorReport: {
      decision: normalizeString(report.decision),
      runtimeEvidenceSummaryStatus: normalizeString(report.runtimeEvidenceSummaryStatus),
      runtimeEvidenceSummaryAccepted: report.runtimeEvidenceSummaryAccepted === true,
      runtimeEvidenceSummaryRejected: report.runtimeEvidenceSummaryRejected === true,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false,
      canClaimRcReady: false
    },
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
      tempLocalOnly: routeSummary.safety?.tempLocalOnly === true,
      syntheticOnly: routeSummary.safety?.syntheticOnly === true,
      providerCalls: 0,
      publicMcpExpansion: false,
      durablePrivateMemoryWrite: false,
      rawStoreScan: false,
      realPrivateMemoryAccess: false,
      remoteWrites: false,
      configChanged: false,
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    }
  };
}

function collectReportBlockers({ routeSummary = {}, intake = {} } = {}) {
  const blockers = [];
  if (routeSummary.accepted !== true) blockers.push('route_summary_not_accepted');
  if (intake.accepted !== true) {
    blockers.push(...normalizeStringArray(intake.blockers));
    blockers.push('runtime_evidence_intake_not_accepted');
  }
  return uniqueSorted(blockers);
}

async function buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport(options = {}) {
  const proofReport = await runAuthenticatedHttpBoundedMutationProofReport({
    family: options.family || 'both'
  });
  const routeSummary = buildAuthenticatedHttpBoundedMutationProofRouteSummary(proofReport);
  const runtimeEvidenceOptions = {
    currentHeadCommit: options.currentHeadCommit,
    expectedCurrentHeadCommit: options.expectedCurrentHeadCommit,
    evidenceGeneratedAt: options.evidenceGeneratedAt,
    generatedAt: options.generatedAt,
    evidenceUnitIds: normalizeStringArray(options.evidenceUnitIds),
    localRuntimeEvidenceMatrixExecuted:
      normalizeBoolean(options.localRuntimeEvidenceMatrixExecuted),
    allowlistedFinalRcEvidenceRunnerExecuted:
      normalizeBoolean(options.allowlistedFinalRcEvidenceRunnerExecuted)
  };
  const runtimeEvidenceSummary = buildRuntimeEvidenceSummaryForAggregatorIntake(
    routeSummary,
    runtimeEvidenceOptions
  );
  const intake = buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake(
    routeSummary,
    runtimeEvidenceOptions
  );
  const runtimeEvidenceArtifact = summarizeRuntimeEvidenceArtifact({
    routeSummary,
    runtimeEvidenceSummary,
    intake
  });
  const blockers = collectReportBlockers({ routeSummary, intake });
  const accepted = blockers.length === 0;

  return {
    schemaVersion: RUNTIME_EVIDENCE_REPORT_SCHEMA_VERSION,
    reportType: 'authenticated_http_bounded_cleanup_suppression_runtime_evidence_aggregation_report',
    status: accepted ? 'ok' : 'blocked',
    decision: accepted
      ? 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_ACCEPTED_NOT_READY'
      : 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_BLOCKED',
    accepted,
    sourceRouteSummary: {
      schemaVersion: normalizeString(routeSummary.schemaVersion),
      status: normalizeString(routeSummary.status),
      accepted: routeSummary.accepted === true,
      routeFamily: normalizeString(routeSummary.routeFamily),
      receiptCount: normalizeNumber(routeSummary.receiptCount),
      acceptedReceiptCount: normalizeNumber(routeSummary.acceptedReceiptCount),
      mutationFamiliesComplete: routeSummary.mutationFamilies?.complete === true
    },
    runtimeEvidenceArtifact,
    intake: {
      schemaVersion: INTAKE_SCHEMA_VERSION,
      status: normalizeString(intake.status),
      accepted: intake.accepted === true,
      routeSummaryAccepted: intake.routeSummaryAccepted === true,
      validationAggregatorBridgeAccepted:
        intake.validationAggregatorBridge?.accepted === true,
      validationAggregatorBridgeRejected:
        intake.validationAggregatorBridge?.rejected === true,
      validationAggregatorBridgeRejectReason:
        normalizeString(intake.validationAggregatorBridge?.rejectReason),
      validationAggregatorReportDecision:
        normalizeString(intake.validationAggregatorReport?.decision),
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false,
      canClaimRcReady: false
    },
    artifact: {
      jsonStdoutOnly: true,
      fileWritten: false,
      durableArtifactWritten: false
    },
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
      expectedCurrentHeadCommitIncluded: false
    },
    safety: {
      tempLocalOnly: routeSummary.safety?.tempLocalOnly === true,
      syntheticOnly: routeSummary.safety?.syntheticOnly === true,
      providerCalls: 0,
      publicMcpExpansion: false,
      durablePrivateMemoryWrite: false,
      rawStoreScan: false,
      realPrivateMemoryAccess: false,
      endpointOrLocatorReturned: false,
      tokenReturned: false,
      pathReturned: false,
      memoryIdReturned: false,
      rawContentReturned: false,
      rawResponseReturned: false,
      rawErrorReturned: false,
      remoteWrites: false,
      configChanged: false,
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    },
    blockers,
    nextStep: accepted
      ? 'Use this low-disclosure aggregation report as accepted runtime evidence input only; do not claim readiness.'
      : 'Supply exact head-bound runtime matrix metadata or keep aggregator runtime evidence blocked.'
  };
}

module.exports = {
  RUNTIME_EVIDENCE_ARTIFACT_SCHEMA_VERSION,
  RUNTIME_EVIDENCE_REPORT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport,
  summarizeRuntimeEvidenceArtifact
};
