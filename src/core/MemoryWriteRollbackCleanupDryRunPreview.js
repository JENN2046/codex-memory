'use strict';

const {
  REQUIRED_RETAINED_STORES,
  REQUIRED_TARGET_STORES,
  RESULT_STATUS_ACCEPTED: DESIGN_REVIEW_STATUS_ACCEPTED,
  TASK_ID: DESIGN_REVIEW_TASK_ID
} = require('./MemoryWriteRollbackCleanupDesignReviewPolicy');

const TASK_ID = 'CM-1061_MEMORY_WRITE_ROLLBACK_CLEANUP_DRY_RUN_PREVIEW';
const RESULT_STATUS_ACCEPTED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_DRY_RUN_PREVIEW_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_DRY_RUN_PREVIEW_BLOCKED_NOT_READY';

const REQUIRED_TRUE_FLAGS = Object.freeze([
  'previewOnly',
  'usesAcceptedDesignReview',
  'exactMemoryIdConfirmed',
  'storeKindScoped',
  'preservesUnrelatedMemoryIds',
  'retainsDiary',
  'retainsAuditAppendOnly',
  'requiresSeparateApplyApproval',
  'requiresRuntimeValidationBeforeApply',
  'stopsBeforeApply'
]);

const REQUIRED_FALSE_FLAGS = Object.freeze([
  'executesCleanup',
  'appliesRollback',
  'deletesDiary',
  'rewritesAudit',
  'expandsPublicMcp',
  'changesConfigWatchdogStartup',
  'changesDependencies',
  'claimsRealCleanupSafe',
  'claimsRealRollbackSafe',
  'claimsWriteReliable',
  'claimsReadiness'
]);

const REQUIRED_ZERO_COUNTER_KEYS = Object.freeze([
  'trueLiveRecordMemoryCalls',
  'trueLiveSearchMemoryCalls',
  'realMemoryReads',
  'directJsonlReads',
  'providerCalls',
  'apiCalls',
  'durableRealMemoryWrites',
  'durableRealAuditWrites',
  'storeReads',
  'storeWrites',
  'cleanupApplyRuns',
  'rollbackApplyRuns',
  'diaryDeleteRuns',
  'auditRewriteRuns',
  'publicMcpExpansion',
  'configWatchdogStartupChanges',
  'dependencyActions',
  'readinessClaims',
  'reliabilityClaims'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeString).filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true ? true : value === false ? false : null;
}

function normalizeInteger(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    ? value
    : null;
}

function sameStringSet(actual, expected) {
  const actualSet = new Set(actual);
  if (actualSet.size !== expected.length) return false;
  return expected.every(item => actualSet.has(item));
}

function collectDesignReviewBlockers(designReviewReport = {}) {
  const safeReport = isPlainObject(designReviewReport) ? designReviewReport : {};
  const blockers = [];

  if (safeReport.taskId !== DESIGN_REVIEW_TASK_ID) {
    blockers.push('design_review_task_id_mismatch');
  }
  if (safeReport.status !== DESIGN_REVIEW_STATUS_ACCEPTED) {
    blockers.push('design_review_status_must_be_accepted');
  }
  if (safeReport.designReviewAccepted !== true) {
    blockers.push('design_review_acceptance_missing');
  }
  if (safeReport.decision !== 'ROLLBACK_CLEANUP_DESIGN_REVIEW_ACCEPTED_STOP_BEFORE_APPLY_NOT_READY') {
    blockers.push('design_review_decision_mismatch');
  }
  if (Array.isArray(safeReport.blockerReasons) && safeReport.blockerReasons.length > 0) {
    blockers.push('design_review_has_blockers');
  }

  const safety = isPlainObject(safeReport.safety) ? safeReport.safety : {};
  const forbiddenSafetyFlags = [
    'readsFiles',
    'executesCommands',
    'callsRecordMemory',
    'callsSearchMemory',
    'callsProvider',
    'readsRawMemory',
    'readsJsonl',
    'writesDurableMemory',
    'writesDurableAudit',
    'appliesCleanup',
    'appliesRollback',
    'deletesDiary',
    'rewritesAudit',
    'expandsPublicMcp',
    'changesConfigWatchdogStartup',
    'changesDependencies',
    'claimsRealCleanupSafe',
    'claimsRealRollbackSafe',
    'claimsWriteReliable',
    'claimsReadiness'
  ];

  for (const key of forbiddenSafetyFlags) {
    if (safety[key] !== false) blockers.push(`design_review_safety_${key}_must_be_false`);
  }
  if (safety.sourceMode !== 'explicit_input_only') {
    blockers.push('design_review_source_mode_must_be_explicit_input_only');
  }

  return blockers;
}

function normalizeReconcileTasks(reconcileTasks = []) {
  if (!Array.isArray(reconcileTasks)) return [];
  return reconcileTasks
    .filter(isPlainObject)
    .map(task => ({
      memoryId: normalizeString(task.memoryId || task.memory_id),
      storeKind: normalizeString(task.storeKind || task.store_kind)
    }));
}

