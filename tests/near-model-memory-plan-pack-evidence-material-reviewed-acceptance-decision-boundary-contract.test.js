'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

const EXPECTED_REQUESTED_ITEM_COUNTS_BY_ROUTE = Object.freeze({
  phase2_exact_receipts_before_completion_audit_patch: 9,
  phase8_exact_receipts_before_completion_audit_patch: 9,
  phase9_phase10_external_review_before_completion_audit_patch: 6
});

const SIDE_EFFECT_FIELDS = Object.freeze([
  'manualReviewCompletedByThisContract',
  'acceptanceDecisionMadeByThisContract',
  'acceptanceDecisionSubmittedByThisContract',
  'acceptanceDecisionPacketAcceptedByThisContract',
  'exactAuthorizationAcceptedByThisContract',
  'lowDisclosureEvidenceMaterialAcceptedByThisContract',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceMaterialAcceptedByThisContract',
  'evidenceAppliedByThisContract',
  'completionAuditPatchApplied',
  'fullPlanPackCompleted',
  'readinessClaimed',
  'runtimeCalled',
  'nativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'defaultRuntimeExpanded',
  'tagCreated',
  'tagPushed',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed'
]);

function source(overrides = {}) {
  return {
    sourceTaskId: 'CM-2071',
    sourceValidationId: 'CMV-2172',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_reference_review_boundary_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract',
    sourceContractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_only',
    ...overrides
  };
}

function referenceReviewChecklist(overrides = []) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    reviewChecklistId: `${expected.routeId}_reviewed_decision_packet_reference_review_checklist`,
    sourceIntakeEntryId: `${expected.routeId}_reviewed_decision_packet_reference_intake_entry`,
    sourceReferenceId: `${expected.routeId}_reviewed_decision_packet_reference`,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: EXPECTED_REQUESTED_ITEM_COUNTS_BY_ROUTE[expected.routeId],
    packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
    decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
    reviewBoundaryKind: 'reference_review_boundary_before_acceptance_decision',
    referenceOnly: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    actualReviewedDecisionPacketPresent: false,
    reviewedDecisionPacketBodyPresent: false,
    reviewedDecisionPacketValuePresent: false,
    canAcceptDecisionPacketNow: false,
    canSubmitAcceptanceDecisionNow: false,
    canMakeAcceptanceDecisionNow: false,
    canAcceptEvidenceNow: false,
    canApplyNow: false,
    acceptedAsEvidenceNow: false,
    acceptedAsCompletionEvidenceNow: false,
    ...(overrides[index] || {})
  }));
}

function referenceReviewResult(overrides = {}) {
  const checklistOverrides = overrides.reviewedDecisionPacketReferenceReviewChecklist || [];
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract',
    contractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_only',
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_prepared',
    blockers: [],
    reviewedDecisionPacketReferenceReviewBoundaryPrepared: true,
    reviewedDecisionPacketReferenceReviewChecklist: referenceReviewChecklist(checklistOverrides),
    sourceTaskId: 'CM-2070',
    sourceValidationId: 'CMV-2171',
    nextGate: 'await_reference_reviewed_acceptance_decision_boundary_before_packet_or_material_acceptance',
    ...Object.fromEntries(SIDE_EFFECT_FIELDS.map(field => [field, false])),
    ...overrides,
    reviewedDecisionPacketReferenceReviewChecklist: referenceReviewChecklist(checklistOverrides)
  };
}

function decisionBoundary(overrides = {}) {
  return {
    reviewedAcceptanceDecisionBoundaryPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    referenceOnly: true,
    referenceReviewResultConsumed: true,
    actualReviewedDecisionPacketStillAbsent: true,
    reviewedDecisionPacketBodyAbsent: true,
    reviewedDecisionPacketValueAbsent: true,
    rawDecisionAbsent: true,
    rawAuthorizationAbsent: true,
    rawMaterialAbsent: true,
    packetAcceptanceDeferred: true,
    acceptanceDecisionSubmissionDeferred: true,
    acceptanceDecisionExecutionDeferred: true,
    evidenceAcceptanceDeferred: true,
    applicationDeferred: true,
    completionAuditPatchDeferred: true,
    ...Object.fromEntries(SIDE_EFFECT_FIELDS
      .filter(field => field !== 'fullPlanPackCompleted')
      .map(field => [field, false])),
    phase2CompletionClaimed: false,
    phase8CompletionClaimed: false,
    phase9CompletionClaimed: false,
    phase10CompletionClaimed: false,
    fullPlanPackCompletionClaimed: false,
    ...overrides
  };
}

