const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  summarizeDeferredGovernanceClosureEvidenceBoundary
} = require('./DeferredGovernanceClosureEvidenceBoundaryPolicy');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-preview-closure-review-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const REQUIRED_PREVIEW_CLOSURE_UNITS = Object.freeze([
  'bounded_apply_plan_preview',
  'adapter_apply_plan_preview',
  'app_apply_plan_preview_entry',
  'app_apply_plan_preview_readiness_review'
]);

const REQUIRED_EVIDENCE_REFS = Object.freeze([
  'CM-0929',
  'CM-0930',
  'CM-0931',
  'CM-0932',
  'CM-0992',
  'CMV-1047',
  'CMV-1048',
  'CMV-1049',
  'CMV-1050',
  'CMV-1110'
]);

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --check src\\core\\DeferredGovernanceBoundedApplyPlanPreview.js',
  'node --check src\\core\\DeferredGovernanceRuntimeEntryAdapter.js',
  'node --check src\\app.js',
  'node --check src\\core\\DeferredGovernanceAppApplyPlanPreviewReadinessReviewPolicy.js',
  'node --check src\\core\\DeferredGovernanceClosureEvidenceBoundaryPolicy.js',
  'node --test tests\\deferred-governance-bounded-apply-plan-preview.test.js',
  'node --test tests\\deferred-governance-runtime-entry-adapter.test.js',
  'node --test tests\\deferred-governance-app-runtime-entry.test.js',
  'node --test tests\\deferred-governance-app-apply-plan-preview-readiness-review-policy.test.js',
  'node --test tests\\deferred-governance-closure-evidence-boundary-policy.test.js'
]);

const DENIED_ACTIONS = Object.freeze([
  'publicMcpExpansion',
  'callToolWidening',
  'runtimeApply',
  'executionApproval',
  'serviceStart',
  'runtimeProbe',
  'liveRecallProof',
  'liveWriteProof',
  'trueRecordMemoryCall',
  'trueSearchMemoryCall',
  'realMemoryRead',
  'rawJsonlRead',
  'durableMemoryWrite',
  'durableAuditWrite',
  'durableProjectionApply',
  'candidateCacheClear',
  'providerCall',
  'configMutation',
  'watchdogStartupChange',
  'readinessClaim',
  'reliabilityClaim'
]);

const REQUIRED_UNIT_EVIDENCE = Object.freeze({
  bounded_apply_plan_preview: Object.freeze({
    ref: 'CM-0929',
    validationRef: 'CMV-1047'
  }),
  adapter_apply_plan_preview: Object.freeze({
    ref: 'CM-0930',
    validationRef: 'CMV-1048'
  }),
  app_apply_plan_preview_entry: Object.freeze({
    ref: 'CM-0931',
    validationRef: 'CMV-1049'
  }),
  app_apply_plan_preview_readiness_review: Object.freeze({
    ref: 'CM-0932',
    validationRef: 'CMV-1050'
  })
});

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

function requiredUnitEvidence(unitId) {
  return REQUIRED_UNIT_EVIDENCE[unitId] || {
    ref: '',
    validationRef: ''
  };
}

function normalizePreviewClosureUnit(unit = {}) {
  const safeUnit = isPlainObject(unit) ? unit : {};

  return {
    id: normalizeString(safeUnit.id),
    evidenceRef: normalizeString(safeUnit.evidenceRef),
    validationRef: normalizeString(safeUnit.validationRef),
    accepted: normalizeBoolean(safeUnit.accepted),
    internalOnly: normalizeBoolean(safeUnit.internalOnly),
    previewOnly: normalizeBoolean(safeUnit.previewOnly),
    defaultDisabled: normalizeBoolean(safeUnit.defaultDisabled),
    approvedContextRequired: normalizeBoolean(safeUnit.approvedContextRequired),
    publicMcpFrozen: normalizeBoolean(safeUnit.publicMcpFrozen),
    callToolWidened: normalizeBoolean(safeUnit.callToolWidened),
    executionApproved: normalizeBoolean(safeUnit.executionApproved),
    runtimeApplied: normalizeBoolean(safeUnit.runtimeApplied),
    durableAuditWritten: normalizeBoolean(safeUnit.durableAuditWritten),
    durableProjectionApplied: normalizeBoolean(safeUnit.durableProjectionApplied),
    candidateCacheCleared: normalizeBoolean(safeUnit.candidateCacheCleared),
    readinessClaimed: normalizeBoolean(safeUnit.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safeUnit.reliabilityClaimed)
  };
}

