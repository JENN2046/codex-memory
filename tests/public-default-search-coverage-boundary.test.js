'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STATUS_ACCEPTED,
  STATUS_BLOCKED,
  evaluatePublicDefaultSearchCoverageBoundary
} = require('../src/core/PublicDefaultSearchCoverageBoundary');

const BASE_INPUT = Object.freeze({
  proofBaselineCommit: 'bdd10bdb904b124eb1a4d412df7e46462e5358a7',
  proofRunId: 'CM1018-bdd10bd-public-default-search-coverage',
  target: 'process',
  decision: 'PUBLIC_DEFAULT_SEARCH_COVERAGE_PASSED_NOT_READY',
  includeContent: false,
  publicDefaultSearch: true,
  internalNoRawAdapterUsed: false,
  requestContextNoTokenReadOnly: false,
  rawOutputPrinted: false,
  markers: [
    {
      markerId: 'CM-1015-proof-marker',
      expectedMemoryIdHashesOrOpaqueIds: ['6b158de28cb1166e'],
      matchMode: 'top_result_matches_expected',
      queryHash: '0cc54d5233908bd06538410258c5cc61c123a632dda48acce84881913ffb59ce',
      resultCount: 4,
      topResultIdHashOrStableOpaqueId: '6b158de28cb1166e',
      resultIdHashesOrStableOpaqueIds: [
        '6b158de28cb1166e',
        '449633a01f7c2db6',
        '3b9263b32c973db5',
        '2e5ef202f9aa0e19'
      ],
      matchedExpectedIds: ['6b158de28cb1166e'],
      rawOutputPrinted: false
    },
    {
      markerId: 'store-freshness-family',
      expectedMemoryIdHashesOrOpaqueIds: [
        '449633a01f7c2db6',
        '3b9263b32c973db5'
      ],
      matchMode: 'all_expected_ids_present_in_results',
      queryHash: '600625c230a3583330de24bb98c3821dd851de8f06c9377600f61de9c5293965',
      resultCount: 4,
      topResultIdHashOrStableOpaqueId: '449633a01f7c2db6',
      resultIdHashesOrStableOpaqueIds: [
        '449633a01f7c2db6',
        '3b9263b32c973db5',
        '6b158de28cb1166e',
        '2e5ef202f9aa0e19'
      ],
      matchedExpectedIds: [
        '449633a01f7c2db6',
        '3b9263b32c973db5'
      ],
      rawOutputPrinted: false
    }
  ],
  sideEffectCounters: {
    searchMemoryCalls: 2,
    recordMemoryCalls: 0,
    providerCalls: 0,
    apiCalls: 0,
    syncCalls: 2,
    rawDurableMemoryReads: 2,
    durableRecallAuditWrites: 2,
    candidateCacheWrites: 2,
    candidateCacheFlushes: 4,
    vectorFlushes: 10,
    embeddingCacheWrites: 8,
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
    secretsPrinted: false,
    rawSnippetPrinted: false,
    rawTextPrinted: false,
    rawTitlePrinted: false,
    rawSourceFilePrinted: false
  },
  claims: {
    readinessClaimAllowed: false,
    memoryWriteReliableClaimed: false,
    memoryRecallReliableClaimed: false,
    publicSearchReliableClaimed: false,
    rcNotReadyBlocked: true
  }
});

test('accepts bounded public default search coverage evidence as not-ready review input', () => {
  const result = evaluatePublicDefaultSearchCoverageBoundary(BASE_INPUT);

  assert.equal(result.status, STATUS_ACCEPTED);
  assert.equal(result.acceptedForCoverageReview, true);
  assert.equal(result.markerCount, 2);
  assert.equal(result.matchedMarkerCount, 2);
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.safety.callsSearchMemory, false);
  assert.equal(result.safety.allowsLocalDefaultSearchSideEffects, true);
  assert.equal(result.safety.claimsPublicSearchReliable, false);
});

