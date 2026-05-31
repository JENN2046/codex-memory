'use strict';

const {
  RESULT_STATUS_ACCEPTED: DESIGN_REVIEW_STATUS_ACCEPTED,
  TASK_ID: DESIGN_REVIEW_TASK_ID
} = require('./MemoryWriteRollbackCleanupDesignReviewPolicy');

const {
  REQUIRED_FALSE_FLAGS,
  REQUIRED_TRUE_FLAGS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED: DRY_RUN_PREVIEW_STATUS_ACCEPTED,
  buildCleanupPreviewApplyGate,
  evaluateMemoryWriteRollbackCleanupDryRunPreview
} = require('./MemoryWriteRollbackCleanupDryRunPreview');

const TASK_ID = 'CM-1062_MEMORY_WRITE_ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW';
const RESULT_STATUS_ACCEPTED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_NOT_READY';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeLimit(value, fallback = 50) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function createZeroPreviewCounters() {
  return Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, 0]));
}

function collectDesignReviewBlockers(designReviewReport = {}) {
  const safeReport = isPlainObject(designReviewReport) ? designReviewReport : {};
  const blockers = [];
  if (safeReport.taskId !== DESIGN_REVIEW_TASK_ID) blockers.push('design_review_task_id_mismatch');
  if (safeReport.status !== DESIGN_REVIEW_STATUS_ACCEPTED) blockers.push('design_review_status_must_be_accepted');
  if (safeReport.designReviewAccepted !== true) blockers.push('design_review_acceptance_missing');
  if (safeReport.decision !== 'ROLLBACK_CLEANUP_DESIGN_REVIEW_ACCEPTED_STOP_BEFORE_APPLY_NOT_READY') {
    blockers.push('design_review_decision_mismatch');
  }
  if (Array.isArray(safeReport.blockerReasons) && safeReport.blockerReasons.length > 0) {
    blockers.push('design_review_has_blockers');
  }
  return blockers;
}

function collectStoreBlockers(stores = {}) {
  const safeStores = isPlainObject(stores) ? stores : {};
  const blockers = [];
  if (typeof safeStores.shadowStore?.getRecord !== 'function') {
    blockers.push('shadowStore_getRecord_missing');
  }
  if (typeof safeStores.shadowStore?.listReconcileTasksForMemoryId !== 'function') {
    blockers.push('shadowStore_listReconcileTasksForMemoryId_missing');
  }
  if (typeof safeStores.vectorStore?.hasRecord !== 'function') {
    blockers.push('vectorStore_hasRecord_missing');
  }
  if (typeof safeStores.candidateCacheStore?.countCurrentFingerprintByMemoryIds !== 'function') {
    blockers.push('candidateCacheStore_countCurrentFingerprintByMemoryIds_missing');
  }
  return blockers;
}

function buildPreviewInput({
  designReviewReport,
  memoryId,
  previewId,
  target,
  sqliteShadowRecordPresent,
  vectorIndexRecordPresent,
  candidateCacheEntryCount,
  reconcileTasks
}) {
  const cleanupPreview = {
    previewId,
    sourceDesignReviewTaskId: DESIGN_REVIEW_TASK_ID,
    mode: 'dry_run_preview_only',
    scope: 'memory_id_and_store_kind_scoped',
    target,
    memoryId,
    targetStores: [
      'sqlite_shadow_record',
      'vector_index_record',
      'candidate_cache_entries',
      'reconcile_queue_tasks'
    ],
    retainedStores: [
      'diary_record',
      'write_audit_log'
    ],
    sqliteShadowRecordPresent,
    vectorIndexRecordPresent,
    candidateCacheEntryCount,
    reconcileTasks,
    previewOnly: true,
    usesAcceptedDesignReview: true,
    exactMemoryIdConfirmed: true,
    storeKindScoped: true,
    preservesUnrelatedMemoryIds: true,
    retainsDiary: true,
    retainsAuditAppendOnly: true,
    requiresSeparateApplyApproval: true,
    requiresRuntimeValidationBeforeApply: true,
    stopsBeforeApply: true
  };

  for (const key of REQUIRED_FALSE_FLAGS) {
    cleanupPreview[key] = false;
  }
  for (const key of REQUIRED_TRUE_FLAGS) {
    if (!Object.prototype.hasOwnProperty.call(cleanupPreview, key)) {
      cleanupPreview[key] = true;
    }
  }

  return {
    designReviewReport,
    cleanupPreview,
    sideEffectCounters: createZeroPreviewCounters()
  };
}

