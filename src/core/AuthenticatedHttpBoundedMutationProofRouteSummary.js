'use strict';

const ROUTE_SUMMARY_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-route-summary-v1';
const REPORT_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-report-v1';
const RECEIPT_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-receipt-v1';
const REQUIRED_MUTATION_FAMILIES = Object.freeze(['tombstone_memory', 'supersede_memory']);

const FORBIDDEN_SUMMARY_PATTERNS = Object.freeze([
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

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(normalizeString).filter(Boolean)
    : [];
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function containsForbiddenSummaryMaterial(value) {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_SUMMARY_PATTERNS.some(pattern => pattern.test(serialized));
}

function countAcceptedReceipts(receipts) {
  return receipts.filter(receipt => receipt.accepted === true).length;
}

function getObservedFamilies(report, receipts) {
  return uniqueSorted([
    ...normalizeStringArray(report.mutationFamilies),
    ...receipts.map(receipt => normalizeString(receipt.mutationFamily)).filter(Boolean)
  ]);
}

function collectRouteSummaryBlockers(report = {}) {
  const blockers = [];
  const safeReport = isPlainObject(report) ? report : {};
  const receipts = Array.isArray(safeReport.receipts) ? safeReport.receipts : [];
  const observedFamilies = getObservedFamilies(safeReport, receipts);
  const missingFamilies = REQUIRED_MUTATION_FAMILIES.filter(family => !observedFamilies.includes(family));
  const acceptedReceiptCount = countAcceptedReceipts(receipts);
  const safety = isPlainObject(safeReport.safety) ? safeReport.safety : {};
  const artifact = isPlainObject(safeReport.artifact) ? safeReport.artifact : {};

  if (!isPlainObject(report)) blockers.push('invalid_report_shape');
  if (safeReport.schemaVersion !== REPORT_SCHEMA_VERSION) blockers.push('report_schema_version_mismatch');
  if (safeReport.status !== 'ok') blockers.push('source_report_not_ok');
  if (safeReport.accepted !== true) blockers.push('source_report_not_accepted');
  if (normalizeNumber(safeReport.receiptCount) !== receipts.length) {
    blockers.push('receipt_count_mismatch');
  }
  if (normalizeNumber(safeReport.acceptedReceiptCount) !== acceptedReceiptCount) {
    blockers.push('accepted_receipt_count_mismatch');
  }
  if (missingFamilies.length > 0) blockers.push('required_mutation_family_missing');
  if (receipts.length !== REQUIRED_MUTATION_FAMILIES.length) {
    blockers.push('required_receipt_coverage_incomplete');
  }
  if (safety.tempLocalOnly !== true || safety.syntheticOnly !== true) {
    blockers.push('non_temp_local_or_non_synthetic_report');
  }
  if (safety.authenticatedHttpRuntimeObserved !== true) {
    blockers.push('authenticated_http_runtime_not_observed');
  }
  if (
    safety.endpointOrLocatorReturned === true ||
    safety.tokenReturned === true ||
    safety.pathReturned === true ||
    safety.memoryIdReturned === true ||
    safety.rawContentReturned === true ||
    safety.rawResponseReturned === true ||
    safety.rawErrorReturned === true
  ) {
    blockers.push('low_disclosure_report_boundary_broken');
  }
  if (normalizeNumber(safety.providerCalls) !== 0) blockers.push('provider_calls_present');
  if (safety.publicMcpExpansion === true) blockers.push('public_mcp_expansion_claimed');
  if (
    safety.readinessClaimed === true ||
    safety.releaseClaimed === true ||
    safety.rcReadyClaimed === true
  ) {
    blockers.push('readiness_or_release_overclaim');
  }
  if (
    artifact.jsonStdoutOnly !== true ||
    artifact.fileWritten === true ||
    artifact.durableArtifactWritten === true
  ) {
    blockers.push('artifact_policy_not_stdout_only');
  }

  for (const family of REQUIRED_MUTATION_FAMILIES) {
    const receipt = receipts.find(candidate => candidate?.mutationFamily === family);
    if (!receipt) continue;
    if (receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION) {
      blockers.push(`${family}_receipt_schema_version_mismatch`);
    }
    if (receipt.accepted !== true) blockers.push(`${family}_receipt_not_accepted`);
    if (receipt.disclosure?.lowDisclosure !== true) blockers.push(`${family}_receipt_not_low_disclosure`);
    if (
      receipt.disclosure?.endpointOrLocatorIncluded === true ||
      receipt.disclosure?.pathIncluded === true ||
      receipt.disclosure?.memoryIdIncluded === true ||
      receipt.disclosure?.secretIncluded === true ||
      receipt.disclosure?.tokenIncluded === true ||
      receipt.disclosure?.rawContentIncluded === true ||
      receipt.disclosure?.rawResponseIncluded === true ||
      receipt.disclosure?.rawErrorIncluded === true
    ) {
      blockers.push(`${family}_receipt_disclosure_boundary_broken`);
    }
    if (receipt.publicHttpBoundary?.authenticatedHttpRuntimeObserved !== true) {
      blockers.push(`${family}_authenticated_http_runtime_not_observed`);
    }
    if (receipt.publicHttpBoundary?.publicConfirmedMutationAttempted !== true) {
      blockers.push(`${family}_public_confirmed_mutation_attempt_missing`);
    }
    if (receipt.publicHttpBoundary?.publicPathRejected !== true) {
      blockers.push(`${family}_public_path_not_suppressed`);
    }
    if (receipt.publicHttpBoundary?.publicMutationPerformed === true) {
      blockers.push(`${family}_public_mutation_performed`);
    }
    if (receipt.publicHttpBoundary?.countsChanged === true) {
      blockers.push(`${family}_public_path_changed_projection_counts`);
    }
    if (family === 'supersede_memory' && receipt.publicHttpBoundary?.replacementCountsChanged === true) {
      blockers.push('supersede_memory_public_path_changed_replacement_projection_counts');
    }
    if (receipt.internalRuntimeBoundary?.internalMutationPerformed !== true) {
      blockers.push(`${family}_internal_bounded_path_not_observed`);
    }
    if (receipt.internalRuntimeBoundary?.projectionCleanupAccepted !== true) {
      blockers.push(`${family}_internal_projection_cleanup_not_accepted`);
    }
    if (receipt.internalRuntimeBoundary?.targetProjectionResidualsCleared !== true) {
      blockers.push(`${family}_target_projection_residuals_not_cleared`);
    }
    if (family === 'supersede_memory' && receipt.internalRuntimeBoundary?.replacementProjectionRetained !== true) {
      blockers.push('supersede_memory_replacement_projection_retention_not_proven');
    }
    if (receipt.safety?.providerCalls !== 0) blockers.push(`${family}_provider_calls_present`);
    if (
      receipt.safety?.readinessClaimed === true ||
      receipt.safety?.releaseClaimed === true ||
      receipt.safety?.rcReadyClaimed === true
    ) {
      blockers.push(`${family}_readiness_or_release_overclaim`);
    }
    if (Array.isArray(receipt.blockers) && receipt.blockers.length > 0) {
      blockers.push(`${family}_receipt_blockers_present`);
    }
  }

  return uniqueSorted(blockers);
}

function buildRuntimeEvidenceSummaryCandidate({
  accepted,
  acceptedReceiptCount,
  receiptCount,
  observedFamilies,
  missingFamilies
}) {
  return {
    status: accepted
      ? 'local_bounded_cleanup_suppression_evidence_passed_rc_still_blocked'
      : 'local_bounded_cleanup_suppression_evidence_blocked',
    decision: 'NOT_READY_BLOCKED',
    runnerExecuted: accepted || receiptCount > 0,
    commandsExecuted: accepted || receiptCount > 0,
    localRuntimeEvidenceMatrixExecuted: false,
    allowlistedFinalRcEvidenceRunnerExecuted: false,
    finalRcMatrixExecuted: false,
    fullFinalRcMatrixExecuted: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    criticalGates: {
      total: REQUIRED_MUTATION_FAMILIES.length,
      passed: acceptedReceiptCount,
      failed: Math.max(0, REQUIRED_MUTATION_FAMILIES.length - acceptedReceiptCount),
      allCriticalCommandsPassed: accepted
    },
    locallyEvidencedRuntimeGaps: accepted
      ? ['authenticated_http_bounded_cleanup_suppression_route_summary']
      : [],
    remainingRuntimeGaps: [
      ...missingFamilies.map(family => `${family}_bounded_cleanup_suppression_evidence_missing`),
      'real_private_memory_cleanup_suppression_not_executed',
      'validation_aggregator_explicit_runtime_summary_intake_not_refreshed',
      'readiness_cutover_release_still_blocked'
    ],
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
    },
    observedMutationFamilies: observedFamilies,
    tempLocalSyntheticStoreMutationObserved: accepted
  };
}

function buildAuthenticatedHttpBoundedMutationProofRouteSummary(report = {}) {
  const safeReport = isPlainObject(report) ? report : {};
  const receipts = Array.isArray(safeReport.receipts) ? safeReport.receipts : [];
  const observedFamilies = getObservedFamilies(safeReport, receipts);
  const missingFamilies = REQUIRED_MUTATION_FAMILIES.filter(family => !observedFamilies.includes(family));
  const acceptedReceiptCount = countAcceptedReceipts(receipts);
  const blockers = collectRouteSummaryBlockers(safeReport);
  const accepted = blockers.length === 0;

  const summary = {
    schemaVersion: ROUTE_SUMMARY_SCHEMA_VERSION,
    summaryType: 'authenticated_http_bounded_cleanup_suppression_route_summary',
    status: accepted ? 'ok' : 'blocked',
    decision: accepted
      ? 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_ROUTE_SUMMARY_ACCEPTED_NOT_READY'
      : 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_ROUTE_SUMMARY_BLOCKED',
    accepted,
    routeFamily: 'bounded_cleanup_suppression',
    sourceReport: {
      schemaVersion: normalizeString(safeReport.schemaVersion),
      status: normalizeString(safeReport.status),
      decision: normalizeString(safeReport.decision),
      accepted: normalizeBoolean(safeReport.accepted),
      receiptCount: normalizeNumber(safeReport.receiptCount),
      acceptedReceiptCount: normalizeNumber(safeReport.acceptedReceiptCount)
    },
    receiptCount: receipts.length,
    acceptedReceiptCount,
    mutationFamilies: {
      required: [...REQUIRED_MUTATION_FAMILIES],
      observed: observedFamilies,
      missing: missingFamilies,
      complete: missingFamilies.length === 0
    },
    proofCoverage: {
      authenticatedHttpRuntimeObserved: safeReport.safety?.authenticatedHttpRuntimeObserved === true,
      publicConfirmedMutationSuppressionProven: receipts.length > 0 &&
        receipts.every(receipt => receipt.publicHttpBoundary?.publicPathRejected === true &&
          receipt.publicHttpBoundary?.publicMutationPerformed === false &&
          receipt.publicHttpBoundary?.countsChanged === false),
      internalCleanupSuppressionProven: receipts.length > 0 &&
        receipts.every(receipt => receipt.internalRuntimeBoundary?.internalMutationPerformed === true &&
          receipt.internalRuntimeBoundary?.projectionCleanupAccepted === true),
      targetProjectionResidualSuppressionProven: receipts.length > 0 &&
        receipts.every(receipt => receipt.internalRuntimeBoundary?.targetProjectionResidualsCleared === true),
      replacementProjectionRetentionProven: receipts
        .filter(receipt => receipt.mutationFamily === 'supersede_memory')
        .every(receipt => receipt.internalRuntimeBoundary?.replacementProjectionRetained === true),
      receiptCoverageComplete: receipts.length === REQUIRED_MUTATION_FAMILIES.length &&
        missingFamilies.length === 0
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
      secretIncluded: false
    },
    artifact: {
      jsonStdoutOnly: safeReport.artifact?.jsonStdoutOnly === true,
      fileWritten: safeReport.artifact?.fileWritten === true,
      durableArtifactWritten: safeReport.artifact?.durableArtifactWritten === true
    },
    safety: {
      tempLocalOnly: safeReport.safety?.tempLocalOnly === true,
      syntheticOnly: safeReport.safety?.syntheticOnly === true,
      providerCalls: normalizeNumber(safeReport.safety?.providerCalls),
      publicMcpExpansion: safeReport.safety?.publicMcpExpansion === true,
      durablePrivateMemoryWrite: false,
      rawStoreScan: false,
      realPrivateMemoryAccess: false,
      endpointOrLocatorReturned: safeReport.safety?.endpointOrLocatorReturned === true,
      tokenReturned: safeReport.safety?.tokenReturned === true,
      pathReturned: safeReport.safety?.pathReturned === true,
      memoryIdReturned: safeReport.safety?.memoryIdReturned === true,
      rawContentReturned: safeReport.safety?.rawContentReturned === true,
      rawResponseReturned: safeReport.safety?.rawResponseReturned === true,
      rawErrorReturned: safeReport.safety?.rawErrorReturned === true,
      readinessClaimed: safeReport.safety?.readinessClaimed === true,
      releaseClaimed: safeReport.safety?.releaseClaimed === true,
      rcReadyClaimed: safeReport.safety?.rcReadyClaimed === true,
      tempLocalSyntheticStoreMutationObserved: accepted
    },
    runtimeEvidenceSummaryCandidate: buildRuntimeEvidenceSummaryCandidate({
      accepted,
      acceptedReceiptCount,
      receiptCount: receipts.length,
      observedFamilies,
      missingFamilies
    }),
    blockers,
    nextStep: accepted
      ? 'Feed this sanitized route summary into the next explicit runtime evidence summary intake; do not claim readiness.'
      : 'Inspect blockers and rerun the bounded proof route before aggregator intake.'
  };

  if (containsForbiddenSummaryMaterial(summary)) {
    return {
      schemaVersion: ROUTE_SUMMARY_SCHEMA_VERSION,
      summaryType: 'authenticated_http_bounded_cleanup_suppression_route_summary',
      status: 'blocked',
      decision: 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_ROUTE_SUMMARY_BLOCKED',
      accepted: false,
      routeFamily: 'bounded_cleanup_suppression',
      disclosure: {
        lowDisclosure: true,
        endpointOrLocatorIncluded: false,
        tokenIncluded: false,
        pathIncluded: false,
        memoryIdIncluded: false,
        rawContentIncluded: false,
        rawResponseIncluded: false,
        rawErrorIncluded: false,
        secretIncluded: false
      },
      blockers: uniqueSorted([...blockers, 'route_summary_contains_forbidden_material']),
      nextStep: 'Remove forbidden raw material before using this summary as runtime evidence.'
    };
  }

  return summary;
}

module.exports = {
  REQUIRED_MUTATION_FAMILIES,
  ROUTE_SUMMARY_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationProofRouteSummary,
  collectRouteSummaryBlockers
};
