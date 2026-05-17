const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p45-final-rc-matrix-evaluator-v1';
const EXPECTED_MODE = 'fixture-only-explicit-input';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_fixture',
  'committed_test',
  'committed_doc',
  'local_validation_summary',
  'synthetic_fixture',
  'sanitized_metadata',
  'explicit_input'
]);

const REQUIRED_EVIDENCE_IDS = Object.freeze([
  'p36_scope_a5_boundary',
  'p36_task_risk_labels',
  'p37_policy_decision_envelope',
  'p38_recall_isolation',
  'p39_synthetic_migration_dry_run',
  'p40_local_readiness_report',
  'p41_evidence_manifest_contract',
  'p42_explicit_input_evidence_helper',
  'p43_recall_migration_isolation_helper',
  'p44_validation_aggregator_evidence_map'
]);

const REQUIRED_A5_BLOCKER_IDS = Object.freeze([
  'migration-import-export-apply-a5-gated',
  'provider-execution-a5-gated',
  'startup-watchdog-a5-gated',
  'codex-claude-config-switch-a5-gated',
  'push-tag-release-deploy-a5-gated'
]);

const FAIL_CLOSED_STATES = Object.freeze([
  'missing',
  'failed',
  'blocked',
  'not_executed',
  'warning',
  'warning_only',
  'unknown',
  'skipped',
  'ambiguous',
  'unparsable',
  'unsupported'
]);

const FAIL_CLOSED_STATUSES = FAIL_CLOSED_STATES;

const REQUIRED_INPUT_KEYS = Object.freeze([
  'manifest',
  'evidence',
  'a5Blockers',
  'publicMcpTools',
  'blockedActions',
  'failClosedStates',
  'safety'
]);

const BLOCKED_ACTIONS = Object.freeze([
  'collect_evidence',
  'execute_validation_command',
  'execute_helper',
  'execute_gate',
  'execute_runner',
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
  'backup_restore',
  'service_start',
  'config_switch',
  'watchdog_install',
  'public_mcp_expansion',
  'dependency_change',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noFileRead',
  'noDirectoryScan',
  'noCommandExecution',
  'noServiceStart',
  'noProviderCall',
  'noRuntimeStoreScan',
  'noRealMemoryRead',
  'noMigrationApply',
  'noImportExportApply',
  'noBackupRestore',
  'noConfigMutation',
  'noWatchdogInstall',
  'noPublicMcpExpansion',
  'noDependencyChange',
  'noDurableMemoryWrite',
  'noDurableAuditWrite',
  'noRemoteWrite'
]);

const READINESS_FIELDS = Object.freeze([
  'runtimeReady',
  'finalRcMatrixReady',
  'fullFinalRcMatrixExecuted',
  'pushReady',
  'releaseReady',
  'deployReady',
  'configSwitchReady',
  'watchdogReady',
  'rcReady'
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

function normalizeManifest(manifest = {}) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  return {
    present: normalizeBoolean(safeManifest.present),
    schemaVersion: normalizeString(safeManifest.schemaVersion),
    sourceMode: normalizeString(safeManifest.sourceMode),
    acceptedForPlanning: normalizeBoolean(safeManifest.acceptedForPlanning),
    evidenceCollectedByEvaluator: normalizeBoolean(safeManifest.evidenceCollectedByEvaluator),
    helperExecutedByEvaluator: normalizeBoolean(safeManifest.helperExecutedByEvaluator)
  };
}

function normalizeEvidence(evidence = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};

  return {
    id: normalizeString(safeEvidence.id),
    sourceType: normalizeString(safeEvidence.sourceType),
    status: normalizeString(safeEvidence.status),
    sourceMode: normalizeString(safeEvidence.sourceMode),
    critical: normalizeBoolean(safeEvidence.critical),
    acceptedForEvaluation: normalizeBoolean(safeEvidence.acceptedForEvaluation),
    observedFromRuntime: normalizeBoolean(safeEvidence.observedFromRuntime)
  };
}

function normalizeA5Blocker(blocker = {}) {
  const safeBlocker = isPlainObject(blocker) ? blocker : {};

  return {
    id: normalizeString(safeBlocker.id),
    status: normalizeString(safeBlocker.status),
    unresolved: normalizeBoolean(safeBlocker.unresolved)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};

  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawWorkspaceIdExposed = normalizeBoolean(safeSafety.rawWorkspaceIdExposed);
  normalized.authorizationHeaderExposed = normalizeBoolean(safeSafety.authorizationHeaderExposed);
  normalized.apiKeyExposed = normalizeBoolean(safeSafety.apiKeyExposed);
  normalized.callerFieldsPassthroughAllowed = normalizeBoolean(safeSafety.callerFieldsPassthroughAllowed);

  return normalized;
}

function normalizeReadinessClaims(input = {}) {
  const readiness = {};

  for (const field of READINESS_FIELDS) {
    readiness[field] = normalizeBoolean(input[field]);
  }

  return readiness;
}

