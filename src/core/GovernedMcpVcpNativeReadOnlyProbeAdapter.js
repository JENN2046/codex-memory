'use strict';

const {
  PROFILES
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  ZERO_WRITE_COUNTERS,
  buildVcpNativeReadOnlyExecutionReceipt
} = require('./VcpNativeReadOnlyExecutionReceipt');
const {
  ALLOWED_LOCAL_REPAIR_FILE_CLASSES,
  ZERO_COUNTERS: DISPOSABLE_BOUNDARY_ZERO_COUNTERS
} = require('./VcpNativeDisposableTargetResolverTransportBoundaryContract');
const {
  executeVcpNativeDisposableTargetRequestReadShapeProbe
} = require('./VcpNativeDisposableTargetRequestReadShapeProbeExecutor');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  REQUIRED_PRIMARY_RUNTIME,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal
} = require('./CurrentProductGoalContract');

const CONTRACT_NAME = 'GovernedMcpVcpNativeReadOnlyProbeAdapter';
const CONTRACT_MODE = 'governed_mcp_bridge_readonly_no_write_probe_receipt_no_runtime';
const READ_SHAPE_PROBE_MODE = 'governed_mcp_bridge_disposable_read_shape_probe_one_call_no_write';
const DISPOSABLE_BOUNDARY_TASK_ID = 'CM-1963';
const READ_SHAPE_PROBE_TASK_ID = 'CM-1964';
const ALLOWED_READ_INVOCATION_PROFILES = Object.freeze([
  'governed_read_only'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'none',
  'receipt_only',
  'metadata',
  'shape_only',
  'summary',
  'structured'
]);

const TOOL_ACTION_BINDINGS = Object.freeze({
  search_memory: Object.freeze({
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    shapeKeys: Object.freeze(['items', 'status'])
  }),
  memory_overview: Object.freeze({
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    shapeKeys: Object.freeze(['summary', 'status'])
  }),
  audit_memory: Object.freeze({
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    shapeKeys: Object.freeze(['audit', 'status'])
  })
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeEnum(value, allowedValues, fallback = null) {
  return typeof value === 'string' && allowedValues.includes(value) ? value : fallback;
}

function nonNegativeIntegerOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function safeRuntimeTargetReferenceName(request = {}) {
  return request.runtime_target_forbidden_field_count === 0 &&
    isSafeReferenceName(request.runtime_target_reference_name)
    ? request.runtime_target_reference_name
    : null;
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    mcpCalled: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    rawBodyPersisted: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    auditWritePerformed: false,
    receiptWritten: false,
    rollbackApplied: false,
    publicMcpExpanded: false,
    providerApiCalled: false,
    readinessClaimed: false
  };
}

function lowDisclosureProjection({ toolName = null, gateResult = {} } = {}) {
  const request = isPlainObject(gateResult.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  return {
    toolName: TOOL_ACTION_BINDINGS[toolName] ? toolName : null,
    targetReferenceName: safeRuntimeTargetReferenceName(request),
    invocationProfile: safeEnum(request.invocation_profile, ALLOWED_READ_INVOCATION_PROFILES),
    disclosureLevel: safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS),
    runtimeTargetForbiddenFieldCount: nonNegativeIntegerOrNull(request.runtime_target_forbidden_field_count)
  };
}

function rejected(reasonCode, input = {}, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: details.invalidFields || [],
    receiptResult: null,
    receipt: null,
    readShapeProbeExecutorInput: null,
    readShapeProbeExecutionResult: null,
    nextAction: 'fix_governed_bridge_readonly_probe_input_or_stop_before_runtime',
    ...zeroSideEffectFlags()
  };
}

function buildReceiptInput({ toolName, gateResult }) {
  const request = gateResult.normalizedBridgeRequest;
  const binding = TOOL_ACTION_BINDINGS[toolName];

  return {
    schemaVersion: 1,
    taskId: `governed-mcp-${toolName}-readonly-probe`,
    targetReferenceName: request.runtime_target_reference_name,
    profile: PROFILES.OBSERVE_LITE,
    component: binding.component,
    action: binding.action,
    statusCategory: 'not_executed',
    shapeKeys: [...binding.shapeKeys],
    itemCount: 0,
    durationBucket: 'not_measured',
    normalizedResultStatus: 'not_executed',
    zeroWriteCounters: { ...ZERO_WRITE_COUNTERS }
  };
}

