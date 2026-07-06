'use strict';

const {
  buildV1RcValidationAggregatorReport
} = require('./ValidationAggregatorService');
const {
  ROUTE_SUMMARY_SCHEMA_VERSION
} = require('./AuthenticatedHttpBoundedMutationProofRouteSummary');

const INTAKE_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-runtime-evidence-intake-v1';
const REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS = Object.freeze([
  'A5-GAP-1',
  'A5-GAP-2',
  'A5-GAP-3',
  'A5-GAP-4',
  'A5-GAP-5'
]);
const RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST = Object.freeze([
  'validation_aggregator_full_implementation_incomplete',
  'governance_review_approval_audit_runtime_loop_not_executed',
  'recall_isolation_runtime_proof_not_executed',
  'migration_import_export_backup_restore_approval_execution_blocked',
  'live_http_operation_readiness_not_claimed',
  'mainline_strict_gate_not_executed_for_cutover',
  'rc_cutover_not_executed'
]);
const RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST_SET =
  new Set(RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST);

const FORBIDDEN_INTAKE_PATTERNS = Object.freeze([
  /https?:\/\//i,
  /\bBearer\b/i,
  /\bAuthorization\b/i,
  /\/tmp\/|\\AppData\\|\\Users\\/i,
  /Synthetic temp-local chunk/i,
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

function normalizeCommit(value) {
  const normalized = normalizeString(value).toLowerCase();
  return /^[a-f0-9]{7,40}$/.test(normalized) ? normalized : '';
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function normalizeAllowlistedRuntimeGapIds(values) {
  return uniqueSorted(
    normalizeStringArray(values)
      .filter(value => RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST_SET.has(value))
  );
}

function countUnsupportedRuntimeGapIds(values) {
  return normalizeStringArray(values)
    .filter(value => !RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST_SET.has(value))
    .length;
}

function normalizeExplicitRuntimeGapSelection(values) {
  return {
    gapIds: normalizeAllowlistedRuntimeGapIds(values),
    unsupportedGapCount: countUnsupportedRuntimeGapIds(values)
  };
}

function containsForbiddenIntakeMaterial(value) {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_INTAKE_PATTERNS.some(pattern => pattern.test(serialized));
}

function normalizeCriticalGates(routeSummary = {}) {
  const criticalGates = routeSummary.runtimeEvidenceSummaryCandidate?.criticalGates || {};
  return {
    total: normalizeNumber(criticalGates.total),
    passed: normalizeNumber(criticalGates.passed),
    failed: normalizeNumber(criticalGates.failed),
    allCriticalCommandsPassed: normalizeBoolean(criticalGates.allCriticalCommandsPassed)
  };
}

function buildRuntimeEvidenceSummaryForAggregatorIntake(routeSummary = {}, options = {}) {
  const candidate = isPlainObject(routeSummary.runtimeEvidenceSummaryCandidate)
    ? routeSummary.runtimeEvidenceSummaryCandidate
    : {};
  const routeAccepted = routeSummary.accepted === true;
  const currentHeadCommit = normalizeCommit(options.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(
    options.expectedCurrentHeadCommit || options.currentHeadCommit
  );
  const evidenceGeneratedAt = normalizeString(options.evidenceGeneratedAt);
  const criticalGates = normalizeCriticalGates(routeSummary);
  const observedFamilies = normalizeStringArray(routeSummary.mutationFamilies?.observed);
  const explicitLocallyEvidencedRuntimeGaps =
    Object.hasOwn(options, 'locallyEvidencedRuntimeGaps');
  const explicitRemainingRuntimeGaps =
    Object.hasOwn(options, 'remainingRuntimeGaps');
  const locallyEvidencedRuntimeGapSelection =
    normalizeExplicitRuntimeGapSelection(options.locallyEvidencedRuntimeGaps);
  const remainingRuntimeGapSelection =
    normalizeExplicitRuntimeGapSelection(options.remainingRuntimeGaps);
  const unsupportedRuntimeGapCount =
    (explicitLocallyEvidencedRuntimeGaps
      ? locallyEvidencedRuntimeGapSelection.unsupportedGapCount
      : 0) +
    (explicitRemainingRuntimeGaps
      ? remainingRuntimeGapSelection.unsupportedGapCount
      : 0);

  return {
    status: routeAccepted
      ? 'local_bounded_cleanup_suppression_evidence_passed_rc_still_blocked'
      : 'local_bounded_cleanup_suppression_evidence_blocked',
    decision: 'NOT_READY_BLOCKED',
    currentHeadCommit,
    expectedCurrentHeadCommit,
    evidenceGeneratedAt,
    evidenceUnitIds: normalizeStringArray(options.evidenceUnitIds),
    runnerExecuted: routeAccepted,
    commandsExecuted: routeAccepted,
    localRuntimeEvidenceMatrixExecuted: options.localRuntimeEvidenceMatrixExecuted === true,
    allowlistedFinalRcEvidenceRunnerExecuted:
      options.allowlistedFinalRcEvidenceRunnerExecuted === true,
    finalRcMatrixExecuted: false,
    fullFinalRcMatrixExecuted: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    criticalGates,
    locallyEvidencedRuntimeGaps: explicitLocallyEvidencedRuntimeGaps
      ? locallyEvidencedRuntimeGapSelection.gapIds
      : uniqueSorted([
          ...normalizeStringArray(candidate.locallyEvidencedRuntimeGaps),
          ...observedFamilies.map(
            family => `${family}_authenticated_http_cleanup_suppression_route_evidenced`
          )
        ]),
    remainingRuntimeGaps: explicitRemainingRuntimeGaps
      ? remainingRuntimeGapSelection.gapIds
      : uniqueSorted(normalizeStringArray(candidate.remainingRuntimeGaps)),
    runtimeGapAllowlist: {
      explicitLocallyEvidencedRuntimeGaps,
      explicitRemainingRuntimeGaps,
      unsupportedRuntimeGapCount,
      accepted: unsupportedRuntimeGapCount === 0
    },
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

function collectIntakeBlockers(routeSummary = {}, bridge = {}, runtimeEvidenceSummary = {}) {
  const blockers = [];

  if (!isPlainObject(routeSummary)) blockers.push('route_summary_shape_invalid');
  if (routeSummary.schemaVersion !== ROUTE_SUMMARY_SCHEMA_VERSION) {
    blockers.push('route_summary_schema_version_mismatch');
  }
  if (routeSummary.accepted !== true) blockers.push('route_summary_not_accepted');
  if (routeSummary.disclosure?.lowDisclosure !== true) blockers.push('route_summary_not_low_disclosure');
  if (routeSummary.safety?.providerCalls !== 0) blockers.push('provider_calls_present');
  if (
    routeSummary.safety?.endpointOrLocatorReturned === true ||
    routeSummary.safety?.tokenReturned === true ||
    routeSummary.safety?.memoryIdReturned === true ||
    routeSummary.safety?.rawContentReturned === true ||
    routeSummary.safety?.rawResponseReturned === true ||
    routeSummary.safety?.rawErrorReturned === true
  ) {
    blockers.push('route_summary_disclosure_boundary_broken');
  }
  if (
    routeSummary.safety?.readinessClaimed === true ||
    routeSummary.safety?.releaseClaimed === true ||
    routeSummary.safety?.rcReadyClaimed === true
  ) {
    blockers.push('route_summary_readiness_or_release_overclaim');
  }
  if (bridge.accepted !== true) {
    blockers.push(`validation_aggregator_runtime_evidence_summary_${bridge.rejectReason || 'not_accepted'}`);
  }
  if (runtimeEvidenceSummary.runtimeGapAllowlist?.accepted === false) {
    blockers.push('runtime_gap_allowlist_rejected');
  }

  return uniqueSorted(blockers);
}

function buildValidationAggregatorBridgeSummary(bridge = {}) {
  const summary = isPlainObject(bridge.summary) ? bridge.summary : {};
  return {
    status: normalizeString(bridge.status),
    accepted: bridge.accepted === true,
    rejected: bridge.rejected === true,
    rejectReason: normalizeString(bridge.rejectReason),
    sourceMode: normalizeString(bridge.sourceMode),
    currentHeadBindingStatus: normalizeString(summary.currentHeadBindingStatus),
    currentHeadBindingMatched: summary.currentHeadBindingMatched === true,
    evidenceFreshnessStatus: normalizeString(summary.evidenceFreshnessStatus),
    evidenceUnitCount: normalizeNumber(summary.evidenceUnitCount),
    requiredEvidenceUnitCount: normalizeNumber(summary.requiredEvidenceUnitCount),
    missingEvidenceUnitCount: normalizeNumber(summary.missingEvidenceUnitCount),
    unknownEvidenceUnitCount: normalizeNumber(summary.unknownEvidenceUnitCount),
    duplicateEvidenceUnitCount: normalizeNumber(summary.duplicateEvidenceUnitCount),
    evidenceUnitsComplete: summary.evidenceUnitsComplete === true,
    locallyEvidencedRuntimeGapCount: normalizeNumber(summary.locallyEvidencedRuntimeGapCount),
    remainingRuntimeGapCount: normalizeNumber(summary.remainingRuntimeGapCount),
    allCriticalCommandsPassed: summary.allCriticalCommandsPassed === true,
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false
  };
}

function buildRuntimeEvidenceSummaryIntakeShape(runtimeEvidenceSummary = {}) {
  const criticalGates = runtimeEvidenceSummary.criticalGates || {};
  const safety = runtimeEvidenceSummary.safety || {};

  return {
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
    criticalGateCount: normalizeNumber(criticalGates.total),
    criticalGatePassedCount: normalizeNumber(criticalGates.passed),
    criticalGateFailedCount: normalizeNumber(criticalGates.failed),
    allCriticalCommandsPassed: criticalGates.allCriticalCommandsPassed === true,
    evidenceUnitCount: normalizeStringArray(runtimeEvidenceSummary.evidenceUnitIds).length,
    currentHeadCommitProvided: Boolean(runtimeEvidenceSummary.currentHeadCommit),
    expectedCurrentHeadCommitProvided: Boolean(runtimeEvidenceSummary.expectedCurrentHeadCommit),
    evidenceGeneratedAtProvided: Boolean(runtimeEvidenceSummary.evidenceGeneratedAt),
    locallyEvidencedRuntimeGapCount:
      normalizeStringArray(runtimeEvidenceSummary.locallyEvidencedRuntimeGaps).length,
    remainingRuntimeGapCount:
      normalizeStringArray(runtimeEvidenceSummary.remainingRuntimeGaps).length,
    safety: {
      mutated: safety.mutated === true,
      providerCalls: normalizeNumber(safety.providerCalls),
      serviceStarted: safety.serviceStarted === true,
      writesDurableMemory: safety.writesDurableMemory === true,
      readsRealMemory: safety.readsRealMemory === true,
      realMemoryPreview: safety.realMemoryPreview === true,
      remoteWrites: safety.remoteWrites === true,
      configChanged: safety.configChanged === true,
      migrationApplied: safety.migrationApplied === true,
      importExportApplied: safety.importExportApplied === true,
      watchdogStartupInstalled: safety.watchdogStartupInstalled === true
    }
  };
}

function buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake(routeSummary = {}, options = {}) {
  const generatedAt = normalizeString(options.generatedAt) ||
    normalizeString(options.evidenceGeneratedAt) ||
    new Date().toISOString();
  const runtimeEvidenceSummary = buildRuntimeEvidenceSummaryForAggregatorIntake(routeSummary, options);
  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt,
    runtimeEvidenceSummary
  });
  const bridge = aggregatorReport.evidence.p65ValidationAggregatorRuntimeEvidenceBridge;
  const validationAggregatorBridge = buildValidationAggregatorBridgeSummary(bridge);
  const blockers = collectIntakeBlockers(routeSummary, bridge, runtimeEvidenceSummary);
  const accepted = blockers.length === 0;

  const intake = {
    schemaVersion: INTAKE_SCHEMA_VERSION,
    intakeType: 'authenticated_http_bounded_cleanup_suppression_runtime_evidence_summary_intake',
    status: accepted ? 'ok' : 'blocked',
    decision: accepted
      ? 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_INTAKE_ACCEPTED_NOT_READY'
      : 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_INTAKE_BLOCKED',
    accepted,
    routeSummaryAccepted: routeSummary.accepted === true,
    routeFamily: normalizeString(routeSummary.routeFamily),
    runtimeEvidenceSummaryIntake: buildRuntimeEvidenceSummaryIntakeShape(runtimeEvidenceSummary),
    validationAggregatorBridge,
    validationAggregatorReport: {
      decision: normalizeString(aggregatorReport.decision),
      runtimeEvidenceSummaryStatus:
        normalizeString(aggregatorReport.summary.runtimeEvidenceSummaryStatus),
      runtimeEvidenceSummaryAccepted:
        aggregatorReport.summary.runtimeEvidenceSummaryAccepted === true,
      runtimeEvidenceSummaryRejected:
        aggregatorReport.summary.runtimeEvidenceSummaryRejected === true,
      runtimeEvidenceSummaryLocallyEvidencedGapCount:
        normalizeNumber(aggregatorReport.summary.runtimeEvidenceSummaryLocallyEvidencedGapCount),
      runtimeEvidenceSummaryRemainingGapCount:
        normalizeNumber(aggregatorReport.summary.runtimeEvidenceSummaryRemainingGapCount),
      runtimeEvidenceSummaryEvidenceUnitsComplete:
        aggregatorReport.summary.runtimeEvidenceSummaryEvidenceUnitsComplete === true,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false,
      canClaimRcReady: false
    },
    requiredRuntimeEvidenceUnitIds: [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS],
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
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    },
    blockers,
    nextStep: accepted
      ? 'Use this accepted sanitized intake as explicit runtime evidence input only; do not claim readiness.'
      : 'Supply exact head-bound runtime evidence summary metadata or keep aggregator intake blocked.'
  };

  if (containsForbiddenIntakeMaterial(intake)) {
    return {
      schemaVersion: INTAKE_SCHEMA_VERSION,
      intakeType: 'authenticated_http_bounded_cleanup_suppression_runtime_evidence_summary_intake',
      status: 'blocked',
      decision: 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_INTAKE_BLOCKED',
      accepted: false,
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
      blockers: uniqueSorted([...blockers, 'runtime_evidence_intake_contains_forbidden_material']),
      nextStep: 'Remove forbidden raw material before using this intake report.'
    };
  }

  return intake;
}

module.exports = {
  INTAKE_SCHEMA_VERSION,
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS,
  RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST,
  buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake,
  buildRuntimeEvidenceSummaryForAggregatorIntake,
  countUnsupportedRuntimeGapIds,
  normalizeAllowlistedRuntimeGapIds
};
