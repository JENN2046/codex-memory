'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');

const PROVIDER_ENV_KEYS = [
  'CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER',
  'CODEX_MEMORY_EMBED_DIMS',
  'CODEX_MEMORY_EMBEDDING_PROVIDER',
  'CODEX_MEMORY_EMBEDDING_URL',
  'CODEX_MEMORY_EMBEDDING_API_KEY',
  'CODEX_MEMORY_EMBEDDING_MODEL',
  'CODEX_MEMORY_EMBEDDING_PATH',
  'CODEX_MEMORY_EMBEDDING_HEADERS_JSON',
  'CODEX_MEMORY_EMBEDDING_TIMEOUT_MS',
  'CODEX_MEMORY_LOCAL_EMBEDDING_PROVIDER',
  'CODEX_MEMORY_LOCAL_EMBEDDING_URL',
  'CODEX_MEMORY_LOCAL_EMBEDDING_API_KEY',
  'CODEX_MEMORY_LOCAL_EMBEDDING_MODEL',
  'CODEX_MEMORY_LOCAL_EMBEDDING_PATH',
  'CODEX_MEMORY_LOCAL_EMBEDDING_HEADERS_JSON',
  'CODEX_MEMORY_LOCAL_EMBEDDING_TIMEOUT_MS',
  'CODEX_MEMORY_LOCAL_EMBED_DIMS',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_PROVIDER',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_URL',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_PATH',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_HEADERS_JSON',
  'CODEX_MEMORY_FALLBACK_EMBEDDING_TIMEOUT_MS',
  'CODEX_MEMORY_FALLBACK_EMBED_DIMS',
  'CODEX_MEMORY_RERANK_URL',
  'CODEX_MEMORY_RERANK_API_KEY',
  'CODEX_MEMORY_RERANK_MODEL',
  'CODEX_MEMORY_RERANK_PATH',
  'CODEX_MEMORY_RERANK_HEADERS_JSON',
  'CODEX_MEMORY_RERANK_TIMEOUT_MS',
  'EMBEDDING_API_URL',
  'EMBEDDING_API_KEY',
  'EMBEDDING_FALLBACK_API_URL',
  'EMBEDDING_FALLBACK_API_KEY',
  'EMBEDDING_FALLBACK_MODEL',
  'WhitelistEmbeddingModel',
  'VECTORDB_DIMENSION'
];

function withEnv(envVars, fn) {
  const scopedEnv = Object.fromEntries(PROVIDER_ENV_KEYS.map(key => [key, undefined]));
  Object.assign(scopedEnv, envVars);

  const restore = {};
  for (const key of Object.keys(scopedEnv)) {
    restore[key] = process.env[key];
    if (scopedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = scopedEnv[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(restore)) {
      if (restore[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = restore[key];
      }
    }
  }
}

function createIsolatedConfig(overrides) {
  let config;
  withEnv({}, () => {
    config = createConfig(overrides);
  });
  return config;
}

test('default security profile is local', () => {
  const config = createIsolatedConfig();
  assert.equal(config.securityProfile, 'local');
});

test('local profile does not enable security policies by default', () => {
  const config = createIsolatedConfig();
  assert.equal(config.enableSoftReadPolicy, false);
  assert.equal(config.enableLifecycleReadPolicy, false);
  assert.equal(config.enableWritePreflight, false);
});

test('local profile allows external provider is false by default', () => {
  const config = createIsolatedConfig();
  assert.equal(config.allowExternalProvider, false);
});

test('hardened profile enables soft read policy', () => {
  withEnv({ CODEX_MEMORY_SECURITY_PROFILE: 'hardened' }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'hardened');
    assert.equal(config.enableSoftReadPolicy, true);
    assert.equal(config.enableLifecycleReadPolicy, true);
    assert.equal(config.enableWritePreflight, true);
    assert.equal(config.allowExternalProvider, false);
  });
});

test('hardened profile uppercase value is normalized', () => {
  withEnv({ CODEX_MEMORY_SECURITY_PROFILE: 'HARDENED' }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'hardened');
    assert.equal(config.enableSoftReadPolicy, true);
  });
});

test('explicit env overrides hardened profile default for soft read policy', () => {
  withEnv({
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_ENABLE_SOFT_READ_POLICY: 'false'
  }, () => {
    const config = createConfig();
    assert.equal(config.enableSoftReadPolicy, false);
  });
});

test('explicit env overrides hardened profile default for external provider', () => {
  withEnv({
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'true'
  }, () => {
    const config = createConfig();
    assert.equal(config.allowExternalProvider, true);
  });
});

