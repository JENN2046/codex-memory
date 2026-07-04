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
  ZERO_COUNTERS: DRY_RUN_COUNTERS,
  buildVcpNativeRuntimeAdapterDryRunContract
} = require('../src/core/VcpNativeRuntimeAdapterDryRunContract');
const {
  MODES,
  ZERO_COUNTERS,
  buildVcpNativeReadOnlyProofExecutionHarness
} = require('../src/core/VcpNativeReadOnlyProofExecutionHarness');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function adapterInput(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    adapterId: 'CM1915-native-readonly-adapter',
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
      approvalReference: 'CM1915-readonly-proof-ref',
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
    taskId: 'CM-1915',
    adapterInput: adapterInput(),
    proofPath: {
      pathId: 'CM1915-readonly-proof-path',
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
      approvalReference: 'CM1915-readonly-proof-ref',
      approvalLineValueIncluded: false,
      requestBodyIncluded: false,
      runtimeExecutionAuthorized: false,
      liveRuntimeAllowed: false
    },
    counters: { ...PROOF_PATH_ZERO_COUNTERS },
    ...overrides
  };
}

function dryRunContract(overrides = {}) {
  const gate = buildVcpNativeReadOnlyProofPathGate(gateInput());
  assert.equal(gate.accepted, true);
  const result = buildVcpNativeRuntimeAdapterDryRunContract(gate.invocationPlan);
  assert.equal(result.accepted, true);
  return {
    ...clone(result),
    ...overrides
  };
}

function requestBoundary(overrides = {}) {
  return {
    action: 'one_read_only_vcp_native_proof',
    profile: PROFILES.OBSERVE_LITE,
    maxRuntimeCalls: 1,
    maxNetworkCalls: 1,
    writeBudget: 0,
    responseBodyByteBudget: 0,
    logReadBudget: 0,
    resultProjection: 'shape_only',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    componentAction: 'knowledge_base.search',
    ...overrides
  };
}

function exactApproval(overrides = {}) {
  return {
    currentExternalApprovalPresent: true,
    approvalReference: 'CM1915-exact-approval-ref',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    componentAction: 'knowledge_base.search',
    profile: PROFILES.OBSERVE_LITE,
    maxRuntimeCalls: 1,
    maxNetworkCalls: 1,
    writeBudget: 0,
    responseBodyByteBudget: 0,
    logReadBudget: 0,
    resultProjection: 'shape_only',
    noWriteRuleAccepted: true,
    noBodyLogRuleAccepted: true,
    stopConditionsAccepted: true,
    approvalLineValueIncluded: false,
    requestBodyIncluded: false,
    rawOutputAllowed: false,
    ...overrides
  };
}

function harnessInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1915',
    dryRunContract: dryRunContract(),
    requestBoundary: requestBoundary(),
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1915 accepts default dry_run mode without live runtime execution', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput());

  assert.equal(result.accepted, true);
  assert.equal(result.mode, MODES.DRY_RUN);
  assert.equal(result.modePolicy.dry_run.default, true);
  assert.equal(result.modePolicy.dry_run.live_call, false);
  assert.equal(result.dryRunDefaultNoRun, true);
  assert.equal(result.exactApprovalStillRequiredForLive, true);
  assert.equal(result.result.accepted, true);
  assert.equal(result.result.readyForCm1916LiveProof, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1915 exact_approved_live mode rejects missing exact approval', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    mode: MODES.EXACT_APPROVED_LIVE
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'exact_approval_required');
  assert.equal(result.result.accepted, false);
  assert.equal(result.result.reason, 'exact_approval_required');
  assert.equal(result.result.runtimeExecuted, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
});

test('CM1915 exact_approved_live mode rejects approval marker that is not currently present', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    mode: MODES.EXACT_APPROVED_LIVE,
    exactApproval: exactApproval({
      currentExternalApprovalPresent: false
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'exact_approval_required');
  assert.equal(result.runtimeExecuted, false);
});

