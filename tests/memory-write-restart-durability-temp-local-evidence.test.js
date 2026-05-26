'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { MemoryWriteService, buildDefaultIdempotencyKey } = require('../src/core/MemoryWriteService');
const { computeCanonicalWriteHash } = require('../src/core/MemoryWriteLifecycleDedupSuppressionPreflight');
const { MemoryWriteReconcileService } = require('../src/core/MemoryWriteReconcileService');
const { DiaryStore } = require('../src/storage/DiaryStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');
const { AuditLogStore } = require('../src/storage/AuditLogStore');
const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');
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
    defaultRequestSource: 'cm1033-write-restart-durability-temp-local-evidence',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    candidateCachePath: path.join(rootPath, 'cache', 'candidate-cache.json'),
    embeddingFingerprint: 'cm1033-temp-local-write-restart-durability-v1',
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
}

function openStores(config) {
  const diaryStore = new DiaryStore(config);
  const shadowStore = new SqliteShadowStore(config);
  const vectorStore = new VectorIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const auditEvents = [];
  const auditLogWrapper = {
    async appendWriteAudit(entry) {
      auditEvents.push(entry);
      await auditLogStore.appendWriteAudit(entry);
    }
  };
  const candidateCacheStore = new CandidateCacheStore(config);
  const chunkIndexingService = new ChunkIndexingService({ config, shadowStore, vectorStore });
  const service = new MemoryWriteService({
    config,
    diaryStore,
    shadowStore,
    vectorStore,
    auditLogStore: auditLogWrapper,
    chunkIndexingService,
    executionContextResolver: {
      resolve: () => ({
        agentAlias: 'Codex',
        agentId: 'cm1033-temp-local-fixture-agent',
        requestSource: 'cm1033-write-restart-durability-temp-local-evidence'
      }),
      isWritableByCodex: () => true
    }
  });

  return {
    auditEvents,
    auditLogStore,
    candidateCacheStore,
    service,
    shadowStore,
    vectorStore
  };
}

function processPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-1033 write restart durability temp-local evidence',
    content: [
      'Type: checkpoint',
      'CM1033 write restart durability temp local marker',
      'Purpose: prove accepted temp-local write projections survive store reopen.',
      'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'cm1033 synthetic temp-local write restart durability evidence',
    validated: true,
    reusable: false,
    tags: ['cm1033', 'write', 'restart-durability', 'temp-local'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'cm1033-write-restart-workspace',
    client_id: 'codex',
    task_id: 'CM-1033',
    conversation_id: 'cm1033-write-restart-temp-local',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('CM-1033 accepted temp-local write projections survive store reopen', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1033-write-restart-'));
  const config = createConfig(rootPath);
  let firstStores;
  let reopenedStores;

  try {
    for (const targetPath of [
      config.dailyNoteRootPath,
      config.dbPath,
      config.auditLogPath,
      config.vectorIndexPath,
      config.candidateCachePath
    ]) {
      assertInsideRoot(rootPath, targetPath);
    }

    firstStores = openStores(config);
    const result = await firstStores.service.record(processPayload());

    assert.equal(result.decision, 'accepted');
    assert.equal(result.success, true);
    assert.equal(result.shadowWrite.status, 'ok');
    assertInsideRoot(rootPath, result.filePath);
    assert.equal(await pathExists(result.filePath), true);

    await firstStores.candidateCacheStore.set('cm1033-cache-entry', {
      resultMemoryIds: [result.memoryId],
      marker: 'CM1033 write restart durability temp local marker'
    }, {
      target: 'process',
      memoryIds: [result.memoryId]
    });

    const shadowBeforeRestart = await firstStores.shadowStore.getHealth();
    assert.equal(shadowBeforeRestart.recordCount, 1);
    assert.equal(shadowBeforeRestart.chunkCount >= 1, true);
    assert.equal(shadowBeforeRestart.reconcileCount, 0);

    const vectorBeforeRestart = await firstStores.vectorStore.getHealth();
    assert.equal(vectorBeforeRestart.vectorCount, 1);
    assert.equal(vectorBeforeRestart.embeddingCacheCount >= 1, true);

    const cacheBeforeRestart = await firstStores.candidateCacheStore.getHealth();
    assert.equal(cacheBeforeRestart.entryCount, 1);
    assertInsideRoot(rootPath, cacheBeforeRestart.candidateCachePath);

    const auditBeforeRestart = await firstStores.auditLogStore.readRecentWriteAudit(10);
    assert.equal(auditBeforeRestart.length, 1);
    assert.equal(auditBeforeRestart[0].memoryId, result.memoryId);
    assert.equal(auditBeforeRestart[0].shadowWrite.status, 'ok');

    await firstStores.shadowStore.close();
    firstStores = null;

    reopenedStores = openStores(config);

    const reopenedRecord = await reopenedStores.shadowStore.getRecord(result.memoryId);
    assert.equal(reopenedRecord.memoryId, result.memoryId);
    assert.equal(reopenedRecord.projectId, 'codex-memory');
    assert.equal(reopenedRecord.workspaceId, 'cm1033-write-restart-workspace');
    assert.equal(reopenedRecord.clientId, 'codex');
    assert.equal(reopenedRecord.taskId, 'CM-1033');
    assert.equal(reopenedRecord.conversationId, 'cm1033-write-restart-temp-local');
    assert.equal(reopenedRecord.visibility, 'project');
    assert.equal(reopenedRecord.retentionPolicy, 'keep');

    const shadowAfterRestart = await reopenedStores.shadowStore.getHealth();
    assert.equal(shadowAfterRestart.recordCount, 1);
    assert.equal(shadowAfterRestart.chunkCount >= 1, true);
    assert.equal(shadowAfterRestart.reconcileCount, 0);

    const vectorAfterRestart = await reopenedStores.vectorStore.getHealth();
    assert.equal(vectorAfterRestart.vectorCount, 1);
    assert.equal(vectorAfterRestart.embeddingCacheCount >= 1, true);

    const cacheAfterRestart = await reopenedStores.candidateCacheStore.getHealth();
    assert.equal(cacheAfterRestart.entryCount, 1);
    const cachedEntry = await reopenedStores.candidateCacheStore.get('cm1033-cache-entry');
    assert.deepEqual(cachedEntry, {
      resultMemoryIds: [result.memoryId],
      marker: 'CM1033 write restart durability temp local marker'
    });

    const auditAfterRestart = await reopenedStores.auditLogStore.readRecentWriteAudit(10);
    assert.equal(auditAfterRestart.length, 1);
    assert.equal(auditAfterRestart[0].memoryId, result.memoryId);
    assert.equal(auditAfterRestart[0].decision, 'accepted');
    assert.equal(auditAfterRestart[0].shadowWrite.status, 'ok');
    assert.equal(await pathExists(result.filePath), true);
    assert.equal(await pathExists(config.auditLogPath), true);
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (reopenedStores) {
      await reopenedStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1160 pending manifest diary crash-window recovers after store reopen', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1160-manifest-restart-'));
  const config = createConfig(rootPath);
  let firstStores;
  let reopenedStores;

  try {
    const payload = processPayload({
      title: 'Checkpoint: CM-1160 pending manifest restart recovery',
      content: [
        'Type: checkpoint',
        'CM1160 pending manifest restart recovery temp local marker',
        'Purpose: prove pending manifest with diary-only write can recover after store reopen.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1160 synthetic pending manifest restart recovery evidence',
      tags: ['cm1160', 'pending-manifest', 'restart-recovery', 'temp-local'],
      task_id: 'CM-1160',
      conversation_id: 'cm1160-pending-manifest-restart-recovery'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1160restartrecovery000000001';
    const now = new Date().toISOString();

    firstStores = openStores(config);
    await firstStores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    await firstStores.service.diaryStore.writeRecord({
      memoryId,
      target: 'process',
      title: payload.title,
      content: payload.content,
      evidence: payload.evidence,
      tags: payload.tags,
      sensitivity: payload.sensitivity,
      validated: payload.validated,
      reusable: payload.reusable,
      createdAt: now,
      updatedAt: now,
      projectId: payload.project_id,
      workspaceId: payload.workspace_id,
      clientId: payload.client_id,
      taskId: payload.task_id,
      conversationId: payload.conversation_id,
      visibility: payload.visibility,
      retentionPolicy: payload.retention_policy
    });

    const beforeRestartHealth = await firstStores.shadowStore.getHealth();
    assert.equal(beforeRestartHealth.writeManifest.pending, 1);
    assert.equal(beforeRestartHealth.recordCount, 0);
    assert.equal(beforeRestartHealth.chunkCount, 0);
    assert.equal((await firstStores.vectorStore.getHealth()).vectorCount, 0);
    await firstStores.shadowStore.close();
    firstStores = null;

    reopenedStores = openStores(config);
    const recovery = await reopenedStores.service.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(recovery.attempted, 1);
    assert.equal(recovery.recovered, 1);
    assert.equal(recovery.degraded, 0);
    assert.equal(recovery.missingDiary, 0);
    assert.equal(recovery.items[0].memoryId, memoryId);
    assert.equal(recovery.items[0].status, 'committed');

    const manifest = await reopenedStores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'committed');
    assert.equal(manifest.memoryId, memoryId);
    assert.equal(manifest.result.idempotency.recovered, true);

    const recoveredRecord = await reopenedStores.shadowStore.getRecord(memoryId);
    assert.equal(recoveredRecord.memoryId, memoryId);
    assert.equal(recoveredRecord.taskId, 'CM-1160');
    assert.equal(recoveredRecord.conversationId, 'cm1160-pending-manifest-restart-recovery');

    const recoveredHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(recoveredHealth.recordCount, 1);
    assert.equal(recoveredHealth.chunkCount >= 1, true);
    assert.equal(recoveredHealth.writeManifest.committed, 1);
    assert.equal((await reopenedStores.vectorStore.getHealth()).vectorCount, 1);

    const duplicate = await reopenedStores.service.record(payload);
    assert.equal(duplicate.decision, 'accepted');
    assert.equal(duplicate.memoryId, memoryId);
    assert.equal(duplicate.idempotency.replayed, true);

    const replayHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(replayHealth.recordCount, 1);
    assert.equal(replayHealth.writeManifest.total, 1);
    assert.equal(replayHealth.writeManifest.committed, 1);

    const manifestAudit = await reopenedStores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId,
      idempotencyKey,
      canonicalHash
    });
    assert.equal(manifestAudit.found, true);
    assert.equal(manifestAudit.selectedFieldsOnly, true);
    assert.equal(manifestAudit.rawAuditReturned, false);
    assert.equal(manifestAudit.recovered.memoryId, memoryId);
    assert.equal(manifestAudit.replayed.memoryId, memoryId);
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (reopenedStores) {
      await reopenedStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1161 pending manifest restart recovery degrades and replays when vector projection fails', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1161-degraded-restart-'));
  const config = createConfig(rootPath);
  let firstStores;
  let reopenedStores;

  try {
    const payload = processPayload({
      title: 'Checkpoint: CM-1161 degraded restart recovery',
      content: [
        'Type: checkpoint',
        'CM1161 degraded restart recovery temp local marker',
        'Purpose: prove pending manifest recovery records degraded projection failure after store reopen.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1161 synthetic degraded restart recovery evidence',
      tags: ['cm1161', 'pending-manifest', 'degraded-recovery', 'temp-local'],
      task_id: 'CM-1161',
      conversation_id: 'cm1161-degraded-restart-recovery'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1161degradedrecovery00000001';
    const now = new Date().toISOString();

    firstStores = openStores(config);
    await firstStores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    await firstStores.service.diaryStore.writeRecord({
      memoryId,
      target: 'process',
      title: payload.title,
      content: payload.content,
      evidence: payload.evidence,
      tags: payload.tags,
      sensitivity: payload.sensitivity,
      validated: payload.validated,
      reusable: payload.reusable,
      createdAt: now,
      updatedAt: now,
      projectId: payload.project_id,
      workspaceId: payload.workspace_id,
      clientId: payload.client_id,
      taskId: payload.task_id,
      conversationId: payload.conversation_id,
      visibility: payload.visibility,
      retentionPolicy: payload.retention_policy
    });
    await firstStores.shadowStore.close();
    firstStores = null;

    reopenedStores = openStores(config);
    reopenedStores.vectorStore.upsertRecord = async () => {
      throw new Error('cm1161 synthetic vector projection failure');
    };

    const recovery = await reopenedStores.service.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(recovery.attempted, 1);
    assert.equal(recovery.recovered, 1);
    assert.equal(recovery.degraded, 1);
    assert.equal(recovery.missingDiary, 0);
    assert.equal(recovery.items[0].memoryId, memoryId);
    assert.equal(recovery.items[0].status, 'degraded');
    assert.equal(recovery.items[0].shadowFailureCount, 1);

    const manifest = await reopenedStores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'degraded');
    assert.equal(manifest.memoryId, memoryId);
    assert.equal(manifest.result.idempotency.recovered, true);
    assert.equal(manifest.result.idempotency.status, 'degraded');
    assert.equal(manifest.result.shadowWrite.status, 'degraded');
    assert.equal(manifest.result.shadowWrite.failures.length, 1);
    assert.match(manifest.result.shadowWrite.failures[0], /^vector:/);

    const recoveredRecord = await reopenedStores.shadowStore.getRecord(memoryId);
    assert.equal(recoveredRecord.memoryId, memoryId);
    assert.equal(recoveredRecord.taskId, 'CM-1161');

    const degradedHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(degradedHealth.recordCount, 1);
    assert.equal(degradedHealth.chunkCount >= 1, true);
    assert.equal(degradedHealth.reconcileCount, 1);
    assert.equal(degradedHealth.writeManifest.degraded, 1);
    assert.equal((await reopenedStores.vectorStore.getHealth()).vectorCount, 0);

    const manifestAudit = await reopenedStores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId,
      idempotencyKey,
      canonicalHash
    });
    assert.equal(manifestAudit.found, true);
    assert.equal(manifestAudit.selectedFieldsOnly, true);
    assert.equal(manifestAudit.rawAuditReturned, false);
    assert.equal(manifestAudit.degraded.memoryId, memoryId);
    assert.equal(manifestAudit.degraded.status, 'degraded');
    assert.equal(manifestAudit.degraded.recovered, true);

    const duplicate = await reopenedStores.service.record(payload);
    assert.equal(duplicate.decision, 'accepted');
    assert.equal(duplicate.memoryId, memoryId);
    assert.equal(duplicate.idempotency.replayed, true);
    assert.equal(duplicate.idempotency.status, 'degraded');
    assert.equal(duplicate.shadowWrite.status, 'degraded');

    const replayHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(replayHealth.recordCount, 1);
    assert.equal(replayHealth.reconcileCount, 1);
    assert.equal(replayHealth.writeManifest.total, 1);
    assert.equal(replayHealth.writeManifest.degraded, 1);
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (reopenedStores) {
      await reopenedStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1162 degraded manifest reconcile task replays after second store reopen', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1162-reconcile-restart-'));
  const config = createConfig(rootPath);
  let firstStores;
  let degradedStores;
  let replayStores;

  try {
    const payload = processPayload({
      title: 'Checkpoint: CM-1162 degraded reconcile replay after restart',
      content: [
        'Type: checkpoint',
        'CM1162 degraded reconcile replay after restart temp local marker',
        'Purpose: prove degraded vector reconcile task can replay after a second store reopen.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1162 synthetic degraded reconcile replay evidence',
      tags: ['cm1162', 'degraded-manifest', 'reconcile-replay', 'temp-local'],
      task_id: 'CM-1162',
      conversation_id: 'cm1162-degraded-reconcile-replay'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1162reconcilereplay00000001';
    const now = new Date().toISOString();

    firstStores = openStores(config);
    await firstStores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    await firstStores.service.diaryStore.writeRecord({
      memoryId,
      target: 'process',
      title: payload.title,
      content: payload.content,
      evidence: payload.evidence,
      tags: payload.tags,
      sensitivity: payload.sensitivity,
      validated: payload.validated,
      reusable: payload.reusable,
      createdAt: now,
      updatedAt: now,
      projectId: payload.project_id,
      workspaceId: payload.workspace_id,
      clientId: payload.client_id,
      taskId: payload.task_id,
      conversationId: payload.conversation_id,
      visibility: payload.visibility,
      retentionPolicy: payload.retention_policy
    });
    await firstStores.shadowStore.close();
    firstStores = null;

    degradedStores = openStores(config);
    degradedStores.vectorStore.upsertRecord = async () => {
      throw new Error('cm1162 synthetic vector projection failure before replay');
    };
    const degradedRecovery = await degradedStores.service.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(degradedRecovery.attempted, 1);
    assert.equal(degradedRecovery.recovered, 1);
    assert.equal(degradedRecovery.degraded, 1);
    assert.equal((await degradedStores.shadowStore.getHealth()).reconcileCount, 1);
    assert.equal((await degradedStores.vectorStore.getHealth()).vectorCount, 0);
    await degradedStores.shadowStore.close();
    degradedStores = null;

    replayStores = openStores(config);
    const replayBeforeHealth = await replayStores.shadowStore.getHealth();
    assert.equal(replayBeforeHealth.recordCount, 1);
    assert.equal(replayBeforeHealth.chunkCount >= 1, true);
    assert.equal(replayBeforeHealth.reconcileCount, 1);
    assert.equal(replayBeforeHealth.writeManifest.degraded, 1);
    assert.equal((await replayStores.vectorStore.getHealth()).vectorCount, 0);

    const reconcileService = new MemoryWriteReconcileService({
      shadowStore: replayStores.shadowStore,
      vectorStore: replayStores.vectorStore,
      chunkIndexingService: new ChunkIndexingService({
        config,
        shadowStore: replayStores.shadowStore,
        vectorStore: replayStores.vectorStore
      })
    });
    const replay = await reconcileService.replayPending({ limit: 10, dryRun: false });
    assert.equal(replay.success, true);
    assert.equal(replay.decision, 'completed');
    assert.equal(replay.scannedTaskCount, 1);
    assert.equal(replay.replayedCount, 1);
    assert.equal(replay.clearedCount, 1);
    assert.equal(replay.failedCount, 0);
    assert.equal(replay.results[0].memoryId, memoryId);
    assert.equal(replay.results[0].storeKind, 'vector');
    assert.equal(replay.results[0].status, 'replayed');

    const replayAfterHealth = await replayStores.shadowStore.getHealth();
    assert.equal(replayAfterHealth.recordCount, 1);
    assert.equal(replayAfterHealth.chunkCount >= 1, true);
    assert.equal(replayAfterHealth.reconcileCount, 0);
    assert.equal((await replayStores.vectorStore.getHealth()).vectorCount, 1);

    const manifest = await replayStores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'degraded');
    assert.equal(manifest.result.idempotency.recovered, true);
    assert.equal(manifest.result.shadowWrite.status, 'degraded');

    const duplicate = await replayStores.service.record(payload);
    assert.equal(duplicate.decision, 'accepted');
    assert.equal(duplicate.memoryId, memoryId);
    assert.equal(duplicate.idempotency.replayed, true);
    assert.equal(duplicate.idempotency.status, 'degraded');
    assert.equal((await replayStores.shadowStore.getHealth()).recordCount, 1);
    assert.equal((await replayStores.shadowStore.getHealth()).reconcileCount, 0);
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (degradedStores) {
      await degradedStores.shadowStore.close();
    }
    if (replayStores) {
      await replayStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1163 pending manifest without diary remains recovery-required after store reopen', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1163-missing-diary-'));
  const config = createConfig(rootPath);
  let firstStores;
  let reopenedStores;

  try {
    const payload = processPayload({
      title: 'Checkpoint: CM-1163 missing diary pending manifest recovery gate',
      content: [
        'Type: checkpoint',
        'CM1163 missing diary pending manifest recovery gate temp local marker',
        'Purpose: prove pending manifest without diary remains recovery-required after store reopen.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1163 synthetic missing diary recovery gate evidence',
      tags: ['cm1163', 'pending-manifest', 'missing-diary', 'temp-local'],
      task_id: 'CM-1163',
      conversation_id: 'cm1163-missing-diary-recovery-gate'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1163missingdiary0000000001';
    const now = new Date().toISOString();

    firstStores = openStores(config);
    await firstStores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    const beforeRestartHealth = await firstStores.shadowStore.getHealth();
    assert.equal(beforeRestartHealth.writeManifest.pending, 1);
    assert.equal(beforeRestartHealth.recordCount, 0);
    assert.equal(beforeRestartHealth.chunkCount, 0);
    assert.equal(beforeRestartHealth.reconcileCount, 0);
    assert.equal((await firstStores.vectorStore.getHealth()).vectorCount, 0);
    await firstStores.shadowStore.close();
    firstStores = null;

    reopenedStores = openStores(config);
    const recovery = await reopenedStores.service.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(recovery.attempted, 1);
    assert.equal(recovery.recovered, 0);
    assert.equal(recovery.degraded, 0);
    assert.equal(recovery.missingDiary, 1);
    assert.equal(recovery.items[0].memoryId, memoryId);
    assert.equal(recovery.items[0].idempotencyKey, idempotencyKey);
    assert.equal(recovery.items[0].status, 'pending');
    assert.equal(recovery.items[0].recovered, false);
    assert.equal(recovery.items[0].reason, 'diary_record_missing');

    const manifest = await reopenedStores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'pending');
    assert.equal(manifest.memoryId, memoryId);
    assert.equal(manifest.result, null);

    const afterRecoveryHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(afterRecoveryHealth.writeManifest.pending, 1);
    assert.equal(afterRecoveryHealth.writeManifest.committed, 0);
    assert.equal(afterRecoveryHealth.writeManifest.degraded, 0);
    assert.equal(afterRecoveryHealth.recordCount, 0);
    assert.equal(afterRecoveryHealth.chunkCount, 0);
    assert.equal(afterRecoveryHealth.reconcileCount, 0);
    assert.equal((await reopenedStores.vectorStore.getHealth()).vectorCount, 0);

    const duplicate = await reopenedStores.service.record(payload);
    assert.equal(duplicate.success, false);
    assert.equal(duplicate.decision, 'rejected');
    assert.equal(duplicate.memoryId, memoryId);
    assert.match(duplicate.reason, /write manifest pending recovery/);
    assert.equal(duplicate.idempotency.recoveryRequired, true);
    assert.equal(duplicate.idempotency.status, 'pending');
    assert.equal(duplicate.idempotency.replayed, false);

    const afterDuplicateHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(afterDuplicateHealth.writeManifest.pending, 1);
    assert.equal(afterDuplicateHealth.recordCount, 0);
    assert.equal(afterDuplicateHealth.chunkCount, 0);
    assert.equal(afterDuplicateHealth.reconcileCount, 0);
    assert.equal((await reopenedStores.vectorStore.getHealth()).vectorCount, 0);
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (reopenedStores) {
      await reopenedStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1164 unrecoverable pending manifest can be explicitly cancelled after store reopen', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1164-cancel-manifest-'));
  const config = createConfig(rootPath);
  let firstStores;
  let reopenedStores;

  try {
    const payload = processPayload({
      title: 'Checkpoint: CM-1164 unrecoverable pending manifest cancellation',
      content: [
        'Type: checkpoint',
        'CM1164 unrecoverable pending manifest cancellation temp local marker',
        'Purpose: prove explicit cancellation terminally closes missing-diary pending manifest.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1164 synthetic unrecoverable manifest cancellation evidence',
      tags: ['cm1164', 'pending-manifest', 'cancelled', 'temp-local'],
      task_id: 'CM-1164',
      conversation_id: 'cm1164-unrecoverable-manifest-cancellation'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1164cancelmanifest00000001';
    const now = new Date().toISOString();

    firstStores = openStores(config);
    await firstStores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    await firstStores.shadowStore.close();
    firstStores = null;

    reopenedStores = openStores(config);
    const recovery = await reopenedStores.service.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(recovery.attempted, 1);
    assert.equal(recovery.missingDiary, 1);

    const cancellation = await reopenedStores.service.cancelUnrecoverablePendingWriteManifests({
      limit: 10,
      reason: 'diary_record_missing'
    });
    assert.equal(cancellation.attempted, 1);
    assert.equal(cancellation.cancelled, 1);
    assert.equal(cancellation.retained, 0);
    assert.equal(cancellation.items[0].memoryId, memoryId);
    assert.equal(cancellation.items[0].status, 'cancelled');
    assert.equal(cancellation.items[0].cancelled, true);
    assert.equal(cancellation.items[0].reason, 'diary_record_missing');

    const manifest = await reopenedStores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'cancelled');
    assert.equal(manifest.memoryId, memoryId);
    assert.equal(manifest.result.success, false);
    assert.equal(manifest.result.decision, 'rejected');
    assert.equal(manifest.result.idempotency.cancelled, true);
    assert.equal(manifest.result.idempotency.recoveryRequired, false);
    assert.equal(manifest.result.idempotency.cancelReason, 'diary_record_missing');

    const cancelledHealth = await reopenedStores.shadowStore.getHealth();
    assert.equal(cancelledHealth.writeManifest.pending, 0);
    assert.equal(cancelledHealth.writeManifest.cancelled, 1);
    assert.equal(cancelledHealth.recordCount, 0);
    assert.equal(cancelledHealth.chunkCount, 0);
    assert.equal(cancelledHealth.reconcileCount, 0);
    assert.equal((await reopenedStores.vectorStore.getHealth()).vectorCount, 0);

    const duplicate = await reopenedStores.service.record(payload);
    assert.equal(duplicate.success, false);
    assert.equal(duplicate.decision, 'rejected');
    assert.equal(duplicate.memoryId, memoryId);
    assert.match(duplicate.reason, /terminally closed/);
    assert.equal(duplicate.idempotency.status, 'cancelled');
    assert.equal(duplicate.idempotency.cancelled, true);
    assert.equal(duplicate.idempotency.recoveryRequired, false);

    const manifestAudit = await reopenedStores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId,
      idempotencyKey,
      canonicalHash
    });
    assert.equal(manifestAudit.found, true);
    assert.equal(manifestAudit.selectedFieldsOnly, true);
    assert.equal(manifestAudit.rawAuditReturned, false);
    assert.equal(manifestAudit.cancelled.memoryId, memoryId);
    assert.equal(manifestAudit.cancelled.status, 'cancelled');
    assert.equal(manifestAudit.cancelled.cancelled, true);
    assert.equal(manifestAudit.cancelled.cancelReason, 'diary_record_missing');
    assert.equal(manifestAudit.recoveryRequired, null);
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (reopenedStores) {
      await reopenedStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});

test('CM-1165 degraded manifest can be explicitly repaired after reconcile queue drains', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1165-repair-manifest-'));
  const config = createConfig(rootPath);
  let firstStores;
  let degradedStores;
  let replayStores;

  try {
    const payload = processPayload({
      title: 'Checkpoint: CM-1165 degraded manifest repair',
      content: [
        'Type: checkpoint',
        'CM1165 degraded manifest repair temp local marker',
        'Purpose: prove explicit repair marks drained degraded manifest repaired.',
        'Boundary: synthetic temp-local files only, no real memory, no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'cm1165 synthetic degraded manifest repair evidence',
      tags: ['cm1165', 'degraded-manifest', 'repaired', 'temp-local'],
      task_id: 'CM-1165',
      conversation_id: 'cm1165-degraded-manifest-repair'
    });
    const canonicalHash = computeCanonicalWriteHash(payload);
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    const memoryId = 'codex-process-cm1165repairmanifest00000001';
    const now = new Date().toISOString();

    firstStores = openStores(config);
    await firstStores.shadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process',
      createdAt: now
    });
    await firstStores.service.diaryStore.writeRecord({
      memoryId,
      target: 'process',
      title: payload.title,
      content: payload.content,
      evidence: payload.evidence,
      tags: payload.tags,
      sensitivity: payload.sensitivity,
      validated: payload.validated,
      reusable: payload.reusable,
      createdAt: now,
      updatedAt: now,
      projectId: payload.project_id,
      workspaceId: payload.workspace_id,
      clientId: payload.client_id,
      taskId: payload.task_id,
      conversationId: payload.conversation_id,
      visibility: payload.visibility,
      retentionPolicy: payload.retention_policy
    });
    await firstStores.shadowStore.close();
    firstStores = null;

    degradedStores = openStores(config);
    degradedStores.vectorStore.upsertRecord = async () => {
      throw new Error('cm1165 synthetic vector projection failure before repair');
    };
    const degradedRecovery = await degradedStores.service.recoverPendingWriteManifests({ limit: 10 });
    assert.equal(degradedRecovery.attempted, 1);
    assert.equal(degradedRecovery.recovered, 1);
    assert.equal(degradedRecovery.degraded, 1);
    assert.equal((await degradedStores.shadowStore.getHealth()).reconcileCount, 1);
    await degradedStores.shadowStore.close();
    degradedStores = null;

    replayStores = openStores(config);
    const repairBeforeReplay = await replayStores.service.repairDegradedMemoryWriteManifests({
      limit: 10,
      reason: 'reconcile_queue_drained'
    });
    assert.equal(repairBeforeReplay.attempted, 1);
    assert.equal(repairBeforeReplay.repaired, 0);
    assert.equal(repairBeforeReplay.retained, 1);
    assert.equal(repairBeforeReplay.items[0].reason, 'reconcile_tasks_remaining');

    const reconcileService = new MemoryWriteReconcileService({
      shadowStore: replayStores.shadowStore,
      vectorStore: replayStores.vectorStore,
      chunkIndexingService: new ChunkIndexingService({
        config,
        shadowStore: replayStores.shadowStore,
        vectorStore: replayStores.vectorStore
      })
    });
    const replay = await reconcileService.replayPending({ limit: 10, dryRun: false });
    assert.equal(replay.success, true);
    assert.equal(replay.replayedCount, 1);
    assert.equal(replay.clearedCount, 1);
    assert.equal((await replayStores.shadowStore.getHealth()).reconcileCount, 0);
    assert.equal((await replayStores.vectorStore.getHealth()).vectorCount, 1);

    const repair = await replayStores.service.repairDegradedMemoryWriteManifests({
      limit: 10,
      reason: 'reconcile_queue_drained'
    });
    assert.equal(repair.attempted, 1);
    assert.equal(repair.repaired, 1);
    assert.equal(repair.retained, 0);
    assert.equal(repair.items[0].memoryId, memoryId);
    assert.equal(repair.items[0].status, 'repaired');
    assert.equal(repair.items[0].reason, 'reconcile_queue_drained');

    const repairedHealth = await replayStores.shadowStore.getHealth();
    assert.equal(repairedHealth.writeManifest.degraded, 0);
    assert.equal(repairedHealth.writeManifest.repaired, 1);
    assert.equal(repairedHealth.reconcileCount, 0);

    const manifest = await replayStores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    assert.equal(manifest.status, 'repaired');
    assert.equal(manifest.result.idempotency.status, 'repaired');
    assert.equal(manifest.result.idempotency.repaired, true);
    assert.equal(manifest.result.idempotency.repairReason, 'reconcile_queue_drained');
    assert.equal(manifest.result.shadowWrite.status, 'repaired');
    assert.equal(manifest.result.shadowWrite.repaired, true);

    const duplicate = await replayStores.service.record(payload);
    assert.equal(duplicate.decision, 'accepted');
    assert.equal(duplicate.memoryId, memoryId);
    assert.equal(duplicate.idempotency.replayed, true);
    assert.equal(duplicate.idempotency.status, 'repaired');
    assert.equal(duplicate.idempotency.repaired, true);
    assert.equal(duplicate.shadowWrite.status, 'repaired');
    assert.equal((await replayStores.shadowStore.getHealth()).recordCount, 1);
    assert.equal((await replayStores.shadowStore.getHealth()).reconcileCount, 0);

    const manifestAudit = await replayStores.auditLogStore.readSelectedWriteManifestAuditCorrelation({
      memoryId,
      idempotencyKey,
      canonicalHash
    });
    assert.equal(manifestAudit.found, true);
    assert.equal(manifestAudit.repaired.memoryId, memoryId);
    assert.equal(manifestAudit.repaired.status, 'repaired');
    assert.equal(manifestAudit.repaired.repaired, true);
    assert.equal(manifestAudit.repaired.repairReason, 'reconcile_queue_drained');
  } finally {
    if (firstStores) {
      await firstStores.shadowStore.close();
    }
    if (degradedStores) {
      await degradedStores.shadowStore.close();
    }
    if (replayStores) {
      await replayStores.shadowStore.close();
    }
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(rootPath), false);
});
