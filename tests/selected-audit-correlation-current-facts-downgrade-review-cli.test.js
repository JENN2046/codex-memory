'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REVIEW_CLASSES
} = require('../src/core/SelectedAuditCorrelationBlockerDowngradeReview');
const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-downgrade-review');

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

test('CM-1129 downgrade review CLI reports current dirty facts as not downgrade', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.readinessGateExecuted, true);
  assert.equal(report.downgradeReviewExecuted, true);
  assert.equal(report.reviewClass, REVIEW_CLASSES.BLOCKED_CURRENT_FACTS_NOT_READY);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.downgradeScope, 'none');
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.deepEqual(report.currentFactsBlockerReasons, [
    'dirty_worktree',
    'prior_result_CM-1111_missing',
    'prior_result_CM-1115_missing'
  ]);
});

test('CM-1129 downgrade review CLI keeps clean no-observation preflight as not downgrade', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(
    report.reviewClass,
    REVIEW_CLASSES.READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE
  );
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1129 downgrade review CLI rejects audit and observation flags before Git collection', () => {
  const options = parseArgs(['--json', '--observation-file']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected observation input flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_DOWNGRADE_REVIEW_REJECTED_INPUT_FLAG'
  );
  assert.equal(report.rejectedFlag, '--observation-file');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.downgradeReviewExecuted, false);
  assert.equal(report.blockerDowngradeAllowed, false);
});

test('CM-1129 downgrade review CLI help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-downgrade-review/);
    writes.length = 0;
    assert.equal(main(['--audit-log']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_DOWNGRADE_REVIEW_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
