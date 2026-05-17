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

const REQUIRED_SOURCE_EVIDENCE_IDS = Object.freeze([
  'p36_scope_a5_boundary',
  'p36_task_risk_labels',
  'p37_policy_decision_envelope',
  'p38_recall_isolation',
  'p39_synthetic_migration_dry_run',
  'p40_local_readiness_report'
]);

const CRITICAL_FAILURE_STATES = Object.freeze([
  'failed',
  'skipped',
  'unknown',
  'warning_only',
  'missing',
  'ambiguous',
  'unparsable',
  'unsupported_source'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'missing_manifest',
  'unsupported_source_type',
  'warning_only_critical_gate',
  'unknown_critical_gate',
  'runtime_ready_claim',
  'public_mcp_expansion_claim'
]);

const BLOCKED_ACTIONS = Object.freeze([
  'real_memory_content_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'diary_scan',
  'sqlite_scan',
  'vector_index_scan',
  'candidate_cache_scan',
  'recall_audit_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore',
  'provider_call',
  'service_start',
  'config_switch',
  'watchdog_install',
  'public_mcp_expansion',
  'dependency_change',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
]);

const READINESS_FIELDS = Object.freeze([
  'runtimeReady',
  'finalRcMatrixReady',
  'pushReady',
  'releaseReady',
  'deployReady',
  'configSwitchReady',
  'watchdogReady',
  'rcReady'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noImplicitFileDiscovery',
  'noDirectoryScan',
  'noCommandExecution',
  'noServiceStart',
  'noProviderCall',
  'noConfigMutation',
  'noDependencyChange',
  'noPublicMcpExpansion',
  'noRealMemoryRead',
  'noRuntimeStoreScan',
  'noMigrationApply',
  'noBackupRestore',
  'noDurableMemoryWrite',
  'noDurableAuditWrite',
  'noRemoteWrite'
]);

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

