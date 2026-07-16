'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PREREQUISITE_FIELDS,
  REQUIRED_REVIEW_EVIDENCE_CATEGORY,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceBundleContract
} = require('../src/core/PlanPackExternalReviewEvidenceBundleContract');

function zeroCounters() {
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

function validBundle(overrides = {}) {
  const reviewEvidenceCategories = {
    phase9ObservationOrDogfoodReviewEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
    phase9ExternalReviewEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
    phase10ExternalReviewEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
    phase10TagApprovalPacketEvidence: REQUIRED_REVIEW_EVIDENCE_CATEGORY
  };

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
    reviewEvidenceCategories,
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
    counters: zeroCounters()
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

function assertNoSideEffects(result) {
  assert.equal(result.currentPhase9Completed, false);
  assert.equal(result.currentPhase10Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.reviewEvidenceAcceptedByThisContract, false);
  assert.equal(result.tagApprovalPacketAcceptedByThisContract, false);
  assert.equal(result.reviewBundleAppliedToCompletionAudit, false);
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

test('CM2033 accepts only the future low-disclosure Phase 9/10 review evidence bundle shape', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundle());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'external_review_evidence_bundle_contract_ready_for_future_review');
  assert.equal(result.futureReviewEvidenceBundleShapeAccepted, true);
  assert.deepEqual(result.prerequisiteChecksRequired, REQUIRED_PREREQUISITE_FIELDS);
  assert.equal(
    result.lowDisclosureReviewEvidenceSummary.reviewEvidenceCategory,
    REQUIRED_REVIEW_EVIDENCE_CATEGORY
  );
  assert.deepEqual(
    result.lowDisclosureReviewEvidenceSummary.prerequisiteChecksRequired,
    REQUIRED_PREREQUISITE_FIELDS
  );
  assert.deepEqual(result.lowDisclosureReviewEvidenceSummary.phases, ['Phase 9', 'Phase 10']);
  assertNoSideEffects(result);
});

test('CM2033 blocks review evidence bundle when prerequisite gates are absent', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundle({
    prerequisites: {
      cm2015DefaultRuntimePolicyGateAccepted: false,
      cm2016ReleaseTagReadinessPolicyGateAccepted: false,
      cm2026ExternalReviewEvidenceIntakeAccepted: false,
      cm2032CompletionAuditRequiresReviewIntake: false
    },
    expectedDecision: 'external_review_evidence_bundle_contract_blocked_missing_review_evidence'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2015DefaultRuntimePolicyGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2016ReleaseTagReadinessPolicyGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2026ExternalReviewEvidenceIntakeAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2032CompletionAuditRequiresReviewIntake'));
  assertNoSideEffects(result);
});

test('CM2033 blocks incomplete review evidence categories without completing Phase 9 or Phase 10', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundle({
    reviewEvidenceCategories: {
      phase9ObservationOrDogfoodReviewEvidence: 'missing',
      phase9ExternalReviewEvidence: 'missing',
      phase10TagApprovalPacketEvidence: 'missing'
    },
    expectedDecision: 'external_review_evidence_bundle_contract_blocked_missing_review_evidence'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewEvidenceCategories.phase9ObservationOrDogfoodReviewEvidence'));
  assert.ok(result.blockers.includes('reviewEvidenceCategories.phase9ExternalReviewEvidence'));
  assert.ok(result.blockers.includes('reviewEvidenceCategories.phase10TagApprovalPacketEvidence'));
  assert.equal(result.currentPhase9Completed, false);
  assert.equal(result.currentPhase10Completed, false);
  assertNoSideEffects(result);
});

test('CM2033 blocks invalid review evidence sequence requirements', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundle({
    sequence: {
      observationBeforeDefaultRuntimeExpansion: false,
      externalReviewBeforePhase10Completion: false,
      tagApprovalPacketBeforeTagAction: false,
      releaseActionRequiresSeparateApproval: false
    },
    expectedDecision: 'external_review_evidence_bundle_contract_blocked_missing_review_evidence'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('sequence.observationBeforeDefaultRuntimeExpansion'));
  assert.ok(result.blockers.includes('sequence.externalReviewBeforePhase10Completion'));
  assert.ok(result.blockers.includes('sequence.tagApprovalPacketBeforeTagAction'));
  assert.ok(result.blockers.includes('sequence.releaseActionRequiresSeparateApproval'));
  assertNoSideEffects(result);
});

test('CM2033 stops L4 if review acceptance completion default expansion tag release or counters are present', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundle({
    bundle: {
      reviewBundleAppliedToCompletionAudit: true,
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
  assert.ok(result.blockers.includes('bundle.reviewBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('bundle.phase9CompletionClaimed'));
  assert.ok(result.blockers.includes('bundle.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('bundle.defaultRuntimeExpansionClaimed'));
  assert.ok(result.blockers.includes('bundle.tagReleaseActionClaimed'));
  assert.ok(result.blockers.includes('counters.externalReviewsAccepted'));
  assert.ok(result.blockers.includes('counters.tagCreateActions'));
  assertNoSideEffects(result);
});

test('CM2033 stops L4 if disclosure includes raw values approval lines or readiness', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract(validBundle({
    disclosure: {
      endpointLocatorIncluded: true,
      requestBodyIncluded: true,
      responseBodyIncluded: true,
      memoryContentIncluded: true,
      approvalLineIncluded: true,
      readinessClaimIncluded: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('disclosure.endpointLocatorIncluded'));
  assert.ok(result.blockers.includes('disclosure.requestBodyIncluded'));
  assert.ok(result.blockers.includes('disclosure.responseBodyIncluded'));
  assert.ok(result.blockers.includes('disclosure.memoryContentIncluded'));
  assert.ok(result.blockers.includes('disclosure.approvalLineIncluded'));
  assert.ok(result.blockers.includes('disclosure.readinessClaimIncluded'));
  assertNoSideEffects(result);
});

test('CM2033 rejects forbidden raw secret review fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewEvidenceBundleContract({
    ...validBundle(),
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

test('CM2033 forbidden field collector reports paths only', () => {
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
