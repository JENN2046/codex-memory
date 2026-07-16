'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PREREQUISITE_FIELDS,
  REQUIRED_RECEIPT_CATEGORY,
  collectForbiddenFields,
  evaluatePhase8NativeWriteProofReceiptBundleContract
} = require('../src/core/Phase8NativeWriteProofReceiptBundleContract');

function zeroCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptBundleApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeWriteAttempts: 0,
    memoryWrites: 0,
    durableMemoryWrites: 0,
    verifyWriteExecutions: 0,
    rollbackExecutions: 0,
    failureRecoveryExecutions: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function validBundle(overrides = {}) {
  const receiptCategories = {
    freshExactApprovalReceipt: REQUIRED_RECEIPT_CATEGORY,
    exactApprovalEnforcementReceipt: REQUIRED_RECEIPT_CATEGORY,
    nativeSideEffectReceipt: REQUIRED_RECEIPT_CATEGORY,
    realRootDurableWriteProofReceipt: REQUIRED_RECEIPT_CATEGORY,
    verifyWriteReceipt: REQUIRED_RECEIPT_CATEGORY,
    rollbackDrillReceipt: REQUIRED_RECEIPT_CATEGORY,
    failureRecoveryReceipt: REQUIRED_RECEIPT_CATEGORY,
    outputDisclosureBudgetReceipt: REQUIRED_RECEIPT_CATEGORY,
    auditReceipt: REQUIRED_RECEIPT_CATEGORY
  };

  const base = {
    schemaVersion: 1,
    taskId: 'CM-2029',
    mode: 'local-native-write-receipt-bundle-contract',
    prerequisites: {
      cm2012OperatorFullSurfaceProofGateAccepted: true,
      cm2013NativeWriteContractPreflightAccepted: true,
      cm2014RealRootWriteReadinessGateAccepted: true,
      cm2027ReceiptAuditIntakeAccepted: true,
      completionAuditStillRequiresExactReceipts: true,
      phase8StillIncompleteBeforeBundle: true
    },
    bundle: {
      bundlePrepared: true,
      futureExactApprovalRequired: true,
      freshSingleUseApprovalReceiptRequired: true,
      receiptBundleAppliedToCompletionAudit: false,
      phase8CompletionClaimed: false,
      productionWriteClaimed: false,
      nonAuthorizingContractOnly: true
    },
    receiptCategories,
    sequence: {
      approvalBeforeNativeWrite: true,
      realRootTargetBeforeNativeWrite: true,
      prepareBeforeCommit: true,
      commitBeforeVerify: true,
      verifyBeforeRollbackDrill: true,
      auditAfterNativeWrite: true,
      rollbackAndFailureRecoverySeparated: true,
      failureRecoveryCoversPartialWrite: true,
      outputDisclosureCheckedBeforePatch: true
    },
    disclosure: {
      categoryOnly: true,
      lowDisclosureOnly: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      approvalLineIncluded: false,
      readinessClaimIncluded: false
    },
    expectedDecision: 'phase8_native_write_receipt_bundle_contract_ready_for_future_evidence',
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    bundle: { ...base.bundle, ...(overrides.bundle || {}) },
    receiptCategories: { ...base.receiptCategories, ...(overrides.receiptCategories || {}) },
    sequence: { ...base.sequence, ...(overrides.sequence || {}) },
    disclosure: { ...base.disclosure, ...(overrides.disclosure || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.currentPhase8Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.receiptBundleAppliedToCompletionAudit, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.productionWriteProven, false);
  assert.equal(result.realRootDurableWriteProven, false);
  assert.equal(result.verifyWriteExecuted, false);
  assert.equal(result.rollbackDrillExecuted, false);
  assert.equal(result.failureRecoveryExecuted, false);
  assert.equal(result.receiptContentRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2029 accepts only the future low-disclosure Phase 8 receipt bundle shape', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validBundle());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase8_native_write_receipt_bundle_contract_ready_for_future_evidence');
  assert.equal(result.futureReceiptBundleShapeAccepted, true);
  assert.deepEqual(result.prerequisiteChecksRequired, REQUIRED_PREREQUISITE_FIELDS);
  assert.deepEqual(
    result.lowDisclosureReceiptSummary.prerequisiteChecksRequired,
    REQUIRED_PREREQUISITE_FIELDS
  );
  assert.equal(result.lowDisclosureReceiptSummary.receiptCategory, REQUIRED_RECEIPT_CATEGORY);
  assert.equal(result.lowDisclosureReceiptSummary.currentPhase8Completed, false);
  assertNoSideEffects(result);
});

test('CM2029 blocks receipt bundle when prerequisite gates are absent', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validBundle({
    prerequisites: {
      cm2012OperatorFullSurfaceProofGateAccepted: false,
      cm2013NativeWriteContractPreflightAccepted: false,
      cm2014RealRootWriteReadinessGateAccepted: false,
      cm2027ReceiptAuditIntakeAccepted: false
    },
    expectedDecision: 'phase8_native_write_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2012OperatorFullSurfaceProofGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2013NativeWriteContractPreflightAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2014RealRootWriteReadinessGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2027ReceiptAuditIntakeAccepted'));
  assertNoSideEffects(result);
});

