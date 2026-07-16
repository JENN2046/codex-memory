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
  PHASE8_EXACT_RECEIPT_FIELDS,
  PHASE8_REQUIREMENT_ID,
  collectForbiddenFields,
  evaluatePhase8ExactReceiptRequestBoundaryContract,
  phase8ExactReceiptFieldsFromRoute
} = require('../src/core/Phase8ExactReceiptRequestBoundaryContract');

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
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptAcceptances: 0,
    receiptApplications: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeWriteAttempts: 0,
    memoryWrites: 0,
    durableMemoryWrites: 0,
    verifyWriteExecutions: 0,
    rollbackExecutions: 0,
    failureRecoveryExecutions: 0,
    auditRowReads: 0,
    outputDisclosureReads: 0,
    serviceStartStopActions: 0,
    processInspections: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
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
    sourceRef: `docs/near-model-memory-plan-pack/phase8-request/${required.traceKey.replace(/:/g, '_')}.md`
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
    phaseId: PHASE8_REQUIREMENT_ID,
    exactAuthorizedReceiptsRequired: true,
    lowDisclosureOnly: true,
    categoryOnly: true,
    separateJennApprovalRequired: true,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    receiptAppliedByThisContract: false,
    nativeWriteExecuted: false,
    productionWriteProven: false,
    realRootDurableWriteProven: false,
    verifyWriteExecuted: false,
    rollbackDrillExecuted: false,
    failureRecoveryExecuted: false,
    memoryWriteExecuted: false,
    durableMemoryWriteExecuted: false,
    auditRowsRead: false,
    outputDisclosureMaterialRead: false,
    localContractsAllowedToSatisfyExactReceipts: false,
    phase8CompletionClaimed: false,
    productionWriteClaimed: false,
    ...overrides
  };
}

function evidenceWithPhase8ExactGaps() {
  const evidence = fullEvidence();
  for (const field of PHASE8_EXACT_RECEIPT_FIELDS) evidence[field] = false;
  return evidence;
}

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2055',
    mode: 'local-phase8-exact-receipt-request-boundary',
    routeSource: validRouteSource(),
    routeResult: routeResultForEvidence(evidenceWithPhase8ExactGaps()),
    requestBoundary: validRequestBoundary(),
    expectedDecision: 'phase8_exact_receipt_request_boundary_prepared',
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
  assert.equal(result.receiptAcceptedByThisContract, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.currentPhase8Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.productionWriteProven, false);
  assert.equal(result.realRootDurableWriteProven, false);
  assert.equal(result.verifyWriteExecuted, false);
  assert.equal(result.rollbackDrillExecuted, false);
  assert.equal(result.failureRecoveryExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.releasePublished, false);
  assert.equal(result.deploymentTriggered, false);
  assert.equal(result.cutoverPerformed, false);
}

test('CM2055 prepares Phase 8 exact receipt request boundary from CM2053 route only', () => {
  const result = evaluatePhase8ExactReceiptRequestBoundaryContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.requestBoundaryPrepared, true);
  assert.equal(result.decision, 'phase8_exact_receipt_request_boundary_prepared');
  assert.deepEqual(result.requestedReceiptEvidenceFields, PHASE8_EXACT_RECEIPT_FIELDS);
  assert.equal(result.futureReceiptRequests.length, PHASE8_EXACT_RECEIPT_FIELDS.length);
  for (const entry of result.futureReceiptRequests) {
    assert.equal(entry.requiredEvidenceKind, 'future_exact_authorized_receipt');
    assert.equal(entry.separateJennApprovalRequired, true);
    assert.equal(entry.acceptedAsReceiptNow, false);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_separate_jenn_exact_authorization_before_phase8_receipt_collection_or_application'
  );
  assertNoSideEffects(result);
});

