'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

const {
  runSearchMemoryWithTimeout
} = require('../src/core/SearchMemoryTimeoutPolicy');
const { CandidateGenerator } = require('../src/recall/CandidateGenerator');
const { KnowledgeBaseRecallPipeline } = require('../src/recall/KnowledgeBaseRecallPipeline');

const repoRoot = path.resolve(__dirname, '..');
const tempParent = path.join(repoRoot, 'tmp', 'memory-recall-temp-workspace-evidence');

const syntheticSeeds = [
  {
    memoryId: 'temp-recall-expected-current',
    target: 'process',
    folder: 'alpha',
    title: 'Temp alpha bounded recall current',
    content: 'temp alpha recall expected current content',
    rawText: 'temp alpha recall expected current content',
    tags: ['temp-alpha', 'bounded-recall'],
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
    vector: [1, 0]
  },
  {
    memoryId: 'temp-recall-expected-older',
    target: 'process',
    folder: 'alpha',
    title: 'Temp alpha bounded recall older',
    content: 'temp alpha recall older content',
    rawText: 'temp alpha recall older content',
    tags: ['temp-alpha', 'bounded-recall'],
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-05-21T10:00:00.000Z',
    vector: [0.98, 0.02]
  },
  {
    memoryId: 'temp-recall-irrelevant-same-folder',
    target: 'process',
    folder: 'alpha',
    title: 'Temp omega unrelated note',
    content: 'temp omega unrelated content',
    rawText: 'temp omega unrelated content',
    tags: ['temp-omega'],
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
    vector: [0, 0]
  },
  {
    memoryId: 'temp-recall-irrelevant-other-folder',
    target: 'process',
    folder: 'beta',
    title: 'Temp beta unrelated note',
    content: 'temp beta unrelated content',
    rawText: 'temp beta unrelated content',
    tags: ['temp-beta'],
    createdAt: '2026-05-22T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
    vector: [0, 0]
  }
];

function assertInsideTempParent(tempRoot) {
  const resolvedParent = path.resolve(tempParent);
  const resolvedRoot = path.resolve(tempRoot);
  assert.ok(
    resolvedRoot.startsWith(`${resolvedParent}${path.sep}`),
    `temp root must stay under expected parent: ${resolvedRoot}`
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
  const tempRoot = await fs.mkdtemp(path.join(tempParent, 'CM-0758-'));
  assertInsideTempParent(tempRoot);

  for (const seed of syntheticSeeds) {
    const seedPath = path.join(tempRoot, `${seed.memoryId}.json`);
    assert.equal(path.extname(seedPath), '.json');
    await fs.writeFile(seedPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  }

  return tempRoot;
}

async function loadSyntheticSeeds(tempRoot, counters) {
  assertInsideTempParent(tempRoot);
  const entries = await fs.readdir(tempRoot);
  assert.equal(entries.length, 4);
  assert.equal(entries.some(entry => entry.endsWith('.jsonl')), false);

  const seeds = [];
  for (const entry of entries.sort()) {
    assert.equal(path.extname(entry), '.json');
    counters.tempWorkspaceReads += 1;
    const seed = JSON.parse(await fs.readFile(path.join(tempRoot, entry), 'utf8'));
    seeds.push(seed);
  }
  return seeds;
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

function toChunk(seed) {
  return {
    chunkId: `${seed.memoryId}-chunk`,
    memoryId: seed.memoryId,
    target: seed.target,
    title: seed.title,
    text: seed.content,
    tags: seed.tags,
    vector: seed.vector,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
    folder: seed.folder,
    sourceFile: `${seed.memoryId}.json`,
    relativePath: `${seed.memoryId}.json`
  };
}

function createTempWorkspacePipeline(seeds, counters) {
  const records = new Map(seeds.map(seed => [seed.memoryId, seed]));
  const chunks = seeds.map(toChunk);
  const tagMemoEngine = createTagMemoStub();
  const candidateGenerator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 3,
      maxSearchLimit: 5,
      candidatePoolMultiplier: 1,
      rerankMultiplier: 1,
      embeddingFingerprint: 'temp-workspace-bounded-recall-evidence'
    },
    shadowStore: {
      async listChunks(target, candidateFilters = {}) {
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
    tagMemoEngine
  });

  return new KnowledgeBaseRecallPipeline({
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
        counters.providerCalls += 1;
        throw new Error('temp workspace evidence must not call rerank provider');
      }
    },
    recallAuditService: {
      async record() {
        counters.durableAuditWrites += 1;
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
        counters.durableMemoryWrites += 1;
        return { syncToken: 'unexpected-sync', changed: true };
      }
    }
  });
}

