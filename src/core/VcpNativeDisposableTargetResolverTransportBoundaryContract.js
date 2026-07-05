'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeDisposableTargetResolverTransportBoundaryContract';
const CONTRACT_MODE = 'disposable_target_resolver_transport_runtime_assist_boundary_no_execution';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'component',
  'action',
  'priorGateReceipt',
  'disposableTargetDeclaration',
  'resolverTransportBoundary',
  'executionPermissions',
  'executionBudgets',
  'rawDiagnosticPolicy',
  'localRepairBoundary',
  'forbiddenBoundary',
  'receiptPolicy',
  'counters'
]);

const REQUIRED_PRIOR_GATE_FIELDS = Object.freeze([
  'sourceTaskId',
  'gateResult',
  'blockReason',
  'approvedAttemptConsumed',
  'readShapeUnlocked',
  'readinessClaimed'
]);

const REQUIRED_DISPOSABLE_TARGET_FIELDS = Object.freeze([
  'newOrDisposableTarget',
  'targetScopeOnly',
  'containsJennPrivateInformation',
  'containsProductionSecrets',
  'containsCustomerData',
  'containsRealPrivateMemory',
  'nonTargetWorkspaceAccessAllowed'
]);

const REQUIRED_RESOLVER_TRANSPORT_FIELDS = Object.freeze([
  'resolverScope',
  'transportScope',
  'resolverMayReadTargetFiles',
  'resolverMayReadTargetEnvValues',
  'resolverMayReadTargetLogs',
  'resolverMayResolveEndpointLocatorInMemory',
  'transportMayUseResolvedEndpointLocator',
  'transportMayGenerateMinimalRequestBodyInMemory',
  'transportMaySubmitProbe',
  'transportMayConsumeResponseForShapeProjection',
  'targetReferenceName',
  'component',
  'action',
  'requestBodyShapeCategory',
  'queryBoundaryCategory',
  'maxResultCount'
]);

const REQUIRED_EXECUTION_PERMISSION_FIELDS = Object.freeze([
  'runtimeExecutionWindowAuthorized',
  'processStateInspectionAllowed',
  'listenerRecheckAllowed',
  'serviceStartEnsureAllowed',
  'serviceStopForCleanupAllowed',
  'serviceRestartAllowed',
  'memoryWriteAllowed',
  'durableWriteAllowed',
  'providerApiCallAllowed',
  'dependencyChangeAllowed',
  'publicMcpExpansionAllowed',
  'vcpToolBoxCoreModificationAllowed',
  'releaseDeployCutoverPushAllowed',
  'readinessClaimAllowed'
]);

const REQUIRED_BUDGET_FIELDS = Object.freeze([
  'maxResolverAttempts',
  'maxComponentActionRequestReadShapeAttempts',
  'maxNetworkCalls',
  'maxRuntimeCalls',
  'maxProcessStateInspections',
  'maxListenerRecheckAttempts',
  'maxServiceStartOrEnsureAttempts',
  'maxServiceStopAttempts',
  'maxServiceRestartAttempts',
  'maxLocalRepairFiles',
  'maxValidationRuns',
  'maxRetriesAfterTransientFailure',
  'maxResultCount'
]);

const REQUIRED_RAW_DIAGNOSTIC_FIELDS = Object.freeze([
  'rawDiagnosticAuthority',
  'rawEndpointLocatorInspectionAllowed',
  'rawRequestInspectionAllowed',
  'rawResponseInspectionAllowed',
  'rawErrorInspectionAllowed',
  'rawLogStdoutStderrInspectionAllowed',
  'targetEnvValueInspectionAllowed',
  'targetRawMemoryStoreAuditInspectionAllowed',
  'rawDiagnosticOutputAllowed',
  'rawDiagnosticRepoPersistenceAllowed',
  'productionSecretOutputAllowed',
  'nonTargetPrivateOutputAllowed',
  'diagnosticScope'
]);

const REQUIRED_LOCAL_REPAIR_FIELDS = Object.freeze([
  'localRepairAllowed',
  'maxFiles',
  'allowedFileClasses',
  'mustNotModifyVcpToolBoxCore',
  'mustNotModifyPublicMcpSchema',
  'mustNotModifySecretsOrEnv',
  'mustNotModifyDependencies',
  'mustNotModifyStartupWatchdog',
  'mustNotModifyMemoryStores'
]);

