'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_EVIDENCE_MARKER
} = require('../src/core/Phase2NativeReadProofReceiptAuditIntakeContract');
const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluatePhase2NativeTargetBindingReceiptReviewContract
} = require('../src/core/Phase2NativeTargetBindingReceiptReviewContract');

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
      traceMatrixStillRequiresExactReceiptEvidence: true,
      completionAuditStillRequiresNativeTargetBindingPassed: true,
      localReviewDoesNotSatisfyNativeTargetBinding: true
    },
    targetBindingReview: {
      reviewPrepared: true,
      receiptField: 'nativeTargetBindingPassed',
      requiredReceiptCategory: 'nativeTargetBindingReceipt',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      safeReferenceNameCategory: 'safe_reference_name_only',
      targetBindingObservedCategory: REQUIRED_EVIDENCE_MARKER,
      categoryOnly: true,
      lowDisclosureOnly: true,
      endpointLocatorIncluded: false,
      targetValueIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      approvalLineIncluded: false,
      acceptedAsCompletionEvidenceNow: false
    },
    proposedCompletionEvidence: {
      phase2NativeTargetBindingReceiptReviewPassed: true,
      nativeTargetBindingPassed: REQUIRED_EVIDENCE_MARKER
    },
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    targetBindingReview: {
      ...base.targetBindingReview,
      ...(overrides.targetBindingReview || {})
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
  assert.equal(result.nativeTargetBindingPassed, false);
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

test('CM2038 accepts safe-reference-only native target binding receipt review without satisfying exact evidence', () => {
  const result = evaluatePhase2NativeTargetBindingReceiptReviewContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_native_target_binding_receipt_review_accepted');
  assert.equal(result.phase2NativeTargetBindingReceiptReviewPassed, true);
  assert.equal(result.nativeTargetBindingPassed, false);
  assert.deepEqual(result.proposedCompletionEvidence, {
    phase2NativeTargetBindingReceiptReviewPassed: true,
    nativeTargetBindingPassed: REQUIRED_EVIDENCE_MARKER,
    nativeTargetBindingAcceptedAsCompletionEvidenceNow: false
  });
  assert.equal(result.receiptReviewBoundary.safeReferenceNameOnly, true);
  assert.equal(result.receiptReviewBoundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receiptReviewBoundary.exactAuthorizedReceiptStillRequired, true);
  assert.equal(result.receiptReviewBoundary.localReviewSatisfiesNativeTargetBindingPassed, false);
  assert.equal(result.receiptReviewBoundary.callsRuntime, false);
  assertNoSideEffects(result);
});

test('CM2038 rejects unsafe target reference names without echoing target values', () => {
  const result = evaluatePhase2NativeTargetBindingReceiptReviewContract(contractInput({
    targetBindingReview: {
      targetReferenceName: 'http://example.invalid/private-target'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('targetBindingReview.targetReferenceName'));
  assert.equal(serialized.includes('example.invalid'), false);
  assertNoSideEffects(result);
});

test('CM2038 rejects attempts to mark nativeTargetBindingPassed complete now', () => {
  const result = evaluatePhase2NativeTargetBindingReceiptReviewContract(contractInput({
    targetBindingReview: {
      targetBindingObservedCategory: true,
      acceptedAsCompletionEvidenceNow: true
    },
    proposedCompletionEvidence: {
      nativeTargetBindingPassed: 'accepted_now'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('targetBindingReview.targetBindingObservedCategory'));
  assert.ok(result.blockers.includes('targetBindingReview.acceptedAsCompletionEvidenceNow'));
  assert.ok(result.blockers.includes('proposedCompletionEvidence.nativeTargetBindingPassed'));
  assert.equal(result.phase2NativeTargetBindingReceiptReviewPassed, false);
  assertNoSideEffects(result);
});

test('CM2038 rejects missing prerequisite chain before target binding receipt review', () => {
  const result = evaluatePhase2NativeTargetBindingReceiptReviewContract(contractInput({
    prerequisites: {
      cm2025ReceiptAuditIntakeAccepted: false,
      cm2037ReceiptSchemaCompatibilityAccepted: false,
      localReviewDoesNotSatisfyNativeTargetBinding: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2025ReceiptAuditIntakeAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2037ReceiptSchemaCompatibilityAccepted'));
  assert.ok(result.blockers.includes('prerequisites.localReviewDoesNotSatisfyNativeTargetBinding'));
  assertNoSideEffects(result);
});

test('CM2038 rejects raw endpoint locator target value approval or response fields by path without echoing values', () => {
  const result = evaluatePhase2NativeTargetBindingReceiptReviewContract(contractInput({
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      targetValue: 'ECHO_TARGET',
      responseBody: 'ECHO_RESPONSE',
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
    'unsafe.responseBody',
    'unsafe.targetValue'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_TARGET'), false);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2038 stops L4 on target binding runtime receipt application patch or readiness counters', () => {
  const result = evaluatePhase2NativeTargetBindingReceiptReviewContract(contractInput({
    request: {
      actualReceiptApplied: true,
      nativeTargetBindingPerformed: true,
      nativeTargetBindingPassed: true,
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
      nativeTargetBindings: 1,
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
  assert.ok(result.stopReasons.includes('request.nativeTargetBindingPerformed'));
  assert.ok(result.stopReasons.includes('request.nativeTargetBindingPassed'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.receiptReviews'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeTargetBindings'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2038 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    targetValue: 'DO_NOT_ECHO_A',
    nested: {
      runtimeCommand: 'DO_NOT_ECHO_B'
    }
  }), [
    'targetValue',
    'nested.runtimeCommand'
  ]);
});
