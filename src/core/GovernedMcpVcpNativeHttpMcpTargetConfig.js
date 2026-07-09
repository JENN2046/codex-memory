'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const PRIVATE_CONFIG_KEY = '__governedMcpVcpNativeHttpMcpTargetPrivateConfig';
const DEFAULT_MCP_TOOL_NAME = 'knowledge_base.search';
const DEFAULT_REQUEST_TIMEOUT_MS = 3000;
const GOVERNED_NATIVE_BRIDGE_TOOL_NAMES = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeTimeoutMs(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 30_000) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return parsed;
}

function parsePlainObject(value) {
  if (isPlainObject(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeMcpToolNameByAction(value) {
  const source = parsePlainObject(value);
  if (!source) return { accepted: null, invalidFields: [] };

  const mapping = {};
  const invalidFields = [];
  for (const [action, toolName] of Object.entries(source)) {
    if (!GOVERNED_NATIVE_BRIDGE_TOOL_NAMES.includes(action)) {
      invalidFields.push(`mcpToolNameByAction.${action}`);
      continue;
    }
    if (!isSafeReferenceName(toolName)) {
      invalidFields.push(`mcpToolNameByAction.${action}`);
      continue;
    }
    mapping[action] = toolName;
  }

  return {
    accepted: invalidFields.length === 0 ? mapping : null,
    invalidFields
  };
}

function isHttpEndpoint(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function lowDisclosurePublicConfig({
  accepted,
  configured,
  targetReferenceName,
  mcpToolName,
  mcpToolNameConfigured,
  requestTimeoutMs,
  mcpToolNameByAction,
  bearerTokenConfigured,
  invalidFields
}) {
  return {
    accepted,
    configured,
    targetReferenceName: accepted ? targetReferenceName : null,
    targetKind: 'mcp_server',
    transportCategory: 'local_http_transport',
    mcpToolName: isSafeReferenceName(mcpToolName) ? mcpToolName : null,
    mcpToolNameConfigured: mcpToolNameConfigured === true,
    mcpToolNameByAction: isPlainObject(mcpToolNameByAction)
      ? Object.fromEntries(Object.entries(mcpToolNameByAction).sort(([a], [b]) => a.localeCompare(b)))
      : null,
    mcpToolNameByActionConfigured: isPlainObject(mcpToolNameByAction),
    requestTimeoutMs,
    invalidFields,
    endpointConfigured: configured,
    bearerTokenConfigured: bearerTokenConfigured === true,
    endpointIncluded: false,
    tokenMaterialIncluded: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawLocatorDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    configEnvRead: false,
    readinessClaimed: false
  };
}

function normalizeGovernedMcpVcpNativeHttpMcpTargetConfig(source = {}) {
  const input = isPlainObject(source) ? source : {};
  const endpoint = firstString(
    input.endpoint,
    input.url,
    input.runtimeEndpoint,
    input.runtimeUrl
  );
  const bearerToken = typeof input.bearerToken === 'string'
    ? input.bearerToken
    : typeof input.token === 'string'
      ? input.token
      : '';
  const targetReferenceName = firstString(
    input.targetReferenceName,
    input.target_reference_name,
    input.referenceName,
    input.reference_name
  );
  const mcpToolName = firstString(
    input.mcpToolName,
    input.mcp_tool_name,
    DEFAULT_MCP_TOOL_NAME
  );
  const mcpToolNameConfigured = Boolean(firstString(input.mcpToolName, input.mcp_tool_name));
  const requestTimeoutMs = normalizeTimeoutMs(
    input.requestTimeoutMs ?? input.request_timeout_ms
  );
  const toolNameMapping = normalizeMcpToolNameByAction(
    input.mcpToolNameByAction ?? input.mcp_tool_name_by_action
  );
  const configured = Boolean(endpoint);
  const invalidFields = [];

  if (configured && !isSafeReferenceName(targetReferenceName)) {
    invalidFields.push('targetReferenceName');
  }
  if (configured && !isHttpEndpoint(endpoint)) {
    invalidFields.push('endpoint');
  }
  if (configured && !isSafeReferenceName(mcpToolName)) {
    invalidFields.push('mcpToolName');
  }
  if (configured && toolNameMapping.invalidFields.length > 0) {
    invalidFields.push(...toolNameMapping.invalidFields);
  }

  const accepted = configured && invalidFields.length === 0;
  const publicConfig = lowDisclosurePublicConfig({
    accepted,
    configured,
    targetReferenceName,
    mcpToolName,
    mcpToolNameConfigured,
    mcpToolNameByAction: accepted ? toolNameMapping.accepted : null,
    requestTimeoutMs,
    bearerTokenConfigured: Boolean(bearerToken),
    invalidFields
  });
  const privateConfig = accepted
    ? {
        targetReferenceName,
        endpoint,
        bearerToken,
        mcpToolName,
        mcpToolNameConfigured,
        ...(toolNameMapping.accepted ? { mcpToolNameByAction: toolNameMapping.accepted } : {}),
        requestTimeoutMs
      }
    : null;

  return {
    publicConfig,
    privateConfig
  };
}

function attachGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config, privateConfig) {
  Object.defineProperty(config, PRIVATE_CONFIG_KEY, {
    value: privateConfig,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return config;
}

function getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config = {}) {
  return config ? config[PRIVATE_CONFIG_KEY] || null : null;
}

module.exports = {
  DEFAULT_MCP_TOOL_NAME,
  DEFAULT_REQUEST_TIMEOUT_MS,
  PRIVATE_CONFIG_KEY,
  attachGovernedMcpVcpNativeHttpMcpTargetPrivateConfig,
  getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig,
  normalizeGovernedMcpVcpNativeHttpMcpTargetConfig
};
