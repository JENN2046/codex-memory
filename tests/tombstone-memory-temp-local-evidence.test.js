const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createConfig } = require('../src/config/createConfig');
const { TombstoneMemoryService } = require('../src/core/TombstoneMemoryService');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { AuditLogStore } = require('../src/storage/AuditLogStore');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getRecordRow(dbPath, memoryId) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare('SELECT * FROM memory_records WHERE memory_id = ?').get(memoryId);
  } finally {
    db.close();
  }
}

async function enableLifecycleColumns(shadowStore) {
  await shadowStore.ensureReady();
  shadowStore.ensureColumn('memory_records', 'status', "TEXT NOT NULL DEFAULT 'active'");
  shadowStore.ensureColumn('memory_records', 'status_reason', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'supersedes_memory_id', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'superseded_by_memory_id', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'tombstone_reason', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'lifecycle_updated_at', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'lifecycle_actor_client_id', 'TEXT');
  shadowStore.refreshMemoryRecordColumnInfo();
}

async function createTempLocalHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-tombstone-temp-local-'));
  const config = createConfig({
    projectBasePath: rootPath,
    dataDir: path.join(rootPath, 'data'),
    logsDir: path.join(rootPath, 'logs'),
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    defaultRequestSource: 'temp-local-tombstone-evidence',
    embeddingFingerprint: 'temp-local-tombstone-evidence-v1'
  });
  const shadowStore = new SqliteShadowStore(config);
  await enableLifecycleColumns(shadowStore);

  const auditEvents = [];
  const auditLogStore = new AuditLogStore(config);
  const auditLogWrapper = {
    async appendWriteAudit(entry) {
      auditEvents.push(entry);
      await auditLogStore.appendWriteAudit(entry);
    },
    async readRecentWriteAudit(maxLines, maxBytes) {
      return auditLogStore.readRecentWriteAudit(maxLines, maxBytes);
    }
  };
  const service = new TombstoneMemoryService({
    config,
    shadowStore,
    auditLogStore: auditLogWrapper
  });

  async function seedRecord({
    memoryId = 'mem-1',
    status = 'active',
    clientId = 'codex',
    visibility = 'project',
    title = 'Synthetic tombstone candidate'
  } = {}) {
    const createdAt = '2026-05-23T00:00:00.000Z';
    await shadowStore.upsertRecord({
      memoryId,
      target: 'process',
      title,
      content: [
        'Type: temp-local-tombstone-evidence',
        'Checkpoint: synthetic isolated tombstone candidate.',
        'Boundary: local temp stores only, no public MCP, no live governance proof.'
      ].join('\n'),
      evidence: 'cm0869 synthetic temp-local tombstone evidence',
      tags: ['codex-memory', 'cm0869', 'temp-local-tombstone'],
      validated: true,
      reusable: false,
      sensitivity: 'none',
      createdAt,
      updatedAt: createdAt,
      projectId: 'codex-memory',
      workspaceId: 'temp-local-tombstone-workspace',
      clientId,
      taskId: 'CM-0869',
      conversationId: 'synthetic-temp-local-tombstone',
      visibility,
      retentionPolicy: 'keep'
    });

    shadowStore.db.prepare(`
      UPDATE memory_records
      SET status = ?, status_reason = NULL, tombstone_reason = NULL,
          lifecycle_updated_at = ?, lifecycle_actor_client_id = ?
      WHERE memory_id = ?
    `).run(status, createdAt, clientId, memoryId);
  }

  async function cleanup() {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  return {
    auditEvents,
    auditLogStore: auditLogWrapper,
    cleanup,
    config,
    rootPath,
    seedRecord,
    service,
    shadowStore
  };
}

function tombstonePayload(overrides = {}) {
  return {
    memory_id: 'mem-1',
    reason: 'memory retired after governance review',
    evidence: 'cm0869 synthetic tombstone temp-local evidence',
    tombstone_reason: 'retention-expired',
    actor_client_id: 'codex',
    request_source: 'temp-local-tombstone-evidence-test',
    dry_run: false,
    confirm: true,
    ...overrides
  };
}

test('CM-0869 temp-local tombstone evidence mutates isolated local stores and cleans up', async () => {
  const harness = await createTempLocalHarness();

  try {
    await harness.seedRecord({ memoryId: 'mem-1', status: 'active' });

    const result = await harness.service.tombstone(tombstonePayload());
    const row = getRecordRow(harness.config.dbPath, 'mem-1');
    const auditEntries = await harness.auditLogStore.readRecentWriteAudit();
    const shadowHealth = await harness.shadowStore.getHealth();

    assert.equal(result.decision, 'tombstoned');
    assert.equal(result.mutated, true);
    assert.equal(result.fromStatus, 'active');
    assert.equal(result.toStatus, 'tombstoned');
    assert.equal(row.status, 'tombstoned');
    assert.equal(row.status_reason, 'memory retired after governance review');
    assert.equal(row.tombstone_reason, 'retention-expired');
    assert.equal(row.lifecycle_actor_client_id, 'codex');
    assert.equal(shadowHealth.recordCount, 1);
    assert.equal(auditEntries.length, 2);
    assert.deepEqual(auditEntries.map(entry => entry.decision), ['pending', 'tombstoned']);
    assert.equal(await pathExists(harness.config.auditLogPath), true);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('CM-0869 temp-local tombstone evidence rejects private cross-client mutation before audit and cleans up', async () => {
  const harness = await createTempLocalHarness();

  try {
    await harness.seedRecord({
      memoryId: 'mem-1',
      status: 'active',
      clientId: 'claude',
      visibility: 'private'
    });

    const result = await harness.service.tombstone(tombstonePayload({ actor_client_id: 'codex' }));
    const row = getRecordRow(harness.config.dbPath, 'mem-1');
    const auditEntries = await harness.auditLogStore.readRecentWriteAudit();
    const shadowHealth = await harness.shadowStore.getHealth();

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.match(result.reason, /cross-client private/);
    assert.equal(row.status, 'active');
    assert.equal(row.tombstone_reason, null);
    assert.equal(shadowHealth.recordCount, 1);
    assert.deepEqual(auditEntries, []);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});
