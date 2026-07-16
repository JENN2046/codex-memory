'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PREREQUISITE_FIELDS,
  REQUIRED_RECEIPT_CATEGORY,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptBundleContract
} = require('../src/core/Phase2NativeReadProofReceiptBundleContract');

function zeroCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptBundleApplications: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeTargetBindings: 0,
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

function validBundle(overrides = {}) {
  const receiptCategories = {
    freshExactApprovalReceipt: REQUIRED_RECEIPT_CATEGORY,
    nativeTargetBindingReceipt: REQUIRED_RECEIPT_CATEGORY,
    nativeReadAttemptReceipt: REQUIRED_RECEIPT_CATEGORY,
    nativeReadSuccessReceipt: REQUIRED_RECEIPT_CATEGORY,
    auditReceipt: REQUIRED_RECEIPT_CATEGORY,
    fallbackDistinctionReceipt: REQUIRED_RECEIPT_CATEGORY,
    wslLinuxReceipt: REQUIRED_RECEIPT_CATEGORY,
    windowsWslSmokeReceipt: REQUIRED_RECEIPT_CATEGORY,
    lowDisclosureReceipt: REQUIRED_RECEIPT_CATEGORY
  };

  const base = {
    schemaVersion: 1,
    taskId: 'CM-2022',
    mode: 'local-receipt-bundle-contract',
    prerequisites: {
      cm2019EvidenceGateAccepted: true,
      cm2020ReadinessGateAccepted: true,
      cm2021ApprovalPacketContractAccepted: true,
      nativeReadResponseShapeCompatibilityAccepted: true,
      nativeReadReceiptSchemaCompatibilityAccepted: true,
      phase2NativeTargetBindingReceiptReviewAccepted: true,
      phase2NativeReadProofReceiptReviewAccepted: true,
      phase2FallbackDistinctionReceiptReviewAccepted: true,
      phase2LowDisclosureProofReceiptReviewAccepted: true,
      phase2AuditScopeReceiptReviewAccepted: true,
      phase2PlatformProofReceiptReviewAccepted: true,
      completionAuditStillRequiresReceipts: true,
      phase2StillIncompleteBeforeBundle: true
    },
    bundle: {
      bundlePrepared: true,
      futureExactApprovalRequired: true,
      freshSingleUseApprovalReceiptRequired: true,
      receiptBundleAppliedToCompletionAudit: false,
      phase2CompletionClaimed: false,
      nonAuthorizingContractOnly: true
    },
    receiptCategories,
    sequence: {
      approvalBeforeNativeRead: true,
      targetBindingBeforeNativeRead: true,
      nativeReadAttemptBeforeSuccess: true,
      auditAfterNativeRead: true,
      fallbackDistinctionSeparateFromNativeRead: true,
      wslLinuxAndWindowsSmokeSeparated: true
    },
    disclosure: {
      categoryOnly: true,
      lowDisclosureOnly: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      queryTextIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      approvalLineIncluded: false,
      readinessClaimIncluded: false
    },
    expectedDecision: 'native_read_proof_receipt_bundle_contract_ready_for_future_evidence',
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
  assert.equal(result.currentPhase2Completed, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.receiptBundleAppliedToCompletionAudit, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.nativeTargetBindingPerformedByThisContract, false);
  assert.equal(result.receiptContentRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2022 accepts only the future low-disclosure receipt bundle shape', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'native_read_proof_receipt_bundle_contract_ready_for_future_evidence');
  assert.equal(result.futureReceiptBundleShapeAccepted, true);
  assert.deepEqual(
    result.lowDisclosureReceiptSummary.prerequisiteChecksRequired,
    REQUIRED_PREREQUISITE_FIELDS
  );
  assert.equal(result.lowDisclosureReceiptSummary.receiptCategory, REQUIRED_RECEIPT_CATEGORY);
  assert.equal(result.lowDisclosureReceiptSummary.currentPhase2Completed, false);
  assertNoSideEffects(result);
});

test('CM2044 blocks receipt bundle when local review chain prerequisites are absent', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle({
    prerequisites: {
      nativeReadResponseShapeCompatibilityAccepted: false,
      nativeReadReceiptSchemaCompatibilityAccepted: false,
      phase2NativeTargetBindingReceiptReviewAccepted: false,
      phase2NativeReadProofReceiptReviewAccepted: false,
      phase2FallbackDistinctionReceiptReviewAccepted: false,
      phase2LowDisclosureProofReceiptReviewAccepted: false,
      phase2AuditScopeReceiptReviewAccepted: false,
      phase2PlatformProofReceiptReviewAccepted: false
    },
    expectedDecision: 'native_read_proof_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.nativeReadResponseShapeCompatibilityAccepted'));
  assert.ok(result.blockers.includes('prerequisites.nativeReadReceiptSchemaCompatibilityAccepted'));
  assert.ok(result.blockers.includes('prerequisites.phase2NativeTargetBindingReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.phase2NativeReadProofReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.phase2FallbackDistinctionReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.phase2LowDisclosureProofReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.phase2AuditScopeReceiptReviewAccepted'));
  assert.ok(result.blockers.includes('prerequisites.phase2PlatformProofReceiptReviewAccepted'));
  assertNoSideEffects(result);
});

