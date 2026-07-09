'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeStartupListenerRecoveryContract';
const CONTRACT_MODE = 'low_disclosure_startup_listener_recovery_contract_no_live_call';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'runtimeProcessStateBucket',
  'serviceStartupListenerRecovery',
  'targetSafeReferenceBinding',
  'serviceListenerRecheck',
  'transportWrapperShape',
  'approvalBoundary',
  'counters'
]);

const REQUIRED_RUNTIME_PROCESS_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequired',
  'processCountBucket',
  'processCountBucketDisclosed',
  'runningCategoryKnown',
  'processIdentifiersDisclosed',
  'commandLineRead',
  'envRead',
  'configRead',
  'logsRead',
  'requiresExactApproval'
]);

const REQUIRED_SERVICE_RECOVERY_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'serviceStartAllowedNow',
  'runtimeStarted',
  'runtimeStopped',
  'runtimeRestarted',
  'startAttemptCategory',
  'startResultCategory',
  'durationBucket',
  'postStartListenerStatusCategory',
  'stdoutStderrRead',
  'configEnvRead',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'startupPersistenceChanged',
  'dependencyChanged',
  'requiresExactApproval'
]);

const REQUIRED_SAFE_REFERENCE_FIELDS = Object.freeze([
  'lane',
  'targetReferenceName',
  'currentStatus',
  'bindingCategory',
  'locatorValueDisclosed',
  'endpointDisclosed',
  'configPathDisclosed',
  'envValueRead',
  'tokenRead',
  'requiresExactApprovalForConcreteLocator'
]);

const REQUIRED_LISTENER_RECHECK_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'listenerRecheckAllowedNow',
  'maxFutureRecheckAttemptsCategory',
  'requestBodyGenerated',
  'responseBodyRead',
  'rawErrorPayloadRead',
  'statusCategory',
  'statusClassKnown',
  'durationBucket',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'requiresExactApproval'
]);

const REQUIRED_WRAPPER_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'wrapperShapeCategory',
  'writeBudgetZero',
  'bodyBudgetZero',
  'requestBodyGenerated',
  'responseBodyRead',
  'rawErrorPayloadRead',
  'liveBehaviorProven'
]);

const REQUIRED_APPROVAL_BOUNDARY_FIELDS = Object.freeze([
  'lane',
  'nextExactApprovalRequired',
  'approvalLineGenerated',
  'requestBodyGenerated',
  'liveExecutionAllowedNow',
  'componentActionProbeIncluded',
  'readShapeIncluded',
  'readinessClaim'
]);

const ALLOWED_PROCESS_COUNT_BUCKETS = Object.freeze([
  'not_checked',
  'unknown'
]);

const ALLOWED_START_ATTEMPT_CATEGORIES = Object.freeze([
  'not_attempted'
]);

const ALLOWED_START_RESULT_CATEGORIES = Object.freeze([
  'not_attempted',
  'unknown'
]);

const ALLOWED_DURATION_BUCKETS = Object.freeze([
  'not_measured',
  'unknown'
]);

const ALLOWED_POST_START_LISTENER_STATUS_CATEGORIES = Object.freeze([
  'not_checked',
  'unknown'
]);

const ALLOWED_BINDING_CATEGORIES = Object.freeze([
  'reference_name_only',
  'reference_present_category_only',
  'unknown'
]);

const ALLOWED_LISTENER_STATUS_CATEGORIES = Object.freeze([
  'not_checked',
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
  processIdentifierDisclosures: 0,
  commandLineReads: 0,
  endpointDisclosures: 0,
  locatorValueDisclosures: 0,
  configEnvReads: 0,
  secretReads: 0,
  logReads: 0,
  stdoutStderrReads: 0,
  responseBodiesRead: 0,
  rawErrorPayloadsRead: 0,
  requestBodiesGenerated: 0,
  approvalLineOperations: 0,
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
  'providerPayload',
  'pid',
  'processId',
  'processIdentifier',
  'command',
  'commandLine',
  'curl',
  'listenerPayload',
  'startupCommand'
]);

