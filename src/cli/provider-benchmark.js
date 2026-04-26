#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const { parseJsonObject } = require('../config/createConfig');
const { ExternalEmbeddingAdapter } = require('../recall/ExternalEmbeddingAdapter');
const { VectorIndexStore, cosineSimilarity } = require('../storage/VectorIndexStore');

const SUPPORTED_PROVIDERS = ['local', 'bge-m3-local', 'cohere', 'voyage', 'jina', 'nvidia'];
const DEFAULT_DATASET_PATH = path.resolve(__dirname, '../../benchmarks/default-dataset.json');
const PROVIDER_DEFAULTS = {
  'bge-m3-local': {
    url: 'http://127.0.0.1:18081/',
    model: 'bge-m3-local',
    path: 'v1/embeddings',
    requiresApiKey: false
  },
  cohere: {
    url: 'https://api.cohere.com/',
    model: 'embed-v4.0',
    requiresApiKey: true
  },
  voyage: {
    url: 'https://api.voyageai.com/',
    model: 'voyage-4-large',
    requiresApiKey: true
  },
  jina: {
    url: 'https://api.jina.ai/',
    model: 'jina-embeddings-v4',
    requiresApiKey: true
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/',
    model: 'baai/bge-m3',
    requiresApiKey: true
  }
};

function getProviderEnvSegment(provider) {
  return String(provider || '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function parseArgs(argv) {
  const options = {
    json: false,
    datasetPath: path.resolve(process.cwd(), readEnv('CODEX_MEMORY_BENCH_DATASET') || DEFAULT_DATASET_PATH),
    providers: null,
    topK: 5,
    explicitProviders: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--dataset') {
      options.datasetPath = path.resolve(process.cwd(), argv[index + 1] || DEFAULT_DATASET_PATH);
      index += 1;
      continue;
    }
    if (token === '--providers') {
      options.providers = String(argv[index + 1] || '')
        .split(',')
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
      options.explicitProviders = true;
      index += 1;
      continue;
    }
    if (token === '--top-k') {
      const parsed = Number.parseInt(String(argv[index + 1] || ''), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.topK = parsed;
      }
      index += 1;
    }
  }

  return options;
}

function ensureSupportedProviders(providers = []) {
  const normalized = [];
  for (const provider of providers) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    if (!normalized.includes(provider)) {
      normalized.push(provider);
    }
  }
  if (!normalized.includes('local')) {
    normalized.unshift('local');
  }
  return normalized;
}

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function readFirstEnv(names = []) {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return '';
}

function resolveProviderApiKey(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  return readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBEDDING_API_KEY`,
    genericProvider === provider ? 'CODEX_MEMORY_EMBEDDING_API_KEY' : '',
    provider === 'nvidia' ? 'CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY' : '',
    provider === 'nvidia' ? 'EMBEDDING_FALLBACK_API_KEY' : '',
    provider === 'nvidia' ? 'NVIDIA_API_KEY' : '',
    provider === 'cohere' ? 'COHERE_API_KEY' : '',
    provider === 'voyage' ? 'VOYAGE_API_KEY' : '',
    provider === 'jina' ? 'JINA_API_KEY' : ''
  ].filter(Boolean));
}

function resolveProviderUrl(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  return readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBEDDING_URL`,
    genericProvider === provider ? 'CODEX_MEMORY_EMBEDDING_URL' : '',
    provider === 'nvidia' ? 'CODEX_MEMORY_FALLBACK_EMBEDDING_URL' : '',
    provider === 'nvidia' ? 'EMBEDDING_FALLBACK_API_URL' : ''
  ].filter(Boolean)) || PROVIDER_DEFAULTS[provider]?.url || '';
}

function resolveProviderModel(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  return readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBEDDING_MODEL`,
    genericProvider === provider ? 'CODEX_MEMORY_EMBEDDING_MODEL' : '',
    provider === 'nvidia' ? 'CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL' : '',
    provider === 'nvidia' ? 'EMBEDDING_FALLBACK_MODEL' : ''
  ].filter(Boolean)) || PROVIDER_DEFAULTS[provider]?.model || '';
}

function resolveProviderPath(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  return readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBEDDING_PATH`,
    genericProvider === provider ? 'CODEX_MEMORY_EMBEDDING_PATH' : ''
  ].filter(Boolean)) || PROVIDER_DEFAULTS[provider]?.path || '';
}

