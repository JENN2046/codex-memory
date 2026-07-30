'use strict';

const path = require('node:path');

const {
  createProductionSelectedDiarySourceProjection
} = require('./production-selected-diary-hydrator');
const {
  createGovernedReadLeaseWorker
} = require('./governed-read-lease-worker');
const {
  createGovernedReadShimHttpRuntime
} = require('./governed-read-shim-http-runtime');

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const MODEL_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function validateLoopbackProviderUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw codedError('governed_read_provider_config_invalid');
  }
  if (parsed.protocol !== 'http:' ||
      parsed.hostname !== '127.0.0.1' ||
      !parsed.port ||
      parsed.pathname !== '/' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash) {
    throw codedError('governed_read_provider_config_invalid');
  }
  return parsed.origin;
}

function loadVcpEmbeddingUtils(vcpToolBoxRoot) {
  const embeddingUtilsPath = path.join(
    vcpToolBoxRoot,
    'EmbeddingUtils.js'
  );
  return require(embeddingUtilsPath);
}

async function invokeWithSuppressedProviderConsole(operation) {
  const methods = ['debug', 'error', 'info', 'log', 'warn'];
  const original = Object.fromEntries(
    methods.map(method => [method, console[method]])
  );
  const suppressed = () => {};
  try {
    for (const method of methods) console[method] = suppressed;
    return await operation();
  } finally {
    for (const method of methods) console[method] = original[method];
  }
}

function createVcpQueryEmbeddingProvider({
  vcpToolBoxRoot,
  apiUrl,
  apiKey,
  model,
  loadEmbeddingUtils = loadVcpEmbeddingUtils
} = {}) {
  if (typeof vcpToolBoxRoot !== 'string' ||
      !path.isAbsolute(vcpToolBoxRoot) ||
      path.resolve(vcpToolBoxRoot) !== vcpToolBoxRoot ||
      typeof apiKey !== 'string' ||
      apiKey.length < 1 ||
      apiKey.length > 4096 ||
      apiKey.trim() !== apiKey ||
      /[\r\n\0]/u.test(apiKey) ||
      !MODEL_PATTERN.test(model || '') ||
      typeof loadEmbeddingUtils !== 'function') {
    throw codedError('governed_read_provider_config_invalid');
  }
  const endpoint = validateLoopbackProviderUrl(apiUrl);
  let embeddingUtils;
  try {
    embeddingUtils = loadEmbeddingUtils(vcpToolBoxRoot);
    if (typeof embeddingUtils?.getEmbeddingsBatch !== 'function') {
      throw codedError('governed_read_provider_runtime_invalid');
    }
  } catch {
    throw codedError('governed_read_provider_runtime_invalid');
  }
  return async function embedQuery({ query, signal } = {}) {
    if (signal?.aborted) {
      throw codedError('governed_read_provider_cancelled');
    }
    let vectors;
    try {
      vectors = await invokeWithSuppressedProviderConsole(
        () => embeddingUtils.getEmbeddingsBatch(
          [query],
          {
            apiUrl: endpoint,
            apiKey,
            model
          }
        )
      );
    } catch {
      throw codedError(
        signal?.aborted
          ? 'governed_read_provider_cancelled'
          : 'governed_read_provider_call_failed'
      );
    }
    if (signal?.aborted) {
      throw codedError('governed_read_provider_cancelled');
    }
    if (!Array.isArray(vectors) || vectors.length !== 1) {
      throw codedError('governed_read_provider_response_invalid');
    }
    return Object.freeze({ vector: vectors[0] });
  };
}

function createProductionGovernedReadShimRuntime({
  runtimeBindingDigest,
  host = '127.0.0.1',
  port,
  leaseRoot,
  vcpToolBoxRoot,
  sourceKnowledgeBaseStorePath,
  knowledgeBaseRootPath,
  dimension,
  provider,
  createSourceProjection =
    createProductionSelectedDiarySourceProjection,
  createLeaseWorker = createGovernedReadLeaseWorker,
  createHttpRuntime = createGovernedReadShimHttpRuntime,
  loadEmbeddingUtils
} = {}) {
  if (!DIGEST_PATTERN.test(runtimeBindingDigest || '') ||
      typeof createSourceProjection !== 'function' ||
      typeof createLeaseWorker !== 'function' ||
      typeof createHttpRuntime !== 'function' ||
      !provider ||
      typeof provider !== 'object' ||
      Array.isArray(provider)) {
    throw codedError(
      'production_governed_read_shim_config_invalid'
    );
  }
  const sourceProjection = createSourceProjection({
    sourceKnowledgeBaseStorePath,
    vcpToolBoxRoot
  });
  const providerWrapper = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot,
    apiUrl: provider.apiUrl,
    apiKey: provider.apiKey,
    model: provider.model,
    loadEmbeddingUtils
  });
  const leaseWorker = createLeaseWorker({
    sourceProjection,
    providerWrapper,
    dimension,
    leaseRoot,
    vcpCodeRoot: vcpToolBoxRoot,
    sourceRuntimeRoot: vcpToolBoxRoot,
    sourceKnowledgeBaseStorePath,
    knowledgeBaseRootPath
  });
  return createHttpRuntime({
    leaseWorker,
    runtimeBindingDigest,
    host,
    port
  });
}

module.exports = {
  createProductionGovernedReadShimRuntime,
  createVcpQueryEmbeddingProvider,
  validateLoopbackProviderUrl
};