function normalizePolicy(packet = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};

  return {
    schemaVersion: normalizeString(safePacket.schemaVersion),
    version: normalizeString(safePacket.version),
    sourceMode: normalizeString(safePacket.sourceMode),
    reviewOnly: normalizeBoolean(safePacket.reviewOnly),
    internalOnly: normalizeBoolean(safePacket.internalOnly),
    previewClosureOnly: normalizeBoolean(safePacket.previewClosureOnly),
    dirtyBaselineBlocksLiveProof: normalizeBoolean(safePacket.dirtyBaselineBlocksLiveProof),
    publicToolsFrozen: normalizeBoolean(safePacket.publicToolsFrozen),
    publicTools: normalizeStringArray(safePacket.publicTools),
    evidenceRefs: normalizeStringArray(safePacket.evidenceRefs),
    validationCommands: normalizeStringArray(safePacket.validationCommands),
    deniedActions: normalizeStringArray(safePacket.deniedActions),
    governedFamilies: normalizeStringArray(safePacket.governedFamilies),
    publicMcpExpanded: normalizeBoolean(safePacket.publicMcpExpanded),
    callToolWidened: normalizeBoolean(safePacket.callToolWidened),
    executionApproved: normalizeBoolean(safePacket.executionApproved),
    runtimeReady: normalizeBoolean(safePacket.runtimeReady),
    runtimeApplied: normalizeBoolean(safePacket.runtimeApplied),
    serviceStarted: normalizeBoolean(safePacket.serviceStarted),
    runtimeProbeExecuted: normalizeBoolean(safePacket.runtimeProbeExecuted),
    liveProofExecuted: normalizeBoolean(safePacket.liveProofExecuted),
    durableAuditWritten: normalizeBoolean(safePacket.durableAuditWritten),
    durableProjectionApplied: normalizeBoolean(safePacket.durableProjectionApplied),
    candidateCacheCleared: normalizeBoolean(safePacket.candidateCacheCleared),
    providerCalled: normalizeBoolean(safePacket.providerCalled),
    configMutated: normalizeBoolean(safePacket.configMutated),
    readinessClaimed: normalizeBoolean(safePacket.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safePacket.reliabilityClaimed),
    closureEvidenceBoundary: isPlainObject(safePacket.closureEvidenceBoundary)
      ? safePacket.closureEvidenceBoundary
      : {},
    previewClosureUnits: Array.isArray(safePacket.previewClosureUnits)
      ? safePacket.previewClosureUnits.map(normalizePreviewClosureUnit)
      : []
  };
}

function previewClosureUnitAccepted(unit) {
  const required = requiredUnitEvidence(unit.id);

  return REQUIRED_PREVIEW_CLOSURE_UNITS.includes(unit.id) &&
    unit.evidenceRef === required.ref &&
    unit.validationRef === required.validationRef &&
    unit.accepted === true &&
    unit.internalOnly === true &&
    unit.previewOnly === true &&
    unit.defaultDisabled === true &&
    unit.approvedContextRequired === true &&
    unit.publicMcpFrozen === true &&
    unit.callToolWidened === false &&
    unit.executionApproved === false &&
    unit.runtimeApplied === false &&
    unit.durableAuditWritten === false &&
    unit.durableProjectionApplied === false &&
    unit.candidateCacheCleared === false &&
    unit.readinessClaimed === false &&
    unit.reliabilityClaimed === false;
}