test('CM1915 exact_approved_live mode rejects boundary violations without runtime execution', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    mode: MODES.EXACT_APPROVED_LIVE,
    exactApproval: exactApproval({
      maxRuntimeCalls: 2,
      maxNetworkCalls: 2,
      writeBudget: 1,
      responseBodyByteBudget: 1,
      logReadBudget: 1,
      resultProjection: 'raw_body',
      requestBodyIncluded: true,
      rawOutputAllowed: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'boundary_violation');
  assert.ok(result.boundaryViolations.includes('exactApproval.maxRuntimeCalls'));
  assert.ok(result.boundaryViolations.includes('exactApproval.maxNetworkCalls'));
  assert.ok(result.boundaryViolations.includes('exactApproval.writeBudget'));
  assert.ok(result.boundaryViolations.includes('exactApproval.responseBodyByteBudget'));
  assert.ok(result.boundaryViolations.includes('exactApproval.logReadBudget'));
  assert.ok(result.boundaryViolations.includes('exactApproval.resultProjection'));
  assert.ok(result.boundaryViolations.includes('exactApproval.requestBodyIncluded'));
  assert.ok(result.boundaryViolations.includes('exactApproval.rawOutputAllowed'));
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1915 exact_approved_live mode accepts complete approval only as next-step gate', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    mode: MODES.EXACT_APPROVED_LIVE,
    exactApproval: exactApproval()
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.mode, MODES.EXACT_APPROVED_LIVE);
  assert.equal(result.requiresExternalApproval, true);
  assert.equal(result.exactApprovalAcceptedForNextStep, true);
  assert.equal(result.liveReadOnlyProofMayProceedToCm1916, true);
  assert.equal(result.result.accepted, true);
  assert.equal(result.result.readyForCm1916LiveProof, true);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.rawBodyPersisted, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.receiptWritten, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1915 rejects forbidden raw endpoint body approval token config log provider fields without echo', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO:6005',
    requestBody: 'PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO',
    responseBody: 'PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO',
    approvalLineText: 'PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    token: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
    configEnv: 'PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO',
    rawLog: 'PRIVATE_LOG_SHOULD_NOT_ECHO',
    providerPayload: 'PRIVATE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_body_runtime_or_authorization_fields');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('responseBody'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('configEnv'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('providerPayload'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
});

test('CM1915 rejects nonzero and unknown side-effect counters', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      networkCalls: 1,
      memoryWrites: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_or_unknown_side_effect_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('networkCalls'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('unknownCounter'));
  assert.equal(result.runtimeExecuted, false);
});

test('CM1915 rejects invalid harness mode without echoing unsafe mode values', () => {
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    mode: {
      token: 'PRIVATE_MODE_TOKEN_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_harness_mode');
  assert.deepEqual(result.invalidFields, ['mode']);
  assert.equal(result.mode, null);
  assert.equal(result.lowDisclosureProjection.mode, null);
  assert.equal(result.result.mode, null);
  assert.equal(serialized.includes('PRIVATE_MODE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(result.runtimeExecuted, false);
});

test('CM1915 rejects invalid dry-run contract or request boundary shapes', () => {
  const contract = dryRunContract();
  contract.dry_run_result.runtimeExecuted = true;
  const result = buildVcpNativeReadOnlyProofExecutionHarness(harnessInput({
    dryRunContract: contract,
    requestBoundary: requestBoundary({
      maxRuntimeCalls: 2,
      componentAction: 'knowledge_base.write'
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_no_run_execution_harness_boundary');
  assert.ok(result.invalidFields.includes('dryRunContract.dry_run_result.runtimeExecuted'));
  assert.ok(result.invalidFields.includes('requestBoundary.maxRuntimeCalls'));
  assert.ok(result.invalidFields.includes('requestBoundary.componentAction'));
  assert.equal(result.runtimeExecuted, false);
});

test('CM1915 public MCP surface is unchanged', () => {
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