function redactEvidenceManifestString(value) {
  return redactSensitiveFragments(value)
    .replace(/[A-Z]:[\\/][^"',;\s]+/gi, '<redacted>')
    .replace(/https?:\/\/[^"',;\s]+/gi, '<redacted>')
    .replace(/\.env\b/gi, '<redacted>')
    .replace(/\bworkspace_id\s*[:=]\s*["']?[^"',;\s]+["']?/gi, '<redacted>')
    .replace(/\bworkspace_id\b/gi, '<redacted>');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactEvidenceManifestString(value.trim()) : '';
}

function normalizeStringArray(values) {
  return cloneArray(values)
    .map(normalizeString)
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeClaimedValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return normalizeString(value);
  }

  return '<redacted>';
}

function normalizeReadinessClaims(manifest = {}) {
  const claims = {};

  for (const field of READINESS_FIELDS) {
    claims[field] = normalizeBoolean(manifest[field]);
  }

  return claims;
}

function normalizeSourceEvidence(source = {}) {
  const safeSource = isPlainObject(source) ? source : {};

  return {
    id: normalizeString(safeSource.id),
    phase: normalizeString(safeSource.phase),
    sourceType: normalizeString(safeSource.sourceType),
    artifact: normalizeString(safeSource.artifact),
    status: normalizeString(safeSource.status),
    acceptedForPlanning: normalizeBoolean(safeSource.acceptedForPlanning),
    runtimeReady: normalizeBoolean(safeSource.runtimeReady)
  };
}

function normalizeCriticalGateSemantics(criticalGateSemantics = {}) {
  const safeSemantics = isPlainObject(criticalGateSemantics) ? criticalGateSemantics : {};
  const normalized = {
    pass: normalizeString(safeSemantics.pass)
  };

  for (const state of CRITICAL_FAILURE_STATES) {
    normalized[state] = normalizeString(safeSemantics[state]);
  }

  return normalized;
}

function normalizeFailClosedCase(failClosedCase = {}) {
  const safeCase = isPlainObject(failClosedCase) ? failClosedCase : {};

  return {
    id: normalizeString(safeCase.id),
    claim: normalizeString(safeCase.claim),
    claimedValue: normalizeClaimedValue(safeCase.claimedValue),
    acceptedForPlanning: normalizeBoolean(safeCase.acceptedForPlanning),
    nonzeroFailurePath: normalizeBoolean(safeCase.nonzeroFailurePath),
    reasonCodes: normalizeStringArray(safeCase.reasonCodes)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};

  for (const flag of NO_SIDE_EFFECT_SAFETY_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawWorkspaceIdExposed = normalizeBoolean(safeSafety.rawWorkspaceIdExposed);
  normalized.authorizationHeaderExposed = normalizeBoolean(safeSafety.authorizationHeaderExposed);
  normalized.apiKeyExposed = normalizeBoolean(safeSafety.apiKeyExposed);
  normalized.callerFieldsPassthroughAllowed = normalizeBoolean(
    safeSafety.callerFieldsPassthroughAllowed
  );

  return normalized;
}

function normalizeEvidenceManifestContract(manifest = {}) {
  const safeManifest = isPlainObject(manifest) ? manifest : {};

  return {
    schemaVersion: normalizeString(safeManifest.schemaVersion),
    phase: normalizeString(safeManifest.phase),
    fixtureOnly: normalizeBoolean(safeManifest.fixtureOnly),
    synthetic: normalizeBoolean(safeManifest.synthetic),
    explicitInputOnly: normalizeBoolean(safeManifest.explicitInputOnly),
    status: normalizeString(safeManifest.status),
    decision: normalizeString(safeManifest.decision),
    acceptedForPlanning: normalizeBoolean(safeManifest.acceptedForPlanning),
    readiness: normalizeReadinessClaims(safeManifest),
    publicToolsFrozen: normalizeBoolean(safeManifest.publicToolsFrozen),
    publicTools: normalizeStringArray(safeManifest.publicTools),
    safeSourceTypes: normalizeStringArray(safeManifest.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeManifest.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeManifest.unsupportedSourceTypes),
    sourceEvidence: cloneArray(safeManifest.sourceEvidence).map(normalizeSourceEvidence),
    criticalGateSemantics: normalizeCriticalGateSemantics(safeManifest.criticalGateSemantics),
    failClosedCases: cloneArray(safeManifest.failClosedCases).map(normalizeFailClosedCase),
    blockedActions: normalizeStringArray(safeManifest.blockedActions),
    safety: normalizeSafety(safeManifest.safety),
    requiredWording: normalizeStringArray(safeManifest.requiredWording),
    forbiddenClaims: normalizeStringArray(safeManifest.forbiddenClaims)
  };
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function summarizeCriticalGateSemantics(criticalGateSemantics) {
  const failureStatesFailClosed = CRITICAL_FAILURE_STATES.every(state =>
    criticalGateSemantics[state] === 'failure'
  );

  return {
    passMeaning: criticalGateSemantics.pass,
    failureStatesFailClosed,
    failureStates: CRITICAL_FAILURE_STATES,
    unsafeStates: CRITICAL_FAILURE_STATES.filter(state =>
      criticalGateSemantics[state] !== 'failure'
    )
  };
}

function summarizeEvidenceManifestContract(manifest = {}) {
  const normalized = normalizeEvidenceManifestContract(manifest);
  const unsupportedAcceptedSourceTypes = normalized.acceptedSourceTypes
    .filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const unsupportedDeclaredSafeSourceTypes = normalized.safeSourceTypes
    .filter(sourceType => !SAFE_SOURCE_TYPES.includes(sourceType));
  const sourceTypesWhitelisted =
    normalized.acceptedSourceTypes.length > 0 &&
    unsupportedAcceptedSourceTypes.length === 0 &&
    unsupportedDeclaredSafeSourceTypes.length === 0 &&
    normalized.unsupportedSourceTypes.length === 0;
  const sourceEvidenceIds = normalized.sourceEvidence.map(source => source.id).filter(Boolean);
  const sourceEvidenceRequiredPresent = hasEveryValue(
    sourceEvidenceIds,
    REQUIRED_SOURCE_EVIDENCE_IDS
  );
  const sourceEvidenceSafe = normalized.sourceEvidence.length > 0 &&
    normalized.sourceEvidence.every(source =>
      REQUIRED_SOURCE_EVIDENCE_IDS.includes(source.id) &&
      SAFE_SOURCE_TYPES.includes(source.sourceType) &&
      source.status === 'pass' &&
      source.acceptedForPlanning === true &&
      source.runtimeReady === false &&
      source.artifact.startsWith('tests/fixtures/')
    );
  const criticalGateSemantics = summarizeCriticalGateSemantics(normalized.criticalGateSemantics);
  const failClosedCaseIds = normalized.failClosedCases.map(entry => entry.id).filter(Boolean);
  const failClosedCasesRequiredPresent = hasEveryValue(
    failClosedCaseIds,
    REQUIRED_FAIL_CLOSED_CASES
  );
  const failClosedCasesSafe = normalized.failClosedCases.length > 0 &&
    normalized.failClosedCases.every(entry =>
      REQUIRED_FAIL_CLOSED_CASES.includes(entry.id) &&
      entry.acceptedForPlanning === false &&
      entry.nonzeroFailurePath === true &&
      entry.reasonCodes.length > 0
    );
  const blockedActionsPresent = hasEveryValue(normalized.blockedActions, BLOCKED_ACTIONS);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const readinessBlocked = READINESS_FIELDS.every(field => normalized.readiness[field] === false);
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.authorizationHeaderExposed === false &&
    normalized.safety.apiKeyExposed === false &&
    normalized.safety.callerFieldsPassthroughAllowed === false;
  const decisionBlocked =
    normalized.status === 'blocked' &&
    normalized.decision === 'NOT_READY_BLOCKED';
  const acceptedForPlanning =
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.explicitInputOnly === true &&
    normalized.acceptedForPlanning === true &&
    decisionBlocked &&
    readinessBlocked &&
    publicMcpFrozen &&
    sourceTypesWhitelisted &&
    sourceEvidenceRequiredPresent &&
    sourceEvidenceSafe &&
    criticalGateSemantics.failureStatesFailClosed &&
    failClosedCasesRequiredPresent &&
    failClosedCasesSafe &&
    blockedActionsPresent &&
    safetyFlagsClear;

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    phase: normalized.phase,
    acceptedForPlanning,
    decision: normalized.decision || 'NOT_READY_BLOCKED',
    status: normalized.status || 'blocked',
    localEvidenceReportReady: acceptedForPlanning,
    runtimeReady: false,
    finalRcMatrixReady: false,
    pushReady: false,
    releaseReady: false,
    deployReady: false,
    configSwitchReady: false,
    watchdogReady: false,
    rcReady: false,
    sourceContract: {
      safe: sourceTypesWhitelisted,
      safeSourceTypes: SAFE_SOURCE_TYPES,
      acceptedSourceTypes: normalized.acceptedSourceTypes,
      sourceTypesWhitelisted,
      unsupportedSourceTypes: [
        ...new Set([
          ...normalized.unsupportedSourceTypes,
          ...unsupportedAcceptedSourceTypes,
          ...unsupportedDeclaredSafeSourceTypes
        ])
      ]
    },
    sourceEvidence: {
      count: sourceEvidenceIds.length,
      ids: sourceEvidenceIds,
      requiredPresent: sourceEvidenceRequiredPresent,
      safe: sourceEvidenceSafe,
      missingRequired: REQUIRED_SOURCE_EVIDENCE_IDS.filter(id => !sourceEvidenceIds.includes(id))
    },
    criticalGateSemantics,
    failClosedCases: {
      count: failClosedCaseIds.length,
      ids: failClosedCaseIds,
      requiredPresent: failClosedCasesRequiredPresent,
      safe: failClosedCasesSafe,
      missingRequired: REQUIRED_FAIL_CLOSED_CASES.filter(id => !failClosedCaseIds.includes(id))
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    blockedActions: {
      count: normalized.blockedActions.length,
      ids: normalized.blockedActions,
      requiredPresent: blockedActionsPresent,
      missingRequired: BLOCKED_ACTIONS.filter(action => !normalized.blockedActions.includes(action))
    },
    safety: {
      noSideEffects: safetyFlagsClear,
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      mutatesInput: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      appliesMigration: false,
      performsBackupRestore: false,
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
  CRITICAL_FAILURE_STATES,
  NO_SIDE_EFFECT_SAFETY_FLAGS,
  PUBLIC_MCP_TOOLS,
  READINESS_FIELDS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES,
  normalizeEvidenceManifestContract,
  summarizeEvidenceManifestContract
};
