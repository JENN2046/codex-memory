'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXACT_APPROVAL_LINE,
  EXACT_QUERY_COUNT,
  PROOF_MODE,
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
          title: 'private title that must be hashed',
          score: 0.987654321,
          matchedTags: ['safe-tag'],
          content: 'RAW PRIVATE CONTENT MUST NOT APPEAR',
          text: 'RAW PRIVATE TEXT MUST NOT APPEAR',
          snippet: 'RAW PRIVATE SNIPPET MUST NOT APPEAR'
        }],
        sideEffectCounters: {
          providerCalls: 0,
          directJsonlReads: 0,
          durableMemoryWrites: 0,
          durableAuditWrites: 0,
          candidateCacheWrites: 0,
          candidateCacheFlushes: 0,
          syncCalls: 0,
          vectorFlushes: 0,
          embeddingCacheWrites: 0,
          rawMemoryContentReads: 0,
          publicMcpExpansion: 0
        }
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

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('RAW PRIVATE CONTENT MUST NOT APPEAR'), false);
  assert.equal(serialized.includes('RAW PRIVATE TEXT MUST NOT APPEAR'), false);
  assert.equal(serialized.includes('RAW PRIVATE SNIPPET MUST NOT APPEAR'), false);
  assert.equal(serialized.includes('private title that must be hashed'), false);
  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('content'), false);
  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('text'), false);
  assert.equal(report.perQuery[0].matchedMetadataKeysOnly.includes('snippet'), false);
  assert.match(report.perQuery[0].topResultIdHashOrStableOpaqueId, /^[a-f0-9]{16}$/);
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
          sideEffectCounters: { [key]: 1 }
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
