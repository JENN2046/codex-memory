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
