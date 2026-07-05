'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeDisposableTargetBindingFixturePreparationContract
} = require('../src/core/VcpNativeDisposableTargetBindingFixturePreparationContract');

function fixtureInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1978',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    priorAbortReceipt: {
      sourceTaskId: 'CM-1977',
      abortStatusClass: 'boundary_blocked',
      routeStatusCategory: 'not_executed',
      componentActionRequestReadShapeProbeCategory: 'aborted_before_component_action_target_disposable_precondition_failed',
      targetVerifiedDisposable: false,
      readShapeUnlocked: false,
      requestBodyGenerated: false,
      runtimeCalled: false,
      networkCalled: false,
      responseConsumed: false,
      readinessClaimed: false
    },
    fixtureDeclaration: {
      fixtureKind: 'exact_disposable_target_fixture_preparation',
      targetCategory: 'synthetic_disposable_empty_target',
      newOrDisposableTarget: true,
      targetScopeOnly: true,
      syntheticOrEmptyMemoryOnly: true,
      containsJennPrivateInformation: false,
      containsProductionSecrets: false,
      containsCustomerData: false,
      containsRealPrivateMemory: false,
      containsPersistentRuntimeArtifacts: false,
      nonTargetWorkspaceAccessAllowed: false,
      existingOperatorTargetReuseAllowed: false
    },
    bindingReadiness: {
      resolverCategory: 'injected_disposable_fixture_resolver',
      transportCategory: 'injected_disposable_fixture_transport',
      injectedTransportRequired: true,
      endpointLocatorValuesBound: false,
      endpointLocatorValuesPersisted: false,
      targetSelfDeclarationPresent: true,
      targetEmptinessProofCategory: 'empty_or_synthetic_target_category_only',
      targetPrivateDataAbsenceProofCategory: 'declared_no_private_prod_customer_real_memory',
      targetPersistenceIsolationCategory: 'disposable_no_persistent_runtime_artifacts',
      componentActionAvailableCategory: 'category_declared_not_live_proven',
      rawDiagnosticValuePersistence: false
    },
    futureExecutionBoundary: {
      exactApprovalRequired: true,
      cm1963BoundaryRequired: true,
      cm1964ExecutorRequired: true,
      requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
      queryBoundaryCategory: 'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan',
      maxResultCount: 1,
      lowDisclosureReceiptOnly: true,
      concreteRequestBodyOutputAllowed: false,
      responseFieldNameDisclosureAllowed: false,
      retryWithoutApprovalAllowed: false
    },
    forbiddenBoundary: {
      liveRuntimeCall: false,
      networkCall: false,
      processStateInspection: false,
      listenerRecheck: false,
      serviceStartStopRestart: false,
      endpointLocatorDisclosure: false,
      concreteRequestBodyOutput: false,
      rawResponseErrorLogPersistence: false,
      secretReadOutputPersistence: false,
      privateMemoryAccess: false,
      memoryWrite: false,
      durableWrite: false,
      providerApiCall: false,
      dependencyChange: false,
      publicMcpExpansion: false,
      vcpToolBoxCoreModification: false,
      pushTagReleaseDeployCutover: false,
      readinessClaim: false
    },
    receiptPolicy: {
      receiptMode: 'low_disclosure_disposable_target_binding_fixture_preparation',
      mayPersistRawValues: false,
      mayPersistEndpointLocator: false,
      mayPersistRequestBody: false,
      mayPersistResponseBody: false,
      mayPersistRawErrorPayload: false,
      mayPersistRawLogs: false,
      mayPersistSecrets: false,
      mayPersistPrivateMemoryContent: false,
      mustRecordReadShapeUnlockedFalse: true,
      mustRecordReadinessClaimedFalse: true
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1978 accepts exact disposable target fixture preparation without live binding', () => {
  const result = buildVcpNativeDisposableTargetBindingFixturePreparationContract(fixtureInput());

  assert.equal(result.accepted, true);
  assert.equal(result.taskId, 'CM-1978');
  assert.equal(result.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.disposable_target_binding_fixture_preparation_result.accepted, true);
  assert.equal(result.disposable_target_binding_fixture_preparation_result.priorAbortAccepted, true);
  assert.equal(result.disposable_target_binding_fixture_preparation_result.disposableFixtureDeclarationAccepted, true);
  assert.equal(result.disposable_target_binding_fixture_preparation_result.existingOperatorTargetReuseAllowed, false);
  assert.equal(result.disposable_target_binding_fixture_preparation_result.injectedFixtureTransportRequired, true);
  assert.equal(result.disposable_target_binding_fixture_preparation_result.futureExactApprovalRequired, true);
  assert.equal(result.fixtureBindingPlan.targetCategory, 'synthetic_disposable_empty_target');
  assert.equal(result.fixtureBindingPlan.endpointLocatorDisclosureAllowed, false);
  assert.equal(result.fixtureBindingPlan.rawValuePersistenceAllowed, false);
  assert.equal(result.fixtureBindingPlan.exactApprovalRequiredBeforeLive, true);
  assert.equal(result.contractExecutedRuntime, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyConsumed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readShapeUnlocked, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1978 rejects reuse of non-disposable existing operator target posture', () => {
  const result = buildVcpNativeDisposableTargetBindingFixturePreparationContract(fixtureInput({
    fixtureDeclaration: {
      ...fixtureInput().fixtureDeclaration,
      syntheticOrEmptyMemoryOnly: false,
      containsRealPrivateMemory: true,
      containsPersistentRuntimeArtifacts: true,
      existingOperatorTargetReuseAllowed: true
    },
    bindingReadiness: {
      ...fixtureInput().bindingReadiness,
      targetPersistenceIsolationCategory: 'existing_runtime_artifacts_present'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_target_binding_fixture_preparation_contract');
  assert.ok(result.invalidFields.includes('fixtureDeclaration.syntheticOrEmptyMemoryOnly'));
  assert.ok(result.invalidFields.includes('fixtureDeclaration.containsRealPrivateMemory'));
  assert.ok(result.invalidFields.includes('fixtureDeclaration.containsPersistentRuntimeArtifacts'));
  assert.ok(result.invalidFields.includes('fixtureDeclaration.existingOperatorTargetReuseAllowed'));
  assert.ok(result.invalidFields.includes('bindingReadiness.targetPersistenceIsolationCategory'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1978 rejects raw values without echoing submitted material', () => {
  const result = buildVcpNativeDisposableTargetBindingFixturePreparationContract(fixtureInput({
    endpoint: 'RAW_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'RAW_LOCATOR_SHOULD_NOT_ECHO',
    requestBody: 'RAW_REQUEST_BODY_SHOULD_NOT_ECHO',
    rawResponseBody: 'RAW_RESPONSE_SHOULD_NOT_ECHO',
    rawErrorPayload: 'RAW_ERROR_SHOULD_NOT_ECHO',
    rawLog: 'RAW_LOG_SHOULD_NOT_ECHO',
    secret: 'RAW_SECRET_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_values_must_not_enter_disposable_target_fixture_preparation_contract');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('secret'));
  assert.equal(serialized.includes('RAW_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOCATOR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_ERROR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_SECRET_SHOULD_NOT_ECHO'), false);
});

test('CM1978 rejects live execution side effects counters and readiness drift', () => {
  const result = buildVcpNativeDisposableTargetBindingFixturePreparationContract(fixtureInput({
    priorAbortReceipt: {
      ...fixtureInput().priorAbortReceipt,
      requestBodyGenerated: true,
      runtimeCalled: true,
      readinessClaimed: true
    },
    futureExecutionBoundary: {
      ...fixtureInput().futureExecutionBoundary,
      concreteRequestBodyOutputAllowed: true,
      retryWithoutApprovalAllowed: true
    },
    forbiddenBoundary: {
      ...fixtureInput().forbiddenBoundary,
      liveRuntimeCall: true,
      memoryWrite: true,
      publicMcpExpansion: true,
      readinessClaim: true
    },
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      memoryWrites: 1,
      publicMcpExpansions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_or_unknown_disposable_target_binding_fixture_preparation_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('publicMcpExpansions'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1978 rejects missing CM1977 abort precondition facts before future exact boundary', () => {
  const result = buildVcpNativeDisposableTargetBindingFixturePreparationContract(fixtureInput({
    priorAbortReceipt: {
      ...fixtureInput().priorAbortReceipt,
      sourceTaskId: 'CM-1975',
      abortStatusClass: 'success',
      targetVerifiedDisposable: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_target_binding_fixture_preparation_contract');
  assert.ok(result.invalidFields.includes('priorAbortReceipt.sourceTaskId'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.abortStatusClass'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.targetVerifiedDisposable'));
  assert.equal(result.readShapeUnlocked, false);
});

test('CM1978 public MCP surface remains unchanged', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, [
    'audit_memory',
    'memory_overview',
    'record_memory',
    'search_memory',
    'supersede_memory',
    'tombstone_memory',
    'validate_memory'
  ]);
});
