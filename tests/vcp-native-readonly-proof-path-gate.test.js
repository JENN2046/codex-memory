'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  PROFILES
} = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  ZERO_COUNTERS: ADAPTER_ZERO_COUNTERS
} = require('../src/core/VcpNativeInvocationAdapterSkeleton');
const {
  PATH_KIND,
  ZERO_COUNTERS,
  buildVcpNativeReadOnlyProofPathGate
} = require('../src/core/VcpNativeReadOnlyProofPathGate');

function adapterInput(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    adapterId: 'CM1911-native-readonly-adapter',
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
      approvalReference: 'CM1911-readonly-proof-ref',
      approvalLineValueIncluded: false,
      requestBodyIncluded: false,
      runtimeExecutionAuthorized: false
    },
    counters: { ...ADAPTER_ZERO_COUNTERS },
    ...overrides
  };
}

function gateInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1911',
    adapterInput: adapterInput(),
    proofPath: {
      pathId: 'CM1911-readonly-proof-path',
      pathKind: PATH_KIND,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      profile: PROFILES.OBSERVE_LITE,
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      operationType: 'read_only_recall_probe',
      readOnly: true,
      includeContent: false,
      lowDisclosureOnly: true,
      maxReturnedItems: 5
    },
    authorizationBoundary: {
      exactApprovalRequired: true,
      currentExactApprovalPresent: false,
      approvalReference: 'CM1911-readonly-proof-ref',
      approvalLineValueIncluded: false,
      requestBodyIncluded: false,
      runtimeExecutionAuthorized: false,
      liveRuntimeAllowed: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1911 accepts local read-only proof path gate from CM1910 adapter input without runtime execution', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput());

  assert.equal(result.accepted, true);
  assert.equal(result.adapterAccepted, true);
  assert.equal(result.proofPathGateAccepted, true);
  assert.equal(result.localInvocationGateReady, true);
  assert.equal(result.futureExactApprovedReadOnlyProofPathPrepared, true);
  assert.equal(result.exactApprovalStillRequired, true);
  assert.equal(result.currentExactApprovalAcceptedByThisGate, false);
  assert.equal(result.invocationPlan.pathKind, PATH_KIND);
  assert.equal(result.invocationPlan.target.referenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.invocationPlan.operation.action, 'knowledge_base.search');
  assert.equal(result.invocationPlan.runtimeCallWrapper.budgets.maxRuntimeCalls, 1);
  assert.equal(result.invocationPlan.runtimeCallWrapper.budgets.maxNetworkCalls, 1);
  assert.equal(result.invocationPlan.runtimeCallWrapper.budgets.writeBudget, 0);
  assert.equal(result.invocationPlan.runtimeCallWrapper.budgets.responseBodyByteBudget, 0);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1911 rejects adapter contracts that CM1910 would reject', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    adapterInput: adapterInput({
      operation: {
        ...adapterInput().operation,
        action: 'daily_note.write',
        writeIntent: true
      }
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'adapter_contract_not_accepted');
  assert.equal(result.adapterReasonCode, 'invalid_vcp_native_invocation_adapter_contract');
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1911 rejects proof path mismatch against accepted adapter fields', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    proofPath: {
      ...gateInput().proofPath,
      targetReferenceName: 'different-target-ref',
      profile: PROFILES.TRUSTED_FULL_READ,
      action: 'deepmemo.recall'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_readonly_proof_path_gate');
  assert.ok(result.invalidFields.includes('proofPath.targetReferenceName'));
  assert.ok(result.invalidFields.includes('proofPath.profile'));
  assert.ok(result.invalidFields.includes('proofPath.action'));
  assert.equal(result.runtimeExecuted, false);
});

test('CM1911 rejects current exact approval or runtime authorization in this pre-runtime gate', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    authorizationBoundary: {
      ...gateInput().authorizationBoundary,
      currentExactApprovalPresent: true,
      runtimeExecutionAuthorized: true,
      liveRuntimeAllowed: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_readonly_proof_path_gate');
  assert.ok(result.invalidFields.includes('authorizationBoundary.currentExactApprovalPresent'));
  assert.ok(result.invalidFields.includes('authorizationBoundary.runtimeExecutionAuthorized'));
  assert.ok(result.invalidFields.includes('authorizationBoundary.liveRuntimeAllowed'));
  assert.equal(result.currentExactApprovalAcceptedByThisGate, false);
  assert.equal(result.runtimeExecutionAuthorized, false);
  assert.equal(result.runtimeExecuted, false);
});

test('CM1911 rejects raw endpoint body logs approval line and secret fields without echo', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    runtimeEndpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    approvalRequestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    secretValue: 'PRIVATE_SECRET_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_body_runtime_or_authorization_fields');
  assert.ok(result.forbiddenFields.includes('runtimeEndpoint'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('approvalRequestBody'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('secretValue'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SECRET_SHOULD_NOT_ECHO'), false);
});

test('CM1911 low-disclosure projection does not echo unsafe action or profile values', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    proofPath: {
      ...gateInput().proofPath,
      profile: 'SECRET_PROFILE_SHOULD_NOT_ECHO',
      action: 'SECRET_ACTION_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_readonly_proof_path_gate');
  assert.equal(result.lowDisclosureProjection.profile, null);
  assert.equal(result.lowDisclosureProjection.action, null);
  assert.equal(serialized.includes('SECRET_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_ACTION_SHOULD_NOT_ECHO'), false);
});

test('CM1911 rejects positive side-effect counters', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    counters: {
      ...ZERO_COUNTERS,
      liveVcpToolBoxCalls: 1,
      memoryReads: 1,
      requestBodiesGenerated: 1,
      receiptWrites: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_side_effect_counters');
  assert.deepEqual(result.forbiddenCounters, [
    'liveVcpToolBoxCalls',
    'memoryReads',
    'requestBodiesGenerated',
    'receiptWrites'
  ]);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.receiptWritten, false);
});

test('CM1911 rejects readiness and public MCP expansion claims', () => {
  const result = buildVcpNativeReadOnlyProofPathGate(gateInput({
    rcReady: true,
    productionReady: true,
    publicMcpExpansion: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_body_runtime_or_authorization_fields');
  assert.ok(result.forbiddenFields.includes('rcReady'));
  assert.ok(result.forbiddenFields.includes('productionReady'));
  assert.ok(result.forbiddenFields.includes('publicMcpExpansion'));
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1911 public MCP surface is unchanged', () => {
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
