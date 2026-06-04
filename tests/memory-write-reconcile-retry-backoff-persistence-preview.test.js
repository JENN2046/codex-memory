'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  REQUIRED_RECONCILE_RETRY_COLUMNS,
  buildReconcileRetryBackoffPersistencePreview,
  buildStoreBackedReconcileRetryBackoffPersistencePreview
} = require('../src/core/MemoryWriteReconcileRetryBackoffPersistencePreview');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');

const BASE_COLUMNS = [
  'id',
  'memory_id',
  'store_kind',
  'reason',
  'payload_json',
  'created_at'
];

function createConfig(rootPath) {
  return {
    defaultRequestSource: 'cm1083-reconcile-retry-backoff-persistence-preview-test',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    embeddingFingerprint: 'cm1083-temp-local-reconcile-retry-backoff-v1',
    embedDimensions: 32,
    enableShadowWrites: true,
    enableVectorIndex: true,
    enableEmbeddingCache: true
  };
}

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name).sort();
}

function fixtureTask(overrides = {}) {
  return {
    id: 7,
    memoryId: 'codex-process-cm1083-retry-preview',
    storeKind: 'vector',
    reason: 'cm1083 synthetic retry persistence preview',
    retryBackoffMetadata: null,
    ...overrides
  };
}

async function createQueuedTask(shadowStore) {
  await shadowStore.enqueueReconcileTask({
    memoryId: 'codex-process-cm1083-store-backed-preview',
    storeKind: 'vector',
    reason: 'cm1083 temp-local queued projection',
    payload: {
      memoryId: 'codex-process-cm1083-store-backed-preview',
      target: 'process',
      title: 'Checkpoint: CM1083 temp-local retry persistence preview',
      content: 'Type: checkpoint\nCM1083 synthetic temp-local queued projection.',
      evidence: 'cm1083 synthetic temp-local evidence',
      tags: ['cm1083', 'reconcile', 'retry', 'backoff'],
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }
  });
  const tasks = await shadowStore.listReconcileTasks(10);
  assert.equal(tasks.length, 1);
  return tasks[0];
}

