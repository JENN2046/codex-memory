'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE2_EXACT_RECEIPT_FIELDS,
  PHASE2_REQUIREMENT_ID
} = require('../src/core/Phase2ExactReceiptRequestBoundaryContract');
const {
  PHASE8_EXACT_RECEIPT_FIELDS,
  PHASE8_REQUIREMENT_ID
} = require('../src/core/Phase8ExactReceiptRequestBoundaryContract');
const {
  REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS
} = require('../src/core/PlanPackExternalReviewRequestBoundaryContract');
const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceRequestPacketContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

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

function source(taskId, validationId, report, contractName, contractMode, overrides = {}) {
  return {
    sourceTaskId: taskId,
    sourceValidationId: validationId,
    sourceReport: report,
    sourceContractName: contractName,
    sourceContractMode: contractMode,
    ...overrides
  };
}

function phase2Source(overrides = {}) {
  return source(
    'CM-2054',
    'CMV-2155',
    'docs/near-model-memory-plan-pack/phase2_exact_receipt_request_boundary_report.md',
    'Phase2ExactReceiptRequestBoundaryContract',
    'local_phase2_exact_receipt_request_boundary_only',
    overrides
  );
}

function phase8Source(overrides = {}) {
  return source(
    'CM-2055',
    'CMV-2156',
    'docs/near-model-memory-plan-pack/phase8_exact_receipt_request_boundary_report.md',
    'Phase8ExactReceiptRequestBoundaryContract',
    'local_phase8_exact_receipt_request_boundary_only',
    overrides
  );
}

function externalReviewSource(overrides = {}) {
  return source(
    'CM-2056',
    'CMV-2157',
    'docs/near-model-memory-plan-pack/external_review_request_boundary_report.md',
    'PlanPackExternalReviewRequestBoundaryContract',
    'local_plan_pack_external_review_request_boundary_only',
    overrides
  );
}

function receiptRequests(phaseId, fields) {
  return fields.map(evidenceField => ({
    phaseId,
    evidenceField,
    requiredEvidenceKind: 'future_exact_authorized_receipt',
    separateJennApprovalRequired: true,
    acceptedAsReceiptNow: false,
    acceptedAsCompletionEvidenceNow: false
  }));
}

function reviewRequests() {
  return REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.map(item => ({
    phaseId: item.requirementId,
    evidenceField: item.evidenceField,
    requiredEvidenceKind: item.evidenceField === 'tagApprovalPacketPassed'
      ? 'future_tag_approval_packet'
      : item.evidenceField === 'observationOrDogfoodReviewPassed'
        ? 'future_observation_or_dogfood_review'
        : item.evidenceField === 'externalReviewEvidenceBundleAppliedToCompletionAudit'
          ? 'future_external_review_bundle_application_receipt'
          : 'future_external_review',
    separateJennApprovalRequired: true,
    acceptedAsReviewNow: false,
    acceptedAsCompletionEvidenceNow: false
  }));
}

function commonResultFlags(overrides = {}) {
  return {
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    ...overrides
  };
}

function phase2Result(overrides = {}) {
  return {
    accepted: true,
    contractName: 'Phase2ExactReceiptRequestBoundaryContract',
    contractMode: 'local_phase2_exact_receipt_request_boundary_only',
    decision: 'phase2_exact_receipt_request_boundary_prepared',
    blockers: [],
    requestBoundaryPrepared: true,
    phaseId: PHASE2_REQUIREMENT_ID,
    requestedReceiptEvidenceFields: [...PHASE2_EXACT_RECEIPT_FIELDS],
    futureReceiptRequests: receiptRequests(PHASE2_REQUIREMENT_ID, PHASE2_EXACT_RECEIPT_FIELDS),
    routeSourceTaskId: 'CM-2053',
    routeSourceValidationId: 'CMV-2154',
    receiptAcceptedByThisContract: false,
    receiptAppliedByThisContract: false,
    currentPhase2Completed: false,
    nativeReadExecuted: false,
    ...commonResultFlags(),
    ...overrides
  };
}

function phase8Result(overrides = {}) {
  return {
    accepted: true,
    contractName: 'Phase8ExactReceiptRequestBoundaryContract',
    contractMode: 'local_phase8_exact_receipt_request_boundary_only',
    decision: 'phase8_exact_receipt_request_boundary_prepared',
    blockers: [],
    requestBoundaryPrepared: true,
    phaseId: PHASE8_REQUIREMENT_ID,
    requestedReceiptEvidenceFields: [...PHASE8_EXACT_RECEIPT_FIELDS],
    futureReceiptRequests: receiptRequests(PHASE8_REQUIREMENT_ID, PHASE8_EXACT_RECEIPT_FIELDS),
    routeSourceTaskId: 'CM-2053',
    routeSourceValidationId: 'CMV-2154',
    receiptAcceptedByThisContract: false,
    receiptAppliedByThisContract: false,
    currentPhase8Completed: false,
    productionWriteProven: false,
    realRootDurableWriteProven: false,
    verifyWriteExecuted: false,
    rollbackDrillExecuted: false,
    failureRecoveryExecuted: false,
    ...commonResultFlags(),
    ...overrides
  };
}

function externalReviewResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'PlanPackExternalReviewRequestBoundaryContract',
    contractMode: 'local_plan_pack_external_review_request_boundary_only',
    decision: 'plan_pack_external_review_request_boundary_prepared',
    blockers: [],
    requestBoundaryPrepared: true,
    requestedReviewEvidenceFields: REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.map(item => ({ ...item })),
    futureReviewRequests: reviewRequests(),
    routeSourceTaskId: 'CM-2053',
    routeSourceValidationId: 'CMV-2154',
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    reviewAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    defaultRuntimeExpanded: false,
    nativeReadExecuted: false,
    tagPushed: false,
    ...commonResultFlags(),
    ...overrides
  };
}

