const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-family-reentry-v1';
const EXPECTED_VERSION = 'v1';

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const DEFERRED_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const SAFE_SOURCE_MODES = Object.freeze([
  'explicit_input',
  'committed_doc',
  'committed_fixture',
  'committed_test',
  'static_report_shape'
]);

const REQUIRED_REENTRY_EVIDENCE = Object.freeze([
  'internal_service_implemented',
  'bounded_runtime_prep_seam',
  'internal_runtime_entry_surface',
  'approved_context_gate',
  'append_only_audit_plan',
  'shadow_projection_policy',
  'changed_memory_ids_policy',
  'scope_pollution_read_policy',
  'candidate_cache_invalidation_policy',
  'no_hard_delete_default',
  'exact_execution_approval_required',
  'public_mcp_frozen'
]);

const REVIEW_BLOCKERS = Object.freeze([
  'runtime_service_absent',
  'runtime_entry_absent',
  'bounded_apply_seam_absent',
  'cache_invalidation_policy_absent',
  'pollution_prevention_runtime_proof_absent',
  'public_mcp_expansion_not_allowed',
  'readiness_claim_not_allowed'
]);

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noDurableAuditWrite',
  'noDurableMemoryWrite',
  'noPublicMcpExpansion',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noPackageChange',
  'noRemoteWrite',
  'noReadinessClaim'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value) {
  return Number.isInteger(value) ? value : 0;
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

function normalizeFamily(family = {}) {
  const safeFamily = isPlainObject(family) ? family : {};

  return {
    id: normalizeString(safeFamily.id),
    status: normalizeString(safeFamily.status),
    evidence: normalizeStringArray(safeFamily.evidence),
    blockers: normalizeStringArray(safeFamily.blockers),
    internalOnly: normalizeBoolean(safeFamily.internalOnly),
    executionApproved: normalizeBoolean(safeFamily.executionApproved),
    publicMcpTool: normalizeBoolean(safeFamily.publicMcpTool),
    runtimeEntryEnabledByDefault: normalizeBoolean(safeFamily.runtimeEntryEnabledByDefault),
    mutatesDurableState: normalizeBoolean(safeFamily.mutatesDurableState),
    hardDeleteAllowed: normalizeBoolean(safeFamily.hardDeleteAllowed),
    realMemoryScanned: normalizeBoolean(safeFamily.realMemoryScanned),
    providerCalls: normalizeInteger(safeFamily.providerCalls),
    readinessClaimed: normalizeBoolean(safeFamily.readinessClaimed)
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

  return normalized;
}

function normalizeContract(contract = {}) {
  const safeContract = isPlainObject(contract) ? contract : {};

  return {
    schemaVersion: normalizeString(safeContract.schemaVersion),
    version: normalizeString(safeContract.version),
    sourceMode: normalizeString(safeContract.sourceMode),
    reviewOnly: normalizeBoolean(safeContract.reviewOnly),
    internalOnly: normalizeBoolean(safeContract.internalOnly),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    executionApproved: normalizeBoolean(safeContract.executionApproved),
    runtimeIntegrated: normalizeBoolean(safeContract.runtimeIntegrated),
    readinessClaimed: normalizeBoolean(safeContract.readinessClaimed),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    families: Array.isArray(safeContract.families)
      ? safeContract.families.map(normalizeFamily)
      : [],
    safety: normalizeSafety(safeContract.safety),
    next: normalizeString(safeContract.next)
  };
}

function familyReadyForInternalReentryReview(family) {
  return family.status === 'READY_FOR_INTERNAL_REENTRY_REVIEW_NOT_EXECUTED' &&
    hasExactSet(family.evidence, REQUIRED_REENTRY_EVIDENCE) &&
    family.blockers.length === 0 &&
    family.internalOnly === true &&
    family.executionApproved === false &&
    family.publicMcpTool === false &&
    family.runtimeEntryEnabledByDefault === false &&
    family.mutatesDurableState === false &&
    family.hardDeleteAllowed === false &&
    family.realMemoryScanned === false &&
    family.providerCalls === 0 &&
    family.readinessClaimed === false;
}

function summarizeDeferredGovernanceFamilyReentryContract(contract = {}) {
  const normalized = normalizeContract(contract);
  const familyIds = normalized.families.map(family => family.id).filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = SAFE_SOURCE_MODES.includes(normalized.sourceMode);
  const familySetExact = hasExactSet(familyIds, DEFERRED_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const noGlobalExecution =
    normalized.reviewOnly === true &&
    normalized.internalOnly === true &&
    normalized.publicMcpExpanded === false &&
    normalized.executionApproved === false &&
    normalized.runtimeIntegrated === false &&
    normalized.readinessClaimed === false;
  const safetyClear =
    NO_SIDE_EFFECT_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false;
  const familiesSafe = normalized.families.every(family =>
    DEFERRED_FAMILIES.includes(family.id) &&
    family.internalOnly === true &&
    family.executionApproved === false &&
    family.publicMcpTool === false &&
    family.mutatesDurableState === false &&
    family.hardDeleteAllowed === false &&
    family.realMemoryScanned === false &&
    family.providerCalls === 0 &&
    family.readinessClaimed === false
  );
  const familyReports = normalized.families.map(family => {
    const missingEvidence = REQUIRED_REENTRY_EVIDENCE
      .filter(evidenceId => !family.evidence.includes(evidenceId));
    const unknownEvidence = family.evidence
      .filter(evidenceId => !REQUIRED_REENTRY_EVIDENCE.includes(evidenceId));
    return {
      id: family.id,
      status: family.status,
      readyForInternalReentryReview: familyReadyForInternalReentryReview(family),
      missingEvidence,
      unknownEvidence,
      blockers: family.blockers,
      internalOnly: family.internalOnly,
      executionApproved: false,
      publicMcpTool: false,
      readinessClaimed: false
    };
  });
  const acceptedForGovernanceReview =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    familySetExact &&
    publicMcpFrozen &&
    noGlobalExecution &&
    safetyClear &&
    familiesSafe;
  const readyForInternalReentryReview =
    acceptedForGovernanceReview &&
    familyReports.every(report => report.readyForInternalReentryReview);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    acceptedForGovernanceReview,
    readyForInternalReentryReview,
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    deferredFamilies: {
      exact: familySetExact,
      required: DEFERRED_FAMILIES,
      present: familyIds,
      missing: DEFERRED_FAMILIES.filter(id => !familyIds.includes(id)),
      unexpected: familyIds.filter(id => !DEFERRED_FAMILIES.includes(id))
    },
    requiredReentryEvidence: REQUIRED_REENTRY_EVIDENCE,
    reviewBlockers: REVIEW_BLOCKERS,
    familyReports,
    safety: {
      noSideEffects: safetyClear,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed
    }
  };
}

module.exports = {
  DEFERRED_FAMILIES,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_REENTRY_EVIDENCE,
  REVIEW_BLOCKERS,
  SAFE_SOURCE_MODES,
  normalizeContract,
  summarizeDeferredGovernanceFamilyReentryContract
};
