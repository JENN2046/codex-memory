const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'memory-supersede-current-reality-rebaseline-v1';
const EXPECTED_VERSION = 'v1';
const PUBLIC_MCP_TOOLS = Object.freeze([
  'memory_overview',
  'record_memory',
  'search_memory'
]);
const IMPLEMENTED_SURFACES = Object.freeze([
  'twoRecordShadowSeam',
  'internalSupersedeMutationService',
  'supersedeTempLocalEvidence'
]);
const REMAINING_SURFACES = Object.freeze([
  'appServiceWiring',
  'internalCliEntry',
  'internalRuntimeEntry',
  'sharedGateAdoption',
  'liveGovernanceProof'
]);
const STALE_BLOCKER_BY_SURFACE = Object.freeze({
  twoRecordShadowSeam: 'two_record_shadow_seam_not_implemented',
  internalSupersedeMutationService: 'internal_supersede_service_not_implemented',
  supersedeTempLocalEvidence: 'supersede_temp_local_evidence_missing'
});
const REQUIRED_DENIED_ACTIONS = Object.freeze([
  'public_mcp_expansion',
  'true_record_memory',
  'true_search_memory',
  'provider_call',
  'raw_memory_read',
  'durable_real_memory_write',
  'durable_real_audit_write',
  'config_watchdog_startup_change',
  'push',
  'readiness_claim',
  'reliability_claim'
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

function normalizeBoolean(value) {
  return value === true;
}

function normalizeStringArray(values) {
  return cloneArray(values).map(normalizeString).filter(Boolean);
}

function normalizeSurfaceBooleans(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalized = {};
  for (const surface of [...IMPLEMENTED_SURFACES, ...REMAINING_SURFACES]) {
    normalized[surface] = normalizeBoolean(safeInput[surface]);
  }
  return normalized;
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function missingValues(values, requiredValues) {
  return requiredValues.filter(value => !values.includes(value));
}

function normalizeMemorySupersedeCurrentRealityRebaselineInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    version: normalizeString(safeInput.version),
    sourceMode: normalizeString(safeInput.sourceMode),
    observedHead: normalizeString(safeInput.observedHead),
    implementedSurfaces: normalizeSurfaceBooleans(safeInput.implementedSurfaces),
    remainingSurfaces: normalizeSurfaceBooleans(safeInput.remainingSurfaces),
    priorBlockers: normalizeStringArray(safeInput.priorBlockers),
    publicTools: uniqueSorted(normalizeStringArray(safeInput.publicTools)),
    deniedActions: uniqueSorted(normalizeStringArray(safeInput.deniedActions)),
    evidenceRefs: normalizeStringArray(safeInput.evidenceRefs),
    notes: normalizeStringArray(safeInput.notes)
  };
}

function summarizeMemorySupersedeCurrentRealityRebaseline(input = {}) {
  const normalized = normalizeMemorySupersedeCurrentRealityRebaselineInput(input);
  const schemaVersionSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceModeSafe = normalized.sourceMode === 'explicit_input';
  const publicMcpFrozen = arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const missingDeniedActions = missingValues(normalized.deniedActions, REQUIRED_DENIED_ACTIONS);
  const deniedActionsSafe = missingDeniedActions.length === 0;
  const implementedSurfaceStatus = IMPLEMENTED_SURFACES.map(surface => ({
    surface,
    implemented: normalized.implementedSurfaces[surface] === true,
    staleBlocker: STALE_BLOCKER_BY_SURFACE[surface]
  }));
  const remainingSurfaceStatus = REMAINING_SURFACES.map(surface => ({
    surface,
    completed: normalized.remainingSurfaces[surface] === true
  }));
  const stalePriorBlockers = implementedSurfaceStatus
    .filter(item => item.implemented && normalized.priorBlockers.includes(item.staleBlocker))
    .map(item => item.staleBlocker);
  const missingImplementedSurfaces = implementedSurfaceStatus
    .filter(item => item.implemented !== true)
    .map(item => item.surface);
  const remainingBlockers = remainingSurfaceStatus
    .filter(item => item.completed !== true)
    .map(item => `${item.surface}_not_committed_or_not_proven`);
  const acceptedForRebaseline =
    schemaVersionSafe &&
    versionSafe &&
    sourceModeSafe &&
    publicMcpFrozen &&
    deniedActionsSafe &&
    missingImplementedSurfaces.length === 0;

  return {
    sourceMode: 'explicit_input',
    acceptedForRebaseline,
    decision: acceptedForRebaseline
      ? 'SUPERSEDE_CURRENT_REALITY_REBASELINE_ACCEPTED_NOT_READY'
      : 'NOT_READY_BLOCKED',
    approvalStatus: 'BLOCKED_PENDING_APPROVAL',
    observedHead: normalized.observedHead,
    publicMcpExpanded: false,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      expected: PUBLIC_MCP_TOOLS,
      observed: normalized.publicTools
    },
    implementedSurfaces: {
      allRequiredPresent: missingImplementedSurfaces.length === 0,
      missing: missingImplementedSurfaces,
      items: implementedSurfaceStatus
    },
    stalePriorBlockers,
    remainingBlockers,
    deniedActions: {
      required: REQUIRED_DENIED_ACTIONS,
      observed: normalized.deniedActions,
      missing: missingDeniedActions,
      safe: deniedActionsSafe
    },
    evidenceRefs: normalized.evidenceRefs,
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false
    },
    nextStep: acceptedForRebaseline
      ? 'Do not commit stale supersede blockers. Rebase supersede app/runtime candidates against the implemented shadow seam, internal service, and temp-local evidence before any app wiring or live proof.'
      : 'Repair explicit rebaseline evidence before using supersede candidates for stage, commit, push, runtime apply, or readiness decisions.'
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  IMPLEMENTED_SURFACES,
  PUBLIC_MCP_TOOLS,
  REMAINING_SURFACES,
  REQUIRED_DENIED_ACTIONS,
  STALE_BLOCKER_BY_SURFACE,
  normalizeMemorySupersedeCurrentRealityRebaselineInput,
  summarizeMemorySupersedeCurrentRealityRebaseline
};
