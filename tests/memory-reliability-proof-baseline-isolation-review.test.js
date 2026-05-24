'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DENIED_ACTIONS,
  classifyGitStatusShort,
  parseGitStatusShort,
  summarizeMemoryReliabilityProofBaselineIsolationReview
} = require('../src/core/MemoryReliabilityProofBaselineIsolationReview');

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

function packet(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'current_git_status_readonly',
    reviewOnly: true,
    blockerPlanSource: 'CM-0968',
    worktreeOwnership: 'mixed_or_unverified',
    commitScopeIsolated: false,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    deniedActions: REQUIRED_DENIED_ACTIONS,
    blockerPlanReport: blockerPlanReport(),
    gitStatusShort: [
      ' M .agent_board/TASK_QUEUE.md',
      ' M src/app.js',
      '?? src/cli/memory-reliability-proof-baseline-isolation-review.js',
      '?? docs/MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_CLI.md',
      '?? notes/local-scratch.md'
    ].join('\n'),
    ...overrides
  };
}

test('CM-0969 parses and classifies git status without mutating state', () => {
  const entries = parseGitStatusShort(' M src/app.js\n?? tests/example.test.js\nR  old.js -> new.js\n');
  assert.deepEqual(entries, [
    { raw: ' M src/app.js', status: 'M', path: 'src/app.js' },
    { raw: '?? tests/example.test.js', status: '??', path: 'tests/example.test.js' },
    { raw: 'R  old.js -> new.js', status: 'R', path: 'new.js' }
  ]);

  const summary = classifyGitStatusShort(packet().gitStatusShort);
  assert.equal(summary.dirtyStatusLineCount, 5);
  assert.equal(summary.trackedModifiedCount, 2);
  assert.equal(summary.untrackedCount, 3);
  assert.equal(summary.sharedStateCount, 1);
  assert.equal(summary.runtimeSurfaceCount, 2);
  assert.equal(summary.reliabilityBaselineCount, 2);
  assert.equal(summary.otherCount, 1);
});

test('CM-0969 accepts mixed dirty baseline as blocked for live proof and unscoped local commit', () => {
  const report = summarizeMemoryReliabilityProofBaselineIsolationReview(packet());

  assert.equal(report.isolationReviewAccepted, true);
  assert.equal(report.safeForLiveProof, false);
  assert.equal(report.safeForCommit, false);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.dirtyBaselineBlocked, true);
  assert.equal(report.unscopedCommitBlocked, true);
  assert.equal(report.dirtySummary.sharedStatePaths.includes('.agent_board/TASK_QUEUE.md'), true);
  assert.equal(report.dirtySummary.otherPaths.includes('agent_board/TASK_QUEUE.md'), false);
  assert.equal(report.deniedActions.exact, true);
  assert.equal(report.deniedActions.present.includes('commit'), true);
  assert.equal(report.checks.noExecution, true);
  assert.equal(report.checks.noClaims, true);
  assert.equal(report.safety.readsGitStatusOnly, true);
  assert.equal(report.safety.commits, false);
  assert.equal(report.safety.pushes, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.claimsReadiness, false);
});

test('CM-0969 rejects clean or isolated-looking status as insufficient blocker evidence', () => {
  const report = summarizeMemoryReliabilityProofBaselineIsolationReview(packet({
    gitStatusShort: '',
    worktreeOwnership: 'verified_intended_scope',
    commitScopeIsolated: true
  }));

  assert.equal(report.isolationReviewAccepted, false);
  assert.equal(report.safeForLiveProof, false);
  assert.equal(report.safeForCommit, false);
  assert.equal(report.checks.dirtyBaselinePresent, false);
  assert.equal(report.checks.ownershipSafe, false);
  assert.equal(report.checks.commitScopeBlocked, false);
});

test('CM-0969 rejects execution drift and reliability overclaim', () => {
  const report = summarizeMemoryReliabilityProofBaselineIsolationReview(packet({
    liveProofAuthorized: true,
    readinessClaimed: true,
    reliabilityClaimed: true,
    blockerPlanReport: blockerPlanReport({
      executionStarted: true,
      liveProofStarted: true,
      callsSearchMemory: true,
      memoryRecallReliableClaimed: true
    })
  }));

  assert.equal(report.isolationReviewAccepted, false);
  assert.equal(report.safeForLiveProof, false);
  assert.equal(report.safeForCommit, false);
  assert.equal(report.checks.noExecution, false);
  assert.equal(report.checks.noClaims, false);
});

test('CM-0969 rejects missing commit denial', () => {
  const report = summarizeMemoryReliabilityProofBaselineIsolationReview(packet({
    deniedActions: REQUIRED_DENIED_ACTIONS.filter(action => action !== 'commit')
  }));

  assert.equal(report.isolationReviewAccepted, false);
  assert.deepEqual(report.deniedActions.missing, ['commit']);
});
