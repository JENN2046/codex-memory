'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const {
  BRIDGE_AUTH_HEADER,
  PROTOCOL_HEADER,
  SESSION_HEADER,
  createChatGptWebUdsHttpServer
} = require('../src/adapters/codex-mcp/http');
const {
  buildChatGptWebProfileConfig,
  CHATGPT_WEB_PROFILE_IDS
} = require('../src/core/ChatGptWebProfile');
const {
  buildChatGptWebToolDefinition
} = require('../src/core/ChatGptWebToolContract');

const LINUX_ONLY = process.platform !== 'linux';
const BRIDGE_SECRET = 'synthetic-m2-bridge-secret-value';
const JSON_AND_SSE_ACCEPT = 'application/json, text/event-stream';
const ALL_PROFILE_IDS = Object.freeze([
  CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0,
  CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1,
  CHATGPT_WEB_PROFILE_IDS.CONTEXT_V2
]);

function createSyntheticApp() {
  const profile = buildChatGptWebProfileConfig({
    profileId: CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0,
    enabled: true,
    serverFixedScope: {
      projectId: 'synthetic-project',
      workspaceId: 'synthetic-workspace',
      scopeId: 'synthetic-scope',
      visibility: 'project'
    }
  });
  const calls = [];
  return {
    calls,
    app: {
      config: {
        serverVersion: 'm2-synthetic',
        securityProfile: 'hardened',
        mcpPublicToolSurface: 'read_only',
        mcpPublicToolNames: [],
        exposeControlledMutationMcpTools: false,
        exposeWriteMcpTools: false,
        allowExternalProvider: false,
        chatgptWebProfile: profile,
        chatgptWebUds: {
          enabled: true,
          transport: 'unix_domain_socket_streamable_http',
          enabledProfileIds: [...ALL_PROFILE_IDS],
          publicListener: false,
          tcpLoopbackFallback: false,
          authorizationHeaderAccepted: false
        }
      },
      async callTool(toolName) {
        calls.push(toolName);
        throw new Error('M2 transport test must never invoke an application memory tool.');
      }
    }
  };
}

function udsRequest(socketPath, requestPath, {
  method = 'POST',
  headers = {},
  body
} = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      socketPath,
      path: requestPath,
      method,
      headers
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          // Streaming responses are handled by the dedicated helper.
        }
        resolve({
          status: response.statusCode,
          headers: response.headers,
          text,
          json
        });
      });
    });
    request.once('error', reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}

function openUdsSse(socketPath, requestPath, headers) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      socketPath,
      path: requestPath,
      method: 'GET',
      headers
    });
    request.once('error', reject);
    request.once('response', response => {
      response.once('data', () => {
        resolve({ status: response.statusCode, headers: response.headers });
        response.destroy();
      });
      response.once('error', reject);
    });
    request.end();
  });
}

function bridgeHeaders(extra = {}) {
  return {
    [BRIDGE_AUTH_HEADER]: BRIDGE_SECRET,
    ...extra
  };
}

function mcpHeaders(sessionId, extra = {}) {
  return bridgeHeaders({
    Accept: JSON_AND_SSE_ACCEPT,
    'Content-Type': 'application/json',
    ...(sessionId ? {
      [SESSION_HEADER]: sessionId,
      [PROTOCOL_HEADER]: '2025-06-18'
    } : {}),
    ...extra
  });
}

function jsonRpc(id, method, params = {}) {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params });
}

async function withChatGptWebUdsServer(handler) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-m2-uds-'));
  const secretFile = path.join(tempRoot, 'bridge-auth');
  await fs.writeFile(secretFile, BRIDGE_SECRET, { mode: 0o600 });
  await fs.chmod(secretFile, 0o600);
  const { app, calls } = createSyntheticApp();
  const udsServer = createChatGptWebUdsHttpServer({
    app,
    socketDirectory: tempRoot,
    socketName: 'mcp.sock',
    bridgeAuthSecretFile: secretFile,
    enabledProfileIds: ALL_PROFILE_IDS,
    allowedOrigins: []
  });
  await udsServer.listen();

  try {
    await handler({
      calls,
      socketPath: udsServer.socketPath,
      udsServer,
      tempRoot
    });
  } finally {
    await udsServer.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function initialize(socketPath, endpointPath) {
  const response = await udsRequest(socketPath, endpointPath, {
    headers: mcpHeaders(),
    body: jsonRpc(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {} })
  });
  assert.equal(response.status, 200);
  const sessionId = response.headers[SESSION_HEADER.toLowerCase()];
  assert.equal(typeof sessionId, 'string');
  return { response, sessionId };
}

async function markInitialized(socketPath, endpointPath, sessionId) {
  const response = await udsRequest(socketPath, endpointPath, {
    headers: mcpHeaders(sessionId),
    body: jsonRpc(undefined, 'notifications/initialized')
  });
  assert.equal(response.status, 202);
}

