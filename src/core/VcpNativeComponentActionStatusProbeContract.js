'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeComponentActionStatusProbeContract';
const CONTRACT_MODE = 'low_disclosure_component_action_status_probe_contract_no_live_call';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'targetSafeReferenceBinding',
  'componentActionIdentifierBinding',
  'statusProbeShape',
  'routeOutcomeReceipt',
  'readShapeSeparation',
  'approvalBoundary',
  'counters'
]);

const REQUIRED_SAFE_REFERENCE_FIELDS = Object.freeze([
  'lane',
  'targetReferenceName',
  'currentStatus',
  'safeReferenceBindingCategory',
  'listenerLevelReachabilityAccepted',
  'locatorValueDisclosed',
  'endpointDisclosed',
  'configPathOrValueDisclosed',
  'envValueRead',
  'tokenRead'
]);

const REQUIRED_IDENTIFIER_FIELDS = Object.freeze([
  'lane',
  'component',
  'action',
  'currentStatus',
  'identifierBindingCategory',
  'sourceOrManifestAliasCategory',
  'rawPluginConfigRead',
  'privateMemoryContentRead',
  'requestBodyGenerated',
  'providerPayloadRead'
]);

const REQUIRED_STATUS_PROBE_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'probeShapeCategory',
  'routeStatusProjectionOnly',
  'requestBodyGenerated',
  'responseBodyBudgetZero',
  'responseBodyRead',
  'rawErrorPayloadRead',
  'logRead',
  'configEnvRead',
  'secretRead',
  'requiresExactApprovalForLiveProbe'
]);

const REQUIRED_ROUTE_OUTCOME_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'allowedCategory',
  'routeStatusKnown',
  'responseBodyRead',
  'rawErrorPayloadRead',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'memoryIdsDisclosed',
  'rawMemoryTextRead',
  'approvalLineGenerated',
  'stdoutStderrLogRead'
]);

const REQUIRED_READ_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'statusProbeMayInspectResponseShape',
  'statusProbeMayReadMemoryContent',
  'readShapeUnlocked',
  'separateExactApprovalRequired'
]);

const REQUIRED_APPROVAL_BOUNDARY_FIELDS = Object.freeze([
  'lane',
  'nextExactApprovalRequired',
  'approvalLineGenerated',
  'requestBodyGenerated',
  'liveExecutionAllowedNow',
  'componentActionProbeExecutionAllowedNow',
  'readShapeIncluded',
  'readinessClaim'
]);

const ALLOWED_SAFE_REFERENCE_CATEGORIES = Object.freeze([
  'reference_name_only',
  'listener_level_reachable_reference_only',
  'safe_reference_binding_category_only'
]);

const ALLOWED_IDENTIFIER_CATEGORIES = Object.freeze([
  'safe_identifiers_known',
  'source_alias_only',
  'manifest_source_alias_only'
]);

const ALLOWED_ALIAS_CATEGORIES = Object.freeze([
  'source_alias_only',
  'manifest_source_alias_only',
  'safe_identifier_only'
]);

const ALLOWED_PROBE_SHAPE_CATEGORIES = Object.freeze([
  'status_only_no_request_body',
  'route_status_projection_only',
  'boundary_blocked_until_exact_approval'
]);

const ALLOWED_ROUTE_OUTCOME_CATEGORIES = Object.freeze([
  'not_defined',
  'routed_status_known',
  'not_routed',
  'boundary_blocked',
  'request_body_required_boundary_blocked',
  'transport_error',
  'unknown'
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
  requestBodiesGenerated: 0,
  approvalLineOperations: 0,
  componentActionProbeExecutions: 0,
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
  'responseBody',
  'rawResponseBody',
  'responsePayload',
  'rawPayload',
  'rawOutput',
  'rawErrorPayload',
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

const ALLOWED_TOP_LEVEL_FIELDS = Object.freeze(REQUIRED_TOP_LEVEL_FIELDS);
const ALLOWED_SAFE_REFERENCE_FIELDS = Object.freeze(REQUIRED_SAFE_REFERENCE_FIELDS);
const ALLOWED_IDENTIFIER_FIELDS = Object.freeze(REQUIRED_IDENTIFIER_FIELDS);
const ALLOWED_STATUS_PROBE_SHAPE_FIELDS = Object.freeze(REQUIRED_STATUS_PROBE_SHAPE_FIELDS);
const ALLOWED_ROUTE_OUTCOME_FIELDS = Object.freeze(REQUIRED_ROUTE_OUTCOME_FIELDS);
const ALLOWED_READ_SHAPE_FIELDS = Object.freeze(REQUIRED_READ_SHAPE_FIELDS);
const ALLOWED_APPROVAL_BOUNDARY_FIELDS = Object.freeze(REQUIRED_APPROVAL_BOUNDARY_FIELDS);

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
      action: null
    };
  }
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null,
    component: isAllowedComponent(input.componentActionIdentifierBinding?.component)
      ? input.componentActionIdentifierBinding.component
      : null,
    action: isAllowedAction(input.componentActionIdentifierBinding?.action)
      ? input.componentActionIdentifierBinding.action
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
    requestBodyGenerated: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    rawPluginConfigRead: false,
    privateMemoryContentRead: false,
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
    componentActionProbeExecuted: false,
    readShapeProofPerformed: false,
    readinessClaimed: false
  };
}