const ALLOWED_TOP_LEVEL_FIELDS = Object.freeze(REQUIRED_TOP_LEVEL_FIELDS);
const ALLOWED_RUNTIME_PROCESS_FIELDS = Object.freeze(REQUIRED_RUNTIME_PROCESS_FIELDS);
const ALLOWED_SERVICE_RECOVERY_FIELDS = Object.freeze(REQUIRED_SERVICE_RECOVERY_FIELDS);
const ALLOWED_SAFE_REFERENCE_FIELDS = Object.freeze(REQUIRED_SAFE_REFERENCE_FIELDS);
const ALLOWED_LISTENER_RECHECK_FIELDS = Object.freeze(REQUIRED_LISTENER_RECHECK_FIELDS);
const ALLOWED_WRAPPER_SHAPE_FIELDS = Object.freeze(REQUIRED_WRAPPER_SHAPE_FIELDS);
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

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      targetReferenceName: null
    };
  }
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null
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
    processIdentifierDisclosed: false,
    commandLineRead: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    configEnvRead: false,
    secretRead: false,
    logRead: false,
    stdoutStderrRead: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    runtimeBindingChanged: false,
    configStartupWatchdogChanged: false,
    dependencyChanged: false,
    publicMcpExpanded: false,
    approvalLineGenerated: false,
    readinessClaimed: false
  };
}

function recoveryResult(overrides = {}) {
  return {
    accepted: false,
    runtimeProcessStateKnown: false,
    processCountBucketDisclosed: false,
    runningCategoryKnown: false,
    serviceStartupRecoveryAuthorizedNow: false,
    serviceStartAttempted: false,
    listenerRecheckAuthorizedNow: false,
    listenerRecheckAttempted: false,
    targetReferenceKnown: false,
    targetLocatorBindingKnown: false,
    locatorValueDisclosed: false,
    endpointDisclosed: false,
    transportWrapperShapeLocked: false,
    transportWrapperLiveProofKnown: false,
    componentActionStatusProbeUnlocked: false,
    readShapeUnlocked: false,
    nextLiveRecoveryRequiresExactApproval: true,
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
    recovery_result: recoveryResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1935_startup_listener_recovery_contract_before_exact_request',
    ...zeroSideEffectFlags()
  };
}

function invalidRuntimeProcessFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['runtimeProcessStateBucket'];
  if (lane.lane !== 'runtime_process_state_bucket') invalidFields.push('runtimeProcessStateBucket.lane');
  if (lane.currentStatus !== 'unknown') invalidFields.push('runtimeProcessStateBucket.currentStatus');
  if (lane.liveRequired !== true) invalidFields.push('runtimeProcessStateBucket.liveRequired');
  if (!ALLOWED_PROCESS_COUNT_BUCKETS.includes(lane.processCountBucket)) {
    invalidFields.push('runtimeProcessStateBucket.processCountBucket');
  }
  if (lane.processCountBucketDisclosed !== false) {
    invalidFields.push('runtimeProcessStateBucket.processCountBucketDisclosed');
  }
  if (lane.runningCategoryKnown !== false) {
    invalidFields.push('runtimeProcessStateBucket.runningCategoryKnown');
  }
  for (const field of [
    'processIdentifiersDisclosed',
    'commandLineRead',
    'envRead',
    'configRead',
    'logsRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`runtimeProcessStateBucket.${field}`);
  }
  if (lane.requiresExactApproval !== true) {
    invalidFields.push('runtimeProcessStateBucket.requiresExactApproval');
  }
  return invalidFields;
}

function invalidServiceRecoveryFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['serviceStartupListenerRecovery'];
  if (lane.lane !== 'service_startup_listener_recovery') {
    invalidFields.push('serviceStartupListenerRecovery.lane');
  }
  if (lane.currentStatus !== 'not_authorized') {
    invalidFields.push('serviceStartupListenerRecovery.currentStatus');
  }
  for (const field of [
    'serviceStartAllowedNow',
    'runtimeStarted',
    'runtimeStopped',
    'runtimeRestarted',
    'stdoutStderrRead',
    'configEnvRead',
    'endpointDisclosed',
    'locatorValueDisclosed',
    'startupPersistenceChanged',
    'dependencyChanged'
  ]) {
    if (lane[field] !== false) invalidFields.push(`serviceStartupListenerRecovery.${field}`);
  }
  if (!ALLOWED_START_ATTEMPT_CATEGORIES.includes(lane.startAttemptCategory)) {
    invalidFields.push('serviceStartupListenerRecovery.startAttemptCategory');
  }
  if (!ALLOWED_START_RESULT_CATEGORIES.includes(lane.startResultCategory)) {
    invalidFields.push('serviceStartupListenerRecovery.startResultCategory');
  }
  if (!ALLOWED_DURATION_BUCKETS.includes(lane.durationBucket)) {
    invalidFields.push('serviceStartupListenerRecovery.durationBucket');
  }
  if (!ALLOWED_POST_START_LISTENER_STATUS_CATEGORIES.includes(lane.postStartListenerStatusCategory)) {
    invalidFields.push('serviceStartupListenerRecovery.postStartListenerStatusCategory');
  }
  if (lane.requiresExactApproval !== true) {
    invalidFields.push('serviceStartupListenerRecovery.requiresExactApproval');
  }
  return invalidFields;
}

