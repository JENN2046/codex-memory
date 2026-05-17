const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const SAFE_SOURCE_TYPES = Object.freeze([
  'committed_fixture',
  'committed_test',
  'committed_doc',
  'committed_report_shape',
  'explicit_review_summary'
]);

const REQUIRED_SURFACES = Object.freeze([
  'proposal_lifecycle',
  'supersession_lifecycle',
  'tombstone_lifecycle',
  'validate_memory_internal',
  'mutation_audit',
  'approval_posture',
  'public_mcp_freeze'
]);

const REQUIRED_LIFECYCLE_CASES = Object.freeze([
  'proposal_accept',
  'proposal_reject',
  'supersession_deferred',
  'tombstone_deferred'
]);

const REQUIRED_BLOCKERS = Object.freeze([
  'runtime_schema_version_enforcement_incomplete',
  'public_mcp_governance_expansion_not_approved',
  'durable_mutation_not_approved',
  'real_memory_scan_blocked',
  'migration_import_export_apply_blocked',
  'backup_restore_blocked',
  'final_rc_matrix_not_executed',
  'v1_rc_not_ready_blocked'
]);

const REQUIRED_APPROVALS = Object.freeze([
  'runtime_mutation',
  'public_mcp_tool_or_schema_expansion',
  'real_memory_scan_export_import',
  'migration_import_export_apply',
  'backup_restore',
  'provider_service_config_action',
  'push_tag_release_deploy'
]);

