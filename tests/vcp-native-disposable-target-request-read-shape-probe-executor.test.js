'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_LOCAL_REPAIR_FILE_CLASSES,
  ZERO_COUNTERS
} = require('../src/core/VcpNativeDisposableTargetResolverTransportBoundaryContract');
const {
  FIELD_NAME_DISCLOSURE_POLICY,
  buildInMemoryProbeRequestBody,
  executeVcpNativeDisposableTargetRequestReadShapeProbe
} = require('../src/core/VcpNativeDisposableTargetRequestReadShapeProbeExecutor');

function boundaryInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1963',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    priorGateReceipt: {
      sourceTaskId: 'CM-1962',
      gateResult: 'blocked_before_runtime',
      blockReason: 'no_verified_target_reference_only_executor_available',
      approvedAttemptConsumed: false,
      readShapeUnlocked: false,
      readinessClaimed: false
    },
    disposableTargetDeclaration: {
      newOrDisposableTarget: true,
      targetScopeOnly: true,
      containsJennPrivateInformation: false,
      containsProductionSecrets: false,
      containsCustomerData: false,
      containsRealPrivateMemory: false,
      nonTargetWorkspaceAccessAllowed: false
    },
    resolverTransportBoundary: {
      resolverScope: 'disposable_target_existing_repo_source_docs_scripts_checked_in_configs_and_target_runtime_files',
      transportScope: 'disposable_target_existing_local_resolver_transport_path',
      resolverMayReadTargetFiles: true,
      resolverMayReadTargetEnvValues: true,
      resolverMayReadTargetLogs: true,
      resolverMayResolveEndpointLocatorInMemory: true,
      transportMayUseResolvedEndpointLocator: true,
      transportMayGenerateMinimalRequestBodyInMemory: true,
      transportMaySubmitProbe: true,
      transportMayConsumeResponseForShapeProjection: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
      queryBoundaryCategory: 'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan',
      maxResultCount: 1
    },
    executionPermissions: {
      runtimeExecutionWindowAuthorized: true,
      processStateInspectionAllowed: true,
      listenerRecheckAllowed: true,
      serviceStartEnsureAllowed: true,
      serviceStopForCleanupAllowed: true,
      serviceRestartAllowed: false,
      memoryWriteAllowed: false,
      durableWriteAllowed: false,
      providerApiCallAllowed: false,
      dependencyChangeAllowed: false,
      publicMcpExpansionAllowed: false,
      vcpToolBoxCoreModificationAllowed: false,
      releaseDeployCutoverPushAllowed: false,
      readinessClaimAllowed: false
    },
    executionBudgets: {
      maxResolverAttempts: 3,
      maxComponentActionRequestReadShapeAttempts: 2,
      maxNetworkCalls: 3,
      maxRuntimeCalls: 3,
      maxProcessStateInspections: 3,
      maxListenerRecheckAttempts: 3,
      maxServiceStartOrEnsureAttempts: 1,
      maxServiceStopAttempts: 1,
      maxServiceRestartAttempts: 0,
      maxLocalRepairFiles: 3,
      maxValidationRuns: 3,
      maxRetriesAfterTransientFailure: 1,
      maxResultCount: 1
    },
    rawDiagnosticPolicy: {
      rawDiagnosticAuthority: true,
      rawEndpointLocatorInspectionAllowed: true,
      rawRequestInspectionAllowed: true,
      rawResponseInspectionAllowed: true,
      rawErrorInspectionAllowed: true,
      rawLogStdoutStderrInspectionAllowed: true,
      targetEnvValueInspectionAllowed: true,
      targetRawMemoryStoreAuditInspectionAllowed: true,
      rawDiagnosticOutputAllowed: true,
      rawDiagnosticRepoPersistenceAllowed: false,
      productionSecretOutputAllowed: false,
      nonTargetPrivateOutputAllowed: false,
      diagnosticScope: 'disposable_target_only_no_non_target_workspace_or_production_material'
    },
    localRepairBoundary: {
      localRepairAllowed: true,
      maxFiles: 3,
      allowedFileClasses: [...ALLOWED_LOCAL_REPAIR_FILE_CLASSES],
      mustNotModifyVcpToolBoxCore: true,
      mustNotModifyPublicMcpSchema: true,
      mustNotModifySecretsOrEnv: true,
      mustNotModifyDependencies: true,
      mustNotModifyStartupWatchdog: true,
      mustNotModifyMemoryStores: true
    },
    forbiddenBoundary: {
      productionSecrets: false,
      nonTargetWorkspaceSecrets: false,
      jennPrivateDataOutsideDisposableTarget: false,
      broadMemoryScanExportImportMigration: false,
      memoryWrite: false,
      durableRuntimeAuditStoreMutation: false,
      providerApiCall: false,
      dependencyInstallUpdateRemoval: false,
      publicMcpToolSchemaExpansion: false,
      vcpToolBoxCoreCodeModification: false,
      releaseDeployCutoverTagPush: false,
      readinessClaim: false
    },
    receiptPolicy: {
      receiptMode: 'low_disclosure_with_raw_diagnostic_usage_flag_no_raw_value_persistence',
      mayMentionRawDiagnosticOutputUsed: true,
      mayPersistRawEndpointLocator: false,
      mayPersistRawRequestBody: false,
      mayPersistRawResponseBody: false,
      mayPersistRawErrorPayload: false,
      mayPersistRawLogs: false,
      mayPersistSecrets: false,
      mayPersistPrivateMemoryContent: false,
      mustRecordReadShapeUnlocked: true,
      mustRecordReadinessClaimedFalse: true
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

function executorInput(overrides = {}) {
  return {
    taskId: 'CM-1964',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    resolverCategory: 'injected_test_resolver',
    transportCategory: 'injected_test_transport',
    requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
    queryBoundaryCategory: 'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan',
    boundaryContractInput: boundaryInput(),
    invokeComponentAction: async () => [],
    ...overrides
  };
}

test('CM1964 projects successful read shape without field names or raw response', async () => {
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    invokeComponentAction: async ({ requestBody }) => {
      assert.deepEqual(requestBody, buildInMemoryProbeRequestBody());
      return [{
        secret_like_field_name_that_must_not_echo: 'RAW_RESPONSE_SHOULD_NOT_ECHO'
      }];
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.receipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receipt.purpose, 'component_action_request_read_shape_probe');
  assert.equal(result.receipt.statusClass, 'success');
  assert.equal(result.receipt.responseShapeCategory, 'array_item_count_bucket_only');
  assert.equal(result.receipt.topLevelKindCategory, 'array');
  assert.equal(result.receipt.itemCountBucket, 'one');
  assert.equal(result.receipt.fieldNameDisclosurePolicy, FIELD_NAME_DISCLOSURE_POLICY);
  assert.equal(result.receipt.responseBodyConsumedForShapeProjection, true);
  assert.equal(result.receipt.rawResponseBodyPrinted, false);
  assert.equal(result.receipt.rawResponseBodyPersisted, false);
  assert.equal(result.receipt.readShapeUnlocked, true);
  assert.equal(result.receipt.readinessClaimed, false);
  assert.equal(result.counters.resolverAttemptsUsed, 1);
  assert.equal(result.counters.componentActionRequestReadShapeAttemptsUsed, 1);
  assert.equal(result.counters.runtimeCallsUsed, 1);
  assert.equal(serialized.includes('secret_like_field_name_that_must_not_echo'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
});

test('CM1964 projects empty array shape as success with zero item bucket', async () => {
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    invokeComponentAction: async () => []
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.receipt.statusClass, 'success');
  assert.equal(result.receipt.responseShapeCategory, 'array_item_count_bucket_only');
  assert.equal(result.receipt.itemCountBucket, 'zero');
  assert.equal(result.receipt.readShapeUnlocked, true);
  assert.equal(result.receipt.memoryWritten, false);
  assert.equal(result.receipt.zeroWriteCounters.memoryWrites, 0);
  assert.equal(result.receipt.zeroWriteCounters.publicMcpExpansions, 0);
});

test('CM1964 executes under stricter zero process service raw diagnostic boundary', async () => {
  const strictBoundary = boundaryInput({
    resolverTransportBoundary: {
      ...boundaryInput().resolverTransportBoundary,
      resolverMayReadTargetFiles: false,
      resolverMayReadTargetEnvValues: false,
      resolverMayReadTargetLogs: false,
      resolverMayResolveEndpointLocatorInMemory: false,
      transportMayUseResolvedEndpointLocator: false
    },
    executionPermissions: {
      ...boundaryInput().executionPermissions,
      processStateInspectionAllowed: false,
      listenerRecheckAllowed: false,
      serviceStartEnsureAllowed: false,
      serviceStopForCleanupAllowed: false
    },
    executionBudgets: {
      ...boundaryInput().executionBudgets,
      maxProcessStateInspections: 0,
      maxListenerRecheckAttempts: 0,
      maxServiceStartOrEnsureAttempts: 0,
      maxServiceStopAttempts: 0
    },
    rawDiagnosticPolicy: {
      ...boundaryInput().rawDiagnosticPolicy,
      rawDiagnosticAuthority: false,
      rawEndpointLocatorInspectionAllowed: false,
      rawRequestInspectionAllowed: false,
      rawResponseInspectionAllowed: false,
      rawErrorInspectionAllowed: false,
      rawLogStdoutStderrInspectionAllowed: false,
      targetEnvValueInspectionAllowed: false,
      targetRawMemoryStoreAuditInspectionAllowed: false,
      rawDiagnosticOutputAllowed: false
    }
  });
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    resolverCategory: 'target_reference_to_disposable_component_action_invoker',
    transportCategory: 'local_direct_component_action_invoker',
    boundaryContractInput: strictBoundary,
    invokeComponentAction: async () => []
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.receipt.resolverCategory, 'target_reference_to_disposable_component_action_invoker');
  assert.equal(result.receipt.transportCategory, 'local_direct_component_action_invoker');
  assert.equal(result.receipt.statusClass, 'success');
  assert.equal(result.receipt.responseShapeCategory, 'array_item_count_bucket_only');
  assert.equal(result.receipt.itemCountBucket, 'zero');
  assert.equal(result.counters.networkCallsUsed, 0);
  assert.equal(result.counters.processStateInspectionsUsed, 0);
  assert.equal(result.counters.listenerRechecksUsed, 0);
  assert.equal(result.counters.serviceStartEnsureAttemptsUsed, 0);
  assert.equal(result.counters.serviceStopAttemptsUsed, 0);
  assert.equal(result.receipt.endpointDisclosed, false);
  assert.equal(result.receipt.rawResponseBodyPersisted, false);
  assert.equal(result.receipt.memoryWritten, false);
  assert.equal(result.receipt.readShapeUnlocked, true);
  assert.equal(result.receipt.readinessClaimed, false);
});

test('CM1964 classifies client errors without raw error echo or read-shape unlock', async () => {
  const rawError = new Error('RAW_ERROR_SHOULD_NOT_ECHO');
  rawError.status = 400;

  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    transportCategory: 'local_http_transport',
    invokeComponentAction: async () => {
      throw rawError;
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.receipt.statusClass, 'client_error');
  assert.equal(result.receipt.routeStatusCategory, 'client_error_no_shape_unlock');
  assert.equal(result.receipt.responseShapeCategory, 'not_consumed');
  assert.equal(result.receipt.rawErrorPayloadPrinted, false);
  assert.equal(result.receipt.rawErrorPayloadPersisted, false);
  assert.equal(result.receipt.readShapeUnlocked, false);
  assert.equal(result.counters.networkCallsUsed, 1);
  assert.equal(serialized.includes('RAW_ERROR_SHOULD_NOT_ECHO'), false);
});

test('CM1964 rejects raw values in executor input without echo', async () => {
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    endpoint: 'RAW_ENDPOINT_SHOULD_NOT_ECHO',
    rawResponseBody: 'RAW_RESPONSE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_values_must_not_enter_low_disclosure_probe_executor');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.equal(serialized.includes('RAW_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.readShapeUnlocked, false);
});

test('CM1964 rejects invalid CM1963 boundary before runtime invocation', async () => {
  let invoked = false;
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    boundaryContractInput: boundaryInput({
      disposableTargetDeclaration: {
        ...boundaryInput().disposableTargetDeclaration,
        containsRealPrivateMemory: true
      }
    }),
    invokeComponentAction: async () => {
      invoked = true;
      return [];
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'cm1963_disposable_boundary_not_accepted');
  assert.equal(result.boundaryReasonCode, 'invalid_disposable_resolver_transport_boundary_contract');
  assert.equal(invoked, false);
  assert.equal(result.requestBodyGeneratedByHarness, false);
  assert.equal(result.readShapeUnlocked, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1964 rejects request category drift between executor and CM1963 boundary', async () => {
  let invoked = false;
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    boundaryContractInput: boundaryInput({
      resolverTransportBoundary: {
        ...boundaryInput().resolverTransportBoundary,
        requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only'
      }
    }),
    requestBodyShapeCategory: 'unknown_shape_category',
    invokeComponentAction: async () => {
      invoked = true;
      return [];
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_target_read_shape_probe_executor_input');
  assert.ok(result.invalidFields.includes('requestBodyShapeCategory'));
  assert.equal(invoked, false);
  assert.equal(result.readShapeUnlocked, false);
});

test('CM1964 rejects invalid executor input before runtime invocation', async () => {
  let invoked = false;
  const result = await executeVcpNativeDisposableTargetRequestReadShapeProbe(executorInput({
    taskId: 'CM-9999',
    invokeComponentAction: async () => {
      invoked = true;
      return [];
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_target_read_shape_probe_executor_input');
  assert.ok(result.invalidFields.includes('taskId'));
  assert.equal(invoked, false);
  assert.equal(result.requestBodyGeneratedByHarness, false);
  assert.equal(result.memoryWritten, false);
});
