'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeComponentActionRequestReadShapePreparationContract';
const CONTRACT_MODE = 'low_disclosure_component_action_request_read_shape_preparation_contract_no_live';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'priorStatusEvidence',
  'componentActionBinding',
  'clientErrorRequestDiagnosisBoundary',
  'actionSuccessPreconditions',
  'responseShapeBoundary',
  'readShapeApprovalPreconditions',
  'zeroWriteRawOutputBoundary',
  'approvalBoundary',
  'counters'
]);

const REQUIRED_PRIOR_STATUS_FIELDS = Object.freeze([
  'lane',
  'sourceRouteTaskId',
  'priorReceiptTaskId',
  'componentActionRouteProbeCategory',
  'routeStatusCategory',
  'statusClass',
  'requestBodyShapeCategory',
  'requestBodyGeneratedByPriorProbe',
  'concreteRequestBodyOutput',
  'requestBodyPersisted',
  'responseBodyRead',
  'rawErrorPayloadRead',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'memoryRead',
  'memoryWritten',
  'retryAllowed',
  'readShapeUnlocked',
  'readinessClaimed'
]);

const REQUIRED_COMPONENT_ACTION_FIELDS = Object.freeze([
  'lane',
  'targetReferenceName',
  'component',
  'action',
  'currentStatus',
  'rawPluginConfigRead',
  'privateMemoryContentRead',
  'providerPayloadRead',
  'endpointDisclosed',
  'locatorValueDisclosed'
]);

const REQUIRED_CLIENT_ERROR_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'diagnosisPerformedNow',
  'rawErrorPayloadReadAllowed',
  'responseBodyReadAllowed',
  'concreteRequestBodyAllowed',
  'queryTextAllowed',
  'memoryContentAllowed',
  'endpointLocatorAllowed',
  'configEnvAllowed',
  'authMaterialAllowed'
]);

const REQUIRED_ACTION_SUCCESS_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'successClaimAllowedNow',
  'futureExactApprovalRequired',
  'exactBoundedActionPurposeRequired',
  'safeTargetReferenceRequired',
  'safeComponentActionIdentifiersRequired',
  'requestBodyShapeCategoryRequired',
  'maxRuntimeNetworkCallCountRequired',
  'zeroWriteRuleRequired',
  'lowDisclosureResultProjectionRequired',
  'abortOnRawPrivateOutputRequired'
]);

const REQUIRED_RESPONSE_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'inspectResponseShapeNow',
  'futureExactApprovalRequired',
  'responseShapeCategoryMayBeProjectedLater',
  'topLevelKindCategoryMayBeProjectedLater',
  'itemCountBucketMayBeProjectedLater',
  'fieldNameDisclosurePolicyRequired',
  'memoryContentDisclosed',
  'rawResponseBodyPersisted',
  'rawErrorPayloadPersisted',
  'rawResponseBodyAllowed',
  'rawErrorPayloadAllowed',
  'privateMemoryTextAllowed',
  'memoryIdsAllowed',
  'endpointLocatorAllowed',
  'configEnvAllowed',
  'tokenSecretAllowed',
  'logsStdoutStderrAllowed',
  'providerPayloadAllowed',
  'approvalLineAllowed'
]);

const REQUIRED_READ_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'readShapeAllowedNow',
  'futureExactApprovalRequired',
  'purposeRequired',
  'targetReferenceRequired',
  'componentActionIdentifiersRequired',
  'queryBoundaryRequired',
  'maxResultCountRequired',
  'maxRuntimeNetworkCallCountRequired',
  'outputDisclosureLimitRequired',
  'zeroWriteRuleRequired',
  'noBroadScanRuleRequired',
  'rawPrivateOutputAbortRuleRequired',
  'lowDisclosureReceiptProjectionRequired'
]);

const REQUIRED_ZERO_BOUNDARY_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'memoryWrites',
  'durableWrites',
  'responseBodyReads',
  'rawErrorReads',
  'logsStdoutStderrReads',
  'configEnvSecretReads',
  'rawMemoryStoreAuditReads',
  'endpointLocatorDisclosures',
  'concreteRequestBodyOutputOrPersistence',
  'approvalLineGeneration',
  'runtimeConfigStartupWatchdogDependencyMutation',
  'publicMcpExpansion',
  'pushTagReleaseDeployCutover',
  'readinessClaims'
]);

