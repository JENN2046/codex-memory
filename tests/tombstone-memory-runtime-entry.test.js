const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

const INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE = 'internal-tombstone-runtime-entry';

function createMemoryRecordsTable(dbPath, {
  withStatus = true,
  withTombstoneReason = true
} = {}) {
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
        ${withTombstoneReason ? 'tombstone_reason TEXT,' : ''}
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
  status = 'active',
  clientId = 'codex',
  visibility = 'project'
} = {}) {
  const db = new DatabaseSync(dbPath);
  try {
    db.prepare(`
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json,
        validated, reusable, sensitivity, file_path, relative_path, raw_text,
        created_at, updated_at, project_id, workspace_id, client_id, task_id,
        conversation_id, visibility, retention_policy, status
      ) VALUES (
        ?, 'process', 'Runtime entry candidate', 'Type: checkpoint\nruntime entry candidate', 'seed evidence', '[]',
        1, 0, 'none', NULL, NULL, NULL,
        '2026-05-14T00:00:00.000Z', '2026-05-14T00:00:00.000Z',
        'project-a', 'workspace-a', ?, NULL, NULL, ?, NULL, ?
      )
    `).run(memoryId, clientId, visibility, status);
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

function readAuditEntries(auditLogPath) {
  if (!fs.existsSync(auditLogPath)) return [];
  return fs.readFileSync(auditLogPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

async function withApp(overrides = {}, handler) {
  const tempBasePath = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'codex-memory-tombstone-runtime-entry-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');
  createMemoryRecordsTable(dbPath);
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...overrides
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fsPromises.rm(tempBasePath, { recursive: true, force: true });
  }
}

function runtimeEntryPayload(overrides = {}) {
  return {
    memory_id: 'mem-1',
    reason: 'runtime entry governance retirement',
    evidence: 'runtime entry bounded evidence',
    tombstone_reason: 'retention-expired',
    dry_run: false,
    confirm: true,
    ...overrides
  };
}

function approvedRequestContext(overrides = {}) {
  return {
    executionContext: {
      requestSource: INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE,
      internalTombstoneRuntimeEntry: true,
      clientId: 'codex',
      ...overrides
    }
  };
}

test('internal tombstone runtime entry is default-disabled and preserves current row', async () => {
  await withApp({}, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const result = await app.executeInternalTombstone(runtimeEntryPayload(), approvedRequestContext());
    const row = getRecordRow(app.config.dbPath, 'mem-1');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /runtime entry is disabled/i);
    assert.equal(result.mutated, false);
    assert.equal(row.status, 'active');
    assert.deepEqual(readAuditEntries(app.config.auditLogPath), []);
  });
});

test('internal tombstone runtime entry rejects missing approved execution context', async () => {
  await withApp({
    internalTombstoneRuntimeEntryEnabled: true
  }, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const result = await app.executeInternalTombstone(runtimeEntryPayload(), {
      executionContext: {
        requestSource: 'wrong-source',
        clientId: 'codex'
      }
    });
    const row = getRecordRow(app.config.dbPath, 'mem-1');

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /approved internal execution context/i);
    assert.equal(result.mutated, false);
    assert.equal(row.status, 'active');
    assert.deepEqual(readAuditEntries(app.config.auditLogPath), []);
  });
});

test('internal tombstone runtime entry applies active record when enabled and approved', async () => {
  await withApp({
    internalTombstoneRuntimeEntryEnabled: true
  }, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const result = await app.executeInternalTombstone(runtimeEntryPayload(), approvedRequestContext());
    const row = getRecordRow(app.config.dbPath, 'mem-1');
    const auditEntries = readAuditEntries(app.config.auditLogPath);

    assert.equal(result.decision, 'tombstoned');
    assert.equal(result.mutated, true);
    assert.equal(result.fromStatus, 'active');
    assert.equal(result.toStatus, 'tombstoned');
    assert.equal(row.status, 'tombstoned');
    assert.equal(row.tombstone_reason, 'retention-expired');
    assert.equal(row.lifecycle_actor_client_id, 'codex');
    assert.equal(auditEntries.length, 3);
    assert.equal(auditEntries[0].mutationAuditEvent.audit_phase, 'pending');
    assert.equal(auditEntries[1].mutationAuditEvent.audit_phase, 'committed');
    assert.equal(auditEntries[2].eventType, 'lifecycle_projection_cleanup');
    assert.equal(auditEntries[2].lowDisclosure, true);
    assert.equal(auditEntries[2].rawContentIncluded, false);
  });
});

