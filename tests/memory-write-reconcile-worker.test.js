'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const { MemoryWriteReconcileService } = require('../src/core/MemoryWriteReconcileService');
const { MemoryWriteReconcileWorker, normalizeIntervalMs } = require('../src/core/MemoryWriteReconcileWorker');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const { DiaryStore } = require('../src/storage/DiaryStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');
const { AuditLogStore } = require('../src/storage/AuditLogStore');
const { ChunkIndexingService } = require('../src/recall/ChunkIndexingService');

class ManualScheduler {
  constructor() {
    this.timers = [];
  }

  setTimeout(callback, ms) {
    const handle = { callback, ms, cleared: false };
    this.timers.push(handle);
    return handle;
  }

  clearTimeout(handle) {
    if (handle) {
      handle.cleared = true;
    }
  }

  get activeCount() {
    return this.timers.filter(timer => !timer.cleared).length;
  }

  async flushNext() {
    const timer = this.timers.find(item => !item.cleared);
    if (!timer) {
      return false;
    }
    timer.cleared = true;
    await timer.callback();
    return true;
  }
}

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
    defaultRequestSource: 'cm1036-write-reconcile-worker-test',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    embeddingFingerprint: 'cm1036-temp-local-write-reconcile-worker-v1',
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
    title: 'Checkpoint: CM-1036 internal write reconcile worker',
    content: [
      'Type: checkpoint',
      'CM1036 internal write reconcile worker marker',
      'Purpose: prove explicit internal worker runOnce can drive queued temp-local projection replay.',
      'Boundary: synthetic temp-local files only, no real memory, no provider, no public MCP expansion, no readiness claim.'
    ].join('\n'),
    evidence: 'cm1036 synthetic temp-local write reconcile worker evidence',
    validated: true,
    reusable: false,
    tags: ['cm1036', 'write', 'reconcile', 'worker', 'temp-local'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'cm1036-write-reconcile-workspace',
    client_id: 'codex',
    task_id: 'CM-1036',
    conversation_id: 'cm1036-write-reconcile-worker-temp-local',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('CM-1036 internal reconcile worker is app-mounted idle without public MCP expansion', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1036-app-'));
  const app = createCodexMemoryApplication(createConfig(rootPath));

  try {
    assert.ok(app.services.memoryWriteReconcileWorker);
    assert.equal(typeof app.services.memoryWriteReconcileWorker.runOnce, 'function');
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    assert.deepEqual(publicToolNames(), ['memory_overview', 'record_memory', 'search_memory']);
    await assert.rejects(
      () => app.callTool('memory_write_reconcile_worker', {}),
      /Unknown tool: memory_write_reconcile_worker/
    );
  } finally {
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});

test('CM-1036 explicit worker runOnce replays queued temp-local vector and chunk projections', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1036-worker-runonce-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const healthyVectorStore = new VectorIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const failingVectorStore = {
    ...healthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1036 synthetic vector projection failure');
    }
  };
  const failingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1036 synthetic chunk projection failure');
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
        agentId: 'cm1036-temp-local-fixture-agent',
        requestSource: 'cm1036-write-reconcile-worker-test'
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
  const worker = new MemoryWriteReconcileWorker({
    reconcileService,
    limit: 10
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
    assert.equal(result.shadowWrite.status, 'degraded');
    assert.deepEqual((await shadowStore.listReconcileTasks(10)).map(task => task.storeKind).sort(), ['chunks', 'vector']);
    assert.equal(worker.isRunning(), false);

    const replay = await worker.runOnce();

    assert.equal(replay.success, true);
    assert.equal(replay.workerDecision, 'run_once_completed');
    assert.equal(replay.decision, 'completed');
    assert.equal(replay.replayedCount, 2);
    assert.equal(replay.clearedCount, 2);
    assert.equal(worker.isRunning(), false);

    const shadowAfterReplay = await shadowStore.getHealth();
    assert.equal(shadowAfterReplay.recordCount, 1);
    assert.equal(shadowAfterReplay.chunkCount >= 1, true);
    assert.equal(shadowAfterReplay.reconcileCount, 0);
    assert.equal((await healthyVectorStore.getHealth()).vectorCount, 1);
    assert.equal(await pathExists(result.filePath), true);
  } finally {
    worker.stop();
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1036 explicit worker start schedules bounded non-overlapping replay and can stop', async () => {
  const calls = [];
  const scheduler = new ManualScheduler();
  const reconcileService = {
    async replayPending(options) {
      calls.push(options);
      return {
        success: true,
        decision: 'completed',
        dryRun: options.dryRun === true,
        limit: options.limit,
        scannedTaskCount: 0,
        replayedCount: 0,
        clearedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: []
      };
    }
  };
  const worker = new MemoryWriteReconcileWorker({
    reconcileService,
    scheduler,
    intervalMs: 250,
    limit: 3
  });

  assert.equal(worker.isRunning(), false);
  assert.equal(calls.length, 0);

  const started = worker.start({ limit: 7, dryRun: true, maxRuns: 2 });

  assert.equal(started.decision, 'started');
  assert.equal(worker.isRunning(), true);
  assert.equal(scheduler.activeCount, 1);
  assert.equal(calls.length, 0);

  assert.equal(await scheduler.flushNext(), true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { limit: 7, dryRun: true });
  assert.equal(worker.isRunning(), true);
  assert.equal(scheduler.activeCount, 1);

  const stopped = worker.stop();

  assert.equal(stopped.decision, 'stopped');
  assert.equal(worker.isRunning(), false);
  assert.equal(scheduler.activeCount, 0);
  assert.equal(await scheduler.flushNext(), false);
  assert.equal(calls.length, 1);
});

test('CM-1036 normalizeIntervalMs bounds worker polling intervals', () => {
  assert.equal(normalizeIntervalMs(undefined), 60_000);
  assert.equal(normalizeIntervalMs(1), 100);
  assert.equal(normalizeIntervalMs('250'), 250);
  assert.equal(normalizeIntervalMs(999_999), 600_000);
});
