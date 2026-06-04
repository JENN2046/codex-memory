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
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function createMemoryRecordsTable(dbPath, {
  withStatus = true,
  withTombstoneReason = true
} = {}) {
  const db = new DatabaseSync(dbPath);
  try {
    const lifecycleColumns = [];
    if (withStatus) {
      lifecycleColumns.push('status TEXT');
      lifecycleColumns.push('status_reason TEXT');
      lifecycleColumns.push('supersedes_memory_id TEXT');
      lifecycleColumns.push('superseded_by_memory_id TEXT');
      if (withTombstoneReason) {
        lifecycleColumns.push('tombstone_reason TEXT');
      }
      lifecycleColumns.push('lifecycle_updated_at TEXT');
      lifecycleColumns.push('lifecycle_actor_client_id TEXT');
    }
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
        file_path TEXT,
        relative_path TEXT,
        raw_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        project_id TEXT,
        workspace_id TEXT,
        client_id TEXT,
        task_id TEXT,
        conversation_id TEXT,
        visibility TEXT,
        retention_policy TEXT
        ${lifecycleColumns.length > 0 ? `,
        ${lifecycleColumns.join(',\n        ')}` : ''}
      );
    `);
  } finally {
    db.close();
  }
}

function insertRecord(dbPath, {
  memoryId,
  status = 'active',
  clientId = 'codex',
  visibility = 'project',
  title = 'Tombstone candidate'
} = {}) {
  const db = new DatabaseSync(dbPath);
  try {
    const columns = db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
    const hasStatus = columns.includes('status');
    const sql = `
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json,
        validated, reusable, sensitivity, file_path, relative_path, raw_text,
        created_at, updated_at, project_id, workspace_id, client_id, task_id,
        conversation_id, visibility, retention_policy${hasStatus ? ', status' : ''}
      ) VALUES (
        ?, 'process', ?, 'Type: checkpoint\\ninternal tombstone candidate', 'seed evidence', '[]',
        1, 0, 'none', NULL, NULL, NULL,
        '2026-05-14T00:00:00.000Z', '2026-05-14T00:00:00.000Z',
        'project-a', 'workspace-a', ?, NULL, NULL, ?, NULL${hasStatus ? ', ?' : ''}
      )
    `;
    const params = hasStatus
      ? [memoryId, title, clientId, visibility, status]
      : [memoryId, title, clientId, visibility];
    db.prepare(sql).run(...params);
  } finally {
    db.close();
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

function updateRecordField(dbPath, memoryId, fieldName, value) {
  const db = new DatabaseSync(dbPath);
  try {
    db.prepare(`UPDATE memory_records SET ${fieldName} = ? WHERE memory_id = ?`).run(value, memoryId);
  } finally {
    db.close();
  }
}

async function readAuditEntries(auditLogPath) {
  try {
    const text = await fs.readFile(auditLogPath, 'utf8');
    return text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function mutationAuditEvents(auditEntries) {
  return auditEntries.map(entry => entry.mutationAuditEvent);
}

async function withService({
  withStatus = true,
  withTombstoneReason = true,
  records = []
} = {}, handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-tombstone-runtime-'));
  const config = createConfig({
    projectBasePath: tempBasePath,
    dataDir: path.join(tempBasePath, 'data'),
    logsDir: path.join(tempBasePath, 'logs'),
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote')
  });
  await fs.mkdir(path.dirname(config.dbPath), { recursive: true });
  createMemoryRecordsTable(config.dbPath, { withStatus, withTombstoneReason });
  for (const record of records) {
    insertRecord(config.dbPath, record);
  }

  const shadowStore = new SqliteShadowStore(config);
  const auditLogStore = new AuditLogStore(config);
  const service = new TombstoneMemoryService({ config, shadowStore, auditLogStore });

  try {
    await handler({ config, shadowStore, auditLogStore, service });
  } finally {
    await shadowStore.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function tombstonePayload(overrides = {}) {
  return {
    memory_id: 'mem-1',
    reason: 'memory retired after governance review',
    evidence: 'fixture evidence for tombstone service',
    tombstone_reason: 'retention-expired',
    actor_client_id: 'codex',
    request_source: 'tombstone-memory-runtime-test',
    ...overrides
  };
}

test('memory_tombstone dry-run is default and does not mutate or audit', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, service }) => {
    const result = await service.tombstone(tombstonePayload());
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.dryRun, true);
    assert.equal(result.mutated, false);
    assert.equal(result.fromStatus, 'active');
    assert.equal(result.toStatus, 'tombstoned');
    assert.equal(result.auditEventPreview.event_type, 'memory_tombstone');
    assert.equal(row.status, 'active');
    assert.equal(row.tombstone_reason, null);
    assert.deepEqual(auditEntries, []);
  });
});

test('memory_tombstone normalizes lifecycle status aliases from policy before transition guard', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ service, shadowStore }) => {
    const readPolicy = shadowStore.getRecordValidationPolicy.bind(shadowStore);
    shadowStore.getRecordValidationPolicy = async memoryId => {
      const policy = await readPolicy(memoryId);
      return {
        ...policy,
        status: '   ',
        lifecycleStatus: '   ',
        lifecycle_status: policy.status
      };
    };

    const result = await service.tombstone(tombstonePayload());

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.fromStatus, 'active');
    assert.equal(result.auditEventPreview.from_status, 'active');
  });
});

test('memory_tombstone normalizes record memory_id and updated_at aliases before audit snapshot', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ service, shadowStore }) => {
    const readRecord = shadowStore.getRecord.bind(shadowStore);
    shadowStore.getRecord = async memoryId => {
      const record = await readRecord(memoryId);
      return {
        ...record,
        memoryId: '   ',
        memory_id: record.memoryId,
        updatedAt: '   ',
        updated_at: record.updatedAt
      };
    };

    const result = await service.tombstone(tombstonePayload());

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.memoryId, 'mem-1');
    assert.deepEqual(result.auditEventPreview.previous_snapshot_ref, {
      memory_id: 'mem-1',
      status: 'active',
      updated_at: '2026-05-14T00:00:00.000Z'
    });
  });
});

test('memory_tombstone writes pending audit before lifecycle mutation', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, shadowStore, service }) => {
    const updateLifecycleStatus = shadowStore.updateLifecycleStatus.bind(shadowStore);
    let sawPendingBeforeUpdate = false;
    shadowStore.updateLifecycleStatus = async options => {
      const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));
      sawPendingBeforeUpdate = auditEvents.length === 1
        && auditEvents[0].audit_phase === 'pending'
        && auditEvents[0].mutation_applied === false;
      return updateLifecycleStatus(options);
    };

    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));

    assert.equal(result.decision, 'tombstoned');
    assert.equal(sawPendingBeforeUpdate, true);
  });
});

test('memory_tombstone applies active to tombstoned with pending and committed audit when confirmed', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, service }) => {
    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);
    const auditEvents = mutationAuditEvents(auditEntries);

    assert.equal(result.decision, 'tombstoned');
    assert.equal(result.mutated, true);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCommitStatus, 'appended');
    assert.equal(result.fromStatus, 'active');
    assert.equal(result.toStatus, 'tombstoned');
    assert.equal(row.status, 'tombstoned');
    assert.equal(row.status_reason, 'memory retired after governance review');
    assert.equal(row.tombstone_reason, 'retention-expired');
    assert.equal(row.lifecycle_actor_client_id, 'codex');
    assert.equal(auditEntries.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'committed');
    assert.equal(auditEvents[1].event_type, 'memory_tombstone');
    assert.equal(auditEvents[1].tombstone_reason, 'retention-expired');
    assert.deepEqual(auditEvents[1].previous_snapshot_ref, auditEvents[0].previous_snapshot_ref);
    assert.equal(auditEvents[1].created_at, auditEvents[0].created_at);
    assert.equal(auditEvents[1].reason, 'memory retired after governance review');
    assert.equal(auditEvents[1].evidence, 'fixture evidence for tombstone service');
    assert.equal(auditEvents[1].reversible, true);
  });
});

test('memory_tombstone applies superseded to tombstoned with audit when confirmed', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'superseded' }]
  }, async ({ config, service }) => {
    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.decision, 'tombstoned');
    assert.equal(result.fromStatus, 'superseded');
    assert.equal(row.status, 'tombstoned');
  });
});

test('memory_tombstone audit intent append failure prevents lifecycle mutation', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, auditLogStore, service }) => {
    auditLogStore.appendWriteAudit = async () => {
      throw new Error('audit intent unavailable');
    };

    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'failed_before_mutation');
    assert.match(result.reason, /audit intent append failed/);
    assert.equal(row.status, 'active');
    assert.deepEqual(auditEntries, []);
  });
});

test('memory_tombstone update failure after pending audit creates cancelled audit', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, shadowStore, service }) => {
    shadowStore.updateLifecycleStatus = async () => ({ updated: false });

    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCancelStatus, 'appended');
    assert.equal(row.status, 'active');
    assert.equal(auditEvents.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'cancelled');
    assert.equal(auditEvents[1].correlation_id, auditEvents[0].event_id);
    assert.deepEqual(auditEvents[1].previous_snapshot_ref, auditEvents[0].previous_snapshot_ref);
    assert.equal(auditEvents[1].created_at, auditEvents[0].created_at);
    assert.equal(auditEvents[1].reason, 'memory retired after governance review');
    assert.equal(auditEvents[1].evidence, 'fixture evidence for tombstone service');
    assert.equal(auditEvents[1].reversible, true);
  });
});

test('memory_tombstone committed audit append failure leaves durable pending audit', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, auditLogStore, service }) => {
    const appendWriteAudit = auditLogStore.appendWriteAudit.bind(auditLogStore);
    let appendCount = 0;
    auditLogStore.appendWriteAudit = async entry => {
      appendCount += 1;
      if (appendCount === 2) {
        throw new Error('committed audit unavailable');
      }
      return appendWriteAudit(entry);
    };

    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'tombstoned-with-warning');
    assert.equal(result.mutated, true);
    assert.equal(result.auditCommitStatus, 'failed_after_mutation');
    assert.match(result.reason, /committed audit append failed/);
    assert.equal(row.status, 'tombstoned');
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0].audit_phase, 'pending');
  });
});

test('memory_tombstone rejects mutation if client_id changes after policy read', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active', clientId: 'codex', visibility: 'project' }]
  }, async ({ config, shadowStore, service }) => {
    const readPolicy = shadowStore.getRecordValidationPolicy.bind(shadowStore);
    shadowStore.getRecordValidationPolicy = async memoryId => {
      const policy = await readPolicy(memoryId);
      updateRecordField(config.dbPath, memoryId, 'client_id', 'claude');
      return policy;
    };

    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCancelStatus, 'appended');
    assert.match(result.reason, /policy guard changed/);
    assert.equal(row.status, 'active');
    assert.equal(auditEvents[1].audit_phase, 'cancelled');
  });
});

test('memory_tombstone rejects forbidden source statuses', async () => {
  for (const status of ['proposal', 'rejected', 'tombstoned']) {
    await withService({
      records: [{ memoryId: 'mem-1', status }]
    }, async ({ config, service }) => {
      const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
      const row = getRecordRow(config.dbPath, 'mem-1');

      assert.equal(result.decision, 'rejected');
      assert.match(result.reason, /only allows active\/stale\/superseded -> tombstoned/);
      assert.equal(row.status, status);
    });
  }
});

test('memory_tombstone requires tombstone_reason and ToolArgumentValidator schema', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, service }) => {
    const missingReason = await service.tombstone({
      memory_id: 'mem-1',
      reason: 'reviewed',
      evidence: 'evidence',
      actor_client_id: 'codex',
      request_source: 'tombstone-memory-runtime-test'
    });
    const unexpectedField = await service.tombstone({
      ...tombstonePayload(),
      unexpected: true
    });
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(missingReason.decision, 'rejected');
    assert.match(missingReason.reason, /tombstone_reason is required/);
    assert.equal(unexpectedField.decision, 'rejected');
    assert.match(unexpectedField.reason, /unexpected is not allowed/);
    assert.equal(row.status, 'active');
  });
});

test('memory_tombstone rejects secret-like reason or tombstone_reason without leaking raw secret', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, service }) => {
    const secretLike = ['Bearer', 'TEST_TOMBSTONE_TOKEN_1234567890'].join(' ');
    const result = await service.tombstone(tombstonePayload({
      tombstone_reason: `retire ${secretLike}`,
      dry_run: false,
      confirm: true
    }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /secret-like content/);
    assert.doesNotMatch(result.reason, /TEST_TOMBSTONE_TOKEN_1234567890/);
    assert.equal(row.status, 'active');
    assert.deepEqual(auditEntries, []);
  });
});

test('memory_tombstone forbids cross-client private mutation by default', async () => {
  await withService({
    records: [{
      memoryId: 'mem-1',
      status: 'active',
      clientId: 'claude',
      visibility: 'private'
    }]
  }, async ({ config, service }) => {
    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /cross-client private/);
    assert.equal(row.status, 'active');
  });
});

test('memory_tombstone requires tombstone_reason lifecycle projection support', async () => {
  await withService({
    withStatus: true,
    withTombstoneReason: false,
    records: [{ memoryId: 'mem-1', status: 'active' }]
  }, async ({ config, service }) => {
    const result = await service.tombstone(tombstonePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /tombstone_reason column is unavailable/);
    assert.equal(row.status, 'active');
  });
});

test('memory_tombstone is internal and does not expand public MCP tools', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
});
