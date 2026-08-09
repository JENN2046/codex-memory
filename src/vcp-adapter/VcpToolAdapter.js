'use strict';

const {
  VcpToolBridgeClient,
  VcpToolBridgeClientError,
  isPlainObject,
  normalizeRequestId
} = require('./VcpToolBridgeClient');

const VCP_ADAPTER_TOOL_NAMES = Object.freeze([
  'get_vcp_adapter_status',
  'list_vcp_tools',
  'execute_vcp_tool',
  'get_vcp_tool_status'
]);

const MAX_TOOL_NAME_LENGTH = 256;
const MAX_REQUEST_ID_LENGTH = 128;
const MAX_TOOL_ARGS_BYTES = 64 * 1024;
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const VCP_ADAPTER_TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'get_vcp_adapter_status',
    title: 'Get VCP Adapter Status',
    description: 'Return the current in-process Universal VCP Tool Adapter connection and protocol status without disclosing credentials or bridge locators.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'list_vcp_tools',
    title: 'List VCP Tools',
    description: 'Discover the server-allowed native VCP tool manifests through VCPToolBridge. VCP remains the authoritative tool registry.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'execute_vcp_tool',
    title: 'Execute VCP Tool',
    description: 'Forward a server-allowed native VCP tool name and generic JSON arguments to VCPToolBridge for execution by PluginManager.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tool_name: { type: 'string', minLength: 1, maxLength: MAX_TOOL_NAME_LENGTH },
        tool_args: { type: 'object' },
        request_id: { type: 'string', minLength: 1, maxLength: MAX_REQUEST_ID_LENGTH }
      },
      required: ['tool_name', 'tool_args']
    }
  },
  {
    name: 'get_vcp_tool_status',
    title: 'Get VCP Tool Status',
    description: 'Return current-process status, progress, and final result for a correlated VCP tool request.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        request_id: { type: 'string', minLength: 1, maxLength: MAX_REQUEST_ID_LENGTH }
      },
      required: ['request_id']
    }
  }
]);

function normalizeManifest(manifest) {
  const source = isPlainObject(manifest) ? manifest : {};
  const capabilities = isPlainObject(source.capabilities) ? source.capabilities : {};
  const invocationCommands = Array.isArray(capabilities.invocationCommands)
    ? capabilities.invocationCommands
    : Array.isArray(source.invocationCommands)
      ? source.invocationCommands
      : [];
  const parameters = isPlainObject(source.parameters)
    ? source.parameters
    : isPlainObject(source.inputSchema)
      ? source.inputSchema
      : isPlainObject(capabilities.parameters)
        ? capabilities.parameters
        : {};

  return {
    name: typeof source.name === 'string' ? source.name : null,
    display_name: typeof source.displayName === 'string'
      ? source.displayName
      : typeof source.display_name === 'string'
        ? source.display_name
        : typeof source.name === 'string'
          ? source.name
          : null,
    description: typeof source.description === 'string' ? source.description : '',
    invocation_commands: invocationCommands,
    parameters,
    raw_manifest: source
  };
}

function adapterError(message, code, {
  jsonRpcCode = -32602,
  jsonRpcMessage = 'Invalid params'
} = {}) {
  const error = new VcpToolBridgeClientError(message, code);
  error.jsonRpcCode = jsonRpcCode;
  error.jsonRpcMessage = jsonRpcMessage;
  error.jsonRpcData = { code, status: 'rejected' };
  return error;
}

function normalizeAllowedTools(value) {
  if (!Array.isArray(value)) return new Set();
  if (!value.every(item => typeof item === 'string')) return new Set();
  const normalized = value.map(item => item.trim()).filter(Boolean);
  if (normalized.some(item => item.length > MAX_TOOL_NAME_LENGTH)) return new Set();
  return new Set(normalized);
}

function normalizeToolName(value) {
  if (typeof value !== 'string') {
    throw adapterError('tool_name must be a string', 'VCP_TOOL_NAME_INVALID');
  }
  const normalized = value.trim();
  if (!normalized) {
    throw adapterError('tool_name is required', 'VCP_TOOL_NAME_REQUIRED');
  }
  if (normalized.length > MAX_TOOL_NAME_LENGTH) {
    throw adapterError(
      `tool_name must be at most ${MAX_TOOL_NAME_LENGTH} characters`,
      'VCP_TOOL_NAME_INVALID'
    );
  }
  return normalized;
}

function normalizeValidatedRequestId(value, { required = false } = {}) {
  if (value === undefined && !required) return null;
  const normalized = normalizeRequestId(value);
  if (!normalized || normalized.length > MAX_REQUEST_ID_LENGTH) {
    throw adapterError(
      `request_id must be a non-empty string of at most ${MAX_REQUEST_ID_LENGTH} characters`,
      'VCP_REQUEST_ID_INVALID'
    );
  }
  return normalized;
}

