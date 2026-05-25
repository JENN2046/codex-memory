'use strict';

const TASK_ID = 'CM-1059_MEMORY_WRITE_ROLLBACK_CLEANUP_PLAN_BOUNDARY';
const RESULT_STATUS_ACCEPTED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_PLAN_BOUNDARY_ACCEPTED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'MEMORY_WRITE_ROLLBACK_CLEANUP_PLAN_BOUNDARY_BLOCKED_NOT_READY';

const REQUIRED_EVIDENCE_REFS = Object.freeze([
  'CM-0840',
  'CM-0841',
  'CM-0842',
  'CM-1031',
  'CM-1032',
  'CM-1056',
  'CM-1057',
  'CM-1058'
]);

const REQUIRED_SURFACE_FLAGS_TRUE = Object.freeze([
  'rejectedWriteNoProjectionEvidence',
  'acceptedProjectionAccountingEvidence',
  'degradedResidualVisibilityEvidence',
  'projectionCleanupPartialEvidence',
  'reconcileCleanupAllKindsEvidence',
  'reconcileStoreKindCleanupEvidence',
  'reconcileMemoryIdIsolationEvidence',
  'candidateCacheMemoryIdCleanupEvidence',
  'diaryResidualRetainedEvidence',
  'auditAppendOnlyEvidence'
]);

const REQUIRED_SURFACE_FLAGS_FALSE = Object.freeze([
  'realCleanupSafetyProven',
  'realRollbackSafetyProven',
  'diaryDeletionImplemented',
  'auditDeletionOrRewriteImplemented',
  'publicCleanupToolImplemented'
]);

const REQUIRED_PLAN_TRUE_FLAGS = Object.freeze([
  'designOnly',
  'exactMemoryIdRequired',
  'storeKindRequiredForPartialResiduals',
  'preserveUnrelatedMemoryIds',
  'preserveDiaryByDefault',
  'preserveAuditAppendOnly',
  'requiresSeparateRealCleanupApproval',
  'requiresSeparateDiaryPolicy',
  'requiresSeparateAuditPolicy',
  'requiresSeparateRuntimeValidation'
]);

