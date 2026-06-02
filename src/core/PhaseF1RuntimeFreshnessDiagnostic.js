'use strict';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseTimestamp(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const cimJsonDateMatch = normalized.match(/^\/Date\((\d+)\)\/$/);
  if (cimJsonDateMatch) {
    const parsedCimMs = Number(cimJsonDateMatch[1]);
    return Number.isFinite(parsedCimMs) ? parsedCimMs : null;
  }
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function evaluatePhaseF1RuntimeFreshness({
  currentHead = '',
  originHead = '',
  ahead = 0,
  behind = 0,
  worktreeClean = false,
  endpoint = 'http://127.0.0.1:7605',
  expectedScriptPath = 'A:\\codex-memory\\scripts\\serve-codex-memory-http.js',
  headCommitTime = '',
  listener = null
} = {}) {
  const normalizedCurrentHead = normalizeString(currentHead);
  const normalizedOriginHead = normalizeString(originHead);
  const normalizedEndpoint = normalizeString(endpoint);
  const normalizedExpectedScriptPath = normalizeString(expectedScriptPath).toLowerCase();
  const normalizedAhead = normalizeInteger(ahead) ?? 0;
  const normalizedBehind = normalizeInteger(behind) ?? 0;
  const headCommitMs = parseTimestamp(headCommitTime);
  const listenerProcessId = normalizeInteger(listener?.processId);
  const listenerStartedMs = parseTimestamp(listener?.creationDate);
  const listenerCommandLine = normalizeString(listener?.commandLine);
  const normalizedCommandLine = listenerCommandLine.toLowerCase();
  const failClosedReasons = [];

  if (!normalizedCurrentHead) failClosedReasons.push('missing_current_head');
  if (!normalizedOriginHead) failClosedReasons.push('missing_origin_head');
  if (normalizedCurrentHead && normalizedOriginHead && normalizedCurrentHead !== normalizedOriginHead) {
    failClosedReasons.push('local_origin_head_mismatch');
  }
  if (normalizedAhead !== 0) failClosedReasons.push('local_branch_ahead_remote');
  if (normalizedBehind !== 0) failClosedReasons.push('local_branch_behind_remote');
  if (worktreeClean !== true) failClosedReasons.push('dirty_worktree');
  if (!headCommitMs) failClosedReasons.push('missing_or_invalid_head_commit_time');
  if (!listenerProcessId) failClosedReasons.push('missing_listener_process');
  if (!listenerStartedMs) failClosedReasons.push('missing_or_invalid_listener_creation_time');
  if (normalizedExpectedScriptPath && normalizedCommandLine && !normalizedCommandLine.includes(normalizedExpectedScriptPath)) {
    failClosedReasons.push('listener_command_line_unexpected');
  }
  if (headCommitMs && listenerStartedMs && listenerStartedMs < headCommitMs) {
    failClosedReasons.push('runtime_process_started_before_head');
  }

  const fresh = failClosedReasons.length === 0;

  return {
    status: fresh
      ? 'PHASE_F1_RUNTIME_FRESHNESS_ACCEPTED'
      : 'PHASE_F1_RUNTIME_FRESHNESS_REJECTED_FAIL_CLOSED',
    decision: 'NOT_READY_BLOCKED',
    endpoint: normalizedEndpoint,
    currentHead: normalizedCurrentHead,
    originHead: normalizedOriginHead,
    ahead: normalizedAhead,
    behind: normalizedBehind,
    worktreeClean: worktreeClean === true,
    headCommitTime: normalizeString(headCommitTime),
    listener: listenerProcessId
      ? {
          processId: listenerProcessId,
          creationDate: normalizeString(listener.creationDate),
          commandLineMatchesExpectedScript: normalizedExpectedScriptPath
            ? normalizedCommandLine.includes(normalizedExpectedScriptPath)
            : null
        }
      : null,
    runtimeFresh: fresh,
    failClosedReasons,
    nextRequiredAction: fresh
      ? 'run_exact_approved_f1_live_no_write_harness'
      : failClosedReasons.includes('runtime_process_started_before_head')
        ? 'obtain_exact_runtime_refresh_approval_then_restart_or_refresh_service'
        : 'review_runtime_freshness_fail_closed_reasons',
    safetyCounters: {
      providerCalls: 0,
      mcpCalls: 0,
      realMemoryReads: 0,
      realMemoryWrites: 0,
      durableMemoryWrites: 0,
      durableAuditWrites: 0,
      configWatchdogStartupChanges: 0,
      remoteActions: 0,
      readinessClaims: 0,
      reliabilityClaims: 0
    },
    runtimeReady: false,
    rcReady: false
  };
}

module.exports = {
  evaluatePhaseF1RuntimeFreshness,
  parseTimestamp
};
