const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

async function withApp(handler, overrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-phase-b-sync-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...overrides
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function codexRequestContext() {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'phase-b-sync-test'
    }
  };
}

async function startRerankServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    async close() {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

test('knowledge base sync should prune stale shadow and vector entries after diary deletion', async () => {
  await withApp(async ({ app }) => {
    const record = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint prune target',
      content: 'checkpoint stale prune validation',
      evidence: 'phase-b prune test',
      validated: true,
      reusable: false,
      tags: ['prune'],
      sensitivity: 'none'
    }, codexRequestContext());

    assert.equal(record.decision, 'accepted');
    assert.ok(await app.stores.shadowStore.getRecord(record.memoryId));

    await fs.rm(record.filePath, { force: true });
    const sync = await app.recall.knowledgeBaseSyncService.syncTarget('process');

    assert.equal(sync.prunedRecords, 1);
    assert.equal(await app.stores.shadowStore.getRecord(record.memoryId), null);

    const vectorHealth = await app.stores.vectorStore.getHealth();
    assert.equal(vectorHealth.vectorCount, 0);
  });
});

test('candidate cache should serve repeat searches and mark recall audit as cached', async () => {
  await withApp(async ({ app }) => {
    const record = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint cache target',
      content: 'checkpoint migration cache validation',
      evidence: 'phase-b cache test',
      validated: true,
      reusable: false,
      tags: ['cache', 'migration'],
      sensitivity: 'none'
    }, codexRequestContext());

    assert.equal(record.decision, 'accepted');

    const args = {
      query: 'migration checkpoint cache',
      target: 'process',
      limit: 3,
      include_content: false
    };

    const first = await app.callTool('search_memory', args, codexRequestContext());
    const second = await app.callTool('search_memory', args, codexRequestContext());

    assert.equal(first.results.length, 1);
    assert.equal(second.results.length, 1);

    const recallEntries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    assert.equal(recallEntries.at(-1).fromCache, true);

    const cacheHealth = await app.stores.candidateCacheStore.getHealth();
    assert.ok(cacheHealth.entryCount >= 1);
    assert.ok(cacheHealth.hits >= 1);
    assert.ok(cacheHealth.misses >= 1);
  });
});

test('context vector should use active blocks, warm embedding cache, and record context audit fields', async () => {
  await withApp(async ({ app }) => {
    const ctx = codexRequestContext();

    await app.callTool('record_memory', {
      target: 'process',
      title: 'Schema checkpoint',
      content: 'checkpoint stable schema baseline',
      evidence: 'context-vector test schema',
      validated: true,
      reusable: false,
      tags: ['schema'],
      sensitivity: 'none'
    }, ctx);

    await app.callTool('record_memory', {
      target: 'process',
      title: 'ORM checkpoint',
      content: 'checkpoint stable orm migration rollout',
      evidence: 'context-vector test orm',
      validated: true,
      reusable: false,
      tags: ['orm', 'migration'],
      sensitivity: 'none'
    }, ctx);

    const result = await app.adapters.vcpPassiveMemoryAdapter.search('[[checkpoint stable]] <<orm migration>>', {
      target: 'process',
      limit: 2
    });

    assert.ok(result.results.length >= 1);
    assert.ok(result.results.some(item => item.title === 'ORM checkpoint'));

    const analysis = app.recall.tagMemoEngine.analyzeQuery({
      rawQuery: 'checkpoint stable',
      query: 'checkpoint stable',
      passiveBlocks: ['checkpoint stable'],
      directives: {},
      timeRanges: []
    });
    await app.recall.contextVectorManager.buildQueryContext({
      queryText: 'checkpoint stable',
      activeBlocks: ['orm migration'],
      queryAnalysis: analysis
    });
    await app.recall.contextVectorManager.buildQueryContext({
      queryText: 'checkpoint stable',
      activeBlocks: ['orm migration'],
      queryAnalysis: analysis
    });

    const vectorHealth = await app.stores.vectorStore.getHealth();
    assert.ok(vectorHealth.embeddingCacheCount >= 2);
    assert.ok(vectorHealth.embeddingHits >= 1);

    const recallEntries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    const latest = recallEntries.at(-1);
    assert.equal(latest.contextVectorUsed, true);
    assert.ok(latest.contextSourceKinds.includes('active-block'));
    assert.ok(latest.contextBlendWeight > 0);
  });
});

