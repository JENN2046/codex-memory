'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  STAGE_CLASSES
} = require('../src/core/SelectedAuditCorrelationPrerequisiteStageGate');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-stage-gate');

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

test('CM-1131 current-facts stage gate blocks dirty worktree before approval requests', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.prerequisitePlanExecuted, true);
  assert.equal(report.stageGateExecuted, true);
  assert.equal(report.stageClass, STAGE_CLASSES.BLOCKED_RESOLVE_WORKTREE_BEFORE_APPROVAL);
  assert.equal(report.nextApprovalTarget, 'none');
  assert.equal(report.cm1111ApprovalRequestAllowed, false);
  assert.equal(report.cm1120ApprovalRequestAllowed, false);
  assert.equal(report.cm1111ExecutionAuthorizedNow, false);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1131 current-facts stage gate reaches CM-1120 request gate only with clean satisfied prerequisites', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(report.stageClass, STAGE_CLASSES.WAIT_CM1120_SEPARATE_EXACT_OBSERVATION_APPROVAL);
  assert.equal(report.nextApprovalTarget, 'CM-1120');
  assert.equal(report.cm1120ApprovalRequestAllowed, true);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1131 current-facts stage gate rejects observation and audit flags before Git collection', () => {
  const options = parseArgs(['--json', '--observation-file']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected observation input flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_STAGE_GATE_REJECTED_INPUT_FLAG'
  );
  assert.equal(report.rejectedFlag, '--observation-file');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.stageGateExecuted, false);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
});

test('CM-1131 current-facts stage gate help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-stage-gate/);
    writes.length = 0;
    assert.equal(main(['--audit-log']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_STAGE_GATE_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
