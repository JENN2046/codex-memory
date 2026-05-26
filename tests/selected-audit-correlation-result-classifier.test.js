'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  RESULT_CLASSES,
  classifySelectedAuditCorrelationObservation,
  normalizePreflightSummary
} = require('../src/core/SelectedAuditCorrelationResultClassifier');
const {
  REQUIRED_OBSERVATION_SURFACE,
  TARGET_MEMORY_ID
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');

function readyPreflight(overrides = {}) {
  return {
    acceptedForExecutionPreflight: true,
    exactApprovalLineMatched: true,
    requestHashMatched: true,
    cleanTargetHead: true,
    requiredPriorResultsBound: true,
    currentArtifactsBound: true,
    observationSurfaceBound: true,
    boundaryFlagsBound: true,
    executionStarted: true,
    auditObservationStarted: true,
    blockerReasons: [],
    ...overrides
  };
}

function selectedObservation(overrides = {}) {
  return {
    found: true,
    reason: null,
    selectedFieldsOnly: true,
    rawAuditReturned: false,
    inspectedEntryCount: 2,
    matchedEventCount: 2,
    memoryId: TARGET_MEMORY_ID,
    eventType: REQUIRED_OBSERVATION_SURFACE.eventType,
    toolName: REQUIRED_OBSERVATION_SURFACE.toolName,
    requestSource: REQUIRED_OBSERVATION_SURFACE.requestSource,
    pending: {
      eventId: 'event-1',
      correlationId: null,
      auditPhase: 'pending',
      mutationApplied: false,
      memoryId: TARGET_MEMORY_ID,
      eventType: REQUIRED_OBSERVATION_SURFACE.eventType,
      toolName: REQUIRED_OBSERVATION_SURFACE.toolName,
      actorClientId: 'codex',
      requestSource: REQUIRED_OBSERVATION_SURFACE.requestSource,
      fromStatus: 'active',
      toStatus: 'tombstoned',
      tombstoneReason: 'proof-memory-retention-expired-after-validation'
    },
    committed: {
      eventId: 'event-1',
      correlationId: 'event-1',
      auditPhase: 'committed',
      mutationApplied: true,
      memoryId: TARGET_MEMORY_ID,
      eventType: REQUIRED_OBSERVATION_SURFACE.eventType,
      toolName: REQUIRED_OBSERVATION_SURFACE.toolName,
      actorClientId: 'codex',
      requestSource: REQUIRED_OBSERVATION_SURFACE.requestSource,
      fromStatus: 'active',
      toStatus: 'tombstoned',
      tombstoneReason: 'proof-memory-retention-expired-after-validation'
    },
    ...overrides
  };
}

test('CM-1123 classifier returns selected observed only after metadata and recall follow-up are present', () => {
  const result = classifySelectedAuditCorrelationObservation({
    preflightSummary: readyPreflight(),
    observation: selectedObservation(),
    followup: {
      metadataLifecycleObserved: true,
      recallSuppressionObserved: true
    }
  });

  assert.equal(result.resultClass, RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED);
  assert.equal(result.blockerDowngradeAllowed, true);
  assert.equal(result.reliabilityClaimAllowed, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM-1123 classifier distinguishes favorable audit from missing metadata and recall follow-up', () => {
  const noMetadata = classifySelectedAuditCorrelationObservation({
    preflightSummary: readyPreflight(),
    observation: selectedObservation()
  });

  assert.equal(noMetadata.resultClass, RESULT_CLASSES.AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING);
  assert.equal(noMetadata.blockerDowngradeAllowed, false);

  const noRecall = classifySelectedAuditCorrelationObservation({
    preflightSummary: readyPreflight(),
    observation: selectedObservation(),
    followup: {
      metadataLifecycleObserved: true
    }
  });

  assert.equal(noRecall.resultClass, RESULT_CLASSES.AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING);
  assert.equal(noRecall.blockerDowngradeAllowed, false);
});

test('CM-1123 classifier maps unstarted, missing prior result, invalid approval, and scope drift preflight blockers', () => {
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight({ auditObservationStarted: false }),
      observation: selectedObservation()
    }).resultClass,
    RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight({ executionStarted: false }),
      observation: selectedObservation()
    }).resultClass,
    RESULT_CLASSES.FAIL_CLOSED_APPROVAL_INVALID
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight({ requiredPriorResultsBound: false }),
      observation: selectedObservation()
    }).resultClass,
    RESULT_CLASSES.FAIL_CLOSED_PRIOR_RESULTS_MISSING
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight({ acceptedForExecutionPreflight: false, requestHashMatched: false }),
      observation: selectedObservation()
    }).resultClass,
    RESULT_CLASSES.FAIL_CLOSED_APPROVAL_INVALID
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight({ observationSurfaceBound: false }),
      observation: selectedObservation()
    }).resultClass,
    RESULT_CLASSES.INVALID_SCOPE_EXPANSION
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight({ currentArtifactsBound: false }),
      observation: selectedObservation()
    }).resultClass,
    RESULT_CLASSES.FAIL_CLOSED_READER_UNAVAILABLE
  );
});

