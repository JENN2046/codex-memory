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
const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');
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

test('recall isolation classifier uses snake_case scope and lifecycle fallbacks when camelCase fields are blank', () => {
  const scoped = classifyRecallIsolationSubject(baseRecord({
    projectId: '  ',
    project_id: 'codex-memory',
    workspaceId: '',
    workspace_id: 'workspace-main',
    clientId: null,
    client_id: 'codex',
    visibility: ' ',
    visibility_policy: 'project'
  }), {
    expectedProjectId: 'codex-memory',
    expectedWorkspaceId: 'workspace-main',
    expectedClientId: 'codex',
    expectedVisibility: ['project']
  });
  assert.equal(scoped.isolated, false);
  assert.equal(scoped.families.includes('out_of_scope_memory'), false);

  const outOfScope = classifyRecallIsolationSubject(baseRecord({
    projectId: '',
    project_id: 'other-project'
  }), {
    expectedProjectId: 'codex-memory'
  });
  assert.equal(outOfScope.isolated, true);
  assert.ok(outOfScope.families.includes('out_of_scope_memory'));

  const tombstone = classifyRecallIsolationSubject(baseRecord({
    status: '',
    lifecycleStatus: '   ',
    lifecycle_status: 'tombstoned'
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

test('candidate generator cache key absorbs governance state revision when provided', () => {
  const generator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 5,
      maxSearchLimit: 10,
      candidatePoolMultiplier: 1,
      rerankMultiplier: 1,
      embeddingFingerprint: 'test'
    },
    shadowStore: {},
    vectorStore: {},
    tagMemoEngine: {}
  });

  const baseInput = {
    target: 'process',
    queryText: 'alpha cache governance',
    queryAnalysis: {
      queryText: 'alpha cache governance',
      tokens: ['alpha', 'cache', 'governance'],
      timeRanges: [],
      coreTags: []
    },
    directives: {},
    searchPlan: {
      finalLimit: 5,
      useRerank: false,
      useTime: false,
      semanticLimit: 5,
      timeLimit: 0,
      semanticPoolSize: 7,
      timePoolSize: 0
    },
    syncToken: 'sync-alpha',
    contextState: { signature: 'ctx-alpha' },
    candidateFilters: { projectId: 'codex-memory' }
  };

  const withoutRevision = generator.buildCacheKey(baseInput);
  const withRevisionA = generator.buildCacheKey({
    ...baseInput,
    governanceStateRevision: 'gov-rev-a'
  });
  const withRevisionB = generator.buildCacheKey({
    ...baseInput,
    governanceStateRevision: 'gov-rev-b'
  });

  assert.notEqual(withoutRevision, withRevisionA);
  assert.notEqual(withRevisionA, withRevisionB);
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

test('knowledge base sync token incorporates governance state revision when provided', async () => {
  const serviceA = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: false,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [baseRecord({ memoryId: 'mem-governance-a' })];
      }
    },
    shadowStore: {},
    vectorStore: {},
    chunkIndexingService: null,
    governanceStateRevisionProvider: async () => 'gov-rev-a'
  });
  const serviceB = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: false,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [baseRecord({ memoryId: 'mem-governance-a' })];
      }
    },
    shadowStore: {},
    vectorStore: {},
    chunkIndexingService: null,
    governanceStateRevisionProvider: async () => 'gov-rev-b'
  });

  const resultA = await serviceA.syncTarget('process');
  const resultB = await serviceB.syncTarget('process');

  assert.equal(resultA.governanceStateRevision, 'gov-rev-a');
  assert.equal(resultB.governanceStateRevision, 'gov-rev-b');
  assert.notEqual(resultA.syncToken, resultB.syncToken);
});

