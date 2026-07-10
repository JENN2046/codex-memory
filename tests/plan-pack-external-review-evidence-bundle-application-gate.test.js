'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_REVIEW_EVIDENCE_FIELDS,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceBundleApplicationGate
} = require('../src/core/PlanPackExternalReviewEvidenceBundleApplicationGate');

function counters() {
  return {
    observationWindowsAccepted: 0,
    externalReviewsAccepted: 0,
    tagApprovalPacketsAccepted: 0,
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

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2049',
    mode: 'local-external-review-bundle-application-gate',
    prerequisites: {
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2034ApplicationPatchPreflightAccepted: true,
      cm2047PatchHardenedBundleBindingPassed: true,
      cm2048ReleaseTagExternalReviewChainBindingPassed: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforeApplication: true
    },
    applicationGate: {
      gatePrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      reviewBundleApplicationRequired: true,
      completionAuditPatchStillSeparate: true,
      reviewBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    reviewEvidence: {
      observationOrDogfoodReviewPassed: true,
      externalReviewPassed: true,
      tagApprovalPacketPassed: false
    },
    expectedDecision:
      'external_review_bundle_application_gate_ready_for_future_completion_audit_patch',
    counters: counters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    applicationGate: { ...base.applicationGate, ...(overrides.applicationGate || {}) },
    reviewEvidence: { ...base.reviewEvidence, ...(overrides.reviewEvidence || {}) },
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

test('CM2049 accepts external review bundle application gate without applying bundle', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.applicationGateAccepted, true);
  assert.equal(
    result.decision,
    'external_review_bundle_application_gate_ready_for_future_completion_audit_patch'
  );
  assert.deepEqual(result.requiredReviewEvidenceFields, REQUIRED_REVIEW_EVIDENCE_FIELDS);
  assert.deepEqual(result.proposedCompletionAuditEvidence, [{
    field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
    marker: 'requires_future_completion_audit_patch_application',
    acceptedAsCompletionEvidenceNow: false
  }]);
  assert.equal(
    result.nextGate,
    'apply_completion_audit_patch_then_review_tag_approval_packet_separately'
  );
  assertNoSideEffects(result);
});

test('CM2049 blocks bundle application gate when external review is missing', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate(validInput({
    reviewEvidence: {
      externalReviewPassed: false,
      tagApprovalPacketPassed: false
    },
    expectedDecision: 'external_review_bundle_application_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewEvidence.externalReviewPassed'));
  assertNoSideEffects(result);
});

test('CM2049 rejects premature tag approval and preserves completion-audit-first order', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate(validInput({
    reviewEvidence: { tagApprovalPacketPassed: true },
    expectedDecision: 'external_review_bundle_application_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewEvidence.tagApprovalPacketPassed'));
  assertNoSideEffects(result);
});

test('CM2049 blocks bundle application gate when hardened prerequisite chain is missing', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate(validInput({
    prerequisites: {
      cm2047PatchHardenedBundleBindingPassed: false,
      cm2048ReleaseTagExternalReviewChainBindingPassed: false
    },
    expectedDecision: 'external_review_bundle_application_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2047PatchHardenedBundleBindingPassed'));
  assert.ok(result.blockers.includes('prerequisites.cm2048ReleaseTagExternalReviewChainBindingPassed'));
  assertNoSideEffects(result);
});

test('CM2049 stops L4 when input claims bundle application or tag release action', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate(validInput({
    applicationGate: {
      reviewBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      tagReleaseActionClaimed: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('applicationGate.reviewBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('applicationGate.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('applicationGate.tagReleaseActionClaimed'));
  assertNoSideEffects(result);
});

test('CM2049 stops L4 on nonzero execution counters', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate(validInput({
    counters: {
      reviewBundleApplications: 1,
      releasePublishActions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('counters.reviewBundleApplications'));
  assert.ok(result.blockers.includes('counters.releasePublishActions'));
  assertNoSideEffects(result);
});

test('CM2049 rejects raw or reviewer-shaped fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleApplicationGate({
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

test('CM2049 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    approvalLineValue: 'DO_NOT_ECHO_A',
    nested: {
      token: 'DO_NOT_ECHO_B'
    }
  }), [
    'approvalLineValue',
    'nested.token'
  ]);
});
