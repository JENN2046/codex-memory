'use strict';

const {
  computeGovernanceRuntimeBindingDigest,
  validateLoopbackEndpoint
} = require('./governance-runtime-authority');
const { reject } = require('../../../packages/chatgpt-r4-contracts');
const {
  diaryScopeMappingBindingFingerprint
} = require('../../core/DiaryScopeMappingBindingFingerprint');

const ISOLATED_SHIM_TARGET_KEYS = Object.freeze([
  'schema_version',
  'target_reference',
  'bind_host',
  'bind_port',
  'mcp_path',
  'listener_observed',
  'loopback_only',
  'native_write_enabled'
]);
const REQUIRED_NATIVE_READ_TOOLS = Object.freeze([
  'knowledge_base.search',
  'memory_overview',
  'audit_memory'
]);
const GOVERNANCE_METADATA_PATH = 'params._meta.codexMemoryGovernance';
const SHIM_SERVER_NAME = 'codex-memory-governed-vcp-toolbox-native-shim';
const SHIM_PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_CAPABILITY_TIMEOUT_MS = 3_000;

async function preparePrivateRuntimeEnvironment({
  baseEnvironment,
  isolatedShimTarget,
  capabilityBearerToken,
  fetchImpl = globalThis.fetch,
  capabilityTimeoutMs = DEFAULT_CAPABILITY_TIMEOUT_MS
} = {}) {
  if (!isPlainObject(baseEnvironment) || !isPlainObject(isolatedShimTarget)) {
    reject('r5k_private_runtime_preparation_invalid');
  }
  assertExactKeys(isolatedShimTarget, ISOLATED_SHIM_TARGET_KEYS);
  if (isolatedShimTarget.schema_version !== 1 ||
      isolatedShimTarget.listener_observed !== true ||
      isolatedShimTarget.loopback_only !== true ||
      isolatedShimTarget.native_write_enabled !== false) {
    reject('r5k_isolated_shim_target_untrusted');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(isolatedShimTarget.target_reference) ||
      /placeholder|example|todo|secret|token/iu.test(isolatedShimTarget.target_reference)) {
    reject('r5k_isolated_shim_target_reference_invalid');
  }
  if (!['127.0.0.1', '::1'].includes(isolatedShimTarget.bind_host) ||
      !Number.isInteger(isolatedShimTarget.bind_port) ||
      isolatedShimTarget.bind_port < 1 ||
      isolatedShimTarget.bind_port > 65_535 ||
      isolatedShimTarget.mcp_path !== '/mcp/vcp-native') {
    reject('r5k_isolated_shim_listener_invalid');
  }
  const host = isolatedShimTarget.bind_host === '::1'
    ? '[::1]'
    : isolatedShimTarget.bind_host;
  const endpoint = validateLoopbackEndpoint(
    `http://${host}:${isolatedShimTarget.bind_port}${isolatedShimTarget.mcp_path}`
  );
  const capability = await probeIsolatedShimCapabilities({
    endpoint,
    expectedMappingReference:
      baseEnvironment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE,
    expectedMappingDigest:
      baseEnvironment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST,
    bearerToken: capabilityBearerToken,
    fetchImpl,
    timeoutMs: capabilityTimeoutMs
  });
  const previousTargetReference =
    baseEnvironment.CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE;
  const previousEndpoint =
    baseEnvironment.CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT;
  const privateEnvironment = {
    ...baseEnvironment,
    CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE: isolatedShimTarget.target_reference,
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: endpoint
  };
  privateEnvironment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST =
    computeGovernanceRuntimeBindingDigest(privateEnvironment);

  return Object.freeze({
    private_environment: Object.freeze(privateEnvironment),
    receipt: Object.freeze({
      schema_version: 2,
      stage: 'R5-N',
      isolated_shim_target_bound: true,
      listener_observed_before_preparation: true,
      loopback_only: true,
      native_write_enabled: false,
      capability_preflight_completed: capability.accepted,
      transport_authorization_supplied:
        capability.transport_authorization_supplied,
      initialize_capability_verified: capability.initialize_capability_verified,
      tools_list_capability_verified: capability.tools_list_capability_verified,
      diary_scope_mapping_loaded: capability.diary_scope_mapping_loaded,
      mapping_binding_fingerprint_matched:
        capability.mapping_binding_fingerprint_matched,
      selected_diary_search_supported:
        capability.selected_diary_search_supported,
      provider_calls_during_preflight: 0,
      native_invocations_during_preflight: 0,
      primary_memory_writes_during_preflight: 0,
      unscoped_native_searches_during_preflight: 0,
      target_reference_bound: true,
      endpoint_bound: true,
      governance_binding_digest_recomputed: true,
      previous_target_replaced:
        previousTargetReference !== isolatedShimTarget.target_reference ||
        previousEndpoint !== endpoint,
      endpoint_disclosed: false,
      target_reference_disclosed: false,
      secret_values_returned: false
    })
  });
}

