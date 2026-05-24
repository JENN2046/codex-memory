'use strict';

const TASK_ID = 'CM-1010_WRITE_PROOF_EXECUTION_RESULT_BOUNDARY';
const RESULT_STATUS_ACCEPTED = 'WRITE_PROOF_RESULT_BOUNDARY_ACCEPTED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'WRITE_PROOF_RESULT_BOUNDARY_BLOCKED_NOT_READY';

const ALLOWED_DECISIONS = new Set([
  'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY',
  'MEMORY_WRITE_BOUNDED_PROOF_FAILED_NOT_READY'
]);

const REQUIRED_COUNTER_KEYS = Object.freeze([
  'recordMemoryCalls',
  'acceptedMemoryWrites',
  'rejectedMemoryWrites',
  'durableMemoryWrites',
  'durableAuditWrites',
  'searchMemoryCalls',
  'providerCalls',
  'apiCalls',
  'directJsonlReads',
  'rawDurableMemoryReads',
  'rawAuditReads',
  'memoryOverviewCalls',
  'publicMcpExpansion',
  'migrationImportExportBackupRestoreApply',
  'configWatchdogStartupChanges',
  'packageLockfileChanges',
  'tagReleaseDeployCutoverActions',
  'readinessClaims',
  'reliabilityClaims'
]);

const REQUIRED_ZERO_COUNTER_KEYS = Object.freeze([
  'searchMemoryCalls',
  'providerCalls',
  'apiCalls',
  'directJsonlReads',
  'rawDurableMemoryReads',
  'rawAuditReads',
  'memoryOverviewCalls',
  'publicMcpExpansion',
  'migrationImportExportBackupRestoreApply',
  'configWatchdogStartupChanges',
  'packageLockfileChanges',
  'tagReleaseDeployCutoverActions',
  'readinessClaims',
  'reliabilityClaims'
]);

