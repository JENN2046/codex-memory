'use strict';

const {
  isPlainObject,
  normalizeString,
  sideEffectCounterFlagged,
  sideEffectValueFlagged
} = require('./FieldAliasNormalizer');

const CLIENT_SCOPE_PHASE_H_CLOSEOUT_AGGREGATOR_VERSION =
  'phase-h-client-scope-closeout-aggregator-v1';

const REQUIRED_PHASE_H_EVIDENCE_UNITS = Object.freeze([
  Object.freeze({
    id: 'CM-1400',
    key: 'privateReadConsistency',
    acceptedFlag: 'acceptedForPrivateReadConsistency',
    expectedDecision: 'NO_APPLY_CLIENT_SCOPE_PRIVATE_READ_CONSISTENCY_ACCEPTED',
    signals: Object.freeze([
      ['privateReadPolicy', 'sameClientPrivateAccepted'],
      ['privateReadPolicy', 'crossClientPrivateSuppressed'],
      ['privateReadPolicy', 'ownerlessPrivateSuppressed'],
      ['privateReadPolicy', 'missingRequestIdentityPrivateSuppressed'],
      ['authority', 'callerScopeCandidateFilterOnly'],
      ['authority', 'lifecycleCurrentScopeFromExecutionContext']
    ]),
    falseSignals: Object.freeze([['rawSuppressedMetadataExposed']])
  }),
  Object.freeze({
    id: 'CM-1402',
    key: 'clientIntegrationAcceptancePreflight',
    acceptedFlag: 'acceptedForClientIntegrationPreflight',
    expectedDecision: 'NO_APPLY_CLIENT_INTEGRATION_ACCEPTANCE_PREFLIGHT_ACCEPTED',
    signals: Object.freeze([
      ['runbook', 'runbookComplete'],
      ['publicTools', 'frozen'],
      ['clientScopeAcceptance', 'acceptedForPrivateReadConsistency']
    ]),
    falseSignals: Object.freeze([['rcReadyClaimed']])
  }),
  Object.freeze({
    id: 'CM-1404',
    key: 'searchLifecycleConsistency',
    acceptedFlag: 'acceptedForSearchLifecycleConsistency',
    expectedDecision: 'NO_APPLY_CLIENT_SCOPE_SEARCH_LIFECYCLE_CONSISTENCY_ACCEPTED',
    signals: Object.freeze([
      ['searchScope', 'appliedAsCandidateFilter'],
      ['searchScope', 'scopedSearchFiltersProjectWorkspaceClientVisibility'],
      ['lifecycleReadPolicy', 'acceptedLifecycleCandidatePresent'],
      ['lifecycleReadPolicy', 'spoofScopeCandidateSuppressed'],
      ['authority', 'lifecycleCurrentScopeFromExecutionContext'],
      ['authority', 'searchScopeDoesNotBecomeLifecycleIdentity']
    ]),
    falseSignals: Object.freeze([['rawSuppressedMetadataExposed']])
  }),
  Object.freeze({
    id: 'CM-1405',
    key: 'writeEffectiveScopeConsistency',
    acceptedFlag: 'acceptedForWriteEffectiveScopeConsistency',
    expectedDecision: 'NO_APPLY_CLIENT_SCOPE_WRITE_EFFECTIVE_SCOPE_CONSISTENCY_ACCEPTED',
    signals: Object.freeze([
      ['authority', 'executionContextWinsOverPayload'],
      ['authority', 'payloadFallbackOnlyForMissingContext'],
      ['authority', 'aliasNormalizationCovered']
    ]),
    falseSignals: Object.freeze([['rawWorkspaceIdExposed']])
  }),
  Object.freeze({
    id: 'CM-1406',
    key: 'executionContextAuthorityConsistency',
    acceptedFlag: 'acceptedForExecutionContextAuthorityConsistency',
    expectedDecision: 'NO_APPLY_CLIENT_SCOPE_EXECUTION_CONTEXT_AUTHORITY_CONSISTENCY_ACCEPTED',
    signals: Object.freeze([
      ['authority', 'aliasNormalizationEquivalent'],
      ['authority', 'executionContextIdentityPresent'],
      ['authority', 'declaredScopeIdentitySpoofBlocked'],
      ['authority', 'missingClientIdentityFailsClosed'],
      ['publicTools', 'frozen']
    ]),
    falseSignals: Object.freeze([['rawPrivateScopeExposed']])
  }),
  Object.freeze({
    id: 'CM-1407',
    key: 'visibilityBoundaryConsistency',
    acceptedFlag: 'acceptedForVisibilityBoundaryConsistency',
    expectedDecision: 'NO_APPLY_CLIENT_SCOPE_VISIBILITY_BOUNDARY_CONSISTENCY_ACCEPTED',
    signals: Object.freeze([
      ['visibilityPolicy', 'sameClientPrivateAccepted'],
      ['visibilityPolicy', 'nonPrivateVisibilityAccepted'],
      ['visibilityPolicy', 'crossClientPrivateSuppressed'],
      ['visibilityPolicy', 'ownerlessPrivateSuppressed'],
      ['visibilityPolicy', 'missingRequestIdentityPrivateSuppressed'],
      ['visibilityPolicy', 'blockedLifecycleSuppressed'],
      ['authority', 'callerScopeCandidateFilterOnly']
    ]),
    falseSignals: Object.freeze([['rawCandidateDataExposed']])
  })
]);

