'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CandidateGenerator } = require('../src/recall/CandidateGenerator');

function buildChunk(index) {
  return {
    chunkId: `chunk-${index}`,
    chunkIndex: index,
    memoryId: `mem-${index}`,
    target: 'process',
    title: `Alpha candidate ${index}`,
    text: `alpha synthetic large corpus boundary record ${index}`,
    relativePath: `process/${index}.txt`,
    filePath: `/tmp/synthetic/process/${index}.txt`,
    tags: ['alpha', 'synthetic'],
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    vector: [1, 0]
  };
}

test('CandidateGenerator currently scans all supplied chunks before semantic pool slicing', async () => {
  const scannedChunks = Array.from({ length: 50 }, (_, index) => buildChunk(index));
  const calls = [];
  const generator = new CandidateGenerator({
    config: {
      defaultSearchLimit: 5,
      maxSearchLimit: 10,
      candidatePoolMultiplier: 2,
      rerankMultiplier: 2,
      contextVectorWeight: 0
    },
    shadowStore: {
      async listChunks(target, filters) {
        calls.push({ target, filters, returned: scannedChunks.length });
        return scannedChunks;
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
          matchedCoreTags: [],
          dynamicCoreWeight: 1,
          titleHitCount: 0,
          tagHitCount: 0,
          contentHitCount: 0,
          evidenceHitCount: 0,
          exactCoreTagCount: 0,
          surfaceScore: 0
        };
      }
    }
  });

  const result = await generator.generate({
    target: 'process',
    queryText: 'alpha synthetic boundary',
    queryAnalysis: {
      queryText: 'alpha synthetic boundary',
      tokens: ['alpha', 'synthetic', 'boundary'],
      coreTags: ['alpha'],
      dynamicTagWeight: 0.1,
      dynamicCoreWeight: 1,
      metrics: {},
      timeRanges: []
    },
    limit: 5,
    candidateFilters: { projectId: 'synthetic-project' },
    readOnly: true
  });

  assert.deepEqual(calls, [{
    target: 'process',
    filters: { projectId: 'synthetic-project' },
    returned: 50
  }]);
  assert.equal(result.searchPlan.finalLimit, 5);
  assert.equal(result.searchPlan.semanticPoolSize, 12);
  assert.equal(result.semanticCandidates.length, 12);
  assert.equal(result.allCandidates.length, 12);
  assert.equal(result.fromCache, false);
});
