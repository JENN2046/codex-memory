'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  PROFILES
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  ALLOWED_RECEIPT_OUTPUT_FIELDS,
  ZERO_WRITE_COUNTERS,
  buildVcpNativeReadOnlyExecutionReceipt
} = require('../src/core/VcpNativeReadOnlyExecutionReceipt');

function receiptInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1913',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    profile: PROFILES.OBSERVE_LITE,
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    statusCategory: 'not_executed',
    shapeKeys: ['items', 'status'],
    itemCount: 0,
    durationBucket: 'not_measured',
    normalizedResultStatus: 'not_executed',
    zeroWriteCounters: { ...ZERO_WRITE_COUNTERS },
    ...overrides
  };
}

test('CM1913 accepts only low-disclosure read-only execution receipt fields', () => {
  const result = buildVcpNativeReadOnlyExecutionReceipt(receiptInput());

  assert.equal(result.accepted, true);
  assert.equal(result.receiptSchemaLocked, true);
  assert.deepEqual(Object.keys(result.receipt), ALLOWED_RECEIPT_OUTPUT_FIELDS);
  assert.deepEqual(result.receipt, {
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    profile: PROFILES.OBSERVE_LITE,
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    statusCategory: 'not_executed',
    shapeKeys: ['items', 'status'],
    itemCount: 0,
    durationBucket: 'not_measured',
    normalizedResultStatus: 'not_executed',
    zeroWriteCounters: { ...ZERO_WRITE_COUNTERS }
  });
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawBodyPersisted, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.receiptWritten, false);
  assert.equal(result.endpointUrlRecorded, false);
  assert.equal(result.approvalLineRecorded, false);
  assert.equal(result.tokenRecorded, false);
  assert.equal(result.configEnvRecorded, false);
  assert.equal(result.stdoutStderrLogRecorded, false);
  assert.equal(result.providerPayloadRecorded, false);
});

test('CM1913 rejects forbidden raw response memory endpoint approval token config log and provider fields without echo', () => {
  const result = buildVcpNativeReadOnlyExecutionReceipt(receiptInput({
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    memoryIds: ['PRIVATE_MEMORY_ID_SHOULD_NOT_ECHO'],
    endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    token: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
    configEnv: 'PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO',
    stdout: 'PRIVATE_STDOUT_SHOULD_NOT_ECHO',
    stderr: 'PRIVATE_STDERR_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    providerPayload: 'PRIVATE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_sensitive_receipt_material');
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.ok(result.forbiddenFields.includes('memoryIds'));
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('configEnv'));
  assert.ok(result.forbiddenFields.includes('stdout'));
  assert.ok(result.forbiddenFields.includes('stderr'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('providerPayload'));
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_STDOUT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_STDERR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
});

test('CM1913 rejects unknown top-level fields even when they look harmless', () => {
  const result = buildVcpNativeReadOnlyExecutionReceipt(receiptInput({
    runtimeReachable: false
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unknown_receipt_fields_not_allowed');
  assert.deepEqual(result.unknownFields, ['runtimeReachable']);
  assert.equal(result.receipt, null);
  assert.equal(result.runtimeExecuted, false);
});

test('CM1913 rejects unsafe profile action shape keys and count drift without echo', () => {
  const result = buildVcpNativeReadOnlyExecutionReceipt(receiptInput({
    profile: 'SECRET_PROFILE_SHOULD_NOT_ECHO',
    action: 'SECRET_ACTION_SHOULD_NOT_ECHO',
    shapeKeys: ['items', 'rawMemoryText'],
    itemCount: 6
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_low_disclosure_readonly_execution_receipt');
  assert.ok(result.invalidFields.includes('profile'));
  assert.ok(result.invalidFields.includes('action'));
  assert.ok(result.invalidFields.includes('shapeKeys'));
  assert.ok(result.invalidFields.includes('itemCount'));
  assert.equal(result.lowDisclosureProjection.profile, null);
  assert.equal(result.lowDisclosureProjection.action, null);
  assert.equal(serialized.includes('SECRET_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_ACTION_SHOULD_NOT_ECHO'), false);
});

test('CM1913 rejects nonzero and unknown zero write counters', () => {
  const result = buildVcpNativeReadOnlyExecutionReceipt(receiptInput({
    zeroWriteCounters: {
      ...ZERO_WRITE_COUNTERS,
      memoryWrites: 1,
      durableWritePerformed: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_low_disclosure_readonly_execution_receipt');
  assert.ok(result.invalidFields.includes('zeroWriteCounters.memoryWrites'));
  assert.ok(result.invalidFields.includes('zeroWriteCounters.durableWritePerformed'));
  assert.ok(result.invalidFields.includes('zeroWriteCounters.unknownCounter'));
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
});

test('CM1913 rejects invalid status duration and normalized result categories', () => {
  const result = buildVcpNativeReadOnlyExecutionReceipt(receiptInput({
    statusCategory: 'full_raw_read_success',
    durationBucket: '1234ms',
    normalizedResultStatus: 'raw_body_available'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_low_disclosure_readonly_execution_receipt');
  assert.ok(result.invalidFields.includes('statusCategory'));
  assert.ok(result.invalidFields.includes('durationBucket'));
  assert.ok(result.invalidFields.includes('normalizedResultStatus'));
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawBodyPersisted, false);
});

test('CM1913 public MCP surface is unchanged', () => {
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
