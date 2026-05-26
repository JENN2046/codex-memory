'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  RESULT_CLASSES
} = require('../src/core/SelectedAuditCorrelationResultClassifier');
const {
  READINESS_CLASSES,
  evaluateSelectedAuditCorrelationExecutionReadiness
} = require('../src/core/SelectedAuditCorrelationExecutionReadiness');

function preflight(overrides = {}) {
  return {
    acceptedForExecutionPreflight: true,
    exactApprovalLineMatched: true,
    requestHashMatched: true,
    cleanTargetHead: true,
    requiredPriorResultsBound: true,
    currentArtifactsBound: true,
    observationSurfaceBound: true,
    boundaryFlagsBound: true,
    executionStarted: false,
    auditObservationStarted: false,
    blockerReasons: [],
    ...overrides
  };
}

function classification(overrides = {}) {
  return {
    resultClass: RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE,
    reason: 'audit_observation_not_started',
    allowedDowngrade: 'none',
    blockerDowngradeAllowed: false,
    reliabilityClaimAllowed: false,
    readinessClaimAllowed: false,
    ...overrides
  };
}

test('CM-1126 blocks current-facts state when required prior results are missing', () => {
  const result = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight({
      acceptedForExecutionPreflight: false,
      requiredPriorResultsBound: false,
      blockerReasons: ['dirty_worktree', 'prior_result_CM-1111_missing', 'prior_result_CM-1115_missing']
    }),
    classification: classification()
  });

  assert.equal(result.readinessClass, READINESS_CLASSES.BLOCKED_PREFLIGHT_NOT_READY);
  assert.equal(result.requiredPriorResultsMissing, true);
  assert.equal(result.blockerDowngradeAllowed, false);
  assert.equal(result.observationExecutionAuthorizedByThisHelper, false);
  assert.equal(result.safety.readsTrueAuditLog, false);
  assert.equal(result.safety.callsSearchMemory, false);
});

test('CM-1126 separates preflight-ready no-observation state from actual selected evidence', () => {
  const result = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight(),
    classification: classification()
  });

  assert.equal(
    result.readinessClass,
    READINESS_CLASSES.READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED
  );
  assert.equal(result.selectedObservationEvidencePresent, false);
  assert.equal(result.blockerDowngradeAllowed, false);
  assert.equal(result.readinessClaimAllowed, false);
  assert.equal(result.reliabilityClaimAllowed, false);
});

test('CM-1126 fails closed if classifier output attempts readiness or reliability overclaim', () => {
  const result = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight(),
    classification: classification({
      readinessClaimAllowed: true
    })
  });

  assert.equal(result.readinessClass, READINESS_CLASSES.FAIL_CLOSED_INVALID_OVERCLAIM_SIGNAL);
  assert.equal(result.blockerDowngradeAllowed, false);
  assert.equal(result.readinessClaimAllowed, false);
  assert.equal(result.reliabilityClaimAllowed, false);
});

test('CM-1126 fails closed on inconsistent accepted preflight summaries', () => {
  const acceptedButHashMissing = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight({
      acceptedForExecutionPreflight: true,
      requestHashMatched: false
    }),
    classification: classification()
  });

  assert.equal(acceptedButHashMissing.readinessClass, READINESS_CLASSES.FAIL_CLOSED_PREFLIGHT_INCONSISTENT);
  assert.equal(acceptedButHashMissing.blockerDowngradeAllowed, false);

  const favorableWithoutStartedObservation = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight({
      auditObservationStarted: false,
      executionStarted: false
    }),
    classification: classification({
      resultClass: RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED,
      blockerDowngradeAllowed: true
    })
  });

  assert.equal(favorableWithoutStartedObservation.readinessClass, READINESS_CLASSES.FAIL_CLOSED_PREFLIGHT_INCONSISTENT);
  assert.equal(favorableWithoutStartedObservation.blockerDowngradeAllowed, false);
});

test('CM-1126 fails closed if non-favorable classifier tries to allow downgrade', () => {
  const result = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight(),
    classification: classification({
      resultClass: RESULT_CLASSES.AUDIT_PENDING_MISSING,
      blockerDowngradeAllowed: true
    })
  });

  assert.equal(result.readinessClass, READINESS_CLASSES.FAIL_CLOSED_INVALID_DOWNGRADE_SIGNAL);
  assert.equal(result.blockerDowngradeAllowed, false);
});

test('CM-1126 requires metadata lifecycle and recall suppression follow-up after selected audit observation', () => {
  const result = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight({ auditObservationStarted: true, executionStarted: true }),
    classification: classification({
      resultClass: RESULT_CLASSES.AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING,
      reason: 'selected_audit_observed_but_recall_suppression_missing'
    })
  });

  assert.equal(result.readinessClass, READINESS_CLASSES.SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING);
  assert.equal(result.selectedObservationEvidencePresent, true);
  assert.equal(result.blockerDowngradeAllowed, false);
});

test('CM-1126 allows only narrow downgrade for favorable selected audit plus follow-up and still denies readiness', () => {
  const result = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: preflight({ auditObservationStarted: true, executionStarted: true }),
    classification: classification({
      resultClass: RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED,
      reason: 'selected_audit_correlation_observed',
      allowedDowngrade: 'one exact-approved selected-field audit-correlation observation for the exact proof memory',
      blockerDowngradeAllowed: true
    })
  });

  assert.equal(result.readinessClass, READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY);
  assert.equal(result.blockerDowngradeAllowed, true);
  assert.equal(result.readinessClaimAllowed, false);
  assert.equal(result.reliabilityClaimAllowed, false);
  assert.equal(result.observationExecutionAuthorizedByThisHelper, false);
});
