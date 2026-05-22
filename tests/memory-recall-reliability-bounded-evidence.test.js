'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  runSearchMemoryWithTimeout
} = require('../src/core/SearchMemoryTimeoutPolicy');
const { CandidateGenerator } = require('../src/recall/CandidateGenerator');
const { KnowledgeBaseRecallPipeline } = require('../src/recall/KnowledgeBaseRecallPipeline');

const expectedRecord = {
  memoryId: 'synthetic-bounded-recall-expected',
  target: 'process',
  title: 'Synthetic bounded alpha recall',
  content: 'bounded alpha recall fixture content',
  rawText: 'bounded alpha recall fixture content',
  evidence: 'fixture-only bounded recall evidence',
  tags: ['bounded-alpha'],
  status: 'active',
  createdAt: '2026-05-22T00:00:00.000Z',
  updatedAt: '2026-05-22T00:00:00.000Z'
};

const irrelevantRecord = {
  memoryId: 'synthetic-bounded-recall-irrelevant',
  target: 'process',
  title: 'Synthetic unrelated note',
  content: 'unrelated omega fixture content',
  rawText: 'unrelated omega fixture content',
  evidence: 'fixture-only irrelevant evidence',
  tags: ['unrelated-omega'],
  status: 'active',
  createdAt: '2026-05-22T00:00:00.000Z',
  updatedAt: '2026-05-22T00:00:00.000Z'
};

function createTagMemoStub() {
  return {
    analyzeQuery({ query }) {
      return {
        queryText: query,
        tokens: String(query).toLowerCase().split(/\s+/).filter(Boolean),
        timeRanges: [],
        coreTags: [],
        dynamicTagWeight: 1,
        dynamicCoreWeight: 1.25,
        metrics: {}
      };
    },
    scoreRecord() {
      return {
        boost: 0,
        normalizedScore: 0,
        matchedTags: [],
        matchedCoreTags: [],
        exactCoreTagCount: 0,
        titleHitCount: 0,
        tagHitCount: 0,
        contentHitCount: 0,
        evidenceHitCount: 0,
        dynamicCoreWeight: 1.25,
        surfaceScore: 0
      };
    }
  };
}

function createBoundedRecallFixturePipeline() {
  const sideEffects = {
    realMemoryReads: 0,
    jsonlReads: 0,
    providerCalls: 0,
    durableMemoryWrites: 0,
    durableAuditWrites: 0,
    syncCalls: 0,
    candidateCacheWrites: 0,
    recallAuditWrites: 0
  };
  const records = new Map([
    [expectedRecord.memoryId, expectedRecord],
    [irrelevantRecord.memoryId, irrelevantRecord]
  ]);
  const chunks = [
    {
      chunkId: 'synthetic-bounded-recall-expected-chunk',
      memoryId: expectedRecord.memoryId,
      target: 'process',
      title: expectedRecord.title,
      text: expectedRecord.content,
      tags: expectedRecord.tags,
      vector: [1, 0],
      createdAt: expectedRecord.createdAt,
      updatedAt: expectedRecord.updatedAt
    },
    {
      chunkId: 'synthetic-bounded-recall-irrelevant-chunk',
      memoryId: irrelevantRecord.memoryId,
      target: 'process',
      title: irrelevantRecord.title,
      text: irrelevantRecord.content,
      tags: irrelevantRecord.tags,
      vector: [0, 1],
      createdAt: irrelevantRecord.createdAt,
      updatedAt: irrelevantRecord.updatedAt
    }
  ];
  const tagMemoEngine = createTagMemoStub();
  const candidateGenerator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 3,
      maxSearchLimit: 5,
      candidatePoolMultiplier: 1,
      rerankMultiplier: 1,
      embeddingFingerprint: 'synthetic-bounded-recall-fixture'
    },
    shadowStore: {
      async listChunks() {
        return chunks;
      },
      async listChunksByTimeRanges() {
        return [];
      }
    },
    vectorStore: {
      async getSingleEmbeddingCached() {
        return [1, 0];
      },
      getDiaryVector() {
        return null;
      }
    },
    tagMemoEngine,
    candidateCacheStore: {
      async get() {
        return null;
      },
      async set() {
        sideEffects.candidateCacheWrites += 1;
      }
    }
  });
  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: {
      parse(query) {
        return { query, directives: {}, passiveBlocks: [], activeBlocks: [] };
      }
    },
    timeExpressionParser: {
      parse() {
        return [];
      }
    },
    tagMemoEngine,
    candidateGenerator,
    rerankService: {
      config: {},
      async rerank() {
        throw new Error('bounded fixture should not call rerank provider');
      }
    },
    recallAuditService: {
      async record() {
        sideEffects.recallAuditWrites += 1;
        sideEffects.durableAuditWrites += 1;
      }
    },
    recallEnhancer: {
      enhance(results, { limit }) {
        return results.slice(0, limit);
      }
    },
    shadowStore: {
      async getRecordsByIds(ids) {
        return ids.map(id => records.get(id)).filter(Boolean);
      }
    },
    knowledgeBaseSyncService: {
      async syncTarget() {
        sideEffects.syncCalls += 1;
        sideEffects.durableMemoryWrites += 1;
        return { syncToken: 'unexpected-sync', changed: true };
      }
    }
  });

  return { pipeline, sideEffects };
}

