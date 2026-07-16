'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE2_EXACT_RECEIPT_FIELDS
} = require('../src/core/Phase2ExactReceiptRequestBoundaryContract');
const {
  PHASE8_EXACT_RECEIPT_FIELDS
} = require('../src/core/Phase8ExactReceiptRequestBoundaryContract');
const {
  REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS
} = require('../src/core/PlanPackExternalReviewRequestBoundaryContract');
const {
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract
} = require('../src/core/NearModelMemoryPlanPackEvidenceApplicationRouterContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function requestItems(fields, evidenceKind) {
  return fields.map(evidenceField => ({
    evidenceField,
    requiredEvidenceKind: evidenceKind,
    separateJennApprovalRequired: true,
    acceptedAsCompletionEvidenceNow: false
  }));
}

function requestPacket(overrides = {}) {
  const sections = {
    phase2ExactReceiptRequests: requestItems(PHASE2_EXACT_RECEIPT_FIELDS, 'future_exact_authorized_receipt'),
    phase8ExactReceiptRequests: requestItems(PHASE8_EXACT_RECEIPT_FIELDS, 'future_exact_authorized_receipt'),
    phase9Phase10ExternalReviewRequests: requestItems(
      REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.map(item => item.evidenceField),
      'future_external_review_or_tag_approval_packet'
    )
  };
  const counts = {
    phase2ExactReceiptRequests: sections.phase2ExactReceiptRequests.length,
    phase8ExactReceiptRequests: sections.phase8ExactReceiptRequests.length,
    phase9Phase10ExternalReviewRequests: sections.phase9Phase10ExternalReviewRequests.length,
    totalFutureRequests: sections.phase2ExactReceiptRequests.length +
      sections.phase8ExactReceiptRequests.length +
      sections.phase9Phase10ExternalReviewRequests.length
  };
  return {
    schemaVersion: 'near_model_memory_plan_pack_evidence_request_packet_v1',
    packetKind: 'future_evidence_requests_only',
    lowDisclosureOnly: true,
    categoryOnly: true,
    separateJennApprovalRequired: true,
    sections,
    counts,
    acceptedAsEvidenceNow: false,
    acceptedAsCompletionEvidenceNow: false,
    ...overrides,
    sections: { ...sections, ...(overrides.sections || {}) },
    counts: { ...counts, ...(overrides.counts || {}) }
  };
}

function packetSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2057',
    sourceValidationId: 'CMV-2158',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_request_packet_report.md',
    sourceContractName: 'NearModelMemoryPlanPackEvidenceRequestPacketContract',
    sourceContractMode: 'local_plan_pack_evidence_request_packet_only',
    ...overrides
  };
}

function packetResult(overrides = {}) {
  return {
    accepted: true,
    contractName: 'NearModelMemoryPlanPackEvidenceRequestPacketContract',
    contractMode: 'local_plan_pack_evidence_request_packet_only',
    decision: 'plan_pack_evidence_request_packet_prepared',
    blockers: [],
    requestPacketPrepared: true,
    requestPacket: requestPacket(overrides.requestPacket || {}),
    sourceTaskIds: ['CM-2054', 'CM-2055', 'CM-2056'],
    nextGate: 'await_separate_evidence_authorization_review_or_receipts_before_any_application_or_completion_claim',
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
    requestPacket: requestPacket(overrides.requestPacket || {})
  };
}