test('internal tombstone runtime entry derives actor_client_id from execution context and keeps public MCP registration bounded', async () => {
  await withApp({
    internalTombstoneRuntimeEntryEnabled: true
  }, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const result = await app.executeInternalTombstone(runtimeEntryPayload({
      actor_client_id: '',
      dry_run: true,
      confirm: false
    }), approvedRequestContext({
      clientId: 'codex'
    }));

    assert.equal(result.decision, 'dry-run');
    assert.equal(result.mutated, false);
    assert.equal(result.auditEventPreview.actor_client_id, 'codex');
    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['audit_memory', 'memory_overview', 'record_memory', 'search_memory', 'supersede_memory', 'tombstone_memory', 'validate_memory']
    );
    const publicResult = await app.callTool('tombstone_memory', runtimeEntryPayload({ dry_run: false, confirm: true }), approvedRequestContext());
    assert.equal(publicResult.decision, 'rejected');
    assert.equal(publicResult.mutated, false);
    assert.match(publicResult.reason, /separate exact mutation approval/);
    await assert.rejects(
      () => app.callTool('memory_tombstone', {}, approvedRequestContext()),
      /Unknown tool: memory_tombstone/
    );
  });
});

test('public tombstone_memory valid dry-run reaches service preview without mutating', async () => {
  await withApp({}, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const publicResult = await app.callTool('tombstone_memory', runtimeEntryPayload({
      request_source: 'public-controlled-mutation-dry-run-test',
      dry_run: true,
      confirm: false
    }), {
      executionContext: {
        clientId: 'codex'
      }
    });
    const row = getRecordRow(app.config.dbPath, 'mem-1');

    assert.equal(publicResult.decision, 'rejected');
    assert.equal(publicResult.tool, 'tombstone_memory');
    assert.equal(publicResult.dryRun, true);
    assert.equal(publicResult.mutated, false);
    assert.equal(publicResult.access.mode, 'controlled_mutation_public_bounded');
    assert.equal(publicResult.policy.dryRunOnlyPublicPath, true);
    assert.equal(publicResult.policy.durableMutationPerformed, false);
    assert.equal(publicResult.confirmGate.confirmedMutationAllowed, false);
    assert.equal(publicResult.reason, 'public controlled mutation dry-run requires separate exact review.');
    assert.equal(row.status, 'active');
    assert.deepEqual(readAuditEntries(app.config.auditLogPath), []);
  });
});

test('public tombstone_memory rejects dry_run=false before service mutation', async () => {
  await withApp({}, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const publicResult = await app.callTool('tombstone_memory', runtimeEntryPayload({
      request_source: 'public-controlled-mutation-rejection-test',
      dry_run: false,
      confirm: false
    }), {
      executionContext: {
        clientId: 'codex'
      }
    });
    const row = getRecordRow(app.config.dbPath, 'mem-1');

    assert.equal(publicResult.decision, 'rejected');
    assert.equal(publicResult.tool, 'tombstone_memory');
    assert.equal(publicResult.dryRun, true);
    assert.equal(publicResult.mutated, false);
    assert.equal(publicResult.confirmGate.dryRunRequested, false);
    assert.equal(publicResult.confirmGate.confirmRequested, false);
    assert.equal(publicResult.confirmGate.confirmedMutationAllowed, false);
    assert.match(publicResult.reason, /public confirmed controlled mutation requires separate exact mutation approval/);
    assert.equal(row.status, 'active');
    assert.deepEqual(readAuditEntries(app.config.auditLogPath), []);
  });
});

test('public tombstone_memory rejects confirm=true before service mutation', async () => {
  await withApp({}, async ({ app }) => {
    insertRecord(app.config.dbPath, { memoryId: 'mem-1', status: 'active' });

    const publicResult = await app.callTool('tombstone_memory', runtimeEntryPayload({
      request_source: 'public-controlled-mutation-rejection-test',
      dry_run: true,
      confirm: true
    }), {
      executionContext: {
        clientId: 'codex'
      }
    });
    const row = getRecordRow(app.config.dbPath, 'mem-1');

    assert.equal(publicResult.decision, 'rejected');
    assert.equal(publicResult.tool, 'tombstone_memory');
    assert.equal(publicResult.dryRun, true);
    assert.equal(publicResult.mutated, false);
    assert.equal(publicResult.confirmGate.dryRunRequested, true);
    assert.equal(publicResult.confirmGate.confirmRequested, true);
    assert.equal(publicResult.confirmGate.confirmedMutationAllowed, false);
    assert.match(publicResult.reason, /public confirmed controlled mutation requires separate exact mutation approval/);
    assert.equal(row.status, 'active');
    assert.deepEqual(readAuditEntries(app.config.auditLogPath), []);
  });
});
