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
const {
  normalizeRecordMemoryPrincipalScopeAuthorizationConfig
} = require('../core/RecordMemoryPrincipalScopeAuthorizationConfig');
const {
  normalizeGovernedMcpVcpNativeRuntimeTargetConfig
} = require('../core/GovernedMcpVcpNativeRuntimeTargetConfig');
const {
  attachGovernedMcpVcpNativeHttpMcpTargetPrivateConfig,
  normalizeGovernedMcpVcpNativeHttpMcpTargetConfig
} = require('../core/GovernedMcpVcpNativeHttpMcpTargetConfig');
const {
  buildChatGptWebProfileConfig
} = require('../core/ChatGptWebProfile');
const {
  attachChatGptWebUdsPrivateConfig,
  normalizeChatGptWebUdsConfig
} = require('../core/ChatGptWebUdsConfig');

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
    if (Array.isArray(value) && value.length === 0) continue;
    return value;
  }
  return undefined;
}

function getNestedPlainObject(source, key) {
  return source && typeof source === 'object' && !Array.isArray(source) &&
    source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
    ? source[key]
    : {};
}

function buildRecordMemoryPrincipalScopeAuthorizationConfigSource({
  overrides = {},
  env = process.env,
  profileParams = {}
} = {}) {
  const overrideConfig = getNestedPlainObject(overrides, 'recordMemoryPrincipalScopeAuthorization');
  const profileConfig = getNestedPlainObject(profileParams, 'recordMemoryPrincipalScopeAuthorization');
  const overridePolicy = getNestedPlainObject(overrideConfig, 'policy');
  const profilePolicy = getNestedPlainObject(profileConfig, 'policy');

  return {
    mode: pickFirstNonEmpty(
      overrideConfig.mode,
      env.CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE,
      profileConfig.mode,
      'off'
    ),
    policy: {
      allowedAgentAlias: pickFirstNonEmpty(
        overridePolicy.allowedAgentAlias,
        overrideConfig.allowedAgentAlias,
        env.CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS,
        profilePolicy.allowedAgentAlias,
        profileConfig.allowedAgentAlias
      ),
      allowedAgentIds: pickFirstNonEmpty(
        overridePolicy.allowedAgentIds,
        overrideConfig.allowedAgentIds,
        env.CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS,
        profilePolicy.allowedAgentIds,
        profileConfig.allowedAgentIds
      ),
      allowedRequestSources: pickFirstNonEmpty(
        overridePolicy.allowedRequestSources,
        overrideConfig.allowedRequestSources,
        env.CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES,
        profilePolicy.allowedRequestSources,
        profileConfig.allowedRequestSources
      ),
      allowedProjectIds: pickFirstNonEmpty(
        overridePolicy.allowedProjectIds,
        overrideConfig.allowedProjectIds,
        env.CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS,
        profilePolicy.allowedProjectIds,
        profileConfig.allowedProjectIds
      ),
      allowedWorkspaceIds: pickFirstNonEmpty(
        overridePolicy.allowedWorkspaceIds,
        overrideConfig.allowedWorkspaceIds,
        env.CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS,
        profilePolicy.allowedWorkspaceIds,
        profileConfig.allowedWorkspaceIds
      ),
      allowedClientIds: pickFirstNonEmpty(
        overridePolicy.allowedClientIds,
        overrideConfig.allowedClientIds,
        env.CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS,
        profilePolicy.allowedClientIds,
        profileConfig.allowedClientIds
      )
    }
  };
}

function buildGovernedMcpVcpNativeRuntimeTargetConfigSource({
  overrides = {},
  env = process.env,
  profileParams = {},
  runtimeProfile = {}
} = {}) {
  const overrideConfig = getNestedPlainObject(overrides, 'governedMcpVcpNativeRuntimeTarget');
  const profileConfig = getNestedPlainObject(profileParams, 'governedMcpVcpNativeRuntimeTarget');

  return {
    ...runtimeProfile.runtimeTarget,
    ...profileConfig,
    ...overrideConfig,
    targetReferenceName: pickFirstNonEmpty(
      overrideConfig.targetReferenceName,
      overrideConfig.target_reference_name,
      overrides.governedMcpVcpNativeTargetReferenceName,
      env.CODEX_MEMORY_VCP_NATIVE_TARGET_REFERENCE_NAME,
      profileConfig.targetReferenceName,
      profileConfig.target_reference_name,
      runtimeProfile.runtimeTarget?.targetReferenceName,
      runtimeProfile.runtimeTarget?.target_reference_name
    ),
    targetKind: pickFirstNonEmpty(
      overrideConfig.targetKind,
      overrideConfig.target_kind,
      overrides.governedMcpVcpNativeTargetKind,
      env.CODEX_MEMORY_VCP_NATIVE_TARGET_KIND,
      profileConfig.targetKind,
      profileConfig.target_kind,
      runtimeProfile.runtimeTarget?.targetKind,
      runtimeProfile.runtimeTarget?.target_kind
    )
  };
}