function invalidReadOnlyGateFields({ toolName, gateResult }) {
  const invalidFields = [];

  if (!TOOL_ACTION_BINDINGS[toolName]) invalidFields.push('toolName');
  if (!isPlainObject(gateResult) || gateResult.accepted !== true) invalidFields.push('gateResult.accepted');
  const request = isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  if (request.read_allowed !== true) invalidFields.push('gateResult.normalizedBridgeRequest.read_allowed');
  if (request.write_allowed !== false) invalidFields.push('gateResult.normalizedBridgeRequest.write_allowed');
  if (request.invocation_profile !== 'governed_read_only') {
    invalidFields.push('gateResult.normalizedBridgeRequest.invocation_profile');
  }
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(request.disclosure_level)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.disclosure_level');
  }
  if (!isSafeReferenceName(request.runtime_target_reference_name)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_reference_name');
  }
  if (request.runtime_target_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count');
  }
  if (request.raw_output_allowed !== false) invalidFields.push('gateResult.normalizedBridgeRequest.raw_output_allowed');
  if (request.audit_receipt_reference_present !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.audit_receipt_reference_present');
  }

  return invalidFields;
}

function buildDisposableBoundaryContractInput({ toolName, gateResult }) {
  const request = gateResult.normalizedBridgeRequest;
  const binding = TOOL_ACTION_BINDINGS[toolName];
  const targetReferenceName = safeRuntimeTargetReferenceName(request);

  return {
    schemaVersion: 1,
    taskId: DISPOSABLE_BOUNDARY_TASK_ID,
    targetReferenceName,
    component: binding.component,
    action: binding.action,
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
      resolverMayReadTargetFiles: false,
      resolverMayReadTargetEnvValues: false,
      resolverMayReadTargetLogs: false,
      resolverMayResolveEndpointLocatorInMemory: false,
      transportMayUseResolvedEndpointLocator: false,
      transportMayGenerateMinimalRequestBodyInMemory: true,
      transportMaySubmitProbe: true,
      transportMayConsumeResponseForShapeProjection: true,
      targetReferenceName,
      component: binding.component,
      action: binding.action,
      requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
      queryBoundaryCategory: 'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan',
      maxResultCount: 1
    },
    executionPermissions: {
      runtimeExecutionWindowAuthorized: true,
      processStateInspectionAllowed: false,
      listenerRecheckAllowed: false,
      serviceStartEnsureAllowed: false,
      serviceStopForCleanupAllowed: false,
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
      maxProcessStateInspections: 0,
      maxListenerRecheckAttempts: 0,
      maxServiceStartOrEnsureAttempts: 0,
      maxServiceStopAttempts: 0,
      maxServiceRestartAttempts: 0,
      maxLocalRepairFiles: 3,
      maxValidationRuns: 3,
      maxRetriesAfterTransientFailure: 1,
      maxResultCount: 1
    },
    rawDiagnosticPolicy: {
      rawDiagnosticAuthority: false,
      rawEndpointLocatorInspectionAllowed: false,
      rawRequestInspectionAllowed: false,
      rawResponseInspectionAllowed: false,
      rawErrorInspectionAllowed: false,
      rawLogStdoutStderrInspectionAllowed: false,
      targetEnvValueInspectionAllowed: false,
      targetRawMemoryStoreAuditInspectionAllowed: false,
      rawDiagnosticOutputAllowed: false,
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
    counters: { ...DISPOSABLE_BOUNDARY_ZERO_COUNTERS }
  };
}

function buildReadShapeProbeExecutorInput({
  toolName,
  gateResult,
  invokeComponentAction,
  resolverCategory = 'target_reference_to_disposable_component_action_invoker',
  transportCategory = 'local_direct_component_action_invoker'
}) {
  const request = isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  const targetReferenceName = safeRuntimeTargetReferenceName(request);

  return {
    taskId: READ_SHAPE_PROBE_TASK_ID,
    targetReferenceName,
    resolverCategory,
    transportCategory,
    requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
    queryBoundaryCategory: 'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan',
    boundaryContractInput: buildDisposableBoundaryContractInput({ toolName, gateResult }),
    governanceMeta: buildReadShapeProbeGovernanceMetadata({ toolName, gateResult }),
    invokeComponentAction
  };
}

