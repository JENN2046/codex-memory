'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract');
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

function source(overrides = {}) {
  return {
    sourceTaskId: 'CM-2065',
    sourceValidationId: 'CMV-2166',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_decision_request_boundary_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract',
    sourceContractMode: 'local_plan_pack_evidence_material_acceptance_decision_request_boundary_only',
    ...overrides
  };
}

function decisionRequests(overrides = []) {
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
      acceptanceDecisionPacketRequired: true,
      reviewedExactAuthorizationRequired: true,
      reviewedLowDisclosureMaterialRequired: true,
      operatorDecisionRequired: true,
      decisionBodyAllowed: false,
      decisionValueAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canSubmitAcceptanceDecisionNow: false,
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
      acceptanceDecisionPacketRequired: true,
      reviewedExactAuthorizationRequired: true,
      reviewedLowDisclosureMaterialRequired: true,
      operatorDecisionRequired: true,
      decisionBodyAllowed: false,
      decisionValueAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canSubmitAcceptanceDecisionNow: false,
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
      acceptanceDecisionPacketRequired: true,
      reviewedExactAuthorizationRequired: true,
      reviewedLowDisclosureMaterialRequired: true,
      operatorDecisionRequired: true,
      decisionBodyAllowed: false,
      decisionValueAllowed: false,
      rawAuthorizationAllowed: false,
      rawMaterialAllowed: false,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canSubmitAcceptanceDecisionNow: false,
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

function requestResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract',
    contractMode: 'local_plan_pack_evidence_material_acceptance_decision_request_boundary_only',
    decision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_prepared',
    blockers: [],
    acceptanceDecisionRequestBoundaryPrepared: true,
    acceptanceDecisionRequests: decisionRequests(overrides.acceptanceDecisionRequests || []),
    sourceTaskId: 'CM-2064',
    sourceValidationId: 'CMV-2165',
    nextGate: 'await_actual_reviewed_acceptance_decision_packet_before_any_evidence_acceptance_or_application',
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
    acceptanceDecisionRequests: decisionRequests(overrides.acceptanceDecisionRequests || [])
  };
}

function metadataBoundary(overrides = {}) {
  return {
    acceptanceDecisionPacketMetadataGatePrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    decisionRequestResultOnly: true,
    acceptanceDecisionPacketStillRequired: true,
    reviewedDecisionPacketStillRequired: true,
    rawDecisionAbsent: true,
    decisionBodyAbsent: true,
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
    taskId: 'CM-2066',
    mode: 'local-plan-pack-evidence-material-acceptance-decision-packet-metadata-gate',
    acceptanceDecisionRequestSource: source(),
    acceptanceDecisionRequestResult: requestResult(),
    acceptanceDecisionPacketMetadataBoundary: metadataBoundary(),
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    acceptanceDecisionRequestSource: {
      ...base.acceptanceDecisionRequestSource,
      ...(overrides.acceptanceDecisionRequestSource || {})
    },
    acceptanceDecisionRequestResult: requestResult(overrides.acceptanceDecisionRequestResult || {}),
    acceptanceDecisionPacketMetadataBoundary: {
      ...base.acceptanceDecisionPacketMetadataBoundary,
      ...(overrides.acceptanceDecisionPacketMetadataBoundary || {})
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
  assert.equal(result.acceptanceDecisionPacketAcceptedByThisContract, false);
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

test('CM2066 prepares acceptance decision packet metadata slots from CM2065 requests only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.acceptanceDecisionPacketMetadataGatePrepared, true);
  assert.equal(result.acceptanceDecisionPacketMetadataSlots.length, 3);
  assert.equal(result.acceptanceDecisionPacketMetadataSlots.every(item => item.lowDisclosureDecisionMetadataRequired), true);
  assert.equal(result.acceptanceDecisionPacketMetadataSlots.every(item => item.reviewedDecisionPacketRequired), true);
  assert.equal(result.acceptanceDecisionPacketMetadataSlots.every(item => item.bodyFree), true);
  assert.equal(result.acceptanceDecisionPacketMetadataSlots.every(item => item.canAcceptDecisionPacketNow === false), true);
  assert.equal(
    result.nextGate,
    'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_any_acceptance'
  );
  assertNoSideEffects(result);
});

test('CM2066 rejects stale CM2065 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(validInput({
    acceptanceDecisionRequestSource: { sourceValidationId: 'CMV-2165' },
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked');
  assert.ok(result.blockers.includes('acceptanceDecisionRequestSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2066 blocks rejected or stale decision request boundary results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(validInput({
    acceptanceDecisionRequestResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked',
      acceptanceDecisionRequestBoundaryPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked');
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.accepted'));
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.decision'));
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.acceptanceDecisionRequestBoundaryPrepared'));
  assertNoSideEffects(result);
});

test('CM2066 blocks decision request drift before metadata gate', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(validInput({
    acceptanceDecisionRequestResult: {
      acceptanceDecisionRequests: [
        {
          decisionBodyAllowed: true,
          canSubmitAcceptanceDecisionNow: true,
          canAcceptEvidenceNow: true,
          acceptedAsEvidenceNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked');
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.acceptanceDecisionRequests[0].decisionBodyAllowed'));
  assert.ok(result.blockers.includes(
    'acceptanceDecisionRequestResult.acceptanceDecisionRequests[0].canSubmitAcceptanceDecisionNow'
  ));
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.acceptanceDecisionRequests[0].canAcceptEvidenceNow'));
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.acceptanceDecisionRequests[0].acceptedAsEvidenceNow'));
  assertNoSideEffects(result);
});

test('CM2066 stops L4 on packet acceptance decision application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(validInput({
    acceptanceDecisionRequestResult: {
      acceptanceDecisionSubmittedByThisContract: true,
      exactAuthorizationAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    acceptanceDecisionPacketMetadataBoundary: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      lowDisclosureEvidenceMaterialAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      acceptanceDecisionPacketAcceptances: 1,
      acceptanceDecisionSubmissions: 1,
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
  assert.ok(result.blockers.includes('acceptanceDecisionRequestResult.acceptanceDecisionSubmittedByThisContract'));
  assert.ok(result.blockers.includes(
    'acceptanceDecisionPacketMetadataBoundary.acceptanceDecisionPacketAcceptedByThisContract'
  ));
  assert.ok(result.blockers.includes('acceptanceDecisionPacketMetadataBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.acceptanceDecisionPacketAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2066 rejects raw decision packet metadata fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract({
    ...validInput(),
    futurePacket: {
      acceptanceDecisionPacketBody: 'do-not-echo-packet',
      reviewedDecisionPacketValue: 'do-not-echo-reviewed',
      decisionMetadataPayload: 'do-not-echo-metadata'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_authorization_material_decision_packet_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'futurePacket.acceptanceDecisionPacketBody',
    'futurePacket.reviewedDecisionPacketValue',
    'futurePacket.decisionMetadataPayload'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2066 metadata gate does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(validInput());
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
  assert.equal(result.acceptanceDecisionPacketMetadataSlots.every(item => item.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2066 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    packetContainer: {
      decisionPacketBody: 'not-echoed',
      reviewedDecisionPacketPayload: 'not-echoed'
    },
    metadata: {
      decisionMetadataValue: 'not-echoed'
    }
  });

  assert.deepEqual(forbidden, [
    'packetContainer.decisionPacketBody',
    'packetContainer.reviewedDecisionPacketPayload',
    'metadata.decisionMetadataValue'
  ]);
});
