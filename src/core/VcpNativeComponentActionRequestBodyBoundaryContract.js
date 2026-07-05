'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeComponentActionRequestBodyBoundaryContract';
const CONTRACT_MODE = 'low_disclosure_component_action_request_body_boundary_contract_no_live_call';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'componentActionBinding',
  'requestBodyShapeBoundary',
  'routeProbeBoundary',
  'outputProjectionBoundary',
  'readShapeSeparation',
  'approvalBoundary',
  'counters'
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

const REQUIRED_REQUEST_BODY_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'requestBodyShapeCategory',
  'concretePayloadGenerated',
  'serializedPayloadAvailable',
  'queryTextBound',
  'memoryContentBound',
  'providerPayloadBound',
  'endpointOrLocatorBound',
  'requestBodyGenerated'
]);

const REQUIRED_ROUTE_PROBE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'futureExactApprovalRequired',
  'maxComponentActionRouteProbeAttempts',
  'maxNetworkCalls',
  'maxRuntimeCalls',
  'maxProcessStateInspections',
  'maxServiceStartAttempts',
  'maxServiceStopAttempts',
  'maxServiceRestartAttempts',
  'maxListenerRecheckAttempts',
  'responseBodyByteBudget',
  'rawErrorPayloadBudget',
  'logReadBudget',
  'liveExecutionAllowedNow',
  'componentActionRouteProbeAllowedNow'
]);

const REQUIRED_OUTPUT_PROJECTION_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'projectionCategory',
  'concreteRequestBodyAllowed',
  'rawResponseBodyAllowed',
  'rawErrorPayloadAllowed',
  'responseShapeKeysAllowed',
  'memoryIdsAllowed',
  'rawMemoryTextAllowed',
  'endpointLocatorAllowed',
  'configEnvAllowed',
  'tokenSecretAllowed',
  'logsStdoutStderrAllowed',
  'approvalLineAllowed'
]);

const REQUIRED_READ_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'routeProbeMayReadShape',
  'routeProbeMayReadMemoryContent',
  'readShapeUnlocked',
  'separateExactApprovalRequired'
]);

const REQUIRED_APPROVAL_BOUNDARY_FIELDS = Object.freeze([
  'lane',
  'nextExactApprovalRequired',
  'approvalLineGenerated',
  'requestBodyGenerated',
  'liveExecutionAllowedNow',
  'componentActionRouteProbeAllowedNow',
  'readShapeIncluded',
  'readinessClaim'
]);

const ALLOWED_REQUEST_BODY_SHAPE_CATEGORIES = Object.freeze([
  'minimal_component_action_route_status_payload_category_only'
]);

const ALLOWED_OUTPUT_PROJECTION_CATEGORIES = Object.freeze([
  'low_disclosure_route_status_only'
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
  requestBodiesSubmitted: 0,
  approvalLineOperations: 0,
  componentActionRouteProbeExecutions: 0,
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
  'rawMemoryText',
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
const ALLOWED_COMPONENT_ACTION_FIELDS = REQUIRED_COMPONENT_ACTION_FIELDS;
const ALLOWED_REQUEST_BODY_SHAPE_FIELDS = REQUIRED_REQUEST_BODY_SHAPE_FIELDS;
const ALLOWED_ROUTE_PROBE_FIELDS = REQUIRED_ROUTE_PROBE_FIELDS;
const ALLOWED_OUTPUT_PROJECTION_FIELDS = REQUIRED_OUTPUT_PROJECTION_FIELDS;
const ALLOWED_READ_SHAPE_FIELDS = REQUIRED_READ_SHAPE_FIELDS;
const ALLOWED_APPROVAL_BOUNDARY_FIELDS = REQUIRED_APPROVAL_BOUNDARY_FIELDS;

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
      requestBodyShapeCategory: null
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
    requestBodyShapeCategory: ALLOWED_REQUEST_BODY_SHAPE_CATEGORIES.includes(
      input.requestBodyShapeBoundary?.requestBodyShapeCategory
    )
      ? input.requestBodyShapeBoundary.requestBodyShapeCategory
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
    concreteRequestBodyGenerated: false,
    requestBodySubmitted: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    rawPluginConfigRead: false,
    privateMemoryContentRead: false,
    providerPayloadRead: false,
    runtimePayloadRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    runtimeBindingChanged: false,
    configStartupWatchdogChanged: false,
    dependencyChanged: false,
    publicMcpExpanded: false,
    approvalLineGenerated: false,
    componentActionRouteProbeExecuted: false,
    readShapeProofPerformed: false,
    readinessClaimed: false
  };
}

