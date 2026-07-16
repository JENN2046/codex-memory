'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract
} = require('../src/core/VcpNativeRuntimeStartupTargetLocatorDiagnosisContract');

function diagnosisInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1924',
    runtimeStartupState: {
      lane: 'runtime_startup_state',
      currentStatus: 'unknown',
      liveRequired: true,
      processCountBucket: 'unknown',
      processCountBucketDisclosed: false,
      runningOrNotRunningKnown: false,
      pidDisclosed: false,
      commandLineRead: false,
      envRead: false,
      logsRead: false,
      requiresExactApproval: true
    },
    targetLocatorBinding: {
      lane: 'target_locator_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      currentStatus: 'unknown',
      liveRequired: 'maybe',
      locatorPresenceCategory: 'unknown',
      locatorHashPresent: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      configPathDisclosed: false,
      envValueRead: false,
      tokenRead: false,
      requiresExactApproval: true
    },
    transportWrapperShape: {
      lane: 'transport_wrapper_shape',
      currentStatus: 'source_reviewed_live_unproven',
      sourceOnlyWrapperPlanReview: true,
      wrapperTypeCategory: 'vcp_native_no_write_no_body_leak_runtime_call_wrapper',
      noWriteBudgetZero: true,
      noBodyBudgetZero: true,
      requestBodyGenerated: false,
      responseBodyRead: false,
      liveRequiredForActualProof: true
    },
    serviceListenerMismatch: {
      lane: 'service_listener_mismatch',
      currentStatus: 'unknown',
      liveRequired: true,
      reachableKnown: false,
      statusClassKnown: false,
      durationBucket: 'not_measured',
      endpointDisclosed: false,
      routePayloadRead: false,
      logsRead: false,
      requiresExactApproval: true
    },
    approvalPacketGap: {
      lane: 'approval_packet_gap',
      currentStatus: 'likely',
      liveRequired: false,
      exactApprovalPacketNeeded: true,
      exactApprovalRequiredBeforeNextLiveCall: true,
      approvalLineGenerated: false,
      requestBodyGenerated: false,
      componentActionProbeIncluded: false,
      readShapeIncluded: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1924 accepts low-disclosure runtime startup target locator diagnosis contract', () => {
  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(diagnosisInput());

  assert.equal(result.accepted, true);
  assert.equal(result.diagnosisContractLocked, true);
  assert.deepEqual(result.diagnosis_result, {
    accepted: true,
    runtimeStartupStateKnown: false,
    processCountBucketDisclosed: false,
    targetLocatorBindingKnown: false,
    locatorValueDisclosed: false,
    endpointDisclosed: false,
    transportWrapperShapeReviewed: true,
    transportWrapperLiveProofKnown: false,
    serviceListenerMismatchKnown: false,
    approvalPacketGapKnown: true,
    componentActionStatusProbeUnlocked: false,
    readShapeUnlocked: false,
    nextLiveDiagnosticRequiresExactApproval: true
  });
  assert.equal(result.lowDisclosureProjection.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.liveProcessInspected, false);
  assert.equal(result.endpointDisclosed, false);
  assert.equal(result.locatorValueDisclosed, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.logRead, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.runtimeBindingChanged, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1924 accepts category-only target locator presence without locator disclosure', () => {
  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(diagnosisInput({
    targetLocatorBinding: {
      lane: 'target_locator_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      currentStatus: 'unknown',
      liveRequired: 'maybe',
      locatorPresenceCategory: 'binding_present_category_only',
      locatorHashPresent: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      configPathDisclosed: false,
      envValueRead: false,
      tokenRead: false,
      requiresExactApproval: true
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.diagnosis_result.targetLocatorBindingKnown, false);
  assert.equal(result.diagnosis_result.locatorValueDisclosed, false);
  assert.equal(result.diagnosis_result.endpointDisclosed, false);
});

test('CM1924 rejects endpoint locator config log raw body request approval pid fields without echo', () => {
  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(diagnosisInput({
    endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    configEnv: 'PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO',
    token: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    requestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    pid: 'PRIVATE_PID_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_runtime_startup_target_locator_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('configEnv'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('pid'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PID_SHOULD_NOT_ECHO'), false);
});

test('CM1924 rejects live process locator listener request body and readiness drift', () => {
  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(diagnosisInput({
    runtimeStartupState: {
      lane: 'runtime_startup_state',
      currentStatus: 'running',
      liveRequired: true,
      processCountBucket: 'one',
      processCountBucketDisclosed: true,
      runningOrNotRunningKnown: true,
      pidDisclosed: true,
      commandLineRead: true,
      envRead: true,
      logsRead: true,
      requiresExactApproval: false
    },
    targetLocatorBinding: {
      lane: 'target_locator_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      currentStatus: 'known',
      liveRequired: 'maybe',
      locatorPresenceCategory: 'unknown',
      locatorHashPresent: true,
      locatorValueDisclosed: true,
      endpointDisclosed: true,
      configPathDisclosed: true,
      envValueRead: true,
      tokenRead: true,
      requiresExactApproval: false
    },
    transportWrapperShape: {
      lane: 'transport_wrapper_shape',
      currentStatus: 'live_proven',
      sourceOnlyWrapperPlanReview: true,
      wrapperTypeCategory: 'vcp_native_no_write_no_body_leak_runtime_call_wrapper',
      noWriteBudgetZero: false,
      noBodyBudgetZero: false,
      requestBodyGenerated: true,
      responseBodyRead: true,
      liveRequiredForActualProof: false
    },
    serviceListenerMismatch: {
      lane: 'service_listener_mismatch',
      currentStatus: 'reachable',
      liveRequired: true,
      reachableKnown: true,
      statusClassKnown: true,
      durationBucket: 'lt_100ms',
      endpointDisclosed: true,
      routePayloadRead: true,
      logsRead: true,
      requiresExactApproval: false
    },
    approvalPacketGap: {
      lane: 'approval_packet_gap',
      currentStatus: 'ready',
      liveRequired: true,
      exactApprovalPacketNeeded: false,
      exactApprovalRequiredBeforeNextLiveCall: false,
      approvalLineGenerated: true,
      requestBodyGenerated: true,
      componentActionProbeIncluded: true,
      readShapeIncluded: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_startup_target_locator_contract');
  assert.ok(result.invalidFields.includes('runtimeStartupState.currentStatus'));
  assert.ok(result.invalidFields.includes('runtimeStartupState.processCountBucket'));
  assert.ok(result.invalidFields.includes('targetLocatorBinding.locatorValueDisclosed'));
  assert.ok(result.invalidFields.includes('targetLocatorBinding.endpointDisclosed'));
  assert.ok(result.invalidFields.includes('transportWrapperShape.requestBodyGenerated'));
  assert.ok(result.invalidFields.includes('serviceListenerMismatch.reachableKnown'));
  assert.ok(result.invalidFields.includes('serviceListenerMismatch.statusClassKnown'));
  assert.ok(result.invalidFields.includes('approvalPacketGap.approvalLineGenerated'));
  assert.ok(result.invalidFields.includes('approvalPacketGap.readShapeIncluded'));
  assert.equal(result.diagnosis_result.readShapeUnlocked, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1924 rejects nonzero and unknown side-effect counters', () => {
  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(diagnosisInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      networkCalls: 1,
      liveProcessInspections: 1,
      locatorValueDisclosures: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_or_unknown_runtime_startup_target_locator_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('networkCalls'));
  assert.ok(result.forbiddenCounters.includes('liveProcessInspections'));
  assert.ok(result.forbiddenCounters.includes('locatorValueDisclosures'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
  assert.ok(result.forbiddenCounters.includes('unknownCounter'));
  assert.equal(result.runtimeExecuted, false);
});

test('CM1924 rejects unsafe target reference without echo', () => {
  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(diagnosisInput({
    targetLocatorBinding: {
      lane: 'target_locator_binding',
      targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO',
      currentStatus: 'unknown',
      liveRequired: 'maybe',
      locatorPresenceCategory: 'unknown',
      locatorHashPresent: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      configPathDisclosed: false,
      envValueRead: false,
      tokenRead: false,
      requiresExactApproval: true
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_startup_target_locator_contract');
  assert.ok(result.invalidFields.includes('targetLocatorBinding.targetReferenceName'));
  assert.equal(result.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('PRIVATE/LOCATOR/SHOULD_NOT_ECHO'), false);
});

test('CM1924 reports missing required lane fields', () => {
  const input = diagnosisInput();
  delete input.runtimeStartupState.processCountBucket;
  delete input.targetLocatorBinding.locatorPresenceCategory;
  delete input.transportWrapperShape.wrapperTypeCategory;
  delete input.serviceListenerMismatch.statusClassKnown;
  delete input.approvalPacketGap.exactApprovalPacketNeeded;

  const result = buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_runtime_startup_target_locator_fields');
  assert.ok(result.missingFields.includes('runtimeStartupState.processCountBucket'));
  assert.ok(result.missingFields.includes('targetLocatorBinding.locatorPresenceCategory'));
  assert.ok(result.missingFields.includes('transportWrapperShape.wrapperTypeCategory'));
  assert.ok(result.missingFields.includes('serviceListenerMismatch.statusClassKnown'));
  assert.ok(result.missingFields.includes('approvalPacketGap.exactApprovalPacketNeeded'));
});

test('CM1924 public MCP surface is unchanged', () => {
  assert.deepEqual(TOOL_DEFINITIONS.map(tool => tool.name).sort(), [
    'audit_memory',
    'memory_overview',
  'prepare_memory_context',
'propose_memory_delta',
'record_memory',
    'search_memory',
    'supersede_memory',
    'tombstone_memory',
    'validate_memory'
  ]);
});
