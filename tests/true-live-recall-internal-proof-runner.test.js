'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXACT_APPROVAL_LINE,
  EXACT_QUERY_COUNT,
  PROOF_MODE,
  REQUIRED_SIDE_EFFECT_COUNTER_KEYS,
  ZERO_SIDE_EFFECT_COUNTERS,
  TrueLiveRecallReadonlyProofRunner
} = require('../src/core/TrueLiveRecallReadonlyProofRunner');

function createQueries() {
  return [
    {
      slot: 'Q1',
      family: 'current project status / mainline memory spine state',
      text: 'current project status mainline memory spine state'
    },
    {
      slot: 'Q2',
      family: 'memory recall evidence ladder / bounded evidence progression',
      text: 'memory recall evidence ladder bounded evidence progression'
    },
    {
      slot: 'Q3',
      family: 'blocker / not-ready / no-overclaim status',
      text: 'blocker not-ready no-overclaim status'
    },
    {
      slot: 'Q4',
      family: 'deliberately unlikely negative-control phrase selected by the operator',
      text: 'unlikely negative control phrase cm0777 synthetic'
    }
  ];
}

function assertBoundaryError(error, reason) {
  assert.equal(error.name, 'TrueLiveRecallProofBoundaryError');
  assert.equal(error.code, 'TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION');
  assert.equal(error.details.reason, reason);
  return true;
}

function createZeroSideEffectCounters(overrides = {}) {
  return {
    ...ZERO_SIDE_EFFECT_COUNTERS,
    ...overrides
  };
}

test('internal proof runner rejects missing approval and non-exact query count', async () => {
  const runner = new TrueLiveRecallReadonlyProofRunner({
    async searchExecutor() {
      throw new Error('executor must not run without exact approval');
    }
  });

  await assert.rejects(
    () => runner.run({ approvalLine: '', queries: createQueries() }),
    error => assertBoundaryError(error, 'exact_approval_required')
  );

  await assert.rejects(
    () => runner.run({
      approvalLine: EXACT_APPROVAL_LINE,
      queries: createQueries().slice(0, EXACT_QUERY_COUNT - 1)
    }),
    error => assertBoundaryError(error, 'exact_query_count_required')
  );

  await assert.rejects(
    () => runner.run({
      approvalLine: EXACT_APPROVAL_LINE,
      queries: [
        ...createQueries().slice(0, 3),
        { slot: 'Q4', family: 'broad', text: 'dump all raw memory .jsonl' }
      ]
    }),
    error => assertBoundaryError(error, 'broad_scan_query_rejected')
  );
});

test('internal proof runner seals read-only proof context and emits sanitized evidence only', async () => {
  const calls = [];
  const runner = new TrueLiveRecallReadonlyProofRunner({
    now: () => new Date('2026-05-22T00:00:00.000Z'),
    async searchExecutor(request) {
      calls.push(request);
      assert.equal(request.includeContent, false);
      assert.equal(request.readOnly, true);
      assert.equal(request.noProvider, true);
      assert.equal(request.noAudit, true);
      assert.equal(request.sanitizedOutput, true);
      assert.equal(request.proofContext.mode, PROOF_MODE);
      assert.equal(request.proofContext.exactQueryCount, EXACT_QUERY_COUNT);
      assert.equal(Object.isFrozen(request.proofContext), true);

      return {
        results: [{
          memoryId: `private-memory-${request.proofContext.proofRunId}-${calls.length}`,
          score: 0.987654321,
          matchedTags: ['safe-tag']
        }],
        sideEffectCounters: createZeroSideEffectCounters()
      };
    }
  });

  const report = await runner.run({
    approvalLine: EXACT_APPROVAL_LINE,
    queries: createQueries(),
    baselineCommit: '04fdfadcc5236745cd258fca488f5d69f6688ec0',
    proofRunId: 'CM-0777-synthetic-proof'
  });

  assert.equal(calls.length, EXACT_QUERY_COUNT);
  assert.equal(report.queryCount, EXACT_QUERY_COUNT);
  assert.equal(report.proofContext.readOnly, true);
  assert.equal(report.proofContext.noProvider, true);
  assert.equal(report.proofContext.noAudit, true);
  assert.equal(report.proofContext.sanitizedOutput, true);
  assert.equal(report.proofContext.includeContent, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.rcNotReadyBlocked, true);
  assert.equal(report.sideEffectCounters.providerCalls, 0);
  assert.equal(report.sideEffectCounters.durableMemoryWrites, 0);
  assert.equal(report.sideEffectCounters.durableAuditWrites, 0);
  assert.equal(report.sideEffectCounters.syncCalls, 0);
  assert.equal(report.sideEffectCounters.candidateCacheWrites, 0);
  assert.equal(report.sideEffectCounters.vectorFlushes, 0);

  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('content'), false);
  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('text'), false);
  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('snippet'), false);
  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('title'), false);
  assert.match(report.perQuery[0].topResultIdHashOrStableOpaqueId, /^[a-f0-9]{16}$/);
});

