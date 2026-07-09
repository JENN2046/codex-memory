'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeRuntimeStartupTargetLocatorDiagnosisContract';
const CONTRACT_MODE = 'low_disclosure_runtime_startup_target_locator_diagnosis_contract_no_live_call';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'runtimeStartupState',
  'targetLocatorBinding',
  'transportWrapperShape',
  'serviceListenerMismatch',
  'approvalPacketGap',
  'counters'
]);

const REQUIRED_RUNTIME_STARTUP_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequired',
  'processCountBucket',
  'processCountBucketDisclosed',
  'runningOrNotRunningKnown',
  'pidDisclosed',
  'commandLineRead',
  'envRead',
  'logsRead',
  'requiresExactApproval'
]);

const REQUIRED_TARGET_LOCATOR_FIELDS = Object.freeze([
  'lane',
  'targetReferenceName',
  'currentStatus',
  'liveRequired',
  'locatorPresenceCategory',
  'locatorHashPresent',
  'locatorValueDisclosed',
  'endpointDisclosed',
  'configPathDisclosed',
  'envValueRead',
  'tokenRead',
  'requiresExactApproval'
]);

const REQUIRED_WRAPPER_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'sourceOnlyWrapperPlanReview',
  'wrapperTypeCategory',
  'noWriteBudgetZero',
  'noBodyBudgetZero',
  'requestBodyGenerated',
  'responseBodyRead',
  'liveRequiredForActualProof'
]);

const REQUIRED_SERVICE_LISTENER_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequired',
  'reachableKnown',
  'statusClassKnown',
  'durationBucket',
  'endpointDisclosed',
  'routePayloadRead',
  'logsRead',
  'requiresExactApproval'
]);

const REQUIRED_APPROVAL_PACKET_GAP_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequired',
  'exactApprovalPacketNeeded',
  'exactApprovalRequiredBeforeNextLiveCall',
  'approvalLineGenerated',
  'requestBodyGenerated',
  'componentActionProbeIncluded',
  'readShapeIncluded'
]);

const ALLOWED_LOCATOR_PRESENCE_CATEGORIES = Object.freeze([
  'unknown',
  'reference_only',
  'binding_present_category_only'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  liveVcpToolBoxCalls: 0,
  networkCalls: 0,
  liveProcessInspections: 0,
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
  'routePayload'
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

  const locator = isPlainObject(input.targetLocatorBinding) ? input.targetLocatorBinding : {};
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(locator.targetReferenceName) ? locator.targetReferenceName : null
  };
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    liveProcessInspected: false,
    processIdentifierDisclosed: false,
    commandLineRead: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    configEnvRead: false,
    secretRead: false,
    logRead: false,
    stdoutRead: false,
    stderrRead: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    runtimeBindingChanged: false,
    publicMcpExpanded: false,
    approvalLineGenerated: false,
    readinessClaimed: false
  };
}

function diagnosisResult(overrides = {}) {
  return {
    accepted: false,
    runtimeStartupStateKnown: false,
    processCountBucketDisclosed: false,
    targetLocatorBindingKnown: false,
    locatorValueDisclosed: false,
    endpointDisclosed: false,
    transportWrapperShapeReviewed: false,
    transportWrapperLiveProofKnown: false,
    serviceListenerMismatchKnown: false,
    approvalPacketGapKnown: false,
    componentActionStatusProbeUnlocked: false,
    readShapeUnlocked: false,
    nextLiveDiagnosticRequiresExactApproval: true,
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
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    diagnosis_result: diagnosisResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1924_runtime_startup_target_locator_diagnosis_contract',
    ...zeroSideEffectFlags()
  };
}

function invalidRuntimeStartupFields(runtimeStartupState) {
  const invalidFields = [];
  if (!isPlainObject(runtimeStartupState)) return ['runtimeStartupState'];
  if (runtimeStartupState.lane !== 'runtime_startup_state') invalidFields.push('runtimeStartupState.lane');
  if (runtimeStartupState.currentStatus !== 'unknown') invalidFields.push('runtimeStartupState.currentStatus');
  if (runtimeStartupState.liveRequired !== true) invalidFields.push('runtimeStartupState.liveRequired');
  if (runtimeStartupState.processCountBucket !== 'unknown') {
    invalidFields.push('runtimeStartupState.processCountBucket');
  }
  if (runtimeStartupState.processCountBucketDisclosed !== false) {
    invalidFields.push('runtimeStartupState.processCountBucketDisclosed');
  }
  if (runtimeStartupState.runningOrNotRunningKnown !== false) {
    invalidFields.push('runtimeStartupState.runningOrNotRunningKnown');
  }
  if (runtimeStartupState.pidDisclosed !== false) invalidFields.push('runtimeStartupState.pidDisclosed');
  if (runtimeStartupState.commandLineRead !== false) invalidFields.push('runtimeStartupState.commandLineRead');
  if (runtimeStartupState.envRead !== false) invalidFields.push('runtimeStartupState.envRead');
  if (runtimeStartupState.logsRead !== false) invalidFields.push('runtimeStartupState.logsRead');
  if (runtimeStartupState.requiresExactApproval !== true) {
    invalidFields.push('runtimeStartupState.requiresExactApproval');
  }
  return invalidFields;
}

