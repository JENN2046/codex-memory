'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const {
  createStreamableHttpServer,
  PUBLIC_REQUEST_BLOCKED
} = require('../src/adapters/codex-mcp/http');

const NO_TOKEN_OVERVIEW_KEYS = [
  'access',
  'activeMemoryHealth',
  'adapterStatus',
  'cacheHealth',
  'indexHealth',
  'recall',
  'runtimePosture',
  'shadowSync',
  'summary'
];

const NO_TOKEN_OVERVIEW_ACCESS_KEYS = [
  'detailFieldsReturned',
  'embeddingFingerprintReturned',
  'memoryLinksReturned',
  'mode',
  'pathsReturned',
  'publicAccess',
  'recallRecentReturned',
  'recentAuditReturned',
  'recentFilesReturned',
  'selectedProjection',
  'selectedProjectionVersion'
];

function collectObjectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, keys);
    return keys;
  }
  if (!value || typeof value !== 'object') {
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectObjectKeys(child, keys);
  }
  return keys;
}

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
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payload.error.data.status, 'rejected');
    assert.equal(payload.error.data.reason, 'blocked');
    assert.doesNotMatch(JSON.stringify(payload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);
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

test('no-token HTTP prepare_memory_context returns 403 when bearer authentication is configured', async () => {
  const bearerToken = 'test-token-12345';
  await withHttpServer(async ({ app, address }) => {
    let searchCalled = false;
    app.services.passiveRecallService.search = async () => {
      searchCalled = true;
      return [];
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'prepare_memory_context',
          arguments: {
            task: {
              title: 'No-token context request',
              user_request: 'This request must not reach recall.'
            }
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(searchCalled, false);
    assert.doesNotMatch(JSON.stringify(payload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);
  }, { bearerToken });
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
    assert.equal(overview.access.mode, 'public_selected_overview');
    assert.equal(overview.access.selectedProjection, true);
    assert.equal(overview.access.selectedProjectionVersion, 2);
    assert.deepEqual(Object.keys(overview).sort(), NO_TOKEN_OVERVIEW_KEYS);
    assert.deepEqual(Object.keys(overview.access).sort(), NO_TOKEN_OVERVIEW_ACCESS_KEYS);
    assert.equal(overview.access.publicAccess, 'blocked');
    assert.equal(overview.access.detailFieldsReturned, false);
    assert.equal(overview.access.pathsReturned, false);
    assert.equal(overview.access.recentAuditReturned, false);
    assert.equal(overview.access.memoryLinksReturned, false);
    assert.equal(overview.access.recallRecentReturned, false);
    assert.equal(overview.summary.latestAcceptedAt, undefined);
    assert.equal(overview.summary.latestRejectedAt, undefined);
    assert.equal(overview.shadowSync.available, true);
    assert.doesNotMatch(serialized, /bearer|token|raw|lifecycle|mutation|provider|api|client/i);
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

    const memoryOverviewTool = payload.result.tools.find(tool => tool.name === 'memory_overview');
    assert.ok(memoryOverviewTool);
    assert.match(
      memoryOverviewTool.description,
      /HTTP no-token calls return only a selected low-disclosure overview projection/
    );
    assert.match(memoryOverviewTool.description, /bearer-token HTTP calls return a bounded low-disclosure overview projection by default/);
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

test('bearer token HTTP search_memory returns bounded projection', async () => {
  const bearerToken = 'test-token-12345';
  await withHttpServer(async ({ app, address }) => {
    let searchOptions = null;
    app.services.passiveRecallService.search = async options => {
      searchOptions = options;
      return [{
        target: 'process',
        score: 0.75,
        baseScore: 0.5,
        rerankScore: 0.6,
        titleHitCount: 1,
        tagHitCount: 2,
        contentHitCount: 3,
        evidenceHitCount: 4,
        exactCoreTagCount: 5,
        tagMemoSurfaceScore: 0.7,
        dynamicCoreWeight: 0.8,
        sourceKinds: ['synthetic'],
        matchedTags: ['internal-matched-tag'],
        coreTags: ['internal-core-tag'],
        updatedAt: '2026-07-13T00:00:00.000Z',
        sourceFile: 'synthetic/source.md',
        filePath: 'synthetic/file.md',
        path: 'synthetic/path.md',
        title: 'synthetic title',
        memoryId: 'synthetic-memory-id',
        snippet: 'synthetic snippet',
        text: 'synthetic text',
        content: 'synthetic content',
        raw_text: 'synthetic raw text'
      }];
    };

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
    const structured = payload.result.structuredContent;
    const serialized = JSON.stringify(structured);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, false);
    assert.equal(searchOptions.readOnly, true);
    assert.equal(searchOptions.noRawContentRead, true);
    assert.equal(searchOptions.includeContent, false);
    assert.equal(searchOptions.precisionPolicyContext, null);
    assert.equal(structured.access.mode, 'authenticated_bounded_search');
    assert.equal(structured.access.selectedProjection, true);
    assert.equal(structured.access.rawContentReturned, false);
    assert.equal(structured.access.pathsReturned, false);
    assert.equal(structured.access.memoryIdsReturned, false);
    assert.equal(structured.resultCount, 1);
    assert.equal(structured.results.length, 1);
    assert.equal(structured.results[0].target, 'process');
    assert.equal(structured.results[0].score, 0.75);
    assert.doesNotMatch(serialized, /synthetic\/source|synthetic\/file|synthetic title|synthetic-memory-id|synthetic snippet|synthetic text|synthetic content|synthetic raw text|internal-matched-tag|internal-core-tag|2026-07-13T00:00:00/);
    const keys = collectObjectKeys(structured);
    for (const forbiddenKey of ['sourceFile', 'filePath', 'path', 'title', 'memoryId', 'snippet', 'text', 'content', 'raw_text']) {
      assert.equal(keys.has(forbiddenKey), false, `${forbiddenKey} should be stripped`);
    }
  }, { bearerToken });
});

test('bearer token HTTP high-entropy negative-control search enables no-result precision policy', async () => {
  const bearerToken = 'test-token-12345';
  await withHttpServer(async ({ app, address }) => {
    let searchOptions = null;
    app.services.passiveRecallService.search = async options => {
      searchOptions = options;
      return [];
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'xqzv-9137-lomdra-kepv-azmuth',
            target: 'both',
            limit: 1,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();
    const structured = payload.result.structuredContent;

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, false);
    assert.equal(searchOptions.readOnly, true);
    assert.equal(searchOptions.noRawContentRead, true);
    assert.deepEqual(searchOptions.precisionPolicyContext, {
      enabled: true,
      queryFamily: 'authenticated_bounded_high_entropy_negative_control',
      proofNoResultMode: true,
      minimumScore: 0.12,
      highConfidenceScore: 0.62
    });
    assert.equal(structured.access.mode, 'authenticated_bounded_search');
    assert.equal(structured.resultCount, 0);
    assert.deepEqual(structured.results, []);
  }, { bearerToken });
});

test('bearer token HTTP search_memory rejects include_content=true in bounded projection', async () => {
  const bearerToken = 'test-token-12345';
  await withHttpServer(async ({ app, address }) => {
    let searchCalled = false;
    app.services.passiveRecallService.search = async () => {
      searchCalled = true;
      return [];
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
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

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, true);
    assert.equal(payload.result.structuredContent.decision, 'rejected');
    assert.equal(payload.result.structuredContent.access.mode, 'authenticated_bounded_search');
    assert.equal(searchCalled, false);
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
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.doesNotMatch(JSON.stringify(payload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);
  });
});
