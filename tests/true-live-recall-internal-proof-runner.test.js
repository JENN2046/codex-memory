'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CM0825_PATCHED_EXACT_APPROVAL_LINE,
  CM0825_PATCHED_REQUIRED_QUERIES,
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

function createCm0825Queries() {
  return CM0825_PATCHED_REQUIRED_QUERIES.map(query => ({ ...query }));
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
  assert.equal(report.proofContext.approvalReference, 'operator_exact_approval_required');
  assert.equal(Object.prototype.hasOwnProperty.call(report.proofContext, 'approvalPacket'), false);
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

test('internal proof runner allows a narrowed approval reference override without reviving legacy packet labeling', async () => {
  const runner = new TrueLiveRecallReadonlyProofRunner({
    async searchExecutor() {
      return {
        results: [],
        sideEffectCounters: createZeroSideEffectCounters()
      };
    }
  });

  const report = await runner.run({
    approvalLine: EXACT_APPROVAL_LINE,
    approvalReference: 'CM-0814-exact-approved-live-proof',
    queries: createQueries(),
    proofRunId: 'CM-0818-traceability-normalization'
  });

  assert.equal(report.proofContext.approvalReference, 'CM-0814-exact-approved-live-proof');
  assert.equal(Object.prototype.hasOwnProperty.call(report.proofContext, 'approvalPacket'), false);
});

test('internal proof runner accepts CM-0825 patched approval only with exact patched query set', async () => {
  const calls = [];
  const runner = new TrueLiveRecallReadonlyProofRunner({
    async searchExecutor(request) {
      calls.push(request);
      return {
        results: [],
        sideEffectCounters: createZeroSideEffectCounters()
      };
    }
  });

  const report = await runner.run({
    approvalLine: CM0825_PATCHED_EXACT_APPROVAL_LINE,
    approvalReference: 'CM0825_EXACT_APPROVED_PATCHED_TRUE_LIVE_RECALL_PROOF_ONCE',
    queries: createCm0825Queries(),
    proofRunId: 'CM-1006-cm0825-profile-regression'
  });

  assert.equal(report.queryCount, EXACT_QUERY_COUNT);
  assert.equal(calls.length, EXACT_QUERY_COUNT);
  assert.deepEqual(
    report.queryFamiliesUsed,
    CM0825_PATCHED_REQUIRED_QUERIES.map(({ slot, family }) => ({ slot, family }))
  );
  assert.equal(report.proofContext.approvalReference, 'CM0825_EXACT_APPROVED_PATCHED_TRUE_LIVE_RECALL_PROOF_ONCE');
  assert.equal(report.proofContext.readOnly, true);
  assert.equal(report.proofContext.noProvider, true);
  assert.equal(report.proofContext.noAudit, true);
  assert.equal(report.proofContext.sanitizedOutput, true);
  assert.equal(report.proofContext.includeContent, false);
  assert.equal(calls[0].precisionPolicyContext, null);
  assert.deepEqual(calls[3].precisionPolicyContext, {
    enabled: true,
    queryFamily: 'stricter_negative_control',
    proofNoResultMode: true,
    minimumScore: 0.12,
    highConfidenceScore: 0.62
  });
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.rcNotReadyBlocked, true);
});

test('internal proof runner prevents factory from weakening CM-0825 negative-control guard', async () => {
  const cases = [
    {
      name: 'missing context',
      factory: () => null,
      reason: 'negative_control_precision_policy_context_missing'
    },
    {
      name: 'missing proof no-result mode',
      factory: () => ({
        enabled: true,
        queryFamily: 'stricter_negative_control'
      }),
      reason: 'negative_control_proof_no_result_mode_required'
    },
    {
      name: 'disabled context',
      factory: () => ({
        enabled: false,
        queryFamily: 'stricter_negative_control',
        proofNoResultMode: true
      }),
      reason: 'negative_control_precision_policy_enabled_required'
    },
    {
      name: 'explicit false proof no-result mode',
      factory: () => ({
        enabled: true,
        queryFamily: 'stricter_negative_control',
        proofNoResultMode: false
      }),
      reason: 'negative_control_proof_no_result_mode_required'
    }
  ];

  for (const guardCase of cases) {
    const calls = [];
    const runner = new TrueLiveRecallReadonlyProofRunner({
      async searchExecutor(request) {
        calls.push(request);
        return {
          results: [],
          sideEffectCounters: createZeroSideEffectCounters()
        };
      }
    });

    await assert.rejects(
      () => runner.run({
        approvalLine: CM0825_PATCHED_EXACT_APPROVAL_LINE,
        queries: createCm0825Queries(),
        proofRunId: `CM-1064-negative-control-factory-${guardCase.name}`,
        precisionPolicyContextFactory: guardCase.factory
      }),
      error => assertBoundaryError(error, guardCase.reason),
      guardCase.name
    );
    assert.equal(calls.length, 3);
  }
});