function resolveProviderHeaders(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  const raw = readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBEDDING_HEADERS_JSON`,
    genericProvider === provider ? 'CODEX_MEMORY_EMBEDDING_HEADERS_JSON' : ''
  ].filter(Boolean));
  return parseJsonObject(raw, {});
}

function resolveProviderTimeoutMs(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  const value = readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBEDDING_TIMEOUT_MS`,
    genericProvider === provider ? 'CODEX_MEMORY_EMBEDDING_TIMEOUT_MS' : '',
    'CODEX_MEMORY_BENCH_EMBEDDING_TIMEOUT_MS'
  ].filter(Boolean));
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 15000;
}

function resolveRequestedDimensions(provider) {
  const providerName = getProviderEnvSegment(provider);
  const genericProvider = readEnv('CODEX_MEMORY_EMBEDDING_PROVIDER');
  const value = readFirstEnv([
    `CODEX_MEMORY_BENCH_${providerName}_EMBED_DIMS`,
    provider === 'local' ? 'CODEX_MEMORY_BENCH_LOCAL_EMBED_DIMS' : '',
    provider === 'local' ? 'CODEX_MEMORY_EMBED_DIMS' : (genericProvider === provider ? 'CODEX_MEMORY_EMBED_DIMS' : ''),
    'CODEX_MEMORY_BENCH_EMBED_DIMS'
  ].filter(Boolean));
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveRemoteProviderConfig(provider) {
  const defaults = PROVIDER_DEFAULTS[provider] || {};
  const apiKey = resolveProviderApiKey(provider);
  const url = resolveProviderUrl(provider);
  const model = resolveProviderModel(provider);
  const pathOverride = resolveProviderPath(provider);
  const headers = resolveProviderHeaders(provider);
  const timeoutMs = resolveProviderTimeoutMs(provider);
  const requestedDimensions = resolveRequestedDimensions(provider);
  const missing = [];
  const requiresApiKey = defaults.requiresApiKey !== false;

  if (requiresApiKey && !apiKey) missing.push('embedding api key');
  if (!url) missing.push('embedding url');
  if (!model) missing.push('embedding model');

  return {
    provider,
    configured: missing.length === 0,
    missing,
    config: {
      embeddingProvider: provider,
      embeddingUrl: url,
      embeddingApiKey: apiKey,
      embeddingModel: model,
      embeddingPath: pathOverride || 'v1/embeddings',
      embeddingHeaders: headers,
      embeddingTimeoutMs: timeoutMs,
      embedDimensions: requestedDimensions
    },
    requiresApiKey
  };
}

function discoverProviders() {
  const discovered = ['local'];
  for (const provider of SUPPORTED_PROVIDERS) {
    if (provider === 'local') continue;
    const resolved = resolveRemoteProviderConfig(provider);
    if (resolved.configured) {
      discovered.push(provider);
    }
  }
  return discovered;
}

async function loadDataset(datasetPath) {
  const raw = await fs.readFile(datasetPath, 'utf8');
  const parsed = JSON.parse(raw);
  const documents = Array.isArray(parsed.documents) ? parsed.documents : [];
  const queries = Array.isArray(parsed.queries) ? parsed.queries : [];
  const seenDocumentIds = new Set();
  const seenQueryIds = new Set();

  if (documents.length === 0) {
    throw new Error('Benchmark dataset must include at least one document');
  }
  if (queries.length === 0) {
    throw new Error('Benchmark dataset must include at least one query');
  }

  for (const document of documents) {
    if (!document || typeof document.id !== 'string' || !document.id.trim()) {
      throw new Error('Benchmark document is missing a valid id');
    }
    if (seenDocumentIds.has(document.id)) {
      throw new Error(`Duplicate benchmark document id: ${document.id}`);
    }
    seenDocumentIds.add(document.id);
    if (typeof document.text !== 'string' || !document.text.trim()) {
      throw new Error(`Benchmark document ${document.id} is missing text`);
    }
  }

  for (const query of queries) {
    if (!query || typeof query.id !== 'string' || !query.id.trim()) {
      throw new Error('Benchmark query is missing a valid id');
    }
    if (seenQueryIds.has(query.id)) {
      throw new Error(`Duplicate benchmark query id: ${query.id}`);
    }
    seenQueryIds.add(query.id);
    if (typeof query.query !== 'string' || !query.query.trim()) {
      throw new Error(`Benchmark query ${query.id} is missing query text`);
    }
    if (!Array.isArray(query.relevant) || query.relevant.length === 0) {
      throw new Error(`Benchmark query ${query.id} is missing relevant document ids`);
    }
    for (const documentId of query.relevant) {
      if (!seenDocumentIds.has(documentId)) {
        throw new Error(`Benchmark query ${query.id} references unknown document id: ${documentId}`);
      }
    }
  }

  return {
    name: parsed.name || path.basename(datasetPath),
    description: parsed.description || '',
    documents,
    queries
  };
}

function createLocalEmbedder() {
  const requestedDimensions = resolveRequestedDimensions('local') || 64;
  const store = new VectorIndexStore({
    embedDimensions: requestedDimensions
  });

  return {
    provider: 'local',
    model: 'local-hash',
    endpoint: 'local://hash-embedding',
    requestedDimensions,
    async embedBatch(texts) {
      return texts.map(text => store.embedText(text));
    },
    async embedSingle(text, inputKind) {
      return store.embedText(text, { inputKind });
    }
  };
}

function createRemoteEmbedder(provider) {
  const resolved = resolveRemoteProviderConfig(provider);
  if (!resolved.configured) {
    return {
      provider,
      configured: false,
      reason: `Missing ${resolved.missing.join(', ')}`
    };
  }

  if (!resolved.requiresApiKey) {
    const endpoint = new URL(
      resolved.config.embeddingPath,
      resolved.config.embeddingUrl.endsWith('/')
        ? resolved.config.embeddingUrl
        : `${resolved.config.embeddingUrl}/`
    ).toString();

    async function embedBatchWithoutAuth(texts, inputKind) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), resolved.config.embeddingTimeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...resolved.config.embeddingHeaders
          },
          body: JSON.stringify({
            model: resolved.config.embeddingModel,
            input: texts,
            input_type: inputKind
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        return rows.map(item => item.embedding);
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      provider,
      configured: true,
      model: resolved.config.embeddingModel,
      endpoint,
      requestedDimensions: resolved.config.embedDimensions || null,
      async embedBatch(texts, inputKind) {
        return embedBatchWithoutAuth(texts, inputKind);
      },
      async embedSingle(text, inputKind) {
        const [vector] = await embedBatchWithoutAuth([text], inputKind);
        return vector;
      }
    };
  }

  const adapter = new ExternalEmbeddingAdapter(resolved.config);
  return {
    provider,
    configured: true,
    model: resolved.config.embeddingModel,
    endpoint: new URL(adapter.resolvePath(provider), resolved.config.embeddingUrl.endsWith('/')
      ? resolved.config.embeddingUrl
      : `${resolved.config.embeddingUrl}/`).toString(),
    requestedDimensions: resolved.config.embedDimensions || null,
    async embedBatch(texts, inputKind) {
      return adapter.embedBatch(texts, { inputKind });
    },
    async embedSingle(text, inputKind) {
      const [vector] = await adapter.embedBatch([text], { inputKind });
      return vector;
    }
  };
}

