'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PLAN_CLASSES
} = require('../src/core/SelectedAuditCorrelationPrerequisiteBlockerPlan');
const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-prerequisite-plan');

function gitRunnerForCleanHead(args) {
  const key = args.join(' ');
  const outputs = {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': `${TARGET_HEAD}\n`,
    'rev-parse origin/main': `${TARGET_HEAD}\n`,
    'rev-parse refs/remotes/origin/main': `${TARGET_HEAD}\n`,
    'status --short': ''
  };
  return {
    status: 0,
    stdout: outputs[key] || '',
    stderr: '',
    error: ''
  };
}

function gitRunnerForDirtyHead(args) {
  if (args.join(' ') === 'status --short') {
    return {
      status: 0,
      stdout: ' M STATUS.md\n',
      stderr: '',
      error: ''
    };
  }
  return gitRunnerForCleanHead(args);
}

test('CM-1130 current-facts prerequisite CLI returns ordered blockers for dirty current state', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.downgradeReviewExecuted, true);
  assert.equal(report.prerequisitePlanExecuted, true);
  assert.equal(report.planClass, PLAN_CLASSES.BLOCKED_PREREQUISITES_PENDING);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.cm1120ExecutionAllowedNow, false);
  assert.deepEqual(report.currentFactsBlockerReasons, [
    'dirty_worktree',
    'prior_result_CM-1111_missing',
    'prior_result_CM-1115_missing'
  ]);
  assert.deepEqual(report.requiredNextActions, [
    'resolve_dirty_worktree_or_isolate_verified_scope_without_overwriting_user_work',
    'obtain_separate_exact_cm1111_retention_apply_approval',
    'execute_cm1111_only_if_approved_and_record_result_class',
    'obtain_separate_exact_cm1115_metadata_verify_approval_after_cm1111',
    'execute_cm1115_only_if_approved_and_record_result_class',
    'rerun_cm1129_current_facts_downgrade_review_after_prerequisites',
    'keep_cm1120_blocked_until_cm1129_allows_next_stage',
    'keep_readiness_and_reliability_unclaimed'
  ]);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1130 current-facts prerequisite CLI keeps clean no-observation state approval-gated', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(
    report.planClass,
    PLAN_CLASSES.AWAIT_SEPARATE_EXACT_OBSERVATION_APPROVAL_NOT_DOWNGRADE
  );
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.cm1120ExecutionAllowedNow, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1130 current-facts prerequisite CLI rejects observation and audit flags before Git collection', () => {
  const options = parseArgs(['--json', '--audit-log']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected audit input flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREREQUISITE_PLAN_REJECTED_INPUT_FLAG'
  );
  assert.equal(report.rejectedFlag, '--audit-log');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.prerequisitePlanExecuted, false);
  assert.equal(report.blockerDowngradeAllowed, false);
});

test('CM-1130 current-facts prerequisite CLI help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-prerequisite-plan/);
    writes.length = 0;
    assert.equal(main(['--observation-file']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREREQUISITE_PLAN_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
