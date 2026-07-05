'use strict';

const {
  ALLOWED_QUERY_BOUNDARIES,
  ALLOWED_REQUEST_BODY_SHAPES,
  FORBIDDEN_RAW_VALUE_FIELD_NAMES
} = require('./VcpNativeDisposableTargetResolverTransportBoundaryContract');
const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeDisposableTargetBindingFixturePreparationContract';
const CONTRACT_MODE = 'disposable_target_binding_fixture_preparation_no_live_no_raw_values';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'component',
  'action',
  'priorAbortReceipt',
  'fixtureDeclaration',
  'bindingReadiness',
  'futureExecutionBoundary',
  'forbiddenBoundary',
  'receiptPolicy',
  'counters'
]);

const REQUIRED_PRIOR_ABORT_FIELDS = Object.freeze([
  'sourceTaskId',
  'abortStatusClass',
  'routeStatusCategory',
  'componentActionRequestReadShapeProbeCategory',
  'targetVerifiedDisposable',
  'readShapeUnlocked',
  'requestBodyGenerated',
  'runtimeCalled',
  'networkCalled',
  'responseConsumed',
  'readinessClaimed'
]);

const REQUIRED_FIXTURE_DECLARATION_FIELDS = Object.freeze([
  'fixtureKind',
  'targetCategory',
  'newOrDisposableTarget',
  'targetScopeOnly',
  'syntheticOrEmptyMemoryOnly',
  'containsJennPrivateInformation',
  'containsProductionSecrets',
  'containsCustomerData',
  'containsRealPrivateMemory',
  'containsPersistentRuntimeArtifacts',
  'nonTargetWorkspaceAccessAllowed',
  'existingOperatorTargetReuseAllowed'
]);

const REQUIRED_BINDING_READINESS_FIELDS = Object.freeze([
  'resolverCategory',
  'transportCategory',
  'injectedTransportRequired',
  'endpointLocatorValuesBound',
  'endpointLocatorValuesPersisted',
  'targetSelfDeclarationPresent',
  'targetEmptinessProofCategory',
  'targetPrivateDataAbsenceProofCategory',
  'targetPersistenceIsolationCategory',
  'componentActionAvailableCategory',
  'rawDiagnosticValuePersistence'
]);

const REQUIRED_FUTURE_EXECUTION_FIELDS = Object.freeze([
  'exactApprovalRequired',
  'cm1963BoundaryRequired',
  'cm1964ExecutorRequired',
  'requestBodyShapeCategory',
  'queryBoundaryCategory',
  'maxResultCount',
  'lowDisclosureReceiptOnly',
  'concreteRequestBodyOutputAllowed',
  'responseFieldNameDisclosureAllowed',
  'retryWithoutApprovalAllowed'
]);

const REQUIRED_FORBIDDEN_BOUNDARY_FIELDS = Object.freeze([
  'liveRuntimeCall',
  'networkCall',
  'processStateInspection',
  'listenerRecheck',
  'serviceStartStopRestart',
  'endpointLocatorDisclosure',
  'concreteRequestBodyOutput',
  'rawResponseErrorLogPersistence',
  'secretReadOutputPersistence',
  'privateMemoryAccess',
  'memoryWrite',
  'durableWrite',
  'providerApiCall',
  'dependencyChange',
  'publicMcpExpansion',
  'vcpToolBoxCoreModification',
  'pushTagReleaseDeployCutover',
  'readinessClaim'
]);

