const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const {
  CURRENT_SQLITE_SHADOW_SCHEMA_VERSION,
  SqliteShadowStore
} = require('../src/storage/SqliteShadowStore');

async function withTempDb(fn) {
  const root = await fs.mkdtemp(path.join(process.cwd(), '.tmp-sqlite-schema-gate-'));
  try {
    await fn(path.join(root, 'shadow.db'));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function seedSchemaVersion(dbPath, value) {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS codex_memory_schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.prepare(`
      INSERT INTO codex_memory_schema_meta (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run('sqlite_schema_version', String(value), '2026-06-01T00:00:00.000Z');
  } finally {
    db.close();
  }
}

function tableExists(dbPath, tableName) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `).get(tableName);
    return Boolean(row);
  } finally {
    db.close();
  }
}

test('SqliteShadowStore startup initializes and reports current schema version gate', async () => {
  await withTempDb(async dbPath => {
    const store = new SqliteShadowStore({
      dbPath,
      embeddingFingerprint: 'test-fingerprint'
    });

    await store.ensureReady();
    const health = await store.getHealth();

    assert.equal(health.schemaStartupGate.blocked, false);
    assert.equal(
      health.schemaStartupGate.expectedVersion,
      CURRENT_SQLITE_SHADOW_SCHEMA_VERSION
    );
    assert.equal(
      health.schemaStartupGate.observedVersion,
      CURRENT_SQLITE_SHADOW_SCHEMA_VERSION
    );
    assert.equal(
      health.schemaStartupGate.status,
      'initialized_current_schema_version'
    );
    assert.equal(tableExists(dbPath, 'memory_records'), true);

    await store.close();
  });
});

test('SqliteShadowStore startup blocks unknown future schema before ordinary runtime tables', async () => {
  await withTempDb(async dbPath => {
    const futureVersion = CURRENT_SQLITE_SHADOW_SCHEMA_VERSION + 1;
    seedSchemaVersion(dbPath, futureVersion);
    const store = new SqliteShadowStore({
      dbPath,
      embeddingFingerprint: 'test-fingerprint'
    });

    await assert.rejects(
      () => store.ensureReady(),
      error => {
        assert.equal(error.code, 'SQLITE_SCHEMA_STARTUP_GATE_BLOCKED');
        assert.equal(error.schemaStartupGate.blocked, true);
        assert.equal(error.schemaStartupGate.observedVersion, futureVersion);
        assert.equal(error.schemaStartupGate.reason, 'future_schema_version_detected');
        return true;
      }
    );

    assert.equal(store.db, null);
    assert.equal(tableExists(dbPath, 'codex_memory_schema_meta'), true);
    assert.equal(tableExists(dbPath, 'memory_records'), false);
  });
});

test('SqliteShadowStore startup blocks invalid schema metadata fail-closed', async () => {
  await withTempDb(async dbPath => {
    seedSchemaVersion(dbPath, 'not-a-version');
    const store = new SqliteShadowStore({
      dbPath,
      embeddingFingerprint: 'test-fingerprint'
    });

    await assert.rejects(
      () => store.ensureReady(),
      error => {
        assert.equal(error.code, 'SQLITE_SCHEMA_STARTUP_GATE_BLOCKED');
        assert.equal(error.schemaStartupGate.blocked, true);
        assert.equal(error.schemaStartupGate.observedVersion, 'not-a-version');
        assert.equal(error.schemaStartupGate.reason, 'invalid_schema_version_metadata');
        return true;
      }
    );

    assert.equal(store.db, null);
    assert.equal(tableExists(dbPath, 'memory_records'), false);
  });
});
