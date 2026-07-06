'use strict';

const { TOOL_DEFINITIONS } = require('./constants');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'memory-lifecycle-projection-cleanup-contract-v1';
const EXPECTED_VERSION = 'v1';

const PUBLIC_MCP_TOOLS = Object.freeze(TOOL_DEFINITIONS.map(tool => tool.name));

const REQUIRED_LIFECYCLE_FAMILIES = Object.freeze([
  'validate_memory',
  'tombstone_memory',
  'supersede_memory',
  'memory_exclude',
  'memory_forget'
]);

const REQUIRED_PROJECTION_FAMILIES = Object.freeze([
  'diary_record',
  'sqlite_shadow_record',
  'sqlite_memory_chunks',
  'vector_index',
  'embedding_cache',
  'candidate_cache',
  'write_audit',
  'recall_audit',
  'reconcile_queue',
  'degraded_payload'
]);

const REQUIRED_HANDLING_BY_PROJECTION = Object.freeze({
  diary_record: Object.freeze(['preserve_with_suppression']),
  sqlite_shadow_record: Object.freeze(['update_status_projection']),
  sqlite_memory_chunks: Object.freeze(['suppress_or_rebuild_filtered_projection']),
  vector_index: Object.freeze(['suppress_or_rebuild_filtered_projection']),
  embedding_cache: Object.freeze(['clear_dependent_entries']),
  candidate_cache: Object.freeze(['clear_dependent_entries']),
  write_audit: Object.freeze(['append_only_low_disclosure_audit']),
  recall_audit: Object.freeze(['append_only_low_disclosure_audit']),
  reconcile_queue: Object.freeze(['clear_or_queue_scoped_residuals']),
  degraded_payload: Object.freeze(['drop_or_block_until_reconciled'])
});

const REQUIRED_GENERAL_PROJECTION_FLAGS = Object.freeze([
  'exact_memory_id_scoped',
  'target_family_scoped',
  'changed_memory_ids_emitted',
  'governance_revision_emitted',
  'suppression_before_recall',
  'search_projection_rechecked',
  'separate_apply_approval_required',
  'runtime_validation_required'
]);

const REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION = Object.freeze({
  diary_record: Object.freeze([
    'diary_authority_retained',
    'suppression_state_bound'
  ]),
  sqlite_shadow_record: Object.freeze([
    'status_projection_updated',
    'scope_boundary_retained'
  ]),
  sqlite_memory_chunks: Object.freeze([
    'derived_chunks_suppressed',
    'dependent_entries_cleared'
  ]),
  vector_index: Object.freeze([
    'derived_vector_suppressed',
    'dependent_entries_cleared'
  ]),
  embedding_cache: Object.freeze([
    'embedding_cache_invalidated',
    'dependent_entries_cleared'
  ]),
  candidate_cache: Object.freeze([
    'dependent_candidate_entries_cleared',
    'cache_hit_projection_rechecked',
    'stale_suppressed_cache_reuse_blocked'
  ]),
  write_audit: Object.freeze([
    'append_only_preserved',
    'low_disclosure_audit_only'
  ]),
  recall_audit: Object.freeze([
    'append_only_preserved',
    'low_disclosure_audit_only'
  ]),
  reconcile_queue: Object.freeze([
    'reconcile_tasks_scoped',
    'residual_handled_by_separate_plan'
  ]),
  degraded_payload: Object.freeze([
    'degraded_payload_scoped',
    'residual_handled_by_separate_plan'
  ])
});

const REQUIRED_FAMILY_FLAGS = Object.freeze([
  'projection_set_exact',
  'changed_memory_ids_required',
  'governance_revision_required',
  'all_projection_suppression_required',
  'candidate_cache_recheck_required',
  'audit_append_only_required',
  'residual_cleanup_separate_plan_required',
  'public_mcp_frozen'
]);

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noDurableMemoryWrite',
  'noDurableAuditWrite',
  'noRawMemoryRead',
  'noRawStoreRead',
  'noRawAuditRead',
  'noRawContentOutput',
  'noRawPathOutput',
  'noSecretRead',
  'noLogRead',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noPackageChange',
  'noRemoteWrite',
  'noReadinessClaim',
  'noPublicMcpExpansion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeString).filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
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

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};

  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawPrivateMemoryExposed = normalizeBoolean(safeSafety.rawPrivateMemoryExposed);
  normalized.rawLogExposed = normalizeBoolean(safeSafety.rawLogExposed);

  return normalized;
}

function normalizeProjectionPolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    projectionFamily: normalizeString(safePolicy.projectionFamily),
    handlingMode: normalizeString(safePolicy.handlingMode),
    generalFlags: normalizeStringArray(safePolicy.generalFlags),
    specificFlags: normalizeStringArray(safePolicy.specificFlags),
    evidenceKind: normalizeString(safePolicy.evidenceKind),
    exactMemoryIdScoped: normalizeBoolean(safePolicy.exactMemoryIdScoped),
    targetFamilyScoped: normalizeBoolean(safePolicy.targetFamilyScoped),
    changedMemoryIdsEmitted: normalizeBoolean(safePolicy.changedMemoryIdsEmitted),
    governanceRevisionEmitted: normalizeBoolean(safePolicy.governanceRevisionEmitted),
    suppressesBeforeRecall: normalizeBoolean(safePolicy.suppressesBeforeRecall),
    searchProjectionRechecked: normalizeBoolean(safePolicy.searchProjectionRechecked),
    requiresSeparateApplyApproval: normalizeBoolean(safePolicy.requiresSeparateApplyApproval),
    requiresRuntimeValidationBeforeApply: normalizeBoolean(safePolicy.requiresRuntimeValidationBeforeApply),
    rawContentOutput: normalizeBoolean(safePolicy.rawContentOutput),
    rawPathOutput: normalizeBoolean(safePolicy.rawPathOutput),
    rawIdOutput: normalizeBoolean(safePolicy.rawIdOutput),
    appliesNow: normalizeBoolean(safePolicy.appliesNow),
    mutatesDurableStateNow: normalizeBoolean(safePolicy.mutatesDurableStateNow),
    providerCalls: normalizeInteger(safePolicy.providerCalls),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed)
  };
}

function normalizeFamilyPolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    lifecycleFamily: normalizeString(safePolicy.lifecycleFamily),
    projectionPolicies: Array.isArray(safePolicy.projectionPolicies)
      ? safePolicy.projectionPolicies.map(normalizeProjectionPolicy)
      : [],
    familyFlags: normalizeStringArray(safePolicy.familyFlags),
    publicMcpTool: normalizeBoolean(safePolicy.publicMcpTool),
    publicMcpExpansion: normalizeBoolean(safePolicy.publicMcpExpansion),
    executionApproved: normalizeBoolean(safePolicy.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePolicy.runtimeIntegrated),
    mutatesDurableStateNow: normalizeBoolean(safePolicy.mutatesDurableStateNow),
    providerCalls: normalizeInteger(safePolicy.providerCalls),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed)
  };
}

function normalizeContract(contract = {}) {
  const safeContract = isPlainObject(contract) ? contract : {};

  return {
    schemaVersion: normalizeString(safeContract.schemaVersion),
    version: normalizeString(safeContract.version),
    sourceMode: normalizeString(safeContract.sourceMode),
    reviewOnly: normalizeBoolean(safeContract.reviewOnly),
    contractOnly: normalizeBoolean(safeContract.contractOnly),
    fixtureOnly: normalizeBoolean(safeContract.fixtureOnly),
    executionApproved: normalizeBoolean(safeContract.executionApproved),
    runtimeIntegrated: normalizeBoolean(safeContract.runtimeIntegrated),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    readinessClaimed: normalizeBoolean(safeContract.readinessClaimed),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    lifecycleFamilyPolicies: Array.isArray(safeContract.lifecycleFamilyPolicies)
      ? safeContract.lifecycleFamilyPolicies.map(normalizeFamilyPolicy)
      : [],
    safety: normalizeSafety(safeContract.safety)
  };
}