const REQUIRED_FORBIDDEN_BOUNDARY_FIELDS = Object.freeze([
  'productionSecrets',
  'nonTargetWorkspaceSecrets',
  'jennPrivateDataOutsideDisposableTarget',
  'broadMemoryScanExportImportMigration',
  'memoryWrite',
  'durableRuntimeAuditStoreMutation',
  'providerApiCall',
  'dependencyInstallUpdateRemoval',
  'publicMcpToolSchemaExpansion',
  'vcpToolBoxCoreCodeModification',
  'releaseDeployCutoverTagPush',
  'readinessClaim'
]);

const REQUIRED_RECEIPT_POLICY_FIELDS = Object.freeze([
  'receiptMode',
  'mayMentionRawDiagnosticOutputUsed',
  'mayPersistRawEndpointLocator',
  'mayPersistRawRequestBody',
  'mayPersistRawResponseBody',
  'mayPersistRawErrorPayload',
  'mayPersistRawLogs',
  'mayPersistSecrets',
  'mayPersistPrivateMemoryContent',
  'mustRecordReadShapeUnlocked',
  'mustRecordReadinessClaimedFalse'
]);

const ZERO_COUNTERS = Object.freeze({
  resolverAttemptsUsed: 0,
  componentActionRequestReadShapeAttemptsUsed: 0,
  networkCallsUsed: 0,
  runtimeCallsUsed: 0,
  processStateInspectionsUsed: 0,
  listenerRechecksUsed: 0,
  serviceStartEnsureAttemptsUsed: 0,
  serviceStopAttemptsUsed: 0,
  serviceRestartAttemptsUsed: 0,
  localRepairFilesChanged: 0,
  validationRunsUsed: 0,
  retriesAfterTransientFailureUsed: 0,
  endpointLocatorDisclosures: 0,
  rawRequestBodiesPersisted: 0,
  rawResponseBodiesPersisted: 0,
  rawErrorPayloadsPersisted: 0,
  rawLogsPersisted: 0,
  secretOutputs: 0,
  nonTargetPrivateOutputs: 0,
  memoryWrites: 0,
  durableWrites: 0,
  providerApiCalls: 0,
  dependencyChanges: 0,
  publicMcpExpansions: 0,
  vcpToolBoxCoreCodeModifications: 0,
  releaseDeployCutoverPushTagActions: 0,
  readinessClaims: 0
});

const ZERO_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_COUNTERS));

const ALLOWED_REQUEST_BODY_SHAPES = Object.freeze([
  'minimal_component_action_route_status_payload_category_only'
]);

const ALLOWED_QUERY_BOUNDARIES = Object.freeze([
  'neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan'
]);

const ALLOWED_RESOLVER_SCOPES = Object.freeze([
  'disposable_target_existing_repo_source_docs_scripts_checked_in_configs_and_target_runtime_files'
]);

const ALLOWED_TRANSPORT_SCOPES = Object.freeze([
  'disposable_target_existing_local_resolver_transport_path'
]);

const ALLOWED_DIAGNOSTIC_SCOPES = Object.freeze([
  'disposable_target_only_no_non_target_workspace_or_production_material'
]);

const ALLOWED_RECEIPT_MODES = Object.freeze([
  'low_disclosure_with_raw_diagnostic_usage_flag_no_raw_value_persistence'
]);

const ALLOWED_LOCAL_REPAIR_FILE_CLASSES = Object.freeze([
  'harness',
  'adapter',
  'tests',
  'docs',
  'status'
]);

const FORBIDDEN_RAW_VALUE_FIELD_NAMES = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'locatorValue',
  'rawLocatorValue',
  'requestBody',
  'requestPayload',
  'serializedRequestBody',
  'payload',
  'rawRequestBody',
  'responseBody',
  'rawResponseBody',
  'responsePayload',
  'rawErrorPayload',
  'rawLog',
  'stdout',
  'stderr',
  'envValue',
  'secret',
  'token',
  'bearerToken',
  'apiKey',
  'credential',
  'password',
  'privateKey',
  'rawMemoryText',
  'privateMemoryText',
  'memoryContent',
  'memoryId',
  'memoryIds',
  'approvalLine',
  'approvalLineText',
  'providerPayload'
]);