test('CM-1123 classifier fails closed for malformed, raw, reader flag, and not-found observation shapes', () => {
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight(),
      observation: null
    }).resultClass,
    RESULT_CLASSES.FAIL_CLOSED_AUDIT_READ_FAILED
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight(),
      observation: selectedObservation({ rawAuditReturned: true })
    }).resultClass,
    RESULT_CLASSES.INVALID_RAW_OR_SECRET_OUTPUT
  );
  const circularObservation = selectedObservation();
  circularObservation.self = circularObservation;
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight(),
      observation: circularObservation
    }).resultClass,
    RESULT_CLASSES.INVALID_RAW_OR_SECRET_OUTPUT
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight(),
      observation: selectedObservation({ selectedFieldsOnly: false })
    }).resultClass,
    RESULT_CLASSES.FAIL_CLOSED_READER_UNAVAILABLE
  );
  assert.equal(
    classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight(),
      observation: selectedObservation({
        found: false,
        reason: 'selected_audit_correlation_not_found',
        pending: null,
        committed: null
      })
    }).resultClass,
    RESULT_CLASSES.AUDIT_CORRELATION_NOT_FOUND
  );
});

test('CM-1123 classifier maps identity, family, source, pending, committed, correlation, phase, and lifecycle mismatches', () => {
  const cases = [
    [
      RESULT_CLASSES.AUDIT_PENDING_MISSING,
      selectedObservation({ pending: null })
    ],
    [
      RESULT_CLASSES.AUDIT_COMMITTED_MISSING,
      selectedObservation({ committed: null })
    ],
    [
      RESULT_CLASSES.AUDIT_MEMORY_ID_MISMATCH,
      selectedObservation({ pending: { ...selectedObservation().pending, memoryId: 'different' } })
    ],
    [
      RESULT_CLASSES.AUDIT_EVENT_FAMILY_MISMATCH,
      selectedObservation({ committed: { ...selectedObservation().committed, toolName: 'different_tool' } })
    ],
    [
      RESULT_CLASSES.AUDIT_REQUEST_SOURCE_MISMATCH,
      selectedObservation({ requestSource: 'different-source' })
    ],
    [
      RESULT_CLASSES.AUDIT_CORRELATION_ID_MISMATCH,
      selectedObservation({ committed: { ...selectedObservation().committed, correlationId: 'different-event' } })
    ],
    [
      RESULT_CLASSES.AUDIT_PHASE_OR_MUTATION_FLAG_MISMATCH,
      selectedObservation({ pending: { ...selectedObservation().pending, mutationApplied: true } })
    ],
    [
      RESULT_CLASSES.AUDIT_LIFECYCLE_TRANSITION_MISMATCH,
      selectedObservation({ committed: { ...selectedObservation().committed, toStatus: 'active' } })
    ]
  ];

  for (const [expectedClass, observation] of cases) {
    const result = classifySelectedAuditCorrelationObservation({
      preflightSummary: readyPreflight(),
      observation
    });
    assert.equal(result.resultClass, expectedClass);
    assert.equal(result.reliabilityClaimAllowed, false);
    assert.equal(result.readinessClaimAllowed, false);
  }
});

test('CM-1123 classifier normalizes preflight summary without reading files or commands', () => {
  const normalized = normalizePreflightSummary({
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
    blockerReasons: [' dirty_worktree ', '', null]
  });

  assert.equal(normalized.acceptedForExecutionPreflight, true);
  assert.equal(normalized.auditObservationStarted, false);
  assert.deepEqual(normalized.blockerReasons, ['dirty_worktree']);
});
