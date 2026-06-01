'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

const REQUIRED_SCOPE_COLUMNS = [
  'client_id',
  'workspace_id',
  'project_id',
  'task_id',
  'conversation_id',
  'visibility',
  'retention_policy'
];

async function createTempApp(prefix) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const app = createCodexMemoryApplication({
    projectBasePath: tempDir,
    dailyNoteRootPath: path.join(tempDir, 'dailynote'),
    logsDir: path.join(tempDir, 'logs'),
    dataDir: path.join(tempDir, 'data')
  });
  await app.initialize();
  return { app, tempDir, dbPath: path.join(tempDir, 'data', 'codex-memory.sqlite') };
}

async function closeAndRemove(ctx) {
  try {
    if (ctx?.app) await ctx.app.close();
  } finally {
    if (ctx?.tempDir) await fs.rm(ctx.tempDir, { recursive: true, force: true });
  }
}

test('governance schema: fresh database has current scope columns', async () => {
  const ctx = await createTempApp('codex-memory-governance-schema-');
  try {
    await ctx.app.close();
    const db = new DatabaseSync(ctx.dbPath);
    const columns = db.prepare('PRAGMA table_info(memory_records)').all();
    db.close();

    const columnNames = columns.map(column => column.name);
    for (const columnName of REQUIRED_SCOPE_COLUMNS) {
      assert.ok(columnNames.includes(columnName), `column ${columnName} should exist`);
    }
  } finally {
    await closeAndRemove(ctx);
  }
});

test('governance schema: upsertRecord keeps omitted scope fields nullable', async () => {
  const ctx = await createTempApp('codex-memory-governance-null-scope-');
  try {
    const store = ctx.app.stores.shadowStore;
    const memoryId = `scope-null-${Date.now()}`;
    const now = new Date().toISOString();

    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'governance scope default test',
      content: 'testing nullable scope columns',
      evidence: 'test case',
      tags: [],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      createdAt: now,
      updatedAt: now
    });

    await ctx.app.close();
    const db = new DatabaseSync(ctx.dbPath);
    const row = db.prepare('SELECT * FROM memory_records WHERE memory_id = ?').get(memoryId);
    db.close();

    assert.ok(row, 'record should exist');
    assert.equal(row.client_id, null);
    assert.equal(row.workspace_id, null);
    assert.equal(row.project_id, null);
    assert.equal(row.task_id, null);
    assert.equal(row.conversation_id, null);
    assert.equal(row.visibility, null);
    assert.equal(row.retention_policy, null);
  } finally {
    await closeAndRemove(ctx);
  }
});

test('governance schema: upsertRecord writes and updates explicit scope fields', async () => {
  const ctx = await createTempApp('codex-memory-governance-explicit-scope-');
  try {
    const store = ctx.app.stores.shadowStore;
    const memoryId = `scope-explicit-${Date.now()}`;
    const now = new Date().toISOString();

    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'explicit scope test',
      content: 'v1',
      evidence: 'test',
      tags: [],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      projectId: 'project-a',
      workspaceId: 'workspace-a',
      clientId: 'codex',
      visibility: 'project',
      retentionPolicy: 'permanent',
      createdAt: now,
      updatedAt: now
    });

    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'explicit scope test',
      content: 'v2 updated',
      evidence: 'test update',
      tags: [],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      projectId: 'project-b',
      workspaceId: 'workspace-b',
      clientId: 'claude',
      visibility: 'shared',
      retentionPolicy: 'session',
      createdAt: now,
      updatedAt: new Date().toISOString()
    });

    await ctx.app.close();
    const db = new DatabaseSync(ctx.dbPath);
    const row = db.prepare('SELECT * FROM memory_records WHERE memory_id = ?').get(memoryId);
    db.close();

    assert.ok(row.content.includes('v2'));
    assert.equal(row.project_id, 'project-b');
    assert.equal(row.workspace_id, 'workspace-b');
    assert.equal(row.client_id, 'claude');
    assert.equal(row.visibility, 'shared');
    assert.equal(row.retention_policy, 'session');
  } finally {
    await closeAndRemove(ctx);
  }
});

