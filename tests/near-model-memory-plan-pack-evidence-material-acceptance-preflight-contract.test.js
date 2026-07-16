'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');
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

function metadataPacketSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2060',
    sourceValidationId: 'CMV-2161',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_metadata_packet_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract',
    sourceContractMode: 'local_plan_pack_evidence_material_metadata_packet_only',
    ...overrides
  };
}

function materialMetadataEntries(overrides = []) {
  const base = [
    {
      slotId: 'phase2_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase2_exact_receipt_metadata',
      requestedItemCount: 9,
      lowDisclosureOnly: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false,
      canApplyNow: false
    },
    {
      slotId: 'phase8_exact_receipts_before_completion_audit_patch_metadata_slot',
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      requiredMetadataKind: 'low_disclosure_phase8_exact_receipt_metadata',
      requestedItemCount: 9,
      lowDisclosureOnly: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false,
      canApplyNow: false
    },
    {
      slotId: 'phase9_phase10_external_review_before_completion_audit_patch_metadata_slot',
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
      requiredMetadataKind: 'low_disclosure_external_review_or_tag_approval_metadata',
      requestedItemCount: 6,
      lowDisclosureOnly: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false,
      canApplyNow: false
    }
  ];
  return base.map((entry, index) => ({ ...entry, ...(overrides[index] || {}) }));
}

function metadataPacketResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract',
    contractMode: 'local_plan_pack_evidence_material_metadata_packet_only',
    decision: 'plan_pack_evidence_material_metadata_packet_validated',
    blockers: [],
    metadataPacketValidated: true,
    materialMetadataEntries: materialMetadataEntries(overrides.materialMetadataEntries || []),
    sourceTaskId: 'CM-2059',
    sourceValidationId: 'CMV-2160',
    nextGate: 'await_separate_exact_authorization_and_low_disclosure_evidence_material_before_acceptance_or_application',
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
    materialMetadataEntries: materialMetadataEntries(overrides.materialMetadataEntries || [])
  };
}

function acceptanceBoundary(overrides = {}) {
  return {
    acceptancePreflightPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    metadataPacketOnly: true,
    exactAuthorizationRequired: true,
    lowDisclosureEvidenceMaterialRequired: true,
    materialBodyAbsent: true,
    materialValuesAbsent: true,
    acceptanceDeferred: true,
    applicationDeferred: true,
    completionAuditPatchDeferred: true,
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
    taskId: 'CM-2061',
    mode: 'local-plan-pack-evidence-material-acceptance-preflight',
    metadataPacketSource: metadataPacketSource(),
    metadataPacketResult: metadataPacketResult(),
    acceptanceBoundary: acceptanceBoundary(),
    expectedDecision: 'plan_pack_evidence_material_acceptance_preflight_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    metadataPacketSource: { ...base.metadataPacketSource, ...(overrides.metadataPacketSource || {}) },
    metadataPacketResult: metadataPacketResult(overrides.metadataPacketResult || {}),
    acceptanceBoundary: { ...base.acceptanceBoundary, ...(overrides.acceptanceBoundary || {}) },
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

test('CM2061 prepares exact authorization and material acceptance requirements from CM2060 only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.acceptancePreflightPrepared, true);
  assert.equal(result.acceptanceRequirements.length, 3);
  assert.deepEqual(result.acceptanceRequirements.map(item => item.requiredAuthorizationKind), [
    'future_phase2_exact_authorization_packet',
    'future_phase8_exact_authorization_packet',
    'future_phase9_phase10_review_or_tag_approval_authorization_packet'
  ]);
  assert.equal(result.acceptanceRequirements.every(item => item.exactAuthorizationRequired === true), true);
  assert.equal(result.acceptanceRequirements.every(item => item.lowDisclosureEvidenceMaterialRequired === true), true);
  assert.equal(result.acceptanceRequirements.every(item => item.canAcceptNow === false), true);
  assert.equal(result.nextGate, 'await_separate_exact_authorization_packet_and_low_disclosure_evidence_material_before_acceptance');
  assertNoSideEffects(result);
});

test('CM2061 rejects stale CM2060 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(validInput({
    metadataPacketSource: { sourceValidationId: 'CMV-2160' },
    expectedDecision: 'plan_pack_evidence_material_acceptance_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_preflight_blocked');
  assert.ok(result.blockers.includes('metadataPacketSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2061 blocks rejected or stale metadata packet results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(validInput({
    metadataPacketResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_metadata_packet_blocked',
      metadataPacketValidated: false
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_preflight_blocked');
  assert.ok(result.blockers.includes('metadataPacketResult.accepted'));
  assert.ok(result.blockers.includes('metadataPacketResult.decision'));
  assert.ok(result.blockers.includes('metadataPacketResult.metadataPacketValidated'));
  assertNoSideEffects(result);
});

test('CM2061 blocks metadata entry drift before acceptance preflight', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(validInput({
    metadataPacketResult: {
      materialMetadataEntries: [
        { acceptedAsEvidenceNow: true }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_acceptance_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_acceptance_preflight_blocked');
  assert.ok(result.blockers.includes('metadataPacketResult.materialMetadataEntries[0].acceptedAsEvidenceNow'));
  assertNoSideEffects(result);
});

test('CM2061 stops L4 on exact authorization material acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(validInput({
    metadataPacketResult: {
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    acceptanceBoundary: {
      exactAuthorizationAcceptedByThisContract: true,
      lowDisclosureEvidenceMaterialAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      exactAuthorizationAcceptances: 1,
      lowDisclosureEvidenceMaterialAcceptances: 1,
      evidenceApplications: 1,
      defaultRuntimeExpansions: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('metadataPacketResult.evidenceMaterialAcceptedByThisContract'));
  assert.ok(result.blockers.includes('acceptanceBoundary.exactAuthorizationAcceptedByThisContract'));
  assert.ok(result.blockers.includes('acceptanceBoundary.lowDisclosureEvidenceMaterialAcceptedByThisContract'));
  assert.ok(result.blockers.includes('acceptanceBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.exactAuthorizationAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2061 rejects raw authorization and material fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract({
    ...validInput(),
    future: {
      exactAuthorizationPayload: 'do-not-echo-authorization',
      evidenceMaterialPayload: 'do-not-echo-material',
      approvalLineValue: 'do-not-echo-approval'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_authorization_material_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'future.exactAuthorizationPayload',
    'future.evidenceMaterialPayload',
    'future.approvalLineValue'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2061 acceptance preflight does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(validInput());
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
  assert.equal(result.acceptanceRequirements.every(item => item.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2061 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    futureAuthorization: {
      exactAuthorizationValue: 'not-echoed',
      authorizationText: 'not-echoed'
    },
    futureMaterial: {
      evidenceMaterialBody: 'not-echoed'
    }
  });

  assert.deepEqual(forbidden, [
    'futureAuthorization.exactAuthorizationValue',
    'futureAuthorization.authorizationText',
    'futureMaterial.evidenceMaterialBody'
  ]);
});
