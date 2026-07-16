'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EVIDENCE_MARKER
} = require('../src/core/Phase2NativeReadProofReceiptAuditIntakeContract');
const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptReviewContract
} = require('../src/core/Phase2NativeReadProofReceiptReviewContract');

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
    responseBodyReads: 0,
    responseShapeInspections: 0,
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
      traceMatrixStillRequiresExactReceiptEvidence: true,
      completionAuditStillRequiresNativeReadProofPassed: true,
      localReviewDoesNotSatisfyNativeReadProof: true
    },
    nativeReadProofReview: {
      reviewPrepared: true,
      receiptField: 'nativeReadProofPassed',
      requiredReceiptCategory: 'nativeReadProofReceipt',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      safeReferenceNameCategory: 'safe_reference_name_only',
      nativeReadObservedCategory: REQUIRED_EVIDENCE_MARKER,
      queryBoundaryCategory: 'category_only_bounded_read_probe',
      resultShapeCategory: 'category_only_no_field_names',
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
      approvalLineIncluded: false,
      acceptedAsCompletionEvidenceNow: false
    },
    proposedCompletionEvidence: {
      phase2NativeReadProofReceiptReviewPassed: true,
      nativeReadProofPassed: REQUIRED_EVIDENCE_MARKER
    },
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    nativeReadProofReview: {
      ...base.nativeReadProofReview,
      ...(overrides.nativeReadProofReview || {})
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
  assert.equal(result.nativeReadProofPassed, false);
  assert.equal(result.actualReceiptAccepted, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.nativeTargetBindingPerformed, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2039 accepts category-only native read proof receipt review without satisfying exact evidence', () => {
  const result = evaluatePhase2NativeReadProofReceiptReviewContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_native_read_proof_receipt_review_accepted');
  assert.equal(result.phase2NativeReadProofReceiptReviewPassed, true);
  assert.equal(result.nativeReadProofPassed, false);
  assert.deepEqual(result.proposedCompletionEvidence, {
    phase2NativeReadProofReceiptReviewPassed: true,
    nativeReadProofPassed: REQUIRED_EVIDENCE_MARKER,
    nativeReadProofAcceptedAsCompletionEvidenceNow: false
  });
  assert.equal(result.receiptReviewBoundary.safeReferenceNameOnly, true);
  assert.equal(result.receiptReviewBoundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receiptReviewBoundary.exactAuthorizedReceiptStillRequired, true);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesNativeReadProofPassed, false);
  assert.equal(result.receiptReviewBoundary.callsRuntime, false);
  assert.equal(result.receiptReviewBoundary.executesNativeRead, false);
  assertNoSideEffects(result);
});

test('CM2039 rejects unsafe target reference names without echoing target values', () => {
  const result = evaluatePhase2NativeReadProofReceiptReviewContract(contractInput({
    nativeReadProofReview: {
      targetReferenceName: 'http://example.invalid/private-target'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('nativeReadProofReview.targetReferenceName'));
  assert.equal(serialized.includes('example.invalid'), false);
  assertNoSideEffects(result);
});

test('CM2039 rejects attempts to mark nativeReadProofPassed complete now', () => {
  const result = evaluatePhase2NativeReadProofReceiptReviewContract(contractInput({
    nativeReadProofReview: {
      nativeReadObservedCategory: true,
      acceptedAsCompletionEvidenceNow: true
    },
    proposedCompletionEvidence: {
      nativeReadProofPassed: 'accepted_now'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('nativeReadProofReview.nativeReadObservedCategory'));
  assert.ok(result.blockers.includes('nativeReadProofReview.acceptedAsCompletionEvidenceNow'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.nativeReadProofPassed'));
  assert.equal(result.phase2NativeReadProofReceiptReviewPassed, false);
  assertNoSideEffects(result);
});

test('CM2039 rejects missing prerequisite chain before native read proof receipt review', () => {
  const result = evaluatePhase2NativeReadProofReceiptReviewContract(contractInput({
    prerequisites: {
      cm2038TargetBindingReceiptReviewAccepted: false,
      completionAuditStillRequiresNativeReadProofPassed: false,
      localReviewDoesNotSatisfyNativeReadProof: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2038TargetBindingReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresNativeReadProofPassed'));
  assert.ok(result.blockers.includes('prerequisites.localReviewDoesNotSatisfyNativeReadProof'));
  assertNoSideEffects(result);
});

test('CM2039 rejects raw query response field names memory ids approval or endpoint fields by path without echoing values', () => {
  const result = evaluatePhase2NativeReadProofReceiptReviewContract(contractInput({
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      queryText: 'ECHO_QUERY',
      responseBody: 'ECHO_RESPONSE',
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
    'unsafe.bearerToken',
    'unsafe.endpoint',
    'unsafe.fieldNames',
    'unsafe.memoryIds',
    'unsafe.queryText',
    'unsafe.responseBody'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_QUERY'), false);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_FIELD'), false);
  assert.equal(serialized.includes('ECHO_ID'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2039 stops L4 on native read runtime receipt application patch or readiness counters', () => {
  const result = evaluatePhase2NativeReadProofReceiptReviewContract(contractInput({
    request: {
      actualReceiptApplied: true,
      nativeReadExecuted: true,
      nativeReadProofPassed: true,
      responseBodyRead: true,
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
      responseShapeInspections: 1,
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
  assert.ok(result.stopReasons.includes('request.nativeReadProofPassed'));
  assert.ok(result.stopReasons.includes('request.responseBodyRead'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.receiptReviews'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeReadAttempts'));
  assert.ok(result.stopReasons.includes('counters.responseBodyReads'));
  assert.ok(result.stopReasons.includes('counters.responseShapeInspections'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2039 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    queryText: 'DO_NOT_ECHO_A',
    nested: {
      responseBody: 'DO_NOT_ECHO_B'
    }
  }), [
    'queryText',
    'nested.responseBody'
  ]);
});
