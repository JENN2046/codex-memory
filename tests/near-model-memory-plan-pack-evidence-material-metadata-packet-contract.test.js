'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract');
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

function metadataGateSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2059',
    sourceValidationId: 'CMV-2160',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_metadata_gate_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialMetadataGateContract',
    sourceContractMode: 'local_plan_pack_evidence_material_metadata_gate_only',
    ...overrides
  };
}

function materialMetadataSlots(overrides = []) {
  const base = [
    {
      slotId: 'phase2_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase2_exact_receipt_metadata',
      lowDisclosureOnly: true,
      categoryOnly: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canAcceptMaterialNow: false,
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
      lowDisclosureOnly: true,
      categoryOnly: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canAcceptMaterialNow: false,
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
      lowDisclosureOnly: true,
      categoryOnly: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canAcceptMaterialNow: false,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false
    }
  ];
  return base.map((slot, index) => ({ ...slot, ...(overrides[index] || {}) }));
}

function metadataGateResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialMetadataGateContract',
    contractMode: 'local_plan_pack_evidence_material_metadata_gate_only',
    decision: 'plan_pack_evidence_material_metadata_gate_prepared',
    blockers: [],
    metadataGatePrepared: true,
    materialMetadataSlots: materialMetadataSlots(overrides.materialMetadataSlots || []),
    sourceTaskId: 'CM-2058',
    sourceValidationId: 'CMV-2159',
    nextGate: 'await_separate_low_disclosure_evidence_material_metadata_before_any_acceptance_or_application',
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
    materialMetadataSlots: materialMetadataSlots(overrides.materialMetadataSlots || [])
  };
}

function metadataEntries(overrides = []) {
  return materialMetadataSlots().map((slot, index) => ({
    slotId: slot.slotId,
    routeId: slot.routeId,
    sourceSection: slot.sourceSection,
    requiredEvidenceKind: slot.requiredEvidenceKind,
    requiredMetadataKind: slot.requiredMetadataKind,
    metadataFamily: slot.requiredMetadataKind,
    requestedItemCount: slot.requestedItemCount,
    lowDisclosureOnly: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    materialBodyPresent: false,
    materialValuePresent: false,
    canAcceptMaterialNow: false,
    acceptedAsEvidenceNow: false,
    acceptedAsCompletionEvidenceNow: false,
    canApplyNow: false,
    ...(overrides[index] || {})
  }));
}

function metadataPacket(overrides = {}) {
  return {
    packetId: 'cm-2060-evidence-material-metadata-packet',
    sourceTaskId: 'CM-2059',
    sourceValidationId: 'CMV-2160',
    lowDisclosureOnly: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    metadataOnly: true,
    exactAuthorizationStillRequired: true,
    separateEvidenceMaterialRequired: true,
    materialAcceptanceAllowed: false,
    evidenceApplicationAllowed: false,
    completionAuditPatchAllowed: false,
    phaseCompletionAllowed: false,
    readinessClaimAllowed: false,
    metadataEntries: metadataEntries(overrides.metadataEntries || []),
    ...overrides,
    metadataEntries: metadataEntries(overrides.metadataEntries || [])
  };
}

function counters(overrides = {}) {
  return {
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
    taskId: 'CM-2060',
    mode: 'local-plan-pack-evidence-material-metadata-packet',
    metadataGateSource: metadataGateSource(),
    metadataGateResult: metadataGateResult(),
    metadataPacket: metadataPacket(),
    expectedDecision: 'plan_pack_evidence_material_metadata_packet_validated',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    metadataGateSource: { ...base.metadataGateSource, ...(overrides.metadataGateSource || {}) },
    metadataGateResult: metadataGateResult(overrides.metadataGateResult || {}),
    metadataPacket: metadataPacket(overrides.metadataPacket || {}),
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

test('CM2060 validates low-disclosure metadata packet entries from CM2059 slots only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.metadataPacketValidated, true);
  assert.equal(result.materialMetadataEntries.length, 3);
  assert.deepEqual(result.materialMetadataEntries.map(entry => entry.requiredMetadataKind), [
    'low_disclosure_phase2_exact_receipt_metadata',
    'low_disclosure_phase8_exact_receipt_metadata',
    'low_disclosure_external_review_or_tag_approval_metadata'
  ]);
  assert.equal(result.materialMetadataEntries.every(entry => entry.bodyFree === true), true);
  assert.equal(result.materialMetadataEntries.every(entry => entry.acceptedAsEvidenceNow === false), true);
  assert.equal(result.nextGate, 'await_separate_exact_authorization_and_low_disclosure_evidence_material_before_acceptance_or_application');
  assertNoSideEffects(result);
});

test('CM2060 rejects stale CM2059 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(validInput({
    metadataGateSource: { sourceValidationId: 'CMV-2159' },
    expectedDecision: 'plan_pack_evidence_material_metadata_packet_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_metadata_packet_blocked');
  assert.ok(result.blockers.includes('metadataGateSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2060 blocks rejected or stale metadata gate results before packet validation', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(validInput({
    metadataGateResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_metadata_gate_blocked',
      metadataGatePrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_metadata_packet_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_metadata_packet_blocked');
  assert.ok(result.blockers.includes('metadataGateResult.accepted'));
  assert.ok(result.blockers.includes('metadataGateResult.decision'));
  assert.ok(result.blockers.includes('metadataGateResult.metadataGatePrepared'));
  assertNoSideEffects(result);
});

test('CM2060 blocks slot and packet entry drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(validInput({
    metadataGateResult: {
      materialMetadataSlots: [
        { requestedItemCount: 8 }
      ]
    },
    metadataPacket: {
      metadataEntries: [
        { requestedItemCount: 9 }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_metadata_packet_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_metadata_packet_blocked');
  assert.ok(result.blockers.includes('metadataPacket.metadataEntries[0].requestedItemCount'));
  assertNoSideEffects(result);
});

test('CM2060 stops L4 on material acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(validInput({
    metadataGateResult: {
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    metadataPacket: {
      materialAcceptanceAllowed: true,
      evidenceApplicationAllowed: true,
      metadataEntries: [
        { acceptedAsEvidenceNow: true, canApplyNow: true }
      ]
    },
    counters: {
      evidenceMaterialAcceptances: 1,
      evidenceApplications: 1,
      completionAuditPatchApplications: 1,
      defaultRuntimeExpansions: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('metadataGateResult.evidenceMaterialAcceptedByThisContract'));
  assert.ok(result.blockers.includes('metadataPacket.materialAcceptanceAllowed'));
  assert.ok(result.blockers.includes('metadataPacket.metadataEntries[0].acceptedAsEvidenceNow'));
  assert.ok(result.blockers.includes('counters.evidenceMaterialAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2060 rejects raw material fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract({
    ...validInput(),
    material: {
      materialBody: 'do-not-echo-material-body',
      receiptPayload: 'do-not-echo-receipt',
      externalReviewText: 'do-not-echo-review'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_material_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'material.materialBody',
    'material.receiptPayload',
    'material.externalReviewText'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2060 metadata packet does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(validInput());
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
  assert.equal(result.materialMetadataEntries.every(entry => entry.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2060 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    futureMaterial: {
      materialValue: 'not-echoed',
      receiptRaw: 'not-echoed',
      operatorApprovalText: 'not-echoed'
    },
    safe: {
      metadataFamily: 'low_disclosure_phase2_exact_receipt_metadata'
    }
  });

  assert.deepEqual(forbidden, [
    'futureMaterial.materialValue',
    'futureMaterial.receiptRaw',
    'futureMaterial.operatorApprovalText'
  ]);
});