async function probeIsolatedShimCapabilities({
  endpoint,
  expectedMappingReference,
  expectedMappingDigest,
  bearerToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_CAPABILITY_TIMEOUT_MS
} = {}) {
  const validatedEndpoint = validateLoopbackEndpoint(endpoint);
  const expectedFingerprint = diaryScopeMappingBindingFingerprint(
    expectedMappingReference,
    expectedMappingDigest
  );
  if (expectedFingerprint === null) {
    reject('r5n_expected_mapping_binding_invalid');
  }
  const authorizationToken = normalizeCapabilityBearerToken(bearerToken);
  if (typeof fetchImpl !== 'function' ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 100 ||
      timeoutMs > 10_000) {
    reject('r5n_capability_probe_invalid');
  }

  const initialize = await postCapabilityJsonRpc({
    endpoint: validatedEndpoint,
    method: 'initialize',
    id: 'codex-memory-r5n-capability-initialize',
    bearerToken: authorizationToken,
    fetchImpl,
    timeoutMs
  });
  const toolsList = await postCapabilityJsonRpc({
    endpoint: validatedEndpoint,
    method: 'tools/list',
    id: 'codex-memory-r5n-capability-tools-list',
    bearerToken: authorizationToken,
    fetchImpl,
    timeoutMs
  });
  const initializeResult = initialize.result;
  const toolsListResult = toolsList.result;
  const initializeMeta = initializeResult?._meta;
  const toolsListMeta = toolsListResult?._meta;
  if (!isPlainObject(initializeResult) ||
      initializeResult.protocolVersion !== SHIM_PROTOCOL_VERSION ||
      initializeResult.serverInfo?.name !== SHIM_SERVER_NAME ||
      !isPlainObject(initializeResult.capabilities?.tools) ||
      !validCapabilityMetadata(initializeMeta, expectedFingerprint)) {
    reject('r5n_shim_initialize_capability_rejected');
  }
  if (!isPlainObject(toolsListResult) ||
      !Array.isArray(toolsListResult.tools) ||
      !validCapabilityMetadata(toolsListMeta, expectedFingerprint)) {
    reject('r5n_shim_tools_list_capability_rejected');
  }
  const tools = toolsListResult.tools;
  const toolNames = tools.map(tool =>
    isPlainObject(tool) && typeof tool.name === 'string' ? tool.name : null
  );
  if (toolNames.some(name => name === null) ||
      toolNames.length !== REQUIRED_NATIVE_READ_TOOLS.length ||
      REQUIRED_NATIVE_READ_TOOLS.some(name => !toolNames.includes(name)) ||
      tools.some(tool => !validReadToolDescriptor(tool))) {
    reject('r5n_selected_diary_read_capability_rejected');
  }

  return Object.freeze({
    schema_version: 1,
    accepted: true,
    low_disclosure: true,
    transport_authorization_supplied: true,
    initialize_capability_verified: true,
    tools_list_capability_verified: true,
    diary_scope_mapping_loaded: true,
    mapping_binding_fingerprint_matched: true,
    selected_diary_search_supported: true,
    native_write_enabled: false,
    provider_calls: 0,
    native_invocations: 0,
    primary_memory_writes: 0,
    unscoped_native_searches: 0,
    endpoint_disclosed: false,
    mapping_reference_disclosed: false,
    mapping_digest_disclosed: false,
    mapping_binding_fingerprint_disclosed: false,
    raw_tool_names_disclosed: false,
    raw_response_disclosed: false,
    readiness_claimed: false
  });
}

