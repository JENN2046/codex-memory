'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { KnowledgeBaseRecallPipeline } = require('../src/recall/KnowledgeBaseRecallPipeline');
const {
  RecallPrecisionPolicy,
  summarizeScoreDistribution
} = require('../src/recall/RecallPrecisionPolicy');

function metadata(overrides = {}) {
  return {
    score: 0.2,
    baseScore: 0.2,
    rerankScore: null,
    lexicalScore: 0,
    tagMemoScore: 0,
    matchedTags: [],
    coreTagsMatched: [],
    titleHitCount: 0,
    tagHitCount: 0,
    contentHitCount: 0,
    evidenceHitCount: 0,
    exactCoreTagCount: 0,
    ...overrides
  };
}

function candidate(id, precision) {
  return {
    chunkId: `${id}-chunk`,
    memoryId: id,
    target: 'process',
    title: `${id} title`,
    text: `${id} text`,
    score: precision.score,
    baseScore: precision.baseScore,
    precision,
    source: 'rag',
    createdAt: '2026-05-23T00:00:00.000Z',
    updatedAt: '2026-05-23T00:00:00.000Z'
  };
}

function createPipeline({ generatedCandidates }) {
  const sideEffects = {
    recordReads: 0,
    syncCalls: 0,
    auditWrites: 0
  };
  const records = new Map([
    ['positive-memory', {
      memoryId: 'positive-memory',
      target: 'process',
      title: 'Positive synthetic record',
      rawText: 'positive bounded fixture content',
      content: 'positive bounded fixture content',
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:00:00.000Z'
    }],
    ['negative-memory', {
      memoryId: 'negative-memory',
      target: 'process',
      title: 'Negative synthetic record',
      rawText: 'negative bounded fixture content',
      content: 'negative bounded fixture content',
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:00:00.000Z'
    }]
  ]);

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
    tagMemoEngine: {
      analyzeQuery({ query }) {
        return {
          queryText: query,
          tokens: String(query).toLowerCase().split(/\s+/).filter(Boolean),
          timeRanges: [],
          coreTags: [],
          metrics: {}
        };
      }
    },
    candidateGenerator: {
      async generate() {
        return {
          searchPlan: {
            finalLimit: 3,
            useRerank: false,
            useTime: false,
            semanticPoolSize: 3
          },
          semanticCandidates: generatedCandidates,
          timeCandidates: [],
          allCandidates: generatedCandidates,
          fromCache: false
        };
      }
    },
    rerankService: {
      config: {},
      async rerank() {
        throw new Error('bounded precision fixture should not call rerank');
      }
    },
    recallAuditService: {
      async record() {
        sideEffects.auditWrites += 1;
      }
    },
    recallEnhancer: {
      enhance(results, { limit }) {
        return results.slice(0, limit);
      }
    },
    shadowStore: {
      async getRecordsByIds(ids) {
        sideEffects.recordReads += ids.length;
        return ids.map(id => records.get(id)).filter(Boolean);
      }
    },
    knowledgeBaseSyncService: {
      async syncTarget() {
        sideEffects.syncCalls += 1;
        return { syncToken: 'unexpected-sync', changed: true };
      }
    }
  });

  return { pipeline, sideEffects };
}

test('recall precision policy accepts positive-control metadata and rejects low-confidence negative-control metadata', () => {
  const policy = new RecallPrecisionPolicy({ minimumScore: 0.12, highConfidenceScore: 0.62 });
  const positive = candidate('positive-memory', metadata({
    score: 0.24,
    baseScore: 0.24,
    lexicalScore: 0.5,
    matchedTags: ['bounded-alpha'],
    titleHitCount: 1
  }));
  const negative = candidate('negative-memory', metadata({
    score: 0.098152,
    baseScore: 0.098152
  }));

  const ordinary = policy.evaluateCandidates([positive, negative], { enabled: true });
  assert.deepEqual(ordinary.accepted.map(item => item.memoryId), ['positive-memory']);
  assert.equal(ordinary.rejected.length, 1);
  assert.equal(ordinary.decision, 'minimum_score_policy_applied');

  const noResult = policy.evaluateCandidates([negative], {
    enabled: true,
    proofNoResultMode: true
  });
  assert.deepEqual(noResult.accepted, []);
  assert.equal(noResult.rejected[0].reason, 'rejected_negative_control_low_confidence');
});

