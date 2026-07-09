'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract
} = require('../src/core/VcpNativeRealDisposableTargetDeclarationEvidencePreparationContract');

function fixtureInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1987',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    priorAbortReceipt: {
      sourceTaskId: 'CM-1986',
      abortStatusClass: 'boundary_blocked',
      routeStatusCategory: 'not_executed',
      realDisposableTargetBindingCategory: 'not_verified_existing_operator_reuse_forbidden_abort',
      targetVerifiedRealNewDisposable: false,
      existingOperatorTargetReuseAllowed: false,
      requestBodyGenerated: false,
      runtimeCalled: false,
      networkCalled: false,
      responseConsumed: false,
      readShapeUnlocked: false,
      readinessClaimed: false
    },
    targetDeclaration: {
      declarationKind: 'real_disposable_target_declaration_preparation',
      targetClass: 'real_disposable_target',
      targetLifecycleCategory: 'new_or_disposable_target_scoped',
      realDisposableTargetRequired: true,
      newOrDisposableTarget: true,
      targetScopeOnly: true,
      existingOperatorTargetReuseAllowed: false,
      nonTargetWorkspaceAccessAllowed: false,
      containsJennPrivateInformation: false,
      containsProductionSecrets: false,
      containsCustomerData: false,
      containsRealPrivateMemory: false,
      containsPersistentRuntimeArtifacts: false,
      mayBeDiscardedAfterProbe: true
    },
    evidencePreparation: {
      declarationEvidenceCategory: 'operator_declared_real_disposable_target_no_raw_values',
      bindingEvidenceCategory: 'declaration_prepared_binding_not_proven',
      targetEvidencePersistenceCategory: 'low_disclosure_governance_only_no_raw_values',
      rawEndpointLocatorValuesBound: false,
      rawEndpointLocatorValuesPersisted: false,
      targetBindingProven: false,
      requestBodyGenerationAllowed: false,
      runtimeProbeAllowed: false,
      exactApprovalRequiredBeforeProbe: true,
      futureTargetMaterialMustBeSeparatelyEvidenced: true,
      existingOperatorReferenceIsSufficient: false
    },
    futureExecutionBoundary: {
      exactApprovalRequired: true,
      cm1959BoundaryRequired: true,
      cm1963BoundaryRequired: true,
      cm1964ExecutorRequired: true,
      cm1978FixturePreparationRequired: true,
      cm1986AbortReceiptRequired: true,
      requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
      queryBoundaryCategory: 'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan',
      maxResultCount: 1,
      lowDisclosureReceiptOnly: true,
      concreteRequestBodyOutputAllowed: false,
      responseFieldNameDisclosureAllowed: false,
      retryWithoutNewEvidenceAllowed: false
    },
    forbiddenBoundary: {
      existingOperatorTargetReuse: false,
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
      receiptMode: 'low_disclosure_real_disposable_target_declaration_preparation',
      mayPersistRawValues: false,
      mayPersistEndpointLocator: false,
      mayPersistRequestBody: false,
      mayPersistResponseBody: false,
      mayPersistRawErrorPayload: false,
      mayPersistRawLogs: false,
      mayPersistSecrets: false,
      mayPersistPrivateMemoryContent: false,
      mustRecordTargetBindingProvenFalse: true,
      mustRecordReadShapeUnlockedFalse: true,
      mustRecordReadinessClaimedFalse: true
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1987 accepts real disposable target declaration evidence preparation without live binding', () => {
  const result = buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract(fixtureInput());

  assert.equal(result.accepted, true);
  assert.equal(result.taskId, 'CM-1987');
  assert.equal(result.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.accepted, true);
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.priorAbortAccepted, true);
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.realDisposableTargetDeclarationAccepted, true);
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.existingOperatorTargetReuseAllowed, false);
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.targetBindingProven, false);
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.targetMaterialRequiresFutureEvidence, true);
  assert.equal(result.real_disposable_target_declaration_evidence_preparation_result.futureExactApprovalRequired, true);
  assert.equal(result.declarationPreparationPlan.realTargetBindingProven, false);
  assert.equal(result.declarationPreparationPlan.endpointLocatorDisclosureAllowed, false);
  assert.equal(result.declarationPreparationPlan.rawValuePersistenceAllowed, false);
  assert.equal(result.contractExecutedRuntime, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyConsumed, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.realTargetBindingProven, false);
  assert.equal(result.readShapeUnlocked, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1987 rejects existing operator reuse and private or persistent target posture', () => {
  const result = buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract(fixtureInput({
    targetDeclaration: {
      ...fixtureInput().targetDeclaration,
      existingOperatorTargetReuseAllowed: true,
      containsJennPrivateInformation: true,
      containsProductionSecrets: true,
      containsRealPrivateMemory: true,
      containsPersistentRuntimeArtifacts: true
    },
    evidencePreparation: {
      ...fixtureInput().evidencePreparation,
      existingOperatorReferenceIsSufficient: true,
      targetBindingProven: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_real_disposable_target_declaration_evidence_preparation_contract');
  assert.ok(result.invalidFields.includes('targetDeclaration.existingOperatorTargetReuseAllowed'));
  assert.ok(result.invalidFields.includes('targetDeclaration.containsJennPrivateInformation'));
  assert.ok(result.invalidFields.includes('targetDeclaration.containsProductionSecrets'));
  assert.ok(result.invalidFields.includes('targetDeclaration.containsRealPrivateMemory'));
  assert.ok(result.invalidFields.includes('targetDeclaration.containsPersistentRuntimeArtifacts'));
  assert.ok(result.invalidFields.includes('evidencePreparation.existingOperatorReferenceIsSufficient'));
  assert.ok(result.invalidFields.includes('evidencePreparation.targetBindingProven'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1987 rejects stale or contradicted CM1986 abort facts', () => {
  const result = buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract(fixtureInput({
    priorAbortReceipt: {
      ...fixtureInput().priorAbortReceipt,
      sourceTaskId: 'CM-1984',
      abortStatusClass: 'success',
      targetVerifiedRealNewDisposable: true,
      readShapeUnlocked: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_real_disposable_target_declaration_evidence_preparation_contract');
  assert.ok(result.invalidFields.includes('priorAbortReceipt.sourceTaskId'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.abortStatusClass'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.targetVerifiedRealNewDisposable'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.readShapeUnlocked'));
  assert.equal(result.realTargetBindingProven, false);
  assert.equal(result.readShapeUnlocked, false);
});

test('CM1987 rejects raw values without echoing submitted material', () => {
  const result = buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract(fixtureInput({
    endpoint: 'RAW_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'RAW_LOCATOR_SHOULD_NOT_ECHO',
    requestBody: 'RAW_REQUEST_BODY_SHOULD_NOT_ECHO',
    rawResponseBody: 'RAW_RESPONSE_SHOULD_NOT_ECHO',
    rawErrorPayload: 'RAW_ERROR_SHOULD_NOT_ECHO',
    rawLog: 'RAW_LOG_SHOULD_NOT_ECHO',
    secret: 'RAW_SECRET_SHOULD_NOT_ECHO',
    memoryId: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_values_must_not_enter_real_disposable_target_declaration_contract');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('secret'));
  assert.ok(result.forbiddenFields.includes('memoryId'));
  assert.equal(serialized.includes('RAW_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOCATOR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_ERROR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_SECRET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
});

test('CM1987 rejects live execution counters and readiness drift', () => {
  const result = buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract(fixtureInput({
    futureExecutionBoundary: {
      ...fixtureInput().futureExecutionBoundary,
      concreteRequestBodyOutputAllowed: true,
      retryWithoutNewEvidenceAllowed: true
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
      requestBodiesGenerated: 1,
      memoryWrites: 1,
      publicMcpExpansions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_or_unknown_real_disposable_target_declaration_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('publicMcpExpansions'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1987 public MCP surface remains unchanged', () => {
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