const REQUIRED_APPROVAL_FIELDS = Object.freeze([
  'lane',
  'nextExactApprovalRequired',
  'currentExactApprovalPresent',
  'approvalLineGenerated',
  'liveExecutionAllowedNow',
  'diagnosisAllowedNow',
  'responseShapeInspectionAllowedNow',
  'readShapeProofAllowedNow',
  'memoryReadAllowedNow',
  'memoryWriteAllowedNow',
  'readinessClaim'
]);

const ALLOWED_REQUEST_BODY_SHAPE_CATEGORIES = Object.freeze([
  'minimal_component_action_route_status_payload_category_only'
]);

const ALLOWED_ROUTE_PROBE_CATEGORIES = Object.freeze([
  'route_status_known'
]);

const ALLOWED_ROUTE_STATUS_CATEGORIES = Object.freeze([
  'status_only_known'
]);

const ALLOWED_STATUS_CLASSES = Object.freeze([
  'client_error'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  liveVcpToolBoxCalls: 0,
  networkCalls: 0,
  liveProcessInspections: 0,
  serviceStartAttempts: 0,
  serviceStopAttempts: 0,
  serviceRestartAttempts: 0,
  listenerRecheckAttempts: 0,
  endpointDisclosures: 0,
  locatorValueDisclosures: 0,
  configEnvReads: 0,
  secretReads: 0,
  logReads: 0,
  stdoutStderrReads: 0,
  responseBodiesRead: 0,
  rawErrorPayloadsRead: 0,
  rawPluginConfigReads: 0,
  privateMemoryContentReads: 0,
  concreteRequestBodiesGenerated: 0,
  concreteRequestBodiesOutput: 0,
  requestBodyPersistence: 0,
  approvalLineOperations: 0,
  clientErrorDiagnoses: 0,
  actionSuccessClaims: 0,
  responseShapeInspections: 0,
  readShapeProofs: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableWrites: 0,
  providerApiCalls: 0,
  runtimeBindingChanges: 0,
  configStartupWatchdogChanges: 0,
  dependencyChanges: 0,
  publicMcpExpansions: 0,
  readinessClaims: 0
});

const ZERO_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_COUNTERS));

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'locatorValue',
  'rawLocatorValue',
  'config',
  'configEnv',
  'configPath',
  'configEnvPath',
  'env',
  'envPath',
  'envValue',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'privateKey',
  'password',
  'approvalLine',
  'approvalLineText',
  'approvalLineValue',
  'approvalRequestBody',
  'requestBody',
  'requestPayload',
  'serializedRequestBody',
  'payload',
  'query',
  'queryText',
  'memoryContent',
  'responseBody',
  'rawResponseBody',
  'responsePayload',
  'rawPayload',
  'rawOutput',
  'rawErrorPayload',
  'responseShapeKeys',
  'shapeKeys',
  'fieldNames',
  'rawMemoryText',
  'privateMemoryText',
  'rawText',
  'memoryId',
  'memoryIds',
  'memory_id',
  'stdout',
  'stderr',
  'log',
  'logs',
  'rawLog',
  'rawPluginConfig',
  'pluginConfig',
  'providerPayload',
  'runtimePayload',
  'pid',
  'processId',
  'processIdentifier',
  'command',
  'commandLine',
  'curl',
  'startupCommand'
]);

const ALLOWED_TOP_LEVEL_FIELDS = REQUIRED_TOP_LEVEL_FIELDS;
const ALLOWED_PRIOR_STATUS_FIELDS = REQUIRED_PRIOR_STATUS_FIELDS;
const ALLOWED_COMPONENT_ACTION_FIELDS = REQUIRED_COMPONENT_ACTION_FIELDS;
const ALLOWED_CLIENT_ERROR_FIELDS = REQUIRED_CLIENT_ERROR_FIELDS;
const ALLOWED_ACTION_SUCCESS_FIELDS = REQUIRED_ACTION_SUCCESS_FIELDS;
const ALLOWED_RESPONSE_SHAPE_FIELDS = REQUIRED_RESPONSE_SHAPE_FIELDS;
const ALLOWED_READ_SHAPE_FIELDS = REQUIRED_READ_SHAPE_FIELDS;
const ALLOWED_ZERO_BOUNDARY_FIELDS = REQUIRED_ZERO_BOUNDARY_FIELDS;
const ALLOWED_APPROVAL_FIELDS = REQUIRED_APPROVAL_FIELDS;

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

function collectForbiddenFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_FIELD_NAMES.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenFields(nested, path));
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

function isAllowedComponent(value) {
  return SOURCE_COMPONENTS.includes(value);
}

function isAllowedAction(value) {
  return READ_ACTIONS.includes(value);
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      targetReferenceName: null,
      component: null,
      action: null,
      statusClass: null,
      routeStatusCategory: null
    };
  }
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null,
    component: isAllowedComponent(input.componentActionBinding?.component)
      ? input.componentActionBinding.component
      : null,
    action: isAllowedAction(input.componentActionBinding?.action)
      ? input.componentActionBinding.action
      : null,
    statusClass: ALLOWED_STATUS_CLASSES.includes(input.priorStatusEvidence?.statusClass)
      ? input.priorStatusEvidence.statusClass
      : null,
    routeStatusCategory: ALLOWED_ROUTE_STATUS_CATEGORIES.includes(input.priorStatusEvidence?.routeStatusCategory)
      ? input.priorStatusEvidence.routeStatusCategory
      : null
  };
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    liveProcessInspected: false,
    serviceStartAttempted: false,
    serviceStopAttempted: false,
    serviceRestartAttempted: false,
    listenerRecheckAttempted: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    configEnvRead: false,
    secretRead: false,
    logRead: false,
    stdoutStderrRead: false,
    clientErrorDiagnosed: false,
    concreteRequestBodyGenerated: false,
    concreteRequestBodyOutput: false,
    requestBodyPersisted: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    rawPluginConfigRead: false,
    privateMemoryContentRead: false,
    providerPayloadRead: false,
    runtimePayloadRead: false,
    actionSuccessClaimed: false,
    responseShapeInspected: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    runtimeBindingChanged: false,
    configStartupWatchdogChanged: false,
    dependencyChanged: false,
    publicMcpExpanded: false,
    approvalLineGenerated: false,
    readShapeProofPerformed: false,
    readinessClaimed: false
  };
}

function preparationResult(overrides = {}) {
  return {
    accepted: false,
    priorStatusOnlyClientErrorAccepted: false,
    componentActionIdentifiersKnown: false,
    clientErrorRequestDiagnosisBoundaryDefined: false,
    actionSuccessPreconditionsDefined: false,
    responseShapeBoundaryDefined: false,
    readShapeApprovalPreconditionsDefined: false,
    zeroWriteRawOutputBoundaryLocked: false,
    actionSuccessProven: false,
    responseShapeKnown: false,
    readShapeUnlocked: false,
    nextExactApprovalRequired: true,
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
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    unknownFields: details.unknownFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    request_read_shape_preparation_result: preparationResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1959_request_read_shape_preparation_contract_before_any_exact_packet',
    ...zeroSideEffectFlags()
  };
}

function invalidPriorStatusFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['priorStatusEvidence'];
  if (lane.lane !== 'prior_status_evidence') invalidFields.push('priorStatusEvidence.lane');
  if (lane.sourceRouteTaskId !== 'CM-1957') invalidFields.push('priorStatusEvidence.sourceRouteTaskId');
  if (lane.priorReceiptTaskId !== 'CM-1956') invalidFields.push('priorStatusEvidence.priorReceiptTaskId');
  if (!ALLOWED_ROUTE_PROBE_CATEGORIES.includes(lane.componentActionRouteProbeCategory)) {
    invalidFields.push('priorStatusEvidence.componentActionRouteProbeCategory');
  }
  if (!ALLOWED_ROUTE_STATUS_CATEGORIES.includes(lane.routeStatusCategory)) {
    invalidFields.push('priorStatusEvidence.routeStatusCategory');
  }
  if (!ALLOWED_STATUS_CLASSES.includes(lane.statusClass)) invalidFields.push('priorStatusEvidence.statusClass');
  if (!ALLOWED_REQUEST_BODY_SHAPE_CATEGORIES.includes(lane.requestBodyShapeCategory)) {
    invalidFields.push('priorStatusEvidence.requestBodyShapeCategory');
  }
  if (lane.requestBodyGeneratedByPriorProbe !== true) {
    invalidFields.push('priorStatusEvidence.requestBodyGeneratedByPriorProbe');
  }
  for (const field of [
    'concreteRequestBodyOutput',
    'requestBodyPersisted',
    'responseBodyRead',
    'rawErrorPayloadRead',
    'endpointDisclosed',
    'locatorValueDisclosed',
    'memoryRead',
    'memoryWritten',
    'retryAllowed',
    'readShapeUnlocked',
    'readinessClaimed'
  ]) {
    if (lane[field] !== false) invalidFields.push(`priorStatusEvidence.${field}`);
  }
  return invalidFields;
}

