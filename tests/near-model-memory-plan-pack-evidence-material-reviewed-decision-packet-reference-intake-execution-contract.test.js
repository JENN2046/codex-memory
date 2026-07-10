'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function source(overrides = {}) {
  return {
    sourceTaskId: 'CM-2069',
    sourceValidationId: 'CMV-2170',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_intake_preflight_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract',
    sourceContractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_only',
    ...overrides
  };
}

function requirements(overrides = []) {
  const base = [
    {
      requirementId: 'phase2_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_intake_requirement',
      sourceReadinessSlotId: 'phase2_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_readiness',
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requestedItemCount: 9,
      expectedPacketReferenceKind: 'future_low_disclosure_reviewed_acceptance_decision_packet_reference',
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase2_exact_receipt_metadata',
      requiredAuthorizationKind: 'future_phase2_exact_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_phase2_exact_receipt_material',
      packetReferenceRequired: true,
      packetReferenceOnly: true,
      lowDisclosureDecisionSummaryRequired: true,
      reviewedDecisionPacketBodyAllowed: false,
      reviewedDecisionPacketValueAllowed: false,
      rawDecisionAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      canReceiveActualPacketNow: false,
      canAcceptDecisionPacketNow: false,
      canSubmitAcceptanceDecisionNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    },
    {
      requirementId: 'phase8_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_intake_requirement',
      sourceReadinessSlotId: 'phase8_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_readiness',
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      requestedItemCount: 9,
      expectedPacketReferenceKind: 'future_low_disclosure_reviewed_acceptance_decision_packet_reference',
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase8_exact_receipt_metadata',
      requiredAuthorizationKind: 'future_phase8_exact_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_phase8_exact_receipt_material',
      packetReferenceRequired: true,
      packetReferenceOnly: true,
      lowDisclosureDecisionSummaryRequired: true,
      reviewedDecisionPacketBodyAllowed: false,
      reviewedDecisionPacketValueAllowed: false,
      rawDecisionAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      canReceiveActualPacketNow: false,
      canAcceptDecisionPacketNow: false,
      canSubmitAcceptanceDecisionNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    },
    {
      requirementId: 'phase9_phase10_external_review_before_completion_audit_patch_reviewed_decision_packet_intake_requirement',
      sourceReadinessSlotId: 'phase9_phase10_external_review_before_completion_audit_patch_reviewed_decision_packet_readiness',
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      requestedItemCount: 6,
      expectedPacketReferenceKind: 'future_low_disclosure_reviewed_acceptance_decision_packet_reference',
      requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
      requiredMetadataKind: 'low_disclosure_external_review_or_tag_approval_metadata',
      requiredAuthorizationKind: 'future_phase9_phase10_review_or_tag_approval_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_external_review_or_tag_approval_material',
      packetReferenceRequired: true,
      packetReferenceOnly: true,
      lowDisclosureDecisionSummaryRequired: true,
      reviewedDecisionPacketBodyAllowed: false,
      reviewedDecisionPacketValueAllowed: false,
      rawDecisionAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      canReceiveActualPacketNow: false,
      canAcceptDecisionPacketNow: false,
      canSubmitAcceptanceDecisionNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    }
  ];
  return base.map((entry, index) => ({ ...entry, ...(overrides[index] || {}) }));
}

function preflightResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract',
    contractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_only',
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_prepared',
    blockers: [],
    reviewedDecisionPacketIntakePreflightPrepared: true,
    reviewedDecisionPacketIntakeRequirements: requirements(overrides.reviewedDecisionPacketIntakeRequirements || []),
    sourceTaskId: 'CM-2068',
    sourceValidationId: 'CMV-2169',
    nextGate: 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_reference_before_packet_intake_execution',
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
    acceptanceDecisionPacketAcceptedByThisContract: false,
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
    reviewedDecisionPacketIntakeRequirements: requirements(overrides.reviewedDecisionPacketIntakeRequirements || [])
  };
}

