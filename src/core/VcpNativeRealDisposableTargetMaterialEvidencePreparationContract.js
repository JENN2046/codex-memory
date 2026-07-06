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

const CONTRACT_NAME = 'VcpNativeRealDisposableTargetMaterialEvidencePreparationContract';
const CONTRACT_MODE = 'real_disposable_target_material_evidence_preparation_no_live_no_raw_values';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'component',
  'action',
  'priorAbortReceipt',
  'targetMaterialEvidencePreparation',
  'futureMaterialEvidenceBoundary',
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
  'targetMaterialEvidenceCategory',
  'targetBindingAttempts',
  'requestBodyGenerated',
  'runtimeCalled',
  'networkCalled',
  'responseConsumed',
  'readShapeUnlocked',
  'readinessClaimed'
]);

const REQUIRED_TARGET_MATERIAL_PREPARATION_FIELDS = Object.freeze([
  'evidenceKind',
  'materialEvidenceCategory',
  'materialScopeCategory',
  'materialLifecycleCategory',
  'realDisposableTargetMaterialRequired',
  'separateEvidenceRequired',
  'materialMustBeTargetScoped',
  'materialMayBeDiscardedAfterProbe',
  'materialProvenPresent',
  'targetMaterialBound',
  'targetBindingProven',
  'endpointLocatorValuesBound',
  'endpointLocatorValuesPersisted',
  'rawTargetMaterialValuesPersisted',
  'existingOperatorReferenceIsSufficient',
  'existingOperatorTargetReuseAllowed',
  'nonTargetWorkspaceAccessAllowed',
  'containsJennPrivateInformation',
  'containsProductionSecrets',
  'containsCustomerData',
  'containsRealPrivateMemory',
  'containsPersistentRuntimeArtifacts'
]);

const REQUIRED_FUTURE_MATERIAL_BOUNDARY_FIELDS = Object.freeze([
  'exactApprovalRequiredBeforeUse',
  'cm1987DeclarationContractRequired',
  'cm1988BoundaryPacketRequired',
  'cm1990AbortReceiptRequired',
  'materialEvidenceMustBeSeparatelyEvidenced',
  'materialEvidenceMayUseSafeReferenceNameOnly',
  'materialEvidenceMayPersistRawValues',
  'materialEvidenceMayPersistEndpointLocator',
  'materialEvidenceMayPersistRequestBody',
  'materialEvidenceMayAuthorizeRuntime',
  'materialEvidenceMayAuthorizeTargetBinding',
  'lowDisclosureReceiptOnly',
  'maxResultCount'
]);