test('CM2022 blocks receipt bundle when prerequisite gates are absent', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle({
    prerequisites: {
      cm2019EvidenceGateAccepted: false,
      cm2020ReadinessGateAccepted: false,
      cm2021ApprovalPacketContractAccepted: false
    },
    expectedDecision: 'native_read_proof_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2019EvidenceGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2020ReadinessGateAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2021ApprovalPacketContractAccepted'));
  assertNoSideEffects(result);
});

test('CM2022 blocks incomplete receipt categories without treating Phase 2 as complete', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle({
    receiptCategories: {
      nativeReadSuccessReceipt: 'missing',
      wslLinuxReceipt: 'missing',
      windowsWslSmokeReceipt: 'missing'
    },
    expectedDecision: 'native_read_proof_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptCategories.nativeReadSuccessReceipt'));
  assert.ok(result.blockers.includes('receiptCategories.wslLinuxReceipt'));
  assert.ok(result.blockers.includes('receiptCategories.windowsWslSmokeReceipt'));
  assert.equal(result.currentPhase2Completed, false);
  assertNoSideEffects(result);
});

test('CM2022 blocks invalid receipt sequence requirements', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle({
    sequence: {
      approvalBeforeNativeRead: false,
      targetBindingBeforeNativeRead: false,
      fallbackDistinctionSeparateFromNativeRead: false
    },
    expectedDecision: 'native_read_proof_receipt_bundle_contract_blocked_missing_receipts'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('sequence.approvalBeforeNativeRead'));
  assert.ok(result.blockers.includes('sequence.targetBindingBeforeNativeRead'));
  assert.ok(result.blockers.includes('sequence.fallbackDistinctionSeparateFromNativeRead'));
  assertNoSideEffects(result);
});

test('CM2022 stops L4 if bundle application completion or execution counters are present', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle({
    bundle: {
      receiptBundleAppliedToCompletionAudit: true,
      phase2CompletionClaimed: true
    },
    counters: {
      approvalGrantsAccepted: 1,
      runtimeCalls: 1,
      nativeReadAttempts: 1,
      memoryReads: 1,
      receiptBundleApplications: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('bundle.receiptBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('bundle.phase2CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assert.ok(result.blockers.includes('counters.nativeReadAttempts'));
  assertNoSideEffects(result);
});

test('CM2022 stops L4 if disclosure includes raw values approval lines or readiness', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validBundle({
    disclosure: {
      endpointLocatorIncluded: true,
      queryTextIncluded: true,
      responseBodyIncluded: true,
      memoryContentIncluded: true,
      approvalLineIncluded: true,
      readinessClaimIncluded: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('disclosure.endpointLocatorIncluded'));
  assert.ok(result.blockers.includes('disclosure.queryTextIncluded'));
  assert.ok(result.blockers.includes('disclosure.responseBodyIncluded'));
  assert.ok(result.blockers.includes('disclosure.memoryContentIncluded'));
  assert.ok(result.blockers.includes('disclosure.approvalLineIncluded'));
  assert.ok(result.blockers.includes('disclosure.readinessClaimIncluded'));
  assertNoSideEffects(result);
});

test('CM2022 rejects forbidden raw secret fields by path without echoing values', () => {
  const result = evaluatePhase2NativeReadProofReceiptBundleContract({
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

test('CM2022 forbidden field collector reports paths only', () => {
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