function invalidSafeReferenceFields(lane, topLevelTargetReferenceName) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['targetSafeReferenceBinding'];
  if (lane.lane !== 'target_safe_reference_binding') invalidFields.push('targetSafeReferenceBinding.lane');
  if (!isSafeReferenceName(lane.targetReferenceName)) {
    invalidFields.push('targetSafeReferenceBinding.targetReferenceName');
  }
  if (lane.targetReferenceName !== topLevelTargetReferenceName) {
    invalidFields.push('targetSafeReferenceBinding.targetReferenceName');
  }
  if (lane.currentStatus !== 'reference_name_only') {
    invalidFields.push('targetSafeReferenceBinding.currentStatus');
  }
  if (!ALLOWED_BINDING_CATEGORIES.includes(lane.bindingCategory)) {
    invalidFields.push('targetSafeReferenceBinding.bindingCategory');
  }
  for (const field of [
    'locatorValueDisclosed',
    'endpointDisclosed',
    'configPathDisclosed',
    'envValueRead',
    'tokenRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`targetSafeReferenceBinding.${field}`);
  }
  if (lane.requiresExactApprovalForConcreteLocator !== true) {
    invalidFields.push('targetSafeReferenceBinding.requiresExactApprovalForConcreteLocator');
  }
  return invalidFields;
}

function invalidListenerRecheckFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['serviceListenerRecheck'];
  if (lane.lane !== 'service_listener_recheck') invalidFields.push('serviceListenerRecheck.lane');
  if (lane.currentStatus !== 'not_authorized') invalidFields.push('serviceListenerRecheck.currentStatus');
  if (lane.listenerRecheckAllowedNow !== false) {
    invalidFields.push('serviceListenerRecheck.listenerRecheckAllowedNow');
  }
  if (lane.maxFutureRecheckAttemptsCategory !== 'one_only_after_exact_approval') {
    invalidFields.push('serviceListenerRecheck.maxFutureRecheckAttemptsCategory');
  }
  for (const field of [
    'requestBodyGenerated',
    'responseBodyRead',
    'rawErrorPayloadRead',
    'endpointDisclosed',
    'locatorValueDisclosed'
  ]) {
    if (lane[field] !== false) invalidFields.push(`serviceListenerRecheck.${field}`);
  }
  if (!ALLOWED_LISTENER_STATUS_CATEGORIES.includes(lane.statusCategory)) {
    invalidFields.push('serviceListenerRecheck.statusCategory');
  }
  if (lane.statusClassKnown !== false) invalidFields.push('serviceListenerRecheck.statusClassKnown');
  if (!ALLOWED_DURATION_BUCKETS.includes(lane.durationBucket)) {
    invalidFields.push('serviceListenerRecheck.durationBucket');
  }
  if (lane.requiresExactApproval !== true) {
    invalidFields.push('serviceListenerRecheck.requiresExactApproval');
  }
  return invalidFields;
}

function invalidWrapperShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['transportWrapperShape'];
  if (lane.lane !== 'transport_wrapper_shape') invalidFields.push('transportWrapperShape.lane');
  if (lane.currentStatus !== 'source_intended_live_unproven') {
    invalidFields.push('transportWrapperShape.currentStatus');
  }
  if (lane.wrapperShapeCategory !== 'no_body_no_request_listener_transport') {
    invalidFields.push('transportWrapperShape.wrapperShapeCategory');
  }
  if (lane.writeBudgetZero !== true) invalidFields.push('transportWrapperShape.writeBudgetZero');
  if (lane.bodyBudgetZero !== true) invalidFields.push('transportWrapperShape.bodyBudgetZero');
  for (const field of [
    'requestBodyGenerated',
    'responseBodyRead',
    'rawErrorPayloadRead',
    'liveBehaviorProven'
  ]) {
    if (lane[field] !== false) invalidFields.push(`transportWrapperShape.${field}`);
  }
  return invalidFields;
}

function invalidApprovalBoundaryFields(boundary) {
  const invalidFields = [];
  if (!isPlainObject(boundary)) return ['approvalBoundary'];
  if (boundary.lane !== 'approval_boundary') invalidFields.push('approvalBoundary.lane');
  if (boundary.nextExactApprovalRequired !== true) {
    invalidFields.push('approvalBoundary.nextExactApprovalRequired');
  }
  for (const field of [
    'approvalLineGenerated',
    'requestBodyGenerated',
    'liveExecutionAllowedNow',
    'componentActionProbeIncluded',
    'readShapeIncluded',
    'readinessClaim'
  ]) {
    if (boundary[field] !== false) invalidFields.push(`approvalBoundary.${field}`);
  }
  return invalidFields;
}

