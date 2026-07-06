'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createCodexMemoryApplication } = require('../src/app');
const {
  REQUIRED_PROJECTION_FAMILIES
} = require('../src/core/MemoryLifecycleProjectionCleanupContract');
const {
  seedTempStoreBackedLifecycleProjection
} = require('../src/core/MemoryLifecycleProjectionTempStoreProof');

const INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE = 'internal-tombstone-runtime-entry';
const INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE = 'internal-supersede-runtime-entry';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createTempApp() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-bounded-runtime-cleanup-proof-'));
  const app = createCodexMemoryApplication({
    projectBasePath: rootPath,
    dataDir: 'data',
    logsDir: 'logs',
    dailyNoteRootPath: 'daily-notes',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'bounded-runtime-cleanup-proof',
    defaultClientId: 'codex',
    defaultRequestSource: 'bounded-runtime-cleanup-proof',
    embeddingProfileVersion: 'bounded-runtime-cleanup-proof',
    allowExternalProvider: false,
    enableCandidateCache: true,
    enableEmbeddingCache: true,
    enableLifecycleReadPolicy: true,
    enableVectorIndex: true,
    internalTombstoneRuntimeEntryEnabled: true,
    internalSupersedeRuntimeEntryEnabled: true,
    projectionCleanupAppendAudit: true
  });
  await app.initialize();
  return { app, rootPath };
}

async function cleanupTempApp({ app, rootPath }) {
  if (app?.close) {
    await app.close();
  }
  if (rootPath) {
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

function approvedRuntimeContext() {
  return {
    executionContext: {
      requestSource: INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE,
      internalTombstoneRuntimeEntry: true,
      clientId: 'codex'
    }
  };
}

function approvedSupersedeRuntimeContext() {
  return {
    executionContext: {
      requestSource: INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE,
      internalSupersedeRuntimeEntry: true,
      clientId: 'codex'
    }
  };
}

function tombstonePayload(memoryId) {
  return {
    memory_id: memoryId,
    reason: 'bounded runtime lifecycle cleanup proof',
    evidence: 'synthetic bounded runtime cleanup evidence',
    tombstone_reason: 'temp-local-proof-complete',
    dry_run: false,
    confirm: true
  };
}

function supersedePayload(oldMemoryId, newMemoryId) {
  return {
    old_memory_id: oldMemoryId,
    new_memory_id: newMemoryId,
    reason: 'bounded runtime lifecycle cleanup supersede proof',
    evidence: 'synthetic bounded runtime supersede cleanup evidence',
    supersedes_link: oldMemoryId,
    superseded_by_link: newMemoryId,
    dry_run: false,
    confirm: true
  };
}

function projectionReportFor(report, projectionFamily) {
  return report.projectionReports.find(item => item.projectionFamily === projectionFamily);
}

test('bounded app runtime tombstone path invokes lifecycle projection cleanup route on temp-local stores', async () => {
  const harness = await createTempApp();
  const { app, rootPath } = harness;
  const memoryId = 'bounded-runtime-cleanup-proof-memory';

  try {
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId,
      target: 'process',
      status: 'active',
      timestamp: '2026-07-06T00:00:00.000Z'
    });

    const result = await app.executeInternalTombstone(tombstonePayload(memoryId), approvedRuntimeContext());
    const cleanupReport = result.projectionCleanupReport;

    assert.equal(result.decision, 'tombstoned');
    assert.equal(result.mutated, true);
    assert.equal(result.fromStatus, 'active');
    assert.equal(result.toStatus, 'tombstoned');
    assert.equal(result.projectionCleanupStatus, 'accepted');
    assert.equal(cleanupReport.accepted, true);
    assert.equal(cleanupReport.decision, 'LIFECYCLE_PROJECTION_SUPPRESSION_CLEANUP_ACCEPTED');
    assert.deepEqual(cleanupReport.projectionFamilies, REQUIRED_PROJECTION_FAMILIES);
    assert.deepEqual(cleanupReport.residualProjectionFamilies, []);
    assert.equal(cleanupReport.execution.lifecycleProjectionCleanupRoute, true);
    assert.equal(cleanupReport.execution.rawContentOutput, false);
    assert.equal(cleanupReport.execution.readinessClaimed, false);
    assert.equal(cleanupReport.pathPolicy.tempStorePathsReturned, false);
    assert.equal(cleanupReport.pathPolicy.endpointOrLocatorReturned, false);
    assert.equal(cleanupReport.pathPolicy.rawContentReturned, false);

    assert.deepEqual(cleanupReport.beforeCounts, {
      diary_record: 1,
      sqlite_shadow_record: 1,
      sqlite_memory_chunks: 3,
      vector_index: 1,
      embedding_cache: 3,
      candidate_cache: 1,
      write_audit: 3,
      recall_audit: 1,
      reconcile_queue: 2,
      degraded_payload: 1
    });
    assert.deepEqual(cleanupReport.afterCounts, {
      diary_record: 1,
      sqlite_shadow_record: 1,
      sqlite_memory_chunks: 0,
      vector_index: 0,
      embedding_cache: 0,
      candidate_cache: 0,
      write_audit: 4,
      recall_audit: 2,
      reconcile_queue: 0,
      degraded_payload: 0
    });

    for (const projectionFamily of REQUIRED_PROJECTION_FAMILIES) {
      assert.equal(projectionReportFor(cleanupReport, projectionFamily).accepted, true, projectionFamily);
    }

    const record = await app.stores.shadowStore.getRecord(memoryId);
    const manifest = await app.stores.shadowStore.getMemoryWriteManifestByMemoryId(memoryId);
    const reconcileTasks = await app.stores.shadowStore.listReconcileTasksForMemoryId(memoryId);

    assert.equal(record.status, 'tombstoned');
    assert.equal(await app.stores.shadowStore.countChunksForRecord(memoryId), 0);
    assert.equal(await app.stores.shadowStore.countChunksForRecord(memoryId, { currentFingerprintOnly: false }), 0);
    assert.equal(await app.stores.vectorStore.hasRecord(memoryId), false);
    assert.equal(await app.stores.candidateCacheStore.countCurrentFingerprintByMemoryIds([memoryId]), 0);
    assert.equal(manifest.status, 'repaired');
    assert.equal(manifest.record, null);
    assert.equal(reconcileTasks.length, 0);
    assert.equal(await pathExists(app.config.dbPath), true);
    assert.equal(await pathExists(app.config.vectorIndexPath), true);
    assert.equal(await pathExists(app.config.candidateCachePath), true);
  } finally {
    await cleanupTempApp(harness);
  }

  assert.equal(await pathExists(rootPath), false);
});

