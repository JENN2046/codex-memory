'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createProductionGovernedReadShimRuntime,
  createVcpQueryEmbeddingProvider,
  validateLoopbackProviderUrl
} = require(
  '../src/runtime/vcp-native/production-governed-read-shim'
);

test('production governed-read provider wrapper performs one exact VCP batch call', async () => {
  const calls = [];
  const disclosedProviderLogs = [];
  const originalConsole = {
    error: console.error,
    log: console.log,
    warn: console.warn
  };
  console.error = value => disclosedProviderLogs.push(value);
  console.log = value => disclosedProviderLogs.push(value);
  console.warn = value => disclosedProviderLogs.push(value);
  const provider = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    apiUrl: 'http://127.0.0.1:3000',
    apiKey: 'synthetic-provider-key',
    model: 'synthetic-embedding-model',
    loadEmbeddingUtils(root) {
      assert.equal(root, '/synthetic/VCPToolBox');
      return {
        async getEmbeddingsBatch(texts, config) {
          calls.push({ texts, config });
          console.error('synthetic raw provider error');
          console.log('synthetic raw provider response');
          console.warn('synthetic provider warning');
          return [[0.25, 0.75]];
        }
      };
    }
  });
  try {
    assert.deepEqual(
      await provider({
        query: 'one bounded query',
        signal: new AbortController().signal
      }),
      { vector: [0.25, 0.75] }
    );
  } finally {
    console.error = originalConsole.error;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
  }
  assert.deepEqual(disclosedProviderLogs, []);
  assert.deepEqual(calls, [{
    texts: ['one bounded query'],
    config: {
      apiUrl: 'http://127.0.0.1:3000',
      apiKey: 'synthetic-provider-key',
      model: 'synthetic-embedding-model'
    }
  }]);
  assert.equal(
    validateLoopbackProviderUrl('http://127.0.0.1:3000'),
    'http://127.0.0.1:3000'
  );
  assert.throws(
    () => validateLoopbackProviderUrl(
      'https://provider.example/v1'
    ),
    { code: 'governed_read_provider_config_invalid' }
  );
});

test('production governed-read provider wrapper discards raw load and call errors', async () => {
  assert.throws(
    () => createVcpQueryEmbeddingProvider({
      vcpToolBoxRoot: '/synthetic/VCPToolBox',
      apiUrl: 'http://127.0.0.1:3000',
      apiKey: 'synthetic-provider-key',
      model: 'synthetic-embedding-model',
      loadEmbeddingUtils() {
        throw new Error(
          'synthetic raw module path and provider configuration'
        );
      }
    }),
    error => (
      error?.code === 'governed_read_provider_runtime_invalid' &&
      !String(error?.message).includes('synthetic raw')
    )
  );

  const provider = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    apiUrl: 'http://127.0.0.1:3000',
    apiKey: 'synthetic-provider-key',
    model: 'synthetic-embedding-model',
    loadEmbeddingUtils() {
      return {
        async getEmbeddingsBatch() {
          console.error('synthetic raw provider response');
          throw new Error(
            'API Error 500: synthetic raw provider response'
          );
        }
      };
    }
  });
  const originalConsoleError = console.error;
  await assert.rejects(
    provider({ query: 'one bounded query' }),
    error => (
      error?.code === 'governed_read_provider_call_failed' &&
      !String(error?.message).includes('synthetic raw')
    )
  );
  assert.equal(console.error, originalConsoleError);
});

test('production governed-read Shim composes projection, lease worker, and bound HTTP runtime', () => {
  const captured = {};
  const runtime = { marker: 'runtime' };
  const result = createProductionGovernedReadShimRuntime({
    runtimeBindingDigest: `sha256:${'ab'.repeat(32)}`,
    host: '127.0.0.1',
    port: 7616,
    leaseRoot: '/synthetic/runtime/governed-read-leases',
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    sourceKnowledgeBaseStorePath:
      '/synthetic/VCPToolBox/VectorStore',
    knowledgeBaseRootPath:
      '/synthetic/VCPToolBox/dailynote',
    dimension: 2,
    provider: {
      apiUrl: 'http://127.0.0.1:3000',
      apiKey: 'synthetic-provider-key',
      model: 'synthetic-embedding-model'
    },
    loadEmbeddingUtils() {
      return {
        async getEmbeddingsBatch() {
          return [[0.25, 0.75]];
        }
      };
    },
    createSourceProjection(options) {
      captured.projection = options;
      return {
        preflight() {},
        preflightRequiresProcessIsolation: true
      };
    },
    createLeaseWorker(options) {
      captured.worker = options;
      return {
        async execute() {},
        snapshot() {
          return {};
        }
      };
    },
    createHttpRuntime(options) {
      captured.http = options;
      return runtime;
    }
  });
  assert.equal(result, runtime);
  assert.deepEqual(captured.projection, {
    sourceKnowledgeBaseStorePath:
      '/synthetic/VCPToolBox/VectorStore',
    vcpToolBoxRoot: '/synthetic/VCPToolBox'
  });
  assert.equal(captured.worker.dimension, 2);
  assert.equal(
    captured.worker.leaseRoot,
    '/synthetic/runtime/governed-read-leases'
  );
  assert.equal(
    captured.worker.sourceRuntimeRoot,
    '/synthetic/VCPToolBox'
  );
  assert.equal(
    typeof captured.worker.providerWrapper,
    'function'
  );
  assert.equal(captured.http.host, '127.0.0.1');
  assert.equal(captured.http.port, 7616);
  assert.equal(
    captured.http.runtimeBindingDigest,
    `sha256:${'ab'.repeat(32)}`
  );
});
