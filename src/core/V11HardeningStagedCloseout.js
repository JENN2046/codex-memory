'use strict';

const {
  SEALED_V1_0_RC_COMMIT,
  TASK_ID: V11_VALIDATION_AGGREGATOR_TASK_ID
} = require('./V11HardeningValidationAggregator');

const TASK_ID = 'CM-1088_V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT';
const RESULT_STATUS_ACCEPTED =
  'V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT_ACCEPTED_NOT_RELEASED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_hardening_staged_local_closeout_review_only';

const REQUIRED_SLICE_IDS = Object.freeze([
  'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
  'cm1083_reconcile_retry_backoff_durable_persistence_preview',
  'cm1084_startup_reconcile_worker_safety',
  'cm1085_cleanup_rollback_apply_design_policy',
  'cm1087_governance_runtime_approval_audit_loop'
]);

const REQUIRED_FALSE_LOCAL_STATE_FLAGS = Object.freeze([
  'providerApiCalls',
  'trueRecordMemoryCalls',
  'trueSearchMemoryCalls',
  'rawMemoryReads',
  'rawJsonlReads',
  'rawAuditReads',
  'cleanupApplyExecuted',
  'rollbackApplyExecuted',
  'publicMcpExpanded',
  'packageConfigWatchdogStartupDependencyChanged',
  'commitCreated',
  'pushPerformed',
  'ciTriggered',
  'tagCreated',
  'releaseCreated',
  'deployPerformed',
  'readinessClaimed',
  'reliabilityClaimed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCommit(value) {
  const normalized = normalizeString(value).toLowerCase();
  return /^[a-f0-9]{40}$/.test(normalized) ? normalized : '';
}

function normalizeBoolean(value) {
  return value === true ? true : value === false ? false : null;
}

function normalizeLocalState(localState = {}) {
  const safeState = isPlainObject(localState) ? localState : {};
  const normalized = {};

  for (const flag of REQUIRED_FALSE_LOCAL_STATE_FLAGS) {
    normalized[flag] = normalizeBoolean(safeState[flag]);
  }

  return normalized;
}

function collectLocalStateBlockers(localState = {}) {
  const safeState = isPlainObject(localState) ? localState : {};
  const normalized = normalizeLocalState(safeState);
  const blockers = [];

  for (const flag of REQUIRED_FALSE_LOCAL_STATE_FLAGS) {
    if (!Object.prototype.hasOwnProperty.call(safeState, flag)) {
      blockers.push(`local_state_${flag}_missing`);
    } else if (normalized[flag] !== false) {
      blockers.push(`local_state_${flag}_must_be_false`);
    }
  }

  return blockers;
}

function collectAggregatorBlockers(report = {}) {
  const safeReport = isPlainObject(report) ? report : {};
  const evidenceMatrix = isPlainObject(safeReport.evidenceMatrix)
    ? safeReport.evidenceMatrix
    : {};
  const baselineBinding = isPlainObject(safeReport.baselineBinding)
    ? safeReport.baselineBinding
    : {};
  const records = Array.isArray(evidenceMatrix.records) ? evidenceMatrix.records : [];
  const recordIds = records.map(record => normalizeString(record.id)).filter(Boolean);
  const recordsById = new Map(records.map(record => [normalizeString(record.id), record]));
  const blockers = [];

  if (safeReport.taskId !== V11_VALIDATION_AGGREGATOR_TASK_ID) {
    blockers.push('validation_aggregator_task_id_mismatch');
  }
  if (safeReport.accepted !== true) {
    blockers.push('validation_aggregator_must_be_accepted');
  }
  if (safeReport.readinessClaimed !== false || safeReport.reliabilityClaimed !== false) {
    blockers.push('validation_aggregator_claims_readiness_or_reliability');
  }
  if (safeReport.rcReady !== false || safeReport.releaseReady !== false || safeReport.deployReady !== false) {
    blockers.push('validation_aggregator_claims_rc_release_or_deploy_ready');
  }
  if (safeReport.sealedV1RcPreserved !== true) {
    blockers.push('sealed_v1_0_rc_not_preserved');
  }
  if (baselineBinding.sealedRcCommit !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (baselineBinding.exactCurrentHeadBound !== true) {
    blockers.push('current_head_not_exactly_bound');
  }
  if (evidenceMatrix.acceptedCurrentSliceCount !== 4) {
    blockers.push('current_slice_evidence_count_mismatch');
  }
  if (evidenceMatrix.governanceRuntimeApprovalAuditLoopAccepted !== true) {
    blockers.push('governance_runtime_approval_audit_loop_not_accepted');
  }
  if (Array.isArray(evidenceMatrix.requiredFutureGapIds) && evidenceMatrix.requiredFutureGapIds.length !== 0) {
    blockers.push('future_gap_ids_must_be_empty_after_cm1087');
  }
  for (const requiredId of REQUIRED_SLICE_IDS) {
    if (!recordIds.includes(requiredId) && requiredId !== 'cm1087_governance_runtime_approval_audit_loop') {
      blockers.push(`slice_${requiredId}_missing`);
    }
  }
  for (const requiredId of REQUIRED_SLICE_IDS) {
    if (requiredId === 'cm1087_governance_runtime_approval_audit_loop') continue;
    const record = recordsById.get(requiredId);
    if (!isPlainObject(record)) continue;
    if (record.accepted !== true) {
      blockers.push(`slice_${requiredId}_not_accepted`);
    }
    if (Array.isArray(record.blockers) && record.blockers.length > 0) {
      blockers.push(`slice_${requiredId}_has_blockers`);
    }
  }
  if (evidenceMatrix.governanceRuntimeApprovalAuditLoopEvidence?.accepted !== true) {
    blockers.push('cm1087_governance_evidence_missing_or_unaccepted');
  }

  return blockers;
}

function evaluateV11HardeningStagedCloseout(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit);
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const blockerReasons = [];

  if (mode !== REQUIRED_MODE) {
    blockerReasons.push('mode_must_be_v1_1_hardening_staged_local_closeout_review_only');
  }
  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) {
    blockerReasons.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!currentHeadCommit) {
    blockerReasons.push('current_head_commit_required');
  }
  blockerReasons.push(...collectAggregatorBlockers(safeInput.validationAggregatorReport));
  blockerReasons.push(...collectLocalStateBlockers(safeInput.localState));

  const accepted = blockerReasons.length === 0;
  return {
    taskId: TASK_ID,
    status: accepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    accepted,
    decision: accepted
      ? 'V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT_ACCEPTED_LOCAL_ONLY_NOT_READY'
      : 'V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT_BLOCKED_NOT_READY',
    mode,
    sealedV1RcCommit: sealedRcCommit || null,
    sealedV1RcPreserved: sealedRcCommit === SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: currentHeadCommit || null,
    requiredSliceIds: [...REQUIRED_SLICE_IDS],
    stagedLocalImplementationComplete: accepted,
    v1_1WorkRemainsLocalAndStaged: accepted,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    commitCreated: false,
    pushPerformed: false,
    ciTriggered: false,
    nextAllowedAction: accepted
      ? 'end_of_day_status_surface_update_or_request_commit_approval'
      : 'fix_staged_closeout_blockers',
    blockerReasons: [...new Set(blockerReasons)],
    safety: {
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      readsRawMemory: false,
      readsJsonl: false,
      readsRawAudit: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      executesCleanup: false,
      appliesRollback: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      commits: false,
      pushes: false,
      tagsReleasesDeploys: false
    }
  };
}

module.exports = {
  REQUIRED_FALSE_LOCAL_STATE_FLAGS,
  REQUIRED_MODE,
  REQUIRED_SLICE_IDS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  evaluateV11HardeningStagedCloseout
};