function createTimeoutPipeline(counters) {
  const tagMemoEngine = createTagMemoStub();
  return new KnowledgeBaseRecallPipeline({
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
            reject(Object.assign(new Error('temp workspace timeout'), {
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
    recallEnhancer: {
      enhance(results) {
        return results;
      }
    },
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

test('temp workspace recall evidence executes four bounded synthetic queries and verifies cleanup', async () => {
  const counters = {
    queryCount: 0,
    tempWorkspaceReads: 0,
    realMemoryReads: 0,
    jsonlReads: 0,
    providerCalls: 0,
    durableMemoryWrites: 0,
    durableAuditWrites: 0
  };
  const tempRoot = await createTempWorkspace();
  let cleanupVerified = false;

  try {
    const seeds = await loadSyntheticSeeds(tempRoot, counters);
    assert.equal(seeds.length, 4);
    assert.deepEqual(
      seeds.map(seed => seed.memoryId).sort(),
      syntheticSeeds.map(seed => seed.memoryId).sort()
    );

    const pipeline = createTempWorkspacePipeline(seeds, counters);
    const executeQuery = async options => {
      counters.queryCount += 1;
      return pipeline.search({
        query: 'temp alpha bounded recall',
        target: 'process',
        limit: 2,
        includeContent: false,
        source: 'temp-workspace-sandbox',
        readOnly: true,
        auditContext: { tempWorkspaceEvidence: true },
        ...options
      });
    };

    const expectedResults = await executeQuery({});
    assert.deepEqual(resultIds(expectedResults), [
      'temp-recall-expected-current',
      'temp-recall-expected-older'
    ]);
    assert.equal(expectedResults.some(result => result.content !== undefined), false);

    const irrelevantSuppressionResults = await executeQuery({});
    assert.equal(resultIds(irrelevantSuppressionResults).includes('temp-recall-irrelevant-same-folder'), false);
    assert.equal(resultIds(irrelevantSuppressionResults).includes('temp-recall-irrelevant-other-folder'), false);

    const folderResults = await executeQuery({ candidateFilters: { folder: 'alpha' } });
    assert.equal(resultIds(folderResults).includes('temp-recall-irrelevant-other-folder'), false);
    assert.ok(folderResults.every(result => result.memoryId !== 'temp-recall-irrelevant-other-folder'));

    const timeoutPipeline = createTimeoutPipeline(counters);
    counters.queryCount += 1;
    await assert.rejects(
      () => runSearchMemoryWithTimeout(({ signal }) => timeoutPipeline.search({
        query: 'temp alpha bounded recall timeout',
        target: 'process',
        limit: 1,
        includeContent: false,
        source: 'temp-workspace-sandbox',
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
      taskId: 'MEMORY_RECALL_TEMP_WORKSPACE_EVIDENCE_EXECUTION',
      evidenceClass: 'temp_workspace_bounded_recall',
      tempWorkspaceRoot: '<repo>/tmp/memory-recall-temp-workspace-evidence/<run-id>',
      seedRecordCount: seeds.length,
      queryCount: counters.queryCount,
      expectedResultMatched: resultIds(expectedResults)[0] === 'temp-recall-expected-current',
      expectedPrimaryId: 'temp-recall-expected-current',
      irrelevantResultsSuppressed: !resultIds(irrelevantSuppressionResults).includes('temp-recall-irrelevant-same-folder')
        && !resultIds(irrelevantSuppressionResults).includes('temp-recall-irrelevant-other-folder'),
      freshnessOrderingAccepted: resultIds(expectedResults).indexOf('temp-recall-expected-current')
        < resultIds(expectedResults).indexOf('temp-recall-expected-older'),
      folderScopeAccepted: !resultIds(folderResults).includes('temp-recall-irrelevant-other-folder'),
      timeoutErrorCode: 'SEARCH_MEMORY_TIMEOUT',
      timeoutJsonRpcCode: -32002,
      providerCalls: counters.providerCalls,
      realMemoryReads: counters.realMemoryReads,
      jsonlReads: counters.jsonlReads,
      durableMemoryWrites: counters.durableMemoryWrites,
      durableAuditWrites: counters.durableAuditWrites,
      rawContentOutput: false,
      readinessClaimAllowed: false,
      decision: 'TEMP_WORKSPACE_RECALL_EVIDENCE_ACCEPTED_NOT_READY'
    };

    const serializedEvidence = JSON.stringify(evidence);
    assert.equal(serializedEvidence.includes('temp alpha recall expected current content'), false);
    assert.equal(serializedEvidence.includes('temp omega unrelated content'), false);
    assert.equal(evidence.expectedResultMatched, true);
    assert.equal(evidence.irrelevantResultsSuppressed, true);
    assert.equal(evidence.freshnessOrderingAccepted, true);
    assert.equal(evidence.folderScopeAccepted, true);
    assert.equal(evidence.readinessClaimAllowed, false);
  } finally {
    assertInsideTempParent(tempRoot);
    await fs.rm(tempRoot, { recursive: true, force: false });
    cleanupVerified = !(await pathExists(tempRoot));
  }

  assert.equal(cleanupVerified, true);
});
