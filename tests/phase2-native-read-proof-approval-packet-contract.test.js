'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectForbiddenFields,
  evaluatePhase2NativeReadProofApprovalPacketContract
} = require('../src/core/Phase2NativeReadProofApprovalPacketContract');

function zeroCounters() {
  return {
    packetsSubmitted: 0,
    approvalLineOperations: 0,
    approvalGrantsAccepted: 0,
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

function validPacket(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-2021',
    mode: 'local-approval-packet-boundary',
    readinessGateEvidence: {
      cm2019EvidenceGateAccepted: true,
      cm2020ReadinessGateAccepted: true,
      completionAuditStillRequiresReceipts: true,
      phase2StillIncomplete: true
    },
    packet: {
      packetPrepared: true,
      packetDisplayed: false,
      packetSubmitted: false,
      exactApprovalGranted: false,
      approvalLineGenerated: false,
      approvalLineValueDisclosed: false,
      freshCurrentSingleUseApprovalRequired: true,
      taskScopeBound: true,
      operatorIntentScopeBound: true,
      nonAuthorizingBoundaryOnly: true
    },
    targetBoundary: {
      safeTargetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetReferenceCategory: 'safe_reference_name_only',
      nativeTargetBindingRequired: true,
      endpointLocatorAbsent: true,
      rawRuntimeStateAbsent: true,
      providerPayloadAbsent: true
    },
    proofBudget: {
      maxNativeReadAttempts: 1,
      maxSearchMemoryCalls: 1,
      maxMemoryOverviewCalls: 1,
      maxAuditMemoryCalls: 1,
      maxServiceStartStopActions: 0,
      maxProcessInspections: 0,
      allowProviderApiCalls: false,
      allowNativeWrite: false,
      allowDurableMutation: false,
      allowPublicMcpExpansion: false
    },
    receiptRequirements: {
      nativeTargetBindingReceiptRequired: true,
      nativeReadAttemptReceiptRequired: true,
      nativeReadSuccessReceiptRequired: true,
      auditReceiptRequired: true,
      fallbackDistinctionReceiptRequired: true,
      wslLinuxReceiptRequired: true,
      windowsWslSmokeReceiptRequired: true,
      lowDisclosureReceiptRequired: true,
      rawResponseForbidden: true,
      memoryContentForbidden: true
    },
    output: {
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
    expectedDecision: 'native_read_proof_approval_packet_ready_for_boundary_display',
    counters: zeroCounters()
  };

  return {
    ...base,
    ...overrides,
    readinessGateEvidence: { ...base.readinessGateEvidence, ...(overrides.readinessGateEvidence || {}) },
    packet: { ...base.packet, ...(overrides.packet || {}) },
    targetBoundary: { ...base.targetBoundary, ...(overrides.targetBoundary || {}) },
    proofBudget: { ...base.proofBudget, ...(overrides.proofBudget || {}) },
    receiptRequirements: { ...base.receiptRequirements, ...(overrides.receiptRequirements || {}) },
    output: { ...base.output, ...(overrides.output || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.packetSubmitted, false);
  assert.equal(result.exactApprovalGranted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.nativeReadAttempted, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2021 accepts non-authorizing native read proof approval packet boundary', () => {
  const result = evaluatePhase2NativeReadProofApprovalPacketContract(validPacket());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'native_read_proof_approval_packet_ready_for_boundary_display');
  assert.equal(result.packetReadyForBoundaryDisplay, true);
  assert.equal(result.nextGate, 'display_non_authorizing_packet_for_jenn_exact_approval_boundary');
  assert.equal(result.lowDisclosurePacketSummary.safeTargetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.lowDisclosurePacketSummary.maxNativeReadAttempts, 1);
  assert.equal(result.lowDisclosurePacketSummary.readOnlyToolCallBudget, 3);
  assert.equal(result.lowDisclosurePacketSummary.exactApprovalGranted, false);
  assertNoSideEffects(result);
});

test('CM2021 blocks packet when CM2019 or CM2020 prerequisite evidence is absent', () => {
  const result = evaluatePhase2NativeReadProofApprovalPacketContract(validPacket({
    readinessGateEvidence: {
      cm2019EvidenceGateAccepted: false,
      cm2020ReadinessGateAccepted: false
    },
    expectedDecision: 'native_read_proof_approval_packet_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('readinessGateEvidence.cm2019EvidenceGateAccepted'));
  assert.ok(result.blockers.includes('readinessGateEvidence.cm2020ReadinessGateAccepted'));
  assertNoSideEffects(result);
});

test('CM2021 blocks packet when budget permits service process provider write or expansion', () => {
  const result = evaluatePhase2NativeReadProofApprovalPacketContract(validPacket({
    proofBudget: {
      maxServiceStartStopActions: 1,
      maxProcessInspections: 1,
      allowProviderApiCalls: true,
      allowNativeWrite: true,
      allowPublicMcpExpansion: true
    },
    expectedDecision: 'native_read_proof_approval_packet_blocked_missing_prerequisites'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('proofBudget.maxServiceStartStopActions'));
  assert.ok(result.blockers.includes('proofBudget.maxProcessInspections'));
  assert.ok(result.blockers.includes('proofBudget.allowProviderApiCalls'));
  assert.ok(result.blockers.includes('proofBudget.allowNativeWrite'));
  assert.ok(result.blockers.includes('proofBudget.allowPublicMcpExpansion'));
  assertNoSideEffects(result);
});

test('CM2021 stops L4 if packet submission approval line or runtime counters are present', () => {
  const result = evaluatePhase2NativeReadProofApprovalPacketContract(validPacket({
    packet: {
      packetSubmitted: true,
      exactApprovalGranted: true,
      approvalLineGenerated: true
    },
    counters: {
      packetsSubmitted: 1,
      approvalLineOperations: 1,
      runtimeCalls: 1,
      nativeReadAttempts: 1,
      memoryReads: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, 'stop_l4');
  assert.ok(result.blockers.includes('packet.packetSubmitted'));
  assert.ok(result.blockers.includes('packet.exactApprovalGranted'));
  assert.ok(result.blockers.includes('packet.approvalLineGenerated'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assert.ok(result.blockers.includes('counters.nativeReadAttempts'));
  assertNoSideEffects(result);
});

test('CM2021 stops L4 if output includes raw values or approval line material', () => {
  const result = evaluatePhase2NativeReadProofApprovalPacketContract(validPacket({
    output: {
      endpointLocatorIncluded: true,
      queryTextIncluded: true,
      responseBodyIncluded: true,
      approvalLineIncluded: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('output.endpointLocatorIncluded'));
  assert.ok(result.blockers.includes('output.queryTextIncluded'));
  assert.ok(result.blockers.includes('output.responseBodyIncluded'));
  assert.ok(result.blockers.includes('output.approvalLineIncluded'));
  assertNoSideEffects(result);
});

test('CM2021 rejects raw secret runtime fields by path without echoing values', () => {
  const result = evaluatePhase2NativeReadProofApprovalPacketContract({
    ...validPacket(),
    nested: {
      endpoint: 'ECHO_ENDPOINT',
      queryText: 'ECHO_QUERY',
      bearerToken: 'ECHO_TOKEN',
      approvalLineValue: 'ECHO_APPROVAL'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'nested.endpoint',
    'nested.queryText',
    'nested.bearerToken',
    'nested.approvalLineValue'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_QUERY'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
});

test('CM2021 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    approvalLine: 'DO_NOT_ECHO_A',
    nested: {
      rawMemory: 'DO_NOT_ECHO_B'
    }
  }), [
    'approvalLine',
    'nested.rawMemory'
  ]);
});
