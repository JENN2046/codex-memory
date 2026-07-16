'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialMetadataGateContract');
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

function routerSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2058',
    sourceValidationId: 'CMV-2159',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_application_router_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceApplicationRouterContract',
    sourceContractMode: 'local_plan_pack_evidence_application_router_only',
    ...overrides
  };
}

function applicationRoutes(overrides = []) {
  const base = [
    {
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      canApplyNow: false,
      requiredBeforeApplication: 'separate_phase2_exact_receipts_and_receipt_bundle_application_evidence'
    },
    {
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      requestedItemCount: 9,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      canApplyNow: false,
      requiredBeforeApplication: 'separate_phase8_exact_native_write_receipts_and_receipt_bundle_application_evidence'
    },
    {
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      requestedItemCount: 6,
      requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
      canApplyNow: false,
      requiredBeforeApplication: 'separate_observation_external_review_tag_approval_and_review_bundle_application_evidence'
    }
  ];
  return base.map((route, index) => ({ ...route, ...(overrides[index] || {}) }));
}

function routerResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceApplicationRouterContract',
    contractMode: 'local_plan_pack_evidence_application_router_only',
    decision: 'plan_pack_evidence_application_router_prepared',
    blockers: [],
    applicationRouterPrepared: true,
    applicationRoutes: applicationRoutes(overrides.applicationRoutes || []),
    sourceTaskId: 'CM-2057',
    sourceValidationId: 'CMV-2158',
    nextGate: 'await_separate_evidence_material_before_application_or_completion_audit_patch',
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
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
    applicationRoutes: applicationRoutes(overrides.applicationRoutes || [])
  };
}

function metadataBoundary(overrides = {}) {
  return {
    metadataGatePrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    routerResultOnly: true,
    materialBodyAbsent: true,
    materialValuesAbsent: true,
    metadataSlotsPrepared: true,
    separateEvidenceMaterialRequired: true,
    separateJennApprovalRequired: true,
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
    taskId: 'CM-2059',
    mode: 'local-plan-pack-evidence-material-metadata-gate',
    routerSource: routerSource(),
    routerResult: routerResult(),
    metadataBoundary: metadataBoundary(),
    expectedDecision: 'plan_pack_evidence_material_metadata_gate_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    routerSource: { ...base.routerSource, ...(overrides.routerSource || {}) },
    routerResult: routerResult(overrides.routerResult || {}),
    metadataBoundary: { ...base.metadataBoundary, ...(overrides.metadataBoundary || {}) },
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

test('CM2059 prepares low-disclosure material metadata slots from CM2058 router only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.metadataGatePrepared, true);
  assert.equal(result.materialMetadataSlots.length, 3);
  assert.deepEqual(result.materialMetadataSlots.map(slot => slot.requiredMetadataKind), [
    'low_disclosure_phase2_exact_receipt_metadata',
    'low_disclosure_phase8_exact_receipt_metadata',
    'low_disclosure_external_review_or_tag_approval_metadata'
  ]);
  assert.equal(result.materialMetadataSlots.every(slot => slot.materialBodyAllowed === false), true);
  assert.equal(result.materialMetadataSlots.every(slot => slot.canAcceptMaterialNow === false), true);
  assert.equal(result.materialMetadataSlots.every(slot => slot.acceptedAsCompletionEvidenceNow === false), true);
  assert.equal(result.nextGate, 'await_separate_low_disclosure_evidence_material_metadata_before_any_acceptance_or_application');
  assertNoSideEffects(result);
});

test('CM2059 rejects stale router source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(validInput({
    routerSource: { sourceValidationId: 'CMV-2158' },
    expectedDecision: 'plan_pack_evidence_material_metadata_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_metadata_gate_blocked');
  assert.ok(result.blockers.includes('routerSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2059 blocks rejected or stale router results before slot preparation', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(validInput({
    routerResult: {
      accepted: false,
      decision: 'plan_pack_evidence_application_router_blocked',
      applicationRouterPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_metadata_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_metadata_gate_blocked');
  assert.ok(result.blockers.includes('routerResult.accepted'));
  assert.ok(result.blockers.includes('routerResult.decision'));
  assert.ok(result.blockers.includes('routerResult.applicationRouterPrepared'));
  assertNoSideEffects(result);
});

test('CM2059 blocks route drift and current application attempts', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(validInput({
    routerResult: {
      applicationRoutes: [
        { routeId: 'phase2_exact_receipts_before_completion_audit_patch', canApplyNow: true }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_metadata_gate_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_metadata_gate_blocked');
  assert.ok(result.blockers.includes('routerResult.applicationRoutes[0].canApplyNow'));
  assertNoSideEffects(result);
});

test('CM2059 stops L4 on material acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(validInput({
    routerResult: {
      evidenceAppliedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    metadataBoundary: {
      evidenceMaterialAcceptedByThisContract: true,
      completionAuditPatchApplied: true,
      phase8CompletionClaimed: true
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
  assert.ok(result.blockers.includes('routerResult.evidenceAppliedByThisContract'));
  assert.ok(result.blockers.includes('metadataBoundary.evidenceMaterialAcceptedByThisContract'));
  assert.ok(result.blockers.includes('metadataBoundary.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('metadataBoundary.phase8CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.evidenceMaterialAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2059 rejects raw evidence material fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract({
    ...validInput(),
    material: {
      receiptPayload: 'do-not-echo-receipt',
      reviewPayload: 'do-not-echo-review',
      approvalPayload: 'do-not-echo-approval'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'material.receiptPayload',
    'material.reviewPayload',
    'material.approvalPayload'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2059 metadata slots do not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(validInput());
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
  assert.equal(result.materialMetadataSlots.every(slot => slot.acceptedAsEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2059 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    futureMaterial: {
      receiptValue: 'not-echoed',
      reviewTranscript: 'not-echoed',
      tagApprovalLine: 'not-echoed'
    },
    safe: {
      slotId: 'phase2_exact_receipts_before_completion_audit_patch_metadata_slot'
    }
  });

  assert.deepEqual(forbidden, [
    'futureMaterial.receiptValue',
    'futureMaterial.reviewTranscript',
    'futureMaterial.tagApprovalLine'
  ]);
});