test('explicit local profile behaves same as default', () => {
  withEnv({ CODEX_MEMORY_SECURITY_PROFILE: 'local' }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'local');
    assert.equal(config.enableSoftReadPolicy, false);
    assert.equal(config.allowExternalProvider, false);
  });
});

test('string false override disables hardened lifecycle read policy', () => {
  const config = createIsolatedConfig({
    securityProfile: 'hardened',
    enableLifecycleReadPolicy: 'false'
  });
  assert.equal(config.enableLifecycleReadPolicy, false);
});

test('string false override disables hardened soft read policy', () => {
  const config = createIsolatedConfig({
    securityProfile: 'hardened',
    enableSoftReadPolicy: 'false'
  });
  assert.equal(config.enableSoftReadPolicy, false);
});

test('string false override disables hardened write preflight', () => {
  const config = createIsolatedConfig({
    securityProfile: 'hardened',
    enableWritePreflight: 'false'
  });
  assert.equal(config.enableWritePreflight, false);
});

test('string true override enables soft read policy in local profile', () => {
  const config = createIsolatedConfig({
    securityProfile: 'local',
    enableSoftReadPolicy: 'true'
  });
  assert.equal(config.enableSoftReadPolicy, true);
});

test('disabled provider config uses local-hash fingerprint and profile', () => {
  const config = createIsolatedConfig({
    allowExternalProvider: false,
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.allowExternalProvider, false);
  assert.match(config.embeddingFingerprint, /^local-hash__/);
  assert.match(config.vectorIndexPath, /local-hash__/);
});

test('enabled provider config uses provider fingerprint', () => {
  const config = createIsolatedConfig({
    allowExternalProvider: true,
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.allowExternalProvider, true);
  assert.match(config.embeddingFingerprint, /^bge-m3-local__1024__/);
});

test('configured endpoint with unset provider gate keeps allowExternalProvider false', () => {
  withEnv({ CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: undefined }, () => {
    const config = createConfig({
      localEmbeddingUrl: 'http://example.invalid',
      localEmbeddingModel: 'bge-m3-local',
      localEmbedDimensions: 1024
    });

    assert.equal(config.allowExternalProvider, false);
    assert.match(config.embeddingFingerprint, /^local-hash__/);
    assert.equal(config.embeddingEndpoints.length, 0);
  });
});

test('hardened profile with configured endpoint keeps provider gate disabled by default', () => {
  withEnv({
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_EMBEDDING_URL: 'http://example.invalid',
    CODEX_MEMORY_EMBEDDING_MODEL: 'm'
  }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'hardened');
    assert.equal(config.allowExternalProvider, false);
    assert.match(config.embeddingFingerprint, /^local-hash__/);
    assert.equal(config.embeddingEndpoints.length, 0);
  });
});

test('hardened override with configured endpoint keeps provider gate disabled by default', () => {
  const config = createIsolatedConfig({
    securityProfile: 'hardened',
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.securityProfile, 'hardened');
  assert.equal(config.allowExternalProvider, false);
  assert.match(config.embeddingFingerprint, /^local-hash__/);
  assert.equal(config.embeddingEndpoints.length, 0);
});

test('string true provider gate enables provider endpoint and fingerprint', () => {
  const config = createIsolatedConfig({
    allowExternalProvider: 'true',
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.allowExternalProvider, true);
  assert.match(config.embeddingFingerprint, /^bge-m3-local__1024__/);
  assert.equal(config.embeddingEndpoints.length, 1);
});

test('configured endpoint without explicit provider gate stores resolved allowExternalProvider false', () => {
  withEnv({ CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: undefined }, () => {
    const config = createConfig({
      embeddingUrl: 'http://example.invalid',
      embeddingModel: 'm'
    });

    assert.equal(config.allowExternalProvider, false);
    assert.match(config.embeddingFingerprint, /^local-hash__/);
    assert.equal(config.embeddingEndpoints.length, 0);
  });
});

test('explicit false provider gate keeps configured endpoint out of profile', () => {
  const config = createIsolatedConfig({
    allowExternalProvider: false,
    embeddingUrl: 'http://example.invalid',
    embeddingModel: 'm'
  });

  assert.equal(config.allowExternalProvider, false);
  assert.match(config.embeddingFingerprint, /^local-hash__/);
  assert.equal(config.embeddingEndpoints.length, 0);
});

test('rerank-only config keeps allowExternalProvider false in local profile', () => {
  withEnv({ CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: undefined }, () => {
    const config = createConfig({
      rerankUrl: 'http://example.invalid/rerank',
      rerankApiKey: 'test-key',
      rerankModel: 'rerank-model'
    });

    assert.equal(config.allowExternalProvider, false);
    assert.equal(config.embeddingEndpoints.length, 0);
  });
});
