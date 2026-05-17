const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_ACTIONS,
  SAFE_COMMAND_CLASSES
} = require('./FinalRcRunnerCommandResultContract');

const EXPECTED_PREFLIGHT_SCHEMA_VERSION = 'p54-final-rc-runner-execution-preflight-v1';
const EXPECTED_PREFLIGHT_MODE = 'local_allowlisted_preflight';

const REJECTED_COMMAND_FRAGMENTS = Object.freeze([
  'start:http',
  'watchdog',
  'provider-smoke',
  'provider-benchmark',
  'rebuild-profile -- --confirm',
  'cleanup-legacy-chunks -- --apply',
  'rebuild-shadow',
  'migration-readiness -- --apply',
  'git push',
  'git tag',
  'gh release',
  'backup',
  'restore'
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

function uniqueValues(values) {
  return [...new Set(values)];
}

function collectDuplicateValues(values) {
  return uniqueValues(values).filter(value => values.filter(candidate => candidate === value).length > 1);
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    requiredValues.every(value => values.includes(value));
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
    blockedActions: normalizeStringArray(safeInventory.blockedActions),
    rejectedCommands: normalizeStringArray(safeInventory.rejectedCommands)
  };
}

function normalizePreflightInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    mode: normalizeString(safeInput.mode),
    inventory: normalizeInventory(safeInput.inventory),
    requestedCommandIds: normalizeStringArray(safeInput.requestedCommandIds),
    executeNow: normalizeBoolean(safeInput.executeNow),
    startServices: normalizeBoolean(safeInput.startServices),
    callProviders: normalizeBoolean(safeInput.callProviders),
    scanRealMemory: normalizeBoolean(safeInput.scanRealMemory),
    mutateDurableState: normalizeBoolean(safeInput.mutateDurableState),
    expandPublicMcp: normalizeBoolean(safeInput.expandPublicMcp),
    remoteWrite: normalizeBoolean(safeInput.remoteWrite),
    readinessClaimed: normalizeBoolean(safeInput.readinessClaimed)
  };
}

function commandHasRejectedFragment(commandText, rejectedFragments = REJECTED_COMMAND_FRAGMENTS) {
  const loweredCommand = commandText.toLowerCase();
  return rejectedFragments.some(fragment => loweredCommand.includes(fragment.toLowerCase()));
}

