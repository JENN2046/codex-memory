'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  RESULT_CLASSES
} = require('../src/core/SelectedAuditCorrelationResultClassifier');
const {
  READINESS_CLASSES
} = require('../src/core/SelectedAuditCorrelationExecutionReadiness');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-readiness');

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

test('CM-1127 readiness CLI reports blocked preflight for dirty or missing-prior current facts', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.classifierExecuted, true);
  assert.equal(report.readinessGateExecuted, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE);
  assert.equal(report.readinessClass, READINESS_CLASSES.BLOCKED_PREFLIGHT_NOT_READY);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1127 readiness CLI keeps preflight-ready no-observation state not executed', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(report.currentFactsAcceptedForExecutionPreflight, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE);
  assert.equal(
    report.readinessClass,
    READINESS_CLASSES.READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED
  );
  assert.equal(report.readiness.selectedObservationEvidencePresent, false);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1127 readiness CLI rejects observation and audit input flags before Git collection', () => {
  const options = parseArgs(['--json', '--audit-log']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected audit input flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--audit-log');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.classifierExecuted, false);
  assert.equal(report.readinessGateExecuted, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1127 readiness CLI help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-readiness/);
    writes.length = 0;
    assert.equal(main(['--observation-file']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_READINESS_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
