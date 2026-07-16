'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_REVIEW_MARKERS,
  REVIEW_EVIDENCE_FIELDS,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceIntakeContract
} = require('../src/core/PlanPackExternalReviewEvidenceIntakeContract');

function zeroCounters() {
  return {
    observationWindowsAccepted: 0,
    externalReviewsAccepted: 0,
    tagApprovalPacketsAccepted: 0,
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

function proposedReviewEvidence(overrides = {}) {
  return {
    phase9ObservationOrDogfoodReviewPassed:
      REQUIRED_REVIEW_MARKERS.phase9ObservationOrDogfoodReviewPassed,
    phase9ExternalReviewPassed: REQUIRED_REVIEW_MARKERS.phase9ExternalReviewPassed,
    phase10ExternalReviewPassed: REQUIRED_REVIEW_MARKERS.phase10ExternalReviewPassed,
    phase10TagApprovalPacketPassed: REQUIRED_REVIEW_MARKERS.phase10TagApprovalPacketPassed,
    ...overrides
  };
}

function validIntake(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2026',
    mode: 'local-external-review-evidence-intake-preflight',
    prerequisites: {
      cm2015DefaultRuntimePolicyGateImplemented: true,
      cm2016ReleaseTagReadinessPolicyGateImplemented: true,
      cm2017CompletionAuditRequiresReviewEvidence: true,
      cm2024TraceMatrixRequiresExternalReviewEvidence: true,
      defaultRuntimeStillReadContextProposal: true,
      releaseTagActionStillSeparateApproval: true
    },
    reviewIntake: {
      intakePrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      observationOrDogfoodReviewRequiredBeforeDefaultExpansion: true,
      externalReviewRequiredBeforeCompletion: true,
      tagApprovalPacketRequiredBeforeTagAction: true,
      localPolicyGatesAllowedToSatisfyExternalReview: false,
      completionAuditPatchApplied: false,
      defaultRuntimeExpanded: false,
      tagApprovalPacketAccepted: false,
      tagCreated: false,
      releasePublished: false,
      readinessClaimed: false
    },
    proposedReviewEvidence: proposedReviewEvidence(),
    expectedDecision: 'external_review_evidence_intake_ready_for_future_review',
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    reviewIntake: { ...base.reviewIntake, ...(overrides.reviewIntake || {}) },
    proposedReviewEvidence: {
      ...base.proposedReviewEvidence,
      ...(overrides.proposedReviewEvidence || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.observationOrDogfoodReviewAccepted, false);
  assert.equal(result.externalReviewAccepted, false);
  assert.equal(result.tagApprovalPacketAccepted, false);
  assert.equal(result.defaultRuntimeExpanded, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.releasePublished, false);
  assert.equal(result.deploymentTriggered, false);
  assert.equal(result.cutoverPerformed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2026 accepts external review evidence intake preflight without accepting review evidence', () => {
  const result = evaluatePlanPackExternalReviewEvidenceIntakeContract(validIntake());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.reviewEvidenceIntakeAccepted, true);
  assert.equal(result.decision, 'external_review_evidence_intake_ready_for_future_review');
  assert.deepEqual(result.requiredReviewEvidenceFields, REVIEW_EVIDENCE_FIELDS);
  assert.equal(result.proposedCompletionAuditReviewEvidence.length, REVIEW_EVIDENCE_FIELDS.length);
  for (const entry of result.proposedCompletionAuditReviewEvidence) {
    assert.equal(entry.marker, REQUIRED_REVIEW_MARKERS[entry.field]);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_future_observation_external_review_and_tag_approval_before_completion_audit_patch'
  );
  assertNoSideEffects(result);
});

test('CM2026 blocks review intake when prerequisite gate chain is absent', () => {
  const result = evaluatePlanPackExternalReviewEvidenceIntakeContract(validIntake({
    prerequisites: {
      cm2015DefaultRuntimePolicyGateImplemented: false,
      cm2016ReleaseTagReadinessPolicyGateImplemented: false,
      cm2024TraceMatrixRequiresExternalReviewEvidence: false
    },
    expectedDecision: 'external_review_evidence_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2015DefaultRuntimePolicyGateImplemented'));
  assert.ok(result.blockers.includes('prerequisites.cm2016ReleaseTagReadinessPolicyGateImplemented'));
  assert.ok(result.blockers.includes('prerequisites.cm2024TraceMatrixRequiresExternalReviewEvidence'));
  assertNoSideEffects(result);
});

test('CM2026 rejects local policy gates or booleans masquerading as review evidence', () => {
  const result = evaluatePlanPackExternalReviewEvidenceIntakeContract(validIntake({
    proposedReviewEvidence: {
      phase9ObservationOrDogfoodReviewPassed: true,
      phase9ExternalReviewPassed: 'local_policy_gate_accepted',
      phase10ExternalReviewPassed: true,
      phase10TagApprovalPacketPassed: true
    },
    expectedDecision: 'external_review_evidence_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('proposedReviewEvidence.phase9ObservationOrDogfoodReviewPassed'));
  assert.ok(result.blockers.includes('proposedReviewEvidence.phase9ExternalReviewPassed'));
  assert.ok(result.blockers.includes('proposedReviewEvidence.phase10ExternalReviewPassed'));
  assert.ok(result.blockers.includes('proposedReviewEvidence.phase10TagApprovalPacketPassed'));
  assertNoSideEffects(result);
});

test('CM2026 stops L4 on local gate substitution default expansion tag release or readiness', () => {
  const result = evaluatePlanPackExternalReviewEvidenceIntakeContract(validIntake({
    reviewIntake: {
      localPolicyGatesAllowedToSatisfyExternalReview: true,
      completionAuditPatchApplied: true,
      defaultRuntimeExpanded: true,
      tagApprovalPacketAccepted: true,
      tagCreated: true,
      releasePublished: true,
      readinessClaimed: true
    },
    counters: {
      observationWindowsAccepted: 1,
      externalReviewsAccepted: 1,
      tagApprovalPacketsAccepted: 1,
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
  assert.ok(result.blockers.includes('reviewIntake.localPolicyGatesAllowedToSatisfyExternalReview'));
  assert.ok(result.blockers.includes('reviewIntake.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('reviewIntake.defaultRuntimeExpanded'));
  assert.ok(result.blockers.includes('reviewIntake.tagApprovalPacketAccepted'));
  assert.ok(result.blockers.includes('reviewIntake.tagCreated'));
  assert.ok(result.blockers.includes('reviewIntake.releasePublished'));
  assert.ok(result.blockers.includes('reviewIntake.readinessClaimed'));
  assert.ok(result.blockers.includes('counters.externalReviewsAccepted'));
  assert.ok(result.blockers.includes('counters.tagCreateActions'));
  assertNoSideEffects(result);
});

test('CM2026 rejects forbidden raw secret runtime fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewEvidenceIntakeContract({
    ...validIntake(),
    unsafe: {
      responseBody: 'ECHO_RESPONSE',
      approvalLineValue: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN',
      providerPayload: 'ECHO_PROVIDER'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.responseBody',
    'unsafe.approvalLineValue',
    'unsafe.bearerToken',
    'unsafe.providerPayload'
  ]);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assert.equal(serialized.includes('ECHO_PROVIDER'), false);
});

test('CM2026 forbidden field collector reports paths only', () => {
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
