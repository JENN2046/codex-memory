'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeComponentActionRequestBodyBoundaryContract
} = require('../src/core/VcpNativeComponentActionRequestBodyBoundaryContract');

function boundaryInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1953',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    componentActionBinding: {
      lane: 'component_action_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      currentStatus: 'safe_identifiers_known',
      rawPluginConfigRead: false,
      privateMemoryContentRead: false,
      providerPayloadRead: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false
    },
    requestBodyShapeBoundary: {
      lane: 'request_body_shape_boundary',
      currentStatus: 'category_only_defined',
      requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
      concretePayloadGenerated: false,
      serializedPayloadAvailable: false,
      queryTextBound: false,
      memoryContentBound: false,
      providerPayloadBound: false,
      endpointOrLocatorBound: false,
      requestBodyGenerated: false
    },
    routeProbeBoundary: {
      lane: 'component_action_route_probe_boundary',
      currentStatus: 'not_authorized',
      futureExactApprovalRequired: true,
      maxComponentActionRouteProbeAttempts: 1,
      maxNetworkCalls: 1,
      maxRuntimeCalls: 1,
      maxProcessStateInspections: 0,
      maxServiceStartAttempts: 0,
      maxServiceStopAttempts: 0,
      maxServiceRestartAttempts: 0,
      maxListenerRecheckAttempts: 0,
      responseBodyByteBudget: 0,
      rawErrorPayloadBudget: 0,
      logReadBudget: 0,
      liveExecutionAllowedNow: false,
      componentActionRouteProbeAllowedNow: false
    },
    outputProjectionBoundary: {
      lane: 'output_projection_boundary',
      currentStatus: 'category_only',
      projectionCategory: 'low_disclosure_route_status_only',
      concreteRequestBodyAllowed: false,
      rawResponseBodyAllowed: false,
      rawErrorPayloadAllowed: false,
      responseShapeKeysAllowed: false,
      memoryIdsAllowed: false,
      rawMemoryTextAllowed: false,
      endpointLocatorAllowed: false,
      configEnvAllowed: false,
      tokenSecretAllowed: false,
      logsStdoutStderrAllowed: false,
      approvalLineAllowed: false
    },
    readShapeSeparation: {
      lane: 'read_shape_separation',
      currentStatus: 'locked',
      routeProbeMayReadShape: false,
      routeProbeMayReadMemoryContent: false,
      readShapeUnlocked: false,
      separateExactApprovalRequired: true
    },
    approvalBoundary: {
      lane: 'approval_boundary',
      nextExactApprovalRequired: true,
      approvalLineGenerated: false,
      requestBodyGenerated: false,
      liveExecutionAllowedNow: false,
      componentActionRouteProbeAllowedNow: false,
      readShapeIncluded: false,
      readinessClaim: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1953 accepts low-disclosure component/action request-body boundary contract', () => {
  const result = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput());

  assert.equal(result.accepted, true);
  assert.equal(result.componentActionRequestBodyBoundaryContractLocked, true);
  assert.deepEqual(result.request_body_boundary_result, {
    accepted: true,
    targetReferenceKnown: true,
    componentActionIdentifiersKnown: true,
    requestBodyShapeBoundaryDefined: true,
    concreteRequestBodyGenerated: false,
    componentActionRouteProbeAuthorizedNow: false,
    futureExactApprovalRequired: true,
    responseBodyReadAllowed: false,
    rawErrorPayloadReadAllowed: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    readShapeUnlocked: false
  });
  assert.deepEqual(result.lowDisclosureProjection, {
    taskId: 'CM-1953',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only'
  });
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.concreteRequestBodyGenerated, false);
  assert.equal(result.requestBodySubmitted, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawErrorPayloadRead, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.componentActionRouteProbeExecuted, false);
  assert.equal(result.readShapeProofPerformed, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1953 rejects sensitive concrete request-body material without echo', () => {
  const result = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    endpoint: 'SENSITIVE_SAMPLE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'SENSITIVE_SAMPLE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    configEnv: 'SENSITIVE_SAMPLE_CONFIG_ENV_SHOULD_NOT_ECHO',
    token: 'SENSITIVE_SAMPLE_TOKEN_SHOULD_NOT_ECHO',
    requestBody: 'SENSITIVE_SAMPLE_REQUEST_BODY_SHOULD_NOT_ECHO',
    serializedRequestBody: 'SENSITIVE_SAMPLE_SERIALIZED_BODY_SHOULD_NOT_ECHO',
    queryText: 'SENSITIVE_SAMPLE_QUERY_SHOULD_NOT_ECHO',
    memoryContent: 'SENSITIVE_SAMPLE_MEMORY_CONTENT_SHOULD_NOT_ECHO',
    rawResponseBody: 'SENSITIVE_SAMPLE_RESPONSE_SHOULD_NOT_ECHO',
    rawErrorPayload: 'SENSITIVE_SAMPLE_ERROR_SHOULD_NOT_ECHO',
    rawMemoryText: 'SENSITIVE_SAMPLE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    rawPluginConfig: 'SENSITIVE_SAMPLE_PLUGIN_CONFIG_SHOULD_NOT_ECHO',
    providerPayload: 'SENSITIVE_SAMPLE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO',
    approvalLineText: 'SENSITIVE_SAMPLE_APPROVAL_LINE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_component_action_request_body_boundary_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('configEnv'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('serializedRequestBody'));
  assert.ok(result.forbiddenFields.includes('queryText'));
  assert.ok(result.forbiddenFields.includes('memoryContent'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.ok(result.forbiddenFields.includes('rawPluginConfig'));
  assert.ok(result.forbiddenFields.includes('providerPayload'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_LOCATOR_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_SERIALIZED_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_MEMORY_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_ERROR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_PLUGIN_CONFIG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
});

test('CM1953 rejects live route probe request-body read-shape and readiness drift', () => {
  const result = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    componentActionBinding: {
      ...boundaryInput().componentActionBinding,
      rawPluginConfigRead: true,
      privateMemoryContentRead: true,
      providerPayloadRead: true,
      endpointDisclosed: true,
      locatorValueDisclosed: true
    },
    requestBodyShapeBoundary: {
      ...boundaryInput().requestBodyShapeBoundary,
      currentStatus: 'concrete_payload_ready',
      concretePayloadGenerated: true,
      serializedPayloadAvailable: true,
      queryTextBound: true,
      memoryContentBound: true,
      providerPayloadBound: true,
      endpointOrLocatorBound: true,
      requestBodyGenerated: true
    },
    routeProbeBoundary: {
      ...boundaryInput().routeProbeBoundary,
      currentStatus: 'authorized_now',
      futureExactApprovalRequired: false,
      responseBodyByteBudget: 128,
      rawErrorPayloadBudget: 128,
      logReadBudget: 1,
      liveExecutionAllowedNow: true,
      componentActionRouteProbeAllowedNow: true
    },
    outputProjectionBoundary: {
      ...boundaryInput().outputProjectionBoundary,
      concreteRequestBodyAllowed: true,
      rawResponseBodyAllowed: true,
      rawErrorPayloadAllowed: true,
      responseShapeKeysAllowed: true,
      memoryIdsAllowed: true,
      rawMemoryTextAllowed: true,
      endpointLocatorAllowed: true,
      configEnvAllowed: true,
      tokenSecretAllowed: true,
      logsStdoutStderrAllowed: true,
      approvalLineAllowed: true
    },
    readShapeSeparation: {
      ...boundaryInput().readShapeSeparation,
      routeProbeMayReadShape: true,
      routeProbeMayReadMemoryContent: true,
      readShapeUnlocked: true,
      separateExactApprovalRequired: false
    },
    approvalBoundary: {
      ...boundaryInput().approvalBoundary,
      nextExactApprovalRequired: false,
      approvalLineGenerated: true,
      requestBodyGenerated: true,
      liveExecutionAllowedNow: true,
      componentActionRouteProbeAllowedNow: true,
      readShapeIncluded: true,
      readinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_component_action_request_body_boundary_contract');
  assert.ok(result.invalidFields.includes('componentActionBinding.rawPluginConfigRead'));
  assert.ok(result.invalidFields.includes('requestBodyShapeBoundary.currentStatus'));
  assert.ok(result.invalidFields.includes('requestBodyShapeBoundary.concretePayloadGenerated'));
  assert.ok(result.invalidFields.includes('routeProbeBoundary.currentStatus'));
  assert.ok(result.invalidFields.includes('routeProbeBoundary.futureExactApprovalRequired'));
  assert.ok(result.invalidFields.includes('routeProbeBoundary.responseBodyByteBudget'));
  assert.ok(result.invalidFields.includes('routeProbeBoundary.liveExecutionAllowedNow'));
  assert.ok(result.invalidFields.includes('outputProjectionBoundary.rawResponseBodyAllowed'));
  assert.ok(result.invalidFields.includes('outputProjectionBoundary.responseShapeKeysAllowed'));
  assert.ok(result.invalidFields.includes('readShapeSeparation.readShapeUnlocked'));
  assert.ok(result.invalidFields.includes('approvalBoundary.componentActionRouteProbeAllowedNow'));
  assert.equal(result.request_body_boundary_result.readShapeUnlocked, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.componentActionRouteProbeExecuted, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1953 rejects unknown fields and nonzero counters', () => {
  const unknown = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    runtimeReachable: true
  }));
  const counters = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      networkCalls: 1,
      concreteRequestBodiesGenerated: 1,
      componentActionRouteProbeExecutions: 1,
      readShapeProofs: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unknown_component_action_request_body_boundary_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['runtimeReachable']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_component_action_request_body_boundary_counters');
  assert.ok(counters.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(counters.forbiddenCounters.includes('networkCalls'));
  assert.ok(counters.forbiddenCounters.includes('concreteRequestBodiesGenerated'));
  assert.ok(counters.forbiddenCounters.includes('componentActionRouteProbeExecutions'));
  assert.ok(counters.forbiddenCounters.includes('readShapeProofs'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1953 rejects unsafe target and invalid component/action identifiers without echo', () => {
  const unsafeTarget = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    targetReferenceName: 'SENSITIVE_SAMPLE/LOCATOR/SHOULD_NOT_ECHO',
    componentActionBinding: {
      ...boundaryInput().componentActionBinding,
      targetReferenceName: 'SENSITIVE_SAMPLE/LOCATOR/SHOULD_NOT_ECHO'
    }
  }));
  const invalidIdentifier = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    componentActionBinding: {
      ...boundaryInput().componentActionBinding,
      component: 'UnknownComponent',
      action: 'unknown.action'
    }
  }));
  const mismatch = buildVcpNativeComponentActionRequestBodyBoundaryContract(boundaryInput({
    componentActionBinding: {
      ...boundaryInput().componentActionBinding,
      targetReferenceName: 'different-safe-reference'
    }
  }));
  const serialized = JSON.stringify(unsafeTarget);

  assert.equal(unsafeTarget.accepted, false);
  assert.equal(unsafeTarget.reasonCode, 'invalid_component_action_request_body_boundary_contract');
  assert.ok(unsafeTarget.invalidFields.includes('targetReferenceName'));
  assert.ok(unsafeTarget.invalidFields.includes('componentActionBinding.targetReferenceName'));
  assert.equal(unsafeTarget.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE/LOCATOR/SHOULD_NOT_ECHO'), false);

  assert.equal(invalidIdentifier.accepted, false);
  assert.equal(invalidIdentifier.reasonCode, 'invalid_component_action_request_body_boundary_contract');
  assert.ok(invalidIdentifier.invalidFields.includes('componentActionBinding.component'));
  assert.ok(invalidIdentifier.invalidFields.includes('componentActionBinding.action'));

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'invalid_component_action_request_body_boundary_contract');
  assert.ok(mismatch.invalidFields.includes('componentActionBinding.targetReferenceName'));
});

test('CM1953 reports missing required lane fields', () => {
  const input = boundaryInput();
  delete input.componentActionBinding.currentStatus;
  delete input.requestBodyShapeBoundary.requestBodyShapeCategory;
  delete input.routeProbeBoundary.futureExactApprovalRequired;
  delete input.outputProjectionBoundary.projectionCategory;
  delete input.readShapeSeparation.separateExactApprovalRequired;
  delete input.approvalBoundary.nextExactApprovalRequired;

  const result = buildVcpNativeComponentActionRequestBodyBoundaryContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_component_action_request_body_boundary_fields');
  assert.ok(result.missingFields.includes('componentActionBinding.currentStatus'));
  assert.ok(result.missingFields.includes('requestBodyShapeBoundary.requestBodyShapeCategory'));
  assert.ok(result.missingFields.includes('routeProbeBoundary.futureExactApprovalRequired'));
  assert.ok(result.missingFields.includes('outputProjectionBoundary.projectionCategory'));
  assert.ok(result.missingFields.includes('readShapeSeparation.separateExactApprovalRequired'));
  assert.ok(result.missingFields.includes('approvalBoundary.nextExactApprovalRequired'));
});

test('CM1953 public MCP surface is unchanged', () => {
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
