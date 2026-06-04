const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_DENIED_ACTIONS,
  STALE_BLOCKER_BY_SURFACE
} = require('./MemorySupersedeCurrentRealityRebaseline');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'memory-supersede-runtime-prep-rebase-review-v1';
const EXPECTED_VERSION = 'v1';
const REQUIRED_REBASELINE_DECISION = 'SUPERSEDE_CURRENT_REALITY_REBASELINE_ACCEPTED_NOT_READY';
const STALE_BLOCKERS = Object.freeze(Object.values(STALE_BLOCKER_BY_SURFACE));
const REQUIRED_PRESERVED_BLOCKERS = Object.freeze([
  'appServiceWiring_not_committed_or_not_proven',
  'internalCliEntry_not_committed_or_not_proven',
  'internalRuntimeEntry_not_committed_or_not_proven',
  'sharedGateAdoption_not_committed_or_not_proven',
  'liveGovernanceProof_not_committed_or_not_proven'
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

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function arraysEqual(left, right) {
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function missingValues(values, requiredValues) {
  return requiredValues.filter(value => !values.includes(value));
}

function normalizeRebaselineSummary(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    acceptedForRebaseline: normalizeBoolean(safeValue.acceptedForRebaseline),
    decision: normalizeString(safeValue.decision),
    stalePriorBlockers: normalizeStringArray(safeValue.stalePriorBlockers),
    remainingBlockers: normalizeStringArray(safeValue.remainingBlockers),
    publicMcpExpanded: normalizeBoolean(safeValue.publicMcpExpanded)
  };
}

function normalizeMemorySupersedeRuntimePrepRebaseReviewInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    version: normalizeString(safeInput.version),
    sourceMode: normalizeString(safeInput.sourceMode),
    candidateName: normalizeString(safeInput.candidateName),
    candidateDecision: normalizeString(safeInput.candidateDecision),
    candidateBlockers: uniqueSorted(normalizeStringArray(safeInput.candidateBlockers)),
    rebaselineSummary: normalizeRebaselineSummary(safeInput.rebaselineSummary),
    publicTools: uniqueSorted(normalizeStringArray(safeInput.publicTools)),
    deniedActions: uniqueSorted(normalizeStringArray(safeInput.deniedActions)),
    candidateRefs: normalizeStringArray(safeInput.candidateRefs),
    plannedNextActions: normalizeStringArray(safeInput.plannedNextActions)
  };
}

function summarizeMemorySupersedeRuntimePrepRebaseReview(input = {}) {
  const normalized = normalizeMemorySupersedeRuntimePrepRebaseReviewInput(input);
  const schemaVersionSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceModeSafe = normalized.sourceMode === 'explicit_input';
  const rebaselineAccepted =
    normalized.rebaselineSummary.acceptedForRebaseline === true &&
    normalized.rebaselineSummary.decision === REQUIRED_REBASELINE_DECISION &&
    normalized.rebaselineSummary.publicMcpExpanded === false;
  const publicMcpFrozen = arraysEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const missingDeniedActions = missingValues(normalized.deniedActions, REQUIRED_DENIED_ACTIONS);
  const staleBlockersStillPresent = normalized.candidateBlockers
    .filter(blocker => STALE_BLOCKERS.includes(blocker));
  const preservedRemainingBlockers = normalized.rebaselineSummary.remainingBlockers
    .filter(blocker => REQUIRED_PRESERVED_BLOCKERS.includes(blocker));
  const missingPreservedBlockers = missingValues(
    preservedRemainingBlockers,
    REQUIRED_PRESERVED_BLOCKERS
  );
  const acceptedForRuntimePrepRebase =
    schemaVersionSafe &&
    versionSafe &&
    sourceModeSafe &&
    rebaselineAccepted &&
    publicMcpFrozen &&
    missingDeniedActions.length === 0 &&
    staleBlockersStillPresent.length === 0 &&
    missingPreservedBlockers.length === 0;

  return {
    sourceMode: 'explicit_input',
    acceptedForRuntimePrepRebase,
    decision: acceptedForRuntimePrepRebase
      ? 'SUPERSEDE_RUNTIME_PREP_REBASE_REVIEW_ACCEPTED_NOT_READY'
      : 'NOT_READY_BLOCKED',
    approvalStatus: 'BLOCKED_PENDING_APPROVAL',
    candidateName: normalized.candidateName,
    candidateDecision: normalized.candidateDecision,
    rebaselineAccepted,
    publicMcpExpanded: false,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      expected: PUBLIC_MCP_TOOLS,
      observed: normalized.publicTools
    },
    staleBlockers: {
      expectedRemoved: STALE_BLOCKERS,
      stillPresent: staleBlockersStillPresent,
      removed: staleBlockersStillPresent.length === 0
    },
    preservedRemainingBlockers: {
      required: REQUIRED_PRESERVED_BLOCKERS,
      observed: preservedRemainingBlockers,
      missing: missingPreservedBlockers
    },
    deniedActions: {
      required: REQUIRED_DENIED_ACTIONS,
      observed: normalized.deniedActions,
      missing: missingDeniedActions
    },
    candidateRefs: normalized.candidateRefs,
    plannedNextActions: normalized.plannedNextActions,
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      stagesOrCommits: false,
      pushes: false,
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false
    },
    nextStep: acceptedForRuntimePrepRebase
      ? 'Use this review as a pre-commit guard before rebasing supersede runtime-prep/app candidates; keep runtime apply, live proof, public MCP expansion, and readiness blocked.'
      : 'Repair stale blockers, public MCP drift, denied-action coverage, or current-reality evidence before using supersede runtime-prep/app candidates.'
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_PRESERVED_BLOCKERS,
  REQUIRED_REBASELINE_DECISION,
  STALE_BLOCKERS,
  normalizeMemorySupersedeRuntimePrepRebaseReviewInput,
  summarizeMemorySupersedeRuntimePrepRebaseReview
};
