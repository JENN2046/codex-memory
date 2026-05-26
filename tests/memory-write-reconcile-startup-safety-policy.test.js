'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const {
  ACCEPTED_MODE,
  ACCEPTED_RECOVERY_MODE,
  buildStartupRecoverySafetyPreflight,
  buildStartupSafetyReport,
  sanitizeStartupRecoveryHealth,
  sanitizeWorkerStatus
} = require('../src/core/MemoryWriteReconcileStartupSafetyPolicy');

function createConfig(rootPath) {
  return {
    defaultRequestSource: 'cm1084-startup-worker-safety-test',
    dailyNoteRootPath: path.join(rootPath, 'daily-notes'),
    dailyNoteExtension: 'md',
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    auditLogPath: path.join(rootPath, 'audit', 'write-audit.jsonl'),
    recallLogPath: path.join(rootPath, 'audit', 'recall-audit.jsonl'),
    vectorIndexPath: path.join(rootPath, 'vector', 'index.json'),
    embeddingFingerprint: 'cm1084-temp-local-startup-safety-v1',
    embedDimensions: 32,
    enableShadowWrites: true,
    enableVectorIndex: true,
    enableEmbeddingCache: true
  };
}

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name).sort();
}

test('CM-1084 startup safety review accepts temp-local app initialization only when worker stays idle', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1084-app-idle-'));
  const app = createCodexMemoryApplication(createConfig(rootPath));

  try {
    await app.initialize();
    const workerStatus = app.services.memoryWriteReconcileWorker.getStatus();
    const report = buildStartupSafetyReport({
      mode: ACCEPTED_MODE,
      source: 'temp_local_app_initialization_fixture',
      workerStatus
    });

    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    assert.equal(report.accepted, true);
    assert.equal(report.status, 'startup_safety_review_passed_not_enabled');
    assert.equal(report.workerStatus.running, false);
    assert.equal(report.workerStatus.timerScheduled, false);
    assert.equal(report.workerStatus.tickInFlight, false);
    assert.equal(report.startupWorkerEnabled, false);
    assert.equal(report.runtimeWorkerStarted, false);
    assert.equal(report.configChanged, false);
    assert.equal(report.watchdogChanged, false);
    assert.equal(report.startupTaskChanged, false);
    assert.equal(report.publicMcpExpansion, false);
    assert.equal(report.readinessClaimed, false);
    assert.equal(report.reliabilityClaimed, false);
    assert.equal(report.applyGate.startupEnablementExecuted, false);
    assert.deepEqual(publicToolNames(), ['memory_overview', 'record_memory', 'search_memory']);
    await assert.rejects(
      () => app.callTool('memory_write_reconcile_worker_startup', {}),
      /Unknown tool: memory_write_reconcile_worker_startup/
    );
  } finally {
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});

test('CM-1084 startup safety review blocks startup, runtime, config, watchdog, and public MCP requests', () => {
  const report = buildStartupSafetyReport({
    mode: ACCEPTED_MODE,
    source: 'temp_local_worker_status_fixture',
    workerStatus: {
      running: false,
      timerScheduled: false,
      tickInFlight: false,
      runCount: 0,
      intervalMs: 60_000,
      limit: null,
      dryRun: false,
      maxRuns: null
    },
    requestedStartupEnablement: true,
    requestedRuntimeStart: true,
    requestedConfigChange: true,
    requestedWatchdogChange: true,
    requestedStartupTaskChange: true,
    requestedPublicMcpExpansion: true
  });

  assert.equal(report.accepted, false);
  assert.equal(report.status, 'startup_safety_review_blocked');
  assert.ok(report.blockerReasons.includes('startup_enablement_not_authorized'));
  assert.ok(report.blockerReasons.includes('runtime_worker_start_not_authorized'));
  assert.ok(report.blockerReasons.includes('config_change_not_authorized'));
  assert.ok(report.blockerReasons.includes('watchdog_change_not_authorized'));
  assert.ok(report.blockerReasons.includes('startup_task_change_not_authorized'));
  assert.ok(report.blockerReasons.includes('public_mcp_expansion_not_authorized'));
  assert.equal(report.applyGate.startupEnablementApproved, false);
  assert.equal(report.applyGate.startupEnablementExecuted, false);
  assert.equal(report.applyGate.configChangeExecuted, false);
  assert.equal(report.applyGate.watchdogChangeExecuted, false);
});

test('CM-1084 startup safety review blocks already-running or in-flight worker state', () => {
  const report = buildStartupSafetyReport({
    mode: ACCEPTED_MODE,
    source: 'temp_local_worker_status_fixture',
    workerStatus: {
      running: true,
      timerScheduled: true,
      tickInFlight: true,
      runCount: 1,
      intervalMs: 250,
      limit: 5,
      dryRun: true,
      maxRuns: 1
    }
  });

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('worker_already_running'));
  assert.ok(report.blockerReasons.includes('worker_timer_already_scheduled'));
  assert.ok(report.blockerReasons.includes('worker_tick_in_flight'));
  assert.equal(report.startupWorkerEnabled, false);
  assert.equal(report.runtimeWorkerStarted, false);
});

