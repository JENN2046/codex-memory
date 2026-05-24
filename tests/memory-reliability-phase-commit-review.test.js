'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DENIED_ACTIONS,
  classifyPath,
  summarizeDirtyEntries,
  summarizeMemoryReliabilityPhaseCommitReview
} = require('../src/core/MemoryReliabilityPhaseCommitReview');

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

function packet(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'current_git_status_readonly',
    reviewOnly: true,
    commitScopeSource: 'CM-0938',
    worktreeOwnership: 'mixed_or_unverified',
    sharedStateHunksIsolated: false,
    proposedCommitPaths: [],
    verifiedIntendedPaths: [],
    deniedActions: REQUIRED_DENIED_ACTIONS,
    isolationReview: isolationReview(),
    gitStatusShort: [
      ' M .agent_board/TASK_QUEUE.md',
      ' M src/app.js',
      '?? src/cli/memory-reliability-proof-baseline-isolation-review.js',
      '?? docs/MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_CLI.md',
      '?? docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY.md'
    ].join('\n'),
    ...overrides
  };
}

test('CM-0939 classifies dirty paths for reliability phase commit review', () => {
  assert.equal(classifyPath('.agent_board/TASK_QUEUE.md'), 'sharedState');
  assert.equal(classifyPath('docs/MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_CLI.md'), 'reliabilityBaseline');
  assert.equal(classifyPath('docs/RECALL_PROOF_EXECUTION_PREFLIGHT_CLI.md'), 'reliabilityPreflight');
  assert.equal(classifyPath('src/app.js'), 'runtimeSurface');
  assert.equal(classifyPath('docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY.md'), 'other');

  const summary = summarizeDirtyEntries(packet().gitStatusShort);
  assert.equal(summary.dirtyStatusLineCount, 5);
  assert.equal(summary.sharedStateCount, 1);
  assert.equal(summary.reliabilityBaselineCount, 2);
  assert.equal(summary.runtimeSurfaceCount, 1);
  assert.equal(summary.otherCount, 1);
});

test('CM-0939 blocks current mixed dirty worktree from stage, commit, and push', () => {
  const report = summarizeMemoryReliabilityPhaseCommitReview(packet());

  assert.equal(report.phaseCommitReviewAccepted, true);
  assert.equal(report.commitCandidateReady, false);
  assert.equal(report.safeToStage, false);
  assert.equal(report.safeToCommit, false);
  assert.equal(report.safeToPush, false);
  assert.equal(report.blockers.includes('worktree_ownership_not_verified'), true);
  assert.equal(report.blockers.includes('shared_state_hunks_not_isolated'), true);
  assert.equal(report.blockers.includes('proposed_commit_does_not_cover_dirty_paths'), true);
  assert.equal(report.blockers.includes('proposed_paths_not_all_verified'), true);
  assert.equal(report.safety.stagesFiles, false);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
});

test('CM-0939 can recognize a future exact verified candidate without staging it', () => {
  const gitStatusShort = [
    '?? src/core/MemoryReliabilityPhaseCommitReview.js',
    '?? tests/memory-reliability-phase-commit-review.test.js'
  ].join('\n');
  const proposed = [
    'src/core/MemoryReliabilityPhaseCommitReview.js',
    'tests/memory-reliability-phase-commit-review.test.js'
  ];
  const report = summarizeMemoryReliabilityPhaseCommitReview(packet({
    worktreeOwnership: 'verified_intended_scope',
    sharedStateHunksIsolated: true,
    proposedCommitPaths: proposed,
    verifiedIntendedPaths: proposed,
    gitStatusShort
  }));

  assert.equal(report.commitCandidateReady, true);
  assert.equal(report.phaseCommitReviewAccepted, false);
  assert.equal(report.safeToStage, false);
  assert.equal(report.safeToCommit, false);
  assert.equal(report.safeToPush, false);
  assert.deepEqual(report.blockers, []);
});

test('CM-0941 can recognize a scoped verified candidate with unrelated dirty paths', () => {
  const gitStatusShort = [
    ' M .agent_board/TASK_QUEUE.md',
    '?? src/core/MemoryReliabilityPhaseCommitReview.js',
    '?? tests/memory-reliability-phase-commit-review.test.js',
    '?? docs/MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY.md'
  ].join('\n');
  const proposed = [
    'src/core/MemoryReliabilityPhaseCommitReview.js',
    'tests/memory-reliability-phase-commit-review.test.js'
  ];
  const report = summarizeMemoryReliabilityPhaseCommitReview(packet({
    commitScopeMode: 'scoped_candidate',
    worktreeOwnership: 'verified_intended_scope',
    proposedCommitPaths: proposed,
    verifiedIntendedPaths: proposed,
    gitStatusShort
  }));

  assert.equal(report.commitCandidateReady, true);
  assert.equal(report.scopedCandidateMode, true);
  assert.equal(report.checks.scopedUnrelatedDirtyAllowed, true);
  assert.equal(report.unrelatedDirtyPaths.includes('.agent_board/TASK_QUEUE.md'), true);
  assert.equal(report.blockers.includes('unrelated_dirty_paths_present'), false);
  assert.equal(report.safeToStage, false);
  assert.equal(report.safeToCommit, false);
  assert.equal(report.safeToPush, false);
});

test('CM-0941 rejects scoped candidates that are not dirty or not verified', () => {
  const report = summarizeMemoryReliabilityPhaseCommitReview(packet({
    commitScopeMode: 'scoped_candidate',
    worktreeOwnership: 'verified_intended_scope',
    proposedCommitPaths: ['src/core/MemoryReliabilityPhaseCommitReview.js'],
    verifiedIntendedPaths: [],
    gitStatusShort: '?? tests/memory-reliability-phase-commit-review.test.js'
  }));

  assert.equal(report.commitCandidateReady, false);
  assert.equal(report.blockers.includes('proposed_paths_not_dirty'), true);
  assert.equal(report.blockers.includes('proposed_paths_not_all_verified'), true);
});

test('CM-0939 rejects isolation review drift and overclaim', () => {
  const report = summarizeMemoryReliabilityPhaseCommitReview(packet({
    isolationReview: isolationReview({
      safeForCommit: true,
      executionStarted: true,
      callsSearchMemory: true,
      memoryWriteReliableClaimed: true
    })
  }));

  assert.equal(report.commitCandidateReady, false);
  assert.equal(report.phaseCommitReviewAccepted, true);
  assert.equal(report.checks.isolationSafe, false);
  assert.equal(report.checks.noExecution, false);
  assert.equal(report.checks.noClaims, false);
  assert.equal(report.blockers.includes('cm0938_isolation_review_missing_or_incomplete'), true);
});

test('CM-0939 rejects missing denied actions', () => {
  const report = summarizeMemoryReliabilityPhaseCommitReview(packet({
    deniedActions: REQUIRED_DENIED_ACTIONS.filter(action => action !== 'push')
  }));

  assert.equal(report.commitCandidateReady, false);
  assert.equal(report.deniedActions.exact, false);
  assert.deepEqual(report.deniedActions.missing, ['push']);
});