test('knowledge base sync derives governance state revision from existing lifecycle and scope metadata by default', async () => {
  const diaryRecords = [
    baseRecord({
      memoryId: 'mem-governance-default',
      projectId: 'codex-memory',
      visibility: 'shared'
    })
  ];
  const existingA = [
    {
      memoryId: 'mem-governance-default',
      target: 'process',
      status: 'proposal',
      projectId: 'codex-memory',
      workspaceId: '/workspace/a',
      clientId: 'codex',
      taskId: null,
      conversationId: null,
      visibility: 'shared',
      retentionPolicy: 'default'
    }
  ];
  const existingB = [
    {
      memoryId: 'mem-governance-default',
      target: 'process',
      status: 'active',
      projectId: 'codex-memory',
      workspaceId: '/workspace/a',
      clientId: 'codex',
      taskId: null,
      conversationId: null,
      visibility: 'shared',
      retentionPolicy: 'default'
    }
  ];

  const serviceA = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return diaryRecords;
      }
    },
    shadowStore: {
      async listRecords() {
        return existingA;
      },
      async upsertRecord() {},
      async clearReconcileTasks() {}
    },
    vectorStore: {},
    chunkIndexingService: null
  });
  const serviceB = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return diaryRecords;
      }
    },
    shadowStore: {
      async listRecords() {
        return existingB;
      },
      async upsertRecord() {},
      async clearReconcileTasks() {}
    },
    vectorStore: {},
    chunkIndexingService: null
  });

  const resultA = await serviceA.syncTarget('process');
  const resultB = await serviceB.syncTarget('process');

  assert.match(resultA.governanceStateRevision, /^[a-f0-9]{40}$/);
  assert.match(resultB.governanceStateRevision, /^[a-f0-9]{40}$/);
  assert.notEqual(resultA.governanceStateRevision, resultB.governanceStateRevision);
  assert.notEqual(resultA.syncToken, resultB.syncToken);
});

test('knowledge base sync preserves existing shadow scope when diary scope fields are blank', async () => {
  const upserted = [];
  const storedGovernanceEntries = [];
  const diaryRecords = [
    baseRecord({
      memoryId: 'mem-governance-blank-diary',
      updatedAt: '2026-05-19T02:00:00.000Z',
      projectId: '   ',
      workspaceId: '',
      clientId: ' ',
      taskId: '',
      conversationId: '   ',
      visibility: ' ',
      retentionPolicy: ''
    })
  ];
  const existingRecords = [
    {
      memoryId: 'mem-governance-blank-diary',
      target: 'process',
      title: 'Useful implementation note',
      content: 'Alpha feature detail',
      evidence: 'Local evidence',
      tags: ['feature'],
      updatedAt: '2026-05-19T01:00:00.000Z',
      relativePath: null,
      filePath: null,
      rawText: null,
      validated: false,
      reusable: false,
      status: 'active',
      projectId: 'codex-memory',
      workspaceId: 'workspace-shadow',
      clientId: 'codex',
      taskId: 'task-shadow',
      conversationId: 'conversation-shadow',
      visibility: 'private',
      retentionPolicy: 'keep'
    }
  ];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return diaryRecords;
      }
    },
    shadowStore: {
      async listRecords() {
        return existingRecords;
      },
      async upsertRecord(record) {
        upserted.push({ ...record });
      },
      async clearReconcileTasks() {}
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision() {
        return '';
      },
      async getStoredGovernanceStateEntries() {
        return null;
      },
      async clearCurrentFingerprintByMemoryIds() {},
      async clearAll() {},
      async setStoredGovernanceStateRevision() {},
      async setStoredGovernanceStateEntries(_target, entries) {
        storedGovernanceEntries.push(entries);
      }
    }
  });

  const result = await service.syncTarget('process');

  assert.equal(result.sqliteWrites, 1);
  assert.equal(upserted.length, 1);
  assert.equal(upserted[0].projectId, 'codex-memory');
  assert.equal(upserted[0].workspaceId, 'workspace-shadow');
  assert.equal(upserted[0].clientId, 'codex');
  assert.equal(upserted[0].taskId, 'task-shadow');
  assert.equal(upserted[0].conversationId, 'conversation-shadow');
  assert.equal(upserted[0].visibility, 'private');
  assert.equal(upserted[0].retentionPolicy, 'keep');
  assert.deepEqual(storedGovernanceEntries.at(-1), [{
    memoryId: 'mem-governance-blank-diary',
    target: 'process',
    status: 'active',
    projectId: 'codex-memory',
    workspaceId: 'workspace-shadow',
    clientId: 'codex',
    taskId: 'task-shadow',
    conversationId: 'conversation-shadow',
    visibility: 'private',
    retentionPolicy: 'keep'
  }]);
});

