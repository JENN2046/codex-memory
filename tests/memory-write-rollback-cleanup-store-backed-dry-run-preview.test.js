'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_ZERO_COUNTER_KEYS: PLAN_BOUNDARY_ZERO_COUNTER_KEYS,
  evaluateMemoryWriteRollbackCleanupPlanBoundary
} = require('../src/core/MemoryWriteRollbackCleanupPlanBoundary');

const {
  REQUIRED_RETAINED_STORES,
  REQUIRED_SEQUENCE,
  REQUIRED_TARGET_STORES,
  REQUIRED_ZERO_COUNTER_KEYS: DESIGN_REVIEW_ZERO_COUNTER_KEYS,
  evaluateMemoryWriteRollbackCleanupDesignReviewPolicy
} = require('../src/core/MemoryWriteRollbackCleanupDesignReviewPolicy');

const {
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview
} = require('../src/core/MemoryWriteRollbackCleanupStoreBackedDryRunPreview');

const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');

function zeroCounters(keys) {
  return Object.fromEntries(keys.map(key => [key, 0]));
}

function createAcceptedPlanBoundaryReport() {
  return evaluateMemoryWriteRollbackCleanupPlanBoundary({
    evidenceRefs: [...REQUIRED_EVIDENCE_REFS],
    surfaceEvidence: {
      rejectedWriteNoProjectionEvidence: true,
      acceptedProjectionAccountingEvidence: true,
      degradedResidualVisibilityEvidence: true,
      projectionCleanupPartialEvidence: true,
      reconcileCleanupAllKindsEvidence: true,
      reconcileStoreKindCleanupEvidence: true,
      reconcileMemoryIdIsolationEvidence: true,
      candidateCacheMemoryIdCleanupEvidence: true,
      diaryResidualRetainedEvidence: true,
      auditAppendOnlyEvidence: true,
      realCleanupSafetyProven: false,
      realRollbackSafetyProven: false,
      diaryDeletionImplemented: false,
      auditDeletionOrRewriteImplemented: false,
      publicCleanupToolImplemented: false
    },
    cleanupPlan: {
      planId: 'CM-1062-plan-boundary-consumption',
      target: 'process',
      nextStage: 'real_cleanup_design_review_only',
      scope: 'memory_id_and_store_kind_scoped',
      designOnly: true,
      exactMemoryIdRequired: true,
      storeKindRequiredForPartialResiduals: true,
      preserveUnrelatedMemoryIds: true,
      preserveDiaryByDefault: true,
      preserveAuditAppendOnly: true,
      requiresSeparateRealCleanupApproval: true,
      requiresSeparateDiaryPolicy: true,
      requiresSeparateAuditPolicy: true,
      requiresSeparateRuntimeValidation: true,
      executionApproved: false,
      realCleanupApply: false,
      realRollbackApply: false,
      publicMcpExpansion: false,
      configWatchdogStartupChange: false,
      dependencyChange: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    },
    sideEffectCounters: zeroCounters(PLAN_BOUNDARY_ZERO_COUNTER_KEYS)
  });
}

