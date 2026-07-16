'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PREREQUISITE_FIELDS: REQUIRED_BUNDLE_PREREQUISITE_FIELDS,
  REQUIRED_REVIEW_EVIDENCE_CATEGORY,
  evaluatePlanPackExternalReviewEvidenceBundleContract
} = require('../src/core/PlanPackExternalReviewEvidenceBundleContract');
const {
  REQUIRED_REVIEW_PATCH_MARKERS,
  REVIEW_PATCH_EVIDENCE_FIELDS,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract
} = require('../src/core/PlanPackExternalReviewEvidenceApplicationPatchPreflightContract');

function bundleCounters() {
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

function preflightCounters() {
  return bundleCounters();
}

function validBundleInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2033',
    mode: 'local-external-review-evidence-bundle-contract',
    prerequisites: {
      cm2015DefaultRuntimePolicyGateAccepted: true,
      cm2016ReleaseTagReadinessPolicyGateAccepted: true,
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2032CompletionAuditRequiresReviewIntake: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      completionAuditStillRequiresExternalReview: true,
      phase9Phase10StillIncompleteBeforeBundle: true
    },
    bundle: {
      bundlePrepared: true,
      futureExternalReviewRequired: true,
      futureTagApprovalPacketRequired: true,
      reviewBundleAppliedToCompletionAudit: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      nonAuthorizingContractOnly: true
    },
    reviewEvidenceCategories: {
      phase9ObservationOrDogfoodReviewEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
      phase9ExternalReviewEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
      phase10ExternalReviewEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
      phase10TagApprovalPacketEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY
    },
    sequence: {
      observationBeforeDefaultRuntimeExpansion: true,
      externalReviewBeforePhase9Completion: true,
      externalReviewBeforePhase10Completion: true,
      tagApprovalPacketBeforeTagAction: true,
      reviewBeforeCompletionAuditPatch: true,
      tagApprovalSeparateFromReview: true,
      releaseActionRequiresSeparateApproval: true
    },
    disclosure: {
      categoryOnly: true,
      lowDisclosureOnly: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      approvalLineIncluded: false,
      readinessClaimIncluded: false
    },
    expectedDecision: 'external_review_evidence_bundle_contract_ready_for_future_review',
    counters: bundleCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    bundle: { ...base.bundle, ...(overrides.bundle || {}) },
    reviewEvidenceCategories: {
      ...base.reviewEvidenceCategories,
      ...(overrides.reviewEvidenceCategories || {})
    },
    sequence: { ...base.sequence, ...(overrides.sequence || {}) },
    disclosure: { ...base.disclosure, ...(overrides.disclosure || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function acceptedReviewEvidenceBundleContract() {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundleInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  return {
    decision: result.decision,
    futureReviewEvidenceBundleShapeAccepted: result.futureReviewEvidenceBundleShapeAccepted,
    requiredReviewEvidenceCategory: result.requiredReviewEvidenceCategory,
    prerequisiteChecksRequired: result.prerequisiteChecksRequired,
    currentPhase9Completed: result.currentPhase9Completed,
    currentPhase10Completed: result.currentPhase10Completed,
    fullPlanPackCompleted: result.fullPlanPackCompleted,
    reviewEvidenceAcceptedByThisContract: result.reviewEvidenceAcceptedByThisContract,
    tagApprovalPacketAcceptedByThisContract: result.tagApprovalPacketAcceptedByThisContract,
    reviewBundleAppliedToCompletionAudit: result.reviewBundleAppliedToCompletionAudit,
    defaultRuntimeExpanded: result.defaultRuntimeExpanded,
    tagCreated: result.tagCreated,
    releasePublished: result.releasePublished,
    deploymentTriggered: result.deploymentTriggered,
    cutoverPerformed: result.cutoverPerformed,
    receiptContentRead: result.receiptContentRead,
    realMemoryRead: result.realMemoryRead,
    rawPrivateStateRead: result.rawPrivateStateRead,
    providerApiCalled: result.providerApiCalled,
    durableMutationPerformed: result.durableMutationPerformed,
    publicMcpExpanded: result.publicMcpExpanded,
    readinessClaimed: result.readinessClaimed
  };
}

function proposedPatchEvidence(overrides = {}) {
  return {
    observationOrDogfoodReviewPassed:
      REQUIRED_REVIEW_PATCH_MARKERS.observationOrDogfoodReviewPassed,
    externalReviewPassed: REQUIRED_REVIEW_PATCH_MARKERS.externalReviewPassed,
    tagApprovalPacketPassed: REQUIRED_REVIEW_PATCH_MARKERS.tagApprovalPacketPassed,
    externalReviewEvidenceBundleAppliedToCompletionAudit:
      REQUIRED_REVIEW_PATCH_MARKERS.externalReviewEvidenceBundleAppliedToCompletionAudit,
    ...overrides
  };
}

function validPreflight(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2034',
    mode: 'local-external-review-evidence-application-patch-preflight',
    prerequisites: {
      cm2015DefaultRuntimePolicyGateAccepted: true,
      cm2016ReleaseTagReadinessPolicyGateAccepted: true,
      cm2026ExternalReviewEvidenceIntakeAccepted: true,
      cm2032CompletionAuditRequiresReviewIntake: true,
      cm2033ReviewEvidenceBundleContractAccepted: true,
      cm2017CompletionAuditRequiresReviewEvidence: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      phase9Phase10StillIncompleteBeforePatch: true,
      defaultRuntimeStillRequiresFutureReview: true
    },
    reviewEvidenceBundleContract: acceptedReviewEvidenceBundleContract(),
    patchPreflight: {
      preflightPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      externalReviewEvidenceRequiredBeforePatch: true,
      reviewBundleApplicationRequired: true,
      completionAuditPatchPrepared: true,
      reviewBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase9CompletionClaimed: false,
      phase10CompletionClaimed: false,
      defaultRuntimeExpansionClaimed: false,
      tagReleaseActionClaimed: false,
      localContractsAllowedToSatisfyExternalReview: false
    },
    proposedPatchEvidence: proposedPatchEvidence(),
    expectedDecision: 'external_review_evidence_application_patch_preflight_ready_for_future_review',
    counters: preflightCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    reviewEvidenceBundleContract: {
      ...base.reviewEvidenceBundleContract,
      ...(overrides.reviewEvidenceBundleContract || {})
    },
    patchPreflight: { ...base.patchPreflight, ...(overrides.patchPreflight || {}) },
    proposedPatchEvidence: {
      ...base.proposedPatchEvidence,
      ...(overrides.proposedPatchEvidence || {})
    },
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

test('CM2034 accepts external review evidence application patch preflight without applying evidence', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(validPreflight());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.patchPreflightAccepted, true);
  assert.equal(
    result.decision,
    'external_review_evidence_application_patch_preflight_ready_for_future_review'
  );
  assert.deepEqual(result.requiredPatchEvidenceFields, REVIEW_PATCH_EVIDENCE_FIELDS);
  assert.deepEqual(
    validPreflight().reviewEvidenceBundleContract.prerequisiteChecksRequired,
    REQUIRED_BUNDLE_PREREQUISITE_FIELDS
  );
  assert.equal(result.proposedCompletionAuditEvidence.length, REVIEW_PATCH_EVIDENCE_FIELDS.length);
  for (const entry of result.proposedCompletionAuditEvidence) {
    assert.equal(entry.marker, REQUIRED_REVIEW_PATCH_MARKERS[entry.field]);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_future_observation_external_review_and_tag_approval_before_review_application_or_completion_audit_patch'
  );
  assertNoSideEffects(result);
});

test('CM2034 blocks patch preflight when prerequisite gate chain is absent', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(validPreflight({
    prerequisites: {
      cm2033ReviewEvidenceBundleContractAccepted: false,
      cm2024TraceMatrixRequiresExternalReviewEvidence: false
    },
    expectedDecision: 'external_review_evidence_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2033ReviewEvidenceBundleContractAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2024TraceMatrixRequiresExternalReviewEvidence'));
  assertNoSideEffects(result);
});

test('CM2034 blocks patch preflight when review bundle contract result is not accepted', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(validPreflight({
    reviewEvidenceBundleContract: {
      decision: 'external_review_evidence_bundle_contract_blocked_missing_review_evidence',
      futureReviewEvidenceBundleShapeAccepted: false
    },
    expectedDecision: 'external_review_evidence_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewEvidenceBundleContract.decision'));
  assert.ok(result.blockers.includes(
    'reviewEvidenceBundleContract.futureReviewEvidenceBundleShapeAccepted'
  ));
  assertNoSideEffects(result);
});

test('CM2047 blocks patch preflight when external review bundle prerequisite summary is stale', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(validPreflight({
    reviewEvidenceBundleContract: {
      prerequisiteChecksRequired: REQUIRED_BUNDLE_PREREQUISITE_FIELDS.slice(0, -1)
    },
    expectedDecision: 'external_review_evidence_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewEvidenceBundleContract.prerequisiteChecksRequired'));
  assertNoSideEffects(result);
});

test('CM2034 rejects proposed patch evidence that tries to mark review evidence complete now', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(validPreflight({
    proposedPatchEvidence: {
      observationOrDogfoodReviewPassed: true,
      externalReviewPassed: true,
      tagApprovalPacketPassed: true,
      externalReviewEvidenceBundleAppliedToCompletionAudit: true
    },
    expectedDecision: 'external_review_evidence_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('proposedPatchEvidence.observationOrDogfoodReviewPassed'));
  assert.ok(result.blockers.includes('proposedPatchEvidence.externalReviewPassed'));
  assert.ok(result.blockers.includes('proposedPatchEvidence.tagApprovalPacketPassed'));
  assert.ok(result.blockers.includes(
    'proposedPatchEvidence.externalReviewEvidenceBundleAppliedToCompletionAudit'
  ));
  assertNoSideEffects(result);
});

test('CM2034 stops L4 on review application patch application expansion tag release or counters', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(validPreflight({
    reviewEvidenceBundleContract: {
      reviewEvidenceAcceptedByThisContract: true,
      receiptContentRead: true
    },
    patchPreflight: {
      reviewBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      phase9CompletionClaimed: true,
      phase10CompletionClaimed: true,
      defaultRuntimeExpansionClaimed: true,
      tagReleaseActionClaimed: true
    },
    counters: {
      observationWindowsAccepted: 1,
      externalReviewsAccepted: 1,
      tagApprovalPacketsAccepted: 1,
      reviewBundleApplications: 1,
      completionAuditPatchApplications: 1,
      defaultRuntimeExpansions: 1,
      tagCreateActions: 1,
      releasePublishActions: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('reviewEvidenceBundleContract.reviewEvidenceAcceptedByThisContract'));
  assert.ok(result.blockers.includes('reviewEvidenceBundleContract.receiptContentRead'));
  assert.ok(result.blockers.includes('patchPreflight.reviewBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('patchPreflight.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('patchPreflight.phase9CompletionClaimed'));
  assert.ok(result.blockers.includes('patchPreflight.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.reviewBundleApplications'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assertNoSideEffects(result);
});

test('CM2034 rejects forbidden raw secret review fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract({
    ...validPreflight(),
    unsafe: {
      responseBody: 'ECHO_RESPONSE',
      reviewTranscript: 'ECHO_REVIEW',
      approvalLineValue: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.responseBody',
    'unsafe.reviewTranscript',
    'unsafe.approvalLineValue',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_REVIEW'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2034 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawResponse: 'DO_NOT_ECHO_A',
    nested: {
      reviewTranscript: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawResponse',
    'nested.reviewTranscript'
  ]);
});
