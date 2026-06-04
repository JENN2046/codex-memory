const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p54-final-rc-runner-safe-command-inventory-v1';
const EXPECTED_MODE = 'fixture-only-command-inventory';
const EXPECTED_OUTPUT_SCHEMA_VERSION = 'p54-final-rc-runner-output-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const SAFE_COMMAND_CLASSES = Object.freeze([
  'syntax_check',
  'targeted_node_test',
  'full_local_test_suite',
  'docs_validation',
  'git_diff_check'
]);

const FAIL_CLOSED_STATES = Object.freeze([
  'missing',
  'unknown',
  'skipped',
  'warning',
  'warning_only',
  'failed',
  'stale',
  'ambiguous',
  'unparsable',
  'unsupported',
  'duplicate'
]);

const REQUIRED_BLOCKED_ACTIONS = Object.freeze([
  'read_fixture_implicitly',
  'scan_directory_for_evidence',
  'execute_unlisted_command',
  'start_service',
  'refresh_live_mcp',
  'provider_call',
  'real_memory_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'runtime_store_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'config_switch',
  'watchdog_install',
  'public_mcp_expansion',
  'dependency_change',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return cloneArray(values)
    .map(normalizeString)
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value, fallback = null) {
  return Number.isInteger(value) ? value : fallback;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    requiredValues.every(value => values.includes(value));
}

function collectDuplicateValues(values) {
  return uniqueValues(values).filter(value => values.filter(candidate => candidate === value).length > 1);
}

function normalizeAllowedCommand(command = {}) {
  const safeCommand = isPlainObject(command) ? command : {};

  return {
    id: normalizeString(safeCommand.id),
    class: normalizeString(safeCommand.class),
    command: normalizeString(safeCommand.command),
    critical: normalizeBoolean(safeCommand.critical)
  };
}

function normalizeCriticalGateSemantics(semantics = {}) {
  const safeSemantics = isPlainObject(semantics) ? semantics : {};

  return {
    acceptedPassStates: normalizeStringArray(safeSemantics.acceptedPassStates),
    failClosedStates: normalizeStringArray(safeSemantics.failClosedStates),
    criticalSkippedEqualsFailure: normalizeBoolean(safeSemantics.criticalSkippedEqualsFailure),
    criticalWarningOnlyEqualsFailure: normalizeBoolean(safeSemantics.criticalWarningOnlyEqualsFailure),
    unsupportedCommandEqualsFailure: normalizeBoolean(safeSemantics.unsupportedCommandEqualsFailure),
    duplicateCommandIdEqualsFailure: normalizeBoolean(safeSemantics.duplicateCommandIdEqualsFailure),
    staleEvidenceEqualsFailure: normalizeBoolean(safeSemantics.staleEvidenceEqualsFailure)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    localCommandInventoryReady: normalizeBoolean(safeReadiness.localCommandInventoryReady),
    runnerExecutionReady: normalizeBoolean(safeReadiness.runnerExecutionReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    pushReady: normalizeBoolean(safeReadiness.pushReady),
    releaseReady: normalizeBoolean(safeReadiness.releaseReady),
    deployReady: normalizeBoolean(safeReadiness.deployReady),
    configSwitchReady: normalizeBoolean(safeReadiness.configSwitchReady),
    watchdogReady: normalizeBoolean(safeReadiness.watchdogReady)
  };
}

function normalizeInventory(inventory = {}) {
  const safeInventory = isPlainObject(inventory) ? inventory : {};

  return {
    schemaVersion: normalizeString(safeInventory.schemaVersion),
    mode: normalizeString(safeInventory.mode),
    fixtureOnly: normalizeBoolean(safeInventory.fixtureOnly),
    synthetic: normalizeBoolean(safeInventory.synthetic),
    runnerImplemented: normalizeBoolean(safeInventory.runnerImplemented),
    runnerExecuted: normalizeBoolean(safeInventory.runnerExecuted),
    commandsExecuted: normalizeBoolean(safeInventory.commandsExecuted),
    finalRcMatrixExecuted: normalizeBoolean(safeInventory.finalRcMatrixExecuted),
    decision: normalizeString(safeInventory.decision),
    publicMcpTools: normalizeStringArray(safeInventory.publicMcpTools),
    allowedCommandClasses: normalizeStringArray(safeInventory.allowedCommandClasses),
    allowedCommands: cloneArray(safeInventory.allowedCommands).map(normalizeAllowedCommand),
    criticalGateSemantics: normalizeCriticalGateSemantics(safeInventory.criticalGateSemantics),
    blockedActions: normalizeStringArray(safeInventory.blockedActions),
    readiness: normalizeReadiness(safeInventory.readiness)
  };
}

function normalizeCommandResult(result = {}) {
  const safeResult = isPlainObject(result) ? result : {};

  return {
    id: normalizeString(safeResult.id),
    status: normalizeString(safeResult.status),
    exitCode: normalizeInteger(safeResult.exitCode),
    stale: normalizeBoolean(safeResult.stale),
    skipped: normalizeBoolean(safeResult.skipped),
    warningOnly: normalizeBoolean(safeResult.warningOnly),
    unsupported: normalizeBoolean(safeResult.unsupported),
    executedByHelper: normalizeBoolean(safeResult.executedByHelper),
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

function normalizeFinalRcRunnerCommandResultInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    inventory: normalizeInventory(safeInput.inventory),
    commandResults: cloneArray(safeInput.commandResults).map(normalizeCommandResult)
  };
}

function evaluateFinalRcRunnerCommandResults(input = {}) {
  const normalized = normalizeFinalRcRunnerCommandResultInput(input);
  const allowedIds = normalized.inventory.allowedCommands.map(command => command.id).filter(Boolean);
  const resultIds = normalized.commandResults.map(result => result.id).filter(Boolean);
  const duplicateAllowedCommandIds = collectDuplicateValues(allowedIds);
  const duplicateResultIds = collectDuplicateValues(resultIds);
  const unsupportedResultIds = resultIds.filter(id => !allowedIds.includes(id));
  const missingResultIds = allowedIds.filter(id => !resultIds.includes(id));
  const commandClassesSafe = normalized.inventory.allowedCommandClasses.length > 0 &&
    hasExactSet(normalized.inventory.allowedCommandClasses, SAFE_COMMAND_CLASSES);
  const allowedCommandsExact = allowedIds.length > 0 &&
    duplicateAllowedCommandIds.length === 0 &&
    normalized.inventory.allowedCommands.every(command =>
      command.id &&
      SAFE_COMMAND_CLASSES.includes(command.class) &&
      command.command &&
      command.critical === true
    );
  const criticalGateSemanticsSafe =
    hasExactSet(normalized.inventory.criticalGateSemantics.acceptedPassStates, ['passed']) &&
    hasExactSet(normalized.inventory.criticalGateSemantics.failClosedStates, FAIL_CLOSED_STATES) &&
    normalized.inventory.criticalGateSemantics.criticalSkippedEqualsFailure === true &&
    normalized.inventory.criticalGateSemantics.criticalWarningOnlyEqualsFailure === true &&
    normalized.inventory.criticalGateSemantics.unsupportedCommandEqualsFailure === true &&
    normalized.inventory.criticalGateSemantics.duplicateCommandIdEqualsFailure === true &&
    normalized.inventory.criticalGateSemantics.staleEvidenceEqualsFailure === true;
  const inventorySafe =
    normalized.inventory.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.inventory.mode === EXPECTED_MODE &&
    normalized.inventory.fixtureOnly === true &&
    normalized.inventory.synthetic === true &&
    normalized.inventory.runnerImplemented === false &&
    normalized.inventory.runnerExecuted === false &&
    normalized.inventory.commandsExecuted === false &&
    normalized.inventory.finalRcMatrixExecuted === false &&
    normalized.inventory.decision === 'NOT_READY_BLOCKED' &&
    hasExactSet(normalized.inventory.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    commandClassesSafe &&
    allowedCommandsExact &&
    criticalGateSemanticsSafe &&
    hasExactSet(normalized.inventory.blockedActions, REQUIRED_BLOCKED_ACTIONS) &&
    normalized.inventory.readiness.localCommandInventoryReady === true &&
    normalized.inventory.readiness.runnerExecutionReady === false &&
    normalized.inventory.readiness.runtimeReady === false &&
    normalized.inventory.readiness.finalRcMatrixReady === false &&
    normalized.inventory.readiness.v1RcReady === false;
  const unsafeResults = normalized.commandResults.filter(result =>
    result.status !== 'passed' ||
    result.exitCode !== 0 ||
    result.stale === true ||
    result.skipped === true ||
    result.warningOnly === true ||
    result.unsupported === true ||
    result.executedByHelper === true ||
    result.providerCalls !== 0 ||
    result.serviceStarted === true ||
    result.realMemoryTouched === true ||
    result.runtimeStoresScanned === true ||
    result.durableStateTouched === true ||
    result.publicMcpExpanded === true ||
    result.remoteWrite === true
  );
  const resultSetExact = allowedIds.length > 0 &&
    missingResultIds.length === 0 &&
    unsupportedResultIds.length === 0 &&
    duplicateResultIds.length === 0 &&
    normalized.commandResults.length === allowedIds.length;
  const allCriticalPassed = inventorySafe &&
    resultSetExact &&
    unsafeResults.length === 0;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (!inventorySafe) failClosedReasons.push('unsafe_or_malformed_inventory');
  if (!allowedCommandsExact) failClosedReasons.push('allowed_commands_not_exact');
  if (missingResultIds.length > 0) failClosedReasons.push('missing_command_result');
  if (unsupportedResultIds.length > 0) failClosedReasons.push('unsupported_command_result');
  if (duplicateResultIds.length > 0 || duplicateAllowedCommandIds.length > 0) {
    failClosedReasons.push('duplicate_command_id');
  }
  if (unsafeResults.length > 0) failClosedReasons.push('critical_command_not_passed');

  return {
    schemaVersion: EXPECTED_OUTPUT_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: allCriticalPassed ? 'local_command_results_passed_rc_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    commandEvidenceAccepted: allCriticalPassed,
    allCriticalCommandsPassed: allCriticalPassed,
    runnerImplemented: false,
    runnerExecuted: false,
    commandsExecutedByHelper: false,
    finalRcMatrixExecuted: false,
    canExecuteRunner: false,
    canClaimFinalRcReady: false,
    canClaimRuntimeReady: false,
    canClaimV1RcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    inventory: {
      safe: inventorySafe,
      schemaVersion: normalized.inventory.schemaVersion,
      allowedCommandCount: allowedIds.length,
      duplicateAllowedCommandIds,
      allowedCommandClasses: normalized.inventory.allowedCommandClasses,
      publicMcpFrozen: hasExactSet(normalized.inventory.publicMcpTools, PUBLIC_MCP_TOOLS),
      criticalGateSemanticsSafe
    },
    commandResults: {
      count: normalized.commandResults.length,
      exact: resultSetExact,
      missingIds: missingResultIds,
      unsupportedIds: unsupportedResultIds,
      duplicateIds: duplicateResultIds,
      unsafeIds: unsafeResults.map(result => result.id).filter(Boolean),
      ids: resultIds,
      summaries: normalized.commandResults.map(result => ({
        id: result.id,
        status: result.status,
        exitCode: result.exitCode,
        stale: result.stale,
        skipped: result.skipped,
        warningOnly: result.warningOnly,
        summary: result.summary
      }))
    },
    blockedActions: {
      preserved: hasExactSet(normalized.inventory.blockedActions, REQUIRED_BLOCKED_ACTIONS),
      actions: normalized.inventory.blockedActions
    },
    readiness: {
      localCommandInventoryReady: normalized.inventory.readiness.localCommandInventoryReady,
      commandResultsAccepted: allCriticalPassed,
      runnerExecutionReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      scansRuntimeStores: false,
      readsRealMemory: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    }
  };
}

module.exports = {
  EXPECTED_OUTPUT_SCHEMA_VERSION,
  EXPECTED_SCHEMA_VERSION,
  FAIL_CLOSED_STATES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_ACTIONS,
  SAFE_COMMAND_CLASSES,
  evaluateFinalRcRunnerCommandResults,
  normalizeFinalRcRunnerCommandResultInput
};
