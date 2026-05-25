'use strict';

const TASK_ID = 'CM-1084_MEMORY_WRITE_RECONCILE_STARTUP_WORKER_SAFETY';
const ACCEPTED_MODE = 'startup_reconcile_worker_safety_review_only';
const ACCEPTED_SOURCES = Object.freeze([
  'temp_local_app_initialization_fixture',
  'temp_local_worker_status_fixture'
]);
const WORKER_STATUS_KEYS = Object.freeze([
  'running',
  'timerScheduled',
  'tickInFlight',
  'runCount',
  'intervalMs',
  'limit',
  'dryRun',
  'maxRuns'
]);
const LAST_RESULT_SUMMARY_KEYS = Object.freeze([
  'success',
  'decision',
  'workerDecision',
  'dryRun',
  'limit',
  'scannedTaskCount',
  'replayedCount',
  'wouldReplayCount',
  'clearedCount',
  'failedCount',
  'skippedCount',
  'hasError'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pickBoolean(value) {
  return value === true;
}

function pickNumberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function sanitizeLastResultSummary(summary) {
  if (!isPlainObject(summary)) return null;
  const sanitized = {};
  for (const key of LAST_RESULT_SUMMARY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(summary, key)) continue;
    const value = summary[key];
    if (typeof value === 'boolean' || typeof value === 'string' || value === null) {
      sanitized[key] = value;
    } else if (Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeWorkerStatus(status) {
  if (!isPlainObject(status)) return null;
  const sanitized = {};
  for (const key of WORKER_STATUS_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(status, key)) continue;
    const value = status[key];
    if (typeof value === 'boolean' || typeof value === 'string' || value === null) {
      sanitized[key] = value;
    } else if (Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }
  sanitized.running = pickBoolean(status.running);
  sanitized.timerScheduled = pickBoolean(status.timerScheduled);
  sanitized.tickInFlight = pickBoolean(status.tickInFlight);
  sanitized.runCount = pickNumberOrNull(Number(status.runCount));
  sanitized.intervalMs = pickNumberOrNull(Number(status.intervalMs));
  sanitized.limit = status.limit === null || status.limit === undefined ? null : pickNumberOrNull(Number(status.limit));
  sanitized.dryRun = pickBoolean(status.dryRun);
  sanitized.maxRuns = status.maxRuns === null || status.maxRuns === undefined ? null : pickNumberOrNull(Number(status.maxRuns));
  sanitized.lastResultSummary = sanitizeLastResultSummary(status.lastResultSummary);
  return sanitized;
}

function buildApplyGate() {
  return {
    startupEnablementApproved: false,
    startupEnablementExecuted: false,
    configChangeApproved: false,
    configChangeExecuted: false,
    watchdogChangeApproved: false,
    watchdogChangeExecuted: false,
    publicMcpExpansionApproved: false,
    publicMcpExpansionExecuted: false
  };
}

function buildStartupSafetyReport({
  mode = '',
  source = '',
  workerStatus = null,
  requestedStartupEnablement = false,
  requestedRuntimeStart = false,
  requestedConfigChange = false,
  requestedWatchdogChange = false,
  requestedStartupTaskChange = false,
  requestedPublicMcpExpansion = false
} = {}) {
  const blockers = [];
  const normalizedMode = normalizeString(mode);
  const normalizedSource = normalizeString(source);
  const sanitizedWorkerStatus = sanitizeWorkerStatus(workerStatus);

  if (normalizedMode !== ACCEPTED_MODE) {
    blockers.push('startup_safety_review_mode_required');
  }
  if (!ACCEPTED_SOURCES.includes(normalizedSource)) {
    blockers.push('temp_local_startup_safety_source_required');
  }
  if (!sanitizedWorkerStatus) {
    blockers.push('worker_status_required');
  }
  if (requestedStartupEnablement === true) {
    blockers.push('startup_enablement_not_authorized');
  }
  if (requestedRuntimeStart === true) {
    blockers.push('runtime_worker_start_not_authorized');
  }
  if (requestedConfigChange === true) {
    blockers.push('config_change_not_authorized');
  }
  if (requestedWatchdogChange === true) {
    blockers.push('watchdog_change_not_authorized');
  }
  if (requestedStartupTaskChange === true) {
    blockers.push('startup_task_change_not_authorized');
  }
  if (requestedPublicMcpExpansion === true) {
    blockers.push('public_mcp_expansion_not_authorized');
  }
  if (sanitizedWorkerStatus?.running === true) {
    blockers.push('worker_already_running');
  }
  if (sanitizedWorkerStatus?.timerScheduled === true) {
    blockers.push('worker_timer_already_scheduled');
  }
  if (sanitizedWorkerStatus?.tickInFlight === true) {
    blockers.push('worker_tick_in_flight');
  }

  const accepted = blockers.length === 0;
  return {
    taskId: TASK_ID,
    accepted,
    status: accepted
      ? 'startup_safety_review_passed_not_enabled'
      : 'startup_safety_review_blocked',
    mode: normalizedMode || null,
    source: normalizedSource || null,
    blockerReasons: blockers,
    workerStatus: sanitizedWorkerStatus,
    startupWorkerSafetyReviewed: accepted,
    startupWorkerEnabled: false,
    runtimeWorkerStarted: false,
    configChanged: false,
    watchdogChanged: false,
    startupTaskChanged: false,
    publicMcpExpansion: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    applyGate: buildApplyGate()
  };
}

module.exports = {
  ACCEPTED_MODE,
  ACCEPTED_SOURCES,
  TASK_ID,
  buildStartupSafetyReport,
  sanitizeWorkerStatus
};