function projectionAccepted(policy) {
  const allowedHandlingModes = REQUIRED_HANDLING_BY_PROJECTION[policy.projectionFamily] || [];
  const requiredSpecificFlags = REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION[policy.projectionFamily] || [];

  return REQUIRED_PROJECTION_FAMILIES.includes(policy.projectionFamily) &&
    allowedHandlingModes.includes(policy.handlingMode) &&
    hasExactSet(policy.generalFlags, REQUIRED_GENERAL_PROJECTION_FLAGS) &&
    hasExactSet(policy.specificFlags, requiredSpecificFlags) &&
    policy.evidenceKind === 'fixture_or_contract_evidence_only' &&
    policy.exactMemoryIdScoped === true &&
    policy.targetFamilyScoped === true &&
    policy.changedMemoryIdsEmitted === true &&
    policy.governanceRevisionEmitted === true &&
    policy.suppressesBeforeRecall === true &&
    policy.searchProjectionRechecked === true &&
    policy.requiresSeparateApplyApproval === true &&
    policy.requiresRuntimeValidationBeforeApply === true &&
    policy.rawContentOutput === false &&
    policy.rawPathOutput === false &&
    policy.rawIdOutput === false &&
    policy.appliesNow === false &&
    policy.mutatesDurableStateNow === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false;
}

function familyAccepted(policy) {
  const projectionFamilies = policy.projectionPolicies
    .map(item => item.projectionFamily)
    .filter(Boolean);

  return REQUIRED_LIFECYCLE_FAMILIES.includes(policy.lifecycleFamily) &&
    hasExactSet(projectionFamilies, REQUIRED_PROJECTION_FAMILIES) &&
    hasExactSet(policy.familyFlags, REQUIRED_FAMILY_FLAGS) &&
    policy.publicMcpExpansion === false &&
    policy.executionApproved === false &&
    policy.runtimeIntegrated === false &&
    policy.mutatesDurableStateNow === false &&
    policy.providerCalls === 0 &&
    policy.readinessClaimed === false &&
    policy.projectionPolicies.every(projectionAccepted);
}

function summarizeProjectionPolicy(policy) {
  const allowedHandlingModes = REQUIRED_HANDLING_BY_PROJECTION[policy.projectionFamily] || [];
  const requiredSpecificFlags = REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION[policy.projectionFamily] || [];

  return {
    projectionFamily: policy.projectionFamily,
    accepted: projectionAccepted(policy),
    handlingMode: policy.handlingMode,
    requiredHandlingModes: allowedHandlingModes,
    missingGeneralFlags: REQUIRED_GENERAL_PROJECTION_FLAGS
      .filter(flag => !policy.generalFlags.includes(flag)),
    unexpectedGeneralFlags: policy.generalFlags
      .filter(flag => !REQUIRED_GENERAL_PROJECTION_FLAGS.includes(flag)),
    missingSpecificFlags: requiredSpecificFlags
      .filter(flag => !policy.specificFlags.includes(flag)),
    unexpectedSpecificFlags: policy.specificFlags
      .filter(flag => !requiredSpecificFlags.includes(flag)),
    exactMemoryIdScoped: policy.exactMemoryIdScoped,
    targetFamilyScoped: policy.targetFamilyScoped,
    changedMemoryIdsEmitted: policy.changedMemoryIdsEmitted,
    governanceRevisionEmitted: policy.governanceRevisionEmitted,
    suppressesBeforeRecall: policy.suppressesBeforeRecall,
    searchProjectionRechecked: policy.searchProjectionRechecked,
    requiresSeparateApplyApproval: policy.requiresSeparateApplyApproval,
    requiresRuntimeValidationBeforeApply: policy.requiresRuntimeValidationBeforeApply,
    rawContentOutput: policy.rawContentOutput,
    rawPathOutput: policy.rawPathOutput,
    rawIdOutput: policy.rawIdOutput,
    appliesNow: policy.appliesNow,
    mutatesDurableStateNow: policy.mutatesDurableStateNow,
    providerCalls: policy.providerCalls,
    readinessClaimed: policy.readinessClaimed
  };
}