test('external rerank adapter should call configured endpoint and apply remote ordering', async () => {
  const requests = [];
  const rerankServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      requests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: JSON.parse(body)
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        results: [
          { index: 1, relevance_score: 0.99 },
          { index: 0, relevance_score: 0.2 }
        ]
      }));
    });
  });

  try {
    await withApp(async ({ app }) => {
      const reranked = await app.recall.rerankService.rerank('orm migration', [
        {
          title: 'Semantic first',
          text: 'migration checkpoint',
          retrieval_rank: 1,
          score: 0.91,
          baseScore: 0.91
        },
        {
          title: 'Remote preferred',
          text: 'orm stability note',
          retrieval_rank: 2,
          score: 0.75,
          baseScore: 0.75
        }
      ], 2);

      assert.equal(reranked.mode, 'remote');
      assert.equal(reranked.results[0].title, 'Remote preferred');
    }, {
      rerankUrl: rerankServer.baseUrl,
      rerankApiKey: 'test-key',
      rerankModel: 'test-rerank-model',
      rerankHeaders: {
        'x-test-header': 'candidate-phase-b'
      }
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].url, '/v1/rerank');
    assert.equal(requests[0].headers['x-test-header'], 'candidate-phase-b');
    assert.equal(requests[0].body.model, 'test-rerank-model');
    assert.equal(requests[0].body.documents.length, 2);
  } finally {
    await rerankServer.close();
  }
});

test('cohere rerank provider should use v2 path and cohere payload fields', async () => {
  const requests = [];
  const rerankServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      requests.push({
        url: req.url,
        headers: req.headers,
        body: JSON.parse(body)
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        results: [
          { index: 0, relevance_score: 0.88 }
        ]
      }));
    });
  });

  try {
    await withApp(async ({ app }) => {
      const reranked = await app.recall.rerankService.rerank('schema checkpoint', [
        { title: 'Schema checkpoint', text: 'schema checkpoint rollout', retrieval_rank: 1, score: 0.7, baseScore: 0.7 }
      ], 1);

      assert.equal(reranked.mode, 'remote');
      assert.equal(reranked.results.length, 1);
    }, {
      rerankProvider: 'cohere',
      rerankUrl: rerankServer.baseUrl,
      rerankApiKey: 'cohere-key',
      rerankModel: 'rerank-v4.0'
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/v2/rerank');
    assert.equal(requests[0].body.top_n, 1);
    assert.ok(Number.isInteger(requests[0].body.max_tokens_per_doc));
    assert.equal(requests[0].headers['x-client-name'], 'codex-memory');
  } finally {
    await rerankServer.close();
  }
});

test('jina rerank provider should keep v1 path and top_n payload', async () => {
  const requests = [];
  const rerankServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      requests.push({
        url: req.url,
        body: JSON.parse(body)
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        results: [
          { index: 0, relevance_score: 0.91 }
        ]
      }));
    });
  });

  try {
    await withApp(async ({ app }) => {
      const reranked = await app.recall.rerankService.rerank('jina rerank', [
        { title: 'Jina target', text: 'jina rerank target', retrieval_rank: 1, score: 0.4, baseScore: 0.4 }
      ], 1);

      assert.equal(reranked.mode, 'remote');
      assert.equal(reranked.results.length, 1);
    }, {
      rerankProvider: 'jina',
      rerankUrl: rerankServer.baseUrl,
      rerankApiKey: 'jina-key',
      rerankModel: 'jina-reranker-v2-base-multilingual'
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/v1/rerank');
    assert.equal(requests[0].body.top_n, 1);
  } finally {
    await rerankServer.close();
  }
});

