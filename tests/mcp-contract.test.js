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

test('MCP schema contract should expose scope fields in record_memory', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    const recordMemory = tools.find(t => t.name === 'record_memory');
    assert.ok(recordMemory);
    const schema = recordMemory.inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.project_id);
    assert.ok(schema.properties.workspace_id);
    assert.ok(schema.properties.client_id);
    assert.ok(schema.properties.visibility);
    assert.deepEqual(schema.properties.client_id.enum, ['codex', 'claude', 'omc', 'manual']);
    assert.deepEqual(schema.properties.visibility.enum, ['private', 'workspace', 'project', 'shared']);
    assert.ok(schema.properties.task_id);
    assert.ok(schema.properties.conversation_id);
    assert.ok(schema.properties.retention_policy);
  });
});

test('MCP schema contract should expose scope in search_memory', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    const searchMemory = tools.find(t => t.name === 'search_memory');
    assert.ok(searchMemory);
    const schema = searchMemory.inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.scope);
    const scopeSchema = schema.properties.scope;
    assert.equal(scopeSchema.additionalProperties, false);
    assert.ok(scopeSchema.properties.project_id);
    assert.ok(scopeSchema.properties.workspace_id);
    assert.ok(scopeSchema.properties.client_id);
    assert.ok(scopeSchema.properties.visibility);
    assert.ok(Array.isArray(scopeSchema.properties.visibility.oneOf));
    assert.deepEqual(scopeSchema.properties.visibility.oneOf.map(option => option.type), ['string', 'array']);
    assert.equal(scopeSchema.properties.visibility.oneOf[1].items.type, 'string');
    assert.deepEqual(scopeSchema.properties.client_id.enum, ['codex', 'claude', 'omc', 'manual']);
    assert.deepEqual(scopeSchema.properties.visibility.oneOf[0].enum, ['private', 'workspace', 'project', 'shared']);
    assert.deepEqual(scopeSchema.properties.visibility.oneOf[1].items.enum, ['private', 'workspace', 'project', 'shared']);
    assert.ok(scopeSchema.properties.strict);
  });
});
