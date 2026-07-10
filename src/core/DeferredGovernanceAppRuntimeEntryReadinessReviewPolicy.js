const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  summarizeDeferredGovernanceClosureEvidenceBoundary
} = require('./DeferredGovernanceClosureEvidenceBoundaryPolicy');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-app-runtime-entry-readiness-review-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_APP_ENTRY_METHODS = Object.freeze({
  memory_exclude: 'executeInternalMemoryExclude',
  memory_forget: 'executeInternalMemoryForget'
});

const REQUIRED_CONTEXT_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const REQUIRED_EVIDENCE_REFS = Object.freeze([
  'CM-0924',
  'CM-0925',
  'CM-0926',
  'CM-0927',
  'CM-0992',
  'CMV-1042',
  'CMV-1043',
  'CMV-1044',
  'CMV-1045',
  'CMV-1110'
]);

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --check src\\app.js',
  'node --check tests\\deferred-governance-app-runtime-entry.test.js',
  'node --check src\\core\\DeferredGovernanceClosureEvidenceBoundaryPolicy.js',
  'node --test tests\\deferred-governance-app-runtime-entry.test.js',
  'node --test tests\\deferred-governance-runtime-entry-adapter.test.js',
  'node --test tests\\deferred-governance-mutation-planning-service.test.js',
  'node --test tests\\deferred-governance-closure-evidence-boundary-policy.test.js'
]);

