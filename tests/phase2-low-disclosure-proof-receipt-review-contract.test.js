'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EVIDENCE_MARKER
} = require('../src/core/Phase2NativeReadProofReceiptAuditIntakeContract');
const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluatePhase2LowDisclosureProofReceiptReviewContract
} = require('../src/core/Phase2LowDisclosureProofReceiptReviewContract');

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
      traceMatrixStillRequiresExactReceiptEvidence: true,
      completionAuditStillRequiresLowDisclosureProofPassed: true,
      localReviewDoesNotSatisfyLowDisclosureProof: true
    },
    lowDisclosureReview: {
      reviewPrepared: true,
      receiptField: 'lowDisclosureProofPassed',
      requiredReceiptCategory: 'lowDisclosureProofReceipt',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      safeReferenceNameCategory: 'safe_reference_name_only',
      lowDisclosureObservedCategory: REQUIRED_EVIDENCE_MARKER,
      disclosureBudgetCategory: 'low_disclosure_budget_category_only',
      redactionPolicyCategory: 'redaction_policy_category_only',
      outputProjectionCategory: 'output_projection_category_only',
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
      approvalLineIncluded: false,
      acceptedAsCompletionEvidenceNow: false
    },
    proposedCompletionEvidence: {
      phase2LowDisclosureProofReceiptReviewPassed: true,
      lowDisclosureProofPassed: REQUIRED_EVIDENCE_MARKER
    },
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    lowDisclosureReview: {
      ...base.lowDisclosureReview,
      ...(overrides.lowDisclosureReview || {})
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
  assert.equal(result.lowDisclosureProofPassed, false);
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
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2041 accepts category-only low disclosure proof receipt review without satisfying exact evidence', () => {
  const result = evaluatePhase2LowDisclosureProofReceiptReviewContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_low_disclosure_proof_receipt_review_accepted');
  assert.equal(result.phase2LowDisclosureProofReceiptReviewPassed, true);
  assert.equal(result.lowDisclosureProofPassed, false);
  assert.deepEqual(result.proposedCompletionEvidence, {
    phase2LowDisclosureProofReceiptReviewPassed: true,
    lowDisclosureProofPassed: REQUIRED_EVIDENCE_MARKER,
    lowDisclosureAcceptedAsCompletionEvidenceNow: false
  });
  assert.equal(result.receiptReviewBoundary.safeReferenceNameOnly, true);
  assert.equal(result.receiptReviewBoundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receiptReviewBoundary.exactAuthorizedReceiptStillRequired, true);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesLowDisclosureProofPassed, false);
  assert.equal(result.receiptReviewBoundary.rawOutputConsumed, false);
  assert.equal(result.receiptReviewBoundary.rawAuditConsumed, false);
  assert.equal(result.receiptReviewBoundary.executesNativeRead, false);
  assertNoSideEffects(result);
});

test('CM2041 rejects unsafe target reference names without echoing target values', () => {
  const result = evaluatePhase2LowDisclosureProofReceiptReviewContract(contractInput({
    lowDisclosureReview: {
      targetReferenceName: 'http://example.invalid/private-target'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('lowDisclosureReview.targetReferenceName'));
  assert.equal(serialized.includes('example.invalid'), false);
  assertNoSideEffects(result);
});

test('CM2041 rejects attempts to mark lowDisclosureProofPassed complete now', () => {
  const result = evaluatePhase2LowDisclosureProofReceiptReviewContract(contractInput({
    lowDisclosureReview: {
      lowDisclosureObservedCategory: true,
      acceptedAsCompletionEvidenceNow: true
    },
    proposedCompletionEvidence: {
      lowDisclosureProofPassed: 'accepted_now'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('lowDisclosureReview.lowDisclosureObservedCategory'));
  assert.ok(result.blockers.includes('lowDisclosureReview.acceptedAsCompletionEvidenceNow'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.lowDisclosureProofPassed'));
  assert.equal(result.phase2LowDisclosureProofReceiptReviewPassed, false);
  assertNoSideEffects(result);
});

test('CM2041 rejects missing prerequisite chain before low disclosure receipt review', () => {
  const result = evaluatePhase2LowDisclosureProofReceiptReviewContract(contractInput({
    prerequisites: {
      cm2040FallbackDistinctionReceiptReviewAccepted: false,
      completionAuditStillRequiresLowDisclosureProofPassed: false,
      localReviewDoesNotSatisfyLowDisclosureProof: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2040FallbackDistinctionReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresLowDisclosureProofPassed'));
  assert.ok(result.blockers.includes('prerequisites.localReviewDoesNotSatisfyLowDisclosureProof'));
  assertNoSideEffects(result);
});

test('CM2041 rejects raw output audit response memory approval or endpoint fields by path without echoing values', () => {
  const result = evaluatePhase2LowDisclosureProofReceiptReviewContract(contractInput({
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      responseBody: 'ECHO_RESPONSE',
      rawOutput: 'ECHO_RAW_OUTPUT',
      rawAudit: 'ECHO_RAW_AUDIT',
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
    'unsafe.bearerToken',
    'unsafe.endpoint',
    'unsafe.fieldNames',
    'unsafe.memoryContent',
    'unsafe.memoryIds',
    'unsafe.rawAudit',
    'unsafe.rawOutput',
    'unsafe.responseBody'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_RAW_OUTPUT'), false);
  assert.equal(serialized.includes('ECHO_RAW_AUDIT'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_FIELD'), false);
  assert.equal(serialized.includes('ECHO_ID'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2041 stops L4 on low disclosure proof receipt application raw reads or readiness counters', () => {
  const result = evaluatePhase2LowDisclosureProofReceiptReviewContract(contractInput({
    request: {
      actualReceiptApplied: true,
      lowDisclosureProofPassed: true,
      rawOutputRead: true,
      rawAuditRead: true,
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
      rawOutputReads: 1,
      rawAuditReads: 1,
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
  assert.ok(result.stopReasons.includes('request.lowDisclosureProofPassed'));
  assert.ok(result.stopReasons.includes('request.rawOutputRead'));
  assert.ok(result.stopReasons.includes('request.rawAuditRead'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.receiptReviews'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeReadAttempts'));
  assert.ok(result.stopReasons.includes('counters.responseBodyReads'));
  assert.ok(result.stopReasons.includes('counters.rawOutputReads'));
  assert.ok(result.stopReasons.includes('counters.rawAuditReads'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2041 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawOutput: 'DO_NOT_ECHO_A',
    nested: {
      rawAudit: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawOutput',
    'nested.rawAudit'
  ]);
});
