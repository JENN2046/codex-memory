'use strict';

const {
  PLAN_CLASSES
} = require('./SelectedAuditCorrelationPrerequisiteBlockerPlan');

const STAGE_CLASSES = Object.freeze({
  BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL: 'BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL',
  WAIT_CM1111_SEPARATE_EXACT_APPROVAL: 'WAIT_CM1111_SEPARATE_EXACT_APPROVAL',
  WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111: 'WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111',
  WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115: 'WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115',
  WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL: 'WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL',
  WAIT_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF: 'WAIT_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF',
  NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY: 'NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY',
  FAIL_CLOSED_REPORT_MISSING: 'FAIL_CLOSED_REPORT_MISSING',
  FAIL_CLOSED_OVERCLAIM_SIGNAL: 'FAIL_CLOSED_OVERCLAIM_SIGNAL',
  FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL: 'FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL',
  FAIL_CLOSED_INCONSISTENT_STAGE_SIGNAL: 'FAIL_CLOSED_INCONSISTENT_STAGE_SIGNAL',
  FAIL_CLOSED_UNSUPPORTED_PLAN_CLASS: 'FAIL_CLOSED_UNSUPPORTED_PLAN_CLASS'
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

const TARGET_HEAD_REBASELINE_BLOCKERS = Object.freeze([
  'localHead_target_head_mismatch',
  'originHead_target_head_mismatch',
  'remoteMainHead_target_head_mismatch'
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

function mergeSafetyFlags(report, plan) {
  const reportSafety = isPlainObject(report?.safety) ? report.safety : {};
  const planSafety = isPlainObject(plan?.safety) ? plan.safety : {};
  const merged = {
    ...planSafety,
    ...reportSafety
  };
  for (const flag of FORBIDDEN_SAFETY_FLAGS) {
    merged[flag] = reportSafety[flag] === true || planSafety[flag] === true;
  }
  return merged;
}

function firstTrueForbiddenFlag(safety) {
  return FORBIDDEN_SAFETY_FLAGS.find(flag => safety[flag] === true) || null;
}

function baseGate(stageClass, report, plan, extra = {}) {
  const blockers = normalizeArray(
    report.prerequisiteBlockers || plan.prerequisiteBlockers || report.currentFactsBlockerReasons
  );
  return {
    stageClass,
    ...extra,
    status: 'blocked',
    planClass: normalizeString(report.planClass || plan.planClass),
    reviewClass: normalizeString(report.reviewClass || plan.reviewClass),
    readinessClass: normalizeString(report.readinessClass || plan.readinessClass),
    prerequisiteBlockers: blockers,
    nextApprovalTarget: extra.nextApprovalTarget || 'none',
    nextOperatorAction: extra.nextOperatorAction || 'stop_and_rebuild_current_facts',
    cm1111ApprovalRequestAllowed: extra.cm1111ApprovalRequestAllowed === true,
    cm1115ApprovalRequestAllowed: extra.cm1115ApprovalRequestAllowed === true,
    cm1120ApprovalRequestAllowed: extra.cm1120ApprovalRequestAllowed === true,
    blockerDowngradeRecordAllowed: extra.blockerDowngradeRecordAllowed === true,
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAuthorizedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: extra.nextStep || 'Keep all execution and reliability/readiness claims blocked.',
    safety: {
      sourceMode: 'explicit_input_or_current_git_facts_only',
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

function evaluateSelectedAuditCorrelationPrerequisiteStageGate(prerequisitePlanReport = {}) {
  if (!isPlainObject(prerequisitePlanReport)) {
    return baseGate(
      STAGE_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      {},
      {},
      {
        reason: 'prerequisite_plan_report_missing_or_malformed',
        nextStep: 'Run CM-1130 current-facts prerequisite plan first.'
      }
    );
  }

  const plan = isPlainObject(prerequisitePlanReport.prerequisitePlan)
    ? prerequisitePlanReport.prerequisitePlan
    : {};
  const planClass = normalizeString(prerequisitePlanReport.planClass || plan.planClass);

  if (!planClass) {
    return baseGate(
      STAGE_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      prerequisitePlanReport,
      plan,
      {
        reason: 'plan_class_missing',
        nextStep: 'Run CM-1130 current-facts prerequisite plan first.'
      }
    );
  }

  const safety = mergeSafetyFlags(prerequisitePlanReport, plan);
  const forbiddenFlag = firstTrueForbiddenFlag(safety);
  const readinessClaim = prerequisitePlanReport.readinessClaimAllowed === true ||
    plan.readinessClaimAllowed === true;
  const reliabilityClaim = prerequisitePlanReport.reliabilityClaimAllowed === true ||
    plan.reliabilityClaimAllowed === true;
  const executionClaim = prerequisitePlanReport.cm1120ExecutionAllowedNow === true ||
    prerequisitePlanReport.cm1120ExecutionAuthorizedNow === true ||
    plan.cm1120ExecutionAllowedNow === true ||
    plan.cm1120ExecutionAuthorizedNow === true ||
    plan.cm1111ExecutionAuthorizedNow === true ||
    plan.cm1115ExecutionAuthorizedNow === true;

  if (readinessClaim || reliabilityClaim) {
    return baseGate(
      STAGE_CLASSES.FAIL_CLOSED_OVERCLAIM_SIGNAL,
      prerequisitePlanReport,
      plan,
      {
        reason: 'prerequisite_plan_attempted_readiness_or_reliability_claim',
        nextStep: 'Stop; stage gate cannot consume overclaiming evidence.'
      }
    );
  }

  if (forbiddenFlag) {
    return baseGate(
      STAGE_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL,
      prerequisitePlanReport,
      plan,
      {
        reason: `prerequisite_plan_contains_forbidden_side_effect_flag:${forbiddenFlag}`,
        forbiddenFlag,
        nextStep: 'Stop; rebuild the stage gate from the no-execution CM-1130 path.'
      }
    );
  }

  if (executionClaim) {
    return baseGate(
      STAGE_CLASSES.FAIL_CLOSED_INCONSISTENT_STAGE_SIGNAL,
      prerequisitePlanReport,
      plan,
      {
        reason: 'prerequisite_plan_attempted_to_authorize_execution',
        nextStep: 'Stop; CM-1131 never authorizes CM-1111, CM-1115, or CM-1120 execution.'
      }
    );
  }

  const blockers = normalizeArray(
    prerequisitePlanReport.prerequisiteBlockers || plan.prerequisiteBlockers || prerequisitePlanReport.currentFactsBlockerReasons
  );

  if (planClass === PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING) {
    if (blockers.includes('dirty_worktree')) {
      return baseGate(
        STAGE_CLASSES.BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL,
        prerequisitePlanReport,
        plan,
        {
          reason: 'dirty_worktree_blocks_exact_approval_sequence',
          nextOperatorAction: 'resolve_or_isolate_dirty_worktree_without_overwriting_user_work',
          nextStep: 'Resolve or isolate the dirty worktree before requesting CM-1111, CM-1115, or CM-1120 execution approval.'
        }
      );
    }

    if (blockers.includes('prior_result_CM-1111_missing')) {
      return baseGate(
        STAGE_CLASSES.WAIT_CM1111_SEPARATE_EXACT_APPROVAL,
        prerequisitePlanReport,
        plan,
        {
          reason: 'cm1111_prior_result_missing',
          nextApprovalTarget: 'CM-1111',
          nextOperatorAction: 'request_separate_exact_cm1111_approval_only',
          cm1111ApprovalRequestAllowed: true,
          nextStep: 'Request only separate exact CM-1111 approval; do not execute unless separately approved.'
        }
      );
    }

    if (blockers.includes('prior_result_CM-1115_missing')) {
      return baseGate(
        STAGE_CLASSES.WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111,
        prerequisitePlanReport,
        plan,
        {
          reason: 'cm1115_prior_result_missing_after_cm1111',
          nextApprovalTarget: 'CM-1115',
          nextOperatorAction: 'request_separate_exact_cm1115_approval_only_after_cm1111_result',
          cm1115ApprovalRequestAllowed: true,
          nextStep: 'Request only separate exact CM-1115 approval after CM-1111 result is recorded; do not execute unless separately approved.'
        }
      );
    }

    if (TARGET_HEAD_REBASELINE_BLOCKERS.some(blocker => blockers.includes(blocker))) {
      return baseGate(
        STAGE_CLASSES.WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115,
        prerequisitePlanReport,
        plan,
        {
          reason: 'cm1120_target_head_rebaseline_required_after_prior_results',
          nextApprovalTarget: 'CM-1120-rebaseline',
          nextOperatorAction: 'prepare_fresh_cm1120_target_head_rebaseline_packet_after_cm1115_result',
          nextStep: 'Prepare a fresh CM-1120 target-head rebaseline packet after CM-1115 result is recorded; do not execute CM-1120.'
        }
      );
    }

    return baseGate(
      STAGE_CLASSES.FAIL_CLOSED_INCONSISTENT_STAGE_SIGNAL,
      prerequisitePlanReport,
      plan,
      {
        reason: 'blocked_prerequisites_without_known_blocker',
        nextStep: 'Rerun CM-1130; unknown blocker ordering cannot be inferred.'
      }
    );
  }

  if (planClass === PLAN_CLASSES.AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE) {
    return baseGate(
      STAGE_CLASSES.WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL,
      prerequisitePlanReport,
      plan,
      {
        reason: 'cm1120_observation_approval_required',
        nextApprovalTarget: 'CM-1120',
        nextOperatorAction: 'request_separate_exact_cm1120_selected_observation_approval_only',
        cm1120ApprovalRequestAllowed: true,
        nextStep: 'Request separate exact CM-1120 selected-observation approval only; do not execute unless separately approved.'
      }
    );
  }

  if (planClass === PLAN_CLASSES.RECALL_SUPPRESSION_FOLLOWUP_PROOF_ALLOWED_NOT_READY) {
    return baseGate(
      STAGE_CLASSES.WAIT_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF,
      prerequisitePlanReport,
      plan,
      {
        reason: 'public_default_recall_suppression_followup_required_after_selected_audit_observation',
        nextOperatorAction: 'execute_one_bounded_public_default_recall_suppression_proof_only',
        nextStep: 'Execute only one bounded public/default recall suppression proof if allowed by the current goal; do not record a blocker downgrade or claim reliability/readiness.'
      }
    );
  }

  if (planClass === PLAN_CLASSES.DOWNGRADE_RECORD_ONLY_NOT_READY) {
    return baseGate(
      STAGE_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY,
      prerequisitePlanReport,
      plan,
      {
        reason: 'narrow_blocker_downgrade_record_only',
        nextOperatorAction: 'record_one_exact_selected_audit_correlation_blocker_downgrade_only',
        blockerDowngradeRecordAllowed: true,
        nextStep: 'Record only the narrow blocker downgrade; do not claim reliability or readiness.'
      }
    );
  }

  return baseGate(
    STAGE_CLASSES.FAIL_CLOSED_UNSUPPORTED_PLAN_CLASS,
    prerequisitePlanReport,
    plan,
    {
      reason: 'plan_class_not_supported_for_stage_gate',
      nextStep: 'Keep CM-1111, CM-1115, and CM-1120 blocked until CM-1130 returns a supported plan class.'
    }
  );
}

module.exports = {
  FORBIDDEN_SAFETY_FLAGS,
  STAGE_CLASSES,
  TARGET_HEAD_REBASELINE_BLOCKERS,
  evaluateSelectedAuditCorrelationPrerequisiteStageGate
};
