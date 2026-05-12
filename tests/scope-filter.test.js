const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-scope-test-'));
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

const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'codex-memory-scope-test'
  }
};

test('scope filter: record_memory writes scope metadata (project A / project B)', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const recordA = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Project A Checkpoint',
          content: 'Type: checkpoint\nrisk: project A scope test',
          evidence: 'scope filter test',
          validated: true,
          reusable: false,
          tags: ['scope', 'project-a'],
          sensitivity: 'none',
          project_id: 'project-a',
          visibility: 'project'
        }
      }
    }, requestContext);

    assert.equal(recordA.response.result.structuredContent.decision, 'accepted');

    const recordB = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Project B Checkpoint',
          content: 'Type: checkpoint\nrisk: project B scope test',
          evidence: 'scope filter test',
          validated: true,
          reusable: false,
          tags: ['scope', 'project-b'],
          sensitivity: 'none',
          project_id: 'project-b',
          visibility: 'project'
        }
      }
    }, requestContext);

    assert.equal(recordB.response.result.structuredContent.decision, 'accepted');
  });
});

test('scope filter: search_memory project A returns only project A (results > 0, no project B)', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const { shadowStore } = app.stores;

    // Write project A
    const ra = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'PA Checkpoint',
          content: 'Type: checkpoint\nrisk: PA scope isolation',
          evidence: 'PA only',
          validated: true,
          reusable: false,
          tags: ['scope', 'pa'],
          sensitivity: 'none',
          project_id: 'project-a',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(ra.response.result.structuredContent.decision, 'accepted');
    const paMemoryId = ra.response.result.structuredContent.memoryId;

    // Write project B
    const rb = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'PB Checkpoint',
          content: 'Type: checkpoint\nrisk: PB scope isolation',
          evidence: 'PB only',
          validated: true,
          reusable: false,
          tags: ['scope', 'pb'],
          sensitivity: 'none',
          project_id: 'project-b',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(rb.response.result.structuredContent.decision, 'accepted');
    const pbMemoryId = rb.response.result.structuredContent.memoryId;

    // Search with project A filter
    const searchA = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'checkpoint scope',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'project-a'
          }
        }
      }
    }, requestContext);

    const resultsA = searchA.response.result.structuredContent.results || [];
    assert.ok(resultsA.length > 0, 'project A filter must return at least one result');

    const aMemoryIds = resultsA.map(r => r.memoryId);
    assert.ok(aMemoryIds.includes(paMemoryId), 'project A filter must return project A record');
    assert.ok(!aMemoryIds.includes(pbMemoryId), 'project A filter must NOT return project B record');
  });
});

test('scope filter: search_memory with wrong project_id returns 0', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    // Write a record
    const r = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Test Checkpoint',
          content: 'Type: checkpoint\nrisk: test',
          evidence: 'test',
          validated: true,
          reusable: false,
          tags: ['scope'],
          sensitivity: 'none',
          project_id: 'real-project',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(r.response.result.structuredContent.decision, 'accepted');

    // Search with wrong project
    const search = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'checkpoint',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'other-project'
          }
        }
      }
    }, requestContext);

    const results = search.response.result.structuredContent.results || [];
    assert.equal(results.length, 0, 'wrong project_id must return 0 results');
  });
});

test('scope filter: strict mode must NOT leak records from other projects', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    // Write record with project_id = 'strict-project' via MCP (goes to diary + shadow)
    const r = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Strict Mode Test',
          content: 'Type: checkpoint\nrisk: strict mode test',
          evidence: 'strict mode test',
          validated: true,
          reusable: false,
          tags: ['scope', 'strict'],
          sensitivity: 'none',
          project_id: 'strict-project',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(r.response.result.structuredContent.decision, 'accepted');

    // strict mode with wrong project: must return 0
    const searchWrong = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'strict mode',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'nonexistent-project',
            strict: true
          }
        }
      }
    }, requestContext);

    const wrongResults = searchWrong.response.result.structuredContent.results || [];
    assert.equal(wrongResults.length, 0, 'strict mode must block records from other projects');
  });
});