function evaluateFinalRcRunnerExecutionPreflight(input = {}) {
  const normalized = normalizePreflightInput(input);
  const allowedCommands = normalized.inventory.allowedCommands;
  const allowedCommandIds = allowedCommands.map(command => command.id).filter(Boolean);
  const requestedIds = normalized.requestedCommandIds;
  const duplicateAllowedCommandIds = collectDuplicateValues(allowedCommandIds);
  const duplicateRequestedCommandIds = collectDuplicateValues(requestedIds);
  const unsupportedRequestedCommandIds = requestedIds.filter(id => !allowedCommandIds.includes(id));
  const missingCriticalCommandIds = allowedCommandIds.filter(id => !requestedIds.includes(id));
  const unsafeAllowedCommands = allowedCommands.filter(command =>
    !command.id ||
    !SAFE_COMMAND_CLASSES.includes(command.class) ||
    command.critical !== true ||
    !command.command ||
    commandHasRejectedFragment(command.command, [
      ...REJECTED_COMMAND_FRAGMENTS,
      ...normalized.inventory.rejectedCommands
    ])
  );
  const inventorySafe =
    normalized.inventory.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.inventory.mode === 'fixture-only-command-inventory' &&
    normalized.inventory.fixtureOnly === true &&
    normalized.inventory.synthetic === true &&
    normalized.inventory.runnerImplemented === false &&
    normalized.inventory.runnerExecuted === false &&
    normalized.inventory.commandsExecuted === false &&
    normalized.inventory.finalRcMatrixExecuted === false &&
    normalized.inventory.decision === 'NOT_READY_BLOCKED' &&
    hasExactSet(normalized.inventory.publicMcpTools, PUBLIC_MCP_TOOLS) &&
    hasExactSet(normalized.inventory.allowedCommandClasses, SAFE_COMMAND_CLASSES) &&
    hasExactSet(normalized.inventory.blockedActions, REQUIRED_BLOCKED_ACTIONS) &&
    allowedCommandIds.length > 0 &&
    duplicateAllowedCommandIds.length === 0 &&
    unsafeAllowedCommands.length === 0;
  const requestExact =
    requestedIds.length > 0 &&
    missingCriticalCommandIds.length === 0 &&
    unsupportedRequestedCommandIds.length === 0 &&
    duplicateRequestedCommandIds.length === 0 &&
    requestedIds.length === allowedCommandIds.length;
  const unsafeExecutionClaim =
    normalized.executeNow === true ||
    normalized.startServices === true ||
    normalized.callProviders === true ||
    normalized.scanRealMemory === true ||
    normalized.mutateDurableState === true ||
    normalized.expandPublicMcp === true ||
    normalized.remoteWrite === true ||
    normalized.readinessClaimed === true;
  const preflightAccepted =
    isPlainObject(input) &&
    normalized.schemaVersion === EXPECTED_PREFLIGHT_SCHEMA_VERSION &&
    normalized.mode === EXPECTED_PREFLIGHT_MODE &&
    inventorySafe &&
    requestExact &&
    unsafeExecutionClaim === false;
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_PREFLIGHT_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.mode !== EXPECTED_PREFLIGHT_MODE) failClosedReasons.push('mode_mismatch');
  if (!inventorySafe) failClosedReasons.push('unsafe_inventory');
  if (missingCriticalCommandIds.length > 0) failClosedReasons.push('missing_critical_command');
  if (unsupportedRequestedCommandIds.length > 0) failClosedReasons.push('unsupported_command');
  if (duplicateRequestedCommandIds.length > 0 || duplicateAllowedCommandIds.length > 0) {
    failClosedReasons.push('duplicate_command_id');
  }
  if (unsafeAllowedCommands.length > 0) failClosedReasons.push('rejected_command_fragment');
  if (unsafeExecutionClaim) failClosedReasons.push('unsafe_execution_claim');

  return {
    schemaVersion: EXPECTED_PREFLIGHT_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: preflightAccepted ? 'preflight_passed_execution_still_not_run' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    preflightAccepted,
    runnerImplemented: false,
    runnerExecuted: false,
    commandsExecuted: false,
    finalRcMatrixExecuted: false,
    canExecuteAllowlistedLocalCommandsInFuture: preflightAccepted,
    canClaimFinalRcReady: false,
    canClaimRuntimeReady: false,
    canClaimV1RcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    inventory: {
      safe: inventorySafe,
      allowedCommandCount: allowedCommandIds.length,
      duplicateAllowedCommandIds,
      unsafeAllowedCommandIds: unsafeAllowedCommands.map(command => command.id).filter(Boolean)
    },
    request: {
      exact: requestExact,
      requestedCommandIds: requestedIds,
      missingCriticalCommandIds,
      unsupportedCommandIds: unsupportedRequestedCommandIds,
      duplicateCommandIds: duplicateRequestedCommandIds
    },
    executionPlan: {
      commandCount: preflightAccepted ? allowedCommands.length : 0,
      commands: preflightAccepted
        ? allowedCommands.map(command => ({
            id: command.id,
            class: command.class,
            command: command.command
          }))
        : [],
      executesNow: false
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
    },
    readiness: {
      localExecutionPreflightReady: preflightAccepted,
      runnerExecutionReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false
    }
  };
}

module.exports = {
  EXPECTED_PREFLIGHT_MODE,
  EXPECTED_PREFLIGHT_SCHEMA_VERSION,
  REJECTED_COMMAND_FRAGMENTS,
  evaluateFinalRcRunnerExecutionPreflight,
  normalizeFinalRcRunnerExecutionPreflightInput: normalizePreflightInput
};