const REQUIRED_FUTURE_EXECUTION_FIELDS = Object.freeze([
  'exactApprovalRequired',
  'cm1959BoundaryRequired',
  'cm1963BoundaryRequired',
  'cm1964ExecutorRequired',
  'cm1978FixturePreparationRequired',
  'cm1982FixtureCloseoutRequired',
  'cm1987MaterialDeclarationRequired',
  'cm1988BoundaryRequired',
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
  'mayPersistTargetMaterialValues',
  'mayPersistRequestBody',
  'mayPersistResponseBody',
  'mayPersistRawErrorPayload',
  'mayPersistRawLogs',
  'mayPersistSecrets',
  'mayPersistPrivateMemoryContent',
  'mustRecordTargetMaterialBoundFalse',
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
  targetBindingsAttempted: 0,
  requestBodiesGenerated: 0,
  requestBodiesPersisted: 0,
  responseBodiesConsumed: 0,
  rawValuesPersisted: 0,
  endpointLocatorDisclosures: 0,
  targetMaterialValuesPersisted: 0,
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

const ALLOWED_EVIDENCE_KINDS = Object.freeze([
  'real_disposable_target_material_evidence_preparation'
]);

const ALLOWED_MATERIAL_EVIDENCE_CATEGORIES = Object.freeze([
  'target_material_requirements_prepared_no_material_bound'
]);

const ALLOWED_MATERIAL_SCOPE_CATEGORIES = Object.freeze([
  'target_scoped_disposable_material_category_only'
]);

const ALLOWED_MATERIAL_LIFECYCLE_CATEGORIES = Object.freeze([
  'new_or_disposable_target_material_required'
]);

const ALLOWED_RECEIPT_MODES = Object.freeze([
  'low_disclosure_real_disposable_target_material_evidence_preparation'
]);

const FORBIDDEN_TARGET_MATERIAL_VALUE_FIELD_NAMES = Object.freeze([
  ...FORBIDDEN_RAW_VALUE_FIELD_NAMES,
  'targetMaterial',
  'targetMaterialValue',
  'targetMaterialValues',
  'rawTargetMaterial',
  'rawTargetMaterialValue',
  'targetFilePath',
  'targetPath',
  'runtimeConfig',
  'connectionString',
  'diagnosticLog'
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
    if (FORBIDDEN_TARGET_MATERIAL_VALUE_FIELD_NAMES.includes(key)) {
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
    targetBindingAttempted: false,
    requestBodyGenerated: false,
    requestBodyPersisted: false,
    responseBodyConsumed: false,
    rawValuesPersisted: false,
    endpointLocatorDisclosed: false,
    targetMaterialBound: false,
    targetMaterialValuesPersisted: false,
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
    targetMaterialEvidencePreparationAccepted: false,
    separatelyEvidencedRealTargetMaterialRequired: true,
    separatelyEvidencedRealTargetMaterialPresent: false,
    targetMaterialBound: false,
    targetBindingProven: false,
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
    real_disposable_target_material_evidence_preparation_result: preparationResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1991_real_disposable_target_material_evidence_or_stop_before_runtime',
    ...zeroExecutionFlags()
  };
}

function invalidPriorAbortFields(priorAbortReceipt) {
  const invalid = [];
  if (!isPlainObject(priorAbortReceipt)) return ['priorAbortReceipt'];
  const expected = {
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
  };
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (priorAbortReceipt[field] !== expectedValue) invalid.push(`priorAbortReceipt.${field}`);
  }
  return invalid;
}

function invalidTargetMaterialPreparationFields(material) {
  const invalid = [];
  if (!isPlainObject(material)) return ['targetMaterialEvidencePreparation'];
  if (!ALLOWED_EVIDENCE_KINDS.includes(material.evidenceKind)) {
    invalid.push('targetMaterialEvidencePreparation.evidenceKind');
  }
  if (!ALLOWED_MATERIAL_EVIDENCE_CATEGORIES.includes(material.materialEvidenceCategory)) {
    invalid.push('targetMaterialEvidencePreparation.materialEvidenceCategory');
  }
  if (!ALLOWED_MATERIAL_SCOPE_CATEGORIES.includes(material.materialScopeCategory)) {
    invalid.push('targetMaterialEvidencePreparation.materialScopeCategory');
  }
  if (!ALLOWED_MATERIAL_LIFECYCLE_CATEGORIES.includes(material.materialLifecycleCategory)) {
    invalid.push('targetMaterialEvidencePreparation.materialLifecycleCategory');
  }
  for (const field of [
    'realDisposableTargetMaterialRequired',
    'separateEvidenceRequired',
    'materialMustBeTargetScoped',
    'materialMayBeDiscardedAfterProbe'
  ]) {
    if (material[field] !== true) invalid.push(`targetMaterialEvidencePreparation.${field}`);
  }
  for (const field of [
    'materialProvenPresent',
    'targetMaterialBound',
    'targetBindingProven',
    'endpointLocatorValuesBound',
    'endpointLocatorValuesPersisted',
    'rawTargetMaterialValuesPersisted',
    'existingOperatorReferenceIsSufficient',
    'existingOperatorTargetReuseAllowed',
    'nonTargetWorkspaceAccessAllowed',
    'containsJennPrivateInformation',
    'containsProductionSecrets',
    'containsCustomerData',
    'containsRealPrivateMemory',
    'containsPersistentRuntimeArtifacts'
  ]) {
    if (material[field] !== false) invalid.push(`targetMaterialEvidencePreparation.${field}`);
  }
  return invalid;
}

function invalidFutureMaterialBoundaryFields(boundary) {
  const invalid = [];
  if (!isPlainObject(boundary)) return ['futureMaterialEvidenceBoundary'];
  for (const field of [
    'exactApprovalRequiredBeforeUse',
    'cm1987DeclarationContractRequired',
    'cm1988BoundaryPacketRequired',
    'cm1990AbortReceiptRequired',
    'materialEvidenceMustBeSeparatelyEvidenced',
    'materialEvidenceMayUseSafeReferenceNameOnly',
    'lowDisclosureReceiptOnly'
  ]) {
    if (boundary[field] !== true) invalid.push(`futureMaterialEvidenceBoundary.${field}`);
  }
  for (const field of [
    'materialEvidenceMayPersistRawValues',
    'materialEvidenceMayPersistEndpointLocator',
    'materialEvidenceMayPersistRequestBody',
    'materialEvidenceMayAuthorizeRuntime',
    'materialEvidenceMayAuthorizeTargetBinding'
  ]) {
    if (boundary[field] !== false) invalid.push(`futureMaterialEvidenceBoundary.${field}`);
  }
  if (boundary.maxResultCount !== 1) invalid.push('futureMaterialEvidenceBoundary.maxResultCount');
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
    'cm1982FixtureCloseoutRequired',
    'cm1987MaterialDeclarationRequired',
    'cm1988BoundaryRequired',
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
    'mustRecordTargetMaterialBoundFalse',
    'mustRecordTargetBindingProvenFalse',
    'mustRecordReadShapeUnlockedFalse',
    'mustRecordReadinessClaimedFalse'
  ]) {
    if (receiptPolicy[field] !== true) invalid.push(`receiptPolicy.${field}`);
  }
  for (const field of [
    'mayPersistRawValues',
    'mayPersistEndpointLocator',
    'mayPersistTargetMaterialValues',
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
    ...missingFields(
      REQUIRED_TARGET_MATERIAL_PREPARATION_FIELDS,
      input?.targetMaterialEvidencePreparation,
      'targetMaterialEvidencePreparation'
    ),
    ...missingFields(
      REQUIRED_FUTURE_MATERIAL_BOUNDARY_FIELDS,
      input?.futureMaterialEvidenceBoundary,
      'futureMaterialEvidenceBoundary'
    ),
    ...missingFields(REQUIRED_FUTURE_EXECUTION_FIELDS, input?.futureExecutionBoundary, 'futureExecutionBoundary'),
    ...missingFields(REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, input?.forbiddenBoundary, 'forbiddenBoundary'),
    ...missingFields(REQUIRED_RECEIPT_POLICY_FIELDS, input?.receiptPolicy, 'receiptPolicy')
  ];
}

function collectUnknownInputFields(input) {
  return [
    ...collectUnknownFields(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input?.priorAbortReceipt, REQUIRED_PRIOR_ABORT_FIELDS, 'priorAbortReceipt'),
    ...collectUnknownFields(
      input?.targetMaterialEvidencePreparation,
      REQUIRED_TARGET_MATERIAL_PREPARATION_FIELDS,
      'targetMaterialEvidencePreparation'
    ),
    ...collectUnknownFields(
      input?.futureMaterialEvidenceBoundary,
      REQUIRED_FUTURE_MATERIAL_BOUNDARY_FIELDS,
      'futureMaterialEvidenceBoundary'
    ),
    ...collectUnknownFields(input?.futureExecutionBoundary, REQUIRED_FUTURE_EXECUTION_FIELDS, 'futureExecutionBoundary'),
    ...collectUnknownFields(input?.forbiddenBoundary, REQUIRED_FORBIDDEN_BOUNDARY_FIELDS, 'forbiddenBoundary'),
    ...collectUnknownFields(input?.receiptPolicy, REQUIRED_RECEIPT_POLICY_FIELDS, 'receiptPolicy')
  ];
}

function collectInvalidFields(input) {
  const invalid = [];
  if (!isPlainObject(input)) return ['input'];
  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (input.taskId !== 'CM-1991') invalid.push('taskId');
  if (input.targetReferenceName !== 'operator-vcp-toolbox-service-ref') invalid.push('targetReferenceName');
  if (!SOURCE_COMPONENTS.includes(input.component) || input.component !== 'KnowledgeBaseManager') {
    invalid.push('component');
  }
  if (!READ_ACTIONS.includes(input.action) || input.action !== 'knowledge_base.search') {
    invalid.push('action');
  }
  invalid.push(...invalidPriorAbortFields(input.priorAbortReceipt));
  invalid.push(...invalidTargetMaterialPreparationFields(input.targetMaterialEvidencePreparation));
  invalid.push(...invalidFutureMaterialBoundaryFields(input.futureMaterialEvidenceBoundary));
  invalid.push(...invalidFutureExecutionBoundaryFields(input.futureExecutionBoundary));
  invalid.push(...invalidForbiddenBoundaryFields(input.forbiddenBoundary));
  invalid.push(...invalidReceiptPolicyFields(input.receiptPolicy));
  return invalid;
}

function buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract(input = {}) {
  const missingFields = collectMissingFields(input);
  if (missingFields.length > 0) {
    return rejected('missing_real_disposable_target_material_evidence_preparation_fields', input, {
      missingFields
    });
  }

  const forbiddenFields = collectForbiddenRawValueFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_values_must_not_enter_real_disposable_target_material_contract', input, {
      forbiddenFields
    });
  }

  const unknownFields = collectUnknownInputFields(input);
  if (unknownFields.length > 0) {
    return rejected('unknown_real_disposable_target_material_evidence_preparation_fields', input, {
      unknownFields
    });
  }

  const invalidFields = collectInvalidFields(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_real_disposable_target_material_evidence_preparation_contract', input, {
      invalidFields
    });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_real_disposable_target_material_counters', input, {
      forbiddenCounters
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
    materialPreparationPlan: {
      priorAbortSourceTask: input.priorAbortReceipt.sourceTaskId,
      targetMaterialEvidenceCategory: input.targetMaterialEvidencePreparation.materialEvidenceCategory,
      materialScopeCategory: input.targetMaterialEvidencePreparation.materialScopeCategory,
      separatelyEvidencedRealTargetMaterialRequired: true,
      separatelyEvidencedRealTargetMaterialPresent: false,
      targetMaterialBound: false,
      targetBindingProven: false,
      endpointLocatorDisclosureAllowed: false,
      rawValuePersistenceAllowed: false,
      futureExactApprovalRequired: true
    },
    real_disposable_target_material_evidence_preparation_result: preparationResult({
      accepted: true,
      priorAbortAccepted: true,
      targetMaterialEvidencePreparationAccepted: true,
      futureExactApprovalRequired: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1992_exact_real_disposable_target_material_boundary_packet_or_approval_request_readiness_review_no_live',
    ...zeroExecutionFlags()
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  buildVcpNativeRealDisposableTargetMaterialEvidencePreparationContract
};
