'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ALLOWED_LOCAL_REPAIR_FILE_CLASSES,
  ZERO_COUNTERS,
  buildVcpNativeDisposableTargetResolverTransportBoundaryContract
} = require('../src/core/VcpNativeDisposableTargetResolverTransportBoundaryContract');

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

test('CM1963 accepts disposable target resolver/transport runtime assist boundary without execution', () => {
  const result = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput());

  assert.equal(result.accepted, true);
  assert.equal(result.disposable_resolver_transport_boundary_result.accepted, true);
  assert.equal(result.disposable_resolver_transport_boundary_result.disposableTargetAuthorityAccepted, true);
  assert.equal(result.disposable_resolver_transport_boundary_result.resolverTransportAuthorityPrepared, true);
  assert.equal(result.disposable_resolver_transport_boundary_result.runtimeAssistWindowPrepared, true);
  assert.equal(result.disposable_resolver_transport_boundary_result.rawDiagnosticAuthorityScopedToDisposableTarget, true);
  assert.equal(result.disposable_resolver_transport_boundary_result.rawDiagnosticRepoPersistenceAllowed, false);
  assert.equal(result.disposable_resolver_transport_boundary_result.nextExactApprovalRequiredForDisposableTarget, false);
  assert.equal(result.lowDisclosureProjection.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.executionWindow.budgets.maxComponentActionRequestReadShapeAttempts, 2);
  assert.equal(result.executionWindow.maxResultCount, 1);
  assert.equal(result.contractExecutedRuntime, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.responseBodyConsumed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1963 rejects non-disposable private or production target declarations', () => {
  const result = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    disposableTargetDeclaration: {
      ...boundaryInput().disposableTargetDeclaration,
      newOrDisposableTarget: false,
      containsJennPrivateInformation: true,
      containsProductionSecrets: true,
      containsCustomerData: true,
      containsRealPrivateMemory: true,
      nonTargetWorkspaceAccessAllowed: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_resolver_transport_boundary_contract');
  assert.ok(result.invalidFields.includes('disposableTargetDeclaration.newOrDisposableTarget'));
  assert.ok(result.invalidFields.includes('disposableTargetDeclaration.containsJennPrivateInformation'));
  assert.ok(result.invalidFields.includes('disposableTargetDeclaration.containsProductionSecrets'));
  assert.ok(result.invalidFields.includes('disposableTargetDeclaration.containsCustomerData'));
  assert.ok(result.invalidFields.includes('disposableTargetDeclaration.containsRealPrivateMemory'));
  assert.ok(result.invalidFields.includes('disposableTargetDeclaration.nonTargetWorkspaceAccessAllowed'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1963 permits raw diagnostic authority flags but rejects committed raw values without echo', () => {
  const result = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    endpoint: 'RAW_ENDPOINT_SHOULD_NOT_ECHO',
    requestBody: 'RAW_REQUEST_BODY_SHOULD_NOT_ECHO',
    rawResponseBody: 'RAW_RESPONSE_SHOULD_NOT_ECHO',
    rawErrorPayload: 'RAW_ERROR_SHOULD_NOT_ECHO',
    rawLog: 'RAW_LOG_SHOULD_NOT_ECHO',
    envValue: 'RAW_ENV_VALUE_SHOULD_NOT_ECHO',
    memoryId: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_values_must_not_be_committed_to_boundary_contract');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawLog'));
  assert.ok(result.forbiddenFields.includes('envValue'));
  assert.ok(result.forbiddenFields.includes('memoryId'));
  assert.equal(serialized.includes('RAW_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_ERROR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_LOG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_ENV_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
});

test('CM1963 rejects forbidden side effects and readiness drift', () => {
  const result = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    executionPermissions: {
      ...boundaryInput().executionPermissions,
      serviceRestartAllowed: true,
      memoryWriteAllowed: true,
      durableWriteAllowed: true,
      providerApiCallAllowed: true,
      dependencyChangeAllowed: true,
      publicMcpExpansionAllowed: true,
      vcpToolBoxCoreModificationAllowed: true,
      releaseDeployCutoverPushAllowed: true,
      readinessClaimAllowed: true
    },
    forbiddenBoundary: {
      ...boundaryInput().forbiddenBoundary,
      memoryWrite: true,
      durableRuntimeAuditStoreMutation: true,
      providerApiCall: true,
      dependencyInstallUpdateRemoval: true,
      publicMcpToolSchemaExpansion: true,
      vcpToolBoxCoreCodeModification: true,
      releaseDeployCutoverTagPush: true,
      readinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_resolver_transport_boundary_contract');
  assert.ok(result.invalidFields.includes('executionPermissions.memoryWriteAllowed'));
  assert.ok(result.invalidFields.includes('executionPermissions.publicMcpExpansionAllowed'));
  assert.ok(result.invalidFields.includes('executionPermissions.readinessClaimAllowed'));
  assert.ok(result.invalidFields.includes('forbiddenBoundary.memoryWrite'));
  assert.ok(result.invalidFields.includes('forbiddenBoundary.publicMcpToolSchemaExpansion'));
  assert.ok(result.invalidFields.includes('forbiddenBoundary.readinessClaim'));
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1963 rejects over-broad budgets unknown fields and nonzero counters', () => {
  const budget = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    executionBudgets: {
      ...boundaryInput().executionBudgets,
      maxComponentActionRequestReadShapeAttempts: 10,
      maxResultCount: 20
    }
  }));
  const unknown = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    resolverTransportBoundary: {
      ...boundaryInput().resolverTransportBoundary,
      hiddenTransportHint: true
    }
  }));
  const counters = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCallsUsed: 1,
      rawResponseBodiesPersisted: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(budget.accepted, false);
  assert.equal(budget.reasonCode, 'invalid_disposable_resolver_transport_boundary_contract');
  assert.ok(budget.invalidFields.includes('executionBudgets.maxComponentActionRequestReadShapeAttempts'));
  assert.ok(budget.invalidFields.includes('executionBudgets.maxResultCount'));

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unknown_disposable_resolver_transport_boundary_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['resolverTransportBoundary.hiddenTransportHint']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_disposable_resolver_transport_counters');
  assert.ok(counters.forbiddenCounters.includes('runtimeCallsUsed'));
  assert.ok(counters.forbiddenCounters.includes('rawResponseBodiesPersisted'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1963 rejects target component action and receipt policy mismatches', () => {
  const result = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryInput({
    targetReferenceName: 'different-safe-reference',
    component: 'UnknownComponent',
    action: 'unknown.action',
    priorGateReceipt: {
      ...boundaryInput().priorGateReceipt,
      sourceTaskId: 'CM-0000',
      approvedAttemptConsumed: true,
      readShapeUnlocked: true
    },
    resolverTransportBoundary: {
      ...boundaryInput().resolverTransportBoundary,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search'
    },
    receiptPolicy: {
      ...boundaryInput().receiptPolicy,
      mayPersistRawResponseBody: true,
      mayPersistSecrets: true,
      mustRecordReadinessClaimedFalse: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_disposable_resolver_transport_boundary_contract');
  assert.ok(result.invalidFields.includes('component'));
  assert.ok(result.invalidFields.includes('action'));
  assert.ok(result.invalidFields.includes('priorGateReceipt.sourceTaskId'));
  assert.ok(result.invalidFields.includes('priorGateReceipt.approvedAttemptConsumed'));
  assert.ok(result.invalidFields.includes('priorGateReceipt.readShapeUnlocked'));
  assert.ok(result.invalidFields.includes('resolverTransportBoundary.targetReferenceName'));
  assert.ok(result.invalidFields.includes('resolverTransportBoundary.component'));
  assert.ok(result.invalidFields.includes('resolverTransportBoundary.action'));
  assert.ok(result.invalidFields.includes('receiptPolicy.mayPersistRawResponseBody'));
  assert.ok(result.invalidFields.includes('receiptPolicy.mayPersistSecrets'));
  assert.ok(result.invalidFields.includes('receiptPolicy.mustRecordReadinessClaimedFalse'));
});

test('CM1963 reports missing required fields', () => {
  const input = boundaryInput();
  delete input.priorGateReceipt.blockReason;
  delete input.disposableTargetDeclaration.targetScopeOnly;
  delete input.resolverTransportBoundary.queryBoundaryCategory;
  delete input.executionPermissions.runtimeExecutionWindowAuthorized;
  delete input.executionBudgets.maxNetworkCalls;
  delete input.rawDiagnosticPolicy.diagnosticScope;
  delete input.localRepairBoundary.allowedFileClasses;
  delete input.forbiddenBoundary.providerApiCall;
  delete input.receiptPolicy.receiptMode;

  const result = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_disposable_resolver_transport_boundary_fields');
  assert.ok(result.missingFields.includes('priorGateReceipt.blockReason'));
  assert.ok(result.missingFields.includes('disposableTargetDeclaration.targetScopeOnly'));
  assert.ok(result.missingFields.includes('resolverTransportBoundary.queryBoundaryCategory'));
  assert.ok(result.missingFields.includes('executionPermissions.runtimeExecutionWindowAuthorized'));
  assert.ok(result.missingFields.includes('executionBudgets.maxNetworkCalls'));
  assert.ok(result.missingFields.includes('rawDiagnosticPolicy.diagnosticScope'));
  assert.ok(result.missingFields.includes('localRepairBoundary.allowedFileClasses'));
  assert.ok(result.missingFields.includes('forbiddenBoundary.providerApiCall'));
  assert.ok(result.missingFields.includes('receiptPolicy.receiptMode'));
});

test('CM1963 public MCP surface is unchanged', () => {
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
