'use strict';

const TASK_ID = 'CM-1017_WRITE_TO_RECALL_CONTINUITY_COVERAGE_BOUNDARY';
const STATUS_ACCEPTED = 'WRITE_TO_RECALL_CONTINUITY_COVERAGE_ACCEPTED_NOT_READY';
const STATUS_BLOCKED = 'WRITE_TO_RECALL_CONTINUITY_COVERAGE_BLOCKED_NOT_READY';

const ALLOWED_DECISIONS = new Set([
  'WRITE_TO_RECALL_CONTINUITY_COVERAGE_PASSED_NOT_READY',
  'WRITE_TO_RECALL_CONTINUITY_COVERAGE_PARTIAL_NOT_READY',
  'WRITE_TO_RECALL_CONTINUITY_COVERAGE_FAILED_NOT_READY'
]);

const ALLOWED_MATCH_MODES = new Set([
  'top_result_matches_expected',
  'expected_id_present_in_results',
  'all_expected_ids_present_in_results'
]);

const REQUIRED_COUNTER_KEYS = Object.freeze([
  'searchMemoryCalls',
  'recordMemoryCalls',
  'providerCalls',
  'apiCalls',
  'directJsonlReads',
  'rawDurableMemoryReads',
  'rawAuditReads',
  'memoryOverviewCalls',
  'durableMemoryWrites',
  'durableAuditWrites',
  'candidateCacheWrites',
  'candidateCacheFlushes',
  'syncCalls',
  'vectorFlushes',
  'embeddingCacheWrites',
  'publicMcpExpansion',
  'configWatchdogStartupChanges',
  'packageLockfileChanges',
  'tagReleaseDeployCutoverActions',
  'readinessClaims',
  'reliabilityClaims'
]);

const RAW_OUTPUT_FLAG_KEYS = Object.freeze([
  'rawContentPrinted',
  'rawResultsPrinted',
  'rawMemoryPrinted',
  'rawJsonlRead',
  'rawFilePathsPrinted',
  'secretsPrinted'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isFortyCharHex(value) {
  return /^[a-f0-9]{40}$/i.test(value);
}

function isNonNegativeInteger(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(normalizeString).filter(Boolean)
    : [];
}

function normalizeCounters(value = {}) {
  const safeCounters = isPlainObject(value) ? value : {};
  const counters = {};
  for (const key of REQUIRED_COUNTER_KEYS) {
    counters[key] = safeCounters[key];
  }
  return counters;
}

function collectCounterBlockers(counters, rawCounters, expectedSearchMemoryCalls) {
  const blockers = [];

  for (const key of REQUIRED_COUNTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(rawCounters, key)) {
      blockers.push(`counter_${key}_missing`);
      continue;
    }
    if (!isNonNegativeInteger(counters[key])) {
      blockers.push(`counter_${key}_malformed`);
    }
  }

  if (
    isNonNegativeInteger(counters.searchMemoryCalls)
    && counters.searchMemoryCalls !== expectedSearchMemoryCalls
  ) {
    blockers.push('counter_searchMemoryCalls_must_match_marker_count');
  }

  for (const key of REQUIRED_COUNTER_KEYS) {
    if (key === 'searchMemoryCalls') continue;
    if (isNonNegativeInteger(counters[key]) && counters[key] !== 0) {
      blockers.push(`counter_${key}_must_be_zero`);
    }
  }

  for (const [key, value] of Object.entries(rawCounters)) {
    if (REQUIRED_COUNTER_KEYS.includes(key)) continue;
    if (!isNonNegativeInteger(value)) {
      blockers.push(`counter_${key}_unknown_malformed`);
    } else if (value !== 0) {
      blockers.push(`counter_${key}_unknown_nonzero`);
    }
  }

  return blockers;
}

function collectRawOutputFlagBlockers(rawOutputFlags) {
  const safeFlags = isPlainObject(rawOutputFlags) ? rawOutputFlags : {};
  const blockers = [];
  for (const key of RAW_OUTPUT_FLAG_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(safeFlags, key)) {
      blockers.push(`raw_output_${key}_missing`);
    } else if (safeFlags[key] !== false) {
      blockers.push(`raw_output_${key}_must_be_false`);
    }
  }
  return blockers;
}

