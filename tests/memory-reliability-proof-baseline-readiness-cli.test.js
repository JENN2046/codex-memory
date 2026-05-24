'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const test = require('node:test');

const {
  buildReport
} = require('../src/cli/memory-reliability-proof-baseline-readiness');
const {
  REQUIRED_DECISIONS
} = require('../src/core/MemoryReliabilityProofBaselineReadinessPolicy');

const cliPath = path.join('src', 'cli', 'memory-reliability-proof-baseline-readiness.js');
const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function cleanGitFacts(overrides = {}) {
  return {
    branch: 'main',
    localHead: CURRENT_HEAD,
    originHead: CURRENT_HEAD,
    remoteMainHead: CURRENT_HEAD,
    dirtyStatusLineCount: 0,
    ...overrides
  };
}

function safety(overrides = {}) {
  return {
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readsRawMemory: false,
    readsJsonl: false,
    writesDurableMemory: false,
    writesDurableAudit: false,
    expandsPublicMcp: false,
    changesConfigWatchdogStartup: false,
    claimsRecallReliable: false,
    claimsWriteReliable: false,
    claimsReadiness: false,
    ...overrides
  };
}

function laneReport(lane, overrides = {}) {
  const accepted = overrides.acceptedForExecutionPreflight ?? true;
  return {
    status: accepted ? 'ok' : 'blocked',
    decision: accepted
      ? REQUIRED_DECISIONS[lane]
      : `${lane.toUpperCase()}_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED`,
    source: 'current_git_facts_readonly',
    basisId: lane === 'recall' ? 'CM-0814' : 'CM-0737',
    acceptedForExecutionPreflight: accepted,
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    blockerReasons: [],
    gitFactErrors: [],
    cleanSyncedMainHead: true,
    normalizedGitFacts: cleanGitFacts(),
    collectorSafety: safety(),
    helperSafety: safety(),
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

test('CM-0935 combines clean recall and write current-facts reports without executing live proof', () => {
  const report = buildReport({}, {
    recallReportBuilder: () => laneReport('recall'),
    writeReportBuilder: () => laneReport('write')
  });

  assert.equal(report.status, 'ok');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_READY_NOT_EXECUTED');
  assert.equal(report.baselineReadinessReviewAccepted, true);
  assert.equal(report.baselineReadyForLiveProof, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.liveProofStarted, false);
  assert.equal(report.recordMemoryStarted, false);
  assert.equal(report.safety.executesReadOnlyGitCommands, true);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsProvider, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
  assert.ok(report.laneReports.every(item => item.readyForSeparateLiveProof));
});

test('CM-0935 blocks the combined baseline when both lanes report dirty current facts', () => {
  const dirtyFacts = cleanGitFacts({ dirtyStatusLineCount: 11 });
  const report = buildReport({}, {
    recallReportBuilder: () => laneReport('recall', {
      acceptedForExecutionPreflight: false,
      decision: 'RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED',
      blockerReasons: ['dirty_worktree'],
      cleanSyncedMainHead: false,
      normalizedGitFacts: dirtyFacts
    }),
    writeReportBuilder: () => laneReport('write', {
      acceptedForExecutionPreflight: false,
      decision: 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED',
      blockerReasons: ['dirty_worktree'],
      cleanSyncedMainHead: false,
      normalizedGitFacts: dirtyFacts
    })
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKED_NOT_EXECUTED');
  assert.equal(report.baselineReadinessReviewAccepted, true);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.dirtyBaselineBlocked, true);
  assert.deepEqual(report.blockerIds, { recall: 'CMB-0013', write: 'CMB-0014' });
  assert.ok(report.laneReports.every(item => item.blockedByDirtyBaseline));
});

test('CM-0935 rejects execution flags before invoking lane collectors', () => {
  const report = buildReport({ rejectedFlag: '--live-proof' }, {
    recallReportBuilder: () => {
      throw new Error('recall collector should not be called');
    },
    writeReportBuilder: () => {
      throw new Error('write collector should not be called');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'MEMORY_RELIABILITY_PROOF_BASELINE_READINESS_REJECTED_EXECUTION_FLAG');
  assert.equal(report.rejectedFlag, '--live-proof');
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.executionStarted, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsProvider, false);
  assert.equal(report.readinessClaimAllowed, false);
});

test('CM-0935 blocks safety drift from either lane', () => {
  const report = buildReport({}, {
    recallReportBuilder: () => laneReport('recall', {
      collectorSafety: safety({ callsSearchMemory: true }),
      liveProofStarted: true
    }),
    writeReportBuilder: () => laneReport('write', {
      helperSafety: safety({ callsRecordMemory: true }),
      recordMemoryStarted: true
    })
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.laneReports[0].blockedBySafetyDrift, true);
  assert.equal(report.laneReports[0].blockedByExecutionDrift, true);
  assert.equal(report.laneReports[1].blockedBySafetyDrift, true);
  assert.equal(report.laneReports[1].blockedByExecutionDrift, true);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
});

test('CM-0935 CLI help and rejected flag behavior', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node src\/cli\/memory-reliability-proof-baseline-readiness\.js/);
  assert.match(help.stdout, /never runs search_memory/);
  assert.match(help.stdout, /record_memory/);

  const rejected = runCli(['--json', '--record-memory']);
  assert.equal(rejected.status, 1);
  const report = JSON.parse(rejected.stdout);
  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--record-memory');
  assert.equal(report.executionStarted, false);
});