function packetBoundary(overrides = {}) {
  return {
    packetPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    sourceRequestBoundariesOnly: true,
    separateJennApprovalRequired: true,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
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
    taskId: 'CM-2057',
    mode: 'local-plan-pack-evidence-request-packet',
    phase2Source: phase2Source(),
    phase8Source: phase8Source(),
    externalReviewSource: externalReviewSource(),
    phase2RequestResult: phase2Result(),
    phase8RequestResult: phase8Result(),
    externalReviewRequestResult: externalReviewResult(),
    packetBoundary: packetBoundary(),
    expectedDecision: 'plan_pack_evidence_request_packet_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    phase2Source: { ...base.phase2Source, ...(overrides.phase2Source || {}) },
    phase8Source: { ...base.phase8Source, ...(overrides.phase8Source || {}) },
    externalReviewSource: { ...base.externalReviewSource, ...(overrides.externalReviewSource || {}) },
    phase2RequestResult: { ...base.phase2RequestResult, ...(overrides.phase2RequestResult || {}) },
    phase8RequestResult: { ...base.phase8RequestResult, ...(overrides.phase8RequestResult || {}) },
    externalReviewRequestResult: {
      ...base.externalReviewRequestResult,
      ...(overrides.externalReviewRequestResult || {})
    },
    packetBoundary: { ...base.packetBoundary, ...(overrides.packetBoundary || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.receiptAcceptedByThisContract, false);
  assert.equal(result.reviewAcceptedByThisContract, false);
  assert.equal(result.tagApprovalAcceptedByThisContract, false);
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

test('CM2057 prepares a combined future evidence request packet only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.requestPacketPrepared, true);
  assert.equal(result.decision, 'plan_pack_evidence_request_packet_prepared');
  assert.deepEqual(result.sourceTaskIds, ['CM-2054', 'CM-2055', 'CM-2056']);
  assert.equal(result.requestPacket.packetKind, 'future_evidence_requests_only');
  assert.equal(result.requestPacket.acceptedAsEvidenceNow, false);
  assert.equal(result.requestPacket.acceptedAsCompletionEvidenceNow, false);
  assert.equal(result.requestPacket.counts.phase2ExactReceiptRequests, PHASE2_EXACT_RECEIPT_FIELDS.length);
  assert.equal(result.requestPacket.counts.phase8ExactReceiptRequests, PHASE8_EXACT_RECEIPT_FIELDS.length);
  assert.equal(
    result.requestPacket.counts.phase9Phase10ExternalReviewRequests,
    REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.length
  );
  assert.equal(
    result.requestPacket.counts.totalFutureRequests,
    PHASE2_EXACT_RECEIPT_FIELDS.length +
      PHASE8_EXACT_RECEIPT_FIELDS.length +
      REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.length
  );
  assert.equal(
    result.nextGate,
    'await_separate_evidence_authorization_review_or_receipts_before_any_application_or_completion_claim'
  );
  assertNoSideEffects(result);
});

test('CM2057 rejects stale source metadata before packet preparation', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract(validInput({
    externalReviewSource: {
      sourceTaskId: 'CM-2055'
    },
    expectedDecision: 'plan_pack_evidence_request_packet_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_request_packet_blocked');
  assert.ok(result.blockers.includes('externalReviewSource.sourceTaskId'));
  assertNoSideEffects(result);
});

test('CM2057 rejects missing accepted request-boundary result', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract(validInput({
    phase8RequestResult: {
      accepted: false,
      decision: 'phase8_exact_receipt_request_boundary_blocked'
    },
    expectedDecision: 'plan_pack_evidence_request_packet_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_request_packet_blocked');
  assert.ok(result.blockers.includes('phase8RequestResult.accepted'));
  assert.ok(result.blockers.includes('phase8RequestResult.decision'));
  assertNoSideEffects(result);
});

test('CM2057 stops L4 on evidence acceptance, patch, tag, runtime, or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract(validInput({
    externalReviewRequestResult: {
      reviewAcceptedByThisContract: true,
      tagCreated: true
    },
    packetBoundary: {
      evidenceAppliedByThisContract: true,
      phase10CompletionClaimed: true
    },
    counters: {
      reviewAcceptances: 1,
      completionAuditPatchApplications: 1,
      tagCreateActions: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('packetBoundary.evidenceAppliedByThisContract'));
  assert.ok(result.blockers.includes('packetBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('externalReviewRequestResult.reviewAcceptedByThisContract'));
  assert.ok(result.blockers.includes('externalReviewRequestResult.tagCreated'));
  assert.ok(result.blockers.includes('counters.reviewAcceptances'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assert.ok(result.blockers.includes('counters.tagCreateActions'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2057 rejects raw receipt review secret fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract({
    ...validInput(),
    nested: {
      receiptContent: 'do-not-echo-receipt',
      reviewTranscript: 'do-not-echo-review',
      token: 'do-not-echo-token'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'nested.receiptContent',
    'nested.reviewTranscript',
    'nested.token'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2057 packet does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract(validInput());
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
  assert.ok(audit.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(audit.incompletePhaseIds.includes('phase8_native_write_production_proof'));
  assert.ok(audit.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(audit.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.equal(result.requestPacket.acceptedAsCompletionEvidenceNow, false);
  assertNoSideEffects(result);
});

test('CM2057 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    request: {
      receiptValue: 'not-echoed',
      tagApprovalLine: 'not-echoed'
    },
    safe: {
      evidenceField: 'nativeReadProofPassed'
    }
  });

  assert.deepEqual(forbidden, ['request.receiptValue', 'request.tagApprovalLine']);
});
