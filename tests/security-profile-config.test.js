'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');
const {
  getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig
} = require('../src/core/GovernedMcpVcpNativeHttpMcpTargetConfig');

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
  'CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_BRIDGE_GATE_MODE',
  'CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_MODE',
  'CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_MODE',
  'CODEX_MEMORY_VCP_NATIVE_RUNTIME_PROFILE',
  'CODEX_MEMORY_VCP_NATIVE_TARGET_REFERENCE_NAME',
  'CODEX_MEMORY_VCP_NATIVE_TARGET_KIND',
  'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TARGET_REFERENCE_NAME',
  'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT',
  'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN',
  'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME',
  'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME_BY_ACTION',
  'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TIMEOUT_MS',
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

test('governed MCP VCP native bridge gate defaults off and normalizes modes', () => {
  const defaultConfig = createIsolatedConfig();
  const observeConfig = createIsolatedConfig({
    governedMcpVcpNativeBridgeGateMode: 'observe'
  });
  const strictConfig = createIsolatedConfig({
    governedMcpVcpNativeBridgeGateMode: 'STRICT'
  });
  const invalidConfig = createIsolatedConfig({
    governedMcpVcpNativeBridgeGateMode: 'enabled'
  });

  assert.equal(defaultConfig.governedMcpVcpNativeBridgeGateMode, 'off');
  assert.deepEqual(defaultConfig.governedMcpVcpNativeBridgeConfigWarnings, []);
  assert.equal(observeConfig.governedMcpVcpNativeBridgeGateMode, 'observe');
  assert.equal(strictConfig.governedMcpVcpNativeBridgeGateMode, 'strict');
  assert.equal(invalidConfig.governedMcpVcpNativeBridgeGateMode, 'off');
});

test('governed MCP VCP native read delegation defaults off and normalizes modes', () => {
  const defaultConfig = createIsolatedConfig();
  const primaryConfig = createIsolatedConfig({
    governedMcpVcpNativeReadDelegationMode: 'primary'
  });
  const fallbackConfig = createIsolatedConfig({
    governedMcpVcpNativeReadDelegationMode: 'PRIMARY_WITH_LOCAL_FALLBACK'
  });
  const invalidConfig = createIsolatedConfig({
    governedMcpVcpNativeReadDelegationMode: 'enabled'
  });

  assert.equal(defaultConfig.governedMcpVcpNativeReadDelegationMode, 'off');
  assert.equal(primaryConfig.governedMcpVcpNativeReadDelegationMode, 'primary');
  assert.equal(fallbackConfig.governedMcpVcpNativeReadDelegationMode, 'primary_with_local_fallback');
  assert.equal(invalidConfig.governedMcpVcpNativeReadDelegationMode, 'off');
});

test('governed MCP VCP native write delegation defaults off and normalizes modes', () => {
  const defaultConfig = createIsolatedConfig();
  const primaryConfig = createIsolatedConfig({
    governedMcpVcpNativeWriteDelegationMode: 'primary'
  });
  const upperConfig = createIsolatedConfig({
    governedMcpVcpNativeWriteDelegationMode: 'PRIMARY'
  });
  const invalidConfig = createIsolatedConfig({
    governedMcpVcpNativeWriteDelegationMode: 'primary_with_local_fallback'
  });

  assert.equal(defaultConfig.governedMcpVcpNativeWriteDelegationMode, 'off');
  assert.equal(primaryConfig.governedMcpVcpNativeWriteDelegationMode, 'primary');
  assert.equal(upperConfig.governedMcpVcpNativeWriteDelegationMode, 'primary');
  assert.equal(invalidConfig.governedMcpVcpNativeWriteDelegationMode, 'off');
});

test('governed MCP VCP native delegation modes warn when bridge gate is off', () => {
  const config = createIsolatedConfig({
    governedMcpVcpNativeBridgeGateMode: 'off',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeWriteDelegationMode: 'primary'
  });
  const serialized = JSON.stringify(config.governedMcpVcpNativeBridgeConfigWarnings);

  assert.equal(config.governedMcpVcpNativeReadDelegationMode, 'primary_with_local_fallback');
  assert.equal(config.governedMcpVcpNativeWriteDelegationMode, 'primary');
  assert.deepEqual(config.governedMcpVcpNativeBridgeConfigWarnings, [
    {
      code: 'native_read_delegation_requires_bridge_gate',
      lowDisclosure: true,
      effect: 'read_delegation_fail_closed'
    },
    {
      code: 'native_write_delegation_requires_bridge_gate',
      lowDisclosure: true,
      effect: 'write_delegation_fail_closed'
    },
    {
      code: 'native_read_delegation_requires_accepted_native_target',
      lowDisclosure: true,
      effect: 'read_delegation_fail_closed'
    },
    {
      code: 'native_write_delegation_requires_accepted_native_target',
      lowDisclosure: true,
      effect: 'write_delegation_fail_closed'
    }
  ]);
  assert.equal(serialized.includes('http://'), false);
  assert.equal(serialized.includes('SECRET'), false);
});

