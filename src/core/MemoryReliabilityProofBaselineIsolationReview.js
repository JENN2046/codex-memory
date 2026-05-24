'use strict';

const EXPECTED_SCHEMA_VERSION = 'memory-reliability-proof-baseline-isolation-review-v1';
const EXPECTED_VERSION = 'v1';

const REQUIRED_DENIED_ACTIONS = Object.freeze([
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
  'unscopedCommit',
  'commit',
  'push',
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

function parseGitStatusShort(value = '') {
  return String(value || '')
    .split(/\r?\n/u)
    .map(line => line.trimEnd())
    .filter(Boolean)
    .map(line => {
      const status = line.slice(0, 2).trim() || line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const path = rawPath.includes(' -> ')
        ? rawPath.split(' -> ').pop().trim()
        : rawPath;
      return {
        raw: line,
        status,
        path
      };
    })
    .filter(entry => entry.path);
}

function classifyGitStatusShort(value = '') {
  const entries = parseGitStatusShort(value);
  const summary = {
    dirtyStatusLineCount: entries.length,
    trackedModifiedCount: entries.filter(entry => entry.status !== '??').length,
    untrackedCount: entries.filter(entry => entry.status === '??').length,
    sharedStateCount: 0,
    runtimeSurfaceCount: 0,
    reliabilityBaselineCount: 0,
    otherCount: 0,
    sharedStatePaths: [],
    runtimeSurfacePaths: [],
    reliabilityBaselinePaths: [],
    otherPaths: []
  };

  for (const entry of entries) {
    const path = entry.path.replaceAll('\\', '/');
    const isSharedState = path.startsWith('.agent_board/') ||
      SHARED_STATE_PATHS.includes(path);
    const isRuntimeSurface = path.startsWith('src/') ||
      path.startsWith('tests/') ||
      path === 'package.json' ||
      path === 'package-lock.json';
    const isReliabilityBaseline = path.includes('MEMORY_RELIABILITY_PROOF_BASELINE') ||
      path.includes('memory-reliability-proof-baseline');

    if (isSharedState) {
      summary.sharedStateCount += 1;
      summary.sharedStatePaths.push(path);
    }
    if (isRuntimeSurface) {
      summary.runtimeSurfaceCount += 1;
      summary.runtimeSurfacePaths.push(path);
    }
    if (isReliabilityBaseline) {
      summary.reliabilityBaselineCount += 1;
      summary.reliabilityBaselinePaths.push(path);
    }
    if (!isSharedState && !isRuntimeSurface && !isReliabilityBaseline) {
      summary.otherCount += 1;
      summary.otherPaths.push(path);
    }
  }

  return summary;
}

function normalizeBlockerPlanReport(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    status: normalizeString(safeValue.status),
    decision: normalizeString(safeValue.decision),
    blockerPlanAccepted: normalizeBoolean(safeValue.blockerPlanAccepted),
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
    blockerPlanSource: normalizeString(safeInput.blockerPlanSource),
    worktreeOwnership: normalizeString(safeInput.worktreeOwnership),
    commitScopeIsolated: normalizeBoolean(safeInput.commitScopeIsolated),
    liveProofAuthorized: normalizeBoolean(safeInput.liveProofAuthorized),
    readinessClaimed: normalizeBoolean(safeInput.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safeInput.reliabilityClaimed),
    deniedActions: normalizeStringArray(safeInput.deniedActions),
    gitStatusShort: normalizeGitStatusShortText(safeInput.gitStatusShort),
    blockerPlanReport: normalizeBlockerPlanReport(safeInput.blockerPlanReport)
  };
}

function summarizeMemoryReliabilityProofBaselineIsolationReview(input = {}) {
  const normalized = normalizeReviewInput(input);
  const blockerPlan = normalized.blockerPlanReport;
  const dirtySummary = classifyGitStatusShort(normalized.gitStatusShort);

  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'current_git_status_readonly';
  const reviewOnlySafe = normalized.reviewOnly === true;
  const blockerSourceSafe = normalized.blockerPlanSource === 'CM-0968';
  const deniedActionsExact = hasExactSet(normalized.deniedActions, REQUIRED_DENIED_ACTIONS);
  const blockerPlanSafe = blockerPlan.status === 'blocked' &&
    blockerPlan.decision === 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_ACCEPTED_NOT_EXECUTED' &&
    blockerPlan.blockerPlanAccepted === true &&
    blockerPlan.baselineReadyForLiveProof === false &&
    blockerPlan.dirtyBaselineBlocked === true &&
    blockerPlan.unscopedCommitBlocked === true;
  const noExecution = blockerPlan.executionStarted === false &&
    blockerPlan.liveProofStarted === false &&
    blockerPlan.recordMemoryStarted === false &&
    blockerPlan.callsSearchMemory === false &&
    blockerPlan.callsRecordMemory === false &&
    blockerPlan.callsProvider === false;
  const noClaims = normalized.liveProofAuthorized === false &&
    normalized.readinessClaimed === false &&
    normalized.reliabilityClaimed === false &&
    blockerPlan.readinessClaimAllowed === false &&
    blockerPlan.memoryRecallReliableClaimed === false &&
    blockerPlan.memoryWriteReliableClaimed === false;
  const dirtyBaselinePresent = dirtySummary.dirtyStatusLineCount > 0;
  const mixedOrSharedDirty = dirtySummary.sharedStateCount > 0 ||
    dirtySummary.runtimeSurfaceCount > 0 ||
    dirtySummary.otherCount > 0;
  const ownershipSafe = normalized.worktreeOwnership === 'mixed_or_unverified';
  const commitScopeBlocked = normalized.commitScopeIsolated === false &&
    blockerPlan.unscopedCommitBlocked === true;
  const accepted = schemaSafe &&
    versionSafe &&
    sourceSafe &&
    reviewOnlySafe &&
    blockerSourceSafe &&
    deniedActionsExact &&
    blockerPlanSafe &&
    noExecution &&
    noClaims &&
    dirtyBaselinePresent &&
    mixedOrSharedDirty &&
    ownershipSafe &&
    commitScopeBlocked;

  return {
    sourceMode: normalized.sourceMode || 'current_git_status_readonly',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    isolationReviewAccepted: accepted,
    safeForLiveProof: false,
    safeForCommit: false,
    baselineReadyForLiveProof: false,
    dirtyBaselineBlocked: blockerPlanSafe && dirtyBaselinePresent,
    unscopedCommitBlocked: commitScopeBlocked,
    worktreeOwnership: normalized.worktreeOwnership,
    commitScopeIsolated: normalized.commitScopeIsolated,
    dirtySummary,
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
      blockerSourceSafe,
      deniedActionsExact,
      blockerPlanSafe,
      noExecution,
      noClaims,
      dirtyBaselinePresent,
      mixedOrSharedDirty,
      ownershipSafe,
      commitScopeBlocked
    },
    nextStep: accepted
      ? 'Keep live proof and unscoped local commit blocked. Isolate or commit only verified intended changes, then rerun CM-0968 and CM-0969 from a clean synced baseline.'
      : 'Treat isolation evidence as incomplete; keep live proof, local commit, and reliability/readiness claims blocked.',
    safety: {
      sourceMode: 'current_git_status_readonly',
      readsGitStatusOnly: true,
      writesFiles: false,
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
      commits: false,
      pushes: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DENIED_ACTIONS,
  classifyGitStatusShort,
  normalizeReviewInput,
  parseGitStatusShort,
  summarizeMemoryReliabilityProofBaselineIsolationReview
};