function buildGovernedMcpVcpNativeHttpMcpTargetConfigSource({
  overrides = {},
  env = process.env,
  profileParams = {},
  runtimeTarget = {},
  runtimeProfile = {}
} = {}) {
  const overrideConfig = getNestedPlainObject(overrides, 'governedMcpVcpNativeHttpMcpTarget');
  const profileConfig = getNestedPlainObject(profileParams, 'governedMcpVcpNativeHttpMcpTarget');

  return {
    ...runtimeProfile.httpMcpTarget,
    ...profileConfig,
    ...overrideConfig,
    targetReferenceName: pickFirstNonEmpty(
      overrideConfig.targetReferenceName,
      overrideConfig.target_reference_name,
      overrides.governedMcpVcpNativeHttpMcpTargetReferenceName,
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TARGET_REFERENCE_NAME,
      runtimeTarget.targetReferenceName,
      profileConfig.targetReferenceName,
      profileConfig.target_reference_name,
      runtimeProfile.httpMcpTarget?.targetReferenceName,
      runtimeProfile.httpMcpTarget?.target_reference_name
    ),
    endpoint: pickFirstNonEmpty(
      overrideConfig.endpoint,
      overrideConfig.url,
      overrides.governedMcpVcpNativeHttpMcpEndpoint,
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT,
      profileConfig.endpoint,
      profileConfig.url,
      runtimeProfile.httpMcpTarget?.endpoint,
      runtimeProfile.httpMcpTarget?.url
    ),
    bearerToken: pickFirstNonEmpty(
      overrideConfig.bearerToken,
      overrideConfig.token,
      overrides.governedMcpVcpNativeHttpMcpBearerToken,
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN,
      profileConfig.bearerToken,
      profileConfig.token,
      runtimeProfile.httpMcpTarget?.bearerToken,
      runtimeProfile.httpMcpTarget?.token
    ),
    mcpToolName: pickFirstNonEmpty(
      overrideConfig.mcpToolName,
      overrideConfig.mcp_tool_name,
      overrides.governedMcpVcpNativeHttpMcpToolName,
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME,
      profileConfig.mcpToolName,
      profileConfig.mcp_tool_name,
      runtimeProfile.httpMcpTarget?.mcpToolName,
      runtimeProfile.httpMcpTarget?.mcp_tool_name
    ),
    mcpToolNameByAction: overrideConfig.mcpToolNameByAction ||
      overrideConfig.mcp_tool_name_by_action ||
      overrides.governedMcpVcpNativeHttpMcpToolNameByAction ||
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME_BY_ACTION ||
      profileConfig.mcpToolNameByAction ||
      profileConfig.mcp_tool_name_by_action ||
      runtimeProfile.httpMcpTarget?.mcpToolNameByAction ||
      runtimeProfile.httpMcpTarget?.mcp_tool_name_by_action,
    requestTimeoutMs: pickFirstNonEmpty(
      overrideConfig.requestTimeoutMs,
      overrideConfig.request_timeout_ms,
      overrides.governedMcpVcpNativeHttpMcpRequestTimeoutMs,
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TIMEOUT_MS,
      profileConfig.requestTimeoutMs,
      profileConfig.request_timeout_ms,
      runtimeProfile.httpMcpTarget?.requestTimeoutMs,
      runtimeProfile.httpMcpTarget?.request_timeout_ms
    )
  };
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

function normalizeGovernedMcpVcpNativeBridgeGateMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ['off', 'observe', 'strict'].includes(normalized) ? normalized : 'off';
}