test('governed MCP VCP native delegation modes warn when accepted native target is missing', () => {
  const config = createIsolatedConfig({
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'primary'
  });
  const serialized = JSON.stringify(config.governedMcpVcpNativeBridgeConfigWarnings);

  assert.deepEqual(config.governedMcpVcpNativeBridgeConfigWarnings, [
    {
      code: 'native_read_delegation_requires_accepted_native_target',
      lowDisclosure: true,
      effect: 'read_delegation_fail_closed'
    },
    {
      code: 'native_write_delegation_requires_accepted_native_target',
      lowDisclosure: true,
      effect: 'write_delegation_fail_closed'
    }
  ]);
  assert.equal(serialized.includes('http://'), false);
  assert.equal(serialized.includes('SECRET'), false);
});

test('governed MCP VCP native delegation modes do not warn when bridge gate and native target are accepted', () => {
  const config = createIsolatedConfig({
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: 'http://127.0.0.1:7654/mcp/vcp-native',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
    }
  });

  assert.deepEqual(config.governedMcpVcpNativeBridgeConfigWarnings, []);
});

test('governed MCP VCP native runtime target requires a safe bridge-owned reference', () => {
  const defaultConfig = createIsolatedConfig();
  const configured = createIsolatedConfig({
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    }
  });
  const unsafe = createIsolatedConfig({
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      targetKind: 'service_url',
      token: 'SHOULD_NOT_ECHO'
    }
  });

  assert.equal(defaultConfig.governedMcpVcpNativeRuntimeTarget.accepted, false);
  assert.equal(defaultConfig.governedMcpVcpNativeRuntimeTarget.configured, false);
  assert.equal(configured.governedMcpVcpNativeRuntimeTarget.accepted, true);
  assert.equal(configured.governedMcpVcpNativeRuntimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(configured.governedMcpVcpNativeRuntimeTarget.targetKind, 'mcp_server');
  assert.equal(unsafe.governedMcpVcpNativeRuntimeTarget.accepted, false);
  assert.ok(unsafe.governedMcpVcpNativeRuntimeTarget.invalidFields.includes('targetReferenceName'));
  assert.ok(unsafe.governedMcpVcpNativeRuntimeTarget.invalidFields.includes('token'));
  assert.equal(unsafe.governedMcpVcpNativeRuntimeTarget.targetReferenceName, null);
  assert.equal(configured.governedMcpVcpNativeRuntimeTarget.locatorDisclosed, false);
  assert.equal(configured.governedMcpVcpNativeRuntimeTarget.endpointDisclosed, false);
  assert.equal(configured.governedMcpVcpNativeRuntimeTarget.tokenMaterialDisclosed, false);
  assert.equal(JSON.stringify(unsafe.governedMcpVcpNativeRuntimeTarget).includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(JSON.stringify(unsafe.governedMcpVcpNativeRuntimeTarget).includes('SHOULD_NOT_ECHO'), false);
});

test('governed HTTP MCP VCP native target keeps endpoint and token out of enumerable config', () => {
  const privateEndpoint = 'http://127.0.0.1:7654/mcp/vcp-native';
  const privateToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO';
  const config = createIsolatedConfig({
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: privateEndpoint,
      bearerToken: privateToken,
      mcpToolName: 'knowledge_base.search',
      mcpToolNameByAction: {
        search_memory: 'knowledge_base.search',
        record_memory: 'knowledge_base.record'
      },
      requestTimeoutMs: 1200
    }
  });
  const serialized = JSON.stringify(config);
  const privateConfig = getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config);

  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.accepted, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.endpointConfigured, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.bearerTokenConfigured, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.endpointIncluded, false);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.tokenMaterialIncluded, false);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.endpointDisclosed, false);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.tokenMaterialDisclosed, false);
  assert.deepEqual(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameByAction, {
    record_memory: 'knowledge_base.record',
    search_memory: 'knowledge_base.search'
  });
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameConfigured, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameByActionConfigured, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.requestTimeoutMs, 1200);
  assert.equal(serialized.includes(privateEndpoint), false);
  assert.equal(serialized.includes(privateToken), false);
  assert.equal(Object.keys(config).includes('__governedMcpVcpNativeHttpMcpTargetPrivateConfig'), false);
  assert.equal(privateConfig.endpoint, privateEndpoint);
  assert.equal(privateConfig.bearerToken, privateToken);
  assert.equal(privateConfig.mcpToolNameConfigured, true);
  assert.deepEqual(privateConfig.mcpToolNameByAction, {
    search_memory: 'knowledge_base.search',
    record_memory: 'knowledge_base.record'
  });
});

