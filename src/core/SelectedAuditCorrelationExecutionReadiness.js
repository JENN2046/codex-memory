'use strict';

const {
  RESULT_CLASSES
} = require('./SelectedAuditCorrelationResultClassifier');

const READINESS_CLASSES = Object.freeze({
  BLOCKED_PREFLIGHT_NOT_READY: 'BLOCKED_PREFLIGHT_NOT_READY',
  READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED: 'READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED',
  SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING: 'SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING',
  SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY: 'SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY',
  FAIL_CLOSED_CLASSIFICATION_MISSING: 'FAIL_CLOSED_CLASSIFICATION_MISSING',
  FAIL_CLOSED_PREFLIGHT_INCONSISTENT: 'FAIL_CLOSED_PREFLIGHT_INCONSISTENT',
  FAIL_CLOSED_INVALID_OVERCLAIM_SIGNAL: 'FAIL_CLOSED_INVALID_OVERCLAIM_SIGNAL',
  FAIL_CLOSED_INVALID_DOWNGRADE_SIGNAL: 'FAIL_CLOSED_INVALID_DOWNGRADE_SIGNAL',
  FAIL_CLOSED_UNFAVORABLE_CLASSIFICATION: 'FAIL_CLOSED_UNFAVORABLE_CLASSIFICATION'
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBlockers(value) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeString)
    .filter(Boolean);
}

function normalizePreflightSummary(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    acceptedForExecutionPreflight: safeValue.acceptedForExecutionPreflight === true,
    exactApprovalLineMatched: safeValue.exactApprovalLineMatched === true,
    requestHashMatched: safeValue.requestHashMatched === true,
    cleanTargetHead: safeValue.cleanTargetHead === true,
    requiredPriorResultsBound: safeValue.requiredPriorResultsBound === true,
    currentArtifactsBound: safeValue.currentArtifactsBound === true,
    observationSurfaceBound: safeValue.observationSurfaceBound === true,
    boundaryFlagsBound: safeValue.boundaryFlagsBound === true,
    executionStarted: safeValue.executionStarted === true,
    auditObservationStarted: safeValue.auditObservationStarted === true,
    blockerReasons: normalizeBlockers(safeValue.blockerReasons)
  };
}

function normalizeClassification(value = {}) {
  if (!isPlainObject(value)) {
    return null;
  }
  return {
    resultClass: normalizeString(value.resultClass),
    reason: normalizeString(value.reason),
    allowedDowngrade: normalizeString(value.allowedDowngrade),
    blockerDowngradeAllowed: value.blockerDowngradeAllowed === true,
    reliabilityClaimAllowed: value.reliabilityClaimAllowed === true,
    readinessClaimAllowed: value.readinessClaimAllowed === true,
    nextStep: normalizeString(value.nextStep)
  };
}

function baseResult(readinessClass, preflight, classification, extra = {}) {
  return {
    readinessClass,
    ...extra,
    preflightAccepted: preflight.acceptedForExecutionPreflight,
    preflightBlockerReasons: preflight.blockerReasons,
    classificationResultClass: classification ? classification.resultClass : null,
    observationExecutionStarted: false,
    auditObservationStarted: preflight.auditObservationStarted,
    observationExecutionAuthorizedByThisHelper: false,
    blockerDowngradeAllowed: extra.blockerDowngradeAllowed === true,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
      readsObservationInput: false,
      readsTrueAuditLog: false,
      readsRawAudit: false,
      readsRawMemory: false,
      readsJsonl: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false,
      callsProvider: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      appliesMutation: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    }
  };
}

function hasPriorResultBlocker(preflight) {
  return preflight.blockerReasons.some(reason => reason.startsWith('prior_result_'));
}

function preflightComponentsBound(preflight) {
  return preflight.exactApprovalLineMatched
    && preflight.requestHashMatched
    && preflight.cleanTargetHead
    && preflight.requiredPriorResultsBound
    && preflight.currentArtifactsBound
    && preflight.observationSurfaceBound
    && preflight.boundaryFlagsBound;
}

function classificationRequiresStartedObservation(classification) {
  return classification.resultClass !== RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE;
}

