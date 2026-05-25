'use strict';

const {
  RESULT_STATUS_ACCEPTED: PLAN_BOUNDARY_STATUS_ACCEPTED,
  TASK_ID: PLAN_BOUNDARY_TASK_ID
} = require('./MemoryWriteRollbackCleanupPlanBoundary');

const TASK_ID = 'CM-1060_MEMORY_WRITE_ROLLBACK_CLEANUP_DESIGN_REVIEW_POLICY';
const RESULT_STATUS_ACCEPTED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_DESIGN_REVIEW_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY';

const REQUIRED_SEQUENCE = Object.freeze([
  'identify_exact_memory_id',
  'preview_projection_targets',
  'preview_candidate_cache_entries',
  'preview_reconcile_tasks_by_memory_id_and_store_kind',
  'verify_diary_audit_retention',
  'require_runtime_validation_plan',
  'stop_before_apply'
]);

const REQUIRED_TARGET_STORES = Object.freeze([
  'sqlite_shadow_record',
  'vector_index_record',
  'candidate_cache_entries',
  'reconcile_queue_tasks'
]);

const REQUIRED_RETAINED_STORES = Object.freeze([
  'diary_record',
  'write_audit_log'
]);

const REQUIRED_TRUE_FLAGS = Object.freeze([
  'designReviewOnly',
  'requiresAcceptedPlanBoundary',
  'requiresExactMemoryId',
  'requiresStoreKindForPartialResiduals',
  'preservesUnrelatedMemoryIds',
  'previewsBeforeApply',
  'requiresDryRunReport',
  'requiresOperatorReceipt',
  'requiresSeparateApplyApproval',
  'requiresSeparateDiaryPolicy',
  'requiresSeparateAuditPolicy',
  'requiresRuntimeValidationBeforeApply',
  'stopsBeforeApply'
]);