test('M2 ChatGPT UDS conformance uses only a synthetic app and no TCP fallback', { skip: LINUX_ONLY }, async () => {
  await withChatGptWebUdsServer(async ({ calls, socketPath, udsServer, tempRoot }) => {
    const directoryMode = (await fs.stat(tempRoot)).mode & 0o777;
    const socketMode = (await fs.stat(socketPath)).mode & 0o777;
    assert.equal(directoryMode, 0o700);
    assert.equal(socketMode, 0o600);
    assert.equal(udsServer.transport, 'unix_domain_socket_streamable_http');
    assert.deepEqual(udsServer.logicalEndpoints, [
      '/mcp/codex-memory/chatgpt/v0',
      '/mcp/codex-memory/chatgpt/v1',
      '/mcp/codex-memory/chatgpt/v2'
    ]);

    const noBridgeAuth = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: { Accept: JSON_AND_SSE_ACCEPT, 'Content-Type': 'application/json' },
      body: jsonRpc(1, 'initialize', { protocolVersion: '2025-06-18' })
    });
    assert.equal(noBridgeAuth.status, 401);
    assert.equal(noBridgeAuth.json.code, 'TRANSPORT_BRIDGE_AUTH_REJECTED');

    const reservedAuthorization = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(undefined, { Authorization: 'reserved-auth-placeholder' }),
      body: jsonRpc(2, 'initialize', { protocolVersion: '2025-06-18' })
    });
    assert.equal(reservedAuthorization.status, 401);
    assert.equal(reservedAuthorization.json.code, 'TRANSPORT_BRIDGE_AUTH_REJECTED');

    const forwardedConflict = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(undefined, { Forwarded: 'for=127.0.0.1' }),
      body: jsonRpc(3, 'initialize', { protocolVersion: '2025-06-18' })
    });
    assert.equal(forwardedConflict.status, 401);
    assert.equal(forwardedConflict.json.code, 'TRANSPORT_BRIDGE_AUTH_REJECTED');

    const browserOrigin = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(undefined, { Origin: 'https://unapproved.invalid' }),
      body: jsonRpc(4, 'initialize', { protocolVersion: '2025-06-18' })
    });
    assert.equal(browserOrigin.status, 403);
    assert.equal(browserOrigin.json.code, 'TRANSPORT_ORIGIN_REJECTED');

    const missingAccept = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: bridgeHeaders({ Accept: 'application/json', 'Content-Type': 'application/json' }),
      body: jsonRpc(5, 'initialize', { protocolVersion: '2025-06-18' })
    });
    assert.equal(missingAccept.status, 406);
    assert.equal(missingAccept.json.code, 'TRANSPORT_ACCEPT_HEADER_REJECTED');

    const { response: v0Initialize, sessionId: v0SessionId } = await initialize(
      socketPath,
      '/mcp/codex-memory/chatgpt/v0'
    );
    assert.deepEqual(v0Initialize.json.result.capabilities, { tools: { listChanged: false } });
    assert.equal(v0Initialize.json.result.capabilities.resources, undefined);
    assert.equal(v0Initialize.json.result._meta.codexMemoryChatgptWeb.profileId,
      CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0);
    assert.equal(
      v0Initialize.json.result._meta.codexMemoryChatgptWeb.contractPackDigest,
      'sha256:d80eb417c856210002799bd93b2e964fd9b7c8e555a1fc2ae4a2571af824f1e6'
    );
    assert.match(v0Initialize.json.result._meta.codexMemoryChatgptWeb.manifestDigest, /^sha256:[a-f0-9]{64}$/);

    const beforeInitialized = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(v0SessionId),
      body: jsonRpc(5, 'tools/list')
    });
    assert.equal(beforeInitialized.status, 400);
    assert.equal(beforeInitialized.json.code, 'MCP_LIFECYCLE_NOT_INITIALIZED');

    const missingSession = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(),
      body: jsonRpc(6, 'tools/list')
    });
    assert.equal(missingSession.status, 400);
    assert.equal(missingSession.json.code, 'MCP_SESSION_REQUIRED');

    const unknownSession = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders('unknown-session'),
      body: jsonRpc(7, 'tools/list')
    });
    assert.equal(unknownSession.status, 404);
    assert.equal(unknownSession.json.code, 'MCP_SESSION_EXPIRED_404');

    await markInitialized(socketPath, '/mcp/codex-memory/chatgpt/v0', v0SessionId);
    const v0Tools = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(v0SessionId),
      body: jsonRpc(8, 'tools/list')
    });
    assert.equal(v0Tools.status, 200);
    assert.deepEqual(v0Tools.json.result.tools.map(tool => tool.name), ['memory_overview']);
    const { _meta: v0ToolMetadata, ...v0ToolDefinition } = v0Tools.json.result.tools[0];
    assert.deepEqual(v0ToolDefinition, buildChatGptWebToolDefinition('memory_overview'));
    assert.equal(v0Tools.json.result.tools[0].annotations.openWorldHint, false);
    assert.ok(v0Tools.json.result.tools[0].outputSchema);
    assert.equal(
      v0ToolMetadata.codexMemoryChatgptWeb.manifestDigest,
      v0Initialize.json.result._meta.codexMemoryChatgptWeb.manifestDigest
    );
    assert.equal(JSON.stringify(v0Tools.json).includes('synthetic-project'), false);
    assert.equal(JSON.stringify(v0Tools.json).includes('synthetic-workspace'), false);
    assert.equal(JSON.stringify(v0Tools.json).includes('synthetic-scope'), false);

    const invalidInput = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(v0SessionId),
      body: jsonRpc(9, 'tools/call', {
        name: 'memory_overview',
        arguments: { auditWindow: 1 }
      })
    });
    assert.equal(invalidInput.status, 200);
    assert.equal(invalidInput.json.error.data.code, 'tool_input_schema_rejected');

    const blockedRuntime = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(v0SessionId),
      body: jsonRpc(10, 'tools/call', {
        name: 'memory_overview',
        arguments: {}
      })
    });
    assert.equal(blockedRuntime.status, 200);
    assert.equal(blockedRuntime.json.error.data.code, 'chatgpt_web_runtime_not_bound');

    const protocolMismatch = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      headers: mcpHeaders(v0SessionId, { [PROTOCOL_HEADER]: '2025-03-26' }),
      body: jsonRpc(11, 'tools/list')
    });
    assert.equal(protocolMismatch.status, 400);
    assert.equal(protocolMismatch.json.code, 'TRANSPORT_PROTOCOL_VERSION_REJECTED');

    const endpointMismatch = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v1', {
      headers: mcpHeaders(v0SessionId),
      body: jsonRpc(12, 'tools/list')
    });
    assert.equal(endpointMismatch.status, 400);
    assert.equal(endpointMismatch.json.code, 'TOOL_VERSION_ENDPOINT_MISMATCH');

    const invalidGetAccept = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      method: 'GET',
      headers: bridgeHeaders({ [SESSION_HEADER]: v0SessionId, Accept: 'application/json' })
    });
    assert.equal(invalidGetAccept.status, 406);
    assert.equal(invalidGetAccept.json.code, 'TRANSPORT_ACCEPT_HEADER_REJECTED');

    const sse = await openUdsSse(socketPath, '/mcp/codex-memory/chatgpt/v0', bridgeHeaders({
      [SESSION_HEADER]: v0SessionId,
      [PROTOCOL_HEADER]: '2025-06-18',
      Accept: 'text/event-stream'
    }));
    assert.equal(sse.status, 200);
    assert.equal(sse.headers[SESSION_HEADER.toLowerCase()], v0SessionId);

    const { sessionId: v1SessionId } = await initialize(socketPath, '/mcp/codex-memory/chatgpt/v1');
    await markInitialized(socketPath, '/mcp/codex-memory/chatgpt/v1', v1SessionId);
    const v1Tools = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v1', {
      headers: mcpHeaders(v1SessionId),
      body: jsonRpc(13, 'tools/list')
    });
    assert.deepEqual(v1Tools.json.result.tools.map(tool => tool.name).sort(), [
      'audit_memory',
      'memory_overview',
      'search_memory'
    ]);
    for (const tool of v1Tools.json.result.tools) {
      const { _meta, ...toolDefinition } = tool;
      assert.deepEqual(toolDefinition, buildChatGptWebToolDefinition(tool.name));
    }

    const v1Resources = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v1', {
      headers: mcpHeaders(v1SessionId),
      body: jsonRpc(14, 'resources/list')
    });
    assert.equal(v1Resources.status, 200);
    assert.equal(v1Resources.json.error.code, -32601);

    const { sessionId: v2SessionId } = await initialize(socketPath, '/mcp/codex-memory/chatgpt/v2');
    await markInitialized(socketPath, '/mcp/codex-memory/chatgpt/v2', v2SessionId);
    const v2Tools = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v2', {
      headers: mcpHeaders(v2SessionId),
      body: jsonRpc(15, 'tools/list')
    });
    assert.deepEqual(v2Tools.json.result.tools.map(tool => tool.name).sort(), [
      'audit_memory',
      'memory_overview',
      'search_memory'
    ]);

    const deleteSession = await udsRequest(socketPath, '/mcp/codex-memory/chatgpt/v0', {
      method: 'DELETE',
      headers: bridgeHeaders({ [SESSION_HEADER]: v0SessionId })
    });
    assert.equal(deleteSession.status, 204);
    assert.equal(calls.length, 0);
  });
});

test('M2 ChatGPT UDS refuses a TCP-shaped listener configuration', { skip: LINUX_ONLY }, () => {
  const { app } = createSyntheticApp();
  assert.throws(() => {
    createChatGptWebUdsHttpServer({
      app,
      socketDirectory: '/tmp/codex-memory-m2-not-started',
      socketName: 'mcp.sock',
      bridgeAuthSecretFile: '/tmp/codex-memory-m2-not-started/auth',
      enabledProfileIds: [CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0],
      host: '127.0.0.1'
    });
  }, /does not permit a TCP fallback/);
});