test('knowledge base sync normalizes snake-case memory id before shadow write and cache invalidation', async () => {
  const upserted = [];
  const reconcileClears = [];
  const cacheClears = [];
  const diaryRecords = [
    baseRecord({
      memoryId: '   ',
      memory_id: 'mem-sync-snake-id',
      updatedAt: '2026-05-19T02:00:00.000Z',
      relativePath: 'process/snake-id.md',
      projectId: 'codex-memory',
      visibility: 'project'
    })
  ];
  const existingRecords = [
    {
      memoryId: 'mem-sync-snake-id',
      target: 'process',
      title: 'Useful implementation note',
      content: 'Alpha feature detail',
      evidence: 'Local evidence',
      tags: ['feature'],
      updatedAt: '2026-05-19T01:00:00.000Z',
      relativePath: 'process/snake-id.md',
      filePath: null,
      rawText: null,
      validated: false,
      reusable: false,
      status: 'active',
      projectId: 'codex-memory',
      visibility: 'project'
    }
  ];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return diaryRecords;
      }
    },
    shadowStore: {
      async listRecords() {
        return existingRecords;
      },
      async upsertRecord(record) {
        upserted.push({ ...record });
      },
      async clearReconcileTasks(memoryId, storeKind = null) {
        reconcileClears.push({ memoryId, storeKind });
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision() {
        return 'gov-rev-fixed';
      },
      async getStoredGovernanceStateEntries() {
        return null;
      },
      async clearCurrentFingerprintByMemoryIds(memoryIds, targets) {
        cacheClears.push({ memoryIds, targets });
      },
      async setStoredGovernanceStateRevision() {},
      async setStoredGovernanceStateEntries() {}
    },
    governanceStateRevisionProvider: async () => 'gov-rev-fixed'
  });

  const result = await service.syncTarget('process');

  assert.equal(result.sqliteWrites, 1);
  assert.equal(result.changed, true);
  assert.equal(result.governanceStateRevisionChanged, false);
  assert.equal(upserted.length, 1);
  assert.equal(upserted[0].memoryId, 'mem-sync-snake-id');
  assert.equal(upserted[0].memory_id, 'mem-sync-snake-id');
  assert.deepEqual(reconcileClears, [{ memoryId: 'mem-sync-snake-id', storeKind: 'sqlite' }]);
  assert.deepEqual(cacheClears, [{
    memoryIds: ['mem-sync-snake-id'],
    targets: ['process', 'both']
  }]);
  assert.match(result.syncToken, /^[a-f0-9]{40}$/);
});

test('knowledge base sync keeps governance state revision empty when no governance metadata exists', async () => {
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: false,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-no-governance',
          target: 'process',
          title: 'No governance metadata',
          content: 'plain content',
          evidence: 'plain evidence',
          tags: [],
          createdAt: '2026-05-19T00:00:00.000Z',
          updatedAt: '2026-05-19T00:00:00.000Z'
        }];
      }
    },
    shadowStore: {},
    vectorStore: {},
    chunkIndexingService: null
  });

  const result = await service.syncTarget('process');

  assert.equal(result.governanceStateRevision, '');
  assert.match(result.syncToken, /^[a-f0-9]{40}$/);
});

