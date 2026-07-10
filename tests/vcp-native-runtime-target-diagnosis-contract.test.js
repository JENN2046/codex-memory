'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  PROFILES
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  ZERO_COUNTERS,
  buildVcpNativeRuntimeTargetDiagnosisContract
} = require('../src/core/VcpNativeRuntimeTargetDiagnosisContract');

function diagnosisInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1919',
    targetReferenceResolution: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      referencePresent: true,
      locatorHashPresent: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false
    },
    transportReachability: {
      transportReachabilityKnown: false,
      statusOnly: false,
      bodyRead: false,
      logRead: false,
      secretRead: false,
      requiresNewExactApproval: true
    },
    runtimeProcessState: {
      runtimeProcessStateKnown: false,
      runningOrNotRunningKnown: false,
      processCountBucket: 'unknown',
      commandLineRedacted: true,
      envRead: false,
      requiresNewExactApproval: true
    },
    componentActionMapping: {
      componentKnown: true,
      actionKnown: true,
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      mappingSource: 'source_alias_only',
      rawPluginConfigRead: false,
      privateMemoryContentRead: false
    },
    harnessBinding: {
      wrapperPlanValid: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      profile: PROFILES.OBSERVE_LITE,
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      noWriteBudgetZero: true,
      bodyBudgetZero: true,
      responseBodyBudgetZero: true,
      requestBodyGenerated: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1919 accepts source-only low-disclosure runtime target diagnosis contract', () => {
  const result = buildVcpNativeRuntimeTargetDiagnosisContract(diagnosisInput());

  assert.equal(result.accepted, true);
  assert.equal(result.diagnosisContractLocked, true);
  assert.deepEqual(result.diagnosis_result, {
    accepted: true,
    targetReferenceKnown: true,
    locatorValueDisclosed: false,
    endpointDisclosed: false,
    transportReachabilityKnown: false,
    runtimeProcessStateKnown: false,
    componentActionMappingKnown: true,
    nextLiveDiagnosticRequiresExactApproval: true
  });
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
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1919 can accept unknown component/action mapping as low-disclosure unknown', () => {
  const result = buildVcpNativeRuntimeTargetDiagnosisContract(diagnosisInput({
    componentActionMapping: {
      componentKnown: false,
      actionKnown: false,
      component: null,
      action: null,
      mappingSource: 'not_checked',
      rawPluginConfigRead: false,
      privateMemoryContentRead: false
    },
    harnessBinding: {
      wrapperPlanValid: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      profile: PROFILES.OBSERVE_LITE,
      component: null,
      action: null,
      noWriteBudgetZero: true,
      bodyBudgetZero: true,
      responseBodyBudgetZero: true,
      requestBodyGenerated: false
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.diagnosis_result.componentActionMappingKnown, false);
  assert.equal(result.lowDisclosureProjection.action, null);
  assert.equal(result.runtimeExecuted, false);
});

test('CM1919 rejects endpoint locator config log raw body request body memory secret fields without echo', () => {
  const result = buildVcpNativeRuntimeTargetDiagnosisContract(diagnosisInput({
    endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
    locatorValue: 'PRIVATE_LOCATOR_VALUE_SHOULD_NOT_ECHO',
    configEnv: 'PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO',
    token: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    requestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'PRIVATE_ERROR_PAYLOAD_SHOULD_NOT_ECHO',
    rawMemoryText: 'PRIVATE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    rawPluginConfig: 'PRIVATE_PLUGIN_CONFIG_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_runtime_target_diagnosis_material');
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
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
});

test('CM1919 rejects live reachability process inspection body log write and readiness drift', () => {
  const result = buildVcpNativeRuntimeTargetDiagnosisContract(diagnosisInput({
    targetReferenceResolution: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      referencePresent: true,
      locatorHashPresent: true,
      locatorValueDisclosed: true,
      endpointDisclosed: true
    },
    transportReachability: {
      transportReachabilityKnown: true,
      statusOnly: true,
      bodyRead: true,
      logRead: true,
      secretRead: true,
      requiresNewExactApproval: false
    },
    runtimeProcessState: {
      runtimeProcessStateKnown: true,
      runningOrNotRunningKnown: true,
      processCountBucket: 'one',
      commandLineRedacted: false,
      envRead: true,
      requiresNewExactApproval: false
    },
    harnessBinding: {
      wrapperPlanValid: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      profile: PROFILES.OBSERVE_LITE,
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      noWriteBudgetZero: false,
      bodyBudgetZero: false,
      responseBodyBudgetZero: false,
      requestBodyGenerated: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_diagnosis_contract');
  assert.ok(result.invalidFields.includes('targetReferenceResolution.locatorValueDisclosed'));
  assert.ok(result.invalidFields.includes('targetReferenceResolution.endpointDisclosed'));
  assert.ok(result.invalidFields.includes('transportReachability.transportReachabilityKnown'));
  assert.ok(result.invalidFields.includes('transportReachability.bodyRead'));
  assert.ok(result.invalidFields.includes('runtimeProcessState.runtimeProcessStateKnown'));
  assert.ok(result.invalidFields.includes('runtimeProcessState.processCountBucket'));
  assert.ok(result.invalidFields.includes('runtimeProcessState.envRead'));
  assert.ok(result.invalidFields.includes('harnessBinding.noWriteBudgetZero'));
  assert.ok(result.invalidFields.includes('harnessBinding.requestBodyGenerated'));
  assert.equal(result.diagnosis_result.transportReachabilityKnown, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1919 rejects nonzero and unknown side-effect counters', () => {
  const result = buildVcpNativeRuntimeTargetDiagnosisContract(diagnosisInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      networkCalls: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_or_unknown_diagnosis_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('networkCalls'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
  assert.ok(result.forbiddenCounters.includes('unknownCounter'));
  assert.equal(result.networkCalled, false);
});

test('CM1919 rejects unsafe target profile and action values without echo', () => {
  const result = buildVcpNativeRuntimeTargetDiagnosisContract(diagnosisInput({
    targetReferenceResolution: {
      targetReferenceName: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
      referencePresent: true,
      locatorHashPresent: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false
    },
    harnessBinding: {
      wrapperPlanValid: true,
      targetReferenceName: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
      profile: 'PRIVATE_PROFILE_SHOULD_NOT_ECHO',
      component: 'KnowledgeBaseManager',
      action: 'PRIVATE_ACTION_SHOULD_NOT_ECHO',
      noWriteBudgetZero: true,
      bodyBudgetZero: true,
      responseBodyBudgetZero: true,
      requestBodyGenerated: false
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_runtime_target_diagnosis_contract');
  assert.ok(result.invalidFields.includes('targetReferenceResolution.targetReferenceName'));
  assert.ok(result.invalidFields.includes('harnessBinding.profile'));
  assert.ok(result.invalidFields.includes('harnessBinding.action'));
  assert.equal(result.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(result.lowDisclosureProjection.profile, null);
  assert.equal(result.lowDisclosureProjection.action, null);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_ACTION_SHOULD_NOT_ECHO'), false);
});

test('CM1919 public MCP surface is unchanged', () => {
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