function references(overrides = []) {
  const base = [
    {
      referenceId: 'phase2_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_reference',
      sourceRequirementId: 'phase2_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_intake_requirement',
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
      decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
      reviewOutcomeCategory: 'reference_intake_only_requires_future_acceptance_boundary',
      requestedItemCount: 9,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      actualReviewedDecisionPacketPresent: false,
      reviewedDecisionPacketBodyPresent: false,
      reviewedDecisionPacketValuePresent: false,
      rawDecisionPresent: false,
      rawAuthorizationPresent: false,
      rawMaterialPresent: false,
      packetAcceptanceRequested: false,
      acceptanceDecisionRequested: false,
      evidenceAcceptanceRequested: false,
      applicationRequested: false,
      completionPatchRequested: false
    },
    {
      referenceId: 'phase8_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_reference',
      sourceRequirementId: 'phase8_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_intake_requirement',
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
      decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
      reviewOutcomeCategory: 'reference_intake_only_requires_future_acceptance_boundary',
      requestedItemCount: 9,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      actualReviewedDecisionPacketPresent: false,
      reviewedDecisionPacketBodyPresent: false,
      reviewedDecisionPacketValuePresent: false,
      rawDecisionPresent: false,
      rawAuthorizationPresent: false,
      rawMaterialPresent: false,
      packetAcceptanceRequested: false,
      acceptanceDecisionRequested: false,
      evidenceAcceptanceRequested: false,
      applicationRequested: false,
      completionPatchRequested: false
    },
    {
      referenceId: 'phase9_phase10_external_review_before_completion_audit_patch_reviewed_decision_packet_reference',
      sourceRequirementId: 'phase9_phase10_external_review_before_completion_audit_patch_reviewed_decision_packet_intake_requirement',
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
      decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
      reviewOutcomeCategory: 'reference_intake_only_requires_future_acceptance_boundary',
      requestedItemCount: 6,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      actualReviewedDecisionPacketPresent: false,
      reviewedDecisionPacketBodyPresent: false,
      reviewedDecisionPacketValuePresent: false,
      rawDecisionPresent: false,
      rawAuthorizationPresent: false,
      rawMaterialPresent: false,
      packetAcceptanceRequested: false,
      acceptanceDecisionRequested: false,
      evidenceAcceptanceRequested: false,
      applicationRequested: false,
      completionPatchRequested: false
    }
  ];
  return base.map((entry, index) => ({ ...entry, ...(overrides[index] || {}) }));
}

function envelope(overrides = {}) {
  return {
    envelopeId: 'CM-2070_reviewed_decision_packet_reference_envelope',
    sourcePreflightTaskId: 'CM-2069',
    sourcePreflightValidationId: 'CMV-2170',
    lowDisclosureOnly: true,
    categoryOnly: true,
    referenceOnly: true,
    references: references(overrides.references || []),
    ...overrides,
    references: references(overrides.references || [])
  };
}

function boundary(overrides = {}) {
  return {
    reviewedDecisionPacketReferenceIntakeExecuted: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    referenceOnly: true,
    preflightResultConsumed: true,
    actualReviewedDecisionPacketStillAbsent: true,
    reviewedDecisionPacketBodyAbsent: true,
    reviewedDecisionPacketValueAbsent: true,
    rawDecisionAbsent: true,
    rawAuthorizationAbsent: true,
    rawMaterialAbsent: true,
    packetAcceptanceDeferred: true,
    acceptanceDecisionDeferred: true,
    evidenceAcceptanceDeferred: true,
    applicationDeferred: true,
    completionAuditPatchDeferred: true,
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
    acceptanceDecisionPacketAcceptedByThisContract: false,
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
    reviewedDecisionPacketReferenceEntries: 3,
    reviewedDecisionPacketReceipts: 0,
    reviewedDecisionPacketAcceptances: 0,
    acceptanceDecisionPacketAcceptances: 0,
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
    taskId: 'CM-2070',
    mode: 'local-plan-pack-evidence-material-reviewed-decision-packet-reference-intake-execution',
    reviewedDecisionPacketIntakePreflightSource: source(),
    reviewedDecisionPacketIntakePreflightResult: preflightResult(),
    reviewedDecisionPacketReferenceEnvelope: envelope(),
    reviewedDecisionPacketReferenceIntakeBoundary: boundary(),
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_executed',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    reviewedDecisionPacketIntakePreflightSource: {
      ...base.reviewedDecisionPacketIntakePreflightSource,
      ...(overrides.reviewedDecisionPacketIntakePreflightSource || {})
    },
    reviewedDecisionPacketIntakePreflightResult: preflightResult(overrides.reviewedDecisionPacketIntakePreflightResult || {}),
    reviewedDecisionPacketReferenceEnvelope: envelope(overrides.reviewedDecisionPacketReferenceEnvelope || {}),
    reviewedDecisionPacketReferenceIntakeBoundary: {
      ...base.reviewedDecisionPacketReferenceIntakeBoundary,
      ...(overrides.reviewedDecisionPacketReferenceIntakeBoundary || {})
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
  assert.equal(result.acceptanceDecisionMadeByThisContract, false);
  assert.equal(result.acceptanceDecisionSubmittedByThisContract, false);
  assert.equal(result.acceptanceDecisionPacketAcceptedByThisContract, false);
  assert.equal(result.exactAuthorizationAcceptedByThisContract, false);
  assert.equal(result.lowDisclosureEvidenceMaterialAcceptedByThisContract, false);
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

test('CM2070 executes reference-only intake from CM2069 preflight', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.reviewedDecisionPacketReferenceIntakeExecuted, true);
  assert.equal(result.reviewedDecisionPacketReferenceIntakeEntries.length, 3);
  assert.equal(result.reviewedDecisionPacketReferenceIntakeEntries.every(item => item.referenceOnly), true);
  assert.equal(result.reviewedDecisionPacketReferenceIntakeEntries.every(item => item.bodyFree), true);
  assert.equal(result.reviewedDecisionPacketReferenceIntakeEntries.every(item => item.canAcceptDecisionPacketNow === false), true);
  assert.equal(
    result.nextGate,
    'await_reviewed_decision_packet_reference_review_boundary_before_acceptance_decision_or_material_acceptance'
  );
  assertNoSideEffects(result);
});

