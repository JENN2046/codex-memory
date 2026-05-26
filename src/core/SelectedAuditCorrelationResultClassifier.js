'use strict';

const {
  REQUIRED_OBSERVATION_SURFACE,
  TARGET_MEMORY_ID
} = require('./SelectedAuditCorrelationObservationPreflight');

const RESULT_CLASSES = Object.freeze({
  DRAFT_ONLY_NO_EVIDENCE: 'DRAFT_ONLY_NO_EVIDENCE',
  FAIL_CLOSED_PRIOR_RESULTS_MISSING: 'FAIL_CLOSED_PRIOR_RESULTS_MISSING',
  FAIL_CLOSED_APPROVAL_INVALID: 'FAIL_CLOSED_APPROVAL_INVALID',
  INVALID_SCOPE_EXPANSION: 'INVALID_SCOPE_EXPANSION',
  INVALID_RAW_OR_SECRET_OUTPUT: 'INVALID_RAW_OR_SECRET_OUTPUT',
  FAIL_CLOSED_READER_UNAVAILABLE: 'FAIL_CLOSED_READER_UNAVAILABLE',
  FAIL_CLOSED_AUDIT_READ_FAILED: 'FAIL_CLOSED_AUDIT_READ_FAILED',
  AUDIT_CORRELATION_NOT_FOUND: 'AUDIT_CORRELATION_NOT_FOUND',
  AUDIT_MEMORY_ID_MISMATCH: 'AUDIT_MEMORY_ID_MISMATCH',
  AUDIT_EVENT_FAMILY_MISMATCH: 'AUDIT_EVENT_FAMILY_MISMATCH',
  AUDIT_REQUEST_SOURCE_MISMATCH: 'AUDIT_REQUEST_SOURCE_MISMATCH',
  AUDIT_PENDING_MISSING: 'AUDIT_PENDING_MISSING',
  AUDIT_COMMITTED_MISSING: 'AUDIT_COMMITTED_MISSING',
  AUDIT_CORRELATION_ID_MISMATCH: 'AUDIT_CORRELATION_ID_MISMATCH',
  AUDIT_PHASE_OR_MUTATION_FLAG_MISMATCH: 'AUDIT_PHASE_OR_MUTATION_FLAG_MISMATCH',
  AUDIT_LIFECYCLE_TRANSITION_MISMATCH: 'AUDIT_LIFECYCLE_TRANSITION_MISMATCH',
  AUDIT_SELECTED_CORRELATION_OBSERVED: 'AUDIT_SELECTED_CORRELATION_OBSERVED',
  AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING: 'AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING',
  AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING: 'AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING'
});

const EXPECTED = Object.freeze({
  memoryId: TARGET_MEMORY_ID,
  eventType: REQUIRED_OBSERVATION_SURFACE.eventType,
  toolName: REQUIRED_OBSERVATION_SURFACE.toolName,
  requestSource: REQUIRED_OBSERVATION_SURFACE.requestSource,
  fromStatus: 'active',
  toStatus: 'tombstoned',
  pendingAuditPhase: 'pending',
  pendingMutationApplied: false,
  committedAuditPhase: 'committed',
  committedMutationApplied: true
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePhase(value) {
  return normalizeString(value).toLowerCase();
}

function hasTrue(value) {
  return value === true;
}

function hasFalse(value) {
  return value === false;
}

function includesForbiddenRawOutput(value) {
  if (!isPlainObject(value)) return false;
  if (value.rawAuditReturned === true) return true;
  if (value.rawAuditPayload || value.rawJsonlLine || value.rawMemoryContent || value.diaryContent || value.chunkText || value.vectorData) {
    return true;
  }
  let serialized = '';
  try {
    serialized = JSON.stringify(value);
  } catch (_error) {
    return true;
  }
  return /api[_-]?key|authorization|bearer|database_url|raw audit payload|raw memory content/i.test(serialized);
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
    blockerReasons: Array.isArray(safeValue.blockerReasons) ? safeValue.blockerReasons.map(normalizeString).filter(Boolean) : []
  };
}

function fail(resultClass, reason, extra = {}) {
  return {
    ...extra,
    resultClass,
    reason,
    allowedDowngrade: extra.allowedDowngrade || 'none',
    blockerDowngradeAllowed: extra.blockerDowngradeAllowed === true,
    reliabilityClaimAllowed: false,
    readinessClaimAllowed: false,
    nextStep: extra.nextStep || 'Stop before any blocker downgrade or reliability/readiness claim.'
  };
}

function selectedObservation(resultClass, reason, extra = {}) {
  return {
    ...extra,
    resultClass,
    reason,
    allowedDowngrade: extra.allowedDowngrade || 'one exact-approved selected-field audit-correlation observation for the exact proof memory',
    blockerDowngradeAllowed: resultClass === RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED,
    reliabilityClaimAllowed: false,
    readinessClaimAllowed: false,
    nextStep: extra.nextStep || 'Stop before recall, durability, cleanup, rollback, or reliability/readiness claims.'
  };
}

function validatePreflight(preflight) {
  if (!preflight.auditObservationStarted) {
    return fail(
      RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE,
      'audit_observation_not_started',
      { nextStep: 'Continue local planning or obtain separate exact approval before any future execution.' }
    );
  }
  if (!preflight.executionStarted) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_APPROVAL_INVALID, 'execution_started_missing_for_audit_observation');
  }
  if (!preflight.requiredPriorResultsBound) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_PRIOR_RESULTS_MISSING, 'required_prior_results_missing_or_invalid');
  }
  if (!preflight.acceptedForExecutionPreflight || !preflight.exactApprovalLineMatched || !preflight.requestHashMatched || !preflight.cleanTargetHead) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_APPROVAL_INVALID, 'approval_or_target_preflight_invalid');
  }
  if (!preflight.currentArtifactsBound) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_READER_UNAVAILABLE, 'current_helper_or_matrix_artifact_unavailable');
  }
  if (!preflight.observationSurfaceBound || !preflight.boundaryFlagsBound) {
    return fail(RESULT_CLASSES.INVALID_SCOPE_EXPANSION, 'observation_surface_or_boundary_flags_invalid');
  }
  return null;
}

