const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-closure-evidence-boundary-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const APP_RUNTIME_EVIDENCE_KINDS = Object.freeze([
  'app_runtime_entry',
  'app_runtime_entry_readiness_review',
  'app_apply_plan_preview_entry',
  'app_apply_plan_preview_readiness_review'
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
  'readinessClaim',
  'reliabilityClaim'
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

function normalizeEvidenceUnit(unit = {}) {
  const safeUnit = isPlainObject(unit) ? unit : {};

  return {
    id: normalizeString(safeUnit.id),
    kind: normalizeString(safeUnit.kind),
    evidenceRef: normalizeString(safeUnit.evidenceRef),
    validationRef: normalizeString(safeUnit.validationRef),
    committed: normalizeBoolean(safeUnit.committed),
    validationPassed: normalizeBoolean(safeUnit.validationPassed),
    internalOnly: normalizeBoolean(safeUnit.internalOnly),
    defaultDisabled: normalizeBoolean(safeUnit.defaultDisabled),
    publicMcpFrozen: normalizeBoolean(safeUnit.publicMcpFrozen),
    runtimeApplied: normalizeBoolean(safeUnit.runtimeApplied),
    readinessClaimed: normalizeBoolean(safeUnit.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safeUnit.reliabilityClaimed)
  };
}

function normalizeBoundaryPacket(packet = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};

  return {
    schemaVersion: normalizeString(safePacket.schemaVersion),
    version: normalizeString(safePacket.version),
    sourceMode: normalizeString(safePacket.sourceMode),
    reviewOnly: normalizeBoolean(safePacket.reviewOnly),
    dirtyBaselineBlocksClosure: normalizeBoolean(safePacket.dirtyBaselineBlocksClosure),
    publicToolsFrozen: normalizeBoolean(safePacket.publicToolsFrozen),
    publicTools: normalizeStringArray(safePacket.publicTools),
    governedFamilies: normalizeStringArray(safePacket.governedFamilies),
    deniedActions: normalizeStringArray(safePacket.deniedActions),
    publicMcpExpanded: normalizeBoolean(safePacket.publicMcpExpanded),
    callToolWidened: normalizeBoolean(safePacket.callToolWidened),
    runtimeReady: normalizeBoolean(safePacket.runtimeReady),
    readinessClaimed: normalizeBoolean(safePacket.readinessClaimed),
    reliabilityClaimed: normalizeBoolean(safePacket.reliabilityClaimed),
    evidenceUnits: Array.isArray(safePacket.evidenceUnits)
      ? safePacket.evidenceUnits.map(normalizeEvidenceUnit)
      : []
  };
}

function summarizeDeferredGovernanceClosureEvidenceBoundary(packet = {}) {
  const normalized = normalizeBoundaryPacket(packet);
  const familySetExact = hasExactSet(normalized.governedFamilies, GOVERNANCE_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const deniedActionsExact = hasExactSet(normalized.deniedActions, DENIED_ACTIONS);
  const appEvidenceUnits = normalized.evidenceUnits
    .filter(unit => APP_RUNTIME_EVIDENCE_KINDS.includes(unit.kind));
  const uncommittedAppEvidence = appEvidenceUnits
    .filter(unit => unit.committed !== true)
    .map(unit => unit.id || unit.kind);
  const failedAppValidation = appEvidenceUnits
    .filter(unit => unit.validationPassed !== true)
    .map(unit => unit.id || unit.kind);
  const unsafeAppEvidence = appEvidenceUnits
    .filter(unit =>
      unit.internalOnly !== true ||
      unit.defaultDisabled !== true ||
      unit.publicMcpFrozen !== true ||
      unit.runtimeApplied === true ||
      unit.readinessClaimed === true ||
      unit.reliabilityClaimed === true
    )
    .map(unit => unit.id || unit.kind);
  const globalUnsafe =
    normalized.publicMcpExpanded === true ||
    normalized.callToolWidened === true ||
    normalized.runtimeReady === true ||
    normalized.readinessClaimed === true ||
    normalized.reliabilityClaimed === true;
  const schemaSafe =
    normalized.schemaVersion === EXPECTED_SCHEMA_VERSION &&
    normalized.version === EXPECTED_VERSION &&
    normalized.sourceMode === 'explicit_input' &&
    normalized.reviewOnly === true;

  const closureBoundaryAccepted =
    schemaSafe &&
    familySetExact &&
    publicMcpFrozen &&
    deniedActionsExact &&
    normalized.dirtyBaselineBlocksClosure === true &&
    globalUnsafe === false;

  const appRuntimeEvidenceClosureAllowed =
    closureBoundaryAccepted &&
    appEvidenceUnits.length > 0 &&
    uncommittedAppEvidence.length === 0 &&
    failedAppValidation.length === 0 &&
    unsafeAppEvidence.length === 0;

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    closureBoundaryAccepted,
    appRuntimeEvidenceClosureAllowed,
    dirtyBaselineBlocksClosure: normalized.dirtyBaselineBlocksClosure,
    runtimeReady: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    publicMcpExpanded: false,
    callToolWidened: false,
    governedFamilies: {
      exact: familySetExact,
      required: GOVERNANCE_FAMILIES,
      present: normalized.governedFamilies
    },
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    deniedActions: {
      exact: deniedActionsExact,
      missing: DENIED_ACTIONS.filter(action => !normalized.deniedActions.includes(action)),
      unexpected: normalized.deniedActions.filter(action => !DENIED_ACTIONS.includes(action))
    },
    evidence: {
      appRuntimeEvidenceCount: appEvidenceUnits.length,
      uncommittedAppEvidence,
      failedAppValidation,
      unsafeAppEvidence
    },
    blockers: {
      blockingFindings: [
        ...(closureBoundaryAccepted ? [] : ['closure_boundary_not_accepted']),
        ...(uncommittedAppEvidence.length > 0 ? ['uncommitted_app_runtime_evidence'] : []),
        ...(failedAppValidation.length > 0 ? ['app_runtime_validation_not_passed'] : []),
        ...(unsafeAppEvidence.length > 0 ? ['unsafe_app_runtime_evidence'] : []),
        ...(globalUnsafe ? ['global_runtime_or_readiness_drift'] : [])
      ]
    },
    safety: {
      noSideEffects: true,
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
  APP_RUNTIME_EVIDENCE_KINDS,
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  normalizeBoundaryPacket,
  summarizeDeferredGovernanceClosureEvidenceBoundary
};