const REQUIRED_PLAN_FALSE_FLAGS = Object.freeze([
  'executionApproved',
  'realCleanupApply',
  'realRollbackApply',
  'publicMcpExpansion',
  'configWatchdogStartupChange',
  'dependencyChange',
  'readinessClaimed',
  'reliabilityClaimed'
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
  'cleanupApply',
  'rollbackApply',
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

function normalizeCounterMap(value = {}) {
  const safeCounters = isPlainObject(value) ? value : {};
  const counters = {};
  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
    counters[key] = safeCounters[key];
  }
  return counters;
}

function collectEvidenceRefBlockers(evidenceRefs) {
  const blockers = [];
  const normalizedRefs = normalizeStringArray(evidenceRefs);
  const uniqueRefs = [...new Set(normalizedRefs)];

  for (const ref of REQUIRED_EVIDENCE_REFS) {
    if (!uniqueRefs.includes(ref)) blockers.push(`evidence_${ref}_missing`);
  }

  for (const ref of uniqueRefs) {
    if (!REQUIRED_EVIDENCE_REFS.includes(ref)) blockers.push(`evidence_${ref}_unexpected`);
  }

  if (uniqueRefs.length !== normalizedRefs.length) blockers.push('evidence_refs_duplicate');
  if (!sameStringSet(uniqueRefs, REQUIRED_EVIDENCE_REFS)) blockers.push('evidence_refs_exact_set_mismatch');

  return blockers;
}

function collectSurfaceBlockers(surfaceEvidence = {}) {
  const safeSurface = isPlainObject(surfaceEvidence) ? surfaceEvidence : {};
  const blockers = [];

  for (const key of REQUIRED_SURFACE_FLAGS_TRUE) {
    if (safeSurface[key] !== true) blockers.push(`surface_${key}_must_be_true`);
  }

  for (const key of REQUIRED_SURFACE_FLAGS_FALSE) {
    if (safeSurface[key] !== false) blockers.push(`surface_${key}_must_be_false`);
  }

  return blockers;
}

function collectPlanBlockers(cleanupPlan = {}) {
  const safePlan = isPlainObject(cleanupPlan) ? cleanupPlan : {};
  const blockers = [];
  const planId = normalizeString(safePlan.planId);
  const target = normalizeString(safePlan.target);
  const nextStage = normalizeString(safePlan.nextStage);
  const scope = normalizeString(safePlan.scope);

  if (!planId) blockers.push('planId_missing');
  if (target !== 'process') blockers.push('target_must_be_process');
  if (nextStage !== 'real_cleanup_design_review_only') blockers.push('nextStage_must_be_real_cleanup_design_review_only');
  if (scope !== 'memory_id_and_store_kind_scoped') blockers.push('scope_must_be_memory_id_and_store_kind_scoped');

  for (const key of REQUIRED_PLAN_TRUE_FLAGS) {
    if (safePlan[key] !== true) blockers.push(`plan_${key}_must_be_true`);
  }

  for (const key of REQUIRED_PLAN_FALSE_FLAGS) {
    if (safePlan[key] !== false) blockers.push(`plan_${key}_must_be_false`);
  }

  return blockers;
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

function normalizeSurfaceEvidence(surfaceEvidence = {}) {
  const safeSurface = isPlainObject(surfaceEvidence) ? surfaceEvidence : {};
  const normalized = {};
  for (const key of [...REQUIRED_SURFACE_FLAGS_TRUE, ...REQUIRED_SURFACE_FLAGS_FALSE]) {
    normalized[key] = normalizeBoolean(safeSurface[key]);
  }
  return normalized;
}

function normalizeCleanupPlan(cleanupPlan = {}) {
  const safePlan = isPlainObject(cleanupPlan) ? cleanupPlan : {};
  const normalized = {
    planId: normalizeString(safePlan.planId),
    target: normalizeString(safePlan.target),
    nextStage: normalizeString(safePlan.nextStage),
    scope: normalizeString(safePlan.scope)
  };

  for (const key of [...REQUIRED_PLAN_TRUE_FLAGS, ...REQUIRED_PLAN_FALSE_FLAGS]) {
    normalized[key] = normalizeBoolean(safePlan[key]);
  }

  return normalized;
}

function evaluateMemoryWriteRollbackCleanupPlanBoundary(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const evidenceRefs = normalizeStringArray(safeInput.evidenceRefs);
  const surfaceEvidence = normalizeSurfaceEvidence(safeInput.surfaceEvidence);
  const cleanupPlan = normalizeCleanupPlan(safeInput.cleanupPlan);
  const sideEffectCounters = normalizeCounterMap(safeInput.sideEffectCounters);

  const blockerReasons = [...new Set([
    ...collectEvidenceRefBlockers(safeInput.evidenceRefs),
    ...collectSurfaceBlockers(safeInput.surfaceEvidence),
    ...collectPlanBlockers(safeInput.cleanupPlan),
    ...collectCounterBlockers(safeInput.sideEffectCounters)
  ])];
  const acceptedForRollbackCleanupDesignReview = blockerReasons.length === 0;

  return {
    taskId: TASK_ID,
    status: acceptedForRollbackCleanupDesignReview ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    acceptedForRollbackCleanupDesignReview,
    decision: acceptedForRollbackCleanupDesignReview
      ? 'ROLLBACK_CLEANUP_DESIGN_REVIEW_READY_NOT_EXECUTED_NOT_READY'
      : 'ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY',
    evidenceRefs,
    requiredEvidenceRefs: [...REQUIRED_EVIDENCE_REFS],
    surfaceEvidence,
    cleanupPlan,
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
      appliesCleanup: false,
      appliesRollback: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsRealCleanupSafe: false,
      claimsRealRollbackSafe: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_PLAN_FALSE_FLAGS,
  REQUIRED_PLAN_TRUE_FLAGS,
  REQUIRED_SURFACE_FLAGS_FALSE,
  REQUIRED_SURFACE_FLAGS_TRUE,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  evaluateMemoryWriteRollbackCleanupPlanBoundary
};
