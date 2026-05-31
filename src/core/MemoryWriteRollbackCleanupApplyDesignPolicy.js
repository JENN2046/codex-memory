'use strict';

const {
  RESULT_STATUS_ACCEPTED: STORE_BACKED_PREVIEW_STATUS_ACCEPTED,
  TASK_ID: STORE_BACKED_PREVIEW_TASK_ID
} = require('./MemoryWriteRollbackCleanupStoreBackedDryRunPreview');

const TASK_ID = 'CM-1085_MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_POLICY';
const RESULT_STATUS_ACCEPTED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_ACCEPTED_NOT_APPLIED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_BLOCKED_NOT_READY';

const REQUIRED_TRUE_FLAGS = Object.freeze([
  'applyDesignReviewOnly',
  'usesAcceptedStoreBackedPreview',
  'exactMemoryIdConfirmed',
  'storeKindScoped',
  'preservesUnrelatedMemoryIds',
  'retainsDiary',
  'retainsAuditAppendOnly',
  'requiresSeparateCleanupApplyApproval',
  'requiresSeparateRollbackApplyApproval',
  'requiresRuntimeValidationBeforeApply',
  'requiresOperatorReceiptBeforeApply',
  'requiresPostApplyVerification',
  'requiresRollbackPlan',
  'stopsBeforeApply'
]);

const REQUIRED_FALSE_FLAGS = Object.freeze([
  'cleanupApplyApproved',
  'rollbackApplyApproved',
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
  'rawAuditReads',
  'providerCalls',
  'apiCalls',
  'durableRealMemoryWrites',
  'durableRealAuditWrites',
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

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeString).filter(Boolean);
}

function normalizePlannedActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter(isPlainObject)
    .map(action => ({
      action: normalizeString(action.action),
      store: normalizeString(action.store),
      memoryId: firstNormalizedString(action.memoryId, action.memory_id),
      storeKind: firstNormalizedString(action.storeKind, action.store_kind) || null,
      expectedEntryCount: normalizeInteger(action.expectedEntryCount),
      expectedTaskCount: normalizeInteger(action.expectedTaskCount),
      applies: action.applies === true
    }));
}

function collectStoreBackedPreviewBlockers(report = {}) {
  const safeReport = isPlainObject(report) ? report : {};
  const blockers = [];
  if (safeReport.taskId !== STORE_BACKED_PREVIEW_TASK_ID) {
    blockers.push('store_backed_preview_task_id_mismatch');
  }
  if (safeReport.status !== STORE_BACKED_PREVIEW_STATUS_ACCEPTED) {
    blockers.push('store_backed_preview_status_must_be_accepted');
  }
  if (safeReport.storeBackedDryRunPreviewAccepted !== true) {
    blockers.push('store_backed_preview_acceptance_missing');
  }
  if (safeReport.decision !== 'ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY') {
    blockers.push('store_backed_preview_decision_mismatch');
  }
  if (Array.isArray(safeReport.blockerReasons) && safeReport.blockerReasons.length > 0) {
    blockers.push('store_backed_preview_has_blockers');
  }
  const plannedActions = normalizePlannedActions(safeReport.plannedActions);
  if (plannedActions.length === 0) {
    blockers.push('store_backed_preview_planned_actions_missing');
  }
  if (plannedActions.some(action => action.applies === true)) {
    blockers.push('store_backed_preview_actions_must_not_apply');
  }

  const applyGate = isPlainObject(safeReport.applyGate) ? safeReport.applyGate : {};
  if (applyGate.applyAuthorized !== false) blockers.push('store_backed_preview_applyAuthorized_must_be_false');
  if (applyGate.applyExecuted !== false) blockers.push('store_backed_preview_applyExecuted_must_be_false');
  if (applyGate.cleanupApplyRunsAllowed !== 0) blockers.push('store_backed_preview_cleanupApplyRunsAllowed_must_be_zero');
  if (applyGate.rollbackApplyRunsAllowed !== 0) blockers.push('store_backed_preview_rollbackApplyRunsAllowed_must_be_zero');

  const safety = isPlainObject(safeReport.safety) ? safeReport.safety : {};
  const forbiddenSafetyFlags = [
    'writesStores',
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
    if (safety[key] !== false) blockers.push(`store_backed_preview_safety_${key}_must_be_false`);
  }

  return blockers;
}

function normalizeApplyDesign(applyDesign = {}) {
  const safeDesign = isPlainObject(applyDesign) ? applyDesign : {};
  const normalized = {
    designId: normalizeString(safeDesign.designId),
    sourceStoreBackedPreviewTaskId: normalizeString(safeDesign.sourceStoreBackedPreviewTaskId),
    mode: normalizeString(safeDesign.mode),
    scope: normalizeString(safeDesign.scope),
    target: normalizeString(safeDesign.target),
    memoryId: firstNormalizedString(safeDesign.memoryId, safeDesign.memory_id),
    plannedActionIds: normalizeStringArray(safeDesign.plannedActionIds)
  };

  for (const key of [...REQUIRED_TRUE_FLAGS, ...REQUIRED_FALSE_FLAGS]) {
    normalized[key] = normalizeBoolean(safeDesign[key]);
  }

  return normalized;
}

