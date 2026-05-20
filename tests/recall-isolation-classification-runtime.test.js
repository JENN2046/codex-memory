const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  classifyRecallIsolationSubject,
  isRecallIsolated
} = require('../src/core/RecallIsolationClassifier');
const { CandidateGenerator } = require('../src/recall/CandidateGenerator');
const { ChunkIndexingService } = require('../src/recall/ChunkIndexingService');
const { KnowledgeBaseRecallPipeline } = require('../src/recall/KnowledgeBaseRecallPipeline');
const { KnowledgeBaseSyncService } = require('../src/recall/KnowledgeBaseSyncService');
const { RecallAuditService } = require('../src/recall/RecallAuditService');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');

function baseRecord(overrides = {}) {
  return {
    memoryId: 'mem-active',
    target: 'process',
    title: 'Useful implementation note',
    content: 'Alpha feature detail',
    evidence: 'Local evidence',
    tags: ['feature'],
    status: 'active',
    scope: 'project:codex-memory',
    visibility: 'project',
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
    ...overrides
  };
}

test('recall isolation classifier detects governance families without treating diary metadata as validation evidence', () => {
  const normal = classifyRecallIsolationSubject(baseRecord({
    tags: ['validation', 'gate', 'import'],
    rawText: 'Validated: yes\nReusable: yes\n\nUseful body'
  }));
  assert.equal(normal.isolated, false);

  const governance = classifyRecallIsolationSubject(baseRecord({
    tags: ['governance-record'],
    content: 'Approved runtime gate evidence'
  }));
  assert.equal(governance.isolated, true);
  assert.ok(governance.families.includes('governance_records'));

  const headerClassified = classifyRecallIsolationSubject(baseRecord({
    content: 'isolation-family: validation_transcripts\nSynthetic validation output'
  }));
  assert.equal(headerClassified.isolated, true);
  assert.ok(headerClassified.families.includes('validation_transcripts'));

  const tombstone = classifyRecallIsolationSubject(baseRecord({
    status: 'tombstoned',
    tombstoneReason: 'superseded'
  }));
  assert.equal(tombstone.isolated, true);
  assert.ok(tombstone.families.includes('tombstoned_memory'));
});

test('chunk indexing clears projection chunks for isolated records', async () => {
  const calls = [];
  const service = new ChunkIndexingService({
    config: { chunkMaxChars: 200, chunkOverlapChars: 0 },
    shadowStore: {
      async replaceChunksForRecord(record, chunks) {
        calls.push({ memoryId: record.memoryId, chunks });
      }
    },
    vectorStore: {
      async getBatchEmbeddingsCached() {
        throw new Error('isolated record should not request embeddings');
      },
      embedText() {
        throw new Error('isolated record should not embed text');
      }
    }
  });

  const result = await service.indexRecord(baseRecord({
    memoryId: 'mem-policy',
    tags: ['policy-decision']
  }));

  assert.deepEqual(result, { chunkCount: 0, isolated: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { memoryId: 'mem-policy', chunks: [] });
});

test('candidate generator filters isolated chunks from fresh and cached candidates', async () => {
  const chunks = [
    {
      chunkId: 'isolated-1',
      memoryId: 'mem-governance',
      target: 'process',
      title: 'Governance alpha',
      text: 'alpha approval gate',
      tags: ['governance-record'],
      vector: [1, 0],
      createdAt: '2026-05-19T00:00:00.000Z',
      updatedAt: '2026-05-19T00:00:00.000Z'
    },
    {
      chunkId: 'normal-1',
      memoryId: 'mem-normal',
      target: 'process',
      title: 'Alpha feature',
      text: 'alpha implementation detail',
      tags: ['feature'],
      vector: [1, 0],
      createdAt: '2026-05-19T00:00:00.000Z',
      updatedAt: '2026-05-19T00:00:00.000Z'
    }
  ];
  const cachedPayload = {
    searchPlan: { finalLimit: 5, semanticPoolSize: 5, timePoolSize: 0, useTime: false, useRerank: false },
    semanticCandidates: chunks,
    timeCandidates: [],
    allCandidates: chunks
  };
  let cacheHit = false;
  const generator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 5,
      maxSearchLimit: 10,
      candidatePoolMultiplier: 1,
      rerankMultiplier: 1,
      embeddingFingerprint: 'test'
    },
    shadowStore: {
      async listChunks() {
        return chunks;
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
    tagMemoEngine: {
      scoreRecord() {
        return {
          boost: 0,
          normalizedScore: 0,
          matchedTags: [],
          matchedCoreTags: []
        };
      }
    },
    candidateCacheStore: {
      async get() {
        return cacheHit ? cachedPayload : null;
      },
      async set() {}
    }
  });

  const fresh = await generator.generate({
    queryText: 'alpha',
    queryAnalysis: { queryText: 'alpha', tokens: ['alpha'], timeRanges: [] },
    directives: {},
    limit: 5
  });
  assert.deepEqual(fresh.semanticCandidates.map(item => item.memoryId), ['mem-normal']);

  cacheHit = true;
  const cached = await generator.generate({
    queryText: 'alpha',
    queryAnalysis: { queryText: 'alpha', tokens: ['alpha'], timeRanges: [] },
    directives: {},
    limit: 5
  });
  assert.equal(cached.fromCache, true);
  assert.deepEqual(cached.semanticCandidates.map(item => item.memoryId), ['mem-normal']);
});

