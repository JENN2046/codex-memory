'use strict';

const EXPECTED_SCHEMA_VERSION = 'memory-reliability-proof-baseline-blocker-plan-v1';
const EXPECTED_VERSION = 'v1';

const REQUIRED_SOURCE_DECISION = 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKED_NOT_EXECUTED';
const REQUIRED_BLOCKERS = Object.freeze({
  recall: 'CMB-0013',
  write: 'CMB-0014'
});

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
  'readinessClaim',
  'reliabilityClaim',
  'unscopedCommit'
]);

const REQUIRED_NEXT_ACTIONS = Object.freeze([
  'isolate_or_commit_only_verified_intended_changes',
  'rerun_memory_reliability_baseline_cli',
  'require_clean_synced_main_before_live_proof',
  'keep_recall_write_reliability_unclaimed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function normalizeLaneReport(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    lane: normalizeString(safeValue.lane),
    blockerId: normalizeString(safeValue.blockerId),
    decision: normalizeString(safeValue.decision),
    sourceAccepted: normalizeBoolean(safeValue.sourceAccepted),
    cleanGit: normalizeBoolean(safeValue.cleanGit),
    noExecution: normalizeBoolean(safeValue.noExecution),
    noSafetyDrift: normalizeBoolean(safeValue.noSafetyDrift),
    dirtyStatusLineCount: Number.isInteger(safeValue.dirtyStatusLineCount)
      ? safeValue.dirtyStatusLineCount
      : 0,
    blockerReasons: normalizeStringArray(safeValue.blockerReasons),
    readyForSeparateLiveProof: normalizeBoolean(safeValue.readyForSeparateLiveProof),
    blockedByDirtyBaseline: normalizeBoolean(safeValue.blockedByDirtyBaseline),
    blockedByGitFactErrors: normalizeBoolean(safeValue.blockedByGitFactErrors),
    blockedBySafetyDrift: normalizeBoolean(safeValue.blockedBySafetyDrift),
    blockedByExecutionDrift: normalizeBoolean(safeValue.blockedByExecutionDrift)
  };
}

function normalizeBaselineReport(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    status: normalizeString(safeValue.status),
    decision: normalizeString(safeValue.decision),
    source: normalizeString(safeValue.source),
    baselineReadinessReviewAccepted: normalizeBoolean(safeValue.baselineReadinessReviewAccepted),
    baselineReadyForLiveProof: normalizeBoolean(safeValue.baselineReadyForLiveProof),
    dirtyBaselineBlocked: normalizeBoolean(safeValue.dirtyBaselineBlocked),
    laneReports: Array.isArray(safeValue.laneReports)
      ? safeValue.laneReports.map(normalizeLaneReport)
      : [],
    executionStarted: normalizeBoolean(safeValue.executionStarted),
    liveProofStarted: normalizeBoolean(safeValue.liveProofStarted),
    recordMemoryStarted: normalizeBoolean(safeValue.recordMemoryStarted),
    readinessClaimAllowed: normalizeBoolean(safeValue.readinessClaimAllowed),
    memoryRecallReliableClaimed: normalizeBoolean(safeValue.memoryRecallReliableClaimed),
    memoryWriteReliableClaimed: normalizeBoolean(safeValue.memoryWriteReliableClaimed)
  };
}

function normalizePolicy(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    version: normalizeString(safeInput.version),
    sourceMode: normalizeString(safeInput.sourceMode),
    reviewOnly: normalizeBoolean(safeInput.reviewOnly),
    baselineReportSource: normalizeString(safeInput.baselineReportSource),
    worktreeOwnership: normalizeString(safeInput.worktreeOwnership),
    commitScopeIsolated: normalizeBoolean(safeInput.commitScopeIsolated),
    liveProofAuthorized: normalizeBoolean(safeInput.liveProofAuthorized),
    readinessClaimed: normalizeBoolean(safeInput.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safeInput.reliabilityClaimed),
    deniedActions: normalizeStringArray(safeInput.deniedActions),
    requiredNextActions: normalizeStringArray(safeInput.requiredNextActions),
    baselineReport: normalizeBaselineReport(safeInput.baselineReport)
  };
}

