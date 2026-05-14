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

function createMemoryRecordsTable(dbPath, { withStatus = true } = {}) {
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
        supersedes_memory_id TEXT,
        superseded_by_memory_id TEXT,
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

test('validate_memory applies proposal to active with audit when confirmed', async () => {
  await withService({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  }, async ({ config, service }) => {
    const result = await service.validate(validatePayload({ dry_run: false, confirm: true }));
    const row = getRecordRow(config.dbPath, 'mem-1');
    const auditEntries = await readAuditEntries(config.auditLogPath);

    assert.equal(result.decision, 'validated');
    assert.equal(result.mutated, true);
    assert.equal(result.fromStatus, 'proposal');
    assert.equal(result.toStatus, 'active');
    assert.equal(row.status, 'active');
    assert.equal(row.lifecycle_actor_client_id, 'codex');
    assert.equal(row.status_reason, 'human reviewed proposal evidence');
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].mutationAuditEvent.event_type, 'memory_validate');
    assert.equal(auditEntries[0].mutationAuditEvent.tool_name, 'validate_memory');
    assert.equal(auditEntries[0].mutationAuditEvent.from_status, 'proposal');
    assert.equal(auditEntries[0].mutationAuditEvent.to_status, 'active');
    assert.equal(auditEntries[0].mutationAuditEvent.redaction_applied, true);
    assert.equal(auditEntries[0].mutationAuditEvent.lifecycle_policy_applied, true);
    assert.equal(auditEntries[0].mutationAuditEvent.scope_policy_applied, true);
    assert.equal(JSON.stringify(auditEntries[0]).includes('workspace-a'), false);
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

  assert.deepEqual(toolNames, ['memory_overview', 'record_memory', 'search_memory']);
});
