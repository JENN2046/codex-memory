const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const { createConfig } = require('../src/config/createConfig');
const { stripMemoryMarkers } = require('../src/storage/DiaryStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');

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

test('scope metadata stripper preserves ordinary content with marker-like labels', () => {
  assert.equal(
    stripMemoryMarkers('Visibility: this is user-authored content'),
    'Visibility: this is user-authored content'
  );

  const diaryText = [
    '[2026-05-12T00:00:00.000Z] - Codex',
    'Memory-ID: mem-test',
    'Record-Type: process',
    'Project-ID: internal-project',
    'Workspace-ID: internal-workspace',
    '',
    'Content:',
    'Visibility: this line belongs to the user content',
    '',
    'Evidence:',
    'unit test'
  ].join('\n');

  const stripped = stripMemoryMarkers(diaryText);
  assert.equal(stripped.includes('Project-ID'), false);
  assert.equal(stripped.includes('Workspace-ID'), false);
  assert.equal(stripped.includes('internal-workspace'), false);
  assert.equal(stripped.includes('Visibility: this line belongs to the user content'), true);
});

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

test('scope filter: strict false still applies supplied scope fields', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const inScope = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Soft Scope Included',
          content: 'Type: checkpoint\nrisk: soft scope filter included',
          evidence: 'soft-scope-filter',
          validated: true,
          reusable: false,
          tags: ['scope', 'soft'],
          sensitivity: 'none',
          project_id: 'soft-scope-project-a',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(inScope.response.result.structuredContent.decision, 'accepted');
    const inScopeMemoryId = inScope.response.result.structuredContent.memoryId;

    const outOfScope = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Soft Scope Excluded',
          content: 'Type: checkpoint\nrisk: soft scope filter excluded',
          evidence: 'soft-scope-filter',
          validated: true,
          reusable: false,
          tags: ['scope', 'soft'],
          sensitivity: 'none',
          project_id: 'soft-scope-project-b',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(outOfScope.response.result.structuredContent.decision, 'accepted');
    const outOfScopeMemoryId = outOfScope.response.result.structuredContent.memoryId;

    const search = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'soft scope filter',
          target: 'process',
          limit: 10,
          include_content: true,
          scope: {
            project_id: 'soft-scope-project-a',
            strict: false
          }
        }
      }
    }, requestContext);

    const results = search.response.result.structuredContent.results || [];
    const memoryIds = results.map(result => result.memoryId);
    assert.ok(memoryIds.includes(inScopeMemoryId), 'strict=false scope must include matching project records');
    assert.equal(memoryIds.includes(outOfScopeMemoryId), false, 'strict=false scope must still filter non-matching project records');

    const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    const latest = entries.at(-1);
    assert.equal(latest.scopeApplied, true);
    assert.equal(latest.scopeStrict, false);
    assert.deepEqual(latest.scopeDimensions, ['project_id']);
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

