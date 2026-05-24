'use strict';

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'memory-reliability-proof-baseline-readiness-policy-v1';
const EXPECTED_VERSION = 'v1';

const REQUIRED_LANES = Object.freeze([
  'recall',
  'write'
]);

const REQUIRED_BLOCKERS = Object.freeze({
  recall: 'CMB-0013',
  write: 'CMB-0014'
});

const REQUIRED_DECISIONS = Object.freeze({
  recall: 'RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED',
  write: 'WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED'
});

const BLOCKED_DECISIONS = Object.freeze({
  recall: 'RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED',
  write: 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED'
});

const DENIED_ACTIONS = Object.freeze([
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
  'configWatchdogStartupChange',
  'readinessClaim',
  'reliabilityClaim'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
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

function normalizeGitFacts(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    branch: normalizeString(safeValue.branch),
    localHead: normalizeString(safeValue.localHead),
    originHead: normalizeString(safeValue.originHead),
    remoteMainHead: normalizeString(safeValue.remoteMainHead),
    dirtyStatusLineCount: Number.isInteger(safeValue.dirtyStatusLineCount)
      ? safeValue.dirtyStatusLineCount
      : 0
  };
}

function normalizeSafety(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    callsSearchMemory: normalizeBoolean(safeValue.callsSearchMemory),
    callsRecordMemory: normalizeBoolean(safeValue.callsRecordMemory),
    callsProvider: normalizeBoolean(safeValue.callsProvider),
    readsRawMemory: normalizeBoolean(safeValue.readsRawMemory),
    readsJsonl: normalizeBoolean(safeValue.readsJsonl),
    writesDurableMemory: normalizeBoolean(safeValue.writesDurableMemory),
    writesDurableAudit: normalizeBoolean(safeValue.writesDurableAudit),
    expandsPublicMcp: normalizeBoolean(safeValue.expandsPublicMcp),
    changesConfigWatchdogStartup: normalizeBoolean(safeValue.changesConfigWatchdogStartup),
    claimsRecallReliable: normalizeBoolean(safeValue.claimsRecallReliable),
    claimsWriteReliable: normalizeBoolean(safeValue.claimsWriteReliable),
    claimsReadiness: normalizeBoolean(safeValue.claimsReadiness)
  };
}

function normalizeLaneReport(lane, value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    lane,
    status: normalizeString(safeValue.status),
    decision: normalizeString(safeValue.decision),
    source: normalizeString(safeValue.source),
    basisId: normalizeString(safeValue.basisId),
    acceptedForExecutionPreflight: normalizeBoolean(safeValue.acceptedForExecutionPreflight),
    executionStarted: normalizeBoolean(safeValue.executionStarted),
    liveProofStarted: normalizeBoolean(safeValue.liveProofStarted),
    recordMemoryStarted: normalizeBoolean(safeValue.recordMemoryStarted),
    blockerReasons: normalizeStringArray(safeValue.blockerReasons),
    gitFactErrors: Array.isArray(safeValue.gitFactErrors) ? safeValue.gitFactErrors : [],
    cleanSyncedMainHead: normalizeBoolean(safeValue.cleanSyncedMainHead),
    normalizedGitFacts: normalizeGitFacts(safeValue.normalizedGitFacts),
    collectorSafety: normalizeSafety(safeValue.collectorSafety),
    helperSafety: normalizeSafety(safeValue.helperSafety),
    readinessClaimAllowed: normalizeBoolean(safeValue.readinessClaimAllowed),
    memoryRecallReliableClaimed: normalizeBoolean(safeValue.memoryRecallReliableClaimed),
    memoryWriteReliableClaimed: normalizeBoolean(safeValue.memoryWriteReliableClaimed)
  };
}

function normalizePolicy(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const reports = isPlainObject(safeInput.reports) ? safeInput.reports : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    version: normalizeString(safeInput.version),
    sourceMode: normalizeString(safeInput.sourceMode),
    reviewOnly: normalizeBoolean(safeInput.reviewOnly),
    currentFactsOnly: normalizeBoolean(safeInput.currentFactsOnly),
    liveProofAuthorized: normalizeBoolean(safeInput.liveProofAuthorized),
    readinessClaimed: normalizeBoolean(safeInput.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safeInput.reliabilityClaimed),
    deniedActions: normalizeStringArray(safeInput.deniedActions),
    lanes: REQUIRED_LANES.map(lane => normalizeLaneReport(lane, reports[lane]))
  };
}

function laneExpectedDecision(lane, accepted) {
  return accepted ? REQUIRED_DECISIONS[lane] : BLOCKED_DECISIONS[lane];
}