function evaluateSelectedAuditCorrelationExecutionReadiness({ preflightSummary = {}, classification = null } = {}) {
  const preflight = normalizePreflightSummary(preflightSummary);
  const normalizedClassification = normalizeClassification(classification);

  if (!normalizedClassification || !normalizedClassification.resultClass) {
    return baseResult(
      READINESS_CLASSES.FAIL_CLOSED_CLASSIFICATION_MISSING,
      preflight,
      normalizedClassification,
      {
        reason: 'classification_missing_or_malformed',
        nextStep: 'Run only local classification first; do not execute selected audit observation.'
      }
    );
  }

  if (normalizedClassification.reliabilityClaimAllowed || normalizedClassification.readinessClaimAllowed) {
    return baseResult(
      READINESS_CLASSES.FAIL_CLOSED_INVALID_OVERCLAIM_SIGNAL,
      preflight,
      normalizedClassification,
      {
        reason: 'classification_attempted_readiness_or_reliability_claim',
        nextStep: 'Stop; classification output must not permit readiness or reliability claims.'
      }
    );
  }

  if (
    normalizedClassification.blockerDowngradeAllowed
    && normalizedClassification.resultClass !== RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED
  ) {
    return baseResult(
      READINESS_CLASSES.FAIL_CLOSED_INVALID_DOWNGRADE_SIGNAL,
      preflight,
      normalizedClassification,
      {
        reason: 'classification_allowed_downgrade_for_non_favorable_result',
        nextStep: 'Stop before any blocker downgrade.'
      }
    );
  }

  if (!preflight.acceptedForExecutionPreflight) {
    return baseResult(
      READINESS_CLASSES.BLOCKED_PREFLIGHT_NOT_READY,
      preflight,
      normalizedClassification,
      {
        reason: hasPriorResultBlocker(preflight) ? 'required_prior_results_missing_or_invalid' : 'preflight_not_ready',
        requiredPriorResultsMissing: hasPriorResultBlocker(preflight),
        nextStep: 'Do not execute CM-1120. Satisfy preflight blockers and obtain separate exact approval first.'
      }
    );
  }

  if (!preflightComponentsBound(preflight)) {
    return baseResult(
      READINESS_CLASSES.FAIL_CLOSED_PREFLIGHT_INCONSISTENT,
      preflight,
      normalizedClassification,
      {
        reason: 'preflight_accepted_but_required_component_flag_missing',
        nextStep: 'Stop; rebuild preflight summary from current facts before any selected audit observation.'
      }
    );
  }

  if (classificationRequiresStartedObservation(normalizedClassification) && (!preflight.auditObservationStarted || !preflight.executionStarted)) {
    return baseResult(
      READINESS_CLASSES.FAIL_CLOSED_PREFLIGHT_INCONSISTENT,
      preflight,
      normalizedClassification,
      {
        reason: 'classification_requires_started_observation_but_preflight_reports_not_started',
        nextStep: 'Stop; selected audit classification must be tied to an executed observation summary.'
      }
    );
  }

  if (normalizedClassification.resultClass === RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE) {
    return baseResult(
      READINESS_CLASSES.READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED,
      preflight,
      normalizedClassification,
      {
        reason: 'preflight_ready_but_no_selected_observation_present',
        selectedObservationEvidencePresent: false,
        nextStep: 'A future selected audit observation would still need to be executed separately with selected sanitized output only.'
      }
    );
  }

  if (
    normalizedClassification.resultClass === RESULT_CLASSES.AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING
    || normalizedClassification.resultClass === RESULT_CLASSES.AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING
  ) {
    return baseResult(
      READINESS_CLASSES.SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING,
      preflight,
      normalizedClassification,
      {
        reason: normalizedClassification.reason || 'selected_audit_observed_but_followup_missing',
        selectedObservationEvidencePresent: true,
        nextStep: 'Stop before downgrade; metadata lifecycle and recall suppression follow-up are both required.'
      }
    );
  }

  if (
    normalizedClassification.resultClass === RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED
    && normalizedClassification.blockerDowngradeAllowed
  ) {
    return baseResult(
      READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY,
      preflight,
      normalizedClassification,
      {
        reason: 'selected_audit_correlation_observed_with_required_followup',
        selectedObservationEvidencePresent: true,
        blockerDowngradeAllowed: true,
        allowedDowngrade: normalizedClassification.allowedDowngrade,
        nextStep: 'Record only the narrow blocker downgrade; do not claim recall/write reliability or readiness.'
      }
    );
  }

  return baseResult(
    READINESS_CLASSES.FAIL_CLOSED_UNFAVORABLE_CLASSIFICATION,
    preflight,
    normalizedClassification,
    {
      reason: normalizedClassification.reason || 'classification_not_favorable_for_downgrade',
      nextStep: 'Stop before any blocker downgrade, broad audit scan, or reliability/readiness claim.'
    }
  );
}

module.exports = {
  READINESS_CLASSES,
  evaluateSelectedAuditCorrelationExecutionReadiness,
  normalizeClassification,
  normalizePreflightSummary
};
