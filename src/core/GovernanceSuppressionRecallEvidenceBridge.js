'use strict';

const {
  inspectBoundedSearchEvidenceShape
} = require('./SearchMemoryResponseSanitizer');

const GOVERNANCE_SUPPRESSION_RECALL_EVIDENCE_BRIDGE_VERSION =
  'phase-h-governance-suppression-recall-evidence-bridge-v1';

const FORBIDDEN_SOURCE_KIND_MARKERS = new Set([
  'governance_suppressed',
  'governance-suppressed',
  'suppressed',
  'memory_exclude',
  'memory-exclude',
  'memory_forget',
  'memory-forget',
  'private',
  'proposal',
  'rejected',
  'superseded',
  'tombstoned'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSourceMode(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/-/g, '_') : '';
}

function normalizeMarker(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function readStructuredResults(payload) {
  const results = payload?.result?.structuredContent?.results;
  return Array.isArray(results) ? results : [];
}

function collectForbiddenSourceKindViolations(payload) {
  const violations = [];
  readStructuredResults(payload).forEach((item, index) => {
    if (!isPlainObject(item)) return;
    const values = Array.isArray(item.sourceKinds)
      ? item.sourceKinds
      : [item.sourceKinds].filter(value => value !== undefined);
    values.forEach((value, sourceKindIndex) => {
      const marker = normalizeMarker(value);
      if (FORBIDDEN_SOURCE_KIND_MARKERS.has(marker)) {
        violations.push({
          path: `result.structuredContent.results[${index}].sourceKinds[${sourceKindIndex}]`,
          reason: 'forbidden_source_kind'
        });
      }
    });
  });
  return violations;
}

function hasExplicitFalse(value) {
  return value === false;
}

function summarizeGovernanceSuppressionRecallEvidenceBridge(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeSourceMode(safeInput.sourceMode || 'explicit_input');
  const consistencyReport = isPlainObject(safeInput.suppressionConsistency)
    ? safeInput.suppressionConsistency
    : {};
  const recallEvidence = isPlainObject(safeInput.recallEvidence)
    ? safeInput.recallEvidence
    : {};
  const suppressionProjection = isPlainObject(safeInput.suppressionProjection)
    ? safeInput.suppressionProjection
    : {};

  const consistencyAccepted =
    consistencyReport.acceptedForGovernanceScopeSuppressionConsistency === true &&
    consistencyReport.rawSuppressedMetadataExposed === false &&
    consistencyReport.noApplyInvariant === true &&
    consistencyReport?.deferredPolicy?.publicMcpFrozen === true &&
    consistencyReport?.safety?.noSideEffects === true &&
    consistencyReport?.safety?.rawPrivateMemoryExposed === false;

  const boundedShape = inspectBoundedSearchEvidenceShape(recallEvidence);
  const sourceKindViolations = collectForbiddenSourceKindViolations(recallEvidence);
  const governanceSuppressedProjected = suppressionProjection.governanceSuppressedProjected;
  const privateProjected = suppressionProjection.privateProjected;
  const projectionExplicit =
    hasExplicitFalse(governanceSuppressedProjected) &&
    hasExplicitFalse(privateProjected);
  const projectionClean =
    projectionExplicit &&
    sourceKindViolations.length === 0;

  const acceptedForRecallEvidenceBridge =
    sourceMode === 'explicit_input' &&
    consistencyAccepted &&
    boundedShape.accepted === true &&
    projectionClean === true;

  return {
    bridgeVersion: GOVERNANCE_SUPPRESSION_RECALL_EVIDENCE_BRIDGE_VERSION,
    sourceMode,
    acceptedForRecallEvidenceBridge,
    decision: acceptedForRecallEvidenceBridge
      ? 'NO_APPLY_GOVERNANCE_SUPPRESSION_RECALL_EVIDENCE_BRIDGE_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    consistency: {
      accepted: consistencyAccepted,
      rawSuppressedMetadataExposed: consistencyReport.rawSuppressedMetadataExposed === true,
      noApplyInvariant: consistencyReport.noApplyInvariant === true,
      publicMcpFrozen: consistencyReport?.deferredPolicy?.publicMcpFrozen === true
    },
    recallEvidence: {
      accepted: boundedShape.accepted,
      resultCount: boundedShape.resultCount,
      resultsLength: boundedShape.resultsLength,
      wrapperContentIgnored: boundedShape.wrapperContentIgnored,
      flags: boundedShape.flags,
      violationCount: boundedShape.violations.length + sourceKindViolations.length,
      violations: [
        ...boundedShape.violations.map(violation => ({
          path: violation.path,
          reason: violation.reason
        })),
        ...sourceKindViolations
      ]
    },
    suppressionProjection: {
      explicit: projectionExplicit,
      governanceSuppressedProjected: governanceSuppressedProjected === true,
      privateProjected: privateProjected === true,
      forbiddenSourceKindViolationCount: sourceKindViolations.length
    },
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
    blockers: {
      blockingFindings: [
        sourceMode !== 'explicit_input' ? 'source_mode_not_explicit_input' : null,
        !consistencyAccepted ? 'suppression_consistency_not_accepted' : null,
        boundedShape.accepted !== true ? 'bounded_recall_evidence_shape_not_accepted' : null,
        !projectionExplicit ? 'suppression_projection_not_explicit' : null,
        governanceSuppressedProjected === true ? 'governance_suppressed_candidate_projected' : null,
        privateProjected === true ? 'private_candidate_projected' : null,
        sourceKindViolations.length > 0 ? 'forbidden_source_kind_projected' : null
      ].filter(Boolean)
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
      rawPrivateMemoryExposed:
        consistencyReport.rawSuppressedMetadataExposed === true ||
        boundedShape.flags.rawContentReturned === true ||
        boundedShape.flags.pathsReturned === true ||
        boundedShape.flags.memoryIdsReturned === true ||
        boundedShape.flags.titlesReturned === true ||
        boundedShape.flags.snippetsReturned === true
    }
  };
}

module.exports = {
  GOVERNANCE_SUPPRESSION_RECALL_EVIDENCE_BRIDGE_VERSION,
  FORBIDDEN_SOURCE_KIND_MARKERS,
  summarizeGovernanceSuppressionRecallEvidenceBridge
};
