const path = require('node:path');

const {
  CANDIDATE_CACHE_FILE_NAME,
  CHAT_INDEX_FILE_NAME,
  SERVER_VERSION,
  SQLITE_FILE_NAME,
  VECTOR_INDEX_FILE_NAME,
  WRITE_AUDIT_FILE_NAME,
  RECALL_AUDIT_FILE_NAME
} = require('../core/constants');
const { getEmbeddingFingerprint } = require('./embeddingFingerprint');
const { applyRagProfileToConfig, loadRagProfileConfig } = require('./ragProfileConfig');

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function resolveAbsolutePath(basePath, inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;
  return path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(basePath, inputPath);
}

function parseJsonObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value
      .map(item => String(item || '').trim())
      .filter(Boolean))];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return [...new Set(value
    .split(/[,|，]/)
    .map(item => item.trim())
    .filter(Boolean))];
}

function normalizeLightMemoDirectoryMap(value) {
  const source = parseJsonObject(value, {});
  const output = {};

  for (const [rawKey, rawRule] of Object.entries(source)) {
    const key = String(rawKey || '').trim().toLowerCase();
    if (!key) continue;

    if (typeof rawRule === 'string') {
      output[key] = {
        any: [rawRule.trim().toLowerCase()],
        all: []
      };
      continue;
    }

    if (Array.isArray(rawRule)) {
      output[key] = {
        any: [],
        all: normalizeStringList(rawRule).map(item => item.toLowerCase())
      };
      continue;
    }

    if (rawRule && typeof rawRule === 'object') {
      output[key] = {
        any: normalizeStringList(rawRule.any ?? rawRule.includes ?? rawRule.or ?? rawRule.folders).map(item => item.toLowerCase()),
        all: normalizeStringList(rawRule.all ?? rawRule.segments ?? rawRule.path ?? rawRule.and).map(item => item.toLowerCase())
      };
    }
  }

  return output;
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeHttpPath(value, fallback = '/mcp/codex-memory') {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const prefixed = value.startsWith('/') ? value : `/${value}`;
  if (prefixed.length > 1 && prefixed.endsWith('/')) {
    return prefixed.replace(/\/+$/, '');
  }
  return prefixed;
}

function normalizeProvider(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function inferEmbeddingDimensions(model) {
  const normalizedModel = String(model || '').trim().toLowerCase();
  if (!normalizedModel) return null;
  if (normalizedModel.includes('bge-m3')) return 1024;
  return null;
}

function buildEmbeddingEndpoint({
  name,
  provider,
  url,
  apiKey,
  model,
  endpointPath,
  headers,
  timeoutMs,
  dimensions,
  defaultProvider = '',
  defaultPath = 'v1/embeddings',
  defaultTimeoutMs = 15000
}) {
  if (!url || !model) {
    return null;
  }

  return {
    name,
    provider: normalizeProvider(provider) || normalizeProvider(defaultProvider),
    url,
    apiKey: apiKey || '',
    model,
    path: endpointPath || defaultPath,
    headers: parseJsonObject(headers, {}),
    timeoutMs: parsePositiveInteger(timeoutMs, defaultTimeoutMs),
    dimensions: parsePositiveInteger(dimensions, inferEmbeddingDimensions(model))
  };
}

function createConfig(overrides = {}) {
  const basePath = resolveAbsolutePath(process.cwd(), overrides.projectBasePath || process.env.CODEX_MEMORY_BASE_PATH || process.cwd());
  const dataDir = resolveAbsolutePath(basePath, overrides.dataDir || process.env.CODEX_MEMORY_DATA_DIR || 'data');
  const logsDir = resolveAbsolutePath(basePath, overrides.logsDir || process.env.CODEX_MEMORY_LOGS_DIR || 'logs');
  const dailyNoteRootPath = resolveAbsolutePath(
    basePath,
    overrides.dailyNoteRootPath || process.env.CODEX_MEMORY_DIARY_PATH || path.join(dataDir, 'dailynote')
  );
  const configuredEmbedDimensions = parsePositiveInteger(
    pickFirstNonEmpty(overrides.embedDimensions, process.env.CODEX_MEMORY_EMBED_DIMS),
    null
  );

  const legacyEmbeddingEndpoint = buildEmbeddingEndpoint({
    name: 'configured-primary',
    provider: overrides.embeddingProvider || process.env.CODEX_MEMORY_EMBEDDING_PROVIDER,
    url: overrides.embeddingUrl || process.env.CODEX_MEMORY_EMBEDDING_URL,
    apiKey: overrides.embeddingApiKey || process.env.CODEX_MEMORY_EMBEDDING_API_KEY,
    model: overrides.embeddingModel || process.env.CODEX_MEMORY_EMBEDDING_MODEL,
    endpointPath: overrides.embeddingPath || process.env.CODEX_MEMORY_EMBEDDING_PATH || 'v1/embeddings',
    headers: overrides.embeddingHeaders ?? process.env.CODEX_MEMORY_EMBEDDING_HEADERS_JSON,
    timeoutMs: overrides.embeddingTimeoutMs || process.env.CODEX_MEMORY_EMBEDDING_TIMEOUT_MS || '15000',
    dimensions: configuredEmbedDimensions,
    defaultProvider: 'generic'
  });

  const localEmbeddingEndpoint = buildEmbeddingEndpoint({
    name: 'local-bge-m3',
    provider: overrides.localEmbeddingProvider || process.env.CODEX_MEMORY_LOCAL_EMBEDDING_PROVIDER,
    url: overrides.localEmbeddingUrl || process.env.CODEX_MEMORY_LOCAL_EMBEDDING_URL || process.env.EMBEDDING_API_URL,
    apiKey: overrides.localEmbeddingApiKey || process.env.CODEX_MEMORY_LOCAL_EMBEDDING_API_KEY || process.env.EMBEDDING_API_KEY,
    model: pickFirstNonEmpty(
      overrides.localEmbeddingModel,
      process.env.CODEX_MEMORY_LOCAL_EMBEDDING_MODEL,
      process.env.WhitelistEmbeddingModel,
      overrides.localEmbeddingUrl || process.env.CODEX_MEMORY_LOCAL_EMBEDDING_URL || process.env.EMBEDDING_API_URL ? 'bge-m3-local' : ''
    ),
    endpointPath: overrides.localEmbeddingPath || process.env.CODEX_MEMORY_LOCAL_EMBEDDING_PATH || 'v1/embeddings',
    headers: overrides.localEmbeddingHeaders ?? process.env.CODEX_MEMORY_LOCAL_EMBEDDING_HEADERS_JSON,
    timeoutMs: overrides.localEmbeddingTimeoutMs || process.env.CODEX_MEMORY_LOCAL_EMBEDDING_TIMEOUT_MS || '4000',
    dimensions: pickFirstNonEmpty(
      overrides.localEmbedDimensions,
      process.env.CODEX_MEMORY_LOCAL_EMBED_DIMS,
      process.env.VECTORDB_DIMENSION
    ),
    defaultProvider: 'bge-m3-local'
  });

  const fallbackEmbeddingEndpoint = buildEmbeddingEndpoint({
    name: 'nvidia-fallback',
    provider: overrides.fallbackEmbeddingProvider || process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_PROVIDER,
    url: overrides.fallbackEmbeddingUrl || process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_URL || process.env.EMBEDDING_FALLBACK_API_URL,
    apiKey: overrides.fallbackEmbeddingApiKey || process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY || process.env.EMBEDDING_FALLBACK_API_KEY,
    model: overrides.fallbackEmbeddingModel || process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL || process.env.EMBEDDING_FALLBACK_MODEL,
    endpointPath: overrides.fallbackEmbeddingPath || process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_PATH || 'v1/embeddings',
    headers: overrides.fallbackEmbeddingHeaders ?? process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_HEADERS_JSON,
    timeoutMs: overrides.fallbackEmbeddingTimeoutMs || process.env.CODEX_MEMORY_FALLBACK_EMBEDDING_TIMEOUT_MS || '12000',
    dimensions: pickFirstNonEmpty(
      overrides.fallbackEmbedDimensions,
      process.env.CODEX_MEMORY_FALLBACK_EMBED_DIMS,
      process.env.VECTORDB_DIMENSION
    ),
    defaultProvider: 'nvidia'
  });

  const embeddingEndpoints = [];
  const seenEmbeddingEndpoints = new Set();
  for (const endpoint of [legacyEmbeddingEndpoint, localEmbeddingEndpoint, fallbackEmbeddingEndpoint]) {
    if (!endpoint) continue;
    const dedupeKey = JSON.stringify({
      provider: endpoint.provider,
      url: endpoint.url,
      path: endpoint.path,
      model: endpoint.model
    });
    if (seenEmbeddingEndpoints.has(dedupeKey)) continue;
    seenEmbeddingEndpoints.add(dedupeKey);
    embeddingEndpoints.push(endpoint);
  }

  const activeEmbeddingEndpoint = embeddingEndpoints[0] || {
    name: '',
    provider: '',
    url: '',
    apiKey: '',
    model: '',
    path: 'v1/embeddings',
    headers: {},
    timeoutMs: 15000,
    dimensions: null
  };
  const inferredEmbedDimensions = parsePositiveInteger(
    pickFirstNonEmpty(
      configuredEmbedDimensions,
      activeEmbeddingEndpoint.dimensions,
      localEmbeddingEndpoint?.dimensions,
      fallbackEmbeddingEndpoint?.dimensions,
      process.env.VECTORDB_DIMENSION
    ),
    64
  );
  const embeddingProfileVersion = String(pickFirstNonEmpty(
    overrides.embeddingProfileVersion,
    process.env.CODEX_MEMORY_EMBEDDING_PROFILE_VERSION,
    process.env.EMBEDDING_PROFILE_VERSION,
    'v1'
  ));
  const embeddingFingerprint = getEmbeddingFingerprint({
    provider: activeEmbeddingEndpoint.provider || 'local',
    model: activeEmbeddingEndpoint.model || (activeEmbeddingEndpoint.url ? 'external-chain' : 'local-hash'),
    dimension: inferredEmbedDimensions,
    version: embeddingProfileVersion
  });
  const embeddingProfileDir = path.join(dataDir, 'embedding-profiles', embeddingFingerprint);
  const vectorIndexPath = resolveAbsolutePath(
    basePath,
    overrides.vectorIndexPath || process.env.CODEX_MEMORY_VECTOR_PATH || path.join(embeddingProfileDir, VECTOR_INDEX_FILE_NAME)
  );

  const baseConfig = {
    projectBasePath: basePath,
    dataDir,
    logsDir,
    dailyNoteRootPath,
    auditLogPath: resolveAbsolutePath(
      basePath,
      overrides.auditLogPath || process.env.CODEX_MEMORY_AUDIT_LOG || path.join(logsDir, WRITE_AUDIT_FILE_NAME)
    ),
    recallLogPath: resolveAbsolutePath(
      basePath,
      overrides.recallLogPath || process.env.CODEX_MEMORY_RECALL_LOG || path.join(logsDir, RECALL_AUDIT_FILE_NAME)
    ),
    dbPath: resolveAbsolutePath(
      basePath,
      overrides.dbPath || process.env.CODEX_MEMORY_DB_PATH || path.join(dataDir, SQLITE_FILE_NAME)
    ),
    vectorIndexPath,
    httpLogPath: resolveAbsolutePath(
      basePath,
      overrides.httpLogPath || process.env.CODEX_MEMORY_HTTP_LOG || path.join(logsDir, 'codex-memory-http.log')
    ),
    chatIndexPath: resolveAbsolutePath(
      basePath,
      overrides.chatIndexPath || process.env.CODEX_MEMORY_CHAT_INDEX_PATH || path.join(dataDir, CHAT_INDEX_FILE_NAME)
    ),
    candidateCachePath: resolveAbsolutePath(
      basePath,
      overrides.candidateCachePath || process.env.CODEX_MEMORY_CANDIDATE_CACHE_PATH || path.join(dataDir, CANDIDATE_CACHE_FILE_NAME)
    ),
    activeMemoryRootPath: resolveAbsolutePath(
      basePath,
      overrides.activeMemoryRootPath || process.env.CODEX_MEMORY_ACTIVE_MEMORY_ROOT || process.env.CODEX_MEMORY_VCHAT_DATA_ROOT || ''
    ),
    dailyNoteExtension: (overrides.dailyNoteExtension || process.env.CODEX_MEMORY_DAILY_NOTE_EXTENSION || 'txt').toLowerCase() === 'md'
      ? 'md'
      : 'txt',
    serverVersion: overrides.serverVersion || process.env.CODEX_MEMORY_SERVER_VERSION || SERVER_VERSION,
    allowedAgentAlias: overrides.allowedAgentAlias || process.env.CODEX_MEMORY_ALLOWED_AGENT || 'Codex',
    defaultAgentId: overrides.defaultAgentId || process.env.CODEX_MEMORY_AGENT_ID || 'codex-desktop',
    defaultRequestSource: overrides.defaultRequestSource || process.env.CODEX_MEMORY_REQUEST_SOURCE || 'codex-memory-mcp',
    httpHost: overrides.httpHost || process.env.CODEX_MEMORY_HTTP_HOST || '127.0.0.1',
    httpPort: parsePositiveInteger(overrides.httpPort || process.env.CODEX_MEMORY_HTTP_PORT || '7605', 7605),
    httpMcpPath: normalizeHttpPath(overrides.httpMcpPath || process.env.CODEX_MEMORY_HTTP_PATH || '/mcp/codex-memory'),
    httpBearerToken: overrides.httpBearerToken || process.env.CODEX_MEMORY_HTTP_TOKEN || '',
    embedDimensions: inferredEmbedDimensions,
    embeddingFingerprint,
    embeddingProfileVersion,
    ragParamsPath: resolveAbsolutePath(
      basePath,
      overrides.ragParamsPath || process.env.CODEX_MEMORY_RAG_PARAMS_PATH || ''
    ),
    tagMemoDynamicWeightRange: [0.05, 0.45],
    tagMemoCoreBoostRange: [1.2, 1.4],
    geodesicRerank: {
      alpha: 0.3,
      minGeoSamples: 4
    },
    metaThinkingAutoThreshold: 0.65,
    embeddingProvider: activeEmbeddingEndpoint.provider,
    embeddingUrl: activeEmbeddingEndpoint.url,
    embeddingApiKey: activeEmbeddingEndpoint.apiKey,
    embeddingModel: activeEmbeddingEndpoint.model,
    embeddingPath: activeEmbeddingEndpoint.path,
    embeddingHeaders: activeEmbeddingEndpoint.headers,
    embeddingTimeoutMs: activeEmbeddingEndpoint.timeoutMs,
    embeddingEndpoints,
    maxSearchLimit: Number.parseInt(String(overrides.maxSearchLimit || process.env.CODEX_MEMORY_MAX_SEARCH_LIMIT || '10'), 10) || 10,
    defaultSearchLimit: Number.parseInt(String(overrides.defaultSearchLimit || process.env.CODEX_MEMORY_DEFAULT_SEARCH_LIMIT || '5'), 10) || 5,
    chunkMaxChars: Number.parseInt(String(overrides.chunkMaxChars || process.env.CODEX_MEMORY_CHUNK_MAX_CHARS || '900'), 10) || 900,
    chunkOverlapChars: Number.parseInt(String(overrides.chunkOverlapChars || process.env.CODEX_MEMORY_CHUNK_OVERLAP_CHARS || '120'), 10) || 120,
    candidatePoolMultiplier: Number.parseFloat(String(overrides.candidatePoolMultiplier || process.env.CODEX_MEMORY_CANDIDATE_POOL_MULTIPLIER || '2')) || 2,
    enableEmbeddingCache: toBoolean(overrides.enableEmbeddingCache ?? process.env.CODEX_MEMORY_ENABLE_EMBEDDING_CACHE, true),
    embeddingCacheMaxEntries: Number.parseInt(String(overrides.embeddingCacheMaxEntries || process.env.CODEX_MEMORY_EMBEDDING_CACHE_MAX_ENTRIES || '1200'), 10) || 1200,
    contextVectorWeight: Number.parseFloat(String(overrides.contextVectorWeight || process.env.CODEX_MEMORY_CONTEXT_VECTOR_WEIGHT || '0.22')) || 0.22,
    contextVectorDecayRate: Number.parseFloat(String(overrides.contextVectorDecayRate || process.env.CODEX_MEMORY_CONTEXT_VECTOR_DECAY_RATE || '0.75')) || 0.75,
    contextVectorMaxWindow: Number.parseInt(String(overrides.contextVectorMaxWindow || process.env.CODEX_MEMORY_CONTEXT_VECTOR_MAX_WINDOW || '10'), 10) || 10,
    contextSegmentSimilarity: Number.parseFloat(String(overrides.contextSegmentSimilarity || process.env.CODEX_MEMORY_CONTEXT_SEGMENT_SIMILARITY || '0.7')) || 0.7,
    rerankUrl: overrides.rerankUrl || process.env.CODEX_MEMORY_RERANK_URL || '',
    rerankApiKey: overrides.rerankApiKey || process.env.CODEX_MEMORY_RERANK_API_KEY || '',
    rerankModel: overrides.rerankModel || process.env.CODEX_MEMORY_RERANK_MODEL || '',
    rerankProvider: (overrides.rerankProvider || process.env.CODEX_MEMORY_RERANK_PROVIDER || '').toLowerCase(),
    rerankPath: overrides.rerankPath || process.env.CODEX_MEMORY_RERANK_PATH || 'v1/rerank',
    rerankHeaders: parseJsonObject(overrides.rerankHeaders ?? process.env.CODEX_MEMORY_RERANK_HEADERS_JSON, {}),
    rerankMultiplier: Number.parseFloat(String(overrides.rerankMultiplier || process.env.CODEX_MEMORY_RERANK_MULTIPLIER || '2')) || 2,
    rerankMaxTokensPerBatch: Number.parseInt(String(overrides.rerankMaxTokensPerBatch || process.env.CODEX_MEMORY_RERANK_MAX_TOKENS || '12000'), 10) || 12000,
    rerankTimeoutMs: Number.parseInt(String(overrides.rerankTimeoutMs || process.env.CODEX_MEMORY_RERANK_TIMEOUT_MS || '12000'), 10) || 12000,
    enableCandidateCache: toBoolean(overrides.enableCandidateCache ?? process.env.CODEX_MEMORY_ENABLE_CANDIDATE_CACHE, true),
    enableSoftReadPolicy: toBoolean(overrides.enableSoftReadPolicy ?? process.env.CODEX_MEMORY_ENABLE_SOFT_READ_POLICY, false),
    enableLifecycleReadPolicy: toBoolean(overrides.enableLifecycleReadPolicy ?? process.env.CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY, false),
    candidateCacheTtlMs: Number.parseInt(String(overrides.candidateCacheTtlMs || process.env.CODEX_MEMORY_CANDIDATE_CACHE_TTL_MS || '3600000'), 10) || 3600000,
    candidateCacheMaxEntries: Number.parseInt(String(overrides.candidateCacheMaxEntries || process.env.CODEX_MEMORY_CANDIDATE_CACHE_MAX_ENTRIES || '200'), 10) || 200,
    lightMemoExcludedFolders: normalizeStringList(
      pickFirstNonEmpty(
        overrides.lightMemoExcludedFolders,
        process.env.CODEX_MEMORY_LIGHTMEMO_EXCLUDED_FOLDERS,
        process.env.EXCLUDED_FOLDERS,
        process.env.IGNORE_FOLDERS
      )
    ),
    lightMemoDirectoryMap: normalizeLightMemoDirectoryMap(
      pickFirstNonEmpty(
        overrides.lightMemoDirectoryMap,
        process.env.CODEX_MEMORY_LIGHTMEMO_DIRECTORY_MAP_JSON
      )
    ),
    activeMemoryBlockedKeywords: normalizeStringList(
      pickFirstNonEmpty(
        overrides.activeMemoryBlockedKeywords,
        process.env.CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS,
        process.env.CODEX_MEMORY_DEEPMEMO_BLOCKED_KEYWORDS,
        process.env.BlockedKeywords
      )
    ).map(item => item.toLowerCase()),
    activeMemoryRerankSearch: toBoolean(
      overrides.activeMemoryRerankSearch
      ?? process.env.CODEX_MEMORY_ACTIVE_RERANK_SEARCH
      ?? process.env.CODEX_MEMORY_DEEPMEMO_RERANK_SEARCH
      ?? process.env.RerankSearch,
      false
    ),
    activeMemorySyncMinIntervalMs: (() => {
      const parsed = Number.parseInt(
        String(
          overrides.activeMemorySyncMinIntervalMs
          ?? process.env.CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS
          ?? process.env.CODEX_MEMORY_ACTIVE_MEMORY_SYNC_TTL_MS
          ?? '5000'
        ),
        10
      );
      return Number.isInteger(parsed) ? Math.max(0, parsed) : 5000;
    })(),
    enableShadowWrites: toBoolean(overrides.enableShadowWrites ?? process.env.CODEX_MEMORY_ENABLE_SHADOW_WRITES, true),
    enableVectorIndex: toBoolean(overrides.enableVectorIndex ?? process.env.CODEX_MEMORY_ENABLE_VECTOR_INDEX, true),
    autoRebuildShadowOnStart: toBoolean(overrides.autoRebuildShadowOnStart ?? process.env.CODEX_MEMORY_AUTO_REBUILD, false),
    autoRebuildActiveMemoryOnStart: toBoolean(overrides.autoRebuildActiveMemoryOnStart ?? process.env.CODEX_MEMORY_AUTO_REBUILD_ACTIVE_MEMORY, false)
  };

  return applyRagProfileToConfig(
    baseConfig,
    loadRagProfileConfig({
      filePath: baseConfig.ragParamsPath,
      embeddingFingerprint
    })
  );
}

module.exports = {
  createConfig,
  normalizeHttpPath,
  parseJsonObject,
  resolveAbsolutePath,
  toBoolean
};
