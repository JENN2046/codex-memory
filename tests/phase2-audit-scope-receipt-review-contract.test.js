'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EVIDENCE_MARKER
} = require('../src/core/Phase2NativeReadProofReceiptAuditIntakeContract');
const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluatePhase2AuditScopeReceiptReviewContract
} = require('../src/core/Phase2AuditScopeReceiptReviewContract');

function zeroCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptReviews: 0,
    receiptApplications: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeTargetBindings: 0,
    nativeReadAttempts: 0,
    fallbackReads: 0,
    fallbackComparisons: 0,
    responseBodyReads: 0,
    rawOutputReads: 0,
    rawAuditReads: 0,
    auditRowReads: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    providerApiCalls: 0,
    nativeWriteAttempts: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function contractInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    mode: CONTRACT_MODE,
    prerequisites: {
      cm2025ReceiptAuditIntakeAccepted: true,
      cm2037ReceiptSchemaCompatibilityAccepted: true,
      cm2038TargetBindingReceiptReviewAccepted: true,
      cm2039NativeReadProofReceiptReviewAccepted: true,
      cm2040FallbackDistinctionReceiptReviewAccepted: true,
      cm2041LowDisclosureProofReceiptReviewAccepted: true,
      traceMatrixStillRequiresExactReceiptEvidence: true,
      completionAuditStillRequiresAuditReceiptPassed: true,
      completionAuditStillRequiresScopeVisibilityIsolationPassed: true,
      localReviewDoesNotSatisfyAuditOrScopeProof: true
    },
    auditScopeReview: {
      reviewPrepared: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      safeReferenceNameCategory: 'safe_reference_name_only',
      auditReceiptField: 'auditReceiptPassed',
      auditReceiptCategory: 'auditReceipt',
      auditReceiptObservedCategory: REQUIRED_EVIDENCE_MARKER,
      scopeVisibilityReceiptField: 'scopeVisibilityIsolationPassed',
      scopeVisibilityReceiptCategory: 'scopeVisibilityIsolationReceipt',
      scopeVisibilityObservedCategory: REQUIRED_EVIDENCE_MARKER,
      auditProjectionCategory: 'audit_projection_category_only',
      scopeVisibilityCategory: 'scope_visibility_category_only',
      isolationBoundaryCategory: 'isolation_boundary_category_only',
      categoryOnly: true,
      lowDisclosureOnly: true,
      endpointLocatorIncluded: false,
      targetValueIncluded: false,
      queryTextIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      fieldNamesIncluded: false,
      memoryIdsIncluded: false,
      rawOutputIncluded: false,
      rawAuditIncluded: false,
      auditRowsIncluded: false,
      scopeIdentifiersIncluded: false,
      approvalLineIncluded: false,
      acceptedAsCompletionEvidenceNow: false
    },
    proposedCompletionEvidence: {
      phase2AuditScopeReceiptReviewPassed: true,
      auditReceiptPassed: REQUIRED_EVIDENCE_MARKER,
      scopeVisibilityIsolationPassed: REQUIRED_EVIDENCE_MARKER
    },
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    auditScopeReview: {
      ...base.auditScopeReview,
      ...(overrides.auditScopeReview || {})
    },
    proposedCompletionEvidence: {
      ...base.proposedCompletionEvidence,
      ...(overrides.proposedCompletionEvidence || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.phase2Completed, false);
  assert.equal(result.auditReceiptPassed, false);
  assert.equal(result.scopeVisibilityIsolationPassed, false);
  assert.equal(result.actualReceiptAccepted, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.nativeTargetBindingPerformed, false);
  assert.equal(result.fallbackReadExecuted, false);
  assert.equal(result.fallbackComparisonExecuted, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawOutputRead, false);
  assert.equal(result.rawAuditRead, false);
  assert.equal(result.auditRowsRead, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2042 accepts category-only audit and scope receipt review without satisfying exact evidence', () => {
  const result = evaluatePhase2AuditScopeReceiptReviewContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_audit_scope_receipt_review_accepted');
  assert.equal(result.phase2AuditScopeReceiptReviewPassed, true);
  assert.equal(result.auditReceiptPassed, false);
  assert.equal(result.scopeVisibilityIsolationPassed, false);
  assert.deepEqual(result.proposedCompletionEvidence, {
    phase2AuditScopeReceiptReviewPassed: true,
    auditReceiptPassed: REQUIRED_EVIDENCE_MARKER,
    scopeVisibilityIsolationPassed: REQUIRED_EVIDENCE_MARKER,
    auditScopeAcceptedAsCompletionEvidenceNow: false
  });
  assert.equal(result.receiptReviewBoundary.safeReferenceNameOnly, true);
  assert.equal(result.receiptReviewBoundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receiptReviewBoundary.exactAuthorizedAuditReceiptStillRequired, true);
  assert.equal(result.receiptReviewBoundary.exactAuthorizedScopeVisibilityReceiptStillRequired, true);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesAuditReceiptPassed, false);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesScopeVisibilityIsolationPassed, false);
  assert.equal(result.receiptReviewBoundary.rawAuditConsumed, false);
  assert.equal(result.receiptReviewBoundary.auditRowsConsumed, false);
  assert.equal(result.receiptReviewBoundary.scopeIdentifiersDisclosed, false);
  assertNoSideEffects(result);
});

