const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

async function withApp(handler, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-test-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...appOverrides
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
    assert.equal(list.response.result.tools.length, 7);

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
    assert.deepEqual(tools.map(tool => tool.name).sort(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory', 'supersede_memory', 'tombstone_memory', 'validate_memory']);
    const recordMemory = tools.find(t => t.name === 'record_memory');
    assert.ok(recordMemory);
    const schema = recordMemory.inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.project_id);
    assert.ok(schema.properties.workspace_id);
    assert.ok(schema.properties.client_id);
    assert.ok(schema.properties.visibility);
    for (const field of ['project_id', 'workspace_id', 'client_id', 'visibility', 'task_id', 'conversation_id', 'retention_policy']) {
      assert.equal(schema.properties[field].maxLength, 200, `${field} should have maxLength 200`);
    }
    assert.deepEqual(schema.properties.client_id.enum, ['codex', 'claude', 'omc', 'manual']);
    assert.deepEqual(schema.properties.visibility.enum, ['private', 'workspace', 'project', 'shared']);
    assert.ok(schema.properties.task_id);
    assert.ok(schema.properties.conversation_id);
    assert.ok(schema.properties.retention_policy);
  });
});

test('MCP schema contract should describe memory_overview bounded HTTP projections', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    const memoryOverview = tools.find(t => t.name === 'memory_overview');
    assert.ok(memoryOverview);
    assert.match(memoryOverview.description, /HTTP no-token calls return only a selected low-disclosure overview projection/);
    assert.match(memoryOverview.description, /bearer-token HTTP calls return a bounded low-disclosure overview projection by default/);
    assert.equal(memoryOverview.inputSchema.additionalProperties, false);
  });
});

test('MCP runtime schema validation should reject unknown fields with -32602', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: schema validation',
          evidence: 'contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none',
          unexpected_field: true
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /unexpected_field/);
  });
});

test('MCP runtime schema validation should reject enum mismatch with -32602', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: schema validation',
          evidence: 'contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none',
          client_id: 'unknown-client'
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /client_id/);
  });
});

test('MCP runtime schema validation should reject invalid scope with -32602', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'checkpoint',
          scope: {
            visibility: ['private', 'invalid-visibility']
          }
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /visibility/);
  });
});

test('MCP search_memory timeout should return sanitized JSON-RPC error', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const secretQuery = 'timeout query with SHOULD_NOT_LEAK_0560';
    app.services.passiveRecallService.search = async () => new Promise(() => {});

    const startedAt = Date.now();
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: secretQuery,
          target: 'process',
          limit: 1
        }
      }
    });
    const elapsedMs = Date.now() - startedAt;
    const serialized = JSON.stringify(result.response);

    assert.equal(result.response.jsonrpc, '2.0');
    assert.equal(result.response.id, 13);
    assert.equal(result.response.error.code, -32002);
    assert.equal(result.response.error.message, 'Search memory timeout');
    assert.equal(result.response.error.data.code, 'SEARCH_MEMORY_TIMEOUT');
    assert.equal(result.response.error.data.reason, 'search_memory exceeded the configured timeout.');
    assert.equal(result.response.error.data.timeoutMs, 5);
    assert.ok(elapsedMs < 1000);
    assert.doesNotMatch(serialized, /SHOULD_NOT_LEAK_0560/);
  }, { searchMemoryTimeoutMs: 5 });
});

test('MCP search_memory timeout should abort before post-timeout read-policy audit summary', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let receivedSignal = false;
    let readPolicySummaryCount = 0;

    app.services.passiveRecallService.search = async ({ signal }) => {
      receivedSignal = !!signal;
      return new Promise(resolve => {
        signal.addEventListener('abort', () => {
          setTimeout(() => resolve([]), 10);
        }, { once: true });
      });
    };
    app.recall.recallAuditService.recordReadPolicySummary = async () => {
      readPolicySummaryCount += 1;
    };

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 14,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'timeout abort audit boundary SHOULD_NOT_LEAK_0561',
          target: 'process',
          limit: 1
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    const serialized = JSON.stringify(result.response);

    assert.equal(receivedSignal, true);
    assert.equal(readPolicySummaryCount, 0);
    assert.equal(result.response.error.code, -32002);
    assert.equal(result.response.error.data.code, 'SEARCH_MEMORY_TIMEOUT');
    assert.doesNotMatch(serialized, /SHOULD_NOT_LEAK_0561/);
  }, {
    enableLifecycleReadPolicy: true,
    searchMemoryTimeoutMs: 5
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
