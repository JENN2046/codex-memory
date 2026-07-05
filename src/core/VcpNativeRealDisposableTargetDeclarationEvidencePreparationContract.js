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

const CONTRACT_NAME = 'VcpNativeRealDisposableTargetDeclarationEvidencePreparationContract';
const CONTRACT_MODE = 'real_disposable_target_declaration_evidence_preparation_no_live_no_raw_values';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'component',
  'action',
  'priorAbortReceipt',
  'targetDeclaration',
  'evidencePreparation',
  'futureExecutionBoundary',
  'forbiddenBoundary',
  'receiptPolicy',
  'counters'
]);

const REQUIRED_PRIOR_ABORT_FIELDS = Object.freeze([
  'sourceTaskId',
  'abortStatusClass',
  'routeStatusCategory',
  'realDisposableTargetBindingCategory',
  'targetVerifiedRealNewDisposable',
  'existingOperatorTargetReuseAllowed',
  'requestBodyGenerated',
  'runtimeCalled',
  'networkCalled',
  'responseConsumed',
  'readShapeUnlocked',
  'readinessClaimed'
]);

const REQUIRED_TARGET_DECLARATION_FIELDS = Object.freeze([
  'declarationKind',
  'targetClass',
  'targetLifecycleCategory',
  'realDisposableTargetRequired',
  'newOrDisposableTarget',
  'targetScopeOnly',
  'existingOperatorTargetReuseAllowed',
  'nonTargetWorkspaceAccessAllowed',
  'containsJennPrivateInformation',
  'containsProductionSecrets',
  'containsCustomerData',
  'containsRealPrivateMemory',
  'containsPersistentRuntimeArtifacts',
  'mayBeDiscardedAfterProbe'
]);

const REQUIRED_EVIDENCE_PREPARATION_FIELDS = Object.freeze([
  'declarationEvidenceCategory',
  'bindingEvidenceCategory',
  'targetEvidencePersistenceCategory',
  'rawEndpointLocatorValuesBound',
  'rawEndpointLocatorValuesPersisted',
  'targetBindingProven',
  'requestBodyGenerationAllowed',
  'runtimeProbeAllowed',
  'exactApprovalRequiredBeforeProbe',
  'futureTargetMaterialMustBeSeparatelyEvidenced',
  'existingOperatorReferenceIsSufficient'
]);

const REQUIRED_FUTURE_EXECUTION_FIELDS = Object.freeze([
  'exactApprovalRequired',
  'cm1959BoundaryRequired',
  'cm1963BoundaryRequired',
  'cm1964ExecutorRequired',
  'cm1978FixturePreparationRequired',
  'cm1986AbortReceiptRequired',
  'requestBodyShapeCategory',
  'queryBoundaryCategory',
  'maxResultCount',
  'lowDisclosureReceiptOnly',
  'concreteRequestBodyOutputAllowed',
  'responseFieldNameDisclosureAllowed',
  'retryWithoutNewEvidenceAllowed'
]);