test('bounded app runtime supersede path cleans old projections and retains replacement projections', async () => {
  const harness = await createTempApp();
  const { app, rootPath } = harness;
  const oldMemoryId = 'bounded-runtime-supersede-old-memory';
  const newMemoryId = 'bounded-runtime-supersede-new-memory';

  try {
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId: oldMemoryId,
      target: 'process',
      status: 'active',
      timestamp: '2026-07-06T00:00:00.000Z'
    });
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId: newMemoryId,
      target: 'process',
      status: 'proposal',
      timestamp: '2026-07-06T00:00:01.000Z'
    });

    const result = await app.executeInternalSupersede(
      supersedePayload(oldMemoryId, newMemoryId),
      approvedSupersedeRuntimeContext()
    );
    const cleanupReport = result.projectionCleanupReport;

    assert.equal(result.decision, 'superseded');
    assert.equal(result.mutated, true);
    assert.equal(result.oldFromStatus, 'active');
    assert.equal(result.oldToStatus, 'superseded');
    assert.equal(result.newFromStatus, 'proposal');
    assert.equal(result.newToStatus, 'active');
    assert.equal(result.projectionCleanupStatus, 'accepted');
    assert.equal(cleanupReport.accepted, true);
    assert.equal(cleanupReport.lifecycleFamily, 'supersede_memory');
    assert.equal(cleanupReport.targetStatus, 'superseded');
    assert.deepEqual(cleanupReport.residualProjectionFamilies, []);

    assert.deepEqual(cleanupReport.beforeCounts, {
      diary_record: 1,
      sqlite_shadow_record: 1,
      sqlite_memory_chunks: 3,
      vector_index: 1,
      embedding_cache: 3,
      candidate_cache: 1,
      write_audit: 3,
      recall_audit: 1,
      reconcile_queue: 2,
      degraded_payload: 1
    });
    assert.deepEqual(cleanupReport.afterCounts, {
      diary_record: 1,
      sqlite_shadow_record: 1,
      sqlite_memory_chunks: 0,
      vector_index: 0,
      embedding_cache: 0,
      candidate_cache: 0,
      write_audit: 4,
      recall_audit: 2,
      reconcile_queue: 0,
      degraded_payload: 0
    });

    const oldRecord = await app.stores.shadowStore.getRecord(oldMemoryId);
    const newRecord = await app.stores.shadowStore.getRecord(newMemoryId);
    const oldManifest = await app.stores.shadowStore.getMemoryWriteManifestByMemoryId(oldMemoryId);
    const newManifest = await app.stores.shadowStore.getMemoryWriteManifestByMemoryId(newMemoryId);

    assert.equal(oldRecord.status, 'superseded');
    assert.equal(newRecord.status, 'active');
    assert.equal(await app.stores.shadowStore.countChunksForRecord(oldMemoryId, { currentFingerprintOnly: false }), 0);
    assert.equal(await app.stores.shadowStore.countChunksForRecord(newMemoryId, { currentFingerprintOnly: false }), 3);
    assert.equal(await app.stores.vectorStore.hasRecord(oldMemoryId), false);
    assert.equal(await app.stores.vectorStore.hasRecord(newMemoryId), true);
    assert.equal(await app.stores.candidateCacheStore.countCurrentFingerprintByMemoryIds([oldMemoryId]), 0);
    assert.equal(await app.stores.candidateCacheStore.countCurrentFingerprintByMemoryIds([newMemoryId]), 1);
    assert.equal(oldManifest.status, 'repaired');
    assert.equal(oldManifest.record, null);
    assert.equal(newManifest.status, 'degraded');
    assert.notEqual(newManifest.record, null);
  } finally {
    await cleanupTempApp(harness);
  }

  assert.equal(await pathExists(rootPath), false);
});

