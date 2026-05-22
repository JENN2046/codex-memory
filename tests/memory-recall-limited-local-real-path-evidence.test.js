'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const { RecallEnhancer } = require('../src/core/RecallEnhancer');
const {
  runSearchMemoryWithTimeout
} = require('../src/core/SearchMemoryTimeoutPolicy');
const { CandidateGenerator } = require('../src/recall/CandidateGenerator');
const { KnowledgeBaseRecallPipeline } = require('../src/recall/KnowledgeBaseRecallPipeline');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');

const repoRoot = path.resolve(__dirname, '..');
const tempParent = path.join(repoRoot, 'tmp', 'memory-recall-limited-local-real-path-evidence');

const syntheticSeeds = [
  {
    memoryId: 'local-realpath-expected-current',
    target: 'process',
    folder: 'alpha',
    title: 'Local alpha bounded recall',
    content: 'local alpha bounded recall shared expected signal',
    rawText: 'local alpha bounded recall shared expected signal',
    tags: ['local-alpha', 'bounded-recall'],
    status: 'active',
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z'
  },
  {
    memoryId: 'local-realpath-expected-older',
    target: 'process',
    folder: 'alpha',
    title: 'Local alpha bounded recall',
    content: 'local alpha bounded recall shared expected signal',
    rawText: 'local alpha bounded recall shared expected signal',
    tags: ['local-alpha', 'bounded-recall'],
    status: 'active',
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-05-21T10:00:00.000Z'
  },
  {
    memoryId: 'local-realpath-irrelevant-same-folder',
    target: 'process',
    folder: 'alpha',
    title: 'Local omega unrelated note',
    content: 'local omega unrelated synthetic note',
    rawText: 'local omega unrelated synthetic note',
    tags: ['local-omega'],
    status: 'active',
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z'
  },
  {
    memoryId: 'local-realpath-irrelevant-other-folder',
    target: 'process',
    folder: 'beta',
    title: 'Local beta unrelated note',
    content: 'local beta unrelated synthetic note',
    rawText: 'local beta unrelated synthetic note',
    tags: ['local-beta'],
    status: 'active',
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z'
  }
];

function assertInsideTempParent(tempRoot) {
  const resolvedParent = path.resolve(tempParent);
  const resolvedRoot = path.resolve(tempRoot);
  assert.ok(
    resolvedRoot.startsWith(`${resolvedParent}${path.sep}`),
    `temp root must stay under expected parent: ${resolvedRoot}`
  );
  assert.equal(
    path.dirname(resolvedRoot),
    resolvedParent,
    `temp root must be a direct child of the allowed parent: ${resolvedRoot}`
  );
}

