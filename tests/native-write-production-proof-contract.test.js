'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluateNativeWriteProductionProofContract
} = require('../src/core/NativeWriteProductionProofContract');

function zeroCounters() {
  return {
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeWriteAttempts: 0,
    memoryWrites: 0,
    durableMemoryWrites: 0,
    memoryUpdates: 0,
    memorySupersedes: 0,
    memoryTombstones: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function validContractInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2013',
    mode: 'local-contract-preflight',
    phaseAction: 'prepare_write',
    sequence: {
      prepareWriteContractAccepted: false,
      commitWriteContractAccepted: false,
      verifyWriteContractAccepted: false
    },
    priorGateEvidence: {
      operatorFullSurfaceProofAccepted: true,
      defaultSurfaceUnchanged: true,
      hardenedSurfaceRejected: true,
      commitMemoryDeltaNotPublic: true,
      proposalOnlyDefaultSurfacePreserved: true
    },
    proofRequirements: {
      exactApprovalEnforcementDefined: true,
      nativeSideEffectReceiptRequired: true,
      realRootDurableWriteProofRequired: true,
      auditReceiptRequired: true,
      rollbackPostureRequired: true,
      failureRecoveryRequired: true,
      outputDisclosureBudgetRequired: true
    },
    authority: {
      exactApprovalAccepted: false,
      freshCurrentSingleUseApproval: false,
      taskScopeBound: true,
      operatorIntentBound: true,
      durableWriteAuthorized: false,
      providerApiAuthorized: false,
      publicMcpExpansionAuthorized: false,
      releaseDeployCutoverAuthorized: false,
      readinessClaimAuthorized: false
    },
    runtimeTarget: {
      targetReferenceBound: true,
      targetReferenceCategory: 'operator_provided_safe_reference_only',
      realRootTargetRequired: true,
      endpointLocatorDisclosed: false,
      rawRuntimeStateDisclosed: false
    },
    writePlan: {
      prepareWriteDefined: true,
      commitWriteDefined: true,
      boundedMutationFamilySelected: true,
      scopeBound: true,
      visibilityBound: true,
      rollbackPostureBound: true,
      unboundedMutationAllowed: false
    },
    commitEvidence: {
      commitWriteDefined: true,
      nativeSideEffectReceiptRequired: true,
      nativeWriteExecuted: false,
      nativeSideEffectReceiptObserved: false,
      realRootDurableWriteObserved: false
    },
    verifyEvidence: {
      verifyWriteDefined: true,
      verifyWritePassed: false,
      durableWriteReReadObserved: false,
      auditReceiptMatched: false,
      scopeIsolationVerified: false
    },
    rollbackEvidence: {
      rollbackOrCompensateDefined: true,
      rollbackPostureDefined: true,
      rollbackOrCompensateExecuted: false,
      rollbackReceiptObserved: false,
      compensationBounded: true
    },
    failureRecovery: {
      failureRecoveryDefined: true,
      failureRecoveryDrillPassed: false,
      partialWriteHandled: false,
      retryBudgetBounded: true,
      manualEscalationDefined: true
    },
    audit: {
      lowDisclosureAuditReceiptDefined: true,
      auditReceiptObserved: false,
      rawAuditIncluded: false,
      nativeSideEffectReceiptLinked: false,
      rollbackReceiptLinked: false
    },
    output: {
      lowDisclosureReceiptOnly: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      requestResponseBodyIncluded: false,
      rawMemoryIncluded: false,
      readinessClaimIncluded: false
    },
    expectedDecision: 'native_write_contract_preflight_accepted',
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    sequence: { ...base.sequence, ...(overrides.sequence || {}) },
    priorGateEvidence: { ...base.priorGateEvidence, ...(overrides.priorGateEvidence || {}) },
    proofRequirements: { ...base.proofRequirements, ...(overrides.proofRequirements || {}) },
    authority: { ...base.authority, ...(overrides.authority || {}) },
    runtimeTarget: { ...base.runtimeTarget, ...(overrides.runtimeTarget || {}) },
    writePlan: { ...base.writePlan, ...(overrides.writePlan || {}) },
    commitEvidence: { ...base.commitEvidence, ...(overrides.commitEvidence || {}) },
    verifyEvidence: { ...base.verifyEvidence, ...(overrides.verifyEvidence || {}) },
    rollbackEvidence: { ...base.rollbackEvidence, ...(overrides.rollbackEvidence || {}) },
    failureRecovery: { ...base.failureRecovery, ...(overrides.failureRecovery || {}) },
    audit: { ...base.audit, ...(overrides.audit || {}) },
    output: { ...base.output, ...(overrides.output || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.productionWriteProven, false);
  assert.equal(result.realRootDurableWriteProven, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPerformed, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2013 accepts prepare_write contract preflight without native write proof', () => {
  const result = evaluateNativeWriteProductionProofContract(validContractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'native_write_contract_preflight_accepted');
  assert.equal(result.phaseAction, 'prepare_write');
  assert.equal(result.preflightOnly, true);
  assert.equal(result.nextGate, 'exact_approved_real_root_write_proof_required');
  assert.equal(result.lowDisclosureReceipt.lowDisclosure, true);
  assert.equal(result.lowDisclosureReceipt.memoryWritten, false);
  assert.equal(result.lowDisclosureReceipt.durableWrite, false);
  assertNoSideEffects(result);
});

test('CM2013 accepts ordered commit_write contract preflight without executing commit', () => {
  const result = evaluateNativeWriteProductionProofContract(validContractInput({
    phaseAction: 'commit_write',
    sequence: {
      prepareWriteContractAccepted: true
    }
  }));

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phaseAction, 'commit_write');
  assert.equal(result.lowDisclosureReceipt.nativeSideEffectReceiptRequired, true);
  assertNoSideEffects(result);
});

test('CM2013 rejects commit_write before prepare_write contract is accepted', () => {
  const result = evaluateNativeWriteProductionProofContract(validContractInput({
    phaseAction: 'commit_write',
    expectedDecision: 'native_write_contract_sequence_rejected'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'native_write_contract_sequence_rejected');
  assert.ok(result.blockers.includes('sequence.prepareWriteContractAccepted'));
  assertNoSideEffects(result);
});

test('CM2013 rejects verify_write before commit/native side-effect receipt contract exists', () => {
  const result = evaluateNativeWriteProductionProofContract(validContractInput({
    phaseAction: 'verify_write',
    sequence: {
      commitWriteContractAccepted: true
    },
    commitEvidence: {
      nativeSideEffectReceiptRequired: false
    },
    expectedDecision: 'native_write_contract_proof_rejected'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'native_write_contract_proof_rejected');
  assert.ok(result.blockers.includes('commitEvidence.nativeSideEffectReceiptRequired'));
  assertNoSideEffects(result);
});

test('CM2013 rejects rollback_or_compensate without rollback posture', () => {
  const result = evaluateNativeWriteProductionProofContract(validContractInput({
    phaseAction: 'rollback_or_compensate',
    sequence: {
      commitWriteContractAccepted: true
    },
    rollbackEvidence: {
      rollbackPostureDefined: false
    },
    expectedDecision: 'native_write_contract_proof_rejected'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'native_write_contract_proof_rejected');
  assert.ok(result.blockers.includes('rollbackEvidence.rollbackPostureDefined'));
  assertNoSideEffects(result);
});

test('CM2013 stops L4 if local preflight claims real execution or readiness', () => {
  const result = evaluateNativeWriteProductionProofContract(validContractInput({
    authority: {
      exactApprovalAccepted: true,
      durableWriteAuthorized: true
    },
    commitEvidence: {
      nativeWriteExecuted: true,
      realRootDurableWriteObserved: true
    },
    counters: {
      runtimeCalls: 1,
      durableMemoryWrites: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('authority.exactApprovalAccepted'));
  assert.ok(result.blockers.includes('commitEvidence.nativeWriteExecuted'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assertNoSideEffects(result);
});

test('CM2013 rejects raw secret runtime fields by path only', () => {
  const result = evaluateNativeWriteProductionProofContract({
    ...validContractInput(),
    requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
    nested: {
      endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO',
      token: 'SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, ['requestBody', 'nested.endpoint', 'nested.token']);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TOKEN_SHOULD_NOT_ECHO'), false);
  assertNoSideEffects(result);
});

test('CM2013 forbidden field collector reports paths only', () => {
  assert.deepEqual(
    collectForbiddenFields({
      safe: true,
      nested: [{ rawMemory: 'SYNTHETIC_RAW_MEMORY_SHOULD_NOT_ECHO' }]
    }),
    ['nested[0].rawMemory']
  );
});
