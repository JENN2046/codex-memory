'use strict';

const {
  parseGitStatusShort
} = require('./MemoryReliabilityProofBaselineIsolationReview');

const EXPECTED_SCHEMA_VERSION = 'memory-reliability-phase-commit-review-v1';
const EXPECTED_VERSION = 'v1';
const DEFAULT_COMMIT_SCOPE_MODE = 'entire_dirty_tree';
const SCOPED_COMMIT_SCOPE_MODE = 'scoped_candidate';

const REQUIRED_DENIED_ACTIONS = Object.freeze([
  'stage',
  'commit',
  'push',
  'liveRecallProof',
  'liveWriteProof',
  'recordMemoryCall',
  'searchMemoryCall',
  'providerCall',
  'rawMemoryRead',
  'jsonlRead',
  'durableMemoryWrite',
  'durableAuditWrite',
  'publicMcpExpansion',
  'packageConfigWatchdogStartupChange',
  'readinessClaim',
  'reliabilityClaim'
]);

const SHARED_STATE_PATHS = Object.freeze([
  'STATUS.md',
  'MAINTENANCE_BACKLOG.md',
  'docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGitStatusShortText(value) {
  return typeof value === 'string' ? value.trimEnd() : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
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

function normalizePath(value) {
  return normalizeString(value).replaceAll('\\', '/');
}

function normalizePathArray(values) {
  return normalizeStringArray(values).map(normalizePath);
}

function classifyPath(pathValue) {
  const path = normalizePath(pathValue);
  const lowerPath = path.toLowerCase();
  const isSharedState = path.startsWith('.agent_board/') ||
    SHARED_STATE_PATHS.includes(path);
  const isReliabilityBaseline = lowerPath.includes('memory_reliability_proof_baseline') ||
    lowerPath.includes('memory-reliability-proof-baseline');
  const isReliabilityPreflight = lowerPath.includes('recall-proof') ||
    lowerPath.includes('recall_proof') ||
    lowerPath.includes('write-proof') ||
    lowerPath.includes('write_proof') ||
    lowerPath.includes('memory_write_preflight') ||
    lowerPath.includes('recall_precision');
  const isRuntimeSurface = path.startsWith('src/') ||
    path.startsWith('tests/') ||
    path === 'package.json' ||
    path === 'package-lock.json';

  if (isSharedState) {
    return 'sharedState';
  }
  if (isReliabilityBaseline) {
    return 'reliabilityBaseline';
  }
  if (isReliabilityPreflight) {
    return 'reliabilityPreflight';
  }
  if (isRuntimeSurface) {
    return 'runtimeSurface';
  }
  return 'other';
}

function summarizeDirtyEntries(gitStatusShort) {
  const entries = parseGitStatusShort(gitStatusShort);
  const buckets = {
    sharedState: [],
    reliabilityBaseline: [],
    reliabilityPreflight: [],
    runtimeSurface: [],
    other: [],
    untracked: [],
    tracked: []
  };

  for (const entry of entries) {
    const path = normalizePath(entry.path);
    const category = classifyPath(path);
    buckets[category].push(path);
    if (entry.status === '??') {
      buckets.untracked.push(path);
    } else {
      buckets.tracked.push(path);
    }
  }

  return {
    dirtyStatusLineCount: entries.length,
    trackedModifiedCount: buckets.tracked.length,
    untrackedCount: buckets.untracked.length,
    sharedStateCount: buckets.sharedState.length,
    reliabilityBaselineCount: buckets.reliabilityBaseline.length,
    reliabilityPreflightCount: buckets.reliabilityPreflight.length,
    runtimeSurfaceCount: buckets.runtimeSurface.length,
    otherCount: buckets.other.length,
    sharedStatePaths: buckets.sharedState,
    reliabilityBaselinePaths: buckets.reliabilityBaseline,
    reliabilityPreflightPaths: buckets.reliabilityPreflight,
    runtimeSurfacePaths: buckets.runtimeSurface,
    otherPaths: buckets.other,
    untrackedPaths: buckets.untracked,
    trackedPaths: buckets.tracked
  };
}

function normalizeIsolationReview(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    status: normalizeString(safeValue.status),
    decision: normalizeString(safeValue.decision),
    isolationReviewAccepted: normalizeBoolean(safeValue.isolationReviewAccepted),
    safeForLiveProof: normalizeBoolean(safeValue.safeForLiveProof),
    safeForCommit: normalizeBoolean(safeValue.safeForCommit),
    baselineReadyForLiveProof: normalizeBoolean(safeValue.baselineReadyForLiveProof),
    dirtyBaselineBlocked: normalizeBoolean(safeValue.dirtyBaselineBlocked),
    unscopedCommitBlocked: normalizeBoolean(safeValue.unscopedCommitBlocked),
    executionStarted: normalizeBoolean(safeValue.executionStarted),
    liveProofStarted: normalizeBoolean(safeValue.liveProofStarted),
    recordMemoryStarted: normalizeBoolean(safeValue.recordMemoryStarted),
    callsSearchMemory: normalizeBoolean(safeValue.callsSearchMemory),
    callsRecordMemory: normalizeBoolean(safeValue.callsRecordMemory),
    callsProvider: normalizeBoolean(safeValue.callsProvider),
    readinessClaimAllowed: normalizeBoolean(safeValue.readinessClaimAllowed),
    memoryRecallReliableClaimed: normalizeBoolean(safeValue.memoryRecallReliableClaimed),
    memoryWriteReliableClaimed: normalizeBoolean(safeValue.memoryWriteReliableClaimed)
  };
}

function normalizeReviewInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    version: normalizeString(safeInput.version),
    sourceMode: normalizeString(safeInput.sourceMode),
    reviewOnly: normalizeBoolean(safeInput.reviewOnly),
    commitScopeSource: normalizeString(safeInput.commitScopeSource),
    commitScopeMode: normalizeString(safeInput.commitScopeMode) || DEFAULT_COMMIT_SCOPE_MODE,
    worktreeOwnership: normalizeString(safeInput.worktreeOwnership),
    sharedStateHunksIsolated: normalizeBoolean(safeInput.sharedStateHunksIsolated),
    proposedCommitPaths: normalizePathArray(safeInput.proposedCommitPaths),
    verifiedIntendedPaths: normalizePathArray(safeInput.verifiedIntendedPaths),
    deniedActions: normalizeStringArray(safeInput.deniedActions),
    gitStatusShort: normalizeGitStatusShortText(safeInput.gitStatusShort),
    isolationReview: normalizeIsolationReview(safeInput.isolationReview)
  };
}