function invalidComponentActionFields(lane, topLevelTargetReferenceName) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['componentActionBinding'];
  if (lane.lane !== 'component_action_binding') invalidFields.push('componentActionBinding.lane');
  if (!isSafeReferenceName(lane.targetReferenceName)) {
    invalidFields.push('componentActionBinding.targetReferenceName');
  }
  if (lane.targetReferenceName !== topLevelTargetReferenceName) {
    invalidFields.push('componentActionBinding.targetReferenceName');
  }
  if (!isAllowedComponent(lane.component)) invalidFields.push('componentActionBinding.component');
  if (!isAllowedAction(lane.action)) invalidFields.push('componentActionBinding.action');
  if (lane.currentStatus !== 'safe_identifiers_known') {
    invalidFields.push('componentActionBinding.currentStatus');
  }
  for (const field of [
    'rawPluginConfigRead',
    'privateMemoryContentRead',
    'providerPayloadRead',
    'endpointDisclosed',
    'locatorValueDisclosed'
  ]) {
    if (lane[field] !== false) invalidFields.push(`componentActionBinding.${field}`);
  }
  return invalidFields;
}

function invalidClientErrorFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['clientErrorRequestDiagnosisBoundary'];
  if (lane.lane !== 'client_error_request_diagnosis_boundary') {
    invalidFields.push('clientErrorRequestDiagnosisBoundary.lane');
  }
  if (lane.currentStatus !== 'status_only_client_error_known') {
    invalidFields.push('clientErrorRequestDiagnosisBoundary.currentStatus');
  }
  for (const field of [
    'diagnosisPerformedNow',
    'rawErrorPayloadReadAllowed',
    'responseBodyReadAllowed',
    'concreteRequestBodyAllowed',
    'queryTextAllowed',
    'memoryContentAllowed',
    'endpointLocatorAllowed',
    'configEnvAllowed',
    'authMaterialAllowed'
  ]) {
    if (lane[field] !== false) invalidFields.push(`clientErrorRequestDiagnosisBoundary.${field}`);
  }
  return invalidFields;
}

function invalidActionSuccessFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['actionSuccessPreconditions'];
  if (lane.lane !== 'action_success_preconditions') invalidFields.push('actionSuccessPreconditions.lane');
  if (lane.currentStatus !== 'unproven') invalidFields.push('actionSuccessPreconditions.currentStatus');
  if (lane.successClaimAllowedNow !== false) invalidFields.push('actionSuccessPreconditions.successClaimAllowedNow');
  for (const field of [
    'futureExactApprovalRequired',
    'exactBoundedActionPurposeRequired',
    'safeTargetReferenceRequired',
    'safeComponentActionIdentifiersRequired',
    'requestBodyShapeCategoryRequired',
    'maxRuntimeNetworkCallCountRequired',
    'zeroWriteRuleRequired',
    'lowDisclosureResultProjectionRequired',
    'abortOnRawPrivateOutputRequired'
  ]) {
    if (lane[field] !== true) invalidFields.push(`actionSuccessPreconditions.${field}`);
  }
  return invalidFields;
}

function invalidResponseShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['responseShapeBoundary'];
  if (lane.lane !== 'response_shape_boundary') invalidFields.push('responseShapeBoundary.lane');
  if (lane.currentStatus !== 'unknown') invalidFields.push('responseShapeBoundary.currentStatus');
  if (lane.inspectResponseShapeNow !== false) invalidFields.push('responseShapeBoundary.inspectResponseShapeNow');
  for (const field of [
    'futureExactApprovalRequired',
    'responseShapeCategoryMayBeProjectedLater',
    'topLevelKindCategoryMayBeProjectedLater',
    'itemCountBucketMayBeProjectedLater',
    'fieldNameDisclosurePolicyRequired'
  ]) {
    if (lane[field] !== true) invalidFields.push(`responseShapeBoundary.${field}`);
  }
  for (const field of [
    'memoryContentDisclosed',
    'rawResponseBodyPersisted',
    'rawErrorPayloadPersisted',
    'rawResponseBodyAllowed',
    'rawErrorPayloadAllowed',
    'privateMemoryTextAllowed',
    'memoryIdsAllowed',
    'endpointLocatorAllowed',
    'configEnvAllowed',
    'tokenSecretAllowed',
    'logsStdoutStderrAllowed',
    'providerPayloadAllowed',
    'approvalLineAllowed'
  ]) {
    if (lane[field] !== false) invalidFields.push(`responseShapeBoundary.${field}`);
  }
  return invalidFields;
}

function invalidReadShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['readShapeApprovalPreconditions'];
  if (lane.lane !== 'read_shape_approval_preconditions') {
    invalidFields.push('readShapeApprovalPreconditions.lane');
  }
  if (lane.currentStatus !== 'not_authorized') invalidFields.push('readShapeApprovalPreconditions.currentStatus');
  if (lane.readShapeAllowedNow !== false) invalidFields.push('readShapeApprovalPreconditions.readShapeAllowedNow');
  for (const field of [
    'futureExactApprovalRequired',
    'purposeRequired',
    'targetReferenceRequired',
    'componentActionIdentifiersRequired',
    'queryBoundaryRequired',
    'maxResultCountRequired',
    'maxRuntimeNetworkCallCountRequired',
    'outputDisclosureLimitRequired',
    'zeroWriteRuleRequired',
    'noBroadScanRuleRequired',
    'rawPrivateOutputAbortRuleRequired',
    'lowDisclosureReceiptProjectionRequired'
  ]) {
    if (lane[field] !== true) invalidFields.push(`readShapeApprovalPreconditions.${field}`);
  }
  return invalidFields;
}

function invalidZeroBoundaryFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['zeroWriteRawOutputBoundary'];
  if (lane.lane !== 'zero_write_zero_raw_output_boundary') invalidFields.push('zeroWriteRawOutputBoundary.lane');
  if (lane.currentStatus !== 'zero_required') invalidFields.push('zeroWriteRawOutputBoundary.currentStatus');
  for (const field of REQUIRED_ZERO_BOUNDARY_FIELDS.filter(field => !['lane', 'currentStatus'].includes(field))) {
    if (lane[field] !== 0) invalidFields.push(`zeroWriteRawOutputBoundary.${field}`);
  }
  return invalidFields;
}

function invalidApprovalFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['approvalBoundary'];
  if (lane.lane !== 'approval_boundary') invalidFields.push('approvalBoundary.lane');
  if (lane.nextExactApprovalRequired !== true) invalidFields.push('approvalBoundary.nextExactApprovalRequired');
  for (const field of [
    'currentExactApprovalPresent',
    'approvalLineGenerated',
    'liveExecutionAllowedNow',
    'diagnosisAllowedNow',
    'responseShapeInspectionAllowedNow',
    'readShapeProofAllowedNow',
    'memoryReadAllowedNow',
    'memoryWriteAllowedNow',
    'readinessClaim'
  ]) {
    if (lane[field] !== false) invalidFields.push(`approvalBoundary.${field}`);
  }
  return invalidFields;
}

function invalidFields(input) {
  return [
    ...(input.schemaVersion !== SCHEMA_VERSION ? ['schemaVersion'] : []),
    ...(!isSafeReferenceName(input.taskId) ? ['taskId'] : []),
    ...(!isSafeReferenceName(input.targetReferenceName) ? ['targetReferenceName'] : []),
    ...invalidPriorStatusFields(input.priorStatusEvidence),
    ...invalidComponentActionFields(input.componentActionBinding, input.targetReferenceName),
    ...invalidClientErrorFields(input.clientErrorRequestDiagnosisBoundary),
    ...invalidActionSuccessFields(input.actionSuccessPreconditions),
    ...invalidResponseShapeFields(input.responseShapeBoundary),
    ...invalidReadShapeFields(input.readShapeApprovalPreconditions),
    ...invalidZeroBoundaryFields(input.zeroWriteRawOutputBoundary),
    ...invalidApprovalFields(input.approvalBoundary)
  ];
}

