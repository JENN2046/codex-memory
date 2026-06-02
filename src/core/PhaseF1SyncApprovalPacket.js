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

function buildPostPushA5Gap4ApprovalTemplate({ branch, currentHead, endpoint = 'http://127.0.0.1:7605' }) {
  const targetHead = normalizeString(currentHead);
  const targetEndpoint = normalizeString(endpoint) || 'http://127.0.0.1:7605';
  return [
    `I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch ${branch} at commit ${targetHead},`,
    `endpoint ${targetEndpoint},`,
    'using current-session bearer token if already present, without printing or persisting token material,',
    'allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only,',
    'no provider, no durable write, no config/watchdog/startup change.'
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
  const syncedHead = currentHead && originHead && currentHead === originHead;
  const postPushA5Gap4TemplateCurrentlyUsable = !!(
    currentHead &&
    originHead &&
    syncedHead &&
    ahead === 0 &&
    behind === 0 &&
    worktreeClean
  );

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
  const postPushA5Gap4ApprovalTemplate = buildPostPushA5Gap4ApprovalTemplate({
    branch,
    currentHead,
    endpoint: input.endpoint
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
    postPushA5Gap4ApprovalTemplate,
    postPushA5Gap4TemplateUsableAfterSyncOnly: true,
    postPushA5Gap4TemplateCurrentlyUsable,
    postPushFreshChecks: {
      requiredBranch: branch,
      requiredRemoteRef: remoteRef,
      requiredHead: currentHead,
      requireCurrentHeadEqualsRemoteHead: true,
      requireAhead: 0,
      requireBehind: 0,
      requireWorktreeClean: true,
      currentlySatisfied: postPushA5Gap4TemplateCurrentlyUsable
    },
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
  buildPostPushA5Gap4ApprovalTemplate,
  buildPhaseF1SyncApprovalPacket
};