test('CM2042 rejects unsafe target reference names without echoing target values', () => {
  const result = evaluatePhase2AuditScopeReceiptReviewContract(contractInput({
    auditScopeReview: {
      targetReferenceName: 'http://example.invalid/private-target'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('auditScopeReview.targetReferenceName'));
  assert.equal(serialized.includes('example.invalid'), false);
  assertNoSideEffects(result);
});

test('CM2042 rejects attempts to mark audit or scope receipts complete now', () => {
  const result = evaluatePhase2AuditScopeReceiptReviewContract(contractInput({
    auditScopeReview: {
      auditReceiptObservedCategory: true,
      scopeVisibilityObservedCategory: true,
      acceptedAsCompletionEvidenceNow: true
    },
    proposedCompletionEvidence: {
      auditReceiptPassed: 'accepted_now',
      scopeVisibilityIsolationPassed: 'accepted_now'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('auditScopeReview.auditReceiptObservedCategory'));
  assert.ok(result.blockers.includes('auditScopeReview.scopeVisibilityObservedCategory'));
  assert.ok(result.blockers.includes('auditScopeReview.acceptedAsCompletionEvidenceNow'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.auditReceiptPassed'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.scopeVisibilityIsolationPassed'));
  assert.equal(result.phase2AuditScopeReceiptReviewPassed, false);
  assertNoSideEffects(result);
});

test('CM2042 rejects missing prerequisite chain before audit scope receipt review', () => {
  const result = evaluatePhase2AuditScopeReceiptReviewContract(contractInput({
    prerequisites: {
      cm2041LowDisclosureProofReceiptReviewAccepted: false,
      completionAuditStillRequiresAuditReceiptPassed: false,
      completionAuditStillRequiresScopeVisibilityIsolationPassed: false,
      localReviewDoesNotSatisfyAuditOrScopeProof: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2041LowDisclosureProofReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresAuditReceiptPassed'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresScopeVisibilityIsolationPassed'));
  assert.ok(result.blockers.includes('prerequisites.localReviewDoesNotSatisfyAuditOrScopeProof'));
  assertNoSideEffects(result);
});

test('CM2042 rejects raw audit scope memory approval or endpoint fields by path without echoing values', () => {
  const result = evaluatePhase2AuditScopeReceiptReviewContract(contractInput({
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      responseBody: 'ECHO_RESPONSE',
      rawOutput: 'ECHO_RAW_OUTPUT',
      rawAudit: 'ECHO_RAW_AUDIT',
      auditRows: ['ECHO_AUDIT_ROW'],
      scopeIdentifiers: ['ECHO_SCOPE'],
      memoryContent: 'ECHO_MEMORY',
      fieldNames: ['ECHO_FIELD'],
      memoryIds: ['ECHO_ID'],
      approvalLine: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.approvalLine',
    'unsafe.auditRows',
    'unsafe.bearerToken',
    'unsafe.endpoint',
    'unsafe.fieldNames',
    'unsafe.memoryContent',
    'unsafe.memoryIds',
    'unsafe.rawAudit',
    'unsafe.rawOutput',
    'unsafe.responseBody',
    'unsafe.scopeIdentifiers'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_RAW_OUTPUT'), false);
  assert.equal(serialized.includes('ECHO_RAW_AUDIT'), false);
  assert.equal(serialized.includes('ECHO_AUDIT_ROW'), false);
  assert.equal(serialized.includes('ECHO_SCOPE'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_FIELD'), false);
  assert.equal(serialized.includes('ECHO_ID'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2042 stops L4 on audit scope receipt application raw reads or readiness counters', () => {
  const result = evaluatePhase2AuditScopeReceiptReviewContract(contractInput({
    request: {
      actualReceiptApplied: true,
      auditReceiptPassed: true,
      scopeVisibilityIsolationPassed: true,
      rawAuditRead: true,
      auditRowsRead: true,
      phase2Completed: true,
      readinessClaimed: true
    },
    counters: {
      ...zeroCounters(),
      receiptReviews: 1,
      receiptApplications: 1,
      completionAuditPatchApplications: 1,
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      nativeReadAttempts: 1,
      responseBodyReads: 1,
      rawAuditReads: 1,
      auditRowReads: 1,
      realMemoryReads: 1,
      rawPrivateReads: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1,
      releaseDeployCutoverActions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.stopReasons.includes('request.actualReceiptApplied'));
  assert.ok(result.stopReasons.includes('request.auditReceiptPassed'));
  assert.ok(result.stopReasons.includes('request.scopeVisibilityIsolationPassed'));
  assert.ok(result.stopReasons.includes('request.rawAuditRead'));
  assert.ok(result.stopReasons.includes('request.auditRowsRead'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.receiptReviews'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeReadAttempts'));
  assert.ok(result.stopReasons.includes('counters.responseBodyReads'));
  assert.ok(result.stopReasons.includes('counters.rawAuditReads'));
  assert.ok(result.stopReasons.includes('counters.auditRowReads'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2042 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawAudit: 'DO_NOT_ECHO_A',
    nested: {
      auditRows: 'DO_NOT_ECHO_B',
      scopeIdentifiers: 'DO_NOT_ECHO_C'
    }
  }), [
    'rawAudit',
    'nested.auditRows',
    'nested.scopeIdentifiers'
  ]);
});