test('governed HTTP MCP VCP native target can be sourced from env without raw disclosure', () => {
  const privateEndpoint = 'http://127.0.0.1:8765/mcp/vcp-native';
  const privateToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO';

  withEnv({
    CODEX_MEMORY_VCP_NATIVE_TARGET_REFERENCE_NAME: 'operator-vcp-toolbox-service-ref',
    CODEX_MEMORY_VCP_NATIVE_TARGET_KIND: 'mcp_server',
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT: privateEndpoint,
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN: privateToken,
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME: 'knowledge_base.search',
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME_BY_ACTION: JSON.stringify({
      search_memory: 'knowledge_base.search',
      record_memory: 'knowledge_base.record'
    }),
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TIMEOUT_MS: '1500'
  }, () => {
    const config = createConfig();
    const serialized = JSON.stringify(config);
    const privateConfig = getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config);

    assert.equal(config.governedMcpVcpNativeRuntimeTarget.accepted, true);
    assert.equal(config.governedMcpVcpNativeHttpMcpTarget.accepted, true);
    assert.equal(config.governedMcpVcpNativeHttpMcpTarget.requestTimeoutMs, 1500);
    assert.deepEqual(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameByAction, {
      record_memory: 'knowledge_base.record',
      search_memory: 'knowledge_base.search'
    });
    assert.equal(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameConfigured, true);
    assert.equal(serialized.includes(privateEndpoint), false);
    assert.equal(serialized.includes(privateToken), false);
    assert.equal(privateConfig.endpoint, privateEndpoint);
    assert.equal(privateConfig.bearerToken, privateToken);
    assert.equal(privateConfig.mcpToolNameConfigured, true);
  });
});

test('governed MCP VCP native WSL NewAPI profile installs default read target without enabling writes', () => {
  const config = createIsolatedConfig({
    governedMcpVcpNativeRuntimeProfile: 'wsl-newapi-prod'
  });
  const serialized = JSON.stringify(config);
  const privateConfig = getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config);

  assert.equal(config.governedMcpVcpNativeRuntimeProfile.profileName, 'wsl-newapi-prod');
  assert.equal(config.governedMcpVcpNativeRuntimeProfile.enabled, true);
  assert.equal(config.governedMcpVcpNativeBridgeGateMode, 'observe');
  assert.equal(config.governedMcpVcpNativeReadDelegationMode, 'primary_with_local_fallback');
  assert.equal(config.governedMcpVcpNativeWriteDelegationMode, 'off');
  assert.equal(config.governedMcpVcpNativeRuntimeTarget.accepted, true);
  assert.equal(
    config.governedMcpVcpNativeRuntimeTarget.targetReferenceName,
    'operator-vcp-toolbox-service-ref'
  );
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.accepted, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.endpointConfigured, true);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.endpointDisclosed, false);
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.tokenMaterialDisclosed, false);
  assert.deepEqual(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameByAction, {
    audit_memory: 'knowledge_base.search',
    memory_overview: 'knowledge_base.search',
    record_memory: 'knowledge_base.record',
    search_memory: 'knowledge_base.search',
    supersede_memory: 'knowledge_base.supersede',
    tombstone_memory: 'knowledge_base.tombstone'
  });
  assert.equal(config.governedMcpVcpNativeHttpMcpTarget.mcpToolNameConfigured, false);
  assert.equal(privateConfig.endpoint, 'http://127.0.0.1:7615/mcp/vcp-native');
  assert.equal(privateConfig.mcpToolNameConfigured, false);
  assert.equal(serialized.includes('http://127.0.0.1:7615'), false);
});

test('governed MCP VCP native WSL NewAPI profile allows explicit write delegation override', () => {
  const config = createIsolatedConfig({
    governedMcpVcpNativeRuntimeProfile: 'wsl-newapi-prod',
    governedMcpVcpNativeWriteDelegationMode: 'primary'
  });

  assert.equal(config.governedMcpVcpNativeReadDelegationMode, 'primary_with_local_fallback');
  assert.equal(config.governedMcpVcpNativeWriteDelegationMode, 'primary');
  assert.deepEqual(config.governedMcpVcpNativeBridgeConfigWarnings, []);
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
