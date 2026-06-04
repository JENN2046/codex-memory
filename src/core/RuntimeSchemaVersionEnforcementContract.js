const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p52-runtime-schema-version-enforcement-boundary-v1';
const EXPECTED_POLICY_VERSION = 'p52-runtime-schema-version-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p52-runtime-enforcement-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_VERSION_FIELDS = Object.freeze([
  'schemaVersion',
  'policyVersion',
  'manifestVersion'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'missing_schema_version',
  'unknown_policy_version',
  'unsupported_manifest_version',
  'duplicate_schema_version',
  'malformed_policy_version',
  'version_mismatch',
  'ambiguous_metadata',
  'unparsable_metadata',
  'stale_version_claim',
  'warning_only_critical_gate',
  'skipped_critical_gate',
  'valid_exact_versions_boundary_planning_only'
]);

const BLOCKED_ACTIONS = Object.freeze([
  'runtime_request_enforcement',
  'runtime_policy_kernel_execution',
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
  'noRuntimePolicyKernel',
  'noMigrationApply',
  'noBackupRestore',
  'noDurableMemoryWrite',
  'noDurableAuditWrite',
  'noRemoteWrite'
]);

const EXPECTED_VERSIONS = Object.freeze({
  schemaVersion: EXPECTED_SCHEMA_VERSION,
  policyVersion: EXPECTED_POLICY_VERSION,
  manifestVersion: EXPECTED_MANIFEST_VERSION
});

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

  if (Array.isArray(value)) {
    return value.map(normalizeClaimedValue);
  }

  return '<redacted>';
}

function normalizeVersionField(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeClaimedValue);
  }

  return normalizeClaimedValue(value);
}

