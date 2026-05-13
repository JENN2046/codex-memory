const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const cliPath = path.join('src', 'cli', 'lifecycle-sqlite-dry-run.js');
const lifecycleColumns = [
  'status',
  'status_reason',
  'supersedes_memory_id',
  'superseded_by_memory_id',
  'tombstone_reason',
  'lifecycle_updated_at',
  'lifecycle_actor_client_id'
];

function runCli(args = [], env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, ...env }
  });
}

function createLegacyDb(dbPath, rows = 1) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const insert = db.prepare(`
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json,
        validated, reusable, sensitivity, created_at, updated_at
      ) VALUES (?, 'process', ?, 'content', 'evidence', '[]', 1, 0, 'none', ?, ?)
    `);
    for (let index = 0; index < rows; index += 1) {
      insert.run(
        `legacy-${index}`,
        `Legacy ${index}`,
        '2026-05-13T00:00:00.000Z',
        '2026-05-13T00:00:00.000Z'
      );
    }
  } finally {
    db.close();
  }
}

function addLifecycleColumns(dbPath) {
  const db = new DatabaseSync(dbPath);
  try {
    for (const column of lifecycleColumns) {
      db.exec(`ALTER TABLE memory_records ADD COLUMN ${column} TEXT`);
    }
  } finally {
    db.close();
  }
}

function listColumns(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
  } finally {
    db.close();
  }
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('lifecycle sqlite dry-run reports missing lifecycle columns for legacy schema', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-dry-run-legacy-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  try {
    createLegacyDb(dbPath, 2);
    const beforeColumns = listColumns(dbPath);
    const result = runCli(['--json'], { CODEX_MEMORY_DB_PATH: dbPath });

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    const report = parseJsonResult(result);
    assert.equal(report.status, 'ok');
    assert.equal(report.mutated, false);
    assert.equal(report.dbPath, dbPath);
    assert.equal(report.totalRecords, 2);
    assert.deepEqual(report.existingLifecycleColumns, []);
    assert.deepEqual(report.missingLifecycleColumns, lifecycleColumns);
    assert.deepEqual(report.wouldAddColumns, lifecycleColumns);
    assert.equal(report.wouldBackfillStatus, 2);
    assert.equal(report.defaultStatus, 'active');
    assert.equal(report.mutationRequired, true);
    assert.equal(report.riskLevel, 'A2');
    assert.equal(report.rollbackRequirement, 'sqlite-backup-required');
    assert.equal(report.nextStep.includes('SQLite backup'), true);
    assert.deepEqual(listColumns(dbPath), beforeColumns);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite dry-run reports no missing columns for migrated schema', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-dry-run-migrated-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  try {
    createLegacyDb(dbPath, 1);
    addLifecycleColumns(dbPath);
    const beforeColumns = listColumns(dbPath);
    const result = runCli(['--json'], { CODEX_MEMORY_DB_PATH: dbPath });

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    const report = parseJsonResult(result);
    assert.equal(report.status, 'ok');
    assert.equal(report.mutated, false);
    assert.equal(report.totalRecords, 1);
    assert.deepEqual(report.existingLifecycleColumns, lifecycleColumns);
    assert.deepEqual(report.missingLifecycleColumns, []);
    assert.deepEqual(report.wouldAddColumns, []);
    assert.equal(report.wouldBackfillStatus, 0);
    assert.equal(report.mutationRequired, false);
    assert.equal(report.riskLevel, 'A1');
    assert.equal(report.rollbackRequirement, 'none');
    assert.deepEqual(listColumns(dbPath), beforeColumns);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite dry-run returns warn for missing database without creating it', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-dry-run-missing-'));
  const dbPath = path.join(tmpDir, 'missing', 'codex-memory.sqlite');
  try {
    const result = runCli(['--json'], { CODEX_MEMORY_DB_PATH: dbPath });

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    const report = parseJsonResult(result);
    assert.equal(report.status, 'warn');
    assert.equal(report.mutated, false);
    assert.equal(report.dbPath, dbPath);
    assert.equal(report.totalRecords, 0);
    assert.deepEqual(report.missingLifecycleColumns, lifecycleColumns);
    assert.match(report.message, /Database not found/);
    assert.equal(fs.existsSync(dbPath), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite dry-run rejects --confirm', () => {
  const result = runCli(['--json', '--confirm']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.status, 'error');
  assert.equal(report.mutated, false);
  assert.equal(report.mutationRequired, false);
  assert.match(report.error, /--confirm is not supported/);
});

test('lifecycle sqlite dry-run rejects --apply', () => {
  const result = runCli(['--json', '--apply']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.status, 'error');
  assert.equal(report.mutated, false);
  assert.equal(report.mutationRequired, false);
  assert.match(report.error, /--apply is not supported/);
});