const ALLOWED_TOP_LEVEL_FIELDS = REQUIRED_TOP_LEVEL_FIELDS;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !(field in actual))
    .map(field => (prefix ? `${prefix}.${field}` : field));
}

function collectForbiddenRawValueFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenRawValueFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_RAW_VALUE_FIELD_NAMES.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenRawValueFields(nested, path));
  }
  return found;
}

function collectUnknownFields(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(field => !allowedFields.includes(field))
    .map(field => (prefix ? `${prefix}.${field}` : field));
}

function collectInvalidCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  const invalid = [];
  for (const field of ZERO_COUNTER_FIELDS) {
    if (counters[field] !== 0) invalid.push(field);
  }
  for (const field of Object.keys(counters)) {
    if (!ZERO_COUNTER_FIELDS.includes(field)) invalid.push(field);
  }
  return invalid;
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      targetReferenceName: null,
      component: null,
      action: null
    };
  }
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null,
    component: SOURCE_COMPONENTS.includes(input.component) ? input.component : null,
    action: READ_ACTIONS.includes(input.action) ? input.action : null
  };
}

function zeroExecutionFlags() {
  return {
    contractExecutedRuntime: false,
    runtimeCalled: false,
    networkCalled: false,
    vcpToolBoxCalled: false,
    processStateInspected: false,
    listenerRechecked: false,
    serviceStartedOrEnsured: false,
    serviceStopped: false,
    serviceRestarted: false,
    requestBodyGenerated: false,
    requestBodySubmitted: false,
    responseBodyConsumed: false,
    rawDiagnosticValuesPersisted: false,
    endpointLocatorPersisted: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    dependencyChanged: false,
    publicMcpExpanded: false,
    vcpToolBoxCoreModified: false,
    readinessClaimed: false
  };
}

function boundaryResult(overrides = {}) {
  return {
    accepted: false,
    disposableTargetAuthorityAccepted: false,
    resolverTransportAuthorityPrepared: false,
    runtimeAssistWindowPrepared: false,
    rawDiagnosticAuthorityScopedToDisposableTarget: false,
    rawDiagnosticRepoPersistenceAllowed: false,
    localRepairBoundaryPrepared: false,
    zeroWriteRuleHeld: false,
    readinessClaimed: false,
    nextExactApprovalRequiredForDisposableTarget: false,
    ...overrides
  };
}

function rejected(reasonCode, input, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    reasonCode,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    unknownFields: details.unknownFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    disposable_resolver_transport_boundary_result: boundaryResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1963_disposable_boundary_or_stop_before_runtime',
    ...zeroExecutionFlags()
  };
}

function invalidPriorGateFields(gate) {
  const invalid = [];
  if (!isPlainObject(gate)) return ['priorGateReceipt'];
  if (gate.sourceTaskId !== 'CM-1962') invalid.push('priorGateReceipt.sourceTaskId');
  if (gate.gateResult !== 'blocked_before_runtime') invalid.push('priorGateReceipt.gateResult');
  if (gate.blockReason !== 'no_verified_target_reference_only_executor_available') {
    invalid.push('priorGateReceipt.blockReason');
  }
  for (const field of ['approvedAttemptConsumed', 'readShapeUnlocked', 'readinessClaimed']) {
    if (gate[field] !== false) invalid.push(`priorGateReceipt.${field}`);
  }
  return invalid;
}

function invalidDisposableTargetFields(target) {
  const invalid = [];
  if (!isPlainObject(target)) return ['disposableTargetDeclaration'];
  if (target.newOrDisposableTarget !== true) invalid.push('disposableTargetDeclaration.newOrDisposableTarget');
  if (target.targetScopeOnly !== true) invalid.push('disposableTargetDeclaration.targetScopeOnly');
  for (const field of [
    'containsJennPrivateInformation',
    'containsProductionSecrets',
    'containsCustomerData',
    'containsRealPrivateMemory',
    'nonTargetWorkspaceAccessAllowed'
  ]) {
    if (target[field] !== false) invalid.push(`disposableTargetDeclaration.${field}`);
  }
  return invalid;
}