test('recall precision policy fail-closes on missing metadata and raw leakage', () => {
  const policy = new RecallPrecisionPolicy();

  assert.throws(
    () => policy.evaluateCandidates([{ memoryId: 'missing-score', precision: { baseScore: 0.1 } }], { enabled: true }),
    /score must be a finite non-negative number/
  );

  assert.throws(
    () => policy.evaluateCandidates([{ memoryId: 'raw', score: 0.1, title: 'raw title' }], { enabled: true }),
    error => error.code === 'RECALL_PRECISION_POLICY_RAW_FIELD'
  );

  assert.throws(
    () => policy.evaluateCandidates([
      candidate('negative-memory', metadata({ score: 0.7, baseScore: 0.7 }))
    ], { enabled: true, proofNoResultMode: true }),
    error => error.code === 'RECALL_PRECISION_NEGATIVE_CONTROL_CANDIDATE'
  );
});

test('pipeline precision context keeps positive bounded record and suppresses negative bounded record before raw record fetch', async () => {
  const positive = candidate('positive-memory', metadata({
    score: 0.24,
    baseScore: 0.24,
    lexicalScore: 0.4,
    matchedTags: ['bounded-alpha'],
    contentHitCount: 1
  }));
  const negative = candidate('negative-memory', metadata({
    score: 0.075486,
    baseScore: 0.075486
  }));
  const { pipeline, sideEffects } = createPipeline({ generatedCandidates: [positive, negative] });

  const results = await pipeline.search({
    query: 'bounded alpha fixture',
    target: 'process',
    limit: 3,
    includeContent: false,
    readOnly: true,
    precisionPolicyContext: {
      enabled: true,
      queryFamily: 'bounded_positive_control',
      minimumScore: 0.12
    }
  });

  assert.deepEqual(results.map(result => result.memoryId), ['positive-memory']);
  assert.equal(results[0].content, undefined);
  assert.equal(sideEffects.recordReads, 1);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.auditWrites, 0);
});