function normalizeCleanupPreview(cleanupPreview = {}) {
  const safePreview = isPlainObject(cleanupPreview) ? cleanupPreview : {};
  const normalized = {
    previewId: normalizeString(safePreview.previewId),
    sourceDesignReviewTaskId: normalizeString(safePreview.sourceDesignReviewTaskId),
    mode: normalizeString(safePreview.mode),
    scope: normalizeString(safePreview.scope),
    target: normalizeString(safePreview.target),
    memoryId: normalizeString(safePreview.memoryId || safePreview.memory_id),
    targetStores: normalizeStringArray(safePreview.targetStores),
    retainedStores: normalizeStringArray(safePreview.retainedStores),
    sqliteShadowRecordPresent: normalizeBoolean(safePreview.sqliteShadowRecordPresent),
    vectorIndexRecordPresent: normalizeBoolean(safePreview.vectorIndexRecordPresent),
    candidateCacheEntryCount: normalizeInteger(safePreview.candidateCacheEntryCount),
    reconcileTasks: normalizeReconcileTasks(safePreview.reconcileTasks)
  };

  for (const key of [...REQUIRED_TRUE_FLAGS, ...REQUIRED_FALSE_FLAGS]) {
    normalized[key] = normalizeBoolean(safePreview[key]);
  }

  return normalized;
}

function collectPreviewBlockers(cleanupPreview = {}) {
  const safePreview = isPlainObject(cleanupPreview) ? cleanupPreview : {};
  const preview = normalizeCleanupPreview(safePreview);
  const blockers = [];

  if (!preview.previewId) blockers.push('previewId_missing');
  if (preview.sourceDesignReviewTaskId !== DESIGN_REVIEW_TASK_ID) {
    blockers.push('sourceDesignReviewTaskId_mismatch');
  }
  if (preview.mode !== 'dry_run_preview_only') blockers.push('mode_must_be_dry_run_preview_only');
  if (preview.scope !== 'memory_id_and_store_kind_scoped') {
    blockers.push('scope_must_be_memory_id_and_store_kind_scoped');
  }
  if (preview.target !== 'process') blockers.push('target_must_be_process');
  if (!preview.memoryId) blockers.push('memoryId_missing');
  if (!sameStringSet(preview.targetStores, REQUIRED_TARGET_STORES)) {
    blockers.push('target_stores_exact_set_mismatch');
  }
  if (!sameStringSet(preview.retainedStores, REQUIRED_RETAINED_STORES)) {
    blockers.push('retained_stores_exact_set_mismatch');
  }
  if (preview.sqliteShadowRecordPresent === null) {
    blockers.push('sqliteShadowRecordPresent_malformed');
  }
  if (preview.vectorIndexRecordPresent === null) {
    blockers.push('vectorIndexRecordPresent_malformed');
  }
  if (preview.candidateCacheEntryCount === null) {
    blockers.push('candidateCacheEntryCount_malformed');
  }

  for (const key of REQUIRED_TRUE_FLAGS) {
    if (safePreview[key] !== true) blockers.push(`preview_${key}_must_be_true`);
  }
  for (const key of REQUIRED_FALSE_FLAGS) {
    if (safePreview[key] !== false) blockers.push(`preview_${key}_must_be_false`);
  }

  const malformedReconcileInput = Array.isArray(safePreview.reconcileTasks) === false;
  if (malformedReconcileInput) {
    blockers.push('reconcileTasks_must_be_array');
  } else {
    for (const task of safePreview.reconcileTasks) {
      if (!isPlainObject(task)) blockers.push('reconcile_task_malformed');
    }
  }

  for (const task of preview.reconcileTasks) {
    if (!task.memoryId) blockers.push('reconcile_task_memoryId_missing');
    if (!task.storeKind) blockers.push('reconcile_task_storeKind_missing');
    if (preview.memoryId && task.memoryId && task.memoryId !== preview.memoryId) {
      blockers.push('reconcile_task_memoryId_mismatch');
    }
  }

  const targetCount = [
    preview.sqliteShadowRecordPresent === true,
    preview.vectorIndexRecordPresent === true,
    preview.candidateCacheEntryCount > 0,
    preview.reconcileTasks.length > 0
  ].filter(Boolean).length;
  if (targetCount === 0) blockers.push('cleanup_preview_targets_missing');

  return blockers;
}

function normalizeCounterMap(value = {}) {
  const safeCounters = isPlainObject(value) ? value : {};
  const counters = {};
  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
    counters[key] = safeCounters[key];
  }
  return counters;
}

