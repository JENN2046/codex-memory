const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { createStreamableHttpServer, SESSION_HEADER } = require('../src/adapters/codex-mcp/http');

async function withHttpServer(handler, serverOptions = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    httpPort: 0
  });

  await app.initialize();
  const httpServer = createStreamableHttpServer({
    app,
    host: '127.0.0.1',
    port: 0,
    mcpPath: '/mcp/codex-memory',
    ...serverOptions
  });

  const address = await httpServer.listen();

  try {
    await handler({ app, address });
  } finally {
    await httpServer.close();
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('HTTP MCP should initialize and return a session header', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'codex-memory-http-test',
            version: '1.0'
          }
        }
      })
    });

    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.ok(response.headers.get(SESSION_HEADER));
    assert.equal(payload.result.serverInfo.name, 'vcp_codex_memory');
    assert.equal(payload.result.protocolVersion, '2025-03-26');
  });
});

test('HTTP MCP should expose health and tools/list', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.equal(healthPayload.auth.required, false);
    assert.match(healthPayload.auth.warning, /loopback host without a bearer token/);

    const tools = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await tools.json();
    assert.equal(payload.result.tools.length, 3);
  });
});

test('HTTP MCP should reject browser-origin no-token POST writes', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.invalid',
        'Sec-Fetch-Site': 'cross-site'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, 'Forbidden');
    assert.match(payload.message, /bearer token/i);
  });
});

test('HTTP MCP should reject no-token simple POST content types', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, 'Forbidden');
    assert.match(payload.message, /application\/json/i);
  });
});

test('HTTP MCP should fail fast when non-loopback host has no bearer token', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-auth-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  try {
    assert.throws(() => createStreamableHttpServer({
      app,
      host: '0.0.0.0',
      port: 0,
      mcpPath: '/mcp/codex-memory',
      bearerToken: ''
    }), /CODEX_MEMORY_HTTP_TOKEN is required/);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('HTTP MCP should allow non-loopback host when bearer token is configured', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-auth-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  try {
    const httpServer = createStreamableHttpServer({
      app,
      host: '0.0.0.0',
      port: 0,
      mcpPath: '/mcp/codex-memory',
      bearerToken: 'test-token'
    });
    assert.equal(httpServer.authWarning, null);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('HTTP MCP should reject no-token mutation tool calls', async () => {
  await withHttpServer(async ({ address }) => {
    const mutationCalls = [
      {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'HTTP no-token mutation',
          content: 'Type: checkpoint\nblocked no-token mutation',
          evidence: 'http no-token mutation contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none'
        }
      },
      {
        name: 'validate_memory',
        arguments: {
          memoryId: 'future-public-mutation-tool',
          decision: 'reject'
        }
      }
    ];

    for (const [index, params] of mutationCalls.entries()) {
      const response = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5 + index,
          method: 'tools/call',
          params
        })
      });
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.error, 'Forbidden');
      assert.match(payload.message, /no-token/i);
      assert.match(payload.message, /mutation/i);
    }
  });
});

test('HTTP MCP should execute record_memory through authorized tools/call', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const record = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: 'HTTP checkpoint',
            content: 'Type: checkpoint\nvia http server',
            evidence: 'http contract test',
            validated: true,
            reusable: false,
            sensitivity: 'none'
          }
        }
      })
    });
    const payload = await record.json();
    assert.equal(record.status, 200);
    assert.equal(payload.result.structuredContent.decision, 'accepted');
    assert.equal(payload.result.structuredContent.agentAlias, 'Codex');
  }, { bearerToken: 'test-token' });
});
