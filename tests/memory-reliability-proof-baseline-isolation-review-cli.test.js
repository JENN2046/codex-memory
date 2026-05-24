'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const test = require('node:test');

const {
  buildReport
} = require('../src/cli/memory-reliability-proof-baseline-isolation-review');

const cliPath = path.join('src', 'cli', 'memory-reliability-proof-baseline-isolation-review.js');

function blockerPlanReport(overrides = {}) {
  return {
    status: 'blocked',
    decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_ACCEPTED_NOT_EXECUTED',
    blockerPlanAccepted: true,
    baselineReadyForLiveProof: false,
    dirtyBaselineBlocked: true,
    unscopedCommitBlocked: true,
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    ...overrides
  };
}

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('CM-0969 emits blocked isolation review for mixed dirty baseline without staging or committing', () => {
  const report = buildReport({}, {
    blockerPlanReportBuilder: () => blockerPlanReport(),
    gitStatusRunner: () => ({
      status: 0,
      stdout: [
        ' M .agent_board/TASK_QUEUE.md',
        ' M src/app.js',
        '?? src/cli/memory-reliability-proof-baseline-isolation-review.js',
        '?? docs/MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_CLI.md'
      ].join('\n'),
      stderr: '',
      error: ''
    })
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_BLOCKED_NOT_EXECUTED');
  assert.equal(report.source, 'current_git_status_readonly');
  assert.equal(report.blockerPlanAccepted, true);
  assert.equal(report.isolationReviewAccepted, true);
  assert.equal(report.safeForLiveProof, false);
  assert.equal(report.safeForCommit, false);
  assert.equal(report.dirtyBaselineBlocked, true);
  assert.equal(report.unscopedCommitBlocked, true);
  assert.equal(report.dirtySummary.dirtyStatusLineCount, 4);
  assert.equal(report.safety.runsReadOnlyGitStatus, true);
  assert.equal(report.safety.stagesFiles, false);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
});

test('CM-0969 reports incomplete when git status cannot be read', () => {
  const report = buildReport({}, {
    blockerPlanReportBuilder: () => blockerPlanReport(),
    gitStatusRunner: () => ({
      status: 128,
      stdout: '',
      stderr: 'fatal: not a git repository',
      error: ''
    })
  });

  assert.equal(report.status, 'incomplete');
  assert.equal(report.isolationReviewAccepted, false);
  assert.equal(report.checks.gitStatusOk, false);
  assert.equal(report.safeForLiveProof, false);
  assert.equal(report.safeForCommit, false);
});

test('CM-0969 rejects execution and commit flags before running collectors', () => {
  const report = buildReport({ rejectedFlag: '--commit' }, {
    blockerPlanReportBuilder: () => {
      throw new Error('blocker plan builder should not be called');
    },
    gitStatusRunner: () => {
      throw new Error('git status should not be called');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_REJECTED_EXECUTION_FLAG');
  assert.equal(report.rejectedFlag, '--commit');
  assert.equal(report.executionStarted, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
});

test('CM-0969 CLI help and rejected flag behavior', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node src\/cli\/memory-reliability-proof-baseline-isolation-review\.js/);
  assert.match(help.stdout, /never stages, commits, pushes/);
  assert.match(help.stdout, /--stage --commit --push/);

  const rejected = runCli(['--json', '--stage']);
  assert.equal(rejected.status, 1);
  const report = JSON.parse(rejected.stdout);
  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--stage');
  assert.equal(report.executionStarted, false);
});
