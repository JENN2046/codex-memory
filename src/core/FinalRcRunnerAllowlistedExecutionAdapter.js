const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  evaluateFinalRcRunnerCommandResults
} = require('./FinalRcRunnerCommandResultContract');
const {
  evaluateFinalRcRunnerExecutionPreflight,
  normalizeFinalRcRunnerExecutionPreflightInput
} = require('./FinalRcRunnerExecutionPreflight');

const EXPECTED_EXECUTION_SCHEMA_VERSION = 'p54-final-rc-runner-allowlisted-execution-v1';
const EXPECTED_EXECUTION_MODE = 'local_allowlisted_injected_executor';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeExecutionInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    mode: normalizeString(safeInput.mode),
    preflightInput: isPlainObject(safeInput.preflightInput)
      ? normalizeFinalRcRunnerExecutionPreflightInput(safeInput.preflightInput)
      : null,
    execute: normalizeBoolean(safeInput.execute),
    dryRun: safeInput.dryRun !== false,
    readinessClaimed: normalizeBoolean(safeInput.readinessClaimed),
    allowServiceStart: normalizeBoolean(safeInput.allowServiceStart),
    allowProviderCall: normalizeBoolean(safeInput.allowProviderCall),
    allowRealMemoryAccess: normalizeBoolean(safeInput.allowRealMemoryAccess),
    allowDurableWrite: normalizeBoolean(safeInput.allowDurableWrite),
    allowPublicMcpExpansion: normalizeBoolean(safeInput.allowPublicMcpExpansion),
    allowRemoteWrite: normalizeBoolean(safeInput.allowRemoteWrite)
  };
}

function normalizeExecutorResult(command, rawResult = {}) {
  const safeResult = isPlainObject(rawResult) ? rawResult : {};

  return {
    id: normalizeString(safeResult.id || command.id),
    status: normalizeString(safeResult.status),
    exitCode: Number.isInteger(safeResult.exitCode) ? safeResult.exitCode : null,
    stale: normalizeBoolean(safeResult.stale),
    skipped: normalizeBoolean(safeResult.skipped),
    warningOnly: normalizeBoolean(safeResult.warningOnly),
    unsupported: normalizeBoolean(safeResult.unsupported),
    executedByHelper: false,
    providerCalls: Number.isFinite(safeResult.providerCalls) ? safeResult.providerCalls : 0,
    serviceStarted: normalizeBoolean(safeResult.serviceStarted),
    realMemoryTouched: normalizeBoolean(safeResult.realMemoryTouched),
    runtimeStoresScanned: normalizeBoolean(safeResult.runtimeStoresScanned),
    durableStateTouched: normalizeBoolean(safeResult.durableStateTouched),
    publicMcpExpanded: normalizeBoolean(safeResult.publicMcpExpanded),
    remoteWrite: normalizeBoolean(safeResult.remoteWrite),
    summary: normalizeString(safeResult.summary)
  };
}

function buildBlockedResult(normalized, preflight, failClosedReasons) {
  return {
    schemaVersion: EXPECTED_EXECUTION_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    adapterAccepted: false,
    localCommandsExecutedViaInjectedExecutor: false,
    finalRcMatrixExecuted: false,
    commandEvidenceAccepted: false,
    canClaimFinalRcReady: false,
    canClaimRuntimeReady: false,
    canClaimV1RcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    preflight: {
      accepted: preflight.preflightAccepted === true,
      status: preflight.status || 'blocked_fail_closed',
      failClosedReasons: Array.isArray(preflight.failClosedReasons) ? preflight.failClosedReasons : []
    },
    commandResults: {
      count: 0,
      exact: false,
      unsafeIds: []
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      importsChildProcess: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      scansRuntimeStores: false,
      readsRealMemory: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      localInjectedExecutionAdapterReady: false,
      commandResultsAccepted: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false
    },
    normalizedRequest: {
      schemaVersion: normalized.schemaVersion,
      mode: normalized.mode,
      execute: normalized.execute,
      dryRun: normalized.dryRun
    }
  };
}