const REQUIRED_FALSE_FLAGS = Object.freeze([
  'executesCleanup',
  'appliesRollback',
  'deletesDiaryByDefault',
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
  'cleanupPreviewRuns',
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

function collectBoundaryBlockers(planBoundaryReport = {}) {
  const safeBoundary = isPlainObject(planBoundaryReport) ? planBoundaryReport : {};
  const blockers = [];

  if (safeBoundary.taskId !== PLAN_BOUNDARY_TASK_ID) {
    blockers.push('plan_boundary_task_id_mismatch');
  }
  if (safeBoundary.status !== PLAN_BOUNDARY_STATUS_ACCEPTED) {
    blockers.push('plan_boundary_status_must_be_accepted');
  }
  if (safeBoundary.acceptedForRollbackCleanupDesignReview !== true) {
    blockers.push('plan_boundary_design_review_acceptance_missing');
  }
  if (safeBoundary.decision !== 'ROLLBACK_CLEANUP_DESIGN_REVIEW_READY_NOT_EXECUTED_NOT_READY') {
    blockers.push('plan_boundary_decision_mismatch');
  }
  if (Array.isArray(safeBoundary.blockerReasons) && safeBoundary.blockerReasons.length > 0) {
    blockers.push('plan_boundary_has_blockers');
  }

  const safety = isPlainObject(safeBoundary.safety) ? safeBoundary.safety : {};
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
    'expandsPublicMcp',
    'changesConfigWatchdogStartup',
    'claimsRealCleanupSafe',
    'claimsRealRollbackSafe',
    'claimsWriteReliable',
    'claimsReadiness'
  ];

  for (const key of forbiddenSafetyFlags) {
    if (safety[key] !== false) blockers.push(`plan_boundary_safety_${key}_must_be_false`);
  }
  if (safety.sourceMode !== 'explicit_input_only') {
    blockers.push('plan_boundary_source_mode_must_be_explicit_input_only');
  }

  return blockers;
}

function collectDesignBlockers(cleanupDesignReview = {}) {
  const safeReview = isPlainObject(cleanupDesignReview) ? cleanupDesignReview : {};
  const blockers = [];
  const reviewId = normalizeString(safeReview.reviewId);
  const sourceBoundaryTaskId = normalizeString(safeReview.sourceBoundaryTaskId);
  const mode = normalizeString(safeReview.mode);
  const scope = normalizeString(safeReview.scope);
  const sequence = normalizeStringArray(safeReview.sequence);
  const targetStores = normalizeStringArray(safeReview.targetStores);
  const retainedStores = normalizeStringArray(safeReview.retainedStores);

  if (!reviewId) blockers.push('reviewId_missing');
  if (sourceBoundaryTaskId !== PLAN_BOUNDARY_TASK_ID) blockers.push('sourceBoundaryTaskId_mismatch');
  if (mode !== 'design_review_only') blockers.push('mode_must_be_design_review_only');
  if (scope !== 'memory_id_and_store_kind_scoped') {
    blockers.push('scope_must_be_memory_id_and_store_kind_scoped');
  }
  if (sequence.length !== REQUIRED_SEQUENCE.length
    || !REQUIRED_SEQUENCE.every((item, index) => sequence[index] === item)) {
    blockers.push('sequence_must_match_required_order');
  }
  if (!sameStringSet(targetStores, REQUIRED_TARGET_STORES)) {
    blockers.push('target_stores_exact_set_mismatch');
  }
  if (!sameStringSet(retainedStores, REQUIRED_RETAINED_STORES)) {
    blockers.push('retained_stores_exact_set_mismatch');
  }

  for (const key of REQUIRED_TRUE_FLAGS) {
    if (safeReview[key] !== true) blockers.push(`design_${key}_must_be_true`);
  }
  for (const key of REQUIRED_FALSE_FLAGS) {
    if (safeReview[key] !== false) blockers.push(`design_${key}_must_be_false`);
  }

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

function normalizeDesignReview(cleanupDesignReview = {}) {
  const safeReview = isPlainObject(cleanupDesignReview) ? cleanupDesignReview : {};
  const normalized = {
    reviewId: normalizeString(safeReview.reviewId),
    sourceBoundaryTaskId: normalizeString(safeReview.sourceBoundaryTaskId),
    mode: normalizeString(safeReview.mode),
    scope: normalizeString(safeReview.scope),
    sequence: normalizeStringArray(safeReview.sequence),
    targetStores: normalizeStringArray(safeReview.targetStores),
    retainedStores: normalizeStringArray(safeReview.retainedStores)
  };

  for (const key of [...REQUIRED_TRUE_FLAGS, ...REQUIRED_FALSE_FLAGS]) {
    normalized[key] = normalizeBoolean(safeReview[key]);
  }

  return normalized;
}

function evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const cleanupDesignReview = normalizeDesignReview(safeInput.cleanupDesignReview);
  const sideEffectCounters = normalizeCounterMap(safeInput.sideEffectCounters);
  const blockerReasons = [...new Set([
    ...collectBoundaryBlockers(safeInput.planBoundaryReport),
    ...collectDesignBlockers(safeInput.cleanupDesignReview),
    ...collectCounterBlockers(safeInput.sideEffectCounters)
  ])];
  const designReviewAccepted = blockerReasons.length === 0;

  return {
    taskId: TASK_ID,
    status: designReviewAccepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    designReviewAccepted,
    decision: designReviewAccepted
      ? 'ROLLBACK_CLEANUP_DESIGN_REVIEW_ACCEPTED_STOP_BEFORE_APPLY_NOT_READY'
      : 'ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY',
    sourceBoundaryTaskId: PLAN_BOUNDARY_TASK_ID,
    requiredSequence: [...REQUIRED_SEQUENCE],
    requiredTargetStores: [...REQUIRED_TARGET_STORES],
    requiredRetainedStores: [...REQUIRED_RETAINED_STORES],
    cleanupDesignReview,
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
      writesDurableMemory: false,
      writesDurableAudit: false,
      previewsCleanup: false,
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
  REQUIRED_RETAINED_STORES,
  REQUIRED_SEQUENCE,
  REQUIRED_TARGET_STORES,
  REQUIRED_TRUE_FLAGS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  evaluateMemoryWriteRollbackCleanupDesignReviewPolicy
};
