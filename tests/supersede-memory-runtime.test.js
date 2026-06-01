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
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function createMemoryRecordsTable(dbPath, { withStatus = true, withSupersedeLinks = true } = {}) {
  const db = new DatabaseSync(dbPath);
  try {
    const lifecycleColumns = [];
    if (withStatus) {
      lifecycleColumns.push('status TEXT');
      lifecycleColumns.push('status_reason TEXT');
      if (withSupersedeLinks) {
        lifecycleColumns.push('supersedes_memory_id TEXT');
        lifecycleColumns.push('superseded_by_memory_id TEXT');
      }
      lifecycleColumns.push('tombstone_reason TEXT');
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
  title = 'Supersede candidate',
  projectId = 'project-a',
  workspaceId = 'workspace-a',
  taskId = 'task-a',
  conversationId = 'thread-a',
  retentionPolicy = 'retain'
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
        ?, 'process', ?, 'Type: checkpoint\nsupersede runtime candidate', 'seed evidence', '[]',
        1, 0, 'none', NULL, NULL, NULL,
        '2026-05-14T00:00:00.000Z', '2026-05-14T00:00:00.000Z',
        ?, ?, ?, ?, ?, ?, ?${hasStatus ? ', ?' : ''}
      )
    `;
    const params = hasStatus
      ? [memoryId, title, projectId, workspaceId, clientId, taskId, conversationId, visibility, retentionPolicy, status]
      : [memoryId, title, projectId, workspaceId, clientId, taskId, conversationId, visibility, retentionPolicy];
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

async function withService({ withStatus = true, withSupersedeLinks = true, records = [] } = {}, handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-supersede-runtime-'));
  const config = createConfig({
    projectBasePath: tempBasePath,
    dataDir: path.join(tempBasePath, 'data'),
    logsDir: path.join(tempBasePath, 'logs'),
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote')
  });
  await fs.mkdir(path.dirname(config.dbPath), { recursive: true });
  createMemoryRecordsTable(config.dbPath, { withStatus, withSupersedeLinks });
  for (const record of records) {
    insertRecord(config.dbPath, record);
  }

  const shadowStore = new SqliteShadowStore(config);
  const auditLogStore = new AuditLogStore(config);
  const service = new SupersedeMemoryService({ config, shadowStore, auditLogStore });

  try {
    await handler({ config, shadowStore, auditLogStore, service });
  } finally {
    await shadowStore.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function supersedePayload(overrides = {}) {
  return {
    old_memory_id: 'mem-old',
    new_memory_id: 'mem-new',
    reason: 'replacement memory approved after governance review',
    evidence: 'fixture evidence for supersede service',
    supersedes_link: 'mem-old',
    superseded_by_link: 'mem-new',
    actor_client_id: 'codex',
    request_source: 'supersede-memory-runtime-test',
    ...overrides
  };
}

test('supersede_memory dry-run is default and does not mutate or audit', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, service }) => {
    const result = await service.supersede(supersedePayload());
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.dryRun, true);
    assert.equal(result.mutated, false);
    assert.equal(result.oldFromStatus, 'active');
    assert.equal(result.newFromStatus, 'proposal');
    assert.equal(result.oldToStatus, 'superseded');
    assert.equal(result.newToStatus, 'active');
    assert.equal(result.auditPlanPreview.pendingEvent.event_type, 'memory_supersede');
    assert.equal(result.auditPlanPreview.pendingEvent.replacement_memory_id, 'mem-new');
    assert.equal(oldRow.status, 'active');
    assert.equal(oldRow.superseded_by_memory_id, null);
    assert.equal(newRow.status, 'proposal');
    assert.equal(newRow.supersedes_memory_id, null);
    assert.deepEqual(auditEntries, []);
  });
});

test('supersede_memory normalizes lifecycle status aliases from policies before transition guards', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
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

    const result = await service.supersede(supersedePayload());

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.oldFromStatus, 'active');
    assert.equal(result.newFromStatus, 'proposal');
    assert.equal(result.auditPlanPreview.pendingEvent.old_from_status, 'active');
    assert.equal(result.auditPlanPreview.pendingEvent.new_from_status, 'proposal');
  });
});

test('supersede_memory writes pending audit before pair mutation', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, shadowStore, service }) => {
    const applySupersedePair = shadowStore.applySupersedePair.bind(shadowStore);
    let sawPendingBeforeApply = false;
    shadowStore.applySupersedePair = async options => {
      const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));
      sawPendingBeforeApply = auditEvents.length === 1
        && auditEvents[0].audit_phase === 'pending'
        && auditEvents[0].mutation_applied === false;
      return applySupersedePair(options);
    };

    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));

    assert.equal(result.decision, 'superseded');
    assert.equal(sawPendingBeforeApply, true);
  });
});

test('supersede_memory applies pair mutation with committed audit when confirmed', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, service }) => {
    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'superseded');
    assert.equal(result.mutated, true);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCommitStatus, 'appended');
    assert.equal(oldRow.status, 'superseded');
    assert.equal(oldRow.status_reason, 'replacement memory approved after governance review');
    assert.equal(oldRow.superseded_by_memory_id, 'mem-new');
    assert.equal(oldRow.lifecycle_actor_client_id, 'codex');
    assert.equal(newRow.status, 'active');
    assert.equal(newRow.status_reason, 'replacement memory approved after governance review');
    assert.equal(newRow.supersedes_memory_id, 'mem-old');
    assert.equal(newRow.lifecycle_actor_client_id, 'codex');
    assert.equal(auditEvents.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'committed');
    assert.equal(auditEvents[0].pair_correlation_id, result.pairCorrelationId);
    assert.equal(auditEvents[1].pair_correlation_id, result.pairCorrelationId);
    assert.equal(auditEvents[1].replacement_memory_id, 'mem-new');
  });
});

test('supersede_memory audit intent append failure prevents pair mutation', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, auditLogStore, service }) => {
    auditLogStore.appendWriteAudit = async () => {
      throw new Error('audit intent unavailable');
    };

    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'failed_before_mutation');
    assert.match(result.reason, /audit intent append failed/);
    assert.equal(oldRow.status, 'active');
    assert.equal(newRow.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('supersede_memory pair update failure after pending audit creates cancelled audit', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, shadowStore, service }) => {
    shadowStore.applySupersedePair = async () => ({ updated: false, reason: 'new_record_guard_failed' });

    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.mutated, false);
    assert.equal(result.auditIntentStatus, 'appended');
    assert.equal(result.auditCancelStatus, 'appended');
    assert.equal(oldRow.status, 'active');
    assert.equal(oldRow.superseded_by_memory_id, null);
    assert.equal(newRow.status, 'proposal');
    assert.equal(newRow.supersedes_memory_id, null);
    assert.equal(auditEvents.length, 2);
    assert.equal(auditEvents[0].audit_phase, 'pending');
    assert.equal(auditEvents[1].audit_phase, 'cancelled');
    assert.equal(auditEvents[1].pair_correlation_id, result.pairCorrelationId);
  });
});

test('supersede_memory committed audit append failure leaves durable pending audit', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
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

    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEvents = mutationAuditEvents(await readAuditEntries(config.auditLogPath));

    assert.equal(result.decision, 'superseded-with-warning');
    assert.equal(result.mutated, true);
    assert.equal(result.auditCommitStatus, 'failed_after_mutation');
    assert.match(result.reason, /committed audit append failed/);
    assert.equal(oldRow.status, 'superseded');
    assert.equal(newRow.status, 'active');
    assert.equal(auditEvents.length, 1);
    assert.equal(auditEvents[0].audit_phase, 'pending');
  });
});

test('supersede_memory rejects exact pair scope mismatch before audit', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', projectId: 'project-a', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', projectId: 'project-b', title: 'New memory' }
    ]
  }, async ({ config, service }) => {
    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));
    const auditEntries = await readAuditEntries(config.auditLogPath);
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /exact pair scope match/);
    assert.equal(oldRow.status, 'active');
    assert.equal(newRow.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('supersede_memory pair scope guard normalizes snake-case record fields', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, shadowStore, service }) => {
    const getRecordsByIds = shadowStore.getRecordsByIds.bind(shadowStore);
    shadowStore.getRecordsByIds = async ids => {
      const records = await getRecordsByIds(ids);
      return records.map(record => ({
        ...record,
        projectId: '',
        project_id: 'project-a',
        workspaceId: '   ',
        workspace_id: 'workspace-a',
        clientId: '',
        client_id: 'codex',
        taskId: '',
        task_id: 'task-a',
        conversationId: '',
        conversation_id: 'thread-a',
        visibility: '',
        visibility_policy: 'project',
        retentionPolicy: ' ',
        retention_policy: 'retain'
      }));
    };

    const result = await service.supersede(supersedePayload());
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.mutated, false);
    assert.equal(result.oldMemoryId, 'mem-old');
    assert.equal(result.newMemoryId, 'mem-new');
    assert.equal(oldRow.status, 'active');
    assert.equal(newRow.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('supersede_memory normalizes returned memory_id aliases before pair lookup', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, shadowStore, service }) => {
    const getRecordsByIds = shadowStore.getRecordsByIds.bind(shadowStore);
    shadowStore.getRecordsByIds = async ids => {
      const records = await getRecordsByIds(ids);
      return records.map(record => ({
        ...record,
        memoryId: '   ',
        memory_id: record.memoryId
      }));
    };

    const result = await service.supersede(supersedePayload());
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.mutated, false);
    assert.equal(result.oldMemoryId, 'mem-old');
    assert.equal(result.newMemoryId, 'mem-new');
    assert.equal(result.auditPlanPreview.pendingEvent.memory_id, 'mem-old');
    assert.equal(result.auditPlanPreview.pendingEvent.replacement_memory_id, 'mem-new');
    assert.equal(oldRow.status, 'active');
    assert.equal(newRow.status, 'proposal');
    assert.deepEqual(auditEntries, []);
  });
});

test('supersede_memory normalizes returned updated_at aliases before audit snapshots', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ shadowStore, service }) => {
    const getRecordsByIds = shadowStore.getRecordsByIds.bind(shadowStore);
    shadowStore.getRecordsByIds = async ids => {
      const records = await getRecordsByIds(ids);
      return records.map(record => ({
        ...record,
        updatedAt: '   ',
        updated_at: record.updatedAt
      }));
    };

    const result = await service.supersede(supersedePayload());

    assert.equal(result.decision, 'dry-run');
    assert.deepEqual(result.auditPlanPreview.pendingEvent.old_previous_snapshot_ref, {
      memory_id: 'mem-old',
      status: 'active',
      updated_at: '2026-05-14T00:00:00.000Z'
    });
    assert.deepEqual(result.auditPlanPreview.pendingEvent.new_previous_snapshot_ref, {
      memory_id: 'mem-new',
      status: 'proposal',
      updated_at: '2026-05-14T00:00:00.000Z'
    });
  });
});

test('supersede_memory forbids cross-client private mutation by default', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', clientId: 'claude', visibility: 'private', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', clientId: 'claude', visibility: 'private', title: 'New memory' }
    ]
  }, async ({ config, service }) => {
    const result = await service.supersede(supersedePayload({ dry_run: false, confirm: true }));
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /cross-client private/);
    assert.equal(oldRow.status, 'active');
    assert.equal(newRow.status, 'proposal');
  });
});

test('supersede_memory requires exact pair ids and bidirectional links', async () => {
  await withService({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  }, async ({ config, service }) => {
    const sameMemory = await service.supersede(supersedePayload({
      old_memory_id: 'mem-old',
      new_memory_id: 'mem-old'
    }));
    const mismatchedLinks = await service.supersede(supersedePayload({
      superseded_by_link: 'mem-other'
    }));
    const oldRow = getRecordRow(config.dbPath, 'mem-old');
    const newRow = getRecordRow(config.dbPath, 'mem-new');

    assert.equal(sameMemory.decision, 'rejected');
    assert.match(sameMemory.reason, /two distinct memory ids/);
    assert.equal(mismatchedLinks.decision, 'rejected');
    assert.match(mismatchedLinks.reason, /superseded_by_link must exactly match new_memory_id/);
    assert.equal(oldRow.status, 'active');
    assert.equal(newRow.status, 'proposal');
  });
});

test('supersede_memory is internal and does not expand public MCP tools', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, ['memory_overview', 'record_memory', 'search_memory']);
});
