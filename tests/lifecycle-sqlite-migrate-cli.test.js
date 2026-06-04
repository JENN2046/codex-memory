const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const cliPath = path.join('src', 'cli', 'lifecycle-sqlite-migrate.js');
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

function listColumns(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
  } finally {
    db.close();
  }
}

function listStatuses(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare('SELECT status FROM memory_records ORDER BY memory_id').all().map(row => row.status);
  } finally {
    db.close();
  }
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('lifecycle sqlite migrate defaults to dry-run without mutating legacy schema', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-migrate-dry-run-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  try {
    createLegacyDb(dbPath, 2);
    const beforeColumns = listColumns(dbPath);
    const result = runCli(['--json', '--db', dbPath]);

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    const report = parseJsonResult(result);
    assert.equal(report.status, 'ok');
    assert.equal(report.mutated, false);
    assert.equal(report.migrationRequired, true);
    assert.deepEqual(report.wouldAddColumns, lifecycleColumns);
    assert.equal(report.wouldBackfillStatus, 2);
    assert.equal(report.backupCreated, false);
    assert.equal(report.readinessClaimed, false);
    assert.equal(report.rcReadyClaimed, false);
    assert.deepEqual(listColumns(dbPath), beforeColumns);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite migrate requires backup path for confirmed apply', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-migrate-no-backup-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  try {
    createLegacyDb(dbPath, 1);
    const result = runCli(['--json', '--db', dbPath, '--confirm']);

    assert.equal(result.status, 1);
    const report = parseJsonResult(result);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.match(report.error, /--confirm requires --backup/);
    assert.deepEqual(listColumns(dbPath).filter(column => lifecycleColumns.includes(column)), []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite migrate applies lifecycle columns and status backfill with backup', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-migrate-apply-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  const backupPath = path.join(tmpDir, 'backup', 'codex-memory.sqlite.bak');
  try {
    createLegacyDb(dbPath, 3);
    const result = runCli(['--json', '--db', dbPath, '--confirm', '--backup', backupPath]);

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    const report = parseJsonResult(result);
    assert.equal(report.status, 'ok');
    assert.equal(report.mutated, true);
    assert.equal(report.backupPath, backupPath);
    assert.equal(report.backupCreated, true);
    assert.deepEqual(report.addedColumns, lifecycleColumns);
    assert.equal(report.backfilledStatus, 3);
    assert.deepEqual(report.missingLifecycleColumns, []);
    assert.equal(report.migrationRequired, false);
    assert.equal(report.rollbackAvailable, true);
    assert.equal(fs.existsSync(backupPath), true);
    assert.deepEqual(lifecycleColumns.every(column => listColumns(dbPath).includes(column)), true);
    assert.deepEqual(listStatuses(dbPath), ['active', 'active', 'active']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite migrate is idempotent after migration', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-migrate-idempotent-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  const firstBackupPath = path.join(tmpDir, 'backup', 'first.sqlite.bak');
  const secondBackupPath = path.join(tmpDir, 'backup', 'second.sqlite.bak');
  try {
    createLegacyDb(dbPath, 1);
    assert.equal(runCli(['--json', '--db', dbPath, '--confirm', '--backup', firstBackupPath]).status, 0);
    const second = runCli(['--json', '--db', dbPath, '--confirm', '--backup', secondBackupPath]);

    assert.equal(second.status, 0, second.stderr || 'non-zero exit');
    const report = parseJsonResult(second);
    assert.equal(report.status, 'ok');
    assert.equal(report.mutated, false);
    assert.equal(report.backupCreated, false);
    assert.deepEqual(report.missingLifecycleColumns, []);
    assert.equal(report.migrationRequired, false);
    assert.equal(fs.existsSync(secondBackupPath), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('lifecycle sqlite migrate rejects --apply alias and existing backup paths', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-migrate-reject-'));
  const dbPath = path.join(tmpDir, 'codex-memory.sqlite');
  const backupPath = path.join(tmpDir, 'backup.sqlite.bak');
  try {
    createLegacyDb(dbPath, 1);
    fs.writeFileSync(backupPath, 'existing');

    const applyResult = runCli(['--json', '--db', dbPath, '--apply']);
    assert.equal(applyResult.status, 1);
    assert.match(parseJsonResult(applyResult).error, /--apply is intentionally unsupported/);

    const backupResult = runCli(['--json', '--db', dbPath, '--confirm', '--backup', backupPath]);
    assert.equal(backupResult.status, 1);
    assert.match(parseJsonResult(backupResult).error, /Backup path already exists/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