test('CM2029 blocks incomplete Phase 8 receipt categories without treating Phase 8 as complete', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validBundle({
    receiptCategories: {
      nativeSideEffectReceipt: 'missing',
      realRootDurableWriteProofReceipt: 'missing',
      rollbackDrillReceipt: 'missing',
      failureRecoveryReceipt: 'missing'
    },
    expectedDecision: 'phase8_native_write_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptCategories.nativeSideEffectReceipt'));
  assert.ok(result.blockers.includes('receiptCategories.realRootDurableWriteProofReceipt'));
  assert.ok(result.blockers.includes('receiptCategories.rollbackDrillReceipt'));
  assert.ok(result.blockers.includes('receiptCategories.failureRecoveryReceipt'));
  assert.equal(result.currentPhase8Completed, false);
  assertNoSideEffects(result);
});

test('CM2029 blocks invalid Phase 8 native write receipt sequence requirements', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validBundle({
    sequence: {
      approvalBeforeNativeWrite: false,
      realRootTargetBeforeNativeWrite: false,
      commitBeforeVerify: false,
      outputDisclosureCheckedBeforePatch: false
    },
    expectedDecision: 'phase8_native_write_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('sequence.approvalBeforeNativeWrite'));
  assert.ok(result.blockers.includes('sequence.realRootTargetBeforeNativeWrite'));
  assert.ok(result.blockers.includes('sequence.commitBeforeVerify'));
  assert.ok(result.blockers.includes('sequence.outputDisclosureCheckedBeforePatch'));
  assertNoSideEffects(result);
});

test('CM2029 stops L4 if bundle application completion or execution counters are present', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validBundle({
    bundle: {
      receiptBundleAppliedToCompletionAudit: true,
      phase8CompletionClaimed: true,
      productionWriteClaimed: true
    },
    counters: {
      approvalGrantsAccepted: 1,
      runtimeCalls: 1,
      nativeWriteAttempts: 1,
      durableMemoryWrites: 1,
      verifyWriteExecutions: 1,
      rollbackExecutions: 1,
      failureRecoveryExecutions: 1,
      receiptBundleApplications: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('bundle.receiptBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('bundle.phase8CompletionClaimed'));
  assert.ok(result.blockers.includes('bundle.productionWriteClaimed'));
  assert.ok(result.blockers.includes('counters.nativeWriteAttempts'));
  assert.ok(result.blockers.includes('counters.durableMemoryWrites'));
  assertNoSideEffects(result);
});

test('CM2029 stops L4 if disclosure includes raw values approval lines or readiness', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validBundle({
    disclosure: {
      endpointLocatorIncluded: true,
      requestBodyIncluded: true,
      responseBodyIncluded: true,
      memoryContentIncluded: true,
      approvalLineIncluded: true,
      readinessClaimIncluded: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('disclosure.endpointLocatorIncluded'));
  assert.ok(result.blockers.includes('disclosure.requestBodyIncluded'));
  assert.ok(result.blockers.includes('disclosure.responseBodyIncluded'));
  assert.ok(result.blockers.includes('disclosure.memoryContentIncluded'));
  assert.ok(result.blockers.includes('disclosure.approvalLineIncluded'));
  assert.ok(result.blockers.includes('disclosure.readinessClaimIncluded'));
  assertNoSideEffects(result);
});

test('CM2029 rejects forbidden raw secret fields by path without echoing values', () => {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract({
    ...validBundle(),
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      memoryContent: 'ECHO_MEMORY',
      approvalLineValue: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.endpoint',
    'unsafe.memoryContent',
    'unsafe.approvalLineValue',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2029 forbidden field collector reports paths only', () => {
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