test('bounded fixture recall returns expected synthetic result and suppresses irrelevant result without durable side effects', async () => {
  const { pipeline, sideEffects } = createBoundedRecallFixturePipeline();

  const results = await pipeline.search({
    query: 'bounded alpha recall',
    target: 'process',
    limit: 3,
    includeContent: false,
    source: 'http-no-token-sandbox',
    readOnly: true,
    auditContext: { noToken: true }
  });

  assert.deepEqual(results.map(result => result.memoryId), [expectedRecord.memoryId]);
  assert.equal(results.some(result => result.memoryId === irrelevantRecord.memoryId), false);
  assert.equal(results[0].content, undefined);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.candidateCacheWrites, 0);
  assert.equal(sideEffects.recallAuditWrites, 0);
  assert.equal(sideEffects.realMemoryReads, 0);
  assert.equal(sideEffects.jsonlReads, 0);
  assert.equal(sideEffects.providerCalls, 0);
  assert.equal(sideEffects.durableMemoryWrites, 0);
  assert.equal(sideEffects.durableAuditWrites, 0);
});

test('bounded fixture recall timeout returns bounded error and skips durable side effects', async () => {
  const sideEffects = {
    realMemoryReads: 0,
    jsonlReads: 0,
    providerCalls: 0,
    durableMemoryWrites: 0,
    durableAuditWrites: 0,
    recallAuditWrites: 0
  };
  const tagMemoEngine = createTagMemoStub();
  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: {
      parse(query) {
        return { query, directives: {}, passiveBlocks: [], activeBlocks: [] };
      }
    },
    timeExpressionParser: {
      parse() {
        return [];
      }
    },
    tagMemoEngine,
    candidateGenerator: {
      async generate({ signal }) {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('bounded timeout'), {
              code: 'SEARCH_MEMORY_TIMEOUT'
            }));
          }, { once: true });
        });
      }
    },
    rerankService: {
      config: {},
      async rerank() {
        throw new Error('timeout fixture should not rerank');
      }
    },
    recallAuditService: {
      async record() {
        sideEffects.recallAuditWrites += 1;
        sideEffects.durableAuditWrites += 1;
      }
    },
    recallEnhancer: {
      enhance(results) {
        return results;
      }
    },
    shadowStore: {
      async getRecordsByIds() {
        sideEffects.realMemoryReads += 1;
        return [];
      }
    },
    knowledgeBaseSyncService: {
      async syncTarget() {
        sideEffects.durableMemoryWrites += 1;
        return { syncToken: 'unexpected-sync', changed: true };
      }
    }
  });

  await assert.rejects(
    () => runSearchMemoryWithTimeout(({ signal }) => pipeline.search({
      query: 'bounded alpha recall timeout',
      target: 'process',
      limit: 1,
      includeContent: false,
      source: 'http-no-token-sandbox',
      readOnly: true,
      signal
    }), { timeoutMs: 5 }),
    error => {
      assert.equal(error.code, 'SEARCH_MEMORY_TIMEOUT');
      assert.equal(error.jsonRpcCode, -32002);
      assert.equal(error.jsonRpcData.code, 'SEARCH_MEMORY_TIMEOUT');
      assert.equal(error.jsonRpcData.timeoutMs, 5);
      return true;
    }
  );

  assert.equal(sideEffects.realMemoryReads, 0);
  assert.equal(sideEffects.jsonlReads, 0);
  assert.equal(sideEffects.providerCalls, 0);
  assert.equal(sideEffects.durableMemoryWrites, 0);
  assert.equal(sideEffects.durableAuditWrites, 0);
  assert.equal(sideEffects.recallAuditWrites, 0);
});
