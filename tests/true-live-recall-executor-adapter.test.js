'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXACT_APPROVAL_LINE,
  EXACT_QUERY_COUNT,
  PROOF_MODE,
  REQUIRED_SIDE_EFFECT_COUNTER_KEYS,
  TrueLiveRecallReadonlyProofRunner
} = require('../src/core/TrueLiveRecallReadonlyProofRunner');
const {
  EXPECTED_SOURCE,
  createTrueLiveRecallExecutorAdapter
} = require('../src/core/TrueLiveRecallExecutorAdapter');

function createQueries() {
  return [
    { slot: 'Q1', family: 'current project status / mainline memory spine state', text: 'current project status mainline memory spine state' },
    { slot: 'Q2', family: 'memory recall evidence ladder / bounded evidence progression', text: 'memory recall evidence ladder bounded evidence progression' },
    { slot: 'Q3', family: 'blocker / not-ready / no-overclaim status', text: 'blocker not-ready no-overclaim status' },
    { slot: 'Q4', family: 'deliberately unlikely negative-control phrase selected by the operator', text: 'unlikely negative control phrase cm0782 synthetic' }
  ];
}

function createRequest(overrides = {}) {
  return {
    query: 'bounded synthetic query',
    target: 'both',
    limit: 5,
    includeContent: false,
    source: EXPECTED_SOURCE,
    readOnly: true,
    noProvider: true,
    noAudit: true,
    sanitizedOutput: true,
    proofContext: Object.freeze({
      mode: PROOF_MODE,
      exactQueryCount: EXACT_QUERY_COUNT,
      readOnly: true,
      noProvider: true,
      noAudit: true,
      sanitizedOutput: true,
      includeContent: false
    }),
    ...overrides
  };
}

function assertBoundaryError(error, reason) {
  assert.equal(error.name, 'TrueLiveRecallProofBoundaryError');
  assert.equal(error.code, 'TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION');
  assert.equal(error.details.reason, reason);
  return true;
}

function createSurfaceApp(onCallTool) {
  const app = {
    calls: [],
    recall: {
      externalEmbeddingAdapter: {
        async embedBatch() {
          throw new Error('original embedBatch should be wrapped');
        }
      },
      externalRerankAdapter: {
        async rerank() {
          throw new Error('original rerank should be wrapped');
        }
      },
      recallAuditService: {
        async record() {
          throw new Error('original recall audit should be wrapped');
        },
        async recordReadPolicySummary() {
          throw new Error('original read policy audit should be wrapped');
        }
      },
      knowledgeBaseSyncService: {
        async syncTarget() {
          throw new Error('original sync should be wrapped');
        }
      }
    },
    services: {
      writeService: {
        async record() {
          throw new Error('original write should be wrapped');
        }
      }
    },
    stores: {
      auditLogStore: {
        async appendWriteAudit() {
          throw new Error('original write audit should be wrapped');
        },
        async appendRecallAudit() {
          throw new Error('original recall audit should be wrapped');
        }
      },
      candidateCacheStore: {
        async set() {
          throw new Error('original cache set should be wrapped');
        },
        async flush() {
          throw new Error('original cache flush should be wrapped');
        },
        async clearAll() {
          throw new Error('original cache clear should be wrapped');
        },
        async clearCurrentFingerprint() {
          throw new Error('original cache fingerprint clear should be wrapped');
        }
      },
      vectorStore: {
        async flush() {
          throw new Error('original vector flush should be wrapped');
        },
        async getSingleEmbeddingCached() {
          return [0.1, 0.2];
        }
      }
    },
    async callTool(toolName, args, requestContext) {
      this.calls.push({ toolName, args, requestContext });
      if (onCallTool) {
        return onCallTool(this, toolName, args, requestContext);
      }
      return { results: [] };
    }
  };

  return app;
}

test('executor adapter rejects invalid proof request before app call', async () => {
  const app = createSurfaceApp();
  const adapter = createTrueLiveRecallExecutorAdapter({ app });

  await assert.rejects(
    () => adapter(createRequest({ proofContext: null })),
    error => assertBoundaryError(error, 'executor_adapter_proof_context_missing')
  );
  assert.equal(app.calls.length, 0);

  await assert.rejects(
    () => adapter(createRequest({ includeContent: true })),
    error => assertBoundaryError(error, 'executor_adapter_request_flag_mismatch')
  );
  assert.equal(app.calls.length, 0);

  await assert.rejects(
    () => adapter(createRequest({
      proofContext: Object.freeze({
        ...createRequest().proofContext,
        exactQueryCount: 3
      })
    })),
    error => assertBoundaryError(error, 'executor_adapter_proof_context_mismatch')
  );
  assert.equal(app.calls.length, 0);
});

