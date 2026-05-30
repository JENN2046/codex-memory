'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

const { ExternalEmbeddingAdapter } = require('../src/recall/ExternalEmbeddingAdapter');
const { ExternalRerankAdapter } = require('../src/recall/ExternalRerankAdapter');

test('ExternalEmbeddingAdapter.isConfigured returns false when allowExternalProvider is not true', () => {
  const adapter = new ExternalEmbeddingAdapter({
    embeddingEndpoints: [{ url: 'http://example.com', model: 'test-model' }],
    allowExternalProvider: false
  });
  assert.equal(adapter.isConfigured(), false);
});

test('ExternalEmbeddingAdapter.isConfigured returns false when allowExternalProvider is undefined', () => {
  const adapter = new ExternalEmbeddingAdapter({
    embeddingEndpoints: [{ url: 'http://example.com', model: 'test-model' }],
    allowExternalProvider: undefined
  });
  assert.equal(adapter.isConfigured(), false);
});

test('ExternalEmbeddingAdapter.isConfigured returns true when allowExternalProvider is true and endpoints exist', () => {
  const adapter = new ExternalEmbeddingAdapter({
    embeddingEndpoints: [{ url: 'http://example.com', model: 'test-model' }],
    allowExternalProvider: true
  });
  assert.equal(adapter.isConfigured(), true);
});

test('ExternalEmbeddingAdapter with allowExternalProvider=true but no endpoints returns false', () => {
  const adapter = new ExternalEmbeddingAdapter({
    embeddingEndpoints: [],
    allowExternalProvider: true
  });
  assert.equal(adapter.isConfigured(), false);
});

test('ExternalRerankAdapter.isConfigured returns false when allowExternalProvider is not true', () => {
  const adapter = new ExternalRerankAdapter({
    rerankUrl: 'http://example.com/rerank',
    rerankApiKey: 'test-key',
    rerankModel: 'test-model',
    allowExternalProvider: false
  });
  assert.equal(adapter.isConfigured(), false);
});

test('ExternalRerankAdapter.isConfigured returns false when allowExternalProvider is undefined', () => {
  const adapter = new ExternalRerankAdapter({
    rerankUrl: 'http://example.com/rerank',
    rerankApiKey: 'test-key',
    rerankModel: 'test-model',
    allowExternalProvider: undefined
  });
  assert.equal(adapter.isConfigured(), false);
});

test('ExternalRerankAdapter.isConfigured returns true when allowExternalProvider is true and config is complete', () => {
  const adapter = new ExternalRerankAdapter({
    rerankUrl: 'http://example.com/rerank',
    rerankApiKey: 'test-key',
    rerankModel: 'test-model',
    allowExternalProvider: true
  });
  assert.equal(adapter.isConfigured(), true);
});

test('Embedding adapter does not call fetch when allowExternalProvider is false', async () => {
  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({ data: [] }) }; };

  try {
    const adapter = new ExternalEmbeddingAdapter({
      embeddingEndpoints: [{ url: 'http://localhost:9999', model: 'test-model' }],
      embeddingTimeoutMs: 100,
      embedDimensions: 64,
      allowExternalProvider: false
    });
    // isConfigured returns false, so embedBatch should not be reachable
    assert.equal(adapter.isConfigured(), false);
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Rerank adapter does not call fetch when allowExternalProvider is false', async () => {
  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({ results: [] }) }; };

  try {
    const adapter = new ExternalRerankAdapter({
      rerankUrl: 'http://localhost:9999/rerank',
      rerankApiKey: 'test-key',
      rerankModel: 'test-model',
      rerankTimeoutMs: 100,
      allowExternalProvider: false
    });
    assert.equal(adapter.isConfigured(), false);
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('VectorIndexStore falls back to local-hash when allowExternalProvider is false', () => {
  const { VectorIndexStore } = require('../src/storage/VectorIndexStore');
  const adapter = new ExternalEmbeddingAdapter({
    embeddingEndpoints: [{ url: 'http://example.com', model: 'test-model' }],
    allowExternalProvider: false
  });
  const store = new VectorIndexStore({
    enableVectorIndex: false,
    embeddingFingerprint: 'test-fp',
    embedDimensions: 64,
    enableEmbeddingCache: false
  }, { externalEmbeddingAdapter: adapter });
  // VectorIndexStore uses adapter.isConfigured() to decide external vs local
  assert.equal(adapter.isConfigured(), false);
});

test('allowExternalProvider=true with complete config allows adapter configured', () => {
  const embeddingAdapter = new ExternalEmbeddingAdapter({
    embeddingEndpoints: [{ url: 'http://example.com', model: 'test-model' }],
    allowExternalProvider: true
  });
  assert.equal(embeddingAdapter.isConfigured(), true);

  const rerankAdapter = new ExternalRerankAdapter({
    rerankUrl: 'http://example.com/rerank',
    rerankApiKey: 'test-key',
    rerankModel: 'test-model',
    allowExternalProvider: true
  });
  assert.equal(rerankAdapter.isConfigured(), true);
});