test('CM-1084 startup safety review requires exact mode, source, and worker status', () => {
  const report = buildStartupSafetyReport({
    mode: 'start_worker_now',
    source: 'real_startup_config',
    workerStatus: null
  });

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('startup_safety_review_mode_required'));
  assert.ok(report.blockerReasons.includes('temp_local_startup_safety_source_required'));
  assert.ok(report.blockerReasons.includes('worker_status_required'));
  assert.equal(report.startupWorkerSafetyReviewed, false);
});

test('CM-1084 worker status sanitizer omits raw errors, results, and memory ids', () => {
  const sanitized = sanitizeWorkerStatus({
    running: false,
    timerScheduled: false,
    tickInFlight: false,
    runCount: 2,
    intervalMs: 250,
    limit: 5,
    dryRun: true,
    maxRuns: 2,
    rawError: 'raw failure for codex-process-cm1084-secret',
    results: [{ memoryId: 'codex-process-cm1084-secret' }],
    lastResultSummary: {
      success: false,
      decision: 'completed_with_failures',
      workerDecision: 'run_once_completed',
      dryRun: true,
      limit: 5,
      scannedTaskCount: 2,
      failedCount: 1,
      hasError: true,
      error: 'raw nested failure codex-process-cm1084-secret',
      results: [{ memoryId: 'codex-process-cm1084-secret' }]
    }
  });

  assert.deepEqual(sanitized, {
    running: false,
    timerScheduled: false,
    tickInFlight: false,
    runCount: 2,
    intervalMs: 250,
    limit: 5,
    dryRun: true,
    maxRuns: 2,
    lastResultSummary: {
      success: false,
      decision: 'completed_with_failures',
      workerDecision: 'run_once_completed',
      dryRun: true,
      limit: 5,
      scannedTaskCount: 2,
      failedCount: 1,
      hasError: true
    }
  });
  assert.equal(JSON.stringify(sanitized).includes('codex-process-cm1084-secret'), false);
  assert.equal(JSON.stringify(sanitized).includes('raw nested failure'), false);
});

test('CM-1166 startup recovery preflight observes pending manifest without enabling recovery', async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1166-startup-recovery-'));
  const config = createConfig(rootPath);
  const idempotencyKey = 'memory-write-v1:cm1166-startup-recovery-pending';
  const memoryId = 'codex-process-cm1166startuprecovery00000001';
  const canonicalHash = 'cm1166startuprecoverycanonicalhash';
  let setupShadowStore;
  const app = createCodexMemoryApplication(config);

  try {
    setupShadowStore = new SqliteShadowStore(config);
    await setupShadowStore.beginMemoryWriteManifest({
      idempotencyKey,
      memoryId,
      canonicalHash,
      target: 'process'
    });
    await setupShadowStore.close();
    setupShadowStore = null;

    await app.initialize();
    const manifestAfterInitialize = await app.stores.shadowStore.getMemoryWriteManifestByIdempotencyKey(idempotencyKey);
    const report = buildStartupRecoverySafetyPreflight({
      mode: ACCEPTED_RECOVERY_MODE,
      source: 'temp_local_app_initialization_fixture',
      shadowHealth: await app.stores.shadowStore.getHealth(),
      proposedRecoveryLimit: 10,
      proposedRepairLimit: 10,
      proposedCancelLimit: 10
    });

    assert.equal(manifestAfterInitialize.status, 'pending');
    assert.equal(report.accepted, true);
    assert.equal(report.status, 'startup_recovery_safety_preflight_passed_not_enabled');
    assert.equal(report.candidateCounts.pendingManifestCount, 1);
    assert.equal(report.candidateCounts.degradedManifestCount, 0);
    assert.equal(report.candidateCounts.reconcileTaskCount, 0);
    assert.equal(report.startupRecoveryPreflightAccepted, true);
    assert.equal(report.startupRecoveryEnabled, false);
    assert.equal(report.runtimeRecoveryExecuted, false);
    assert.equal(report.manifestRecoveryExecuted, false);
    assert.equal(report.manifestRepairExecuted, false);
    assert.equal(report.manifestCancelExecuted, false);
    assert.equal(report.configChanged, false);
    assert.equal(report.watchdogChanged, false);
    assert.equal(report.publicMcpExpansion, false);
    assert.equal(report.providerCalled, false);
    assert.equal(report.realStoreWritten, false);
    assert.equal(report.readinessClaimed, false);
    assert.equal(report.reliabilityClaimed, false);
    assert.equal(report.boundedPlan.dryRunFirstRequired, true);
    assert.equal(report.boundedPlan.manualApprovalRequired, true);
    assert.equal(report.boundedPlan.startupEnablementRequiresA5Approval, true);
    assert.deepEqual(publicToolNames(), ['memory_overview', 'record_memory', 'search_memory']);
    await assert.rejects(
      () => app.callTool('memory_write_startup_recovery', {}),
      /Unknown tool: memory_write_startup_recovery/
    );
  } finally {
    if (setupShadowStore) {
      await setupShadowStore.close();
    }
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
});

