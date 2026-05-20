const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { createStreamableHttpServer, SESSION_HEADER, createSessionHardeningConfig } = require('../src/adapters/codex-mcp/http');

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
    await handler({ app, address, httpServer });
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
      assert.equal(payload.jsonrpc, '2.0');
      assert.equal(payload.id, 5 + index);
      assert.equal(payload.error.code, -32000);
      assert.equal(payload.error.message, 'Forbidden');
      assert.match(payload.error.data, /no-token/i);
      assert.match(payload.error.data, /mutation/i);
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
test('HTTP MCP session hardening should expose invalid env fallback warnings', async () => {
  const hardening = createSessionHardeningConfig({
    CODEX_MEMORY_HTTP_SESSION_TTL_MS: 'not-a-number',
    CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS: '-1',
    CODEX_MEMORY_HTTP_MAX_SESSIONS: '999',
    CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION: '0',
    CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '1'
  });

  assert.equal(hardening.absoluteTtlMs, 30 * 60 * 1000);
  assert.equal(hardening.idleTtlMs, 10 * 60 * 1000);
  assert.equal(hardening.maxSessions, 64);
  assert.equal(hardening.maxStreamsPerSession, 8);
  assert.equal(hardening.cleanupIntervalMs, 60 * 1000);
  assert.deepEqual(hardening.warnings.map(warning => warning.key), [
    'CODEX_MEMORY_HTTP_SESSION_TTL_MS',
    'CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS',
    'CODEX_MEMORY_HTTP_MAX_SESSIONS',
    'CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION',
    'CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS'
  ]);
  assert.equal(hardening.warnings.some(warning => Object.hasOwn(warning, 'raw')), false);
});

test('HTTP MCP session hardening should reject max sessions plus one with 429', async () => {
  await withHttpServer(async ({ address }) => {
    const first = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    assert.equal(first.status, 200);
    assert.ok(first.headers.get(SESSION_HEADER));

    const second = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    });
    const payload = await second.json();
    assert.equal(second.status, 429);
    assert.equal(payload.error, 'session_limit_exceeded');
    assert.equal(payload.code, 'HTTP_SESSION_LIMIT_EXCEEDED');
    assert.equal(payload.meta.limitType, 'sessions');
    assert.equal(payload.meta.limit, 1);
    assert.equal(JSON.stringify(payload).includes('Bearer'), false);
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '1',
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening cleanup after expiry should allow new sessions', async () => {
  let currentTime = 0;
  await withHttpServer(async ({ address, httpServer }) => {
    const first = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    assert.equal(first.status, 200);

    currentTime = 6 * 60 * 1000;
    httpServer.cleanupExpiredSessions();

    const second = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    });
    assert.equal(second.status, 200);
    assert.ok(second.headers.get(SESSION_HEADER));
  }, {
    sessionClock: () => currentTime,
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '1',
      CODEX_MEMORY_HTTP_SESSION_TTL_MS: String(5 * 60 * 1000),
      CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS: String(2 * 60 * 1000),
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening should reject max streams plus one and allow after close', async () => {
  await withHttpServer(async ({ address }) => {
    const first = await fetch(address.url);
    assert.equal(first.status, 200);
    const sessionId = first.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const second = await fetch(address.url, { headers: { [SESSION_HEADER]: sessionId } });
    const payload = await second.json();
    assert.equal(second.status, 429);
    assert.equal(payload.error, 'session_stream_limit_exceeded');
    assert.equal(payload.code, 'HTTP_SESSION_STREAM_LIMIT_EXCEEDED');
    assert.equal(payload.meta.limitType, 'streams_per_session');
    assert.equal(payload.meta.limit, 1);

    first.body.cancel();
    await new Promise(resolve => setTimeout(resolve, 10));

    const third = await fetch(address.url, { headers: { [SESSION_HEADER]: sessionId } });
    assert.equal(third.status, 200);
    third.body.cancel();
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION: '1',
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening should expose sanitized warning metadata on health', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const payload = await health.json();
    assert.equal(health.status, 200);
    assert.equal(payload.sessionHardening.maxSessions, 64);
    assert.equal(payload.sessionHardening.warnings[0].key, 'CODEX_MEMORY_HTTP_MAX_SESSIONS');
    assert.equal(Object.hasOwn(payload.sessionHardening.warnings[0], 'raw'), false);
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '999'
    }
  });
});