function invalidTargetLocatorFields(targetLocatorBinding) {
  const invalidFields = [];
  if (!isPlainObject(targetLocatorBinding)) return ['targetLocatorBinding'];
  if (targetLocatorBinding.lane !== 'target_locator_binding') invalidFields.push('targetLocatorBinding.lane');
  if (!isSafeReferenceName(targetLocatorBinding.targetReferenceName)) {
    invalidFields.push('targetLocatorBinding.targetReferenceName');
  }
  if (targetLocatorBinding.currentStatus !== 'unknown') invalidFields.push('targetLocatorBinding.currentStatus');
  if (targetLocatorBinding.liveRequired !== 'maybe') invalidFields.push('targetLocatorBinding.liveRequired');
  if (!ALLOWED_LOCATOR_PRESENCE_CATEGORIES.includes(targetLocatorBinding.locatorPresenceCategory)) {
    invalidFields.push('targetLocatorBinding.locatorPresenceCategory');
  }
  if (targetLocatorBinding.locatorHashPresent !== true) invalidFields.push('targetLocatorBinding.locatorHashPresent');
  if (targetLocatorBinding.locatorValueDisclosed !== false) {
    invalidFields.push('targetLocatorBinding.locatorValueDisclosed');
  }
  if (targetLocatorBinding.endpointDisclosed !== false) invalidFields.push('targetLocatorBinding.endpointDisclosed');
  if (targetLocatorBinding.configPathDisclosed !== false) {
    invalidFields.push('targetLocatorBinding.configPathDisclosed');
  }
  if (targetLocatorBinding.envValueRead !== false) invalidFields.push('targetLocatorBinding.envValueRead');
  if (targetLocatorBinding.tokenRead !== false) invalidFields.push('targetLocatorBinding.tokenRead');
  if (targetLocatorBinding.requiresExactApproval !== true) {
    invalidFields.push('targetLocatorBinding.requiresExactApproval');
  }
  return invalidFields;
}

function invalidWrapperShapeFields(transportWrapperShape) {
  const invalidFields = [];
  if (!isPlainObject(transportWrapperShape)) return ['transportWrapperShape'];
  if (transportWrapperShape.lane !== 'transport_wrapper_shape') invalidFields.push('transportWrapperShape.lane');
  if (transportWrapperShape.currentStatus !== 'source_reviewed_live_unproven') {
    invalidFields.push('transportWrapperShape.currentStatus');
  }
  if (transportWrapperShape.sourceOnlyWrapperPlanReview !== true) {
    invalidFields.push('transportWrapperShape.sourceOnlyWrapperPlanReview');
  }
  if (transportWrapperShape.wrapperTypeCategory !== 'vcp_native_no_write_no_body_leak_runtime_call_wrapper') {
    invalidFields.push('transportWrapperShape.wrapperTypeCategory');
  }
  if (transportWrapperShape.noWriteBudgetZero !== true) invalidFields.push('transportWrapperShape.noWriteBudgetZero');
  if (transportWrapperShape.noBodyBudgetZero !== true) invalidFields.push('transportWrapperShape.noBodyBudgetZero');
  if (transportWrapperShape.requestBodyGenerated !== false) {
    invalidFields.push('transportWrapperShape.requestBodyGenerated');
  }
  if (transportWrapperShape.responseBodyRead !== false) invalidFields.push('transportWrapperShape.responseBodyRead');
  if (transportWrapperShape.liveRequiredForActualProof !== true) {
    invalidFields.push('transportWrapperShape.liveRequiredForActualProof');
  }
  return invalidFields;
}