test('mapRow does not fake project_id (legacyProjectIdFallback test)', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const { shadowStore } = app.stores;

    const testRecord = {
      memoryId: 'codex-process-explicit-project',
      target: 'process',
      title: 'Explicit Project Test',
      content: 'Type: checkpoint',
      evidence: 'explicit project test',
      tags: ['scope'],
      sensitivity: 'none',
      validated: true,
      reusable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: 'explicit-project',
      visibility: 'project',
      clientId: 'codex',
      workspaceId: tempBasePath
    };

    await shadowStore.upsertRecord(testRecord);

    const retrieved = await shadowStore.getRecord('codex-process-explicit-project');
    assert.equal(retrieved.projectId, 'explicit-project', 'mapRow should preserve actual project_id, not fake it');
    assert.notEqual(retrieved.projectId, 'codex-memory', 'mapRow should not default to codex-memory');
  });
});

test('HTTP MCP tools/call end-to-end scope parameter verification', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const recordResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'E2E Scope Test',
          content: 'Type: checkpoint\nrisk: e2e scope test',
          evidence: 'e2e scope test',
          validated: true,
          reusable: false,
          tags: ['e2e', 'scope'],
          sensitivity: 'none',
          project_id: 'e2e-test-project',
          workspace_id: '/test/workspace',
          client_id: 'codex',
          visibility: 'shared',
          task_id: 'TASK-001',
          conversation_id: 'conv-123'
        }
      }
    }, requestContext);

    assert.equal(recordResult.response.result.structuredContent.decision, 'accepted');
    const memId = recordResult.response.result.structuredContent.memoryId;

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'E2E scope',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'e2e-test-project',
            visibility: 'shared'
          }
        }
      }
    }, requestContext);

    const results = searchResult.response.result.structuredContent.results || [];
    assert.ok(results.length > 0, 'should find records matching scope filter');
    assert.ok(results.some(r => r.memoryId === memId), 'should include the E2E record');
  });
});

test('scope filter: workspace_id and client_id must both match in end-to-end search', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const correctRecord = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Workspace Client Match',
          content: 'Type: checkpoint\nrisk: workspace and client scope match',
          evidence: 'workspace-client-match',
          validated: true,
          reusable: false,
          tags: ['scope', 'workspace', 'client'],
          sensitivity: 'none',
          project_id: 'scope-acceptance-project',
          workspace_id: '/workspace/accepted',
          client_id: 'codex',
          visibility: 'shared'
        }
      }
    }, requestContext);
    assert.equal(correctRecord.response.result.structuredContent.decision, 'accepted');
    const acceptedId = correctRecord.response.result.structuredContent.memoryId;

    const wrongWorkspaceRecord = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Workspace Mismatch',
          content: 'Type: checkpoint\nrisk: workspace mismatch',
          evidence: 'workspace-mismatch',
          validated: true,
          reusable: false,
          tags: ['scope', 'workspace', 'mismatch'],
          sensitivity: 'none',
          project_id: 'scope-acceptance-project',
          workspace_id: '/workspace/rejected',
          client_id: 'codex',
          visibility: 'shared'
        }
      }
    }, requestContext);
    assert.equal(wrongWorkspaceRecord.response.result.structuredContent.decision, 'accepted');

    const wrongClientRecord = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Client Mismatch',
          content: 'Type: checkpoint\nrisk: client mismatch',
          evidence: 'client-mismatch',
          validated: true,
          reusable: false,
          tags: ['scope', 'client', 'mismatch'],
          sensitivity: 'none',
          project_id: 'scope-acceptance-project',
          workspace_id: '/workspace/accepted',
          client_id: 'claude',
          visibility: 'shared'
        }
      }
    }, requestContext);
    assert.equal(wrongClientRecord.response.result.structuredContent.decision, 'accepted');

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'workspace client',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'scope-acceptance-project',
            workspace_id: '/workspace/accepted',
            client_id: 'codex',
            visibility: 'shared'
          }
        }
      }
    }, requestContext);

    const results = searchResult.response.result.structuredContent.results || [];
    assert.ok(results.length > 0, 'combined workspace/client filter should return a result');
    const resultIds = results.map(r => r.memoryId);
    assert.ok(resultIds.includes(acceptedId), 'combined workspace/client filter must include the matching record');
    assert.equal(resultIds.length, 1, 'combined workspace/client filter must exclude workspace/client mismatches');
  });
});

