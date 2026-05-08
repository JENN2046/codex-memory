const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { DatabaseSync } = require('node:sqlite');

const REQUIRED_COLUMNS = [
  'status', 'scope', 'confidence', 'provenance',
  'superseded_by', 'supersedes', 'tombstone_reason',
  'client_id', 'workspace_id', 'project_id',
  'task_id', 'conversation_id', 'visibility', 'retention_policy'
];

test('governance schema — fresh database has all governance/scope columns', async () => {
  const tempDir = path.join(os.tmpdir(), 'codex-memory-governance-schema-' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });
  try {
    const app = createCodexMemoryApplication({
      projectBasePath: tempDir,
      dailyNoteRootPath: path.join(tempDir, 'dailynote'),
      logsDir: path.join(tempDir, 'logs'),
      dataDir: path.join(tempDir, 'data')
    });
    await app.initialize();
    await app.close();

    // Verify columns exist in SQLite
    const dbPath = path.join(tempDir, 'data', 'codex-memory.sqlite');
    assert.ok((await fs.stat(dbPath)), 'db should exist');
    const db = new DatabaseSync(dbPath);
    const columns = db.prepare('PRAGMA table_info(memory_records)').all();
    db.close();

    const columnNames = columns.map(c => c.name);
    for (const col of REQUIRED_COLUMNS) {
      assert.ok(columnNames.includes(col), `column '${col}' should exist in fresh database`);
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('governance schema — governance-report shows allPresent on healthy DB', async () => {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, ['src/cli/governance-report.js', '--json'], {
    cwd: process.cwd(), env: process.env, encoding: 'utf8'
  });
  const data = JSON.parse(r.stdout);
  assert.ok(data.schemaStatus, 'should have schemaStatus');
  assert.equal(data.schemaStatus.allPresent, true, 'all columns should be present');
  assert.deepEqual(data.schemaStatus.missingColumns, []);
  assert.ok(data.totalRecords > 0, 'should have records');
});

test('governance schema — upsertRecord writes governance/scope defaults', async () => {
  const tempDir = path.join(os.tmpdir(), 'codex-memory-upsert-' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });
  try {
    const app = createCodexMemoryApplication({
      projectBasePath: tempDir,
      dailyNoteRootPath: path.join(tempDir, 'dailynote'),
      logsDir: path.join(tempDir, 'logs'),
      dataDir: path.join(tempDir, 'data')
    });
    await app.initialize();

    // Test upsertRecord directly (bypass diary write)
    const store = app.stores.shadowStore;
    const memoryId = 'test-gov-' + Date.now();
    const now = new Date().toISOString();
    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'governance test',
      content: 'testing governance columns',
      evidence: 'test case',
      tags: [],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      createdAt: now,
      updatedAt: now
    });
    await app.close();

    const dbPath = path.join(tempDir, 'data', 'codex-memory.sqlite');
    const db = new DatabaseSync(dbPath);
    const row = db.prepare('SELECT * FROM memory_records WHERE memory_id = ?').get(memoryId);
    db.close();

    assert.ok(row, 'record should exist');
    assert.equal(row.status, 'active', 'default status');
    assert.equal(row.visibility, 'project', 'default visibility');
    assert.equal(row.confidence, 1.0, 'default confidence');
    assert.equal(row.retention_policy, 'permanent', 'default retention');
    assert.equal(row.client_id, null, 'client_id should be null (not fabricated)');
    assert.equal(row.project_id, null, 'project_id should be null (not fabricated)');
    assert.equal(row.workspace_id, null, 'workspace_id should be null');
  } finally {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore cleanup error */ }
  }
});

test('governance schema — upsertRecord conflict update preserves governance fields', async () => {
  const tempDir = path.join(os.tmpdir(), 'codex-memory-upsert2-' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });
  try {
    const app = createCodexMemoryApplication({
      projectBasePath: tempDir,
      dailyNoteRootPath: path.join(tempDir, 'dailynote'),
      logsDir: path.join(tempDir, 'logs'),
      dataDir: path.join(tempDir, 'data')
    });
    await app.initialize();

    const store = app.stores.shadowStore;
    const memoryId = 'test-gov-v2-' + Date.now();
    const now = new Date().toISOString();

    // First write
    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'update test',
      content: 'v1',
      evidence: 'test',
      tags: [],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      createdAt: now,
      updatedAt: now
    });

    // Second write — conflict update
    await store.upsertRecord({
      memoryId,
      target: 'knowledge',
      title: 'update test',
      content: 'v2 — updated',
      evidence: 'test update',
      tags: [],
      validated: true,
      reusable: true,
      sensitivity: 'internal',
      status: 'active',
      visibility: 'private',
      projectId: 'test-project',
      createdAt: now,
      updatedAt: new Date().toISOString()
    });

    await app.close();

    const dbPath = path.join(tempDir, 'data', 'codex-memory.sqlite');
    const db = new DatabaseSync(dbPath);
    const row = db.prepare('SELECT * FROM memory_records WHERE memory_id = ?').get(memoryId);
    db.close();

    assert.ok(row, 'record should exist');
    assert.ok(row.content.includes('v2'), 'content should be updated');
    assert.equal(row.visibility, 'private', 'visibility should be updated');
    assert.equal(row.project_id, 'test-project', 'project_id should be updated');
  } finally {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore cleanup error */ }
  }
});

test('MCP schema — search_memory has additionalProperties:false and scope declared', () => {
  const { TOOL_DEFINITIONS } = require('../src/core/constants');
  const searchTool = TOOL_DEFINITIONS.find(t => t.name === 'search_memory');
  assert.ok(searchTool, 'search_memory tool should exist');
  const schema = searchTool.inputSchema;
  assert.equal(schema.additionalProperties, false, 'top-level should be strict');
  assert.ok(schema.properties.scope, 'scope should be declared');
  assert.equal(schema.properties.scope.type, 'object');
  assert.ok(schema.properties.scope.properties.project_id, 'project_id in scope');
  assert.ok(schema.properties.scope.properties.visibility, 'visibility in scope');
  assert.ok(schema.properties.scope.properties.workspace_id, 'workspace_id in scope');
  assert.ok(schema.properties.scope.properties.client_id, 'client_id in scope');
});