const REQUIRED_FORBIDDEN_BOUNDARY_FIELDS = Object.freeze([
  'existingOperatorTargetReuse',
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
  'mustRecordTargetBindingProvenFalse',
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
  memoryReads: 0,
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

const ALLOWED_DECLARATION_KINDS = Object.freeze([
  'real_disposable_target_declaration_preparation'
]);

const ALLOWED_TARGET_CLASSES = Object.freeze([
  'real_disposable_target'
]);

const ALLOWED_TARGET_LIFECYCLE_CATEGORIES = Object.freeze([
  'new_or_disposable_target_scoped'
]);

const ALLOWED_DECLARATION_EVIDENCE_CATEGORIES = Object.freeze([
  'operator_declared_real_disposable_target_no_raw_values'
]);

const ALLOWED_BINDING_EVIDENCE_CATEGORIES = Object.freeze([
  'declaration_prepared_binding_not_proven'
]);

const ALLOWED_TARGET_EVIDENCE_PERSISTENCE_CATEGORIES = Object.freeze([
  'low_disclosure_governance_only_no_raw_values'
]);

const ALLOWED_RECEIPT_MODES = Object.freeze([
  'low_disclosure_real_disposable_target_declaration_preparation'
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
    realTargetBindingProven: false,
    readShapeUnlocked: false,
    readinessClaimed: false
  };
}

function preparationResult(overrides = {}) {
  return {
    accepted: false,
    priorAbortAccepted: false,
    realDisposableTargetDeclarationAccepted: false,
    existingOperatorTargetReuseAllowed: false,
    targetBindingProven: false,
    targetMaterialRequiresFutureEvidence: true,
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
    real_disposable_target_declaration_evidence_preparation_result: preparationResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1987_real_disposable_target_declaration_evidence_or_stop_before_runtime',
    ...zeroExecutionFlags()
  };
}

function invalidPriorAbortFields(priorAbortReceipt) {
  const invalid = [];
  if (!isPlainObject(priorAbortReceipt)) return ['priorAbortReceipt'];
  const expected = {
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
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (priorAbortReceipt[field] !== expectedValue) invalid.push(`priorAbortReceipt.${field}`);
  }
  return invalid;
}

function invalidTargetDeclarationFields(targetDeclaration) {
  const invalid = [];
  if (!isPlainObject(targetDeclaration)) return ['targetDeclaration'];
  if (!ALLOWED_DECLARATION_KINDS.includes(targetDeclaration.declarationKind)) {
    invalid.push('targetDeclaration.declarationKind');
  }
  if (!ALLOWED_TARGET_CLASSES.includes(targetDeclaration.targetClass)) {
    invalid.push('targetDeclaration.targetClass');
  }
  if (!ALLOWED_TARGET_LIFECYCLE_CATEGORIES.includes(targetDeclaration.targetLifecycleCategory)) {
    invalid.push('targetDeclaration.targetLifecycleCategory');
  }
  for (const field of [
    'realDisposableTargetRequired',
    'newOrDisposableTarget',
    'targetScopeOnly',
    'mayBeDiscardedAfterProbe'
  ]) {
    if (targetDeclaration[field] !== true) invalid.push(`targetDeclaration.${field}`);
  }
  for (const field of [
    'existingOperatorTargetReuseAllowed',
    'nonTargetWorkspaceAccessAllowed',
    'containsJennPrivateInformation',
    'containsProductionSecrets',
    'containsCustomerData',
    'containsRealPrivateMemory',
    'containsPersistentRuntimeArtifacts'
  ]) {
    if (targetDeclaration[field] !== false) invalid.push(`targetDeclaration.${field}`);
  }
  return invalid;
}

function invalidEvidencePreparationFields(evidencePreparation) {
  const invalid = [];
  if (!isPlainObject(evidencePreparation)) return ['evidencePreparation'];
  if (!ALLOWED_DECLARATION_EVIDENCE_CATEGORIES.includes(evidencePreparation.declarationEvidenceCategory)) {
    invalid.push('evidencePreparation.declarationEvidenceCategory');
  }
  if (!ALLOWED_BINDING_EVIDENCE_CATEGORIES.includes(evidencePreparation.bindingEvidenceCategory)) {
    invalid.push('evidencePreparation.bindingEvidenceCategory');
  }
  if (!ALLOWED_TARGET_EVIDENCE_PERSISTENCE_CATEGORIES.includes(evidencePreparation.targetEvidencePersistenceCategory)) {
    invalid.push('evidencePreparation.targetEvidencePersistenceCategory');
  }
  for (const field of ['exactApprovalRequiredBeforeProbe', 'futureTargetMaterialMustBeSeparatelyEvidenced']) {
    if (evidencePreparation[field] !== true) invalid.push(`evidencePreparation.${field}`);
  }
  for (const field of [
    'rawEndpointLocatorValuesBound',
    'rawEndpointLocatorValuesPersisted',
    'targetBindingProven',
    'requestBodyGenerationAllowed',
    'runtimeProbeAllowed',
    'existingOperatorReferenceIsSufficient'
  ]) {
    if (evidencePreparation[field] !== false) invalid.push(`evidencePreparation.${field}`);
  }
  return invalid;
}

function invalidFutureExecutionBoundaryFields(boundary) {
  const invalid = [];
  if (!isPlainObject(boundary)) return ['futureExecutionBoundary'];
  for (const field of [
    'exactApprovalRequired',
    'cm1959BoundaryRequired',
    'cm1963BoundaryRequired',
    'cm1964ExecutorRequired',
    'cm1978FixturePreparationRequired',
    'cm1986AbortReceiptRequired',
    'lowDisclosureReceiptOnly'
  ]) {
    if (boundary[field] !== true) invalid.push(`futureExecutionBoundary.${field}`);
  }
  for (const field of [
    'concreteRequestBodyOutputAllowed',
    'responseFieldNameDisclosureAllowed',
    'retryWithoutNewEvidenceAllowed'
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
  for (const field of [
    'mustRecordTargetBindingProvenFalse',
    'mustRecordReadShapeUnlockedFalse',
    'mustRecordReadinessClaimedFalse'
  ]) {
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
    ...missingFields(REQUIRED_TARGET_DECLARATION_FIELDS, input?.targetDeclaration, 'targetDeclaration'),
    ...missingFields(REQUIRED_EVIDENCE_PREPARATION_FIELDS, input?.evidencePreparation, 'evidencePreparation'),
    ...missingFields(REQUIRED_FUTURE_EXECUTION_FIELDS, input?.futureExecutionBoundary, 'futureExecutionBoundary'),
    ...missingFields(REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, input?.forbiddenBoundary, 'forbiddenBoundary'),
    ...missingFields(REQUIRED_RECEIPT_POLICY_FIELDS, input?.receiptPolicy, 'receiptPolicy')
  ];
}

function collectUnknownInputFields(input) {
  return [
    ...collectUnknownFields(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input?.priorAbortReceipt, REQUIRED_PRIOR_ABORT_FIELDS, 'priorAbortReceipt'),
    ...collectUnknownFields(input?.targetDeclaration, REQUIRED_TARGET_DECLARATION_FIELDS, 'targetDeclaration'),
    ...collectUnknownFields(input?.evidencePreparation, REQUIRED_EVIDENCE_PREPARATION_FIELDS, 'evidencePreparation'),
    ...collectUnknownFields(input?.futureExecutionBoundary, REQUIRED_FUTURE_EXECUTION_FIELDS, 'futureExecutionBoundary'),
    ...collectUnknownFields(input?.forbiddenBoundary, REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, 'forbiddenBoundary'),
    ...collectUnknownFields(input?.receiptPolicy, REQUIRED_RECEIPT_POLICY_FIELDS, 'receiptPolicy')
  ];
}

function collectInvalidFields(input) {
  const invalid = [];
  if (!isPlainObject(input)) return ['input'];
  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (input.taskId !== 'CM-1987') invalid.push('taskId');
  if (input.targetReferenceName !== 'operator-vcp-toolbox-service-ref') invalid.push('targetReferenceName');
  if (!SOURCE_COMPONENTS.includes(input.component) || input.component !== 'KnowledgeBaseManager') {
    invalid.push('component');
  }
  if (!READ_ACTIONS.includes(input.action) || input.action !== 'knowledge_base.search') {
    invalid.push('action');
  }
  invalid.push(...invalidPriorAbortFields(input.priorAbortReceipt));
  invalid.push(...invalidTargetDeclarationFields(input.targetDeclaration));
  invalid.push(...invalidEvidencePreparationFields(input.evidencePreparation));
  invalid.push(...invalidFutureExecutionBoundaryFields(input.futureExecutionBoundary));
  invalid.push(...invalidForbiddenBoundaryFields(input.forbiddenBoundary));
  invalid.push(...invalidReceiptPolicyFields(input.receiptPolicy));
  return invalid;
}

function buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract(input = {}) {
  const missingFields = collectMissingFields(input);
  if (missingFields.length > 0) {
    return rejected('missing_real_disposable_target_declaration_evidence_preparation_fields', input, {
      missingFields
    });
  }

  const forbiddenFields = collectForbiddenRawValueFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_values_must_not_enter_real_disposable_target_declaration_contract', input, {
      forbiddenFields
    });
  }

  const unknownFields = collectUnknownInputFields(input);
  if (unknownFields.length > 0) {
    return rejected('unknown_real_disposable_target_declaration_fields_not_allowed', input, {
      unknownFields
    });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_real_disposable_target_declaration_counters', input, {
      forbiddenCounters
    });
  }

  const invalidFields = collectInvalidFields(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_real_disposable_target_declaration_evidence_preparation_contract', input, {
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
    real_disposable_target_declaration_evidence_preparation_result: preparationResult({
      accepted: true,
      priorAbortAccepted: true,
      realDisposableTargetDeclarationAccepted: true,
      existingOperatorTargetReuseAllowed: false,
      targetBindingProven: false,
      targetMaterialRequiresFutureEvidence: true,
      futureExactApprovalRequired: true,
      readShapeUnlocked: false,
      readinessClaimed: false
    }),
    declarationPreparationPlan: {
      declarationEvidenceCategory: input.evidencePreparation.declarationEvidenceCategory,
      bindingEvidenceCategory: input.evidencePreparation.bindingEvidenceCategory,
      targetEvidencePersistenceCategory: input.evidencePreparation.targetEvidencePersistenceCategory,
      requestBodyShapeCategory: input.futureExecutionBoundary.requestBodyShapeCategory,
      queryBoundaryCategory: input.futureExecutionBoundary.queryBoundaryCategory,
      maxResultCount: input.futureExecutionBoundary.maxResultCount,
      endpointLocatorDisclosureAllowed: false,
      rawValuePersistenceAllowed: false,
      existingOperatorTargetReuseAllowed: false,
      realTargetBindingProven: false,
      exactApprovalRequiredBeforeProbe: true
    },
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1988_exact_real_disposable_target_binding_boundary_packet_or_approval_request_readiness_review',
    ...zeroExecutionFlags()
  };
}

module.exports = {
  ALLOWED_BINDING_EVIDENCE_CATEGORIES,
  ALLOWED_DECLARATION_EVIDENCE_CATEGORIES,
  ALLOWED_DECLARATION_KINDS,
  ALLOWED_RECEIPT_MODES,
  ALLOWED_TARGET_CLASSES,
  ALLOWED_TARGET_EVIDENCE_PERSISTENCE_CATEGORIES,
  ALLOWED_TARGET_LIFECYCLE_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeRealDisposableTargetDeclarationEvidencePreparationContract
};