function summarizeDeferredGovernancePreviewClosureReviewPolicy(packet = {}) {
  const normalized = normalizePolicy(packet);
  const closureBoundaryReport = summarizeDeferredGovernanceClosureEvidenceBoundary(
    normalized.closureEvidenceBoundary
  );
  const unitIds = normalized.previewClosureUnits.map(unit => unit.id).filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const familySetExact = hasExactSet(normalized.governedFamilies, GOVERNANCE_FAMILIES);
  const unitSetExact = hasExactSet(unitIds, REQUIRED_PREVIEW_CLOSURE_UNITS);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const evidenceComplete = hasEveryValue(normalized.evidenceRefs, REQUIRED_EVIDENCE_REFS);
  const validationComplete = hasEveryValue(normalized.validationCommands, REQUIRED_VALIDATION_COMMANDS);
  const deniedActionsExact = hasExactSet(normalized.deniedActions, DENIED_ACTIONS);
  const noGlobalExecution =
    normalized.reviewOnly === true &&
    normalized.internalOnly === true &&
    normalized.previewClosureOnly === true &&
    normalized.dirtyBaselineBlocksLiveProof === true &&
    normalized.publicMcpExpanded === false &&
    normalized.callToolWidened === false &&
    normalized.executionApproved === false &&
    normalized.runtimeReady === false &&
    normalized.runtimeApplied === false &&
    normalized.serviceStarted === false &&
    normalized.runtimeProbeExecuted === false &&
    normalized.liveProofExecuted === false &&
    normalized.durableAuditWritten === false &&
    normalized.durableProjectionApplied === false &&
    normalized.candidateCacheCleared === false &&
    normalized.providerCalled === false &&
    normalized.configMutated === false &&
    normalized.readinessClaimed === false &&
    normalized.reliabilityClaimed === false;

  const unitReports = normalized.previewClosureUnits.map(unit => {
    const required = requiredUnitEvidence(unit.id);
    return {
      id: unit.id,
      accepted: previewClosureUnitAccepted(unit),
      requiredEvidenceRef: required.ref,
      evidenceRef: unit.evidenceRef,
      requiredValidationRef: required.validationRef,
      validationRef: unit.validationRef,
      internalOnly: unit.internalOnly,
      previewOnly: unit.previewOnly,
      defaultDisabled: unit.defaultDisabled,
      approvedContextRequired: unit.approvedContextRequired,
      publicMcpFrozen: unit.publicMcpFrozen,
      callToolWidened: unit.callToolWidened,
      executionApproved: unit.executionApproved,
      runtimeApplied: unit.runtimeApplied,
      durableAuditWritten: unit.durableAuditWritten,
      durableProjectionApplied: unit.durableProjectionApplied,
      candidateCacheCleared: unit.candidateCacheCleared,
      readinessClaimed: unit.readinessClaimed,
      reliabilityClaimed: unit.reliabilityClaimed
    };
  });

  const previewClosureReviewAccepted =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    familySetExact &&
    unitSetExact &&
    publicMcpFrozen &&
    evidenceComplete &&
    validationComplete &&
    deniedActionsExact &&
    noGlobalExecution &&
    closureBoundaryReport.closureBoundaryAccepted === true &&
    closureBoundaryReport.appRuntimeEvidenceClosureAllowed === true &&
    unitReports.every(report => report.accepted);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    previewClosureReviewAccepted,
    previewClosureLocallyClosed: previewClosureReviewAccepted,
    runtimeReady: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    publicMcpExpanded: false,
    callToolWidened: false,
    executionApproved: false,
    runtimeApplied: false,
    dirtyBaselineBlocksLiveProof: normalized.dirtyBaselineBlocksLiveProof,
    governedFamilies: {
      exact: familySetExact,
      required: GOVERNANCE_FAMILIES,
      present: normalized.governedFamilies,
      missing: GOVERNANCE_FAMILIES.filter(family => !normalized.governedFamilies.includes(family)),
      unexpected: normalized.governedFamilies.filter(family => !GOVERNANCE_FAMILIES.includes(family))
    },
    previewClosureUnits: {
      exact: unitSetExact,
      required: REQUIRED_PREVIEW_CLOSURE_UNITS,
      present: unitIds,
      missing: REQUIRED_PREVIEW_CLOSURE_UNITS.filter(unit => !unitIds.includes(unit)),
      unexpected: unitIds.filter(unit => !REQUIRED_PREVIEW_CLOSURE_UNITS.includes(unit))
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
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
    requiredUnitEvidence: REQUIRED_UNIT_EVIDENCE,
    unitReports,
    safety: {
      noSideEffects: previewClosureReviewAccepted,
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
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_PREVIEW_CLOSURE_UNITS,
  REQUIRED_UNIT_EVIDENCE,
  REQUIRED_VALIDATION_COMMANDS,
  normalizePolicy,
  summarizeDeferredGovernancePreviewClosureReviewPolicy
};