test('governance schema: lookup maps normalize memory id input lists', async () => {
  const ctx = await createTempApp('codex-memory-governance-id-list-');
  try {
    const store = ctx.app.stores.shadowStore;
    const memoryId = `scope-lookup-${Date.now()}`;
    const now = new Date().toISOString();

    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'lookup normalization test',
      content: 'testing memory id list normalization',
      evidence: 'test case',
      tags: ['feature'],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      projectId: 'project-a',
      workspaceId: 'workspace-a',
      clientId: 'codex',
      taskId: 'task-a',
      conversationId: 'conversation-a',
      visibility: 'project',
      retentionPolicy: 'permanent',
      createdAt: now,
      updatedAt: now
    });

    const noisyIds = [` ${memoryId} `, '', null, memoryId, '   '];
    const records = await store.getRecordsByIds(noisyIds);
    const scopeMap = await store.getRecordsScopeMap(noisyIds);
    const policyMap = await store.getRecordsPolicyMap(noisyIds);
    const isolationMap = await store.getRecordsIsolationMap(noisyIds);
    const lifecycleStatusMap = await store.getRecordsLifecycleStatusMap(noisyIds);
    const lifecycleScopeMap = await store.getRecordsLifecycleScopeGovernanceMap(noisyIds);

    assert.equal(records.length, 1);
    assert.equal(records[0].memoryId, memoryId);
    assert.equal(scopeMap.get(memoryId).projectId, 'project-a');
    assert.equal(policyMap.get(memoryId).clientId, 'codex');
    assert.equal(isolationMap.get(memoryId).visibility, 'project');
    assert.equal(lifecycleStatusMap.lifecycleColumnAvailable, false);
    assert.equal(lifecycleScopeMap.records.get(memoryId).scope.taskId, 'task-a');
  } finally {
    await closeAndRemove(ctx);
  }
});

test('governance schema: MCP schemas declare strict scope surfaces', () => {
  const recordTool = TOOL_DEFINITIONS.find(tool => tool.name === 'record_memory');
  const searchTool = TOOL_DEFINITIONS.find(tool => tool.name === 'search_memory');
  assert.ok(recordTool, 'record_memory tool should exist');
  assert.ok(searchTool, 'search_memory tool should exist');

  assert.equal(recordTool.inputSchema.additionalProperties, false);
  for (const field of ['project_id', 'workspace_id', 'client_id', 'visibility', 'task_id', 'conversation_id', 'retention_policy']) {
    assert.ok(recordTool.inputSchema.properties[field], `record_memory should declare ${field}`);
  }

  const scopeSchema = searchTool.inputSchema.properties.scope;
  assert.equal(searchTool.inputSchema.additionalProperties, false);
  assert.ok(scopeSchema, 'search_memory scope should exist');
  assert.equal(scopeSchema.additionalProperties, false);
  for (const field of ['project_id', 'workspace_id', 'client_id', 'visibility', 'strict']) {
    assert.ok(scopeSchema.properties[field], `search_memory scope should declare ${field}`);
  }
});

test('governance schema: governance-report tolerates current fresh scope schema', async () => {
  const ctx = await createTempApp('codex-memory-governance-report-schema-');
  try {
    await ctx.app.close();
    const result = spawnSync(process.execPath, ['src/cli/governance-report.js', '--json'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CODEX_MEMORY_BASE_PATH: ctx.tempDir,
        CODEX_MEMORY_DATA_DIR: path.join(ctx.tempDir, 'data'),
        CODEX_MEMORY_DB_PATH: ctx.dbPath
      },
      encoding: 'utf8',
      timeout: 30000
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'ok');
    assert.equal(payload.totalRecords, 0);
    assert.equal(payload.paths.dbPath, ctx.dbPath);
  } finally {
    await closeAndRemove(ctx);
  }
});
