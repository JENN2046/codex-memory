'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const { DiaryStore } = require('../src/storage/DiaryStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');
const { AuditLogStore } = require('../src/storage/AuditLogStore');
const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function assertInsideRoot(rootPath, targetPath) {
  const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  assert.equal(relativePath.startsWith('..'), false);
  assert.equal(path.isAbsolute(relativePath), false);
}

async function createTempLocalHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1032-degraded-cleanup-'));
  const config = {
    defaultRequestSource: 'cm1032-degraded-cleanup-temp-local-evidence',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    candidateCachePath: path.join(rootPath, 'cache', 'candidate-cache.json'),
    embeddingFingerprint: 'cm1032-temp-local-degraded-cleanup-v1',
    embedDimensions: 32,
    enableShadowWrites: true,
    enableVectorIndex: true,
    enableEmbeddingCache: true,
    enableCandidateCache: true,
    candidateCacheMaxEntries: 10,
    candidateCacheTtlMs: 60_000,
    chunkMaxChars: 512,
    chunkOverlapChars: 64
  };

  const diaryStore = new DiaryStore(config);
  const shadowStore = new SqliteShadowStore(config);
  const vectorStore = new VectorIndexStore(config);
  const auditEvents = [];
  const auditLogStore = new AuditLogStore(config);
  const auditLogWrapper = {
    async appendWriteAudit(entry) {
      auditEvents.push(entry);
      await auditLogStore.appendWriteAudit(entry);
    }
  };
  const candidateCacheStore = new CandidateCacheStore(config);
  const failingVectorStore = {
    ...vectorStore,
    async upsertRecord() {
      throw new Error('cm1032 synthetic vector projection failure');
    }
  };
  const failingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1032 synthetic chunk projection failure');
    }
  };
  const service = new MemoryWriteService({
    config,
    diaryStore,
    shadowStore,
    vectorStore: failingVectorStore,
    auditLogStore: auditLogWrapper,
    chunkIndexingService: failingChunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm1032-temp-local-fixture-agent',
        requestSource: 'cm1032-degraded-cleanup-temp-local-evidence'
      }),
      isWritableByCodex: () => true
    }
  });

  async function cleanup() {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  return {
    auditEvents,
    candidateCacheStore,
    cleanup,
    config,
    rootPath,
    service,
    shadowStore,
    vectorStore
  };
}

function processPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-1032 degraded cleanup temp-local evidence',
    content: [
      'Type: checkpoint',
      'CM1032 write degraded cleanup temp local marker',
      'Purpose: prove degraded temp-local projection residuals remain visible.',
      'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'cm1032 synthetic temp-local degraded cleanup evidence',
    validated: true,
    reusable: false,
    tags: ['cm1032', 'write', 'degraded', 'rollback', 'cleanup', 'temp-local'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'cm1032-degraded-cleanup-workspace',
    client_id: 'codex',
    task_id: 'CM-1032',
    conversation_id: 'cm1032-degraded-cleanup-temp-local',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('CM-1032 degraded temp-local write keeps reconcile residuals visible after partial cleanup', async () => {
  const harness = await createTempLocalHarness();

  try {
    for (const targetPath of [
      harness.config.dailyNoteRootPath,
      harness.config.dbPath,
      harness.config.auditLogPath,
      harness.config.vectorIndexPath,
      harness.config.candidateCachePath
    ]) {
      assertInsideRoot(harness.rootPath, targetPath);
    }

    const result = await harness.service.record(processPayload());

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.equal(result.shadowWrite.status, 'degraded');
    assert.deepEqual(result.shadowWrite.failures.sort(), [
      'chunks:cm1032 synthetic chunk projection failure',
      'vector:cm1032 synthetic vector projection failure'
    ]);
    assertInsideRoot(harness.rootPath, result.filePath);
    assert.equal(await pathExists(result.filePath), true);

    const shadowBeforeCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowBeforeCleanup.recordCount, 1);
    assert.equal(shadowBeforeCleanup.chunkCount, 0);
    assert.equal(shadowBeforeCleanup.reconcileCount, 2);

    const vectorBeforeCleanup = await harness.vectorStore.getHealth();
    assert.equal(vectorBeforeCleanup.vectorCount, 0);

    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].decision, 'accepted');
    assert.equal(harness.auditEvents[0].shadowWrite.status, 'degraded');
    assert.equal(await pathExists(harness.config.auditLogPath), true);

    await harness.candidateCacheStore.set('cm1032-cache-entry', {
      resultMemoryIds: [result.memoryId]
    }, {
      target: 'process',
      memoryIds: [result.memoryId]
    });
    const cacheBeforeCleanup = await harness.candidateCacheStore.getHealth();
    assert.equal(cacheBeforeCleanup.entryCount, 1);
    assertInsideRoot(harness.rootPath, cacheBeforeCleanup.candidateCachePath);

    await harness.shadowStore.deleteRecord(result.memoryId);
    const vectorDeleted = await harness.vectorStore.deleteRecord(result.memoryId);
    const cacheEntriesRemoved = await harness.candidateCacheStore.clearCurrentFingerprintByMemoryIds(
      [result.memoryId],
      ['process']
    );

    const shadowAfterCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowAfterCleanup.recordCount, 0);
    assert.equal(shadowAfterCleanup.chunkCount, 0);
    assert.equal(shadowAfterCleanup.reconcileCount, 2);

    const vectorAfterCleanup = await harness.vectorStore.getHealth();
    assert.equal(vectorDeleted, false);
    assert.equal(vectorAfterCleanup.vectorCount, 0);

    const cacheAfterCleanup = await harness.candidateCacheStore.getHealth();
    assert.equal(cacheEntriesRemoved, 1);
    assert.equal(cacheAfterCleanup.entryCount, 0);

    assert.equal(await pathExists(result.filePath), true);
    assert.equal(await pathExists(harness.config.auditLogPath), true);
    assert.equal(harness.auditEvents.length, 1);
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('CM-1056 degraded temp-local cleanup clears reconcile residuals explicitly while preserving diary and audit evidence', async () => {
  const harness = await createTempLocalHarness();

  try {
    for (const targetPath of [
      harness.config.dailyNoteRootPath,
      harness.config.dbPath,
      harness.config.auditLogPath,
      harness.config.vectorIndexPath,
      harness.config.candidateCachePath
    ]) {
      assertInsideRoot(harness.rootPath, targetPath);
    }

    const result = await harness.service.record(processPayload({
      title: 'Checkpoint: CM-1056 degraded reconcile cleanup temp-local evidence',
      content: [
        'Type: checkpoint',
        'CM1056 write degraded reconcile cleanup temp local marker',
        'Purpose: prove explicit reconcile queue cleanup can clear degraded residuals after projection cleanup.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1056 synthetic temp-local degraded reconcile cleanup evidence',
      tags: ['cm1056', 'write', 'degraded', 'reconcile', 'rollback', 'cleanup', 'temp-local'],
      workspace_id: 'cm1056-degraded-reconcile-cleanup-workspace',
      task_id: 'CM-1056',
      conversation_id: 'cm1056-degraded-reconcile-cleanup-temp-local'
    }));

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.equal(result.shadowWrite.status, 'degraded');
    assert.deepEqual(result.shadowWrite.failures.sort(), [
      'chunks:cm1032 synthetic chunk projection failure',
      'vector:cm1032 synthetic vector projection failure'
    ]);
    assertInsideRoot(harness.rootPath, result.filePath);
    assert.equal(await pathExists(result.filePath), true);

    const shadowBeforeCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowBeforeCleanup.recordCount, 1);
    assert.equal(shadowBeforeCleanup.chunkCount, 0);
    assert.equal(shadowBeforeCleanup.reconcileCount, 2);

    const tasksBeforeCleanup = await harness.shadowStore.listReconcileTasks(10);
    assert.equal(tasksBeforeCleanup.length, 2);
    assert.deepEqual(tasksBeforeCleanup.map(task => task.storeKind).sort(), ['chunks', 'vector']);
    assert.deepEqual(tasksBeforeCleanup.map(task => task.memoryId), [result.memoryId, result.memoryId]);
    assert.deepEqual(tasksBeforeCleanup.map(task => task.payload.memoryId), [result.memoryId, result.memoryId]);

    const vectorBeforeCleanup = await harness.vectorStore.getHealth();
    assert.equal(vectorBeforeCleanup.vectorCount, 0);

    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].decision, 'accepted');
    assert.equal(harness.auditEvents[0].shadowWrite.status, 'degraded');
    assert.equal(await pathExists(harness.config.auditLogPath), true);

    await harness.candidateCacheStore.set('cm1056-cache-entry', {
      resultMemoryIds: [result.memoryId]
    }, {
      target: 'process',
      memoryIds: [result.memoryId]
    });
    const cacheBeforeCleanup = await harness.candidateCacheStore.getHealth();
    assert.equal(cacheBeforeCleanup.entryCount, 1);
    assertInsideRoot(harness.rootPath, cacheBeforeCleanup.candidateCachePath);

    await harness.shadowStore.deleteRecord(result.memoryId);
    const vectorDeleted = await harness.vectorStore.deleteRecord(result.memoryId);
    const cacheEntriesRemoved = await harness.candidateCacheStore.clearCurrentFingerprintByMemoryIds(
      [result.memoryId],
      ['process']
    );

    const shadowAfterProjectionCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowAfterProjectionCleanup.recordCount, 0);
    assert.equal(shadowAfterProjectionCleanup.chunkCount, 0);
    assert.equal(shadowAfterProjectionCleanup.reconcileCount, 2);

    const vectorAfterProjectionCleanup = await harness.vectorStore.getHealth();
    assert.equal(vectorDeleted, false);
    assert.equal(vectorAfterProjectionCleanup.vectorCount, 0);

    const cacheAfterProjectionCleanup = await harness.candidateCacheStore.getHealth();
    assert.equal(cacheEntriesRemoved, 1);
    assert.equal(cacheAfterProjectionCleanup.entryCount, 0);

    await harness.shadowStore.clearReconcileTasks(result.memoryId);

    const shadowAfterReconcileCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowAfterReconcileCleanup.recordCount, 0);
    assert.equal(shadowAfterReconcileCleanup.chunkCount, 0);
    assert.equal(shadowAfterReconcileCleanup.reconcileCount, 0);

    const tasksAfterReconcileCleanup = await harness.shadowStore.listReconcileTasks(10);
    assert.deepEqual(tasksAfterReconcileCleanup, []);

    const vectorAfterReconcileCleanup = await harness.vectorStore.getHealth();
    assert.equal(vectorAfterReconcileCleanup.vectorCount, 0);

    const cacheAfterReconcileCleanup = await harness.candidateCacheStore.getHealth();
    assert.equal(cacheAfterReconcileCleanup.entryCount, 0);

    assert.equal(await pathExists(result.filePath), true);
    assert.equal(await pathExists(harness.config.auditLogPath), true);
    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].shadowWrite.status, 'degraded');
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('CM-1057 degraded temp-local cleanup can clear reconcile residuals by store kind without over-clearing', async () => {
  const harness = await createTempLocalHarness();

  try {
    for (const targetPath of [
      harness.config.dailyNoteRootPath,
      harness.config.dbPath,
      harness.config.auditLogPath,
      harness.config.vectorIndexPath,
      harness.config.candidateCachePath
    ]) {
      assertInsideRoot(harness.rootPath, targetPath);
    }

    const result = await harness.service.record(processPayload({
      title: 'Checkpoint: CM-1057 store-kind scoped reconcile cleanup temp-local evidence',
      content: [
        'Type: checkpoint',
        'CM1057 store-kind scoped reconcile cleanup temp local marker',
        'Purpose: prove explicit reconcile cleanup can remove one store kind without over-clearing another.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1057 synthetic temp-local store-kind reconcile cleanup evidence',
      tags: ['cm1057', 'write', 'degraded', 'reconcile', 'store-kind', 'cleanup', 'temp-local'],
      workspace_id: 'cm1057-store-kind-reconcile-cleanup-workspace',
      task_id: 'CM-1057',
      conversation_id: 'cm1057-store-kind-reconcile-cleanup-temp-local'
    }));

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.equal(result.shadowWrite.status, 'degraded');
    assert.deepEqual(result.shadowWrite.failures.sort(), [
      'chunks:cm1032 synthetic chunk projection failure',
      'vector:cm1032 synthetic vector projection failure'
    ]);
    assertInsideRoot(harness.rootPath, result.filePath);
    assert.equal(await pathExists(result.filePath), true);

    const queuedBeforeCleanup = await harness.shadowStore.listReconcileTasks(10);
    assert.equal(queuedBeforeCleanup.length, 2);
    assert.deepEqual(queuedBeforeCleanup.map(task => task.storeKind).sort(), ['chunks', 'vector']);
    assert.deepEqual(queuedBeforeCleanup.map(task => task.payload.memoryId), [result.memoryId, result.memoryId]);

    await harness.candidateCacheStore.set('cm1057-cache-entry', {
      resultMemoryIds: [result.memoryId]
    }, {
      target: 'process',
      memoryIds: [result.memoryId]
    });

    await harness.shadowStore.deleteRecord(result.memoryId);
    const vectorDeleted = await harness.vectorStore.deleteRecord(result.memoryId);
    const cacheEntriesRemoved = await harness.candidateCacheStore.clearCurrentFingerprintByMemoryIds(
      [result.memoryId],
      ['process']
    );

    const shadowAfterProjectionCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowAfterProjectionCleanup.recordCount, 0);
    assert.equal(shadowAfterProjectionCleanup.chunkCount, 0);
    assert.equal(shadowAfterProjectionCleanup.reconcileCount, 2);
    assert.equal(vectorDeleted, false);
    assert.equal(cacheEntriesRemoved, 1);

    await harness.shadowStore.clearReconcileTasks(result.memoryId, 'vector');

    const shadowAfterVectorCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowAfterVectorCleanup.recordCount, 0);
    assert.equal(shadowAfterVectorCleanup.chunkCount, 0);
    assert.equal(shadowAfterVectorCleanup.reconcileCount, 1);

    const queuedAfterVectorCleanup = await harness.shadowStore.listReconcileTasks(10);
    assert.equal(queuedAfterVectorCleanup.length, 1);
    assert.equal(queuedAfterVectorCleanup[0].memoryId, result.memoryId);
    assert.equal(queuedAfterVectorCleanup[0].storeKind, 'chunks');
    assert.equal(queuedAfterVectorCleanup[0].payload.memoryId, result.memoryId);

    await harness.shadowStore.clearReconcileTasks(result.memoryId, 'vector');
    const queuedAfterRepeatedVectorCleanup = await harness.shadowStore.listReconcileTasks(10);
    assert.equal(queuedAfterRepeatedVectorCleanup.length, 1);
    assert.equal(queuedAfterRepeatedVectorCleanup[0].storeKind, 'chunks');

    await harness.shadowStore.clearReconcileTasks(result.memoryId, 'chunks');

    const shadowAfterChunkCleanup = await harness.shadowStore.getHealth();
    assert.equal(shadowAfterChunkCleanup.recordCount, 0);
    assert.equal(shadowAfterChunkCleanup.chunkCount, 0);
    assert.equal(shadowAfterChunkCleanup.reconcileCount, 0);

    const queuedAfterChunkCleanup = await harness.shadowStore.listReconcileTasks(10);
    assert.deepEqual(queuedAfterChunkCleanup, []);

    const vectorAfterCleanup = await harness.vectorStore.getHealth();
    assert.equal(vectorAfterCleanup.vectorCount, 0);

    const cacheAfterCleanup = await harness.candidateCacheStore.getHealth();
    assert.equal(cacheAfterCleanup.entryCount, 0);

    assert.equal(await pathExists(result.filePath), true);
    assert.equal(await pathExists(harness.config.auditLogPath), true);
    assert.equal(harness.auditEvents.length, 1);
    assert.equal(harness.auditEvents[0].decision, 'accepted');
    assert.equal(harness.auditEvents[0].shadowWrite.status, 'degraded');
  } finally {
    await harness.cleanup();
  }

  assert.equal(await pathExists(harness.rootPath), false);
});