function summarizeMemoryLifecycleProjectionCleanupContract(contract = {}) {
  const normalized = normalizeContract(contract);
  const lifecycleFamilies = normalized.lifecycleFamilyPolicies
    .map(item => item.lifecycleFamily)
    .filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const lifecycleFamilySetExact = hasExactSet(lifecycleFamilies, REQUIRED_LIFECYCLE_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const noGlobalExecution =
    normalized.reviewOnly === true &&
    normalized.contractOnly === true &&
    normalized.fixtureOnly === true &&
    normalized.executionApproved === false &&
    normalized.runtimeIntegrated === false &&
    normalized.publicMcpExpanded === false &&
    normalized.readinessClaimed === false;
  const safetyClear =
    NO_SIDE_EFFECT_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawPrivateMemoryExposed === false &&
    normalized.safety.rawLogExposed === false;

  const familyReports = normalized.lifecycleFamilyPolicies.map(policy => {
    const projectionFamilies = policy.projectionPolicies
      .map(item => item.projectionFamily)
      .filter(Boolean);

    return {
      lifecycleFamily: policy.lifecycleFamily,
      accepted: familyAccepted(policy),
      projectionFamilies: {
        exact: hasExactSet(projectionFamilies, REQUIRED_PROJECTION_FAMILIES),
        present: projectionFamilies,
        missing: REQUIRED_PROJECTION_FAMILIES
          .filter(family => !projectionFamilies.includes(family)),
        unexpected: projectionFamilies
          .filter(family => !REQUIRED_PROJECTION_FAMILIES.includes(family))
      },
      missingFamilyFlags: REQUIRED_FAMILY_FLAGS
        .filter(flag => !policy.familyFlags.includes(flag)),
      unexpectedFamilyFlags: policy.familyFlags
        .filter(flag => !REQUIRED_FAMILY_FLAGS.includes(flag)),
      publicMcpTool: policy.publicMcpTool,
      publicMcpExpansion: false,
      executionApproved: false,
      runtimeIntegrated: false,
      mutatesDurableStateNow: false,
      providerCalls: 0,
      readinessClaimed: false,
      projectionReports: policy.projectionPolicies.map(summarizeProjectionPolicy)
    };
  });

  const contractAccepted =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    lifecycleFamilySetExact &&
    publicMcpFrozen &&
    noGlobalExecution &&
    safetyClear &&
    familyReports.every(report => report.accepted);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    contractAccepted,
    decision: contractAccepted
      ? 'ALL_PROJECTION_LIFECYCLE_CLEANUP_CONTRACT_ACCEPTED_NOT_EXECUTED_NOT_READY'
      : 'ALL_PROJECTION_LIFECYCLE_CLEANUP_CONTRACT_BLOCKED_NOT_READY',
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    lifecycleFamilies: {
      exact: lifecycleFamilySetExact,
      required: REQUIRED_LIFECYCLE_FAMILIES,
      present: lifecycleFamilies,
      missing: REQUIRED_LIFECYCLE_FAMILIES
        .filter(family => !lifecycleFamilies.includes(family)),
      unexpected: lifecycleFamilies
        .filter(family => !REQUIRED_LIFECYCLE_FAMILIES.includes(family))
    },
    projectionFamilies: {
      required: REQUIRED_PROJECTION_FAMILIES,
      handlingByProjection: REQUIRED_HANDLING_BY_PROJECTION,
      requiredGeneralFlags: REQUIRED_GENERAL_PROJECTION_FLAGS,
      requiredSpecificFlagsByProjection: REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION
    },
    requiredFamilyFlags: REQUIRED_FAMILY_FLAGS,
    familyReports,
    safety: {
      noSideEffects: safetyClear,
      noRuntimeMutation: normalized.safety.noRuntimeMutation,
      noDurableMemoryWrite: normalized.safety.noDurableMemoryWrite,
      noDurableAuditWrite: normalized.safety.noDurableAuditWrite,
      noRawMemoryRead: normalized.safety.noRawMemoryRead,
      noRawStoreRead: normalized.safety.noRawStoreRead,
      noRawAuditRead: normalized.safety.noRawAuditRead,
      noRawContentOutput: normalized.safety.noRawContentOutput,
      noRawPathOutput: normalized.safety.noRawPathOutput,
      noSecretRead: normalized.safety.noSecretRead,
      noLogRead: normalized.safety.noLogRead,
      noProviderCall: normalized.safety.noProviderCall,
      noReadinessClaim: normalized.safety.noReadinessClaim,
      noPublicMcpExpansion: normalized.safety.noPublicMcpExpansion,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawPrivateMemoryExposed: normalized.safety.rawPrivateMemoryExposed,
      rawLogExposed: normalized.safety.rawLogExposed
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_FLAGS,
  REQUIRED_GENERAL_PROJECTION_FLAGS,
  REQUIRED_HANDLING_BY_PROJECTION,
  REQUIRED_LIFECYCLE_FAMILIES,
  REQUIRED_PROJECTION_FAMILIES,
  REQUIRED_SPECIFIC_FLAGS_BY_PROJECTION,
  summarizeMemoryLifecycleProjectionCleanupContract
};