const NO_SIDE_EFFECT_SAFETY_FLAGS = Object.freeze([
  'noRuntimeMutation',
  'noPublicMcpExpansion',
  'noDurableMemoryWrite',
  'noRealMemoryScan',
  'noMigrationImportExportApply',
  'noBackupRestore',
  'noProviderCall',
  'noServiceStart',
  'noConfigMutation',
  'noPackageScriptChange',
  'noRemoteWrite'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

const SENSITIVE_FRAGMENT_PATTERNS = Object.freeze([
  /authorization\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
  /bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]+["']?/gi,
  /\bapi[_-]?key\b/gi,
  /raw_workspace_id\s*[:=]\s*["']?[^"',;\s]+["']?/gi,
  /\braw_workspace_id\b/gi
]);

function redactSensitiveFragments(value) {
  let redacted = value;

  for (const pattern of SENSITIVE_FRAGMENT_PATTERNS) {
    redacted = redacted.replace(pattern, '<redacted>');
  }

  return redacted;
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

function normalizeSurface(surface = {}) {
  const safeSurface = isPlainObject(surface) ? surface : {};

  return {
    id: normalizeString(safeSurface.id),
    status: normalizeString(safeSurface.status),
    sourceArtifacts: normalizeStringArray(safeSurface.sourceArtifacts),
    runtimeIntegrated: normalizeBoolean(safeSurface.runtimeIntegrated),
    publicMcpTool: normalizeBoolean(safeSurface.publicMcpTool),
    runtimeMutationAllowedNow: normalizeBoolean(safeSurface.runtimeMutationAllowedNow),
    publicMcpExpansionAllowedNow: normalizeBoolean(safeSurface.publicMcpExpansionAllowedNow),
    realMemoryScanAllowedNow: normalizeBoolean(safeSurface.realMemoryScanAllowedNow),
    mutated: normalizeBoolean(safeSurface.mutated)
  };
}

function normalizeLifecycleCase(lifecycleCase = {}) {
  const safeCase = isPlainObject(lifecycleCase) ? lifecycleCase : {};

  return {
    id: normalizeString(safeCase.id),
    from: normalizeString(safeCase.from),
    to: normalizeString(safeCase.to),
    acceptedForPlanning: normalizeBoolean(safeCase.acceptedForPlanning),
    runtimeIntegrated: normalizeBoolean(safeCase.runtimeIntegrated),
    publicMcpTool: normalizeBoolean(safeCase.publicMcpTool),
    internalOnly: normalizeBoolean(safeCase.internalOnly),
    deferred: normalizeBoolean(safeCase.deferred),
    hardDeleteAllowed: normalizeBoolean(safeCase.hardDeleteAllowed),
    mutated: normalizeBoolean(safeCase.mutated)
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

  return normalized;
}

function normalizeMemoryGovernanceLifecycleContract(contract = {}) {
  const safeContract = isPlainObject(contract) ? contract : {};

  return {
    schemaVersion: normalizeString(safeContract.schemaVersion),
    version: normalizeString(safeContract.version),
    phase: normalizeString(safeContract.phase),
    fixtureOnly: normalizeBoolean(safeContract.fixtureOnly),
    reviewOnly: normalizeBoolean(safeContract.reviewOnly),
    synthetic: normalizeBoolean(safeContract.synthetic),
    mutated: normalizeBoolean(safeContract.mutated),
    runtimeIntegrated: normalizeBoolean(safeContract.runtimeIntegrated),
    publicMcpExpanded: normalizeBoolean(safeContract.publicMcpExpanded),
    publicToolsFrozen: normalizeBoolean(safeContract.publicToolsFrozen),
    publicTools: normalizeStringArray(safeContract.publicTools),
    safeSourceTypes: normalizeStringArray(safeContract.safeSourceTypes),
    acceptedSourceTypes: normalizeStringArray(safeContract.acceptedSourceTypes),
    unsupportedSourceTypes: normalizeStringArray(safeContract.unsupportedSourceTypes),
    acceptedForPlanning: normalizeBoolean(safeContract.acceptedForPlanning),
    surfaces: cloneArray(safeContract.surfaces).map(normalizeSurface),
    lifecycleCases: cloneArray(safeContract.lifecycleCases).map(normalizeLifecycleCase),
    blockers: normalizeStringArray(safeContract.blockers),
    requiredApprovals: normalizeStringArray(safeContract.requiredApprovals),
    safety: normalizeSafety(safeContract.safety),
    decision: normalizeString(safeContract.decision),
    next: normalizeString(safeContract.next)
  };
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function summarizeMemoryGovernanceLifecycleContract(contract = {}) {
  const normalized = normalizeMemoryGovernanceLifecycleContract(contract);
  const safeSourceTypes = SAFE_SOURCE_TYPES;
  const unsupportedSourceTypes = normalized.acceptedSourceTypes
    .filter(sourceType => !safeSourceTypes.includes(sourceType));
  const unsupportedDeclaredSafeSourceTypes = normalized.safeSourceTypes
    .filter(sourceType => !safeSourceTypes.includes(sourceType));
  const sourceTypesWhitelisted =
    normalized.acceptedSourceTypes.length > 0 &&
    unsupportedSourceTypes.length === 0 &&
    unsupportedDeclaredSafeSourceTypes.length === 0 &&
    normalized.unsupportedSourceTypes.length === 0;
  const surfaceIds = normalized.surfaces.map(surface => surface.id).filter(Boolean);
  const lifecycleCaseIds = normalized.lifecycleCases.map(lifecycleCase => lifecycleCase.id).filter(Boolean);
  const requiredSurfacesPresent = hasEveryValue(surfaceIds, REQUIRED_SURFACES);
  const requiredLifecycleCasesPresent = hasEveryValue(lifecycleCaseIds, REQUIRED_LIFECYCLE_CASES);
  const requiredBlockersPresent = hasEveryValue(normalized.blockers, REQUIRED_BLOCKERS);
  const requiredApprovalsPresent = hasEveryValue(normalized.requiredApprovals, REQUIRED_APPROVALS);
  const publicMcpFrozen =
    normalized.publicToolsFrozen === true &&
    arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const safetyFlagsClear =
    NO_SIDE_EFFECT_SAFETY_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false;
  const decisionBlocked = normalized.decision === 'NOT_READY_BLOCKED';
  const noRuntimeClaims =
    normalized.mutated === false &&
    normalized.runtimeIntegrated === false &&
    normalized.publicMcpExpanded === false;
  const acceptedForPlanning =
    normalized.fixtureOnly === true &&
    normalized.reviewOnly === true &&
    normalized.synthetic === true &&
    normalized.acceptedForPlanning === true &&
    sourceTypesWhitelisted &&
    requiredSurfacesPresent &&
    requiredLifecycleCasesPresent &&
    requiredBlockersPresent &&
    requiredApprovalsPresent &&
    publicMcpFrozen &&
    safetyFlagsClear &&
    decisionBlocked &&
    noRuntimeClaims;

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    phase: normalized.phase,
    acceptedForPlanning,
    decision: normalized.decision || 'NOT_READY_BLOCKED',
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    mutated: false,
    sourceContract: {
      safe: sourceTypesWhitelisted,
      safeSourceTypes,
      acceptedSourceTypes: normalized.acceptedSourceTypes,
      sourceTypesWhitelisted,
      unsupportedSourceTypes: [
        ...new Set([
          ...normalized.unsupportedSourceTypes,
          ...unsupportedSourceTypes,
          ...unsupportedDeclaredSafeSourceTypes
        ])
      ]
    },
    surfaces: {
      count: surfaceIds.length,
      ids: surfaceIds,
      requiredPresent: requiredSurfacesPresent,
      missingRequired: REQUIRED_SURFACES.filter(surface => !surfaceIds.includes(surface))
    },
    lifecycleCases: {
      count: lifecycleCaseIds.length,
      ids: lifecycleCaseIds,
      requiredPresent: requiredLifecycleCasesPresent,
      missingRequired: REQUIRED_LIFECYCLE_CASES.filter(lifecycleCase =>
        !lifecycleCaseIds.includes(lifecycleCase)
      )
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    blockers: {
      count: normalized.blockers.length,
      ids: normalized.blockers,
      requiredPresent: requiredBlockersPresent,
      missingRequired: REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker))
    },
    requiredApprovals: {
      count: normalized.requiredApprovals.length,
      ids: normalized.requiredApprovals,
      requiredPresent: requiredApprovalsPresent,
      missingRequired: REQUIRED_APPROVALS.filter(approval =>
        !normalized.requiredApprovals.includes(approval)
      )
    },
    safety: {
      noSideEffects: safetyFlagsClear,
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
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_LIFECYCLE_CASES,
  REQUIRED_SURFACES,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceLifecycleContract,
  summarizeMemoryGovernanceLifecycleContract
};