function unknownFields(input) {
  return [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input.priorStatusEvidence, ALLOWED_PRIOR_STATUS_FIELDS, 'priorStatusEvidence'),
    ...collectUnknownFields(input.componentActionBinding, ALLOWED_COMPONENT_ACTION_FIELDS, 'componentActionBinding'),
    ...collectUnknownFields(
      input.clientErrorRequestDiagnosisBoundary,
      ALLOWED_CLIENT_ERROR_FIELDS,
      'clientErrorRequestDiagnosisBoundary'
    ),
    ...collectUnknownFields(
      input.actionSuccessPreconditions,
      ALLOWED_ACTION_SUCCESS_FIELDS,
      'actionSuccessPreconditions'
    ),
    ...collectUnknownFields(input.responseShapeBoundary, ALLOWED_RESPONSE_SHAPE_FIELDS, 'responseShapeBoundary'),
    ...collectUnknownFields(
      input.readShapeApprovalPreconditions,
      ALLOWED_READ_SHAPE_FIELDS,
      'readShapeApprovalPreconditions'
    ),
    ...collectUnknownFields(
      input.zeroWriteRawOutputBoundary,
      ALLOWED_ZERO_BOUNDARY_FIELDS,
      'zeroWriteRawOutputBoundary'
    ),
    ...collectUnknownFields(input.approvalBoundary, ALLOWED_APPROVAL_FIELDS, 'approvalBoundary')
  ];
}

function buildVcpNativeComponentActionRequestReadShapePreparationContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PRIOR_STATUS_FIELDS, input.priorStatusEvidence, 'priorStatusEvidence'),
    ...missingFields(REQUIRED_COMPONENT_ACTION_FIELDS, input.componentActionBinding, 'componentActionBinding'),
    ...missingFields(
      REQUIRED_CLIENT_ERROR_FIELDS,
      input.clientErrorRequestDiagnosisBoundary,
      'clientErrorRequestDiagnosisBoundary'
    ),
    ...missingFields(
      REQUIRED_ACTION_SUCCESS_FIELDS,
      input.actionSuccessPreconditions,
      'actionSuccessPreconditions'
    ),
    ...missingFields(REQUIRED_RESPONSE_SHAPE_FIELDS, input.responseShapeBoundary, 'responseShapeBoundary'),
    ...missingFields(
      REQUIRED_READ_SHAPE_FIELDS,
      input.readShapeApprovalPreconditions,
      'readShapeApprovalPreconditions'
    ),
    ...missingFields(
      REQUIRED_ZERO_BOUNDARY_FIELDS,
      input.zeroWriteRawOutputBoundary,
      'zeroWriteRawOutputBoundary'
    ),
    ...missingFields(REQUIRED_APPROVAL_FIELDS, input.approvalBoundary, 'approvalBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_request_read_shape_preparation_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_request_read_shape_preparation_material', input, { forbiddenFields });
  }

  const unknown = unknownFields(input);
  if (unknown.length > 0) {
    return rejected('unknown_request_read_shape_preparation_fields_not_allowed', input, {
      unknownFields: unknown
    });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_request_read_shape_preparation_counters', input, {
      forbiddenCounters
    });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_request_read_shape_preparation_contract', input, { invalidFields: invalid });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    requestReadShapePreparationContractLocked: true,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unknownFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    request_read_shape_preparation_result: preparationResult({
      accepted: true,
      priorStatusOnlyClientErrorAccepted: true,
      componentActionIdentifiersKnown: true,
      clientErrorRequestDiagnosisBoundaryDefined: true,
      actionSuccessPreconditionsDefined: true,
      responseShapeBoundaryDefined: true,
      readShapeApprovalPreconditionsDefined: true,
      zeroWriteRawOutputBoundaryLocked: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1960_component_action_request_read_shape_exact_approval_packet_non_authorizing',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  buildVcpNativeComponentActionRequestReadShapePreparationContract
};