function collectCounterBlockers(counters = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  const normalizedCounters = normalizeCounterMap(safeCounters);
  const blockers = [];

  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(safeCounters, key)) {
      blockers.push(`counter_${key}_missing`);
      continue;
    }
    const value = normalizeInteger(normalizedCounters[key]);
    if (value === null) {
      blockers.push(`counter_${key}_malformed`);
    } else if (value !== 0) {
      blockers.push(`counter_${key}_must_be_zero`);
    }
  }

  for (const [key, value] of Object.entries(safeCounters)) {
    if (REQUIRED_ZERO_COUNTER_KEYS.includes(key)) continue;
    const normalized = normalizeInteger(value);
    if (normalized === null) {
      blockers.push(`counter_${key}_unknown_malformed`);
    } else if (normalized !== 0) {
      blockers.push(`counter_${key}_unknown_nonzero`);
    }
  }

  return blockers;
}

function buildPlannedActions(preview) {
  const actions = [];

  if (preview.sqliteShadowRecordPresent === true) {
    actions.push({
      action: 'delete_sqlite_shadow_record',
      store: 'sqlite_shadow_record',
      memoryId: preview.memoryId,
      applies: false
    });
  }
  if (preview.vectorIndexRecordPresent === true) {
    actions.push({
      action: 'delete_vector_index_record',
      store: 'vector_index_record',
      memoryId: preview.memoryId,
      applies: false
    });
  }
  if (preview.candidateCacheEntryCount > 0) {
    actions.push({
      action: 'clear_candidate_cache_entries',
      store: 'candidate_cache_entries',
      memoryId: preview.memoryId,
      expectedEntryCount: preview.candidateCacheEntryCount,
      applies: false
    });
  }

  const reconcileByStoreKind = new Map();
  for (const task of preview.reconcileTasks) {
    if (!task.storeKind) continue;
    reconcileByStoreKind.set(
      task.storeKind,
      (reconcileByStoreKind.get(task.storeKind) || 0) + 1
    );
  }
  for (const [storeKind, taskCount] of [...reconcileByStoreKind.entries()].sort()) {
    actions.push({
      action: 'clear_reconcile_tasks',
      store: 'reconcile_queue_tasks',
      memoryId: preview.memoryId,
      storeKind,
      expectedTaskCount: taskCount,
      applies: false
    });
  }

  return actions;
}

function buildCleanupPreviewApplyGate({ dryRunPreviewAccepted = false } = {}) {
  return {
    gateId: 'CM-1069_MEMORY_WRITE_ROLLBACK_CLEANUP_PREVIEW_APPLY_GATE',
    gateMode: 'separate_apply_approval_required',
    dryRunPreviewAccepted: dryRunPreviewAccepted === true,
    applyAuthorized: false,
    applyExecuted: false,
    approvalRequiredBeforeApply: true,
    runtimeValidationRequiredBeforeApply: true,
    operatorReceiptRequiredBeforeApply: true,
    destructiveActionAllowed: false,
    cleanupApplyRunsAllowed: 0,
    rollbackApplyRunsAllowed: 0,
    nextAllowedAction: dryRunPreviewAccepted === true
      ? 'request_separate_cleanup_apply_approval'
      : 'fix_preview_blockers_before_apply_consideration'
  };
}

function evaluateMemoryWriteRollbackCleanupDryRunPreview(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const cleanupPreview = normalizeCleanupPreview(safeInput.cleanupPreview);
  const sideEffectCounters = normalizeCounterMap(safeInput.sideEffectCounters);
  const blockerReasons = [...new Set([
    ...collectDesignReviewBlockers(safeInput.designReviewReport),
    ...collectPreviewBlockers(safeInput.cleanupPreview),
    ...collectCounterBlockers(safeInput.sideEffectCounters)
  ])];
  const dryRunPreviewAccepted = blockerReasons.length === 0;
  const plannedActions = dryRunPreviewAccepted ? buildPlannedActions(cleanupPreview) : [];

  return {
    taskId: TASK_ID,
    status: dryRunPreviewAccepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    dryRunPreviewAccepted,
    decision: dryRunPreviewAccepted
      ? 'ROLLBACK_CLEANUP_DRY_RUN_PREVIEW_ACCEPTED_NOT_EXECUTED_NOT_READY'
      : 'ROLLBACK_CLEANUP_DRY_RUN_PREVIEW_BLOCKED_NOT_READY',
    sourceDesignReviewTaskId: DESIGN_REVIEW_TASK_ID,
    cleanupPreview,
    plannedActions,
    applyGate: buildCleanupPreviewApplyGate({ dryRunPreviewAccepted }),
    retainedEvidence: REQUIRED_RETAINED_STORES.map(store => ({
      store,
      retained: dryRunPreviewAccepted,
      applies: false
    })),
    sideEffectCounters,
    blockerReasons,
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      readsStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesStores: false,
      buildsDryRunPreview: dryRunPreviewAccepted,
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
  REQUIRED_FALSE_FLAGS,
  REQUIRED_TRUE_FLAGS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  buildCleanupPreviewApplyGate,
  evaluateMemoryWriteRollbackCleanupDryRunPreview
};
