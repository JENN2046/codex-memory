'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PREFLIGHT_CLASSES
} = require('../src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight');
const {
  PLAN_CLASSES,
  buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan
} = require('../src/core/SelectedAuditCorrelationLocalCommitIsolationDryRunPlan');

function acceptedPreflight(overrides = {}) {
  return {
    status: 'accepted_not_executed',
    preflightClass: PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED,
    localCommitExecutionAllowedNow: true,
    commitAuthorized: false,
    cleanAuthorized: false,
    pushAuthorized: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      commits: false,
      cleansWorktree: false,
      pushes: false,
      appliesMutation: false,
      claimsReadiness: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false
    },
    ...overrides
  };
}

test('CM-1137 blocks when CM-1136 preflight is not accepted', () => {
  const plan = buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan({
    status: 'blocked',
    preflightClass: PREFLIGHT_CLASSES.BLOCKED_APPROVAL_MISSING,
    localCommitExecutionAllowedNow: false
  });

  assert.equal(plan.planClass, PLAN_CLASSES.BLOCKED_PREFLIGHT_NOT_ACCEPTED);
  assert.equal(plan.planPrepared, false);
  assert.equal(plan.commitExecutableNow, false);
});

test('CM-1137 prepares dry-run plan for accepted preflight without executable commit commands', () => {
  const plan = buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan(acceptedPreflight());

  assert.equal(plan.status, 'ready_not_executed');
  assert.equal(plan.planClass, PLAN_CLASSES.LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED);
  assert.equal(plan.planPrepared, true);
  assert.equal(plan.dryRunOnly, true);
  assert.equal(plan.plannedActions.length, 3);
  assert.equal(plan.plannedActions.every(action => action.executes === false), true);
  assert.equal(plan.stageCommandsPrepared, false);
  assert.equal(plan.commitCommandPrepared, false);
  assert.equal(plan.commitExecutableNow, false);
  assert.equal(plan.pushExecutableNow, false);
  assert.equal(plan.cleanExecutableNow, false);
  assert.equal(plan.safety.commits, false);
});

test('CM-1137 fails closed on mutation or overclaim signal from preflight', () => {
  const plan = buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan(acceptedPreflight({
    commitAuthorized: true
  }));

  assert.equal(plan.planClass, PLAN_CLASSES.FAIL_CLOSED_MUTATION_OR_OVERCLAIM_SIGNAL);
  assert.equal(plan.planPrepared, false);
  assert.equal(plan.commitExecutableNow, false);
});
