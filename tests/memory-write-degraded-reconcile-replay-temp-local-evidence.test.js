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
const { ChunkIndexingService } = require('../src/recall/ChunkIndexingService');

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

function createConfig(rootPath) {
  return {
    defaultRequestSource: 'cm1034-degraded-reconcile-replay-temp-local-evidence',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    embeddingFingerprint: 'cm1034-temp-local-degraded-reconcile-replay-v1',
    embedDimensions: 32,
    enableShadowWrites: true,
    enableVectorIndex: true,
    enableEmbeddingCache: true,
    chunkMaxChars: 512,
    chunkOverlapChars: 64
  };
}

function processPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-1034 degraded reconcile replay temp-local evidence',
    content: [
      'Type: checkpoint',
      'CM1034 degraded reconcile replay temp local marker',
      'Purpose: prove degraded temp-local reconcile payload can replay vector and chunk projections.',
      'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'cm1034 synthetic temp-local degraded reconcile replay evidence',
    validated: true,
    reusable: false,
    tags: ['cm1034', 'write', 'degraded', 'reconcile', 'replay', 'temp-local'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'cm1034-degraded-reconcile-workspace',
    client_id: 'codex',
    task_id: 'CM-1034',
    conversation_id: 'cm1034-degraded-reconcile-temp-local',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('CM-1034 degraded temp-local reconcile payload can replay vector and chunk projections', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1034-reconcile-replay-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const healthyVectorStore = new VectorIndexStore(config);
  const auditEvents = [];
  const auditLogStore = new AuditLogStore(config);
  const auditLogWrapper = {
    async appendWriteAudit(entry) {
      auditEvents.push(entry);
      await auditLogStore.appendWriteAudit(entry);
    }
  };
  const failingVectorStore = {
    ...healthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1034 synthetic vector projection failure');
    }
  };
  const failingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1034 synthetic chunk projection failure');
    }
  };
  const service = new MemoryWriteService({
    config,
    diaryStore: new DiaryStore(config),
    shadowStore,
    vectorStore: failingVectorStore,
    auditLogStore: auditLogWrapper,
    chunkIndexingService: failingChunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm1034-temp-local-fixture-agent',
        requestSource: 'cm1034-degraded-reconcile-replay-temp-local-evidence'
      }),
      isWritableByCodex: () => true
    }
  });

  try {
    for (const targetPath of [
      config.dailyNoteRootPath,
      config.dbPath,
      config.auditLogPath,
      config.vectorIndexPath
    ]) {
      assertInsideRoot(rootPath, targetPath);
    }

    const result = await service.record(processPayload());

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.equal(result.shadowWrite.status, 'degraded');
    assert.deepEqual(result.shadowWrite.failures.sort(), [
      'chunks:cm1034 synthetic chunk projection failure',
      'vector:cm1034 synthetic vector projection failure'
    ]);
    assert.equal(await pathExists(result.filePath), true);

    const shadowBeforeReplay = await shadowStore.getHealth();
    assert.equal(shadowBeforeReplay.recordCount, 1);
    assert.equal(shadowBeforeReplay.chunkCount, 0);
    assert.equal(shadowBeforeReplay.reconcileCount, 2);

    const vectorBeforeReplay = await healthyVectorStore.getHealth();
    assert.equal(vectorBeforeReplay.vectorCount, 0);

    const queuedTasks = await shadowStore.listReconcileTasks(10);
    assert.deepEqual(queuedTasks.map(task => task.storeKind).sort(), ['chunks', 'vector']);
    for (const task of queuedTasks) {
      assert.equal(task.memoryId, result.memoryId);
      assert.equal(task.reason, 'shadow_write_failed');
      assert.equal(task.payload.memoryId, result.memoryId);
      assert.equal(task.payload.taskId, 'CM-1034');
      assert.equal(task.payload.visibility, 'project');
    }

    const vectorTask = queuedTasks.find(task => task.storeKind === 'vector');
    await healthyVectorStore.upsertRecord(vectorTask.payload);
    await shadowStore.clearReconcileTasks(result.memoryId, 'vector');

    const chunkTask = queuedTasks.find(task => task.storeKind === 'chunks');
    const healthyChunkIndexingService = new ChunkIndexingService({
      config,
      shadowStore,
      vectorStore: healthyVectorStore
    });
    const chunkReplay = await healthyChunkIndexingService.indexRecord(chunkTask.payload);
    await shadowStore.clearReconcileTasks(result.memoryId, 'chunks');

    assert.equal(chunkReplay.chunkCount >= 1, true);

    const shadowAfterReplay = await shadowStore.getHealth();
    assert.equal(shadowAfterReplay.recordCount, 1);
    assert.equal(shadowAfterReplay.chunkCount >= 1, true);
    assert.equal(shadowAfterReplay.reconcileCount, 0);

    const vectorAfterReplay = await healthyVectorStore.getHealth();
    assert.equal(vectorAfterReplay.vectorCount, 1);
    assert.equal(vectorAfterReplay.embeddingCacheCount >= 1, true);

    const auditEntries = await auditLogStore.readRecentWriteAudit(10);
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].decision, 'accepted');
    assert.equal(auditEntries[0].memoryId, result.memoryId);
    assert.equal(auditEntries[0].shadowWrite.status, 'degraded');
    assert.equal(auditEvents.length, 1);
    assert.equal(await pathExists(config.auditLogPath), true);
    assert.equal(await pathExists(result.filePath), true);
  } finally {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});