test('candidate generator abort should skip candidate cache write side effect', async () => {
  const controller = new AbortController();
  let cacheSetCount = 0;
  const generator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 5,
      maxSearchLimit: 10,
      candidatePoolMultiplier: 1,
      rerankMultiplier: 1,
      embeddingFingerprint: 'test'
    },
    shadowStore: {
      async listChunks() {
        return [{
          chunkId: 'normal-1',
          memoryId: 'mem-normal',
          target: 'process',
          title: 'Alpha feature',
          text: 'alpha implementation detail',
          tags: ['feature'],
          vector: [1, 0],
          createdAt: '2026-05-19T00:00:00.000Z',
          updatedAt: '2026-05-19T00:00:00.000Z'
        }];
      }
    },
    vectorStore: {
      async getSingleEmbeddingCached() {
        controller.abort();
        return [1, 0];
      },
      getDiaryVector() {
        return null;
      }
    },
    tagMemoEngine: {
      scoreRecord() {
        return {
          boost: 0,
          normalizedScore: 0,
          matchedTags: [],
          matchedCoreTags: []
        };
      }
    },
    candidateCacheStore: {
      async get() {
        return null;
      },
      async set() {
        cacheSetCount += 1;
      }
    }
  });

  await assert.rejects(
    () => generator.generate({
      queryText: 'alpha',
      queryAnalysis: { queryText: 'alpha', tokens: ['alpha'], timeRanges: [] },
      directives: {},
      limit: 5,
      signal: controller.signal
    }),
    error => error?.code === 'SEARCH_MEMORY_TIMEOUT'
  );
  assert.equal(cacheSetCount, 0);
});

