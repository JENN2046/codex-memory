'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTRACT_MODE,
  collectForbiddenFields,
  evaluateNativeReadResponseShapeCompatibilityContract
} = require('../src/core/NativeReadResponseShapeCompatibilityContract');

function zeroCounters() {
  return {
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeReadAttempts: 0,
    responseShapeInspections: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    providerApiCalls: 0,
    nativeWriteAttempts: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function compatibleToolShape(overrides = {}) {
  return {
    toolName: 'search_memory',
    surface: 'default_read_only',
    direction: 'native_read_response_projection',
    responseShapeCategory: 'array_item_count_bucket_only',
    topLevelKindCategory: 'array',
    itemCountBucket: 'bounded_many',
    byteCountBucket: 'bounded',
    projectionKind: 'bounded_results_package',
    lowDisclosureOnly: true,
    fieldNamesDisclosed: false,
    contentIncluded: false,
    endpointDisclosed: false,
    locatorDisclosed: false,
    compatible: true,
    ...overrides
  };
}

function contractInput(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: CONTRACT_MODE,
    toolShapes: [
      compatibleToolShape(),
      compatibleToolShape({
        toolName: 'memory_overview',
        responseShapeCategory: 'object_top_level_kind_only_no_field_names',
        topLevelKindCategory: 'object',
        itemCountBucket: 'object_not_counted',
        projectionKind: 'overview_counts_status'
      }),
      compatibleToolShape({
        toolName: 'audit_memory',
        responseShapeCategory: 'object_top_level_kind_only_no_field_names',
        topLevelKindCategory: 'object',
        itemCountBucket: 'object_not_counted',
        projectionKind: 'audit_receipt_index'
      })
    ],
    counters: zeroCounters(),
    ...overrides
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.responseShapeInspected, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2036 accepts category-only compatible native read response shapes', () => {
  const result = evaluateNativeReadResponseShapeCompatibilityContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'native_read_response_shape_compatibility_accepted');
  assert.equal(result.nativeReadResponseShapeCompatibilityPassed, true);
  assert.deepEqual(result.requiredReadOnlyTools, ['search_memory', 'memory_overview', 'audit_memory']);
  assert.equal(result.compatibilityBoundary.consumesCategoryOnlyShapeMetadata, true);
  assert.equal(result.compatibilityBoundary.consumesResponseBody, false);
  assert.equal(result.compatibilityBoundary.disclosesFieldNames, false);
  assert.equal(result.compatibilityBoundary.callsRuntime, false);
  assert.equal(result.compatibilityBoundary.claimsReadiness, false);
  assertNoSideEffects(result);
});

test('CM2036 requires every default read-only native memory tool shape', () => {
  const input = contractInput({
    toolShapes: contractInput().toolShapes.filter(shape => shape.toolName !== 'audit_memory')
  });
  const result = evaluateNativeReadResponseShapeCompatibilityContract(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('missing_required_readonly_tool_shape_audit_memory'));
  assert.equal(result.nativeReadResponseShapeCompatibilityPassed, false);
  assertNoSideEffects(result);
});

test('CM2036 rejects incompatible write or over-disclosing shape metadata', () => {
  const result = evaluateNativeReadResponseShapeCompatibilityContract(contractInput({
    toolShapes: [
      ...contractInput().toolShapes,
      compatibleToolShape({
        toolName: 'record_memory',
        fieldNamesDisclosed: true,
        contentIncluded: true
      })
    ]
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('toolShapes[3].toolName'));
  assert.ok(result.blockers.includes('toolShapes[3].responseShapeCategoryForTool'));
  assert.ok(result.blockers.includes('toolShapes[3].topLevelKindCategoryForTool'));
  assert.ok(result.blockers.includes('toolShapes[3].projectionKind'));
  assert.ok(result.blockers.includes('toolShapes[3].fieldNamesDisclosed'));
  assert.ok(result.blockers.includes('toolShapes[3].contentIncluded'));
  assertNoSideEffects(result);
});

test('CM2036 rejects raw response body private fields by path without echoing values', () => {
  const result = evaluateNativeReadResponseShapeCompatibilityContract(contractInput({
    unsafe: {
      rawResponse: 'ECHO_RAW',
      responseBody: 'ECHO_BODY',
      memoryContent: 'ECHO_MEMORY',
      endpoint: 'ECHO_ENDPOINT',
      bearerToken: 'ECHO_TOKEN'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.bearerToken',
    'unsafe.endpoint',
    'unsafe.memoryContent',
    'unsafe.rawResponse',
    'unsafe.responseBody'
  ]);
  assert.equal(serialized.includes('ECHO_RAW'), false);
  assert.equal(serialized.includes('ECHO_BODY'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2036 stops L4 on runtime read write provider public MCP release or readiness counters', () => {
  const result = evaluateNativeReadResponseShapeCompatibilityContract(contractInput({
    request: {
      nativeReadExecuted: true,
      publicMcpExpanded: true,
      readinessClaimed: true
    },
    counters: {
      ...zeroCounters(),
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      responseShapeInspections: 1,
      realMemoryReads: 1,
      rawPrivateReads: 1,
      providerApiCalls: 1,
      durableMutations: 1,
      publicMcpExpansions: 1,
      releaseDeployCutoverActions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.stopReasons.includes('request.nativeReadExecuted'));
  assert.ok(result.stopReasons.includes('request.publicMcpExpanded'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.responseShapeInspections'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.durableMutations'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2036 forbidden field collector reports paths only', () => {
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