test('CM2055 rejects absent or stale route evidence before request boundary preparation', () => {
  const result = evaluatePhase8ExactReceiptRequestBoundaryContract(validInput({
    routeSource: {
      sourceTaskId: 'CM-2052'
    },
    expectedDecision: 'phase8_exact_receipt_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'phase8_exact_receipt_request_boundary_blocked');
  assert.ok(result.blockers.includes('routeSource.sourceTaskId'));
  assertNoSideEffects(result);
});

test('CM2055 blocks when the route has no exact receipt gaps', () => {
  const evidence = fullEvidence();
  evidence.externalReviewPassed = false;
  const result = evaluatePhase8ExactReceiptRequestBoundaryContract(validInput({
    routeResult: routeResultForEvidence(evidence),
    expectedDecision: 'phase8_exact_receipt_request_boundary_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'phase8_exact_receipt_request_boundary_blocked');
  assert.ok(result.blockers.includes('routeResult.nextGate'));
  assert.ok(result.blockers.includes('routeResult.routeCounts.exact_authorized_receipt_required'));
  assert.ok(result.blockers.includes('phase8ExactReceiptRoute.exactApprovalEnforcementPassed'));
  assertNoSideEffects(result);
});

test('CM2055 stops L4 on receipt acceptance, native-write, durable-write, or readiness drift', () => {
  const result = evaluatePhase8ExactReceiptRequestBoundaryContract(validInput({
    routeResult: {
      nativeWriteExecuted: true
    },
    requestBoundary: {
      receiptAcceptedByThisContract: true,
      nativeWriteExecuted: true,
      durableMemoryWriteExecuted: true
    },
    counters: {
      nativeWriteAttempts: 1,
      durableMemoryWrites: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('routeResult.nativeWriteExecuted'));
  assert.ok(result.blockers.includes('requestBoundary.receiptAcceptedByThisContract'));
  assert.ok(result.blockers.includes('requestBoundary.nativeWriteExecuted'));
  assert.ok(result.blockers.includes('requestBoundary.durableMemoryWriteExecuted'));
  assert.ok(result.blockers.includes('counters.nativeWriteAttempts'));
  assert.ok(result.blockers.includes('counters.durableMemoryWrites'));
  assert.ok(result.blockers.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2055 rejects raw secret receipt fields by path without echoing values', () => {
  const result = evaluatePhase8ExactReceiptRequestBoundaryContract({
    ...validInput(),
    unsafe: {
      responseBody: 'ECHO_RESPONSE',
      approvalLine: 'ECHO_APPROVAL',
      rollbackPayload: 'ECHO_ROLLBACK',
      receiptContent: 'ECHO_RECEIPT'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.responseBody',
    'unsafe.approvalLine',
    'unsafe.rollbackPayload',
    'unsafe.receiptContent'
  ]);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_ROLLBACK'), false);
  assert.equal(serialized.includes('ECHO_RECEIPT'), false);
});

test('CM2055 helper extracts only Phase 8 exact receipt fields from route summary', () => {
  const routeResult = routeResultForEvidence(evidenceWithPhase8ExactGaps());
  assert.deepEqual(
    phase8ExactReceiptFieldsFromRoute(routeResult),
    PHASE8_EXACT_RECEIPT_FIELDS
  );
});

test('CM2055 request boundary does not complete Phase 8 in completion audit', () => {
  const evidence = evidenceWithPhase8ExactGaps();
  evidence.phase8ExactReceiptRequestBoundaryPrepared = true;

  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  const phase8 = audit.phaseResults.find(phase => phase.id === PHASE8_REQUIREMENT_ID);

  assert.equal(audit.accepted, false);
  assert.equal(audit.fullPlanPackCompleted, false);
  assert.equal(phase8.accepted, false);
  assert.deepEqual(
    PHASE8_EXACT_RECEIPT_FIELDS.filter(field => phase8.missingEvidence.includes(field)),
    PHASE8_EXACT_RECEIPT_FIELDS
  );
});

test('CM2055 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    receiptBody: 'DO_NOT_ECHO_A',
    nested: {
      failurePayload: 'DO_NOT_ECHO_B'
    }
  }), [
    'receiptBody',
    'nested.failurePayload'
  ]);
});
