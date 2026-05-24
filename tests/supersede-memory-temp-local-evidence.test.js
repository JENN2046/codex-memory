const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createConfig } = require('../src/config/createConfig');
const { SupersedeMemoryService } = require('../src/core/SupersedeMemoryService');
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
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-supersede-temp-local-'));
  const config = createConfig({
    projectBasePath: rootPath,
    dataDir: path.join(rootPath, 'data'),
    logsDir: path.join(rootPath, 'logs'),
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    defaultRequestSource: 'temp-local-supersede-evidence',
    embeddingFingerprint: 'temp-local-supersede-evidence-v1'
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
  const service = new SupersedeMemoryService({
    config,
    shadowStore,
    auditLogStore: auditLogWrapper
  });

  async function seedRecord({
    memoryId,
    status,
    clientId = 'codex',
    visibility = 'project',
    title,
    projectId = 'codex-memory',
    workspaceId = 'temp-local-supersede-workspace',
    taskId = 'CM-0885',
    conversationId = 'synthetic-temp-local-supersede',
    retentionPolicy = 'keep'
  }) {
    const createdAt = '2026-05-24T00:00:00.000Z';
    await shadowStore.upsertRecord({
      memoryId,
      target: 'process',
      title,
      content: [
        'Type: temp-local-supersede-evidence',
        'Checkpoint: synthetic isolated supersede candidate.',
        'Boundary: local temp stores only, no public MCP, no live governance proof.'
      ].join('\n'),
      evidence: 'cm0885 synthetic temp-local supersede evidence',
      tags: ['codex-memory', 'cm0885', 'temp-local-supersede'],
      validated: true,
      reusable: false,
      sensitivity: 'none',
      createdAt,
      updatedAt: createdAt,
      projectId,
      workspaceId,
      clientId,
      taskId,
      conversationId,
      visibility,
      retentionPolicy
    });

    shadowStore.db.prepare(`
      UPDATE memory_records
      SET status = ?, status_reason = NULL, supersedes_memory_id = NULL, superseded_by_memory_id = NULL,
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

function supersedePayload(overrides = {}) {
  return {
    old_memory_id: 'mem-old',
    new_memory_id: 'mem-new',
    reason: 'replacement memory approved after governance review',
    evidence: 'cm0885 synthetic supersede temp-local evidence',
    supersedes_link: 'mem-old',
    superseded_by_link: 'mem-new',
    actor_client_id: 'codex',
    request_source: 'temp-local-supersede-evidence-test',
    dry_run: false,
    confirm: true,
    ...overrides
  };
}

test('CM-0885 temp-local supersede evidence mutates isolated local stores and cleans up', async () => {
  const harness = await createTempLocalHarness();

  try {
    await harness.seedRecord({
      memoryId: 'mem-old',
      status: 'active',
      title: 'Synthetic superseded record'
    });
    await harness.seedRecord({
      memoryId: 'mem-new',
      status: 'proposal',
      title: 'Synthetic replacement record'
    });

    const result = await harness.service.supersede(supersedePayload());
    const oldRow = getRecordRow(harness.config.dbPath, 'mem-old');
    const newRow = getRecordRow(harness.config.dbPath, 'mem-new');
    const auditEntries = await harness.auditLogStore.readRecentWriteAudit();
    const shadowHealth = await harness.shadowStore.getHealth();

    assert.equal(result.decision, 'superseded');
    assert.equal(result.mutated, true);
    assert.equal(result.oldFromStatus, 'active');
    assert.equal(result.oldToStatus, 'superseded');
    assert.equal(result.newFromStatus, 'proposal');
    assert.equal(result.newToStatus, 'active');
    assert.equal(oldRow.status, 'superseded');
    assert.equal(oldRow.status_reason, 'replacement memory approved after governance review');
    assert.equal(oldRow.superseded_by_memory_id, 'mem-new');
    assert.equal(oldRow.lifecycle_actor_client_id, 'codex');
    assert.equal(newRow.status, 'active');
    assert.equal(newRow.status_reason, 'replacement memory approved after governance review');
    assert.equal(newRow.supersedes_memory_id, 'mem-old');
    assert.equal(newRow.lifecycle_actor_client_id, 'codex');
    assert.equal(shadowHealth.recordCount, 2);
    assert.equal(auditEntries.length, 2);
    assert.deepEqual(auditEntries.map(entry => entry.decision), ['pending', 'superseded']);
    assert.equal(await pathExists(harness.config.auditLogPath), true);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('CM-0885 temp-local supersede evidence rejects private cross-client mutation before audit and cleans up', async () => {
  const harness = await createTempLocalHarness();

  try {
    await harness.seedRecord({
      memoryId: 'mem-old',
      status: 'active',
      clientId: 'claude',
      visibility: 'private',
      title: 'Synthetic private superseded record'
    });
    await harness.seedRecord({
      memoryId: 'mem-new',
      status: 'proposal',
      clientId: 'claude',
      visibility: 'private',
      title: 'Synthetic private replacement record'
    });

    const result = await harness.service.supersede(supersedePayload({ actor_client_id: 'codex' }));
    const oldRow = getRecordRow(harness.config.dbPath, 'mem-old');
    const newRow = getRecordRow(harness.config.dbPath, 'mem-new');
    const auditEntries = await harness.auditLogStore.readRecentWriteAudit();
    const shadowHealth = await harness.shadowStore.getHealth();

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.match(result.reason, /cross-client private/);
    assert.equal(oldRow.status, 'active');
    assert.equal(oldRow.superseded_by_memory_id, null);
    assert.equal(newRow.status, 'proposal');
    assert.equal(newRow.supersedes_memory_id, null);
    assert.equal(shadowHealth.recordCount, 2);
    assert.deepEqual(auditEntries, []);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});