function collectApplyDesignBlockers(applyDesign = {}, storeBackedPreviewReport = {}) {
  const safeDesign = isPlainObject(applyDesign) ? applyDesign : {};
  const normalized = normalizeApplyDesign(safeDesign);
  const blockers = [];
  const previewMemoryId = firstNormalizedString(
    storeBackedPreviewReport.memoryId,
    storeBackedPreviewReport.memory_id
  );
  const previewActions = normalizePlannedActions(storeBackedPreviewReport.plannedActions);
  const expectedActionIds = previewActions.map(action => [
    action.action,
    action.store,
    action.storeKind || 'all'
  ].join(':'));

  if (!normalized.designId) blockers.push('designId_missing');
  if (normalized.sourceStoreBackedPreviewTaskId !== STORE_BACKED_PREVIEW_TASK_ID) {
    blockers.push('sourceStoreBackedPreviewTaskId_mismatch');
  }
  if (normalized.mode !== 'cleanup_rollback_apply_design_review_only') {
    blockers.push('mode_must_be_cleanup_rollback_apply_design_review_only');
  }
  if (normalized.scope !== 'memory_id_and_store_kind_scoped') {
    blockers.push('scope_must_be_memory_id_and_store_kind_scoped');
  }
  if (normalized.target !== 'process') blockers.push('target_must_be_process');
  if (!normalized.memoryId) blockers.push('memoryId_missing');
  if (previewMemoryId && normalized.memoryId && normalized.memoryId !== previewMemoryId) {
    blockers.push('memoryId_must_match_store_backed_preview');
  }
  if (normalized.plannedActionIds.length !== expectedActionIds.length
    || expectedActionIds.some(actionId => !normalized.plannedActionIds.includes(actionId))) {
    blockers.push('plannedActionIds_must_match_store_backed_preview');
  }

  for (const key of REQUIRED_TRUE_FLAGS) {
    if (safeDesign[key] !== true) blockers.push(`apply_design_${key}_must_be_true`);
  }
  for (const key of REQUIRED_FALSE_FLAGS) {
    if (safeDesign[key] !== false) blockers.push(`apply_design_${key}_must_be_false`);
  }

  return blockers;
}

function normalizeCounterMap(value = {}) {
  const safeCounters = isPlainObject(value) ? value : {};
  return Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, safeCounters[key]]));
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

function buildApplyDesignGate({ accepted = false } = {}) {
  return {
    gateId: TASK_ID,
    gateMode: 'design_review_only_separate_apply_approval_required',
    applyDesignAccepted: accepted === true,
    cleanupApplyAuthorized: false,
    rollbackApplyAuthorized: false,
    applyExecuted: false,
    cleanupApplyRunsAllowed: 0,
    rollbackApplyRunsAllowed: 0,
    destructiveActionAllowed: false,
    runtimeValidationRequiredBeforeApply: true,
    operatorReceiptRequiredBeforeApply: true,
    postApplyVerificationRequired: true,
    nextAllowedAction: accepted === true
      ? 'request_separate_cleanup_apply_approval_packet'
      : 'fix_apply_design_blockers_before_apply_consideration'
  };
}

function evaluateMemoryWriteRollbackCleanupApplyDesignPolicy(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const applyDesign = normalizeApplyDesign(safeInput.applyDesign);
  const sideEffectCounters = normalizeCounterMap(safeInput.sideEffectCounters);
  const blockerReasons = [...new Set([
    ...collectStoreBackedPreviewBlockers(safeInput.storeBackedPreviewReport),
    ...collectApplyDesignBlockers(safeInput.applyDesign, safeInput.storeBackedPreviewReport),
    ...collectCounterBlockers(safeInput.sideEffectCounters)
  ])];
  const applyDesignAccepted = blockerReasons.length === 0;

  return {
    taskId: TASK_ID,
    status: applyDesignAccepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    applyDesignAccepted,
    decision: applyDesignAccepted
      ? 'ROLLBACK_CLEANUP_APPLY_DESIGN_ACCEPTED_STOP_BEFORE_APPLY_NOT_READY'
      : 'ROLLBACK_CLEANUP_APPLY_DESIGN_BLOCKED_NOT_READY',
    sourceStoreBackedPreviewTaskId: STORE_BACKED_PREVIEW_TASK_ID,
    applyDesign,
    plannedActions: normalizePlannedActions(safeInput.storeBackedPreviewReport?.plannedActions),
    applyGate: buildApplyDesignGate({ accepted: applyDesignAccepted }),
    sideEffectCounters,
    blockerReasons,
    safety: {
      sourceMode: 'explicit_input_apply_design_review_only',
      readsFiles: false,
      executesCommands: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      readsRawAudit: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesStores: false,
      executesCleanup: false,
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
  buildApplyDesignGate,
  evaluateMemoryWriteRollbackCleanupApplyDesignPolicy
};
