'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluatePlanPackExternalReviewCompletionAuditPatchApplication
} = require('../src/core/PlanPackExternalReviewCompletionAuditPatchApplicationContract');

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

function patchBoundaryResult(overrides = {}) {
  return {
    decision: 'external_review_completion_audit_patch_boundary_ready_for_future_exact_application',
    patchBoundaryAccepted: true,
    localEvidenceField: 'externalReviewEvidenceCompletionAuditPatchBoundaryPassed',
    proposedCompletionAuditEvidence: [{
      field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
      marker: 'requires_future_exact_completion_audit_patch_application',
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
    taskId: 'CM-2052',
    mode: 'local-external-review-completion-audit-patch-application',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2049ApplicationGateAccepted: true,
      cm2050ApplicationReceiptAccepted: true,
      cm2051PatchBoundaryAccepted: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforeApplication: true
    },
    patchBoundaryResult: patchBoundaryResult(overrides.patchBoundaryResult || {}),
    externalReviewEvidenceBundle: {
      categoryOnly: true,
      lowDisclosureOnly: true,
      observationOrDogfoodReviewPassed: true,
      externalReviewPassed: true,
      tagApprovalPacketPassed: false,
      externalReviewEvidenceProvidedBySeparateProcess: true,
      tagApprovalPacketProvidedBySeparateProcess: false,
      reviewTranscriptIncluded: false,
      reviewerIdentityIncluded: false,
      tagApprovalLineIncluded: false,
      localContractAcceptedAsExternalReview: false
    },
    completionAuditPatch: {
      patchApplicationPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      exactExternalReviewEvidenceRequiredBeforeApplication: true,
      applicationReceiptAcceptedAsLocalContractOnly: true,
      reviewBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    expectedDecision:
      'external_review_completion_audit_patch_application_ready_for_completion_audit_evidence',
    counters: counters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    patchBoundaryResult: patchBoundaryResult(overrides.patchBoundaryResult || {}),
    externalReviewEvidenceBundle: {
      ...base.externalReviewEvidenceBundle,
      ...(overrides.externalReviewEvidenceBundle || {})
    },
    completionAuditPatch: {
      ...base.completionAuditPatch,
      ...(overrides.completionAuditPatch || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoRuntimeOrReleaseSideEffects(result) {
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

test('CM2052 accepts exact completion-audit patch application without phase or release claims', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.patchApplicationAccepted, true);
  assert.equal(
    result.decision,
    'external_review_completion_audit_patch_application_ready_for_completion_audit_evidence'
  );
  assert.equal(result.localEvidenceField, 'externalReviewEvidenceBundleAppliedToCompletionAudit');
  assert.deepEqual(result.appliedCompletionAuditEvidence, [{
    field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
    evidenceKindRequired: 'external_review',
    localContractAcceptedAsExternalReview: false
  }]);
  assert.equal(result.reviewBundleAppliedToCompletionAudit, true);
  assert.equal(result.completionAuditPatchApplied, true);
  assert.equal(
    result.nextGate,
    'feed_completion_audit_evidence_then_review_tag_approval_packet_separately'
  );
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 blocks application when CM2051 patch boundary result is absent or stale', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    patchBoundaryResult: {
      decision: 'external_review_completion_audit_patch_boundary_blocked',
      patchBoundaryAccepted: false,
      localEvidenceField: 'externalReviewEvidenceBundleApplicationReceiptPassed'
    },
    expectedDecision: 'external_review_completion_audit_patch_application_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('patchBoundaryResult.decision'));
  assert.ok(result.blockers.includes('patchBoundaryResult.patchBoundaryAccepted'));
  assert.ok(result.blockers.includes('patchBoundaryResult.localEvidenceField'));
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 blocks application when boundary marker is missing', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    patchBoundaryResult: {
      proposedCompletionAuditEvidence: []
    },
    expectedDecision: 'external_review_completion_audit_patch_application_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('patchBoundaryResult.proposedCompletionAuditEvidence'));
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 blocks application when external review evidence is missing', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    externalReviewEvidenceBundle: {
      externalReviewPassed: false,
      tagApprovalPacketPassed: false
    },
    expectedDecision: 'external_review_completion_audit_patch_application_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('externalReviewEvidenceBundle.externalReviewPassed'));
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 blocks premature tag approval before completion-audit application', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    externalReviewEvidenceBundle: {
      tagApprovalPacketPassed: true,
      tagApprovalPacketProvidedBySeparateProcess: true
    },
    expectedDecision: 'external_review_completion_audit_patch_application_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('externalReviewEvidenceBundle.tagApprovalPacketPassed'));
  assert.ok(result.blockers.includes('externalReviewEvidenceBundle.tagApprovalPacketProvidedBySeparateProcess'));
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 stops L4 when local contract tries to masquerade as external review', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    externalReviewEvidenceBundle: {
      localContractAcceptedAsExternalReview: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('externalReviewEvidenceBundle.localContractAcceptedAsExternalReview'));
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 stops L4 on phase completion runtime tag release or nonzero counters', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    completionAuditPatch: {
      phase9CompletionClaimed: true,
      phase10CompletionClaimed: true,
      defaultRuntimeExpansionClaimed: true,
      tagReleaseActionClaimed: true
    },
    counters: {
      completionAuditPatchApplications: 1,
      releasePublishActions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('completionAuditPatch.phase9CompletionClaimed'));
  assert.ok(result.blockers.includes('completionAuditPatch.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('completionAuditPatch.defaultRuntimeExpansionClaimed'));
  assert.ok(result.blockers.includes('completionAuditPatch.tagReleaseActionClaimed'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.blockers.includes('counters.releasePublishActions'));
  assertNoRuntimeOrReleaseSideEffects(result);
});

test('CM2052 rejects raw reviewer or approval fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewCompletionAuditPatchApplication(validInput({
    unsafe: {
      reviewTranscript: 'ECHO_TRANSCRIPT',
      reviewerIdentity: 'ECHO_REVIEWER',
      tagApprovalLine: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.reviewTranscript',
    'unsafe.reviewerIdentity',
    'unsafe.tagApprovalLine',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_TRANSCRIPT'), false);
  assert.equal(serialized.includes('ECHO_REVIEWER'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2052 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawResponse: 'DO_NOT_ECHO_A',
    nested: {
      providerPayload: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawResponse',
    'nested.providerPayload'
  ]);
});