test('CM-1166 startup recovery preflight blocks execution, config, provider, and readiness requests', () => {
  const report = buildStartupRecoverySafetyPreflight({
    mode: ACCEPTED_RECOVERY_MODE,
    source: 'temp_local_write_manifest_health_fixture',
    shadowHealth: {
      available: true,
      authoritativeStore: 'sqlite',
      recordCount: 1,
      chunkCount: 1,
      totalChunkCount: 1,
      reconcileCount: 0,
      writeManifest: {
        total: 1,
        pending: 1,
        committed: 0,
        degraded: 0,
        repaired: 0,
        cancelled: 0,
        failed: 0
      }
    },
    requestedStartupRecovery: true,
    requestedRuntimeRecovery: true,
    requestedConfigChange: true,
    requestedWatchdogChange: true,
    requestedStartupTaskChange: true,
    requestedPublicMcpExpansion: true,
    requestedProviderCall: true,
    requestedRealStoreWrite: true,
    requestedSchemaMigration: true,
    requestedBackupRestore: true,
    requestedImportExport: true,
    readinessClaimed: true,
    reliabilityClaimed: true
  });

  assert.equal(report.accepted, false);
  assert.equal(report.status, 'startup_recovery_safety_preflight_blocked');
  assert.ok(report.blockerReasons.includes('startup_recovery_not_authorized'));
  assert.ok(report.blockerReasons.includes('runtime_recovery_not_authorized'));
  assert.ok(report.blockerReasons.includes('config_change_not_authorized'));
  assert.ok(report.blockerReasons.includes('watchdog_change_not_authorized'));
  assert.ok(report.blockerReasons.includes('startup_task_change_not_authorized'));
  assert.ok(report.blockerReasons.includes('public_mcp_expansion_not_authorized'));
  assert.ok(report.blockerReasons.includes('provider_call_not_authorized'));
  assert.ok(report.blockerReasons.includes('real_store_write_not_authorized'));
  assert.ok(report.blockerReasons.includes('schema_migration_not_authorized'));
  assert.ok(report.blockerReasons.includes('backup_restore_not_authorized'));
  assert.ok(report.blockerReasons.includes('import_export_not_authorized'));
  assert.ok(report.blockerReasons.includes('readiness_claim_not_authorized'));
  assert.ok(report.blockerReasons.includes('reliability_claim_not_authorized'));
  assert.equal(report.applyGate.startupRecoveryExecuted, false);
  assert.equal(report.applyGate.runtimeRecoveryExecuted, false);
  assert.equal(report.applyGate.publicMcpExpansionExecuted, false);
});

test('CM-1166 startup recovery preflight requires exact mode, source, health, and bounded limits', () => {
  const report = buildStartupRecoverySafetyPreflight({
    mode: 'recover_on_startup_now',
    source: 'real_memory_store',
    shadowHealth: {
      available: true,
      recordCount: -1,
      chunkCount: 0,
      totalChunkCount: 0,
      reconcileCount: 0,
      writeManifest: {
        total: 1,
        pending: 'bad',
        committed: null
      }
    },
    proposedRecoveryLimit: 0,
    proposedRepairLimit: 51,
    proposedCancelLimit: 'wide'
  });

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('startup_recovery_safety_preflight_mode_required'));
  assert.ok(report.blockerReasons.includes('temp_local_startup_recovery_source_required'));
  assert.ok(report.blockerReasons.includes('shadow_health_counters_malformed'));
  assert.ok(report.blockerReasons.includes('proposed_recovery_limit_must_be_1_to_50'));
  assert.ok(report.blockerReasons.includes('proposed_repair_limit_must_be_1_to_50'));
  assert.ok(report.blockerReasons.includes('proposed_cancel_limit_must_be_1_to_50'));
});

test('CM-1166 startup recovery health sanitizer omits paths, raw errors, and memory ids', () => {
  const sanitized = sanitizeStartupRecoveryHealth({
    available: true,
    dbPath: 'A:\\secret\\memory.sqlite',
    embeddingFingerprint: 'cm1166-fingerprint',
    rawError: 'raw failure for codex-process-cm1166-secret',
    memoryId: 'codex-process-cm1166-secret',
    authoritativeStore: 'sqlite',
    recordCount: 2,
    chunkCount: 3,
    totalChunkCount: 4,
    reconcileCount: 1,
    writeManifest: {
      total: 4,
      pending: 1,
      committed: 1,
      degraded: 1,
      repaired: 1,
      cancelled: 0,
      failed: 0
    }
  });

  assert.deepEqual(sanitized, {
    available: true,
    authoritativeStore: 'sqlite',
    recordCount: 2,
    chunkCount: 3,
    totalChunkCount: 4,
    reconcileCount: 1,
    writeManifest: {
      total: 4,
      pending: 1,
      committed: 1,
      degraded: 1,
      repaired: 1,
      cancelled: 0,
      failed: 0
    }
  });
  assert.equal(JSON.stringify(sanitized).includes('memory.sqlite'), false);
  assert.equal(JSON.stringify(sanitized).includes('codex-process-cm1166-secret'), false);
  assert.equal(JSON.stringify(sanitized).includes('raw failure'), false);
});
