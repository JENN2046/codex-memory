'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  RESOLUTION_CLASSES
} = require('../src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-resolution-sequence');

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

test('CM-1140 current-facts CLI reports dirty worktree resolution sequence without approvals', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.stageGateExecuted, true);
  assert.equal(report.resolutionSequenceBuilt, true);
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED);
  assert.equal(report.nextAllowedAction, 'local_dirty_scope_isolation_decision_only');
  assert.equal(report.nextApprovalTarget, 'none');
  assert.equal(report.cm1111ApprovalRequestAllowed, false);
  assert.equal(report.cm1120ApprovalRequestAllowed, false);
  assert.equal(report.cm1111ExecutionAuthorizedNow, false);
  assert.equal(report.readinessClaimAllowed, false);
});

test('CM-1140 current-facts CLI reaches CM-1120 approval-packet boundary only with clean satisfied prerequisites', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS);
  assert.equal(report.nextApprovalTarget, 'CM-1120');
  assert.equal(report.cm1120ApprovalRequestAllowed, false);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1140 current-facts CLI rejects audit flags before Git collection', () => {
  const options = parseArgs(['--json', '--audit-log']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected audit flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_REJECTED_INPUT_FLAG'
  );
  assert.equal(report.rejectedFlag, '--audit-log');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.resolutionSequenceBuilt, false);
});

test('CM-1140 current-facts CLI help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-resolution-sequence/);
    writes.length = 0;
    assert.equal(main(['--observation-file']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
