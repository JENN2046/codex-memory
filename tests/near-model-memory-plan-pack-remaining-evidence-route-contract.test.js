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
  classifyRequirement,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackRemainingEvidenceRoute
} = require('../src/core/NearModelMemoryPlanPackRemainingEvidenceRouteContract');

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

function counters() {
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
    sourceRef: `docs/near-model-memory-plan-pack/route/${required.traceKey.replace(/:/g, '_')}.md`
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

function routeInput(evidence, overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-2053',
    mode: 'local-plan-pack-remaining-evidence-route',
    completionAuditResult: evaluateNearModelMemoryPlanPackCompletionAudit({ evidence }),
    traceMatrixResult: traceResultForEvidence(evidence),
    expectedDecision: 'remaining_evidence_route_ready',
    counters: counters(),
    ...overrides
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.nativeReadExecuted, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.releasePublished, false);
  assert.equal(result.deploymentTriggered, false);
  assert.equal(result.cutoverPerformed, false);
}

test('CM2053 routes current exact receipt and external review gaps without claiming completion', () => {
  const evidence = fullEvidence();
  evidence.nativeReadProofPassed = false;
  evidence.phase2ReceiptBundleAppliedToCompletionAudit = false;
  evidence.nativeSideEffectReceiptPassed = false;
  evidence.phase8ReceiptBundleAppliedToCompletionAudit = false;
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;

  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute(routeInput(evidence));

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.routeAccepted, true);
  assert.equal(result.routeCounts.exact_authorized_receipt_required, 4);
  assert.equal(result.routeCounts.external_review_required, 4);
  assert.equal(
    result.nextGate,
    'collect_exact_authorized_receipts_under_separate_approval_before_completion_claims'
  );
  assert.deepEqual(result.routeSummary.exact_authorized_receipt_required.map(item => item.evidenceField).sort(), [
    'nativeReadProofPassed',
    'nativeSideEffectReceiptPassed',
    'phase2ReceiptBundleAppliedToCompletionAudit',
    'phase8ReceiptBundleAppliedToCompletionAudit'
  ]);
  assertNoSideEffects(result);
});

test('CM2053 prioritizes external review route when exact receipts are already present', () => {
  const evidence = fullEvidence();
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute(routeInput(evidence));

  assert.equal(result.accepted, true);
  assert.equal(result.routeCounts.exact_authorized_receipt_required, 0);
  assert.equal(result.routeCounts.external_review_required, 6);
  assert.equal(
    result.nextGate,
    'collect_external_review_observation_and_tag_approval_evidence_before_completion_claims'
  );
  assertNoSideEffects(result);
});

test('CM2053 routes local contract evidence separately from exact receipts and external review', () => {
  const evidence = fullEvidence();
  evidence.phase2ReceiptBundleReviewChainHardeningPassed = false;

  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute(routeInput(evidence));

  assert.equal(result.accepted, true);
  assert.equal(result.routeCounts.exact_authorized_receipt_required, 0);
  assert.equal(result.routeCounts.external_review_required, 0);
  assert.equal(result.routeCounts.local_contract_or_source_evidence_required, 1);
  assert.equal(
    result.routeSummary.local_contract_or_source_evidence_required[0].evidenceField,
    'phase2ReceiptBundleReviewChainHardeningPassed'
  );
  assert.equal(
    result.nextGate,
    'close_local_contract_or_source_evidence_gaps_before_completion_claims'
  );
  assertNoSideEffects(result);
});

test('CM2053 stops L4 when completion audit already claims full completion', () => {
  const evidence = fullEvidence();
  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute(routeInput(evidence, {
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('completionAuditResult.accepted'));
  assert.ok(result.blockers.includes('completionAuditResult.fullPlanPackCompleted'));
  assertNoSideEffects(result);
});

test('CM2053 stops L4 on route counters or trace side effects', () => {
  const evidence = fullEvidence();
  evidence.externalReviewPassed = false;
  const input = routeInput(evidence, {
    expectedDecision: 'stop_l4',
    counters: {
      ...counters(),
      runtimeCalls: 1,
      tagCreateActions: 1
    }
  });
  input.traceMatrixResult = {
    ...input.traceMatrixResult,
    runtimeCalled: true
  };

  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute(input);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('traceMatrixResult.runtimeCalled'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assert.ok(result.blockers.includes('counters.tagCreateActions'));
  assertNoSideEffects(result);
});

test('CM2053 rejects raw secret review fields by path without echoing values', () => {
  const evidence = fullEvidence();
  evidence.externalReviewPassed = false;
  const result = evaluateNearModelMemoryPlanPackRemainingEvidenceRoute({
    ...routeInput(evidence),
    unsafe: {
      reviewTranscript: 'ECHO_TRANSCRIPT',
      endpoint: 'ECHO_ENDPOINT',
      bearerToken: 'ECHO_TOKEN'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.reviewTranscript',
    'unsafe.endpoint',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_TRANSCRIPT'), false);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2053 classification helper preserves exact receipt and external review boundaries', () => {
  assert.equal(classifyRequirement({
    scope: 'phase',
    requirementId: 'phase2_readonly_realtime_native_memory',
    evidenceField: 'nativeReadProofPassed'
  }), 'exact_authorized_receipt_required');
  assert.equal(classifyRequirement({
    scope: 'phase',
    requirementId: 'phase10_tag_release_readiness',
    evidenceField: 'tagApprovalPacketPassed'
  }), 'external_review_required');
  assert.equal(classifyRequirement({
    scope: 'phase',
    requirementId: 'phase1_blocker_repairs',
    evidenceField: 'testAllPassed'
  }), 'local_command_gate_required');
  assert.equal(classifyRequirement({
    scope: 'invariant',
    requirementId: 'local_memory_retained',
    evidenceField: 'localMemoryRetained'
  }), 'objective_invariant_required');
});

test('CM2053 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawResponse: 'DO_NOT_ECHO_A',
    nested: {
      providerPayload: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawResponse',
    'nested.providerPayload'
  ]);
});