const REMAINING_APPROVAL_BOUNDARIES = Object.freeze([
  'live_codex_claude_client_refresh',
  'bearer_credential_mcp_refresh',
  'real_cross_client_recall_proof',
  'real_scoped_write_proof',
  'broad_client_scope_store_scan',
  'public_mcp_expansion',
  'client_config_watchdog_startup_change',
  'readiness_or_cutover_claim'
]);

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function getNested(source = {}, path = []) {
  return path.reduce((current, key) => {
    if (!isPlainObject(current)) return undefined;
    return current[key];
  }, source);
}

function booleanTrue(source = {}, path = []) {
  return getNested(source, path) === true;
}

function booleanFalse(source = {}, path = []) {
  return getNested(source, path) === false;
}

function directSideEffectFlagged(source = {}) {
  const safeSource = isPlainObject(source) ? source : {};
  const booleanKeys = [
    'runtimeApplied',
    'memoryToolsExecuted',
    'recordMemoryCalled',
    'searchMemoryCalled',
    'memoryOverviewCalled',
    'mcpToolsCalled',
    'realConfigChanged',
    'configChanged',
    'watchdogStartupChanged',
    'providerCallsExecuted',
    'realMemoryScanned',
    'durableMutationExecuted',
    'durableAuditWritten',
    'publicMcpExpanded',
    'readinessClaimed',
    'reliabilityClaimed',
    'rcReadyClaimed'
  ];
  const numericKeys = [
    'memoryToolsExecuted',
    'recordMemoryCalls',
    'searchMemoryCalls',
    'memoryOverviewCalls',
    'mcpToolsCalled',
    'providerCalls',
    'durableMemoryWrites',
    'durableAuditWrites',
    'publicMcpExpansions',
    'readinessClaims',
    'reliabilityClaims'
  ];

  return booleanKeys.some(key => sideEffectValueFlagged(safeSource[key])) ||
    numericKeys.some(key => sideEffectValueFlagged(safeSource[key]));
}

function normalizedSideEffectFlagged(source = {}) {
  return sideEffectCounterFlagged(source, {
    counterKeys: [
    'providerCalls',
    'apiCalls',
    'trueRecordMemoryCalls',
    'trueSearchMemoryCalls',
    'recordMemoryCalls',
    'searchMemoryCalls',
    'realMemoryReads',
    'rawJsonlReads',
    'directJsonlReads',
    'rawAuditReads',
    'durableMemoryWrites',
    'durableAuditWrites',
    'governedActionExecutions',
    'cleanupApplyRuns',
    'rollbackApplyRuns',
    'publicMcpExpansions',
    'publicMcpExpansion',
    'configWatchdogStartupChanges',
    'dependencyActions',
    'syncCalls',
    'candidateCacheWrites',
    'vectorFlushes',
    'readinessClaims',
    'reliabilityClaims'
    ]
  });
}

function safetyFlagsAccepted(summary = {}) {
  const safety = isPlainObject(summary.safety) ? summary.safety : {};
  const noSideEffectsOk =
    safety.noSideEffects === undefined || safety.noSideEffects === true;
  const falseSafetyKeys = [
    'readsFiles',
    'executesCommands',
    'startsServices',
    'callsMcpTools',
    'callsMemoryTools',
    'callsProviders',
    'usesBearerToken',
    'mutatesClientConfig',
    'mutatesWatchdogStartup',
    'mutatesDurableState',
    'scansRealMemory',
    'readinessClaimed',
    'rawPrivateMemoryExposed',
    'rawPrivateScopeExposed',
    'rawCandidateDataExposed'
  ];

  return noSideEffectsOk && falseSafetyKeys.every(key => {
    return safety[key] === undefined || safety[key] === false;
  });
}

function noApplySummaryAccepted(summary = {}) {
  if (!isPlainObject(summary)) return false;
  return summary.noApplyInvariant === true &&
    directSideEffectFlagged(summary) === false &&
    normalizedSideEffectFlagged(summary) === false &&
    safetyFlagsAccepted(summary) === true;
}