function invalidFields(input) {
  return [
    ...(input.schemaVersion !== SCHEMA_VERSION ? ['schemaVersion'] : []),
    ...(!isSafeReferenceName(input.taskId) ? ['taskId'] : []),
    ...(!isSafeReferenceName(input.targetReferenceName) ? ['targetReferenceName'] : []),
    ...invalidRuntimeProcessFields(input.runtimeProcessStateBucket),
    ...invalidServiceRecoveryFields(input.serviceStartupListenerRecovery),
    ...invalidSafeReferenceFields(input.targetSafeReferenceBinding, input.targetReferenceName),
    ...invalidListenerRecheckFields(input.serviceListenerRecheck),
    ...invalidWrapperShapeFields(input.transportWrapperShape),
    ...invalidApprovalBoundaryFields(input.approvalBoundary)
  ];
}

function buildVcpNativeStartupListenerRecoveryContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_RUNTIME_PROCESS_FIELDS, input.runtimeProcessStateBucket, 'runtimeProcessStateBucket'),
    ...missingFields(REQUIRED_SERVICE_RECOVERY_FIELDS, input.serviceStartupListenerRecovery, 'serviceStartupListenerRecovery'),
    ...missingFields(REQUIRED_SAFE_REFERENCE_FIELDS, input.targetSafeReferenceBinding, 'targetSafeReferenceBinding'),
    ...missingFields(REQUIRED_LISTENER_RECHECK_FIELDS, input.serviceListenerRecheck, 'serviceListenerRecheck'),
    ...missingFields(REQUIRED_WRAPPER_SHAPE_FIELDS, input.transportWrapperShape, 'transportWrapperShape'),
    ...missingFields(REQUIRED_APPROVAL_BOUNDARY_FIELDS, input.approvalBoundary, 'approvalBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_startup_listener_recovery_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_startup_listener_recovery_material', input, { forbiddenFields });
  }

  const unknownFields = [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input.runtimeProcessStateBucket, ALLOWED_RUNTIME_PROCESS_FIELDS, 'runtimeProcessStateBucket'),
    ...collectUnknownFields(input.serviceStartupListenerRecovery, ALLOWED_SERVICE_RECOVERY_FIELDS, 'serviceStartupListenerRecovery'),
    ...collectUnknownFields(input.targetSafeReferenceBinding, ALLOWED_SAFE_REFERENCE_FIELDS, 'targetSafeReferenceBinding'),
    ...collectUnknownFields(input.serviceListenerRecheck, ALLOWED_LISTENER_RECHECK_FIELDS, 'serviceListenerRecheck'),
    ...collectUnknownFields(input.transportWrapperShape, ALLOWED_WRAPPER_SHAPE_FIELDS, 'transportWrapperShape'),
    ...collectUnknownFields(input.approvalBoundary, ALLOWED_APPROVAL_BOUNDARY_FIELDS, 'approvalBoundary')
  ];
  if (unknownFields.length > 0) {
    return rejected('unknown_startup_listener_recovery_fields_not_allowed', input, { unknownFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_startup_listener_recovery_counters', input, { forbiddenCounters });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_startup_listener_recovery_contract', input, { invalidFields: invalid });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    recoveryContractLocked: true,
    recovery_result: recoveryResult({
      accepted: true,
      targetReferenceKnown: true,
      transportWrapperShapeLocked: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1936_prepare_exact_approval_request_for_startup_listener_recovery_after_cm1935',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  ALLOWED_BINDING_CATEGORIES,
  ALLOWED_DURATION_BUCKETS,
  ALLOWED_LISTENER_STATUS_CATEGORIES,
  ALLOWED_PROCESS_COUNT_BUCKETS,
  ALLOWED_START_ATTEMPT_CATEGORIES,
  ALLOWED_START_RESULT_CATEGORIES,
  ALLOWED_POST_START_LISTENER_STATUS_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_APPROVAL_BOUNDARY_FIELDS,
  REQUIRED_LISTENER_RECHECK_FIELDS,
  REQUIRED_RUNTIME_PROCESS_FIELDS,
  REQUIRED_SAFE_REFERENCE_FIELDS,
  REQUIRED_SERVICE_RECOVERY_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  REQUIRED_WRAPPER_SHAPE_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeStartupListenerRecoveryContract
};