function contractResult(overrides = {}) {
  return {
    accepted: false,
    targetReferenceKnown: false,
    componentActionIdentifiersKnown: false,
    requestBodyShapeBoundaryDefined: false,
    concreteRequestBodyGenerated: false,
    componentActionRouteProbeAuthorizedNow: false,
    futureExactApprovalRequired: true,
    responseBodyReadAllowed: false,
    rawErrorPayloadReadAllowed: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    readShapeUnlocked: false,
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
    request_body_boundary_result: contractResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1953_component_action_request_body_boundary_contract_before_exact_request',
    ...zeroSideEffectFlags()
  };
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

function invalidRequestBodyShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['requestBodyShapeBoundary'];
  if (lane.lane !== 'request_body_shape_boundary') invalidFields.push('requestBodyShapeBoundary.lane');
  if (lane.currentStatus !== 'category_only_defined') {
    invalidFields.push('requestBodyShapeBoundary.currentStatus');
  }
  if (!ALLOWED_REQUEST_BODY_SHAPE_CATEGORIES.includes(lane.requestBodyShapeCategory)) {
    invalidFields.push('requestBodyShapeBoundary.requestBodyShapeCategory');
  }
  for (const field of [
    'concretePayloadGenerated',
    'serializedPayloadAvailable',
    'queryTextBound',
    'memoryContentBound',
    'providerPayloadBound',
    'endpointOrLocatorBound',
    'requestBodyGenerated'
  ]) {
    if (lane[field] !== false) invalidFields.push(`requestBodyShapeBoundary.${field}`);
  }
  return invalidFields;
}

function invalidRouteProbeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['routeProbeBoundary'];
  if (lane.lane !== 'component_action_route_probe_boundary') {
    invalidFields.push('routeProbeBoundary.lane');
  }
  if (lane.currentStatus !== 'not_authorized') invalidFields.push('routeProbeBoundary.currentStatus');
  if (lane.futureExactApprovalRequired !== true) {
    invalidFields.push('routeProbeBoundary.futureExactApprovalRequired');
  }
  const expectedNumbers = {
    maxComponentActionRouteProbeAttempts: 1,
    maxNetworkCalls: 1,
    maxRuntimeCalls: 1,
    maxProcessStateInspections: 0,
    maxServiceStartAttempts: 0,
    maxServiceStopAttempts: 0,
    maxServiceRestartAttempts: 0,
    maxListenerRecheckAttempts: 0,
    responseBodyByteBudget: 0,
    rawErrorPayloadBudget: 0,
    logReadBudget: 0
  };
  for (const [field, expected] of Object.entries(expectedNumbers)) {
    if (lane[field] !== expected) invalidFields.push(`routeProbeBoundary.${field}`);
  }
  for (const field of ['liveExecutionAllowedNow', 'componentActionRouteProbeAllowedNow']) {
    if (lane[field] !== false) invalidFields.push(`routeProbeBoundary.${field}`);
  }
  return invalidFields;
}

function invalidOutputProjectionFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['outputProjectionBoundary'];
  if (lane.lane !== 'output_projection_boundary') invalidFields.push('outputProjectionBoundary.lane');
  if (lane.currentStatus !== 'category_only') invalidFields.push('outputProjectionBoundary.currentStatus');
  if (!ALLOWED_OUTPUT_PROJECTION_CATEGORIES.includes(lane.projectionCategory)) {
    invalidFields.push('outputProjectionBoundary.projectionCategory');
  }
  for (const field of [
    'concreteRequestBodyAllowed',
    'rawResponseBodyAllowed',
    'rawErrorPayloadAllowed',
    'responseShapeKeysAllowed',
    'memoryIdsAllowed',
    'rawMemoryTextAllowed',
    'endpointLocatorAllowed',
    'configEnvAllowed',
    'tokenSecretAllowed',
    'logsStdoutStderrAllowed',
    'approvalLineAllowed'
  ]) {
    if (lane[field] !== false) invalidFields.push(`outputProjectionBoundary.${field}`);
  }
  return invalidFields;
}

function invalidReadShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['readShapeSeparation'];
  if (lane.lane !== 'read_shape_separation') invalidFields.push('readShapeSeparation.lane');
  if (lane.currentStatus !== 'locked') invalidFields.push('readShapeSeparation.currentStatus');
  for (const field of ['routeProbeMayReadShape', 'routeProbeMayReadMemoryContent', 'readShapeUnlocked']) {
    if (lane[field] !== false) invalidFields.push(`readShapeSeparation.${field}`);
  }
  if (lane.separateExactApprovalRequired !== true) {
    invalidFields.push('readShapeSeparation.separateExactApprovalRequired');
  }
  return invalidFields;
}

function invalidApprovalBoundaryFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['approvalBoundary'];
  if (lane.lane !== 'approval_boundary') invalidFields.push('approvalBoundary.lane');
  if (lane.nextExactApprovalRequired !== true) {
    invalidFields.push('approvalBoundary.nextExactApprovalRequired');
  }
  for (const field of [
    'approvalLineGenerated',
    'requestBodyGenerated',
    'liveExecutionAllowedNow',
    'componentActionRouteProbeAllowedNow',
    'readShapeIncluded',
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
    ...invalidComponentActionFields(input.componentActionBinding, input.targetReferenceName),
    ...invalidRequestBodyShapeFields(input.requestBodyShapeBoundary),
    ...invalidRouteProbeFields(input.routeProbeBoundary),
    ...invalidOutputProjectionFields(input.outputProjectionBoundary),
    ...invalidReadShapeFields(input.readShapeSeparation),
    ...invalidApprovalBoundaryFields(input.approvalBoundary)
  ];
}

function unknownFields(input) {
  return [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input.componentActionBinding, ALLOWED_COMPONENT_ACTION_FIELDS, 'componentActionBinding'),
    ...collectUnknownFields(
      input.requestBodyShapeBoundary,
      ALLOWED_REQUEST_BODY_SHAPE_FIELDS,
      'requestBodyShapeBoundary'
    ),
    ...collectUnknownFields(input.routeProbeBoundary, ALLOWED_ROUTE_PROBE_FIELDS, 'routeProbeBoundary'),
    ...collectUnknownFields(
      input.outputProjectionBoundary,
      ALLOWED_OUTPUT_PROJECTION_FIELDS,
      'outputProjectionBoundary'
    ),
    ...collectUnknownFields(input.readShapeSeparation, ALLOWED_READ_SHAPE_FIELDS, 'readShapeSeparation'),
    ...collectUnknownFields(input.approvalBoundary, ALLOWED_APPROVAL_BOUNDARY_FIELDS, 'approvalBoundary')
  ];
}

function buildVcpNativeComponentActionRequestBodyBoundaryContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_COMPONENT_ACTION_FIELDS, input.componentActionBinding, 'componentActionBinding'),
    ...missingFields(
      REQUIRED_REQUEST_BODY_SHAPE_FIELDS,
      input.requestBodyShapeBoundary,
      'requestBodyShapeBoundary'
    ),
    ...missingFields(REQUIRED_ROUTE_PROBE_FIELDS, input.routeProbeBoundary, 'routeProbeBoundary'),
    ...missingFields(
      REQUIRED_OUTPUT_PROJECTION_FIELDS,
      input.outputProjectionBoundary,
      'outputProjectionBoundary'
    ),
    ...missingFields(REQUIRED_READ_SHAPE_FIELDS, input.readShapeSeparation, 'readShapeSeparation'),
    ...missingFields(REQUIRED_APPROVAL_BOUNDARY_FIELDS, input.approvalBoundary, 'approvalBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_component_action_request_body_boundary_fields', input, {
      missingFields: missing
    });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_component_action_request_body_boundary_material', input, { forbiddenFields });
  }

  const unknown = unknownFields(input);
  if (unknown.length > 0) {
    return rejected('unknown_component_action_request_body_boundary_fields_not_allowed', input, {
      unknownFields: unknown
    });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_component_action_request_body_boundary_counters', input, {
      forbiddenCounters
    });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_component_action_request_body_boundary_contract', input, { invalidFields: invalid });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    componentActionRequestBodyBoundaryContractLocked: true,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unknownFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    request_body_boundary_result: contractResult({
      accepted: true,
      targetReferenceKnown: true,
      componentActionIdentifiersKnown: true,
      requestBodyShapeBoundaryDefined: true,
      futureExactApprovalRequired: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1954_component_action_route_probe_exact_approval_request_packet_non_authorizing',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  buildVcpNativeComponentActionRequestBodyBoundaryContract
};
