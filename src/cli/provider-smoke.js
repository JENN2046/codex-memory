#!/usr/bin/env node
const { createCodexMemoryApplication } = require('../app');

function parseArgs(argv) {
  const options = {
    json: false,
    embeddingOnly: false,
    rerankOnly: false,
    query: '',
    documents: [],
    topK: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--embedding-only') {
      options.embeddingOnly = true;
      continue;
    }
    if (token === '--rerank-only') {
      options.rerankOnly = true;
      continue;
    }
    if (token === '--query') {
      options.query = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--documents') {
      options.documents = String(argv[index + 1] || '')
        .split('||')
        .map(item => item.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (token === '--top-k') {
      options.topK = Number.parseInt(String(argv[index + 1] || ''), 10);
      index += 1;
    }
  }

  return options;
}

function buildSampleDocuments(documents = []) {
  const normalized = Array.isArray(documents) ? documents.filter(Boolean) : [];
  if (normalized.length > 0) return normalized;
  return [
    'Codex memory migration keeps diary compatibility while introducing independent shadow indexing.',
    'A rerank provider refines candidate ordering after vector retrieval.'
  ];
}

function resolveSelectedChecks(options, app) {
  const selected = [];
  if (options.embeddingOnly) {
    selected.push('embedding');
  }
  if (options.rerankOnly) {
    selected.push('rerank');
  }
  if (selected.length > 0) return selected;

  if (app.recall.externalEmbeddingAdapter.isConfigured()) {
    selected.push('embedding');
  }
  if (app.recall.externalRerankAdapter.isConfigured()) {
    selected.push('rerank');
  }

  return selected;
}

async function runEmbeddingSmoke(app, options) {
  const adapter = app.recall.externalEmbeddingAdapter;
  if (!adapter.isConfigured()) {
    return {
      status: 'skipped',
      reason: 'embedding provider is not configured'
    };
  }

  const query = options.query || 'codex memory migration query';
  const documents = buildSampleDocuments(options.documents);
  const startedAt = Date.now();
  const queryVector = await app.stores.vectorStore.getSingleEmbeddingCached(query, { inputKind: 'query' });
  const documentVector = await app.stores.vectorStore.getSingleEmbeddingCached(documents[0], { inputKind: 'document' });
  const health = await app.stores.vectorStore.getHealth();
  const endpoints = adapter.getEndpointCandidates().map(endpoint => ({
    name: endpoint.name,
    provider: adapter.resolveProvider(endpoint),
    model: endpoint.model,
    endpoint: adapter.getEndpointUrl(endpoint)
  }));
  const primaryEndpoint = adapter.getPrimaryEndpoint();

  return {
    status: Array.isArray(queryVector) && Array.isArray(documentVector) ? 'ok' : 'error',
    provider: adapter.resolveProvider(primaryEndpoint),
    endpoint: adapter.getEndpointUrl(primaryEndpoint),
    endpoints,
    fallbackCount: Math.max(endpoints.length - 1, 0),
    queryDimensions: Array.isArray(queryVector) ? queryVector.length : 0,
    documentDimensions: Array.isArray(documentVector) ? documentVector.length : 0,
    cache: {
      embeddingCacheCount: health.embeddingCacheCount,
      embeddingHits: health.embeddingHits,
      embeddingMisses: health.embeddingMisses
    },
    durationMs: Date.now() - startedAt
  };
}

async function runRerankSmoke(app, options) {
  const adapter = app.recall.externalRerankAdapter;
  if (!adapter.isConfigured()) {
    return {
      status: 'skipped',
      reason: 'rerank provider is not configured'
    };
  }

  const query = options.query || 'codex memory migration query';
  const documents = buildSampleDocuments(options.documents);
  const topK = Number.isInteger(options.topK) && options.topK > 0
    ? options.topK
    : Math.min(documents.length, 3);
  const startedAt = Date.now();
  const result = await app.recall.rerankService.rerank(query, documents.map((text, index) => ({
    title: `doc-${index + 1}`,
    text,
    retrieval_rank: index + 1,
    score: 1 - index * 0.1,
    baseScore: 1 - index * 0.1
  })), topK);

  return {
    status: Array.isArray(result.results) && result.results.length > 0 ? 'ok' : 'error',
    provider: adapter.resolveProvider(),
    endpoint: adapter.getEndpointUrl(),
    mode: result.mode,
    successRate: result.successRate,
    topTitle: result.results?.[0]?.title || null,
    topScore: result.results?.[0]?.score ?? null,
    durationMs: Date.now() - startedAt
  };
}

function buildOverallStatus(selectedChecks, results) {
  if (selectedChecks.length === 0) {
    return {
      ok: false,
      message: 'No remote embedding or rerank provider is configured.'
    };
  }

  const failed = selectedChecks.filter(check => results[check]?.status !== 'ok');
  return {
    ok: failed.length === 0,
    message: failed.length === 0
      ? `Smoke checks passed for ${selectedChecks.join(', ')}.`
      : `Smoke checks failed for ${failed.join(', ')}.`
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message
  ];

  for (const [name, payload] of Object.entries(report.results)) {
    lines.push('');
    lines.push(`[${name}] status=${payload.status}`);
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'status') continue;
      lines.push(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = createCodexMemoryApplication();
  await app.initialize();

  try {
    const selectedChecks = resolveSelectedChecks(options, app);
    const results = {};

    if (selectedChecks.includes('embedding')) {
      results.embedding = await runEmbeddingSmoke(app, options);
    }
    if (selectedChecks.includes('rerank')) {
      results.rerank = await runRerankSmoke(app, options);
    }

    const summary = buildOverallStatus(selectedChecks, results);
    const report = {
      generatedAt: new Date().toISOString(),
      summary,
      selectedChecks,
      results
    };

    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(formatTextReport(report));
    }

    if (!summary.ok) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
