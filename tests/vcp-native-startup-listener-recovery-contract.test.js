'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeStartupListenerRecoveryContract
} = require('../src/core/VcpNativeStartupListenerRecoveryContract');

function recoveryInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1935',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    runtimeProcessStateBucket: {
      lane: 'runtime_process_state_bucket',
      currentStatus: 'unknown',
      liveRequired: true,
      processCountBucket: 'not_checked',
      processCountBucketDisclosed: false,
      runningCategoryKnown: false,
      processIdentifiersDisclosed: false,
      commandLineRead: false,
      envRead: false,
      configRead: false,
      logsRead: false,
      requiresExactApproval: true
    },
    serviceStartupListenerRecovery: {
      lane: 'service_startup_listener_recovery',
      currentStatus: 'not_authorized',
      serviceStartAllowedNow: false,
      runtimeStarted: false,
      runtimeStopped: false,
      runtimeRestarted: false,
      startAttemptCategory: 'not_attempted',
      startResultCategory: 'not_attempted',
      durationBucket: 'not_measured',
      postStartListenerStatusCategory: 'not_checked',
      stdoutStderrRead: false,
      configEnvRead: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      startupPersistenceChanged: false,
      dependencyChanged: false,
      requiresExactApproval: true
    },
    targetSafeReferenceBinding: {
      lane: 'target_safe_reference_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      currentStatus: 'reference_name_only',
      bindingCategory: 'reference_name_only',
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      configPathDisclosed: false,
      envValueRead: false,
      tokenRead: false,
      requiresExactApprovalForConcreteLocator: true
    },
    serviceListenerRecheck: {
      lane: 'service_listener_recheck',
      currentStatus: 'not_authorized',
      listenerRecheckAllowedNow: false,
      maxFutureRecheckAttemptsCategory: 'one_only_after_exact_approval',
      requestBodyGenerated: false,
      responseBodyRead: false,
      rawErrorPayloadRead: false,
      statusCategory: 'not_checked',
      statusClassKnown: false,
      durationBucket: 'not_measured',
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      requiresExactApproval: true
    },
    transportWrapperShape: {
      lane: 'transport_wrapper_shape',
      currentStatus: 'source_intended_live_unproven',
      wrapperShapeCategory: 'no_body_no_request_listener_transport',
      writeBudgetZero: true,
      bodyBudgetZero: true,
      requestBodyGenerated: false,
      responseBodyRead: false,
      rawErrorPayloadRead: false,
      liveBehaviorProven: false
    },
    approvalBoundary: {
      lane: 'approval_boundary',
      nextExactApprovalRequired: true,
      approvalLineGenerated: false,
      requestBodyGenerated: false,
      liveExecutionAllowedNow: false,
      componentActionProbeIncluded: false,
      readShapeIncluded: false,
      readinessClaim: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1935 accepts low-disclosure startup listener recovery contract', () => {
  const result = buildVcpNativeStartupListenerRecoveryContract(recoveryInput());

  assert.equal(result.accepted, true);
  assert.equal(result.recoveryContractLocked, true);
  assert.deepEqual(result.recovery_result, {
    accepted: true,
    runtimeProcessStateKnown: false,
    processCountBucketDisclosed: false,
    runningCategoryKnown: false,
    serviceStartupRecoveryAuthorizedNow: false,
    serviceStartAttempted: false,
    listenerRecheckAuthorizedNow: false,
    listenerRecheckAttempted: false,
    targetReferenceKnown: true,
    targetLocatorBindingKnown: false,
    locatorValueDisclosed: false,
    endpointDisclosed: false,
    transportWrapperShapeLocked: true,
    transportWrapperLiveProofKnown: false,
    componentActionStatusProbeUnlocked: false,
    readShapeUnlocked: false,
    nextLiveRecoveryRequiresExactApproval: true
  });
  assert.equal(result.lowDisclosureProjection.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.liveProcessInspected, false);
  assert.equal(result.serviceStartAttempted, false);
  assert.equal(result.listenerRecheckAttempted, false);
  assert.equal(result.endpointDisclosed, false);
  assert.equal(result.locatorValueDisclosed, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.logRead, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawErrorPayloadRead, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1935 rejects endpoint locator raw body log approval process and startup fields without echo', () => {
  const result = buildVcpNativeStartupListenerRecoveryContract(recoveryInput({
    endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    pid: 'PRIVATE_PID_SHOULD_NOT_ECHO',
    commandLine: 'PRIVATE_COMMAND_SHOULD_NOT_ECHO',
    startupCommand: 'PRIVATE_STARTUP_COMMAND_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_startup_listener_recovery_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('pid'));
  assert.ok(result.forbiddenFields.includes('commandLine'));
  assert.ok(result.forbiddenFields.includes('startupCommand'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_STARTUP_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
});

test('CM1935 rejects runtime startup listener recheck request body and readiness drift', () => {
  const result = buildVcpNativeStartupListenerRecoveryContract(recoveryInput({
    runtimeProcessStateBucket: {
      ...recoveryInput().runtimeProcessStateBucket,
      currentStatus: 'running',
      processCountBucket: 'one',
      processCountBucketDisclosed: true,
      runningCategoryKnown: true,
      processIdentifiersDisclosed: true,
      commandLineRead: true,
      envRead: true,
      configRead: true,
      logsRead: true,
      requiresExactApproval: false
    },
    serviceStartupListenerRecovery: {
      ...recoveryInput().serviceStartupListenerRecovery,
      serviceStartAllowedNow: true,
      runtimeStarted: true,
      startAttemptCategory: 'attempted',
      startResultCategory: 'started',
      durationBucket: 'lt_1s',
      postStartListenerStatusCategory: 'reachable',
      stdoutStderrRead: true,
      configEnvRead: true,
      endpointDisclosed: true,
      locatorValueDisclosed: true,
      startupPersistenceChanged: true,
      dependencyChanged: true,
      requiresExactApproval: false
    },
    targetSafeReferenceBinding: {
      ...recoveryInput().targetSafeReferenceBinding,
      currentStatus: 'concrete_locator_known',
      bindingCategory: 'raw_locator_known',
      locatorValueDisclosed: true,
      endpointDisclosed: true,
      configPathDisclosed: true,
      envValueRead: true,
      tokenRead: true,
      requiresExactApprovalForConcreteLocator: false
    },
    serviceListenerRecheck: {
      ...recoveryInput().serviceListenerRecheck,
      listenerRecheckAllowedNow: true,
      requestBodyGenerated: true,
      responseBodyRead: true,
      rawErrorPayloadRead: true,
      statusCategory: 'reachable',
      statusClassKnown: true,
      durationBucket: 'lt_100ms',
      endpointDisclosed: true,
      locatorValueDisclosed: true,
      requiresExactApproval: false
    },
    transportWrapperShape: {
      ...recoveryInput().transportWrapperShape,
      writeBudgetZero: false,
      bodyBudgetZero: false,
      requestBodyGenerated: true,
      responseBodyRead: true,
      rawErrorPayloadRead: true,
      liveBehaviorProven: true
    },
    approvalBoundary: {
      ...recoveryInput().approvalBoundary,
      nextExactApprovalRequired: false,
      approvalLineGenerated: true,
      requestBodyGenerated: true,
      liveExecutionAllowedNow: true,
      componentActionProbeIncluded: true,
      readShapeIncluded: true,
      readinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_startup_listener_recovery_contract');
  assert.ok(result.invalidFields.includes('runtimeProcessStateBucket.processCountBucket'));
  assert.ok(result.invalidFields.includes('runtimeProcessStateBucket.processCountBucketDisclosed'));
  assert.ok(result.invalidFields.includes('serviceStartupListenerRecovery.serviceStartAllowedNow'));
  assert.ok(result.invalidFields.includes('serviceStartupListenerRecovery.runtimeStarted'));
  assert.ok(result.invalidFields.includes('targetSafeReferenceBinding.locatorValueDisclosed'));
  assert.ok(result.invalidFields.includes('serviceListenerRecheck.listenerRecheckAllowedNow'));
  assert.ok(result.invalidFields.includes('serviceListenerRecheck.requestBodyGenerated'));
  assert.ok(result.invalidFields.includes('transportWrapperShape.liveBehaviorProven'));
  assert.ok(result.invalidFields.includes('approvalBoundary.liveExecutionAllowedNow'));
  assert.ok(result.invalidFields.includes('approvalBoundary.readShapeIncluded'));
  assert.equal(result.recovery_result.readShapeUnlocked, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1935 rejects unknown fields and nonzero counters', () => {
  const unknown = buildVcpNativeStartupListenerRecoveryContract(recoveryInput({
    runtimeReachable: false
  }));
  const counters = buildVcpNativeStartupListenerRecoveryContract(recoveryInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      networkCalls: 1,
      liveProcessInspections: 1,
      serviceStartAttempts: 1,
      listenerRecheckAttempts: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unknown_startup_listener_recovery_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['runtimeReachable']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_startup_listener_recovery_counters');
  assert.ok(counters.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(counters.forbiddenCounters.includes('networkCalls'));
  assert.ok(counters.forbiddenCounters.includes('liveProcessInspections'));
  assert.ok(counters.forbiddenCounters.includes('serviceStartAttempts'));
  assert.ok(counters.forbiddenCounters.includes('listenerRecheckAttempts'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1935 rejects unsafe or mismatched target reference without echo', () => {
  const unsafe = buildVcpNativeStartupListenerRecoveryContract(recoveryInput({
    targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO',
    targetSafeReferenceBinding: {
      ...recoveryInput().targetSafeReferenceBinding,
      targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO'
    }
  }));
  const mismatched = buildVcpNativeStartupListenerRecoveryContract(recoveryInput({
    targetSafeReferenceBinding: {
      ...recoveryInput().targetSafeReferenceBinding,
      targetReferenceName: 'different-safe-reference'
    }
  }));
  const serialized = JSON.stringify(unsafe);

  assert.equal(unsafe.accepted, false);
  assert.equal(unsafe.reasonCode, 'invalid_startup_listener_recovery_contract');
  assert.ok(unsafe.invalidFields.includes('targetReferenceName'));
  assert.ok(unsafe.invalidFields.includes('targetSafeReferenceBinding.targetReferenceName'));
  assert.equal(unsafe.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('PRIVATE/LOCATOR/SHOULD_NOT_ECHO'), false);

  assert.equal(mismatched.accepted, false);
  assert.equal(mismatched.reasonCode, 'invalid_startup_listener_recovery_contract');
  assert.ok(mismatched.invalidFields.includes('targetSafeReferenceBinding.targetReferenceName'));
});

test('CM1935 reports missing required lane fields', () => {
  const input = recoveryInput();
  delete input.runtimeProcessStateBucket.processCountBucket;
  delete input.serviceStartupListenerRecovery.startAttemptCategory;
  delete input.targetSafeReferenceBinding.bindingCategory;
  delete input.serviceListenerRecheck.statusCategory;
  delete input.transportWrapperShape.wrapperShapeCategory;
  delete input.approvalBoundary.nextExactApprovalRequired;

  const result = buildVcpNativeStartupListenerRecoveryContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_startup_listener_recovery_fields');
  assert.ok(result.missingFields.includes('runtimeProcessStateBucket.processCountBucket'));
  assert.ok(result.missingFields.includes('serviceStartupListenerRecovery.startAttemptCategory'));
  assert.ok(result.missingFields.includes('targetSafeReferenceBinding.bindingCategory'));
  assert.ok(result.missingFields.includes('serviceListenerRecheck.statusCategory'));
  assert.ok(result.missingFields.includes('transportWrapperShape.wrapperShapeCategory'));
  assert.ok(result.missingFields.includes('approvalBoundary.nextExactApprovalRequired'));
});

test('CM1935 public MCP surface is unchanged', () => {
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
