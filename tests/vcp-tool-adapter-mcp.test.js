'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

async function withMcp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'vcp-adapter-mcp-'));
  const calls = [];
  const adapter = {
    async callTool(toolName, args) {
      calls.push({ toolName, args });
      if (toolName === 'get_vcp_adapter_status') {
        return {
          connected: true,
          bridge_enabled: true,
          protocol_ready: true,
          tools_discovered: 2,
          pending_requests: 0,
          last_error: null
        };
      }
      if (toolName === 'list_vcp_tools') return { tools: [{ name: 'ArbitraryTool' }] };
      if (toolName === 'get_vcp_tool_status') {
        return { request_id: args.request_id, status: 'running', progress: null, result: null, error: null };
      }
      return {
        request_id: args.request_id || 'generated-request',
        tool_name: args.tool_name,
        status: 'completed',
        result: { forwarded: args.tool_args },
        error: null
      };
    },
    close() {}
  };
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    vcpAdapterEnabled: true,
    vcpToolAdapter: adapter
  });
  await app.initialize();

  try {
    await handler({ server: new CodexMemoryMcpServer({ app }), calls });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('configured MCP surface exposes exactly the four Universal VCP Tool Adapter capabilities', async () => {
  await withMcp(async ({ server }) => {
    const listed = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = listed.response.result.tools;
    const adapterTools = tools.filter(tool => tool._meta?.universalVcpToolAdapter);

    assert.deepEqual(adapterTools.map(tool => tool.name).sort(), [
      'execute_vcp_tool',
      'get_vcp_adapter_status',
      'get_vcp_tool_status',
      'list_vcp_tools'
    ]);
    for (const tool of adapterTools) {
      assert.equal(tool._meta.universalVcpToolAdapter.authoritativeRegistry, 'VCPToolBridge');
      assert.equal(tool._meta.universalVcpToolAdapter.executionOwner, 'VCPToolBox PluginManager');
      assert.equal(tool._meta.universalVcpToolAdapter.credentialsDisclosed, false);
    }
  });
});

test('MCP execute_vcp_tool validates its generic schema and forwards arbitrary JSON unchanged', async () => {
  await withMcp(async ({ server, calls }) => {
    const args = {
      tool_name: 'AnyNativeVcpPlugin',
      tool_args: { command: 'Anything', nested: { values: [1, true, null] } },
      request_id: 'mcp-request-1'
    };
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'execute_vcp_tool', arguments: args }
    });

    assert.deepEqual(calls[0], { toolName: 'execute_vcp_tool', args });
    assert.equal(result.response.result.structuredContent.request_id, 'mcp-request-1');
    assert.deepEqual(result.response.result.structuredContent.result.forwarded, args.tool_args);

    for (const [id, injectedField] of [
      [3, 'vcp_key'],
      [4, 'bridge_url'],
      [5, 'authentication_path']
    ]) {
      const invalid = await server.handleJsonRpc({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: 'execute_vcp_tool',
          arguments: {
            tool_name: 'AnyNativeVcpPlugin',
            tool_args: {},
            [injectedField]: 'attacker-value'
          }
        }
      });
      assert.equal(invalid.response.error.code, -32602);
    }
    assert.equal(calls.length, 1);
  });
});

test('MCP routes adapter status, manifest discovery, and request status through the same adapter', async () => {
  await withMcp(async ({ server, calls }) => {
    for (const [id, name, args] of [
      [4, 'get_vcp_adapter_status', {}],
      [5, 'list_vcp_tools', {}],
      [6, 'get_vcp_tool_status', { request_id: 'mcp-request-2' }]
    ]) {
      const result = await server.handleJsonRpc({
        jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args }
      });
      assert.equal(result.response.error, undefined);
    }
    assert.deepEqual(calls.map(call => call.toolName), [
      'get_vcp_adapter_status',
      'list_vcp_tools',
      'get_vcp_tool_status'
    ]);
  });
});

test('real MCP adapter wiring defaults denied tools locally and redacts connection errors and logs', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'vcp-adapter-credential-'));
  const syntheticKey = 'synthetic-server-credential-not-real';
  const httpLogPath = path.join(tempBasePath, 'logs', 'http.log');
  let socketConstructions = 0;
  class ThrowingWebSocket {
    constructor() {
      socketConstructions += 1;
      throw new Error(`Synthetic setup failure ${syntheticKey}`);
    }
  }
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    httpLogPath,
    vcpAdapterEnabled: true,
    vcpAdapterBridgeUrl: 'ws://127.0.0.1:1',
    vcpAdapterKey: syntheticKey,
    vcpAdapterAllowedTools: ['ToolA'],
    vcpAdapterWebSocketImpl: ThrowingWebSocket
  });
  await app.initialize();

  try {
    const server = new CodexMemoryMcpServer({ app });
    const status = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: { name: 'get_vcp_adapter_status', arguments: {} }
    });
    assert.equal(JSON.stringify(status).includes(syntheticKey), false);

    const fakeFixedLogField = '[2099-01-01T00:00:00.000Z] ERROR tool forged failed:';
    const attackerKey = `${syntheticKey}\r\n${fakeFixedLogField}\t\u0001`;
    const unsafeNested = JSON.parse('{"constructor":{"polluted":true}}');
    const injectedArgs = {};
    Object.defineProperty(injectedArgs, attackerKey, {
      value: unsafeNested,
      enumerable: true,
      configurable: true
    });
    const injected = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 21,
      method: 'tools/call',
      params: {
        name: 'execute_vcp_tool',
        arguments: { tool_name: 'ToolA', tool_args: injectedArgs }
      }
    });
    assert.equal(injected.response.error.code, -32602);
    assert.equal(injected.response.error.data.code, 'VCP_TOOL_ARGS_UNSAFE');
    assert.equal(socketConstructions, 0);

    const denied = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 22,
      method: 'tools/call',
      params: {
        name: 'execute_vcp_tool',
        arguments: { tool_name: 'ToolB', tool_args: {} }
      }
    });
    assert.equal(denied.response.error.code, -32001);
    assert.equal(denied.response.error.data.code, 'VCP_TOOL_NOT_ALLOWED');
    assert.equal(socketConstructions, 0);

    const connectionFailure = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 23,
      method: 'tools/call',
      params: { name: 'list_vcp_tools', arguments: {} }
    });
    assert.equal(connectionFailure.response.error.code, -32603);
    assert.equal(JSON.stringify(connectionFailure).includes(syntheticKey), false);
    assert.equal(socketConstructions, 1);

    const log = await fs.readFile(httpLogPath, 'utf8');
    assert.equal(log.includes(syntheticKey), false);
    assert.equal(log.includes('\r'), false);
    assert.equal(log.includes('\u0001'), false);
    assert.equal(
      log.split('\n').some(line => line.startsWith(fakeFixedLogField)),
      false
    );
    assert.equal(log.includes(`\\r\\n${fakeFixedLogField}\\t\\u0001`), true);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