test('scope filter: wrong workspace_id or client_id returns 0 in strict mode', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const recordResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Strict Workspace Client Test',
          content: 'Type: checkpoint\nrisk: strict workspace/client scope test',
          evidence: 'strict-workspace-client',
          validated: true,
          reusable: false,
          tags: ['scope', 'strict', 'workspace', 'client'],
          sensitivity: 'none',
          project_id: 'strict-scope-project',
          workspace_id: '/workspace/strict',
          client_id: 'codex',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(recordResult.response.result.structuredContent.decision, 'accepted');

    const wrongWorkspaceSearch = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'strict workspace client',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'strict-scope-project',
            workspace_id: '/workspace/wrong',
            client_id: 'codex',
            strict: true
          }
        }
      }
    }, requestContext);
    const wrongWorkspaceResults = wrongWorkspaceSearch.response.result.structuredContent.results || [];
    assert.equal(wrongWorkspaceResults.length, 0, 'wrong workspace_id must return 0 in strict mode');

    const wrongClientSearch = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'strict workspace client',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'strict-scope-project',
            workspace_id: '/workspace/strict',
            client_id: 'claude',
            strict: true
          }
        }
      }
    }, requestContext);
    const wrongClientResults = wrongClientSearch.response.result.structuredContent.results || [];
    assert.equal(wrongClientResults.length, 0, 'wrong client_id must return 0 in strict mode');
  });
});

test('schema: record_memory and search_memory tool definitions cover scope fields', () => {
  const recordSchema = TOOL_DEFINITIONS.find(t => t.name === 'record_memory');
  const searchSchema = TOOL_DEFINITIONS.find(t => t.name === 'search_memory');

  assert.ok(recordSchema, 'record_memory tool definition must exist');
  assert.ok(searchSchema, 'search_memory tool definition must exist');

  // record_memory scope fields
  const recordProps = Object.keys(recordSchema.inputSchema.properties);
  for (const field of ['project_id', 'workspace_id', 'client_id', 'visibility', 'task_id', 'conversation_id', 'retention_policy']) {
    assert.ok(recordProps.includes(field), `record_memory schema must include ${field}`);
  }
  assert.ok(recordSchema.inputSchema.additionalProperties === false, 'record_memory must reject additional properties');

  // search_memory scope fields
  const searchScopeProps = Object.keys(searchSchema.inputSchema.properties.scope.properties);
  for (const field of ['project_id', 'workspace_id', 'client_id', 'visibility', 'strict']) {
    assert.ok(searchScopeProps.includes(field), `search_memory scope schema must include ${field}`);
  }
  assert.ok(searchSchema.inputSchema.additionalProperties === false, 'search_memory must reject additional properties');
});

test('old DB schema drift report: verify scope columns exist', async () => {
  await withApp(async ({ app }) => {
    const { shadowStore } = app.stores;
    await shadowStore.ensureReady();

    const tableInfo = shadowStore.db.prepare('PRAGMA table_info(memory_records)').all();
    const columnNames = tableInfo.map(col => col.name);

    const requiredScopeColumns = ['client_id', 'workspace_id', 'project_id', 'task_id', 'conversation_id', 'visibility', 'retention_policy'];

    for (const col of requiredScopeColumns) {
      assert.ok(columnNames.includes(col), `Schema should have ${col} column`);
    }
  });
});
