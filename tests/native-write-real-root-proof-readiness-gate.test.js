'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNativeWriteRealRootProofReadinessGate
} = require('../src/core/NativeWriteRealRootProofReadinessGate');

function zeroCounters() {
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
    counters: zeroCounters()
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

function assertNoSideEffects(result) {
  assert.equal(result.productionWriteProven, false);
  assert.equal(result.realRootDurableWriteProven, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.rollbackDrillExecuted, false);
  assert.equal(result.failureRecoveryExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPerformed, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2014 accepts real-root write approval request readiness without execution', () => {
  const result = evaluateNativeWriteRealRootProofReadinessGate(validReadinessInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'real_root_write_approval_request_ready_no_execution');
  assert.equal(result.approvalRequestReady, true);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.exactApprovalAccepted, false);
  assert.equal(result.nextGate, 'await_fresh_exact_approval_before_real_root_write_execution');
  assert.equal(result.lowDisclosureReceipt.lowDisclosure, true);
  assert.equal(result.lowDisclosureReceipt.realRootTargetEvidencePresent, true);
  assert.equal(result.lowDisclosureReceipt.rollbackPlanPrepared, true);
  assert.equal(result.lowDisclosureReceipt.failureRecoveryPlanPrepared, true);
  assertNoSideEffects(result);
});

test('CM2014 blocks readiness when Phase 8 contract preflight evidence is missing', () => {
  const result = evaluateNativeWriteRealRootProofReadinessGate(validReadinessInput({
    p8ContractEvidence: {
      nativeWriteContractPreflightAccepted: false
    },
    expectedDecision: 'real_root_write_readiness_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'real_root_write_readiness_blocked_missing_prerequisites');
  assert.ok(result.blockers.includes('p8ContractEvidence.nativeWriteContractPreflightAccepted'));
  assertNoSideEffects(result);
});

test('CM2014 blocks readiness when real-root target evidence is absent', () => {
  const result = evaluateNativeWriteRealRootProofReadinessGate(validReadinessInput({
    runtimeTarget: {
      realRootTargetEvidencePresent: false
    },
    expectedDecision: 'real_root_write_readiness_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('runtimeTarget.realRootTargetEvidencePresent'));
  assertNoSideEffects(result);
});

test('CM2014 blocks readiness when rollback or failure recovery plans are missing', () => {
  const result = evaluateNativeWriteRealRootProofReadinessGate(validReadinessInput({
    rollbackDrillPlan: {
      rollbackPlanPrepared: false
    },
    failureRecoveryPlan: {
      failureRecoveryPlanPrepared: false
    },
    expectedDecision: 'real_root_write_readiness_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('rollbackDrillPlan.rollbackPlanPrepared'));
  assert.ok(result.blockers.includes('failureRecoveryPlan.failureRecoveryPlanPrepared'));
  assertNoSideEffects(result);
});

test('CM2014 stops L4 if readiness input claims approval, execution, rollback, or recovery happened', () => {
  const result = evaluateNativeWriteRealRootProofReadinessGate(validReadinessInput({
    approvalRequest: {
      exactApprovalAccepted: true,
      durableWriteAuthorized: true
    },
    realRootProofPlan: {
      realRootDurableWriteObserved: true,
      nativeSideEffectReceiptObserved: true
    },
    rollbackDrillPlan: {
      rollbackDrillExecuted: true
    },
    failureRecoveryPlan: {
      failureRecoveryDrillExecuted: true
    },
    counters: {
      runtimeCalls: 1,
      nativeWriteAttempts: 1,
      memoryWrites: 1,
      rollbackExecutions: 1,
      failureRecoveryExecutions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('approvalRequest.exactApprovalAccepted'));
  assert.ok(result.blockers.includes('realRootProofPlan.realRootDurableWriteObserved'));
  assert.ok(result.blockers.includes('rollbackDrillPlan.rollbackDrillExecuted'));
  assert.ok(result.blockers.includes('failureRecoveryPlan.failureRecoveryDrillExecuted'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assertNoSideEffects(result);
});

test('CM2014 rejects raw secret runtime fields by path only', () => {
  const result = evaluateNativeWriteRealRootProofReadinessGate({
    ...validReadinessInput(),
    endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO',
    nested: {
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      token: 'SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, ['endpoint', 'nested.requestBody', 'nested.token']);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'), false);
  assertNoSideEffects(result);
});

test('CM2014 forbidden field collector reports paths only', () => {
  assert.deepEqual(
    collectForbiddenFields({
      safe: true,
      nested: [{ rawAudit: 'SYNTHETIC_RAW_AUDIT_SHOULD_NOT_ECHO' }]
    }),
    ['nested[0].rawAudit']
  );
});