function classifySelectedAuditCorrelationObservation({ preflightSummary = {}, observation = null, followup = {} } = {}) {
  const preflight = normalizePreflightSummary(preflightSummary);
  const preflightFailure = validatePreflight(preflight);
  if (preflightFailure) return preflightFailure;

  if (!isPlainObject(observation)) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_AUDIT_READ_FAILED, 'selected_observation_missing_or_malformed');
  }
  if (includesForbiddenRawOutput(observation)) {
    return fail(RESULT_CLASSES.INVALID_RAW_OR_SECRET_OUTPUT, 'selected_observation_contains_raw_or_secret_like_output');
  }
  if (observation.selectedFieldsOnly !== true || observation.rawAuditReturned !== false) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_READER_UNAVAILABLE, 'selected_reader_flags_missing_or_invalid');
  }
  if (observation.found === false && observation.reason === 'selected_audit_correlation_not_found') {
    return fail(
      RESULT_CLASSES.AUDIT_CORRELATION_NOT_FOUND,
      'selected_audit_correlation_not_found',
      {
        allowedDowngrade: 'exact-id no-correlation observation only',
        nextStep: 'Stop; do not broaden the audit window or scan raw audit logs.'
      }
    );
  }
  if (observation.found !== true) {
    return fail(RESULT_CLASSES.FAIL_CLOSED_AUDIT_READ_FAILED, 'selected_observation_failed_or_uninterpretable');
  }

  const pending = isPlainObject(observation.pending) ? observation.pending : null;
  const committed = isPlainObject(observation.committed) ? observation.committed : null;
  if (!pending) {
    return fail(RESULT_CLASSES.AUDIT_PENDING_MISSING, 'pending_event_missing');
  }
  if (!committed) {
    return fail(
      RESULT_CLASSES.AUDIT_COMMITTED_MISSING,
      'committed_event_missing',
      {
        allowedDowngrade: 'pending-only observation only',
        nextStep: 'Stop before apply-provenance claim.'
      }
    );
  }

  const memoryIds = [observation.memoryId, pending.memoryId, committed.memoryId].map(normalizeString);
  if (memoryIds.some(memoryId => memoryId !== EXPECTED.memoryId)) {
    return fail(RESULT_CLASSES.AUDIT_MEMORY_ID_MISMATCH, 'memory_id_mismatch');
  }
  const eventTypes = [observation.eventType, pending.eventType, committed.eventType].map(normalizeString);
  const toolNames = [observation.toolName, pending.toolName, committed.toolName].map(normalizeString);
  if (eventTypes.some(eventType => eventType !== EXPECTED.eventType) || toolNames.some(toolName => toolName !== EXPECTED.toolName)) {
    return fail(RESULT_CLASSES.AUDIT_EVENT_FAMILY_MISMATCH, 'event_type_or_tool_name_mismatch');
  }
  const requestSources = [observation.requestSource, pending.requestSource, committed.requestSource].map(normalizeString);
  if (requestSources.some(requestSource => requestSource !== EXPECTED.requestSource)) {
    return fail(RESULT_CLASSES.AUDIT_REQUEST_SOURCE_MISMATCH, 'request_source_mismatch');
  }
  if (normalizeString(committed.correlationId) !== normalizeString(pending.eventId)) {
    return fail(RESULT_CLASSES.AUDIT_CORRELATION_ID_MISMATCH, 'committed_correlation_id_does_not_match_pending_event_id');
  }
  if (
    normalizePhase(pending.auditPhase) !== EXPECTED.pendingAuditPhase
    || !hasFalse(pending.mutationApplied)
    || normalizePhase(committed.auditPhase) !== EXPECTED.committedAuditPhase
    || !hasTrue(committed.mutationApplied)
  ) {
    return fail(RESULT_CLASSES.AUDIT_PHASE_OR_MUTATION_FLAG_MISMATCH, 'audit_phase_or_mutation_flag_mismatch');
  }
  if (
    normalizeString(pending.fromStatus) !== EXPECTED.fromStatus
    || normalizeString(pending.toStatus) !== EXPECTED.toStatus
    || normalizeString(committed.fromStatus) !== EXPECTED.fromStatus
    || normalizeString(committed.toStatus) !== EXPECTED.toStatus
  ) {
    return fail(
      RESULT_CLASSES.AUDIT_LIFECYCLE_TRANSITION_MISMATCH,
      'lifecycle_transition_mismatch',
      {
        allowedDowngrade: 'mismatched transition observation only'
      }
    );
  }

  if (followup.metadataLifecycleObserved !== true) {
    return selectedObservation(
      RESULT_CLASSES.AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING,
      'selected_audit_observed_but_metadata_lifecycle_missing',
      {
        blockerDowngradeAllowed: false,
        allowedDowngrade: 'selected audit observation only'
      }
    );
  }
  if (followup.recallSuppressionObserved !== true) {
    return selectedObservation(
      RESULT_CLASSES.AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING,
      'selected_audit_observed_but_recall_suppression_missing',
      {
        blockerDowngradeAllowed: false,
        allowedDowngrade: 'selected audit observation only'
      }
    );
  }

  return selectedObservation(RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED, 'selected_audit_correlation_observed');
}

module.exports = {
  EXPECTED,
  RESULT_CLASSES,
  classifySelectedAuditCorrelationObservation,
  normalizePreflightSummary
};
