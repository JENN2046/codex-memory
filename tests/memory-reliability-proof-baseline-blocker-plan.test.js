'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DENIED_ACTIONS,
  REQUIRED_NEXT_ACTIONS,
  summarizeMemoryReliabilityProofBaselineBlockerPlan
} = require('../src/core/MemoryReliabilityProofBaselineBlockerPlan');

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
    dirtyStatusLineCount: 210,
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

function packet(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    baselineReportSource: 'CM-0967',
    worktreeOwnership: 'mixed_or_unverified',
    commitScopeIsolated: false,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    deniedActions: REQUIRED_DENIED_ACTIONS,
    requiredNextActions: REQUIRED_NEXT_ACTIONS,
    baselineReport: baselineReport(),
    ...overrides
  };
}

test('CM-0968 accepts the current dirty baseline blocker plan without authorizing live proof', () => {
  const report = summarizeMemoryReliabilityProofBaselineBlockerPlan(packet());

  assert.equal(report.blockerPlanAccepted, true);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.liveProofAuthorized, false);
  assert.equal(report.dirtyBaselineBlocked, true);
  assert.equal(report.unscopedCommitBlocked, true);
  assert.deepEqual(report.blockerIds, { recall: 'CMB-0013', write: 'CMB-0014' });
  assert.equal(report.requiredNextActions.exact, true);
  assert.equal(report.deniedActions.exact, true);
  assert.equal(report.safety.executesCommands, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
});

test('CM-0968 rejects non-dirty or proof-ready baseline reports', () => {
  const report = summarizeMemoryReliabilityProofBaselineBlockerPlan(packet({
    baselineReport: baselineReport({
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
  }));

  assert.equal(report.blockerPlanAccepted, false);
  assert.equal(report.dirtyBaselineBlocked, false);
  assert.equal(report.baselineReadyForLiveProof, false);
});

test('CM-0968 rejects execution drift and reliability overclaim', () => {
  const report = summarizeMemoryReliabilityProofBaselineBlockerPlan(packet({
    liveProofAuthorized: true,
    readinessClaimed: true,
    reliabilityClaimed: true,
    baselineReport: baselineReport({
      executionStarted: true,
      liveProofStarted: true,
      memoryRecallReliableClaimed: true,
      laneReports: [
        laneReport('recall', { noExecution: false, blockedByExecutionDrift: true }),
        laneReport('write')
      ]
    })
  }));

  assert.equal(report.blockerPlanAccepted, false);
  assert.equal(report.liveProofAuthorized, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.checks.noExecution, false);
  assert.equal(report.checks.noClaims, false);
});

test('CM-0968 rejects missing denied actions and missing next actions', () => {
  const report = summarizeMemoryReliabilityProofBaselineBlockerPlan(packet({
    deniedActions: REQUIRED_DENIED_ACTIONS.filter(action => action !== 'providerCall'),
    requiredNextActions: REQUIRED_NEXT_ACTIONS.filter(action => action !== 'rerun_memory_reliability_baseline_cli')
  }));

  assert.equal(report.blockerPlanAccepted, false);
  assert.deepEqual(report.deniedActions.missing, ['providerCall']);
  assert.deepEqual(report.requiredNextActions.missing, ['rerun_memory_reliability_baseline_cli']);
});

test('CM-0968 rejects unverified ownership drift being marked isolated', () => {
  const report = summarizeMemoryReliabilityProofBaselineBlockerPlan(packet({
    worktreeOwnership: 'verified_intended_scope',
    commitScopeIsolated: true
  }));

  assert.equal(report.blockerPlanAccepted, false);
  assert.equal(report.unscopedCommitBlocked, false);
  assert.equal(report.checks.ownershipSafe, false);
  assert.equal(report.nextStep, 'Treat blocker resolution evidence as incomplete; keep live proof and reliability/readiness claims blocked.');
});
