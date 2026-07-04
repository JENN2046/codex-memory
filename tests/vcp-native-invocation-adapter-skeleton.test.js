'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PROFILES
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  FORBIDDEN_FIELD_NAMES,
  ZERO_COUNTERS,
  buildVcpNativeInvocationAdapterSkeleton,
  normalizeVcpNativeLowDisclosureResult
} = require('../src/core/VcpNativeInvocationAdapterSkeleton');

function adapterInput(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    adapterId: 'CM1910-native-readonly-adapter',
    target: {
      kind: 'service_url',
      referenceName: 'operator-vcp-toolbox-service-ref',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false,
      configEnvRead: false,
      runtimeCalled: false,
      observedPresent: true,
      runtimeEntrypointKnown: true
    },
    profile: PROFILES.OBSERVE_LITE,
    operation: {
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      operationType: 'read_only_recall_probe',
      readOnly: true,
      writeIntent: false,
      includeContent: false,
      rawBodyAllowed: false,
      responseBodyAllowed: false,
      logReadAllowed: false,
      memoryIdDisclosureAllowed: false
    },
    scope: {
      agentAlias: 'Codex',
      clientIdPresent: true,
      workspaceScopePresent: true,
      ownerScopePresent: true,
      visibility: 'project-local'
    },
    lowDisclosurePolicy: {
      rawPayloadAllowed: false,
      requestBodyAllowed: false,
      responseBodyAllowed: false,
      logsAllowed: false,
      memoryIdsAllowed: false,
      maxReturnedChars: 0,
      maxItemCount: 5
    },
    exactApproval: {
      accepted: true,
      boundary: 'exact-approved-read-only-proof-boundary',
      approvalReference: 'CM1910-readonly-proof-ref',
      approvalLineValueIncluded: false,
      requestBodyIncluded: false,
      runtimeExecutionAuthorized: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1910 accepts exact target/profile read-only adapter skeleton without runtime execution', () => {
  const result = buildVcpNativeInvocationAdapterSkeleton(adapterInput());

  assert.equal(result.accepted, true);
  assert.equal(result.targetProfileContractAccepted, true);
  assert.equal(result.lowDisclosureResultNormalizerAccepted, true);
  assert.equal(result.runtimeCallWrapperPrepared, true);
  assert.equal(result.exactApprovedReadOnlyProofPathPrepared, true);
  assert.equal(result.profile, PROFILES.OBSERVE_LITE);
  assert.equal(result.sanitizedTarget.referenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.sanitizedTarget.locatorValueIncluded, false);
  assert.equal(result.sanitizedTarget.secretMaterialIncluded, false);
  assert.equal(result.operation.action, 'knowledge_base.search');
  assert.equal(result.operation.readOnly, true);
  assert.equal(result.operation.includeContent, false);

  assert.equal(result.runtimeCallWrapper.budgets.maxRuntimeCalls, 1);
  assert.equal(result.runtimeCallWrapper.budgets.writeBudget, 0);
  assert.equal(result.runtimeCallWrapper.budgets.responseBodyByteBudget, 0);
  assert.equal(result.runtimeCallWrapper.budgets.bodyLeakBudget, 0);
  assert.equal(result.runtimeCallWrapper.responsePolicy.normalizedShapeOnly, true);
  assert.equal(result.runtimeCallWrapper.responsePolicy.responseBodyAllowed, false);

  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.runtimeExecutionAuthorized, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1910 rejects write profiles actions and runtime authorization in the skeleton boundary', () => {
  const result = buildVcpNativeInvocationAdapterSkeleton(adapterInput({
    profile: PROFILES.TRUSTED_FULL,
    operation: {
      ...adapterInput().operation,
      action: 'daily_note.write',
      readOnly: false,
      writeIntent: true
    },
    exactApproval: {
      ...adapterInput().exactApproval,
      runtimeExecutionAuthorized: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_invocation_adapter_contract');
  assert.ok(result.invalidFields.includes('profile'));
  assert.ok(result.invalidFields.includes('operation.action'));
  assert.ok(result.invalidFields.includes('operation.readOnly'));
  assert.ok(result.invalidFields.includes('operation.writeIntent'));
  assert.ok(result.invalidFields.includes('exactApproval.runtimeExecutionAuthorized'));
  assert.deepEqual(result.rejectedActions, ['daily_note.write']);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1910 rejects raw endpoint body log memory-id and secret fields without echoing values', () => {
  const result = buildVcpNativeInvocationAdapterSkeleton(adapterInput({
    target: {
      ...adapterInput().target,
      endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
    },
    result: {
      status: 'success',
      sourceRuntime: 'vcp_toolbox',
      evidenceType: 'low-disclosure-runtime-result',
      responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
      memoryId: 'PRIVATE_MEMORY_ID_SHOULD_NOT_ECHO'
    },
    rawDailyNoteContent: 'PRIVATE_RAW_MEMORY_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_body_or_runtime_fields');
  assert.ok(result.forbiddenFields.includes('target.endpoint'));
  assert.ok(result.forbiddenFields.includes('target.bearerToken'));
  assert.ok(result.forbiddenFields.includes('result.responseBody'));
  assert.ok(result.forbiddenFields.includes('result.memoryId'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RAW_MEMORY_SHOULD_NOT_ECHO'), false);
});

test('CM1910 normalizes low-disclosure runtime result shape without raw items or body leakage', () => {
  const result = normalizeVcpNativeLowDisclosureResult({
    status: 'success',
    sourceRuntime: 'vcp_toolbox',
    evidenceType: 'low-disclosure-runtime-result',
    targetAlias: 'operator-vcp-toolbox-service-ref',
    profile: PROFILES.TRUSTED_FULL_READ,
    itemCount: 2,
    shapeKeys: ['score', 'target', 'createdAtDateOnly'],
    confidenceLevel: 'shape-only'
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.status, 'success');
  assert.equal(result.sourceRuntime, 'vcp_toolbox');
  assert.equal(result.itemCount, 2);
  assert.deepEqual(result.shapeKeys, ['createdAtDateOnly', 'score', 'target']);
  assert.equal(result.rawPayloadIncluded, false);
  assert.equal(result.requestBodyIncluded, false);
  assert.equal(result.responseBodyIncluded, false);
  assert.equal(result.logsIncluded, false);
  assert.equal(result.memoryIdsIncluded, false);
  assert.equal(result.bodyLeakBudgetUsed, 0);
  assert.equal(result.writeCount, 0);
  assert.equal(serialized.includes('content'), false);
  assert.equal(serialized.includes('snippet'), false);
});

test('CM1910 result normalizer fails closed on forbidden raw result keys', () => {
  for (const field of ['content', 'text', 'snippet', 'rawPayload', 'rawLog', 'memoryIds', 'approvalLine']) {
    const result = normalizeVcpNativeLowDisclosureResult({
      status: 'success',
      sourceRuntime: 'vcp_toolbox',
      evidenceType: 'low-disclosure-runtime-result',
      [field]: 'PRIVATE_VALUE_SHOULD_NOT_ECHO'
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.accepted, false, field);
    assert.equal(result.reasonCode, 'forbidden_raw_or_private_result_fields');
    assert.ok(result.forbiddenFields.includes(field));
    assert.equal(serialized.includes('PRIVATE_VALUE_SHOULD_NOT_ECHO'), false);
  }
});

test('CM1910 result normalizer rejects unsafe confidence labels without echoing values', () => {
  const result = normalizeVcpNativeLowDisclosureResult({
    status: 'success',
    sourceRuntime: 'vcp_toolbox',
    evidenceType: 'low-disclosure-runtime-result',
    confidenceLevel: 'SECRET_CONFIDENCE_LABEL_SHOULD_NOT_ECHO'
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_low_disclosure_result_shape');
  assert.ok(result.invalidFields.includes('result.confidenceLevel'));
  assert.equal(serialized.includes('SECRET_CONFIDENCE_LABEL_SHOULD_NOT_ECHO'), false);
});

test('CM1910 rejects positive side-effect counters', () => {
  const result = buildVcpNativeInvocationAdapterSkeleton(adapterInput({
    counters: {
      ...ZERO_COUNTERS,
      liveVcpToolBoxCalls: 1,
      memoryReads: 1,
      publicMcpExpansions: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_side_effect_counters');
  assert.deepEqual(result.forbiddenCounters, [
    'liveVcpToolBoxCalls',
    'memoryReads',
    'publicMcpExpansions'
  ]);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1910 rejects readiness and public MCP claims', () => {
  const result = buildVcpNativeInvocationAdapterSkeleton(adapterInput({
    productionReady: true,
    publicMcpExpansion: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_body_or_runtime_fields');
  assert.ok(result.forbiddenFields.includes('productionReady'));
  assert.ok(result.forbiddenFields.includes('publicMcpExpansion'));
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1910 forbidden vocabulary includes body memory config secret and readiness leak keys', () => {
  for (const key of [
    'endpoint',
    'requestBody',
    'responseBody',
    'rawLog',
    'memoryId',
    'configEnv',
    'token',
    'approvalLine',
    'publicMcpExpansion',
    'RC_READY'
  ]) {
    assert.ok(FORBIDDEN_FIELD_NAMES.includes(key), key);
  }
});
