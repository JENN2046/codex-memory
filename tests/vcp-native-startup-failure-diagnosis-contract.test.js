'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeStartupFailureDiagnosisContract
} = require('../src/core/VcpNativeStartupFailureDiagnosisContract');

function diagnosisInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1941',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    startupInvocationShape: {
      lane: 'startup_invocation_shape',
      currentStatus: 'unknown',
      liveRequiredNow: false,
      sourceOnlyWrapperPlanCategory: 'source_only_wrapper_plan_category',
      invocationShapeCategory: 'category_only',
      commandLineDisclosed: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      configPathOrValueDisclosed: false,
      envValueRead: false,
      requiresExactApprovalForLiveStartup: true
    },
    startupProcessLifecycle: {
      lane: 'startup_process_lifecycle',
      currentStatus: 'unknown',
      liveRequiredNow: true,
      requiresFutureExactApproval: true,
      processCountBucket: 'not_checked',
      lifecycleCategory: 'unknown',
      processIdentifiersDisclosed: false,
      commandLineRead: false,
      envRead: false,
      stdoutStderrRead: false,
      logsRead: false
    },
    startupResultCapture: {
      lane: 'startup_result_capture',
      currentStatus: 'unknown',
      liveRequiredNow: true,
      requiresFutureExactApproval: true,
      startupResultCategory: 'unknown',
      durationBucket: 'not_measured',
      zeroWriteCounters: true,
      rawErrorPayloadRead: false,
      stdoutStderrRead: false,
      logsRead: false,
      configEnvRead: false,
      secretRead: false
    },
    listenerAfterStart: {
      lane: 'listener_after_start',
      currentStatus: 'unknown',
      liveRequiredNow: true,
      requiresFutureExactApproval: true,
      listenerStatusCategory: 'not_checked',
      statusClassKnown: false,
      durationBucket: 'not_measured',
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      responseBodyRead: false,
      rawErrorPayloadRead: false
    },
    targetSafeReferenceBinding: {
      lane: 'target_safe_reference_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      currentStatus: 'reference_name_only',
      liveRequiredNow: false,
      bindingCategory: 'reference_name_only',
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      configPathOrValueDisclosed: false,
      envValueRead: false
    },
    operatorMediatedManualEvidence: {
      lane: 'operator_mediated_manual_evidence',
      currentStatus: 'not_provided',
      liveRequiredNow: false,
      manualObservationCategory: 'not_provided',
      noRawOutputConfirmation: false,
      noSecretConfirmation: false,
      rawLogsProvided: false,
      stdoutStderrTextProvided: false,
      endpointDisclosed: false,
      configEnvRead: false,
      tokenRead: false
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

test('CM1941 accepts low-disclosure startup failure diagnosis contract', () => {
  const result = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput());

  assert.equal(result.accepted, true);
  assert.equal(result.startupFailureDiagnosisContractLocked, true);
  assert.deepEqual(result.diagnosis_result, {
    accepted: true,
    startupInvocationShapeContracted: true,
    startupProcessLifecycleKnown: false,
    processCountBucketDisclosed: false,
    startupResultKnown: false,
    listenerAfterStartKnown: false,
    targetReferenceKnown: true,
    targetLocatorBindingKnown: false,
    operatorManualEvidenceAccepted: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    componentActionStatusProbeUnlocked: false,
    readShapeUnlocked: false,
    nextLiveDiagnosticRequiresExactApproval: true
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

test('CM1941 rejects endpoint locator command config log raw body approval process fields without echo', () => {
  const result = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput({
    endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    commandLine: 'PRIVATE_COMMAND_SHOULD_NOT_ECHO',
    configEnv: 'PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO',
    token: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    requestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    pid: 'PRIVATE_PID_SHOULD_NOT_ECHO',
    startupCommand: 'PRIVATE_STARTUP_COMMAND_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_startup_failure_diagnosis_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('commandLine'));
  assert.ok(result.forbiddenFields.includes('configEnv'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('pid'));
  assert.ok(result.forbiddenFields.includes('startupCommand'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_STARTUP_COMMAND_SHOULD_NOT_ECHO'), false);
});

test('CM1941 rejects live startup process listener and readiness drift', () => {
  const result = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput({
    startupInvocationShape: {
      ...diagnosisInput().startupInvocationShape,
      currentStatus: 'known',
      liveRequiredNow: true,
      commandLineDisclosed: true,
      endpointDisclosed: true,
      locatorValueDisclosed: true,
      configPathOrValueDisclosed: true,
      envValueRead: true,
      requiresExactApprovalForLiveStartup: false
    },
    startupProcessLifecycle: {
      ...diagnosisInput().startupProcessLifecycle,
      currentStatus: 'running',
      requiresFutureExactApproval: false,
      processCountBucket: 'one',
      lifecycleCategory: 'running',
      processIdentifiersDisclosed: true,
      commandLineRead: true,
      envRead: true,
      stdoutStderrRead: true,
      logsRead: true
    },
    startupResultCapture: {
      ...diagnosisInput().startupResultCapture,
      currentStatus: 'known',
      requiresFutureExactApproval: false,
      startupResultCategory: 'started',
      durationBucket: 'lt_1s',
      zeroWriteCounters: false,
      rawErrorPayloadRead: true,
      stdoutStderrRead: true,
      logsRead: true,
      configEnvRead: true,
      secretRead: true
    },
    listenerAfterStart: {
      ...diagnosisInput().listenerAfterStart,
      currentStatus: 'reachable',
      requiresFutureExactApproval: false,
      listenerStatusCategory: 'reachable',
      statusClassKnown: true,
      durationBucket: 'lt_100ms',
      endpointDisclosed: true,
      locatorValueDisclosed: true,
      responseBodyRead: true,
      rawErrorPayloadRead: true
    },
    targetSafeReferenceBinding: {
      ...diagnosisInput().targetSafeReferenceBinding,
      currentStatus: 'concrete_locator_known',
      liveRequiredNow: true,
      bindingCategory: 'raw_locator_known',
      locatorValueDisclosed: true,
      endpointDisclosed: true,
      configPathOrValueDisclosed: true,
      envValueRead: true
    },
    operatorMediatedManualEvidence: {
      ...diagnosisInput().operatorMediatedManualEvidence,
      currentStatus: 'provided',
      manualObservationCategory: 'raw_log',
      noRawOutputConfirmation: true,
      noSecretConfirmation: true,
      rawLogsProvided: true,
      stdoutStderrTextProvided: true,
      endpointDisclosed: true,
      configEnvRead: true,
      tokenRead: true
    },
    approvalBoundary: {
      ...diagnosisInput().approvalBoundary,
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
  assert.equal(result.reasonCode, 'invalid_startup_failure_diagnosis_contract');
  assert.ok(result.invalidFields.includes('startupInvocationShape.liveRequiredNow'));
  assert.ok(result.invalidFields.includes('startupInvocationShape.endpointDisclosed'));
  assert.ok(result.invalidFields.includes('startupProcessLifecycle.processCountBucket'));
  assert.ok(result.invalidFields.includes('startupProcessLifecycle.processIdentifiersDisclosed'));
  assert.ok(result.invalidFields.includes('startupResultCapture.startupResultCategory'));
  assert.ok(result.invalidFields.includes('startupResultCapture.zeroWriteCounters'));
  assert.ok(result.invalidFields.includes('listenerAfterStart.listenerStatusCategory'));
  assert.ok(result.invalidFields.includes('listenerAfterStart.endpointDisclosed'));
  assert.ok(result.invalidFields.includes('targetSafeReferenceBinding.locatorValueDisclosed'));
  assert.ok(result.invalidFields.includes('operatorMediatedManualEvidence.rawLogsProvided'));
  assert.ok(result.invalidFields.includes('approvalBoundary.liveExecutionAllowedNow'));
  assert.ok(result.invalidFields.includes('approvalBoundary.readShapeIncluded'));
  assert.equal(result.diagnosis_result.readShapeUnlocked, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1941 rejects unknown fields and nonzero counters', () => {
  const unknown = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput({
    runtimeReachable: false
  }));
  const counters = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput({
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
  assert.equal(unknown.reasonCode, 'unknown_startup_failure_diagnosis_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['runtimeReachable']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_startup_failure_diagnosis_counters');
  assert.ok(counters.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(counters.forbiddenCounters.includes('networkCalls'));
  assert.ok(counters.forbiddenCounters.includes('liveProcessInspections'));
  assert.ok(counters.forbiddenCounters.includes('serviceStartAttempts'));
  assert.ok(counters.forbiddenCounters.includes('listenerRecheckAttempts'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1941 rejects unsafe or mismatched target reference without echo', () => {
  const unsafe = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput({
    targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO',
    targetSafeReferenceBinding: {
      ...diagnosisInput().targetSafeReferenceBinding,
      targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO'
    }
  }));
  const mismatched = buildVcpNativeStartupFailureDiagnosisContract(diagnosisInput({
    targetSafeReferenceBinding: {
      ...diagnosisInput().targetSafeReferenceBinding,
      targetReferenceName: 'different-safe-reference'
    }
  }));
  const serialized = JSON.stringify(unsafe);

  assert.equal(unsafe.accepted, false);
  assert.equal(unsafe.reasonCode, 'invalid_startup_failure_diagnosis_contract');
  assert.ok(unsafe.invalidFields.includes('targetReferenceName'));
  assert.ok(unsafe.invalidFields.includes('targetSafeReferenceBinding.targetReferenceName'));
  assert.equal(unsafe.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('PRIVATE/LOCATOR/SHOULD_NOT_ECHO'), false);

  assert.equal(mismatched.accepted, false);
  assert.equal(mismatched.reasonCode, 'invalid_startup_failure_diagnosis_contract');
  assert.ok(mismatched.invalidFields.includes('targetSafeReferenceBinding.targetReferenceName'));
});

test('CM1941 reports missing required lane fields', () => {
  const input = diagnosisInput();
  delete input.startupInvocationShape.invocationShapeCategory;
  delete input.startupProcessLifecycle.lifecycleCategory;
  delete input.startupResultCapture.startupResultCategory;
  delete input.listenerAfterStart.listenerStatusCategory;
  delete input.targetSafeReferenceBinding.bindingCategory;
  delete input.operatorMediatedManualEvidence.manualObservationCategory;
  delete input.approvalBoundary.nextExactApprovalRequired;

  const result = buildVcpNativeStartupFailureDiagnosisContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_startup_failure_diagnosis_fields');
  assert.ok(result.missingFields.includes('startupInvocationShape.invocationShapeCategory'));
  assert.ok(result.missingFields.includes('startupProcessLifecycle.lifecycleCategory'));
  assert.ok(result.missingFields.includes('startupResultCapture.startupResultCategory'));
  assert.ok(result.missingFields.includes('listenerAfterStart.listenerStatusCategory'));
  assert.ok(result.missingFields.includes('targetSafeReferenceBinding.bindingCategory'));
  assert.ok(result.missingFields.includes('operatorMediatedManualEvidence.manualObservationCategory'));
  assert.ok(result.missingFields.includes('approvalBoundary.nextExactApprovalRequired'));
});

test('CM1941 public MCP surface is unchanged', () => {
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
