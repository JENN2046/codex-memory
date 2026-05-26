'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { MemoryWriteService, buildDefaultIdempotencyKey } = require('../src/core/MemoryWriteService');
const { computeCanonicalWriteHash } = require('../src/core/MemoryWriteLifecycleDedupSuppressionPreflight');
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