test('pipeline noRawContentRead proof mode returns metadata-only results without raw record fetch', async () => {
  const positive = candidate('positive-memory', metadata({
    score: 0.24,
    baseScore: 0.24,
    lexicalScore: 0.4,
    matchedTags: ['bounded-alpha'],
    contentHitCount: 1
  }));
  const negative = candidate('negative-memory', metadata({
    score: 0.075486,
    baseScore: 0.075486
  }));
  const { pipeline, sideEffects } = createPipeline({ generatedCandidates: [positive, negative] });

  const results = await pipeline.search({
    query: 'bounded alpha fixture metadata only',
    target: 'process',
    limit: 3,
    includeContent: false,
    readOnly: true,
    noRawContentRead: true,
    precisionPolicyContext: {
      enabled: true,
      queryFamily: 'bounded_positive_control_metadata_only',
      minimumScore: 0.12
    }
  });

  assert.deepEqual(results.map(result => result.memoryId), ['positive-memory']);
  assert.equal(Object.prototype.hasOwnProperty.call(results[0], 'content'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(results[0], 'text'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(results[0], 'title'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(results[0], 'snippet'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(results[0], 'sourceFile'), false);
  assert.equal(sideEffects.recordReads, 0);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.auditWrites, 0);
});

test('pipeline noRawContentRead proof mode requires read-only metadata-only execution', async () => {
  const { pipeline, sideEffects } = createPipeline({ generatedCandidates: [] });

  await assert.rejects(
    () => pipeline.search({
      query: 'invalid no raw content read type',
      target: 'process',
      limit: 1,
      noRawContentRead: 'true'
    }),
    /noRawContentRead must be a boolean/
  );

  await assert.rejects(
    () => pipeline.search({
      query: 'invalid no raw content read write path',
      target: 'process',
      limit: 1,
      noRawContentRead: true
    }),
    /noRawContentRead requires readOnly recall path/
  );

  await assert.rejects(
    () => pipeline.search({
      query: 'invalid no raw content include content',
      target: 'process',
      limit: 1,
      includeContent: true,
      readOnly: true,
      noRawContentRead: true
    }),
    /noRawContentRead cannot include raw content/
  );

  assert.equal(sideEffects.recordReads, 0);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.auditWrites, 0);
});

test('pipeline no-result mode returns zero negative-control results without record read or durable side effects', async () => {
  const negativeCandidates = [
    candidate('negative-memory', metadata({ score: 0.098152, baseScore: 0.098152 })),
    candidate('negative-memory-two', metadata({ score: 0.018801, baseScore: 0.018801 }))
  ];
  const { pipeline, sideEffects } = createPipeline({ generatedCandidates: negativeCandidates });

  const results = await pipeline.search({
    query: 'ultra synthetic nonexistent negative control',
    target: 'process',
    limit: 3,
    includeContent: false,
    readOnly: true,
    precisionPolicyContext: {
      enabled: true,
      queryFamily: 'stricter_negative_control',
      proofNoResultMode: true
    }
  });

  assert.deepEqual(results, []);
  assert.equal(sideEffects.recordReads, 0);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.auditWrites, 0);
});

test('pipeline fail-closes on raw or path-like precision metadata before record read', async () => {
  const negative = candidate('negative-memory', metadata({
    score: 0.21,
    baseScore: 0.21,
    filePath: 'A:\\private\\memory.txt'
  }));
  const { pipeline, sideEffects } = createPipeline({ generatedCandidates: [negative] });

  await assert.rejects(
    () => pipeline.search({
      query: 'synthetic malformed precision metadata',
      target: 'process',
      limit: 3,
      includeContent: false,
      readOnly: true,
      precisionPolicyContext: {
        enabled: true,
        queryFamily: 'malformed_precision_metadata'
      }
    }),
    error => error.code === 'RECALL_PRECISION_POLICY_RAW_FIELD'
  );

  assert.equal(sideEffects.recordReads, 0);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.auditWrites, 0);
});

test('pipeline fail-closes on malformed precision metadata arrays before record read', async () => {
  const negative = candidate('negative-memory', metadata({
    score: 0.21,
    baseScore: 0.21,
    matchedTags: 'not-an-array'
  }));
  const { pipeline, sideEffects } = createPipeline({ generatedCandidates: [negative] });

  await assert.rejects(
    () => pipeline.search({
      query: 'synthetic malformed matchedTags metadata',
      target: 'process',
      limit: 3,
      includeContent: false,
      readOnly: true,
      precisionPolicyContext: {
        enabled: true,
        queryFamily: 'malformed_precision_metadata'
      }
    }),
    error => error.code === 'RECALL_PRECISION_POLICY_METADATA_INVALID' && error.field === 'matchedTags'
  );

  assert.equal(sideEffects.recordReads, 0);
  assert.equal(sideEffects.syncCalls, 0);
  assert.equal(sideEffects.auditWrites, 0);
});

test('sanitized score distribution exposes counts and metadata keys without raw fields', () => {
  const distribution = summarizeScoreDistribution([
    { precision: metadata({ score: 0.018801, baseScore: 0.018801 }) },
    { precision: metadata({ score: 0.098152, baseScore: 0.098152 }) },
    { precision: metadata({ score: 0.24, baseScore: 0.24 }) }
  ]);

  assert.equal(distribution.candidateCount, 3);
  assert.equal(distribution.minScore, 0.018801);
  assert.equal(distribution.topScore, 0.24);
  assert.equal(distribution.bucketCounts.zeroTo005, 1);
  assert.equal(distribution.bucketCounts.from005To01, 1);
  assert.equal(distribution.bucketCounts.from02To05, 1);
  assert.equal(distribution.metadataKeys.includes('score'), true);
  assert.equal(distribution.metadataKeys.includes('text'), false);
  assert.equal(distribution.metadataKeys.includes('snippet'), false);
  assert.equal(distribution.metadataKeys.includes('title'), false);
});
