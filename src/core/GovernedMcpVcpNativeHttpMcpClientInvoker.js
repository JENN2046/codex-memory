'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal
} = require('./CurrentProductGoalContract');
const {
  DEFAULT_REQUEST_TIMEOUT_MS,
  normalizeHttpMcpRequestTimeoutMs
} = require('./GovernedMcpVcpNativeHttpMcpTimeoutPolicy');

const CONTRACT_NAME = 'GovernedMcpVcpNativeHttpMcpClientInvoker';
const CONTRACT_MODE = 'safe_reference_bound_http_jsonrpc_tools_call_invoker';
const ALLOWED_STATUS_CLASSES = Object.freeze([
  'success',
  'not_available',
  'transport_error',
  'client_error',
  'server_error'
]);
const ALLOWED_HTTP_STATUS_CLASSES = Object.freeze([
  'success',
  'transport_error',
  'client_error',
  'server_error'
]);
const ALLOWED_FAILURE_CATEGORIES = Object.freeze([
  'timeout',
  'transport_unavailable',
  'http_client_error',
  'http_server_error',
  'invalid_response',
  'response_id_mismatch',
  'governance_rejected',
  'scope_authorization_rejected',
  'scope_binding_rejected',
  'provider_embedding_failed',
  'native_runtime_initialization_failed',
  'native_scoped_search_failed',
  'result_scope_postcheck_failed',
  'native_runtime_failed'
]);
const ALLOWED_RESPONSE_SHAPE_CATEGORIES = Object.freeze([
  'array_top_level_kind_only',
  'object_top_level_kind_only_no_field_names',
  'null_top_level_kind_only',
  'primitive_top_level_kind_only',
  'unknown_shape',
  'not_consumed'
]);
const ALLOWED_TOP_LEVEL_KIND_CATEGORIES = Object.freeze([
  'array',
  'object',
  'null',
  'string',
  'number',
  'boolean',
  'unknown',
  'not_consumed'
]);
const ALLOWED_JSON_RPC_ERROR_REASON_CODES = Object.freeze([
  'invalid_governance_metadata',
  'diary_scope_authorization_rejected',
  'diary_scope_mapping_binding_mismatch',
  'diary_scope_mapping_missing',
  'native_mutation_tool_unavailable',
  'native_provider_embedding_failed',
  'native_runtime_initialization_failed',
  'native_runtime_call_failed',
  'native_diary_search_failed',
  'native_result_scope_postcheck_failed',
  'native_tool_public_binding_mismatch',
  'native_write_disabled',
  'unsupported_native_tool'
]);
const NATIVE_BRIDGE_TOOL_NAMES = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);
const GOVERNANCE_METADATA_SCHEMA_VERSION = 'codex_memory_governed_native_bridge_call_governance_v1';
const GOVERNANCE_METADATA_PATH = 'params._meta.codexMemoryGovernance';
const FORBIDDEN_GOVERNANCE_METADATA_KEY_PARTS = Object.freeze([
  'apikey',
  'authorization',
  'bearer',
  'credential',
  'endpoint',
  'locator',
  'password',
  'privatekey',
  'rawrequestbody',
  'rawresponsebody',
  'secret',
  'token',
  'url'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeEnum(value, allowedValues, fallback = null) {
  return typeof value === 'string' && allowedValues.includes(value) ? value : fallback;
}

function parseEndpoint(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function normalizeMcpToolName({ action, mcpToolName, mcpToolNameByAction }) {
  const hasActionMap = isPlainObject(mcpToolNameByAction);
  const mapped = hasActionMap && typeof mcpToolNameByAction[action] === 'string'
    ? mcpToolNameByAction[action]
    : '';
  const candidate = String(hasActionMap ? mapped : (mcpToolName || action || '')).trim();
  return isSafeReferenceName(candidate) ? candidate : null;
}

function safeNativeBridgeToolName(value) {
  return isSafeReferenceName(value) && NATIVE_BRIDGE_TOOL_NAMES.includes(value)
    ? value
    : null;
}

function projectValueForReadShape(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    return value.length === 1 ? [null] : [null, null];
  }
  if (value === null) return null;
  if (isPlainObject(value)) return {};
  if (typeof value === 'string') return '';
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  return null;
}

function parseTextContent(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function projectJsonRpcToolResultForReadShape(jsonRpcResponse = {}) {
  if (!isPlainObject(jsonRpcResponse)) return null;
  const result = jsonRpcResponse.result;
  if (!isPlainObject(result)) return projectValueForReadShape(result);
  if (Object.prototype.hasOwnProperty.call(result, 'structuredContent')) {
    return projectValueForReadShape(result.structuredContent);
  }

  const textContent = Array.isArray(result.content)
    ? result.content.find(item => item && item.type === 'text' && typeof item.text === 'string')
    : null;
  if (textContent) {
    return projectValueForReadShape(parseTextContent(textContent.text));
  }

  return projectValueForReadShape(result);
}

function extractJsonRpcToolResultValue(jsonRpcResponse = {}) {
  if (!isPlainObject(jsonRpcResponse)) return null;
  const result = jsonRpcResponse.result;
  if (!isPlainObject(result)) return result;
  if (Object.prototype.hasOwnProperty.call(result, 'structuredContent')) {
    return result.structuredContent;
  }

  const textContent = Array.isArray(result.content)
    ? result.content.find(item => item && item.type === 'text' && typeof item.text === 'string')
    : null;
  if (textContent) {
    return parseTextContent(textContent.text);
  }

  return result;
}

function extractJsonRpcNativeRuntimeReceipt(jsonRpcResponse = {}) {
  const receipt = jsonRpcResponse?.result?._meta?.codexMemoryNativeRuntimeReceipt;
  return isPlainObject(receipt) ? receipt : null;
}

function lowDisclosureNativeRuntimeReceipt(receipt = null) {
  if (!isPlainObject(receipt)) {
    return {
      present: false,
      nativeRuntimeCalled: false,
      nativeRuntimeInitialized: false,
      providerApiCalled: false,
      memoryReadPerformed: false,
      memoryWritePerformed: false,
      durableWritePerformed: false,
      durableWriteScope: null,
      isolatedRuntimeStoreUsed: false,
      primaryMemoryStoreWritePerformed: false,
      derivedIndexWritePerformed: false,
      authorizationResolvedBeforeProvider: false,
      diaryAllowlistEnforcedBeforeIndexLoad: false,
      diaryAllowlistEnforcedBeforeVectorSearch: false,
      resultScopePostcheckPassed: false,
      unscopedNativeSearchUsed: false,
      mappingReferenceBound: false,
      mappingDigestBound: false,
      allowedDiaryCount: 0,
      rawDiaryNamesReturned: false,
      scopeIdAccepted: false,
      scopeIdAudited: false,
      scopeIdFingerprintBound: false,
      scopeIdAffectsDiaryAcl: false,
      scopeIdEnforcementClaimed: false,
      omittedPartitionCategories: [],
      rawRuntimeOutputDisclosed: false,
      rawMemoryContentDisclosed: false,
      runtimeLocatorDisclosed: false,
      tokenMaterialDisclosed: false,
      memoryIntelligenceOwner: null,
      ownerRuntimeComponent: null,
      ownerRuntimeCommunication: null,
      ownerRuntimeSourceCommitMatched: false,
      ownerRuntimeSourceTreeMatched: false,
      ownerRuntimePluginBlobMatched: false,
      ownerRuntimeManifestBlobMatched: false,
      stableStoreIdentityMatched: false,
      durableBytes: null,
      durableSha256: null,
      readinessClaimed: false
    };
  }
  return {
    present: true,
    nativeRuntimeCalled: receipt.nativeRuntimeCalled === true,
    nativeRuntimeInitialized: receipt.nativeRuntimeInitialized === true,
    providerApiCalled: receipt.providerApiCalled === true,
    memoryReadPerformed: receipt.memoryReadPerformed === true,
    memoryWritePerformed: receipt.memoryWritePerformed === true,
    durableWritePerformed: receipt.durableWritePerformed === true,
    durableWriteScope: [
      'isolated_derived_index',
      'native_runtime_store',
      'primary_memory_write',
      'primary_memory_mutation_marker'
    ].includes(receipt.durableWriteScope)
      ? receipt.durableWriteScope
      : null,
    isolatedRuntimeStoreUsed: receipt.isolatedRuntimeStoreUsed === true,
    primaryMemoryStoreWritePerformed: receipt.primaryMemoryStoreWritePerformed === true,
    derivedIndexWritePerformed: receipt.derivedIndexWritePerformed === true,
    authorizationResolvedBeforeProvider: receipt.authorizationResolvedBeforeProvider === true,
    diaryAllowlistEnforcedBeforeIndexLoad: receipt.diaryAllowlistEnforcedBeforeIndexLoad === true,
    diaryAllowlistEnforcedBeforeVectorSearch: receipt.diaryAllowlistEnforcedBeforeVectorSearch === true,
    resultScopePostcheckPassed: receipt.resultScopePostcheckPassed === true,
    unscopedNativeSearchUsed: receipt.unscopedNativeSearchUsed === true,
    mappingReferenceBound: receipt.mappingReferenceBound === true,
    mappingDigestBound: receipt.mappingDigestBound === true,
    allowedDiaryCount: Number.isInteger(receipt.allowedDiaryCount) &&
      receipt.allowedDiaryCount >= 1 && receipt.allowedDiaryCount <= 8
      ? receipt.allowedDiaryCount
      : 0,
    rawDiaryNamesReturned: false,
    scopeIdAccepted: receipt.scopeIdAccepted === true,
    scopeIdAudited: receipt.scopeIdAudited === true,
    scopeIdFingerprintBound: receipt.scopeIdFingerprintBound === true,
    scopeIdAffectsDiaryAcl: false,
    scopeIdEnforcementClaimed: false,
    omittedPartitionCategories: Array.isArray(receipt.omittedPartitionCategories)
      ? receipt.omittedPartitionCategories.filter(value =>
          ['project_shared', 'workspace_shared'].includes(value)
        )
      : [],
    rawRuntimeOutputDisclosed: receipt.rawRuntimeOutputDisclosed === true,
    rawMemoryContentDisclosed: receipt.rawMemoryContentDisclosed === true,
    runtimeLocatorDisclosed: receipt.runtimeLocatorDisclosed === true,
    tokenMaterialDisclosed: receipt.tokenMaterialDisclosed === true,
    memoryIntelligenceOwner: receipt.memoryIntelligenceOwner === 'VCPToolBox'
      ? 'VCPToolBox'
      : null,
    ownerRuntimeComponent: receipt.ownerRuntimeComponent === 'DailyNote'
      ? 'DailyNote'
      : null,
    ownerRuntimeCommunication: receipt.ownerRuntimeCommunication === 'stdio'
      ? 'stdio'
      : null,
    ownerRuntimeSourceCommitMatched: receipt.ownerRuntimeSourceCommitMatched === true,
    ownerRuntimeSourceTreeMatched: receipt.ownerRuntimeSourceTreeMatched === true,
    ownerRuntimePluginBlobMatched: receipt.ownerRuntimePluginBlobMatched === true,
    ownerRuntimeManifestBlobMatched: receipt.ownerRuntimeManifestBlobMatched === true,
    stableStoreIdentityMatched: receipt.stableStoreIdentityMatched === true,
    durableBytes: Number.isInteger(receipt.durableBytes) && receipt.durableBytes > 0
      ? receipt.durableBytes
      : null,
    durableSha256: /^[a-f0-9]{64}$/.test(receipt.durableSha256 || '')
      ? receipt.durableSha256
      : null,
    readinessClaimed: receipt.readinessClaimed === true
  };
}

function lowDisclosureProjection(input = {}) {
  return {
    targetReferenceName: isSafeReferenceName(input.targetReferenceName)
      ? input.targetReferenceName
      : null,
    targetKind: 'mcp_server',
    endpointConfigured: typeof input.endpoint === 'string' && input.endpoint.trim().length > 0,
    bearerTokenConfigured: typeof input.bearerToken === 'string' && input.bearerToken.length > 0,
    mcpToolNameConfigured: typeof input.mcpToolName === 'string' && input.mcpToolName.trim().length > 0
  };
}

function normalizedKey(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isForbiddenGovernanceMetadataKey(key) {
  const normalized = normalizedKey(key);
  return FORBIDDEN_GOVERNANCE_METADATA_KEY_PARTS.some(part => normalized.includes(part));
}

function sanitizeGovernanceMetadataForTransport(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map(item => sanitizeGovernanceMetadataForTransport(item, depth + 1))
      .filter(item => item !== undefined);
  }
  if (!isPlainObject(value)) {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    return undefined;
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isForbiddenGovernanceMetadataKey(key)) continue;
    const sanitized = sanitizeGovernanceMetadataForTransport(nestedValue, depth + 1);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

function governanceMetadataTransportCoverage(value, options = {}) {
  if (!isPlainObject(value)) return null;
  if (value.schemaVersion !== GOVERNANCE_METADATA_SCHEMA_VERSION) return null;
  const originalCoverage = validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(value, {
    toolName: safeNativeBridgeToolName(options.toolName)
  });
  if (!originalCoverage.accepted) return null;

  const sanitized = sanitizeGovernanceMetadataForTransport(value);
  if (!isPlainObject(sanitized)) return null;
  sanitized.schemaVersion = GOVERNANCE_METADATA_SCHEMA_VERSION;
  const sanitizedCoverage = validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(sanitized, {
    toolName: safeNativeBridgeToolName(options.toolName)
  });
  if (!sanitizedCoverage.accepted) return null;
  return {
    accepted: true,
    metadata: sanitized
  };
}

function buildToolsCallBody({ requestId, toolName, args, governanceMeta, governanceToolName = toolName }) {
  const params = {
    name: toolName,
    arguments: isPlainObject(args) ? args : {}
  };
  const safeGovernanceMeta = governanceMetadataTransportCoverage(governanceMeta, {
    toolName: governanceToolName
  });
  if (!safeGovernanceMeta) {
    const error = createStatusError('invalid_governance_metadata', 'client_error');
    error.invalidFields = ['governanceMeta'];
    throw error;
  }
  params._meta = {
    codexMemoryGovernance: safeGovernanceMeta.metadata
  };
  return {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params
  };
}

function rejected(reasonCode, input = {}, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: details.invalidFields || [],
    entry: null,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    readinessClaimed: false
  };
}

function createStatusError(message, statusClass, status = null) {
  const error = new Error(message);
  error.statusClass = statusClass;
  error.governedMcpVcpNativeHttpMcpStatusError = true;
  if (status !== null) error.status = status;
  return error;
}

function statusClassFromHttpStatus(status) {
  if (Number.isInteger(status) && status >= 400 && status < 500) return 'client_error';
  if (Number.isInteger(status) && status >= 500 && status < 600) return 'server_error';
  return 'transport_error';
}

function responseShapeCategory(value) {
  if (Array.isArray(value)) return 'array_top_level_kind_only';
  if (value === null) return 'null_top_level_kind_only';
  const kind = typeof value;
  if (kind === 'object') return 'object_top_level_kind_only_no_field_names';
  if (kind === 'string' || kind === 'number' || kind === 'boolean') {
    return 'primitive_top_level_kind_only';
  }
  return 'unknown_shape';
}

function topLevelKindCategory(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  const kind = typeof value;
  if (kind === 'object') return 'object';
  if (kind === 'string' || kind === 'number' || kind === 'boolean') return kind;
  return 'unknown';
}

function httpStatusClass(status) {
  if (!Number.isInteger(status)) return null;
  if (status >= 200 && status < 300) return 'success';
  return statusClassFromHttpStatus(status);
}

function buildLowDisclosureInvocationReceipt(input = {}) {
  const governanceMetadataSent = input.governanceMetadataSent === true;
  const nativeRuntimeReceipt = lowDisclosureNativeRuntimeReceipt(input.nativeRuntimeReceipt);
  return {
    targetReferenceName: isSafeReferenceName(input.targetReferenceName)
      ? input.targetReferenceName
      : null,
    targetKind: 'mcp_server',
    transportCategory: 'local_http_transport',
    mcpMethod: 'tools/call',
    toolName: safeNativeBridgeToolName(input.toolName),
    requestIdCategory: 'generated_bridge_request_id',
    jsonRpcResponseIdMatched: input.jsonRpcResponseIdMatched === true,
    governanceMetadataPath: governanceMetadataSent ? GOVERNANCE_METADATA_PATH : null,
    governanceMetadataSent,
    statusClass: safeEnum(input.statusClass, ALLOWED_STATUS_CLASSES, 'not_available'),
    httpStatusClass: safeEnum(input.httpStatusClass, ALLOWED_HTTP_STATUS_CLASSES),
    jsonRpcErrorPresent: input.jsonRpcErrorPresent === true,
    jsonRpcErrorReasonCode: safeEnum(input.jsonRpcErrorReasonCode, ALLOWED_JSON_RPC_ERROR_REASON_CODES),
    failureCategory: safeEnum(input.failureCategory, ALLOWED_FAILURE_CATEGORIES),
    responseShapeCategory: input.valueAvailable === true
      ? safeEnum(responseShapeCategory(input.value), ALLOWED_RESPONSE_SHAPE_CATEGORIES)
      : 'not_consumed',
    topLevelKindCategory: input.valueAvailable === true
      ? safeEnum(topLevelKindCategory(input.value), ALLOWED_TOP_LEVEL_KIND_CATEGORIES)
      : 'not_consumed',
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    rawResponseBodyPrinted: false,
    governanceMetadataRawValueDisclosed: false,
    nativeRuntimeReceipt,
    readinessClaimed: false
  };
}

function jsonRpcErrorReasonCode(jsonRpcResponse = {}) {
  const reasonCode = jsonRpcResponse?.error?.data?.reasonCode;
  return safeEnum(reasonCode, ALLOWED_JSON_RPC_ERROR_REASON_CODES);
}

function failureCategoryFromJsonRpcReasonCode(reasonCode) {
  if (reasonCode === 'native_provider_embedding_failed') return 'provider_embedding_failed';
  if (reasonCode === 'native_runtime_initialization_failed') return 'native_runtime_initialization_failed';
  if (reasonCode === 'native_diary_search_failed') return 'native_scoped_search_failed';
  if (reasonCode === 'native_result_scope_postcheck_failed') return 'result_scope_postcheck_failed';
  if (reasonCode === 'native_runtime_call_failed') return 'native_runtime_failed';
  if (['diary_scope_mapping_binding_mismatch', 'diary_scope_mapping_missing'].includes(reasonCode)) {
    return 'scope_binding_rejected';
  }
  if (reasonCode === 'diary_scope_authorization_rejected') return 'scope_authorization_rejected';
  return 'governance_rejected';
}

function createGovernedMcpVcpNativeHttpMcpClientInvoker(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input, { invalidFields: ['input'] });
  }

  const invalidFields = [];
  if (!isSafeReferenceName(input.targetReferenceName)) invalidFields.push('targetReferenceName');
  const endpoint = parseEndpoint(input.endpoint);
  if (!endpoint) invalidFields.push('endpoint');
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') invalidFields.push('fetchImpl');

  if (invalidFields.length > 0) {
    return rejected('invalid_http_mcp_client_invoker_config', input, { invalidFields });
  }

  const endpointHref = endpoint.href;
  const bearerToken = typeof input.bearerToken === 'string' ? input.bearerToken : '';
  const requestTimeoutMs = normalizeHttpMcpRequestTimeoutMs(input.requestTimeoutMs);
  const targetReferenceName = input.targetReferenceName;
  const mcpToolNameByAction = isPlainObject(input.mcpToolNameByAction)
    ? { ...input.mcpToolNameByAction }
    : null;
  const configuredMcpToolName = typeof input.mcpToolName === 'string'
    ? input.mcpToolName.trim()
    : '';
  let idCounter = 0;

  async function invokeComponentAction(payload = {}) {
    if (payload.targetReferenceName !== targetReferenceName) {
      throw createStatusError('target_reference_mismatch', 'client_error');
    }

    const toolName = normalizeMcpToolName({
      action: payload.action,
      mcpToolName: configuredMcpToolName,
      mcpToolNameByAction
    });
    if (!toolName) {
      throw createStatusError('invalid_mcp_tool_name', 'client_error');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    if (typeof timeout.unref === 'function') timeout.unref();

    try {
      const requestId = `cm-governed-probe-${++idCounter}`;
      const requestBody = buildToolsCallBody({
        requestId,
        toolName,
        args: payload.requestBody || {},
        governanceMeta: payload.governanceMeta
      });
      const response = await fetchImpl(endpointHref, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {})
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        throw createStatusError('http_mcp_tools_call_failed', statusClassFromHttpStatus(response.status), response.status);
      }

      let jsonRpcResponse;
      try {
        jsonRpcResponse = await response.json();
      } catch {
        throw createStatusError('http_mcp_invalid_json_response', 'transport_error');
      }

      if (jsonRpcResponse.id !== requestId) {
        throw createStatusError('http_mcp_jsonrpc_id_mismatch', 'transport_error');
      }

      if (isPlainObject(jsonRpcResponse.error)) {
        throw createStatusError('http_mcp_jsonrpc_error', 'client_error');
      }

      return projectJsonRpcToolResultForReadShape(jsonRpcResponse);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw createStatusError('http_mcp_tools_call_timeout', 'transport_error');
      }
      if (error.governedMcpVcpNativeHttpMcpStatusError === true) throw error;
      throw createStatusError('http_mcp_tools_call_transport_error', 'transport_error');
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: [],
    entry: {
      invokeComponentAction,
      transportCategory: 'local_http_transport',
      targetKind: 'mcp_server'
    },
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    readinessClaimed: false
  };
}

function createGovernedMcpVcpNativeHttpMcpToolCaller(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input, { invalidFields: ['input'] });
  }

  const invalidFields = [];
  if (!isSafeReferenceName(input.targetReferenceName)) invalidFields.push('targetReferenceName');
  const endpoint = parseEndpoint(input.endpoint);
  if (!endpoint) invalidFields.push('endpoint');
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') invalidFields.push('fetchImpl');

  if (invalidFields.length > 0) {
    return rejected('invalid_http_mcp_tool_caller_config', input, { invalidFields });
  }

  const endpointHref = endpoint.href;
  const bearerToken = typeof input.bearerToken === 'string' ? input.bearerToken : '';
  const requestTimeoutMs = normalizeHttpMcpRequestTimeoutMs(input.requestTimeoutMs);
  const targetReferenceName = input.targetReferenceName;
  const mcpToolNameByAction = isPlainObject(input.mcpToolNameByAction)
    ? { ...input.mcpToolNameByAction }
    : null;
  const configuredMcpToolName = typeof input.mcpToolName === 'string'
    ? input.mcpToolName.trim()
    : '';
  const configuredMcpToolNameEnabled = input.mcpToolNameConfigured === false
    ? ''
    : configuredMcpToolName;
  let idCounter = 0;

  async function callToolWithReceipt(payload = {}) {
    if (payload.targetReferenceName !== targetReferenceName) {
      const error = createStatusError('target_reference_mismatch', 'client_error');
      error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
        targetReferenceName,
        toolName: payload.toolName,
        statusClass: 'client_error'
      });
      throw error;
    }
    const publicToolName = safeNativeBridgeToolName(payload.toolName);
    if (!publicToolName) {
      const error = createStatusError('invalid_mcp_tool_name', 'client_error');
      error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
        targetReferenceName,
        toolName: payload.toolName,
        statusClass: 'client_error'
      });
      throw error;
    }
    const nativeToolName = normalizeMcpToolName({
      action: publicToolName,
      mcpToolName: mcpToolNameByAction ? null : configuredMcpToolNameEnabled,
      mcpToolNameByAction
    });
    if (!nativeToolName) {
      const error = createStatusError('invalid_native_mcp_tool_mapping', 'client_error');
      error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
        targetReferenceName,
        toolName: publicToolName,
        statusClass: 'client_error'
      });
      throw error;
    }
    if (!governanceMetadataTransportCoverage(payload.governanceMeta, { toolName: publicToolName })) {
      const error = createStatusError('invalid_governance_metadata', 'client_error');
      error.invalidFields = ['governanceMeta'];
      error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
        targetReferenceName,
        toolName: publicToolName,
        statusClass: 'client_error',
        governanceMetadataSent: false
      });
      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    if (typeof timeout.unref === 'function') timeout.unref();

    try {
      let httpStatus = null;
      const requestId = `cm-governed-tool-${++idCounter}`;
      const requestBody = buildToolsCallBody({
        requestId,
        toolName: nativeToolName,
        args: payload.arguments,
        governanceMeta: payload.governanceMeta,
        governanceToolName: publicToolName
      });
      const governanceMetadataSent = Boolean(requestBody.params._meta?.codexMemoryGovernance);
      const response = await fetchImpl(endpointHref, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {})
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      httpStatus = response.status;

      if (!response.ok) {
        const error = createStatusError(
          'http_mcp_tools_call_failed',
          statusClassFromHttpStatus(response.status),
          response.status
        );
        error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
          targetReferenceName,
          toolName: publicToolName,
          statusClass: error.statusClass,
          httpStatusClass: httpStatusClass(response.status),
          failureCategory: response.status >= 500 ? 'http_server_error' : 'http_client_error',
          governanceMetadataSent
        });
        throw error;
      }

      let jsonRpcResponse;
      try {
        jsonRpcResponse = await response.json();
      } catch {
        const error = createStatusError('http_mcp_invalid_json_response', 'transport_error');
        error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
          targetReferenceName,
          toolName: publicToolName,
          statusClass: 'transport_error',
          httpStatusClass: httpStatusClass(httpStatus),
          failureCategory: 'invalid_response',
          governanceMetadataSent
        });
        throw error;
      }

      if (jsonRpcResponse.id !== requestId) {
        const error = createStatusError('http_mcp_jsonrpc_id_mismatch', 'transport_error');
        error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
          targetReferenceName,
          toolName: publicToolName,
          statusClass: 'transport_error',
          httpStatusClass: httpStatusClass(httpStatus),
          failureCategory: 'response_id_mismatch',
          jsonRpcResponseIdMatched: false,
          governanceMetadataSent
        });
        throw error;
      }

      if (isPlainObject(jsonRpcResponse.error)) {
        const safeReasonCode = jsonRpcErrorReasonCode(jsonRpcResponse);
        const error = createStatusError('http_mcp_jsonrpc_error', 'client_error');
        error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
          targetReferenceName,
          toolName: publicToolName,
          statusClass: 'client_error',
          httpStatusClass: httpStatusClass(httpStatus),
          jsonRpcResponseIdMatched: true,
          jsonRpcErrorPresent: true,
          jsonRpcErrorReasonCode: safeReasonCode,
          failureCategory: failureCategoryFromJsonRpcReasonCode(safeReasonCode),
          governanceMetadataSent
        });
        throw error;
      }

      const value = extractJsonRpcToolResultValue(jsonRpcResponse);
      const rawNativeRuntimeReceipt = extractJsonRpcNativeRuntimeReceipt(jsonRpcResponse);
      const expected = payload.governanceMeta?.scopeEnforcement;
      if (
        ['search_memory', 'memory_overview', 'audit_memory'].includes(publicToolName) &&
        expected?.mode === 'diary_allowlist_v1' &&
        expected?.bound === true
      ) {
        const bindingMatched = isPlainObject(rawNativeRuntimeReceipt) &&
          rawNativeRuntimeReceipt.actualMappingReference === expected.expectedMappingReference &&
          rawNativeRuntimeReceipt.actualMappingDigest === expected.expectedMappingDigest &&
          rawNativeRuntimeReceipt.mappingReferenceBound === true &&
          rawNativeRuntimeReceipt.mappingDigestBound === true;
        if (!bindingMatched) {
          const error = createStatusError('diary_scope_mapping_binding_mismatch', 'client_error');
          error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
            targetReferenceName,
            toolName: publicToolName,
            statusClass: 'client_error',
            httpStatusClass: httpStatusClass(httpStatus),
            failureCategory: 'scope_binding_rejected',
            jsonRpcResponseIdMatched: true,
            governanceMetadataSent,
            nativeRuntimeReceipt: rawNativeRuntimeReceipt
          });
          throw error;
        }
      }
      return {
        value,
        receipt: buildLowDisclosureInvocationReceipt({
          targetReferenceName,
          toolName: publicToolName,
          statusClass: 'success',
          httpStatusClass: httpStatusClass(httpStatus),
          jsonRpcResponseIdMatched: true,
          valueAvailable: true,
          governanceMetadataSent,
          value,
          nativeRuntimeReceipt: rawNativeRuntimeReceipt
        })
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = createStatusError('http_mcp_tools_call_timeout', 'transport_error');
        timeoutError.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
        targetReferenceName,
        toolName: publicToolName || payload.toolName,
        statusClass: 'transport_error',
        failureCategory: 'timeout',
        governanceMetadataSent: Boolean(
          governanceMetadataTransportCoverage(payload.governanceMeta, { toolName: publicToolName })
        )
      });
      throw timeoutError;
      }
      if (error.governedMcpVcpNativeHttpMcpStatusError === true) {
        if (!error.lowDisclosureReceipt) {
          error.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
            targetReferenceName,
            toolName: publicToolName || payload.toolName,
            statusClass: error.statusClass,
            governanceMetadataSent: false
          });
        }
        throw error;
      }
      const transportError = createStatusError('http_mcp_tools_call_transport_error', 'transport_error');
      transportError.lowDisclosureReceipt = buildLowDisclosureInvocationReceipt({
      targetReferenceName,
      toolName: publicToolName || payload.toolName,
      statusClass: 'transport_error',
      failureCategory: 'transport_unavailable',
      governanceMetadataSent: Boolean(
        governanceMetadataTransportCoverage(payload.governanceMeta, { toolName: publicToolName })
      )
    });
      throw transportError;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function callTool(payload = {}) {
    const result = await callToolWithReceipt(payload);
    return result.value;
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: [],
    callTool,
    callToolWithReceipt,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  createGovernedMcpVcpNativeHttpMcpToolCaller,
  createGovernedMcpVcpNativeHttpMcpClientInvoker,
  extractJsonRpcToolResultValue,
  GOVERNANCE_METADATA_PATH,
  GOVERNANCE_METADATA_SCHEMA_VERSION,
  normalizeHttpMcpRequestTimeoutMs,
  projectJsonRpcToolResultForReadShape
};