test('candidate cache store persists governance revisions per current fingerprint and clears them with fingerprint reset', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-cache-'));
  const store = new CandidateCacheStore({
    enableCandidateCache: true,
    candidateCachePath: path.join(tempDir, 'candidate-cache.json'),
    embeddingFingerprint: 'fingerprint-a',
    candidateCacheTtlMs: 60_000,
    candidateCacheMaxEntries: 20
  });

  try {
    await store.setStoredGovernanceStateRevision('process', 'rev-process-a');
    await store.set('cache-key-a', { ok: true }, { target: 'process' });

    assert.equal(await store.getStoredGovernanceStateRevision('process'), 'rev-process-a');

    const healthBefore = await store.getHealth();
    assert.deepEqual(healthBefore.governanceStateRevisionTargets, ['process']);

    await store.clearCurrentFingerprint();

    assert.equal(await store.getStoredGovernanceStateRevision('process'), '');
    const healthAfter = await store.getHealth();
    assert.deepEqual(healthAfter.governanceStateRevisionTargets, []);
    assert.equal(healthAfter.entryCount, 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('candidate cache store persists governance state entries per current fingerprint target', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-entries-'));

  try {
    const store = new CandidateCacheStore({
      enableCandidateCache: true,
      candidateCachePath: path.join(tempDir, 'candidate-cache.json'),
      embeddingFingerprint: 'test-fingerprint',
      candidateCacheTtlMs: 60_000,
      candidateCacheMaxEntries: 50
    });

    await store.setStoredGovernanceStateEntries('process', [
      { memoryId: 'mem-a', target: 'process', status: 'proposal', visibility: 'shared' }
    ]);
    await store.setStoredGovernanceStateEntries('knowledge', [
      { memoryId: 'mem-k', target: 'knowledge', status: 'active', visibility: 'private' }
    ]);

    assert.deepEqual(await store.getStoredGovernanceStateEntries('process'), [
      { memoryId: 'mem-a', target: 'process', status: 'proposal', visibility: 'shared' }
    ]);
    assert.deepEqual(await store.getStoredGovernanceStateEntries('knowledge'), [
      { memoryId: 'mem-k', target: 'knowledge', status: 'active', visibility: 'private' }
    ]);

    await store.clearCurrentFingerprintTargets(['process']);

    assert.equal(await store.getStoredGovernanceStateEntries('process'), null);
    assert.deepEqual(await store.getStoredGovernanceStateEntries('knowledge'), [
      { memoryId: 'mem-k', target: 'knowledge', status: 'active', visibility: 'private' }
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('candidate cache store can clear current fingerprint entries and governance revisions for selected targets', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cache-targets-'));

  try {
    const store = new CandidateCacheStore({
      enableCandidateCache: true,
      candidateCachePath: path.join(tempDir, 'candidate-cache.json'),
      embeddingFingerprint: 'test-fingerprint',
      candidateCacheTtlMs: 60_000,
      candidateCacheMaxEntries: 50
    });

    await store.setStoredGovernanceStateRevision('process', 'rev-process-a');
    await store.setStoredGovernanceStateRevision('knowledge', 'rev-knowledge-a');
    await store.setStoredGovernanceStateRevision('both', 'rev-both-a');
    await store.set('cache-process', { target: 'process' }, { target: 'process' });
    await store.set('cache-knowledge', { target: 'knowledge' }, { target: 'knowledge' });
    await store.set('cache-both', { target: 'both' }, { target: 'both' });

    const removed = await store.clearCurrentFingerprintTargets(['process', 'both']);

    assert.equal(removed, 2);
    assert.equal(await store.get('cache-process'), null);
    assert.deepEqual(await store.get('cache-knowledge'), { target: 'knowledge' });
    assert.equal(await store.get('cache-both'), null);
    assert.equal(await store.getStoredGovernanceStateRevision('process'), '');
    assert.equal(await store.getStoredGovernanceStateRevision('both'), '');
    assert.equal(await store.getStoredGovernanceStateRevision('knowledge'), 'rev-knowledge-a');
    const health = await store.getHealth();
    assert.deepEqual(health.governanceStateRevisionTargets, ['knowledge']);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('candidate cache store can clear current fingerprint entries by dependent memory ids', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cache-memoryids-'));

  try {
    const store = new CandidateCacheStore({
      enableCandidateCache: true,
      candidateCachePath: path.join(tempDir, 'candidate-cache.json'),
      embeddingFingerprint: 'test-fingerprint',
      candidateCacheTtlMs: 60_000,
      candidateCacheMaxEntries: 50
    });

    await store.setStoredGovernanceStateRevision('process', 'rev-process-a');
    await store.set('cache-process-hit', { ok: true }, { target: 'process', memoryIds: ['mem-a', 'mem-b'] });
    await store.set('cache-process-miss', { ok: true }, { target: 'process', memoryIds: ['mem-c'] });
    await store.set('cache-both-hit', { ok: true }, { target: 'both', memoryIds: ['mem-a'] });
    await store.set('cache-knowledge-keep', { ok: true }, { target: 'knowledge', memoryIds: ['mem-z'] });

    const removed = await store.clearCurrentFingerprintByMemoryIds(['mem-a'], ['process', 'both']);

    assert.equal(removed, 2);
    assert.equal(await store.get('cache-process-hit'), null);
    assert.deepEqual(await store.get('cache-process-miss'), { ok: true });
    assert.equal(await store.get('cache-both-hit'), null);
    assert.deepEqual(await store.get('cache-knowledge-keep'), { ok: true });
    assert.equal(await store.getStoredGovernanceStateRevision('process'), 'rev-process-a');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('knowledge base sync clears cache by changed memory ids when default governance revision changes without diary-content refresh', async () => {
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [
          baseRecord({
            memoryId: 'mem-governance-drift',
            projectId: 'codex-memory',
            visibility: 'shared',
            updatedAt: '2026-05-19T00:00:00.000Z',
            filePath: null,
            relativePath: null,
            rawText: null,
            validated: false,
            reusable: false
          })
        ];
      }
    },
    shadowStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-governance-drift',
          target: 'process',
          title: 'Useful implementation note',
          content: 'Alpha feature detail',
          evidence: 'Local evidence',
          tags: ['feature'],
          validated: false,
          reusable: false,
          updatedAt: '2026-05-19T00:00:00.000Z',
          relativePath: null,
          filePath: null,
          rawText: null,
          status: 'proposal',
          projectId: 'codex-memory',
          workspaceId: null,
          clientId: null,
          taskId: null,
          conversationId: null,
          visibility: 'shared',
          retentionPolicy: null
        }];
      },
      async upsertRecord() {
        calls.push('sqlite-upsert');
      },
      async clearReconcileTasks() {
        calls.push('reconcile-clear');
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision(target) {
        calls.push(`read-revision:${target}`);
        return 'old-governance-revision';
      },
      async getStoredGovernanceStateEntries(target) {
        calls.push(`read-governance-entries:${target}`);
        return [{
          memoryId: 'mem-governance-drift',
          target: 'process',
          status: 'active',
          projectId: 'codex-memory',
          workspaceId: '',
          clientId: '',
          taskId: '',
          conversationId: '',
          visibility: 'shared',
          retentionPolicy: ''
        }];
      },
      async clearCurrentFingerprintByMemoryIds(memoryIds, targets) {
        calls.push(`cache-clear-memory-ids:${memoryIds.join(',')}:${targets.join(',')}`);
      },
      async clearCurrentFingerprintTargets(targets) {
        calls.push(`cache-clear-targets:${targets.join(',')}`);
      },
      async clearCurrentFingerprint() {
        calls.push('cache-clear-current-fingerprint-fallback');
      },
      async setStoredGovernanceStateRevision(target, revision) {
        calls.push(`write-revision:${target}:${revision}`);
      },
      async setStoredGovernanceStateEntries(target, entries) {
        calls.push(`write-governance-entries:${target}:${Array.isArray(entries) ? entries.length : 0}`);
      }
    }
  });

  const result = await service.syncTarget('process');

  assert.equal(result.changed, false);
  assert.equal(result.governanceStateRevisionChanged, true);
  assert.match(result.governanceStateRevision, /^[a-f0-9]{40}$/);
  assert.deepEqual(calls, [
    'read-revision:process',
    'read-governance-entries:process',
    'cache-clear-memory-ids:mem-governance-drift:process,both',
    `write-revision:process:${result.governanceStateRevision}`,
    'write-governance-entries:process:1'
  ]);
});

test('knowledge base sync keeps target-family invalidation for governance drift when revision comes from custom provider', async () => {
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [
          baseRecord({
            memoryId: 'mem-governance-provider',
            projectId: 'codex-memory',
            visibility: 'shared',
            updatedAt: '2026-05-19T00:00:00.000Z',
            filePath: null,
            relativePath: null,
            rawText: null,
            validated: false,
            reusable: false
          })
        ];
      }
    },
    shadowStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-governance-provider',
          target: 'process',
          title: 'Useful implementation note',
          content: 'Alpha feature detail',
          evidence: 'Local evidence',
          tags: ['feature'],
          validated: false,
          reusable: false,
          updatedAt: '2026-05-19T00:00:00.000Z',
          relativePath: null,
          filePath: null,
          rawText: null,
          status: 'proposal',
          projectId: 'codex-memory',
          workspaceId: null,
          clientId: null,
          taskId: null,
          conversationId: null,
          visibility: 'shared',
          retentionPolicy: null
        }];
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision(target) {
        calls.push(`read-revision:${target}`);
        return 'old-provider-revision';
      },
      async getStoredGovernanceStateEntries(target) {
        calls.push(`read-governance-entries:${target}`);
        return [{
          memoryId: 'mem-governance-provider',
          target: 'process',
          status: 'active'
        }];
      },
      async clearCurrentFingerprintByMemoryIds(memoryIds, targets) {
        calls.push(`cache-clear-memory-ids:${memoryIds.join(',')}:${targets.join(',')}`);
      },
      async clearCurrentFingerprintTargets(targets) {
        calls.push(`cache-clear-targets:${targets.join(',')}`);
      },
      async setStoredGovernanceStateRevision(target, revision) {
        calls.push(`write-revision:${target}:${revision}`);
      },
      async setStoredGovernanceStateEntries(target, entries) {
        calls.push(`write-governance-entries:${target}:${entries === null ? 'null' : 'array'}`);
      }
    },
    governanceStateRevisionProvider: async () => 'provider-governance-revision'
  });

  const result = await service.syncTarget('process');

  assert.equal(result.changed, false);
  assert.equal(result.governanceStateRevisionChanged, true);
  assert.deepEqual(calls, [
    'read-revision:process',
    'read-governance-entries:process',
    'cache-clear-targets:process,both',
    'write-revision:process:provider-governance-revision',
    'write-governance-entries:process:null'
  ]);
});

