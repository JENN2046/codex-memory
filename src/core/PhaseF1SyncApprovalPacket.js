'use strict';

const DEFAULT_WORKSPACE = 'A:\\codex-memory';
const DEFAULT_BRANCH = 'main';
const DEFAULT_REMOTE_REF = 'origin/main';

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function shortHash(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.slice(0, 7) : '';
}

function buildApprovalTemplate({ workspace, branch, currentHead }) {
  const targetHead = normalizeString(currentHead);
  return [
    `I approve pushing local ${branch} commits through ${targetHead} to origin/${branch} for codex-memory from ${workspace},`,
    'using a normal non-force push to origin main only,',
    'with no tags, no PR, no deploy, no release, no merge, no rebase,',
    'no config/watchdog/startup change, no provider call, no MCP call, no real memory read/write,',
    'and no readiness or reliability claim.'
  ].join(' ');
}

function buildPhaseF1SyncApprovalPacket(input = {}) {
  const workspace = normalizeString(input.workspace) || DEFAULT_WORKSPACE;
  const branch = normalizeString(input.branch) || DEFAULT_BRANCH;
  const remoteRef = normalizeString(input.remoteRef) || DEFAULT_REMOTE_REF;
  const currentHead = normalizeString(input.currentHead);
  const originHead = normalizeString(input.originHead);
  const ahead = normalizeCount(input.ahead);
  const behind = normalizeCount(input.behind);
  const worktreeClean = input.worktreeClean === true;
  const commits = Array.isArray(input.commits) ? input.commits.map(normalizeString).filter(Boolean) : [];

  const failClosedReasons = [];
  if (!currentHead) failClosedReasons.push('missing_current_head');
  if (!originHead) failClosedReasons.push('missing_origin_head');
  if (behind > 0) failClosedReasons.push('remote_has_unmerged_commits');
  if (!worktreeClean) failClosedReasons.push('dirty_worktree');
  if (ahead <= 0) failClosedReasons.push('no_local_commits_to_sync');

  const pushCommand = `git push origin ${branch}`;
  const approvalTemplate = buildApprovalTemplate({
    workspace,
    branch,
    currentHead
  });

  return {
    status: 'PHASE_F1_SYNC_APPROVAL_PACKET_READY_NOT_EXECUTED',
    decision: 'NOT_READY_BLOCKED',
    operatorState: 'RC_NOT_READY_BLOCKED',
    workspace,
    branch,
    remoteRef,
    currentHead,
    currentHeadShort: shortHash(currentHead),
    originHead,
    originHeadShort: shortHash(originHead),
    ahead,
    behind,
    worktreeClean,
    commits,
    pushCommand,
    approvalTemplate,
    pushApproved: false,
    pushExecuted: false,
    f1LiveExecutionAllowed: false,
    nextRequiredAction: failClosedReasons.length
      ? 'review_fail_closed_reasons_before_sync'
      : 'obtain_explicit_normal_non_force_push_approval',
    failClosedReasons,
    safetyCounters: {
      push: 0,
      pull: 0,
      merge: 0,
      rebase: 0,
      tagPush: 0,
      prUpdate: 0,
      serviceStart: 0,
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
  buildApprovalTemplate,
  buildPhaseF1SyncApprovalPacket
};