const REQUIRED_RECEIPT_POLICY_FIELDS = Object.freeze([
  'receiptMode',
  'mayPersistRawValues',
  'mayPersistEndpointLocator',
  'mayPersistRequestBody',
  'mayPersistResponseBody',
  'mayPersistRawErrorPayload',
  'mayPersistRawLogs',
  'mayPersistSecrets',
  'mayPersistPrivateMemoryContent',
  'mustRecordReadShapeUnlockedFalse',
  'mustRecordReadinessClaimedFalse'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  networkCalls: 0,
  processStateInspections: 0,
  listenerRechecks: 0,
  serviceStartStopRestartAttempts: 0,
  requestBodiesGenerated: 0,
  requestBodiesPersisted: 0,
  responseBodiesConsumed: 0,
  rawValuesPersisted: 0,
  endpointLocatorDisclosures: 0,
  secretReads: 0,
  rawPrivateMemoryReads: 0,
  memoryWrites: 0,
  durableWrites: 0,
  providerApiCalls: 0,
  dependencyChanges: 0,
  publicMcpExpansions: 0,
  vcpToolBoxCoreModifications: 0,
  releaseDeployCutoverPushTagActions: 0,
  readinessClaims: 0
});

const ZERO_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_COUNTERS));

const ALLOWED_FIXTURE_KINDS = Object.freeze([
  'exact_disposable_target_fixture_preparation'
]);

const ALLOWED_TARGET_CATEGORIES = Object.freeze([
  'synthetic_disposable_empty_target'
]);

const ALLOWED_RESOLVER_CATEGORIES = Object.freeze([
  'injected_disposable_fixture_resolver',
  'target_reference_to_disposable_fixture_invoker'
]);

const ALLOWED_TRANSPORT_CATEGORIES = Object.freeze([
  'injected_disposable_fixture_transport'
]);

const ALLOWED_TARGET_EMPTINESS_PROOF_CATEGORIES = Object.freeze([
  'empty_or_synthetic_target_category_only'
]);

const ALLOWED_PRIVATE_DATA_ABSENCE_PROOF_CATEGORIES = Object.freeze([
  'declared_no_private_prod_customer_real_memory'
]);

const ALLOWED_PERSISTENCE_ISOLATION_CATEGORIES = Object.freeze([
  'disposable_no_persistent_runtime_artifacts'
]);

const ALLOWED_COMPONENT_ACTION_CATEGORIES = Object.freeze([
  'category_declared_not_live_proven'
]);

const ALLOWED_RECEIPT_MODES = Object.freeze([
  'low_disclosure_disposable_target_binding_fixture_preparation'
]);

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

function collectUnknownFields(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(field => !allowedFields.includes(field))
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
    serviceStartedStoppedOrRestarted: false,
    requestBodyGenerated: false,
    requestBodyPersisted: false,
    responseBodyConsumed: false,
    rawValuesPersisted: false,
    endpointLocatorDisclosed: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    dependencyChanged: false,
    publicMcpExpanded: false,
    vcpToolBoxCoreModified: false,
    pushedReleasedDeployedOrCutover: false,
    readShapeUnlocked: false,
    readinessClaimed: false
  };
}

function preparationResult(overrides = {}) {
  return {
    accepted: false,
    priorAbortAccepted: false,
    disposableFixtureDeclarationAccepted: false,
    existingOperatorTargetReuseAllowed: false,
    injectedFixtureTransportRequired: false,
    lowDisclosureBindingPrepared: false,
    futureExactApprovalRequired: false,
    readShapeUnlocked: false,
    readinessClaimed: false,
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
    invalidFields: details.invalidFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    disposable_target_binding_fixture_preparation_result: preparationResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1978_disposable_target_fixture_preparation_or_stop_before_runtime',
    ...zeroExecutionFlags()
  };
}

function invalidPriorAbortFields(priorAbortReceipt) {
  const invalid = [];
  if (!isPlainObject(priorAbortReceipt)) return ['priorAbortReceipt'];
  const expected = {
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
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (priorAbortReceipt[field] !== expectedValue) invalid.push(`priorAbortReceipt.${field}`);
  }
  return invalid;
}