test('knowledge base sync invalidates by changed memory ids when custom provider returns governance entries', async () => {
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [
          baseRecord({
            memoryId: 'mem-governance-provider',
            projectId: 'codex-memory',
            visibility: 'shared',
            updatedAt: '2026-05-19T00:00:00.000Z',
            filePath: null,
            relativePath: null,
            rawText: null,
            validated: false,
            reusable: false
          })
        ];
      }
    },
    shadowStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-governance-provider',
          target: 'process',
          title: 'Useful implementation note',
          content: 'Alpha feature detail',
          evidence: 'Local evidence',
          tags: ['feature'],
          validated: false,
          reusable: false,
          updatedAt: '2026-05-19T00:00:00.000Z',
          relativePath: null,
          filePath: null,
          rawText: null,
          status: 'proposal',
          projectId: 'codex-memory',
          workspaceId: null,
          clientId: null,
          taskId: null,
          conversationId: null,
          visibility: 'shared',
          retentionPolicy: null
        }];
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision(target) {
        calls.push(`read-revision:${target}`);
        return 'old-provider-revision';
      },
      async getStoredGovernanceStateEntries(target) {
        calls.push(`read-governance-entries:${target}`);
        return [{
          memoryId: 'mem-governance-provider',
          target: 'process',
          status: 'active'
        }];
      },
      async clearCurrentFingerprintByMemoryIds(memoryIds, targets) {
        calls.push(`cache-clear-memory-ids:${memoryIds.join(',')}:${targets.join(',')}`);
      },
      async clearCurrentFingerprintTargets(targets) {
        calls.push(`cache-clear-targets:${targets.join(',')}`);
      },
      async setStoredGovernanceStateRevision(target, revision) {
        calls.push(`write-revision:${target}:${revision}`);
      },
      async setStoredGovernanceStateEntries(target, entries) {
        calls.push(`write-governance-entries:${target}:${entries === null ? 'null' : 'array'}`);
      }
    },
    governanceStateRevisionProvider: async () => ({
      revision: 'provider-governance-revision',
      entries: [{
        memoryId: 'mem-governance-provider',
        target: 'process',
        status: 'proposal'
      }]
    })
  });

  const result = await service.syncTarget('process');

  assert.equal(result.changed, false);
  assert.equal(result.governanceStateRevisionChanged, true);
  assert.deepEqual(calls, [
    'read-revision:process',
    'read-governance-entries:process',
    'cache-clear-memory-ids:mem-governance-provider:process,both',
    'write-revision:process:provider-governance-revision',
    'write-governance-entries:process:array'
  ]);
});

