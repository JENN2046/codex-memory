'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const test = require('node:test');

const {
  buildReport
} = require('../src/cli/memory-reliability-phase-commit-review');

const cliPath = path.join('src', 'cli', 'memory-reliability-phase-commit-review.js');

function isolationReview(overrides = {}) {
  return {
    status: 'blocked',
    decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_BLOCKED_NOT_EXECUTED',
    isolationReviewAccepted: true,
    safeForLiveProof: false,
    safeForCommit: false,
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

test('CM-0939 CLI blocks current mixed phase from stage, commit, and push', () => {
  const report = buildReport({}, {
    isolationReviewBuilder: () => isolationReview(),
    gitStatusRunner: () => ({
      status: 0,
      stdout: [
        ' M .agent_board/TASK_QUEUE.md',
        ' M src/app.js',
        '?? src/cli/memory-reliability-phase-commit-review.js',
        '?? docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY.md'
      ].join('\n'),
      stderr: '',
      error: ''
    })
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_BLOCKED_NOT_EXECUTED');
  assert.equal(report.phaseCommitReviewAccepted, true);
  assert.equal(report.commitCandidateReady, false);
  assert.equal(report.safeToStage, false);
  assert.equal(report.safeToCommit, false);
  assert.equal(report.safeToPush, false);
  assert.equal(report.dirtySummary.dirtyStatusLineCount, 4);
  assert.equal(report.safety.stagesFiles, false);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
});

test('CM-0939 CLI reports incomplete when git status cannot be read', () => {
  const report = buildReport({}, {
    isolationReviewBuilder: () => isolationReview(),
    gitStatusRunner: () => ({
      status: 128,
      stdout: '',
      stderr: 'fatal: not a git repository',
      error: ''
    })
  });

  assert.equal(report.status, 'incomplete');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_INCOMPLETE_NOT_EXECUTED');
  assert.equal(report.phaseCommitReviewAccepted, false);
  assert.equal(report.checks.gitStatusOk, false);
  assert.equal(report.safeToCommit, false);
});

test('CM-0939 CLI accepts explicit candidate path review without staging it', () => {
  const report = buildReport({
    worktreeOwnership: 'verified_intended_scope',
    sharedStateHunksIsolated: true,
    proposedCommitPaths: [
      'src/core/MemoryReliabilityPhaseCommitReview.js',
      'tests/memory-reliability-phase-commit-review.test.js'
    ],
    verifiedIntendedPaths: [
      'src/core/MemoryReliabilityPhaseCommitReview.js',
      'tests/memory-reliability-phase-commit-review.test.js'
    ]
  }, {
    isolationReviewBuilder: () => isolationReview(),
    gitStatusRunner: () => ({
      status: 0,
      stdout: [
        '?? src/core/MemoryReliabilityPhaseCommitReview.js',
        '?? tests/memory-reliability-phase-commit-review.test.js'
      ].join('\n'),
      stderr: '',
      error: ''
    })
  });

  assert.equal(report.status, 'candidate_ready');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_CANDIDATE_READY_NOT_EXECUTED');
  assert.equal(report.phaseCommitReviewAccepted, true);
  assert.equal(report.commitCandidateReady, true);
  assert.equal(report.safeToStage, false);
  assert.equal(report.safeToCommit, false);
  assert.equal(report.safeToPush, false);
  assert.equal(report.proposedCommitPathCount, 2);
  assert.equal(report.verifiedIntendedPathCount, 2);
  assert.equal(report.safety.stagesFiles, false);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
});

test('CM-0941 CLI accepts scoped candidate review while leaving unrelated dirty paths unstaged', () => {
  const report = buildReport({
    commitScopeMode: 'scoped_candidate',
    worktreeOwnership: 'verified_intended_scope',
    proposedCommitPaths: [
      'src/cli/memory-reliability-phase-commit-review.js',
      'tests/memory-reliability-phase-commit-review-cli.test.js'
    ],
    verifiedIntendedPaths: [
      'src/cli/memory-reliability-phase-commit-review.js',
      'tests/memory-reliability-phase-commit-review-cli.test.js'
    ]
  }, {
    isolationReviewBuilder: () => isolationReview(),
    gitStatusRunner: () => ({
      status: 0,
      stdout: [
        ' M .agent_board/TASK_QUEUE.md',
        '?? src/cli/memory-reliability-phase-commit-review.js',
        '?? tests/memory-reliability-phase-commit-review-cli.test.js'
      ].join('\n'),
      stderr: '',
      error: ''
    })
  });

  assert.equal(report.status, 'candidate_ready');
  assert.equal(report.commitScopeMode, 'scoped_candidate');
  assert.equal(report.scopedCandidateMode, true);
  assert.equal(report.checks.scopedUnrelatedDirtyAllowed, true);
  assert.equal(report.unrelatedDirtyPaths.includes('.agent_board/TASK_QUEUE.md'), true);
  assert.equal(report.safeToStage, false);
  assert.equal(report.safeToCommit, false);
  assert.equal(report.safeToPush, false);
  assert.equal(report.safety.stagesFiles, false);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
});

test('CM-0939 CLI rejects stage, commit, and push flags before collectors', () => {
  const report = buildReport({ rejectedFlag: '--push' }, {
    isolationReviewBuilder: () => {
      throw new Error('isolation review should not run');
    },
    gitStatusRunner: () => {
      throw new Error('git status should not run');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_REJECTED_EXECUTION_FLAG');
  assert.equal(report.rejectedFlag, '--push');
  assert.equal(report.executionStarted, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
});

test('CM-0939 CLI help and rejected flag behavior', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node src\/cli\/memory-reliability-phase-commit-review\.js/);
  assert.match(help.stdout, /never stages, commits, pushes/);
  assert.match(help.stdout, /--proposed-path <path>/);
  assert.match(help.stdout, /--scoped-candidate/);

  const rejected = runCli(['--json', '--commit']);
  assert.equal(rejected.status, 1);
  const report = JSON.parse(rejected.stdout);
  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--commit');
  assert.equal(report.executionStarted, false);
});