function applicationBoundary(overrides = {}) {
  return {
    routerPrepared: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    sourcePacketOnly: true,
    separateEvidenceRequired: true,
    separateJennApprovalRequired: true,
    applicationOrderPrepared: true,
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
    taskId: 'CM-2058',
    mode: 'local-plan-pack-evidence-application-router',
    packetSource: packetSource(),
    packetResult: packetResult(),
    applicationBoundary: applicationBoundary(),
    expectedDecision: 'plan_pack_evidence_application_router_prepared',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    packetSource: { ...base.packetSource, ...(overrides.packetSource || {}) },
    packetResult: packetResult(overrides.packetResult || {}),
    applicationBoundary: { ...base.applicationBoundary, ...(overrides.applicationBoundary || {}) },
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

test('CM2058 prepares future application routes from the CM2057 packet only', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.applicationRouterPrepared, true);
  assert.equal(result.decision, 'plan_pack_evidence_application_router_prepared');
  assert.deepEqual(result.applicationRoutes.map(route => route.routeId), [
    'phase2_exact_receipts_before_completion_audit_patch',
    'phase8_exact_receipts_before_completion_audit_patch',
    'phase9_phase10_external_review_before_completion_audit_patch'
  ]);
  assert.equal(result.applicationRoutes[0].requestedItemCount, PHASE2_EXACT_RECEIPT_FIELDS.length);
  assert.equal(result.applicationRoutes[1].requestedItemCount, PHASE8_EXACT_RECEIPT_FIELDS.length);
  assert.equal(result.applicationRoutes[2].requestedItemCount, REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.length);
  assert.equal(result.applicationRoutes.every(route => route.canApplyNow === false), true);
  assert.equal(result.nextGate, 'await_separate_evidence_material_before_application_or_completion_audit_patch');
  assertNoSideEffects(result);
});

test('CM2058 rejects stale packet source metadata', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(validInput({
    packetSource: { sourceValidationId: 'CMV-2157' },
    expectedDecision: 'plan_pack_evidence_application_router_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_application_router_blocked');
  assert.ok(result.blockers.includes('packetSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2058 blocks rejected or stale packet result before routing application', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(validInput({
    packetResult: {
      accepted: false,
      decision: 'plan_pack_evidence_request_packet_blocked',
      requestPacketPrepared: false
    },
    expectedDecision: 'plan_pack_evidence_application_router_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_application_router_blocked');
  assert.ok(result.blockers.includes('packetResult.accepted'));
  assert.ok(result.blockers.includes('packetResult.decision'));
  assert.ok(result.blockers.includes('packetResult.requestPacketPrepared'));
  assertNoSideEffects(result);
});

test('CM2058 blocks packet count drift before route preparation', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(validInput({
    packetResult: {
      requestPacket: {
        counts: {
          totalFutureRequests: 999
        }
      }
    },
    expectedDecision: 'plan_pack_evidence_application_router_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_evidence_application_router_blocked');
  assert.ok(result.blockers.includes('packetResult.requestPacket.counts.totalFutureRequests'));
  assertNoSideEffects(result);
});

test('CM2058 stops L4 on evidence application, runtime, tag, or readiness drift', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(validInput({
    packetResult: {
      evidenceAppliedByThisContract: true,
      defaultRuntimeExpanded: true
    },
    applicationBoundary: {
      completionAuditPatchApplied: true,
      phase10CompletionClaimed: true
    },
    counters: {
      evidenceApplications: 1,
      completionAuditPatchApplications: 1,
      defaultRuntimeExpansions: 1,
      tagCreateActions: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('packetResult.evidenceAppliedByThisContract'));
  assert.ok(result.blockers.includes('packetResult.defaultRuntimeExpanded'));
  assert.ok(result.blockers.includes('applicationBoundary.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('applicationBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.evidenceApplications'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2058 rejects raw evidence material fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract({
    ...validInput(),
    material: {
      receiptMaterial: 'do-not-echo-receipt',
      reviewMaterial: 'do-not-echo-review',
      approvalMaterial: 'do-not-echo-approval'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'material.receiptMaterial',
    'material.reviewMaterial',
    'material.approvalMaterial'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2058 router does not complete the plan pack in completion audit', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(validInput());
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
  assert.equal(result.applicationRoutes.every(route => route.canApplyNow === false), true);
  assertNoSideEffects(result);
});

test('CM2058 forbidden field collector reports paths only', () => {
  const forbidden = collectForbiddenFields({
    futureMaterial: {
      receiptValue: 'not-echoed',
      reviewTranscript: 'not-echoed',
      tagApprovalLine: 'not-echoed'
    },
    safe: {
      routeId: 'phase2_exact_receipts_before_completion_audit_patch'
    }
  });

  assert.deepEqual(forbidden, [
    'futureMaterial.receiptValue',
    'futureMaterial.reviewTranscript',
    'futureMaterial.tagApprovalLine'
  ]);
});