function collectClaimBlockers(claims) {
  const safeClaims = isPlainObject(claims) ? claims : {};
  const blockers = [];
  if (safeClaims.readinessClaimAllowed !== false) {
    blockers.push('claim_readinessClaimAllowed_must_be_false');
  }
  if (safeClaims.memoryWriteReliableClaimed !== false) {
    blockers.push('claim_memoryWriteReliableClaimed_must_be_false');
  }
  if (safeClaims.memoryRecallReliableClaimed !== false) {
    blockers.push('claim_memoryRecallReliableClaimed_must_be_false');
  }
  if (safeClaims.writeToRecallReliableClaimed !== false) {
    blockers.push('claim_writeToRecallReliableClaimed_must_be_false');
  }
  if (safeClaims.rcNotReadyBlocked !== true) {
    blockers.push('claim_rcNotReadyBlocked_must_be_true');
  }
  return blockers;
}

function normalizeMarkerEvidence(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    markerId: normalizeString(safeValue.markerId),
    sourceWriteMemoryIdHashesOrOpaqueIds: normalizeStringArray(
      safeValue.sourceWriteMemoryIdHashesOrOpaqueIds
    ),
    sourceWriteDecision: normalizeString(safeValue.sourceWriteDecision),
    sourceWriteShadowWriteStatus: normalizeString(safeValue.sourceWriteShadowWriteStatus),
    matchMode: normalizeString(safeValue.matchMode),
    queryHash: normalizeString(safeValue.queryHash),
    resultCount: safeValue.resultCount,
    topResultIdHashOrStableOpaqueId: normalizeString(safeValue.topResultIdHashOrStableOpaqueId),
    resultIdHashesOrStableOpaqueIds: normalizeStringArray(
      safeValue.resultIdHashesOrStableOpaqueIds
    ),
    matchedExpectedIds: normalizeStringArray(safeValue.matchedExpectedIds)
  };
}

function collectMarkerBlockers(marker, index) {
  const blockers = [];
  const prefix = `marker_${index}`;

  if (!marker.markerId) blockers.push(`${prefix}_id_missing`);
  if (marker.sourceWriteMemoryIdHashesOrOpaqueIds.length === 0) {
    blockers.push(`${prefix}_source_write_id_hashes_missing`);
  }
  if (marker.sourceWriteDecision !== 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY') {
    blockers.push(`${prefix}_source_write_decision_must_be_passed_not_ready`);
  }
  if (marker.sourceWriteShadowWriteStatus !== 'ok') {
    blockers.push(`${prefix}_source_write_shadow_status_must_be_ok`);
  }
  if (!ALLOWED_MATCH_MODES.has(marker.matchMode)) {
    blockers.push(`${prefix}_match_mode_not_allowed`);
  }
  if (!marker.queryHash) blockers.push(`${prefix}_query_hash_missing`);
  if (!isNonNegativeInteger(marker.resultCount)) {
    blockers.push(`${prefix}_result_count_malformed`);
  }

  const resultIds = new Set(marker.resultIdHashesOrStableOpaqueIds);
  const expectedIds = marker.sourceWriteMemoryIdHashesOrOpaqueIds;
  if (marker.matchMode === 'top_result_matches_expected') {
    if (!marker.topResultIdHashOrStableOpaqueId) {
      blockers.push(`${prefix}_top_result_id_missing`);
    } else if (!expectedIds.includes(marker.topResultIdHashOrStableOpaqueId)) {
      blockers.push(`${prefix}_top_result_id_must_match_expected`);
    }
  }

  if (marker.matchMode === 'expected_id_present_in_results') {
    if (!expectedIds.some(id => resultIds.has(id))) {
      blockers.push(`${prefix}_expected_id_not_present_in_results`);
    }
  }

  if (marker.matchMode === 'all_expected_ids_present_in_results') {
    for (const id of expectedIds) {
      if (!resultIds.has(id)) {
        blockers.push(`${prefix}_expected_id_missing_${id}`);
      }
    }
  }

  for (const id of marker.matchedExpectedIds) {
    if (!expectedIds.includes(id)) {
      blockers.push(`${prefix}_matched_unexpected_id_${id}`);
    }
  }

  return blockers;
}