test('CM2070 rejects stale CM2069 preflight source', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput({
    reviewedDecisionPacketIntakePreflightSource: { sourceValidationId: 'CMV-2169' },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked');
  assert.ok(result.blockers.includes('reviewedDecisionPacketIntakePreflightSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2070 blocks rejected or stale intake preflight results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput({
    reviewedDecisionPacketIntakePreflightResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked',
      reviewedDecisionPacketIntakePreflightPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked');
  assert.ok(result.blockers.includes('reviewedDecisionPacketIntakePreflightResult.accepted'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketIntakePreflightResult.decision'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakePreflightPrepared'));
  assertNoSideEffects(result);
});

test('CM2070 blocks preflight requirement drift before reference intake execution', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput({
    reviewedDecisionPacketIntakePreflightResult: {
      reviewedDecisionPacketIntakeRequirements: [
        {
          sourceReadinessSlotId: 'stale_readiness_slot',
          canReceiveActualPacketNow: true,
          acceptedAsEvidenceNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements[0].sourceReadinessSlotId'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements[0].canReceiveActualPacketNow'
  ));
  assertNoSideEffects(result);
});

test('CM2070 blocks reference envelope drift before acceptance boundaries', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput({
    reviewedDecisionPacketReferenceEnvelope: {
      references: [
        {
          referenceId: 'stale_reference',
          reviewedDecisionPacketBodyPresent: true,
          packetAcceptanceRequested: true
        }
      ]
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceEnvelope.references[0].reviewedDecisionPacketBodyPresent'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceEnvelope.references[0].packetAcceptanceRequested'));
  assertNoSideEffects(result);
});

test('CM2070 stops L4 on acceptance application runtime tag readiness or counter drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput({
    reviewedDecisionPacketIntakePreflightResult: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true
    },
    reviewedDecisionPacketReferenceIntakeBoundary: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      reviewedDecisionPacketAcceptances: 1,
      evidenceApplications: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('reviewedDecisionPacketIntakePreflightResult.acceptanceDecisionPacketAcceptedByThisContract'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceIntakeBoundary.acceptanceDecisionPacketAcceptedByThisContract'));
  assert.ok(result.blockers.includes('counters.reviewedDecisionPacketAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2070 rejects raw reviewed decision packet reference fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(validInput({
    packetContainer: {
      reviewedDecisionPacketBody: 'DO_NOT_ECHO_PACKET',
      rawReviewedDecisionPacketReferenceValue: 'DO_NOT_ECHO_REFERENCE'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_decision_packet_reference_packet_authorization_material_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'packetContainer.reviewedDecisionPacketBody',
    'packetContainer.rawReviewedDecisionPacketReferenceValue'
  ]);
  assert.equal(serialized.includes('DO_NOT_ECHO_PACKET'), false);
  assert.equal(serialized.includes('DO_NOT_ECHO_REFERENCE'), false);
});

test('CM2070 reference intake execution does not complete the plan pack and reports paths only', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed = false;
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed'
  ));
  assert.deepEqual(collectForbiddenFields({
    rawReviewedDecisionPacketReferenceBody: 'DO_NOT_ECHO_A',
    nested: {
      acceptanceDecisionPacketValue: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawReviewedDecisionPacketReferenceBody',
    'nested.acceptanceDecisionPacketValue'
  ]);
});
