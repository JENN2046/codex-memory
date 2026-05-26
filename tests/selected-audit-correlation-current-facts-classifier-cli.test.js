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
  buildPreflightSummary,
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-classifier');

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

test('CM-1124 classifier current-facts wrapper defaults to blocked no-observation classification', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.classifierExecuted, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
  assert.equal(report.safety.readsObservationInput, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1124 current facts can be preflight-ready but still no-observation classified', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(report.currentFactsAcceptedForExecutionPreflight, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE);
  assert.equal(report.classification.reason, 'audit_observation_not_started');
  assert.equal(report.blockerDowngradeAllowed, false);
});

test('CM-1124 rejects observation and raw input flags before collecting current facts', () => {
  const options = parseArgs(['--json', '--observation-file']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected observation input flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--observation-file');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.classifierExecuted, false);
  assert.equal(report.readsTrueAuditLog, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1124 rejected inherited execution flags also stop before current facts collection', () => {
  const options = parseArgs(['--audit-read']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected audit-read flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--audit-read');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.classifierExecuted, false);
});

test('CM-1124 preflight summary builder passes only classifier-relevant booleans', () => {
  const summary = buildPreflightSummary({
    acceptedForExecutionPreflight: true,
    exactApprovalLineMatched: true,
    requestHashMatched: true,
    cleanTargetHead: true,
    requiredPriorResultsBound: true,
    currentArtifactsBound: true,
    observationSurfaceBound: true,
    boundaryFlagsBound: true,
    executionStarted: false,
    auditObservationStarted: false,
    blockerReasons: ['dirty_worktree'],
    ignored: 'not copied'
  });

  assert.deepEqual(Object.keys(summary).sort(), [
    'acceptedForExecutionPreflight',
    'auditObservationStarted',
    'blockerReasons',
    'boundaryFlagsBound',
    'cleanTargetHead',
    'currentArtifactsBound',
    'exactApprovalLineMatched',
    'executionStarted',
    'observationSurfaceBound',
    'requestHashMatched',
    'requiredPriorResultsBound'
  ].sort());
  assert.equal(summary.acceptedForExecutionPreflight, true);
  assert.deepEqual(summary.blockerReasons, ['dirty_worktree']);
});

test('CM-1124 CLI help and rejected flag behavior', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-classifier/);
    writes.length = 0;
    assert.equal(main(['--input-file']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIER_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
