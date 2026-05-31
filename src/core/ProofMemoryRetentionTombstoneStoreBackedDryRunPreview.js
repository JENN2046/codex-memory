'use strict';

const {
  PLAN_STATUS_PASSED,
  REQUIRED_MODE: PLAN_REQUIRED_MODE,
  REQUIRED_SCOPE: PLAN_REQUIRED_SCOPE,
  buildProofMemoryRetentionTombstonePlan
} = require('./ProofMemoryRetentionTombstonePlan');

const TASK_ID = 'CM-1082_PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW';
const SOURCE_DESIGN_TASK_ID = 'CM-1081_PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN';
const RESULT_STATUS_ACCEPTED = 'PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY';
const RESULT_STATUS_BLOCKED = 'PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'store_backed_dry_run_preview_only';
const REQUIRED_SCOPE = 'temp_local_store_backed_read_only';
const REQUIRED_STORE_PROVENANCE = 'temp_local_fixture';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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

function normalizeLimit(value) {
  if (!Number.isInteger(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(value, MAX_LIMIT));
}

function buildApplyGate({ accepted }) {
  return {
    gateId: 'CM-1082_PROOF_MEMORY_TOMBSTONE_PREVIEW_APPLY_GATE',
    dryRunPreviewAccepted: accepted === true,
    applyAuthorized: false,
    applyExecuted: false,
    tombstoneApplyRunsAllowed: 0,
    cleanupApplyRunsAllowed: 0,
    rollbackApplyRunsAllowed: 0,
    approvalRequiredBeforeApply: true,
    runtimeValidationRequiredBeforeApply: true,
    operatorReceiptRequiredBeforeApply: true,
    nextAllowedAction: accepted === true
      ? 'request_separate_tombstone_apply_approval'
      : 'fix_preview_blockers_before_apply_consideration'
  };
}

function buildSafety({ readsStores }) {
  return {
    sourceMode: REQUIRED_SCOPE,
    storeProvenance: REQUIRED_STORE_PROVENANCE,
    designOnly: false,
    dryRunPreviewOnly: true,
    tempLocalOnly: true,
    metadataOnlyStoreRead: true,
    explicitInputOnly: false,
    readsStores: readsStores === true,
    writesStores: false,
    mutatesRealMemory: false,
    tombstonesRealProofRecords: false,
    tombstoneApplyExecuted: false,
    cleanupApplyExecuted: false,
    rollbackApplyExecuted: false,
    automaticWorkerStarted: false,
    publicMcpExpanded: false,
    providerApiCalled: false,
    trueRecordMemoryCalled: false,
    trueSearchMemoryCalled: false,
    rawMemoryRead: false,
    rawJsonlRead: false,
    rawAuditRead: false,
    packageConfigWatchdogStartupDependencyChanged: false,
    tagReleaseDeploy: false,
    readinessClaimed: false,
    reliabilityClaimed: false
  };
}

function collectBoundaryBlockers(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const blockers = [];
  if (normalizeString(safeInput.mode) !== REQUIRED_MODE) {
    blockers.push('mode_must_be_store_backed_dry_run_preview_only');
  }
  if (normalizeString(safeInput.scope) !== REQUIRED_SCOPE) {
    blockers.push('scope_must_be_temp_local_store_backed_read_only');
  }
  if (normalizeString(safeInput.storeProvenance) !== REQUIRED_STORE_PROVENANCE) {
    blockers.push('store_provenance_must_be_temp_local_fixture');
  }
  if (safeInput.previewOnly !== true || safeInput.dryRun !== true) {
    blockers.push('preview_only_dry_run_required');
  }
  if (safeInput.apply === true || safeInput.applyTombstone === true || safeInput.tombstoneApplyAuthorized === true) {
    blockers.push('tombstone_apply_not_authorized');
  }
  if (safeInput.cleanupApply === true || safeInput.cleanupApplyAuthorized === true) {
    blockers.push('cleanup_apply_not_authorized');
  }
  if (safeInput.rollbackApply === true || safeInput.rollbackApplyAuthorized === true) {
    blockers.push('rollback_apply_not_authorized');
  }
  if (safeInput.automaticWorkerEnabled === true || safeInput.startWorker === true) {
    blockers.push('automatic_worker_not_authorized');
  }
  if (safeInput.publicMcpExpansion === true) {
    blockers.push('public_mcp_expansion_not_authorized');
  }
  if (safeInput.realStoreMode === true || safeInput.sourceMode === 'real_store') {
    blockers.push('real_store_mode_not_authorized');
  }
  if (normalizeString(safeInput.target) && normalizeString(safeInput.target) !== 'process') {
    blockers.push('target_must_be_process');
  }
  if (safeInput.retentionAfterValidationMs !== undefined && !Number.isFinite(safeInput.retentionAfterValidationMs)) {
    blockers.push('retention_after_validation_ms_must_be_number');
  }
  return blockers;
}

function collectStoreBlockers(stores = {}) {
  const safeStores = isPlainObject(stores) ? stores : {};
  const blockers = [];
  if (typeof safeStores.shadowStore?.listProofMemoryRetentionCandidates !== 'function') {
    blockers.push('shadowStore_listProofMemoryRetentionCandidates_missing');
  }
  return blockers;
}

function blockedResult({ target, limit, blockerReasons, readsAttempted = false }) {
  return {
    taskId: TASK_ID,
    status: RESULT_STATUS_BLOCKED,
    storeBackedDryRunPreviewAccepted: false,
    decision: readsAttempted
      ? 'PROOF_MEMORY_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_AFTER_STORE_READ_NOT_READY'
      : 'PROOF_MEMORY_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_BEFORE_STORE_READ_NOT_READY',
    sourceDesignTaskId: SOURCE_DESIGN_TASK_ID,
    target,
    limit,
    plannedActions: [],
    applyGate: buildApplyGate({ accepted: false }),
    storeReadSummary: {
      readsAttempted,
      storeReadCount: readsAttempted ? 1 : 0,
      recordCount: 0,
      proofRecords: 0,
      eligibleProofRecords: 0,
      plannedTombstoneActions: 0,
      metadataOnly: true
    },
    planReport: null,
    blockerReasons: [...new Set(blockerReasons)],
    safety: buildSafety({ readsStores: readsAttempted })
  };
}

function normalizeStoreRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};
  return {
    memoryId: firstNormalizedString(safeRecord.memoryId, safeRecord.memory_id),
    target: normalizeString(safeRecord.target),
    status: firstNormalizedString(
      safeRecord.status,
      safeRecord.lifecycleStatus,
      safeRecord.lifecycle_status
    ) || 'active',
    visibility: normalizeString(safeRecord.visibility),
    retentionPolicy: firstNormalizedString(safeRecord.retentionPolicy, safeRecord.retention_policy),
    tags: Array.isArray(safeRecord.tags) ? safeRecord.tags.map(tag => normalizeString(tag)).filter(Boolean) : [],
    validationStatus: firstNormalizedString(safeRecord.validationStatus, safeRecord.validation_status) ||
      (safeRecord.validated === true ? 'accepted' : 'pending'),
    validatedAt: firstNormalizedString(
      safeRecord.validatedAt,
      safeRecord.validated_at,
      safeRecord.validationCompletedAt,
      safeRecord.validation_completed_at
    ),
    validatedAtSource: firstNormalizedString(safeRecord.validatedAtSource, safeRecord.validated_at_source)
  };
}

