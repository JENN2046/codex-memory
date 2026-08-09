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
    description: 'Discover the current native VCP tool manifests through VCPToolBridge. VCP remains the authoritative tool registry.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: 'execute_vcp_tool',
    title: 'Execute VCP Tool',
    description: 'Forward an arbitrary native VCP tool name and JSON arguments to VCPToolBridge for execution by PluginManager.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tool_name: { type: 'string', minLength: 1, maxLength: 200 },
        tool_args: { type: 'object' },
        request_id: { type: 'string', minLength: 1, maxLength: 200 }
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
        request_id: { type: 'string', minLength: 1, maxLength: 200 }
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

class VcpToolAdapter {
  constructor(options = {}) {
    this.client = options.client || new VcpToolBridgeClient(options);
    this.latestTools = [];
  }

  getStatus() {
    return {
      ...this.client.getStatus(),
      tools_discovered: this.latestTools.length || this.client.getStatus().tools_discovered
    };
  }

  async listTools() {
    const discovered = await this.client.discoverManifests();
    this.latestTools = discovered.plugins.map(normalizeManifest);
    return { tools: this.latestTools };
  }

  async executeTool(args = {}) {
    const toolName = typeof args.tool_name === 'string' ? args.tool_name.trim() : '';
    if (!toolName) {
      throw new VcpToolBridgeClientError('tool_name is required', 'VCP_TOOL_NAME_REQUIRED');
    }
    if (!isPlainObject(args.tool_args)) {
      throw new VcpToolBridgeClientError('tool_args must be an object', 'VCP_TOOL_ARGS_INVALID');
    }
    const requestId = args.request_id === undefined ? null : normalizeRequestId(args.request_id);
    if (args.request_id !== undefined && !requestId) {
      throw new VcpToolBridgeClientError('request_id must be a non-empty string', 'VCP_REQUEST_ID_INVALID');
    }

    const state = await this.client.executeTool({
      toolName,
      toolArgs: args.tool_args,
      requestId
    });
    return {
      request_id: state.request_id,
      tool_name: toolName,
      status: state.status,
      result: state.result ?? null,
      error: state.error ?? null
    };
  }

  getToolStatus(args = {}) {
    return this.client.getRequestStatus(args.request_id);
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
