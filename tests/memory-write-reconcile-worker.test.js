'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { MemoryWriteService } = require('../src/core/MemoryWriteService');
const { MemoryWriteReconcileService } = require('../src/core/MemoryWriteReconcileService');
const {
  MemoryWriteReconcileWorker,
  normalizeIntervalMs,
  summarizeResult
} = require('../src/core/MemoryWriteReconcileWorker');
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

test('CM-1038 worker keeps bounded scheduled loop non-overlapping across multiple ticks', async () => {
  const calls = [];
  const scheduler = new ManualScheduler();
  let releaseFirstReplay = null;
  const reconcileService = {
    async replayPending(options) {
      const callIndex = calls.length + 1;
      calls.push({ callIndex, ...options });

      if (callIndex === 1) {
        return new Promise(resolve => {
          releaseFirstReplay = () => resolve({
            success: false,
            decision: 'completed_with_failures',
            dryRun: options.dryRun === true,
            limit: options.limit,
            scannedTaskCount: 1,
            replayedCount: 0,
            wouldReplayCount: 0,
            clearedCount: 0,
            failedCount: 1,
            skippedCount: 0,
            error: 'cm1038 raw first replay failure for codex-process-cm1038',
            results: [{ memoryId: 'codex-process-cm1038-raw-result' }]
          });
        });
      }

      return {
        success: true,
        decision: 'completed',
        dryRun: options.dryRun === true,
        limit: options.limit,
        scannedTaskCount: 1,
        replayedCount: 1,
        wouldReplayCount: 0,
        clearedCount: 1,
        failedCount: 0,
        skippedCount: 0,
        results: [{ memoryId: 'codex-process-cm1038-second-raw-result' }]
      };
    }
  };
  const worker = new MemoryWriteReconcileWorker({
    reconcileService,
    scheduler,
    intervalMs: 250,
    limit: 11
  });

  worker.start({ dryRun: true, maxRuns: 2 });
  assert.equal(worker.isRunning(), true);
  assert.equal(scheduler.activeCount, 1);

  const firstFlush = scheduler.flushNext();

  assert.equal(calls.length, 1);
  assert.equal(worker.getStatus().tickInFlight, true);
  assert.equal(worker.getStatus().timerScheduled, false);

  const overlappingTickResult = await worker.tick();

  assert.equal(overlappingTickResult, null);
  assert.equal(calls.length, 1);

  releaseFirstReplay();
  await firstFlush;

  const afterFirstStatus = worker.getStatus();

  assert.equal(afterFirstStatus.running, true);
  assert.equal(afterFirstStatus.timerScheduled, true);
  assert.equal(afterFirstStatus.runCount, 1);
  assert.equal(afterFirstStatus.lastResultSummary.success, false);
  assert.equal(afterFirstStatus.lastResultSummary.hasError, true);
  assert.equal(JSON.stringify(afterFirstStatus).includes('codex-process-cm1038'), false);
  assert.deepEqual(calls[0], { callIndex: 1, limit: 11, dryRun: true });

  await scheduler.flushNext();

  const finalStatus = worker.getStatus();

  assert.equal(finalStatus.running, false);
  assert.equal(finalStatus.timerScheduled, false);
  assert.equal(finalStatus.tickInFlight, false);
  assert.equal(finalStatus.runCount, 2);
  assert.deepEqual(calls[1], { callIndex: 2, limit: 11, dryRun: true });
  assert.equal(calls.length, 2);
  assert.deepEqual(finalStatus.lastResultSummary, {
    success: true,
    decision: 'completed',
    workerDecision: 'run_once_completed',
    dryRun: true,
    limit: 11,
    scannedTaskCount: 1,
    replayedCount: 1,
    wouldReplayCount: 0,
    clearedCount: 1,
    failedCount: 0,
    skippedCount: 0,
    hasError: false
  });
  assert.equal(JSON.stringify(finalStatus).includes('codex-process-cm1038'), false);
});

