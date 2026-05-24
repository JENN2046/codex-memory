const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  summarizeDeferredGovernanceClosureEvidenceBoundary
} = require('./DeferredGovernanceClosureEvidenceBoundaryPolicy');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-app-apply-plan-preview-readiness-review-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const REQUIRED_APP_PREVIEW_METHODS = Object.freeze({
  memory_exclude: 'previewInternalMemoryExcludeApplyPlan',
  memory_forget: 'previewInternalMemoryForgetApplyPlan'
});

const REQUIRED_ADAPTER_PREVIEW_METHODS = Object.freeze({
  memory_exclude: 'previewInternalMemoryExcludeApplyPlan',
  memory_forget: 'previewInternalMemoryForgetApplyPlan'
});

const REQUIRED_EVIDENCE_REFS = Object.freeze([
  'CM-0929',
  'CM-0930',
  'CM-0931',
  'CM-0992',
  'CMV-1047',
  'CMV-1048',
  'CMV-1049',
  'CMV-1110'
]);

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --check src\\app.js',
  'node --check tests\\deferred-governance-app-runtime-entry.test.js',
  'node --check src\\core\\DeferredGovernanceClosureEvidenceBoundaryPolicy.js',
  'node --test tests\\deferred-governance-app-runtime-entry.test.js',
  'node --test tests\\deferred-governance-runtime-entry-adapter.test.js',
  'node --test tests\\deferred-governance-bounded-apply-plan-preview.test.js',
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
  'durableProjectionApply',
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

function normalizeFamilyPreviewEntry(entry = {}) {
  const safeEntry = isPlainObject(entry) ? entry : {};

  return {
    family: normalizeString(safeEntry.family),
    appPreviewMethod: normalizeString(safeEntry.appPreviewMethod),
    adapterPreviewMethod: normalizeString(safeEntry.adapterPreviewMethod),
    appMethodRoutesToAdapter: normalizeBoolean(safeEntry.appMethodRoutesToAdapter),
    adapterPreviewEnabledBySeparateFlag: normalizeBoolean(safeEntry.adapterPreviewEnabledBySeparateFlag),
    defaultDisabled: normalizeBoolean(safeEntry.defaultDisabled),
    approvedContextRequired: normalizeBoolean(safeEntry.approvedContextRequired),
    runtimeSurfaceEvidenceRequired: normalizeBoolean(safeEntry.runtimeSurfaceEvidenceRequired),
    previewOnly: normalizeBoolean(safeEntry.previewOnly),
    applyPlanPreviewAccepted: normalizeBoolean(safeEntry.applyPlanPreviewAccepted),
    executionApproved: normalizeBoolean(safeEntry.executionApproved),
    runtimeApplyBlocked: normalizeBoolean(safeEntry.runtimeApplyBlocked),
    runtimeEntryMounted: normalizeBoolean(safeEntry.runtimeEntryMounted),
    mutated: normalizeBoolean(safeEntry.mutated),
    durableAuditWritten: normalizeBoolean(safeEntry.durableAuditWritten),
    durableProjectionApplied: normalizeBoolean(safeEntry.durableProjectionApplied),
    candidateCacheCleared: normalizeBoolean(safeEntry.candidateCacheCleared),
    publicCallToolUnknown: normalizeBoolean(safeEntry.publicCallToolUnknown),
    publicMcpExpanded: normalizeBoolean(safeEntry.publicMcpExpanded),
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
    previewOnly: normalizeBoolean(safePacket.previewOnly),
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
    familyPreviewEntries: Array.isArray(safePacket.familyPreviewEntries)
      ? safePacket.familyPreviewEntries.map(normalizeFamilyPreviewEntry)
      : []
  };
}

function familyPreviewEntryAccepted(entry) {
  return GOVERNANCE_FAMILIES.includes(entry.family) &&
    entry.appPreviewMethod === REQUIRED_APP_PREVIEW_METHODS[entry.family] &&
    entry.adapterPreviewMethod === REQUIRED_ADAPTER_PREVIEW_METHODS[entry.family] &&
    entry.appMethodRoutesToAdapter === true &&
    entry.adapterPreviewEnabledBySeparateFlag === true &&
    entry.defaultDisabled === true &&
    entry.approvedContextRequired === true &&
    entry.runtimeSurfaceEvidenceRequired === true &&
    entry.previewOnly === true &&
    entry.applyPlanPreviewAccepted === true &&
    entry.executionApproved === false &&
    entry.runtimeApplyBlocked === true &&
    entry.runtimeEntryMounted === false &&
    entry.mutated === false &&
    entry.durableAuditWritten === false &&
    entry.durableProjectionApplied === false &&
    entry.candidateCacheCleared === false &&
    entry.publicCallToolUnknown === true &&
    entry.publicMcpExpanded === false &&
    entry.readinessClaimed === false;
}

function summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy(packet = {}) {
  const normalized = normalizePolicy(packet);
  const closureBoundaryReport = summarizeDeferredGovernanceClosureEvidenceBoundary(
    normalized.closureEvidenceBoundary
  );
  const familyIds = normalized.familyPreviewEntries.map(entry => entry.family).filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const familySetExact = hasExactSet(familyIds, GOVERNANCE_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const evidenceComplete = hasEveryValue(normalized.evidenceRefs, REQUIRED_EVIDENCE_REFS);
  const validationComplete = hasEveryValue(normalized.validationCommands, REQUIRED_VALIDATION_COMMANDS);
  const deniedActionsExact = hasExactSet(normalized.deniedActions, DENIED_ACTIONS);
  const noReadinessClaim =
    normalized.reviewOnly === true &&
    normalized.appLevelInternalOnly === true &&
    normalized.previewOnly === true &&
    normalized.publicMcpExpanded === false &&
    normalized.callToolWidened === false &&
    normalized.runtimeReady === false &&
    normalized.readinessClaimed === false &&
    normalized.dirtyBaselineBlocksLiveProof === true;

  const familyReports = normalized.familyPreviewEntries.map(entry => ({
    family: entry.family,
    accepted: familyPreviewEntryAccepted(entry),
    requiredAppPreviewMethod: REQUIRED_APP_PREVIEW_METHODS[entry.family] || '',
    appPreviewMethod: entry.appPreviewMethod,
    requiredAdapterPreviewMethod: REQUIRED_ADAPTER_PREVIEW_METHODS[entry.family] || '',
    adapterPreviewMethod: entry.adapterPreviewMethod,
    appMethodRoutesToAdapter: entry.appMethodRoutesToAdapter,
    adapterPreviewEnabledBySeparateFlag: entry.adapterPreviewEnabledBySeparateFlag,
    defaultDisabled: entry.defaultDisabled,
    approvedContextRequired: entry.approvedContextRequired,
    runtimeSurfaceEvidenceRequired: entry.runtimeSurfaceEvidenceRequired,
    previewOnly: entry.previewOnly,
    applyPlanPreviewAccepted: entry.applyPlanPreviewAccepted,
    executionApproved: entry.executionApproved,
    runtimeApplyBlocked: entry.runtimeApplyBlocked,
    runtimeEntryMounted: entry.runtimeEntryMounted,
    mutated: entry.mutated,
    durableAuditWritten: entry.durableAuditWritten,
    durableProjectionApplied: entry.durableProjectionApplied,
    candidateCacheCleared: entry.candidateCacheCleared,
    publicCallToolUnknown: entry.publicCallToolUnknown,
    publicMcpExpanded: entry.publicMcpExpanded,
    readinessClaimed: entry.readinessClaimed
  }));

  const accepted =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    familySetExact &&
    publicMcpFrozen &&
    evidenceComplete &&
    validationComplete &&
    deniedActionsExact &&
    noReadinessClaim &&
    closureBoundaryReport.closureBoundaryAccepted === true &&
    closureBoundaryReport.appRuntimeEvidenceClosureAllowed === true &&
    familyReports.every(report => report.accepted);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    appApplyPlanPreviewReadinessReviewAccepted: accepted,
    appPreviewEntriesReadyForReview: accepted,
    runtimeReady: false,
    readinessClaimed: false,
    publicMcpExpanded: false,
    callToolWidened: false,
    previewOnly: normalized.previewOnly,
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
      exact: deniedActionsExact,
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
    requiredAppPreviewMethods: REQUIRED_APP_PREVIEW_METHODS,
    requiredAdapterPreviewMethods: REQUIRED_ADAPTER_PREVIEW_METHODS,
    familyReports,
    safety: {
      noSideEffects: accepted,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      durableAuditWritten: false,
      durableProjectionApplied: false,
      candidateCacheCleared: false
    }
  };
}

module.exports = {
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_ADAPTER_PREVIEW_METHODS,
  REQUIRED_APP_PREVIEW_METHODS,
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_VALIDATION_COMMANDS,
  normalizePolicy,
  summarizeDeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy
};