function executeFinalRcRunnerAllowlistedPlan(input = {}, options = {}) {
  const normalized = normalizeExecutionInput(input);
  const rawPreflightInput = isPlainObject(input) && isPlainObject(input.preflightInput)
    ? input.preflightInput
    : null;
  const preflight = rawPreflightInput
    ? evaluateFinalRcRunnerExecutionPreflight(rawPreflightInput)
    : { preflightAccepted: false, status: 'blocked_fail_closed', failClosedReasons: ['missing_preflight_input'] };
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_EXECUTION_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.mode !== EXPECTED_EXECUTION_MODE) failClosedReasons.push('mode_mismatch');
  if (preflight.preflightAccepted !== true) failClosedReasons.push('preflight_not_accepted');
  if (normalized.execute !== true) failClosedReasons.push('execute_not_requested');
  if (normalized.dryRun !== false) failClosedReasons.push('dry_run_only');
  if (typeof options.executor !== 'function') failClosedReasons.push('missing_injected_executor');

  const unsafePermissionClaim =
    normalized.readinessClaimed === true ||
    normalized.allowServiceStart === true ||
    normalized.allowProviderCall === true ||
    normalized.allowRealMemoryAccess === true ||
    normalized.allowDurableWrite === true ||
    normalized.allowPublicMcpExpansion === true ||
    normalized.allowRemoteWrite === true;

  if (unsafePermissionClaim) failClosedReasons.push('unsafe_permission_claim');

  if (failClosedReasons.length > 0) {
    return buildBlockedResult(normalized, preflight, failClosedReasons);
  }

  const commandResults = [];

  try {
    for (const command of preflight.executionPlan.commands) {
      const rawResult = options.executor({
        id: command.id,
        class: command.class,
        command: command.command
      });
      commandResults.push(normalizeExecutorResult(command, rawResult));
    }
  } catch (error) {
    return buildBlockedResult(normalized, preflight, [
      'executor_threw',
      normalizeString(error && error.message ? error.message : 'unknown_executor_error')
    ]);
  }

  const resultEvaluation = evaluateFinalRcRunnerCommandResults({
    inventory: rawPreflightInput.inventory,
    commandResults
  });
  const accepted = resultEvaluation.commandEvidenceAccepted === true;

  return {
    schemaVersion: EXPECTED_EXECUTION_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'local_allowlisted_execution_passed_rc_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    adapterAccepted: accepted,
    localCommandsExecutedViaInjectedExecutor: true,
    finalRcMatrixExecuted: false,
    commandEvidenceAccepted: accepted,
    canClaimFinalRcReady: false,
    canClaimRuntimeReady: false,
    canClaimV1RcReady: false,
    failClosedReasons: accepted ? [] : resultEvaluation.failClosedReasons,
    preflight: {
      accepted: true,
      status: preflight.status,
      failClosedReasons: []
    },
    commandResults: resultEvaluation.commandResults,
    blockedActions: resultEvaluation.blockedActions,
    safety: {
      readsFiles: false,
      scansDirectories: false,
      importsChildProcess: false,
      executesCommands: true,
      startsServices: false,
      callsProviders: false,
      scansRuntimeStores: false,
      readsRealMemory: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      localInjectedExecutionAdapterReady: accepted,
      commandResultsAccepted: accepted,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false
    },
    normalizedRequest: {
      schemaVersion: normalized.schemaVersion,
      mode: normalized.mode,
      execute: normalized.execute,
      dryRun: normalized.dryRun
    }
  };
}

module.exports = {
  EXPECTED_EXECUTION_MODE,
  EXPECTED_EXECUTION_SCHEMA_VERSION,
  executeFinalRcRunnerAllowlistedPlan,
  normalizeFinalRcRunnerAllowlistedExecutionInput: normalizeExecutionInput
};