test('blocks passed coverage when marker facts are missing or mismatched', () => {
  const result = evaluatePublicDefaultSearchCoverageBoundary({
    ...BASE_INPUT,
    markers: [
      {
        ...BASE_INPUT.markers[0],
        markerId: '',
        topResultIdHashOrStableOpaqueId: '449633a01f7c2db6'
      },
      {
        ...BASE_INPUT.markers[1],
        resultIdHashesOrStableOpaqueIds: ['449633a01f7c2db6'],
        matchedExpectedIds: ['449633a01f7c2db6']
      }
    ]
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('marker_0_id_missing'));
  assert.ok(result.blockerReasons.includes('marker_0_top_result_id_must_match_expected'));
  assert.ok(result.blockerReasons.includes('marker_1_expected_id_missing_3b9263b32c973db5'));
  assert.ok(result.blockerReasons.includes('passed_coverage_requires_all_markers_matched'));
});

test('blocks unsafe public search request shape drift', () => {
  const result = evaluatePublicDefaultSearchCoverageBoundary({
    ...BASE_INPUT,
    includeContent: true,
    publicDefaultSearch: false,
    internalNoRawAdapterUsed: true,
    requestContextNoTokenReadOnly: true,
    rawOutputPrinted: true
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('includeContent_must_be_false'));
  assert.ok(result.blockerReasons.includes('publicDefaultSearch_must_be_true'));
  assert.ok(result.blockerReasons.includes('internalNoRawAdapterUsed_must_be_false'));
  assert.ok(result.blockerReasons.includes('requestContextNoTokenReadOnly_must_be_false'));
  assert.ok(result.blockerReasons.includes('rawOutputPrinted_must_be_false'));
});

test('blocks forbidden side effects, readiness, and reliability claims', () => {
  const result = evaluatePublicDefaultSearchCoverageBoundary({
    ...BASE_INPUT,
    sideEffectCounters: {
      ...BASE_INPUT.sideEffectCounters,
      recordMemoryCalls: 1,
      providerCalls: 1,
      apiCalls: 1,
      publicMcpExpansion: 1,
      configWatchdogStartupChanges: 1,
      packageLockfileChanges: 1,
      tagReleaseDeployCutoverActions: 1,
      readinessClaims: 1,
      reliabilityClaims: 1
    },
    claims: {
      ...BASE_INPUT.claims,
      memoryWriteReliableClaimed: true,
      memoryRecallReliableClaimed: true,
      publicSearchReliableClaimed: true,
      readinessClaimAllowed: true
    }
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('counter_recordMemoryCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_providerCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_apiCalls_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_publicMcpExpansion_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_configWatchdogStartupChanges_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_packageLockfileChanges_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_tagReleaseDeployCutoverActions_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_readinessClaims_must_be_zero'));
  assert.ok(result.blockerReasons.includes('counter_reliabilityClaims_must_be_zero'));
  assert.ok(result.blockerReasons.includes('claim_memoryWriteReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_memoryRecallReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_publicSearchReliableClaimed_must_be_false'));
  assert.ok(result.blockerReasons.includes('claim_readinessClaimAllowed_must_be_false'));
});

test('blocks local default-search side-effect counters outside bounded budget', () => {
  const result = evaluatePublicDefaultSearchCoverageBoundary({
    ...BASE_INPUT,
    sideEffectCounters: {
      ...BASE_INPUT.sideEffectCounters,
      searchMemoryCalls: 1,
      syncCalls: 1,
      rawDurableMemoryReads: 1,
      durableRecallAuditWrites: 1,
      candidateCacheWrites: 3,
      candidateCacheFlushes: 7,
      vectorFlushes: 13,
      embeddingCacheWrites: 11,
      unexpectedCounter: 1
    }
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('counter_searchMemoryCalls_must_match_marker_count'));
  assert.ok(result.blockerReasons.includes('counter_syncCalls_must_match_marker_count'));
  assert.ok(result.blockerReasons.includes('counter_rawDurableMemoryReads_must_match_marker_count'));
  assert.ok(result.blockerReasons.includes('counter_durableRecallAuditWrites_must_match_marker_count'));
  assert.ok(result.blockerReasons.includes('counter_candidateCacheWrites_exceeds_public_default_search_budget'));
  assert.ok(result.blockerReasons.includes('counter_candidateCacheFlushes_exceeds_public_default_search_budget'));
  assert.ok(result.blockerReasons.includes('counter_vectorFlushes_exceeds_public_default_search_budget'));
  assert.ok(result.blockerReasons.includes('counter_embeddingCacheWrites_exceeds_public_default_search_budget'));
  assert.ok(result.blockerReasons.includes('counter_unexpectedCounter_unknown_nonzero'));
});

test('blocks raw output flags and malformed proof metadata', () => {
  const result = evaluatePublicDefaultSearchCoverageBoundary({
    ...BASE_INPUT,
    proofBaselineCommit: 'main',
    proofRunId: '',
    target: 'both',
    rawOutputFlags: {
      ...BASE_INPUT.rawOutputFlags,
      rawSnippetPrinted: true,
      rawTextPrinted: true,
      rawTitlePrinted: true,
      rawSourceFilePrinted: true
    },
    markers: [
      {
        ...BASE_INPUT.markers[0],
        rawOutputPrinted: true
      }
    ]
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.ok(result.blockerReasons.includes('proofBaselineCommit_missing_or_malformed'));
  assert.ok(result.blockerReasons.includes('proofRunId_missing'));
  assert.ok(result.blockerReasons.includes('target_must_be_process'));
  assert.ok(result.blockerReasons.includes('marker_count_must_be_between_two_and_five'));
  assert.ok(result.blockerReasons.includes('marker_0_raw_output_printed_must_be_false'));
  assert.ok(result.blockerReasons.includes('raw_output_rawSnippetPrinted_must_be_false'));
  assert.ok(result.blockerReasons.includes('raw_output_rawTextPrinted_must_be_false'));
  assert.ok(result.blockerReasons.includes('raw_output_rawTitlePrinted_must_be_false'));
  assert.ok(result.blockerReasons.includes('raw_output_rawSourceFilePrinted_must_be_false'));
});