test('knowledge base sync invalidates by changed memory ids when custom provider returns governance change-set only', async () => {
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 50
    },
    diaryStore: {
      async listRecords() {
        return [
          baseRecord({
            memoryId: 'mem-governance-provider-a',
            projectId: 'codex-memory',
            visibility: 'shared',
            updatedAt: '2026-05-19T00:00:00.000Z',
            filePath: null,
            relativePath: null,
            rawText: null,
            validated: false,
            reusable: false
          })
        ];
      }
    },
    shadowStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-governance-provider-a',
          target: 'process',
          title: 'Useful implementation note',
          content: 'Alpha feature detail',
          evidence: 'Local evidence',
          tags: ['feature'],
          validated: false,
          reusable: false,
          updatedAt: '2026-05-19T00:00:00.000Z',
          relativePath: null,
          filePath: null,
          rawText: null,
          status: 'proposal',
          projectId: 'codex-memory',
          workspaceId: null,
          clientId: null,
          taskId: null,
          conversationId: null,
          visibility: 'shared',
          retentionPolicy: null
        }];
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision(target) {
        calls.push(`read-revision:${target}`);
        return 'old-provider-revision';
      },
      async getStoredGovernanceStateEntries(target) {
        calls.push(`read-governance-entries:${target}`);
        return null;
      },
      async clearCurrentFingerprintByMemoryIds(memoryIds, targets) {
        calls.push(`cache-clear-memory-ids:${memoryIds.join(',')}:${targets.join(',')}`);
      },
      async clearCurrentFingerprintTargets(targets) {
        calls.push(`cache-clear-targets:${targets.join(',')}`);
      },
      async setStoredGovernanceStateRevision(target, revision) {
        calls.push(`write-revision:${target}:${revision}`);
      },
      async setStoredGovernanceStateEntries(target, entries) {
        calls.push(`write-governance-entries:${target}:${entries === null ? 'null' : 'array'}`);
      }
    },
    governanceStateRevisionProvider: async () => ({
      revision: 'provider-governance-revision-delta',
      changedMemoryIds: ['mem-governance-provider-b', 'mem-governance-provider-a', 'mem-governance-provider-b']
    })
  });

  const result = await service.syncTarget('process');

  assert.equal(result.changed, false);
  assert.equal(result.governanceStateRevisionChanged, true);
  assert.deepEqual(calls, [
    'read-revision:process',
    'read-governance-entries:process',
    'cache-clear-memory-ids:mem-governance-provider-a,mem-governance-provider-b:process,both',
    'write-revision:process:provider-governance-revision-delta',
    'write-governance-entries:process:null'
  ]);
});

