'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract');
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

function source(overrides = {}) {
  return {
    sourceTaskId: 'CM-2070',
    sourceValidationId: 'CMV-2171',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_reference_intake_execution_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract',
    sourceContractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_reference_intake_execution_only',
    ...overrides
  };
}

function intakeEntries(overrides = []) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    intakeEntryId: `${expected.routeId}_reviewed_decision_packet_reference_intake_entry`,
    sourceReferenceId: `${expected.routeId}_reviewed_decision_packet_reference`,
    sourceRequirementId: `${expected.routeId}_reviewed_decision_packet_intake_requirement`,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: EXPECTED_REQUESTED_ITEM_COUNTS_BY_ROUTE[expected.routeId],
    packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
    decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
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

function intakeResult(overrides = {}) {
  const entryOverrides = overrides.reviewedDecisionPacketReferenceIntakeEntries || [];
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract',
    contractMode: 'local_plan_pack_evidence_material_reviewed_decision_packet_reference_intake_execution_only',
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_executed',
    blockers: [],
    reviewedDecisionPacketReferenceIntakeExecuted: true,
    reviewedDecisionPacketReferenceIntakeEntries: intakeEntries(entryOverrides),
    sourceTaskId: 'CM-2069',
    sourceValidationId: 'CMV-2170',
    nextGate: 'await_reviewed_decision_packet_reference_review_boundary_before_acceptance_decision_or_material_acceptance',
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
    reviewedDecisionPacketReferenceIntakeEntries: intakeEntries(entryOverrides)
  };
}

function reviewBoundary(overrides = {}) {
  return {
    reviewedDecisionPacketReferenceReviewBoundaryPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    referenceOnly: true,
    intakeResultConsumed: true,
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
    taskId: 'CM-2071',
    mode: 'local-plan-pack-evidence-material-reviewed-decision-packet-reference-review-boundary',
    reviewedDecisionPacketReferenceIntakeSource: source(),
    reviewedDecisionPacketReferenceIntakeResult: intakeResult(),
    reviewedDecisionPacketReferenceReviewBoundary: reviewBoundary(),
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    reviewedDecisionPacketReferenceIntakeSource: {
      ...base.reviewedDecisionPacketReferenceIntakeSource,
      ...(overrides.reviewedDecisionPacketReferenceIntakeSource || {})
    },
    reviewedDecisionPacketReferenceIntakeResult: intakeResult(
      overrides.reviewedDecisionPacketReferenceIntakeResult || {}
    ),
    reviewedDecisionPacketReferenceReviewBoundary: {
      ...base.reviewedDecisionPacketReferenceReviewBoundary,
      ...(overrides.reviewedDecisionPacketReferenceReviewBoundary || {})
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

test('CM2071 prepares a reference review checklist from CM2070 intake only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.reviewedDecisionPacketReferenceReviewBoundaryPrepared, true);
  assert.equal(result.reviewedDecisionPacketReferenceReviewChecklist.length, 3);
  assert.equal(result.reviewedDecisionPacketReferenceReviewChecklist.every(item => item.referenceOnly), true);
  assert.equal(result.reviewedDecisionPacketReferenceReviewChecklist.every(item => item.bodyFree), true);
  assert.equal(result.reviewedDecisionPacketReferenceReviewChecklist.every(item => item.valueFree), true);
  assert.equal(
    result.reviewedDecisionPacketReferenceReviewChecklist.every(item => item.canAcceptDecisionPacketNow === false),
    true
  );
  assert.equal(result.sourceTaskId, 'CM-2070');
  assert.equal(result.sourceValidationId, 'CMV-2171');
  assert.equal(
    result.nextGate,
    'await_reference_reviewed_acceptance_decision_boundary_before_packet_or_material_acceptance'
  );
  assertNoSideEffects(result);
});

test('CM2071 rejects stale CM2070 source', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput({
    reviewedDecisionPacketReferenceIntakeSource: { sourceValidationId: 'CMV-2170' },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceIntakeSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2071 blocks rejected or stale reference intake result', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput({
    reviewedDecisionPacketReferenceIntakeResult: {
      accepted: false,
      decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked',
      reviewedDecisionPacketReferenceIntakeExecuted: false
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceIntakeResult.accepted'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceIntakeResult.decision'));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeExecuted'
  ));
  assertNoSideEffects(result);
});

test('CM2071 blocks reference intake entry drift before review boundary', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput({
    reviewedDecisionPacketReferenceIntakeResult: {
      reviewedDecisionPacketReferenceIntakeEntries: [
        {
          sourceReferenceId: 'stale_reference',
          requestedItemCount: 7
        }
      ]
    },
    expectedDecision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[0].sourceReferenceId'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[0].requestedItemCount'
  ));
  assertNoSideEffects(result);
});

test('CM2071 stops L4 on actual packet body value or acceptability drift in entries', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput({
    reviewedDecisionPacketReferenceIntakeResult: {
      reviewedDecisionPacketReferenceIntakeEntries: [
        {
          actualReviewedDecisionPacketPresent: true,
          reviewedDecisionPacketBodyPresent: true,
          canAcceptDecisionPacketNow: true
        }
      ]
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[0].actualReviewedDecisionPacketPresent'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[0].reviewedDecisionPacketBodyPresent'
  ));
  assert.ok(result.blockers.includes(
    'reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[0].canAcceptDecisionPacketNow'
  ));
  assertNoSideEffects(result);
});

test('CM2071 stops L4 on acceptance application runtime tag readiness or counter drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput({
    reviewedDecisionPacketReferenceIntakeResult: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      evidenceMaterialAcceptedByThisContract: true
    },
    reviewedDecisionPacketReferenceReviewBoundary: {
      acceptanceDecisionPacketAcceptedByThisContract: true,
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      acceptanceDecisionPacketAcceptances: 1,
      evidenceApplications: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceIntakeResult.acceptanceDecisionPacketAcceptedByThisContract'));
  assert.ok(result.blockers.includes('reviewedDecisionPacketReferenceReviewBoundary.acceptanceDecisionPacketAcceptedByThisContract'));
  assert.ok(result.blockers.includes('counters.acceptanceDecisionPacketAcceptances'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2071 rejects raw reference review fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(validInput({
    packetContainer: {
      reviewedDecisionPacketReferenceReviewBody: 'DO_NOT_ECHO_PACKET',
      rawReferenceReviewValue: 'DO_NOT_ECHO_REFERENCE'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_reference_review_packet_authorization_material_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'packetContainer.reviewedDecisionPacketReferenceReviewBody',
    'packetContainer.rawReferenceReviewValue'
  ]);
  assert.equal(serialized.includes('DO_NOT_ECHO_PACKET'), false);
  assert.equal(serialized.includes('DO_NOT_ECHO_REFERENCE'), false);
});

test('CM2071 reference review boundary does not complete completion audit and reports paths only', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed = false;
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed'
  ));
  assert.deepEqual(collectForbiddenFields({
    rawReferenceReviewBody: 'DO_NOT_ECHO_A',
    nested: {
      reviewedDecisionPacketReferenceReviewValue: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawReferenceReviewBody',
    'nested.reviewedDecisionPacketReferenceReviewValue'
  ]);
});
