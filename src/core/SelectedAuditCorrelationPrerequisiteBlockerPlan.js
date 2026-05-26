'use strict';

const {
  REVIEW_CLASSES
} = require('./SelectedAuditCorrelationBlockerDowngradeReview');

const PLAN_CLASSES = Object.freeze({
  BLOCKED_PREREQUISITES_PENDING: 'BLOCKED_PREREQUISITES_PENDING',
  AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE: 'AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE',
  RECALL_SUPPRESSION_FOLLOWUP_PROOF_ALLOWED_NOT_READY: 'RECALL_SUPPRESSION_FOLLOWUP_PROOF_ALLOWED_NOT_READY',
  DOWNGRADE_RECORD_ONLY_NOT_READY: 'DOWNGRADE_RECORD_ONLY_NOT_READY',
  FAIL_CLOSED_REPORT_MISSING: 'FAIL_CLOSED_REPORT_MISSING',
  FAIL_CLOSED_UNSUPPORTED_REVIEW_CLASS: 'FAIL_CLOSED_UNSUPPORTED_REVIEW_CLASS',
  FAIL_CLOSED_OVERCLAIM_SIGNAL: 'FAIL_CLOSED_OVERCLAIM_SIGNAL',
  FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL: 'FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL'
});

const BLOCKER_ACTIONS = Object.freeze({
  localHead_target_head_mismatch: [
    'prepare_fresh_cm1120_target_head_rebaseline_after_cm1115_result'
  ],
  originHead_target_head_mismatch: [
    'prepare_fresh_cm1120_target_head_rebaseline_after_cm1115_result'
  ],
  remoteMainHead_target_head_mismatch: [
    'prepare_fresh_cm1120_target_head_rebaseline_after_cm1115_result'
  ],
  dirty_worktree: [
    'resolve_dirty_worktree_or_isolate_verified_scope_without_overwriting_user_work'
  ],
  'prior_result_CM-1111_missing': [
    'obtain_separate_exact_cm1111_retention_apply_approval',
    'execute_cm1111_only_if_approved_and_record_result_class'
  ],
  'prior_result_CM-1115_missing': [
    'obtain_separate_exact_cm1115_metadata_verify_approval_after_cm1111',
    'execute_cm1115_only_if_approved_and_record_result_class'
  ]
});

