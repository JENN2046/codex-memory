'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluatePhase2GovernedNativeReadObservationContract
} = require('../src/core/Phase2GovernedNativeReadObservationContract');
const {
  evaluateNearModelMemoryPlanPackCompletionAudit,
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

const TOOLS = ['search_memory', 'memory_overview', 'audit_memory'];

function observation(toolName, overrides = {}) {
  return {
    toolName,
    accepted: true,
    delegated: true,
    primaryRuntimeCategory: 'vcp_toolbox_native_memory',
    targetReferenceBound: true,
    invocationProfileBound: true,
    clientIdentityBound: true,
    scopeBoundaryBound: true,
    visibilityBound: true,
    readAllowed: true,
    writeAllowed: false,
    outputDisclosureBudgetBound: true,
    auditReceiptRequired: true,
    localAuditReceiptAppended: true,
    nativeInvocationAttempted: true,
    nativeInvocationSucceeded: true,
    nativeRuntimeReceiptPresent: true,
    nativeRuntimeCalled: true,
    providerApiCalled: true,
    memoryReadPerformed: true,
    memoryWritePerformed: false,
    derivedIndexWritePerformed: true,
    primaryMemoryStoreWritePerformed: false,
    isolatedRuntimeStoreUsed: true,
    localFallbackUsed: false,
    rawOutputReturned: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    filesystemPathsReturned: false,
    tokenMaterialReturned: false,
    providerPayloadReturned: false,
    memoryContentReturned: false,
    memoryIdsReturned: false,
    titlesReturned: false,
    snippetsReturned: false,
    readinessClaimed: false,
    ...overrides
  };
}

function counters(overrides = {}) {
  return {
    runtimeCalls: 3,
    vcpToolBoxCalls: 3,
    mcpToolCalls: 3,
    nativeReadAttempts: 3,
    memoryReads: 3,
    providerApiCalls: 3,
    derivedIndexWrites: 3,
    localAuditAppends: 3,
    memoryWrites: 0,
    primaryMemoryStoreWrites: 0,
    nativeWriteAttempts: 0,
    realMemoryContentReturns: 0,
    rawPrivateReads: 0,
    localFallbackUses: 0,
    publicMcpExpansions: 0,
    defaultRuntimeExpansions: 0,
    tagReleaseDeployCutoverActions: 0,
    readinessClaims: 0,
    ...overrides
  };
}

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2073',
    mode: 'phase2-governed-native-read-low-disclosure-observation',
    executionAuthority: {
      userPermissionEnvironmentEnabled: true,
      trustedExecutionContextBound: true,
      defaultReadOnlySurfaceOnly: true,
      exactApprovalLinePresent: false,
      writeAuthorityGranted: false
    },
    observations: TOOLS.map(toolName => observation(toolName)),
    platform: {
      platformCategory: 'linux',
      wslDetected: true,
      windowsHostBridgeObserved: false
    },
    receiptCoverage: {
      nativeTargetBindingReceiptObserved: true,
      nativeReadAttemptReceiptObserved: true,
      nativeReadSuccessReceiptObserved: true,
      auditReceiptObserved: true,
      scopeVisibilityReceiptObserved: true,
      lowDisclosureReceiptObserved: true,
      wslLinuxReceiptObserved: true,
      freshExactApprovalReceiptObserved: false,
      fallbackDistinctionReceiptObserved: false,
      windowsWslSmokeReceiptObserved: false,
      receiptBundleAppliedToCompletionAudit: false
    },
    expectedDecision: 'phase2_governed_native_read_partial_observation_accepted',
    counters: counters()
  };
  return {
    ...base,
    ...overrides,
    executionAuthority: { ...base.executionAuthority, ...(overrides.executionAuthority || {}) },
    observations: overrides.observations || base.observations,
    platform: { ...base.platform, ...(overrides.platform || {}) },
    receiptCoverage: { ...base.receiptCoverage, ...(overrides.receiptCoverage || {}) },
    counters: counters(overrides.counters || {})
  };
}

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

function assertNoUnsafeCompletion(result) {
  assert.equal(result.phase2Completed, false);
  assert.equal(result.receiptBundleAppliedToCompletionAudit, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.primaryMemoryStoreWritten, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2073 accepts three governed native read observations as partial Phase 2 evidence', () => {
  const result = evaluatePhase2GovernedNativeReadObservationContract(validInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase2GovernedNativeReadObservationPassed, true);
  assert.deepEqual(result.observedTools, TOOLS);
  assert.equal(result.candidateCompletionEvidence.nativeReadProofPassed, true);
  assert.equal(result.candidateCompletionEvidence.wslLinuxProofPassed, true);
  assert.equal(result.candidateCompletionEvidence.fallbackDistinctionPassed, false);
  assert.equal(result.candidateCompletionEvidence.windowsWslSmokePassed, false);
  assert.deepEqual(result.remainingReceiptCategories, [
    'freshExactApprovalReceipt',
    'fallbackDistinctionReceipt',
    'windowsWslSmokeReceipt',
    'receiptBundleApplicationEvidence'
  ]);
  assertNoUnsafeCompletion(result);
});

