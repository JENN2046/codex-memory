'use strict';

const TASK_ID = 'CM-1084_MEMORY_WRITE_RECONCILE_STARTUP_WORKER_SAFETY';
const STARTUP_RECOVERY_TASK_ID = 'CM-1166_MEMORY_WRITE_STARTUP_RECOVERY_SAFETY_PREFLIGHT';
const STARTUP_RECOVERY_POLICY_TASK_ID = 'CM-1167_GUARDED_STARTUP_RECOVERY_POLICY_DESIGN';
const STARTUP_RECOVERY_DRY_RUN_TASK_ID = 'CM-1168_TEMP_LOCAL_STARTUP_RECOVERY_DRY_RUN_HARNESS';
const STARTUP_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_TASK_ID = 'CM-1169_TEMP_LOCAL_STARTUP_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT';
const ACCEPTED_MODE = 'startup_reconcile_worker_safety_review_only';
const ACCEPTED_RECOVERY_MODE = 'startup_recovery_safety_preflight_only';
const ACCEPTED_RECOVERY_POLICY_MODE = 'guarded_startup_recovery_policy_design_only';
const ACCEPTED_RECOVERY_DRY_RUN_MODE = 'temp_local_startup_recovery_dry_run_harness_only';
const ACCEPTED_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_MODE = 'temp_local_startup_recovery_dry_run_execution_preflight_only';
const ACCEPTED_SOURCES = Object.freeze([
  'temp_local_app_initialization_fixture',
  'temp_local_worker_status_fixture'
]);
const ACCEPTED_RECOVERY_SOURCES = Object.freeze([
  'temp_local_app_initialization_fixture',
  'temp_local_write_manifest_health_fixture'
]);
const ACCEPTED_RECOVERY_POLICY_SOURCES = Object.freeze([
  'cm1166_startup_recovery_safety_preflight_report',
  'temp_local_startup_recovery_policy_fixture'
]);
const ACCEPTED_RECOVERY_DRY_RUN_SOURCES = Object.freeze([
  'cm1167_guarded_startup_recovery_policy_design',
  'temp_local_startup_recovery_dry_run_fixture'
]);
const ACCEPTED_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_SOURCES = Object.freeze([
  'cm1168_temp_local_startup_recovery_dry_run_harness',
  'runtime_isolated_temp_local_dry_run_fixture'
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
const SCHEMA_STARTUP_GATE_ALLOWED_STATUSES = Object.freeze([
  'initialized_current_schema_version',
  'current_schema_version_confirmed',
  'older_schema_version_allowed_for_additive_repair'
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

function buildStartupRecoveryPolicyApplyGate() {
  return {
    startupRecoveryPolicyApproved: false,
    startupRecoveryPolicyActivated: false,
    startupRecoveryExecuted: false,
    runtimeRecoveryExecuted: false,
    dryRunHarnessImplemented: false,
    dryRunExecuted: false,
    configChangeApproved: false,
    configChangeExecuted: false,
    watchdogChangeApproved: false,
    watchdogChangeExecuted: false,
    publicMcpExpansionApproved: false,
    publicMcpExpansionExecuted: false
  };
}

function buildStartupRecoveryDryRunApplyGate() {
  return {
    startupRecoveryDryRunApproved: false,
    startupRecoveryDryRunExecuted: false,
    startupRecoveryExecuted: false,
    runtimeRecoveryExecuted: false,
    manifestRecoveryExecuted: false,
    manifestRepairExecuted: false,
    manifestCancelExecuted: false,
    reconcileReplayExecuted: false,
    configChangeApproved: false,
    configChangeExecuted: false,
    watchdogChangeApproved: false,
    watchdogChangeExecuted: false,
    publicMcpExpansionApproved: false,
    publicMcpExpansionExecuted: false
  };
}

function buildStartupRecoveryDryRunExecutionPreflightApplyGate() {
  return {
    dryRunExecutionApproved: false,
    dryRunExecutionStarted: false,
    dryRunExecutionCompleted: false,
    startupRecoveryExecuted: false,
    runtimeRecoveryExecuted: false,
    manifestRecoveryExecuted: false,
    manifestRepairExecuted: false,
    manifestCancelExecuted: false,
    reconcileReplayExecuted: false,
    durableAuditWritten: false,
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
  const schemaStartupGate = isPlainObject(health.schemaStartupGate)
    ? {
      status: normalizeString(health.schemaStartupGate.status) || null,
      expectedVersion: pickCounter(health.schemaStartupGate.expectedVersion),
      observedVersion: pickCounter(health.schemaStartupGate.observedVersion),
      blocked: health.schemaStartupGate.blocked === true,
      reason: normalizeString(health.schemaStartupGate.reason)
    }
    : null;
  return {
    available: health.available === true,
    authoritativeStore: normalizeString(health.authoritativeStore) || null,
    recordCount: pickCounter(health.recordCount),
    chunkCount: pickCounter(health.chunkCount),
    totalChunkCount: pickCounter(health.totalChunkCount),
    reconcileCount: pickCounter(health.reconcileCount),
    schemaStartupGate,
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

function getSchemaStartupGateBlocker(health) {
  const gate = health?.schemaStartupGate;
  if (!gate) return 'schema_startup_gate_required';
  if (gate.blocked === true) return 'schema_startup_gate_blocked';
  if (!SCHEMA_STARTUP_GATE_ALLOWED_STATUSES.includes(gate.status)) {
    return 'schema_startup_gate_status_unaccepted';
  }
  if (gate.expectedVersion === null || gate.observedVersion === null) {
    return 'schema_startup_gate_version_malformed';
  }
  if (gate.observedVersion > gate.expectedVersion) {
    return 'schema_startup_gate_future_version_blocked';
  }
  return '';
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
  const schemaGateBlocker = getSchemaStartupGateBlocker(sanitizedHealth);
  if (schemaGateBlocker) blockers.push(schemaGateBlocker);
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

function hasAcceptedStartupRecoveryPreflight(report) {
  return isPlainObject(report) &&
    report.taskId === STARTUP_RECOVERY_TASK_ID &&
    report.accepted === true &&
    report.status === 'startup_recovery_safety_preflight_passed_not_enabled' &&
    getSchemaStartupGateBlocker(report.shadowHealth) === '' &&
    report.startupRecoveryPreflightAccepted === true &&
    report.startupRecoveryEnabled === false &&
    report.runtimeRecoveryExecuted === false &&
    report.manifestRecoveryExecuted === false &&
    report.manifestRepairExecuted === false &&
    report.manifestCancelExecuted === false &&
    report.configChanged === false &&
    report.watchdogChanged === false &&
    report.startupTaskChanged === false &&
    report.publicMcpExpansion === false &&
    report.providerCalled === false &&
    report.realStoreWritten === false &&
    report.schemaMigrationApplied === false &&
    report.backupRestoreApplied === false &&
    report.importExportApplied === false &&
    report.readinessClaimed === false &&
    report.reliabilityClaimed === false;
}

function normalizePolicyLimit(value, fallback = 10) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number > 0 && number <= 10 ? number : null;
}

function hasAcceptedGuardedStartupRecoveryPolicyDesign(report) {
  const startupRecoveryLimit = report?.policyDesign?.startupRecoveryLimit;
  const reconcileReplayLimit = report?.policyDesign?.reconcileReplayLimit;
  const repairLimit = report?.policyDesign?.repairLimit;
  return isPlainObject(report) &&
    report.taskId === STARTUP_RECOVERY_POLICY_TASK_ID &&
    report.accepted === true &&
    report.status === 'guarded_startup_recovery_policy_design_accepted_not_enabled' &&
    report.priorPreflightAccepted === true &&
    report.startupRecoveryPolicyDesigned === true &&
    report.startupRecoveryPolicyActivated === false &&
    report.startupRecoveryEnabled === false &&
    report.runtimeRecoveryExecuted === false &&
    report.dryRunExecuted === false &&
    report.manifestRecoveryExecuted === false &&
    report.manifestRepairExecuted === false &&
    report.manifestCancelExecuted === false &&
    report.configChanged === false &&
    report.watchdogChanged === false &&
    report.startupTaskChanged === false &&
    report.publicMcpExpansion === false &&
    report.providerCalled === false &&
    report.realStoreWritten === false &&
    report.schemaMigrationApplied === false &&
    report.backupRestoreApplied === false &&
    report.importExportApplied === false &&
    report.readinessClaimed === false &&
    report.reliabilityClaimed === false &&
    report.policyDesign?.dryRunRequired === true &&
    report.policyDesign?.manualApprovalRequired === true &&
    report.policyDesign?.futureDryRunHarnessRequired === true &&
    report.policyDesign?.priorPreflightSchemaGateAccepted === true &&
    report.policyDesign?.startupRecoveryDefault === 'disabled' &&
    report.policyDesign?.startupReconcileReplayDefault === 'disabled' &&
    report.policyDesign?.nextAllowedAction === 'implement_temp_local_startup_recovery_dry_run_harness_only' &&
    Number.isInteger(startupRecoveryLimit) &&
    startupRecoveryLimit > 0 &&
    startupRecoveryLimit <= 10 &&
    Number.isInteger(reconcileReplayLimit) &&
    reconcileReplayLimit > 0 &&
    reconcileReplayLimit <= 10 &&
    Number.isInteger(repairLimit) &&
    repairLimit > 0 &&
    repairLimit <= 10;
}

function buildGuardedStartupRecoveryPolicyDesign({
  mode = '',
  source = '',
  priorPreflight = null,
  proposedPolicy = {},
  requestedPolicyActivation = false,
  requestedStartupRecovery = false,
  requestedRuntimeRecovery = false,
  requestedDryRunExecution = false,
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
  const policy = isPlainObject(proposedPolicy) ? proposedPolicy : {};
  const startupRecoveryLimit = normalizePolicyLimit(policy.startupRecoveryLimit);
  const reconcileReplayLimit = normalizePolicyLimit(policy.reconcileReplayLimit);
  const repairLimit = normalizePolicyLimit(policy.repairLimit);
  const priorPreflightAccepted = hasAcceptedStartupRecoveryPreflight(priorPreflight);

  if (normalizedMode !== ACCEPTED_RECOVERY_POLICY_MODE) {
    blockers.push('startup_recovery_policy_design_mode_required');
  }
  if (!ACCEPTED_RECOVERY_POLICY_SOURCES.includes(normalizedSource)) {
    blockers.push('startup_recovery_policy_source_required');
  }
  if (!priorPreflightAccepted) {
    blockers.push('accepted_cm1166_preflight_required');
  }
  if (startupRecoveryLimit === null) blockers.push('startup_recovery_limit_must_be_1_to_10');
  if (reconcileReplayLimit === null) blockers.push('reconcile_replay_limit_must_be_1_to_10');
  if (repairLimit === null) blockers.push('repair_limit_must_be_1_to_10');
  if (policy.dryRunRequired !== true) blockers.push('dry_run_required');
  if (policy.manualApprovalRequired !== true) blockers.push('manual_approval_required');
  if (policy.cancelMissingDiaryAtStartup === true) blockers.push('startup_cancel_missing_diary_not_allowed');
  if (policy.repairDegradedAtStartup === true) blockers.push('startup_repair_degraded_not_allowed');
  if (policy.recoverPendingAtStartup === true) blockers.push('startup_recover_pending_not_allowed');
  if (policy.replayReconcileAtStartup === true) blockers.push('startup_reconcile_replay_not_allowed');
  if (!['temp_local', 'fixture_only'].includes(policy.realStoreScope)) {
    blockers.push('temp_local_policy_scope_required');
  }
  if (policy.realStoreScope === 'real' || policy.realStoreScope === 'production') {
    blockers.push('real_store_scope_not_allowed');
  }
  if (requestedPolicyActivation === true) blockers.push('policy_activation_not_authorized');
  if (requestedStartupRecovery === true) blockers.push('startup_recovery_not_authorized');
  if (requestedRuntimeRecovery === true) blockers.push('runtime_recovery_not_authorized');
  if (requestedDryRunExecution === true) blockers.push('dry_run_execution_not_authorized');
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
    taskId: STARTUP_RECOVERY_POLICY_TASK_ID,
    accepted,
    status: accepted
      ? 'guarded_startup_recovery_policy_design_accepted_not_enabled'
      : 'guarded_startup_recovery_policy_design_blocked',
    mode: normalizedMode || null,
    source: normalizedSource || null,
    blockerReasons: blockers,
    priorPreflightAccepted,
    candidateCounts: {
      pendingManifestCount: priorPreflight?.candidateCounts?.pendingManifestCount ?? null,
      degradedManifestCount: priorPreflight?.candidateCounts?.degradedManifestCount ?? null,
      reconcileTaskCount: priorPreflight?.candidateCounts?.reconcileTaskCount ?? null
    },
    policyDesign: {
      startupRecoveryLimit,
      reconcileReplayLimit,
      repairLimit,
      dryRunRequired: policy.dryRunRequired === true,
      manualApprovalRequired: policy.manualApprovalRequired === true,
      futureDryRunHarnessRequired: true,
      priorPreflightSchemaGateAccepted: priorPreflightAccepted,
      missingDiaryCancellation: 'manual_approval_only',
      degradedRepair: 'manual_after_reconcile_queue_drained_only',
      startupRecoveryDefault: 'disabled',
      startupReconcileReplayDefault: 'disabled',
      nextAllowedAction: accepted
        ? 'implement_temp_local_startup_recovery_dry_run_harness_only'
        : 'resolve_startup_recovery_policy_design_blockers'
    },
    startupRecoveryPolicyDesigned: accepted,
    startupRecoveryPolicyActivated: false,
    startupRecoveryEnabled: false,
    runtimeRecoveryExecuted: false,
    dryRunExecuted: false,
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
    applyGate: buildStartupRecoveryPolicyApplyGate()
  };
}

function buildTempLocalStartupRecoveryDryRunHarness({
  mode = '',
  source = '',
  priorPolicyDesign = null,
  inventory = {},
  realStoreScope = '',
  requestedDryRunExecution = false,
  requestedStartupRecovery = false,
  requestedRuntimeRecovery = false,
  requestedManifestRecovery = false,
  requestedManifestRepair = false,
  requestedManifestCancel = false,
  requestedReconcileReplay = false,
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
  const normalizedScope = normalizeString(realStoreScope);
  const safeInventory = isPlainObject(inventory) ? inventory : {};
  const pendingManifestCount = pickCounter(safeInventory.pendingManifestCount);
  const degradedManifestCount = pickCounter(safeInventory.degradedManifestCount);
  const reconcileTaskCount = pickCounter(safeInventory.reconcileTaskCount);
  const policyAccepted = hasAcceptedGuardedStartupRecoveryPolicyDesign(priorPolicyDesign);
  const startupRecoveryLimit = policyAccepted ? priorPolicyDesign.policyDesign.startupRecoveryLimit : null;
  const reconcileReplayLimit = policyAccepted ? priorPolicyDesign.policyDesign.reconcileReplayLimit : null;
  const repairLimit = policyAccepted ? priorPolicyDesign.policyDesign.repairLimit : null;

  if (normalizedMode !== ACCEPTED_RECOVERY_DRY_RUN_MODE) {
    blockers.push('startup_recovery_dry_run_harness_mode_required');
  }
  if (!ACCEPTED_RECOVERY_DRY_RUN_SOURCES.includes(normalizedSource)) {
    blockers.push('startup_recovery_dry_run_source_required');
  }
  if (!policyAccepted) {
    blockers.push('accepted_cm1167_policy_design_required');
  }
  if (!['temp_local', 'fixture_only'].includes(normalizedScope)) {
    blockers.push('temp_local_dry_run_scope_required');
  }
  if (normalizedScope === 'real' || normalizedScope === 'production') {
    blockers.push('real_store_scope_not_allowed');
  }
  if (pendingManifestCount === null) blockers.push('pending_manifest_count_must_be_non_negative_integer');
  if (degradedManifestCount === null) blockers.push('degraded_manifest_count_must_be_non_negative_integer');
  if (reconcileTaskCount === null) blockers.push('reconcile_task_count_must_be_non_negative_integer');
  if (requestedDryRunExecution === true) blockers.push('dry_run_execution_not_authorized');
  if (requestedStartupRecovery === true) blockers.push('startup_recovery_not_authorized');
  if (requestedRuntimeRecovery === true) blockers.push('runtime_recovery_not_authorized');
  if (requestedManifestRecovery === true) blockers.push('manifest_recovery_not_authorized');
  if (requestedManifestRepair === true) blockers.push('manifest_repair_not_authorized');
  if (requestedManifestCancel === true) blockers.push('manifest_cancel_not_authorized');
  if (requestedReconcileReplay === true) blockers.push('reconcile_replay_not_authorized');
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
    taskId: STARTUP_RECOVERY_DRY_RUN_TASK_ID,
    accepted,
    status: accepted
      ? 'temp_local_startup_recovery_dry_run_harness_ready_not_executed'
      : 'temp_local_startup_recovery_dry_run_harness_blocked',
    mode: normalizedMode || null,
    source: normalizedSource || null,
    realStoreScope: normalizedScope || null,
    blockerReasons: blockers,
    priorPolicyDesignAccepted: policyAccepted,
    inventory: {
      pendingManifestCount,
      degradedManifestCount,
      reconcileTaskCount
    },
    dryRunPlan: {
      startupRecoveryLimit,
      reconcileReplayLimit,
      repairLimit,
      pendingManifestCandidates: pendingManifestCount === null || startupRecoveryLimit === null
        ? null
        : Math.min(pendingManifestCount, startupRecoveryLimit),
      degradedManifestCandidates: degradedManifestCount === null || repairLimit === null
        ? null
        : Math.min(degradedManifestCount, repairLimit),
      reconcileReplayCandidates: reconcileTaskCount === null || reconcileReplayLimit === null
        ? null
        : Math.min(reconcileTaskCount, reconcileReplayLimit),
      dryRunOnly: true,
      tempLocalOnly: normalizedScope === 'temp_local',
      fixtureOnly: normalizedScope === 'fixture_only',
      executionDefault: 'disabled',
      manualApprovalRequiredBeforeApply: true,
      nextAllowedAction: accepted
        ? 'record_temp_local_startup_recovery_dry_run_harness_only'
        : 'resolve_temp_local_startup_recovery_dry_run_harness_blockers'
    },
    dryRunHarnessReady: accepted,
    dryRunExecuted: false,
    startupRecoveryExecuted: false,
    runtimeRecoveryExecuted: false,
    manifestRecoveryExecuted: false,
    manifestRepairExecuted: false,
    manifestCancelExecuted: false,
    reconcileReplayExecuted: false,
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
    applyGate: buildStartupRecoveryDryRunApplyGate()
  };
}

function hasAcceptedTempLocalStartupRecoveryDryRunHarness(report) {
  return isPlainObject(report) &&
    report.taskId === STARTUP_RECOVERY_DRY_RUN_TASK_ID &&
    report.accepted === true &&
    report.status === 'temp_local_startup_recovery_dry_run_harness_ready_not_executed' &&
    report.priorPolicyDesignAccepted === true &&
    ['temp_local', 'fixture_only'].includes(report.realStoreScope) &&
    pickCounter(report.inventory?.pendingManifestCount) !== null &&
    pickCounter(report.inventory?.degradedManifestCount) !== null &&
    pickCounter(report.inventory?.reconcileTaskCount) !== null &&
    report.dryRunPlan?.dryRunOnly === true &&
    report.dryRunPlan?.executionDefault === 'disabled' &&
    report.dryRunPlan?.manualApprovalRequiredBeforeApply === true &&
    Number.isInteger(report.dryRunPlan?.startupRecoveryLimit) &&
    Number.isInteger(report.dryRunPlan?.reconcileReplayLimit) &&
    Number.isInteger(report.dryRunPlan?.repairLimit) &&
    pickCounter(report.dryRunPlan?.pendingManifestCandidates) !== null &&
    pickCounter(report.dryRunPlan?.degradedManifestCandidates) !== null &&
    pickCounter(report.dryRunPlan?.reconcileReplayCandidates) !== null &&
    report.dryRunPlan?.nextAllowedAction === 'record_temp_local_startup_recovery_dry_run_harness_only' &&
    report.dryRunHarnessReady === true &&
    report.dryRunExecuted === false &&
    report.startupRecoveryExecuted === false &&
    report.runtimeRecoveryExecuted === false &&
    report.manifestRecoveryExecuted === false &&
    report.manifestRepairExecuted === false &&
    report.manifestCancelExecuted === false &&
    report.reconcileReplayExecuted === false &&
    report.configChanged === false &&
    report.watchdogChanged === false &&
    report.startupTaskChanged === false &&
    report.publicMcpExpansion === false &&
    report.providerCalled === false &&
    report.realStoreWritten === false &&
    report.schemaMigrationApplied === false &&
    report.backupRestoreApplied === false &&
    report.importExportApplied === false &&
    report.readinessClaimed === false &&
    report.reliabilityClaimed === false;
}

function buildTempLocalStartupRecoveryDryRunExecutionPreflight({
  mode = '',
  source = '',
  priorDryRunHarness = null,
  executionPlan = {},
  requestedDryRunExecution = false,
  requestedStartupRecovery = false,
  requestedRuntimeRecovery = false,
  requestedManifestRecovery = false,
  requestedManifestRepair = false,
  requestedManifestCancel = false,
  requestedReconcileReplay = false,
  requestedDurableAuditWrite = false,
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
  const plan = isPlainObject(executionPlan) ? executionPlan : {};
  const normalizedStoreScope = normalizeString(plan.storeScope);
  const harnessAccepted = hasAcceptedTempLocalStartupRecoveryDryRunHarness(priorDryRunHarness);

  if (normalizedMode !== ACCEPTED_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_MODE) {
    blockers.push('startup_recovery_dry_run_execution_preflight_mode_required');
  }
  if (!ACCEPTED_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_SOURCES.includes(normalizedSource)) {
    blockers.push('startup_recovery_dry_run_execution_preflight_source_required');
  }
  if (!harnessAccepted) {
    blockers.push('accepted_cm1168_dry_run_harness_required');
  }
  if (plan.dryRun !== true) blockers.push('dry_run_true_required');
  if (plan.apply === true || plan.confirm === true) blockers.push('apply_confirm_not_allowed');
  if (plan.maxRuns !== 1) blockers.push('max_runs_one_required');
  if (plan.isolatedTempRoot !== true) blockers.push('isolated_temp_root_required');
  if (plan.cleanupRequired !== true) blockers.push('cleanup_required');
  if (plan.rawOutputAllowed === true) blockers.push('raw_output_not_allowed');
  if (plan.durableAuditAllowed === true) blockers.push('durable_audit_not_allowed');
  if (!['temp_local', 'fixture_only'].includes(normalizedStoreScope)) blockers.push('temp_local_execution_scope_required');
  if (normalizedStoreScope === 'real' || normalizedStoreScope === 'production') blockers.push('real_store_scope_not_allowed');
  if (requestedDryRunExecution === true) blockers.push('dry_run_execution_not_authorized');
  if (requestedStartupRecovery === true) blockers.push('startup_recovery_not_authorized');
  if (requestedRuntimeRecovery === true) blockers.push('runtime_recovery_not_authorized');
  if (requestedManifestRecovery === true) blockers.push('manifest_recovery_not_authorized');
  if (requestedManifestRepair === true) blockers.push('manifest_repair_not_authorized');
  if (requestedManifestCancel === true) blockers.push('manifest_cancel_not_authorized');
  if (requestedReconcileReplay === true) blockers.push('reconcile_replay_not_authorized');
  if (requestedDurableAuditWrite === true) blockers.push('durable_audit_write_not_authorized');
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
    taskId: STARTUP_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_TASK_ID,
    accepted,
    status: accepted
      ? 'temp_local_startup_recovery_dry_run_execution_preflight_ready_not_executed'
      : 'temp_local_startup_recovery_dry_run_execution_preflight_blocked',
    mode: normalizedMode || null,
    source: normalizedSource || null,
    blockerReasons: blockers,
    priorDryRunHarnessAccepted: harnessAccepted,
    executionPlan: {
      dryRun: plan.dryRun === true,
      apply: plan.apply === true,
      confirm: plan.confirm === true,
      maxRuns: Number.isInteger(plan.maxRuns) ? plan.maxRuns : null,
      isolatedTempRoot: plan.isolatedTempRoot === true,
      cleanupRequired: plan.cleanupRequired === true,
      rawOutputAllowed: plan.rawOutputAllowed === true,
      durableAuditAllowed: plan.durableAuditAllowed === true,
      storeScope: normalizedStoreScope || null,
      candidateLimits: {
        pendingManifestCandidates: harnessAccepted ? priorDryRunHarness.dryRunPlan.pendingManifestCandidates : null,
        degradedManifestCandidates: harnessAccepted ? priorDryRunHarness.dryRunPlan.degradedManifestCandidates : null,
        reconcileReplayCandidates: harnessAccepted ? priorDryRunHarness.dryRunPlan.reconcileReplayCandidates : null
      },
      nextAllowedAction: accepted
        ? 'request_exact_temp_local_dry_run_execution_approval_only'
        : 'resolve_temp_local_dry_run_execution_preflight_blockers'
    },
    dryRunExecutionPreflightReady: accepted,
    dryRunExecutionApproved: false,
    dryRunExecuted: false,
    startupRecoveryExecuted: false,
    runtimeRecoveryExecuted: false,
    manifestRecoveryExecuted: false,
    manifestRepairExecuted: false,
    manifestCancelExecuted: false,
    reconcileReplayExecuted: false,
    durableAuditWritten: false,
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
    applyGate: buildStartupRecoveryDryRunExecutionPreflightApplyGate()
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
  ACCEPTED_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_MODE,
  ACCEPTED_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_SOURCES,
  ACCEPTED_RECOVERY_DRY_RUN_MODE,
  ACCEPTED_RECOVERY_DRY_RUN_SOURCES,
  ACCEPTED_RECOVERY_MODE,
  ACCEPTED_RECOVERY_POLICY_MODE,
  ACCEPTED_RECOVERY_POLICY_SOURCES,
  ACCEPTED_RECOVERY_SOURCES,
  ACCEPTED_SOURCES,
  STARTUP_RECOVERY_POLICY_TASK_ID,
  STARTUP_RECOVERY_DRY_RUN_EXECUTION_PREFLIGHT_TASK_ID,
  STARTUP_RECOVERY_DRY_RUN_TASK_ID,
  STARTUP_RECOVERY_TASK_ID,
  TASK_ID,
  buildGuardedStartupRecoveryPolicyDesign,
  buildStartupRecoverySafetyPreflight,
  buildStartupSafetyReport,
  buildTempLocalStartupRecoveryDryRunExecutionPreflight,
  buildTempLocalStartupRecoveryDryRunHarness,
  sanitizeStartupRecoveryHealth,
  sanitizeWorkerStatus
};
