'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  evaluateWriteToRecallContinuityProofResultBoundary
} = require('../src/core/WriteToRecallContinuityProofResultBoundary');

const BASE_INPUT = Object.freeze({
  writeProofBaselineCommit: '60f2544378e163fa83de6a42f7914af0b5b309a4',
  continuityProofBaselineCommit: 'aefe8c2c81df857baae8569adb1742c820909cd2',
  sourceWriteProofRunId: 'CM1015-60f2544-cm0737-bounded-write-proof',
  continuityProofRunId: 'CM1016-aefe8c2-cm1015-write-to-recall-continuity',
  sourceWritePayloadHash:
    'a6785ca0f6d3ce566f6ca6421083997a616326f009a6212461c69b77dc1c6c0a',
  sourceWriteMemoryIdHashOrOpaqueId: '6b158de28cb1166e',
  sourceWriteDecision: 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY',
  sourceWriteShadowWriteStatus: 'ok',
  target: 'process',
  queryHash: '0cc54d5233908bd06538410258c5cc61c123a632dda48acce84881913ffb59ce',
  decision: 'WRITE_TO_RECALL_CONTINUITY_PROOF_PASSED_NOT_READY',
  resultCount: 1,
  topResultIdHashOrStableOpaqueId: '6b158de28cb1166e',
  matchedSourceWriteMemoryIdHash: true,
  includeContent: false,
  noRawContentRead: true,
  sanitizedOutputOnly: true,
  sideEffectCounters: {
    searchMemoryCalls: 1,
    recordMemoryCalls: 0,
    providerCalls: 0,
    apiCalls: 0,
    directJsonlReads: 0,
    rawDurableMemoryReads: 0,
    rawAuditReads: 0,
    memoryOverviewCalls: 0,
    durableMemoryWrites: 0,
    durableAuditWrites: 0,
    candidateCacheWrites: 0,
    candidateCacheFlushes: 0,
    syncCalls: 0,
    vectorFlushes: 0,
    embeddingCacheWrites: 0,
    publicMcpExpansion: 0,
    configWatchdogStartupChanges: 0,
    packageLockfileChanges: 0,
    tagReleaseDeployCutoverActions: 0,
    readinessClaims: 0,
    reliabilityClaims: 0
  },
  rawOutputFlags: {
    rawContentPrinted: false,
    rawResultsPrinted: false,
    rawMemoryPrinted: false,
    rawJsonlRead: false,
    rawFilePathsPrinted: false,
    secretsPrinted: false
  },
  claims: {
    readinessClaimAllowed: false,
    memoryWriteReliableClaimed: false,
    memoryRecallReliableClaimed: false,
    writeToRecallReliableClaimed: false,
    rcNotReadyBlocked: true
  }
});

test('accepts complete sanitized passed write-to-recall continuity evidence as not-ready review input', () => {
  const result = evaluateWriteToRecallContinuityProofResultBoundary(BASE_INPUT);

  assert.equal(result.status, RESULT_STATUS_ACCEPTED);
  assert.equal(result.acceptedForContinuityProofReview, true);
  assert.equal(result.decision, 'WRITE_TO_RECALL_CONTINUITY_PROOF_PASSED_NOT_READY');
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.safety.callsSearchMemory, false);
  assert.equal(result.safety.claimsContinuityReliable, false);
});

test('accepts complete sanitized failed continuity evidence without treating it as reliability', () => {
  const result = evaluateWriteToRecallContinuityProofResultBoundary({
    ...BASE_INPUT,
    decision: 'WRITE_TO_RECALL_CONTINUITY_PROOF_FAILED_NOT_READY',
    resultCount: 0,
    topResultIdHashOrStableOpaqueId: '',
    matchedSourceWriteMemoryIdHash: false
  });

  assert.equal(result.status, RESULT_STATUS_ACCEPTED);
  assert.equal(result.acceptedForContinuityProofReview, true);
  assert.equal(result.decision, 'WRITE_TO_RECALL_CONTINUITY_PROOF_FAILED_NOT_READY');
  assert.equal(result.resultCount, 0);
  assert.equal(result.matchedSourceWriteMemoryIdHash, false);
});

test('blocks passed evidence when the recalled top id does not match the source write id', () => {
  const result = evaluateWriteToRecallContinuityProofResultBoundary({
    ...BASE_INPUT,
    topResultIdHashOrStableOpaqueId: 'different-id-hash',
    matchedSourceWriteMemoryIdHash: false
  });

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.equal(result.acceptedForContinuityProofReview, false);
  assert.ok(
    result.blockerReasons.includes('passed_result_requires_source_write_memory_id_match')
  );
  assert.ok(
    result.blockerReasons.includes('passed_result_top_id_hash_must_match_source_write')
  );
});

test('blocks passed evidence when the top result id hash is missing', () => {
  const result = evaluateWriteToRecallContinuityProofResultBoundary({
    ...BASE_INPUT,
    topResultIdHashOrStableOpaqueId: ''
  });

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.equal(result.acceptedForContinuityProofReview, false);
  assert.ok(result.blockerReasons.includes('passed_result_top_id_hash_missing'));
});

test('blocks missing counters, raw output, extra writes, and readiness or reliability claims', () => {
  const { searchMemoryCalls, ...missingSearchCounter } = BASE_INPUT.sideEffectCounters;
  const result = evaluateWriteToRecallContinuityProofResultBoundary({
    ...BASE_INPUT,
    sideEffectCounters: {
      ...missingSearchCounter,
      recordMemoryCalls: 1,
      providerCalls: 1
    },
    rawOutputFlags: {
      ...BASE_INPUT.rawOutputFlags,
      rawResultsPrinted: true
    },
    claims: {
      ...BASE_INPUT.claims,
      memoryWriteReliableClaimed: true,
      memoryRecallReliableClaimed: true,
      writeToRecallReliableClaimed: true,
      readinessClaimAllowed: true
    }
  });

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('counter_searchMemoryCalls_missing'));
  assert.ok(result.blockerReasons.includes('counter_recordMemoryCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_providerCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('raw_output_rawResultsPrinted_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_memoryWriteReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_memoryRecallReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_writeToRecallReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_readinessClaimAllowed_must_be_false'));
});

test('blocks malformed baselines and source write drift', () => {
  const result = evaluateWriteToRecallContinuityProofResultBoundary({
    ...BASE_INPUT,
    writeProofBaselineCommit: 'main',
    continuityProofBaselineCommit: '',
    sourceWriteDecision: 'MEMORY_WRITE_BOUNDED_PROOF_FAILED_NOT_READY',
    sourceWriteShadowWriteStatus: 'failed',
    includeContent: true,
    noRawContentRead: false,
    sanitizedOutputOnly: false
  });

  assert.equal(result.status, RESULT_STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('writeProofBaselineCommit_missing_or_malformed'));
  assert.ok(result.blockerReasons.includes('continuityProofBaselineCommit_missing_or_malformed'));
  assert.ok(result.blockerReasons.includes('sourceWriteDecision_must_be_passed_not_ready'));
  assert.ok(result.blockerReasons.includes('sourceWriteShadowWriteStatus_must_be_ok'));
  assert.ok(result.blockerReasons.includes('includeContent_must_be_false'));
  assert.ok(result.blockerReasons.includes('noRawContentRead_must_be_true'));
  assert.ok(result.blockerReasons.includes('sanitizedOutputOnly_must_be_true'));
});