async function pathExists(targetPath) {
  try {
    await fs.stat(targetPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function createTempWorkspace() {
  await fs.mkdir(tempParent, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(tempParent, 'CM-0761-'));
  assertInsideTempParent(tempRoot);
  const recordRoot = path.join(tempRoot, 'records');
  await fs.mkdir(recordRoot, { recursive: true });

  for (const seed of syntheticSeeds) {
    const seedPath = path.join(recordRoot, `${seed.memoryId}.json`);
    assert.equal(path.extname(seedPath), '.json');
    await fs.writeFile(seedPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  }

  return { tempRoot, recordRoot };
}

async function listJsonRecords(recordRoot, counters) {
  const entries = await fs.readdir(recordRoot);
  assert.equal(entries.length, 4);
  assert.equal(entries.some(entry => entry.endsWith('.jsonl')), false);

  const records = [];
  for (const entry of entries.sort()) {
    assert.equal(path.extname(entry), '.json');
    counters.tempRecordReads += 1;
    records.push(JSON.parse(await fs.readFile(path.join(recordRoot, entry), 'utf8')));
  }
  return records;
}

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
    scoreRecord(record, queryAnalysis) {
      const title = String(record.title || '').toLowerCase();
      const content = String(record.content || '').toLowerCase();
      const tokens = queryAnalysis.tokens || [];
      const hitCount = tokens.filter(token => title.includes(token) || content.includes(token)).length;
      return {
        boost: 0,
        normalizedScore: hitCount > 0 ? 0.5 : 0,
        matchedTags: [],
        matchedCoreTags: [],
        exactCoreTagCount: 0,
        titleHitCount: hitCount,
        tagHitCount: 0,
        contentHitCount: hitCount,
        evidenceHitCount: 0,
        dynamicCoreWeight: 1.25,
        surfaceScore: hitCount > 0 ? 0.5 : 0
      };
    }
  };
}

function createCompatibilityAdapter() {
  return {
    parse(query) {
      return {
        query,
        directives: { time: 'bounded-local-real-path' },
        passiveBlocks: [],
        activeBlocks: []
      };
    }
  };
}

function createTimeExpressionParser() {
  return {
    parse() {
      return [{
        start: new Date('2026-05-20T00:00:00.000Z'),
        end: new Date('2026-05-23T00:00:00.000Z')
      }];
    }
  };
}

function buildRecordText(record) {
  return [
    `Title: ${record.title}`,
    record.content || '',
    `Tag: ${(record.tags || []).join(', ')}`
  ].join('\n');
}

function toChunk(record, vector) {
  return {
    chunkId: `${record.memoryId}-chunk`,
    chunkIndex: 0,
    memoryId: record.memoryId,
    target: record.target,
    title: record.title,
    text: record.content,
    tags: record.tags,
    vector,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    folder: record.folder,
    sourceFile: `${record.memoryId}.json`,
    relativePath: `records/${record.memoryId}.json`,
    filePath: `<temp-root>/records/${record.memoryId}.json`
  };
}

async function createLocalRealPathHarness({ tempRoot, recordRoot, counters }) {
  const records = await listJsonRecords(recordRoot, counters);
  const vectorIndexPath = path.join(tempRoot, 'index', 'vector-index.json');
  const vectorStore = new VectorIndexStore({
    enableVectorIndex: true,
    enableEmbeddingCache: true,
    embeddingCacheMaxEntries: 32,
    embedDimensions: 16,
    embeddingFingerprint: 'limited-local-real-path-bounded-evidence',
    vectorIndexPath
  });

  for (const record of records) {
    await vectorStore.upsertRecord({
      ...record,
      relativePath: `records/${record.memoryId}.json`,
      filePath: path.join(recordRoot, `${record.memoryId}.json`)
    });
  }
  await vectorStore.rebuildDiaryVectors(records);
  counters.tempVectorIndexWrites += 1;

  const recordMap = new Map(records.map(record => [record.memoryId, record]));
  const chunks = records.map(record => {
    const cached = vectorStore.index.vectors[record.memoryId];
    return toChunk(record, cached?.vector || vectorStore.embedText(buildRecordText(record)));
  });

  const shadowStore = {
    async listChunks(target, candidateFilters = {}) {
      counters.tempChunkReads += 1;
      return chunks.filter(chunk => {
        if (target !== 'both' && chunk.target !== target) {
          return false;
        }
        if (candidateFilters.folder && chunk.folder !== candidateFilters.folder) {
          return false;
        }
        return true;
      });
    },
    async listChunksByTimeRanges(target, timeRanges = [], candidateFilters = {}) {
      counters.tempChunkReads += 1;
      return chunks.filter(chunk => {
        if (target !== 'both' && chunk.target !== target) {
          return false;
        }
        if (candidateFilters.folder && chunk.folder !== candidateFilters.folder) {
          return false;
        }
        const created = new Date(chunk.createdAt || 0).getTime();
        return timeRanges.some(range => created >= range.start.getTime() && created <= range.end.getTime());
      });
    },
    async getRecordsByIds(ids) {
      counters.tempRecordReads += 1;
      return ids.map(id => recordMap.get(id)).filter(Boolean);
    }
  };

  const tagMemoEngine = createTagMemoStub();
  const candidateGenerator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 2,
      maxSearchLimit: 4,
      candidatePoolMultiplier: 1,
      rerankMultiplier: 1,
      contextVectorWeight: 0.22,
      embeddingFingerprint: 'limited-local-real-path-bounded-evidence'
    },
    shadowStore,
    vectorStore,
    tagMemoEngine
  });

  const pipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: createCompatibilityAdapter(),
    timeExpressionParser: createTimeExpressionParser(),
    tagMemoEngine,
    candidateGenerator,
    rerankService: {
      config: {},
      async rerank() {
        counters.providerCalls += 1;
        throw new Error('limited local real-path evidence must not call rerank provider');
      }
    },
    recallAuditService: {
      async record() {
        counters.durableAuditWrites += 1;
      }
    },
    recallEnhancer: new RecallEnhancer(),
    shadowStore,
    knowledgeBaseSyncService: {
      async syncTarget() {
        counters.durableMemoryWrites += 1;
        return { syncToken: 'unexpected-sync', changed: true };
      }
    }
  });

  return { pipeline, records };
}

