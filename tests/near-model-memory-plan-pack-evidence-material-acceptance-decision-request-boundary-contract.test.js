'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');
const {
  PHASE2_EXACT_RECEIPT_FIELDS
} = require('../src/core/Phase2ExactReceiptRequestBoundaryContract');
const {
  PHASE8_EXACT_RECEIPT_FIELDS
} = require('../src/core/Phase8ExactReceiptRequestBoundaryContract');

function acceptanceEligibilitySource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2064',
    sourceValidationId: 'CMV-2165',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_eligibility_gate_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract',
    sourceContractMode: 'local_plan_pack_evidence_material_acceptance_eligibility_gate_only',
    ...overrides
  };
}

function acceptanceEligibilityChecklist(overrides = []) {
  const base = [
    {
      slotId: 'phase2_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase2_exact_receipt_metadata',
      requiredAuthorizationKind: 'future_phase2_exact_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_phase2_exact_receipt_material',
      exactAuthorizationReviewedRequired: true,
      lowDisclosureMaterialReviewedRequired: true,
      separateAcceptanceDecisionRequired: true,
      reviewCompletionRequiredBeforeAcceptance: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      canCompleteManualReviewNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptAuthorizationNow: false,
      canAcceptMaterialNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    },
    {
      slotId: 'phase8_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase8_exact_receipt_metadata',
      requiredAuthorizationKind: 'future_phase8_exact_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_phase8_exact_receipt_material',
      exactAuthorizationReviewedRequired: true,
      lowDisclosureMaterialReviewedRequired: true,
      separateAcceptanceDecisionRequired: true,
      reviewCompletionRequiredBeforeAcceptance: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      canCompleteManualReviewNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptAuthorizationNow: false,
      canAcceptMaterialNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    },
    {
      slotId: 'phase9_phase10_external_review_before_completion_audit_patch_metadata_slot',
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      requestedItemCount: 6,
      requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
      requiredMetadataKind: 'low_disclosure_external_review_or_tag_approval_metadata',
      requiredAuthorizationKind: 'future_phase9_phase10_review_or_tag_approval_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_external_review_or_tag_approval_material',
      exactAuthorizationReviewedRequired: true,
      lowDisclosureMaterialReviewedRequired: true,
      separateAcceptanceDecisionRequired: true,
      reviewCompletionRequiredBeforeAcceptance: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      canCompleteManualReviewNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptAuthorizationNow: false,
      canAcceptMaterialNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    }
  ];
  return base.map((entry, index) => ({ ...entry, ...(overrides[index] || {}) }));
}

function acceptanceEligibilityResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract',
    contractMode: 'local_plan_pack_evidence_material_acceptance_eligibility_gate_only',
    decision: 'plan_pack_evidence_material_acceptance_eligibility_gate_prepared',
    blockers: [],
    acceptanceEligibilityGatePrepared: true,
    acceptanceEligibilityChecklist: acceptanceEligibilityChecklist(overrides.acceptanceEligibilityChecklist || []),
    sourceTaskId: 'CM-2063',
    sourceValidationId: 'CMV-2164',
    nextGate: 'await_actual_acceptance_decision_after_reviewed_authorization_and_low_disclosure_material',
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    evidenceMaterialAcceptedByThisContract: false,
    evidenceAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    nativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    tagPushed: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    ...overrides,
    acceptanceEligibilityChecklist: acceptanceEligibilityChecklist(overrides.acceptanceEligibilityChecklist || [])
  };
}

function acceptanceDecisionRequestBoundary(overrides = {}) {
  return {
    acceptanceDecisionRequestBoundaryPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    acceptanceEligibilityResultOnly: true,
    actualAcceptanceDecisionStillRequired: true,
    reviewedAuthorizationStillRequired: true,
    reviewedLowDisclosureMaterialStillRequired: true,
    separateAcceptanceDecisionRequired: true,
    reviewCompletionStillRequired: true,
    decisionPacketBodyAbsent: true,
    decisionValueAbsent: true,
    rawAuthorizationAbsent: true,
    rawMaterialAbsent: true,
    materialBodyAbsent: true,
    materialValuesAbsent: true,
    acceptanceDecisionDeferred: true,
    evidenceAcceptanceDeferred: true,
    applicationDeferred: true,
    completionAuditPatchDeferred: true,
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    evidenceMaterialAcceptedByThisContract: false,
    evidenceAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    runtimeCalled: false,
    nativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    tagPushed: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    phase2CompletionClaimed: false,
    phase8CompletionClaimed: false,
    phase9CompletionClaimed: false,
    phase10CompletionClaimed: false,
    fullPlanPackCompletionClaimed: false,
    readinessClaimed: false,
    ...overrides
  };
}