test('executor adapter binds search_memory to no-token read-only context and returns complete counters', async () => {
  const app = createSurfaceApp(() => ({
    results: [{
      memoryId: 'synthetic-memory-1',
      score: 0.987654321,
      baseScore: 0.75,
      rerankScore: 0.81,
      target: 'process',
      createdAt: '2026-05-22T01:02:03.000Z',
      updatedAt: '2026-05-23T01:02:03.000Z',
      sourceKinds: ['time', 'rag'],
      matchedTags: ['one', 'two'],
      coreTags: ['core'],
      content: 'RAW CONTENT MUST NOT CROSS ADAPTER',
      text: 'RAW TEXT MUST NOT CROSS ADAPTER',
      title: 'RAW TITLE MUST NOT CROSS ADAPTER',
      snippet: 'RAW SNIPPET MUST NOT CROSS ADAPTER',
      sourceFile: 'private/path.json',
      jsonlLine: '{"raw":true}'
    }]
  }));
  const adapter = createTrueLiveRecallExecutorAdapter({ app });
  const response = await adapter(createRequest());

  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].toolName, 'search_memory');
  assert.equal(app.calls[0].args.include_content, false);
  assert.equal(app.calls[0].requestContext.noTokenReadOnly, true);
  assert.equal(app.calls[0].requestContext.executionContext.requestSource, EXPECTED_SOURCE);
  assert.deepEqual(Object.keys(response.sideEffectCounters).sort(), [...REQUIRED_SIDE_EFFECT_COUNTER_KEYS].sort());
  assert.equal(Object.values(response.sideEffectCounters).every(value => value === 0), true);

  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes('RAW CONTENT MUST NOT CROSS ADAPTER'), false);
  assert.equal(serialized.includes('RAW TEXT MUST NOT CROSS ADAPTER'), false);
  assert.equal(serialized.includes('RAW TITLE MUST NOT CROSS ADAPTER'), false);
  assert.equal(serialized.includes('RAW SNIPPET MUST NOT CROSS ADAPTER'), false);
  assert.equal(serialized.includes('private/path.json'), false);
  assert.equal(serialized.includes('jsonlLine'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response.results[0], 'content'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response.results[0], 'text'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response.results[0], 'title'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response.results[0], 'snippet'), false);
});

test('executor adapter forwards internal precision policy context only through executionContext', async () => {
  const app = createSurfaceApp(() => ({ results: [] }));
  const adapter = createTrueLiveRecallExecutorAdapter({ app });

  await adapter(createRequest({
    precisionPolicyContext: {
      enabled: true,
      queryFamily: 'stricter_negative_control',
      proofNoResultMode: true,
      minimumScore: 0.12,
      highConfidenceScore: 0.62
    }
  }));

  assert.equal(app.calls.length, 1);
  assert.deepEqual(app.calls[0].requestContext.executionContext.precisionPolicyContext, {
    enabled: true,
    queryFamily: 'stricter_negative_control',
    proofNoResultMode: true,
    minimumScore: 0.12,
    highConfidenceScore: 0.62
  });
});

test('executor adapter blocks forbidden side-effect surfaces before execution', async () => {
  const cases = [
    {
      name: 'embedding provider',
      reason: 'executor_adapter_provider_call_blocked',
      counterKey: 'providerCalls',
      call: app => app.recall.externalEmbeddingAdapter.embedBatch(['query'])
    },
    {
      name: 'rerank provider',
      reason: 'executor_adapter_provider_call_blocked',
      counterKey: 'providerCalls',
      call: app => app.recall.externalRerankAdapter.rerank('query', [])
    },
    {
      name: 'durable write',
      reason: 'executor_adapter_durable_memory_write_blocked',
      counterKey: 'durableMemoryWrites',
      call: app => app.services.writeService.record({})
    },
    {
      name: 'recall audit',
      reason: 'executor_adapter_audit_write_blocked',
      counterKey: 'durableAuditWrites',
      call: app => app.recall.recallAuditService.record({})
    },
    {
      name: 'read policy audit',
      reason: 'executor_adapter_audit_write_blocked',
      counterKey: 'durableAuditWrites',
      call: app => app.recall.recallAuditService.recordReadPolicySummary({})
    },
    {
      name: 'sync',
      reason: 'executor_adapter_sync_call_blocked',
      counterKey: 'syncCalls',
      call: app => app.recall.knowledgeBaseSyncService.syncTarget('both')
    },
    {
      name: 'candidate cache write',
      reason: 'executor_adapter_candidate_cache_write_blocked',
      counterKey: 'candidateCacheWrites',
      call: app => app.stores.candidateCacheStore.set('key', {})
    },
    {
      name: 'candidate cache flush',
      reason: 'executor_adapter_candidate_cache_flush_blocked',
      counterKey: 'candidateCacheFlushes',
      call: app => app.stores.candidateCacheStore.clearCurrentFingerprint()
    },
    {
      name: 'vector flush',
      reason: 'executor_adapter_vector_flush_blocked',
      counterKey: 'vectorFlushes',
      call: app => app.stores.vectorStore.flush()
    },
    {
      name: 'embedding cache write',
      reason: 'executor_adapter_embedding_cache_write_blocked',
      counterKey: 'embeddingCacheWrites',
      call: app => app.stores.vectorStore.getSingleEmbeddingCached('query', { readOnly: false })
    }
  ];

  for (const sideEffectCase of cases) {
    const app = createSurfaceApp(async currentApp => sideEffectCase.call(currentApp));
    const adapter = createTrueLiveRecallExecutorAdapter({ app });

    await assert.rejects(
      () => adapter(createRequest()),
      error => {
        assertBoundaryError(error, sideEffectCase.reason);
        assert.equal(error.details.counterKey, sideEffectCase.counterKey);
        assert.equal(error.details.sideEffectCounters[sideEffectCase.counterKey], 1);
        return true;
      },
      sideEffectCase.name
    );
  }
});