function normalizeFailClosedCase(entry = {}) {
  const safeEntry = isPlainObject(entry) ? entry : {};

  return {
    id: normalizeString(safeEntry.id),
    field: normalizeString(safeEntry.field),
    claimedValue: normalizeClaimedValue(safeEntry.claimedValue),
    acceptedForPlanning: normalizeBoolean(safeEntry.acceptedForPlanning),
    machineDecision: normalizeString(safeEntry.machineDecision),
    runtimeReady: normalizeBoolean(safeEntry.runtimeReady),
    reasonCodes: normalizeStringArray(safeEntry.reasonCodes)
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
  normalized.callerFieldsPassthroughAllowed = normalizeBoolean(
    safeSafety.callerFieldsPassthroughAllowed
  );

  return normalized;
}

function normalizeRuntimeSchemaVersionEnforcementContract(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeVersionField(safeInput.schemaVersion),
    policyVersion: normalizeVersionField(safeInput.policyVersion),
    manifestVersion: normalizeVersionField(safeInput.manifestVersion),
    version: normalizeString(safeInput.version),
    phase: normalizeString(safeInput.phase),
    fixtureOnly: normalizeBoolean(safeInput.fixtureOnly),
    synthetic: normalizeBoolean(safeInput.synthetic),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    acceptedForPlanning: normalizeBoolean(safeInput.acceptedForPlanning),
    runtimeEnforcementImplemented: normalizeBoolean(safeInput.runtimeEnforcementImplemented),
    runtimeIntegrated: normalizeBoolean(safeInput.runtimeIntegrated),
    runtimeReady: normalizeBoolean(safeInput.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeInput.finalRcMatrixReady),
    rcReady: normalizeBoolean(safeInput.rcReady),
    publicToolsFrozen: normalizeBoolean(safeInput.publicToolsFrozen),
    publicTools: normalizeStringArray(safeInput.publicTools),
    requiredVersionFields: normalizeStringArray(safeInput.requiredVersionFields),
    failClosedCases: cloneArray(safeInput.failClosedCases).map(normalizeFailClosedCase),
    blockedActions: normalizeStringArray(safeInput.blockedActions),
    safety: normalizeSafety(safeInput.safety),
    requiredWording: normalizeStringArray(safeInput.requiredWording),
    forbiddenClaims: normalizeStringArray(safeInput.forbiddenClaims)
  };
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    hasEveryValue(values, requiredValues);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function summarizeVersionField(normalized, field) {
  const value = normalized[field];
  const expected = EXPECTED_VERSIONS[field];
  const missing = value === null || value === undefined || value === '';
  const duplicate = Array.isArray(value);
  const malformed = !missing && !duplicate && typeof value !== 'string';
  const exact = !missing && !duplicate && !malformed && value === expected;

  return {
    field,
    value,
    expected,
    exact,
    missing,
    duplicate,
    malformed,
    mismatch: !missing && !duplicate && !malformed && value !== expected
  };
}

function summarizeVersions(normalized) {
  const fields = REQUIRED_VERSION_FIELDS.map(field => summarizeVersionField(normalized, field));

  return {
    exact: fields.every(field => field.exact),
    fields,
    missing: fields.filter(field => field.missing).map(field => field.field),
    duplicate: fields.filter(field => field.duplicate).map(field => field.field),
    malformed: fields.filter(field => field.malformed).map(field => field.field),
    mismatched: fields.filter(field => field.mismatch).map(field => field.field)
  };
}

function summarizeRuntimeSchemaVersionEnforcement(input = {}) {
  const normalized = normalizeRuntimeSchemaVersionEnforcementContract(input);
  const versions = summarizeVersions(normalized);
  const requiredVersionFieldsExact = hasExactSet(
    normalized.requiredVersionFields,
    REQUIRED_VERSION_FIELDS
  );
  const failClosedCaseIds = normalized.failClosedCases.map(entry => entry.id).filter(Boolean);
  const failClosedCasesExact = hasExactSet(failClosedCaseIds, REQUIRED_FAIL_CLOSED_CASES);
  const failClosedCasesSafe = normalized.failClosedCases.length > 0 &&
    normalized.failClosedCases.every(entry => {
      if (entry.id === 'valid_exact_versions_boundary_planning_only') {
        return entry.acceptedForPlanning === true &&
          entry.machineDecision === 'allow_boundary_planning_only' &&
          entry.runtimeReady === false;
      }

      return REQUIRED_FAIL_CLOSED_CASES.includes(entry.id) &&
        entry.acceptedForPlanning === false &&
        entry.machineDecision === 'deny' &&
        entry.reasonCodes.length > 0;
    });
  const blockedActionsExact = hasExactSet(normalized.blockedActions, BLOCKED_ACTIONS);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.callerFieldsPassthroughAllowed === false;
  const readinessBlocked =
    normalized.runtimeEnforcementImplemented === false &&
    normalized.runtimeIntegrated === false &&
    normalized.runtimeReady === false &&
    normalized.finalRcMatrixReady === false &&
    normalized.rcReady === false &&
    normalized.decision === 'NOT_READY_BLOCKED' &&
    normalized.status === 'blocked';
  const inputShapeSafe =
    normalized.fixtureOnly === true &&
    normalized.synthetic === true &&
    normalized.explicitInputOnly === true &&
    normalized.sourceMode === 'committed_fixture';
  const inputContractAccepted =
    versions.exact &&
    requiredVersionFieldsExact &&
    failClosedCasesExact &&
    failClosedCasesSafe &&
    blockedActionsExact &&
    publicMcpFrozen &&
    safetyFlagsClear &&
    readinessBlocked &&
    inputShapeSafe &&
    normalized.acceptedForPlanning === true;
  const failClosedReasons = [];

  if (!isPlainObject(input)) {
    failClosedReasons.push('malformed_input');
  }
  if (!versions.exact) {
    failClosedReasons.push('version_contract_not_exact');
  }
  if (!requiredVersionFieldsExact) {
    failClosedReasons.push('required_version_fields_not_exact');
  }
  if (!failClosedCasesExact || !failClosedCasesSafe) {
    failClosedReasons.push('fail_closed_cases_not_exact');
  }
  if (!blockedActionsExact) {
    failClosedReasons.push('blocked_actions_not_exact');
  }
  if (!publicMcpFrozen) {
    failClosedReasons.push('public_mcp_not_frozen');
  }
  if (!safetyFlagsClear) {
    failClosedReasons.push('safety_flags_not_clear');
  }
  if (!readinessBlocked || !inputShapeSafe) {
    failClosedReasons.push('readiness_or_runtime_claim_rejected');
  }

  return {
    sourceMode: 'explicit_input',
    schemaVersion: typeof normalized.schemaVersion === 'string' ? normalized.schemaVersion : '<invalid>',
    policyVersion: typeof normalized.policyVersion === 'string' ? normalized.policyVersion : '<invalid>',
    manifestVersion: typeof normalized.manifestVersion === 'string' ? normalized.manifestVersion : '<invalid>',
    inputContractAccepted,
    acceptedForPlanning: inputContractAccepted,
    status: inputContractAccepted ? 'blocked_boundary_planning_only' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    failClosedReasons,
    runtimeEnforcementImplemented: false,
    runtimeIntegrated: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    rcReady: false,
    versions,
    requiredVersionFields: {
      exact: requiredVersionFieldsExact,
      ids: normalized.requiredVersionFields,
      missingRequired: REQUIRED_VERSION_FIELDS.filter(
        field => !normalized.requiredVersionFields.includes(field)
      )
    },
    failClosedCases: {
      exact: failClosedCasesExact,
      safe: failClosedCasesSafe,
      ids: failClosedCaseIds,
      missingRequired: REQUIRED_FAIL_CLOSED_CASES.filter(id => !failClosedCaseIds.includes(id)),
      duplicateIds: uniqueValues(failClosedCaseIds)
        .filter(id => failClosedCaseIds.filter(caseId => caseId === id).length > 1)
    },
    blockedActions: {
      exact: blockedActionsExact,
      ids: normalized.blockedActions,
      missingRequired: BLOCKED_ACTIONS.filter(action => !normalized.blockedActions.includes(action))
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    safety: {
      noSideEffects: safetyFlagsClear,
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      runtimePolicyKernelExecuted: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      appliesMigration: false,
      performsBackupRestore: false,
      mutatesInput: false,
      remoteWrites: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed
    }
  };
}

module.exports = {
  BLOCKED_ACTIONS,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  NO_SIDE_EFFECT_SAFETY_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_VERSION_FIELDS,
  normalizeRuntimeSchemaVersionEnforcementContract,
  summarizeRuntimeSchemaVersionEnforcement
};