function buildReadShapeProbeGovernanceMetadata({ toolName, gateResult }) {
  const request = isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  const scope = isPlainObject(request.scope) ? request.scope : {};

  return {
    schemaVersion: 'codex_memory_governed_native_bridge_call_governance_v1',
    trustedExecutionContext: {
      accepted: request.trusted_execution_context_accepted === true,
      source: 'trusted_execution_context_or_transport',
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'Codex',
        projectId: scope.project_id || null,
        scopeId: scope.scope_id || null,
        workspaceId: scope.workspace_id || null,
        visibility: safeEnum(request.visibility, ['private', 'project', 'workspace'])
      }
    },
    runtimeTarget: {
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      targetReferenceName: safeRuntimeTargetReferenceName(request),
      targetKind: request.runtime_target_kind === 'mcp_server' ? 'mcp_server' : null,
      sourceAuthority: request.runtime_target_source_authority === 'bridge_runtime_or_static_config'
        ? 'bridge_runtime_or_static_config'
        : null,
      bound: request.runtime_target === REQUIRED_PRIMARY_RUNTIME &&
        request.runtime_target_configured === true &&
        request.runtime_target_kind === 'mcp_server' &&
        request.runtime_target_source_authority === 'bridge_runtime_or_static_config' &&
        request.runtime_target_forbidden_field_count === 0,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    invocationProfile: {
      profile: 'governed_read_only',
      source: 'bridge_tool_binding',
      transport: 'mcp',
      toolName: TOOL_ACTION_BINDINGS[toolName] ? toolName : null,
      bound: request.invocation_profile === 'governed_read_only' &&
        request.transport === 'mcp' &&
        request.mcp_tool_name === toolName &&
        request.invocation_profile_forbidden_field_count === 0,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    readWriteAuthority: {
      readAllowed: true,
      writeAllowed: false,
      source: 'bridge_tool_binding',
      bound: request.read_allowed === true &&
        request.write_allowed === false &&
        request.read_write_authority_forbidden_field_count === 0,
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      writeRequiresExactApproval: false,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    outputDisclosureBudget: {
      level: safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS),
      lowDisclosure: true,
      rawOutput: false,
      maxItems: Number.isInteger(request.disclosure_max_items) ? request.disclosure_max_items : null,
      maxBytes: Number.isInteger(request.disclosure_max_bytes) ? request.disclosure_max_bytes : null,
      source: 'bridge_gate_normalized_governance',
      bound: request.raw_output_allowed === false &&
        ALLOWED_DISCLOSURE_LEVELS.includes(request.disclosure_level) &&
        Number.isInteger(request.disclosure_max_items) &&
        request.disclosure_max_items >= 0 &&
        request.disclosure_max_items <= 5 &&
        Number.isInteger(request.disclosure_max_bytes) &&
        request.disclosure_max_bytes >= 0 &&
        request.disclosure_max_bytes <= 4096 &&
        request.disclosure_forbidden_field_count === 0,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    auditReceipt: {
      receipt_id: isSafeReferenceName(request.audit_receipt_reference_name)
        ? request.audit_receipt_reference_name
        : null,
      required: request.audit_receipt_required === true,
      lowDisclosure: request.audit_receipt_low_disclosure === true,
      source: 'bridge_gate_normalized_governance',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    rollbackPosture: {
      mode: safeEnum(request.rollback_posture, ['no_runtime_state_to_rollback', 'read_only_no_write']),
      source: 'bridge_gate_normalized_governance',
      bound: ['no_runtime_state_to_rollback', 'read_only_no_write'].includes(request.rollback_posture) &&
        request.rollback_plan_reference_present === false &&
        request.rollback_posture_forbidden_field_count === 0,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      automaticRollbackAppliedByBridge: false
    },
    governanceTransport: {
      metadataPath: 'params._meta.codexMemoryGovernance',
      toolArgumentsMayCarryGovernance: false,
      trustedExecutionContextMustMatchTransportContext: true,
      transportContextFieldsOverrideGovernanceMetadata: true
    },
    lowDisclosure: true,
    readinessClaimed: false
  };
}

function buildGovernedMcpVcpNativeReadOnlyProbeAdapter(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const { toolName, gateResult } = input;
  const invalidFields = invalidReadOnlyGateFields({ toolName, gateResult });

  if (invalidFields.length > 0) {
    return rejected('invalid_governed_readonly_probe_boundary', input, { invalidFields });
  }

  const receiptResult = buildVcpNativeReadOnlyExecutionReceipt(buildReceiptInput({
    toolName,
    gateResult
  }));

  if (receiptResult.accepted !== true) {
    return {
      ...rejected('readonly_execution_receipt_not_accepted', input, {
        invalidFields: receiptResult.invalidFields || []
      }),
      receiptResult
    };
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    receiptResult,
    receipt: receiptResult.receipt,
    readShapeProbeExecutorInput: null,
    readShapeProbeExecutionResult: null,
    nextAction: 'governed_bridge_readonly_probe_receipt_ready_stop_before_live_runtime',
    ...zeroSideEffectFlags()
  };
}

async function executeGovernedMcpVcpNativeReadShapeProbe(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const { toolName, gateResult, invokeComponentAction } = input;
  const invalidFields = invalidReadOnlyGateFields({ toolName, gateResult });
  if (typeof invokeComponentAction !== 'function') invalidFields.push('invokeComponentAction');
  const governanceMeta = buildReadShapeProbeGovernanceMetadata({ toolName, gateResult });
  const governanceMetadataCoverage =
    validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(governanceMeta, { toolName });
  if (governanceMetadataCoverage.accepted !== true) invalidFields.push('governanceMeta');

  if (invalidFields.length > 0) {
    return rejected('invalid_governed_read_shape_probe_execution_boundary', input, { invalidFields });
  }

  const readShapeProbeExecutorInput = buildReadShapeProbeExecutorInput({
    toolName,
    gateResult,
    invokeComponentAction,
    resolverCategory: input.resolverCategory,
    transportCategory: input.transportCategory
  });
  const readShapeProbeExecutionResult =
    await executeVcpNativeDisposableTargetRequestReadShapeProbe(readShapeProbeExecutorInput);

  return {
    accepted: readShapeProbeExecutionResult.accepted === true,
    contractName: CONTRACT_NAME,
    contractMode: READ_SHAPE_PROBE_MODE,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    receiptResult: null,
    receipt: readShapeProbeExecutionResult.receipt || null,
    readShapeProbeExecutorInput: null,
    readShapeProbeExecutionResult,
    nextAction: readShapeProbeExecutionResult.accepted === true
      ? 'governed_bridge_read_shape_probe_executed_review_low_disclosure_receipt'
      : 'governed_bridge_read_shape_probe_rejected_review_low_disclosure_reason',
    ...zeroSideEffectFlags(),
    runtimeExecuted: readShapeProbeExecutionResult.accepted === true &&
      Number(readShapeProbeExecutionResult.counters?.runtimeCallsUsed || 0) > 0,
    liveVcpToolBoxCalled: false,
    networkCalled: Number(readShapeProbeExecutionResult.counters?.networkCallsUsed || 0) > 0,
    requestBodyGenerated: readShapeProbeExecutionResult.requestBodyGeneratedByHarness === true,
    responseBodyRead: readShapeProbeExecutionResult.responseBodyConsumedForShapeProjection === true,
    memoryReadPerformed: false,
    memoryWritten: false,
    readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  READ_SHAPE_PROBE_MODE,
  TOOL_ACTION_BINDINGS,
  buildDisposableBoundaryContractInput,
  buildGovernedMcpVcpNativeReadOnlyProbeAdapter,
  buildReadShapeProbeGovernanceMetadata,
  buildReadShapeProbeExecutorInput,
  executeGovernedMcpVcpNativeReadShapeProbe
};