function invalidFixtureDeclarationFields(fixtureDeclaration) {
  const invalid = [];
  if (!isPlainObject(fixtureDeclaration)) return ['fixtureDeclaration'];
  if (!ALLOWED_FIXTURE_KINDS.includes(fixtureDeclaration.fixtureKind)) {
    invalid.push('fixtureDeclaration.fixtureKind');
  }
  if (!ALLOWED_TARGET_CATEGORIES.includes(fixtureDeclaration.targetCategory)) {
    invalid.push('fixtureDeclaration.targetCategory');
  }
  for (const field of ['newOrDisposableTarget', 'targetScopeOnly', 'syntheticOrEmptyMemoryOnly']) {
    if (fixtureDeclaration[field] !== true) invalid.push(`fixtureDeclaration.${field}`);
  }
  for (const field of [
    'containsJennPrivateInformation',
    'containsProductionSecrets',
    'containsCustomerData',
    'containsRealPrivateMemory',
    'containsPersistentRuntimeArtifacts',
    'nonTargetWorkspaceAccessAllowed',
    'existingOperatorTargetReuseAllowed'
  ]) {
    if (fixtureDeclaration[field] !== false) invalid.push(`fixtureDeclaration.${field}`);
  }
  return invalid;
}

function invalidBindingReadinessFields(bindingReadiness) {
  const invalid = [];
  if (!isPlainObject(bindingReadiness)) return ['bindingReadiness'];
  if (!ALLOWED_RESOLVER_CATEGORIES.includes(bindingReadiness.resolverCategory)) {
    invalid.push('bindingReadiness.resolverCategory');
  }
  if (!ALLOWED_TRANSPORT_CATEGORIES.includes(bindingReadiness.transportCategory)) {
    invalid.push('bindingReadiness.transportCategory');
  }
  for (const field of ['injectedTransportRequired', 'targetSelfDeclarationPresent']) {
    if (bindingReadiness[field] !== true) invalid.push(`bindingReadiness.${field}`);
  }
  for (const field of [
    'endpointLocatorValuesBound',
    'endpointLocatorValuesPersisted',
    'rawDiagnosticValuePersistence'
  ]) {
    if (bindingReadiness[field] !== false) invalid.push(`bindingReadiness.${field}`);
  }
  if (!ALLOWED_TARGET_EMPTINESS_PROOF_CATEGORIES.includes(bindingReadiness.targetEmptinessProofCategory)) {
    invalid.push('bindingReadiness.targetEmptinessProofCategory');
  }
  if (!ALLOWED_PRIVATE_DATA_ABSENCE_PROOF_CATEGORIES.includes(bindingReadiness.targetPrivateDataAbsenceProofCategory)) {
    invalid.push('bindingReadiness.targetPrivateDataAbsenceProofCategory');
  }
  if (!ALLOWED_PERSISTENCE_ISOLATION_CATEGORIES.includes(bindingReadiness.targetPersistenceIsolationCategory)) {
    invalid.push('bindingReadiness.targetPersistenceIsolationCategory');
  }
  if (!ALLOWED_COMPONENT_ACTION_CATEGORIES.includes(bindingReadiness.componentActionAvailableCategory)) {
    invalid.push('bindingReadiness.componentActionAvailableCategory');
  }
  return invalid;
}

function invalidFutureExecutionBoundaryFields(boundary) {
  const invalid = [];
  if (!isPlainObject(boundary)) return ['futureExecutionBoundary'];
  for (const field of ['exactApprovalRequired', 'cm1963BoundaryRequired', 'cm1964ExecutorRequired', 'lowDisclosureReceiptOnly']) {
    if (boundary[field] !== true) invalid.push(`futureExecutionBoundary.${field}`);
  }
  for (const field of [
    'concreteRequestBodyOutputAllowed',
    'responseFieldNameDisclosureAllowed',
    'retryWithoutApprovalAllowed'
  ]) {
    if (boundary[field] !== false) invalid.push(`futureExecutionBoundary.${field}`);
  }
  if (!ALLOWED_REQUEST_BODY_SHAPES.includes(boundary.requestBodyShapeCategory)) {
    invalid.push('futureExecutionBoundary.requestBodyShapeCategory');
  }
  if (!ALLOWED_QUERY_BOUNDARIES.includes(boundary.queryBoundaryCategory)) {
    invalid.push('futureExecutionBoundary.queryBoundaryCategory');
  }
  if (boundary.maxResultCount !== 1) invalid.push('futureExecutionBoundary.maxResultCount');
  return invalid;
}

