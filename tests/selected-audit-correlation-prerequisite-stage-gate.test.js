'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PLAN_CLASSES
} = require('../src/core/SelectedAuditCorrelationPrerequisiteBlockerPlan');
const {
  STAGE_CLASSES,
  evaluateSelectedAuditCorrelationPrerequisiteStageGate
} = require('../src/core/SelectedAuditCorrelationPrerequisiteStageGate');

function planReport(overrides = {}) {
  const planClass = overrides.planClass || PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING;
  const prerequisiteBlockers = overrides.prerequisiteBlockers || [
    'dirty_worktree',
    'prior_result_CM-1111_missing',
    'prior_result_CM-1115_missing'
  ];
  return {
    status: 'blocked',
    planClass,
    prerequisiteBlockers,
    blockerDowngradeAllowed: false,
    cm1120ExecutionAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsObservationInput: false,
      readsTrueAuditLog: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false
    },
    prerequisitePlan: {
      planClass,
      prerequisiteBlockers,
      blockerDowngradeAllowed: false,
      cm1111ExecutionAuthorizedNow: false,
      cm1115ExecutionAuthorizedNow: false,
      cm1120ExecutionAllowedNow: false,
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false
    },
    ...overrides
  };
}

test('CM-1131 blocks approval sequencing until dirty worktree is resolved', () => {
  const gate = evaluateSelectedAuditCorrelationPrerequisiteStageGate(planReport());

  assert.equal(gate.stageClass, STAGE_CLASSES.BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL);
  assert.equal(gate.nextApprovalTarget, 'none');
  assert.equal(gate.cm1111ApprovalRequestAllowed, false);
  assert.equal(gate.cm1111ExecutionAuthorizedNow, false);
  assert.equal(gate.cm1120ExecutionAuthorizedNow, false);
  assert.equal(gate.readinessClaimAllowed, false);
  assert.equal(gate.reliabilityClaimAllowed, false);
});

test('CM-1131 allows only CM-1111 approval request after worktree blocker clears', () => {
  const gate = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      prerequisiteBlockers: [
        'prior_result_CM-1111_missing',
        'prior_result_CM-1115_missing'
      ]
    })
  );

  assert.equal(gate.stageClass, STAGE_CLASSES.WAIT_CM1111_SEPARATE_EXACT_APPROVAL);
  assert.equal(gate.nextApprovalTarget, 'CM-1111');
  assert.equal(gate.cm1111ApprovalRequestAllowed, true);
  assert.equal(gate.cm1115ApprovalRequestAllowed, false);
  assert.equal(gate.cm1120ApprovalRequestAllowed, false);
  assert.equal(gate.cm1111ExecutionAuthorizedNow, false);
});

test('CM-1131 allows only CM-1115 approval request after CM-1111 result exists', () => {
  const gate = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      prerequisiteBlockers: [
        'prior_result_CM-1115_missing'
      ]
    })
  );

  assert.equal(gate.stageClass, STAGE_CLASSES.WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111);
  assert.equal(gate.nextApprovalTarget, 'CM-1115');
  assert.equal(gate.cm1111ApprovalRequestAllowed, false);
  assert.equal(gate.cm1115ApprovalRequestAllowed, true);
  assert.equal(gate.cm1120ApprovalRequestAllowed, false);
  assert.equal(gate.cm1115ExecutionAuthorizedNow, false);
});

test('CM-1131 gates CM-1120 approval request without executing observation', () => {
  const gate = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      planClass: PLAN_CLASSES.AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE,
      prerequisiteBlockers: []
    })
  );

  assert.equal(gate.stageClass, STAGE_CLASSES.WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL);
  assert.equal(gate.nextApprovalTarget, 'CM-1120');
  assert.equal(gate.cm1120ApprovalRequestAllowed, true);
  assert.equal(gate.cm1120ExecutionAuthorizedNow, false);
  assert.equal(gate.blockerDowngradeRecordAllowed, false);
});

test('CM-1131 allows only narrow downgrade record for favorable not-ready plan', () => {
  const gate = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      planClass: PLAN_CLASSES.DOWNGRADE_RECORD_ONLY_NOT_READY,
      prerequisiteBlockers: [],
      blockerDowngradeAllowed: true,
      prerequisitePlan: {
        planClass: PLAN_CLASSES.DOWNGRADE_RECORD_ONLY_NOT_READY,
        prerequisiteBlockers: [],
        blockerDowngradeAllowed: true
      }
    })
  );

  assert.equal(gate.stageClass, STAGE_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY);
  assert.equal(gate.nextApprovalTarget, 'none');
  assert.equal(gate.blockerDowngradeRecordAllowed, true);
  assert.equal(gate.cm1120ExecutionAuthorizedNow, false);
  assert.equal(gate.readinessClaimAllowed, false);
  assert.equal(gate.reliabilityClaimAllowed, false);
});

test('CM-1131 fails closed on overclaim, side-effect, and execution authorization signals', () => {
  const overclaim = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      reliabilityClaimAllowed: true
    })
  );
  assert.equal(overclaim.stageClass, STAGE_CLASSES.FAIL_CLOSED_OVERCLAIM_SIGNAL);

  const sideEffect = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      prerequisitePlan: {
        planClass: PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING,
        prerequisiteBlockers: ['prior_result_CM-1111_missing'],
        safety: {
          readsTrueAuditLog: true
        }
      }
    })
  );
  assert.equal(sideEffect.stageClass, STAGE_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL);
  assert.equal(sideEffect.forbiddenFlag, 'readsTrueAuditLog');

  const execution = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      prerequisitePlan: {
        planClass: PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING,
        prerequisiteBlockers: ['prior_result_CM-1111_missing'],
        cm1111ExecutionAuthorizedNow: true
      }
    })
  );
  assert.equal(execution.stageClass, STAGE_CLASSES.FAIL_CLOSED_INCONSISTENT_STAGE_SIGNAL);
});

test('CM-1131 fails closed on missing or unsupported plan class', () => {
  const missing = evaluateSelectedAuditCorrelationPrerequisiteStageGate(null);
  assert.equal(missing.stageClass, STAGE_CLASSES.FAIL_CLOSED_REPORT_MISSING);

  const unsupported = evaluateSelectedAuditCorrelationPrerequisiteStageGate(
    planReport({
      planClass: 'UNSUPPORTED_PLAN_CLASS',
      prerequisiteBlockers: []
    })
  );
  assert.equal(unsupported.stageClass, STAGE_CLASSES.FAIL_CLOSED_UNSUPPORTED_PLAN_CLASS);
});