test('knowledge base sync falls back to current fingerprint clear when target is both', async () => {
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 1000
    },
    diaryStore: {
      async listRecords() {
        return [];
      }
    },
    shadowStore: {
      async listRecords() {
        return [];
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision(target) {
        calls.push(`read-revision:${target}`);
        return '';
      },
      async clearCurrentFingerprintTargets(targets) {
        calls.push(`cache-clear-targets:${targets.join(',')}`);
      },
      async clearCurrentFingerprint() {
        calls.push('cache-clear-current-fingerprint');
      },
      async setStoredGovernanceStateRevision(target, revision) {
        calls.push(`write-revision:${target}:${revision}`);
      }
    },
    governanceStateRevisionProvider: async () => 'gov-rev-both'
  });

  const result = await service.syncTarget('both');

  assert.equal(result.governanceStateRevisionChanged, true);
  assert.deepEqual(calls, [
    'read-revision:both',
    'cache-clear-current-fingerprint',
    'write-revision:both:gov-rev-both'
  ]);
});

test('knowledge base sync clears candidate cache by changed memory ids when ordinary sync changes without governance drift', async () => {
  const calls = [];
  const service = new KnowledgeBaseSyncService({
    config: {
      enableShadowWrites: true,
      enableVectorIndex: false,
      searchMemoryTimeoutMs: 1000
    },
    diaryStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-sync-change',
          target: 'process',
          title: 'Updated title',
          content: 'same content',
          evidence: 'same evidence',
          tags: [],
          validated: false,
          reusable: false,
          relativePath: 'records/mem-sync-change.md',
          filePath: 'records/mem-sync-change.md',
          rawText: null,
          createdAt: '2026-05-23T00:00:00.000Z',
          updatedAt: '2026-05-23T01:00:00.000Z'
        }];
      }
    },
    shadowStore: {
      async listRecords() {
        return [{
          memoryId: 'mem-sync-change',
          target: 'process',
          title: 'Old title',
          content: 'same content',
          evidence: 'same evidence',
          tags: [],
          validated: false,
          reusable: false,
          relativePath: 'records/mem-sync-change.md',
          filePath: 'records/mem-sync-change.md',
          rawText: null,
          createdAt: '2026-05-23T00:00:00.000Z',
          updatedAt: '2026-05-23T00:30:00.000Z'
        }];
      },
      async upsertRecord() {
        calls.push('shadow-upsert');
      },
      async clearReconcileTasks(memoryId, storeKind) {
        calls.push(`clear-reconcile:${memoryId}:${storeKind}`);
      }
    },
    vectorStore: {},
    chunkIndexingService: null,
    candidateCacheStore: {
      async getStoredGovernanceStateRevision(target) {
        calls.push(`read-revision:${target}`);
        return 'stable-governance-revision';
      },
      async clearCurrentFingerprintByMemoryIds(memoryIds, targets) {
        calls.push(`cache-clear-memory-ids:${memoryIds.join(',')}:${targets.join(',')}`);
      },
      async clearCurrentFingerprintTargets(targets) {
        calls.push(`cache-clear-targets:${targets.join(',')}`);
      },
      async clearCurrentFingerprint() {
        calls.push('cache-clear-current-fingerprint');
      },
      async setStoredGovernanceStateRevision(target, revision) {
        calls.push(`write-revision:${target}:${revision}`);
      }
    },
    governanceStateRevisionProvider: async () => 'stable-governance-revision'
  });

  const result = await service.syncTarget('process');

  assert.equal(result.changed, true);
  assert.equal(result.governanceStateRevisionChanged, false);
  assert.deepEqual(calls, [
    'read-revision:process',
    'shadow-upsert',
    'clear-reconcile:mem-sync-change:sqlite',
    'cache-clear-memory-ids:mem-sync-change:process,both',
    'write-revision:process:stable-governance-revision'
  ]);
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

