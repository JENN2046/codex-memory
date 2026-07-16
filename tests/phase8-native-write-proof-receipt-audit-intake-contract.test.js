'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateNativeWriteRealRootProofReadinessGate
} = require('../src/core/NativeWriteRealRootProofReadinessGate');
const {
  PHASE8_RECEIPT_AUDIT_FIELDS,
  REQUIRED_EVIDENCE_MARKER,
  collectForbiddenFields,
  evaluatePhase8NativeWriteProofReceiptAuditIntakeContract
} = require('../src/core/Phase8NativeWriteProofReceiptAuditIntakeContract');

function readinessCounters() {
  return {
    approvalRequestsSubmitted: 0,
    approvalLineOperations: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeWriteAttempts: 0,
    memoryWrites: 0,
    durableMemoryWrites: 0,
    rollbackExecutions: 0,
    failureRecoveryExecutions: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function intakeCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    completionAuditPatchApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeWriteAttempts: 0,
    memoryWrites: 0,
    durableMemoryWrites: 0,
    rollbackExecutions: 0,
    failureRecoveryExecutions: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function validReadinessInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2014',
    mode: 'local-readiness-gate',
    p8ContractEvidence: {
      nativeWriteContractPreflightAccepted: true,
      prepareWriteDefined: true,
      commitWriteDefined: true,
      verifyWriteDefined: true,
      rollbackOrCompensateDefined: true,
      operatorFullSurfaceProofAccepted: true,
      defaultSurfacePreserved: true,
      commitMemoryDeltaNotPublic: true
    },
    approvalRequest: {
      approvalRequestPrepared: true,
      approvalRequestSubmitted: false,
      exactApprovalAccepted: false,
      freshCurrentSingleUseApproval: false,
      operatorIntentScopeBound: true,
      taskScopeBound: true,
      approvalLineGenerated: false,
      approvalLineValueDisclosed: false,
      durableWriteAuthorized: false,
      providerApiAuthorized: false,
      releaseDeployCutoverAuthorized: false,
      readinessClaimAuthorized: false
    },
    runtimeTarget: {
      targetReferencePrepared: true,
      targetReferenceCategory: 'real_root_safe_reference_category_only',
      realRootTargetRequired: true,
      realRootTargetEvidencePresent: true,
      endpointLocatorDisclosed: false,
      rawRuntimeStateDisclosed: false,
      vcpToolBoxRootModified: false
    },
    realRootProofPlan: {
      realRootDurableWriteRequired: true,
      nativeSideEffectReceiptRequired: true,
      verifyWriteRequired: true,
      scopeIsolationRequired: true,
      realRootDurableWriteObserved: false,
      nativeSideEffectReceiptObserved: false,
      verifyWritePassed: false,
      scopeIsolationVerified: false
    },
    rollbackDrillPlan: {
      rollbackDrillRequired: true,
      rollbackPlanPrepared: true,
      rollbackPlanLowDisclosure: true,
      rollbackDrillExecuted: false,
      rollbackReceiptObserved: false,
      compensationPathDefined: true
    },
    failureRecoveryPlan: {
      failureRecoveryRequired: true,
      failureRecoveryPlanPrepared: true,
      partialWriteRecoveryDefined: true,
      retryBudgetBounded: true,
      manualEscalationDefined: true,
      failureRecoveryDrillExecuted: false,
      failureRecoveryReceiptObserved: false
    },
    auditPlan: {
      auditReceiptRequired: true,
      lowDisclosureAuditReceiptPlanned: true,
      nativeSideEffectReceiptLinkPlanned: true,
      rollbackReceiptLinkPlanned: true,
      rawAuditIncluded: false
    },
    output: {
      lowDisclosureOnly: true,
      categoryOnlyApprovalRequest: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      rawMemoryIncluded: false,
      readinessClaimIncluded: false
    },
    expectedDecision: 'real_root_write_approval_request_ready_no_execution',
    counters: readinessCounters()
  };

  return {
    ...base,
    ...overrides,
    p8ContractEvidence: { ...base.p8ContractEvidence, ...(overrides.p8ContractEvidence || {}) },
    approvalRequest: { ...base.approvalRequest, ...(overrides.approvalRequest || {}) },
    runtimeTarget: { ...base.runtimeTarget, ...(overrides.runtimeTarget || {}) },
    realRootProofPlan: { ...base.realRootProofPlan, ...(overrides.realRootProofPlan || {}) },
    rollbackDrillPlan: { ...base.rollbackDrillPlan, ...(overrides.rollbackDrillPlan || {}) },
    failureRecoveryPlan: { ...base.failureRecoveryPlan, ...(overrides.failureRecoveryPlan || {}) },
    auditPlan: { ...base.auditPlan, ...(overrides.auditPlan || {}) },
    output: { ...base.output, ...(overrides.output || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function acceptedReadinessGateResult() {
  const result = evaluateNativeWriteRealRootProofReadinessGate(validReadinessInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  return {
    decision: result.decision,
    approvalRequestReady: result.approvalRequestReady,
    approvalRequestSubmitted: result.approvalRequestSubmitted,
    exactApprovalAccepted: result.exactApprovalAccepted,
    productionWriteProven: result.productionWriteProven,
    realRootDurableWriteProven: result.realRootDurableWriteProven,
    runtimeCalled: result.runtimeCalled,
    liveVcpToolBoxCalled: result.liveVcpToolBoxCalled,
    nativeWriteExecuted: result.nativeWriteExecuted,
    rollbackDrillExecuted: result.rollbackDrillExecuted,
    failureRecoveryExecuted: result.failureRecoveryExecuted,
    durableMutationPerformed: result.durableMutationPerformed,
    providerApiCalled: result.providerApiCalled,
    publicMcpExpanded: result.publicMcpExpanded,
    releaseDeployCutoverPerformed: result.releaseDeployCutoverPerformed,
    readinessClaimed: result.readinessClaimed
  };
}

function proposedAuditEvidence(marker = REQUIRED_EVIDENCE_MARKER) {
  return Object.fromEntries(PHASE8_RECEIPT_AUDIT_FIELDS.map(field => [field, marker]));
}

function validIntake(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2027',
    mode: 'local-native-write-receipt-audit-intake-preflight',
    prerequisites: {
      cm2012OperatorFullSurfaceProofGateAccepted: true,
      cm2013NativeWriteContractPreflightAccepted: true,
      cm2014RealRootWriteReadinessGateAccepted: true,
      cm2017CompletionAuditRequiresPhase8Proof: true,
      cm2024TraceMatrixRequiresExactReceiptEvidence: true,
      nativeWriteStillRequiresFutureExactApproval: true
    },
    readinessGateResult: acceptedReadinessGateResult(),
    auditIntake: {
      intakePrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      exactAuthorizedReceiptsRequiredBeforePatch: true,
      completionAuditPatchPrepared: true,
      completionAuditPatchApplied: false,
      phase8CompletionClaimed: false,
      productionWriteClaimed: false,
      localContractsAllowedToSatisfyExactReceipts: false
    },
    proposedAuditEvidence: proposedAuditEvidence(),
    expectedDecision: 'phase8_native_write_receipt_audit_intake_ready_for_future_exact_receipts',
    counters: intakeCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    readinessGateResult: {
      ...base.readinessGateResult,
      ...(overrides.readinessGateResult || {})
    },
    auditIntake: { ...base.auditIntake, ...(overrides.auditIntake || {}) },
    proposedAuditEvidence: {
      ...base.proposedAuditEvidence,
      ...(overrides.proposedAuditEvidence || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.currentPhase8Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.productionWriteProven, false);
  assert.equal(result.realRootDurableWriteProven, false);
  assert.equal(result.rollbackDrillExecuted, false);
  assert.equal(result.failureRecoveryExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPerformed, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2027 accepts Phase 8 native write receipt audit intake without applying evidence', () => {
  const result = evaluatePhase8NativeWriteProofReceiptAuditIntakeContract(validIntake());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.receiptAuditIntakeAccepted, true);
  assert.equal(result.decision, 'phase8_native_write_receipt_audit_intake_ready_for_future_exact_receipts');
  assert.deepEqual(result.requiredAuditEvidenceFields, PHASE8_RECEIPT_AUDIT_FIELDS);
  assert.equal(result.proposedCompletionAuditEvidence.length, PHASE8_RECEIPT_AUDIT_FIELDS.length);
  for (const entry of result.proposedCompletionAuditEvidence) {
    assert.equal(entry.marker, REQUIRED_EVIDENCE_MARKER);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_future_exact_authorized_native_write_receipts_before_completion_audit_patch_application'
  );
  assertNoSideEffects(result);
});

test('CM2027 blocks intake when prerequisite gate chain is absent', () => {
  const result = evaluatePhase8NativeWriteProofReceiptAuditIntakeContract(validIntake({
    prerequisites: {
      cm2014RealRootWriteReadinessGateAccepted: false,
      cm2024TraceMatrixRequiresExactReceiptEvidence: false
    },
    expectedDecision: 'phase8_native_write_receipt_audit_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2014RealRootWriteReadinessGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2024TraceMatrixRequiresExactReceiptEvidence'));
  assertNoSideEffects(result);
});

test('CM2027 blocks intake when readiness gate result is not accepted', () => {
  const result = evaluatePhase8NativeWriteProofReceiptAuditIntakeContract(validIntake({
    readinessGateResult: {
      decision: 'real_root_write_readiness_blocked_missing_prerequisites',
      approvalRequestReady: false
    },
    expectedDecision: 'phase8_native_write_receipt_audit_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('readinessGateResult.decision'));
  assert.ok(result.blockers.includes('readinessGateResult.approvalRequestReady'));
  assertNoSideEffects(result);
});

test('CM2027 rejects proposed audit evidence that tries to mark native write proof complete now', () => {
  const result = evaluatePhase8NativeWriteProofReceiptAuditIntakeContract(validIntake({
    proposedAuditEvidence: {
      nativeSideEffectReceiptPassed: true,
      realRootDurableWriteProofPassed: true,
      verifyWritePassed: true
    },
    expectedDecision: 'phase8_native_write_receipt_audit_intake_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('proposedAuditEvidence.nativeSideEffectReceiptPassed'));
  assert.ok(result.blockers.includes('proposedAuditEvidence.realRootDurableWriteProofPassed'));
  assert.ok(result.blockers.includes('proposedAuditEvidence.verifyWritePassed'));
  assertNoSideEffects(result);
});

test('CM2027 stops L4 on approval execution patch production or readiness counters', () => {
  const result = evaluatePhase8NativeWriteProofReceiptAuditIntakeContract(validIntake({
    readinessGateResult: {
      exactApprovalAccepted: true,
      nativeWriteExecuted: true,
      rollbackDrillExecuted: true
    },
    auditIntake: {
      completionAuditPatchApplied: true,
      phase8CompletionClaimed: true,
      productionWriteClaimed: true
    },
    counters: {
      approvalGrantsAccepted: 1,
      completionAuditPatchApplications: 1,
      runtimeCalls: 1,
      nativeWriteAttempts: 1,
      memoryWrites: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('readinessGateResult.exactApprovalAccepted'));
  assert.ok(result.blockers.includes('readinessGateResult.nativeWriteExecuted'));
  assert.ok(result.blockers.includes('readinessGateResult.rollbackDrillExecuted'));
  assert.ok(result.blockers.includes('auditIntake.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('auditIntake.phase8CompletionClaimed'));
  assert.ok(result.blockers.includes('auditIntake.productionWriteClaimed'));
  assert.ok(result.blockers.includes('counters.nativeWriteAttempts'));
  assertNoSideEffects(result);
});

test('CM2027 rejects forbidden raw secret runtime fields by path without echoing values', () => {
  const result = evaluatePhase8NativeWriteProofReceiptAuditIntakeContract({
    ...validIntake(),
    unsafe: {
      responseBody: 'ECHO_RESPONSE',
      rollbackPayload: 'ECHO_ROLLBACK',
      approvalLineValue: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.responseBody',
    'unsafe.rollbackPayload',
    'unsafe.approvalLineValue',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_ROLLBACK'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2027 forbidden field collector reports paths only', () => {
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