function validateJsonValue(value, path, ancestors) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return;
    throw adapterError(`${path} must contain finite JSON numbers`, 'VCP_TOOL_ARGS_INVALID');
  }
  if (typeof value !== 'object') {
    throw adapterError(`${path} must contain only JSON values`, 'VCP_TOOL_ARGS_INVALID');
  }
  if (ancestors.has(value)) {
    throw adapterError(`${path} must not contain circular references`, 'VCP_TOOL_ARGS_INVALID');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw adapterError(`${path}[${index}] must be a JSON value`, 'VCP_TOOL_ARGS_INVALID');
        }
        validateJsonValue(value[index], `${path}[${index}]`, ancestors);
      }
      const extraKeys = Reflect.ownKeys(value).filter(key => {
        if (key === 'length') return false;
        return typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/u.test(key);
      });
      if (extraKeys.length > 0) {
        throw adapterError(`${path} must be a JSON array`, 'VCP_TOOL_ARGS_INVALID');
      }
      return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw adapterError(`${path} must contain plain JSON objects`, 'VCP_TOOL_ARGS_INVALID');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') {
        throw adapterError(`${path} must not contain symbol keys`, 'VCP_TOOL_ARGS_INVALID');
      }
      if (FORBIDDEN_JSON_KEYS.has(key)) {
        throw adapterError(`${path}.${key} is not allowed`, 'VCP_TOOL_ARGS_UNSAFE');
      }
      const descriptor = descriptors[key];
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw adapterError(`${path}.${key} must not use accessors`, 'VCP_TOOL_ARGS_INVALID');
      }
      validateJsonValue(descriptor.value, `${path}.${key}`, ancestors);
    }
  } catch (error) {
    if (error instanceof VcpToolBridgeClientError) throw error;
    throw adapterError(`${path} must be safely serializable JSON`, 'VCP_TOOL_ARGS_INVALID');
  } finally {
    ancestors.delete(value);
  }
}

function validateToolArgs(value) {
  let prototype = null;
  try {
    prototype = value && typeof value === 'object'
      ? Object.getPrototypeOf(value)
      : null;
  } catch {
    throw adapterError('tool_args must be a plain JSON object', 'VCP_TOOL_ARGS_INVALID');
  }
  if (!isPlainObject(value) || (prototype !== Object.prototype && prototype !== null)) {
    throw adapterError('tool_args must be a plain JSON object', 'VCP_TOOL_ARGS_INVALID');
  }
  validateJsonValue(value, 'tool_args', new Set());

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw adapterError('tool_args must be safely serializable JSON', 'VCP_TOOL_ARGS_INVALID');
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_TOOL_ARGS_BYTES) {
    throw adapterError(
      `tool_args must not exceed ${MAX_TOOL_ARGS_BYTES} bytes`,
      'VCP_TOOL_ARGS_TOO_LARGE'
    );
  }
}

function redactCredential(value, credential, seen = new WeakMap()) {
  if (!credential) return value;
  if (typeof value === 'string') {
    const candidates = [...new Set([credential, encodeURIComponent(credential)].filter(Boolean))];
    return candidates.reduce(
      (output, candidate) => output.split(candidate).join('[REDACTED]'),
      value
    );
  }
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const output = [];
    seen.set(value, output);
    for (const item of value) output.push(redactCredential(item, credential, seen));
    return output;
  }
  const output = {};
  seen.set(value, output);
  for (const [key, nestedValue] of Object.entries(value)) {
    const safeKey = redactCredential(key, credential, seen);
    Object.defineProperty(output, safeKey, {
      value: redactCredential(nestedValue, credential, seen),
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return output;
}

class VcpToolAdapter {
  constructor(options = {}) {
    this.client = options.client || new VcpToolBridgeClient(options);
    this.allowedTools = normalizeAllowedTools(options.allowedTools);
    this.latestTools = [];
    this.manifestsLoaded = false;
  }

  _redactOutput(value) {
    return redactCredential(value, this.client?.key);
  }

  _assertToolAllowed(toolName) {
    if (this.allowedTools.has(toolName)) return;
    throw adapterError(
      'VCP tool is not allowed by server configuration',
      'VCP_TOOL_NOT_ALLOWED',
      { jsonRpcCode: -32001, jsonRpcMessage: 'Forbidden' }
    );
  }

  getStatus() {
    const clientStatus = this.client.getStatus();
    return this._redactOutput({
      ...clientStatus,
      tools_discovered: this.manifestsLoaded
        ? this.latestTools.length
        : clientStatus.tools_discovered
    });
  }

  async listTools() {
    const discovered = await this.client.discoverManifests();
    this.latestTools = discovered.plugins
      .map(normalizeManifest)
      .filter(tool => typeof tool.name === 'string' && this.allowedTools.has(tool.name))
      .map(tool => this._redactOutput(tool));
    this.manifestsLoaded = true;
    return { tools: this.latestTools };
  }

  async executeTool(args = {}) {
    const toolName = normalizeToolName(args.tool_name);
    validateToolArgs(args.tool_args);
    const requestId = normalizeValidatedRequestId(args.request_id);
    this._assertToolAllowed(toolName);

    const state = await this.client.executeTool({
      toolName,
      toolArgs: args.tool_args,
      requestId
    });
    return {
      request_id: state.request_id,
      tool_name: toolName,
      status: state.status,
      result: this._redactOutput(state.result ?? null),
      error: this._redactOutput(state.error ?? null)
    };
  }

  getToolStatus(args = {}) {
    const requestId = normalizeValidatedRequestId(args.request_id, { required: true });
    return this._redactOutput(this.client.getRequestStatus(requestId));
  }

  async callTool(toolName, args = {}) {
    if (toolName === 'get_vcp_adapter_status') return this.getStatus();
    if (toolName === 'list_vcp_tools') return this.listTools();
    if (toolName === 'execute_vcp_tool') return this.executeTool(args);
    if (toolName === 'get_vcp_tool_status') return this.getToolStatus(args);
    throw new VcpToolBridgeClientError(`Unknown VCP adapter tool: ${toolName}`, 'VCP_ADAPTER_TOOL_UNKNOWN');
  }

  close() {
    this.client.disconnect();
  }
}

function isVcpAdapterToolName(toolName) {
  return VCP_ADAPTER_TOOL_NAMES.includes(toolName);
}

module.exports = {
  VCP_ADAPTER_TOOL_DEFINITIONS,
  VCP_ADAPTER_TOOL_NAMES,
  VcpToolAdapter,
  isVcpAdapterToolName,
  normalizeManifest
};