function evaluateWriteToRecallContinuityCoverageBoundary(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const proofBaselineCommit = normalizeString(safeInput.proofBaselineCommit);
  const coverageProofRunId = normalizeString(safeInput.coverageProofRunId);
  const target = normalizeString(safeInput.target);
  const decision = normalizeString(safeInput.decision);
  const markers = Array.isArray(safeInput.markers)
    ? safeInput.markers.map(normalizeMarkerEvidence)
    : [];
  const sideEffectCounters = normalizeCounters(safeInput.sideEffectCounters);
  const rawCounters = isPlainObject(safeInput.sideEffectCounters) ? safeInput.sideEffectCounters : {};
  const blockers = [];

  if (!isFortyCharHex(proofBaselineCommit)) {
    blockers.push('proofBaselineCommit_missing_or_malformed');
  }
  if (!coverageProofRunId) blockers.push('coverageProofRunId_missing');
  if (target !== 'process') blockers.push('target_must_be_process');
  if (!ALLOWED_DECISIONS.has(decision)) blockers.push('decision_not_allowed');
  if (markers.length < 2 || markers.length > 5) {
    blockers.push('marker_count_must_be_between_two_and_five');
  }
  if (safeInput.includeContent !== false) blockers.push('includeContent_must_be_false');
  if (safeInput.noRawContentRead !== true) blockers.push('noRawContentRead_must_be_true');
  if (safeInput.sanitizedOutputOnly !== true) {
    blockers.push('sanitizedOutputOnly_must_be_true');
  }

  markers.forEach((marker, index) => {
    blockers.push(...collectMarkerBlockers(marker, index));
  });

  const markerBlockers = blockers.filter(reason => reason.startsWith('marker_'));
  const allMarkersMatched = markerBlockers.length === 0;
  if (decision === 'WRITE_TO_RECALL_CONTINUITY_COVERAGE_PASSED_NOT_READY' && !allMarkersMatched) {
    blockers.push('passed_coverage_requires_all_markers_matched');
  }
  if (decision === 'WRITE_TO_RECALL_CONTINUITY_COVERAGE_FAILED_NOT_READY' && allMarkersMatched) {
    blockers.push('failed_coverage_must_not_have_all_markers_matched');
  }

  blockers.push(
    ...collectCounterBlockers(sideEffectCounters, rawCounters, markers.length),
    ...collectRawOutputFlagBlockers(safeInput.rawOutputFlags),
    ...collectClaimBlockers(safeInput.claims)
  );

  const blockerReasons = [...new Set(blockers)];
  const acceptedForCoverageReview = blockerReasons.length === 0;

  return {
    taskId: TASK_ID,
    status: acceptedForCoverageReview ? STATUS_ACCEPTED : STATUS_BLOCKED,
    acceptedForCoverageReview,
    proofBaselineCommit,
    coverageProofRunId,
    target,
    decision,
    markerCount: markers.length,
    matchedMarkerCount: markers.filter(marker => (
      collectMarkerBlockers(marker, 0).length === 0
    )).length,
    markers,
    sideEffectCounters,
    blockerReasons,
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsContinuityReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MATCH_MODES,
  RAW_OUTPUT_FLAG_KEYS,
  REQUIRED_COUNTER_KEYS,
  STATUS_ACCEPTED,
  STATUS_BLOCKED,
  TASK_ID,
  evaluateWriteToRecallContinuityCoverageBoundary,
  normalizeCounters
};
