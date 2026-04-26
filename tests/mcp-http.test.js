const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { createStreamableHttpServer, SESSION_HEADER } = require('../src/adapters/codex-mcp/http');

async function withHttpServer(handler) {
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
    mcpPath: '/mcp/codex-memory'
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

test('HTTP MCP should execute record_memory through tools/call', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
  });
});
