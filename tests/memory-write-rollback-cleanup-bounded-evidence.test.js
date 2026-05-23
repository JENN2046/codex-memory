const { test } = require('node:test');
const assert = require('node:assert/strict');

const { MemoryWriteService } = require('../src/core/MemoryWriteService');

const runtimeScope = Object.freeze({
  projectId: 'codex-memory',
  workspaceId: 'cm-0842-rollback-cleanup-workspace',
  clientId: 'codex',
  taskId: 'CM-0842',
  conversationId: 'write-rollback-cleanup-bounded-evidence',
  visibility: 'project',
  retentionPolicy: 'keep'
});

function validProcessPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-0842 rollback cleanup bounded evidence',
    content: [
      'Checkpoint: bounded rollback cleanup accounting fixture.',
      'Purpose: prove projection and partial cleanup posture without real memory.',
      'Boundary: fixture-only; no provider, no search_memory, no cleanup apply, no readiness claim.'
    ].join('\n'),
    evidence: 'CM-0842 fixture-only rollback cleanup evidence.',
    tags: ['cm-0842', 'rollback-cleanup'],
    sensitivity: 'none',
    validated: true,
    reusable: false,
    project_id: runtimeScope.projectId,
    workspace_id: runtimeScope.workspaceId,
    client_id: runtimeScope.clientId,
    task_id: runtimeScope.taskId,
    conversation_id: runtimeScope.conversationId,
    visibility: runtimeScope.visibility,
    retention_policy: runtimeScope.retentionPolicy,
    ...overrides
  };
}

function createHarness(overrides = {}) {
  const events = {
    diaryWrites: [],
    shadowUpserts: [],
    shadowDeletes: [],
    vectorUpserts: [],
    vectorDeletes: [],
    chunkIndexes: [],
    reconcileTasks: [],
    auditWrites: [],
    cacheInvalidations: [],
    realSideEffects: {
      trueLiveRecordMemoryCalls: 0,
      trueLiveSearchMemoryCalls: 0,
      realMemoryReads: 0,
      directJsonlReads: 0,
      providerCalls: 0,
      durableRealMemoryWrites: 0,
      durableRealAuditWrites: 0,
      cleanupApply: 0,
      rollbackApply: 0,
      publicMcpExpansion: 0
    }
  };

  const executionContext = {
    agentAlias: 'Codex',
    agentId: 'cm-0842-fixture-agent',
    requestSource: 'cm-0842-fixture',
    ...runtimeScope,
    ...overrides.executionContext
  };

  const service = new MemoryWriteService({
    config: {
      defaultRequestSource: 'cm-0842-fixture',
      enableShadowWrites: true,
      enableVectorIndex: true,
      ...overrides.config
    },
    executionContextResolver: {
      resolve: () => executionContext,
      isWritableByCodex: () => true
    },
    writePreflightEnabled: overrides.writePreflightEnabled === true,
    writePreflightCandidateProvider: async request => {
      if (typeof overrides.candidateProvider === 'function') {
        return overrides.candidateProvider(request);
      }
      return [];
    },
    diaryStore: {
      async writeRecord(record) {
        events.diaryWrites.push(record);
        if (overrides.failDiary) throw new Error('cm-0842 diary failure');
        return {
          filePath: '<cm-0842-fixture-diary-path>',
          relativePath: '<cm-0842-fixture-relative-path>',
          fileContent: '<cm-0842-fixture-raw-content-redacted>'
        };
      }
    },
    shadowStore: {
      async upsertRecord(record) {
        events.shadowUpserts.push(record);
        if (overrides.failShadow) throw new Error('cm-0842 sqlite failure');
      },
      async deleteRecord(memoryId) {
        events.shadowDeletes.push({ memoryId });
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
        if (overrides.failVector) throw new Error('cm-0842 vector failure');
      },
      async deleteRecord(memoryId) {
        events.vectorDeletes.push({ memoryId });
      }
    },
    chunkIndexingService: {
      async indexRecord(record) {
        events.chunkIndexes.push(record);
        if (overrides.failChunks) throw new Error('cm-0842 chunks failure');
      }
    },
    auditLogStore: {
      async appendWriteAudit(event) {
        events.auditWrites.push(event);
      }
    }
  });

  async function simulatePartialCleanup(memoryId) {
    await service.shadowStore.deleteRecord(memoryId);
    await service.vectorStore.deleteRecord(memoryId);
    events.cacheInvalidations.push({ memoryId, mode: 'fixture-only-simulated' });
  }

  return { service, events, simulatePartialCleanup };
}

function summarizePosture(events) {
  return {
    diaryWritten: events.diaryWrites.length,
    sqliteProjected: events.shadowUpserts.length,
    vectorProjected: events.vectorUpserts.length,
    chunksProjected: events.chunkIndexes.length,
    auditEvents: events.auditWrites.length,
    reconcileEnqueued: events.reconcileTasks.filter(task => task.action === 'enqueue').length,
    sqliteDeletes: events.shadowDeletes.length,
    vectorDeletes: events.vectorDeletes.length,
    cacheInvalidations: events.cacheInvalidations.length,
    residuals: {
      diaryNeedsSeparateHandling: events.diaryWrites.length > 0,
      auditAppendOnly: true,
      reconcileNeedsSeparateHandling: events.reconcileTasks.some(task => task.action === 'enqueue')
    },
    cleanupClassification: (
      events.shadowDeletes.length > 0 || events.vectorDeletes.length > 0
    ) ? 'partial_cleanup_only' : 'no_cleanup_invoked'
  };
}

