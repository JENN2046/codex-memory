'use strict';

const {
  STAGE_CLASSES
} = require('./SelectedAuditCorrelationPrerequisiteStageGate');

const RESOLUTION_CLASSES = Object.freeze({
  BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED: 'BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED',
  WAIT_CM1111_APPROVAL_PACKET_ONLY: 'WAIT_CM1111_APPROVAL_PACKET_ONLY',
  WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111: 'WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111',
  WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115: 'WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115',
  WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS: 'WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS',
  PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY: 'PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY',
  NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY: 'NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY',
  FAIL_CLOSED_REPORT_MISSING: 'FAIL_CLOSED_REPORT_MISSING',
  FAIL_CLOSED_UNSUPPORTED_STAGE_CLASS: 'FAIL_CLOSED_UNSUPPORTED_STAGE_CLASS',
  FAIL_CLOSED_OVERCLAIM_OR_EXECUTION_SIGNAL: 'FAIL_CLOSED_OVERCLAIM_OR_EXECUTION_SIGNAL',
  FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL: 'FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL'
});

const FORBIDDEN_SAFETY_FLAGS = Object.freeze([
  'readsObservationInput',
  'readsTrueAuditLog',
  'readsRawAudit',
  'readsRawMemory',
  'readsJsonl',
  'callsRecordMemory',
  'callsSearchMemory',
  'callsMemoryOverview',
  'callsProvider',
  'writesDurableMemory',
  'writesDurableAudit',
  'appliesMutation',
  'expandsPublicMcp',
  'changesConfigWatchdogStartup',
  'claimsWriteReliable',
  'claimsRecallReliable',
  'claimsReadiness'
]);

const COMMON_DENIED_ACTIONS = Object.freeze([
  'executeCM1111',
  'executeCM1115',
  'executeCM1120',
  'requestApprovalOutOfOrder',
  'readTrueAuditLog',
  'readObservationInput',
  'readRawAudit',
  'readRawMemory',
  'readJsonl',
  'callRecordMemory',
  'callSearchMemory',
  'callMemoryOverview',
  'callProvider',
  'writeDurableMemory',
  'writeDurableAudit',
  'applyMutation',
  'expandPublicMcp',
  'changeConfigWatchdogStartup',
  'claimReadiness',
  'claimReliability'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeString)
    .filter(Boolean);
}

function stageFromReport(report) {
  return isPlainObject(report.stageGate) ? report.stageGate : report;
}

function mergedSafety(report, stageGate) {
  const reportSafety = isPlainObject(report.safety) ? report.safety : {};
  const gateSafety = isPlainObject(stageGate.safety) ? stageGate.safety : {};
  const safety = {
    ...gateSafety,
    ...reportSafety
  };
  for (const flag of FORBIDDEN_SAFETY_FLAGS) {
    safety[flag] = reportSafety[flag] === true || gateSafety[flag] === true;
  }
  return safety;
}

function firstForbiddenFlag(safety) {
  return FORBIDDEN_SAFETY_FLAGS.find(flag => safety[flag] === true) || null;
}

function baseSequence(resolutionClass, report, stageGate, extra = {}) {
  return {
    status: 'blocked',
    resolutionClass,
    stageClass: normalizeString(report.stageClass || stageGate.stageClass),
    planClass: normalizeString(report.planClass || stageGate.planClass),
    prerequisiteBlockers: normalizeArray(
      report.currentFactsBlockerReasons || stageGate.prerequisiteBlockers
    ),
    nextAllowedAction: extra.nextAllowedAction || 'none',
    approvalRequestCandidate: extra.approvalRequestCandidate || 'none',
    nextApprovalTarget: extra.nextApprovalTarget || 'none',
    orderedResolutionSteps: extra.orderedResolutionSteps || [],
    deniedActions: COMMON_DENIED_ACTIONS,
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAuthorizedNow: false,
    blockerDowngradeRecordAllowed: extra.blockerDowngradeRecordAllowed === true,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: extra.nextStep || 'Keep all execution and reliability/readiness claims blocked.',
    safety: {
      sourceMode: 'explicit_stage_gate_report_only',
      readsCurrentGitFacts: false,
      executesReadOnlyGitCommands: false,
      readsObservationInput: false,
      readsTrueAuditLog: false,
      readsRawAudit: false,
      readsRawMemory: false,
      readsJsonl: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false,
      callsProvider: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      appliesMutation: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    }
  };
}

