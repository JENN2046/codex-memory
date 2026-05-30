'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');

function withEnv(envVars, fn) {
  const restore = {};
  for (const key of Object.keys(envVars)) {
    restore[key] = process.env[key];
  }
  try {
    Object.assign(process.env, envVars);
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

test('default security profile is local', () => {
  const config = createConfig();
  assert.equal(config.securityProfile, 'local');
});

test('local profile does not enable security policies by default', () => {
  const config = createConfig();
  assert.equal(config.enableSoftReadPolicy, false);
  assert.equal(config.enableLifecycleReadPolicy, false);
  assert.equal(config.enableWritePreflight, false);
});

test('local profile allows external provider is false by default', () => {
  const config = createConfig();
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
  const config = createConfig({
    securityProfile: 'hardened',
    enableLifecycleReadPolicy: 'false'
  });
  assert.equal(config.enableLifecycleReadPolicy, false);
});

test('string false override disables hardened soft read policy', () => {
  const config = createConfig({
    securityProfile: 'hardened',
    enableSoftReadPolicy: 'false'
  });
  assert.equal(config.enableSoftReadPolicy, false);
});

test('string false override disables hardened write preflight', () => {
  const config = createConfig({
    securityProfile: 'hardened',
    enableWritePreflight: 'false'
  });
  assert.equal(config.enableWritePreflight, false);
});

test('string true override enables soft read policy in local profile', () => {
  const config = createConfig({
    securityProfile: 'local',
    enableSoftReadPolicy: 'true'
  });
  assert.equal(config.enableSoftReadPolicy, true);
});

test('disabled provider config uses local-hash fingerprint and profile', () => {
  const config = createConfig({
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
  const config = createConfig({
    allowExternalProvider: true,
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.allowExternalProvider, true);
  assert.match(config.embeddingFingerprint, /^bge-m3-local__1024__/);
});

test('configured endpoint with unset provider gate auto-enables allowExternalProvider', () => {
  const config = createConfig({
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.allowExternalProvider, true);
  assert.match(config.embeddingFingerprint, /^bge-m3-local__1024__/);
  assert.equal(config.embeddingEndpoints.length, 1);
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
  const config = createConfig({
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
  const config = createConfig({
    allowExternalProvider: 'true',
    localEmbeddingUrl: 'http://example.invalid',
    localEmbeddingModel: 'bge-m3-local',
    localEmbedDimensions: 1024
  });

  assert.equal(config.allowExternalProvider, true);
  assert.match(config.embeddingFingerprint, /^bge-m3-local__1024__/);
  assert.equal(config.embeddingEndpoints.length, 1);
});

test('configured endpoint without explicit provider gate stores resolved allowExternalProvider true', () => {
  const config = createConfig({
    embeddingUrl: 'http://example.invalid',
    embeddingModel: 'm'
  });

  assert.equal(config.allowExternalProvider, true);
  assert.match(config.embeddingFingerprint, /^m__64__v1$/);
  assert.equal(config.embeddingEndpoints.length, 1);
});

test('explicit false provider gate keeps configured endpoint out of profile', () => {
  const config = createConfig({
    allowExternalProvider: false,
    embeddingUrl: 'http://example.invalid',
    embeddingModel: 'm'
  });

  assert.equal(config.allowExternalProvider, false);
  assert.match(config.embeddingFingerprint, /^local-hash__/);
  assert.equal(config.embeddingEndpoints.length, 0);
});

test('rerank-only config auto-enables allowExternalProvider in local profile', () => {
  const config = createConfig({
    rerankUrl: 'http://example.invalid/rerank',
    rerankApiKey: 'test-key',
    rerankModel: 'rerank-model'
  });

  assert.equal(config.allowExternalProvider, true);
  assert.equal(config.embeddingEndpoints.length, 0);
});

test('rerank-only config auto-enables allowExternalProvider in local profile',()=>{const c=require("../src/config/createConfig").createConfig({rerankUrl:"http://example.invalid/rerank",rerankApiKey:"test-key",rerankModel:"rerank-model"});c.allowExternalProvider===true?console.log("PASS: allowExternalProvider="+c.allowExternalProvider):console.log("FAIL");});