function assertNoRealSideEffects(events) {
  assert.deepEqual(events.realSideEffects, {
    trueLiveRecordMemoryCalls: 0,
    trueLiveSearchMemoryCalls: 0,
    realMemoryReads: 0,
    directJsonlReads: 0,
    providerCalls: 0,
    durableRealMemoryWrites: 0,
    durableRealAuditWrites: 0,
    cleanupApply: 0,
    rollbackApply: 0,
    publicMcpExpansion: 0
  });
}

test('CM-0842 validation-rejected write leaves no projection and only rejected audit accounting', async () => {
  const { service, events } = createHarness();

  const result = await service.record(validProcessPayload({
    title: 'Ordinary note',
    content: 'Plain note without required process marker terms.'
  }));
  const posture = summarizePosture(events);

  assert.equal(result.decision, 'rejected');
  assert.equal(posture.diaryWritten, 0);
  assert.equal(posture.sqliteProjected, 0);
  assert.equal(posture.vectorProjected, 0);
  assert.equal(posture.chunksProjected, 0);
  assert.equal(posture.auditEvents, 1);
  assert.equal(events.auditWrites[0].decision, 'rejected');
  assert.equal(posture.cleanupClassification, 'no_cleanup_invoked');
  assertNoRealSideEffects(events);
});

test('CM-0842 preflight-rejected write leaves no projection and preserves normal rejected audit', async () => {
  const payload = validProcessPayload();
  const { service, events } = createHarness({
    writePreflightEnabled: true,
    candidateProvider: async request => [
      {
        memoryId: 'cm-0842-active-duplicate',
        lifecycleStatus: 'active',
        canonicalHash: request.canonicalHash,
        ...payload
      }
    ]
  });

  const result = await service.record(payload);
  const posture = summarizePosture(events);

  assert.equal(result.decision, 'rejected');
  assert.equal(result.writePreflight.decision, 'duplicate_suppressed');
  assert.equal(posture.diaryWritten, 0);
  assert.equal(posture.sqliteProjected, 0);
  assert.equal(posture.vectorProjected, 0);
  assert.equal(posture.chunksProjected, 0);
  assert.equal(posture.auditEvents, 1);
  assert.equal(events.auditWrites[0].decision, 'rejected');
  assert.equal(events.auditWrites[0].writePreflight, undefined);
  assertNoRealSideEffects(events);
});

test('CM-0842 accepted write exposes projection accounting and partial cleanup posture', async () => {
  const { service, events, simulatePartialCleanup } = createHarness();

  const result = await service.record(validProcessPayload());
  await simulatePartialCleanup(result.memoryId);
  const posture = summarizePosture(events);

  assert.equal(result.decision, 'accepted');
  assert.equal(result.shadowWrite.status, 'ok');
  assert.equal(posture.diaryWritten, 1);
  assert.equal(posture.sqliteProjected, 1);
  assert.equal(posture.vectorProjected, 1);
  assert.equal(posture.chunksProjected, 1);
  assert.equal(posture.auditEvents, 1);
  assert.equal(posture.sqliteDeletes, 1);
  assert.equal(posture.vectorDeletes, 1);
  assert.equal(posture.cacheInvalidations, 1);
  assert.equal(posture.cleanupClassification, 'partial_cleanup_only');
  assert.equal(posture.residuals.diaryNeedsSeparateHandling, true);
  assert.equal(posture.residuals.auditAppendOnly, true);
  assert.equal(posture.residuals.reconcileNeedsSeparateHandling, false);
  assertNoRealSideEffects(events);
});

test('CM-0842 degraded accepted write exposes residual projection and reconcile accounting', async () => {
  const { service, events, simulatePartialCleanup } = createHarness({
    failVector: true,
    failChunks: true
  });

  const result = await service.record(validProcessPayload());
  await simulatePartialCleanup(result.memoryId);
  const posture = summarizePosture(events);

  assert.equal(result.decision, 'accepted');
  assert.equal(result.shadowWrite.status, 'degraded');
  assert.deepEqual(result.shadowWrite.failures.sort(), [
    'chunks:cm-0842 chunks failure',
    'vector:cm-0842 vector failure'
  ]);
  assert.equal(posture.diaryWritten, 1);
  assert.equal(posture.sqliteProjected, 1);
  assert.equal(posture.vectorProjected, 1);
  assert.equal(posture.chunksProjected, 1);
  assert.equal(posture.reconcileEnqueued, 2);
  assert.equal(posture.cleanupClassification, 'partial_cleanup_only');
  assert.equal(posture.residuals.diaryNeedsSeparateHandling, true);
  assert.equal(posture.residuals.auditAppendOnly, true);
  assert.equal(posture.residuals.reconcileNeedsSeparateHandling, true);
  assertNoRealSideEffects(events);
});
