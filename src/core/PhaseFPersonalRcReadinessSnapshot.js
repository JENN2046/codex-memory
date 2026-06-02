'use strict';

const PHASES = [
  ['F1', 'live_client_no_write_contract_refresh'],
  ['F2', 'a5_gap6_aggregation_refresh'],
  ['F3', 'true_live_recall_negative_control_proof'],
  ['F4', 'minimal_personal_dogfood_write_preflight'],
  ['F5', 'personal_rc_closeout']
];

function normalizeBoolean(value) {
  return value === true;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function buildMissingPrereqBlocker(ids) {
  return `missing_${ids.map(id => id.toLowerCase()).join('_')}_evidence`;
}

function buildMissingOwnEvidenceBlocker(id) {
  return `missing_${id.toLowerCase()}_evidence`;
}

function buildOwnEvidenceNextAction(id) {
  if (id === 'F2') return 'obtain_exact_a5_gap6_approval_after_f1';
  if (id === 'F3') return 'obtain_exact_true_live_recall_approval_after_f2';
  if (id === 'F4') return 'obtain_exact_minimal_dogfood_write_approval_after_f3';
  if (id === 'F5') return 'execute_closeout_after_f4';
  return `complete_${id.toLowerCase()}_evidence`;
}

function phaseComplete(evidence, id) {
  if (id === 'F1') return normalizeBoolean(evidence.f1LiveNoWriteEvidenceAccepted);
  if (id === 'F2') return normalizeBoolean(evidence.f2A5Gap6AggregationAccepted);
  if (id === 'F3') return normalizeBoolean(evidence.f3TrueLiveRecallNegativeControlAccepted);
  if (id === 'F4') return normalizeBoolean(evidence.f4MinimalDogfoodWriteAccepted);
  if (id === 'F5') return normalizeBoolean(evidence.f5CloseoutAccepted);
  return false;
}

function buildPhaseStatus({ id, requirement, evidence, completedPrereqs, syncPacket }) {
  const complete = phaseComplete(evidence, id);
  if (complete) {
    return {
      id,
      requirement,
      status: 'complete',
      blocker: null,
      nextAction: 'none',
      evidenceAccepted: true
    };
  }

  if (id === 'F1') {
    const syncBlocker = syncPacket && syncPacket.syncBlocker ? syncPacket.syncBlocker : {};
    return {
      id,
      requirement,
      status: syncBlocker.status || 'blocked',
      blocker: syncBlocker.reasons && syncBlocker.reasons.length
        ? syncBlocker.reasons[0]
        : 'f1_live_no_write_evidence_missing',
      nextAction: syncPacket && syncPacket.nextRequiredAction
        ? syncPacket.nextRequiredAction
        : 'obtain_exact_f1_authorization',
      evidenceAccepted: false,
      redLaneActionRequired: syncBlocker.redLaneActionRequired === true
    };
  }

  const missingPrereqs = completedPrereqs.filter(prereq => !phaseComplete(evidence, prereq));
  if (missingPrereqs.length === 0) {
    return {
      id,
      requirement,
      status: 'missing_evidence',
      blocker: buildMissingOwnEvidenceBlocker(id),
      nextAction: buildOwnEvidenceNextAction(id),
      evidenceAccepted: false,
      redLaneActionRequired: true
    };
  }

  return {
    id,
    requirement,
    status: 'blocked_by_prerequisite',
    blocker: buildMissingPrereqBlocker(missingPrereqs),
    nextAction: `complete_${missingPrereqs[0].toLowerCase()}_first`,
    evidenceAccepted: false,
    redLaneActionRequired: true
  };
}

function buildPhaseFPersonalRcReadinessSnapshot(input = {}) {
  const evidence = input.evidence && typeof input.evidence === 'object' ? input.evidence : {};
  const syncPacket = input.syncPacket && typeof input.syncPacket === 'object' ? input.syncPacket : {};
  const phases = [];
  const completedPrereqs = [];

  for (const [id, requirement] of PHASES) {
    const phase = buildPhaseStatus({
      id,
      requirement,
      evidence,
      completedPrereqs,
      syncPacket
    });
    phases.push(phase);
    completedPrereqs.push(id);
  }

  const missingPhases = phases.filter(phase => phase.status !== 'complete').map(phase => phase.id);
  const blockingPhase = phases.find(phase => phase.status !== 'complete') || null;
  const allEvidenceAccepted = missingPhases.length === 0;

  return {
    status: 'PHASE_F_PERSONAL_RC_EVIDENCE_READINESS_SNAPSHOT',
    decision: allEvidenceAccepted ? 'PERSONAL_DOGFOOD_READY_NOT_RC_READY' : 'NOT_READY_BLOCKED',
    operatorState: allEvidenceAccepted ? 'PERSONAL_DOGFOOD_READY_NOT_RC_READY' : 'RC_NOT_READY_BLOCKED',
    target: 'PERSONAL_DOGFOOD_READY_NOT_RC_READY',
    targetCurrentlyAchieved: allEvidenceAccepted,
    readinessClaimAllowed: allEvidenceAccepted,
    rcReady: false,
    branch: normalizeString(syncPacket.branch) || 'main',
    currentHead: normalizeString(syncPacket.currentHead),
    originHead: normalizeString(syncPacket.originHead),
    worktreeClean: syncPacket.worktreeClean === true,
    ahead: Number(syncPacket.ahead || 0),
    behind: Number(syncPacket.behind || 0),
    phases,
    missingPhases,
    blockingPhase,
    nextRequiredAction: blockingPhase ? blockingPhase.nextAction : 'none',
    completionCriteria: {
      f1LiveNoWriteEvidenceAccepted: normalizeBoolean(evidence.f1LiveNoWriteEvidenceAccepted),
      f2A5Gap6AggregationAccepted: normalizeBoolean(evidence.f2A5Gap6AggregationAccepted),
      f3TrueLiveRecallNegativeControlAccepted: normalizeBoolean(evidence.f3TrueLiveRecallNegativeControlAccepted),
      f4MinimalDogfoodWriteAccepted: normalizeBoolean(evidence.f4MinimalDogfoodWriteAccepted),
      f5CloseoutAccepted: normalizeBoolean(evidence.f5CloseoutAccepted)
    },
    safetyCounters: {
      push: 0,
      pull: 0,
      merge: 0,
      rebase: 0,
      providerCalls: 0,
      mcpCalls: 0,
      realMemoryReads: 0,
      realMemoryWrites: 0,
      durableMemoryWrites: 0,
      durableAuditWrites: 0,
      configWatchdogStartupChanges: 0,
      readinessClaims: 0,
      reliabilityClaims: 0
    }
  };
}

module.exports = {
  buildPhaseFPersonalRcReadinessSnapshot
};
