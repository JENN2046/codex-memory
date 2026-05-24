'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DECISIONS,
  summarizeMemoryReliabilityProofBaselineReadinessPolicy
} = require('../src/core/MemoryReliabilityProofBaselineReadinessPolicy');

const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function cleanGitFacts() {
  return {
    branch: 'main',
    localHead: CURRENT_HEAD,
    originHead: CURRENT_HEAD,
    remoteMainHead: CURRENT_HEAD,
    dirtyStatusLineCount: 0
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

function packet(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    currentFactsOnly: true,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    deniedActions: DENIED_ACTIONS,
    reports: {
      recall: laneReport('recall'),
      write: laneReport('write')
    },
    ...overrides
  };
}

test('CM-0934 accepts clean recall and write current-facts preflights without authorizing live proof', () => {
  const report = summarizeMemoryReliabilityProofBaselineReadinessPolicy(packet());

  assert.equal(report.baselineReadinessReviewAccepted, true);
  assert.equal(report.baselineReadyForLiveProof, true);
  assert.equal(report.liveProofAuthorized, false);
  assert.equal(report.executionStarted, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
  assert.equal(report.dirtyBaselineBlocked, false);
  assert.equal(report.deniedActions.exact, true);
  assert.ok(report.lanes.reports.every(item => item.readyForSeparateLiveProof));
  assert.equal(report.safety.executesCommands, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
});

test('CM-0934 blocks both lanes on dirty worktree current facts', () => {
  const dirtyFacts = {
    ...cleanGitFacts(),
    dirtyStatusLineCount: 7
  };
  const report = summarizeMemoryReliabilityProofBaselineReadinessPolicy(packet({
    reports: {
      recall: laneReport('recall', {
        acceptedForExecutionPreflight: false,
        decision: 'RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED',
        blockerReasons: ['dirty_worktree'],
        cleanSyncedMainHead: false,
        normalizedGitFacts: dirtyFacts
      }),
      write: laneReport('write', {
        acceptedForExecutionPreflight: false,
        decision: 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED',
        blockerReasons: ['dirty_worktree'],
        cleanSyncedMainHead: false,
        normalizedGitFacts: dirtyFacts
      })
    }
  }));

  assert.equal(report.baselineReadinessReviewAccepted, true);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.dirtyBaselineBlocked, true);
  assert.deepEqual(
    report.lanes.reports.map(item => item.blockerId),
    ['CMB-0013', 'CMB-0014']
  );
  assert.ok(report.lanes.reports.every(item => item.blockedByDirtyBaseline));
});

test('CM-0934 rejects safety drift from accidental live proof or tool calls', () => {
  const report = summarizeMemoryReliabilityProofBaselineReadinessPolicy(packet({
    reports: {
      recall: laneReport('recall', {
        liveProofStarted: true,
        collectorSafety: safety({ callsSearchMemory: true })
      }),
      write: laneReport('write', {
        recordMemoryStarted: true,
        helperSafety: safety({ callsRecordMemory: true })
      })
    }
  }));

  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.lanes.reports[0].blockedByExecutionDrift, true);
  assert.equal(report.lanes.reports[0].blockedBySafetyDrift, true);
  assert.equal(report.lanes.reports[1].blockedByExecutionDrift, true);
  assert.equal(report.lanes.reports[1].blockedBySafetyDrift, true);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
});

test('CM-0934 rejects readiness and reliability overclaim', () => {
  const report = summarizeMemoryReliabilityProofBaselineReadinessPolicy(packet({
    liveProofAuthorized: true,
    readinessClaimed: true,
    reliabilityClaimed: true,
    reports: {
      recall: laneReport('recall', {
        readinessClaimAllowed: true,
        memoryRecallReliableClaimed: true,
        helperSafety: safety({ claimsRecallReliable: true, claimsReadiness: true })
      }),
      write: laneReport('write', {
        memoryWriteReliableClaimed: true,
        helperSafety: safety({ claimsWriteReliable: true })
      })
    }
  }));

  assert.equal(report.baselineReadinessReviewAccepted, false);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.equal(report.liveProofAuthorized, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
  assert.ok(report.lanes.reports.every(item => item.blockedBySafetyDrift));
});

test('CM-0934 rejects denied action drift and lane decision mismatch', () => {
  const report = summarizeMemoryReliabilityProofBaselineReadinessPolicy(packet({
    deniedActions: DENIED_ACTIONS.filter(action => action !== 'providerCall'),
    reports: {
      recall: laneReport('recall', { decision: 'RECALL_READY' }),
      write: laneReport('write')
    }
  }));

  assert.equal(report.baselineReadinessReviewAccepted, false);
  assert.equal(report.baselineReadyForLiveProof, false);
  assert.deepEqual(report.deniedActions.missing, ['providerCall']);
  assert.equal(report.lanes.reports[0].decisionAccepted, false);
  assert.equal(
    report.lanes.reports[0].expectedDecision,
    'RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED'
  );
});

test('CM-0934 redacts sensitive explicit input', () => {
  const report = summarizeMemoryReliabilityProofBaselineReadinessPolicy(packet({
    reports: {
      recall: laneReport('recall', {
        basisId: 'authorization: Bearer BASELINE_RECALL_TOKEN_1234567890',
        blockerReasons: ['api_key=BASELINE_RECALL_API_KEY_1234567890']
      }),
      write: laneReport('write', {
        basisId: 'C:\\secret\\.env',
        blockerReasons: ['password=BASELINE_WRITE_PASSWORD_1234567890']
      })
    }
  }));
  const text = JSON.stringify(report).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'password',
    'baseline_recall_token_1234567890',
    'baseline_recall_api_key_1234567890',
    'baseline_write_password_1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(text.includes(forbidden), false);
  }
});