function invalidServiceListenerFields(serviceListenerMismatch) {
  const invalidFields = [];
  if (!isPlainObject(serviceListenerMismatch)) return ['serviceListenerMismatch'];
  if (serviceListenerMismatch.lane !== 'service_listener_mismatch') {
    invalidFields.push('serviceListenerMismatch.lane');
  }
  if (serviceListenerMismatch.currentStatus !== 'unknown') {
    invalidFields.push('serviceListenerMismatch.currentStatus');
  }
  if (serviceListenerMismatch.liveRequired !== true) invalidFields.push('serviceListenerMismatch.liveRequired');
  if (serviceListenerMismatch.reachableKnown !== false) invalidFields.push('serviceListenerMismatch.reachableKnown');
  if (serviceListenerMismatch.statusClassKnown !== false) {
    invalidFields.push('serviceListenerMismatch.statusClassKnown');
  }
  if (serviceListenerMismatch.durationBucket !== 'not_measured') {
    invalidFields.push('serviceListenerMismatch.durationBucket');
  }
  if (serviceListenerMismatch.endpointDisclosed !== false) {
    invalidFields.push('serviceListenerMismatch.endpointDisclosed');
  }
  if (serviceListenerMismatch.routePayloadRead !== false) {
    invalidFields.push('serviceListenerMismatch.routePayloadRead');
  }
  if (serviceListenerMismatch.logsRead !== false) invalidFields.push('serviceListenerMismatch.logsRead');
  if (serviceListenerMismatch.requiresExactApproval !== true) {
    invalidFields.push('serviceListenerMismatch.requiresExactApproval');
  }
  return invalidFields;
}

function invalidApprovalPacketGapFields(approvalPacketGap) {
  const invalidFields = [];
  if (!isPlainObject(approvalPacketGap)) return ['approvalPacketGap'];
  if (approvalPacketGap.lane !== 'approval_packet_gap') invalidFields.push('approvalPacketGap.lane');
  if (approvalPacketGap.currentStatus !== 'likely') invalidFields.push('approvalPacketGap.currentStatus');
  if (approvalPacketGap.liveRequired !== false) invalidFields.push('approvalPacketGap.liveRequired');
  if (approvalPacketGap.exactApprovalPacketNeeded !== true) {
    invalidFields.push('approvalPacketGap.exactApprovalPacketNeeded');
  }
  if (approvalPacketGap.exactApprovalRequiredBeforeNextLiveCall !== true) {
    invalidFields.push('approvalPacketGap.exactApprovalRequiredBeforeNextLiveCall');
  }
  if (approvalPacketGap.approvalLineGenerated !== false) {
    invalidFields.push('approvalPacketGap.approvalLineGenerated');
  }
  if (approvalPacketGap.requestBodyGenerated !== false) {
    invalidFields.push('approvalPacketGap.requestBodyGenerated');
  }
  if (approvalPacketGap.componentActionProbeIncluded !== false) {
    invalidFields.push('approvalPacketGap.componentActionProbeIncluded');
  }
  if (approvalPacketGap.readShapeIncluded !== false) invalidFields.push('approvalPacketGap.readShapeIncluded');
  return invalidFields;
}

function invalidFields(input) {
  return [
    ...(input.schemaVersion !== SCHEMA_VERSION ? ['schemaVersion'] : []),
    ...(!isSafeReferenceName(input.taskId) ? ['taskId'] : []),
    ...invalidRuntimeStartupFields(input.runtimeStartupState),
    ...invalidTargetLocatorFields(input.targetLocatorBinding),
    ...invalidWrapperShapeFields(input.transportWrapperShape),
    ...invalidServiceListenerFields(input.serviceListenerMismatch),
    ...invalidApprovalPacketGapFields(input.approvalPacketGap)
  ];
}

function buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_RUNTIME_STARTUP_FIELDS, input.runtimeStartupState, 'runtimeStartupState'),
    ...missingFields(REQUIRED_TARGET_LOCATOR_FIELDS, input.targetLocatorBinding, 'targetLocatorBinding'),
    ...missingFields(REQUIRED_WRAPPER_SHAPE_FIELDS, input.transportWrapperShape, 'transportWrapperShape'),
    ...missingFields(REQUIRED_SERVICE_LISTENER_FIELDS, input.serviceListenerMismatch, 'serviceListenerMismatch'),
    ...missingFields(REQUIRED_APPROVAL_PACKET_GAP_FIELDS, input.approvalPacketGap, 'approvalPacketGap')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_runtime_startup_target_locator_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_runtime_startup_target_locator_material', input, { forbiddenFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_runtime_startup_target_locator_counters', input, { forbiddenCounters });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_runtime_startup_target_locator_contract', input, { invalidFields: invalid });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    diagnosisContractLocked: true,
    diagnosis_result: diagnosisResult({
      accepted: true,
      runtimeStartupStateKnown: false,
      processCountBucketDisclosed: false,
      targetLocatorBindingKnown: false,
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      transportWrapperShapeReviewed: true,
      transportWrapperLiveProofKnown: false,
      serviceListenerMismatchKnown: false,
      approvalPacketGapKnown: true,
      componentActionStatusProbeUnlocked: false,
      readShapeUnlocked: false,
      nextLiveDiagnosticRequiresExactApproval: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1925_prepare_exact_approval_request_for_startup_locator_diagnosis_after_cm1924',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  ALLOWED_LOCATOR_PRESENCE_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeRuntimeStartupTargetLocatorDiagnosisContract
};