test('knowledge base sync abort after diary read should skip sync side effects', async () => {
  const controller = new AbortController();
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: true,
      searchMemoryTimeoutMs: 5
    },
    diaryStore: {
      async listRecords() {
        controller.abort();
        return [baseRecord({ memoryId: 'mem-normal' })];
      }
    },
    shadowStore: {
      async listRecords() {
        calls.push('shadow-list');
        return [];
      },
      async upsertRecord() {
        calls.push('sqlite-upsert');
      },
      async clearReconcileTasks() {
        calls.push('reconcile-clear');
      },
      async replaceChunksForRecord() {
        calls.push('chunk-replace');
      },
      async deleteRecord() {
        calls.push('sqlite-delete');
      },
      async countChunksForRecord() {
        calls.push('chunk-count');
        return 0;
      }
    },
    vectorStore: {
      async upsertRecord() {
        calls.push('vector-upsert');
      },
      async deleteRecord() {
        calls.push('vector-delete');
        return true;
      },
      async rebuildDiaryVectors() {
        calls.push('diary-vector-rebuild');
        return 0;
      }
    },
    chunkIndexingService: {
      async indexRecord() {
        calls.push('chunk-index');
      }
    },
    candidateCacheStore: {
      async clearCurrentFingerprint() {
        calls.push('cache-clear');
      }
    }
  });

  await assert.rejects(
    () => service.syncTarget('process', { signal: controller.signal }),
    error => error?.code === 'SEARCH_MEMORY_TIMEOUT'
  );
  assert.deepEqual(calls, []);
});

test('recall pipeline passes abort signal into sync and stops before candidates', async () => {
  const controller = new AbortController();
  let receivedSignal = false;
  let candidateGenerateCount = 0;
  let auditRecordCount = 0;
  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: {
      parse() {
        return { query: 'alpha', directives: {}, passiveBlocks: [], activeBlocks: [] };
      }
    },
    timeExpressionParser: {
      parse() {
        return [];
      }
    },
    tagMemoEngine: {
      analyzeQuery() {
        return { queryText: 'alpha', tokens: ['alpha'], timeRanges: [] };
      }
    },
    contextVectorManager: null,
    knowledgeBaseSyncService: {
      async syncTarget(_target, options = {}) {
        receivedSignal = options.signal === controller.signal;
        controller.abort();
        return { syncToken: '', changed: false };
      }
    },
    candidateGenerator: {
      async generate() {
        candidateGenerateCount += 1;
        return {
          searchPlan: { finalLimit: 5, semanticPoolSize: 5, useTime: false, useRerank: false },
          semanticCandidates: [],
          timeCandidates: [],
          allCandidates: []
        };
      }
    },
    rerankService: {
      config: {}
    },
    recallAuditService: {
      async record() {
        auditRecordCount += 1;
      }
    },
    recallEnhancer: {
      enhance(results) {
        return results;
      }
    },
    shadowStore: {
      async getRecordsByIds() {
        return [];
      }
    }
  });

  await assert.rejects(
    () => pipeline.search({
      query: 'alpha',
      target: 'process',
      limit: 5,
      signal: controller.signal
    }),
    error => error?.code === 'SEARCH_MEMORY_TIMEOUT'
  );
  assert.equal(receivedSignal, true);
  assert.equal(candidateGenerateCount, 0);
  assert.equal(auditRecordCount, 0);
});

test('vector index skips isolated records and excludes them from diary vectors', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-isolation-'));
  const vectorIndexPath = path.join(tempDir, 'memory-vectors.json');
  const store = new VectorIndexStore({
    enableVectorIndex: true,
    enableEmbeddingCache: false,
    vectorIndexPath,
    embeddingFingerprint: 'test-fingerprint',
    embedDimensions: 8,
    embeddingCacheMaxEntries: 100
  });

  await store.upsertRecord(baseRecord({ memoryId: 'mem-normal', tags: ['feature'] }));
  assert.equal(Object.keys(store.index.vectors).length, 1);

  await store.upsertRecord(baseRecord({ memoryId: 'mem-normal', tags: ['validation-transcript'] }));
  assert.equal(Object.keys(store.index.vectors).length, 0);

  const diaryVectorCount = await store.rebuildDiaryVectors([
    baseRecord({ memoryId: 'mem-normal-2', tags: ['feature'] }),
    baseRecord({ memoryId: 'mem-readiness', tags: ['readiness-report'] })
  ]);
  assert.equal(diaryVectorCount, 1);
  assert.equal(store.index.diaryVectors.process.recordCount, 1);

  await fs.rm(tempDir, { recursive: true, force: true });
});