function invalidForbiddenBoundaryFields(forbiddenBoundary) {
  const invalid = [];
  if (!isPlainObject(forbiddenBoundary)) return ['forbiddenBoundary'];
  for (const field of REQUIRED_FORBIDDEN_BOUNDARY_FIELDS) {
    if (forbiddenBoundary[field] !== false) invalid.push(`forbiddenBoundary.${field}`);
  }
  return invalid;
}

function invalidReceiptPolicyFields(receiptPolicy) {
  const invalid = [];
  if (!isPlainObject(receiptPolicy)) return ['receiptPolicy'];
  if (!ALLOWED_RECEIPT_MODES.includes(receiptPolicy.receiptMode)) {
    invalid.push('receiptPolicy.receiptMode');
  }
  for (const field of ['mustRecordReadShapeUnlockedFalse', 'mustRecordReadinessClaimedFalse']) {
    if (receiptPolicy[field] !== true) invalid.push(`receiptPolicy.${field}`);
  }
  for (const field of [
    'mayPersistRawValues',
    'mayPersistEndpointLocator',
    'mayPersistRequestBody',
    'mayPersistResponseBody',
    'mayPersistRawErrorPayload',
    'mayPersistRawLogs',
    'mayPersistSecrets',
    'mayPersistPrivateMemoryContent'
  ]) {
    if (receiptPolicy[field] !== false) invalid.push(`receiptPolicy.${field}`);
  }
  return invalid;
}

function collectMissingFields(input) {
  return [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PRIOR_ABORT_FIELDS, input?.priorAbortReceipt, 'priorAbortReceipt'),
    ...missingFields(REQUIRED_FIXTURE_DECLARATION_FIELDS, input?.fixtureDeclaration, 'fixtureDeclaration'),
    ...missingFields(REQUIRED_BINDING_READINESS_FIELDS, input?.bindingReadiness, 'bindingReadiness'),
    ...missingFields(REQUIRED_FUTURE_EXECUTION_FIELDS, input?.futureExecutionBoundary, 'futureExecutionBoundary'),
    ...missingFields(REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, input?.forbiddenBoundary, 'forbiddenBoundary'),
    ...missingFields(REQUIRED_RECEIPT_POLICY_FIELDS, input?.receiptPolicy, 'receiptPolicy')
  ];
}

function collectUnknownInputFields(input) {
  return [
    ...collectUnknownFields(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input?.priorAbortReceipt, REQUIRED_PRIOR_ABORT_FIELDS, 'priorAbortReceipt'),
    ...collectUnknownFields(input?.fixtureDeclaration, REQUIRED_FIXTURE_DECLARATION_FIELDS, 'fixtureDeclaration'),
    ...collectUnknownFields(input?.bindingReadiness, REQUIRED_BINDING_READINESS_FIELDS, 'bindingReadiness'),
    ...collectUnknownFields(input?.futureExecutionBoundary, REQUIRED_FUTURE_EXECUTION_FIELDS, 'futureExecutionBoundary'),
    ...collectUnknownFields(input?.forbiddenBoundary, REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, 'forbiddenBoundary'),
    ...collectUnknownFields(input?.receiptPolicy, REQUIRED_RECEIPT_POLICY_FIELDS, 'receiptPolicy')
  ];
}

