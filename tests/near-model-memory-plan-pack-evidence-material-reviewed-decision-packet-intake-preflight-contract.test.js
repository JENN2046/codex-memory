'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function source(overrides = {}) {
  return {
    sourceTaskId: 'CM-2068',
    sourceValidationId: 'CMV-2169',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_readiness_gate_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReadinessGateContract',
    sourceContractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_only',
    ...overrides
  };
}

function checklist(overrides = []) {
  const base = [
    {
      slotId: 'phase2_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_readiness',
      sourceMetadataSlotId: 'phase2_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase2_exact_receipt_metadata',
      requiredAuthorizationKind: 'future_phase2_exact_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_phase2_exact_receipt_material',
      actualReviewedDecisionPacketRequired: true,
      lowDisclosureDecisionPacketRequired: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      actualReviewedDecisionPacketPresent: false,
      canAcceptDecisionPacketNow: false,
      canSubmitAcceptanceDecisionNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    },
    {
      slotId: 'phase8_exact_receipts_before_completion_audit_patch_reviewed_decision_packet_readiness',
      sourceMetadataSlotId: 'phase8_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase8_exact_receipt_metadata',
      requiredAuthorizationKind: 'future_phase8_exact_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_phase8_exact_receipt_material',
      actualReviewedDecisionPacketRequired: true,
      lowDisclosureDecisionPacketRequired: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      actualReviewedDecisionPacketPresent: false,
      canAcceptDecisionPacketNow: false,
      canSubmitAcceptanceDecisionNow: false,
      canMakeAcceptanceDecisionNow: false,
      canAcceptEvidenceNow: false,
      canApplyNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    },
    {
      slotId: 'phase9_phase10_external_review_before_completion_audit_patch_reviewed_decision_packet_readiness',
      sourceMetadataSlotId: 'phase9_phase10_external_review_before_completion_audit_patch_metadata_slot',
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      requestedItemCount: 6,
      requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
      requiredMetadataKind: 'low_disclosure_external_review_or_tag_approval_metadata',
      requiredAuthorizationKind: 'future_phase9_phase10_review_or_tag_approval_authorization_packet',
      requiredMaterialKind: 'future_low_disclosure_external_review_or_tag_approval_material',
      actualReviewedDecisionPacketRequired: true,
      lowDisclosureDecisionPacketRequired: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      actualReviewedDecisionPacketPresent: false,
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

function readinessResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReadinessGateContract',
    contractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_only',
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_prepared',
    blockers: [],
    reviewedDecisionPacketReadinessGatePrepared: true,
    reviewedDecisionPacketReadinessChecklist: checklist(overrides.reviewedDecisionPacketReadinessChecklist || []),
    sourceTaskId: 'CM-2066',
    sourceValidationId: 'CMV-2167',
    nextGate: 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_packet_acceptance_or_evidence_acceptance',
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
    reviewedDecisionPacketReadinessChecklist: checklist(overrides.reviewedDecisionPacketReadinessChecklist || [])
  };
}

function intakeBoundary(overrides = {}) {
  return {
    reviewedDecisionPacketIntakePreflightPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    readinessGateResultOnly: true,
    actualReviewedDecisionPacketStillRequired: true,
    actualReviewedDecisionPacketAbsent: true,
    reviewedDecisionPacketBodyAbsent: true,
    reviewedDecisionPacketValueAbsent: true,
    packetReferenceOnly: true,
    packetBodyAllowed: false,
    packetValueAllowed: false,
    decisionBodyAllowed: false,
    decisionValueAllowed: false,
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
    taskId: 'CM-2069',
    mode: 'local-plan-pack-evidence-material-reviewed-decision-packet-intake-preflight',
    reviewedDecisionPacketReadinessSource: source(),
    reviewedDecisionPacketReadinessResult: readinessResult(),
    reviewedDecisionPacketIntakeBoundary: intakeBoundary(),
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    reviewedDecisionPacketReadinessSource: {
      ...base.reviewedDecisionPacketReadinessSource,
      ...(overrides.reviewedDecisionPacketReadinessSource || {})
    },
    reviewedDecisionPacketReadinessResult: readinessResult(overrides.reviewedDecisionPacketReadinessResult || {}),
    reviewedDecisionPacketIntakeBoundary: {
      ...base.reviewedDecisionPacketIntakeBoundary,
      ...(overrides.reviewedDecisionPacketIntakeBoundary || {})
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

test('CM2069 prepares packet intake requirements from CM2068 readiness only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.reviewedDecisionPacketIntakePreflightPrepared, true);
  assert.equal(result.reviewedDecisionPacketIntakeRequirements.length, 3);
  assert.equal(result.reviewedDecisionPacketIntakeRequirements.every(item => item.packetReferenceOnly), true);
  assert.equal(result.reviewedDecisionPacketIntakeRequirements.every(item => item.reviewedDecisionPacketBodyAllowed === false), true);
  assert.equal(result.reviewedDecisionPacketIntakeRequirements.every(item => item.canReceiveActualPacketNow === false), true);
  assert.equal(
    result.nextGate,
    'await_actual_low_disclosure_reviewed_acceptance_decision_packet_reference_before_packet_intake_execution'
  );
  assertNoSideEffects(result);
});

test('CM2069 rejects stale CM2068 readiness source', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(validInput({
    reviewedDecisionPacketReadinessSource: { sourceValidationId: 'CMV-2168' },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReadinessSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2069 blocks rejected or stale readiness gate results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(validInput({
    reviewedDecisionPacketReadinessResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_blocked',
      reviewedDecisionPacketReadinessGatePrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReadinessResult.accepted'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReadinessResult.decision'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessGatePrepared'));
  assertNoSideEffects(result);
});

test('CM2069 blocks readiness checklist drift before intake preflight', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(validInput({
    reviewedDecisionPacketReadinessResult: {
      reviewedDecisionPacketReadinessChecklist: [
        {
          sourceMetadataSlotId: 'stale_metadata_slot',
          actualReviewedDecisionPacketPresent: true,
          canAcceptDecisionPacketNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist[0].sourceMetadataSlotId'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist[0].actualReviewedDecisionPacketPresent'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist[0].canAcceptDecisionPacketNow'
  ));
  assertNoSideEffects(result);
});

test('CM2069 stops L4 on packet receipt acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(validInput({
    reviewedDecisionPacketReadinessResult: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true
    },
    reviewedDecisionPacketIntakeBoundary: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      reviewedDecisionPacketReceipts: 1,
      reviewedDecisionPacketAcceptances: 1,
      evidenceApplications: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReadinessResult.acceptanceDecisionPacketAcceptedByThisContract'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketIntakeBoundary.acceptanceDecisionPacketAcceptedByThisContract'));
  assert.ok(result.blockers.includes('counters.reviewedDecisionPacketReceipts'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2069 rejects raw reviewed decision packet fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(validInput({
    packetContainer: {
      reviewedDecisionPacketBody: 'DO_NOT_ECHO_PACKET',
      rawDecisionPacketValue: 'DO_NOT_ECHO_VALUE'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_decision_packet_authorization_material_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'packetContainer.reviewedDecisionPacketBody',
    'packetContainer.rawDecisionPacketValue'
  ]);
  assert.equal(serialized.includes('DO_NOT_ECHO_PACKET'), false);
  assert.equal(serialized.includes('DO_NOT_ECHO_VALUE'), false);
});

test('CM2069 intake preflight does not complete the plan pack in completion audit', () => {
  const evidence = fullEvidence();
  evidence.nativeReadProofPassed = false;
  evidence.phase2ReceiptBundleAppliedToCompletionAudit = false;
  evidence.nativeSideEffectReceiptPassed = false;
  evidence.phase8ReceiptBundleAppliedToCompletionAudit = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes('missing_phase2_readonly_realtime_native_memory_nativeReadProofPassed'));
  assert.ok(result.blockers.includes('missing_phase8_native_write_production_proof_nativeSideEffectReceiptPassed'));
  assert.ok(result.blockers.includes('missing_phase10_tag_release_readiness_tagApprovalPacketPassed'));
});

test('CM2069 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    reviewedDecisionPacketPayload: 'DO_NOT_ECHO_A',
    nested: {
      actualDecisionPacketValue: 'DO_NOT_ECHO_B'
    }
  }), [
    'reviewedDecisionPacketPayload',
    'nested.actualDecisionPacketValue'
  ]);
});
