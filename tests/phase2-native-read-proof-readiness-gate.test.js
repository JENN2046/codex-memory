'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReadinessGate
} = require('../src/core/Phase2NativeReadProofReadinessGate');

function zeroCounters() {
  return {
    approvalRequestsSubmitted: 0,
    approvalLineOperations: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeReadAttempts: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    serviceStartStopActions: 0,
    processInspections: 0,
    providerApiCalls: 0,
    nativeWriteAttempts: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function validReadinessInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2020',
    mode: 'local-readiness-gate',
    phase2GateEvidence: {
      evidenceGateImplemented: true,
      evidenceGateFailClosed: true,
      defaultSurfaceBoundaryModeled: true,
      forbiddenDefaultMutationToolsModeled: true,
      lowDisclosureInputGuardModeled: true,
      completionAuditStillRequiresReceipts: true
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
      liveReadAuthorized: false,
      serviceStartAuthorized: false,
      processInspectionAuthorized: false,
      providerApiAuthorized: false,
      readinessClaimAuthorized: false
    },
    runtimeTarget: {
      targetReferencePrepared: true,
      targetReferenceCategory: 'operator_vcp_toolbox_safe_reference_category_only',
      nativeTargetBindingRequired: true,
      nativeTargetBindingReceiptPresent: false,
      endpointLocatorDisclosed: false,
      rawRuntimeStateDisclosed: false,
      vcpToolBoxRootModified: false
    },
    liveReadPlan: {
      nativeReadRequired: true,
      governedReadOnlyToolsOnly: true,
      searchMemoryProbePlanned: true,
      memoryOverviewProbePlanned: true,
      auditMemoryProbePlanned: true,
      readSuitePlanned: true,
      nativeReadAttempted: false,
      nativeReadSucceeded: false,
      nativeReadReceiptObserved: false,
      wslLinuxProofRequired: true,
      windowsWslSmokeRequired: true,
      wslLinuxProofObserved: false,
      windowsWslSmokeObserved: false
    },
    fallbackPlan: {
      fallbackDistinctionRequired: true,
      localFallbackAllowedForFailure: true,
      nativeVsFallbackReceiptSeparated: true,
      fallbackMisrepresentedAsNative: false
    },
    auditPlan: {
      auditReceiptRequired: true,
      lowDisclosureAuditReceiptPlanned: true,
      nativeTargetReadFallbackLinksPlanned: true,
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
    expectedDecision: 'native_read_proof_approval_request_ready_no_execution',
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    phase2GateEvidence: { ...base.phase2GateEvidence, ...(overrides.phase2GateEvidence || {}) },
    approvalRequest: { ...base.approvalRequest, ...(overrides.approvalRequest || {}) },
    runtimeTarget: { ...base.runtimeTarget, ...(overrides.runtimeTarget || {}) },
    liveReadPlan: { ...base.liveReadPlan, ...(overrides.liveReadPlan || {}) },
    fallbackPlan: { ...base.fallbackPlan, ...(overrides.fallbackPlan || {}) },
    auditPlan: { ...base.auditPlan, ...(overrides.auditPlan || {}) },
    output: { ...base.output, ...(overrides.output || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.nativeReadProofProven, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.nativeReadAttempted, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.serviceStartStopPerformed, false);
  assert.equal(result.processInspectionPerformed, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPerformed, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2020 accepts native read proof approval request readiness without execution', () => {
  const result = evaluatePhase2NativeReadProofReadinessGate(validReadinessInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'native_read_proof_approval_request_ready_no_execution');
  assert.equal(result.approvalRequestReady, true);
  assert.equal(result.nativeReadProofReady, true);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.exactApprovalAccepted, false);
  assert.equal(result.nextGate, 'await_fresh_exact_approval_before_live_native_read_proof');
  assert.equal(result.lowDisclosureReceipt.lowDisclosure, true);
  assert.equal(result.lowDisclosureReceipt.nativeReadRequired, true);
  assert.equal(result.lowDisclosureReceipt.fallbackReceiptSeparated, true);
  assert.equal(result.lowDisclosureReceipt.memoryRead, false);
  assertNoSideEffects(result);
});

test('CM2020 blocks readiness when the CM2019 evidence gate prerequisites are missing', () => {
  const result = evaluatePhase2NativeReadProofReadinessGate(validReadinessInput({
    phase2GateEvidence: {
      evidenceGateImplemented: false,
      lowDisclosureInputGuardModeled: false
    },
    expectedDecision: 'native_read_proof_readiness_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'native_read_proof_readiness_blocked_missing_prerequisites');
  assert.ok(result.blockers.includes('phase2GateEvidence.evidenceGateImplemented'));
  assert.ok(result.blockers.includes('phase2GateEvidence.lowDisclosureInputGuardModeled'));
  assertNoSideEffects(result);
});

test('CM2020 blocks readiness when read-only proof plan or fallback distinction is incomplete', () => {
  const result = evaluatePhase2NativeReadProofReadinessGate(validReadinessInput({
    liveReadPlan: {
      searchMemoryProbePlanned: false,
      auditMemoryProbePlanned: false
    },
    fallbackPlan: {
      nativeVsFallbackReceiptSeparated: false
    },
    expectedDecision: 'native_read_proof_readiness_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('liveReadPlan.searchMemoryProbePlanned'));
  assert.ok(result.blockers.includes('liveReadPlan.auditMemoryProbePlanned'));
  assert.ok(result.blockers.includes('fallbackPlan.nativeVsFallbackReceiptSeparated'));
  assertNoSideEffects(result);
});

test('CM2020 stops L4 if input claims approval, service, runtime, or native read proof happened', () => {
  const result = evaluatePhase2NativeReadProofReadinessGate(validReadinessInput({
    approvalRequest: {
      exactApprovalAccepted: true,
      liveReadAuthorized: true,
      serviceStartAuthorized: true
    },
    runtimeTarget: {
      nativeTargetBindingReceiptPresent: true
    },
    liveReadPlan: {
      nativeReadAttempted: true,
      nativeReadSucceeded: true,
      nativeReadReceiptObserved: true,
      wslLinuxProofObserved: true
    },
    counters: {
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      nativeReadAttempts: 1,
      memoryReads: 1,
      serviceStartStopActions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('approvalRequest.exactApprovalAccepted'));
  assert.ok(result.blockers.includes('approvalRequest.liveReadAuthorized'));
  assert.ok(result.blockers.includes('approvalRequest.serviceStartAuthorized'));
  assert.ok(result.blockers.includes('runtimeTarget.nativeTargetBindingReceiptPresent'));
  assert.ok(result.blockers.includes('liveReadPlan.nativeReadAttempted'));
  assert.ok(result.blockers.includes('liveReadPlan.nativeReadReceiptObserved'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assertNoSideEffects(result);
});

test('CM2020 stops L4 if native fallback is misrepresented or raw output is included', () => {
  const result = evaluatePhase2NativeReadProofReadinessGate(validReadinessInput({
    fallbackPlan: {
      fallbackMisrepresentedAsNative: true
    },
    output: {
      responseBodyIncluded: true,
      rawMemoryIncluded: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('fallbackPlan.fallbackMisrepresentedAsNative'));
  assert.ok(result.blockers.includes('output.responseBodyIncluded'));
  assert.ok(result.blockers.includes('output.rawMemoryIncluded'));
  assertNoSideEffects(result);
});

test('CM2020 rejects raw secret runtime fields by path only', () => {
  const result = evaluatePhase2NativeReadProofReadinessGate({
    ...validReadinessInput(),
    endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO',
    nested: {
      queryText: 'SYNTHETIC_QUERY_SHOULD_NOT_ECHO',
      bearerToken: 'SYNTHETIC_TOKEN_SHOULD_NOT_ECHO',
      responseBody: 'SYNTHETIC_RESPONSE_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'endpoint',
    'nested.queryText',
    'nested.bearerToken',
    'nested.responseBody'
  ]);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RESPONSE_SHOULD_NOT_ECHO'), false);
  assertNoSideEffects(result);
});

test('CM2020 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    safe: {
      nested: true
    },
    approvalLineValue: 'DO_NOT_ECHO_A',
    nested: {
      locator: 'DO_NOT_ECHO_B'
    }
  }), [
    'approvalLineValue',
    'nested.locator'
  ]);
});
