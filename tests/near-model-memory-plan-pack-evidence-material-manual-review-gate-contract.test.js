'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract');
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

function intakeSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2062',
    sourceValidationId: 'CMV-2163',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_intake_boundary_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract',
    sourceContractMode: 'local_plan_pack_evidence_material_intake_boundary_only',
    ...overrides
  };
}

function intakeRequirements(overrides = []) {
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
      separateExactAuthorizationPacketRequired: true,
      separateLowDisclosureMaterialPacketRequired: true,
      intakeMetadataOnly: true,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
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
      separateExactAuthorizationPacketRequired: true,
      separateLowDisclosureMaterialPacketRequired: true,
      intakeMetadataOnly: true,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
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
      separateExactAuthorizationPacketRequired: true,
      separateLowDisclosureMaterialPacketRequired: true,
      intakeMetadataOnly: true,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
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

function intakeResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract',
    contractMode: 'local_plan_pack_evidence_material_intake_boundary_only',
    decision: 'plan_pack_evidence_material_intake_boundary_prepared',
    blockers: [],
    materialIntakeBoundaryPrepared: true,
    intakeRequirements: intakeRequirements(overrides.intakeRequirements || []),
    sourceTaskId: 'CM-2061',
    sourceValidationId: 'CMV-2162',
    nextGate: 'await_actual_exact_authorization_packet_and_low_disclosure_material_for_manual_review_before_acceptance',
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
    intakeRequirements: intakeRequirements(overrides.intakeRequirements || [])
  };
}

function manualReviewBoundary(overrides = {}) {
  return {
    manualReviewGatePrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    intakeResultOnly: true,
    operatorManualReviewRequired: true,
    separateExactAuthorizationPacketRequired: true,
    separateLowDisclosureMaterialPacketRequired: true,
    reviewPacketBodyAbsent: true,
    approvalTextAbsent: true,
    rawAuthorizationAbsent: true,
    rawMaterialAbsent: true,
    materialBodyAbsent: true,
    materialValuesAbsent: true,
    manualReviewDeferred: true,
    acceptanceDeferred: true,
    applicationDeferred: true,
    completionAuditPatchDeferred: true,
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
    manualReviewCompletions: 0,
    intakeAcceptances: 0,
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
    taskId: 'CM-2063',
    mode: 'local-plan-pack-evidence-material-manual-review-gate',
    intakeSource: intakeSource(),
    intakeResult: intakeResult(),
    manualReviewBoundary: manualReviewBoundary(),
    expectedDecision: 'plan_pack_evidence_material_manual_review_gate_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    intakeSource: { ...base.intakeSource, ...(overrides.intakeSource || {}) },
    intakeResult: intakeResult(overrides.intakeResult || {}),
    manualReviewBoundary: { ...base.manualReviewBoundary, ...(overrides.manualReviewBoundary || {}) },
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
  assert.equal(result.exactAuthorizationAcceptedByThisContract, false);
  assert.equal(result.lowDisclosureEvidenceMaterialAcceptedByThisContract, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.receiptAcceptedByThisContract, false);
  assert.equal(result.reviewAcceptedByThisContract, false);
  assert.equal(result.tagApprovalAcceptedByThisContract, false);
  assert.equal(result.manualReviewCompletedByThisContract, false);
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

test('CM2063 prepares a manual review checklist from CM2062 intake only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.manualReviewGatePrepared, true);
  assert.equal(result.manualReviewChecklist.length, 3);
  assert.equal(result.manualReviewChecklist.every(item => item.operatorManualReviewRequired === true), true);
  assert.equal(result.manualReviewChecklist.every(item => item.exactAuthorizationPacketRequiredForReview === true), true);
  assert.equal(result.manualReviewChecklist.every(item => item.lowDisclosureMaterialRequiredForReview === true), true);
  assert.equal(result.manualReviewChecklist.every(item => item.canCompleteManualReviewNow === false), true);
  assert.equal(result.manualReviewChecklist.every(item => item.canAcceptEvidenceNow === false), true);
  assert.equal(result.nextGate, 'await_actual_reviewed_exact_authorization_and_low_disclosure_material_before_any_acceptance');
  assertNoSideEffects(result);
});

test('CM2063 rejects stale CM2062 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(validInput({
    intakeSource: { sourceValidationId: 'CMV-2162' },
    expectedDecision: 'plan_pack_evidence_material_manual_review_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_manual_review_gate_blocked');
  assert.ok(result.blockers.includes('intakeSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2063 blocks rejected or stale intake results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(validInput({
    intakeResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_intake_boundary_blocked',
      materialIntakeBoundaryPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_manual_review_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_manual_review_gate_blocked');
  assert.ok(result.blockers.includes('intakeResult.accepted'));
  assert.ok(result.blockers.includes('intakeResult.decision'));
  assert.ok(result.blockers.includes('intakeResult.materialIntakeBoundaryPrepared'));
  assertNoSideEffects(result);
});

test('CM2063 blocks intake requirement drift before manual review gate', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(validInput({
    intakeResult: {
      intakeRequirements: [
        {
          rawAuthorizationAllowed: true,
          canAcceptEvidenceNow: true,
          acceptedAsEvidenceNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_manual_review_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_manual_review_gate_blocked');
  assert.ok(result.blockers.includes('intakeResult.intakeRequirements[0].rawAuthorizationAllowed'));
  assert.ok(result.blockers.includes('intakeResult.intakeRequirements[0].canAcceptEvidenceNow'));
  assert.ok(result.blockers.includes('intakeResult.intakeRequirements[0].acceptedAsEvidenceNow'));
  assertNoSideEffects(result);
});

test('CM2063 stops L4 on review completion acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(validInput({
    intakeResult: {
      exactAuthorizationAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    manualReviewBoundary: {
      manualReviewCompletedByThisContract: true,
      lowDisclosureEvidenceMaterialAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
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
  assert.ok(result.blockers.includes('intakeResult.exactAuthorizationAcceptedByThisContract'));
  assert.ok(result.blockers.includes('manualReviewBoundary.manualReviewCompletedByThisContract'));
  assert.ok(result.blockers.includes('manualReviewBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.manualReviewCompletions'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2063 rejects raw review authorization and material fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract({
    ...validInput(),
    review: {
      manualReviewPayload: 'do-not-echo-review',
      authorizationMaterial: 'do-not-echo-authorization',
      materialBody: 'do-not-echo-material'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_authorization_material_review_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'review.manualReviewPayload',
    'review.authorizationMaterial',
    'review.materialBody'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2063 manual review gate does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(validInput());
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
  assert.equal(result.manualReviewChecklist.every(item => item.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2063 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    review: {
      manualReviewBody: 'not-echoed'
    },
    futureMaterial: {
      evidenceBody: 'not-echoed',
      materialValue: 'not-echoed'
    }
  });

  assert.deepEqual(forbidden, [
    'review.manualReviewBody',
    'futureMaterial.evidenceBody',
    'futureMaterial.materialValue'
  ]);
});