test('bounded app runtime tombstone path warns when cleanup audit append fails after mutation', async () => {
  const harness = await createTempApp();
  const { app, rootPath } = harness;
  const memoryId = 'bounded-runtime-cleanup-audit-warning-memory';

  try {
    await seedTempStoreBackedLifecycleProjection({
      diaryStore: app.stores.diaryStore,
      shadowStore: app.stores.shadowStore,
      vectorStore: app.stores.vectorStore,
      candidateCacheStore: app.stores.candidateCacheStore,
      auditLogStore: app.stores.auditLogStore,
      memoryId,
      target: 'process',
      status: 'active',
      timestamp: '2026-07-06T00:00:00.000Z'
    });

    app.stores.auditLogStore.appendRecallAudit = async () => {
      throw new Error('cleanup recall audit unavailable');
    };

    const result = await app.executeInternalTombstone(tombstonePayload(memoryId), approvedRuntimeContext());
    const record = await app.stores.shadowStore.getRecord(memoryId);

    assert.equal(result.decision, 'tombstoned-with-warning');
    assert.equal(result.mutated, true);
    assert.equal(result.projectionCleanupStatus, 'failed_after_mutation');
    assert.equal(result.projectionCleanupReport, null);
    assert.match(result.reason, /projection cleanup did not fully complete/);
    assert.equal(record.status, 'tombstoned');
    assert.equal(await app.stores.shadowStore.countChunksForRecord(memoryId, { currentFingerprintOnly: false }), 0);
    assert.equal(await app.stores.vectorStore.hasRecord(memoryId), false);
  } finally {
    await cleanupTempApp(harness);
  }

  assert.equal(await pathExists(rootPath), false);
});