function invalidResolverTransportFields(boundary, input) {
  const invalid = [];
  if (!isPlainObject(boundary)) return ['resolverTransportBoundary'];
  if (!ALLOWED_RESOLVER_SCOPES.includes(boundary.resolverScope)) {
    invalid.push('resolverTransportBoundary.resolverScope');
  }
  if (!ALLOWED_TRANSPORT_SCOPES.includes(boundary.transportScope)) {
    invalid.push('resolverTransportBoundary.transportScope');
  }
  for (const field of [
    'resolverMayReadTargetFiles',
    'resolverMayReadTargetEnvValues',
    'resolverMayReadTargetLogs',
    'resolverMayResolveEndpointLocatorInMemory',
    'transportMayUseResolvedEndpointLocator',
    'transportMayGenerateMinimalRequestBodyInMemory',
    'transportMaySubmitProbe',
    'transportMayConsumeResponseForShapeProjection'
  ]) {
    if (boundary[field] !== true) invalid.push(`resolverTransportBoundary.${field}`);
  }
  if (boundary.targetReferenceName !== input.targetReferenceName) {
    invalid.push('resolverTransportBoundary.targetReferenceName');
  }
  if (boundary.component !== input.component) invalid.push('resolverTransportBoundary.component');
  if (boundary.action !== input.action) invalid.push('resolverTransportBoundary.action');
  if (!ALLOWED_REQUEST_BODY_SHAPES.includes(boundary.requestBodyShapeCategory)) {
    invalid.push('resolverTransportBoundary.requestBodyShapeCategory');
  }
  if (!ALLOWED_QUERY_BOUNDARIES.includes(boundary.queryBoundaryCategory)) {
    invalid.push('resolverTransportBoundary.queryBoundaryCategory');
  }
  if (boundary.maxResultCount !== 1) invalid.push('resolverTransportBoundary.maxResultCount');
  return invalid;
}

function invalidExecutionPermissionFields(permissions) {
  const invalid = [];
  if (!isPlainObject(permissions)) return ['executionPermissions'];
  for (const field of [
    'runtimeExecutionWindowAuthorized',
    'processStateInspectionAllowed',
    'listenerRecheckAllowed',
    'serviceStartEnsureAllowed',
    'serviceStopForCleanupAllowed'
  ]) {
    if (permissions[field] !== true) invalid.push(`executionPermissions.${field}`);
  }
  for (const field of [
    'serviceRestartAllowed',
    'memoryWriteAllowed',
    'durableWriteAllowed',
    'providerApiCallAllowed',
    'dependencyChangeAllowed',
    'publicMcpExpansionAllowed',
    'vcpToolBoxCoreModificationAllowed',
    'releaseDeployCutoverPushAllowed',
    'readinessClaimAllowed'
  ]) {
    if (permissions[field] !== false) invalid.push(`executionPermissions.${field}`);
  }
  return invalid;
}

function invalidBudgetFields(budgets) {
  const expected = {
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
  };
  if (!isPlainObject(budgets)) return ['executionBudgets'];
  return Object.entries(expected)
    .filter(([field, value]) => budgets[field] !== value)
    .map(([field]) => `executionBudgets.${field}`);
}

function invalidRawDiagnosticFields(policy) {
  const invalid = [];
  if (!isPlainObject(policy)) return ['rawDiagnosticPolicy'];
  for (const field of [
    'rawDiagnosticAuthority',
    'rawEndpointLocatorInspectionAllowed',
    'rawRequestInspectionAllowed',
    'rawResponseInspectionAllowed',
    'rawErrorInspectionAllowed',
    'rawLogStdoutStderrInspectionAllowed',
    'targetEnvValueInspectionAllowed',
    'targetRawMemoryStoreAuditInspectionAllowed',
    'rawDiagnosticOutputAllowed'
  ]) {
    if (policy[field] !== true) invalid.push(`rawDiagnosticPolicy.${field}`);
  }
  for (const field of [
    'rawDiagnosticRepoPersistenceAllowed',
    'productionSecretOutputAllowed',
    'nonTargetPrivateOutputAllowed'
  ]) {
    if (policy[field] !== false) invalid.push(`rawDiagnosticPolicy.${field}`);
  }
  if (!ALLOWED_DIAGNOSTIC_SCOPES.includes(policy.diagnosticScope)) {
    invalid.push('rawDiagnosticPolicy.diagnosticScope');
  }
  return invalid;
}