async function postCapabilityJsonRpc({
  endpoint,
  method,
  id,
  bearerToken,
  fetchImpl,
  timeoutMs
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${bearerToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params: {}
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') reject('r5n_capability_probe_timeout');
    reject('r5n_capability_probe_transport_unavailable');
  } finally {
    clearTimeout(timeout);
  }
  if (!response || response.ok !== true || typeof response.json !== 'function') {
    reject('r5n_capability_probe_http_rejected');
  }
  let body;
  try {
    body = await response.json();
  } catch {
    reject('r5n_capability_probe_invalid_json');
  }
  if (!isPlainObject(body) ||
      body.jsonrpc !== '2.0' ||
      body.id !== id ||
      Object.hasOwn(body, 'error') ||
      !isPlainObject(body.result)) {
    reject('r5n_capability_probe_jsonrpc_rejected');
  }
  return body;
}

function validCapabilityMetadata(metadata, expectedFingerprint) {
  return isPlainObject(metadata) &&
    metadata.bridge === 'codex-memory-governed-vcp-toolbox-native-memory' &&
    metadata.governanceMetadataPath === GOVERNANCE_METADATA_PATH &&
    metadata.writeEnabled === false &&
    metadata.lowDisclosure === true &&
    metadata.rawOutputAllowed === undefined &&
    metadata.endpointDisclosed === false &&
    metadata.tokenMaterialDisclosed === false &&
    metadata.locatorDisclosed === false &&
    metadata.configEnvRead === false &&
    metadata.providerApiCalled === false &&
    metadata.nativeRuntimeCalled === false &&
    metadata.scopeEnforcementMode === 'diary_allowlist_v1' &&
    metadata.mappingConfigured === true &&
    metadata.mappingReferenceBound === true &&
    metadata.mappingDigestBound === true &&
    metadata.mappingBindingFingerprint === expectedFingerprint &&
    metadata.mappingBindingFingerprintDisclosed === true &&
    metadata.exactMappingReferenceDisclosed === false &&
    metadata.exactMappingDigestDisclosed === false &&
    metadata.readinessClaimed === false;
}

function normalizeCapabilityBearerToken(value) {
  if (typeof value !== 'string' ||
      value.length < 1 ||
      value.length > 4096 ||
      value.trim() !== value ||
      /[\r\n\u0000]/u.test(value)) {
    reject('r5n_capability_authorization_invalid');
  }
  return value;
}

function validReadToolDescriptor(tool) {
  if (!isPlainObject(tool) ||
      !REQUIRED_NATIVE_READ_TOOLS.includes(tool.name) ||
      !isPlainObject(tool.inputSchema) ||
      !isPlainObject(tool.inputSchema._meta) ||
      !isPlainObject(tool._meta) ||
      tool.inputSchema._meta.codexMemoryGovernanceRequired !== true ||
      tool.inputSchema._meta.governanceMetadataPath !== GOVERNANCE_METADATA_PATH ||
      tool.inputSchema._meta.nativeToolName !== tool.name ||
      tool.inputSchema._meta.toolArgumentsMayCarryGovernance !== false ||
      tool.inputSchema._meta.rawOutputAllowed !== false ||
      tool.inputSchema._meta.lowDisclosure !== true ||
      tool._meta.readAllowed !== true ||
      tool._meta.writeAllowed !== false ||
      tool._meta.exactApprovalRequired !== false ||
      tool._meta.lowDisclosure !== true ||
      tool._meta.rawOutputAllowed !== false ||
      tool._meta.readinessClaimed !== false) {
    return false;
  }
  const expectedPublicTools = {
    'knowledge_base.search': ['search_memory'],
    memory_overview: ['memory_overview'],
    audit_memory: ['audit_memory']
  }[tool.name];
  return exactStringArray(tool.inputSchema._meta.publicToolNames, expectedPublicTools) &&
    exactStringArray(tool._meta.publicToolNames, expectedPublicTools);
}

function exactStringArray(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function assertExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (actual.length !== sortedExpected.length ||
      actual.some((key, index) => key !== sortedExpected[index])) {
    reject('r5k_isolated_shim_target_shape_invalid');
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  DEFAULT_CAPABILITY_TIMEOUT_MS,
  ISOLATED_SHIM_TARGET_KEYS,
  REQUIRED_NATIVE_READ_TOOLS,
  preparePrivateRuntimeEnvironment,
  probeIsolatedShimCapabilities
};
