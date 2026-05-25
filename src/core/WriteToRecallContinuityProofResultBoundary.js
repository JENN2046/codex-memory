'use strict';

const TASK_ID = 'CM-1016_WRITE_TO_RECALL_CONTINUITY_PROOF_RESULT_BOUNDARY';
const RESULT_STATUS_ACCEPTED =
  'WRITE_TO_RECALL_CONTINUITY_RESULT_BOUNDARY_ACCEPTED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'WRITE_TO_RECALL_CONTINUITY_RESULT_BOUNDARY_BLOCKED_NOT_READY';

const ALLOWED_DECISIONS = new Set([
  'WRITE_TO_RECALL_CONTINUITY_PROOF_PASSED_NOT_READY',
  'WRITE_TO_RECALL_CONTINUITY_PROOF_FAILED_NOT_READY'
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

const REQUIRED_ZERO_COUNTER_KEYS = Object.freeze(
  REQUIRED_COUNTER_KEYS.filter(key => key !== 'searchMemoryCalls')
);

const REQUIRED_FALSE_RAW_OUTPUT_FLAGS = Object.freeze([
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

function isSha256Hex(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function isNonNegativeInteger(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0;
}

function normalizeCounters(value = {}) {
  const safeCounters = isPlainObject(value) ? value : {};
  const counters = {};
  for (const key of REQUIRED_COUNTER_KEYS) {
    counters[key] = safeCounters[key];
  }
  return counters;
}

function collectCounterBlockers(counters, rawCounters) {
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

  if (isNonNegativeInteger(counters.searchMemoryCalls) && counters.searchMemoryCalls !== 1) {
    blockers.push('counter_searchMemoryCalls_must_equal_one');
  }

  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
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
  const blockers = [];
  const safeFlags = isPlainObject(rawOutputFlags) ? rawOutputFlags : {};
  for (const key of REQUIRED_FALSE_RAW_OUTPUT_FLAGS) {
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

function collectSearchResultBlockers({
  decision,
  resultCount,
  matchedSourceWriteMemoryIdHash,
  topResultIdHashOrStableOpaqueId,
  sourceWriteMemoryIdHashOrOpaqueId
}) {
  const blockers = [];

  if (!isNonNegativeInteger(resultCount)) {
    blockers.push('resultCount_malformed');
    return blockers;
  }

  if (decision === 'WRITE_TO_RECALL_CONTINUITY_PROOF_PASSED_NOT_READY') {
    if (resultCount < 1) blockers.push('passed_result_requires_at_least_one_result');
    if (matchedSourceWriteMemoryIdHash !== true) {
      blockers.push('passed_result_requires_source_write_memory_id_match');
    }
    if (!topResultIdHashOrStableOpaqueId) {
      blockers.push('passed_result_top_id_hash_missing');
    } else if (topResultIdHashOrStableOpaqueId !== sourceWriteMemoryIdHashOrOpaqueId) {
      blockers.push('passed_result_top_id_hash_must_match_source_write');
    }
  }

  if (decision === 'WRITE_TO_RECALL_CONTINUITY_PROOF_FAILED_NOT_READY') {
    if (matchedSourceWriteMemoryIdHash === true) {
      blockers.push('failed_result_must_not_claim_source_write_memory_id_match');
    }
  }

  return blockers;
}

function evaluateWriteToRecallContinuityProofResultBoundary(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sideEffectCounters = normalizeCounters(safeInput.sideEffectCounters);
  const rawCounters = isPlainObject(safeInput.sideEffectCounters) ? safeInput.sideEffectCounters : {};
  const writeProofBaselineCommit = normalizeString(safeInput.writeProofBaselineCommit);
  const continuityProofBaselineCommit = normalizeString(safeInput.continuityProofBaselineCommit);
  const sourceWriteProofRunId = normalizeString(safeInput.sourceWriteProofRunId);
  const continuityProofRunId = normalizeString(safeInput.continuityProofRunId);
  const sourceWritePayloadHash = normalizeString(safeInput.sourceWritePayloadHash);
  const sourceWriteMemoryIdHashOrOpaqueId = normalizeString(
    safeInput.sourceWriteMemoryIdHashOrOpaqueId
  );
  const target = normalizeString(safeInput.target);
  const queryHash = normalizeString(safeInput.queryHash);
  const sourceWriteDecision = normalizeString(safeInput.sourceWriteDecision);
  const sourceWriteShadowWriteStatus = normalizeString(safeInput.sourceWriteShadowWriteStatus);
  const decision = normalizeString(safeInput.decision);
  const resultCount = safeInput.resultCount;
  const topResultIdHashOrStableOpaqueId = normalizeString(
    safeInput.topResultIdHashOrStableOpaqueId
  );
  const matchedSourceWriteMemoryIdHash =
    safeInput.matchedSourceWriteMemoryIdHash === true;
  const blockers = [];

  if (!isFortyCharHex(writeProofBaselineCommit)) {
    blockers.push('writeProofBaselineCommit_missing_or_malformed');
  }
  if (!isFortyCharHex(continuityProofBaselineCommit)) {
    blockers.push('continuityProofBaselineCommit_missing_or_malformed');
  }
  if (!sourceWriteProofRunId) blockers.push('sourceWriteProofRunId_missing');
  if (!continuityProofRunId) blockers.push('continuityProofRunId_missing');
  if (!sourceWritePayloadHash) {
    blockers.push('sourceWritePayloadHash_missing');
  } else if (!isSha256Hex(sourceWritePayloadHash)) {
    blockers.push('sourceWritePayloadHash_must_be_sha256_hex_64');
  }
  if (!sourceWriteMemoryIdHashOrOpaqueId) {
    blockers.push('sourceWriteMemoryIdHashOrOpaqueId_missing');
  }
  if (target !== 'process') blockers.push('target_must_be_process');
  if (!queryHash) {
    blockers.push('queryHash_missing');
  } else if (!isSha256Hex(queryHash)) {
    blockers.push('queryHash_must_be_sha256_hex_64');
  }
  if (sourceWriteDecision !== 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY') {
    blockers.push('sourceWriteDecision_must_be_passed_not_ready');
  }
  if (sourceWriteShadowWriteStatus !== 'ok') {
    blockers.push('sourceWriteShadowWriteStatus_must_be_ok');
  }
  if (!ALLOWED_DECISIONS.has(decision)) blockers.push('decision_not_allowed');
  if (safeInput.includeContent !== false) blockers.push('includeContent_must_be_false');
  if (safeInput.noRawContentRead !== true) blockers.push('noRawContentRead_must_be_true');
  if (safeInput.sanitizedOutputOnly !== true) {
    blockers.push('sanitizedOutputOnly_must_be_true');
  }

  blockers.push(
    ...collectCounterBlockers(sideEffectCounters, rawCounters),
    ...collectRawOutputFlagBlockers(safeInput.rawOutputFlags),
    ...collectClaimBlockers(safeInput.claims),
    ...collectSearchResultBlockers({
      decision,
      resultCount,
      matchedSourceWriteMemoryIdHash,
      topResultIdHashOrStableOpaqueId,
      sourceWriteMemoryIdHashOrOpaqueId
    })
  );

  const blockerReasons = [...new Set(blockers)];
  const acceptedForContinuityProofReview = blockerReasons.length === 0;

  return {
    taskId: TASK_ID,
    status: acceptedForContinuityProofReview ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    acceptedForContinuityProofReview,
    writeProofBaselineCommit,
    continuityProofBaselineCommit,
    sourceWriteProofRunId,
    continuityProofRunId,
    sourceWritePayloadHash,
    sourceWriteMemoryIdHashOrOpaqueId,
    sourceWriteDecision,
    sourceWriteShadowWriteStatus,
    target,
    queryHash,
    decision,
    resultCount: isNonNegativeInteger(resultCount) ? resultCount : null,
    topResultIdHashOrStableOpaqueId,
    matchedSourceWriteMemoryIdHash,
    sideEffectCounters,
    consumedProofCounters: {
      searchMemoryCalls: sideEffectCounters.searchMemoryCalls
    },
    executionObservedByBoundary: false,
    proofExecutionClaimReceived: true,
    proofExecutionClaimAccepted: acceptedForContinuityProofReview,
    proofExecutionClaimConsumed: acceptedForContinuityProofReview,
    continuityMatchSemantics: 'top1_continuity_proof',
    topKPresenceProof: false,
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
  REQUIRED_COUNTER_KEYS,
  REQUIRED_FALSE_RAW_OUTPUT_FLAGS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  evaluateWriteToRecallContinuityProofResultBoundary,
  normalizeCounters
};
