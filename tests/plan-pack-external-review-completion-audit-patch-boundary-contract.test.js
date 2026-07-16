'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluatePlanPackExternalReviewCompletionAuditPatchBoundary
} = require('../src/core/PlanPackExternalReviewCompletionAuditPatchBoundaryContract');

function counters() {
  return {
    observationWindowsAccepted: 0,
    externalReviewsAccepted: 0,
    tagApprovalPacketsAccepted: 0,
    applicationReceiptsAccepted: 0,
    patchBoundariesAccepted: 0,
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

function applicationReceiptResult(overrides = {}) {
  return {
    decision: 'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch',
    applicationReceiptAccepted: true,
    localEvidenceField: 'externalReviewEvidenceBundleApplicationReceiptPassed',
    proposedCompletionAuditEvidence: [{
      field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
      marker: 'requires_separate_future_completion_audit_patch_application',
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
    taskId: 'CM-2051',
    mode: 'local-external-review-completion-audit-patch-boundary',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2049ApplicationGateAccepted: true,
      cm2050ApplicationReceiptAccepted: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforePatch: true
    },
    applicationReceiptResult: applicationReceiptResult(overrides.applicationReceiptResult || {}),
    patchBoundary: {
      patchBoundaryPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      exactCompletionAuditPatchRequired: true,
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
      'external_review_completion_audit_patch_boundary_ready_for_future_exact_application',
    counters: counters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    applicationReceiptResult: applicationReceiptResult(overrides.applicationReceiptResult || {}),
    patchBoundary: { ...base.patchBoundary, ...(overrides.patchBoundary || {}) },
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

test('CM2051 accepts completion-audit patch boundary without applying patch', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.patchBoundaryAccepted, true);
  assert.equal(
    result.decision,
    'external_review_completion_audit_patch_boundary_ready_for_future_exact_application'
  );
  assert.equal(result.localEvidenceField, 'externalReviewEvidenceCompletionAuditPatchBoundaryPassed');
  assert.deepEqual(result.proposedCompletionAuditEvidence, [{
    field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
    marker: 'requires_future_exact_completion_audit_patch_application',
    acceptedAsCompletionEvidenceNow: false
  }]);
  assert.equal(
    result.nextGate,
    'await_exact_completion_audit_patch_application_before_phase9_phase10_completion'
  );
  assertNoSideEffects(result);
});

test('CM2051 blocks patch boundary when CM2050 receipt result is absent or stale', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary(validInput({
    applicationReceiptResult: {
      decision: 'external_review_bundle_application_receipt_blocked',
      applicationReceiptAccepted: false,
      localEvidenceField: 'externalReviewEvidenceBundleApplicationGatePassed'
    },
    expectedDecision: 'external_review_completion_audit_patch_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('applicationReceiptResult.decision'));
  assert.ok(result.blockers.includes('applicationReceiptResult.applicationReceiptAccepted'));
  assert.ok(result.blockers.includes('applicationReceiptResult.localEvidenceField'));
  assertNoSideEffects(result);
});

test('CM2051 blocks patch boundary when receipt marker is missing', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary(validInput({
    applicationReceiptResult: {
      proposedCompletionAuditEvidence: []
    },
    expectedDecision: 'external_review_completion_audit_patch_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('applicationReceiptResult.proposedCompletionAuditEvidence'));
  assertNoSideEffects(result);
});

test('CM2051 stops L4 when input claims completion audit patch application or tag release action', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary(validInput({
    patchBoundary: {
      reviewBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      tagReleaseActionClaimed: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('patchBoundary.reviewBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('patchBoundary.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('patchBoundary.tagReleaseActionClaimed'));
  assertNoSideEffects(result);
});

test('CM2051 stops L4 on nonzero execution counters', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary(validInput({
    counters: {
      patchBoundariesAccepted: 1,
      completionAuditPatchApplications: 1,
      releasePublishActions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('counters.patchBoundariesAccepted'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.blockers.includes('counters.releasePublishActions'));
  assertNoSideEffects(result);
});

test('CM2051 rejects raw or reviewer-shaped fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchBoundary({
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

test('CM2051 forbidden field collector reports paths only', () => {
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