test('internal proof runner lets factory supplement but not override CM-0825 negative-control defaults', async () => {
  const calls = [];
  const runner = new TrueLiveRecallReadonlyProofRunner({
    async searchExecutor(request) {
      calls.push(request);
      return {
        results: [],
        sideEffectCounters: createZeroSideEffectCounters()
      };
    }
  });

  await runner.run({
    approvalLine: CM0825_PATCHED_EXACT_APPROVAL_LINE,
    queries: createCm0825Queries(),
    proofRunId: 'CM-1064-negative-control-factory-supplement',
    precisionPolicyContextFactory: ({ family }) => ({
      enabled: true,
      queryFamily: `custom:${family}`,
      proofNoResultMode: true,
      minimumScore: 0,
      highConfidenceScore: 0,
      customPolicyNote: 'supplement-only'
    })
  });

  assert.equal(calls.length, EXACT_QUERY_COUNT);
  assert.deepEqual(calls[3].precisionPolicyContext, {
    enabled: true,
    queryFamily: 'stricter_negative_control',
    proofNoResultMode: true,
    minimumScore: 0.12,
    highConfidenceScore: 0.62,
    customPolicyNote: 'supplement-only'
  });
});

test('internal proof runner rejects CM-0825 approval when any patched query drifts', async () => {
  const runner = new TrueLiveRecallReadonlyProofRunner({
    async searchExecutor() {
      throw new Error('executor must not run when CM-0825 query set drifts');
    }
  });

  const driftedQueries = createCm0825Queries();
  driftedQueries[3] = {
    ...driftedQueries[3],
    text: 'xqzv-9137-lomdra-kepv-azmuth changed'
  };

  await assert.rejects(
    () => runner.run({
      approvalLine: CM0825_PATCHED_EXACT_APPROVAL_LINE,
      queries: driftedQueries,
      proofRunId: 'CM-1006-cm0825-drift'
    }),
    error => assertBoundaryError(error, 'approval_profile_query_mismatch')
  );
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

test('internal proof runner forwards precision policy context factory output per query', async () => {
  const calls = [];
  const runner = new TrueLiveRecallReadonlyProofRunner({
    async searchExecutor(request) {
      calls.push(request);
      return {
        results: [],
        sideEffectCounters: createZeroSideEffectCounters()
      };
    }
  });

  const report = await runner.run({
    approvalLine: EXACT_APPROVAL_LINE,
    queries: createQueries(),
    proofRunId: 'CM-0812-precision-policy-pass-through',
    precisionPolicyContextFactory: ({ slot, family, text, proofContext }) => ({
      enabled: true,
      queryFamily: `${slot}:${family}`,
      proofNoResultMode: true,
      minimumScore: 0.12,
      highConfidenceScore: 0.62,
      queryTextEchoLength: text.length,
      proofRunIdEcho: proofContext.proofRunId
    })
  });

  assert.equal(report.queryCount, EXACT_QUERY_COUNT);
  assert.equal(calls.length, EXACT_QUERY_COUNT);
  assert.equal(calls[0].querySlot, 'Q1');
  assert.equal(calls[0].queryFamily, 'current project status / mainline memory spine state');
  assert.deepEqual(calls[0].precisionPolicyContext, {
    enabled: true,
    queryFamily: 'Q1:current project status / mainline memory spine state',
    proofNoResultMode: true,
    minimumScore: 0.12,
    highConfidenceScore: 0.62,
    queryTextEchoLength: 'current project status mainline memory spine state'.length,
    proofRunIdEcho: 'CM-0812-precision-policy-pass-through'
  });
  assert.equal(calls[3].precisionPolicyContext.queryFamily, 'Q4:deliberately unlikely negative-control phrase selected by the operator');
  assert.equal(calls[3].precisionPolicyContext.proofRunIdEcho, 'CM-0812-precision-policy-pass-through');
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