async function buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const memoryId = firstNormalizedString(safeInput.memoryId, safeInput.memory_id);
  const target = normalizeString(safeInput.target) || 'process';
  const previewId = normalizeString(safeInput.previewId) || 'CM-1062-store-backed-dry-run-preview';
  const limit = normalizeLimit(safeInput.reconcileTaskLimit, 50);
  const preflightBlockers = [
    ...collectDesignReviewBlockers(safeInput.designReviewReport),
    ...collectStoreBlockers(safeInput.stores)
  ];
  if (!memoryId) preflightBlockers.push('memoryId_missing');
  if (target !== 'process') preflightBlockers.push('target_must_be_process');

  if (preflightBlockers.length > 0) {
    return {
      taskId: TASK_ID,
      status: RESULT_STATUS_BLOCKED,
      storeBackedDryRunPreviewAccepted: false,
      decision: 'ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_BEFORE_STORE_READ_NOT_READY',
      sourceDesignReviewTaskId: DESIGN_REVIEW_TASK_ID,
      memoryId,
      target,
      plannedActions: [],
      retainedEvidence: [],
      applyGate: buildCleanupPreviewApplyGate({ dryRunPreviewAccepted: false }),
      storeReadSummary: {
        readsAttempted: false,
        storeReadCount: 0,
        sqliteShadowRecordPresent: false,
        vectorIndexRecordPresent: false,
        candidateCacheEntryCount: 0,
        reconcileTaskCount: 0
      },
      cleanupPreviewReport: null,
      blockerReasons: [...new Set(preflightBlockers)],
      safety: {
        sourceMode: 'store_backed_exact_memory_id_read_only',
        readsStores: false,
        writesStores: false,
        appliesCleanup: false,
        appliesRollback: false,
        deletesDiary: false,
        rewritesAudit: false,
        expandsPublicMcp: false,
        changesConfigWatchdogStartup: false,
        changesDependencies: false,
        claimsRealCleanupSafe: false,
        claimsRealRollbackSafe: false,
        claimsWriteReliable: false,
        claimsReadiness: false
      }
    };
  }

  const { shadowStore, vectorStore, candidateCacheStore } = safeInput.stores;
  const shadowRecord = await shadowStore.getRecord(memoryId);
  const vectorIndexRecordPresent = await vectorStore.hasRecord(memoryId);
  const candidateCacheEntryCount = await candidateCacheStore.countCurrentFingerprintByMemoryIds([memoryId], [target]);
  const reconcileTasks = await shadowStore.listReconcileTasksForMemoryId(memoryId, limit);
  const normalizedReconcileTasks = reconcileTasks.map(task => ({
    memoryId: firstNormalizedString(task.memoryId, task.memory_id),
    storeKind: firstNormalizedString(task.storeKind, task.store_kind)
  }));

  const previewInput = buildPreviewInput({
    designReviewReport: safeInput.designReviewReport,
    memoryId,
    previewId,
    target,
    sqliteShadowRecordPresent: shadowRecord !== null,
    vectorIndexRecordPresent,
    candidateCacheEntryCount,
    reconcileTasks: normalizedReconcileTasks
  });
  const cleanupPreviewReport = evaluateMemoryWriteRollbackCleanupDryRunPreview(previewInput);
  const accepted = cleanupPreviewReport.status === DRY_RUN_PREVIEW_STATUS_ACCEPTED;
  const blockerReasons = accepted ? [] : cleanupPreviewReport.blockerReasons;

  return {
    taskId: TASK_ID,
    status: accepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    storeBackedDryRunPreviewAccepted: accepted,
    decision: accepted
      ? 'ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY'
      : 'ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_AFTER_STORE_READ_NOT_READY',
    sourceDesignReviewTaskId: DESIGN_REVIEW_TASK_ID,
    memoryId,
    target,
    plannedActions: cleanupPreviewReport.plannedActions,
    retainedEvidence: cleanupPreviewReport.retainedEvidence,
    applyGate: cleanupPreviewReport.applyGate,
    storeReadSummary: {
      readsAttempted: true,
      storeReadCount: 4,
      sqliteShadowRecordPresent: shadowRecord !== null,
      vectorIndexRecordPresent,
      candidateCacheEntryCount,
      reconcileTaskCount: normalizedReconcileTasks.length
    },
    cleanupPreviewReport,
    blockerReasons,
    safety: {
      sourceMode: 'store_backed_exact_memory_id_read_only',
      readsStores: true,
      writesStores: false,
      appliesCleanup: false,
      appliesRollback: false,
      deletesDiary: false,
      rewritesAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      claimsRealCleanupSafe: false,
      claimsRealRollbackSafe: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  buildMemoryWriteRollbackCleanupStoreBackedDryRunPreview
};
