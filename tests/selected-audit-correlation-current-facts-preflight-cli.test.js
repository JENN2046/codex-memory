'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const test = require('node:test');

const {
  buildReport,
  collectGitFacts
} = require('../src/cli/selected-audit-correlation-current-facts-preflight');
const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');

const cliPath = path.join('src', 'cli', 'selected-audit-correlation-current-facts-preflight.js');

function fakeGitRunner(outputs) {
  return (args) => {
    const key = args.join(' ');
    const value = outputs[key];
    if (value && typeof value === 'object') {
      return {
        status: value.status ?? 0,
        stdout: value.stdout || '',
        stderr: value.stderr || '',
        error: value.error || ''
      };
    }
    return {
      status: 0,
      stdout: value || '',
      stderr: '',
      error: ''
    };
  };
}

function cleanOutputs(overrides = {}) {
  return {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': `${TARGET_HEAD}\n`,
    'rev-parse origin/main': `${TARGET_HEAD}\n`,
    'rev-parse refs/remotes/origin/main': `${TARGET_HEAD}\n`,
    'status --short': '',
    ...overrides
  };
}

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('CM-1122 current-facts collector defaults to blocked when prior results are not assumed', () => {
  const report = buildReport(
    {},
    { gitRunner: fakeGitRunner(cleanOutputs()) }
  );

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT_BLOCKED_NOT_EXECUTED');
  assert.equal(report.acceptedForExecutionPreflight, false);
  assert.equal(report.executionStarted, false);
  assert.equal(report.auditObservationStarted, false);
  assert.equal(report.preflightOnly, true);
  assert.equal(report.separateExactApprovalRequired, true);
  assert.equal(report.implicitAuditReadAuthorizationGranted, false);
  assert.equal(report.withSatisfiedPriorResults, false);
  assert.ok(report.blockerReasons.includes('prior_result_CM-1111_missing'));
  assert.ok(report.blockerReasons.includes('prior_result_CM-1115_missing'));
  assert.equal(report.cleanTargetHead, true);
  assert.equal(report.currentArtifactsBound, true);
  assert.equal(report.observationSurfaceBound, true);
  assert.equal(report.boundaryFlagsBound, true);
  assert.equal(report.collectorSafety.readsCurrentGitFacts, true);
  assert.equal(report.collectorSafety.executesReadOnlyGitCommands, true);
  assert.equal(report.collectorSafety.readsTrueAuditLog, false);
  assert.equal(report.collectorSafety.callsRecordMemory, false);
  assert.equal(report.readinessClaimAllowed, false);
});

test('CM-1122 current-facts collector can prove the synthetic all-prior-results preflight shape without execution', () => {
  const report = buildReport(
    { withSatisfiedPriorResults: true },
    { gitRunner: fakeGitRunner(cleanOutputs()) }
  );

  assert.equal(report.status, 'ok');
  assert.equal(report.acceptedForExecutionPreflight, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.auditObservationStarted, false);
  assert.equal(report.withSatisfiedPriorResults, true);
  assert.deepEqual(report.blockerReasons, []);
  assert.equal(report.helperSafety.readsTrueAuditLog, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
});

test('CM-1122 current-facts collector fails closed for dirty worktree and target head drift', () => {
  const report = buildReport(
    { withSatisfiedPriorResults: true },
    {
      gitRunner: fakeGitRunner(cleanOutputs({
        'rev-parse HEAD': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n',
        'status --short': ' M src/storage/AuditLogStore.js\n?? docs/CM1121_SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT.md\n'
      }))
    }
  );

  assert.equal(report.status, 'blocked');
  assert.equal(report.acceptedForExecutionPreflight, false);
  assert.ok(report.blockerReasons.includes('localHead_target_head_mismatch'));
  assert.ok(report.blockerReasons.includes('dirty_worktree'));
  assert.equal(report.normalizedGitFacts.dirtyStatusLineCount, 2);
});

test('CM-1122 current-facts collector records read-only git command failures', () => {
  const report = buildReport(
    { withSatisfiedPriorResults: true },
    {
      gitRunner: fakeGitRunner(cleanOutputs({
        'rev-parse refs/remotes/origin/main': {
          status: 128,
          stdout: '',
          stderr: 'fatal: ambiguous argument refs/remotes/origin/main'
        }
      }))
    }
  );

  assert.equal(report.status, 'blocked');
  assert.ok(report.blockerReasons.includes('remoteMainHead_missing_or_malformed'));
  assert.equal(report.gitFactErrors.length, 1);
  assert.match(report.gitFactErrors[0].command, /git rev-parse refs\/remotes\/origin\/main/);
  assert.equal(report.executionStarted, false);
  assert.equal(report.auditObservationStarted, false);
});

test('CM-1122 rejected execution flags do not collect git facts', () => {
  const report = buildReport({ rejectedFlag: '--audit-read' }, {
    gitRunner: () => {
      throw new Error('git should not be called for rejected flags');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREFLIGHT_REJECTED_EXECUTION_FLAG');
  assert.equal(report.rejectedFlag, '--audit-read');
  assert.equal(report.executionStarted, false);
  assert.equal(report.auditObservationStarted, false);
  assert.equal(report.readsTrueAuditLog, false);
  assert.equal(report.readsRawAudit, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsMemoryOverview, false);
});

test('CM-1122 collectGitFacts records read-only git command failures', () => {
  const facts = collectGitFacts({
    gitRunner: fakeGitRunner(cleanOutputs({
      'branch --show-current': {
        status: 128,
        stdout: '',
        stderr: 'fatal: not a git repository'
      }
    }))
  });

  assert.equal(facts.gitFacts.branch, '');
  assert.equal(facts.gitFacts.localHead, TARGET_HEAD);
  assert.equal(facts.gitFacts.remoteMainHead, TARGET_HEAD);
  assert.equal(facts.errors.length, 1);
  assert.equal(facts.errors[0].command, 'git branch --show-current');
});

test('CM-1122 CLI help and rejected flag behavior', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node src\/cli\/selected-audit-correlation-current-facts-preflight\.js/);
  assert.match(help.stdout, /never reads audit logs/);

  const rejected = runCli(['--json', '--provider']);
  assert.equal(rejected.status, 1);
  const report = JSON.parse(rejected.stdout);
  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.executionStarted, false);
  assert.equal(report.auditObservationStarted, false);
});