const COMMON_DENIED_ACTIONS = Object.freeze([
  'executeCM1120',
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

function unique(values) {
  return [...new Set(values)];
}

function firstTrueForbiddenFlag(report, review) {
  const reportSafety = isPlainObject(report?.safety) ? report.safety : {};
  const reviewSafety = isPlainObject(review?.safety) ? review.safety : {};
  return FORBIDDEN_SAFETY_FLAGS.find(flag => reportSafety[flag] === true || reviewSafety[flag] === true) || null;
}

function prerequisiteActionsForBlockers(blockers) {
  const actions = [];
  for (const blocker of blockers) {
    if (BLOCKER_ACTIONS[blocker]) {
      actions.push(...BLOCKER_ACTIONS[blocker]);
    }
  }
  actions.push('rerun_cm1129_current_facts_downgrade_review_after_prerequisites');
  actions.push('keep_cm1120_blocked_until_cm1129_allows_next_stage');
  actions.push('keep_readiness_and_reliability_unclaimed');
  return unique(actions);
}

function basePlan(planClass, report, review, extra = {}) {
  const blockers = normalizeArray(
    report.currentFactsBlockerReasons || review.currentFactsBlockerReasons
  );
  return {
    planClass,
    ...extra,
    status: 'blocked',
    reviewClass: normalizeString(report.reviewClass || review.reviewClass),
    readinessClass: normalizeString(report.readinessClass || review.readinessClass),
    currentFactsStatus: normalizeString(report.currentFactsStatus || review.currentFactsStatus),
    currentFactsBlockerReasons: blockers,
    blockerDowngradeAllowed: extra.blockerDowngradeAllowed === true,
    observationExecutionAuthorized: false,
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    deniedActions: COMMON_DENIED_ACTIONS,
    requiredNextActions: extra.requiredNextActions || [],
    nextStep: extra.nextStep || 'Keep CM-1120 blocked and preserve readiness/reliability denial.',
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

function summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(currentFactsDowngradeReport = {}) {
  if (!isPlainObject(currentFactsDowngradeReport)) {
    return basePlan(
      PLAN_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      {},
      {},
      {
        reason: 'current_facts_downgrade_report_missing_or_malformed',
        nextStep: 'Run CM-1129 current-facts downgrade review first.'
      }
    );
  }

  const review = isPlainObject(currentFactsDowngradeReport.review)
    ? currentFactsDowngradeReport.review
    : {};
  const reviewClass = normalizeString(currentFactsDowngradeReport.reviewClass || review.reviewClass);

  if (!reviewClass) {
    return basePlan(
      PLAN_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      currentFactsDowngradeReport,
      review,
      {
        reason: 'review_class_missing',
        nextStep: 'Run CM-1129 current-facts downgrade review first.'
      }
    );
  }

  if (
    currentFactsDowngradeReport.readinessClaimAllowed === true
    || currentFactsDowngradeReport.reliabilityClaimAllowed === true
    || review.readinessClaimAllowed === true
    || review.reliabilityClaimAllowed === true
  ) {
    return basePlan(
      PLAN_CLASSES.FAIL_CLOSED_OVERCLAIM_SIGNAL,
      currentFactsDowngradeReport,
      review,
      {
        reason: 'report_attempted_readiness_or_reliability_claim',
        nextStep: 'Stop; prerequisite plan cannot consume overclaiming evidence.'
      }
    );
  }

  const forbiddenFlag = firstTrueForbiddenFlag(currentFactsDowngradeReport, review);
  if (forbiddenFlag) {
    return basePlan(
      PLAN_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL,
      currentFactsDowngradeReport,
      review,
      {
        reason: `report_contains_forbidden_side_effect_flag:${forbiddenFlag}`,
        forbiddenFlag,
        nextStep: 'Stop; rebuild prerequisite plan from the no-execution CM-1129 path.'
      }
    );
  }

  if (reviewClass === REVIEW_CLASSES.BLOCKED_CURRENT_FACTS_NOT_READY) {
    const blockers = normalizeArray(
      currentFactsDowngradeReport.currentFactsBlockerReasons || review.currentFactsBlockerReasons
    );
    return basePlan(
      PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING,
      currentFactsDowngradeReport,
      review,
      {
        reason: 'current_facts_prerequisites_pending',
        prerequisiteBlockers: blockers,
        requiredNextActions: prerequisiteActionsForBlockers(blockers),
        nextStep: 'Resolve only the listed prerequisites, then rerun CM-1129 before any CM-1120 selected audit observation.'
      }
    );
  }

  if (reviewClass === REVIEW_CLASSES.READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE) {
    return basePlan(
      PLAN_CLASSES.AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE,
      currentFactsDowngradeReport,
      review,
      {
        reason: 'preflight_ready_but_selected_observation_not_executed',
        requiredNextActions: [
          'obtain_separate_exact_cm1120_selected_observation_approval',
          'execute_only_selected_sanitized_observation_if_approved',
          'classify_selected_observation_through_cm1123_cm1128',
          'keep_readiness_and_reliability_unclaimed'
        ],
        nextStep: 'Separate exact approval is still required before any selected audit observation.'
      }
    );
  }

  if (reviewClass === REVIEW_CLASSES.SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE) {
    return basePlan(
      PLAN_CLASSES.RECALL_SUPPRESSION_FOLLOWUP_PROOF_ALLOWED_NOT_READY,
      currentFactsDowngradeReport,
      review,
      {
        reason: 'selected_audit_observed_but_recall_suppression_followup_missing',
        requiredNextActions: [
          'execute_one_bounded_public_default_recall_suppression_proof_if_allowed_by_current_goal',
          'record_result_as_followup_evidence_only',
          'keep_memory_recall_reliable_unclaimed',
          'keep_memory_write_reliable_unclaimed',
          'keep_readiness_unclaimed'
        ],
        nextStep: 'Public/default recall suppression is the next bounded follow-up proof; do not record a blocker downgrade or claim reliability/readiness yet.'
      }
    );
  }

  if (reviewClass === REVIEW_CLASSES.DOWNGRADE_ALLOWED_NARROW_NOT_READY) {
    return basePlan(
      PLAN_CLASSES.DOWNGRADE_RECORD_ONLY_NOT_READY,
      currentFactsDowngradeReport,
      review,
      {
        reason: 'narrow_downgrade_record_only',
        blockerDowngradeAllowed: true,
        requiredNextActions: [
          'record_only_one_exact_selected_audit_correlation_blocker_downgrade',
          'keep_memory_recall_reliable_unclaimed',
          'keep_memory_write_reliable_unclaimed',
          'keep_readiness_unclaimed'
        ],
        nextStep: 'Record only the narrow downgrade; do not claim reliability or readiness.'
      }
    );
  }

  return basePlan(
    PLAN_CLASSES.FAIL_CLOSED_UNSUPPORTED_REVIEW_CLASS,
    currentFactsDowngradeReport,
    review,
    {
      reason: 'review_class_not_usable_for_prerequisite_plan',
      nextStep: 'Keep CM-1120 blocked until a supported CM-1129 review class is present.'
    }
  );
}

module.exports = {
  BLOCKER_ACTIONS,
  COMMON_DENIED_ACTIONS,
  PLAN_CLASSES,
  summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan
};
