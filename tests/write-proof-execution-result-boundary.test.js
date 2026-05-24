'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  evaluateWriteProofExecutionResultBoundary,
  normalizeCounters
} = require('../src/core/WriteProofExecutionResultBoundary');

const BASELINE = '4094e4dc3180ac33300095b304b375779bc800f5';

function createCounters(overrides = {}) {
  return {
    recordMemoryCalls: 1,
    acceptedMemoryWrites: 1,
    rejectedMemoryWrites: 0,
    durableMemoryWrites: 1,
    durableAuditWrites: 1,
    searchMemoryCalls: 0,
    providerCalls: 0,
    apiCalls: 0,
    directJsonlReads: 0,
    rawDurableMemoryReads: 0,
    rawAuditReads: 0,
    memoryOverviewCalls: 0,
    publicMcpExpansion: 0,
    migrationImportExportBackupRestoreApply: 0,
    configWatchdogStartupChanges: 0,
    packageLockfileChanges: 0,
    tagReleaseDeployCutoverActions: 0,
    readinessClaims: 0,
    reliabilityClaims: 0,
    ...overrides
  };
}

function createRawOutputFlags(overrides = {}) {
  return {
    rawContentPrinted: false,
    rawAuditPrinted: false,
    rawMemoryPrinted: false,
    rawJsonlRead: false,
    rawFilePathsPrinted: false,
    secretsPrinted: false,
    ...overrides
  };
}

function createInput(overrides = {}) {
  return {
    baselineCommit: BASELINE,
    proofRunId: 'CM-1010-synthetic-result-boundary',
    approvalMatched: true,
    payloadHash: 'sha256:bounded-write-proof-payload-v1',
    target: 'process',
    decision: 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY',
    accepted: true,
    memoryIdHashOrOpaqueId: 'opaque-memory-id-hash',
    shadowWriteStatus: 'ok',
    writeAuditSummary: {
      status: 'ok',
      appendedCount: 1,
      sanitizedOnly: true
    },
    sideEffectCounters: createCounters(),
    rawOutputFlags: createRawOutputFlags(),
    claims: {
      readinessClaimAllowed: false,
      memoryWriteReliableClaimed: false,
      rcNotReadyBlocked: true
    },
    ...overrides
  };
}

test('CM-1010 accepts a sanitized accepted one-write proof result without claiming readiness', () => {
  const result = evaluateWriteProofExecutionResultBoundary(createInput());

  assert.equal(result.status, RESULT_STATUS_ACCEPTED);
  assert.equal(result.acceptedForBoundedWriteProofReview, true);
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.accepted, true);
  assert.equal(result.sideEffectCounters.recordMemoryCalls, 1);
  assert.equal(result.sideEffectCounters.searchMemoryCalls, 0);
  assert.equal(result.sideEffectCounters.providerCalls, 0);
  assert.equal(result.sideEffectCounters.publicMcpExpansion, 0);
  assert.equal(result.sideEffectCounters.readinessClaims, 0);
  assert.equal(result.sideEffectCounters.reliabilityClaims, 0);
  assert.equal(result.safety.sourceMode, 'explicit_input_only');
  assert.equal(result.safety.callsRecordMemory, false);
  assert.equal(result.safety.claimsReadiness, false);
  assert.equal(result.safety.claimsWriteReliable, false);
});

test('CM-1010 accepts a sanitized rejected one-write proof result as reviewable not-ready evidence', () => {
  const result = evaluateWriteProofExecutionResultBoundary(createInput({
    decision: 'MEMORY_WRITE_BOUNDED_PROOF_FAILED_NOT_READY',
    accepted: false,
    shadowWriteStatus: 'rejected_validation',
    writeAuditSummary: {
      status: 'rejected_validation',
      appendedCount: 1,
      sanitizedOnly: true
    },
    sideEffectCounters: createCounters({
      acceptedMemoryWrites: 0,
      rejectedMemoryWrites: 1,
      durableMemoryWrites: 0
    })
  }));

  assert.equal(result.status, RESULT_STATUS_ACCEPTED);
  assert.equal(result.acceptedForBoundedWriteProofReview, true);
  assert.equal(result.accepted, false);
  assert.deepEqual(result.blockerReasons, []);
});

