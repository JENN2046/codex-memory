const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_REJECTION_DEFAULTS = Object.freeze([
  'missing_explicit_evidence',
  'stale_evidence',
  'failed_or_blocked_evidence',
  'unsupported_source_type',
  'side_effect_evidence',
  'sensitive_fragment',
  'real_memory_preview',
  'durable_mutation',
  'public_mcp_expansion',
  'remote_write'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'full-final-rc-matrix-not-executed',
  'schema-version-runtime-enforcement-not-implemented',
  'final-rc-matrix-runner-not-implemented',
  'a5-actions-blocked'
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_validation',
  'local_validation',
  'committed_fixture',
  'committed_report_shape'
]);

const REJECTED_ACTIONS = Object.freeze([
  'start-service',
  'refresh-live',
  'provider',
  'real-memory-scan',
  'memory-preview',
  'import',
  'export',
  'migrate',
  'apply',
  'backup',
  'restore',
  'config-switch',
  'package-script',
  'public-mcp-expand',
  'push',
  'tag',
  'release',
  'deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'mutated',
  'serviceStarted',
  'durableMemoryTouched',
  'realMemoryPreview',
  'realMemoryScanned',
  'migrationApplied',
  'importExportApplied',
  'backupCreated',
  'restorePerformed',
  'packageChanged',
  'configChanged',
  'publicMcpExpanded',
  'pushed',
  'tagged',
  'released',
  'deployed',
  'rawSecretExposed',
  'rawWorkspaceIdExposed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeStringArray(values) {
  return cloneArray(values)
    .map(normalizeString)
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeSourceContract(sourceContract = {}) {
  const safeContract = isPlainObject(sourceContract) ? sourceContract : {};

  return {
    mode: normalizeString(safeContract.mode),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    acceptedStatuses: normalizeStringArray(safeContract.acceptedStatuses),
    readsFiles: normalizeBoolean(safeContract.readsFiles),
    executesCommands: normalizeBoolean(safeContract.executesCommands),
    startsServices: normalizeBoolean(safeContract.startsServices),
    callsProviders: normalizeBoolean(safeContract.callsProviders),
    mutatesDurableState: normalizeBoolean(safeContract.mutatesDurableState),
    acceptsRealMemoryPreview: normalizeBoolean(safeContract.acceptsRealMemoryPreview)
  };
}

function normalizeAllowedInputClass(inputClass = {}) {
  const safeInputClass = isPlainObject(inputClass) ? inputClass : {};

  return {
    id: normalizeString(safeInputClass.id),
    source: normalizeString(safeInputClass.source),
    requiredSafety: isPlainObject(safeInputClass.requiredSafety)
      ? { ...safeInputClass.requiredSafety }
      : {}
  };
}

function normalizeMatrixGroups(matrixGroups = {}) {
  const safeGroups = isPlainObject(matrixGroups) ? matrixGroups : {};

  return {
    a4Safe: normalizeStringArray(safeGroups.a4Safe),
    conditionalLive: normalizeStringArray(safeGroups.conditionalLive),
    runtimeRequired: normalizeStringArray(safeGroups.runtimeRequired),
    a5Gated: normalizeStringArray(safeGroups.a5Gated)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {
    providerCalls: Number.isFinite(safeSafety.providerCalls) ? safeSafety.providerCalls : 0
  };

  for (const flag of NO_SIDE_EFFECT_SAFETY_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  return normalized;
}

function normalizeBlocker(blocker = {}) {
  const safeBlocker = isPlainObject(blocker) ? blocker : {};

  return {
    id: normalizeString(safeBlocker.id),
    category: normalizeString(safeBlocker.category),
    status: normalizeString(safeBlocker.status)
  };
}

function normalizeFinalRcValidationMatrixManifest(manifest = {}) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  return {
    schemaVersion: normalizeString(safeManifest.schemaVersion),
    version: normalizeString(safeManifest.version),
    phase: normalizeString(safeManifest.phase),
    mode: normalizeString(safeManifest.mode),
    fixtureOnly: normalizeBoolean(safeManifest.fixtureOnly),
    synthetic: normalizeBoolean(safeManifest.synthetic),
    runnerImplemented: normalizeBoolean(safeManifest.runnerImplemented),
    runnerExecuted: normalizeBoolean(safeManifest.runnerExecuted),
    finalRcMatrixExecuted: normalizeBoolean(safeManifest.finalRcMatrixExecuted),
    decision: normalizeString(safeManifest.decision),
    publicMcpTools: normalizeStringArray(safeManifest.publicMcpTools),
    sourceContract: normalizeSourceContract(safeManifest.sourceContract),
    allowedInputClasses: cloneArray(safeManifest.allowedInputClasses).map(normalizeAllowedInputClass),
    matrixGroups: normalizeMatrixGroups(safeManifest.matrixGroups),
    requiredRejectionDefaults: normalizeStringArray(safeManifest.requiredRejectionDefaults),
    rejectedActions: normalizeStringArray(safeManifest.rejectedActions),
    safety: normalizeSafety(safeManifest.safety),
    blockers: cloneArray(safeManifest.blockers).map(normalizeBlocker),
    forbiddenFragments: normalizeStringArray(safeManifest.forbiddenFragments),
    next: isPlainObject(safeManifest.next) ? { ...safeManifest.next } : {}
  };
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function summarizeFinalRcValidationMatrixManifest(manifest = {}) {
  const normalized = normalizeFinalRcValidationMatrixManifest(manifest);
  const blockerIds = normalized.blockers.map(blocker => blocker.id).filter(Boolean);
  const allowedInputClassIds = normalized.allowedInputClasses.map(inputClass => inputClass.id).filter(Boolean);
  const sourceTypes = normalized.sourceContract.acceptedSourceTypes;
  const unsupportedSourceTypes = sourceTypes.filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const sourceTypesWhitelisted = sourceTypes.length > 0 && unsupportedSourceTypes.length === 0;
  const sourceContractSafe =
    normalized.sourceContract.mode === 'explicit_safe_inputs_only' &&
    sourceTypesWhitelisted &&
    normalized.sourceContract.readsFiles === false &&
    normalized.sourceContract.executesCommands === false &&
    normalized.sourceContract.startsServices === false &&
    normalized.sourceContract.callsProviders === false &&
    normalized.sourceContract.mutatesDurableState === false &&
    normalized.sourceContract.acceptsRealMemoryPreview === false;
  const sideEffectFlagsClear = NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === false);
  const publicMcpFrozen = arraysEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  const requiredBlockersPresent = hasEveryValue(blockerIds, REQUIRED_BLOCKERS);
  const requiredRejectionDefaultsPresent = hasEveryValue(
    normalized.requiredRejectionDefaults,
    REQUIRED_REJECTION_DEFAULTS
  );
  const rejectedActionsPresent = hasEveryValue(normalized.rejectedActions, REJECTED_ACTIONS);
  const blockedDecisionPreserved = normalized.decision === 'NOT_READY_BLOCKED';
  const runnerClaimsBlocked =
    normalized.runnerImplemented === false &&
    normalized.runnerExecuted === false &&
    normalized.finalRcMatrixExecuted === false;
  const acceptedForPlanning =
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    blockedDecisionPreserved &&
    runnerClaimsBlocked &&
    sourceContractSafe &&
    sideEffectFlagsClear &&
    normalized.safety.providerCalls === 0 &&
    publicMcpFrozen &&
    requiredBlockersPresent &&
    requiredRejectionDefaultsPresent &&
    rejectedActionsPresent;

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    phase: normalized.phase,
    mode: normalized.mode,
    acceptedForPlanning,
    decision: normalized.decision || 'NOT_READY_BLOCKED',
    canExecuteRunner: false,
    canClaimFinalRcReady: false,
    runnerImplemented: normalized.runnerImplemented,
    runnerExecuted: normalized.runnerExecuted,
    finalRcMatrixExecuted: normalized.finalRcMatrixExecuted,
    blockedDecisionPreserved,
    runnerClaimsBlocked,
    sourceContract: {
      safe: sourceContractSafe,
      mode: normalized.sourceContract.mode,
      acceptedSourceTypes: sourceTypes,
      safeSourceTypes: SAFE_SOURCE_TYPES,
      sourceTypesWhitelisted,
      unsupportedSourceTypes,
      acceptedStatuses: normalized.sourceContract.acceptedStatuses
    },
    allowedInputClasses: {
      count: allowedInputClassIds.length,
      ids: allowedInputClassIds
    },
    matrixGroups: {
      a4SafeCount: normalized.matrixGroups.a4Safe.length,
      conditionalLiveCount: normalized.matrixGroups.conditionalLive.length,
      runtimeRequiredCount: normalized.matrixGroups.runtimeRequired.length,
      a5GatedCount: normalized.matrixGroups.a5Gated.length,
      runtimeRequired: normalized.matrixGroups.runtimeRequired,
      a5Gated: normalized.matrixGroups.a5Gated
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicMcpTools
    },
    blockers: {
      count: blockerIds.length,
      ids: blockerIds,
      requiredPresent: requiredBlockersPresent,
      missingRequired: REQUIRED_BLOCKERS.filter(blocker => !blockerIds.includes(blocker))
    },
    rejectionDefaults: {
      failClosed: requiredRejectionDefaultsPresent,
      missingRequired: REQUIRED_REJECTION_DEFAULTS.filter(reason =>
        !normalized.requiredRejectionDefaults.includes(reason)
      )
    },
    rejectedActions: {
      coversUnsafeActions: rejectedActionsPresent,
      missingRequired: REJECTED_ACTIONS.filter(action => !normalized.rejectedActions.includes(action))
    },
    safety: {
      mutated: false,
      mutatesInput: false,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      providerCalls: normalized.safety.providerCalls,
      serviceStarted: normalized.safety.serviceStarted,
      durableMemoryTouched: normalized.safety.durableMemoryTouched,
      realMemoryPreview: normalized.safety.realMemoryPreview,
      realMemoryScanned: normalized.safety.realMemoryScanned,
      migrationApplied: normalized.safety.migrationApplied,
      importExportApplied: normalized.safety.importExportApplied,
      backupCreated: normalized.safety.backupCreated,
      restorePerformed: normalized.safety.restorePerformed,
      packageChanged: normalized.safety.packageChanged,
      configChanged: normalized.safety.configChanged,
      publicMcpExpanded: normalized.safety.publicMcpExpanded,
      pushed: normalized.safety.pushed,
      tagged: normalized.safety.tagged,
      released: normalized.safety.released,
      deployed: normalized.safety.deployed,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed
    }
  };
}

module.exports = {
  PUBLIC_MCP_TOOLS,
  REJECTED_ACTIONS,
  REQUIRED_BLOCKERS,
  REQUIRED_REJECTION_DEFAULTS,
  SAFE_SOURCE_TYPES,
  normalizeFinalRcValidationMatrixManifest,
  summarizeFinalRcValidationMatrixManifest
};