function collectInvalidFields(input) {
  const invalid = [];
  if (!isPlainObject(input)) return ['input'];
  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (input.taskId !== 'CM-1978') invalid.push('taskId');
  if (input.targetReferenceName !== 'operator-vcp-toolbox-service-ref') invalid.push('targetReferenceName');
  if (!SOURCE_COMPONENTS.includes(input.component) || input.component !== 'KnowledgeBaseManager') {
    invalid.push('component');
  }
  if (!READ_ACTIONS.includes(input.action) || input.action !== 'knowledge_base.search') {
    invalid.push('action');
  }
  invalid.push(...invalidPriorAbortFields(input.priorAbortReceipt));
  invalid.push(...invalidFixtureDeclarationFields(input.fixtureDeclaration));
  invalid.push(...invalidBindingReadinessFields(input.bindingReadiness));
  invalid.push(...invalidFutureExecutionBoundaryFields(input.futureExecutionBoundary));
  invalid.push(...invalidForbiddenBoundaryFields(input.forbiddenBoundary));
  invalid.push(...invalidReceiptPolicyFields(input.receiptPolicy));
  return invalid;
}

function buildVcpNativeDisposableTargetBindingFixturePreparationContract(input = {}) {
  const missingFields = collectMissingFields(input);
  if (missingFields.length > 0) {
    return rejected('missing_disposable_target_binding_fixture_preparation_fields', input, {
      missingFields
    });
  }

  const forbiddenFields = collectForbiddenRawValueFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_values_must_not_enter_disposable_target_fixture_preparation_contract', input, {
      forbiddenFields
    });
  }

  const unknownFields = collectUnknownInputFields(input);
  if (unknownFields.length > 0) {
    return rejected('unknown_disposable_target_binding_fixture_preparation_fields_not_allowed', input, {
      unknownFields
    });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_disposable_target_binding_fixture_preparation_counters', input, {
      forbiddenCounters
    });
  }

  const invalidFields = collectInvalidFields(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_disposable_target_binding_fixture_preparation_contract', input, {
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
    disposable_target_binding_fixture_preparation_result: preparationResult({
      accepted: true,
      priorAbortAccepted: true,
      disposableFixtureDeclarationAccepted: true,
      existingOperatorTargetReuseAllowed: false,
      injectedFixtureTransportRequired: true,
      lowDisclosureBindingPrepared: true,
      futureExactApprovalRequired: true,
      readShapeUnlocked: false,
      readinessClaimed: false
    }),
    fixtureBindingPlan: {
      targetCategory: input.fixtureDeclaration.targetCategory,
      resolverCategory: input.bindingReadiness.resolverCategory,
      transportCategory: input.bindingReadiness.transportCategory,
      requestBodyShapeCategory: input.futureExecutionBoundary.requestBodyShapeCategory,
      queryBoundaryCategory: input.futureExecutionBoundary.queryBoundaryCategory,
      maxResultCount: input.futureExecutionBoundary.maxResultCount,
      endpointLocatorDisclosureAllowed: false,
      rawValuePersistenceAllowed: false,
      existingOperatorTargetReuseAllowed: false,
      exactApprovalRequiredBeforeLive: true
    },
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1979_exact_disposable_target_fixture_backed_live_runtime_boundary_packet_or_exact_approval_intake',
    ...zeroExecutionFlags()
  };
}

module.exports = {
  ALLOWED_COMPONENT_ACTION_CATEGORIES,
  ALLOWED_FIXTURE_KINDS,
  ALLOWED_PERSISTENCE_ISOLATION_CATEGORIES,
  ALLOWED_PRIVATE_DATA_ABSENCE_PROOF_CATEGORIES,
  ALLOWED_RESOLVER_CATEGORIES,
  ALLOWED_TARGET_CATEGORIES,
  ALLOWED_TARGET_EMPTINESS_PROOF_CATEGORIES,
  ALLOWED_TRANSPORT_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeDisposableTargetBindingFixturePreparationContract
};