function normalizeGovernedMcpVcpNativeReadDelegationMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ['off', 'primary', 'primary_with_local_fallback'].includes(normalized) ? normalized : 'off';
}

function normalizeGovernedMcpVcpNativeWriteDelegationMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ['off', 'primary'].includes(normalized) ? normalized : 'off';
}

function normalizeGovernedMcpVcpNativeRuntimeProfile(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return [
    'off',
    'wsl-newapi-prod',
    'wsl_newapi_prod',
    'vcp-native-shim-local',
    'vcp_native_shim_local'
  ].includes(normalized)
    ? normalized.replaceAll('_', '-')
    : 'off';
}

function normalizeMcpPublicToolSurface(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase().replaceAll('-', '_') : '';
  return [
    'read_only',
    'controlled_mutation',
    'write',
    'full'
  ].includes(normalized)
    ? normalized
    : 'read_only';
}

function buildGovernedMcpVcpNativeRuntimeProfileDefaults(profileName) {
  if (profileName !== 'wsl-newapi-prod' && profileName !== 'vcp-native-shim-local') {
    return {
      profileName: 'off',
      enabled: false,
      runtimeTarget: {},
      httpMcpTarget: {},
      bridgeGateMode: 'off',
      readDelegationMode: 'off',
      writeDelegationMode: 'off'
    };
  }

  return {
    profileName,
    enabled: true,
    runtimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    httpMcpTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: 'http://127.0.0.1:7615/mcp/vcp-native',
      requestTimeoutMs: 30000,
      mcpToolNameByAction: {
        search_memory: 'knowledge_base.search',
        memory_overview: 'memory_overview',
        audit_memory: 'audit_memory',
        record_memory: 'knowledge_base.record',
        tombstone_memory: 'knowledge_base.tombstone',
        supersede_memory: 'knowledge_base.supersede'
      }
    },
    bridgeGateMode: 'observe',
    readDelegationMode: 'primary_with_local_fallback',
    writeDelegationMode: 'off'
  };
}