function probeResult(overrides = {}) {
  return {
    accepted: false,
    targetReferenceKnown: false,
    listenerLevelReachabilityAccepted: false,
    componentActionIdentifiersKnown: false,
    componentActionIdentifierBindingKnown: false,
    statusProbeShapeContracted: false,
    routeOutcomeReceiptLocked: false,
    requestBodyGenerated: false,
    responseBodyReadAllowed: false,
    rawErrorPayloadReadAllowed: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    componentActionStatusProbeExecutionAllowedNow: false,
    readShapeUnlocked: false,
    exactApprovalRequiredBeforeLiveProbe: true,
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
    probe_result: probeResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1947_component_action_status_probe_contract_before_exact_request',
    ...zeroSideEffectFlags()
  };
}

function invalidSafeReferenceFields(lane, topLevelTargetReferenceName) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['targetSafeReferenceBinding'];
  if (lane.lane !== 'target_safe_reference_binding') {
    invalidFields.push('targetSafeReferenceBinding.lane');
  }
  if (!isSafeReferenceName(lane.targetReferenceName)) {
    invalidFields.push('targetSafeReferenceBinding.targetReferenceName');
  }
  if (lane.targetReferenceName !== topLevelTargetReferenceName) {
    invalidFields.push('targetSafeReferenceBinding.targetReferenceName');
  }
  if (lane.currentStatus !== 'listener_level_reachable_by_cm1944') {
    invalidFields.push('targetSafeReferenceBinding.currentStatus');
  }
  if (!ALLOWED_SAFE_REFERENCE_CATEGORIES.includes(lane.safeReferenceBindingCategory)) {
    invalidFields.push('targetSafeReferenceBinding.safeReferenceBindingCategory');
  }
  if (lane.listenerLevelReachabilityAccepted !== true) {
    invalidFields.push('targetSafeReferenceBinding.listenerLevelReachabilityAccepted');
  }
  for (const field of [
    'locatorValueDisclosed',
    'endpointDisclosed',
    'configPathOrValueDisclosed',
    'envValueRead',
    'tokenRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`targetSafeReferenceBinding.${field}`);
  }
  return invalidFields;
}

function invalidIdentifierFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['componentActionIdentifierBinding'];
  if (lane.lane !== 'component_action_identifier_binding') {
    invalidFields.push('componentActionIdentifierBinding.lane');
  }
  if (!isAllowedComponent(lane.component)) invalidFields.push('componentActionIdentifierBinding.component');
  if (!isAllowedAction(lane.action)) invalidFields.push('componentActionIdentifierBinding.action');
  if (lane.currentStatus !== 'safe_identifiers_known') {
    invalidFields.push('componentActionIdentifierBinding.currentStatus');
  }
  if (!ALLOWED_IDENTIFIER_CATEGORIES.includes(lane.identifierBindingCategory)) {
    invalidFields.push('componentActionIdentifierBinding.identifierBindingCategory');
  }
  if (!ALLOWED_ALIAS_CATEGORIES.includes(lane.sourceOrManifestAliasCategory)) {
    invalidFields.push('componentActionIdentifierBinding.sourceOrManifestAliasCategory');
  }
  for (const field of [
    'rawPluginConfigRead',
    'privateMemoryContentRead',
    'requestBodyGenerated',
    'providerPayloadRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`componentActionIdentifierBinding.${field}`);
  }
  return invalidFields;
}

function invalidStatusProbeShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['statusProbeShape'];
  if (lane.lane !== 'status_probe_shape') invalidFields.push('statusProbeShape.lane');
  if (lane.currentStatus !== 'contracted_no_live') invalidFields.push('statusProbeShape.currentStatus');
  if (!ALLOWED_PROBE_SHAPE_CATEGORIES.includes(lane.probeShapeCategory)) {
    invalidFields.push('statusProbeShape.probeShapeCategory');
  }
  if (lane.routeStatusProjectionOnly !== true) {
    invalidFields.push('statusProbeShape.routeStatusProjectionOnly');
  }
  if (lane.responseBodyBudgetZero !== true) {
    invalidFields.push('statusProbeShape.responseBodyBudgetZero');
  }
  for (const field of [
    'requestBodyGenerated',
    'responseBodyRead',
    'rawErrorPayloadRead',
    'logRead',
    'configEnvRead',
    'secretRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`statusProbeShape.${field}`);
  }
  if (lane.requiresExactApprovalForLiveProbe !== true) {
    invalidFields.push('statusProbeShape.requiresExactApprovalForLiveProbe');
  }
  return invalidFields;
}

function invalidRouteOutcomeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['routeOutcomeReceipt'];
  if (lane.lane !== 'route_outcome_receipt') invalidFields.push('routeOutcomeReceipt.lane');
  if (lane.currentStatus !== 'locked_low_disclosure_categories') {
    invalidFields.push('routeOutcomeReceipt.currentStatus');
  }
  if (!ALLOWED_ROUTE_OUTCOME_CATEGORIES.includes(lane.allowedCategory)) {
    invalidFields.push('routeOutcomeReceipt.allowedCategory');
  }
  if (lane.routeStatusKnown !== false) invalidFields.push('routeOutcomeReceipt.routeStatusKnown');
  for (const field of [
    'responseBodyRead',
    'rawErrorPayloadRead',
    'endpointDisclosed',
    'locatorValueDisclosed',
    'memoryIdsDisclosed',
    'rawMemoryTextRead',
    'approvalLineGenerated',
    'stdoutStderrLogRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`routeOutcomeReceipt.${field}`);
  }
  return invalidFields;
}

function invalidReadShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['readShapeSeparation'];
  if (lane.lane !== 'read_shape_separation') invalidFields.push('readShapeSeparation.lane');
  if (lane.currentStatus !== 'separate_later_route') invalidFields.push('readShapeSeparation.currentStatus');
  for (const field of [
    'statusProbeMayInspectResponseShape',
    'statusProbeMayReadMemoryContent',
    'readShapeUnlocked'
  ]) {
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
    'componentActionProbeExecutionAllowedNow',
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
    ...invalidSafeReferenceFields(input.targetSafeReferenceBinding, input.targetReferenceName),
    ...invalidIdentifierFields(input.componentActionIdentifierBinding),
    ...invalidStatusProbeShapeFields(input.statusProbeShape),
    ...invalidRouteOutcomeFields(input.routeOutcomeReceipt),
    ...invalidReadShapeFields(input.readShapeSeparation),
    ...invalidApprovalBoundaryFields(input.approvalBoundary)
  ];
}

function unknownFields(input) {
  return [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(
      input.targetSafeReferenceBinding,
      ALLOWED_SAFE_REFERENCE_FIELDS,
      'targetSafeReferenceBinding'
    ),
    ...collectUnknownFields(
      input.componentActionIdentifierBinding,
      ALLOWED_IDENTIFIER_FIELDS,
      'componentActionIdentifierBinding'
    ),
    ...collectUnknownFields(input.statusProbeShape, ALLOWED_STATUS_PROBE_SHAPE_FIELDS, 'statusProbeShape'),
    ...collectUnknownFields(input.routeOutcomeReceipt, ALLOWED_ROUTE_OUTCOME_FIELDS, 'routeOutcomeReceipt'),
    ...collectUnknownFields(input.readShapeSeparation, ALLOWED_READ_SHAPE_FIELDS, 'readShapeSeparation'),
    ...collectUnknownFields(input.approvalBoundary, ALLOWED_APPROVAL_BOUNDARY_FIELDS, 'approvalBoundary')
  ];
}

function buildVcpNativeComponentActionStatusProbeContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SAFE_REFERENCE_FIELDS, input.targetSafeReferenceBinding, 'targetSafeReferenceBinding'),
    ...missingFields(
      REQUIRED_IDENTIFIER_FIELDS,
      input.componentActionIdentifierBinding,
      'componentActionIdentifierBinding'
    ),
    ...missingFields(REQUIRED_STATUS_PROBE_SHAPE_FIELDS, input.statusProbeShape, 'statusProbeShape'),
    ...missingFields(REQUIRED_ROUTE_OUTCOME_FIELDS, input.routeOutcomeReceipt, 'routeOutcomeReceipt'),
    ...missingFields(REQUIRED_READ_SHAPE_FIELDS, input.readShapeSeparation, 'readShapeSeparation'),
    ...missingFields(REQUIRED_APPROVAL_BOUNDARY_FIELDS, input.approvalBoundary, 'approvalBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_component_action_status_probe_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_component_action_status_probe_material', input, { forbiddenFields });
  }

  const unknown = unknownFields(input);
  if (unknown.length > 0) {
    return rejected('unknown_component_action_status_probe_fields_not_allowed', input, { unknownFields: unknown });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_component_action_status_probe_counters', input, { forbiddenCounters });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_component_action_status_probe_contract', input, { invalidFields: invalid });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    componentActionStatusProbeContractLocked: true,
    probe_result: probeResult({
      accepted: true,
      targetReferenceKnown: true,
      listenerLevelReachabilityAccepted: true,
      componentActionIdentifiersKnown: true,
      componentActionIdentifierBindingKnown: true,
      statusProbeShapeContracted: true,
      routeOutcomeReceiptLocked: true,
      requestBodyGenerated: false,
      responseBodyReadAllowed: false,
      rawErrorPayloadReadAllowed: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      componentActionStatusProbeExecutionAllowedNow: false,
      readShapeUnlocked: false,
      exactApprovalRequiredBeforeLiveProbe: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1948_component_action_status_probe_exact_approval_request_packet_non_authorizing',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  ALLOWED_ALIAS_CATEGORIES,
  ALLOWED_IDENTIFIER_CATEGORIES,
  ALLOWED_PROBE_SHAPE_CATEGORIES,
  ALLOWED_ROUTE_OUTCOME_CATEGORIES,
  ALLOWED_SAFE_REFERENCE_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeComponentActionStatusProbeContract
};