function invalidLocalRepairFields(repair) {
  const invalid = [];
  if (!isPlainObject(repair)) return ['localRepairBoundary'];
  if (repair.localRepairAllowed !== true) invalid.push('localRepairBoundary.localRepairAllowed');
  if (repair.maxFiles !== 3) invalid.push('localRepairBoundary.maxFiles');
  if (!Array.isArray(repair.allowedFileClasses)) {
    invalid.push('localRepairBoundary.allowedFileClasses');
  } else {
    for (const fileClass of repair.allowedFileClasses) {
      if (!ALLOWED_LOCAL_REPAIR_FILE_CLASSES.includes(fileClass)) {
        invalid.push('localRepairBoundary.allowedFileClasses');
        break;
      }
    }
  }
  for (const field of [
    'mustNotModifyVcpToolBoxCore',
    'mustNotModifyPublicMcpSchema',
    'mustNotModifySecretsOrEnv',
    'mustNotModifyDependencies',
    'mustNotModifyStartupWatchdog',
    'mustNotModifyMemoryStores'
  ]) {
    if (repair[field] !== true) invalid.push(`localRepairBoundary.${field}`);
  }
  return invalid;
}

function invalidForbiddenBoundaryFields(boundary) {
  if (!isPlainObject(boundary)) return ['forbiddenBoundary'];
  return REQUIRED_FORBIDDEN_BOUNDARY_FIELDS
    .filter(field => boundary[field] !== false)
    .map(field => `forbiddenBoundary.${field}`);
}

function invalidReceiptPolicyFields(policy) {
  const invalid = [];
  if (!isPlainObject(policy)) return ['receiptPolicy'];
  if (!ALLOWED_RECEIPT_MODES.includes(policy.receiptMode)) invalid.push('receiptPolicy.receiptMode');
  if (policy.mayMentionRawDiagnosticOutputUsed !== true) {
    invalid.push('receiptPolicy.mayMentionRawDiagnosticOutputUsed');
  }
  for (const field of [
    'mayPersistRawEndpointLocator',
    'mayPersistRawRequestBody',
    'mayPersistRawResponseBody',
    'mayPersistRawErrorPayload',
    'mayPersistRawLogs',
    'mayPersistSecrets',
    'mayPersistPrivateMemoryContent'
  ]) {
    if (policy[field] !== false) invalid.push(`receiptPolicy.${field}`);
  }
  for (const field of ['mustRecordReadShapeUnlocked', 'mustRecordReadinessClaimedFalse']) {
    if (policy[field] !== true) invalid.push(`receiptPolicy.${field}`);
  }
  return invalid;
}

function collectInvalidFields(input) {
  const invalid = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!isSafeReferenceName(input.taskId)) invalid.push('taskId');
  if (!isSafeReferenceName(input.targetReferenceName)) invalid.push('targetReferenceName');
  if (!SOURCE_COMPONENTS.includes(input.component)) invalid.push('component');
  if (!READ_ACTIONS.includes(input.action)) invalid.push('action');
  invalid.push(...invalidPriorGateFields(input.priorGateReceipt));
  invalid.push(...invalidDisposableTargetFields(input.disposableTargetDeclaration));
  invalid.push(...invalidResolverTransportFields(input.resolverTransportBoundary, input));
  invalid.push(...invalidExecutionPermissionFields(input.executionPermissions));
  invalid.push(...invalidBudgetFields(input.executionBudgets));
  invalid.push(...invalidRawDiagnosticFields(input.rawDiagnosticPolicy));
  invalid.push(...invalidLocalRepairFields(input.localRepairBoundary));
  invalid.push(...invalidForbiddenBoundaryFields(input.forbiddenBoundary));
  invalid.push(...invalidReceiptPolicyFields(input.receiptPolicy));
  return invalid;
}

function collectUnknownInputFields(input) {
  return [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input.priorGateReceipt, REQUIRED_PRIOR_GATE_FIELDS, 'priorGateReceipt'),
    ...collectUnknownFields(input.disposableTargetDeclaration, REQUIRED_DISPOSABLE_TARGET_FIELDS, 'disposableTargetDeclaration'),
    ...collectUnknownFields(input.resolverTransportBoundary, REQUIRED_RESOLVER_TRANSPORT_FIELDS, 'resolverTransportBoundary'),
    ...collectUnknownFields(input.executionPermissions, REQUIRED_EXECUTION_PERMISSION_FIELDS, 'executionPermissions'),
    ...collectUnknownFields(input.executionBudgets, REQUIRED_BUDGET_FIELDS, 'executionBudgets'),
    ...collectUnknownFields(input.rawDiagnosticPolicy, REQUIRED_RAW_DIAGNOSTIC_FIELDS, 'rawDiagnosticPolicy'),
    ...collectUnknownFields(input.localRepairBoundary, REQUIRED_LOCAL_REPAIR_FIELDS, 'localRepairBoundary'),
    ...collectUnknownFields(input.forbiddenBoundary, REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, 'forbiddenBoundary'),
    ...collectUnknownFields(input.receiptPolicy, REQUIRED_RECEIPT_POLICY_FIELDS, 'receiptPolicy')
  ];
}