test('CM-1010 fails closed when exact approval, baseline, payload, or target drift', () => {
  const result = evaluateWriteProofExecutionResultBoundary(createInput({
    baselineCommit: '4094e4d',
    proofRunId: '',
    approvalMatched: false,
    payloadHash: '',
    target: 'knowledge'
  }));

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.equal(result.acceptedForBoundedWriteProofReview, false);
  assert.ok(result.blockerReasons.includes('baselineCommit_missing_or_malformed'));
  assert.ok(result.blockerReasons.includes('proofRunId_missing'));
  assert.ok(result.blockerReasons.includes('approvalMatched_must_be_true'));
  assert.ok(result.blockerReasons.includes('payloadHash_missing'));
  assert.ok(result.blockerReasons.includes('target_must_be_process'));
});

test('CM-1010 fails closed for missing, malformed, negative, or unknown-positive counters', () => {
  const missing = createCounters();
  delete missing.providerCalls;

  const cases = [
    {
      counters: missing,
      reason: 'counter_providerCalls_missing'
    },
    {
      counters: createCounters({ providerCalls: '0' }),
      reason: 'counter_providerCalls_malformed'
    },
    {
      counters: createCounters({ providerCalls: -1 }),
      reason: 'counter_providerCalls_malformed'
    },
    {
      counters: createCounters({ providerCalls: Number.NaN }),
      reason: 'counter_providerCalls_malformed'
    },
    {
      counters: createCounters({ unreviewedWriteCounter: 1 }),
      reason: 'counter_unreviewedWriteCounter_unknown_nonzero'
    }
  ];

  for (const counterCase of cases) {
    const result = evaluateWriteProofExecutionResultBoundary(createInput({
      sideEffectCounters: counterCase.counters
    }));

    assert.equal(result.status, RESULT_STATUS_BLOCKED, counterCase.reason);
    assert.ok(result.blockerReasons.includes(counterCase.reason), counterCase.reason);
  }
});

test('CM-1010 fails closed for second write, search/provider/raw side effects, and output leaks', () => {
  const result = evaluateWriteProofExecutionResultBoundary(createInput({
    sideEffectCounters: createCounters({
      recordMemoryCalls: 2,
      searchMemoryCalls: 1,
      providerCalls: 1,
      rawDurableMemoryReads: 1
    }),
    rawOutputFlags: createRawOutputFlags({
      rawContentPrinted: true,
      secretsPrinted: true
    })
  }));

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('counter_recordMemoryCalls_must_equal_one'));
  assert.ok(result.blockerReasons.includes('counter_searchMemoryCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_providerCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_rawDurableMemoryReads_must_be_zero'));
  assert.ok(result.blockerReasons.includes('raw_output_rawContentPrinted_must_be_false'));
  assert.ok(result.blockerReasons.includes('raw_output_secretsPrinted_must_be_false'));
});

test('CM-1010 fails closed for contradictory write outcomes and readiness/reliability claims', () => {
  const result = evaluateWriteProofExecutionResultBoundary(createInput({
    decision: 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY',
    accepted: false,
    sideEffectCounters: createCounters({
      acceptedMemoryWrites: 1,
      rejectedMemoryWrites: 0,
      durableMemoryWrites: 1,
      readinessClaims: 1,
      reliabilityClaims: 1
    }),
    claims: {
      readinessClaimAllowed: true,
      memoryWriteReliableClaimed: true,
      rcNotReadyBlocked: false
    }
  }));

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('rejected_result_decision_mismatch'));
  assert.ok(result.blockerReasons.includes('rejected_result_requires_zero_accepted_writes'));
  assert.ok(result.blockerReasons.includes('rejected_result_requires_one_rejected_write'));
  assert.ok(result.blockerReasons.includes('rejected_result_requires_zero_durable_memory_writes'));
  assert.ok(result.blockerReasons.includes('counter_readinessClaims_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_reliabilityClaims_must_be_zero'));
  assert.ok(result.blockerReasons.includes('claim_readinessClaimAllowed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_memoryWriteReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_rcNotReadyBlocked_must_be_true'));
});

test('CM-1010 normalizes only the required counter set without reading files or commands', () => {
  const normalized = normalizeCounters(createCounters({ extraZero: 0 }));

  assert.deepEqual(Object.keys(normalized), REQUIRED_COUNTER_KEYS);
  assert.equal(normalized.providerCalls, 0);
});
