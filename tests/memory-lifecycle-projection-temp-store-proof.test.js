'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createConfig } = require('../src/config/createConfig');
const {
  REQUIRED_PROJECTION_FAMILIES
} = require('../src/core/MemoryLifecycleProjectionCleanupContract');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  executeTempStoreBackedLifecycleProjectionProof
} = require('../src/core/MemoryLifecycleProjectionTempStoreProof');
const { AuditLogStore } = require('../src/storage/AuditLogStore');
const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');
const { DiaryStore } = require('../src/storage/DiaryStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createTempHarness() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-temp-store-proof-'));
  const config = createConfig({
    projectBasePath: rootPath,
    dataDir: 'data',
    logsDir: 'logs',
    dailyNoteRootPath: 'daily-notes',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'temp-store-lifecycle-proof',
    defaultClientId: 'codex',
    defaultRequestSource: 'temp-store-lifecycle-proof',
    embeddingProfileVersion: 'temp-store-proof',
    allowExternalProvider: false,
    enableCandidateCache: true,
    enableEmbeddingCache: true,
    enableLifecycleReadPolicy: true,
    enableVectorIndex: true
  });

  return {
    rootPath,
    config,
    diaryStore: new DiaryStore(config),
    shadowStore: new SqliteShadowStore(config),
    vectorStore: new VectorIndexStore(config),
    candidateCacheStore: new CandidateCacheStore(config),
    auditLogStore: new AuditLogStore(config)
  };
}

async function cleanupTempHarness(harness) {
  if (harness?.shadowStore) {
    await harness.shadowStore.close();
  }
  if (harness?.rootPath) {
    await fs.rm(harness.rootPath, { recursive: true, force: true });
  }
}

function reportFor(report, projectionFamily) {
  return report.projectionReports.find(item => item.projectionFamily === projectionFamily);
}

test('temp-local store-backed tombstone proof clears or suppresses actual derived store files', async () => {
  const harness = await createTempHarness();
  const memoryId = 'temp-store-proof-memory';

  try {
    const report = await executeTempStoreBackedLifecycleProjectionProof({
      diaryStore: harness.diaryStore,
      shadowStore: harness.shadowStore,
      vectorStore: harness.vectorStore,
      candidateCacheStore: harness.candidateCacheStore,
      auditLogStore: harness.auditLogStore,
      memoryId,
      lifecycleFamily: 'tombstone_memory'
    });

    assert.equal(report.schemaVersion, EXPECTED_SCHEMA_VERSION);
    assert.equal(report.version, EXPECTED_VERSION);
    assert.equal(report.tempStoreBackedProofAccepted, true);
    assert.equal(report.decision, 'TEMP_STORE_BACKED_LIFECYCLE_PROJECTION_PROOF_ACCEPTED_NOT_LIVE_READY');
    assert.equal(report.lifecycleFamily, 'tombstone_memory');
    assert.equal(report.targetStatus, 'tombstoned');
    assert.deepEqual(report.projectionFamilies, REQUIRED_PROJECTION_FAMILIES);
    assert.deepEqual(report.residualProjectionFamilies, []);
    assert.deepEqual(report.changedMemoryIds, [memoryId]);
    assert.equal(report.execution.tempLocalStoreBacked, true);
    assert.equal(report.execution.syntheticOnly, true);
    assert.equal(report.execution.liveRuntime, false);
    assert.equal(report.execution.providerCalls, 0);
    assert.equal(report.execution.networkCalls, 0);
    assert.equal(report.execution.rawContentOutput, false);
    assert.equal(report.execution.readinessClaimed, false);
    assert.equal(report.pathPolicy.tempStorePathsReturned, false);
    assert.equal(report.pathPolicy.endpointOrLocatorReturned, false);
    assert.equal(report.pathPolicy.rawContentReturned, false);

    assert.deepEqual(report.beforeCounts, {
      diary_record: 1,
      sqlite_shadow_record: 1,
      sqlite_memory_chunks: 2,
      vector_index: 1,
      embedding_cache: 1,
      candidate_cache: 1,
      write_audit: 1,
      recall_audit: 1,
      reconcile_queue: 2,
      degraded_payload: 1
    });
    assert.deepEqual(report.afterCounts, {
      diary_record: 1,
      sqlite_shadow_record: 1,
      sqlite_memory_chunks: 0,
      vector_index: 0,
      embedding_cache: 0,
      candidate_cache: 0,
      write_audit: 2,
      recall_audit: 2,
      reconcile_queue: 0,
      degraded_payload: 0
    });

    for (const projectionFamily of REQUIRED_PROJECTION_FAMILIES) {
      assert.equal(reportFor(report, projectionFamily).accepted, true, projectionFamily);
    }

    assert.equal(await pathExists(harness.config.dbPath), true);
    assert.equal(await pathExists(harness.config.vectorIndexPath), true);
    assert.equal(await pathExists(harness.config.candidateCachePath), true);
    assert.equal(await pathExists(harness.config.auditLogPath), true);
    assert.equal(await pathExists(harness.config.recallLogPath), true);
    assert.equal(await pathExists(harness.config.dailyNoteRootPath), true);

    const record = await harness.shadowStore.getRecord(memoryId);
    const manifest = await harness.shadowStore.getMemoryWriteManifestByMemoryId(memoryId);
    const reconcileTasks = await harness.shadowStore.listReconcileTasksForMemoryId(memoryId);

    assert.equal(record.status, 'tombstoned');
    assert.equal(await harness.shadowStore.countChunksForRecord(memoryId), 0);
    assert.equal(await harness.vectorStore.hasRecord(memoryId), false);
    assert.equal(await harness.candidateCacheStore.countCurrentFingerprintByMemoryIds([memoryId]), 0);
    assert.equal(manifest.status, 'repaired');
    assert.equal(reconcileTasks.length, 0);
  } finally {
    await cleanupTempHarness(harness);
  }

  assert.equal(await pathExists(harness.rootPath), false);
});

test('temp-local store-backed proof fails closed when candidate-cache cleanup is skipped', async () => {
  const harness = await createTempHarness();
  const memoryId = 'temp-store-proof-cache-residual';

  try {
    const report = await executeTempStoreBackedLifecycleProjectionProof({
      diaryStore: harness.diaryStore,
      shadowStore: harness.shadowStore,
      vectorStore: harness.vectorStore,
      candidateCacheStore: harness.candidateCacheStore,
      auditLogStore: harness.auditLogStore,
      memoryId,
      lifecycleFamily: 'tombstone_memory',
      skipProjections: ['candidate_cache']
    });

    assert.equal(report.tempStoreBackedProofAccepted, false);
    assert.equal(report.decision, 'TEMP_STORE_BACKED_LIFECYCLE_PROJECTION_PROOF_BLOCKED');
    assert.deepEqual(report.residualProjectionFamilies, ['candidate_cache']);
    assert.equal(report.afterCounts.candidate_cache, 1);
    assert.equal(reportFor(report, 'candidate_cache').result, 'candidate_cache_residual');
    assert.equal(await harness.candidateCacheStore.countCurrentFingerprintByMemoryIds([memoryId]), 1);
    assert.equal(report.execution.liveRuntime, false);
    assert.equal(report.execution.readinessClaimed, false);
  } finally {
    await cleanupTempHarness(harness);
  }

  assert.equal(await pathExists(harness.rootPath), false);
});
