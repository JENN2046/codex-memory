'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');
const {
  EXACT_RECEIPT_REQUIREMENTS,
  EXTERNAL_REVIEW_FIELDS,
  buildRequiredTraceKeys,
  evaluateNearModelMemoryPlanPackEvidenceTraceMatrix
} = require('../src/core/NearModelMemoryPlanPackEvidenceTraceMatrix');
const {
  evaluateNearModelMemoryPlanPackRemainingEvidenceRoute
} = require('../src/core/NearModelMemoryPlanPackRemainingEvidenceRouteContract');
const {
  REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewRequestBoundaryContract,
  externalReviewRouteItemsFromRoute
} = require('../src/core/PlanPackExternalReviewRequestBoundaryContract');

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

function routeCounters() {
  return {
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeReadAttempts: 0,
    nativeWriteAttempts: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    providerApiCalls: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    tagCreateActions: 0,
    tagPushActions: 0,
    releasePublishActions: 0,
    deployActions: 0,
    cutoverActions: 0,
    readinessClaims: 0
  };
}

function boundaryCounters() {
  return {
    observationWindowsAccepted: 0,
    externalReviewsAccepted: 0,
    tagApprovalPacketsAccepted: 0,
    reviewBundleAcceptances: 0,
    reviewApplications: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
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
    readinessClaims: 0
  };
}

function traceEntryFor(required, status = 'accepted') {
  const isExact = (EXACT_RECEIPT_REQUIREMENTS[required.requirementId] || [])
    .includes(required.evidenceField);
  const isExternal = EXTERNAL_REVIEW_FIELDS.includes(required.evidenceField);

  return {
    scope: required.scope,
    requirementId: required.requirementId,
    evidenceField: required.evidenceField,
    status,
    evidenceKind: status === 'accepted'
      ? isExact
        ? 'exact_authorized_receipt'
        : isExternal
          ? 'external_review'
          : 'local_source_test'
      : isExact
        ? 'future_exact_authorized_receipt'
        : isExternal
          ? 'future_external_review'
          : 'missing',
    sourceRef: `docs/near-model-memory-plan-pack/external-review-request/${required.traceKey.replace(/:/g, '_')}.md`
  };
}

function traceResultForEvidence(evidence) {
  return evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries: buildRequiredTraceKeys().map(required =>
      traceEntryFor(required, evidence[required.evidenceField] === true ? 'accepted' : 'future_required')
    )
  });
}