function summarizeMemoryReliabilityProofBaselineBlockerPlan(input = {}) {
  const normalized = normalizePolicy(input);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const reportSourceSafe = normalized.baselineReportSource === 'CM-0967';
  const reviewOnlySafe = normalized.reviewOnly === true;
  const deniedActionsExact = hasExactSet(normalized.deniedActions, REQUIRED_DENIED_ACTIONS);
  const nextActionsExact = hasExactSet(normalized.requiredNextActions, REQUIRED_NEXT_ACTIONS);
  const baseline = normalized.baselineReport;
  const reportBlocked = baseline.status === 'blocked' &&
    baseline.decision === REQUIRED_SOURCE_DECISION &&
    baseline.source === 'current_git_facts_readonly' &&
    baseline.baselineReadinessReviewAccepted === true &&
    baseline.baselineReadyForLiveProof === false &&
    baseline.dirtyBaselineBlocked === true;
  const laneBlockersExact = hasExactSet(
    baseline.laneReports.map(report => report.blockerId),
    Object.values(REQUIRED_BLOCKERS)
  );
  const lanesDirtyOnly = baseline.laneReports.length === 2 &&
    baseline.laneReports.every(report => report.blockedByDirtyBaseline &&
      !report.readyForSeparateLiveProof &&
      report.dirtyStatusLineCount > 0 &&
      report.blockerReasons.includes('dirty_worktree') &&
      report.noExecution &&
      report.noSafetyDrift &&
      !report.blockedBySafetyDrift &&
      !report.blockedByExecutionDrift);
  const noExecution = baseline.executionStarted === false &&
    baseline.liveProofStarted === false &&
    baseline.recordMemoryStarted === false;
  const noClaims = normalized.liveProofAuthorized === false &&
    normalized.readinessClaimed === false &&
    normalized.reliabilityClaimed === false &&
    baseline.readinessClaimAllowed === false &&
    baseline.memoryRecallReliableClaimed === false &&
    baseline.memoryWriteReliableClaimed === false;
  const ownershipSafe = normalized.worktreeOwnership === 'mixed_or_unverified';
  const commitBlocked = !normalized.commitScopeIsolated || ownershipSafe;
  const accepted = schemaSafe &&
    versionSafe &&
    sourceSafe &&
    reportSourceSafe &&
    reviewOnlySafe &&
    deniedActionsExact &&
    nextActionsExact &&
    reportBlocked &&
    laneBlockersExact &&
    lanesDirtyOnly &&
    noExecution &&
    noClaims &&
    ownershipSafe;

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    blockerPlanAccepted: accepted,
    baselineReadyForLiveProof: false,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    dirtyBaselineBlocked: reportBlocked && lanesDirtyOnly,
    unscopedCommitBlocked: commitBlocked,
    commitScopeIsolated: normalized.commitScopeIsolated,
    worktreeOwnership: normalized.worktreeOwnership,
    blockerIds: REQUIRED_BLOCKERS,
    requiredNextActions: {
      exact: nextActionsExact,
      required: REQUIRED_NEXT_ACTIONS,
      present: normalized.requiredNextActions,
      missing: REQUIRED_NEXT_ACTIONS.filter(action => !normalized.requiredNextActions.includes(action)),
      unexpected: normalized.requiredNextActions.filter(action => !REQUIRED_NEXT_ACTIONS.includes(action))
    },
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
      reportSourceSafe,
      reviewOnlySafe,
      reportBlocked,
      laneBlockersExact,
      lanesDirtyOnly,
      noExecution,
      noClaims,
      ownershipSafe
    },
    nextStep: accepted
      ? 'Do not run live proof. Isolate or commit only verified intended changes, rerun the CM-0967 CLI, and require a clean synced baseline before any separate live proof.'
      : 'Treat blocker resolution evidence as incomplete; keep live proof and reliability/readiness claims blocked.',
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
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
  REQUIRED_BLOCKERS,
  REQUIRED_DENIED_ACTIONS,
  REQUIRED_NEXT_ACTIONS,
  normalizePolicy,
  summarizeMemoryReliabilityProofBaselineBlockerPlan
};
