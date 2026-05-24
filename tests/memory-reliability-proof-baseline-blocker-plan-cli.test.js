'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const test = require('node:test');

const {
  buildReport
} = require('../src/cli/memory-reliability-proof-baseline-blocker-plan');

const cliPath = path.join('src', 'cli', 'memory-reliability-proof-baseline-blocker-plan.js');

function laneReport(lane, overrides = {}) {
  return {
    lane,
    blockerId: lane === 'recall' ? 'CMB-0013' : 'CMB-0014',
    decision: lane === 'recall'
      ? 'RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED'
      : 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED',
    sourceAccepted: true,
    cleanGit: false,
    noExecution: true,
    noSafetyDrift: true,
    dirtyStatusLineCount: 213,
    blockerReasons: ['dirty_worktree'],
    readyForSeparateLiveProof: false,
    blockedByDirtyBaseline: true,
    blockedByGitFactErrors: false,
    blockedBySafetyDrift: false,
    blockedByExecutionDrift: false,
    ...overrides
  };
}

function baselineReport(overrides = {}) {
  return {
    status: 'blocked',
    decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKED_NOT_EXECUTED',
    source: 'current_git_facts_readonly',
    baselineReadinessReviewAccepted: true,
    baselineReadyForLiveProof: false,
    dirtyBaselineBlocked: true,
    laneReports: [
      laneReport('recall'),
      laneReport('write')
    ],
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
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

test('CM-0968 emits an accepted blocker plan from the current dirty-baseline shape without live proof', () => {
  const report = buildReport({}, {
    baselineReportBuilder: () => baselineReport()
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_ACCEPTED_NOT_EXECUTED');
  assert.equal(report.source, 'current_baseline_readiness_cli');
  assert.equal(report.blockerPlanAccepted, true);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.dirtyBaselineBlocked, true);
  assert.equal(report.unscopedCommitBlocked, true);
  assert.deepEqual(report.laneDirtyCounts, [213, 213]);
  assert.equal(report.executionStarted, false);
  assert.equal(report.liveProofStarted, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
  assert.equal(report.safety.executesReadOnlyGitCommands, true);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
});

test('CM-0968 reports incomplete when the baseline is proof-ready instead of dirty-blocked', () => {
  const report = buildReport({}, {
    baselineReportBuilder: () => baselineReport({
      status: 'ok',
      decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_READY_NOT_EXECUTED',
      baselineReadyForLiveProof: true,
      dirtyBaselineBlocked: false,
      laneReports: [
        laneReport('recall', {
          dirtyStatusLineCount: 0,
          blockerReasons: [],
          readyForSeparateLiveProof: true,
          blockedByDirtyBaseline: false
        }),
        laneReport('write', {
          dirtyStatusLineCount: 0,
          blockerReasons: [],
          readyForSeparateLiveProof: true,
          blockedByDirtyBaseline: false
        })
      ]
    })
  });

  assert.equal(report.status, 'incomplete');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_INCOMPLETE_NOT_EXECUTED');
  assert.equal(report.blockerPlanAccepted, false);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.dirtyBaselineBlocked, false);
});

test('CM-0968 rejects execution flags before building the baseline report', () => {
  const report = buildReport({ rejectedFlag: '--execute' }, {
    baselineReportBuilder: () => {
      throw new Error('baseline builder should not be called');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_REJECTED_EXECUTION_FLAG');
  assert.equal(report.rejectedFlag, '--execute');
  assert.equal(report.blockerPlanAccepted, false);
  assert.equal(report.executionStarted, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
});

test('CM-0968 CLI help and rejected flag behavior', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node src\/cli\/memory-reliability-proof-baseline-blocker-plan\.js/);
  assert.match(help.stdout, /never runs search_memory/);
  assert.match(help.stdout, /commit, push/);

  const rejected = runCli(['--json', '--push']);
  assert.equal(rejected.status, 1);
  const report = JSON.parse(rejected.stdout);
  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--push');
  assert.equal(report.executionStarted, false);
});
