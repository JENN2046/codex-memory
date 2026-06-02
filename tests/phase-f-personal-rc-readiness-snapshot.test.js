'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildPhaseFPersonalRcReadinessSnapshot
} = require('../src/core/PhaseFPersonalRcReadinessSnapshot');
const {
  parseArgs,
  renderText
} = require('../src/cli/phase-f-personal-rc-readiness-snapshot');

function cleanAheadSyncPacket() {
  return {
    branch: 'main',
    currentHead: 'f68b9ffa505f12e4f3b944e30f3b26e71f3e462f',
    originHead: '546915bec01fd8ffd0fd974f59b6fc95966218a4',
    ahead: 6,
    behind: 0,
    worktreeClean: true,
    nextRequiredAction: 'obtain_explicit_normal_non_force_push_approval',
    syncBlocker: {
      status: 'push_approval_required',
      reasons: ['local_branch_ahead_remote'],
      redLaneActionRequired: true
    }
  };
}

test('Phase F personal RC snapshot blocks at F1 when sync push approval is required', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: cleanAheadSyncPacket(),
    evidence: {}
  });

  assert.equal(snapshot.status, 'PHASE_F_PERSONAL_RC_EVIDENCE_READINESS_SNAPSHOT');
  assert.equal(snapshot.decision, 'NOT_READY_BLOCKED');
  assert.equal(snapshot.operatorState, 'RC_NOT_READY_BLOCKED');
  assert.equal(snapshot.targetCurrentlyAchieved, false);
  assert.equal(snapshot.readinessClaimAllowed, false);
  assert.equal(snapshot.rcReady, false);
  assert.equal(snapshot.blockingPhase.id, 'F1');
  assert.equal(snapshot.blockingPhase.status, 'push_approval_required');
  assert.equal(snapshot.blockingPhase.blocker, 'local_branch_ahead_remote');
  assert.equal(snapshot.nextRequiredAction, 'obtain_explicit_normal_non_force_push_approval');
  assert.deepEqual(snapshot.missingPhases, ['F1', 'F2', 'F3', 'F4', 'F5']);
  assert.equal(snapshot.safetyCounters.push, 0);
  assert.equal(snapshot.safetyCounters.mcpCalls, 0);
  assert.equal(snapshot.safetyCounters.realMemoryWrites, 0);
});

test('Phase F personal RC snapshot blocks F2 until aggregation evidence exists', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: cleanAheadSyncPacket(),
    evidence: {
      f1LiveNoWriteEvidenceAccepted: true
    }
  });

  assert.equal(snapshot.blockingPhase.id, 'F2');
  assert.equal(snapshot.blockingPhase.status, 'missing_evidence');
  assert.equal(snapshot.blockingPhase.blocker, 'missing_f2_evidence');
  assert.equal(snapshot.blockingPhase.nextAction, 'obtain_exact_a5_gap6_approval_after_f1');
  assert.equal(snapshot.phases[0].status, 'complete');
  assert.deepEqual(snapshot.missingPhases, ['F2', 'F3', 'F4', 'F5']);
});

test('Phase F personal RC snapshot can represent personal dogfood ready without RC ready', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: 'f68b9ffa505f12e4f3b944e30f3b26e71f3e462f',
      originHead: 'f68b9ffa505f12e4f3b944e30f3b26e71f3e462f',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence: {
      f1LiveNoWriteEvidenceAccepted: true,
      f2A5Gap6AggregationAccepted: true,
      f3TrueLiveRecallNegativeControlAccepted: true,
      f4MinimalDogfoodWriteAccepted: true,
      f5CloseoutAccepted: true
    }
  });

  assert.equal(snapshot.decision, 'PERSONAL_DOGFOOD_READY_NOT_RC_READY');
  assert.equal(snapshot.operatorState, 'PERSONAL_DOGFOOD_READY_NOT_RC_READY');
  assert.equal(snapshot.targetCurrentlyAchieved, true);
  assert.equal(snapshot.readinessClaimAllowed, true);
  assert.equal(snapshot.rcReady, false);
  assert.equal(snapshot.blockingPhase, null);
  assert.deepEqual(snapshot.missingPhases, []);
  assert.equal(snapshot.safetyCounters.readinessClaims, 0);
  assert.equal(snapshot.safetyCounters.reliabilityClaims, 0);
});

test('Phase F personal RC snapshot CLI helpers render blocked state and reject side-effect flags', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: cleanAheadSyncPacket()
  });
  const text = renderText(snapshot);

  assert.match(text, /blockingPhase: F1/);
  assert.match(text, /readinessClaimAllowed: false/);
  assert.throws(() => parseArgs(['--push']), /unsupported side-effect flag/);
  assert.throws(() => parseArgs(['--record-memory']), /unsupported side-effect flag/);
});
