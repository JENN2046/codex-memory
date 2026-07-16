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
  ZERO_COUNTERS: PROOF_PATH_ZERO_COUNTERS,
  buildVcpNativeReadOnlyProofPathGate
} = require('../src/core/VcpNativeReadOnlyProofPathGate');
const {
  ZERO_COUNTERS,
  buildVcpNativeRuntimeAdapterDryRunContract
} = require('../src/core/VcpNativeRuntimeAdapterDryRunContract');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function adapterInput(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    adapterId: 'CM1912-native-readonly-adapter',
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
      approvalReference: 'CM1912-readonly-proof-ref',
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
    taskId: 'CM-1912',
    adapterInput: adapterInput(),
    proofPath: {
      pathId: 'CM1912-readonly-proof-path',
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
      approvalReference: 'CM1912-readonly-proof-ref',
      approvalLineValueIncluded: false,
      requestBodyIncluded: false,
      runtimeExecutionAuthorized: false,
      liveRuntimeAllowed: false
    },
    counters: { ...PROOF_PATH_ZERO_COUNTERS },
    ...overrides
  };
}

function invocationPlan(overrides = {}) {
  const gate = buildVcpNativeReadOnlyProofPathGate(gateInput());
  assert.equal(gate.accepted, true);
  return {
    ...clone(gate.invocationPlan),
    ...overrides
  };
}

test('CM1912 accepts a CM1911 invocationPlan as dry-run runtime adapter contract without live calls', () => {
  const result = buildVcpNativeRuntimeAdapterDryRunContract(invocationPlan());

  assert.equal(result.accepted, true);
  assert.equal(result.invocationPlanAccepted, true);
  assert.equal(result.runtimeAdapterDryRunAccepted, true);
  assert.equal(result.dryRunNoCallBoundaryHeld, true);
  assert.deepEqual(result.dry_run_result, {
    accepted: true,
    wouldExecute: true,
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    normalizedResultExpected: true,
    exactApprovalStillRequired: true
  });
  assert.equal(result.runtimeAdapterEntered, true);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1912 rejects non-CM1911 invocationPlan shapes', () => {
  const plan = invocationPlan({
    planType: 'not_cm1911_plan',
    pathKind: 'not_cm1911_path',
    expectedResultNormalizer: 'RawNormalizer'
  });
  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_runtime_adapter_dry_run_contract');
  assert.ok(result.invalidFields.includes('planType'));
  assert.ok(result.invalidFields.includes('pathKind'));
  assert.ok(result.invalidFields.includes('expectedResultNormalizer'));
  assert.equal(result.dry_run_result.accepted, false);
  assert.equal(result.runtimeExecuted, false);
});

test('CM1912 rejects current exact approval and live runtime authorization signals', () => {
  const plan = invocationPlan();
  plan.exactApproval.currentExactApprovalPresent = true;
  plan.exactApproval.runtimeExecutionAuthorized = true;
  plan.exactApproval.liveRuntimeAllowed = true;
  plan.runtimeCallWrapper.runtimeExecutionAuthorized = true;
  plan.runtimeCallWrapper.runtimeExecuted = true;

  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_runtime_adapter_dry_run_contract');
  assert.ok(result.invalidFields.includes('exactApproval.currentExactApprovalPresent'));
  assert.ok(result.invalidFields.includes('exactApproval.runtimeExecutionAuthorized'));
  assert.ok(result.invalidFields.includes('exactApproval.liveRuntimeAllowed'));
  assert.ok(result.invalidFields.includes('runtimeCallWrapper.runtimeExecutionAuthorized'));
  assert.ok(result.invalidFields.includes('runtimeCallWrapper.runtimeExecuted'));
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1912 rejects non-zero runtime network body memory and receipt counters', () => {
  const plan = invocationPlan({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      networkCalls: 1,
      memoryReads: 1,
      receiptWrites: 1,
      runtimeAdapterLiveCalls: 1
    }
  });
  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_side_effect_counters');
  assert.deepEqual(result.forbiddenCounters, [
    'runtimeCalls',
    'liveVcpToolBoxCalls',
    'networkCalls',
    'memoryReads',
    'receiptWrites',
    'runtimeAdapterLiveCalls'
  ]);
  assert.equal(result.dry_run_result.wouldExecute, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1912 rejects unknown counters even when their value is zero', () => {
  const plan = invocationPlan({
    counters: {
      ...ZERO_COUNTERS,
      unknownSideEffectCounter: 0
    }
  });
  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_side_effect_counters');
  assert.deepEqual(result.forbiddenCounters, ['unknownSideEffectCounter']);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1912 rejects raw endpoint body log approval and secret fields without echo', () => {
  const plan = invocationPlan({
    runtimeEndpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    approvalRequestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    secretValue: 'PRIVATE_SECRET_SHOULD_NOT_ECHO'
  });
  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);
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

test('CM1912 low-disclosure projection does not echo unsafe profile or action values', () => {
  const plan = invocationPlan();
  plan.profile = 'SECRET_PROFILE_SHOULD_NOT_ECHO';
  plan.operation.action = 'SECRET_ACTION_SHOULD_NOT_ECHO';
  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_runtime_adapter_dry_run_contract');
  assert.equal(result.lowDisclosureProjection.profile, null);
  assert.equal(result.lowDisclosureProjection.action, null);
  assert.equal(serialized.includes('SECRET_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_ACTION_SHOULD_NOT_ECHO'), false);
});

test('CM1912 rejects runtime wrapper budget or response body expansion', () => {
  const plan = invocationPlan();
  plan.runtimeCallWrapper.budgets.responseBodyByteBudget = 128;
  plan.runtimeCallWrapper.responsePolicy.responseBodyAllowed = true;
  plan.runtimeCallWrapper.requestPolicy.includeRequestBody = true;
  plan.requestBodyGenerated = true;

  const result = buildVcpNativeRuntimeAdapterDryRunContract(plan);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_vcp_native_runtime_adapter_dry_run_contract');
  assert.ok(result.invalidFields.includes('runtimeCallWrapper.budgets.responseBodyByteBudget'));
  assert.ok(result.invalidFields.includes('runtimeCallWrapper.responsePolicy.responseBodyAllowed'));
  assert.ok(result.invalidFields.includes('runtimeCallWrapper.requestPolicy.includeRequestBody'));
  assert.ok(result.invalidFields.includes('requestBodyGenerated'));
  assert.equal(result.dry_run_result.responseBodyRead, false);
});

test('CM1912 public MCP surface is unchanged', () => {
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