function routeResultForEvidence(evidence) {
  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute({
    schemaVersion: 1,
    taskId: 'CM-2053',
    mode: 'local-plan-pack-remaining-evidence-route',
    completionAuditResult: evaluateNearModelMemoryPlanPackCompletionAudit({ evidence }),
    traceMatrixResult: traceResultForEvidence(evidence),
    expectedDecision: 'remaining_evidence_route_ready',
    counters: routeCounters()
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  return result;
}

function validRouteSource(overrides = {}) {
  return {
    sourceTaskId: 'CM-2053',
    sourceValidationId: 'CMV-2154',
    sourceReport: 'docs/near-model-memory-plan-pack/remaining_evidence_route_contract_report.md',
    sourceContractName: 'NearModelMemoryPlanPackRemainingEvidenceRouteContract',
    sourceContractMode: 'local_plan_pack_remaining_evidence_route_only',
    ...overrides
  };
}

function validRequestBoundary(overrides = {}) {
  return {
    boundaryPrepared: true,
    externalReviewEvidenceRequired: true,
    observationOrDogfoodReviewRequired: true,
    externalReviewRequired: true,
    tagApprovalPacketRequired: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    separateJennApprovalRequired: true,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    reviewBundleAcceptedByThisContract: false,
    reviewAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    tagPushed: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    localContractsAllowedToSatisfyExternalReview: false,
    phase9CompletionClaimed: false,
    phase10CompletionClaimed: false,
    releaseReadinessClaimed: false,
    fullPlanPackCompletionClaimed: false,
    ...overrides
  };
}

function evidenceWithExternalReviewGaps() {
  const evidence = fullEvidence();
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;
  return evidence;
}

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2056',
    mode: 'local-plan-pack-external-review-request-boundary',
    routeSource: validRouteSource(),
    routeResult: routeResultForEvidence(evidenceWithExternalReviewGaps()),
    requestBoundary: validRequestBoundary(),
    expectedDecision: 'plan_pack_external_review_request_boundary_prepared',
    counters: boundaryCounters()
  };

  return {
    ...base,
    ...overrides,
    routeSource: { ...base.routeSource, ...(overrides.routeSource || {}) },
    routeResult: { ...base.routeResult, ...(overrides.routeResult || {}) },
    requestBoundary: { ...base.requestBoundary, ...(overrides.requestBoundary || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.reviewAcceptedByThisContract, false);
  assert.equal(result.tagApprovalAcceptedByThisContract, false);
  assert.equal(result.reviewAppliedByThisContract, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.currentPhase9Completed, false);
  assert.equal(result.currentPhase10Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.defaultRuntimeExpanded, false);
  assert.equal(result.nativeReadExecuted, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.tagPushed, false);
  assert.equal(result.releasePublished, false);
  assert.equal(result.deploymentTriggered, false);
  assert.equal(result.cutoverPerformed, false);
}

test('CM2056 prepares Phase 9/10 external review request boundary from CM2053 route only', () => {
  const result = evaluatePlanPackExternalReviewRequestBoundaryContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.requestBoundaryPrepared, true);
  assert.equal(result.decision, 'plan_pack_external_review_request_boundary_prepared');
  assert.deepEqual(result.requestedReviewEvidenceFields, REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS);
  assert.equal(result.futureReviewRequests.length, REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.length);
  assert.deepEqual(
    result.futureReviewRequests.map(entry => entry.requiredEvidenceKind),
    [
      'future_observation_or_dogfood_review',
      'future_external_review',
      'future_external_review_bundle_application_receipt',
      'future_external_review',
      'future_tag_approval_packet',
      'future_external_review_bundle_application_receipt'
    ]
  );
  for (const entry of result.futureReviewRequests) {
    assert.equal(entry.separateJennApprovalRequired, true);
    assert.equal(entry.acceptedAsReviewNow, false);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_observation_external_review_and_tag_approval_before_completion_or_release_actions'
  );
  assertNoSideEffects(result);
});

test('CM2056 rejects absent or stale route evidence before request boundary preparation', () => {
  const result = evaluatePlanPackExternalReviewRequestBoundaryContract(validInput({
    routeSource: {
      sourceValidationId: 'CMV-2153'
    },
    expectedDecision: 'plan_pack_external_review_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_external_review_request_boundary_blocked');
  assert.ok(result.blockers.includes('routeSource.sourceValidationId'));
  assertNoSideEffects(result);
});

test('CM2056 blocks when the route has no external review gaps', () => {
  const evidence = fullEvidence();
  evidence.nativeSideEffectReceiptPassed = false;
  const result = evaluatePlanPackExternalReviewRequestBoundaryContract(validInput({
    routeResult: routeResultForEvidence(evidence),
    expectedDecision: 'plan_pack_external_review_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'plan_pack_external_review_request_boundary_blocked');
  assert.ok(result.blockers.includes('routeResult.routeCounts.external_review_required'));
  assert.ok(result.blockers.includes(
    'externalReviewRoute.phase:phase9_default_runtime_policy:observationOrDogfoodReviewPassed'
  ));
  assertNoSideEffects(result);
});

test('CM2056 stops L4 on review acceptance, tag action, default expansion, or readiness drift', () => {
  const result = evaluatePlanPackExternalReviewRequestBoundaryContract(validInput({
    routeResult: {
      tagCreated: true
    },
    requestBoundary: {
      reviewAcceptedByThisContract: true,
      defaultRuntimeExpanded: true,
      phase10CompletionClaimed: true
    },
    counters: {
      externalReviewsAccepted: 1,
      tagCreateActions: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('routeResult.tagCreated'));
  assert.ok(result.blockers.includes('requestBoundary.reviewAcceptedByThisContract'));
  assert.ok(result.blockers.includes('requestBoundary.defaultRuntimeExpanded'));
  assert.ok(result.blockers.includes('requestBoundary.phase10CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.externalReviewsAccepted'));
  assert.ok(result.blockers.includes('counters.tagCreateActions'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2056 rejects raw review and secret shaped fields by path without echoing values', () => {
  const result = evaluatePlanPackExternalReviewRequestBoundaryContract({
    ...validInput(),
    reviewTranscript: 'do-not-echo-review',
    nested: {
      reviewerIdentity: 'do-not-echo-reviewer',
      token: 'do-not-echo-token'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'reviewTranscript',
    'nested.reviewerIdentity',
    'nested.token'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  assertNoSideEffects(result);
});

test('CM2056 helper extracts Phase 9/10 external review route items only', () => {
  const routeResult = routeResultForEvidence(evidenceWithExternalReviewGaps());
  const fields = externalReviewRouteItemsFromRoute(routeResult);

  assert.deepEqual(fields, REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS);
});

test('CM2056 request boundary does not complete Phase 9 or Phase 10 in completion audit', () => {
  const result = evaluatePlanPackExternalReviewRequestBoundaryContract(validInput());
  assert.equal(result.accepted, true);

  const evidence = fullEvidence();
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  assert.equal(audit.accepted, false);
  assert.ok(audit.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(audit.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(audit.blockers.includes(
    'missing_phase9_default_runtime_policy_observationOrDogfoodReviewPassed'
  ));
  assert.ok(audit.blockers.includes(
    'missing_phase10_tag_release_readiness_tagApprovalPacketPassed'
  ));
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM2056 forbidden review collector paths are path-only', () => {
  const forbidden = collectForbiddenFields({
    review: {
      reviewBody: 'not-echoed',
      tagApprovalLine: 'not-echoed'
    },
    safe: {
      evidenceField: 'externalReviewPassed'
    }
  });

  assert.deepEqual(forbidden, ['review.reviewBody', 'review.tagApprovalLine']);
});
