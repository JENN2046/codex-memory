'use strict';

const TASK_ID = 'CM-1084_MEMORY_WRITE_RECONCILE_STARTUP_WORKER_SAFETY';
const STARTUP_RECOVERY_TASK_ID = 'CM-1166_MEMORY_WRITE_STARTUP_RECOVERY_SAFETY_PREFLIGHT';
const ACCEPTED_MODE = 'startup_reconcile_worker_safety_review_only';
const ACCEPTED_RECOVERY_MODE = 'startup_recovery_safety_preflight_only';
const ACCEPTED_SOURCES = Object.freeze([
  'temp_local_app_initialization_fixture',
  'temp_local_worker_status_fixture'
]);
const ACCEPTED_RECOVERY_SOURCES = Object.freeze([
  'temp_local_app_initialization_fixture',
  'temp_local_write_manifest_health_fixture'
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
const WRITE_MANIFEST_COUNTER_KEYS = Object.freeze([
  'total',
  'pending',
  'committed',
  'degraded',
  'repaired',
  'cancelled',
  'failed'
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

function pickCounter(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
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

function buildStartupRecoveryApplyGate() {
  return {
    startupRecoveryApproved: false,
    startupRecoveryExecuted: false,
    runtimeRecoveryApproved: false,
    runtimeRecoveryExecuted: false,
    manifestRecoveryExecuted: false,
    manifestRepairExecuted: false,
    manifestCancelExecuted: false,
    configChangeApproved: false,
    configChangeExecuted: false,
    watchdogChangeApproved: false,
    watchdogChangeExecuted: false,
    publicMcpExpansionApproved: false,
    publicMcpExpansionExecuted: false
  };
}

function sanitizeStartupRecoveryHealth(health) {
  if (!isPlainObject(health)) return null;
  const writeManifest = isPlainObject(health.writeManifest) ? health.writeManifest : {};
  const sanitizedWriteManifest = {};
  for (const key of WRITE_MANIFEST_COUNTER_KEYS) {
    sanitizedWriteManifest[key] = pickCounter(writeManifest[key]);
  }
  return {
    available: health.available === true,
    authoritativeStore: normalizeString(health.authoritativeStore) || null,
    recordCount: pickCounter(health.recordCount),
    chunkCount: pickCounter(health.chunkCount),
    totalChunkCount: pickCounter(health.totalChunkCount),
    reconcileCount: pickCounter(health.reconcileCount),
    writeManifest: sanitizedWriteManifest
  };
}

function hasMalformedStartupRecoveryHealth(health) {
  if (!health) return true;
  const counters = [
    health.recordCount,
    health.chunkCount,
    health.totalChunkCount,
    health.reconcileCount,
    ...WRITE_MANIFEST_COUNTER_KEYS.map(key => health.writeManifest?.[key])
  ];
  return counters.some(value => value === null);
}

function normalizeBoundedLimit(value, fallback = 50) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number > 0 && number <= 50 ? number : null;
}

function buildStartupRecoverySafetyPreflight({
  mode = '',
  source = '',
  shadowHealth = null,
  proposedRecoveryLimit = 50,
  proposedRepairLimit = 50,
  proposedCancelLimit = 50,
  requestedStartupRecovery = false,
  requestedRuntimeRecovery = false,
  requestedConfigChange = false,
  requestedWatchdogChange = false,
  requestedStartupTaskChange = false,
  requestedPublicMcpExpansion = false,
  requestedProviderCall = false,
  requestedRealStoreWrite = false,
  requestedSchemaMigration = false,
  requestedBackupRestore = false,
  requestedImportExport = false,
  readinessClaimed = false,
  reliabilityClaimed = false
} = {}) {
  const blockers = [];
  const normalizedMode = normalizeString(mode);
  const normalizedSource = normalizeString(source);
  const sanitizedHealth = sanitizeStartupRecoveryHealth(shadowHealth);
  const recoveryLimit = normalizeBoundedLimit(proposedRecoveryLimit);
  const repairLimit = normalizeBoundedLimit(proposedRepairLimit);
  const cancelLimit = normalizeBoundedLimit(proposedCancelLimit);

  if (normalizedMode !== ACCEPTED_RECOVERY_MODE) {
    blockers.push('startup_recovery_safety_preflight_mode_required');
  }
  if (!ACCEPTED_RECOVERY_SOURCES.includes(normalizedSource)) {
    blockers.push('temp_local_startup_recovery_source_required');
  }
  if (!sanitizedHealth) {
    blockers.push('shadow_health_required');
  } else if (hasMalformedStartupRecoveryHealth(sanitizedHealth)) {
    blockers.push('shadow_health_counters_malformed');
  }
  if (recoveryLimit === null) blockers.push('proposed_recovery_limit_must_be_1_to_50');
  if (repairLimit === null) blockers.push('proposed_repair_limit_must_be_1_to_50');
  if (cancelLimit === null) blockers.push('proposed_cancel_limit_must_be_1_to_50');
  if (requestedStartupRecovery === true) blockers.push('startup_recovery_not_authorized');
  if (requestedRuntimeRecovery === true) blockers.push('runtime_recovery_not_authorized');
  if (requestedConfigChange === true) blockers.push('config_change_not_authorized');
  if (requestedWatchdogChange === true) blockers.push('watchdog_change_not_authorized');
  if (requestedStartupTaskChange === true) blockers.push('startup_task_change_not_authorized');
  if (requestedPublicMcpExpansion === true) blockers.push('public_mcp_expansion_not_authorized');
  if (requestedProviderCall === true) blockers.push('provider_call_not_authorized');
  if (requestedRealStoreWrite === true) blockers.push('real_store_write_not_authorized');
  if (requestedSchemaMigration === true) blockers.push('schema_migration_not_authorized');
  if (requestedBackupRestore === true) blockers.push('backup_restore_not_authorized');
  if (requestedImportExport === true) blockers.push('import_export_not_authorized');
  if (readinessClaimed === true) blockers.push('readiness_claim_not_authorized');
  if (reliabilityClaimed === true) blockers.push('reliability_claim_not_authorized');

  const accepted = blockers.length === 0;
  return {
    taskId: STARTUP_RECOVERY_TASK_ID,
    accepted,
    status: accepted
      ? 'startup_recovery_safety_preflight_passed_not_enabled'
      : 'startup_recovery_safety_preflight_blocked',
    mode: normalizedMode || null,
    source: normalizedSource || null,
    blockerReasons: blockers,
    shadowHealth: sanitizedHealth,
    candidateCounts: {
      pendingManifestCount: sanitizedHealth?.writeManifest?.pending ?? null,
      degradedManifestCount: sanitizedHealth?.writeManifest?.degraded ?? null,
      reconcileTaskCount: sanitizedHealth?.reconcileCount ?? null
    },
    boundedPlan: {
      recoveryLimit,
      repairLimit,
      cancelLimit,
      dryRunFirstRequired: true,
      manualApprovalRequired: true,
      startupEnablementRequiresA5Approval: true,
      realStoreRecoveryRequiresA5Approval: true
    },
    startupRecoveryPreflightAccepted: accepted,
    startupRecoveryEnabled: false,
    runtimeRecoveryExecuted: false,
    manifestRecoveryExecuted: false,
    manifestRepairExecuted: false,
    manifestCancelExecuted: false,
    configChanged: false,
    watchdogChanged: false,
    startupTaskChanged: false,
    publicMcpExpansion: false,
    providerCalled: false,
    realStoreWritten: false,
    schemaMigrationApplied: false,
    backupRestoreApplied: false,
    importExportApplied: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    applyGate: buildStartupRecoveryApplyGate()
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
  ACCEPTED_RECOVERY_MODE,
  ACCEPTED_RECOVERY_SOURCES,
  ACCEPTED_SOURCES,
  STARTUP_RECOVERY_TASK_ID,
  TASK_ID,
  buildStartupRecoverySafetyPreflight,
  buildStartupSafetyReport,
  sanitizeStartupRecoveryHealth,
  sanitizeWorkerStatus
};