function normalizeFinalRcMatrixEvaluation(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    mode: normalizeString(safeInput.mode),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    decision: normalizeString(safeInput.decision),
    status: normalizeString(safeInput.status),
    manifest: normalizeManifest(safeInput.manifest),
    evidence: cloneArray(safeInput.evidence).map(normalizeEvidence),
    a5Blockers: cloneArray(safeInput.a5Blockers).map(normalizeA5Blocker),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    failClosedStates: normalizeStringArray(safeInput.failClosedStates),
    readiness: normalizeReadinessClaims(safeInput),
    safety: normalizeSafety(safeInput.safety),
    requiredWording: normalizeStringArray(safeInput.requiredWording),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims)
  };
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    hasEveryValue(values, requiredValues);
}

function evaluateFinalRcMatrix(input = {}) {
  const normalized = normalizeFinalRcMatrixEvaluation(input);
  const evidenceIds = normalized.evidence.map(evidence => evidence.id).filter(Boolean);
  const missingEvidenceIds = REQUIRED_EVIDENCE_IDS.filter(id => !evidenceIds.includes(id));
  const duplicateEvidenceIds = uniqueValues(evidenceIds)
    .filter(id => evidenceIds.filter(evidenceId => evidenceId === id).length > 1);
  const evidenceMatrixExact = hasExactSet(evidenceIds, REQUIRED_EVIDENCE_IDS);
  const unsupportedSourceTypes = normalized.evidence
    .map(evidence => evidence.sourceType)
    .filter(sourceType => sourceType && !SAFE_SOURCE_TYPES.includes(sourceType));
  const unsafeCriticalEvidence = normalized.evidence.filter(evidence =>
    evidence.critical === true &&
    FAIL_CLOSED_STATES.includes(evidence.status)
  );
  const evidenceSafe = normalized.evidence.length > 0 &&
    evidenceMatrixExact &&
    unsupportedSourceTypes.length === 0 &&
    normalized.evidence.every(evidence =>
      REQUIRED_EVIDENCE_IDS.includes(evidence.id) &&
      SAFE_SOURCE_TYPES.includes(evidence.sourceType) &&
      evidence.status === 'passed' &&
      evidence.sourceMode === 'caller_provided' &&
      evidence.acceptedForEvaluation === true &&
      evidence.observedFromRuntime === false
    );
  const schemaVersionSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const modeSafe = normalized.mode === EXPECTED_MODE;
  const manifestSafe =
    normalized.manifest.present === true &&
    normalized.manifest.sourceMode === 'caller_provided' &&
    normalized.manifest.acceptedForPlanning === true &&
    normalized.manifest.evidenceCollectedByEvaluator === false &&
    normalized.manifest.helperExecutedByEvaluator === false;
  const a5BlockerIds = normalized.a5Blockers.map(blocker => blocker.id).filter(Boolean);
  const missingA5BlockerIds = REQUIRED_A5_BLOCKER_IDS.filter(id => !a5BlockerIds.includes(id));
  const duplicateA5BlockerIds = uniqueValues(a5BlockerIds)
    .filter(id => a5BlockerIds.filter(blockerId => blockerId === id).length > 1);
  const unresolvedA5Blockers = normalized.a5Blockers.filter(blocker =>
    blocker.unresolved === true || blocker.status === 'blocked_pending_a5'
  );
  const a5BlockersExact = hasExactSet(a5BlockerIds, REQUIRED_A5_BLOCKER_IDS);
  const a5BlockersPreserved = a5BlockersExact &&
    unresolvedA5Blockers.length === normalized.a5Blockers.length;
  const publicMcpFrozen = arraysEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  const blockedActionsPresent = hasEveryValue(normalized.blockedActions, BLOCKED_ACTIONS);
  const blockedActionsExact = hasExactSet(normalized.blockedActions, BLOCKED_ACTIONS);
  const failClosedStatesPresent = hasEveryValue(normalized.failClosedStates, FAIL_CLOSED_STATES);
  const failClosedStatesExact = hasExactSet(normalized.failClosedStates, FAIL_CLOSED_STATES);
  const readinessClaimsBlocked = READINESS_FIELDS.every(field => normalized.readiness[field] === false);
  const safetyClear =
    NO_SIDE_EFFECT_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.authorizationHeaderExposed === false &&
    normalized.safety.apiKeyExposed === false &&
    normalized.safety.callerFieldsPassthroughAllowed === false;
  const inputContractAccepted =
    schemaVersionSafe &&
    modeSafe &&
    normalized.fixtureOnly === true &&
    normalized.explicitInputOnly === true &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    manifestSafe &&
    evidenceSafe &&
    publicMcpFrozen &&
    blockedActionsExact &&
    failClosedStatesExact &&
    a5BlockersPreserved &&
    readinessClaimsBlocked &&
    safetyClear;
  const failClosedReasons = [];

  if (!schemaVersionSafe) failClosedReasons.push('schema_version_mismatch');
  if (!modeSafe) failClosedReasons.push('mode_not_fixture_explicit');
  if (!manifestSafe) failClosedReasons.push('missing_or_unsafe_manifest');
  if (!evidenceSafe) failClosedReasons.push('missing_or_unsafe_evidence');
  if (!evidenceMatrixExact) failClosedReasons.push('evidence_matrix_not_exact');
  if (unsafeCriticalEvidence.length > 0) failClosedReasons.push('critical_evidence_not_passed');
  if (unsupportedSourceTypes.length > 0) failClosedReasons.push('unsupported_source_type');
  if (!a5BlockersPreserved) failClosedReasons.push('a5_blocker_bypass_rejected');
  if (!a5BlockersExact) failClosedReasons.push('a5_blockers_not_exact');
  if (unresolvedA5Blockers.length > 0) failClosedReasons.push('a5_blockers_unresolved');
  if (!readinessClaimsBlocked) failClosedReasons.push('readiness_claim_rejected');
  if (!publicMcpFrozen) failClosedReasons.push('public_mcp_not_frozen');
  if (!blockedActionsPresent) failClosedReasons.push('blocked_actions_missing');
  if (!blockedActionsExact) failClosedReasons.push('blocked_actions_not_exact');
  if (!failClosedStatesPresent) failClosedReasons.push('fail_closed_states_missing');
  if (!failClosedStatesExact) failClosedReasons.push('fail_closed_states_not_exact');
  if (!safetyClear) failClosedReasons.push('unsafe_side_effect_or_sensitive_claim');

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    mode: normalized.mode,
    status: isPlainObject(input) ? 'blocked_fail_closed' : 'invalid_input_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    inputContractAccepted,
    passed: false,
    canClaimFullFinalRcMatrixExecuted: false,
    canExecuteRunner: false,
    canClaimFinalRcReady: false,
    canClaimRuntimeReady: false,
    runnerImplemented: false,
    runnerExecuted: false,
    finalRcMatrixExecuted: false,
    fullFinalRcMatrixExecuted: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    pushReady: false,
    releaseReady: false,
    deployReady: false,
    configSwitchReady: false,
    watchdogReady: false,
    rcReady: false,
    failClosedReasons: [...new Set(failClosedReasons)],
    manifest: {
      present: normalized.manifest.present,
      safe: manifestSafe,
      sourceMode: normalized.manifest.sourceMode,
      evidenceCollectedByEvaluator: normalized.manifest.evidenceCollectedByEvaluator,
      helperExecutedByEvaluator: normalized.manifest.helperExecutedByEvaluator
    },
    evidence: {
      count: normalized.evidence.length,
      requiredPresent: missingEvidenceIds.length === 0,
      exact: evidenceMatrixExact,
      missingRequired: missingEvidenceIds,
      duplicateIds: duplicateEvidenceIds,
      safe: evidenceSafe,
      unsafeCriticalIds: unsafeCriticalEvidence.map(evidence => evidence.id).filter(Boolean),
      unsupportedSourceTypes: [...new Set(unsupportedSourceTypes)],
      ids: evidenceIds
    },
    a5Blockers: {
      count: normalized.a5Blockers.length,
      unresolvedCount: unresolvedA5Blockers.length,
      unresolvedIds: unresolvedA5Blockers.map(blocker => blocker.id).filter(Boolean),
      requiredPresent: missingA5BlockerIds.length === 0,
      exact: a5BlockersExact,
      missingRequired: missingA5BlockerIds,
      duplicateIds: duplicateA5BlockerIds,
      preservedBlocked: a5BlockersPreserved,
      callerResolutionAccepted: false
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicMcpTools
    },
    blockedActions: {
      requiredPresent: blockedActionsPresent,
      exact: blockedActionsExact,
      missingRequired: BLOCKED_ACTIONS.filter(action => !normalized.blockedActions.includes(action))
    },
    failClosedStates: {
      requiredPresent: failClosedStatesPresent,
      exact: failClosedStatesExact,
      states: normalized.failClosedStates,
      missingRequired: FAIL_CLOSED_STATES.filter(state => !normalized.failClosedStates.includes(state))
    },
    safety: {
      noSideEffects: safetyClear,
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      scansRuntimeStores: false,
      readsRealMemory: false,
      appliesMigration: false,
      performsImportExportApply: false,
      performsBackupRestore: false,
      mutatesConfig: false,
      installsWatchdog: false,
      expandsPublicMcp: false,
      changesDependencies: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      remoteWrites: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed,
      authorizationHeaderExposed: normalized.safety.authorizationHeaderExposed,
      apiKeyExposed: normalized.safety.apiKeyExposed
    }
  };
}

module.exports = {
  BLOCKED_ACTIONS,
  EXPECTED_MODE,
  EXPECTED_SCHEMA_VERSION,
  FAIL_CLOSED_STATES,
  FAIL_CLOSED_STATUSES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  READINESS_FIELDS,
  REQUIRED_A5_BLOCKER_IDS,
  REQUIRED_EVIDENCE_IDS,
  REQUIRED_INPUT_KEYS,
  SAFE_SOURCE_TYPES,
  evaluateFinalRcMatrix,
  evaluateFixtureOnlyFinalRcMatrix: evaluateFinalRcMatrix,
  normalizeFixtureOnlyFinalRcMatrixInput: normalizeFinalRcMatrixEvaluation,
  normalizeFinalRcMatrixEvaluation
};