test('recall pipeline forwards governance state revision from sync into candidate generation', async () => {
  let observedRevision = null;
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
        return {
          syncToken: 'sync-alpha',
          governanceStateRevision: 'gov-rev-forwarded',
          changed: false
        };
      }
    },
    candidateGenerator: {
      async generate(input) {
        observedRevision = input.governanceStateRevision;
        return {
          searchPlan: { finalLimit: 5, semanticPoolSize: 5, useTime: false, useRerank: false },
          semanticCandidates: [],
          timeCandidates: [],
          allCandidates: [],
          fromCache: false
        };
      }
    },
    rerankService: {
      config: {}
    },
    recallAuditService: {
      async record() {}
    },
    recallEnhancer: {
      enhance(items) {
        return items;
      }
    },
    shadowStore: {
      async getRecordsByIds() {
        return [];
      }
    }
  });

  const results = await pipeline.search({
    query: 'alpha',
    target: 'process',
    limit: 5,
    includeContent: false,
    readOnly: false
  });

  assert.deepEqual(results, []);
  assert.equal(observedRevision, 'gov-rev-forwarded');
});

test('recall pipeline abort after rerank should skip aggregate lookup and recall audit', async () => {
  const controller = new AbortController();
  let rerankCount = 0;
  let aggregateLookupCount = 0;
  let auditRecordCount = 0;
  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: {
      parse() {
        return { query: 'alpha', directives: { rerank: true }, passiveBlocks: [], activeBlocks: [] };
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
          searchPlan: { finalLimit: 5, semanticPoolSize: 5, useTime: false, useRerank: true },
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
      config: {},
      async rerank(_queryText, candidates) {
        rerankCount += 1;
        controller.abort();
        return { results: candidates, mode: 'local-rrf', successRate: 1 };
      }
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
        aggregateLookupCount += 1;
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
  assert.equal(rerankCount, 1);
  assert.equal(aggregateLookupCount, 0);
  assert.equal(auditRecordCount, 0);
});

test('recall aggregate abort guard should skip record lookup side effect', async () => {
  const controller = new AbortController();
  controller.abort();
  let aggregateLookupCount = 0;
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
      async getRecordsByIds() {
        aggregateLookupCount += 1;
        return [];
      }
    }
  });

  await assert.rejects(
    () => pipeline.aggregateCandidates({
      candidates: [{
        chunkId: 'normal-1',
        memoryId: 'mem-normal',
        target: 'process',
        title: 'Alpha feature',
        text: 'alpha implementation detail',
        score: 0.9
      }],
      signal: controller.signal
    }),
    error => error?.code === 'SEARCH_MEMORY_TIMEOUT'
  );
  assert.equal(aggregateLookupCount, 0);
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

test('recall aggregation normalizes candidate id and source aliases', async () => {
  const lookups = [];
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
        lookups.push(ids);
        return [];
      }
    }
  });

  const aggregated = await pipeline.aggregateCandidates({
    candidates: [
      {
        chunkId: 'chunk-blank',
        memoryId: '   ',
        memory_id: 'mem-snake',
        target: 'process',
        title: 'Snake memory',
        text: 'alpha implementation detail',
        score: 0.9,
        source: 'rag'
      },
      {
        chunkId: 'chunk-source',
        memoryId: '',
        source_file: 'process/2026-06-01.md',
        target: 'process',
        title: 'Source fallback',
        text: 'beta implementation detail',
        score: 0.8,
        source: 'rag'
      },
      {
        chunk_id: 'chunk-snake',
        memoryId: '   ',
        target: 'process',
        title: 'Chunk fallback',
        text: 'gamma implementation detail',
        score: 0.7,
        source: 'rag'
      }
    ]
  });

  assert.deepEqual(lookups, [['mem-snake']]);
  assert.deepEqual(aggregated.map(item => item.memoryId), ['mem-snake', null, null]);
  assert.equal(aggregated[0].sourceFile, 'mem-snake');
  assert.equal(aggregated[1].sourceFile, 'process/2026-06-01.md');
  assert.equal(aggregated[2].sourceFile, 'chunk-snake');
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
