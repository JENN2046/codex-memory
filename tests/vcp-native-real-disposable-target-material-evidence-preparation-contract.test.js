'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract
} = require('../src/core/VcpNativeRealDisposableTargetMaterialEvidencePreparationContract');

function fixtureInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1991',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    priorAbortReceipt: {
      sourceTaskId: 'CM-1990',
      abortStatusClass: 'boundary_blocked',
      routeStatusCategory: 'not_executed',
      realDisposableTargetBindingCategory: 'not_attempted_separately_evidenced_target_material_absent_abort',
      targetMaterialEvidenceCategory: 'absent_or_not_separately_evidenced',
      targetBindingAttempts: 0,
      requestBodyGenerated: false,
      runtimeCalled: false,
      networkCalled: false,
      responseConsumed: false,
      readShapeUnlocked: false,
      readinessClaimed: false
    },
    targetMaterialEvidencePreparation: {
      evidenceKind: 'real_disposable_target_material_evidence_preparation',
      materialEvidenceCategory: 'target_material_requirements_prepared_no_material_bound',
      materialScopeCategory: 'target_scoped_disposable_material_category_only',
      materialLifecycleCategory: 'new_or_disposable_target_material_required',
      realDisposableTargetMaterialRequired: true,
      separateEvidenceRequired: true,
      materialMustBeTargetScoped: true,
      materialMayBeDiscardedAfterProbe: true,
      materialProvenPresent: false,
      targetMaterialBound: false,
      targetBindingProven: false,
      endpointLocatorValuesBound: false,
      endpointLocatorValuesPersisted: false,
      rawTargetMaterialValuesPersisted: false,
      existingOperatorReferenceIsSufficient: false,
      existingOperatorTargetReuseAllowed: false,
      nonTargetWorkspaceAccessAllowed: false,
      containsJennPrivateInformation: false,
      containsProductionSecrets: false,
      containsCustomerData: false,
      containsRealPrivateMemory: false,
      containsPersistentRuntimeArtifacts: false
    },
    futureMaterialEvidenceBoundary: {
      exactApprovalRequiredBeforeUse: true,
      cm1987DeclarationContractRequired: true,
      cm1988BoundaryPacketRequired: true,
      cm1990AbortReceiptRequired: true,
      materialEvidenceMustBeSeparatelyEvidenced: true,
      materialEvidenceMayUseSafeReferenceNameOnly: true,
      materialEvidenceMayPersistRawValues: false,
      materialEvidenceMayPersistEndpointLocator: false,
      materialEvidenceMayPersistRequestBody: false,
      materialEvidenceMayAuthorizeRuntime: false,
      materialEvidenceMayAuthorizeTargetBinding: false,
      lowDisclosureReceiptOnly: true,
      maxResultCount: 1
    },
    futureExecutionBoundary: {
      exactApprovalRequired: true,
      cm1959BoundaryRequired: true,
      cm1963BoundaryRequired: true,
      cm1964ExecutorRequired: true,
      cm1978FixturePreparationRequired: true,
      cm1982FixtureCloseoutRequired: true,
      cm1987MaterialDeclarationRequired: true,
      cm1988BoundaryRequired: true,
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
      receiptMode: 'low_disclosure_real_disposable_target_material_evidence_preparation',
      mayPersistRawValues: false,
      mayPersistEndpointLocator: false,
      mayPersistTargetMaterialValues: false,
      mayPersistRequestBody: false,
      mayPersistResponseBody: false,
      mayPersistRawErrorPayload: false,
      mayPersistRawLogs: false,
      mayPersistSecrets: false,
      mayPersistPrivateMemoryContent: false,
      mustRecordTargetMaterialBoundFalse: true,
      mustRecordTargetBindingProvenFalse: true,
      mustRecordReadShapeUnlockedFalse: true,
      mustRecordReadinessClaimedFalse: true
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1991 accepts target material evidence preparation without live binding', () => {
  const result = buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract(fixtureInput());

  assert.equal(result.accepted, true);
  assert.equal(result.taskId, 'CM-1991');
  assert.equal(result.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.materialPreparationPlan.priorAbortSourceTask, 'CM-1990');
  assert.equal(
    result.materialPreparationPlan.targetMaterialEvidenceCategory,
    'target_material_requirements_prepared_no_material_bound'
  );
  assert.equal(result.materialPreparationPlan.separatelyEvidencedRealTargetMaterialRequired, true);
  assert.equal(result.materialPreparationPlan.separatelyEvidencedRealTargetMaterialPresent, false);
  assert.equal(result.materialPreparationPlan.targetMaterialBound, false);
  assert.equal(result.materialPreparationPlan.targetBindingProven, false);
  assert.equal(result.materialPreparationPlan.endpointLocatorDisclosureAllowed, false);
  assert.equal(result.materialPreparationPlan.rawValuePersistenceAllowed, false);
  assert.equal(result.real_disposable_target_material_evidence_preparation_result.accepted, true);
  assert.equal(result.real_disposable_target_material_evidence_preparation_result.priorAbortAccepted, true);
  assert.equal(
    result.real_disposable_target_material_evidence_preparation_result.targetMaterialEvidencePreparationAccepted,
    true
  );
  assert.equal(
    result.real_disposable_target_material_evidence_preparation_result.separatelyEvidencedRealTargetMaterialPresent,
    false
  );
  assert.equal(result.real_disposable_target_material_evidence_preparation_result.targetMaterialBound, false);
  assert.equal(result.real_disposable_target_material_evidence_preparation_result.targetBindingProven, false);
  assert.equal(result.contractExecutedRuntime, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.targetBindingAttempted, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyConsumed, false);
  assert.equal(result.endpointLocatorDisclosed, false);
  assert.equal(result.targetMaterialValuesPersisted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.realTargetBindingProven, false);
  assert.equal(result.readShapeUnlocked, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(
    result.nextAction,
    'cm1992_exact_real_disposable_target_material_boundary_packet_or_approval_request_readiness_review_no_live'
  );
});