function createTimeoutPipeline(counters) {
  const tagMemoEngine = createTagMemoStub();
  return new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter: createCompatibilityAdapter(),
    timeExpressionParser: createTimeExpressionParser(),
    tagMemoEngine,
    candidateGenerator: {
      async generate({ signal }) {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('limited local real-path timeout'), {
              code: 'SEARCH_MEMORY_TIMEOUT'
            }));
          }, { once: true });
        });
      }
    },
    rerankService: {
      config: {},
      async rerank() {
        counters.providerCalls += 1;
        throw new Error('timeout query must not call rerank provider');
      }
    },
    recallAuditService: {
      async record() {
        counters.durableAuditWrites += 1;
      }
    },
    recallEnhancer: new RecallEnhancer(),
    shadowStore: {
      async getRecordsByIds() {
        counters.realMemoryReads += 1;
        return [];
      }
    },
    knowledgeBaseSyncService: {
      async syncTarget() {
        counters.durableMemoryWrites += 1;
        return { syncToken: 'unexpected-sync', changed: true };
      }
    }
  });
}

function resultIds(results) {
  return results.map(result => result.memoryId);
}

test('limited local real-path recall evidence uses temp-root local vector path and preserves hard boundaries', async () => {
  const counters = {
    queryCount: 0,
    tempRecordReads: 0,
    tempChunkReads: 0,
    tempVectorIndexWrites: 0,
    realMemoryReads: 0,
    jsonlReads: 0,
    providerCalls: 0,
    durableMemoryWrites: 0,
    durableAuditWrites: 0
  };
  const { tempRoot, recordRoot } = await createTempWorkspace();
  let cleanupVerified = false;

  try {
    const { pipeline, records } = await createLocalRealPathHarness({ tempRoot, recordRoot, counters });
    assert.equal(records.length, 4);
    assert.deepEqual(
      records.map(record => record.memoryId).sort(),
      syntheticSeeds.map(seed => seed.memoryId).sort()
    );

    const executeQuery = async options => {
      counters.queryCount += 1;
      return pipeline.search({
        query: 'local alpha bounded recall',
        target: 'process',
        limit: 2,
        includeContent: false,
        source: 'limited-local-real-path-sandbox',
        readOnly: true,
        auditContext: { limitedLocalRealPathEvidence: true },
        ...options
      });
    };

    const expectedResults = await executeQuery({});
    assert.deepEqual(resultIds(expectedResults), [
      'local-realpath-expected-current',
      'local-realpath-expected-older'
    ]);
    assert.equal(expectedResults.some(result => result.content !== undefined), false);

    const irrelevantSuppressionResults = await executeQuery({});
    assert.equal(resultIds(irrelevantSuppressionResults).includes('local-realpath-irrelevant-same-folder'), false);
    assert.equal(resultIds(irrelevantSuppressionResults).includes('local-realpath-irrelevant-other-folder'), false);

    const folderResults = await executeQuery({ candidateFilters: { folder: 'alpha' } });
    assert.equal(resultIds(folderResults).includes('local-realpath-irrelevant-other-folder'), false);
    assert.ok(folderResults.every(result => result.sourceFile?.startsWith('records/')));

    const timeoutPipeline = createTimeoutPipeline(counters);
    counters.queryCount += 1;
    await assert.rejects(
      () => runSearchMemoryWithTimeout(({ signal }) => timeoutPipeline.search({
        query: 'local alpha bounded recall timeout',
        target: 'process',
        limit: 1,
        includeContent: false,
        source: 'limited-local-real-path-sandbox',
        readOnly: true,
        signal
      }), { timeoutMs: 5 }),
      error => {
        assert.equal(error.code, 'SEARCH_MEMORY_TIMEOUT');
        assert.equal(error.jsonRpcCode, -32002);
        assert.equal(error.jsonRpcData.code, 'SEARCH_MEMORY_TIMEOUT');
        return true;
      }
    );

    assert.equal(counters.queryCount, 4);
    assert.equal(counters.realMemoryReads, 0);
    assert.equal(counters.jsonlReads, 0);
    assert.equal(counters.providerCalls, 0);
    assert.equal(counters.durableMemoryWrites, 0);
    assert.equal(counters.durableAuditWrites, 0);

    const evidence = {
      taskId: 'MEMORY_RECALL_LIMITED_LOCAL_REAL_PATH_EVIDENCE_EXECUTION',
      baseline: '3f42bb5f59e262e14b48c07cf7e1b0f33c5dadd7',
      evidenceClass: 'limited_local_real_path_bounded_recall',
      tempRootSanitized: '<repo>/tmp/memory-recall-limited-local-real-path-evidence/CM-0761-<run-id>',
      seedCount: records.length,
      queryCount: counters.queryCount,
      expectedResultIds: resultIds(expectedResults),
      suppressedResultIds: [
        'local-realpath-irrelevant-same-folder',
        'local-realpath-irrelevant-other-folder'
      ],
      folderScope: { folder: 'alpha', betaSuppressed: true },
      freshnessOrder: {
        first: 'local-realpath-expected-current',
        second: 'local-realpath-expected-older'
      },
      timeoutError: { code: 'SEARCH_MEMORY_TIMEOUT', jsonRpcCode: -32002 },
      sideEffectCounters: {
        providerCalls: counters.providerCalls,
        realMemoryReads: counters.realMemoryReads,
        jsonlReads: counters.jsonlReads,
        durableMemoryWrites: counters.durableMemoryWrites,
        durableAuditWrites: counters.durableAuditWrites
      },
      rawContentOutput: false,
      readinessClaimAllowed: false,
      decision: 'LIMITED_LOCAL_REAL_PATH_BOUNDED_EVIDENCE_ACCEPTED_NOT_READY'
    };

    const serializedEvidence = JSON.stringify(evidence);
    assert.equal(serializedEvidence.includes('local alpha bounded recall shared expected signal'), false);
    assert.equal(serializedEvidence.includes('local omega unrelated synthetic note'), false);
    assert.equal(evidence.seedCount, 4);
    assert.equal(evidence.queryCount, 4);
    assert.equal(evidence.expectedResultIds[0], 'local-realpath-expected-current');
    assert.equal(evidence.folderScope.betaSuppressed, true);
    assert.equal(evidence.readinessClaimAllowed, false);
  } finally {
    assertInsideTempParent(tempRoot);
    await fs.rm(tempRoot, { recursive: true, force: false });
    cleanupVerified = !(await pathExists(tempRoot));
  }

  assert.equal(cleanupVerified, true);
});