test('legacy NOT NULL scope columns use compatible defaults on omitted scope writes', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-legacy-scope-db-'));
  const config = createConfig({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await fs.mkdir(path.dirname(config.dbPath), { recursive: true });
  const legacyDb = new DatabaseSync(config.dbPath);
  legacyDb.exec(`
    CREATE TABLE memory_records (
      memory_id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      evidence TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      validated INTEGER NOT NULL,
      reusable INTEGER NOT NULL,
      sensitivity TEXT NOT NULL,
      file_path TEXT,
      relative_path TEXT,
      raw_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      client_id TEXT NOT NULL DEFAULT 'codex',
      workspace_id TEXT NOT NULL DEFAULT '',
      project_id TEXT NOT NULL DEFAULT 'codex-memory',
      task_id TEXT,
      conversation_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'project',
      retention_policy TEXT NOT NULL DEFAULT 'permanent'
    );
  `);
  legacyDb.close();

  const shadowStore = new SqliteShadowStore(config);
  try {
    await shadowStore.upsertRecord({
      memoryId: 'codex-process-legacy-default-scope',
      target: 'process',
      title: 'Legacy Default Scope',
      content: 'Type: checkpoint',
      evidence: 'legacy default scope test',
      tags: ['scope'],
      sensitivity: 'none',
      validated: true,
      reusable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const row = shadowStore.db.prepare(`
      SELECT client_id, workspace_id, project_id, visibility, retention_policy
      FROM memory_records
      WHERE memory_id = ?
    `).get('codex-process-legacy-default-scope');
    assert.equal(row.client_id, 'codex');
    assert.equal(row.workspace_id, '');
    assert.equal(row.project_id, 'codex-memory');
    assert.equal(row.visibility, 'project');
    assert.equal(row.retention_policy, 'permanent');
  } finally {
    await shadowStore.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
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

test('scope filter: SQL candidate pushdown preserves scoped result when higher-scoring off-scope records exceed pool', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    for (let index = 0; index < 6; index += 1) {
      const wrongScopeResult = await server.handleJsonRpc({
        jsonrpc: '2.0',
        id: index + 1,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: `Overflow Wrong ${index}`,
            content: 'Type: checkpoint\noverflow signal checkpoint',
            evidence: 'overflow-wrong-scope',
            validated: true,
            reusable: false,
            tags: ['overflow', 'checkpoint', `wrong-${index}`],
            sensitivity: 'none',
            project_id: 'overflow-wrong-project',
            visibility: 'project'
          }
        }
      }, requestContext);
      assert.equal(wrongScopeResult.response.result.structuredContent.decision, 'accepted');
    }

    const correctScopeResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 100,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Scoped Fallback Survivor',
          content: 'Type: checkpoint\ncheckpoint only',
          evidence: 'overflow-correct-scope',
          validated: true,
          reusable: false,
          tags: ['checkpoint'],
          sensitivity: 'none',
          project_id: 'overflow-right-project',
          visibility: 'project'
        }
      }
    }, requestContext);
    assert.equal(correctScopeResult.response.result.structuredContent.decision, 'accepted');
    const correctScopeId = correctScopeResult.response.result.structuredContent.memoryId;

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 200,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'overflow checkpoint',
          target: 'process',
          limit: 1,
          include_content: true,
          scope: {
            project_id: 'overflow-right-project',
            visibility: 'project',
            strict: true
          }
        }
      }
    }, requestContext);

    const results = searchResult.response.result.structuredContent.results || [];
    assert.equal(results.length, 1, 'scope pushdown should still return the matching scoped result at limit=1');
    assert.equal(results[0].memoryId, correctScopeId, 'scope pushdown must preserve the in-scope record');
  });
});

test('scope filter: recall audit annotates scoped searches without raw workspace_id', async () => {
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
          title: 'Scope Audit Annotation',
          content: 'Type: checkpoint\nrisk: scope audit annotation',
          evidence: 'scope-audit-annotation',
          validated: true,
          reusable: false,
          tags: ['scope', 'audit'],
          sensitivity: 'none',
          project_id: 'scope-audit-project',
          workspace_id: '/workspace/private-path',
          client_id: 'codex',
          visibility: 'shared'
        }
      }
    }, requestContext);
    assert.equal(recordResult.response.result.structuredContent.decision, 'accepted');

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'scope audit annotation',
          target: 'process',
          limit: 5,
          include_content: true,
          scope: {
            project_id: 'scope-audit-project',
            workspace_id: '/workspace/private-path',
            client_id: 'codex',
            visibility: 'shared',
            strict: true
          }
        }
      }
    }, requestContext);

    const results = searchResult.response.result.structuredContent.results || [];
    assert.ok(results.length >= 1, 'scoped search should return at least one result');

    const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
    const latest = entries.at(-1);
    assert.equal(latest.scopeApplied, true);
    assert.equal(latest.scopeMode, 'sql-candidate+post-filter');
    assert.deepEqual(latest.scopeDimensions, ['project_id', 'workspace_id', 'client_id', 'visibility']);
    assert.equal(latest.scopeStrict, true);
    assert.equal(latest.scopeProjectId, 'scope-audit-project');
    assert.equal(latest.scopeClientId, 'codex');
    assert.deepEqual(latest.scopeVisibility, ['shared']);
    assert.equal(latest.scopeWorkspacePresent, true);
    assert.equal('scopeWorkspaceId' in latest, false, 'raw workspace_id must not be written to recall audit');
    assert.equal('workspaceId' in latest, false, 'workspaceId must not appear in recall audit');
    assert.equal(JSON.stringify(latest).includes('/workspace/private-path'), false, 'raw workspace path must not be serialized');
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
  const visibilitySchema = searchSchema.inputSchema.properties.scope.properties.visibility;
  assert.ok(Array.isArray(visibilitySchema.oneOf), 'search_memory scope visibility must support string or array');
  assert.deepEqual(visibilitySchema.oneOf.map(option => option.type), ['string', 'array']);
  assert.equal(visibilitySchema.oneOf[1].items.type, 'string');
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