function createAcceptedDesignReviewReport(overrides = {}) {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy({
    planBoundaryReport: createAcceptedPlanBoundaryReport(),
    cleanupDesignReview: {
      reviewId: 'CM-1062-design-review-consumption',
      sourceBoundaryTaskId: 'CM-1059_MEMORY_WRITE_ROLLBACK_CLEANUP_PLAN_BOUNDARY',
      mode: 'design_review_only',
      scope: 'memory_id_and_store_kind_scoped',
      sequence: [...REQUIRED_SEQUENCE],
      targetStores: [...REQUIRED_TARGET_STORES],
      retainedStores: [...REQUIRED_RETAINED_STORES],
      designReviewOnly: true,
      requiresAcceptedPlanBoundary: true,
      requiresExactMemoryId: true,
      requiresStoreKindForPartialResiduals: true,
      preservesUnrelatedMemoryIds: true,
      previewsBeforeApply: true,
      requiresDryRunReport: true,
      requiresOperatorReceipt: true,
      requiresSeparateApplyApproval: true,
      requiresSeparateDiaryPolicy: true,
      requiresSeparateAuditPolicy: true,
      requiresRuntimeValidationBeforeApply: true,
      stopsBeforeApply: true,
      executesCleanup: false,
      appliesRollback: false,
      deletesDiaryByDefault: false,
      rewritesAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      claimsRealCleanupSafe: false,
      claimsRealRollbackSafe: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    sideEffectCounters: zeroCounters(DESIGN_REVIEW_ZERO_COUNTER_KEYS)
  });
  return { ...report, ...overrides };
}

async function createTempStores() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1062-store-backed-preview-'));
  const config = {
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    candidateCachePath: path.join(rootPath, 'cache', 'candidate-cache.json'),
    embeddingFingerprint: 'cm1062-store-backed-preview-v1',
    embedDimensions: 32,
    enableVectorIndex: true,
    enableEmbeddingCache: true,
    enableCandidateCache: true,
    candidateCacheMaxEntries: 10,
    candidateCacheTtlMs: 60_000
  };
  const shadowStore = new SqliteShadowStore(config);
  const vectorStore = new VectorIndexStore(config);
  const candidateCacheStore = new CandidateCacheStore(config);

  async function cleanup() {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  return {
    candidateCacheStore,
    cleanup,
    config,
    rootPath,
    shadowStore,
    vectorStore
  };
}

function processRecord(memoryId, overrides = {}) {
  return {
    memoryId,
    target: 'process',
    title: 'Checkpoint: CM-1062 store-backed cleanup preview',
    content: 'CM1062 store backed cleanup dry-run preview marker',
    evidence: 'cm1062 synthetic temp-local store-backed cleanup preview evidence',
    tags: ['cm1062', 'rollback', 'cleanup', 'preview'],
    validated: true,
    reusable: false,
    sensitivity: 'none',
    projectId: 'codex-memory',
    workspaceId: 'cm1062-store-backed-preview-workspace',
    clientId: 'codex',
    taskId: 'CM-1062',
    conversationId: 'cm1062-store-backed-preview',
    visibility: 'project',
    retentionPolicy: 'keep',
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
    ...overrides
  };
}

test('CM-1062 builds a store-backed dry-run preview without applying cleanup', async () => {
  const stores = await createTempStores();
  const memoryId = 'process-memory-cm-1062';
  const unrelatedMemoryId = 'process-memory-cm-1062-unrelated';

  try {
    const record = processRecord(memoryId);
    await stores.shadowStore.upsertRecord(record);
    await stores.vectorStore.upsertRecord(record);
    await stores.candidateCacheStore.set('cm1062-cache-entry', { ids: [memoryId] }, {
      memoryIds: [memoryId],
      target: 'process'
    });
    await stores.candidateCacheStore.set('cm1062-unrelated-cache-entry', { ids: [unrelatedMemoryId] }, {
      memoryIds: [unrelatedMemoryId],
      target: 'process'
    });
    await stores.candidateCacheStore.set('cm1062-target-only-cache-entry', { ids: ['target-only'] }, {
      target: 'process'
    });
    await stores.shadowStore.enqueueReconcileTask({
      memoryId,
      storeKind: 'vector',
      reason: 'cm1062-vector-preview',
      payload: { memoryId }
    });
    await stores.shadowStore.enqueueReconcileTask({
      memoryId,
      storeKind: 'chunks',
      reason: 'cm1062-chunks-preview',
      payload: { memoryId }
    });
    await stores.shadowStore.enqueueReconcileTask({
      memoryId: unrelatedMemoryId,
      storeKind: 'chunks',
      reason: 'cm1062-unrelated-preview',
      payload: { memoryId: unrelatedMemoryId }
    });

    const healthBefore = await stores.shadowStore.getHealth();
    const cacheHealthBefore = await stores.candidateCacheStore.getHealth();

    const report = await buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview({
      designReviewReport: createAcceptedDesignReviewReport(),
      memoryId,
      previewId: 'CM-1062-store-backed-preview',
      stores
    });

    assert.equal(report.status, RESULT_STATUS_ACCEPTED);
    assert.equal(report.storeBackedDryRunPreviewAccepted, true);
    assert.equal(report.storeReadSummary.readsAttempted, true);
    assert.equal(report.storeReadSummary.storeReadCount, 4);
    assert.equal(report.storeReadSummary.sqliteShadowRecordPresent, true);
    assert.equal(report.storeReadSummary.vectorIndexRecordPresent, true);
    assert.equal(report.storeReadSummary.candidateCacheEntryCount, 1);
    assert.equal(report.storeReadSummary.reconcileTaskCount, 2);
    assert.deepEqual(report.plannedActions, [
      {
        action: 'delete_sqlite_shadow_record',
        store: 'sqlite_shadow_record',
        memoryId,
        applies: false
      },
      {
        action: 'delete_vector_index_record',
        store: 'vector_index_record',
        memoryId,
        applies: false
      },
      {
        action: 'clear_candidate_cache_entries',
        store: 'candidate_cache_entries',
        memoryId,
        expectedEntryCount: 1,
        applies: false
      },
      {
        action: 'clear_reconcile_tasks',
        store: 'reconcile_queue_tasks',
        memoryId,
        storeKind: 'chunks',
        expectedTaskCount: 1,
        applies: false
      },
      {
        action: 'clear_reconcile_tasks',
        store: 'reconcile_queue_tasks',
        memoryId,
        storeKind: 'vector',
        expectedTaskCount: 1,
        applies: false
      }
    ]);
    assert.equal(report.cleanupPreviewReport.dryRunPreviewAccepted, true);
    assert.equal(report.safety.readsStores, true);
    assert.equal(report.safety.writesStores, false);
    assert.equal(report.safety.appliesCleanup, false);
    assert.equal(report.safety.appliesRollback, false);
    assert.equal(report.safety.expandsPublicMcp, false);
    assert.equal(report.safety.claimsReadiness, false);

    const healthAfter = await stores.shadowStore.getHealth();
    const cacheHealthAfter = await stores.candidateCacheStore.getHealth();
    assert.equal(healthAfter.recordCount, healthBefore.recordCount);
    assert.equal(healthAfter.reconcileCount, healthBefore.reconcileCount);
    assert.equal(await stores.vectorStore.hasRecord(memoryId), true);
    assert.equal(cacheHealthAfter.entryCount, cacheHealthBefore.entryCount);
  } finally {
    await stores.cleanup();
  }
});

test('CM-1062 blocks before store reads when design review is not accepted', async () => {
  let readAttempted = false;
  const stores = {
    shadowStore: {
      async getRecord() {
        readAttempted = true;
        return null;
      },
      async listReconcileTasksForMemoryId() {
        readAttempted = true;
        return [];
      }
    },
    vectorStore: {
      async hasRecord() {
        readAttempted = true;
        return false;
      }
    },
    candidateCacheStore: {
      async countCurrentFingerprintByMemoryIds() {
        readAttempted = true;
        return 0;
      }
    }
  };

  const report = await buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview({
    designReviewReport: createAcceptedDesignReviewReport({
      status: 'MEMORY_WRITE_ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY',
      designReviewAccepted: false
    }),
    memoryId: 'process-memory-cm-1062',
    stores
  });

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.storeReadSummary.readsAttempted, false);
  assert.equal(readAttempted, false);
  assert.ok(report.blockerReasons.includes('design_review_status_must_be_accepted'));
  assert.ok(report.blockerReasons.includes('design_review_acceptance_missing'));
});

