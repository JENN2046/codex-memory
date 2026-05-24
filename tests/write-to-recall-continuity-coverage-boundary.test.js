'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STATUS_ACCEPTED,
  STATUS_BLOCKED,
  evaluateWriteToRecallContinuityCoverageBoundary
} = require('../src/core/WriteToRecallContinuityCoverageBoundary');

const BASE_INPUT = Object.freeze({
  proofBaselineCommit: 'ea12485b77279767410e10f9671af046c79293d0',
  coverageProofRunId: 'CM1017-ea12485-multi-marker-continuity',
  target: 'process',
  decision: 'WRITE_TO_RECALL_CONTINUITY_COVERAGE_PASSED_NOT_READY',
  includeContent: false,
  noRawContentRead: true,
  sanitizedOutputOnly: true,
  markers: [
    {
      markerId: 'CM-1015-proof-marker',
      sourceWriteMemoryIdHashesOrOpaqueIds: ['6b158de28cb1166e'],
      sourceWriteDecision: 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY',
      sourceWriteShadowWriteStatus: 'ok',
      matchMode: 'top_result_matches_expected',
      queryHash: '0cc54d5233908bd06538410258c5cc61c123a632dda48acce84881913ffb59ce',
      resultCount: 3,
      topResultIdHashOrStableOpaqueId: '6b158de28cb1166e',
      resultIdHashesOrStableOpaqueIds: [
        '6b158de28cb1166e',
        '449633a01f7c2db6',
        '3b9263b32c973db5'
      ],
      matchedExpectedIds: ['6b158de28cb1166e']
    },
    {
      markerId: 'store-freshness-family',
      sourceWriteMemoryIdHashesOrOpaqueIds: [
        '449633a01f7c2db6',
        '3b9263b32c973db5'
      ],
      sourceWriteDecision: 'MEMORY_WRITE_BOUNDED_PROOF_PASSED_NOT_READY',
      sourceWriteShadowWriteStatus: 'ok',
      matchMode: 'all_expected_ids_present_in_results',
      queryHash: '600625c230a3583330de24bb98c3821dd851de8f06c9377600f61de9c5293965',
      resultCount: 2,
      topResultIdHashOrStableOpaqueId: '449633a01f7c2db6',
      resultIdHashesOrStableOpaqueIds: [
        '449633a01f7c2db6',
        '3b9263b32c973db5'
      ],
      matchedExpectedIds: [
        '449633a01f7c2db6',
        '3b9263b32c973db5'
      ]
    }
  ],
  sideEffectCounters: {
    searchMemoryCalls: 2,
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

test('accepts complete multi-marker continuity coverage evidence as not-ready review input', () => {
  const result = evaluateWriteToRecallContinuityCoverageBoundary(BASE_INPUT);

  assert.equal(result.status, STATUS_ACCEPTED);
  assert.equal(result.acceptedForCoverageReview, true);
  assert.equal(result.markerCount, 2);
  assert.equal(result.matchedMarkerCount, 2);
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.safety.callsSearchMemory, false);
  assert.equal(result.safety.claimsContinuityReliable, false);
});

test('blocks partial coverage until a separate failed-evidence boundary exists', () => {
  const result = evaluateWriteToRecallContinuityCoverageBoundary({
    ...BASE_INPUT,
    decision: 'WRITE_TO_RECALL_CONTINUITY_COVERAGE_PARTIAL_NOT_READY',
    markers: [
      BASE_INPUT.markers[0],
      {
        ...BASE_INPUT.markers[1],
        resultIdHashesOrStableOpaqueIds: ['449633a01f7c2db6'],
        matchedExpectedIds: ['449633a01f7c2db6']
      }
    ]
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.equal(result.acceptedForCoverageReview, false);
  assert.ok(result.blockerReasons.includes('marker_1_expected_id_missing_3b9263b32c973db5'));
});

test('blocks passed coverage when an expected marker id is absent', () => {
  const result = evaluateWriteToRecallContinuityCoverageBoundary({
    ...BASE_INPUT,
    markers: [
      BASE_INPUT.markers[0],
      {
        ...BASE_INPUT.markers[1],
        resultIdHashesOrStableOpaqueIds: ['449633a01f7c2db6'],
        matchedExpectedIds: ['449633a01f7c2db6']
      }
    ]
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('marker_1_expected_id_missing_3b9263b32c973db5'));
  assert.ok(result.blockerReasons.includes('passed_coverage_requires_all_markers_matched'));
});

test('blocks malformed counters, raw leakage flags, and reliability or readiness claims', () => {
  const result = evaluateWriteToRecallContinuityCoverageBoundary({
    ...BASE_INPUT,
    sideEffectCounters: {
      ...BASE_INPUT.sideEffectCounters,
      searchMemoryCalls: 1,
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

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('counter_searchMemoryCalls_must_match_marker_count'));
  assert.ok(result.blockerReasons.includes('counter_recordMemoryCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_providerCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('raw_output_rawResultsPrinted_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_memoryWriteReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_memoryRecallReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_writeToRecallReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_readinessClaimAllowed_must_be_false'));
});

test('blocks missing proof metadata and unsafe request shape', () => {
  const result = evaluateWriteToRecallContinuityCoverageBoundary({
    ...BASE_INPUT,
    proofBaselineCommit: 'main',
    coverageProofRunId: '',
    target: 'both',
    includeContent: true,
    noRawContentRead: false,
    sanitizedOutputOnly: false,
    markers: [BASE_INPUT.markers[0]]
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('proofBaselineCommit_missing_or_malformed'));
  assert.ok(result.blockerReasons.includes('coverageProofRunId_missing'));
  assert.ok(result.blockerReasons.includes('target_must_be_process'));
  assert.ok(result.blockerReasons.includes('marker_count_must_be_between_two_and_five'));
  assert.ok(result.blockerReasons.includes('includeContent_must_be_false'));
  assert.ok(result.blockerReasons.includes('noRawContentRead_must_be_true'));
  assert.ok(result.blockerReasons.includes('sanitizedOutputOnly_must_be_true'));
});
