'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const { MemoryWriteReconcileService, normalizeLimit } = require('../src/core/MemoryWriteReconcileService');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
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

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name).sort();
}

function createConfig(rootPath) {
  return {
    defaultRequestSource: 'cm1035-write-reconcile-service-test',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    embeddingFingerprint: 'cm1035-temp-local-write-reconcile-service-v1',
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
    title: 'Checkpoint: CM-1035 internal write reconcile service',
    content: [
      'Type: checkpoint',
      'CM1035 internal write reconcile service marker',
      'Purpose: prove default-idle internal reconcile replay can handle queued temp-local vector and chunk projections.',
      'Boundary: synthetic temp-local files only, no real memory, no provider, no public MCP expansion, no readiness claim.'
    ].join('\n'),
    evidence: 'cm1035 synthetic temp-local write reconcile service evidence',
    validated: true,
    reusable: false,
    tags: ['cm1035', 'write', 'reconcile', 'service', 'temp-local'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'cm1035-write-reconcile-workspace',
    client_id: 'codex',
    task_id: 'CM-1035',
    conversation_id: 'cm1035-write-reconcile-service-temp-local',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('CM-1035 internal write reconcile service is app-mounted without public MCP expansion', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1035-app-'));
  const app = createCodexMemoryApplication(createConfig(rootPath));

  try {
    assert.ok(app.services.memoryWriteReconcileService);
    assert.equal(typeof app.services.memoryWriteReconcileService.replayPending, 'function');
    assert.deepEqual(publicToolNames(), ['memory_overview', 'record_memory', 'search_memory']);
    await assert.rejects(
      () => app.callTool('memory_write_reconcile', {}),
      /Unknown tool: memory_write_reconcile/
    );
  } finally {
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});

test('CM-1035 internal write reconcile service dry-runs then replays queued vector and chunk projections', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1035-reconcile-service-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const healthyVectorStore = new VectorIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const failingVectorStore = {
    ...healthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1035 synthetic vector projection failure');
    }
  };
  const failingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1035 synthetic chunk projection failure');
    }
  };
  const writeService = new MemoryWriteService({
    config,
    diaryStore: new DiaryStore(config),
    shadowStore,
    vectorStore: failingVectorStore,
    auditLogStore,
    chunkIndexingService: failingChunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm1035-temp-local-fixture-agent',
        requestSource: 'cm1035-write-reconcile-service-test'
      }),
      isWritableByCodex: () => true
    }
  });
  const reconcileService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore: healthyVectorStore,
    chunkIndexingService: new ChunkIndexingService({
      config,
      shadowStore,
      vectorStore: healthyVectorStore
    })
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

    const result = await writeService.record(processPayload());

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.equal(result.shadowWrite.status, 'degraded');
    assert.deepEqual(result.shadowWrite.failures.sort(), [
      'chunks:cm1035 synthetic chunk projection failure',
      'vector:cm1035 synthetic vector projection failure'
    ]);

    const queuedTasks = await shadowStore.listReconcileTasks(10);
    assert.deepEqual(queuedTasks.map(task => task.storeKind).sort(), ['chunks', 'vector']);

    const dryRun = await reconcileService.replayPending({ limit: 10, dryRun: true });

    assert.equal(dryRun.success, true);
    assert.equal(dryRun.decision, 'dry_run_completed');
    assert.equal(dryRun.scannedTaskCount, 2);
    assert.equal(dryRun.wouldReplayCount, 2);
    assert.equal(dryRun.replayedCount, 0);
    assert.equal(dryRun.clearedCount, 0);
    assert.deepEqual(dryRun.results.map(item => item.status).sort(), ['would_replay', 'would_replay']);

    const shadowAfterDryRun = await shadowStore.getHealth();
    assert.equal(shadowAfterDryRun.chunkCount, 0);
    assert.equal(shadowAfterDryRun.reconcileCount, 2);
    assert.equal((await healthyVectorStore.getHealth()).vectorCount, 0);

    const replay = await reconcileService.replayPending({ limit: 10 });

    assert.equal(replay.success, true);
    assert.equal(replay.decision, 'completed');
    assert.equal(replay.scannedTaskCount, 2);
    assert.equal(replay.replayedCount, 2);
    assert.equal(replay.clearedCount, 2);
    assert.equal(replay.failedCount, 0);
    assert.deepEqual(replay.results.map(item => item.storeKind).sort(), ['chunks', 'vector']);

    const shadowAfterReplay = await shadowStore.getHealth();
    assert.equal(shadowAfterReplay.recordCount, 1);
    assert.equal(shadowAfterReplay.chunkCount >= 1, true);
    assert.equal(shadowAfterReplay.reconcileCount, 0);

    const vectorAfterReplay = await healthyVectorStore.getHealth();
    assert.equal(vectorAfterReplay.vectorCount, 1);
    assert.equal(vectorAfterReplay.embeddingCacheCount >= 1, true);
    assert.equal(await pathExists(result.filePath), true);
  } finally {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1035 internal write reconcile service keeps malformed tasks queued and reports failure', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1035-malformed-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const reconcileService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore: new VectorIndexStore(config),
    chunkIndexingService: new ChunkIndexingService({
      config,
      shadowStore,
      vectorStore: new VectorIndexStore(config)
    })
  });

  try {
    await shadowStore.enqueueReconcileTask({
      memoryId: 'codex-process-cm1035-malformed',
      storeKind: 'vector',
      reason: 'cm1035 missing replay payload',
      payload: {}
    });

    const replay = await reconcileService.replayPending({ limit: 10 });

    assert.equal(replay.success, false);
    assert.equal(replay.decision, 'completed_with_failures');
    assert.equal(replay.failedCount, 1);
    assert.equal(replay.clearedCount, 0);
    assert.match(replay.results[0].error, /missing replay payload/);

    const queuedTasks = await shadowStore.listReconcileTasks(10);
    assert.equal(queuedTasks.length, 1);
    assert.equal(queuedTasks[0].memoryId, 'codex-process-cm1035-malformed');
  } finally {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1035 internal write reconcile service replays queued sqlite projection payloads', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1035-sqlite-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const memoryId = 'codex-process-cm1035-sqlite-replay';
  const reconcileService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore: new VectorIndexStore(config)
  });

  try {
    await shadowStore.enqueueReconcileTask({
      memoryId,
      storeKind: 'sqlite',
      reason: 'cm1035 sqlite projection replay',
      payload: {
        memoryId,
        target: 'process',
        title: 'Checkpoint: CM-1035 sqlite replay',
        content: 'Type: checkpoint\nCM1035 sqlite queued replay marker',
        evidence: 'cm1035 sqlite queued replay evidence',
        tags: ['cm1035', 'sqlite', 'reconcile'],
        validated: true,
        reusable: false,
        sensitivity: 'none',
        projectId: 'codex-memory',
        workspaceId: 'cm1035-sqlite-workspace',
        clientId: 'codex',
        taskId: 'CM-1035',
        conversationId: 'cm1035-sqlite-replay',
        visibility: 'project',
        retentionPolicy: 'keep'
      }
    });

    const beforeReplay = await shadowStore.getHealth();
    assert.equal(beforeReplay.recordCount, 0);
    assert.equal(beforeReplay.reconcileCount, 1);

    const replay = await reconcileService.replayPending({ limit: 10 });

    assert.equal(replay.success, true);
    assert.equal(replay.replayedCount, 1);
    assert.equal(replay.clearedCount, 1);
    assert.equal(replay.results[0].storeKind, 'sqlite');

    const afterReplay = await shadowStore.getHealth();
    assert.equal(afterReplay.recordCount, 1);
    assert.equal(afterReplay.reconcileCount, 0);
  } finally {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1035 normalizeLimit bounds reconcile scans', () => {
  assert.equal(normalizeLimit(undefined), 50);
  assert.equal(normalizeLimit(0), 50);
  assert.equal(normalizeLimit('12'), 12);
  assert.equal(normalizeLimit(9999), 500);
});