test('CM-1062 blocks after exact store reads when no cleanup targets exist', async () => {
  const stores = {
    shadowStore: {
      async getRecord() {
        return null;
      },
      async listReconcileTasksForMemoryId() {
        return [];
      }
    },
    vectorStore: {
      async hasRecord() {
        return false;
      }
    },
    candidateCacheStore: {
      async countCurrentFingerprintByMemoryIds() {
        return 0;
      }
    }
  };

  const report = await buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview({
    designReviewReport: createAcceptedDesignReviewReport(),
    memoryId: 'process-memory-cm-1062-missing',
    stores
  });

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.storeReadSummary.readsAttempted, true);
  assert.equal(report.storeReadSummary.storeReadCount, 4);
  assert.deepEqual(report.plannedActions, []);
  assert.ok(report.blockerReasons.includes('cleanup_preview_targets_missing'));
  assert.equal(report.safety.writesStores, false);
  assert.equal(report.safety.appliesCleanup, false);
});

test('CM-1062 blocks before store reads when required store helpers are missing', async () => {
  const report = await buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview({
    designReviewReport: createAcceptedDesignReviewReport(),
    memoryId: 'process-memory-cm-1062',
    stores: {
      shadowStore: {},
      vectorStore: {},
      candidateCacheStore: {}
    }
  });

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.storeReadSummary.readsAttempted, false);
  assert.ok(report.blockerReasons.includes('shadowStore_getRecord_missing'));
  assert.ok(report.blockerReasons.includes('shadowStore_listReconcileTasksForMemoryId_missing'));
  assert.ok(report.blockerReasons.includes('vectorStore_hasRecord_missing'));
  assert.ok(report.blockerReasons.includes('candidateCacheStore_countCurrentFingerprintByMemoryIds_missing'));
});
