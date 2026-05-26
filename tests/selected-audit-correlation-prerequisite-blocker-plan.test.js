'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REVIEW_CLASSES
} = require('../src/core/SelectedAuditCorrelationBlockerDowngradeReview');
const {
  PLAN_CLASSES,
  summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan
} = require('../src/core/SelectedAuditCorrelationPrerequisiteBlockerPlan');

function downgradeReport(overrides = {}) {
  const reviewClass = overrides.reviewClass || REVIEW_CLASSES.BLOCKED_CURRENT_FACTS_NOT_READY;
  return {
    status: 'blocked',
    currentFactsStatus: 'blocked',
    currentFactsBlockerReasons: [
      'dirty_worktree',
      'prior_result_CM-1111_missing',
      'prior_result_CM-1115_missing'
    ],
    readinessClass: 'BLOCKED_PREFLIGHT_NOT_READY',
    reviewClass,
    blockerDowngradeAllowed: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsObservationInput: false,
      readsTrueAuditLog: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false
    },
    review: {
      reviewClass,
      currentFactsBlockerReasons: [
        'dirty_worktree',
        'prior_result_CM-1111_missing',
        'prior_result_CM-1115_missing'
      ],
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false
    },
    ...overrides
  };
}

test('CM-1130 summarizes current blocker prerequisites without authorizing execution', () => {
  const plan = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(downgradeReport());

  assert.equal(plan.planClass, PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING);
  assert.equal(plan.blockerDowngradeAllowed, false);
  assert.equal(plan.cm1111ExecutionAuthorizedNow, false);
  assert.equal(plan.cm1115ExecutionAuthorizedNow, false);
  assert.equal(plan.cm1120ExecutionAllowedNow, false);
  assert.equal(plan.readinessClaimAllowed, false);
  assert.equal(plan.reliabilityClaimAllowed, false);
  assert.deepEqual(plan.prerequisiteBlockers, [
    'dirty_worktree',
    'prior_result_CM-1111_missing',
    'prior_result_CM-1115_missing'
  ]);
  assert.deepEqual(plan.requiredNextActions, [
    'resolve_dirty_worktree_or_isolate_verified_scope_without_overwriting_user_work',
    'obtain_separate_exact_cm1111_retention_apply_approval',
    'execute_cm1111_only_if_approved_and_record_result_class',
    'obtain_separate_exact_cm1115_metadata_verify_approval_after_cm1111',
    'execute_cm1115_only_if_approved_and_record_result_class',
    'rerun_cm1129_current_facts_downgrade_review_after_prerequisites',
    'keep_cm1120_blocked_until_cm1129_allows_next_stage',
    'keep_readiness_and_reliability_unclaimed'
  ]);
});

test('CM-1130 keeps preflight-ready no-observation state waiting for exact CM-1120 approval', () => {
  const plan = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(
    downgradeReport({
      currentFactsStatus: 'ok',
      currentFactsBlockerReasons: [],
      readinessClass: 'READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED',
      reviewClass: REVIEW_CLASSES.READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE,
      review: {
        reviewClass: REVIEW_CLASSES.READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE,
        currentFactsBlockerReasons: []
      }
    })
  );

  assert.equal(plan.planClass, PLAN_CLASSES.AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE);
  assert.equal(plan.blockerDowngradeAllowed, false);
  assert.equal(plan.cm1120ExecutionAllowedNow, false);
  assert.deepEqual(plan.requiredNextActions, [
    'obtain_separate_exact_cm1120_selected_observation_approval',
    'execute_only_selected_sanitized_observation_if_approved',
    'classify_selected_observation_through_cm1123_cm1128',
    'keep_readiness_and_reliability_unclaimed'
  ]);
});

test('CM-1130 allows only narrow downgrade record when CM-1129 is favorable', () => {
  const plan = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(
    downgradeReport({
      currentFactsStatus: 'ok',
      currentFactsBlockerReasons: [],
      readinessClass: 'SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY',
      reviewClass: REVIEW_CLASSES.DOWNGRADE_ALLOWED_NARROW_NOT_READY,
      blockerDowngradeAllowed: true,
      review: {
        reviewClass: REVIEW_CLASSES.DOWNGRADE_ALLOWED_NARROW_NOT_READY,
        blockerDowngradeAllowed: true,
        currentFactsBlockerReasons: []
      }
    })
  );

  assert.equal(plan.planClass, PLAN_CLASSES.DOWNGRADE_RECORD_ONLY_NOT_READY);
  assert.equal(plan.blockerDowngradeAllowed, true);
  assert.equal(plan.cm1120ExecutionAllowedNow, false);
  assert.equal(plan.readinessClaimAllowed, false);
  assert.equal(plan.reliabilityClaimAllowed, false);
  assert.deepEqual(plan.requiredNextActions, [
    'record_only_one_exact_selected_audit_correlation_blocker_downgrade',
    'keep_memory_recall_reliable_unclaimed',
    'keep_memory_write_reliable_unclaimed',
    'keep_readiness_unclaimed'
  ]);
});

test('CM-1130 fails closed on overclaim and side-effect signals', () => {
  const overclaim = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(
    downgradeReport({
      readinessClaimAllowed: true
    })
  );
  assert.equal(overclaim.planClass, PLAN_CLASSES.FAIL_CLOSED_OVERCLAIM_SIGNAL);
  assert.equal(overclaim.blockerDowngradeAllowed, false);

  const sideEffect = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(
    downgradeReport({
      safety: {
        callsSearchMemory: true
      }
    })
  );
  assert.equal(sideEffect.planClass, PLAN_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL);
  assert.equal(sideEffect.forbiddenFlag, 'callsSearchMemory');
  assert.equal(sideEffect.blockerDowngradeAllowed, false);
});

test('CM-1130 fails closed on malformed or unsupported reports', () => {
  const missing = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(null);
  assert.equal(missing.planClass, PLAN_CLASSES.FAIL_CLOSED_REPORT_MISSING);
  assert.equal(missing.blockerDowngradeAllowed, false);

  const unsupported = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(
    downgradeReport({
      reviewClass: REVIEW_CLASSES.SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE
    })
  );
  assert.equal(unsupported.planClass, PLAN_CLASSES.FAIL_CLOSED_UNSUPPORTED_REVIEW_CLASS);
  assert.equal(unsupported.blockerDowngradeAllowed, false);
});