function counters(overrides = {}) {
  return {
    reviewedAcceptanceDecisionBoundaryEntries: 3,
    reviewedDecisionPacketReferenceReviewEntries: 3,
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
    taskId: 'CM-2072',
    mode: 'local-plan-pack-evidence-material-reviewed-acceptance-decision-boundary',
    reviewedDecisionPacketReferenceReviewSource: source(),
    reviewedDecisionPacketReferenceReviewResult: referenceReviewResult(),
    reviewedAcceptanceDecisionBoundary: decisionBoundary(),
    expectedDecision: 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    reviewedDecisionPacketReferenceReviewSource: {
      ...base.reviewedDecisionPacketReferenceReviewSource,
      ...(overrides.reviewedDecisionPacketReferenceReviewSource || {})
    },
    reviewedDecisionPacketReferenceReviewResult: referenceReviewResult(
      overrides.reviewedDecisionPacketReferenceReviewResult || {}
    ),
    reviewedAcceptanceDecisionBoundary: decisionBoundary(
      overrides.reviewedAcceptanceDecisionBoundary || {}
    ),
    counters: counters(overrides.counters || {})
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
  SIDE_EFFECT_FIELDS.forEach(field => assert.equal(result[field], false, field));
}

test('CM2072 prepares reviewed acceptance decision boundary without accepting packet or material', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(validInput());

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_prepared');
  assert.equal(result.reviewedAcceptanceDecisionBoundaryPrepared, true);
  assert.equal(result.reviewedAcceptanceDecisionBoundaryChecklist.length, 3);
  assert.equal(result.reviewedAcceptanceDecisionBoundaryChecklist.every(entry =>
    entry.referenceOnly === true &&
    entry.bodyFree === true &&
    entry.valueFree === true &&
    entry.packetAcceptanceDeferred === true &&
    entry.acceptanceDecisionSubmissionDeferred === true &&
    entry.acceptanceDecisionExecutionDeferred === true &&
    entry.acceptedAsEvidenceNow === false &&
    entry.acceptedAsCompletionEvidenceNow === false
  ), true);
  assert.equal(result.nextGate,
    'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_packet_or_material_acceptance');
  assertNoSideEffects(result);
});

test('CM2072 blocks stale CM2071 source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(validInput({
    reviewedDecisionPacketReferenceReviewSource: { sourceValidationId: 'CMV-0000' },
    expectedDecision: 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceReviewSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2072 blocks rejected or stale reference review results', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(validInput({
    reviewedDecisionPacketReferenceReviewResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked',
      reviewedDecisionPacketReferenceReviewBoundaryPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceReviewResult.accepted'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceReviewResult.decision'));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewBoundaryPrepared'
  ));
  assertNoSideEffects(result);
});

test('CM2072 blocks reference review checklist drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(validInput({
    reviewedDecisionPacketReferenceReviewResult: {
      reviewedDecisionPacketReferenceReviewChecklist: [{
        sourceReferenceId: 'stale_reference',
        requestedItemCount: 7
      }]
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[0].sourceReferenceId'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[0].requestedItemCount'
  ));
  assertNoSideEffects(result);
});

test('CM2072 stops L4 on packet acceptability or material acceptance drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(validInput({
    reviewedDecisionPacketReferenceReviewResult: {
      reviewedDecisionPacketReferenceReviewChecklist: [{ canAcceptDecisionPacketNow: true }]
    },
    reviewedAcceptanceDecisionBoundary: { evidenceMaterialAcceptedByThisContract: true },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[0].canAcceptDecisionPacketNow'
  ));
  assert.ok(result.blockers.includes(
    'reviewedAcceptanceDecisionBoundary.evidenceMaterialAcceptedByThisContract'
  ));
  assertNoSideEffects(result);
});

test('CM2072 stops L4 on acceptance or runtime counters', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(validInput({
    counters: { acceptanceDecisions: 1, runtimeCalls: 1 },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('counters.acceptanceDecisions'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assertNoSideEffects(result);
});

test('CM2072 rejects raw acceptance decision fields by path only', () => {
  const input = validInput();
  input.reviewedAcceptanceDecisionBoundary.actualAcceptanceDecisionPacketBody = 'must-not-echo';
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode,
    'forbidden_raw_secret_acceptance_decision_packet_authorization_material_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'reviewedAcceptanceDecisionBoundary.actualAcceptanceDecisionPacketBody'
  ]);
  assert.equal(JSON.stringify(result).includes('must-not-echo'), false);
  assert.deepEqual(collectForbiddenFields(input), [
    'reviewedAcceptanceDecisionBoundary.actualAcceptanceDecisionPacketBody'
  ]);
  assertNoSideEffects(result);
});

test('CM2072 completion audit binding remains local contract evidence and does not complete the full plan pack', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed = false;
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});