test('CM2073 blocks tool order or native runtime drift', () => {
  const observations = TOOLS.map(toolName => observation(toolName));
  observations[0].toolName = 'memory_overview';
  observations[1].nativeRuntimeCalled = false;
  const result = evaluatePhase2GovernedNativeReadObservationContract(validInput({
    observations,
    expectedDecision: 'phase2_governed_native_read_observation_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('observations[0].toolName'));
  assert.ok(result.blockers.includes('observations[1].nativeRuntimeCalled'));
  assertNoUnsafeCompletion(result);
});

test('CM2073 stops L4 on write authority or primary-store write drift', () => {
  const result = evaluatePhase2GovernedNativeReadObservationContract(validInput({
    executionAuthority: { writeAuthorityGranted: true },
    counters: { primaryMemoryStoreWrites: 1 },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('executionAuthority.writeAuthorityGranted'));
  assert.ok(result.blockers.includes('counters.primaryMemoryStoreWrites'));
  assertNoUnsafeCompletion(result);
});

test('CM2073 blocks low-disclosure or audit receipt gaps', () => {
  const observations = TOOLS.map(toolName => observation(toolName));
  observations[2].rawAuditReturned = true;
  observations[2].localAuditReceiptAppended = false;
  const result = evaluatePhase2GovernedNativeReadObservationContract(validInput({
    observations,
    expectedDecision: 'phase2_governed_native_read_observation_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('observations[2].rawAuditReturned'));
  assert.ok(result.blockers.includes('observations[2].localAuditReceiptAppended'));
  assertNoUnsafeCompletion(result);
});

test('CM2073 rejects counter mismatch instead of inventing receipt counts', () => {
  const result = evaluatePhase2GovernedNativeReadObservationContract(validInput({
    counters: { providerApiCalls: 2, derivedIndexWrites: 2 },
    expectedDecision: 'phase2_governed_native_read_observation_blocked'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('counters.providerApiCalls'));
  assert.ok(result.blockers.includes('counters.derivedIndexWrites'));
  assertNoUnsafeCompletion(result);
});

test('CM2073 rejects forbidden raw fields by path without value echo', () => {
  const input = validInput();
  input.observations[0].responseBody = 'DO_NOT_ECHO';
  const result = evaluatePhase2GovernedNativeReadObservationContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_locator_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, ['observations[0].responseBody']);
  assert.equal(JSON.stringify(result).includes('DO_NOT_ECHO'), false);
  assert.deepEqual(collectForbiddenFields(input), ['observations[0].responseBody']);
  assertNoUnsafeCompletion(result);
});

test('CM2073 stops overclaims for unobserved fallback Windows smoke or bundle application', () => {
  const result = evaluatePhase2GovernedNativeReadObservationContract(validInput({
    receiptCoverage: {
      fallbackDistinctionReceiptObserved: true,
      windowsWslSmokeReceiptObserved: true,
      receiptBundleAppliedToCompletionAudit: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('receiptCoverage.fallbackDistinctionReceiptObserved'));
  assert.ok(result.blockers.includes('receiptCoverage.windowsWslSmokeReceiptObserved'));
  assert.ok(result.blockers.includes('receiptCoverage.receiptBundleAppliedToCompletionAudit'));
  assertNoUnsafeCompletion(result);
});

test('CM2073 completion audit requires the governed native read observation without completing Phase 2', () => {
  const evidence = fullEvidence();
  evidence.phase2GovernedNativeReadObservationPassed = false;
  evidence.fallbackDistinctionPassed = false;
  evidence.windowsWslSmokePassed = false;
  evidence.phase2ReceiptBundleAppliedToCompletionAudit = false;
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2GovernedNativeReadObservationPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_fallbackDistinctionPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_windowsWslSmokePassed'
  ));
  assertNoUnsafeCompletion({
    phase2Completed: false,
    receiptBundleAppliedToCompletionAudit: false,
    memoryWritten: result.sideEffects.runtimeWriteExecuted,
    primaryMemoryStoreWritten: false,
    nativeWriteExecuted: result.sideEffects.nativeWriteExecuted,
    rawPrivateStateRead: result.sideEffects.rawPrivateStateRead,
    publicMcpExpanded: result.sideEffects.publicMcpExpanded,
    readinessClaimed: result.nonClaims.rcReadyClaimed
  });
});