test('CM-1039 explicit worker drains multiple temp-local reconcile tasks across bounded ticks', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1039-worker-drain-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const healthyVectorStore = new VectorIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const failingVectorStore = {
    ...healthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1039 synthetic vector projection failure');
    }
  };
  const failingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1039 synthetic chunk projection failure');
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
        agentId: 'cm1039-temp-local-fixture-agent',
        requestSource: 'cm1039-write-reconcile-worker-drain-test'
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
  const scheduler = new ManualScheduler();
  const worker = new MemoryWriteReconcileWorker({
    reconcileService,
    scheduler,
    intervalMs: 250,
    limit: 1
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

    const firstWrite = await writeService.record(processPayload({
      title: 'Checkpoint: CM-1039 internal write reconcile worker drain one',
      task_id: 'CM-1039-A',
      conversation_id: 'cm1039-write-reconcile-worker-temp-local-a'
    }));
    const secondWrite = await writeService.record(processPayload({
      title: 'Checkpoint: CM-1039 internal write reconcile worker drain two',
      task_id: 'CM-1039-B',
      conversation_id: 'cm1039-write-reconcile-worker-temp-local-b'
    }));

    assert.equal(firstWrite.decision, 'accepted');
    assert.equal(secondWrite.decision, 'accepted');
    assert.equal(firstWrite.shadowWrite.status, 'degraded');
    assert.equal(secondWrite.shadowWrite.status, 'degraded');
    assert.equal((await shadowStore.getHealth()).reconcileCount, 4);

    worker.start({ limit: 1, dryRun: false, maxRuns: 4 });

    for (let i = 0; i < 4; i += 1) {
      assert.equal(await scheduler.flushNext(), true);
    }

    const status = worker.getStatus();
    const shadowAfterReplay = await shadowStore.getHealth();
    const vectorAfterReplay = await healthyVectorStore.getHealth();

    assert.equal(status.running, false);
    assert.equal(status.timerScheduled, false);
    assert.equal(status.runCount, 4);
    assert.equal(status.lastResultSummary.success, true);
    assert.equal(status.lastResultSummary.limit, 1);
    assert.equal(status.lastResultSummary.replayedCount, 1);
    assert.equal(status.lastResultSummary.clearedCount, 1);
    assert.equal(shadowAfterReplay.recordCount, 2);
    assert.equal(shadowAfterReplay.reconcileCount, 0);
    assert.equal(shadowAfterReplay.chunkCount >= 2, true);
    assert.equal(vectorAfterReplay.vectorCount, 2);
    assert.equal(await pathExists(firstWrite.filePath), true);
    assert.equal(await pathExists(secondWrite.filePath), true);
    assert.equal(JSON.stringify(status).includes(firstWrite.memoryId), false);
    assert.equal(JSON.stringify(status).includes(secondWrite.memoryId), false);
  } finally {
    worker.stop();
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1040 worker retains failed temp-local reconcile tasks and later drains them after recovery', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1040-worker-recovery-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const healthyVectorStore = new VectorIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const initialFailingVectorStore = {
    ...healthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1040 synthetic initial vector projection failure');
    }
  };
  const initialFailingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1040 synthetic initial chunk projection failure');
    }
  };
  const writeService = new MemoryWriteService({
    config,
    diaryStore: new DiaryStore(config),
    shadowStore,
    vectorStore: initialFailingVectorStore,
    auditLogStore,
    chunkIndexingService: initialFailingChunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm1040-temp-local-fixture-agent',
        requestSource: 'cm1040-write-reconcile-worker-recovery-test'
      }),
      isWritableByCodex: () => true
    }
  });
  const failingReplayVectorStore = {
    ...healthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1040 synthetic replay vector projection failure');
    }
  };
  const failingReplayChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1040 synthetic replay chunk projection failure');
    }
  };
  const failingReplayService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore: failingReplayVectorStore,
    chunkIndexingService: failingReplayChunkIndexingService
  });
  const failingScheduler = new ManualScheduler();
  const failingWorker = new MemoryWriteReconcileWorker({
    reconcileService: failingReplayService,
    scheduler: failingScheduler,
    intervalMs: 250,
    limit: 1
  });
  const healthyReplayService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore: healthyVectorStore,
    chunkIndexingService: new ChunkIndexingService({
      config,
      shadowStore,
      vectorStore: healthyVectorStore
    })
  });
  const recoveryScheduler = new ManualScheduler();
  const recoveryWorker = new MemoryWriteReconcileWorker({
    reconcileService: healthyReplayService,
    scheduler: recoveryScheduler,
    intervalMs: 250,
    limit: 1
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

    const writeResult = await writeService.record(processPayload({
      title: 'Checkpoint: CM-1040 internal write reconcile worker failure recovery',
      task_id: 'CM-1040',
      conversation_id: 'cm1040-write-reconcile-worker-temp-local-recovery'
    }));

    assert.equal(writeResult.decision, 'accepted');
    assert.equal(writeResult.shadowWrite.status, 'degraded');
    assert.equal((await shadowStore.getHealth()).reconcileCount, 2);
    assert.equal((await healthyVectorStore.getHealth()).vectorCount, 0);

    failingWorker.start({ limit: 1, dryRun: false, maxRuns: 1 });
    assert.equal(await failingScheduler.flushNext(), true);

    const failedStatus = failingWorker.getStatus();
    const shadowAfterFailure = await shadowStore.getHealth();

    assert.equal(failedStatus.running, false);
    assert.equal(failedStatus.timerScheduled, false);
    assert.equal(failedStatus.runCount, 1);
    assert.equal(failedStatus.lastResultSummary.success, false);
    assert.equal(failedStatus.lastResultSummary.decision, 'completed_with_failures');
    assert.equal(failedStatus.lastResultSummary.scannedTaskCount, 1);
    assert.equal(failedStatus.lastResultSummary.replayedCount, 0);
    assert.equal(failedStatus.lastResultSummary.clearedCount, 0);
    assert.equal(failedStatus.lastResultSummary.failedCount, 1);
    assert.equal(shadowAfterFailure.recordCount, 1);
    assert.equal(shadowAfterFailure.reconcileCount, 2);
    assert.equal(shadowAfterFailure.chunkCount, 0);
    assert.equal((await healthyVectorStore.getHealth()).vectorCount, 0);
    assert.equal(JSON.stringify(failedStatus).includes(writeResult.memoryId), false);

    recoveryWorker.start({ limit: 1, dryRun: false, maxRuns: 2 });
    assert.equal(await recoveryScheduler.flushNext(), true);
    assert.equal(await recoveryScheduler.flushNext(), true);

    const recoveredStatus = recoveryWorker.getStatus();
    const shadowAfterRecovery = await shadowStore.getHealth();
    const vectorAfterRecovery = await healthyVectorStore.getHealth();

    assert.equal(recoveredStatus.running, false);
    assert.equal(recoveredStatus.timerScheduled, false);
    assert.equal(recoveredStatus.runCount, 2);
    assert.equal(recoveredStatus.lastResultSummary.success, true);
    assert.equal(recoveredStatus.lastResultSummary.limit, 1);
    assert.equal(recoveredStatus.lastResultSummary.replayedCount, 1);
    assert.equal(recoveredStatus.lastResultSummary.clearedCount, 1);
    assert.equal(shadowAfterRecovery.recordCount, 1);
    assert.equal(shadowAfterRecovery.reconcileCount, 0);
    assert.equal(shadowAfterRecovery.chunkCount >= 1, true);
    assert.equal(vectorAfterRecovery.vectorCount, 1);
    assert.equal(await pathExists(writeResult.filePath), true);
    assert.equal(JSON.stringify(recoveredStatus).includes(writeResult.memoryId), false);
  } finally {
    failingWorker.stop();
    recoveryWorker.stop();
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1041 worker drains persisted temp-local reconcile queue after shadow store reopen', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1041-worker-reopen-'));
  const config = createConfig(rootPath);
  const shadowStore = new SqliteShadowStore(config);
  const initialHealthyVectorStore = new VectorIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const initialFailingVectorStore = {
    ...initialHealthyVectorStore,
    async upsertRecord() {
      throw new Error('cm1041 synthetic initial vector projection failure');
    }
  };
  const initialFailingChunkIndexingService = {
    async indexRecord() {
      throw new Error('cm1041 synthetic initial chunk projection failure');
    }
  };
  const writeService = new MemoryWriteService({
    config,
    diaryStore: new DiaryStore(config),
    shadowStore,
    vectorStore: initialFailingVectorStore,
    auditLogStore,
    chunkIndexingService: initialFailingChunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm1041-temp-local-fixture-agent',
        requestSource: 'cm1041-write-reconcile-worker-reopen-test'
      }),
      isWritableByCodex: () => true
    }
  });
  const failingReplayService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore: {
      ...initialHealthyVectorStore,
      async upsertRecord() {
        throw new Error('cm1041 synthetic replay vector projection failure');
      }
    },
    chunkIndexingService: {
      async indexRecord() {
        throw new Error('cm1041 synthetic replay chunk projection failure');
      }
    }
  });
  const failingScheduler = new ManualScheduler();
  const failingWorker = new MemoryWriteReconcileWorker({
    reconcileService: failingReplayService,
    scheduler: failingScheduler,
    intervalMs: 250,
    limit: 1
  });
  let reopenedShadowStore = null;
  let recoveryWorker = null;

  try {
    for (const targetPath of [
      config.dailyNoteRootPath,
      config.dbPath,
      config.auditLogPath,
      config.vectorIndexPath
    ]) {
      assertInsideRoot(rootPath, targetPath);
    }

    const writeResult = await writeService.record(processPayload({
      title: 'Checkpoint: CM-1041 internal write reconcile worker reopen recovery',
      task_id: 'CM-1041',
      conversation_id: 'cm1041-write-reconcile-worker-temp-local-reopen'
    }));

    assert.equal(writeResult.decision, 'accepted');
    assert.equal(writeResult.shadowWrite.status, 'degraded');
    assert.equal((await shadowStore.getHealth()).recordCount, 1);
    assert.equal((await shadowStore.getHealth()).reconcileCount, 2);

    failingWorker.start({ limit: 1, dryRun: false, maxRuns: 1 });
    assert.equal(await failingScheduler.flushNext(), true);

    const failedStatus = failingWorker.getStatus();
    const shadowAfterFailedTick = await shadowStore.getHealth();

    assert.equal(failedStatus.running, false);
    assert.equal(failedStatus.runCount, 1);
    assert.equal(failedStatus.lastResultSummary.success, false);
    assert.equal(failedStatus.lastResultSummary.clearedCount, 0);
    assert.equal(failedStatus.lastResultSummary.failedCount, 1);
    assert.equal(shadowAfterFailedTick.recordCount, 1);
    assert.equal(shadowAfterFailedTick.reconcileCount, 2);
    assert.equal(shadowAfterFailedTick.chunkCount, 0);
    assert.equal((await initialHealthyVectorStore.getHealth()).vectorCount, 0);

    await shadowStore.close();

    reopenedShadowStore = new SqliteShadowStore(config);
    const recoveryVectorStore = new VectorIndexStore(config);
    const reopenedHealth = await reopenedShadowStore.getHealth();

    assert.equal(reopenedHealth.recordCount, 1);
    assert.equal(reopenedHealth.reconcileCount, 2);
    assert.equal(reopenedHealth.chunkCount, 0);
    assert.equal((await recoveryVectorStore.getHealth()).vectorCount, 0);

    recoveryWorker = new MemoryWriteReconcileWorker({
      reconcileService: new MemoryWriteReconcileService({
        shadowStore: reopenedShadowStore,
        vectorStore: recoveryVectorStore,
        chunkIndexingService: new ChunkIndexingService({
          config,
          shadowStore: reopenedShadowStore,
          vectorStore: recoveryVectorStore
        })
      }),
      scheduler: new ManualScheduler(),
      intervalMs: 250,
      limit: 1
    });

    recoveryWorker.start({ limit: 1, dryRun: false, maxRuns: 2 });
    assert.equal(await recoveryWorker.scheduler.flushNext(), true);
    assert.equal(await recoveryWorker.scheduler.flushNext(), true);

    const recoveredStatus = recoveryWorker.getStatus();
    const recoveredShadowHealth = await reopenedShadowStore.getHealth();
    const recoveredVectorHealth = await recoveryVectorStore.getHealth();

    assert.equal(recoveredStatus.running, false);
    assert.equal(recoveredStatus.timerScheduled, false);
    assert.equal(recoveredStatus.runCount, 2);
    assert.equal(recoveredStatus.lastResultSummary.success, true);
    assert.equal(recoveredStatus.lastResultSummary.clearedCount, 1);
    assert.equal(recoveredShadowHealth.recordCount, 1);
    assert.equal(recoveredShadowHealth.reconcileCount, 0);
    assert.equal(recoveredShadowHealth.chunkCount >= 1, true);
    assert.equal(recoveredVectorHealth.vectorCount, 1);
    assert.equal(await pathExists(writeResult.filePath), true);
    assert.equal(JSON.stringify(recoveredStatus).includes(writeResult.memoryId), false);
  } finally {
    failingWorker.stop();
    if (recoveryWorker) {
      recoveryWorker.stop();
    }
    await shadowStore.close();
    if (reopenedShadowStore) {
      await reopenedShadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1037 worker status snapshot is read-only and does not expose raw task results or errors', async () => {
  const scheduler = new ManualScheduler();
  const reconcileService = {
    async replayPending(options) {
      return {
        success: false,
        decision: 'completed_with_failures',
        workerDecision: 'run_once_completed',
        dryRun: options.dryRun === true,
        limit: options.limit,
        scannedTaskCount: 1,
        replayedCount: 0,
        wouldReplayCount: 0,
        clearedCount: 0,
        failedCount: 1,
        skippedCount: 0,
        error: 'raw synthetic worker error with memory id codex-process-cm1037',
        results: [{
          memoryId: 'codex-process-cm1037-raw-result',
          error: 'raw projection failure'
        }]
      };
    }
  };
  const worker = new MemoryWriteReconcileWorker({
    reconcileService,
    scheduler,
    intervalMs: 250,
    limit: 5
  });

  const initialStatus = worker.getStatus();

  assert.deepEqual(initialStatus, {
    running: false,
    timerScheduled: false,
    tickInFlight: false,
    runCount: 0,
    intervalMs: 250,
    limit: 5,
    dryRun: false,
    maxRuns: null,
    lastResultSummary: null
  });

  worker.start({ dryRun: true, maxRuns: 1 });
  assert.equal(worker.getStatus().timerScheduled, true);

  await scheduler.flushNext();

  const status = worker.getStatus();

  assert.equal(status.running, false);
  assert.equal(status.timerScheduled, false);
  assert.equal(status.runCount, 1);
  assert.deepEqual(status.lastResultSummary, {
    success: false,
    decision: 'completed_with_failures',
    workerDecision: 'run_once_completed',
    dryRun: true,
    limit: 5,
    scannedTaskCount: 1,
    replayedCount: 0,
    wouldReplayCount: 0,
    clearedCount: 0,
    failedCount: 1,
    skippedCount: 0,
    hasError: true
  });
  assert.equal(Object.prototype.hasOwnProperty.call(status.lastResultSummary, 'results'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(status.lastResultSummary, 'error'), false);
  assert.equal(JSON.stringify(status).includes('codex-process-cm1037'), false);
  assert.equal(JSON.stringify(status).includes('raw projection failure'), false);
});

test('CM-1036 normalizeIntervalMs bounds worker polling intervals', () => {
  assert.equal(normalizeIntervalMs(undefined), 60_000);
  assert.equal(normalizeIntervalMs(1), 100);
  assert.equal(normalizeIntervalMs('250'), 250);
  assert.equal(normalizeIntervalMs(999_999), 600_000);
});

test('CM-1037 summarizeResult returns bounded counters without raw result payloads', () => {
  const summary = summarizeResult({
    success: true,
    decision: 'completed',
    workerDecision: 'run_once_completed',
    dryRun: false,
    limit: 10,
    scannedTaskCount: 2,
    replayedCount: 1,
    wouldReplayCount: 0,
    clearedCount: 1,
    failedCount: 1,
    skippedCount: 0,
    results: [{ memoryId: 'codex-process-cm1037-hidden' }],
    error: 'hidden raw error'
  });

  assert.deepEqual(summary, {
    success: true,
    decision: 'completed',
    workerDecision: 'run_once_completed',
    dryRun: false,
    limit: 10,
    scannedTaskCount: 2,
    replayedCount: 1,
    wouldReplayCount: 0,
    clearedCount: 1,
    failedCount: 1,
    skippedCount: 0,
    hasError: true
  });
  assert.equal(JSON.stringify(summary).includes('codex-process-cm1037-hidden'), false);
  assert.equal(JSON.stringify(summary).includes('hidden raw error'), false);
});