function buildVcpNativeDisposableTargetResolverTransportBoundaryContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('disposable_resolver_transport_boundary_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PRIOR_GATE_FIELDS, input.priorGateReceipt, 'priorGateReceipt'),
    ...missingFields(REQUIRED_DISPOSABLE_TARGET_FIELDS, input.disposableTargetDeclaration, 'disposableTargetDeclaration'),
    ...missingFields(REQUIRED_RESOLVER_TRANSPORT_FIELDS, input.resolverTransportBoundary, 'resolverTransportBoundary'),
    ...missingFields(REQUIRED_EXECUTION_PERMISSION_FIELDS, input.executionPermissions, 'executionPermissions'),
    ...missingFields(REQUIRED_BUDGET_FIELDS, input.executionBudgets, 'executionBudgets'),
    ...missingFields(REQUIRED_RAW_DIAGNOSTIC_FIELDS, input.rawDiagnosticPolicy, 'rawDiagnosticPolicy'),
    ...missingFields(REQUIRED_LOCAL_REPAIR_FIELDS, input.localRepairBoundary, 'localRepairBoundary'),
    ...missingFields(REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, input.forbiddenBoundary, 'forbiddenBoundary'),
    ...missingFields(REQUIRED_RECEIPT_POLICY_FIELDS, input.receiptPolicy, 'receiptPolicy')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_disposable_resolver_transport_boundary_fields', input, {
      missingFields: missing
    });
  }

  const forbiddenFields = collectForbiddenRawValueFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_values_must_not_be_committed_to_boundary_contract', input, {
      forbiddenFields
    });
  }

  const unknownFields = collectUnknownInputFields(input);
  if (unknownFields.length > 0) {
    return rejected('unknown_disposable_resolver_transport_boundary_fields_not_allowed', input, {
      unknownFields
    });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_disposable_resolver_transport_counters', input, {
      forbiddenCounters
    });
  }

  const invalidFields = collectInvalidFields(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_disposable_resolver_transport_boundary_contract', input, {
      invalidFields
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    targetReferenceName: input.targetReferenceName,
    component: input.component,
    action: input.action,
    lowDisclosureProjection: lowDisclosureProjection(input),
    disposable_resolver_transport_boundary_result: boundaryResult({
      accepted: true,
      disposableTargetAuthorityAccepted: true,
      resolverTransportAuthorityPrepared: true,
      runtimeAssistWindowPrepared: true,
      rawDiagnosticAuthorityScopedToDisposableTarget: true,
      rawDiagnosticRepoPersistenceAllowed: false,
      localRepairBoundaryPrepared: true,
      zeroWriteRuleHeld: true,
      readinessClaimed: false,
      nextExactApprovalRequiredForDisposableTarget: false
    }),
    executionWindow: {
      resolverScope: input.resolverTransportBoundary.resolverScope,
      transportScope: input.resolverTransportBoundary.transportScope,
      rawDiagnosticScope: input.rawDiagnosticPolicy.diagnosticScope,
      budgets: { ...input.executionBudgets },
      maxResultCount: 1
    },
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1964_execute_disposable_target_resolver_transport_read_shape_probe_or_prepare_executor',
    ...zeroExecutionFlags()
  };
}

module.exports = {
  ALLOWED_DIAGNOSTIC_SCOPES,
  ALLOWED_LOCAL_REPAIR_FILE_CLASSES,
  ALLOWED_QUERY_BOUNDARIES,
  ALLOWED_RECEIPT_MODES,
  ALLOWED_REQUEST_BODY_SHAPES,
  ALLOWED_RESOLVER_SCOPES,
  ALLOWED_TRANSPORT_SCOPES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_RAW_VALUE_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeDisposableTargetResolverTransportBoundaryContract
};