test('CM1991 rejects present, bound, reused, private, or persistent material posture', () => {
  const result = buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract(fixtureInput({
    targetMaterialEvidencePreparation: {
      ...fixtureInput().targetMaterialEvidencePreparation,
      materialProvenPresent: true,
      targetMaterialBound: true,
      targetBindingProven: true,
      endpointLocatorValuesBound: true,
      rawTargetMaterialValuesPersisted: true,
      existingOperatorReferenceIsSufficient: true,
      existingOperatorTargetReuseAllowed: true,
      containsJennPrivateInformation: true,
      containsProductionSecrets: true,
      containsCustomerData: true,
      containsRealPrivateMemory: true,
      containsPersistentRuntimeArtifacts: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_real_disposable_target_material_evidence_preparation_contract');
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.materialProvenPresent'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.targetMaterialBound'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.targetBindingProven'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.endpointLocatorValuesBound'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.rawTargetMaterialValuesPersisted'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.existingOperatorReferenceIsSufficient'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.existingOperatorTargetReuseAllowed'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.containsJennPrivateInformation'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.containsProductionSecrets'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.containsCustomerData'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.containsRealPrivateMemory'));
  assert.ok(result.invalidFields.includes('targetMaterialEvidencePreparation.containsPersistentRuntimeArtifacts'));
  assert.equal(result.targetMaterialBound, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1991 rejects stale or contradicted CM1990 abort facts', () => {
  const result = buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract(fixtureInput({
    priorAbortReceipt: {
      ...fixtureInput().priorAbortReceipt,
      sourceTaskId: 'CM-1986',
      abortStatusClass: 'success',
      targetBindingAttempts: 1,
      requestBodyGenerated: true,
      runtimeCalled: true,
      readShapeUnlocked: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_real_disposable_target_material_evidence_preparation_contract');
  assert.ok(result.invalidFields.includes('priorAbortReceipt.sourceTaskId'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.abortStatusClass'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.targetBindingAttempts'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.requestBodyGenerated'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.runtimeCalled'));
  assert.ok(result.invalidFields.includes('priorAbortReceipt.readShapeUnlocked'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.readShapeUnlocked, false);
});

test('CM1991 rejects raw target material values without echoing submitted material', () => {
  const result = buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract(fixtureInput({
    endpoint: 'RAW_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'RAW_LOCATOR_SHOULD_NOT_ECHO',
    targetMaterialValue: 'RAW_TARGET_MATERIAL_SHOULD_NOT_ECHO',
    rawTargetMaterial: 'RAW_RAW_TARGET_MATERIAL_SHOULD_NOT_ECHO',
    targetFilePath: 'RAW_TARGET_PATH_SHOULD_NOT_ECHO',
    requestBody: 'RAW_REQUEST_BODY_SHOULD_NOT_ECHO',
    rawResponseBody: 'RAW_RESPONSE_SHOULD_NOT_ECHO',
    rawErrorPayload: 'RAW_ERROR_SHOULD_NOT_ECHO',
    secret: 'RAW_SECRET_SHOULD_NOT_ECHO',
    memoryId: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_values_must_not_enter_real_disposable_target_material_contract');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('targetMaterialValue'));
  assert.ok(result.forbiddenFields.includes('rawTargetMaterial'));
  assert.ok(result.forbiddenFields.includes('targetFilePath'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('secret'));
  assert.ok(result.forbiddenFields.includes('memoryId'));
  assert.equal(serialized.includes('RAW_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOCATOR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_TARGET_MATERIAL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RAW_TARGET_MATERIAL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_TARGET_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_ERROR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_SECRET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
});

test('CM1991 rejects live execution counters', () => {
  const result = buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract(fixtureInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      targetBindingsAttempted: 1,
      requestBodiesGenerated: 1,
      targetMaterialValuesPersisted: 1,
      memoryWrites: 1,
      publicMcpExpansions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'non_zero_or_unknown_real_disposable_target_material_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('targetBindingsAttempted'));
  assert.ok(result.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(result.forbiddenCounters.includes('targetMaterialValuesPersisted'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('publicMcpExpansions'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.targetBindingAttempted, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1991 public MCP surface remains unchanged', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, [
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