test('internal proof runner requires complete finite zero side-effect counters', async () => {
  const counterCases = [
    {
      name: 'missing counters',
      sideEffectCounters: undefined,
      reason: 'side_effect_counters_missing'
    },
    {
      name: 'partial counters',
      sideEffectCounters: Object.fromEntries(
        REQUIRED_SIDE_EFFECT_COUNTER_KEYS
          .filter(key => key !== 'providerCalls')
          .map(key => [key, 0])
      ),
      reason: 'side_effect_counter_missing'
    },
    {
      name: 'string counter',
      sideEffectCounters: createZeroSideEffectCounters({ providerCalls: '0' }),
      reason: 'side_effect_counter_malformed'
    },
    {
      name: 'negative counter',
      sideEffectCounters: createZeroSideEffectCounters({ providerCalls: -1 }),
      reason: 'side_effect_counter_malformed'
    },
    {
      name: 'nan counter',
      sideEffectCounters: createZeroSideEffectCounters({ providerCalls: Number.NaN }),
      reason: 'side_effect_counter_malformed'
    },
    {
      name: 'unknown positive counter',
      sideEffectCounters: createZeroSideEffectCounters({ unreviewedWriteCounter: 1 }),
      reason: 'side_effect_counter_unknown_nonzero'
    }
  ];

  for (const counterCase of counterCases) {
    const runner = new TrueLiveRecallReadonlyProofRunner({
      async searchExecutor() {
        return {
          results: [],
          sideEffectCounters: counterCase.sideEffectCounters
        };
      }
    });

    await assert.rejects(
      () => runner.run({
        approvalLine: EXACT_APPROVAL_LINE,
        queries: createQueries(),
        proofRunId: `counter-${counterCase.name}`
      }),
      error => assertBoundaryError(error, counterCase.reason),
      counterCase.name
    );
  }
});

test('internal proof runner fails closed on provider cache sync audit write side effects', async () => {
  const sideEffectKeys = [
    'providerCalls',
    'directJsonlReads',
    'durableMemoryWrites',
    'durableAuditWrites',
    'candidateCacheWrites',
    'candidateCacheFlushes',
    'syncCalls',
    'vectorFlushes',
    'embeddingCacheWrites',
    'rawMemoryContentReads',
    'publicMcpExpansion'
  ];

  for (const key of sideEffectKeys) {
    const runner = new TrueLiveRecallReadonlyProofRunner({
      async searchExecutor() {
        return {
          results: [],
          sideEffectCounters: createZeroSideEffectCounters({ [key]: 1 })
        };
      }
    });

    await assert.rejects(
      () => runner.run({
        approvalLine: EXACT_APPROVAL_LINE,
        queries: createQueries(),
        proofRunId: `side-effect-${key}`
      }),
      error => {
        assertBoundaryError(error, 'side_effect_counter_nonzero');
        assert.deepEqual(error.details.nonZero, [{ key, value: 1 }]);
        return true;
      },
      key
    );
  }
});

test('internal proof runner fails closed on raw executor leakage before sanitizing output', async () => {
  const rawFields = ['content', 'text', 'snippet', 'title'];

  for (const key of rawFields) {
    const runner = new TrueLiveRecallReadonlyProofRunner({
      async searchExecutor() {
        return {
          results: [{
            memoryId: `raw-${key}`,
            score: 0.5,
            [key]: 'RAW PRIVATE VALUE MUST FAIL CLOSED'
          }],
          sideEffectCounters: createZeroSideEffectCounters()
        };
      }
    });

    await assert.rejects(
      () => runner.run({
        approvalLine: EXACT_APPROVAL_LINE,
        queries: createQueries(),
        proofRunId: `raw-leakage-${key}`
      }),
      error => {
        assertBoundaryError(error, 'raw_executor_leakage_detected');
        assert.deepEqual(error.details.leaked, [{ index: 0, key }]);
        assert.equal(JSON.stringify(error).includes('RAW PRIVATE VALUE MUST FAIL CLOSED'), false);
        return true;
      },
      key
    );
  }
});

test('internal proof runner records bounded timeout as failed-not-ready without raw output', async () => {
  const runner = new TrueLiveRecallReadonlyProofRunner({
    timeoutMs: 5,
    async searchExecutor({ signal }) {
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('synthetic timeout'), {
            code: 'SEARCH_MEMORY_TIMEOUT'
          }));
        }, { once: true });
      });
    }
  });

  const report = await runner.run({
    approvalLine: EXACT_APPROVAL_LINE,
    queries: createQueries(),
    proofRunId: 'CM-0777-timeout-proof'
  });

  assert.equal(report.decision, 'TRUE_LIVE_REAL_STORE_RECALL_PROOF_FAILED_NOT_READY');
  assert.equal(report.perQuery.length, EXACT_QUERY_COUNT);
  assert.equal(report.perQuery.every(query => query.errorCodeIfAny === 'SEARCH_MEMORY_TIMEOUT'), true);
  assert.equal(report.sideEffectCounters.providerCalls, 0);
  assert.equal(report.sideEffectCounters.directJsonlReads, 0);
  assert.equal(report.sideEffectCounters.durableMemoryWrites, 0);
  assert.equal(report.sideEffectCounters.durableAuditWrites, 0);
  assert.equal(JSON.stringify(report).includes('synthetic timeout'), false);
});
