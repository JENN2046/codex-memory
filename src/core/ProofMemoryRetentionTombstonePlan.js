const {
  PROOF_MEMORY_RETENTION_POLICY,
  PROOF_MEMORY_TAG,
  PROOF_MEMORY_VISIBILITY
} = require('./ProofMemoryPolicy');

const PLAN_STATUS_PASSED = 'PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN_PREVIEW_PASSED_NOT_IMPLEMENTED';
const PLAN_STATUS_BLOCKED = 'PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN_PREVIEW_BLOCKED_NOT_IMPLEMENTED';
const REQUIRED_MODE = 'design_preview_only';
const REQUIRED_SCOPE = 'temp_local_explicit_input_only';

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

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function parseTime(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isProofMemoryRecord(record = {}) {
  const visibility = firstNormalizedString(record.visibility, record.visibility_policy);
  const retentionPolicy = firstNormalizedString(record.retentionPolicy, record.retention_policy);
  const tags = normalizeTags(record.tags);

  return visibility === PROOF_MEMORY_VISIBILITY ||
    retentionPolicy === PROOF_MEMORY_RETENTION_POLICY ||
    tags.includes(PROOF_MEMORY_TAG);
}

function normalizeValidationAccepted(value) {
  if (value === true) {
    return true;
  }
  const normalized = normalizeString(value).toLowerCase();
  return ['accepted', 'passed', 'validated', 'complete'].includes(normalized);
}

function buildBlockedResult(blockedReasons) {
  return {
    status: PLAN_STATUS_BLOCKED,
    accepted: false,
    blockedReasons,
    plannedActions: [],
    counters: {
      inspectedRecords: 0,
      proofRecords: 0,
      eligibleProofRecords: 0,
      plannedTombstoneActions: 0
    },
    safety: buildSafety()
  };
}

function buildSafety() {
  return {
    sourceMode: REQUIRED_SCOPE,
    designOnly: true,
    tempLocalOnly: true,
    explicitInputOnly: true,
    mutatesRealMemory: false,
    tombstonesRealProofRecords: false,
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
    readinessClaimed: false,
    reliabilityClaimed: false
  };
}

function validateBoundary(input = {}) {
  const blockedReasons = [];

  if (normalizeString(input.mode) !== REQUIRED_MODE) {
    blockedReasons.push('mode_must_be_design_preview_only');
  }
  if (normalizeString(input.scope) !== REQUIRED_SCOPE) {
    blockedReasons.push('scope_must_be_temp_local_explicit_input_only');
  }
  if (!Array.isArray(input.records)) {
    blockedReasons.push('records_must_be_array');
  }
  if (input.apply === true || input.applyTombstone === true || input.tombstoneApplyAuthorized === true) {
    blockedReasons.push('tombstone_apply_not_authorized');
  }
  if (input.cleanupApply === true || input.cleanupApplyAuthorized === true) {
    blockedReasons.push('cleanup_apply_not_authorized');
  }
  if (input.rollbackApply === true || input.rollbackApplyAuthorized === true) {
    blockedReasons.push('rollback_apply_not_authorized');
  }
  if (input.automaticWorkerEnabled === true || input.startWorker === true) {
    blockedReasons.push('automatic_worker_not_authorized');
  }
  if (input.publicMcpExpansion === true) {
    blockedReasons.push('public_mcp_expansion_not_authorized');
  }
  if (input.realStoreMode === true || input.sourceMode === 'real_store') {
    blockedReasons.push('real_store_mode_not_authorized');
  }

  return blockedReasons;
}

function buildProofMemoryRetentionTombstonePlan(input = {}) {
  const blockedReasons = validateBoundary(input);
  if (blockedReasons.length > 0) {
    return buildBlockedResult(blockedReasons);
  }

  const nowMs = parseTime(input.now) ?? Date.now();
  const retentionAfterValidationMs = Number.isFinite(input.retentionAfterValidationMs)
    ? Math.max(0, input.retentionAfterValidationMs)
    : 0;
  const plannedActions = [];
  let proofRecords = 0;
  let eligibleProofRecords = 0;

  input.records.forEach((record, index) => {
    const memoryId = firstNormalizedString(record && record.memoryId, record && record.memory_id);
    const status = firstNormalizedString(
      record && record.status,
      record && record.lifecycleStatus,
      record && record.lifecycle_status
    ) || 'active';
    const proofMemory = isProofMemoryRecord(record);
    const validationAccepted = normalizeValidationAccepted(
      firstNormalizedString(record && record.validationStatus, record && record.validation_status) ||
        (record && record.validated)
    );
    const validatedAtMs = parseTime(firstNormalizedString(
      record && record.validatedAt,
      record && record.validated_at,
      record && record.validationCompletedAt,
      record && record.validation_completed_at
    ));
    const ageAfterValidationMs = validatedAtMs === null ? null : Math.max(0, nowMs - validatedAtMs);

    if (proofMemory) {
      proofRecords += 1;
    }

    const ineligibleReasons = [];
    if (!memoryId) {
      ineligibleReasons.push('memory_id_required');
    }
    if (!proofMemory) {
      ineligibleReasons.push('not_internal_proof_memory');
    }
    if (status === 'tombstoned') {
      ineligibleReasons.push('already_tombstoned');
    }
    if (!validationAccepted) {
      ineligibleReasons.push('validation_not_accepted');
    }
    if (validatedAtMs === null) {
      ineligibleReasons.push('validated_at_required');
    } else if (ageAfterValidationMs < retentionAfterValidationMs) {
      ineligibleReasons.push('retention_window_not_elapsed');
    }

    if (ineligibleReasons.length === 0) {
      eligibleProofRecords += 1;
      plannedActions.push({
        action: 'tombstone_internal_proof_memory',
        applies: false,
        memoryId,
        recordIndex: index,
        fromStatus: status,
        toStatus: 'tombstoned',
        reason: 'proof_memory_retention_elapsed_after_validation',
        retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
        visibility: PROOF_MEMORY_VISIBILITY,
        requiresSeparateApplyApproval: true,
        requiresRuntimeValidationBeforeApply: true,
        auditRequiredBeforeApply: true
      });
    }
  });

  return {
    status: PLAN_STATUS_PASSED,
    accepted: true,
    blockedReasons: [],
    plannedActions,
    counters: {
      inspectedRecords: input.records.length,
      proofRecords,
      eligibleProofRecords,
      plannedTombstoneActions: plannedActions.length
    },
    safety: buildSafety()
  };
}

module.exports = {
  PLAN_STATUS_BLOCKED,
  PLAN_STATUS_PASSED,
  REQUIRED_MODE,
  REQUIRED_SCOPE,
  buildProofMemoryRetentionTombstonePlan,
  isProofMemoryRecord
};