function hasExecutionOrOverclaimSignal(report, stageGate) {
  return report.cm1111ExecutionAuthorizedNow === true ||
    report.cm1115ExecutionAuthorizedNow === true ||
    report.cm1120ExecutionAuthorizedNow === true ||
    report.readinessClaimAllowed === true ||
    report.reliabilityClaimAllowed === true ||
    stageGate.cm1111ExecutionAuthorizedNow === true ||
    stageGate.cm1115ExecutionAuthorizedNow === true ||
    stageGate.cm1120ExecutionAuthorizedNow === true ||
    stageGate.readinessClaimAllowed === true ||
    stageGate.reliabilityClaimAllowed === true ||
    stageGate.safety?.claimsReadiness === true ||
    stageGate.safety?.claimsRecallReliable === true ||
    stageGate.safety?.claimsWriteReliable === true;
}

function buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageGateReport = {}) {
  if (!isPlainObject(stageGateReport)) {
    return baseSequence(
      RESOLUTION_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      {},
      {},
      {
        reason: 'stage_gate_report_missing_or_malformed',
        nextStep: 'Run CM-1131/CM-1139 current-facts stage gate first.'
      }
    );
  }

  const stageGate = stageFromReport(stageGateReport);
  const stageClass = normalizeString(stageGateReport.stageClass || stageGate.stageClass);

  if (!stageClass) {
    return baseSequence(
      RESOLUTION_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      stageGateReport,
      stageGate,
      {
        reason: 'stage_class_missing',
        nextStep: 'Run CM-1131/CM-1139 current-facts stage gate first.'
      }
    );
  }

  const safety = mergedSafety(stageGateReport, stageGate);
  const forbiddenFlag = firstForbiddenFlag(safety);
  if (forbiddenFlag) {
    return baseSequence(
      RESOLUTION_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL,
      stageGateReport,
      stageGate,
      {
        reason: `stage_gate_contains_forbidden_side_effect_flag:${forbiddenFlag}`,
        forbiddenFlag,
        nextStep: 'Stop; rebuild from the no-execution current-facts stage-gate path.'
      }
    );
  }

  if (hasExecutionOrOverclaimSignal(stageGateReport, stageGate)) {
    return baseSequence(
      RESOLUTION_CLASSES.FAIL_CLOSED_OVERCLAIM_OR_EXECUTION_SIGNAL,
      stageGateReport,
      stageGate,
      {
        reason: 'stage_gate_attempted_execution_or_readiness_reliability_claim',
        nextStep: 'Stop; CM-1140 cannot consume executing or overclaiming stage-gate evidence.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL) {
    return baseSequence(
      RESOLUTION_CLASSES.BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED,
      stageGateReport,
      stageGate,
      {
        reason: 'dirty_worktree_must_be_resolved_before_approval_sequence',
        nextAllowedAction: 'local_dirty_scope_isolation_decision_only',
        orderedResolutionSteps: [
          'provide_exact_cm1135_local_commit_isolation_approval_line_or_choose_review_only_path',
          'rerun_cm1136_preflight_and_cm1137_dry_run_plan',
          'execute_local_commit_isolation_only_if_separately_approved',
          'rerun_cm1131_cm1139_stage_gate_after_worktree_is_clean_or_isolated'
        ],
        nextStep: 'Resolve or explicitly isolate the dirty worktree before any CM-1111, CM-1115, or CM-1120 approval request.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.WAIT_CM1111_SEPARATE_EXACT_APPROVAL) {
    return baseSequence(
      RESOLUTION_CLASSES.WAIT_CM1111_APPROVAL_PACKET_ONLY,
      stageGateReport,
      stageGate,
      {
        reason: 'cm1111_approval_packet_is_next_but_execution_is_not_authorized',
        nextAllowedAction: 'request_separate_exact_cm1111_approval_only',
        approvalRequestCandidate: 'CM-1111',
        nextApprovalTarget: 'CM-1111',
        orderedResolutionSteps: [
          'request_separate_exact_cm1111_retention_apply_approval',
          'execute_cm1111_only_after_exact_approval',
          'record_cm1111_result_class',
          'rerun_stage_gate_before_cm1115'
        ],
        nextStep: 'Only CM-1111 approval may be requested next; execution still requires separate exact approval.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111) {
    return baseSequence(
      RESOLUTION_CLASSES.WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111,
      stageGateReport,
      stageGate,
      {
        reason: 'cm1115_approval_packet_is_next_after_cm1111_result',
        nextAllowedAction: 'request_separate_exact_cm1115_approval_only',
        approvalRequestCandidate: 'CM-1115',
        nextApprovalTarget: 'CM-1115',
        orderedResolutionSteps: [
          'request_separate_exact_cm1115_metadata_lifecycle_approval',
          'execute_cm1115_only_after_exact_approval',
          'record_cm1115_result_class',
          'rerun_cm1129_cm1131_before_cm1120'
        ],
        nextStep: 'Only CM-1115 approval may be requested next; execution still requires separate exact approval.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL) {
    return baseSequence(
      RESOLUTION_CLASSES.WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS,
      stageGateReport,
      stageGate,
      {
        reason: 'cm1120_approval_packet_is_next_after_prior_results',
        nextAllowedAction: 'request_separate_exact_cm1120_selected_observation_approval_only',
        approvalRequestCandidate: 'CM-1120',
        nextApprovalTarget: 'CM-1120',
        orderedResolutionSteps: [
          'request_separate_exact_cm1120_selected_audit_observation_approval',
          'execute_cm1120_only_after_exact_approval',
          'classify_result_through_cm1123_cm1128',
          'record_only_narrow_blocker_downgrade_if_allowed'
        ],
        nextStep: 'Only CM-1120 approval may be requested next; observation execution still requires separate exact approval.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115) {
    return baseSequence(
      RESOLUTION_CLASSES.WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115,
      stageGateReport,
      stageGate,
      {
        reason: 'cm1120_target_head_rebaseline_required_before_observation_approval',
        nextAllowedAction: 'prepare_fresh_cm1120_target_head_rebaseline_packet_only',
        approvalRequestCandidate: 'CM-1120-rebaseline',
        nextApprovalTarget: 'CM-1120-rebaseline',
        orderedResolutionSteps: [
          'prepare_fresh_cm1120_selected_observation_packet_bound_to_current_clean_head',
          'rerun_cm1129_cm1131_after_rebaseline_packet',
          'request_cm1120_exact_approval_only_if_rebaseline_gate_allows'
        ],
        nextStep: 'Prepare only a fresh CM-1120 target-head rebaseline packet; do not execute selected audit observation.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.WAIT_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF) {
    return baseSequence(
      RESOLUTION_CLASSES.PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY,
      stageGateReport,
      stageGate,
      {
        reason: 'bounded_public_default_recall_suppression_followup_is_next',
        nextAllowedAction: 'execute_one_bounded_public_default_recall_suppression_proof_only',
        orderedResolutionSteps: [
          'execute_one_bounded_public_default_recall_suppression_proof_with_sanitized_output',
          'record_followup_evidence_without_blocker_downgrade',
          'rerun_cm1129_cm1131_cm1140_after_followup_record',
          'keep_memory_write_reliable_memory_recall_reliable_and_readiness_unclaimed'
        ],
        nextStep: 'Execute only one bounded public/default recall suppression proof; do not claim reliability/readiness.'
      }
    );
  }

  if (stageClass === STAGE_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY) {
    return baseSequence(
      RESOLUTION_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY,
      stageGateReport,
      stageGate,
      {
        reason: 'narrow_downgrade_record_only',
        nextAllowedAction: 'record_narrow_selected_audit_correlation_blocker_downgrade_only',
        blockerDowngradeRecordAllowed: true,
        orderedResolutionSteps: [
          'record_only_one_exact_selected_audit_correlation_blocker_downgrade',
          'keep_memory_write_reliable_unclaimed',
          'keep_memory_recall_reliable_unclaimed',
          'keep_readiness_unclaimed'
        ],
        nextStep: 'Record only the narrow downgrade; do not claim reliability or readiness.'
      }
    );
  }

  return baseSequence(
    RESOLUTION_CLASSES.FAIL_CLOSED_UNSUPPORTED_STAGE_CLASS,
    stageGateReport,
    stageGate,
    {
      reason: 'stage_class_not_supported_for_resolution_sequence',
      nextStep: 'Keep the approval and execution sequence blocked until a supported stage class is present.'
    }
  );
}

module.exports = {
  COMMON_DENIED_ACTIONS,
  RESOLUTION_CLASSES,
  buildSelectedAuditCorrelationPrerequisiteResolutionSequence
};