function unitSignalsAccepted(summary = {}, descriptor = {}) {
  const trueSignalsAccepted = descriptor.signals.every(path => booleanTrue(summary, path));
  const falseSignalsAccepted = descriptor.falseSignals.every(path => booleanFalse(summary, path));
  return trueSignalsAccepted && falseSignalsAccepted;
}

function normalizeEvidenceUnit(evidenceUnits = {}, descriptor) {
  const summary = isPlainObject(evidenceUnits)
    ? evidenceUnits[descriptor.key] || evidenceUnits[descriptor.id]
    : null;
  const present = isPlainObject(summary);
  const sourceMode = present ? normalizeLower(summary.sourceMode || 'explicit_input') : '';
  const accepted = present && summary[descriptor.acceptedFlag] === true;
  const decisionMatches = present &&
    normalizeString(summary.decision) === descriptor.expectedDecision;
  const noApplyInvariant = present && noApplySummaryAccepted(summary);
  const requiredSignalsAccepted = present && unitSignalsAccepted(summary, descriptor);

  return {
    id: descriptor.id,
    key: descriptor.key,
    present,
    sourceMode,
    accepted,
    decisionMatches,
    noApplyInvariant,
    requiredSignalsAccepted,
    decision: present ? normalizeString(summary.decision) || null : null
  };
}

function rawScopeFragmentsExposed(value) {
  const serialized = JSON.stringify(value);
  return /workspace-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /task-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /conversation-(alpha|beta|payload|context|client|private)/i.test(serialized) ||
    /workspace_id"\s*:/i.test(serialized) ||
    /workspaceId"\s*:/i.test(serialized) ||
    /task_id"\s*:/i.test(serialized) ||
    /taskId"\s*:/i.test(serialized) ||
    /conversation_id"\s*:/i.test(serialized) ||
    /conversationId"\s*:/i.test(serialized) ||
    /raw fixture content|raw private content|raw snippet|sourceFile|jsonl/i.test(serialized);
}