test('scope durability: diary rebuild preserves scope metadata into fresh shadow store', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-scope-durability-'));
  const appOptions = {
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  };
  const app = createCodexMemoryApplication(appOptions);
  await app.initialize();

  let memoryId;
  try {
    const record = await app.callTool('record_memory', {
      target: 'process',
      title: 'Durable Scope Metadata',
      content: 'Type: checkpoint\nrisk: durable scope metadata survives diary rebuild',
      evidence: 'scope durability test',
      validated: true,
      reusable: false,
      tags: ['scope', 'durability'],
      sensitivity: 'none',
      project_id: 'durable-project',
      workspace_id: 'durable-workspace',
      client_id: 'codex',
      task_id: 'task-123',
      conversation_id: 'conversation-456',
      visibility: 'shared',
      retention_policy: 'keep'
    }, requestContext);
    assert.equal(record.decision, 'accepted');
    memoryId = record.memoryId;

    const diaryText = await fs.readFile(record.filePath, 'utf8');
    assert.match(diaryText, /^Project-ID:\s*durable-project$/m);
    assert.match(diaryText, /^Workspace-ID:\s*durable-workspace$/m);
    assert.match(diaryText, /^Client-ID:\s*codex$/m);
    assert.match(diaryText, /^Task-ID:\s*task-123$/m);
    assert.match(diaryText, /^Conversation-ID:\s*conversation-456$/m);
    assert.match(diaryText, /^Visibility:\s*shared$/m);
    assert.match(diaryText, /^Retention-Policy:\s*keep$/m);
  } finally {
    await app.close();
  }

  await fs.rm(path.join(tempBasePath, 'data'), { recursive: true, force: true });

  const rebuiltApp = createCodexMemoryApplication(appOptions);
  await rebuiltApp.initialize();
  try {
    await rebuiltApp.rebuildShadowFromDiary({ target: 'process' });

    const restored = await rebuiltApp.stores.shadowStore.getRecord(memoryId);
    assert.equal(restored.projectId, 'durable-project');
    assert.equal(restored.workspaceId, 'durable-workspace');
    assert.equal(restored.clientId, 'codex');
    assert.equal(restored.taskId, 'task-123');
    assert.equal(restored.conversationId, 'conversation-456');
    assert.equal(restored.visibility, 'shared');
    assert.equal(restored.retentionPolicy, 'keep');

    const search = await rebuiltApp.callTool('search_memory', {
      query: 'durable scope metadata',
      target: 'process',
      limit: 10,
      include_content: true,
      scope: {
        project_id: 'durable-project',
        workspace_id: 'durable-workspace',
        client_id: 'codex',
        visibility: 'shared'
      }
    }, requestContext);
    assert.ok(search.results.some(result => result.memoryId === memoryId), 'rebuilt scoped search must find restored record');
    const matched = search.results.find(result => result.memoryId === memoryId);
    const returnedText = JSON.stringify({
      snippet: matched.snippet,
      content: matched.content,
      text: matched.text
    });
    assert.equal(returnedText.includes('Workspace-ID'), false, 'scope header label must not appear in recall output');
    assert.equal(returnedText.includes('durable-workspace'), false, 'raw workspace_id must not appear in recall output');
    assert.equal(returnedText.includes('Task-ID'), false, 'task header label must not appear in recall output');
    assert.equal(returnedText.includes('Conversation-ID'), false, 'conversation header label must not appear in recall output');
  } finally {
    await rebuiltApp.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