function counters(overrides = {}) {
  return {
    acceptanceDecisionSubmissions: 0,
    acceptanceDecisions: 0,
    manualReviewCompletions: 0,
    exactAuthorizationAcceptances: 0,
    lowDisclosureEvidenceMaterialAcceptances: 0,
    approvalAcceptances: 0,
    receiptAcceptances: 0,
    reviewAcceptances: 0,
    tagApprovalAcceptances: 0,
    evidenceMaterialAcceptances: 0,
    evidenceApplications: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    nativeReadAttempts: 0,
    nativeWriteAttempts: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    providerApiCalls: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    defaultRuntimeExpansions: 0,
    tagCreateActions: 0,
    tagPushActions: 0,
    releasePublishActions: 0,
    deployActions: 0,
    cutoverActions: 0,
    readinessClaims: 0,
    ...overrides
  };
}

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2065',
    mode: 'local-plan-pack-evidence-material-acceptance-decision-request-boundary',
    acceptanceEligibilitySource: acceptanceEligibilitySource(),
    acceptanceEligibilityResult: acceptanceEligibilityResult(),
    acceptanceDecisionRequestBoundary: acceptanceDecisionRequestBoundary(),
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    acceptanceEligibilitySource: {
      ...base.acceptanceEligibilitySource,
      ...(overrides.acceptanceEligibilitySource || {})
    },
    acceptanceEligibilityResult: acceptanceEligibilityResult(overrides.acceptanceEligibilityResult || {}),
    acceptanceDecisionRequestBoundary: {
      ...base.acceptanceDecisionRequestBoundary,
      ...(overrides.acceptanceDecisionRequestBoundary || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function fullEvidence() {
  const evidence = {};
  for (const phase of PHASE_REQUIREMENTS) {
    for (const field of phase.requiredEvidence) evidence[field] = true;
  }
  for (const invariant of OBJECTIVE_INVARIANTS) {
    for (const field of invariant.requiredEvidence) evidence[field] = true;
  }
  return evidence;
}

function assertNoSideEffects(result) {
  assert.equal(result.manualReviewCompletedByThisContract, false);
  assert.equal(result.acceptanceDecisionMadeByThisContract, false);
  assert.equal(result.acceptanceDecisionSubmittedByThisContract, false);
  assert.equal(result.exactAuthorizationAcceptedByThisContract, false);
  assert.equal(result.lowDisclosureEvidenceMaterialAcceptedByThisContract, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.receiptAcceptedByThisContract, false);
  assert.equal(result.reviewAcceptedByThisContract, false);
  assert.equal(result.tagApprovalAcceptedByThisContract, false);
  assert.equal(result.evidenceMaterialAcceptedByThisContract, false);
  assert.equal(result.evidenceAppliedByThisContract, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.nativeReadExecuted, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.defaultRuntimeExpanded, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.tagPushed, false);
  assert.equal(result.releasePublished, false);
  assert.equal(result.deploymentTriggered, false);
  assert.equal(result.cutoverPerformed, false);
}

test('CM2065 prepares acceptance decision requests from CM2064 eligibility only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.acceptanceDecisionRequestBoundaryPrepared, true);
  assert.equal(result.acceptanceDecisionRequests.length, 3);
  assert.equal(result.acceptanceDecisionRequests.every(item => item.acceptanceDecisionPacketRequired === true), true);
  assert.equal(result.acceptanceDecisionRequests.every(item => item.reviewedExactAuthorizationRequired === true), true);
  assert.equal(result.acceptanceDecisionRequests.every(item => item.reviewedLowDisclosureMaterialRequired === true), true);
  assert.equal(result.acceptanceDecisionRequests.every(item => item.canSubmitAcceptanceDecisionNow === false), true);
  assert.equal(result.acceptanceDecisionRequests.every(item => item.canAcceptEvidenceNow === false), true);
  assert.equal(
    result.nextGate,
    'await_actual_reviewed_acceptance_decision_packet_before_any_evidence_acceptance_or_application'
  );
  assertNoSideEffects(result);
});

test('CM2065 rejects stale CM2064 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(validInput({
    acceptanceEligibilitySource: { sourceValidationId: 'CMV-2164' },
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked');
  assert.ok(result.blockers.includes('acceptanceEligibilitySource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2065 blocks rejected or stale acceptance eligibility results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(validInput({
    acceptanceEligibilityResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked',
      acceptanceEligibilityGatePrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked');
  assert.ok(result.blockers.includes('acceptanceEligibilityResult.accepted'));
  assert.ok(result.blockers.includes('acceptanceEligibilityResult.decision'));
  assert.ok(result.blockers.includes('acceptanceEligibilityResult.acceptanceEligibilityGatePrepared'));
  assertNoSideEffects(result);
});

test('CM2065 blocks acceptance eligibility checklist drift before decision request boundary', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(validInput({
    acceptanceEligibilityResult: {
      acceptanceEligibilityChecklist: [
        {
          canMakeAcceptanceDecisionNow: true,
          canAcceptEvidenceNow: true,
          acceptedAsEvidenceNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked');
  assert.ok(result.blockers.includes(
    'acceptanceEligibilityResult.acceptanceEligibilityChecklist[0].canMakeAcceptanceDecisionNow'
  ));
  assert.ok(result.blockers.includes('acceptanceEligibilityResult.acceptanceEligibilityChecklist[0].canAcceptEvidenceNow'));
  assert.ok(result.blockers.includes('acceptanceEligibilityResult.acceptanceEligibilityChecklist[0].acceptedAsEvidenceNow'));
  assertNoSideEffects(result);
});

test('CM2065 stops L4 on decision submission acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(validInput({
    acceptanceEligibilityResult: {
      acceptanceDecisionMadeByThisContract: true,
      exactAuthorizationAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    acceptanceDecisionRequestBoundary: {
      acceptanceDecisionSubmittedByThisContract: true,
      lowDisclosureEvidenceMaterialAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      acceptanceDecisionSubmissions: 1,
      acceptanceDecisions: 1,
      exactAuthorizationAcceptances: 1,
      lowDisclosureEvidenceMaterialAcceptances: 1,
      evidenceApplications: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('acceptanceEligibilityResult.acceptanceDecisionMadeByThisContract'));
  assert.ok(result.blockers.includes('acceptanceDecisionRequestBoundary.acceptanceDecisionSubmittedByThisContract'));
  assert.ok(result.blockers.includes('acceptanceDecisionRequestBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.acceptanceDecisionSubmissions'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2065 rejects raw acceptance decision authorization and material fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract({
    ...validInput(),
    futureDecision: {
      acceptanceDecisionPacket: 'do-not-echo-decision',
      reviewedAcceptanceDecisionBody: 'do-not-echo-reviewed-decision',
      decisionReceiptValue: 'do-not-echo-receipt'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_authorization_material_decision_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'futureDecision.acceptanceDecisionPacket',
    'futureDecision.reviewedAcceptanceDecisionBody',
    'futureDecision.decisionReceiptValue'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2065 decision request boundary does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(validInput());
  assert.equal(result.accepted, true);

  const evidence = fullEvidence();
  for (const field of PHASE2_EXACT_RECEIPT_FIELDS) evidence[field] = false;
  for (const field of PHASE8_EXACT_RECEIPT_FIELDS) evidence[field] = false;
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  assert.equal(audit.accepted, false);
  assert.equal(audit.fullPlanPackCompleted, false);
  assert.equal(result.acceptanceDecisionRequests.every(item => item.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2065 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    decision: {
      decisionBody: 'not-echoed',
      reviewedAcceptanceDecisionValue: 'not-echoed'
    },
    receipt: {
      decisionReceiptPayload: 'not-echoed'
    }
  });

  assert.deepEqual(forbidden, [
    'decision.decisionBody',
    'decision.reviewedAcceptanceDecisionValue',
    'receipt.decisionReceiptPayload'
  ]);
});
