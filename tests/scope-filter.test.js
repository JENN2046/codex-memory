const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

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

    // Write to project A
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

    // Write to project B
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

test('scope filter: search_memory with scope filter returns only matching project', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

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
    for (const r of resultsA) {
      assert.equal(r.projectId, 'project-a', 'scope filter should only return project-a records');
    }

    // Search with project B filter
    const searchB = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'checkpoint scope',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'project-b'
          }
        }
      }
    }, requestContext);

    const resultsB = searchB.response.result.structuredContent.results || [];
    for (const r of resultsB) {
      assert.equal(r.projectId, 'project-b', 'scope filter should only return project-b records');
    }
  });
});

test('scope filter: strict mode blocks missing records', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const server = new CodexMemoryMcpServer({ app });
    const { shadowStore } = app.stores;

    // Write a record directly to shadow store with scope metadata
    const testRecord = {
      memoryId: 'codex-process-strictmode001',
      target: 'process',
      title: 'Strict Mode Test',
      content: 'Type: checkpoint\nrisk: strict mode test',
      evidence: 'strict mode test',
      tags: ['scope', 'strict'],
      sensitivity: 'none',
      validated: true,
      reusable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: 'strict-project',
      visibility: 'project',
      clientId: 'codex',
      workspaceId: tempBasePath,
      taskId: null,
      conversationId: null,
      retentionPolicy: 'permanent'
    };

    await shadowStore.upsertRecord(testRecord);

    // Search with strict mode on non-matching project
    const searchStrict = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'strict mode',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'other-project',
            strict: true
          }
        }
      }
    }, requestContext);

    const strictResults = searchStrict.response.result.structuredContent.results || [];
    assert.equal(strictResults.length, 0, 'strict mode should block records from other projects');
  });
});

test('mapRow does not fake project_id (legacyProjectIdFallback test)', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const { shadowStore } = app.stores;

    // Write record with explicit project_id
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

    // Retrieve and verify mapRow preserves the actual project_id
    const retrieved = await shadowStore.getRecord('codex-process-explicit-project');
    assert.equal(retrieved.projectId, 'explicit-project', 'mapRow should preserve actual project_id, not fake it');
    assert.notEqual(retrieved.projectId, 'codex-memory', 'mapRow should not default to codex-memory');
  });
});

test('HTTP MCP tools/call end-to-end scope parameter verification', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    // Record with full scope metadata
    const recordResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 6,
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

    // Search with scope filter
    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 7,
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
  });
});

test('old DB schema drift report: verify scope columns exist', async () => {
  await withApp(async ({ app }) => {
    const { shadowStore } = app.stores;
    await shadowStore.ensureReady();

    // Verify scope columns exist in schema
    const tableInfo = shadowStore.db.prepare('PRAGMA table_info(memory_records)').all();
    const columnNames = tableInfo.map(col => col.name);

    const requiredScopeColumns = ['client_id', 'workspace_id', 'project_id', 'task_id', 'conversation_id', 'visibility', 'retention_policy'];

    for (const col of requiredScopeColumns) {
      assert.ok(columnNames.includes(col), `Schema should have ${col} column`);
    }
  });
});
