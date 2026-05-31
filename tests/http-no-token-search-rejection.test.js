'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { createStreamableHttpServer } = require('../src/adapters/codex-mcp/http');

const NO_TOKEN_OVERVIEW_KEYS = [
  'access',
  'activeMemoryHealth',
  'adapterStatus',
  'cacheHealth',
  'indexHealth',
  'recall',
  'shadowSync',
  'summary'
];

const NO_TOKEN_OVERVIEW_ACCESS_KEYS = [
  'bearerTokenRequiredForFullOverview',
  'embeddingFingerprintReturned',
  'memoryLinksReturned',
  'mode',
  'pathsReturned',
  'rawMemoryFieldsReturned',
  'recallRecentReturned',
  'recentAuditReturned',
  'recentFilesReturned',
  'selectedProjection',
  'selectedProjectionVersion'
];

async function withHttpServer(handler, serverOptions = {}, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    httpPort: 0,
    ...appOverrides
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

test('no-token HTTP search_memory returns 403 Forbidden', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: { query: 'test', target: 'process', limit: 3 }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 1);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.message, 'Forbidden');
    assert.equal(payload.error.data.code, 'NO_TOKEN_SEARCH_REJECTED');
    assert.ok(payload.error.data.reason.includes('bearer token'));
  });
});

test('no-token HTTP search_memory response must not include snippet/text/content/sourceFile', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: { query: 'test', target: 'process', limit: 3 }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    // Verify the response body does not contain sensitive memory fields
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /"snippet"/i);
    assert.doesNotMatch(serialized, /"content"/i);
    assert.doesNotMatch(serialized, /"sourceFile"/i);
    assert.doesNotMatch(serialized, /"text"/i);
  });
});

test('no-token HTTP record_memory returns 403 Forbidden', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: 'test',
            content: 'test content',
            evidence: 'test evidence',
            validated: true,
            reusable: false,
            sensitivity: 'none'
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, -32001);
  });
});

test('no-token HTTP memory_overview returns selected safe overview', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'memory_overview',
          arguments: {}
        }
      })
    });
    const payload = await response.json();
    const overview = payload.result.structuredContent;
    const serialized = JSON.stringify(overview);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, false);
    assert.equal(overview.access.mode, 'no_token_selected_overview');
    assert.equal(overview.access.selectedProjection, true);
    assert.equal(overview.access.selectedProjectionVersion, 1);
    assert.deepEqual(Object.keys(overview).sort(), NO_TOKEN_OVERVIEW_KEYS);
    assert.deepEqual(Object.keys(overview.access).sort(), NO_TOKEN_OVERVIEW_ACCESS_KEYS);
    assert.equal(overview.access.bearerTokenRequiredForFullOverview, true);
    assert.equal(overview.access.pathsReturned, false);
    assert.equal(overview.access.recentAuditReturned, false);
    assert.equal(overview.access.memoryLinksReturned, false);
    assert.equal(overview.access.recallRecentReturned, false);
    assert.equal(overview.summary.latestAcceptedAt, undefined);
    assert.equal(overview.summary.latestRejectedAt, undefined);
    assert.equal(overview.shadowSync.available, true);
    assert.doesNotMatch(serialized, /"paths"\s*:/);
    assert.doesNotMatch(serialized, /"latestAcceptedAt"\s*:/);
    assert.doesNotMatch(serialized, /"latestRejectedAt"\s*:/);
    assert.doesNotMatch(serialized, /"recentAudit"\s*:/);
    assert.doesNotMatch(serialized, /"recentFiles"\s*:/);
    assert.doesNotMatch(serialized, /"memoryLinks"\s*:/);
    assert.doesNotMatch(serialized, /"recent"\s*:/);
    assert.doesNotMatch(serialized, /"memoryId"\s*:/);
    assert.doesNotMatch(serialized, /"title"\s*:/);
    assert.doesNotMatch(serialized, /"filePath"\s*:/);
    assert.doesNotMatch(serialized, /"sourceFile"\s*:/);
    assert.doesNotMatch(serialized, /"embeddingFingerprint"\s*:/);
  });
});

test('no-token HTTP tools/list is allowed', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/list'
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.jsonrpc, '2.0');
    assert.ok(Array.isArray(payload.result.tools));
    assert.ok(payload.result.tools.length > 0);
  });
});

test('no-token HTTP initialize and ping are allowed', async () => {
  await withHttpServer(async ({ address }) => {
    // initialize
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26' }
      })
    });
    const initPayload = await initResponse.json();
    assert.equal(initResponse.status, 200);
    assert.equal(initPayload.result.serverInfo.name, 'vcp_codex_memory');

    // ping
    const pingResponse = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'ping'
      })
    });
    const pingPayload = await pingResponse.json();
    assert.equal(pingResponse.status, 200);
    assert.deepEqual(pingPayload.result, {});
  });
});

test('bearer token HTTP search_memory is allowed', async () => {
  const bearerToken = 'test-token-12345';
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: { query: 'test', target: 'process', limit: 3 }
        }
      })
    });
    const payload = await response.json();

    // With token, search should be allowed (may return empty results, not 403)
    assert.notEqual(response.status, 403);
    assert.notEqual(payload.error?.code, -32001);
  }, { bearerToken });
});

test('no-token HTTP search_memory with include_content=true is rejected', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'test',
            target: 'process',
            limit: 3,
            include_content: true
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.data.code, 'NO_TOKEN_SEARCH_REJECTED');
  });
});
