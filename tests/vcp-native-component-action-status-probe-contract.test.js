'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeComponentActionStatusProbeContract
} = require('../src/core/VcpNativeComponentActionStatusProbeContract');

function probeInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1947',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    targetSafeReferenceBinding: {
      lane: 'target_safe_reference_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      currentStatus: 'listener_level_reachable_by_cm1944',
      safeReferenceBindingCategory: 'listener_level_reachable_reference_only',
      listenerLevelReachabilityAccepted: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      configPathOrValueDisclosed: false,
      envValueRead: false,
      tokenRead: false
    },
    componentActionIdentifierBinding: {
      lane: 'component_action_identifier_binding',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      currentStatus: 'safe_identifiers_known',
      identifierBindingCategory: 'safe_identifiers_known',
      sourceOrManifestAliasCategory: 'source_alias_only',
      rawPluginConfigRead: false,
      privateMemoryContentRead: false,
      requestBodyGenerated: false,
      providerPayloadRead: false
    },
    statusProbeShape: {
      lane: 'status_probe_shape',
      currentStatus: 'contracted_no_live',
      probeShapeCategory: 'status_only_no_request_body',
      routeStatusProjectionOnly: true,
      requestBodyGenerated: false,
      responseBodyBudgetZero: true,
      responseBodyRead: false,
      rawErrorPayloadRead: false,
      logRead: false,
      configEnvRead: false,
      secretRead: false,
      requiresExactApprovalForLiveProbe: true
    },
    routeOutcomeReceipt: {
      lane: 'route_outcome_receipt',
      currentStatus: 'locked_low_disclosure_categories',
      allowedCategory: 'unknown',
      routeStatusKnown: false,
      responseBodyRead: false,
      rawErrorPayloadRead: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      memoryIdsDisclosed: false,
      rawMemoryTextRead: false,
      approvalLineGenerated: false,
      stdoutStderrLogRead: false
    },
    readShapeSeparation: {
      lane: 'read_shape_separation',
      currentStatus: 'separate_later_route',
      statusProbeMayInspectResponseShape: false,
      statusProbeMayReadMemoryContent: false,
      readShapeUnlocked: false,
      separateExactApprovalRequired: true
    },
    approvalBoundary: {
      lane: 'approval_boundary',
      nextExactApprovalRequired: true,
      approvalLineGenerated: false,
      requestBodyGenerated: false,
      liveExecutionAllowedNow: false,
      componentActionProbeExecutionAllowedNow: false,
      readShapeIncluded: false,
      readinessClaim: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1947 accepts low-disclosure component/action status probe contract', () => {
  const result = buildVcpNativeComponentActionStatusProbeContract(probeInput());

  assert.equal(result.accepted, true);
  assert.equal(result.componentActionStatusProbeContractLocked, true);
  assert.deepEqual(result.probe_result, {
    accepted: true,
    targetReferenceKnown: true,
    listenerLevelReachabilityAccepted: true,
    componentActionIdentifiersKnown: true,
    componentActionIdentifierBindingKnown: true,
    statusProbeShapeContracted: true,
    routeOutcomeReceiptLocked: true,
    requestBodyGenerated: false,
    responseBodyReadAllowed: false,
    rawErrorPayloadReadAllowed: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    componentActionStatusProbeExecutionAllowedNow: false,
    readShapeUnlocked: false,
    exactApprovalRequiredBeforeLiveProbe: true
  });
  assert.deepEqual(result.lowDisclosureProjection, {
    taskId: 'CM-1947',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search'
  });
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.componentActionProbeExecuted, false);
  assert.equal(result.readShapeProofPerformed, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1947 rejects sensitive component/action probe material without echo', () => {
  const result = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    configEnv: 'PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO',
    ['token']: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    requestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    rawPluginConfig: 'PRIVATE_PLUGIN_CONFIG_SHOULD_NOT_ECHO',
    runtimePayload: 'PRIVATE_RUNTIME_PAYLOAD_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_component_action_status_probe_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('configEnv'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.ok(result.forbiddenFields.includes('rawPluginConfig'));
  assert.ok(result.forbiddenFields.includes('runtimePayload'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PLUGIN_CONFIG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RUNTIME_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
});

test('CM1947 rejects live probe request body read-shape and readiness drift', () => {
  const approvalLineFlag = 'approvalLineGenerated';
  const result = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    targetSafeReferenceBinding: {
      ...probeInput().targetSafeReferenceBinding,
      currentStatus: 'concrete_locator_known',
      listenerLevelReachabilityAccepted: false,
      locatorValueDisclosed: true,
      endpointDisclosed: true,
      configPathOrValueDisclosed: true,
      envValueRead: true,
      tokenRead: true
    },
    componentActionIdentifierBinding: {
      ...probeInput().componentActionIdentifierBinding,
      rawPluginConfigRead: true,
      privateMemoryContentRead: true,
      requestBodyGenerated: true,
      providerPayloadRead: true
    },
    statusProbeShape: {
      ...probeInput().statusProbeShape,
      currentStatus: 'live_executed',
      routeStatusProjectionOnly: false,
      requestBodyGenerated: true,
      responseBodyBudgetZero: false,
      responseBodyRead: true,
      rawErrorPayloadRead: true,
      logRead: true,
      configEnvRead: true,
      secretRead: true,
      requiresExactApprovalForLiveProbe: false
    },
    routeOutcomeReceipt: {
      ...probeInput().routeOutcomeReceipt,
      routeStatusKnown: true,
      responseBodyRead: true,
      rawErrorPayloadRead: true,
      endpointDisclosed: true,
      locatorValueDisclosed: true,
      memoryIdsDisclosed: true,
      rawMemoryTextRead: true,
      [approvalLineFlag]: true,
      stdoutStderrLogRead: true
    },
    readShapeSeparation: {
      ...probeInput().readShapeSeparation,
      statusProbeMayInspectResponseShape: true,
      statusProbeMayReadMemoryContent: true,
      readShapeUnlocked: true,
      separateExactApprovalRequired: false
    },
    approvalBoundary: {
      ...probeInput().approvalBoundary,
      nextExactApprovalRequired: false,
      [approvalLineFlag]: true,
      requestBodyGenerated: true,
      liveExecutionAllowedNow: true,
      componentActionProbeExecutionAllowedNow: true,
      readShapeIncluded: true,
      readinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_component_action_status_probe_contract');
  assert.ok(result.invalidFields.includes('targetSafeReferenceBinding.currentStatus'));
  assert.ok(result.invalidFields.includes('targetSafeReferenceBinding.locatorValueDisclosed'));
  assert.ok(result.invalidFields.includes('componentActionIdentifierBinding.rawPluginConfigRead'));
  assert.ok(result.invalidFields.includes('statusProbeShape.requestBodyGenerated'));
  assert.ok(result.invalidFields.includes('statusProbeShape.responseBodyRead'));
  assert.ok(result.invalidFields.includes('routeOutcomeReceipt.routeStatusKnown'));
  assert.ok(result.invalidFields.includes('routeOutcomeReceipt.memoryIdsDisclosed'));
  assert.ok(result.invalidFields.includes('readShapeSeparation.readShapeUnlocked'));
  assert.ok(result.invalidFields.includes('approvalBoundary.liveExecutionAllowedNow'));
  assert.ok(result.invalidFields.includes('approvalBoundary.componentActionProbeExecutionAllowedNow'));
  assert.equal(result.probe_result.readShapeUnlocked, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.componentActionProbeExecuted, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1947 rejects unknown fields and nonzero counters', () => {
  const unknown = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    runtimeReachable: true
  }));
  const counters = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      networkCalls: 1,
      requestBodiesGenerated: 1,
      componentActionProbeExecutions: 1,
      readShapeProofs: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unknown_component_action_status_probe_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['runtimeReachable']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_component_action_status_probe_counters');
  assert.ok(counters.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(counters.forbiddenCounters.includes('networkCalls'));
  assert.ok(counters.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(counters.forbiddenCounters.includes('componentActionProbeExecutions'));
  assert.ok(counters.forbiddenCounters.includes('readShapeProofs'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1947 rejects unsafe target and invalid component/action identifiers without echo', () => {
  const unsafeTarget = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO',
    targetSafeReferenceBinding: {
      ...probeInput().targetSafeReferenceBinding,
      targetReferenceName: 'PRIVATE/LOCATOR/SHOULD_NOT_ECHO'
    }
  }));
  const invalidIdentifier = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    componentActionIdentifierBinding: {
      ...probeInput().componentActionIdentifierBinding,
      component: 'UnknownComponent',
      action: 'unknown.action'
    }
  }));
  const mismatch = buildVcpNativeComponentActionStatusProbeContract(probeInput({
    targetSafeReferenceBinding: {
      ...probeInput().targetSafeReferenceBinding,
      targetReferenceName: 'different-safe-reference'
    }
  }));
  const serialized = JSON.stringify(unsafeTarget);

  assert.equal(unsafeTarget.accepted, false);
  assert.equal(unsafeTarget.reasonCode, 'invalid_component_action_status_probe_contract');
  assert.ok(unsafeTarget.invalidFields.includes('targetReferenceName'));
  assert.ok(unsafeTarget.invalidFields.includes('targetSafeReferenceBinding.targetReferenceName'));
  assert.equal(unsafeTarget.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('PRIVATE/LOCATOR/SHOULD_NOT_ECHO'), false);

  assert.equal(invalidIdentifier.accepted, false);
  assert.equal(invalidIdentifier.reasonCode, 'invalid_component_action_status_probe_contract');
  assert.ok(invalidIdentifier.invalidFields.includes('componentActionIdentifierBinding.component'));
  assert.ok(invalidIdentifier.invalidFields.includes('componentActionIdentifierBinding.action'));

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'invalid_component_action_status_probe_contract');
  assert.ok(mismatch.invalidFields.includes('targetSafeReferenceBinding.targetReferenceName'));
});

test('CM1947 reports missing required lane fields', () => {
  const input = probeInput();
  delete input.targetSafeReferenceBinding.safeReferenceBindingCategory;
  delete input.componentActionIdentifierBinding.identifierBindingCategory;
  delete input.statusProbeShape.probeShapeCategory;
  delete input.routeOutcomeReceipt.allowedCategory;
  delete input.readShapeSeparation.separateExactApprovalRequired;
  delete input.approvalBoundary.nextExactApprovalRequired;

  const result = buildVcpNativeComponentActionStatusProbeContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_component_action_status_probe_fields');
  assert.ok(result.missingFields.includes('targetSafeReferenceBinding.safeReferenceBindingCategory'));
  assert.ok(result.missingFields.includes('componentActionIdentifierBinding.identifierBindingCategory'));
  assert.ok(result.missingFields.includes('statusProbeShape.probeShapeCategory'));
  assert.ok(result.missingFields.includes('routeOutcomeReceipt.allowedCategory'));
  assert.ok(result.missingFields.includes('readShapeSeparation.separateExactApprovalRequired'));
  assert.ok(result.missingFields.includes('approvalBoundary.nextExactApprovalRequired'));
});

test('CM1947 public MCP surface is unchanged', () => {
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
