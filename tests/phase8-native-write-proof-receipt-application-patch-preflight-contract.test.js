'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PREREQUISITE_FIELDS: REQUIRED_BUNDLE_PREREQUISITE_FIELDS,
  REQUIRED_RECEIPT_CATEGORY,
  evaluatePhase8NativeWriteProofReceiptBundleContract
} = require('../src/core/Phase8NativeWriteProofReceiptBundleContract');
const {
  PHASE8_PATCH_EVIDENCE_FIELDS,
  REQUIRED_EVIDENCE_MARKER,
  collectForbiddenFields,
  evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract
} = require('../src/core/Phase8NativeWriteProofReceiptApplicationPatchPreflightContract');

function receiptBundleCounters() {
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

function preflightCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptBundleApplications: 0,
    completionAuditPatchApplications: 0,
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

function validReceiptBundleInput(overrides = {}) {
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
    receiptCategories: {
      freshExactApprovalReceipt: REQUIRED_RECEIPT_CATEGORY,
      exactApprovalEnforcementReceipt: REQUIRED_RECEIPT_CATEGORY,
      nativeSideEffectReceipt: REQUIRED_RECEIPT_CATEGORY,
      realRootDurableWriteProofReceipt: REQUIRED_RECEIPT_CATEGORY,
      verifyWriteReceipt: REQUIRED_RECEIPT_CATEGORY,
      rollbackDrillReceipt: REQUIRED_RECEIPT_CATEGORY,
      failureRecoveryReceipt: REQUIRED_RECEIPT_CATEGORY,
      outputDisclosureBudgetReceipt: REQUIRED_RECEIPT_CATEGORY,
      auditReceipt: REQUIRED_RECEIPT_CATEGORY
    },
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
    counters: receiptBundleCounters()
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

function acceptedReceiptBundleContract() {
  const result = evaluatePhase8NativeWriteProofReceiptBundleContract(validReceiptBundleInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  return {
    decision: result.decision,
    futureReceiptBundleShapeAccepted: result.futureReceiptBundleShapeAccepted,
    requiredReceiptCategory: result.requiredReceiptCategory,
    prerequisiteChecksRequired: result.prerequisiteChecksRequired,
    currentPhase8Completed: result.currentPhase8Completed,
    fullPlanPackCompleted: result.fullPlanPackCompleted,
    approvalAcceptedByThisContract: result.approvalAcceptedByThisContract,
    receiptBundleAppliedToCompletionAudit: result.receiptBundleAppliedToCompletionAudit,
    nativeWriteExecuted: result.nativeWriteExecuted,
    productionWriteProven: result.productionWriteProven,
    realRootDurableWriteProven: result.realRootDurableWriteProven,
    verifyWriteExecuted: result.verifyWriteExecuted,
    rollbackDrillExecuted: result.rollbackDrillExecuted,
    failureRecoveryExecuted: result.failureRecoveryExecuted,
    receiptContentRead: result.receiptContentRead,
    realMemoryRead: result.realMemoryRead,
    rawPrivateStateRead: result.rawPrivateStateRead,
    providerApiCalled: result.providerApiCalled,
    durableMutationPerformed: result.durableMutationPerformed,
    publicMcpExpanded: result.publicMcpExpanded,
    readinessClaimed: result.readinessClaimed
  };
}

function proposedPatchEvidence(marker = REQUIRED_EVIDENCE_MARKER) {
  return Object.fromEntries(PHASE8_PATCH_EVIDENCE_FIELDS.map(field => [field, marker]));
}

function validPreflight(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2030',
    mode: 'local-native-write-receipt-application-patch-preflight',
    prerequisites: {
      cm2012OperatorFullSurfaceProofGateAccepted: true,
      cm2013NativeWriteContractPreflightAccepted: true,
      cm2014RealRootWriteReadinessGateAccepted: true,
      cm2027ReceiptAuditIntakeAccepted: true,
      cm2029ReceiptBundleContractAccepted: true,
      cm2017CompletionAuditRequiresPhase8Proof: true,
      cm2024TraceMatrixRequiresExactReceiptEvidence: true,
      phase8StillIncompleteBeforePatch: true,
      nativeWriteStillRequiresFutureExactApproval: true
    },
    receiptBundleContract: acceptedReceiptBundleContract(),
    patchPreflight: {
      preflightPrepared: true,
      categoryOnly: true,
      lowDisclosureOnly: true,
      exactAuthorizedReceiptsRequiredBeforePatch: true,
      receiptBundleApplicationRequired: true,
      completionAuditPatchPrepared: true,
      receiptBundleAppliedToCompletionAudit: false,
      completionAuditPatchApplied: false,
      phase8CompletionClaimed: false,
      productionWriteClaimed: false,
      localContractsAllowedToSatisfyExactReceipts: false
    },
    proposedPatchEvidence: proposedPatchEvidence(),
    expectedDecision: 'phase8_native_write_receipt_application_patch_preflight_ready_for_future_exact_receipts',
    counters: preflightCounters()
  };

  return {
    ...base,
    ...overrides,
    prerequisites: { ...base.prerequisites, ...(overrides.prerequisites || {}) },
    receiptBundleContract: {
      ...base.receiptBundleContract,
      ...(overrides.receiptBundleContract || {})
    },
    patchPreflight: { ...base.patchPreflight, ...(overrides.patchPreflight || {}) },
    proposedPatchEvidence: {
      ...base.proposedPatchEvidence,
      ...(overrides.proposedPatchEvidence || {})
    },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.receiptBundleAppliedToCompletionAudit, false);
  assert.equal(result.completionAuditPatchApplied, false);
  assert.equal(result.currentPhase8Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
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

test('CM2030 accepts Phase 8 receipt application patch preflight without applying evidence', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract(validPreflight());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.patchPreflightAccepted, true);
  assert.equal(
    result.decision,
    'phase8_native_write_receipt_application_patch_preflight_ready_for_future_exact_receipts'
  );
  assert.deepEqual(result.requiredPatchEvidenceFields, PHASE8_PATCH_EVIDENCE_FIELDS);
  assert.deepEqual(
    validPreflight().receiptBundleContract.prerequisiteChecksRequired,
    REQUIRED_BUNDLE_PREREQUISITE_FIELDS
  );
  assert.equal(result.proposedCompletionAuditEvidence.length, PHASE8_PATCH_EVIDENCE_FIELDS.length);
  for (const entry of result.proposedCompletionAuditEvidence) {
    assert.equal(entry.marker, REQUIRED_EVIDENCE_MARKER);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_future_exact_authorized_phase8_receipts_before_receipt_application_or_completion_audit_patch'
  );
  assertNoSideEffects(result);
});

test('CM2030 blocks patch preflight when prerequisite gate chain is absent', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract(validPreflight({
    prerequisites: {
      cm2029ReceiptBundleContractAccepted: false,
      cm2024TraceMatrixRequiresExactReceiptEvidence: false
    },
    expectedDecision: 'phase8_native_write_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2029ReceiptBundleContractAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2024TraceMatrixRequiresExactReceiptEvidence'));
  assertNoSideEffects(result);
});

test('CM2030 blocks patch preflight when receipt bundle contract result is not accepted', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract(validPreflight({
    receiptBundleContract: {
      decision: 'phase8_native_write_receipt_bundle_contract_blocked_missing_receipts',
      futureReceiptBundleShapeAccepted: false
    },
    expectedDecision: 'phase8_native_write_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptBundleContract.decision'));
  assert.ok(result.blockers.includes('receiptBundleContract.futureReceiptBundleShapeAccepted'));
  assertNoSideEffects(result);
});

test('CM2046 blocks patch preflight when Phase 8 receipt bundle prerequisite summary is stale', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract(validPreflight({
    receiptBundleContract: {
      prerequisiteChecksRequired: REQUIRED_BUNDLE_PREREQUISITE_FIELDS.slice(0, -1)
    },
    expectedDecision: 'phase8_native_write_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptBundleContract.prerequisiteChecksRequired'));
  assertNoSideEffects(result);
});

test('CM2030 rejects proposed patch evidence that tries to mark Phase 8 proof complete now', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract(validPreflight({
    proposedPatchEvidence: {
      nativeSideEffectReceiptPassed: true,
      realRootDurableWriteProofPassed: true,
      phase8ReceiptBundleAppliedToCompletionAudit: true
    },
    expectedDecision: 'phase8_native_write_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('proposedPatchEvidence.nativeSideEffectReceiptPassed'));
  assert.ok(result.blockers.includes('proposedPatchEvidence.realRootDurableWriteProofPassed'));
  assert.ok(result.blockers.includes('proposedPatchEvidence.phase8ReceiptBundleAppliedToCompletionAudit'));
  assertNoSideEffects(result);
});

test('CM2030 stops L4 on patch application receipt application execution or completion counters', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract(validPreflight({
    receiptBundleContract: {
      nativeWriteExecuted: true,
      receiptContentRead: true
    },
    patchPreflight: {
      receiptBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      phase8CompletionClaimed: true,
      productionWriteClaimed: true
    },
    counters: {
      receiptBundleApplications: 1,
      completionAuditPatchApplications: 1,
      runtimeCalls: 1,
      nativeWriteAttempts: 1,
      durableMemoryWrites: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('receiptBundleContract.nativeWriteExecuted'));
  assert.ok(result.blockers.includes('receiptBundleContract.receiptContentRead'));
  assert.ok(result.blockers.includes('patchPreflight.receiptBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('patchPreflight.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('patchPreflight.phase8CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.receiptBundleApplications'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assertNoSideEffects(result);
});

test('CM2030 rejects forbidden raw secret runtime fields by path without echoing values', () => {
  const result = evaluatePhase8NativeWriteProofReceiptApplicationPatchPreflightContract({
    ...validPreflight(),
    unsafe: {
      responseBody: 'ECHO_RESPONSE',
      memoryContent: 'ECHO_MEMORY',
      approvalLineValue: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.responseBody',
    'unsafe.memoryContent',
    'unsafe.approvalLineValue',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_RESPONSE'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2030 forbidden field collector reports paths only', () => {
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