const DENIED_ACTIONS = Object.freeze([
  'publicMcpExpansion',
  'callToolWidening',
  'runtimeApply',
  'serviceStart',
  'runtimeProbe',
  'liveRecallProof',
  'liveWriteProof',
  'durableMemoryWrite',
  'durableAuditWrite',
  'candidateCacheClear',
  'providerCall',
  'configMutation',
  'watchdogStartupChange',
  'readinessClaim'
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

function normalizeFamilyEntry(entry = {}) {
  const safeEntry = isPlainObject(entry) ? entry : {};

  return {
    family: normalizeString(safeEntry.family),
    appMethod: normalizeString(safeEntry.appMethod),
    adapterServiceExposed: normalizeBoolean(safeEntry.adapterServiceExposed),
    defaultDisabled: normalizeBoolean(safeEntry.defaultDisabled),
    approvedContextRequired: normalizeBoolean(safeEntry.approvedContextRequired),
    requestSource: normalizeString(safeEntry.requestSource),
    contextFlag: normalizeString(safeEntry.contextFlag),
    dryRunPlanningOnly: normalizeBoolean(safeEntry.dryRunPlanningOnly),
    runtimeApplyBlocked: normalizeBoolean(safeEntry.runtimeApplyBlocked),
    publicCallToolUnknown: normalizeBoolean(safeEntry.publicCallToolUnknown),
    mutatesDurableState: normalizeBoolean(safeEntry.mutatesDurableState),
    readinessClaimed: normalizeBoolean(safeEntry.readinessClaimed)
  };
}

function normalizePolicy(packet = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};

  return {
    schemaVersion: normalizeString(safePacket.schemaVersion),
    version: normalizeString(safePacket.version),
    sourceMode: normalizeString(safePacket.sourceMode),
    reviewOnly: normalizeBoolean(safePacket.reviewOnly),
    appLevelInternalOnly: normalizeBoolean(safePacket.appLevelInternalOnly),
    publicMcpExpanded: normalizeBoolean(safePacket.publicMcpExpanded),
    callToolWidened: normalizeBoolean(safePacket.callToolWidened),
    runtimeReady: normalizeBoolean(safePacket.runtimeReady),
    readinessClaimed: normalizeBoolean(safePacket.readinessClaimed),
    publicToolsFrozen: normalizeBoolean(safePacket.publicToolsFrozen),
    publicTools: normalizeStringArray(safePacket.publicTools),
    evidenceRefs: normalizeStringArray(safePacket.evidenceRefs),
    validationCommands: normalizeStringArray(safePacket.validationCommands),
    deniedActions: normalizeStringArray(safePacket.deniedActions),
    dirtyBaselineBlocksLiveProof: normalizeBoolean(safePacket.dirtyBaselineBlocksLiveProof),
    closureEvidenceBoundary: isPlainObject(safePacket.closureEvidenceBoundary)
      ? safePacket.closureEvidenceBoundary
      : {},
    familyEntries: Array.isArray(safePacket.familyEntries)
      ? safePacket.familyEntries.map(normalizeFamilyEntry)
      : []
  };
}

function familyEntryAccepted(entry) {
  const requiredMethod = REQUIRED_APP_ENTRY_METHODS[entry.family] || '';
  const requiredContext = REQUIRED_CONTEXT_SURFACES[entry.family] || {};

  return GOVERNANCE_FAMILIES.includes(entry.family) &&
    entry.appMethod === requiredMethod &&
    entry.adapterServiceExposed === true &&
    entry.defaultDisabled === true &&
    entry.approvedContextRequired === true &&
    entry.requestSource === requiredContext.requestSource &&
    entry.contextFlag === requiredContext.contextFlag &&
    entry.dryRunPlanningOnly === true &&
    entry.runtimeApplyBlocked === true &&
    entry.publicCallToolUnknown === true &&
    entry.mutatesDurableState === false &&
    entry.readinessClaimed === false;
}

function summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy(packet = {}) {
  const normalized = normalizePolicy(packet);
  const closureBoundaryReport = summarizeDeferredGovernanceClosureEvidenceBoundary(
    normalized.closureEvidenceBoundary
  );
  const familyIds = normalized.familyEntries.map(entry => entry.family).filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const familySetExact = hasExactSet(familyIds, GOVERNANCE_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const evidenceComplete = hasEveryValue(normalized.evidenceRefs, REQUIRED_EVIDENCE_REFS);
  const validationComplete = hasEveryValue(normalized.validationCommands, REQUIRED_VALIDATION_COMMANDS);
  const deniedActionsComplete = hasExactSet(normalized.deniedActions, DENIED_ACTIONS);
  const noReadinessClaim =
    normalized.reviewOnly === true &&
    normalized.appLevelInternalOnly === true &&
    normalized.publicMcpExpanded === false &&
    normalized.callToolWidened === false &&
    normalized.runtimeReady === false &&
    normalized.readinessClaimed === false &&
    normalized.dirtyBaselineBlocksLiveProof === true;

  const familyReports = normalized.familyEntries.map(entry => {
    const requiredContext = REQUIRED_CONTEXT_SURFACES[entry.family] || {};
    return {
      family: entry.family,
      accepted: familyEntryAccepted(entry),
      requiredAppMethod: REQUIRED_APP_ENTRY_METHODS[entry.family] || '',
      appMethod: entry.appMethod,
      requiredRequestSource: requiredContext.requestSource || '',
      requestSource: entry.requestSource,
      requiredContextFlag: requiredContext.contextFlag || '',
      contextFlag: entry.contextFlag,
      adapterServiceExposed: entry.adapterServiceExposed,
      defaultDisabled: entry.defaultDisabled,
      approvedContextRequired: entry.approvedContextRequired,
      dryRunPlanningOnly: entry.dryRunPlanningOnly,
      runtimeApplyBlocked: entry.runtimeApplyBlocked,
      publicCallToolUnknown: entry.publicCallToolUnknown,
      mutatesDurableState: entry.mutatesDurableState,
      readinessClaimed: entry.readinessClaimed
    };
  });

  const accepted =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    familySetExact &&
    publicMcpFrozen &&
    evidenceComplete &&
    validationComplete &&
    deniedActionsComplete &&
    noReadinessClaim &&
    closureBoundaryReport.closureBoundaryAccepted === true &&
    closureBoundaryReport.appRuntimeEvidenceClosureAllowed === true &&
    familyReports.every(report => report.accepted);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    appRuntimeEntryReadinessReviewAccepted: accepted,
    appLevelDryRunEntriesReadyForReview: accepted,
    runtimeReady: false,
    readinessClaimed: false,
    publicMcpExpanded: false,
    callToolWidened: false,
    dirtyBaselineBlocksLiveProof: normalized.dirtyBaselineBlocksLiveProof,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    governedFamilies: {
      exact: familySetExact,
      required: GOVERNANCE_FAMILIES,
      present: familyIds,
      missing: GOVERNANCE_FAMILIES.filter(family => !familyIds.includes(family)),
      unexpected: familyIds.filter(family => !GOVERNANCE_FAMILIES.includes(family))
    },
    evidenceRefs: {
      complete: evidenceComplete,
      required: REQUIRED_EVIDENCE_REFS,
      present: normalized.evidenceRefs,
      missing: REQUIRED_EVIDENCE_REFS.filter(ref => !normalized.evidenceRefs.includes(ref))
    },
    validationCommands: {
      complete: validationComplete,
      required: REQUIRED_VALIDATION_COMMANDS,
      present: normalized.validationCommands,
      missing: REQUIRED_VALIDATION_COMMANDS.filter(command => !normalized.validationCommands.includes(command))
    },
    deniedActions: {
      exact: deniedActionsComplete,
      required: DENIED_ACTIONS,
      present: normalized.deniedActions,
      missing: DENIED_ACTIONS.filter(action => !normalized.deniedActions.includes(action)),
      unexpected: normalized.deniedActions.filter(action => !DENIED_ACTIONS.includes(action))
    },
    closureEvidenceBoundary: {
      accepted: closureBoundaryReport.closureBoundaryAccepted,
      appRuntimeEvidenceClosureAllowed: closureBoundaryReport.appRuntimeEvidenceClosureAllowed,
      dirtyBaselineBlocksClosure: closureBoundaryReport.dirtyBaselineBlocksClosure,
      uncommittedAppEvidence: closureBoundaryReport.evidence.uncommittedAppEvidence,
      failedAppValidation: closureBoundaryReport.evidence.failedAppValidation,
      unsafeAppEvidence: closureBoundaryReport.evidence.unsafeAppEvidence,
      blockingFindings: closureBoundaryReport.blockers.blockingFindings
    },
    requiredAppEntryMethods: REQUIRED_APP_ENTRY_METHODS,
    requiredContextSurfaces: REQUIRED_CONTEXT_SURFACES,
    familyReports,
    safety: {
      noSideEffects: accepted,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false
    }
  };
}

module.exports = {
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APP_ENTRY_METHODS,
  REQUIRED_CONTEXT_SURFACES,
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_VALIDATION_COMMANDS,
  normalizePolicy,
  summarizeDeferredGovernanceAppRuntimeEntryReadinessReviewPolicy
};
