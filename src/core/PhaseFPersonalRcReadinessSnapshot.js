'use strict';

const {
  buildHeadBoundApprovalLine
} = require('./RecallProofExecutionPreflight');

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

function buildF2A5Gap6ApprovalTemplate({ currentHead = '', branch = 'main' } = {}) {
  const normalizedHead = normalizeString(currentHead);
  const normalizedBranch = normalizeString(branch) || 'main';
  if (!normalizedHead) return '';
  return [
    `I approve A5-GAP-6 for codex-memory on branch ${normalizedBranch} at commit ${normalizedHead},`,
    'using only evidence from approved A5-GAP units A5-GAP-1, A5-GAP-2, A5-GAP-3, A5-GAP-4, A5-GAP-5,',
    'including CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md, no new runtime action.'
  ].join(' ');
}

function buildF3TrueLiveRecallApprovalTemplate({ currentHead = '' } = {}) {
  const normalizedHead = normalizeString(currentHead);
  if (!normalizedHead) return '';
  return buildHeadBoundApprovalLine(normalizedHead);
}

function buildF4MinimalDogfoodWriteApprovalTemplate({ currentHead = '', branch = 'main' } = {}) {
  const normalizedHead = normalizeString(currentHead);
  const normalizedBranch = normalizeString(branch) || 'main';
  if (!normalizedHead) return '';
  return [
    `I approve MEMORY_WRITE_MINIMAL_PERSONAL_DOGFOOD_EXECUTION_ONCE for codex-memory on branch ${normalizedBranch} at commit ${normalizedHead},`,
    'limited to exactly one sanitized record_memory call against the current local codex-memory real store for Phase F4 personal dogfood proof,',
    'using current-session bearer token if already present, without printing or persisting token material,',
    'allow only the durable memory/audit write required for that single sanitized dogfood record,',
    'with no provider call, no search_memory call, no raw memory output, no direct .jsonl read, no broad real memory scan,',
    'no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion,',
    'no package/lockfile change, no tag/release/deploy/cutover, and no readiness or reliability claim.'
  ].join(' ');
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
  const currentHead = normalizeString(syncPacket.currentHead);
  const originHead = normalizeString(syncPacket.originHead);
  const worktreeClean = syncPacket.worktreeClean === true;
  const ahead = Number(syncPacket.ahead || 0);
  const behind = Number(syncPacket.behind || 0);
  const cleanSyncedHead = worktreeClean && ahead === 0 && behind === 0 && currentHead === originHead;

  return {
    status: 'PHASE_F_PERSONAL_RC_EVIDENCE_READINESS_SNAPSHOT',
    decision: allEvidenceAccepted ? 'PERSONAL_DOGFOOD_READY_NOT_RC_READY' : 'NOT_READY_BLOCKED',
    operatorState: allEvidenceAccepted ? 'PERSONAL_DOGFOOD_READY_NOT_RC_READY' : 'RC_NOT_READY_BLOCKED',
    target: 'PERSONAL_DOGFOOD_READY_NOT_RC_READY',
    targetCurrentlyAchieved: allEvidenceAccepted,
    localEvidenceComplete: allEvidenceAccepted,
    cleanSyncedHead,
    readinessClaimAllowed: allEvidenceAccepted && cleanSyncedHead,
    rcReady: false,
    branch: normalizeString(syncPacket.branch) || 'main',
    currentHead,
    originHead,
    worktreeClean,
    ahead,
    behind,
    phases,
    missingPhases,
    blockingPhase,
    nextRequiredAction: blockingPhase ? blockingPhase.nextAction : 'none',
    approvalTemplates: {
      pushApprovalTemplate: normalizeString(syncPacket.approvalTemplate),
      postPushA5Gap4ApprovalTemplate: normalizeString(syncPacket.postPushA5Gap4ApprovalTemplate),
      postPushA5Gap4TemplateCurrentlyUsable: syncPacket.postPushA5Gap4TemplateCurrentlyUsable === true,
      postPushA5UsabilityStatus: normalizeString(syncPacket.postPushA5UsabilityStatus),
      f2A5Gap6ApprovalTemplate: buildF2A5Gap6ApprovalTemplate({
        currentHead: syncPacket.currentHead,
        branch: syncPacket.branch
      }),
      f2A5Gap6TemplateCurrentlyUsable: phaseComplete(evidence, 'F1') && !phaseComplete(evidence, 'F2'),
      f3TrueLiveRecallApprovalTemplate: buildF3TrueLiveRecallApprovalTemplate({
        currentHead: syncPacket.currentHead
      }),
      f3TrueLiveRecallTemplateCurrentlyUsable:
        phaseComplete(evidence, 'F1') &&
        phaseComplete(evidence, 'F2') &&
        !phaseComplete(evidence, 'F3') &&
        cleanSyncedHead,
      f4MinimalDogfoodWriteApprovalTemplate: buildF4MinimalDogfoodWriteApprovalTemplate({
        currentHead: syncPacket.currentHead,
        branch: syncPacket.branch
      }),
      f4MinimalDogfoodWriteTemplateCurrentlyUsable:
        phaseComplete(evidence, 'F1') &&
        phaseComplete(evidence, 'F2') &&
        phaseComplete(evidence, 'F3') &&
        !phaseComplete(evidence, 'F4') &&
        cleanSyncedHead
    },
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
  buildF2A5Gap6ApprovalTemplate,
  buildF3TrueLiveRecallApprovalTemplate,
  buildF4MinimalDogfoodWriteApprovalTemplate,
  buildPhaseFPersonalRcReadinessSnapshot
};
