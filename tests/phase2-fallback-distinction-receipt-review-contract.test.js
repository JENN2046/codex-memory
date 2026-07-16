'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EVIDENCE_MARKER
} = require('../src/core/Phase2NativeReadProofReceiptAuditIntakeContract');
const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluatePhase2FallbackDistinctionReceiptReviewContract
} = require('../src/core/Phase2FallbackDistinctionReceiptReviewContract');

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
      traceMatrixStillRequiresExactReceiptEvidence: true,
      completionAuditStillRequiresFallbackDistinctionPassed: true,
      localReviewDoesNotSatisfyFallbackDistinction: true
    },
    fallbackDistinctionReview: {
      reviewPrepared: true,
      receiptField: 'fallbackDistinctionPassed',
      requiredReceiptCategory: 'fallbackDistinctionReceipt',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      safeReferenceNameCategory: 'safe_reference_name_only',
      fallbackDistinctionObservedCategory: REQUIRED_EVIDENCE_MARKER,
      nativeRouteCategory: 'native_route_category_only',
      fallbackRouteCategory: 'fallback_route_category_only',
      fallbackPolicyCategory: 'fallback_distinction_policy_category_only',
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
      fallbackResultIncluded: false,
      nativeResultIncluded: false,
      approvalLineIncluded: false,
      acceptedAsCompletionEvidenceNow: false
    },
    proposedCompletionEvidence: {
      phase2FallbackDistinctionReceiptReviewPassed: true,
      fallbackDistinctionPassed: REQUIRED_EVIDENCE_MARKER
    },
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    fallbackDistinctionReview: {
      ...base.fallbackDistinctionReview,
      ...(overrides.fallbackDistinctionReview || {})
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
  assert.equal(result.fallbackDistinctionPassed, false);
  assert.equal(result.actualReceiptAccepted, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.nativeTargetBindingPerformed, false);
  assert.equal(result.fallbackReadExecuted, false);
  assert.equal(result.fallbackComparisonExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2040 accepts category-only fallback distinction receipt review without satisfying exact evidence', () => {
  const result = evaluatePhase2FallbackDistinctionReceiptReviewContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_fallback_distinction_receipt_review_accepted');
  assert.equal(result.phase2FallbackDistinctionReceiptReviewPassed, true);
  assert.equal(result.fallbackDistinctionPassed, false);
  assert.deepEqual(result.proposedCompletionEvidence, {
    phase2FallbackDistinctionReceiptReviewPassed: true,
    fallbackDistinctionPassed: REQUIRED_EVIDENCE_MARKER,
    fallbackDistinctionAcceptedAsCompletionEvidenceNow: false
  });
  assert.equal(result.receiptReviewBoundary.safeReferenceNameOnly, true);
  assert.equal(result.receiptReviewBoundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receiptReviewBoundary.exactAuthorizedReceiptStillRequired, true);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesFallbackDistinctionPassed, false);
  assert.equal(result.receiptReviewBoundary.executesNativeRead, false);
  assert.equal(result.receiptReviewBoundary.executesFallbackRead, false);
  assert.equal(result.receiptReviewBoundary.comparesFallbackWithNative, false);
  assertNoSideEffects(result);
});

test('CM2040 rejects unsafe target reference names without echoing target values', () => {
  const result = evaluatePhase2FallbackDistinctionReceiptReviewContract(contractInput({
    fallbackDistinctionReview: {
      targetReferenceName: 'http://example.invalid/private-target'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('fallbackDistinctionReview.targetReferenceName'));
  assert.equal(serialized.includes('example.invalid'), false);
  assertNoSideEffects(result);
});

test('CM2040 rejects attempts to mark fallbackDistinctionPassed complete now', () => {
  const result = evaluatePhase2FallbackDistinctionReceiptReviewContract(contractInput({
    fallbackDistinctionReview: {
      fallbackDistinctionObservedCategory: true,
      acceptedAsCompletionEvidenceNow: true
    },
    proposedCompletionEvidence: {
      fallbackDistinctionPassed: 'accepted_now'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('fallbackDistinctionReview.fallbackDistinctionObservedCategory'));
  assert.ok(result.blockers.includes('fallbackDistinctionReview.acceptedAsCompletionEvidenceNow'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.fallbackDistinctionPassed'));
  assert.equal(result.phase2FallbackDistinctionReceiptReviewPassed, false);
  assertNoSideEffects(result);
});

test('CM2040 rejects missing prerequisite chain before fallback distinction receipt review', () => {
  const result = evaluatePhase2FallbackDistinctionReceiptReviewContract(contractInput({
    prerequisites: {
      cm2039NativeReadProofReceiptReviewAccepted: false,
      completionAuditStillRequiresFallbackDistinctionPassed: false,
      localReviewDoesNotSatisfyFallbackDistinction: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2039NativeReadProofReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresFallbackDistinctionPassed'));
  assert.ok(result.blockers.includes('prerequisites.localReviewDoesNotSatisfyFallbackDistinction'));
  assertNoSideEffects(result);
});

test('CM2040 rejects raw fallback native query response memory approval or endpoint fields by path without echoing values', () => {
  const result = evaluatePhase2FallbackDistinctionReceiptReviewContract(contractInput({
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      queryText: 'ECHO_QUERY',
      responseBody: 'ECHO_RESPONSE',
      fallbackResult: 'ECHO_FALLBACK',
      nativeResult: 'ECHO_NATIVE',
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
    'unsafe.bearerToken',
    'unsafe.endpoint',
    'unsafe.fallbackResult',
    'unsafe.memoryIds',
    'unsafe.nativeResult',
    'unsafe.queryText',
    'unsafe.responseBody'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_QUERY'), false);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_FALLBACK'), false);
  assert.equal(serialized.includes('ECHO_NATIVE'), false);
  assert.equal(serialized.includes('ECHO_ID'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2040 stops L4 on fallback/native execution receipt application patch or readiness counters', () => {
  const result = evaluatePhase2FallbackDistinctionReceiptReviewContract(contractInput({
    request: {
      actualReceiptApplied: true,
      nativeReadExecuted: true,
      fallbackReadExecuted: true,
      fallbackComparisonExecuted: true,
      fallbackDistinctionPassed: true,
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
      fallbackReads: 1,
      fallbackComparisons: 1,
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
  assert.ok(result.stopReasons.includes('request.nativeReadExecuted'));
  assert.ok(result.stopReasons.includes('request.fallbackReadExecuted'));
  assert.ok(result.stopReasons.includes('request.fallbackComparisonExecuted'));
  assert.ok(result.stopReasons.includes('request.fallbackDistinctionPassed'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.receiptReviews'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeReadAttempts'));
  assert.ok(result.stopReasons.includes('counters.fallbackReads'));
  assert.ok(result.stopReasons.includes('counters.fallbackComparisons'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2040 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    fallbackResult: 'DO_NOT_ECHO_A',
    nested: {
      nativeResult: 'DO_NOT_ECHO_B'
    }
  }), [
    'fallbackResult',
    'nested.nativeResult'
  ]);
});
