'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_PREREQUISITE_FIELDS: REQUIRED_BUNDLE_REVIEW_CHAIN_PREREQUISITE_FIELDS,
  REQUIRED_RECEIPT_CATEGORY,
  evaluatePhase2NativeReadProofReceiptBundleContract
} = require('../src/core/Phase2NativeReadProofReceiptBundleContract');
const {
  PHASE2_PATCH_EVIDENCE_FIELDS,
  REQUIRED_EVIDENCE_MARKER,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract
} = require('../src/core/Phase2NativeReadProofReceiptApplicationPatchPreflightContract');

function receiptBundleCounters() {
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

function preflightCounters() {
  return {
    approvalGrantsAccepted: 0,
    approvalLineOperations: 0,
    receiptBundleApplications: 0,
    completionAuditPatchApplications: 0,
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

function validReceiptBundleInput(overrides = {}) {
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
    receiptCategories: {
      freshExactApprovalReceipt: REQUIRED_RECEIPT_CATEGORY,
      nativeTargetBindingReceipt: REQUIRED_RECEIPT_CATEGORY,
      nativeReadAttemptReceipt: REQUIRED_RECEIPT_CATEGORY,
      nativeReadSuccessReceipt: REQUIRED_RECEIPT_CATEGORY,
      auditReceipt: REQUIRED_RECEIPT_CATEGORY,
      fallbackDistinctionReceipt: REQUIRED_RECEIPT_CATEGORY,
      wslLinuxReceipt: REQUIRED_RECEIPT_CATEGORY,
      windowsWslSmokeReceipt: REQUIRED_RECEIPT_CATEGORY,
      lowDisclosureReceipt: REQUIRED_RECEIPT_CATEGORY
    },
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
  const result = evaluatePhase2NativeReadProofReceiptBundleContract(validReceiptBundleInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  return {
    decision: result.decision,
    futureReceiptBundleShapeAccepted: result.futureReceiptBundleShapeAccepted,
    requiredReceiptCategory: result.requiredReceiptCategory,
    prerequisiteChecksRequired: result.prerequisiteChecksRequired,
    currentPhase2Completed: result.currentPhase2Completed,
    approvalAcceptedByThisContract: result.approvalAcceptedByThisContract,
    receiptBundleAppliedToCompletionAudit: result.receiptBundleAppliedToCompletionAudit,
    liveNativeReadExecuted: result.liveNativeReadExecuted,
    receiptContentRead: result.receiptContentRead,
    realMemoryRead: result.realMemoryRead,
    rawPrivateStateRead: result.rawPrivateStateRead,
    providerApiCalled: result.providerApiCalled,
    nativeWriteExecuted: result.nativeWriteExecuted,
    durableMutationPerformed: result.durableMutationPerformed,
    publicMcpExpanded: result.publicMcpExpanded,
    readinessClaimed: result.readinessClaimed
  };
}

function proposedPatchEvidence(marker = REQUIRED_EVIDENCE_MARKER) {
  return Object.fromEntries(PHASE2_PATCH_EVIDENCE_FIELDS.map(field => [field, marker]));
}

function validPreflight(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2031',
    mode: 'local-native-read-receipt-application-patch-preflight',
    prerequisites: {
      cm2019EvidenceGateAccepted: true,
      cm2020ReadinessGateAccepted: true,
      cm2021ApprovalPacketContractAccepted: true,
      cm2022ReceiptBundleContractAccepted: true,
      cm2025ReceiptAuditIntakeAccepted: true,
      cm2017CompletionAuditRequiresPhase2Proof: true,
      cm2024TraceMatrixRequiresExactReceiptEvidence: true,
      phase2StillIncompleteBeforePatch: true,
      nativeReadStillRequiresFutureExactApproval: true
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
      phase2CompletionClaimed: false,
      localContractsAllowedToSatisfyExactReceipts: false
    },
    proposedPatchEvidence: proposedPatchEvidence(),
    expectedDecision: 'phase2_native_read_receipt_application_patch_preflight_ready_for_future_exact_receipts',
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
  assert.equal(result.currentPhase2Completed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.approvalAcceptedByThisContract, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.receiptContentRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2031 accepts Phase 2 receipt application patch preflight without applying evidence', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract(validPreflight());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.patchPreflightAccepted, true);
  assert.equal(
    result.decision,
    'phase2_native_read_receipt_application_patch_preflight_ready_for_future_exact_receipts'
  );
  assert.deepEqual(result.requiredPatchEvidenceFields, PHASE2_PATCH_EVIDENCE_FIELDS);
  assert.deepEqual(
    validPreflight().receiptBundleContract.prerequisiteChecksRequired,
    REQUIRED_BUNDLE_REVIEW_CHAIN_PREREQUISITE_FIELDS
  );
  assert.equal(result.proposedCompletionAuditEvidence.length, PHASE2_PATCH_EVIDENCE_FIELDS.length);
  for (const entry of result.proposedCompletionAuditEvidence) {
    assert.equal(entry.marker, REQUIRED_EVIDENCE_MARKER);
    assert.equal(entry.acceptedAsCompletionEvidenceNow, false);
  }
  assert.equal(
    result.nextGate,
    'await_future_exact_authorized_phase2_receipts_before_receipt_application_or_completion_audit_patch'
  );
  assertNoSideEffects(result);
});

test('CM2031 blocks patch preflight when prerequisite gate chain is absent', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract(validPreflight({
    prerequisites: {
      cm2025ReceiptAuditIntakeAccepted: false,
      cm2024TraceMatrixRequiresExactReceiptEvidence: false
    },
    expectedDecision: 'phase2_native_read_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.cm2025ReceiptAuditIntakeAccepted'));
  assert.ok(result.blockers.includes('prerequisites.cm2024TraceMatrixRequiresExactReceiptEvidence'));
  assertNoSideEffects(result);
});

test('CM2031 blocks patch preflight when receipt bundle contract result is not accepted', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract(validPreflight({
    receiptBundleContract: {
      decision: 'native_read_proof_receipt_bundle_contract_blocked_missing_receipts',
      futureReceiptBundleShapeAccepted: false
    },
    expectedDecision: 'phase2_native_read_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptBundleContract.decision'));
  assert.ok(result.blockers.includes('receiptBundleContract.futureReceiptBundleShapeAccepted'));
  assertNoSideEffects(result);
});

test('CM2045 blocks patch preflight when receipt bundle review-chain summary is stale', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract(validPreflight({
    receiptBundleContract: {
      prerequisiteChecksRequired: REQUIRED_BUNDLE_REVIEW_CHAIN_PREREQUISITE_FIELDS.slice(1)
    },
    expectedDecision: 'phase2_native_read_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptBundleContract.prerequisiteChecksRequired'));
  assertNoSideEffects(result);
});

test('CM2031 rejects proposed patch evidence that tries to mark Phase 2 proof complete now', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract(validPreflight({
    proposedPatchEvidence: {
      nativeReadProofPassed: true,
      phase2ReceiptBundleAppliedToCompletionAudit: true
    },
    expectedDecision: 'phase2_native_read_receipt_application_patch_preflight_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('proposedPatchEvidence.nativeReadProofPassed'));
  assert.ok(result.blockers.includes('proposedPatchEvidence.phase2ReceiptBundleAppliedToCompletionAudit'));
  assertNoSideEffects(result);
});

test('CM2031 stops L4 on patch application receipt application runtime or completion counters', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract(validPreflight({
    receiptBundleContract: {
      liveNativeReadExecuted: true,
      receiptContentRead: true
    },
    patchPreflight: {
      receiptBundleAppliedToCompletionAudit: true,
      completionAuditPatchApplied: true,
      phase2CompletionClaimed: true
    },
    counters: {
      receiptBundleApplications: 1,
      completionAuditPatchApplications: 1,
      runtimeCalls: 1,
      nativeReadAttempts: 1,
      memoryReads: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('receiptBundleContract.liveNativeReadExecuted'));
  assert.ok(result.blockers.includes('receiptBundleContract.receiptContentRead'));
  assert.ok(result.blockers.includes('patchPreflight.receiptBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('patchPreflight.completionAuditPatchApplied'));
  assert.ok(result.blockers.includes('patchPreflight.phase2CompletionClaimed'));
  assert.ok(result.blockers.includes('counters.receiptBundleApplications'));
  assert.ok(result.blockers.includes('counters.completionAuditPatchApplications'));
  assertNoSideEffects(result);
});

test('CM2031 rejects forbidden raw secret runtime fields by path without echoing values', () => {
  const result = evaluatePhase2NativeReadProofReceiptApplicationPatchPreflightContract({
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

test('CM2031 forbidden field collector reports paths only', () => {
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