test('jina embedding provider should use retrieval tasks and warm embedding cache', async () => {
  const requests = [];
  const embeddingServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      const parsed = JSON.parse(body);
      requests.push({
        url: req.url,
        body: parsed
      });
      const inputs = Array.isArray(parsed.input) ? parsed.input : [parsed.input];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: inputs.map((input, index) => ({
          index,
          embedding: input.includes('query') ? [0.9, 0.1] : [0.1, 0.9]
        }))
      }));
    });
  });

  try {
    await withApp(async ({ app }) => {
      const queryVector = await app.stores.vectorStore.getSingleEmbeddingCached('query text', { inputKind: 'query' });
      const documentVector = await app.stores.vectorStore.getSingleEmbeddingCached('document text', { inputKind: 'document' });
      const cachedAgain = await app.stores.vectorStore.getSingleEmbeddingCached('query text', { inputKind: 'query' });

      assert.deepEqual(queryVector, [0.9, 0.1]);
      assert.deepEqual(documentVector, [0.1, 0.9]);
      assert.deepEqual(cachedAgain, [0.9, 0.1]);
    }, {
      embedDimensions: 2,
      embeddingProvider: 'jina',
      embeddingUrl: embeddingServer.baseUrl,
      embeddingApiKey: 'embed-key',
      embeddingModel: 'jina-embeddings-v4'
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, '/v1/embeddings');
    assert.equal(requests[0].body.task, 'retrieval.query');
    assert.equal(requests[1].body.task, 'retrieval.passage');
  } finally {
    await embeddingServer.close();
  }
});

test('embedding config should infer 1024 dims for bge-m3 primary and nvidia fallback chain', async () => {
  await withApp(async ({ app }) => {
    assert.equal(app.config.embedDimensions, 1024);
    assert.equal(app.recall.externalEmbeddingAdapter.getEndpointCandidates().length, 2);
    assert.equal(app.recall.externalEmbeddingAdapter.getEndpointCandidates()[0].name, 'local-bge-m3');
    assert.equal(app.recall.externalEmbeddingAdapter.getEndpointCandidates()[1].name, 'nvidia-fallback');
  }, {
    localEmbeddingUrl: 'http://127.0.0.1:18081/',
    localEmbeddingModel: 'bge-m3-local',
    fallbackEmbeddingUrl: 'https://integrate.api.nvidia.com/',
    fallbackEmbeddingApiKey: 'nv-key',
    fallbackEmbeddingModel: 'baai/bge-m3'
  });
});

test('embedding fallback chain should try local bge first and then nvidia api', async () => {
  const localRequests = [];
  const fallbackRequests = [];
  const localServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      localRequests.push({
        url: req.url,
        headers: req.headers,
        body: JSON.parse(body)
      });
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'local embedding unavailable' }));
    });
  });
  const fallbackServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      fallbackRequests.push({
        url: req.url,
        headers: req.headers,
        body: JSON.parse(body)
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: [
          {
            index: 0,
            embedding: [0.2, 0.3, 0.4]
          }
        ]
      }));
    });
  });

  try {
    await withApp(async ({ app }) => {
      const vector = await app.stores.vectorStore.getSingleEmbeddingCached('fallback chain validation', { inputKind: 'query' });
      assert.deepEqual(vector, [0.2, 0.3, 0.4]);
    }, {
      embedDimensions: 3,
      localEmbeddingUrl: localServer.baseUrl,
      localEmbeddingModel: 'bge-m3-local',
      fallbackEmbeddingUrl: fallbackServer.baseUrl,
      fallbackEmbeddingApiKey: 'nv-key',
      fallbackEmbeddingModel: 'baai/bge-m3'
    });

    assert.equal(localRequests.length, 1);
    assert.equal(localRequests[0].url, '/v1/embeddings');
    assert.equal(localRequests[0].body.model, 'bge-m3-local');
    assert.equal(localRequests[0].headers.authorization, undefined);

    assert.equal(fallbackRequests.length, 1);
    assert.equal(fallbackRequests[0].url, '/v1/embeddings');
    assert.equal(fallbackRequests[0].body.model, 'baai/bge-m3');
    assert.equal(fallbackRequests[0].headers.authorization, 'Bearer nv-key');
  } finally {
    await localServer.close();
    await fallbackServer.close();
  }
});