function summarizeMemoryReliabilityPhaseCommitReview(input = {}) {
  const normalized = normalizeReviewInput(input);
  const dirtySummary = summarizeDirtyEntries(normalized.gitStatusShort);
  const dirtyPaths = [
    ...dirtySummary.trackedPaths,
    ...dirtySummary.untrackedPaths
  ];
  const proposedSet = new Set(normalized.proposedCommitPaths);
  const verifiedSet = new Set(normalized.verifiedIntendedPaths);
  const scopedCandidateMode = normalized.commitScopeMode === SCOPED_COMMIT_SCOPE_MODE;
  const proposedCoversDirty = dirtyPaths.length > 0 &&
    dirtyPaths.every(path => proposedSet.has(path));
  const proposedPathsDirty = normalized.proposedCommitPaths.length > 0 &&
    normalized.proposedCommitPaths.every(path => dirtyPaths.includes(path));
  const verifiedCoversProposed = normalized.proposedCommitPaths.length > 0 &&
    normalized.proposedCommitPaths.every(path => verifiedSet.has(path));
  const unrelatedDirtyPaths = dirtyPaths.filter(path => !proposedSet.has(path));
  const proposedSharedStatePaths = normalized.proposedCommitPaths
    .filter(path => classifyPath(path) === 'sharedState');

  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'current_git_status_readonly';
  const reviewOnlySafe = normalized.reviewOnly === true;
  const sourceRefSafe = normalized.commitScopeSource === 'CM-0938';
  const scopeModeSafe = normalized.commitScopeMode === DEFAULT_COMMIT_SCOPE_MODE ||
    scopedCandidateMode;
  const deniedActionsExact = hasExactSet(normalized.deniedActions, REQUIRED_DENIED_ACTIONS);
  const isolationSafe = normalized.isolationReview.status === 'blocked' &&
    normalized.isolationReview.decision === 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_BLOCKED_NOT_EXECUTED' &&
    normalized.isolationReview.isolationReviewAccepted === true &&
    normalized.isolationReview.safeForLiveProof === false &&
    normalized.isolationReview.safeForCommit === false &&
    normalized.isolationReview.baselineReadyForLiveProof === false &&
    normalized.isolationReview.dirtyBaselineBlocked === true &&
    normalized.isolationReview.unscopedCommitBlocked === true;
  const noExecution = normalized.isolationReview.executionStarted === false &&
    normalized.isolationReview.liveProofStarted === false &&
    normalized.isolationReview.recordMemoryStarted === false &&
    normalized.isolationReview.callsSearchMemory === false &&
    normalized.isolationReview.callsRecordMemory === false &&
    normalized.isolationReview.callsProvider === false;
  const noClaims = normalized.isolationReview.readinessClaimAllowed === false &&
    normalized.isolationReview.memoryRecallReliableClaimed === false &&
    normalized.isolationReview.memoryWriteReliableClaimed === false;
  const ownershipVerified = normalized.worktreeOwnership === 'verified_intended_scope';
  const sharedStateSafe = scopedCandidateMode
    ? proposedSharedStatePaths.length === 0 || normalized.sharedStateHunksIsolated === true
    : dirtySummary.sharedStateCount === 0 || normalized.sharedStateHunksIsolated === true;
  const candidateCoverageSafe = scopedCandidateMode ? proposedPathsDirty : proposedCoversDirty;
  const noUnrelatedDirty = unrelatedDirtyPaths.length === 0;
  const candidateReady = schemaSafe &&
    versionSafe &&
    sourceSafe &&
    reviewOnlySafe &&
    sourceRefSafe &&
    scopeModeSafe &&
    deniedActionsExact &&
    isolationSafe &&
    noExecution &&
    noClaims &&
    ownershipVerified &&
    sharedStateSafe &&
    candidateCoverageSafe &&
    verifiedCoversProposed &&
    (scopedCandidateMode || noUnrelatedDirty);
  const blocked = !candidateReady;

  return {
    sourceMode: normalized.sourceMode || 'current_git_status_readonly',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    phaseCommitReviewAccepted: blocked,
    commitCandidateReady: candidateReady,
    safeToStage: false,
    safeToCommit: false,
    safeToPush: false,
    commitScopeMode: normalized.commitScopeMode,
    scopedCandidateMode,
    worktreeOwnership: normalized.worktreeOwnership,
    sharedStateHunksIsolated: normalized.sharedStateHunksIsolated,
    proposedCommitPaths: normalized.proposedCommitPaths,
    verifiedIntendedPaths: normalized.verifiedIntendedPaths,
    proposedSharedStatePaths,
    dirtySummary,
    unrelatedDirtyPaths,
    blockers: [
      ...(!ownershipVerified ? ['worktree_ownership_not_verified'] : []),
      ...(!sharedStateSafe ? ['shared_state_hunks_not_isolated'] : []),
      ...(!scopeModeSafe ? ['commit_scope_mode_invalid'] : []),
      ...(!candidateCoverageSafe ? [scopedCandidateMode
        ? 'proposed_paths_not_dirty'
        : 'proposed_commit_does_not_cover_dirty_paths'] : []),
      ...(!verifiedCoversProposed ? ['proposed_paths_not_all_verified'] : []),
      ...(!scopedCandidateMode && !noUnrelatedDirty ? ['unrelated_dirty_paths_present'] : []),
      ...(!isolationSafe ? ['cm0938_isolation_review_missing_or_incomplete'] : [])
    ],
    deniedActions: {
      exact: deniedActionsExact,
      required: REQUIRED_DENIED_ACTIONS,
      present: normalized.deniedActions,
      missing: REQUIRED_DENIED_ACTIONS.filter(action => !normalized.deniedActions.includes(action)),
      unexpected: normalized.deniedActions.filter(action => !REQUIRED_DENIED_ACTIONS.includes(action))
    },
    checks: {
      schemaSafe,
      versionSafe,
      sourceSafe,
      reviewOnlySafe,
      sourceRefSafe,
      scopeModeSafe,
      deniedActionsExact,
      isolationSafe,
      noExecution,
      noClaims,
      ownershipVerified,
      sharedStateSafe,
      proposedPathsDirty,
      proposedCoversDirty,
      verifiedCoversProposed,
      noUnrelatedDirty,
      scopedUnrelatedDirtyAllowed: scopedCandidateMode && unrelatedDirtyPaths.length > 0
    },
    nextStep: candidateReady
      ? 'A future operator may perform a separate stage/commit after rerunning validation and inspecting the exact staged diff; this helper itself did not stage, commit, or push.'
      : 'Keep stage, commit, push, live proof, and reliability/readiness claims blocked. Verify ownership, isolate shared-state hunks, propose exact commit paths, and rerun this review before any stage/commit.',
    safety: {
      sourceMode: 'current_git_status_readonly',
      readsGitStatusOnly: true,
      writesFiles: false,
      stagesFiles: false,
      commits: false,
      pushes: false,
      startsServices: false,
      callsSearchMemory: false,
      callsRecordMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesPackageConfigWatchdogStartup: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  DEFAULT_COMMIT_SCOPE_MODE,
  REQUIRED_DENIED_ACTIONS,
  SCOPED_COMMIT_SCOPE_MODE,
  classifyPath,
  normalizeReviewInput,
  summarizeDirtyEntries,
  summarizeMemoryReliabilityPhaseCommitReview
};
