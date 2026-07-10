'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt
} = require('../src/core/PlanPackExternalReviewEvidenceBundleApplicationReceiptContract');

function counters() {
  return {
    observationWindowsAccepted: 0,
    externalReviewsAccepted: 0,
    tagApprovalPacketsAccepted: 0,
    applicationReceiptsAccepted: 0,
    reviewBundleApplications: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    defaultRuntimeExpansions: 0,
    providerApiCalls: 0,
    nativeReadAttempts: 0,
    nativeWriteAttempts: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    tagCreateActions: 0,
    tagPushActions: 0,
    releasePublishActions: 0,
    deployActions: 0,
    cutoverActions: 0,
    readinessClaims: 0
  };
}

function applicationGateResult(overrides = {}) {
  return {
    decision: 'external_review_bundle_application_gate_ready_for_future_completion_audit_patch',
    applicationGateAccepted: true,
    requiredReviewEvidenceFields: [
      'observationOrDogfoodReviewPassed',
      'externalReviewPassed',
      'tagApprovalPacketPassed'
    ],
    proposedCompletionAuditEvidence: [{
      field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
      marker: 'requires_future_completion_audit_patch_application',
      acceptedAsCompletionEvidenceNow: false
    }],
    reviewBundleAppliedToCompletionAudit: false,
    completionAuditPatchApplied: false,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    reviewEvidenceAcceptedByThisContract: false,
    tagApprovalPacketAcceptedByThisContract: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...overrides
  };
}

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2050',
    mode: 'local-external-review-bundle-application-receipt',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2049ApplicationGateAccepted: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforeReceipt: true
    },
    applicationGateResult: applicationGateResult(overrides.applicationGateResult || {}),
    applicationReceipt: {
      receiptPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      completionAuditPatchStillSeparate: true,
      applicationReceiptAcceptedAsLocalContractOnly: true,
      reviewBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    expectedDecision:
      'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch',
    counters: counters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    applicationGateResult: applicationGateResult(overrides.applicationGateResult || {}),
    applicationReceipt: { ...base.applicationReceipt, ...(overrides.applicationReceipt || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.reviewBundleAppliedToCompletionAudit, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.currentPhase9Completed, false);
  assert.equal(result.currentPhase10Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.reviewEvidenceAcceptedByThisContract, false);
  assert.equal(result.tagApprovalPacketAcceptedByThisContract, false);
  assert.equal(result.defaultRuntimeExpanded, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.releasePublished, false);
  assert.equal(result.deploymentTriggered, false);
  assert.equal(result.cutoverPerformed, false);
  assert.equal(result.receiptContentRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2050 accepts application receipt without applying review bundle to completion audit', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.applicationReceiptAccepted, true);
  assert.equal(
    result.decision,
    'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch'
  );
  assert.equal(result.localEvidenceField, 'externalReviewEvidenceBundleApplicationReceiptPassed');
  assert.deepEqual(result.proposedCompletionAuditEvidence, [{
    field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
    marker: 'requires_separate_future_completion_audit_patch_application',
    acceptedAsCompletionEvidenceNow: false
  }]);
  assert.equal(
    result.nextGate,
    'await_exact_completion_audit_patch_application_before_phase9_phase10_completion'
  );
  assertNoSideEffects(result);
});

test('CM2050 blocks application receipt when CM2049 gate result is absent or stale', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt(validInput({
    applicationGateResult: {
      decision: 'external_review_bundle_application_gate_blocked',
      applicationGateAccepted: false
    },
    expectedDecision: 'external_review_bundle_application_receipt_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('applicationGateResult.decision'));
  assert.ok(result.blockers.includes('applicationGateResult.applicationGateAccepted'));
  assertNoSideEffects(result);
});

test('CM2050 blocks application receipt when completion audit marker is missing', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt(validInput({
    applicationGateResult: {
      proposedCompletionAuditEvidence: []
    },
    expectedDecision: 'external_review_bundle_application_receipt_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('applicationGateResult.proposedCompletionAuditEvidence'));
  assertNoSideEffects(result);
});

test('CM2050 stops L4 when input claims completion audit application or tag release action', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt(validInput({
    applicationReceipt: {
      reviewBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      tagReleaseActionClaimed: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('applicationReceipt.reviewBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('applicationReceipt.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('applicationReceipt.tagReleaseActionClaimed'));
  assertNoSideEffects(result);
});

test('CM2050 stops L4 on nonzero execution counters', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt(validInput({
    counters: {
      applicationReceiptsAccepted: 1,
      completionAuditPatchApplications: 1,
      releasePublishActions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('counters.applicationReceiptsAccepted'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.blockers.includes('counters.releasePublishActions'));
  assertNoSideEffects(result);
});

test('CM2050 rejects raw or reviewer-shaped fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt({
    ...validInput(),
    unsafe: {
      reviewTranscript: 'ECHO_TRANSCRIPT',
      reviewerIdentity: 'ECHO_REVIEWER',
      rawResponse: 'ECHO_RAW'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.reviewTranscript',
    'unsafe.reviewerIdentity',
    'unsafe.rawResponse'
  ]);
  assert.equal(serialized.includes('ECHO_TRANSCRIPT'), false);
  assert.equal(serialized.includes('ECHO_REVIEWER'), false);
  assert.equal(serialized.includes('ECHO_RAW'), false);
});

test('CM2050 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    approvalLineValue: 'DO_NOT_ECHO_A',
    nested: {
      providerPayload: 'DO_NOT_ECHO_B',
      completeV8: true
    }
  }), [
    'approvalLineValue',
    'nested.providerPayload',
    'nested.completeV8'
  ]);
});