function buildGovernedMcpVcpNativeBridgeConfigWarnings({
  bridgeGateMode = 'off',
  readDelegationMode = 'off',
  writeDelegationMode = 'off',
  runtimeTarget = {},
  httpMcpTarget = {}
} = {}) {
  const warnings = [];
  const readDelegationRequested = readDelegationMode !== 'off';
  const writeDelegationRequested = writeDelegationMode !== 'off';
  const nativeTargetAccepted =
    runtimeTarget?.accepted === true && httpMcpTarget?.accepted === true;

  if (bridgeGateMode === 'off' && readDelegationRequested) {
    warnings.push({
      code: 'native_read_delegation_requires_bridge_gate',
      lowDisclosure: true,
      effect: 'read_delegation_fail_closed'
    });
  }
  if (bridgeGateMode === 'off' && writeDelegationRequested) {
    warnings.push({
      code: 'native_write_delegation_requires_bridge_gate',
      lowDisclosure: true,
      effect: 'write_delegation_fail_closed'
    });
  }
  if (readDelegationRequested && !nativeTargetAccepted) {
    warnings.push({
      code: 'native_read_delegation_requires_accepted_native_target',
      lowDisclosure: true,
      effect: 'read_delegation_fail_closed'
    });
  }
  if (writeDelegationRequested && !nativeTargetAccepted) {
    warnings.push({
      code: 'native_write_delegation_requires_accepted_native_target',
      lowDisclosure: true,
      effect: 'write_delegation_fail_closed'
    });
  }
  return warnings;
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

  // Resolve provider gate and profile BEFORE endpoint/fingerprint computation.
  // When allowExternalProvider is false, configured endpoints must not
  // participate in embeddingFingerprint or vectorIndexPath — only local-hash
  // profile is written.
  const securityProfile = String(
    pickFirstNonEmpty(overrides.securityProfile, process.env.CODEX_MEMORY_SECURITY_PROFILE, 'local')
  ).trim().toLowerCase();
  const isHardened = securityProfile === 'hardened';

  const _resolveBool = (overrideVal, envKey, profileDefault) => {
    if (overrideVal !== undefined && overrideVal !== null) {
      return toBoolean(overrideVal, profileDefault);
    }
    const envVal = process.env[envKey];
    if (envVal !== undefined && envVal !== null) {
      return toBoolean(envVal, profileDefault);
    }
    return profileDefault;
  };

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

  const configuredEmbeddingEndpoints = [];
  const seenEmbeddingEndpoints = new Set();

  // Resolve allowExternalProvider fail-closed. Configured endpoints are
  // inert unless CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER or an override
  // explicitly enables the provider gate.
  const allowExternalProvider = _resolveBool(
    overrides.allowExternalProvider,
    'CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER',
    false
  );

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
    configuredEmbeddingEndpoints.push(endpoint);
  }

  // When external providers are disabled, configured endpoints must NOT
  // participate in embeddingFingerprint/vectorIndexPath — only local-hash
  // profile is written to disk.
  const embeddingEndpoints = allowExternalProvider
    ? configuredEmbeddingEndpoints
    : [];

  const activeEmbeddingEndpoint = embeddingEndpoints[0] || {
    name: 'local-hash',
    provider: 'local',
    url: '',
    apiKey: '',
    model: 'local-hash',
    path: 'local-hash',
    headers: {},
    timeoutMs: 0,
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
  const ragProfileConfig = loadRagProfileConfig({
    filePath: resolveAbsolutePath(
      basePath,
      overrides.ragParamsPath || process.env.CODEX_MEMORY_RAG_PARAMS_PATH || ''
    ),
    embeddingFingerprint
  });
  const governedMcpVcpNativeRuntimeProfile =
    buildGovernedMcpVcpNativeRuntimeProfileDefaults(
      normalizeGovernedMcpVcpNativeRuntimeProfile(
        pickFirstNonEmpty(
          overrides.governedMcpVcpNativeRuntimeProfile,
          process.env.CODEX_MEMORY_VCP_NATIVE_RUNTIME_PROFILE,
          'off'
        )
      )
    );
  const governedMcpVcpNativeRuntimeTarget = normalizeGovernedMcpVcpNativeRuntimeTargetConfig(
    buildGovernedMcpVcpNativeRuntimeTargetConfigSource({
      overrides,
      profileParams: ragProfileConfig.params,
      runtimeProfile: governedMcpVcpNativeRuntimeProfile
    })
  );
  const governedMcpVcpNativeHttpMcpTarget =
    normalizeGovernedMcpVcpNativeHttpMcpTargetConfig(
      buildGovernedMcpVcpNativeHttpMcpTargetConfigSource({
        overrides,
        profileParams: ragProfileConfig.params,
        runtimeTarget: governedMcpVcpNativeRuntimeTarget,
        runtimeProfile: governedMcpVcpNativeRuntimeProfile
      })
    );
  const governedMcpVcpNativeBridgeGateMode = normalizeGovernedMcpVcpNativeBridgeGateMode(
    pickFirstNonEmpty(
      overrides.governedMcpVcpNativeBridgeGateMode,
      process.env.CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_BRIDGE_GATE_MODE,
      governedMcpVcpNativeRuntimeProfile.bridgeGateMode,
      'off'
    )
  );
  const governedMcpVcpNativeReadDelegationMode = normalizeGovernedMcpVcpNativeReadDelegationMode(
    pickFirstNonEmpty(
      overrides.governedMcpVcpNativeReadDelegationMode,
      process.env.CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_MODE,
      governedMcpVcpNativeRuntimeProfile.readDelegationMode,
      'off'
    )
  );
  const governedMcpVcpNativeWriteDelegationMode = normalizeGovernedMcpVcpNativeWriteDelegationMode(
    pickFirstNonEmpty(
      overrides.governedMcpVcpNativeWriteDelegationMode,
      process.env.CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_MODE,
      governedMcpVcpNativeRuntimeProfile.writeDelegationMode,
      'off'
    )
  );
  const governedMcpVcpNativeBridgeConfigWarnings =
    buildGovernedMcpVcpNativeBridgeConfigWarnings({
      bridgeGateMode: governedMcpVcpNativeBridgeGateMode,
      readDelegationMode: governedMcpVcpNativeReadDelegationMode,
      writeDelegationMode: governedMcpVcpNativeWriteDelegationMode,
      runtimeTarget: governedMcpVcpNativeRuntimeTarget,
      httpMcpTarget: governedMcpVcpNativeHttpMcpTarget.publicConfig
    });
  const expectedDiaryScopeMappingReference = String(pickFirstNonEmpty(
    overrides.expectedDiaryScopeMappingReference,
    process.env.CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE,
    ''
  )).trim();
  const expectedDiaryScopeMappingDigest = String(pickFirstNonEmpty(
    overrides.expectedDiaryScopeMappingDigest,
    process.env.CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST,
    ''
  )).trim();
  const governedMcpVcpNativeScopeEnforcement = Object.freeze({
    scopeEnforcementMode: 'diary_allowlist_v1',
    expectedMappingReference: expectedDiaryScopeMappingReference === 'jenn-vcp-diary-scope-v1'
      ? expectedDiaryScopeMappingReference
      : null,
    expectedMappingDigest: /^sha256:[a-f0-9]{64}$/.test(expectedDiaryScopeMappingDigest)
      ? expectedDiaryScopeMappingDigest
      : null,
    configured: expectedDiaryScopeMappingReference === 'jenn-vcp-diary-scope-v1' &&
      /^sha256:[a-f0-9]{64}$/.test(expectedDiaryScopeMappingDigest),
    toolArgumentsMayOverride: false,
    governanceMetadataMayOverride: false,
    scopeIdAffectsDiaryAcl: false,
    readinessClaimed: false
  });
  const requestedMcpPublicToolSurface = normalizeMcpPublicToolSurface(
    pickFirstNonEmpty(
      overrides.mcpPublicToolSurface,
      process.env.CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE,
      process.env.CODEX_MEMORY_MCP_TOOL_SURFACE,
      'read_only'
    )
  );
  const exposeControlledMutationMcpTools = _resolveBool(
    overrides.exposeControlledMutationMcpTools,
    'CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS',
    false
  );
  const exposeWriteMcpTools = _resolveBool(
    overrides.exposeWriteMcpTools,
    'CODEX_MEMORY_EXPOSE_WRITE_TOOLS',
    false
  );
  const mcpPublicToolSurface = isHardened
    ? 'read_only'
    : requestedMcpPublicToolSurface;
  const requestedMcpPublicToolNames = normalizeStringList(
    pickFirstNonEmpty(
      overrides.mcpPublicToolNames,
      process.env.CODEX_MEMORY_MCP_PUBLIC_TOOLS,
      ''
    )
  );
  const chatgptWebProfileOverrides = getNestedPlainObject(overrides, 'chatgptWebProfile');
  const chatgptWebServerFixedScopeOverrides = getNestedPlainObject(
    overrides,
    'chatgptWebServerFixedScope'
  );
  const chatgptWebProfileScopeOverrides = getNestedPlainObject(
    chatgptWebProfileOverrides,
    'serverFixedScope'
  );
  const chatgptWebProfile = buildChatGptWebProfileConfig({
    profileId: pickFirstNonEmpty(
      overrides.chatgptWebProfileId,
      chatgptWebProfileOverrides.profileId,
      process.env.CODEX_MEMORY_CHATGPT_WEB_PROFILE,
      'off'
    ),
    enabled: _resolveBool(
      pickFirstNonEmpty(
        overrides.chatgptWebProfileEnabled,
        chatgptWebProfileOverrides.enabled
      ),
      'CODEX_MEMORY_CHATGPT_WEB_PROFILE_ENABLED',
      false
    ),
    compositeReadGatePassed: _resolveBool(
      pickFirstNonEmpty(
        overrides.chatgptWebCompositeReadGatePassed,
        chatgptWebProfileOverrides.compositeReadGatePassed
      ),
      'CODEX_MEMORY_CHATGPT_WEB_COMPOSITE_READ_GATE_PASSED',
      false
    ),
    serverFixedScope: {
      projectId: pickFirstNonEmpty(
        overrides.chatgptWebProjectId,
        chatgptWebServerFixedScopeOverrides.projectId,
        chatgptWebServerFixedScopeOverrides.project_id,
        chatgptWebProfileScopeOverrides.projectId,
        chatgptWebProfileScopeOverrides.project_id,
        process.env.CODEX_MEMORY_CHATGPT_WEB_PROJECT_ID
      ),
      workspaceId: pickFirstNonEmpty(
        overrides.chatgptWebWorkspaceId,
        chatgptWebServerFixedScopeOverrides.workspaceId,
        chatgptWebServerFixedScopeOverrides.workspace_id,
        chatgptWebProfileScopeOverrides.workspaceId,
        chatgptWebProfileScopeOverrides.workspace_id,
        process.env.CODEX_MEMORY_CHATGPT_WEB_WORKSPACE_ID
      ),
      scopeId: pickFirstNonEmpty(
        overrides.chatgptWebScopeId,
        chatgptWebServerFixedScopeOverrides.scopeId,
        chatgptWebServerFixedScopeOverrides.scope_id,
        chatgptWebProfileScopeOverrides.scopeId,
        chatgptWebProfileScopeOverrides.scope_id,
        process.env.CODEX_MEMORY_CHATGPT_WEB_SCOPE_ID
      ),
      visibility: pickFirstNonEmpty(
        overrides.chatgptWebVisibility,
        chatgptWebServerFixedScopeOverrides.visibility,
        chatgptWebServerFixedScopeOverrides.visibility_policy,
        chatgptWebProfileScopeOverrides.visibility,
        chatgptWebProfileScopeOverrides.visibility_policy,
        process.env.CODEX_MEMORY_CHATGPT_WEB_VISIBILITY
      )
    }
  });
  const chatgptWebUdsOverrides = getNestedPlainObject(overrides, 'chatgptWebUds');
  const chatgptWebUdsConfig = normalizeChatGptWebUdsConfig({
    basePath,
    enabled: _resolveBool(
      pickFirstNonEmpty(
        overrides.chatgptWebUdsEnabled,
        chatgptWebUdsOverrides.enabled
      ),
      'CODEX_MEMORY_CHATGPT_WEB_UDS_ENABLED',
      false
    ),
    socketDirectory: pickFirstNonEmpty(
      overrides.chatgptWebUdsSocketDirectory,
      chatgptWebUdsOverrides.socketDirectory,
      chatgptWebUdsOverrides.socket_directory,
      process.env.CODEX_MEMORY_CHATGPT_WEB_UDS_SOCKET_DIR
    ),
    socketName: pickFirstNonEmpty(
      overrides.chatgptWebUdsSocketName,
      chatgptWebUdsOverrides.socketName,
      chatgptWebUdsOverrides.socket_name,
      process.env.CODEX_MEMORY_CHATGPT_WEB_UDS_SOCKET_NAME
    ),
    bridgeAuthSecretFile: pickFirstNonEmpty(
      overrides.chatgptWebBridgeAuthSecretFile,
      chatgptWebUdsOverrides.bridgeAuthSecretFile,
      chatgptWebUdsOverrides.bridge_auth_secret_file,
      process.env.CODEX_MEMORY_CHATGPT_WEB_BRIDGE_AUTH_FILE
    ),
    allowedOrigins: pickFirstNonEmpty(
      overrides.chatgptWebUdsAllowedOrigins,
      chatgptWebUdsOverrides.allowedOrigins,
      chatgptWebUdsOverrides.allowed_origins,
      process.env.CODEX_MEMORY_CHATGPT_WEB_UDS_ALLOWED_ORIGINS,
      []
    ),
    enabledProfileIds: pickFirstNonEmpty(
      overrides.chatgptWebUdsProfileIds,
      chatgptWebUdsOverrides.enabledProfileIds,
      chatgptWebUdsOverrides.enabled_profile_ids,
      process.env.CODEX_MEMORY_CHATGPT_WEB_UDS_PROFILES,
      []
    ),
    fallbackProfileId: chatgptWebProfile.profileId
  });
  const embeddingProfileDir = path.join(dataDir, 'embedding-profiles', embeddingFingerprint);
  const vectorIndexPath = resolveAbsolutePath(
    basePath,
    overrides.vectorIndexPath || process.env.CODEX_MEMORY_VECTOR_PATH || path.join(embeddingProfileDir, VECTOR_INDEX_FILE_NAME)
  );

  // Security profile (resolved above before endpoint building).
  // _resolveBool and allowExternalProvider are already computed.

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
    defaultProjectId: overrides.defaultProjectId || process.env.CODEX_MEMORY_PROJECT_ID || '',
    defaultWorkspaceId: overrides.defaultWorkspaceId || process.env.CODEX_MEMORY_WORKSPACE_ID || '',
    defaultScopeId: overrides.defaultScopeId || process.env.CODEX_MEMORY_SCOPE_ID || '',
    defaultClientId: overrides.defaultClientId || process.env.CODEX_MEMORY_CLIENT_ID || '',
    defaultVisibility: overrides.defaultVisibility || process.env.CODEX_MEMORY_VISIBILITY || '',
    httpHost: overrides.httpHost || process.env.CODEX_MEMORY_HTTP_HOST || '127.0.0.1',
    httpPort: parsePositiveInteger(overrides.httpPort || process.env.CODEX_MEMORY_HTTP_PORT || '7605', 7605),
    httpMcpPath: normalizeHttpPath(overrides.httpMcpPath || process.env.CODEX_MEMORY_HTTP_PATH || '/mcp/codex-memory'),
    httpBearerToken: overrides.httpBearerToken || process.env.CODEX_MEMORY_HTTP_TOKEN || '',
    mcpPublicToolSurface,
    mcpPublicToolNames: isHardened ? [] : requestedMcpPublicToolNames,
    exposeControlledMutationMcpTools: isHardened ? false : exposeControlledMutationMcpTools,
    exposeWriteMcpTools: isHardened ? false : exposeWriteMcpTools,
    chatgptWebProfile,
    chatgptWebUds: chatgptWebUdsConfig.publicConfig,
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
    searchMemoryTimeoutMs: parsePositiveInteger(overrides.searchMemoryTimeoutMs || process.env.CODEX_MEMORY_SEARCH_TIMEOUT_MS || '30000', 30000),
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
    securityProfile,
    enableSoftReadPolicy: _resolveBool(overrides.enableSoftReadPolicy, 'CODEX_MEMORY_ENABLE_SOFT_READ_POLICY', isHardened),
    enableLifecycleReadPolicy: _resolveBool(overrides.enableLifecycleReadPolicy, 'CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY', isHardened),
    enableWritePreflight: _resolveBool(overrides.enableWritePreflight, 'CODEX_MEMORY_ENABLE_WRITE_PREFLIGHT', isHardened),
    governedMcpVcpNativeBridgeGateMode,
    governedMcpVcpNativeReadDelegationMode,
    governedMcpVcpNativeWriteDelegationMode,
    governedMcpVcpNativeRuntimeProfile: {
      profileName: governedMcpVcpNativeRuntimeProfile.profileName,
      enabled: governedMcpVcpNativeRuntimeProfile.enabled,
      endpointDisclosed: false,
      tokenMaterialDisclosed: false,
      readinessClaimed: false
    },
    governedMcpVcpNativeBridgeConfigWarnings,
    governedMcpVcpNativeScopeEnforcement,
    governedMcpVcpNativeRuntimeTarget,
    governedMcpVcpNativeHttpMcpTarget: governedMcpVcpNativeHttpMcpTarget.publicConfig,
    recordMemoryPrincipalScopeAuthorization:
      normalizeRecordMemoryPrincipalScopeAuthorizationConfig(
        buildRecordMemoryPrincipalScopeAuthorizationConfigSource({
          overrides,
          profileParams: ragProfileConfig.params
        })
      ),
    allowExternalProvider,
    enableWriteManifest: toBoolean(overrides.enableWriteManifest ?? process.env.CODEX_MEMORY_ENABLE_WRITE_MANIFEST, true),
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

  const finalConfig = applyRagProfileToConfig(
    baseConfig,
    ragProfileConfig
  );
  return attachChatGptWebUdsPrivateConfig(
    attachGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(
      finalConfig,
      governedMcpVcpNativeHttpMcpTarget.privateConfig
    ),
    chatgptWebUdsConfig.privateConfig
  );
}

module.exports = {
  createConfig,
  normalizeGovernedMcpVcpNativeBridgeGateMode,
  buildGovernedMcpVcpNativeBridgeConfigWarnings,
  normalizeGovernedMcpVcpNativeReadDelegationMode,
  normalizeGovernedMcpVcpNativeWriteDelegationMode,
  normalizeHttpPath,
  parseJsonObject,
  resolveAbsolutePath,
  toBoolean
};