async function buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const target = normalizeString(safeInput.target) || 'process';
  const limit = normalizeLimit(safeInput.limit);
  const preflightBlockers = [
    ...collectBoundaryBlockers(safeInput),
    ...collectStoreBlockers(safeInput.stores)
  ];

  if (preflightBlockers.length > 0) {
    return blockedResult({ target, limit, blockerReasons: preflightBlockers });
  }

  let records = [];
  try {
    records = await safeInput.stores.shadowStore.listProofMemoryRetentionCandidates({
      target,
      limit
    });
  } catch {
    return blockedResult({
      target,
      limit,
      readsAttempted: true,
      blockerReasons: ['store_read_failed']
    });
  }
  if (!Array.isArray(records)) {
    return blockedResult({
      target,
      limit,
      readsAttempted: true,
      blockerReasons: ['store_read_result_must_be_array']
    });
  }
  const normalizedRecords = records.map(normalizeStoreRecord);
  const planReport = buildProofMemoryRetentionTombstonePlan({
    mode: PLAN_REQUIRED_MODE,
    scope: PLAN_REQUIRED_SCOPE,
    now: safeInput.now,
    retentionAfterValidationMs: safeInput.retentionAfterValidationMs,
    records: normalizedRecords
  });
  const accepted = planReport.status === PLAN_STATUS_PASSED && planReport.accepted === true;
  if (!accepted) {
    return {
      ...blockedResult({
        target,
        limit,
        readsAttempted: true,
        blockerReasons: planReport.blockedReasons || ['proof_memory_retention_plan_not_accepted']
      }),
      planReport
    };
  }

  return {
    taskId: TASK_ID,
    status: RESULT_STATUS_ACCEPTED,
    storeBackedDryRunPreviewAccepted: true,
    decision: 'PROOF_MEMORY_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY',
    sourceDesignTaskId: SOURCE_DESIGN_TASK_ID,
    target,
    limit,
    plannedActions: planReport.plannedActions,
    applyGate: buildApplyGate({ accepted: true }),
    storeReadSummary: {
      readsAttempted: true,
      storeReadCount: 1,
      recordCount: normalizedRecords.length,
      proofRecords: planReport.counters.proofRecords,
      eligibleProofRecords: planReport.counters.eligibleProofRecords,
      plannedTombstoneActions: planReport.counters.plannedTombstoneActions,
      metadataOnly: true
    },
    planReport,
    blockerReasons: [],
    safety: buildSafety({ readsStores: true })
  };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  REQUIRED_MODE,
  REQUIRED_SCOPE,
  REQUIRED_STORE_PROVENANCE,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview
};