test('recall aggregation and audit projection drop isolated results', async () => {
  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: null,
    timeExpressionParser: null,
    tagMemoEngine: null,
    candidateGenerator: null,
    rerankService: null,
    recallAuditService: null,
    recallEnhancer: null,
    knowledgeBaseSyncService: null,
    shadowStore: {
      async getRecordsByIds(ids) {
        return ids.map(id => id === 'mem-governance'
          ? baseRecord({ memoryId: id, tags: ['governance-record'], title: 'Governance record' })
          : baseRecord({ memoryId: id, tags: ['feature'], title: 'Feature record' }));
      }
    }
  });

  const aggregated = await pipeline.aggregateCandidates({
    candidates: [
      {
        chunkId: 'a',
        memoryId: 'mem-governance',
        target: 'process',
        title: 'Governance record',
        text: 'approval alpha',
        tags: ['governance-record'],
        score: 0.9,
        source: 'rag'
      },
      {
        chunkId: 'b',
        memoryId: 'mem-normal',
        target: 'process',
        title: 'Feature record',
        text: 'alpha implementation',
        tags: ['feature'],
        score: 0.8,
        source: 'rag'
      }
    ]
  });
  assert.deepEqual(aggregated.map(item => item.memoryId), ['mem-normal']);

  const appended = [];
  const audit = new RecallAuditService({
    config: { embeddingFingerprint: 'test-fingerprint' },
    auditLogStore: {
      async appendRecallAudit(entry) {
        appended.push(entry);
      }
    }
  });
  const entry = await audit.record({
    target: 'process',
    results: [
      { memoryId: 'mem-governance', title: 'Governance', tags: ['governance-record'], score: 0.9 },
      { memoryId: 'mem-normal', title: 'Feature', tags: ['feature'], score: 0.8 }
    ]
  });

  assert.equal(appended.length, 1);
  assert.deepEqual(entry.memoryIds, ['mem-normal']);
  assert.equal(isRecallIsolated(entry), false);
});

test('recall pipeline abort should skip recall audit side effect', async () => {
  const controller = new AbortController();
  let auditRecordCount = 0;
  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: {
      parse() {
        return { query: 'alpha', directives: {}, passiveBlocks: [], activeBlocks: [] };
      }
    },
    timeExpressionParser: {
      parse() {
        return [];
      }
    },
    tagMemoEngine: {
      analyzeQuery() {
        return { queryText: 'alpha', tokens: ['alpha'], timeRanges: [] };
      }
    },
    contextVectorManager: null,
    knowledgeBaseSyncService: {
      async syncTarget() {
        return { syncToken: '', changed: false };
      }
    },
    candidateGenerator: {
      async generate() {
        return {
          searchPlan: { finalLimit: 5, semanticPoolSize: 5, useTime: false, useRerank: false },
          semanticCandidates: [{
            chunkId: 'normal-1',
            memoryId: 'mem-normal',
            target: 'process',
            title: 'Alpha feature',
            text: 'alpha implementation detail',
            tags: ['feature'],
            score: 0.9,
            source: 'rag'
          }],
          timeCandidates: [],
          allCandidates: []
        };
      }
    },
    rerankService: {
      config: {}
    },
    recallAuditService: {
      async record() {
        auditRecordCount += 1;
      }
    },
    recallEnhancer: {
      enhance(results) {
        controller.abort();
        return results;
      }
    },
    shadowStore: {
      async getRecordsByIds(ids) {
        return ids.map(id => baseRecord({
          memoryId: id,
          title: 'Alpha feature',
          tags: ['feature']
        }));
      }
    }
  });

  await assert.rejects(
    () => pipeline.search({
      query: 'alpha',
      target: 'process',
      limit: 5,
      signal: controller.signal
    }),
    error => error?.code === 'SEARCH_MEMORY_TIMEOUT'
  );
  assert.equal(auditRecordCount, 0);
});
