'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract
} = require('../src/core/VcpNativeStartupLocatorDiagnosisReceiptCaptureContract');

function receiptCaptureInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1928',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    purpose: 'runtime_startup_or_target_locator_diagnosis',
    injectedOutcome: {
      outcomeCategory: 'receipt_capture_error',
      durationBucket: 'unknown',
      processCountBucket: 'not_checked',
      transportWrapperShapeCategory: 'tcp_connect_no_body_no_request',
      requestBodyGenerated: false,
      responseBodyRead: false,
      rawErrorPayloadRead: false,
      logRead: false,
      stdoutStderrRead: false,
      configEnvRead: false,
      secretRead: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      memoryRead: false,
      memoryWritten: false
    },
    receiptPolicy: {
      resultProjection: 'low_disclosure_categories_only',
      responseBodyByteBudget: 0,
      rawErrorPayloadBudget: 0,
      logReadBudget: 0,
      requestBodyGeneration: false,
      endpointDisclosure: false,
      locatorValueDisclosure: false,
      memoryWrite: false,
      durableWrite: false,
      readinessClaim: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

function inputWithOutcome(outcomeCategory, overrides = {}) {
  return receiptCaptureInput({
    injectedOutcome: {
      ...receiptCaptureInput().injectedOutcome,
      outcomeCategory,
      durationBucket: outcomeCategory === 'receipt_capture_error' ? 'unknown' : 'lt_100ms',
      ...overrides
    }
  });
}

test('CM1928 accepts receipt capture error as deterministic low-disclosure receipt', () => {
  const result = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(receiptCaptureInput());

  assert.equal(result.accepted, true);
  assert.equal(result.receiptCaptureContractLocked, true);
  assert.deepEqual(result.receipt, {
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    purpose: 'runtime_startup_or_target_locator_diagnosis',
    statusCategory: 'receipt_capture_error_after_single_approved_attempt',
    runtimeStartupStateCategory: 'unknown',
    targetLocatorBindingCategory: 'not_proven_by_receipt_capture_error',
    serviceListenerStatusCategory: 'unknown',
    statusClass: 'diagnosis_result_unknown',
    processCountBucket: 'not_checked',
    transportWrapperShapeCategory: 'tcp_connect_no_body_no_request',
    durationBucket: 'unknown',
    zeroWriteCounters: true,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    logRead: false,
    stdoutStderrRead: false,
    configEnvRead: false,
    secretRead: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    memoryRead: false,
    memoryWritten: false
  });
  assert.equal(result.capture_result.receiptCaptureDeterministic, true);
  assert.equal(result.capture_result.injectedOutcomeOnly, true);
  assert.equal(result.capture_result.liveRuntimeFactsKnown, false);
  assert.equal(result.capture_result.diagnosisResultUsableForLiveRoute, false);
  assert.equal(result.capture_result.componentActionStatusProbeUnlocked, false);
  assert.equal(result.capture_result.readShapeUnlocked, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawErrorPayloadRead, false);
  assert.equal(result.endpointDisclosed, false);
  assert.equal(result.locatorValueDisclosed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1928 maps injected connect success without creating live runtime facts', () => {
  const result = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(inputWithOutcome('connect_success'));

  assert.equal(result.accepted, true);
  assert.equal(result.receipt.statusCategory, 'startup_locator_diagnosis_observed');
  assert.equal(result.receipt.runtimeStartupStateCategory, 'listener_reachable_startup_state_unproven');
  assert.equal(result.receipt.targetLocatorBindingCategory, 'binding_used_category_only');
  assert.equal(result.receipt.serviceListenerStatusCategory, 'reachable');
  assert.equal(result.receipt.statusClass, 'tcp_connect_ok');
  assert.equal(result.capture_result.liveRuntimeFactsKnown, false);
  assert.equal(result.capture_result.serviceListenerReachabilityKnown, false);
  assert.equal(result.networkCalled, false);
});

test('CM1928 maps injected transport error and timeout categories deterministically', () => {
  const transport = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(inputWithOutcome('transport_error'));
  const timeout = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(inputWithOutcome('timeout', {
    durationBucket: 'lt_3s'
  }));

  assert.equal(transport.accepted, true);
  assert.equal(transport.receipt.statusCategory, 'transport_error');
  assert.equal(transport.receipt.serviceListenerStatusCategory, 'not_reachable');
  assert.equal(transport.receipt.statusClass, 'tcp_connect_failed');
  assert.equal(timeout.accepted, true);
  assert.equal(timeout.receipt.statusCategory, 'transport_timeout');
  assert.equal(timeout.receipt.serviceListenerStatusCategory, 'timeout');
  assert.equal(timeout.receipt.statusClass, 'tcp_connect_timeout');
  assert.equal(timeout.receipt.durationBucket, 'lt_3s');
});

test('CM1928 rejects raw endpoint locator body log approval process and memory fields without echo', () => {
  const result = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(receiptCaptureInput({
    endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    pid: 'PRIVATE_PID_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_receipt_capture_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('pid'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
});

test('CM1928 rejects policy drift that would allow body logs endpoint locator writes or readiness', () => {
  const result = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(receiptCaptureInput({
    receiptPolicy: {
      resultProjection: 'raw_body',
      responseBodyByteBudget: 1,
      rawErrorPayloadBudget: 1,
      logReadBudget: 1,
      requestBodyGeneration: true,
      endpointDisclosure: true,
      locatorValueDisclosure: true,
      memoryWrite: true,
      durableWrite: true,
      readinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_startup_locator_receipt_capture_contract');
  assert.ok(result.invalidFields.includes('receiptPolicy.resultProjection'));
  assert.ok(result.invalidFields.includes('receiptPolicy.responseBodyByteBudget'));
  assert.ok(result.invalidFields.includes('receiptPolicy.rawErrorPayloadBudget'));
  assert.ok(result.invalidFields.includes('receiptPolicy.logReadBudget'));
  assert.ok(result.invalidFields.includes('receiptPolicy.requestBodyGeneration'));
  assert.ok(result.invalidFields.includes('receiptPolicy.endpointDisclosure'));
  assert.ok(result.invalidFields.includes('receiptPolicy.locatorValueDisclosure'));
  assert.ok(result.invalidFields.includes('receiptPolicy.memoryWrite'));
  assert.ok(result.invalidFields.includes('receiptPolicy.durableWrite'));
  assert.ok(result.invalidFields.includes('receiptPolicy.readinessClaim'));
  assert.equal(result.receipt, null);
  assert.equal(result.readinessClaimed, false);
});

test('CM1928 rejects outcome drift, unsafe target, unknown fields, and nonzero counters', () => {
  const invalidOutcome = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(receiptCaptureInput({
    targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO',
    injectedOutcome: {
      ...receiptCaptureInput().injectedOutcome,
      outcomeCategory: 'raw_success',
      durationBucket: '1234ms',
      processCountBucket: 'one',
      transportWrapperShapeCategory: 'http_post_with_body',
      requestBodyGenerated: true,
      responseBodyRead: true,
      rawErrorPayloadRead: true,
      logRead: true,
      stdoutStderrRead: true,
      configEnvRead: true,
      secretRead: true,
      endpointDisclosed: true,
      locatorValueDisclosed: true,
      memoryRead: true,
      memoryWritten: true
    }
  }));
  const unknown = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(receiptCaptureInput({
    runtimeReachable: false
  }));
  const counters = buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(receiptCaptureInput({
    counters: {
      ...ZERO_COUNTERS,
      networkCalls: 1,
      runtimeCalls: 1,
      responseBodiesRead: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));
  const serialized = JSON.stringify(invalidOutcome);

  assert.equal(invalidOutcome.accepted, false);
  assert.equal(invalidOutcome.reasonCode, 'invalid_startup_locator_receipt_capture_contract');
  assert.ok(invalidOutcome.invalidFields.includes('targetReferenceName'));
  assert.ok(invalidOutcome.invalidFields.includes('injectedOutcome.outcomeCategory'));
  assert.ok(invalidOutcome.invalidFields.includes('injectedOutcome.durationBucket'));
  assert.ok(invalidOutcome.invalidFields.includes('injectedOutcome.transportWrapperShapeCategory'));
  assert.ok(invalidOutcome.invalidFields.includes('injectedOutcome.responseBodyRead'));
  assert.equal(invalidOutcome.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('PRIVATE/LOCATOR/SHOULD_NOT_ECHO'), false);

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unknown_receipt_capture_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['runtimeReachable']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_receipt_capture_counters');
  assert.ok(counters.forbiddenCounters.includes('networkCalls'));
  assert.ok(counters.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(counters.forbiddenCounters.includes('responseBodiesRead'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1928 public MCP surface is unchanged', () => {
  assert.deepEqual(TOOL_DEFINITIONS.map(tool => tool.name).sort(), [
    'audit_memory',
    'memory_overview',
    'record_memory',
    'search_memory',
    'supersede_memory',
    'tombstone_memory',
    'validate_memory'
  ]);
});
