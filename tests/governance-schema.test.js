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
