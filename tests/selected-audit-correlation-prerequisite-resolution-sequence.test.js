'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  STAGE_CLASSES
} = require('../src/core/SelectedAuditCorrelationPrerequisiteStageGate');
const {
  RESOLUTION_CLASSES,
  buildSelectedAuditCorrelationPrerequisiteResolutionSequence
} = require('../src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence');

function stageReport(overrides = {}) {
  const stageClass = overrides.stageClass || STAGE_CLASSES.BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL;
  return {
    status: 'blocked',
    stageClass,
    planClass: 'BLOCKED_PREREQUISITES_PENDING',
    currentFactsBlockerReasons: [
      'dirty_worktree',
      'prior_result_CM-1111_missing',
      'prior_result_CM-1115_missing'
    ],
    nextApprovalTarget: 'none',
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAuthorizedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsObservationInput: false,
      readsTrueAuditLog: false,
      callsSearchMemory: false,
      appliesMutation: false,
      claimsReadiness: false
    },
    ...overrides
  };
}

test('CM-1140 resolves dirty stage gate to local isolation only without approval requests', () => {
  const sequence = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport());

  assert.equal(sequence.resolutionClass, RESOLUTION_CLASSES.BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED);
  assert.equal(sequence.nextAllowedAction, 'local_dirty_scope_isolation_decision_only');
  assert.equal(sequence.nextApprovalTarget, 'none');
  assert.equal(sequence.approvalRequestCandidate, 'none');
  assert.equal(sequence.cm1111ApprovalRequestAllowed, false);
  assert.equal(sequence.cm1120ApprovalRequestAllowed, false);
  assert.equal(sequence.cm1111ExecutionAuthorizedNow, false);
  assert.equal(sequence.readinessClaimAllowed, false);
});

test('CM-1140 sequences CM-1111 approval packet only without execution', () => {
  const sequence = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
    stageClass: STAGE_CLASSES.WAIT_CM1111_SEPARATE_EXACT_APPROVAL,
    currentFactsBlockerReasons: ['prior_result_CM-1111_missing', 'prior_result_CM-1115_missing']
  }));

  assert.equal(sequence.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1111_APPROVAL_PACKET_ONLY);
  assert.equal(sequence.nextApprovalTarget, 'CM-1111');
  assert.equal(sequence.approvalRequestCandidate, 'CM-1111');
  assert.equal(sequence.cm1111ApprovalRequestAllowed, false);
  assert.equal(sequence.cm1111ExecutionAuthorizedNow, false);
  assert.match(sequence.orderedResolutionSteps.join(' '), /execute_cm1111_only_after_exact_approval/);
});

test('CM-1140 sequences CM-1115 and CM-1120 approval packet boundaries in order', () => {
  const cm1115 = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
    stageClass: STAGE_CLASSES.WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111,
    currentFactsBlockerReasons: ['prior_result_CM-1115_missing']
  }));
  assert.equal(cm1115.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111);
  assert.equal(cm1115.nextApprovalTarget, 'CM-1115');
  assert.equal(cm1115.cm1115ExecutionAuthorizedNow, false);

  const cm1120 = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
    stageClass: STAGE_CLASSES.WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL,
    currentFactsBlockerReasons: []
  }));
  assert.equal(cm1120.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS);
  assert.equal(cm1120.nextApprovalTarget, 'CM-1120');
  assert.equal(cm1120.cm1120ExecutionAuthorizedNow, false);
});

test('CM-1140 sequences CM-1120 target-head rebaseline before observation approval', () => {
  const sequence = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
    stageClass: STAGE_CLASSES.WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115,
    currentFactsBlockerReasons: [
      'localHead_target_head_mismatch',
      'originHead_target_head_mismatch',
      'remoteMainHead_target_head_mismatch'
    ]
  }));

  assert.equal(sequence.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1120_TARGET_HEAD_REBASELINE_AFTER_CM1115);
  assert.equal(sequence.nextAllowedAction, 'prepare_fresh_cm1120_target_head_rebaseline_packet_only');
  assert.equal(sequence.nextApprovalTarget, 'CM-1120-rebaseline');
  assert.equal(sequence.cm1120ApprovalRequestAllowed, false);
  assert.equal(sequence.cm1120ExecutionAuthorizedNow, false);
  assert.match(sequence.orderedResolutionSteps.join(' '), /prepare_fresh_cm1120_selected_observation_packet/);
});

test('CM-1140 allows only narrow downgrade record when stage gate says record-only', () => {
  const sequence = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
    stageClass: STAGE_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY,
    currentFactsBlockerReasons: [],
    blockerDowngradeRecordAllowed: true
  }));

  assert.equal(sequence.resolutionClass, RESOLUTION_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY);
  assert.equal(sequence.blockerDowngradeRecordAllowed, true);
  assert.equal(sequence.nextApprovalTarget, 'none');
  assert.equal(sequence.cm1120ExecutionAuthorizedNow, false);
  assert.equal(sequence.reliabilityClaimAllowed, false);
});

test('CM-1140 fails closed on missing, unsupported, side-effect, or overclaim stage-gate reports', () => {
  assert.equal(
    buildSelectedAuditCorrelationPrerequisiteResolutionSequence(null).resolutionClass,
    RESOLUTION_CLASSES.FAIL_CLOSED_REPORT_MISSING
  );
  assert.equal(
    buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
      stageClass: 'UNKNOWN_STAGE'
    })).resolutionClass,
    RESOLUTION_CLASSES.FAIL_CLOSED_UNSUPPORTED_STAGE_CLASS
  );
  assert.equal(
    buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
      safety: { readsTrueAuditLog: true }
    })).resolutionClass,
    RESOLUTION_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL
  );
  assert.equal(
    buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageReport({
      readinessClaimAllowed: true
    })).resolutionClass,
    RESOLUTION_CLASSES.FAIL_CLOSED_OVERCLAIM_OR_EXECUTION_SIGNAL
  );
});
