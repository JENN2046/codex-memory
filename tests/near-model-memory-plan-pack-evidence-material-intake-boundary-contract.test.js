'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract');
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

function preflightSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2061',
    sourceValidationId: 'CMV-2162',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_preflight_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract',
    sourceContractMode: 'local_plan_pack_evidence_material_acceptance_preflight_only',
    ...overrides
  };
}

function acceptanceRequirements(overrides = []) {
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
      exactAuthorizationRequired: true,
      lowDisclosureEvidenceMaterialRequired: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canAcceptNow: false,
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
      exactAuthorizationRequired: true,
      lowDisclosureEvidenceMaterialRequired: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canAcceptNow: false,
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
      exactAuthorizationRequired: true,
      lowDisclosureEvidenceMaterialRequired: true,
      materialBodyAllowed: false,
      materialValueAllowed: false,
      canAcceptNow: false,
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
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract',
    contractMode: 'local_plan_pack_evidence_material_acceptance_preflight_only',
    decision: 'plan_pack_evidence_material_acceptance_preflight_prepared',
    blockers: [],
    acceptancePreflightPrepared: true,
    acceptanceRequirements: acceptanceRequirements(overrides.acceptanceRequirements || []),
    sourceTaskId: 'CM-2060',
    sourceValidationId: 'CMV-2161',
    nextGate: 'await_separate_exact_authorization_packet_and_low_disclosure_evidence_material_before_acceptance',
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
    acceptanceRequirements: acceptanceRequirements(overrides.acceptanceRequirements || [])
  };
}

function intakeBoundary(overrides = {}) {
  return {
    intakeBoundaryPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    preflightResultOnly: true,
    exactAuthorizationStillRequired: true,
    lowDisclosureEvidenceMaterialStillRequired: true,
    separateExactAuthorizationPacketRequired: true,
    separateLowDisclosureMaterialPacketRequired: true,
    rawAuthorizationAbsent: true,
    rawMaterialAbsent: true,
    materialBodyAbsent: true,
    materialValuesAbsent: true,
    intakeAcceptanceDeferred: true,
    evidenceAcceptanceDeferred: true,
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
    taskId: 'CM-2062',
    mode: 'local-plan-pack-evidence-material-intake-boundary',
    preflightSource: preflightSource(),
    preflightResult: preflightResult(),
    intakeBoundary: intakeBoundary(),
    expectedDecision: 'plan_pack_evidence_material_intake_boundary_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    preflightSource: { ...base.preflightSource, ...(overrides.preflightSource || {}) },
    preflightResult: preflightResult(overrides.preflightResult || {}),
    intakeBoundary: { ...base.intakeBoundary, ...(overrides.intakeBoundary || {}) },
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

test('CM2062 prepares material intake requirements from CM2061 preflight only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.materialIntakeBoundaryPrepared, true);
  assert.equal(result.intakeRequirements.length, 3);
  assert.deepEqual(result.intakeRequirements.map(item => item.requiredMaterialKind), [
    'future_low_disclosure_phase2_exact_receipt_material',
    'future_low_disclosure_phase8_exact_receipt_material',
    'future_low_disclosure_external_review_or_tag_approval_material'
  ]);
  assert.equal(result.intakeRequirements.every(item => item.separateExactAuthorizationPacketRequired === true), true);
  assert.equal(result.intakeRequirements.every(item => item.separateLowDisclosureMaterialPacketRequired === true), true);
  assert.equal(result.intakeRequirements.every(item => item.intakeMetadataOnly === true), true);
  assert.equal(result.intakeRequirements.every(item => item.canAcceptAuthorizationNow === false), true);
  assert.equal(result.intakeRequirements.every(item => item.canAcceptMaterialNow === false), true);
  assert.equal(result.nextGate, 'await_actual_exact_authorization_packet_and_low_disclosure_material_for_manual_review_before_acceptance');
  assertNoSideEffects(result);
});

test('CM2062 rejects stale CM2061 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(validInput({
    preflightSource: { sourceValidationId: 'CMV-2161' },
    expectedDecision: 'plan_pack_evidence_material_intake_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_intake_boundary_blocked');
  assert.ok(result.blockers.includes('preflightSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2062 blocks rejected or stale acceptance preflight results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(validInput({
    preflightResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_acceptance_preflight_blocked',
      acceptancePreflightPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_intake_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_intake_boundary_blocked');
  assert.ok(result.blockers.includes('preflightResult.accepted'));
  assert.ok(result.blockers.includes('preflightResult.decision'));
  assert.ok(result.blockers.includes('preflightResult.acceptancePreflightPrepared'));
  assertNoSideEffects(result);
});

test('CM2062 blocks acceptance requirement drift before intake boundary', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(validInput({
    preflightResult: {
      acceptanceRequirements: [
        {
          canAcceptNow: true,
          materialBodyAllowed: true,
          acceptedAsEvidenceNow: true
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_intake_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_intake_boundary_blocked');
  assert.ok(result.blockers.includes('preflightResult.acceptanceRequirements[0].canAcceptNow'));
  assert.ok(result.blockers.includes('preflightResult.acceptanceRequirements[0].materialBodyAllowed'));
  assert.ok(result.blockers.includes('preflightResult.acceptanceRequirements[0].acceptedAsEvidenceNow'));
  assertNoSideEffects(result);
});

test('CM2062 stops L4 on material intake acceptance application runtime tag or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(validInput({
    preflightResult: {
      exactAuthorizationAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    intakeBoundary: {
      lowDisclosureEvidenceMaterialAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase9CompletionClaimed: true
    },
    counters: {
      intakeAcceptances: 1,
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
  assert.ok(result.blockers.includes('preflightResult.exactAuthorizationAcceptedByThisContract'));
  assert.ok(result.blockers.includes('preflightResult.evidenceMaterialAcceptedByThisContract'));
  assert.ok(result.blockers.includes('intakeBoundary.lowDisclosureEvidenceMaterialAcceptedByThisContract'));
  assert.ok(result.blockers.includes('intakeBoundary.phase9CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.intakeAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2062 rejects raw authorization and material intake fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract({
    ...validInput(),
    futureAuth: {
      exactAuthorizationPayload: 'do-not-echo-authorization',
      authorizationText: 'do-not-echo-authorization-text'
    },
    futureMaterial: {
      lowDisclosureMaterialBody: 'do-not-echo-material',
      intakeValue: 'do-not-echo-intake'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_authorization_material_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'futureAuth.exactAuthorizationPayload',
    'futureAuth.authorizationText',
    'futureMaterial.lowDisclosureMaterialBody',
    'futureMaterial.intakeValue'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2062 intake boundary does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(validInput());
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
  assert.equal(result.intakeRequirements.every(item => item.acceptedAsCompletionEvidenceNow === false), true);
  assertNoSideEffects(result);
});

test('CM2062 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    futureAuth: {
      exactAuthorizationValue: 'not-echoed'
    },
    futureMaterial: {
      evidenceMaterialBody: 'not-echoed',
      lowDisclosureMaterialValue: 'not-echoed'
    }
  });

  assert.deepEqual(forbidden, [
    'futureAuth.exactAuthorizationValue',
    'futureMaterial.evidenceMaterialBody',
    'futureMaterial.lowDisclosureMaterialValue'
  ]);
});