test('CM-1083 pure persistence preview fails closed when retry columns are absent', () => {
  const report = buildReconcileRetryBackoffPersistencePreview({
    task: fixtureTask(),
    availableColumns: BASE_COLUMNS,
    failedAt: '2026-05-25T12:00:00.000Z',
    error: new Error('provider token leaked for memoryId codex-process-secret-123'),
    policy: {
      baseDelayMs: 1000,
      maxDelayMs: 10_000,
      deadLetterAfterAttempts: 3
    }
  });

  assert.equal(report.accepted, false);
  assert.equal(report.status, 'blocked');
  assert.equal(report.schemaReady, false);
  assert.equal(report.durablePersistencePreviewed, false);
  assert.ok(report.blockerReasons.includes('reconcile_queue_retry_columns_missing'));
  assert.deepEqual(report.missingRetryColumns, REQUIRED_RECONCILE_RETRY_COLUMNS);
  assert.equal(report.plannedUpdate, null);
  assert.equal(report.applyGate.applyApproved, false);
  assert.equal(report.applyGate.applyExecuted, false);
  assert.equal(report.applyGate.schemaMigrationApplied, false);
  assert.equal(report.automaticStartupWorkerEnabled, false);
  assert.equal(report.publicMcpExpansion, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(JSON.stringify(report).includes('provider token leaked'), false);
  assert.equal(JSON.stringify(report).includes('codex-process-secret-123'), false);
});

test('CM-1083 pure persistence preview builds a no-apply durable update shape when schema is present', () => {
  const report = buildReconcileRetryBackoffPersistencePreview({
    task: fixtureTask({
      retryBackoffMetadata: {
        attemptCount: 1,
        firstAttemptAt: '2026-05-25T12:00:00.000Z'
      }
    }),
    availableColumns: [...BASE_COLUMNS, ...REQUIRED_RECONCILE_RETRY_COLUMNS],
    failedAt: '2026-05-25T12:00:05.000Z',
    error: { code: 'VECTOR_REPLAY_FAILED' },
    policy: {
      baseDelayMs: 1000,
      maxDelayMs: 10_000,
      deadLetterAfterAttempts: 2
    }
  });

  assert.equal(report.accepted, true);
  assert.equal(report.status, 'previewed_not_applied');
  assert.equal(report.schemaReady, true);
  assert.equal(report.durablePersistencePreviewed, true);
  assert.equal(report.plannedUpdate.table, 'reconcile_queue');
  assert.deepEqual(report.plannedUpdate.where, {
    id: 7,
    memoryId: 'codex-process-cm1083-retry-preview',
    storeKind: 'vector'
  });
  assert.equal(report.plannedUpdate.applies, false);
  assert.equal(report.plannedUpdate.columns.retry_state, 'dead_letter');
  assert.equal(report.plannedUpdate.columns.retry_attempt_count, 2);
  assert.equal(report.plannedUpdate.columns.next_attempt_after, null);
  assert.equal(report.plannedUpdate.columns.last_attempt_at, '2026-05-25T12:00:05.000Z');
  assert.equal(report.plannedUpdate.columns.last_error_code, 'vector_replay_failed');
  assert.equal(report.retryBackoffMetadata.rawErrorStored, false);
  assert.equal(report.retryBackoffMetadata.requiresExplicitReplay, true);
  assert.equal(report.applyGate.applyExecuted, false);
});

test('CM-1083 store-backed preview reads temp-local queue metadata and blocks on missing durable columns', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1083-missing-schema-'));
  const shadowStore = new SqliteShadowStore(createConfig(rootPath));

  try {
    const task = await createQueuedTask(shadowStore);
    const report = await buildStoreBackedReconcileRetryBackoffPersistencePreview({
      shadowStore,
      taskId: task.id,
      failedAt: '2026-05-25T12:10:00.000Z',
      error: 'synthetic temp-local replay failure'
    });

    assert.equal(report.accepted, false);
    assert.equal(report.status, 'blocked');
    assert.ok(report.blockerReasons.includes('reconcile_queue_retry_columns_missing'));
    assert.equal(report.plannedUpdate, null);

    const queuedAfterPreview = await shadowStore.listReconcileTasks(10);
    assert.equal(queuedAfterPreview.length, 1);
    assert.equal(queuedAfterPreview[0].id, task.id);
    assert.equal(queuedAfterPreview[0].retryBackoffMetadata, null);
  } finally {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});

test('CM-1083 store-backed preview remains no-apply with temp-local retry columns present', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1083-preview-schema-'));
  const shadowStore = new SqliteShadowStore(createConfig(rootPath));

  try {
    await shadowStore.ensureReady();
    for (const column of REQUIRED_RECONCILE_RETRY_COLUMNS) {
      const type = column === 'retry_attempt_count' ? 'INTEGER' : 'TEXT';
      shadowStore.db.exec(`ALTER TABLE reconcile_queue ADD COLUMN ${column} ${type}`);
    }
    const task = await createQueuedTask(shadowStore);

    const report = await buildStoreBackedReconcileRetryBackoffPersistencePreview({
      shadowStore,
      taskId: task.id,
      failedAt: '2026-05-25T12:20:00.000Z',
      error: { name: 'ChunkReplayFailed' },
      policy: {
        baseDelayMs: 2000,
        maxDelayMs: 20_000,
        deadLetterAfterAttempts: 4
      }
    });

    assert.equal(report.accepted, true);
    assert.equal(report.status, 'previewed_not_applied');
    assert.equal(report.plannedUpdate.applies, false);
    assert.equal(report.plannedUpdate.columns.retry_state, 'deferred');
    assert.equal(report.plannedUpdate.columns.retry_attempt_count, 1);
    assert.equal(report.plannedUpdate.columns.next_attempt_after, '2026-05-25T12:20:02.000Z');
    assert.equal(report.plannedUpdate.columns.last_error_code, 'chunkreplayfailed');
    assert.equal(report.applyGate.applyApproved, false);
    assert.equal(report.applyGate.applyExecuted, false);
    assert.equal(report.applyGate.schemaMigrationApplied, false);

    const rowAfterPreview = shadowStore.db.prepare(`
      SELECT retry_metadata_json, retry_state, retry_attempt_count
      FROM reconcile_queue
      WHERE id = ?
    `).get(task.id);
    assert.equal(rowAfterPreview.retry_metadata_json, null);
    assert.equal(rowAfterPreview.retry_state, null);
    assert.equal(rowAfterPreview.retry_attempt_count, null);
  } finally {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});

test('CM-1083 preview rejects apply and does not expand public MCP tools', () => {
  const report = buildReconcileRetryBackoffPersistencePreview({
    task: fixtureTask(),
    availableColumns: [...BASE_COLUMNS, ...REQUIRED_RECONCILE_RETRY_COLUMNS],
    applyApproved: true
  });

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('apply_requested_but_not_allowed_in_cm1083'));
  assert.equal(report.applyGate.applyExecuted, false);
  assert.deepEqual(publicToolNames(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory', 'supersede_memory', 'tombstone_memory', 'validate_memory']);
});
