'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract');
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

function manualReviewSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2063',
    sourceValidationId: 'CMV-2164',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_manual_review_gate_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract',
    sourceContractMode: 'local_plan_pack_evidence_material_manual_review_gate_only',
    ...overrides
  };
}

function manualReviewChecklist(overrides = []) {
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
      exactAuthorizationPacketRequiredForReview: true,
      lowDisclosureMaterialRequiredForReview: true,
      operatorManualReviewRequired: true,
      reviewPacketBodyAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canCompleteManualReviewNow: false,
      canAcceptAuthorizationNow: false,
      canAcceptMaterialNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      manualReviewCompletedNow: false,
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
      exactAuthorizationPacketRequiredForReview: true,
      lowDisclosureMaterialRequiredForReview: true,
      operatorManualReviewRequired: true,
      reviewPacketBodyAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canCompleteManualReviewNow: false,
      canAcceptAuthorizationNow: false,
      canAcceptMaterialNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      manualReviewCompletedNow: false,
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
      exactAuthorizationPacketRequiredForReview: true,
      lowDisclosureMaterialRequiredForReview: true,
      operatorManualReviewRequired: true,
      reviewPacketBodyAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canCompleteManualReviewNow: false,
      canAcceptAuthorizationNow: false,
      canAcceptMaterialNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      manualReviewCompletedNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    }
  ];
  return base.map((entry, index) => ({ ...entry, ...(overrides[index] || {}) }));
}

function manualReviewResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract',
    contractMode: 'local_plan_pack_evidence_material_manual_review_gate_only',
    decision: 'plan_pack_evidence_material_manual_review_gate_prepared',
    blockers: [],
    manualReviewGatePrepared: true,
    manualReviewChecklist: manualReviewChecklist(overrides.manualReviewChecklist || []),
    sourceTaskId: 'CM-2062',
    sourceValidationId: 'CMV-2163',
    nextGate: 'await_actual_reviewed_exact_authorization_and_low_disclosure_material_before_any_acceptance',
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    manualReviewCompletedByThisContract: false,
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
    manualReviewChecklist: manualReviewChecklist(overrides.manualReviewChecklist || [])
  };
}

function acceptanceEligibilityBoundary(overrides = {}) {
  return {
    acceptanceEligibilityGatePrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    manualReviewResultOnly: true,
    reviewedAuthorizationStillRequired: true,
    reviewedLowDisclosureMaterialStillRequired: true,
    separateAcceptanceDecisionRequired: true,
    reviewCompletionStillRequired: true,
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
    taskId: 'CM-2064',
    mode: 'local-plan-pack-evidence-material-acceptance-eligibility-gate',
    manualReviewSource: manualReviewSource(),
    manualReviewResult: manualReviewResult(),
    acceptanceEligibilityBoundary: acceptanceEligibilityBoundary(),
    expectedDecision: 'plan_pack_evidence_material_acceptance_eligibility_gate_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    manualReviewSource: { ...base.manualReviewSource, ...(overrides.manualReviewSource || {}) },
    manualReviewResult: manualReviewResult(overrides.manualReviewResult || {}),
    acceptanceEligibilityBoundary: {
      ...base.acceptanceEligibilityBoundary,
      ...(overrides.acceptanceEligibilityBoundary || {})
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

test('CM2064 prepares acceptance eligibility checklist from CM2063 manual review gate only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.acceptanceEligibilityGatePrepared, true);
  assert.equal(result.acceptanceEligibilityChecklist.length, 3);
  assert.equal(result.acceptanceEligibilityChecklist.every(item => item.exactAuthorizationReviewedRequired === true), true);
  assert.equal(result.acceptanceEligibilityChecklist.every(item => item.lowDisclosureMaterialReviewedRequired === true), true);
  assert.equal(result.acceptanceEligibilityChecklist.every(item => item.separateAcceptanceDecisionRequired === true), true);
  assert.equal(result.acceptanceEligibilityChecklist.every(item => item.canMakeAcceptanceDecisionNow === false), true);
  assert.equal(result.acceptanceEligibilityChecklist.every(item => item.canAcceptEvidenceNow === false), true);
  assert.equal(
    result.nextGate,
    'await_actual_acceptance_decision_after_reviewed_authorization_and_low_disclosure_material'
  );
  assertNoSideEffects(result);
});

test('CM2064 rejects stale CM2063 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(validInput({
    manualReviewSource: { sourceValidationId: 'CMV-2163' },
    expectedDecision: 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked');
  assert.ok(result.blockers.includes('manualReviewSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2064 blocks rejected or stale manual review gate results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(validInput({
    manualReviewResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_manual_review_gate_blocked',
      manualReviewGatePrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked');
  assert.ok(result.blockers.includes('manualReviewResult.accepted'));
  assert.ok(result.blockers.includes('manualReviewResult.decision'));
  assert.ok(result.blockers.includes('manualReviewResult.manualReviewGatePrepared'));
  assertNoSideEffects(result);
});

test('CM2064 blocks manual review checklist drift before eligibility gate', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(validInput({
    manualReviewResult: {
      manualReviewChecklist: [
        {
          reviewPacketBodyAllowed: true,
          canCompleteManualReviewNow: true,
          canAcceptEvidenceNow: true,
          acceptedAsEvidenceNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked');
  assert.ok(result.blockers.includes('manualReviewResult.manualReviewChecklist[0].reviewPacketBodyAllowed'));
  assert.ok(result.blockers.includes('manualReviewResult.manualReviewChecklist[0].canCompleteManualReviewNow'));
  assert.ok(result.blockers.includes('manualReviewResult.manualReviewChecklist[0].canAcceptEvidenceNow'));
  assert.ok(result.blockers.includes('manualReviewResult.manualReviewChecklist[0].acceptedAsEvidenceNow'));
  assertNoSideEffects(result);
});

test('CM2064 stops L4 on review completion acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(validInput({
    manualReviewResult: {
      manualReviewCompletedByThisContract: true,
      exactAuthorizationAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    acceptanceEligibilityBoundary: {
      acceptanceDecisionMadeByThisContract: true,
      lowDisclosureEvidenceMaterialAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      acceptanceDecisions: 1,
      manualReviewCompletions: 1,
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
  assert.ok(result.blockers.includes('manualReviewResult.manualReviewCompletedByThisContract'));
  assert.ok(result.blockers.includes('acceptanceEligibilityBoundary.acceptanceDecisionMadeByThisContract'));
  assert.ok(result.blockers.includes('acceptanceEligibilityBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.acceptanceDecisions'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2064 rejects raw reviewed authorization material and acceptance fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract({
    ...validInput(),
    futureAcceptance: {
      acceptanceDecisionPayload: 'do-not-echo-decision',
      exactAuthorizationReviewedPayload: 'do-not-echo-authorization',
      reviewedMaterialBody: 'do-not-echo-material'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_authorization_material_acceptance_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'futureAcceptance.acceptanceDecisionPayload',
    'futureAcceptance.exactAuthorizationReviewedPayload',
    'futureAcceptance.reviewedMaterialBody'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2064 eligibility gate does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(validInput());
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
  assert.equal(result.acceptanceEligibilityChecklist.every(item => item.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2064 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    acceptance: {
      acceptanceBody: 'not-echoed',
      reviewedAuthorizationValue: 'not-echoed'
    },
    futureMaterial: {
      reviewedMaterialValue: 'not-echoed'
    }
  });

  assert.deepEqual(forbidden, [
    'acceptance.acceptanceBody',
    'acceptance.reviewedAuthorizationValue',
    'futureMaterial.reviewedMaterialValue'
  ]);
});