test('embedding fallback chain should end on local hash when local bge and nvidia both fail', async () => {
  const failedServer = await startRerankServer((req, res) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream failure' }));
  });

  try {
    await withApp(async ({ app }) => {
      const vector = await app.stores.vectorStore.getSingleEmbeddingCached('final local hash fallback', { inputKind: 'document' });
      assert.ok(Array.isArray(vector));
      assert.equal(vector.length, 8);
      assert.ok(vector.some(value => value !== 0));
    }, {
      embedDimensions: 8,
      localEmbeddingUrl: failedServer.baseUrl,
      localEmbeddingModel: 'bge-m3-local',
      fallbackEmbeddingUrl: failedServer.baseUrl,
      fallbackEmbeddingApiKey: 'nv-key',
      fallbackEmbeddingModel: 'baai/bge-m3'
    });
  } finally {
    await failedServer.close();
  }
});

test('voyage rerank provider should use voyage payload fields', async () => {
  const requests = [];
  const rerankServer = await startRerankServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      requests.push({
        url: req.url,
        body: JSON.parse(body)
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: [
          { index: 1, relevance: 0.97 },
          { index: 0, relevance: 0.15 }
        ]
      }));
    });
  });

  try {
    await withApp(async ({ app }) => {
      const reranked = await app.recall.rerankService.rerank('orm migration', [
        { title: 'Schema', text: 'schema checkpoint', retrieval_rank: 1, score: 0.8, baseScore: 0.8 },
        { title: 'ORM', text: 'orm migration checkpoint', retrieval_rank: 2, score: 0.6, baseScore: 0.6 }
      ], 2);

      assert.equal(reranked.mode, 'remote');
      assert.equal(reranked.results[0].title, 'ORM');
    }, {
      rerankProvider: 'voyage',
      rerankUrl: rerankServer.baseUrl,
      rerankApiKey: 'voyage-key',
      rerankModel: 'rerank-2.5'
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/v1/rerank');
    assert.equal(requests[0].body.top_k, 2);
    assert.equal(requests[0].body.truncation, true);
    assert.equal(requests[0].body.top_n, undefined);
  } finally {
    await rerankServer.close();
  }
});

test('knowledge base sync should rebuild diary enhanced vectors and expose diary scores in candidates', async () => {
  await withApp(async ({ app }) => {
    const ctx = codexRequestContext();

    await app.callTool('record_memory', {
      target: 'process',
      title: 'Process checkpoint',
      content: 'checkpoint pipeline dual write',
      evidence: 'enhanced vector process',
      validated: true,
      reusable: false,
      tags: ['pipeline'],
      sensitivity: 'none'
    }, ctx);

    await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Knowledge contract',
      content: 'validated mcp contract compatibility',
      evidence: 'enhanced vector knowledge',
      validated: true,
      reusable: true,
      tags: ['mcp', 'contract'],
      sensitivity: 'none'
    }, ctx);

    const sync = await app.recall.knowledgeBaseSyncService.syncTarget('both', { force: true });
    assert.equal(sync.diaryVectorWrites, 2);

    const analysis = app.recall.tagMemoEngine.analyzeQuery({
      rawQuery: 'mcp contract',
      query: 'mcp contract',
      passiveBlocks: ['mcp contract'],
      directives: {},
      timeRanges: []
    });

    const candidates = await app.recall.candidateGenerator.generate({
      target: 'both',
      queryText: 'mcp contract',
      queryAnalysis: analysis,
      directives: {},
      limit: 5,
      syncToken: sync.syncToken
    });

    const vectorHealth = await app.stores.vectorStore.getHealth();
    assert.equal(vectorHealth.diaryVectorCount, 2);
    assert.ok(candidates.semanticCandidates.length >= 1);
    assert.ok(typeof candidates.semanticCandidates[0].diaryScore === 'number');
  });
});
