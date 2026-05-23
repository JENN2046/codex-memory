const { test } = require('node:test');
const assert = require('node:assert/strict');

const { MemoryWriteService } = require('../src/core/MemoryWriteService');

function createHarness(overrides = {}) {
  const events = {
    diaryWrites: [],
    shadowUpserts: [],
    vectorUpserts: [],
    chunkIndexes: [],
    reconcileTasks: [],
    auditWrites: []
  };

  const service = new MemoryWriteService({
    config: {
      defaultRequestSource: 'fixture',
      enableShadowWrites: true,
      enableVectorIndex: true,
      ...overrides.config
    },
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'fixture-agent',
        requestSource: 'fixture-test'
      }),
      isWritableByCodex: () => overrides.writableByCodex !== false
    },
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        if (overrides.failDiary) throw new Error('fixture diary failure');
        return {
          filePath: '<fixture-diary-path>',
          relativePath: '<fixture-relative-path>',
          fileContent: '<fixture-raw-file-content-redacted>'
        };
      }
    },
    shadowStore: {
      async upsertRecord(record) {
        events.shadowUpserts.push(record);
        if (overrides.failShadow) throw new Error('fixture shadow failure');
      },
      async clearReconcileTasks(memoryId, storeKind) {
        events.reconcileTasks.push({ action: 'clear', memoryId, storeKind });
      },
      async enqueueReconcileTask(task) {
        events.reconcileTasks.push({ action: 'enqueue', ...task });
      }
    },
    vectorStore: {
      async upsertRecord(record) {
        events.vectorUpserts.push(record);
        if (overrides.failVector) throw new Error('fixture vector failure');
      }
    },
    chunkIndexingService: {
      async indexRecord(record) {
        events.chunkIndexes.push(record);
        if (overrides.failChunks) throw new Error('fixture chunks failure');
      }
    },
    auditLogStore: {
      async appendWriteAudit(event) {
        events.auditWrites.push(event);
      }
    }
  });

  return { service, events };
}

function validProcessPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: fixture write reliability proof matrix',
    content: [
      'Type: fixture-write-proof',
      'Checkpoint: in-memory write boundary proof for codex-memory.',
      'Purpose: validate accepted write path without durable stores.',
      'Boundary: fixture-only; no provider, no search_memory, no .jsonl read, no readiness claim.'
    ].join('\n'),
    evidence: 'cm0833 fixture write matrix payload',
    validated: true,
    reusable: false,
    tags: ['codex-memory', 'write-proof-matrix'],
    sensitivity: 'none',
    client_id: 'codex',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('write matrix fixture rejects malformed process payload before durable write paths', async () => {
  const { service, events } = createHarness();

  const result = await service.record(validProcessPayload({
    title: 'Ordinary note',
    content: 'This content has no required process-memory signal.'
  }));

  assert.equal(result.decision, 'rejected');
  assert.match(result.reason, /process memory must include checkpoint/i);
  assert.equal(events.diaryWrites.length, 0);
  assert.equal(events.shadowUpserts.length, 0);
  assert.equal(events.vectorUpserts.length, 0);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].decision, 'rejected');
  assert.equal(events.auditWrites[0].memoryId, null);
});

test('write matrix fixture accepts sanitized process payload through in-memory projection paths', async () => {
  const { service, events } = createHarness();

  const result = await service.record(validProcessPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(result.success, true);
  assert.match(result.memoryId, /^codex-process-/);
  assert.equal(result.shadowWrite.status, 'ok');
  assert.equal(events.diaryWrites.length, 1);
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.vectorUpserts.length, 1);
  assert.equal(events.chunkIndexes.length, 1);
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].decision, 'accepted');
  assert.equal(events.auditWrites[0].shadowWrite.status, 'ok');
});

test('write matrix fixture degrades and enqueues shadow/vector projection failures without hiding counters', async () => {
  const { service, events } = createHarness({
    failShadow: true,
    failVector: true
  });

  const result = await service.record(validProcessPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(result.shadowWrite.status, 'degraded');
  assert.deepEqual(result.shadowWrite.failures.sort(), [
    'sqlite:fixture shadow failure',
    'vector:fixture vector failure'
  ]);
  assert.equal(events.diaryWrites.length, 1);
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.vectorUpserts.length, 1);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.reconcileTasks.filter(task => task.action === 'enqueue').length, 2);
  assert.equal(events.reconcileTasks.some(task => task.storeKind === 'chunks'), false);
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].shadowWrite.status, 'degraded');
});

test('write matrix fixture degrades chunk projection only after sqlite shadow is ready', async () => {
  const { service, events } = createHarness({
    failChunks: true
  });

  const result = await service.record(validProcessPayload());

  assert.equal(result.decision, 'accepted');
  assert.equal(result.shadowWrite.status, 'degraded');
  assert.deepEqual(result.shadowWrite.failures, ['chunks:fixture chunks failure']);
  assert.equal(events.diaryWrites.length, 1);
  assert.equal(events.shadowUpserts.length, 1);
  assert.equal(events.vectorUpserts.length, 1);
  assert.equal(events.chunkIndexes.length, 1);
  assert.equal(events.reconcileTasks.filter(task => task.action === 'enqueue').length, 1);
  assert.equal(events.reconcileTasks.find(task => task.action === 'enqueue').storeKind, 'chunks');
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].shadowWrite.status, 'degraded');
});

test('write matrix fixture rejects schema metadata before durable write paths', async () => {
  const { service, events } = createHarness();

  const result = await service.record(validProcessPayload({
    schema_version: 'v1'
  }));

  assert.equal(result.decision, 'rejected');
  assert.match(result.reason, /schema\/version metadata is not accepted/i);
  assert.equal(events.diaryWrites.length, 0);
  assert.equal(events.shadowUpserts.length, 0);
  assert.equal(events.vectorUpserts.length, 0);
  assert.equal(events.chunkIndexes.length, 0);
  assert.equal(events.auditWrites.length, 1);
  assert.equal(events.auditWrites[0].decision, 'rejected');
});
