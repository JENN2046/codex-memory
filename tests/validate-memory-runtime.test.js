const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createConfig } = require('../src/config/createConfig');
const { ValidateMemoryService } = require('../src/core/ValidateMemoryService');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { AuditLogStore } = require('../src/storage/AuditLogStore');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function createMemoryRecordsTable(dbPath, { withStatus = true, withSupersedeLinks = true } = {}) {
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
        ${withStatus ? `,
        status TEXT,
        status_reason TEXT,
        ${withSupersedeLinks ? 'supersedes_memory_id TEXT,' : ''}
        ${withSupersedeLinks ? 'superseded_by_memory_id TEXT,' : ''}
        tombstone_reason TEXT,
        lifecycle_updated_at TEXT,
        lifecycle_actor_client_id TEXT` : ''}
      );
    `);
  } finally {
    db.close();
  }
}

function insertRecord(dbPath, {
  memoryId,
  status = 'proposal',
  clientId = 'codex',
  visibility = 'project',
  title = 'Validate candidate'
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
        ?, 'process', ?, 'Type: checkpoint\\nvalidate runtime candidate', 'seed evidence', '[]',
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

async function withService({ withStatus = true, records = [] } = {}, handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-validate-runtime-'));
  const config = createConfig({
    projectBasePath: tempBasePath,
    dataDir: path.join(tempBasePath, 'data'),
    logsDir: path.join(tempBasePath, 'logs'),
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote')
  });
  await fs.mkdir(path.dirname(config.dbPath), { recursive: true });
  createMemoryRecordsTable(config.dbPath, { withStatus });
  for (const record of records) {
    insertRecord(config.dbPath, record);
  }

  const shadowStore = new SqliteShadowStore(config);
  const auditLogStore = new AuditLogStore(config);
  const service = new ValidateMemoryService({ config, shadowStore, auditLogStore });

  try {
    await handler({ config, shadowStore, auditLogStore, service });
  } finally {
    await shadowStore.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function validatePayload(overrides = {}) {
  return {
    memory_id: 'mem-1',
    reason: 'human reviewed proposal evidence',
    evidence: 'fixture evidence for validation',
    actor_client_id: 'codex',
    request_source: 'validate-memory-runtime-test',
    ...overrides
  };
}

test('validate_memory dry-run is default and does not mutate or audit', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, service }) => {
    const result = await service.validate(validatePayload());
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.dryRun, true);
    assert.equal(result.mutated, false);
    assert.equal(result.fromStatus, 'proposal');
    assert.equal(result.toStatus, 'active');
    assert.equal(result.auditEventPreview.event_type, 'memory_validate');
    assert.equal(row.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('validate_memory normalizes lifecycle status aliases from policy before transition guard', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
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

    const result = await service.validate(validatePayload());

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.fromStatus, 'proposal');
    assert.equal(result.auditEventPreview.from_status, 'proposal');
  });
});

test('validate_memory normalizes record memory_id and updated_at aliases before audit snapshot', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
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

    const result = await service.validate(validatePayload());

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.memoryId, 'mem-1');
    assert.deepEqual(result.auditEventPreview.previous_snapshot_ref, {
      memory_id: 'mem-1',
      status: 'proposal',
      updated_at: '2026-05-14T00:00:00.000Z'
    });
  });
});

test('validate_memory writes pending audit before lifecycle mutation', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
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

    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));

    assert.equal(result.decision, 'validated');
    assert.equal(sawPendingBeforeUpdate, true);
  });
});

test('updateLifecycleStatus writes tombstone_reason through the single-record lifecycle seam', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'stale', clientId: 'codex', visibility: 'project' }]
  }, async ({ config, shadowStore }) => {
    const result = await shadowStore.updateLifecycleStatus({
      memoryId: 'mem-1',
      fromStatus: 'stale',
      toStatus: 'tombstoned',
      updatedAt: '2026-05-23T09:30:00.000Z',
      actorClientId: 'codex',
      reason: 'memory retired after governance review',
      tombstoneReason: 'retention-expired',
      expectedClientId: 'codex',
      expectedVisibility: 'project'
    });
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.updated, true);
    assert.equal(row.status, 'tombstoned');
    assert.equal(row.status_reason, 'memory retired after governance review');
    assert.equal(row.tombstone_reason, 'retention-expired');
    assert.equal(row.lifecycle_updated_at, '2026-05-23T09:30:00.000Z');
    assert.equal(row.lifecycle_actor_client_id, 'codex');
  });
});

test('applySupersedePair atomically updates old/new records with lifecycle metadata and bidirectional links', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', clientId: 'codex', visibility: 'project', title: 'Old record' },
      { memoryId: 'mem-new', status: 'proposal', clientId: 'codex', visibility: 'project', title: 'New record' }
    ]
  }, async ({ config, shadowStore }) => {
    const result = await shadowStore.applySupersedePair({
      oldMemoryId: 'mem-old',
      newMemoryId: 'mem-new',
      oldFromStatus: 'active',
      oldToStatus: 'superseded',
      newFromStatus: 'proposal',
      newToStatus: 'active',
      updatedAt: '2026-05-24T12:00:00.000Z',
      actorClientId: 'codex',
      reason: 'replacement memory approved after pair review',
      expectedOldClientId: 'codex',
      expectedOldVisibility: 'project',
      expectedNewClientId: 'codex',
      expectedNewVisibility: 'project',
      supersedesLink: 'mem-old',
      supersededByLink: 'mem-new'
    });
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');

    assert.equal(result.updated, true);
    assert.equal(result.changes, 2);
    assert.equal(oldRow.status, 'superseded');
    assert.equal(oldRow.status_reason, 'replacement memory approved after pair review');
    assert.equal(oldRow.superseded_by_memory_id, 'mem-new');
    assert.equal(oldRow.lifecycle_updated_at, '2026-05-24T12:00:00.000Z');
    assert.equal(oldRow.lifecycle_actor_client_id, 'codex');
    assert.equal(newRow.status, 'active');
    assert.equal(newRow.status_reason, 'replacement memory approved after pair review');
    assert.equal(newRow.supersedes_memory_id, 'mem-old');
    assert.equal(newRow.lifecycle_updated_at, '2026-05-24T12:00:00.000Z');
    assert.equal(newRow.lifecycle_actor_client_id, 'codex');
  });
});

test('applySupersedePair fails closed and leaves no half-applied pair when the second guard fails', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', clientId: 'codex', visibility: 'project', title: 'Old record' },
      { memoryId: 'mem-new', status: 'proposal', clientId: 'codex', visibility: 'project', title: 'New record' }
    ]
  }, async ({ config, shadowStore }) => {
    const result = await shadowStore.applySupersedePair({
      oldMemoryId: 'mem-old',
      newMemoryId: 'mem-new',
      oldFromStatus: 'active',
      oldToStatus: 'superseded',
      newFromStatus: 'proposal',
      newToStatus: 'active',
      updatedAt: '2026-05-24T12:05:00.000Z',
      actorClientId: 'codex',
      reason: 'replacement memory approved after pair review',
      expectedOldClientId: 'codex',
      expectedOldVisibility: 'project',
      expectedNewClientId: 'claude',
      expectedNewVisibility: 'project',
      supersedesLink: 'mem-old',
      supersededByLink: 'mem-new'
    });
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');

    assert.equal(result.updated, false);
    assert.equal(result.reason, 'new_record_guard_failed');
    assert.equal(oldRow.status, 'active');
    assert.equal(oldRow.superseded_by_memory_id, null);
    assert.equal(newRow.status, 'proposal');
    assert.equal(newRow.supersedes_memory_id, null);
  });
});

test('applySupersedePair rejects same-memory pair inputs', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', clientId: 'codex', visibility: 'project', title: 'Old record' }
    ]
  }, async ({ config, shadowStore }) => {
    const result = await shadowStore.applySupersedePair({
      oldMemoryId: 'mem-old',
      newMemoryId: 'mem-old',
      oldFromStatus: 'active',
      oldToStatus: 'superseded',
      newFromStatus: 'active',
      newToStatus: 'active',
      updatedAt: '2026-05-24T12:10:00.000Z',
      actorClientId: 'codex',
      reason: 'replacement memory approved after pair review',
      expectedOldClientId: 'codex',
      expectedOldVisibility: 'project',
      expectedNewClientId: 'codex',
      expectedNewVisibility: 'project',
      supersedesLink: 'mem-old',
      supersededByLink: 'mem-old'
    });
    const oldRow = getRecordRow(config.dbPath, 'mem-old');

    assert.equal(result.updated, false);
    assert.equal(result.reason, 'same_memory_id_not_allowed');
    assert.equal(oldRow.status, 'active');
  });
});

test('validate_memory applies proposal to active with pending and committed audit when confirmed', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, service }) => {
    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);
    const auditEvents = mutationAuditEvents(auditEntries);

    assert.equal(result.decision, 'validated');
    assert.equal(result.mutated, true);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCommitStatus, 'appended');
    assert.equal(result.fromStatus, 'proposal');
    assert.equal(result.toStatus, 'active');
    assert.equal(row.status, 'active');
    assert.equal(row.lifecycle_actor_client_id, 'codex');
    assert.equal(row.status_reason, 'human reviewed proposal evidence');
    assert.equal(auditEntries.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[0].mutation_applied, false);
    assert.equal(auditEvents[1].audit_phase, 'committed');
    assert.equal(auditEvents[1].mutation_applied, true);
    assert.equal(auditEvents[1].event_id, auditEvents[0].event_id);
    assert.equal(auditEvents[1].correlation_id, auditEvents[0].event_id);
    assert.equal(auditEvents[1].event_type, 'memory_validate');
    assert.equal(auditEvents[1].tool_name, 'validate_memory');
    assert.equal(auditEvents[1].from_status, 'proposal');
    assert.equal(auditEvents[1].to_status, 'active');
    assert.deepEqual(auditEvents[1].previous_snapshot_ref, auditEvents[0].previous_snapshot_ref);
    assert.equal(auditEvents[1].created_at, auditEvents[0].created_at);
    assert.equal(auditEvents[1].reason, 'human reviewed proposal evidence');
    assert.equal(auditEvents[1].evidence, 'fixture evidence for validation');
    assert.equal(auditEvents[1].reversible, true);
    assert.equal(auditEvents[1].redaction_applied, true);
    assert.equal(auditEvents[1].lifecycle_policy_applied, true);
    assert.equal(auditEvents[1].scope_policy_applied, true);
    assert.equal(JSON.stringify(auditEntries[0]).includes('workspace-a'), false);
  });
});

test('validate_memory audit intent append failure prevents lifecycle mutation', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, auditLogStore, service }) => {
    auditLogStore.appendWriteAudit = async () => {
      throw new Error('audit intent unavailable');
    };

    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'failed_before_mutation');
    assert.match(result.reason, /audit intent append failed/);
    assert.equal(row.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('validate_memory update failure after pending audit creates cancelled audit', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, shadowStore, service }) => {
    shadowStore.updateLifecycleStatus = async () => ({ updated: false });

    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCancelStatus, 'appended');
    assert.equal(row.status, 'proposal');
    assert.equal(auditEvents.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'cancelled');
    assert.equal(auditEvents[1].mutation_applied, false);
    assert.equal(auditEvents[1].correlation_id, auditEvents[0].event_id);
    assert.deepEqual(auditEvents[1].previous_snapshot_ref, auditEvents[0].previous_snapshot_ref);
    assert.equal(auditEvents[1].created_at, auditEvents[0].created_at);
    assert.equal(auditEvents[1].reason, 'human reviewed proposal evidence');
    assert.equal(auditEvents[1].evidence, 'fixture evidence for validation');
    assert.equal(auditEvents[1].reversible, true);
    assert.equal(auditEvents.some(event => event.audit_phase === 'committed'), false);
  });
});

test('validate_memory committed audit append failure leaves durable pending audit', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
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

    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'validated-with-warning');
    assert.equal(result.mutated, true);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCommitStatus, 'failed_after_mutation');
    assert.match(result.reason, /committed audit append failed/);
    assert.equal(row.status, 'active');
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[0].mutation_applied, false);
  });
});

test('validate_memory rejects mutation if client_id changes after policy read', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal', clientId: 'codex', visibility: 'project' }]
  }, async ({ config, shadowStore, service }) => {
    const readPolicy = shadowStore.getRecordValidationPolicy.bind(shadowStore);
    shadowStore.getRecordValidationPolicy = async memoryId => {
      const policy = await readPolicy(memoryId);
      updateRecordField(config.dbPath, memoryId, 'client_id', 'claude');
      return policy;
    };

    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCancelStatus, 'appended');
    assert.match(result.reason, /policy guard changed/);
    assert.equal(row.status, 'proposal');
    assert.equal(row.client_id, 'claude');
    assert.equal(auditEvents.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'cancelled');
  });
});

test('validate_memory rejects mutation if visibility changes after policy read', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal', clientId: 'codex', visibility: 'project' }]
  }, async ({ config, shadowStore, service }) => {
    const readPolicy = shadowStore.getRecordValidationPolicy.bind(shadowStore);
    shadowStore.getRecordValidationPolicy = async memoryId => {
      const policy = await readPolicy(memoryId);
      updateRecordField(config.dbPath, memoryId, 'visibility', 'private');
      return policy;
    };

    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCancelStatus, 'appended');
    assert.match(result.reason, /policy guard changed/);
    assert.equal(row.status, 'proposal');
    assert.equal(row.visibility, 'private');
    assert.equal(auditEvents.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'cancelled');
  });
});

test('validate_memory applies stale to active with audit when confirmed', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'stale' }]
  }, async ({ config, service }) => {
    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.decision, 'validated');
    assert.equal(result.fromStatus, 'stale');
    assert.equal(row.status, 'active');
  });
});

test('validate_memory rejects forbidden revive statuses', async () => {
  for (const status of ['rejected', 'tombstoned', 'superseded']) {
    await withService({
      records: [{ memoryId: 'mem-1', status }]
    }, async ({ config, service }) => {
      const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
      const row = getRecordRow(config.dbPath, 'mem-1');

      assert.equal(result.decision, 'rejected');
      assert.equal(result.mutated, false);
      assert.match(result.reason, /only allows proposal\/stale -> active/);
      assert.equal(row.status, status);
    });
  }
});

test('validate_memory requires reason evidence and ToolArgumentValidator schema', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, service }) => {
    const missingEvidence = await service.validate({
      memory_id: 'mem-1',
      reason: 'reviewed',
      actor_client_id: 'codex',
      request_source: 'validate-memory-runtime-test'
    });
    const unexpectedField = await service.validate({
      ...validatePayload(),
      unexpected: true
    });
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(missingEvidence.decision, 'rejected');
    assert.match(missingEvidence.reason, /evidence is required/);
    assert.equal(unexpectedField.decision, 'rejected');
    assert.match(unexpectedField.reason, /unexpected is not allowed/);
    assert.equal(row.status, 'proposal');
  });
});

test('validate_memory rejects secret-like reason or evidence without leaking raw secret', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, service }) => {
    const secretLike = ['Bearer', 'TEST_VALIDATE_TOKEN_1234567890'].join(' ');
    const result = await service.validate(validatePayload({
      evidence: `review includes ${secretLike}`,
      dry_run: false,
      confirm: true
    }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /secret-like content/);
    assert.doesNotMatch(result.reason, /TEST_VALIDATE_TOKEN_1234567890/);
    assert.equal(row.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('validate_memory forbids cross-client private mutation by default', async () => {
  await withService({
    records: [{
      memoryId: 'mem-1',
      status: 'proposal',
      clientId: 'claude',
      visibility: 'private'
    }]
  }, async ({ config, service }) => {
    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /cross-client private/);
    assert.equal(row.status, 'proposal');
  });
});

test('validate_memory requires existing lifecycle status column', async () => {
  await withService({
    withStatus: false,
    records: [{ memoryId: 'mem-1' }]
  }, async ({ config, service }) => {
    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /lifecycle status column is unavailable/);
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'status'), false);
  });
});

test('validate_memory is internal and does not expand public MCP tools', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
});