const REQUIRED_FALSE_RAW_OUTPUT_FLAGS = Object.freeze([
  'rawContentPrinted',
  'rawAuditPrinted',
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

function normalizeCounters(value = {}) {
  const safeCounters = isPlainObject(value) ? value : {};
  const counters = {};
  for (const key of REQUIRED_COUNTER_KEYS) {
    counters[key] = safeCounters[key];
  }
  return counters;
}

function isNonNegativeInteger(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0;
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

  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
    if (isNonNegativeInteger(counters[key]) && counters[key] !== 0) {
      blockers.push(`counter_${key}_must_be_zero`);
    }
  }

  if (isNonNegativeInteger(counters.recordMemoryCalls) && counters.recordMemoryCalls !== 1) {
    blockers.push('counter_recordMemoryCalls_must_equal_one');
  }

  if (
    isNonNegativeInteger(counters.acceptedMemoryWrites)
    && isNonNegativeInteger(counters.rejectedMemoryWrites)
    && counters.acceptedMemoryWrites + counters.rejectedMemoryWrites !== 1
  ) {
    blockers.push('counter_write_outcome_must_be_exactly_one');
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
  if (safeClaims.rcNotReadyBlocked !== true) {
    blockers.push('claim_rcNotReadyBlocked_must_be_true');
  }
  return blockers;
}

function collectWriteAuditBlockers(writeAuditSummary) {
  const safeSummary = isPlainObject(writeAuditSummary) ? writeAuditSummary : {};
  const blockers = [];
  if (!normalizeString(safeSummary.status)) {
    blockers.push('write_audit_status_missing');
  }
  if (!isNonNegativeInteger(safeSummary.appendedCount) || safeSummary.appendedCount > 1) {
    blockers.push('write_audit_appendedCount_must_be_zero_or_one');
  }
  if (safeSummary.sanitizedOnly !== true) {
    blockers.push('write_audit_sanitizedOnly_must_be_true');
  }
  return blockers;
}

function isFortyCharHex(value) {
  return /^[a-f0-9]{40}$/i.test(value);
}

function evaluateWriteProofExecutionResultBoundary(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sideEffectCounters = normalizeCounters(safeInput.sideEffectCounters);
  const rawCounters = isPlainObject(safeInput.sideEffectCounters) ? safeInput.sideEffectCounters : {};
  const baselineCommit = normalizeString(safeInput.baselineCommit);
  const proofRunId = normalizeString(safeInput.proofRunId);
  const payloadHash = normalizeString(safeInput.payloadHash);
  const target = normalizeString(safeInput.target);
  const decision = normalizeString(safeInput.decision);
  const accepted = safeInput.accepted === true;
  const blocked = [];

  if (!isFortyCharHex(baselineCommit)) blocked.push('baselineCommit_missing_or_malformed');
  if (!proofRunId) blocked.push('proofRunId_missing');
  if (safeInput.approvalMatched !== true) blocked.push('approvalMatched_must_be_true');
  if (!payloadHash) blocked.push('payloadHash_missing');
  if (target !== 'process') blocked.push('target_must_be_process');
  if (!ALLOWED_DECISIONS.has(decision)) blocked.push('decision_not_allowed');
  if (accepted && decision !== 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY') {
    blocked.push('accepted_result_decision_mismatch');
  }
  if (!accepted && decision !== 'MEMORY_WRITE_BOUNDED_PROOF_FAILED_NOT_READY') {
    blocked.push('rejected_result_decision_mismatch');
  }

  blocked.push(
    ...collectCounterBlockers(sideEffectCounters, rawCounters),
    ...collectRawOutputFlagBlockers(safeInput.rawOutputFlags),
    ...collectClaimBlockers(safeInput.claims),
    ...collectWriteAuditBlockers(safeInput.writeAuditSummary)
  );

  if (isNonNegativeInteger(sideEffectCounters.acceptedMemoryWrites)) {
    if (accepted && sideEffectCounters.acceptedMemoryWrites !== 1) {
      blocked.push('accepted_result_requires_one_accepted_write');
    }
    if (!accepted && sideEffectCounters.acceptedMemoryWrites !== 0) {
      blocked.push('rejected_result_requires_zero_accepted_writes');
    }
  }
  if (isNonNegativeInteger(sideEffectCounters.rejectedMemoryWrites)) {
    if (accepted && sideEffectCounters.rejectedMemoryWrites !== 0) {
      blocked.push('accepted_result_requires_zero_rejected_writes');
    }
    if (!accepted && sideEffectCounters.rejectedMemoryWrites !== 1) {
      blocked.push('rejected_result_requires_one_rejected_write');
    }
  }
  if (isNonNegativeInteger(sideEffectCounters.durableMemoryWrites)) {
    if (accepted && sideEffectCounters.durableMemoryWrites !== 1) {
      blocked.push('accepted_result_requires_one_durable_memory_write');
    }
    if (!accepted && sideEffectCounters.durableMemoryWrites !== 0) {
      blocked.push('rejected_result_requires_zero_durable_memory_writes');
    }
  }
  if (isNonNegativeInteger(sideEffectCounters.durableAuditWrites) && sideEffectCounters.durableAuditWrites > 1) {
    blocked.push('durableAuditWrites_must_be_zero_or_one');
  }

  const blockerReasons = [...new Set(blocked)];
  const acceptedForBoundedWriteProofReview = blockerReasons.length === 0;

  return {
    taskId: TASK_ID,
    status: acceptedForBoundedWriteProofReview ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    acceptedForBoundedWriteProofReview,
    baselineCommit,
    proofRunId,
    approvalMatched: safeInput.approvalMatched === true,
    payloadHash,
    target,
    decision,
    accepted,
    memoryIdHashOrOpaqueId: normalizeString(safeInput.memoryIdHashOrOpaqueId),
    shadowWriteStatus: normalizeString(safeInput.shadowWriteStatus),
    writeAuditSummary: {
      status: normalizeString(safeInput.writeAuditSummary?.status),
      appendedCount: safeInput.writeAuditSummary?.appendedCount,
      sanitizedOnly: safeInput.writeAuditSummary?.sanitizedOnly === true
    },
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
  evaluateWriteProofExecutionResultBoundary,
  normalizeCounters
};