function buildProviderEmbedder(provider) {
  if (provider === 'local') {
    return createLocalEmbedder();
  }
  return createRemoteEmbedder(provider);
}

function rankDocuments(queryVector, documents, documentVectors) {
  return documents
    .map((document, index) => ({
      id: document.id,
      score: cosineSimilarity(queryVector, documentVectors[index]),
      text: document.text
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.id.localeCompare(right.id);
    });
}

function roundMetric(value) {
  return Number(value.toFixed(6));
}

function summarizeMetrics(queryReports, topK) {
  const total = queryReports.length;
  const totals = {
    top1Accuracy: 0,
    recallAt3: 0,
    recallAt5: 0,
    recallAtK: 0,
    mrr: 0,
    averageFirstRelevantRank: 0
  };
  let rankedQueries = 0;

  for (const report of queryReports) {
    totals.top1Accuracy += report.topHitRelevant ? 1 : 0;
    totals.recallAt3 += report.recallAt3 ? 1 : 0;
    totals.recallAt5 += report.recallAt5 ? 1 : 0;
    totals.recallAtK += report.recallAtK ? 1 : 0;
    totals.mrr += report.reciprocalRank;
    if (report.firstRelevantRank !== null) {
      rankedQueries += 1;
      totals.averageFirstRelevantRank += report.firstRelevantRank;
    }
  }

  return {
    topK,
    top1Accuracy: roundMetric(totals.top1Accuracy / total),
    recallAt3: roundMetric(totals.recallAt3 / total),
    recallAt5: roundMetric(totals.recallAt5 / total),
    recallAtK: roundMetric(totals.recallAtK / total),
    mrr: roundMetric(totals.mrr / total),
    averageFirstRelevantRank: rankedQueries > 0
      ? roundMetric(totals.averageFirstRelevantRank / rankedQueries)
      : null
  };
}

function buildQueryReport(query, ranked, topK) {
  const relevant = new Set(query.relevant);
  const firstRelevantIndex = ranked.findIndex(item => relevant.has(item.id));
  const firstRelevantRank = firstRelevantIndex >= 0 ? firstRelevantIndex + 1 : null;
  const topCandidates = ranked.slice(0, topK).map(item => ({
    id: item.id,
    score: roundMetric(item.score),
    relevant: relevant.has(item.id)
  }));

  return {
    id: query.id,
    query: query.query,
    relevant: [...relevant],
    firstRelevantRank,
    reciprocalRank: firstRelevantRank ? roundMetric(1 / firstRelevantRank) : 0,
    topHitRelevant: topCandidates[0]?.relevant || false,
    recallAt3: ranked.slice(0, 3).some(item => relevant.has(item.id)),
    recallAt5: ranked.slice(0, 5).some(item => relevant.has(item.id)),
    recallAtK: topCandidates.some(item => item.relevant),
    topCandidates
  };
}

function buildDeltaAgainstLocal(localResult, providerResult) {
  if (!localResult || localResult.status !== 'ok') {
    return {
      status: 'skipped',
      reason: 'local baseline is unavailable'
    };
  }
  if (!providerResult || providerResult.status !== 'ok') {
    return {
      status: 'skipped',
      reason: providerResult?.reason || providerResult?.error || 'provider result is unavailable'
    };
  }

  const localByQuery = new Map(localResult.queries.map(query => [query.id, query]));
  const improvedQueries = [];
  const regressedQueries = [];
  const sameQueries = [];

  for (const providerQuery of providerResult.queries) {
    const localQuery = localByQuery.get(providerQuery.id);
    if (!localQuery) continue;

    const localRank = localQuery.firstRelevantRank ?? Number.POSITIVE_INFINITY;
    const providerRank = providerQuery.firstRelevantRank ?? Number.POSITIVE_INFINITY;

    if (providerRank < localRank) {
      improvedQueries.push(providerQuery.id);
      continue;
    }
    if (providerRank > localRank) {
      regressedQueries.push(providerQuery.id);
      continue;
    }
    sameQueries.push(providerQuery.id);
  }

  return {
    status: 'ok',
    baseline: 'local',
    top1AccuracyDelta: roundMetric(providerResult.metrics.top1Accuracy - localResult.metrics.top1Accuracy),
    recallAt3Delta: roundMetric(providerResult.metrics.recallAt3 - localResult.metrics.recallAt3),
    recallAt5Delta: roundMetric(providerResult.metrics.recallAt5 - localResult.metrics.recallAt5),
    recallAtKDelta: roundMetric(providerResult.metrics.recallAtK - localResult.metrics.recallAtK),
    mrrDelta: roundMetric(providerResult.metrics.mrr - localResult.metrics.mrr),
    averageFirstRelevantRankDelta: localResult.metrics.averageFirstRelevantRank === null
      || providerResult.metrics.averageFirstRelevantRank === null
      ? null
      : roundMetric(providerResult.metrics.averageFirstRelevantRank - localResult.metrics.averageFirstRelevantRank),
    improvedQueries,
    regressedQueries,
    sameQueries
  };
}

async function benchmarkProvider(provider, dataset, options) {
  const embedder = buildProviderEmbedder(provider);
  if (!embedder.configured && provider !== 'local') {
    return {
      status: 'skipped',
      provider,
      reason: embedder.reason
    };
  }

  const topK = Math.min(options.topK, dataset.documents.length);
  const documentTexts = dataset.documents.map(document => document.text);
  const providerStartedAt = performance.now();

  try {
    const documentStart = performance.now();
    const documentVectors = await embedder.embedBatch(documentTexts, 'document');
    const documentBatchMs = roundMetric(performance.now() - documentStart);
    if (!Array.isArray(documentVectors) || documentVectors.length !== dataset.documents.length) {
      throw new Error('Document embedding batch returned an unexpected result shape');
    }

    const queries = [];
    let totalQueryLatencyMs = 0;

    for (const query of dataset.queries) {
      const queryStart = performance.now();
      const queryVector = await embedder.embedSingle(query.query, 'query');
      const queryLatencyMs = roundMetric(performance.now() - queryStart);
      totalQueryLatencyMs += queryLatencyMs;

      const ranked = rankDocuments(queryVector, dataset.documents, documentVectors);
      queries.push({
        ...buildQueryReport(query, ranked, topK),
        queryLatencyMs
      });
    }

    const vectorDimensions = documentVectors.find(Array.isArray)?.length
      || queries.find(query => Array.isArray(query.queryVector))?.queryVector?.length
      || null;

    return {
      status: 'ok',
      provider,
      model: embedder.model,
      endpoint: embedder.endpoint,
      requestedDimensions: embedder.requestedDimensions,
      vectorDimensions,
      latency: {
        documentBatchMs,
        totalQueryLatencyMs: roundMetric(totalQueryLatencyMs),
        averageQueryLatencyMs: roundMetric(totalQueryLatencyMs / dataset.queries.length),
        totalBenchmarkMs: roundMetric(performance.now() - providerStartedAt)
      },
      metrics: summarizeMetrics(queries, topK),
      queries
    };
  } catch (error) {
    return {
      status: 'error',
      provider,
      model: embedder.model || null,
      endpoint: embedder.endpoint || null,
      error: error.message
    };
  }
}

function buildSummary(selectedProviders, results, explicitProviders) {
  const failed = [];

  for (const provider of selectedProviders) {
    const status = results[provider]?.status;
    if (status !== 'ok') {
      failed.push(provider);
    }
  }

  const remoteOkCount = selectedProviders
    .filter(provider => provider !== 'local')
    .filter(provider => results[provider]?.status === 'ok').length;

  if (failed.length === 0) {
    return {
      ok: true,
      complete: true,
      baseline: 'local',
      message: remoteOkCount > 0
        ? `Benchmark completed for local and ${remoteOkCount} remote provider(s).`
        : 'Benchmark completed for the local baseline only.'
    };
  }

  if (!explicitProviders && failed.length > 0 && selectedProviders.length === 1 && selectedProviders[0] === 'local') {
    return {
      ok: true,
      complete: true,
      baseline: 'local',
      message: 'Benchmark completed for the local baseline only.'
    };
  }

  return {
    ok: false,
    complete: false,
    baseline: 'local',
    message: `Benchmark is incomplete for: ${failed.join(', ')}.`
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message,
    `dataset: ${report.dataset.name} (${report.dataset.documentCount} docs / ${report.dataset.queryCount} queries)`,
    `providers: ${report.selectedProviders.join(', ')}`,
    `topK: ${report.topK}`
  ];

  for (const provider of report.selectedProviders) {
    const payload = report.providers[provider];
    lines.push('');
    lines.push(`[${provider}] status=${payload.status}`);
    if (payload.status !== 'ok') {
      lines.push(`  reason: ${payload.reason || payload.error}`);
      continue;
    }
    lines.push(`  model: ${payload.model}`);
    lines.push(`  endpoint: ${payload.endpoint}`);
    lines.push(`  dimensions: ${payload.vectorDimensions}`);
    lines.push(`  top1Accuracy: ${payload.metrics.top1Accuracy}`);
    lines.push(`  recallAt3: ${payload.metrics.recallAt3}`);
    lines.push(`  recallAt5: ${payload.metrics.recallAt5}`);
    lines.push(`  recallAtK: ${payload.metrics.recallAtK}`);
    lines.push(`  mrr: ${payload.metrics.mrr}`);
    lines.push(`  avgQueryLatencyMs: ${payload.latency.averageQueryLatencyMs}`);

    if (provider !== 'local' && report.deltas[provider]?.status === 'ok') {
      const delta = report.deltas[provider];
      lines.push(`  delta.top1Accuracy: ${delta.top1AccuracyDelta}`);
      lines.push(`  delta.mrr: ${delta.mrrDelta}`);
      lines.push(`  delta.improvedQueries: ${delta.improvedQueries.join(', ') || '-'}`);
      lines.push(`  delta.regressedQueries: ${delta.regressedQueries.join(', ') || '-'}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dataset = await loadDataset(options.datasetPath);
  const selectedProviders = ensureSupportedProviders(options.providers || discoverProviders());
  const results = {};

  for (const provider of selectedProviders) {
    results[provider] = await benchmarkProvider(provider, dataset, options);
  }

  const deltas = {};
  for (const provider of selectedProviders) {
    if (provider === 'local') continue;
    deltas[provider] = buildDeltaAgainstLocal(results.local, results[provider]);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dataset: {
      path: options.datasetPath,
      name: dataset.name,
      description: dataset.description,
      documentCount: dataset.documents.length,
      queryCount: dataset.queries.length
    },
    summary: buildSummary(selectedProviders, results, options.explicitProviders),
    baseline: 'local',
    selectedProviders,
    topK: Math.min(options.topK, dataset.documents.length),
    providers: results,
    deltas
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatTextReport(report));
  }

  if (!report.summary.ok) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
