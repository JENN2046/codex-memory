const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-test-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('codex-memory MCP should initialize a session and expose expected server info', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });

    assert.ok(result.sessionId);
    assert.equal(result.response.result.protocolVersion, '2025-06-18');
    assert.equal(result.response.result.serverInfo.name, 'vcp_codex_memory');
    assert.match(result.response.result.instructions, /record_memory/);
  });
});

test('codex-memory MCP should expose tools and execute record/search/overview', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const requestContext = {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-test'
      }
    };

    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }, requestContext);
    assert.equal(list.response.result.tools.length, 3);

    const recordProcess = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: keep dual write stable',
          evidence: 'observed during migration',
          validated: true,
          reusable: false,
          tags: ['checkpoint', 'migration'],
          sensitivity: 'none'
        }
      }
    }, requestContext);
    assert.equal(recordProcess.response.result.structuredContent.decision, 'accepted');
    assert.equal(recordProcess.response.result.structuredContent.agentAlias, 'Codex');

    const recordKnowledge = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'knowledge',
          title: 'Recall contract',
          content: 'Validated knowledge about MCP response compatibility.',
          evidence: 'covered by contract tests',
          validated: true,
          reusable: true,
          tags: ['mcp', 'contract'],
          sensitivity: 'none'
        }
      }
    }, requestContext);
    assert.equal(recordKnowledge.response.result.structuredContent.decision, 'accepted');

    const search = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'migration contract checkpoint',
          target: 'both',
          limit: 5,
          include_content: true
        }
      }
    }, requestContext);

    assert.equal(search.response.result.structuredContent.results.length, 2);
    assert.deepEqual(
      search.response.result.structuredContent.results.map(result => result.target).sort(),
      ['knowledge', 'process']
    );

    const overview = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'memory_overview',
        arguments: {
          auditWindow: 200,
          limit: 10
        }
      }
    }, requestContext);

    assert.ok(overview.response.result.structuredContent.paths.auditLogPath.endsWith('codex-memory-bridge.jsonl'));
    assert.equal(overview.response.result.isError, false);
    assert.equal(overview.response.result.structuredContent.shadowSync.available, true);
  });
});