function laneHasSafetyDrift(report) {
  return report.collectorSafety.callsSearchMemory ||
    report.collectorSafety.callsRecordMemory ||
    report.collectorSafety.callsProvider ||
    report.collectorSafety.readsRawMemory ||
    report.collectorSafety.readsJsonl ||
    report.collectorSafety.writesDurableMemory ||
    report.collectorSafety.writesDurableAudit ||
    report.collectorSafety.expandsPublicMcp ||
    report.collectorSafety.changesConfigWatchdogStartup ||
    report.collectorSafety.claimsRecallReliable ||
    report.collectorSafety.claimsWriteReliable ||
    report.collectorSafety.claimsReadiness ||
    report.helperSafety.callsSearchMemory ||
    report.helperSafety.callsRecordMemory ||
    report.helperSafety.callsProvider ||
    report.helperSafety.readsRawMemory ||
    report.helperSafety.readsJsonl ||
    report.helperSafety.writesDurableMemory ||
    report.helperSafety.writesDurableAudit ||
    report.helperSafety.expandsPublicMcp ||
    report.helperSafety.changesConfigWatchdogStartup ||
    report.helperSafety.claimsRecallReliable ||
    report.helperSafety.claimsWriteReliable ||
    report.helperSafety.claimsReadiness;
}

function summarizeLane(report) {
  const expectedReadyDecision = REQUIRED_DECISIONS[report.lane];
  const expectedBlockedDecision = BLOCKED_DECISIONS[report.lane];
  const accepted = report.acceptedForExecutionPreflight === true;
  const decisionAccepted = accepted
    ? report.decision === expectedReadyDecision
    : report.decision === expectedBlockedDecision;
  const noExecution = report.executionStarted === false &&
    report.liveProofStarted === false &&
    report.recordMemoryStarted === false;
  const noSafetyDrift = !laneHasSafetyDrift(report) &&
    report.readinessClaimAllowed === false &&
    report.memoryRecallReliableClaimed === false &&
    report.memoryWriteReliableClaimed === false;
  const cleanGit = report.cleanSyncedMainHead === true &&
    report.normalizedGitFacts.dirtyStatusLineCount === 0 &&
    report.gitFactErrors.length === 0 &&
    !report.blockerReasons.includes('dirty_worktree');
  const sourceAccepted = report.source === 'current_git_facts_readonly';

  return {
    lane: report.lane,
    basisId: report.basisId,
    blockerId: REQUIRED_BLOCKERS[report.lane],
    acceptedForExecutionPreflight: accepted,
    decisionAccepted,
    expectedDecision: laneExpectedDecision(report.lane, accepted),
    decision: report.decision,
    sourceAccepted,
    cleanGit,
    noExecution,
    noSafetyDrift,
    dirtyStatusLineCount: report.normalizedGitFacts.dirtyStatusLineCount,
    blockerReasons: report.blockerReasons,
    readyForSeparateLiveProof: accepted &&
      decisionAccepted &&
      sourceAccepted &&
      cleanGit &&
      noExecution &&
      noSafetyDrift,
    blockedByDirtyBaseline: report.blockerReasons.includes('dirty_worktree') ||
      report.normalizedGitFacts.dirtyStatusLineCount > 0,
    blockedByGitFactErrors: report.gitFactErrors.length > 0,
    blockedBySafetyDrift: !noSafetyDrift,
    blockedByExecutionDrift: !noExecution
  };
}

function summarizeMemoryReliabilityProofBaselineReadinessPolicy(input = {}) {
  const normalized = normalizePolicy(input);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const deniedActionsExact = hasExactSet(normalized.deniedActions, DENIED_ACTIONS);
  const noGlobalExecution = normalized.reviewOnly === true &&
    normalized.currentFactsOnly === true &&
    normalized.liveProofAuthorized === false &&
    normalized.readinessClaimed === false &&
    normalized.reliabilityClaimed === false;
  const laneReports = normalized.lanes.map(summarizeLane);
  const lanesExact = hasExactSet(laneReports.map(report => report.lane), REQUIRED_LANES);
  const baselineReadyForLiveProof = schemaSafe &&
    versionSafe &&
    sourceSafe &&
    deniedActionsExact &&
    noGlobalExecution &&
    lanesExact &&
    laneReports.every(report => report.readyForSeparateLiveProof);
  const dirtyBaselineBlocked = laneReports.some(report => report.blockedByDirtyBaseline);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    baselineReadinessReviewAccepted: schemaSafe &&
      versionSafe &&
      sourceSafe &&
      deniedActionsExact &&
      noGlobalExecution &&
      lanesExact,
    baselineReadyForLiveProof,
    liveProofAuthorized: false,
    executionStarted: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    dirtyBaselineBlocked,
    deniedActions: {
      exact: deniedActionsExact,
      required: DENIED_ACTIONS,
      present: normalized.deniedActions,
      missing: DENIED_ACTIONS.filter(action => !normalized.deniedActions.includes(action)),
      unexpected: normalized.deniedActions.filter(action => !DENIED_ACTIONS.includes(action))
    },
    lanes: {
      exact: lanesExact,
      required: REQUIRED_LANES,
      reports: laneReports
    },
    blockerIds: REQUIRED_BLOCKERS,
    nextStep: baselineReadyForLiveProof
      ? 'Review this baseline packet; live proof execution remains a separate bounded step.'
      : 'Resolve lane blockers and rerun current-facts preflight before any live proof step.',
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
      changesConfigWatchdogStartup: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  BLOCKED_DECISIONS,
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_BLOCKERS,
  REQUIRED_DECISIONS,
  REQUIRED_LANES,
  normalizePolicy,
  summarizeMemoryReliabilityProofBaselineReadinessPolicy
};