function summarizeClientScopePhaseHCloseoutAggregator(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const evidenceUnits = isPlainObject(safeInput.evidenceUnits) ? safeInput.evidenceUnits : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const expectedKeys = new Set(REQUIRED_PHASE_H_EVIDENCE_UNITS.flatMap(unit => [unit.id, unit.key]));
  const observedKeys = Object.keys(evidenceUnits);
  const unsupportedEvidenceUnits = observedKeys.filter(key => !expectedKeys.has(key));
  const duplicateEvidenceUnits = REQUIRED_PHASE_H_EVIDENCE_UNITS.flatMap(unit => {
    const suppliedAliases = [unit.id, unit.key].filter(key => {
      return Object.prototype.hasOwnProperty.call(evidenceUnits, key);
    });
    return suppliedAliases.length > 1
      ? [`${unit.id}:${suppliedAliases.join('|')}`]
      : [];
  });
  const normalizedUnits = REQUIRED_PHASE_H_EVIDENCE_UNITS.map(unit => {
    return normalizeEvidenceUnit(evidenceUnits, unit);
  });
  const missingEvidenceUnits = normalizedUnits
    .filter(unit => unit.present === false)
    .map(unit => unit.id);
  const allRequiredUnitsAccepted = normalizedUnits.every(unit => {
    return unit.present === true &&
      unit.sourceMode === 'explicit_input' &&
      unit.accepted === true &&
      unit.decisionMatches === true &&
      unit.noApplyInvariant === true &&
      unit.requiredSignalsAccepted === true;
  });
  const topLevelNoApplyInvariant =
    directSideEffectFlagged(safeInput.sideEffects) === false &&
    normalizedSideEffectFlagged(safeInput.sideEffects) === false &&
    safeInput.readinessClaimed !== true &&
    safeInput.reliabilityClaimed !== true &&
    safeInput.rcReadyClaimed !== true;
  const closeoutSummary = {
    phase: 'Phase H',
    localNoApplyCloseoutReviewable: allRequiredUnitsAccepted,
    publicMcpToolsFrozen: normalizedUnits
      .filter(unit => ['CM-1402', 'CM-1406'].includes(unit.id))
      .every(unit => unit.requiredSignalsAccepted === true),
    privateReadBoundaryClosed: normalizedUnits.find(unit => unit.id === 'CM-1400')?.requiredSignalsAccepted === true,
    clientIntegrationPreflightClosed: normalizedUnits.find(unit => unit.id === 'CM-1402')?.requiredSignalsAccepted === true,
    searchLifecycleBoundaryClosed: normalizedUnits.find(unit => unit.id === 'CM-1404')?.requiredSignalsAccepted === true,
    writeEffectiveScopeBoundaryClosed: normalizedUnits.find(unit => unit.id === 'CM-1405')?.requiredSignalsAccepted === true,
    executionContextAuthorityBoundaryClosed: normalizedUnits.find(unit => unit.id === 'CM-1406')?.requiredSignalsAccepted === true,
    visibilityBoundaryClosed: normalizedUnits.find(unit => unit.id === 'CM-1407')?.requiredSignalsAccepted === true,
    remainingApprovalBoundaries: [...REMAINING_APPROVAL_BOUNDARIES]
  };
  const reviewableOutputExposesRawScope = rawScopeFragmentsExposed({
    evidenceCoverage: normalizedUnits,
    closeoutSummary
  });

  const acceptedForPhaseHClientScopeCloseout =
    sourceMode === 'explicit_input' &&
    unsupportedEvidenceUnits.length === 0 &&
    duplicateEvidenceUnits.length === 0 &&
    missingEvidenceUnits.length === 0 &&
    allRequiredUnitsAccepted === true &&
    topLevelNoApplyInvariant === true &&
    reviewableOutputExposesRawScope === false;

  const blockingFindings = [
    sourceMode !== 'explicit_input' ? 'source_mode_not_explicit_input' : null,
    unsupportedEvidenceUnits.length > 0
      ? `unsupported_evidence_units:${unsupportedEvidenceUnits.join(',')}`
      : null,
    duplicateEvidenceUnits.length > 0
      ? `duplicate_evidence_units:${duplicateEvidenceUnits.join(',')}`
      : null,
    missingEvidenceUnits.length > 0
      ? `missing_evidence_units:${missingEvidenceUnits.join(',')}`
      : null,
    ...normalizedUnits.flatMap(unit => {
      if (!unit.present) return [];
      return [
        unit.sourceMode !== 'explicit_input' ? `${unit.id}:source_mode_not_explicit_input` : null,
        !unit.accepted ? `${unit.id}:unit_not_accepted` : null,
        !unit.decisionMatches ? `${unit.id}:decision_not_expected` : null,
        !unit.noApplyInvariant ? `${unit.id}:no_apply_invariant_failed` : null,
        !unit.requiredSignalsAccepted ? `${unit.id}:required_signals_not_accepted` : null
      ].filter(Boolean);
    }),
    !topLevelNoApplyInvariant ? 'top_level_no_apply_invariant_failed' : null,
    reviewableOutputExposesRawScope ? 'reviewable_output_exposes_raw_scope' : null
  ].filter(Boolean);

  return {
    closeoutVersion: CLIENT_SCOPE_PHASE_H_CLOSEOUT_AGGREGATOR_VERSION,
    sourceMode,
    acceptedForPhaseHClientScopeCloseout,
    decision: acceptedForPhaseHClientScopeCloseout
      ? 'NO_APPLY_PHASE_H_CLIENT_SCOPE_CLOSEOUT_ACCEPTED_NOT_READY'
      : 'NOT_READY_BLOCKED',
    evidenceCoverage: {
      requiredUnitCount: REQUIRED_PHASE_H_EVIDENCE_UNITS.length,
      acceptedUnitCount: normalizedUnits.filter(unit => unit.accepted).length,
      allRequiredUnitsAccepted,
      missingEvidenceUnits,
      unsupportedEvidenceUnits,
      duplicateEvidenceUnits,
      units: normalizedUnits
    },
    closeoutSummary,
    noApplyInvariant: topLevelNoApplyInvariant && normalizedUnits.every(unit => unit.noApplyInvariant),
    reviewableOutputExposesRawScope,
    runtimeApplied: false,
    memoryToolsExecuted: false,
    providerCalls: 0,
    realMemoryScanned: false,
    durableMutationExecuted: false,
    durableAuditWritten: false,
    configChanged: false,
    watchdogStartupChanged: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReadyClaimed: false,
    blockers: {
      blockingFindings
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsMcpTools: false,
      callsMemoryTools: false,
      callsProviders: false,
      usesBearerToken: false,
      mutatesClientConfig: false,
      mutatesWatchdogStartup: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      readinessClaimed: false,
      reviewableOutputExposesRawScope
    }
  };
}

module.exports = {
  CLIENT_SCOPE_PHASE_H_CLOSEOUT_AGGREGATOR_VERSION,
  REQUIRED_PHASE_H_EVIDENCE_UNITS,
  REMAINING_APPROVAL_BOUNDARIES,
  summarizeClientScopePhaseHCloseoutAggregator
};