test('executor adapter restores wrapped methods after success and failure', async () => {
  const successApp = createSurfaceApp(() => ({ results: [] }));
  const originalSuccessFlush = successApp.stores.vectorStore.flush;
  const successAdapter = createTrueLiveRecallExecutorAdapter({ app: successApp });
  await successAdapter(createRequest());
  assert.equal(successApp.stores.vectorStore.flush, originalSuccessFlush);

  const failureApp = createSurfaceApp(app => app.stores.vectorStore.flush());
  const originalFailureFlush = failureApp.stores.vectorStore.flush;
  const failureAdapter = createTrueLiveRecallExecutorAdapter({ app: failureApp });
  await assert.rejects(
    () => failureAdapter(createRequest()),
    error => assertBoundaryError(error, 'executor_adapter_vector_flush_blocked')
  );
  assert.equal(failureApp.stores.vectorStore.flush, originalFailureFlush);
});

test('proof runner can use executor adapter with synthetic app without raw leakage', async () => {
  const app = createSurfaceApp(() => ({
    results: [{
      memoryId: 'synthetic-runner-memory',
      score: 0.9,
      title: 'RAW TITLE MUST NOT REACH RUNNER',
      snippet: 'RAW SNIPPET MUST NOT REACH RUNNER',
      text: 'RAW TEXT MUST NOT REACH RUNNER',
      content: 'RAW CONTENT MUST NOT REACH RUNNER',
      matchedTags: ['safe'],
      coreTags: ['core']
    }]
  }));
  const adapter = createTrueLiveRecallExecutorAdapter({ app });
  const runner = new TrueLiveRecallReadonlyProofRunner({
    searchExecutor: adapter,
    now: () => new Date('2026-05-22T00:00:00.000Z')
  });

  const report = await runner.run({
    approvalLine: EXACT_APPROVAL_LINE,
    queries: createQueries(),
    precisionPolicyContextFactory: ({ family }) => ({
      enabled: true,
      queryFamily: family,
      proofNoResultMode: true,
      minimumScore: 0.12,
      highConfidenceScore: 0.62
    }),
    proofRunId: 'CM-0782-synthetic-adapter'
  });

  assert.equal(app.calls.length, EXACT_QUERY_COUNT);
  assert.equal(report.queryCount, EXACT_QUERY_COUNT);
  assert.equal(report.proofContext.readOnly, true);
  assert.equal(report.proofContext.noProvider, true);
  assert.equal(report.proofContext.noAudit, true);
  assert.equal(report.proofContext.sanitizedOutput, true);
  assert.equal(report.sideEffectCounters.providerCalls, 0);
  assert.equal(report.sideEffectCounters.durableAuditWrites, 0);
  assert.equal(report.sideEffectCounters.durableMemoryWrites, 0);
  assert.equal(report.sideEffectCounters.syncCalls, 0);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.rcNotReadyBlocked, true);
  assert.equal(app.calls[0].requestContext.executionContext.precisionPolicyContext.proofNoResultMode, true);
  assert.equal(app.calls[0].requestContext.executionContext.precisionPolicyContext.queryFamily.includes('current project status'), true);
  assert.equal(JSON.stringify(report).includes('RAW TITLE MUST NOT REACH RUNNER'), false);
});
