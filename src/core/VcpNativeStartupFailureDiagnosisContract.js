'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeStartupFailureDiagnosisContract';
const CONTRACT_MODE = 'low_disclosure_startup_failure_diagnosis_contract_no_live_call';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'startupInvocationShape',
  'startupProcessLifecycle',
  'startupResultCapture',
  'listenerAfterStart',
  'targetSafeReferenceBinding',
  'operatorMediatedManualEvidence',
  'approvalBoundary',
  'counters'
]);

const REQUIRED_INVOCATION_SHAPE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequiredNow',
  'sourceOnlyWrapperPlanCategory',
  'invocationShapeCategory',
  'commandLineDisclosed',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'configPathOrValueDisclosed',
  'envValueRead',
  'requiresExactApprovalForLiveStartup'
]);

const REQUIRED_PROCESS_LIFECYCLE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequiredNow',
  'requiresFutureExactApproval',
  'processCountBucket',
  'lifecycleCategory',
  'processIdentifiersDisclosed',
  'commandLineRead',
  'envRead',
  'stdoutStderrRead',
  'logsRead'
]);

const REQUIRED_STARTUP_RESULT_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequiredNow',
  'requiresFutureExactApproval',
  'startupResultCategory',
  'durationBucket',
  'zeroWriteCounters',
  'rawErrorPayloadRead',
  'stdoutStderrRead',
  'logsRead',
  'configEnvRead',
  'secretRead'
]);

const REQUIRED_LISTENER_AFTER_START_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequiredNow',
  'requiresFutureExactApproval',
  'listenerStatusCategory',
  'statusClassKnown',
  'durationBucket',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'responseBodyRead',
  'rawErrorPayloadRead'
]);

const REQUIRED_SAFE_REFERENCE_FIELDS = Object.freeze([
  'lane',
  'targetReferenceName',
  'currentStatus',
  'liveRequiredNow',
  'bindingCategory',
  'locatorValueDisclosed',
  'endpointDisclosed',
  'configPathOrValueDisclosed',
  'envValueRead'
]);

const REQUIRED_MANUAL_EVIDENCE_FIELDS = Object.freeze([
  'lane',
  'currentStatus',
  'liveRequiredNow',
  'manualObservationCategory',
  'noRawOutputConfirmation',
  'noSecretConfirmation',
  'rawLogsProvided',
  'stdoutStderrTextProvided',
  'endpointDisclosed',
  'configEnvRead',
  'tokenRead'
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

const ALLOWED_INVOCATION_PLAN_CATEGORIES = Object.freeze([
  'source_only_wrapper_plan_category',
  'source_only_unreviewed',
  'category_only'
]);

const ALLOWED_INVOCATION_SHAPE_CATEGORIES = Object.freeze([
  'category_only',
  'not_bound',
  'unknown'
]);

const ALLOWED_PROCESS_COUNT_BUCKETS = Object.freeze([
  'not_checked',
  'unknown'
]);

const ALLOWED_LIFECYCLE_CATEGORIES = Object.freeze([
  'not_checked',
  'unknown'
]);

const ALLOWED_STARTUP_RESULT_CATEGORIES = Object.freeze([
  'not_checked',
  'unknown'
]);

const ALLOWED_DURATION_BUCKETS = Object.freeze([
  'not_measured',
  'unknown'
]);

const ALLOWED_LISTENER_STATUS_CATEGORIES = Object.freeze([
  'not_checked',
  'unknown'
]);

const ALLOWED_BINDING_CATEGORIES = Object.freeze([
  'reference_name_only',
  'reference_present_category_only',
  'unknown'
]);

const ALLOWED_MANUAL_EVIDENCE_STATUSES = Object.freeze([
  'not_provided',
  'optional'
]);

const ALLOWED_MANUAL_OBSERVATION_CATEGORIES = Object.freeze([
  'not_provided',
  'optional'
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
  'startupCommand',
  'listenerPayload'
]);

const ALLOWED_TOP_LEVEL_FIELDS = Object.freeze(REQUIRED_TOP_LEVEL_FIELDS);
const ALLOWED_INVOCATION_SHAPE_FIELDS = Object.freeze(REQUIRED_INVOCATION_SHAPE_FIELDS);
const ALLOWED_PROCESS_LIFECYCLE_FIELDS = Object.freeze(REQUIRED_PROCESS_LIFECYCLE_FIELDS);
const ALLOWED_STARTUP_RESULT_FIELDS = Object.freeze(REQUIRED_STARTUP_RESULT_FIELDS);
const ALLOWED_LISTENER_AFTER_START_FIELDS = Object.freeze(REQUIRED_LISTENER_AFTER_START_FIELDS);
const ALLOWED_SAFE_REFERENCE_FIELDS = Object.freeze(REQUIRED_SAFE_REFERENCE_FIELDS);
const ALLOWED_MANUAL_EVIDENCE_FIELDS = Object.freeze(REQUIRED_MANUAL_EVIDENCE_FIELDS);
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

function diagnosisResult(overrides = {}) {
  return {
    accepted: false,
    startupInvocationShapeContracted: false,
    startupProcessLifecycleKnown: false,
    processCountBucketDisclosed: false,
    startupResultKnown: false,
    listenerAfterStartKnown: false,
    targetReferenceKnown: false,
    targetLocatorBindingKnown: false,
    operatorManualEvidenceAccepted: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
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
    unknownFields: details.unknownFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    diagnosis_result: diagnosisResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1941_startup_failure_diagnosis_contract_before_exact_request',
    ...zeroSideEffectFlags()
  };
}

function invalidInvocationShapeFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['startupInvocationShape'];
  if (lane.lane !== 'startup_invocation_shape') invalidFields.push('startupInvocationShape.lane');
  if (lane.currentStatus !== 'unknown') invalidFields.push('startupInvocationShape.currentStatus');
  if (lane.liveRequiredNow !== false) invalidFields.push('startupInvocationShape.liveRequiredNow');
  if (!ALLOWED_INVOCATION_PLAN_CATEGORIES.includes(lane.sourceOnlyWrapperPlanCategory)) {
    invalidFields.push('startupInvocationShape.sourceOnlyWrapperPlanCategory');
  }
  if (!ALLOWED_INVOCATION_SHAPE_CATEGORIES.includes(lane.invocationShapeCategory)) {
    invalidFields.push('startupInvocationShape.invocationShapeCategory');
  }
  for (const field of [
    'commandLineDisclosed',
    'endpointDisclosed',
    'locatorValueDisclosed',
    'configPathOrValueDisclosed',
    'envValueRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`startupInvocationShape.${field}`);
  }
  if (lane.requiresExactApprovalForLiveStartup !== true) {
    invalidFields.push('startupInvocationShape.requiresExactApprovalForLiveStartup');
  }
  return invalidFields;
}

function invalidProcessLifecycleFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['startupProcessLifecycle'];
  if (lane.lane !== 'startup_process_lifecycle') invalidFields.push('startupProcessLifecycle.lane');
  if (lane.currentStatus !== 'unknown') invalidFields.push('startupProcessLifecycle.currentStatus');
  if (lane.liveRequiredNow !== true) invalidFields.push('startupProcessLifecycle.liveRequiredNow');
  if (lane.requiresFutureExactApproval !== true) {
    invalidFields.push('startupProcessLifecycle.requiresFutureExactApproval');
  }
  if (!ALLOWED_PROCESS_COUNT_BUCKETS.includes(lane.processCountBucket)) {
    invalidFields.push('startupProcessLifecycle.processCountBucket');
  }
  if (!ALLOWED_LIFECYCLE_CATEGORIES.includes(lane.lifecycleCategory)) {
    invalidFields.push('startupProcessLifecycle.lifecycleCategory');
  }
  for (const field of [
    'processIdentifiersDisclosed',
    'commandLineRead',
    'envRead',
    'stdoutStderrRead',
    'logsRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`startupProcessLifecycle.${field}`);
  }
  return invalidFields;
}

function invalidStartupResultFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['startupResultCapture'];
  if (lane.lane !== 'startup_result_capture') invalidFields.push('startupResultCapture.lane');
  if (lane.currentStatus !== 'unknown') invalidFields.push('startupResultCapture.currentStatus');
  if (lane.liveRequiredNow !== true) invalidFields.push('startupResultCapture.liveRequiredNow');
  if (lane.requiresFutureExactApproval !== true) {
    invalidFields.push('startupResultCapture.requiresFutureExactApproval');
  }
  if (!ALLOWED_STARTUP_RESULT_CATEGORIES.includes(lane.startupResultCategory)) {
    invalidFields.push('startupResultCapture.startupResultCategory');
  }
  if (!ALLOWED_DURATION_BUCKETS.includes(lane.durationBucket)) {
    invalidFields.push('startupResultCapture.durationBucket');
  }
  if (lane.zeroWriteCounters !== true) invalidFields.push('startupResultCapture.zeroWriteCounters');
  for (const field of [
    'rawErrorPayloadRead',
    'stdoutStderrRead',
    'logsRead',
    'configEnvRead',
    'secretRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`startupResultCapture.${field}`);
  }
  return invalidFields;
}

function invalidListenerAfterStartFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['listenerAfterStart'];
  if (lane.lane !== 'listener_after_start') invalidFields.push('listenerAfterStart.lane');
  if (lane.currentStatus !== 'unknown') invalidFields.push('listenerAfterStart.currentStatus');
  if (lane.liveRequiredNow !== true) invalidFields.push('listenerAfterStart.liveRequiredNow');
  if (lane.requiresFutureExactApproval !== true) {
    invalidFields.push('listenerAfterStart.requiresFutureExactApproval');
  }
  if (!ALLOWED_LISTENER_STATUS_CATEGORIES.includes(lane.listenerStatusCategory)) {
    invalidFields.push('listenerAfterStart.listenerStatusCategory');
  }
  if (lane.statusClassKnown !== false) invalidFields.push('listenerAfterStart.statusClassKnown');
  if (!ALLOWED_DURATION_BUCKETS.includes(lane.durationBucket)) {
    invalidFields.push('listenerAfterStart.durationBucket');
  }
  for (const field of [
    'endpointDisclosed',
    'locatorValueDisclosed',
    'responseBodyRead',
    'rawErrorPayloadRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`listenerAfterStart.${field}`);
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
  if (lane.liveRequiredNow !== false) invalidFields.push('targetSafeReferenceBinding.liveRequiredNow');
  if (!ALLOWED_BINDING_CATEGORIES.includes(lane.bindingCategory)) {
    invalidFields.push('targetSafeReferenceBinding.bindingCategory');
  }
  for (const field of [
    'locatorValueDisclosed',
    'endpointDisclosed',
    'configPathOrValueDisclosed',
    'envValueRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`targetSafeReferenceBinding.${field}`);
  }
  return invalidFields;
}

function invalidManualEvidenceFields(lane) {
  const invalidFields = [];
  if (!isPlainObject(lane)) return ['operatorMediatedManualEvidence'];
  if (lane.lane !== 'operator_mediated_manual_evidence') {
    invalidFields.push('operatorMediatedManualEvidence.lane');
  }
  if (!ALLOWED_MANUAL_EVIDENCE_STATUSES.includes(lane.currentStatus)) {
    invalidFields.push('operatorMediatedManualEvidence.currentStatus');
  }
  if (lane.liveRequiredNow !== false) invalidFields.push('operatorMediatedManualEvidence.liveRequiredNow');
  if (!ALLOWED_MANUAL_OBSERVATION_CATEGORIES.includes(lane.manualObservationCategory)) {
    invalidFields.push('operatorMediatedManualEvidence.manualObservationCategory');
  }
  for (const field of [
    'noRawOutputConfirmation',
    'noSecretConfirmation',
    'rawLogsProvided',
    'stdoutStderrTextProvided',
    'endpointDisclosed',
    'configEnvRead',
    'tokenRead'
  ]) {
    if (lane[field] !== false) invalidFields.push(`operatorMediatedManualEvidence.${field}`);
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
    ...invalidInvocationShapeFields(input.startupInvocationShape),
    ...invalidProcessLifecycleFields(input.startupProcessLifecycle),
    ...invalidStartupResultFields(input.startupResultCapture),
    ...invalidListenerAfterStartFields(input.listenerAfterStart),
    ...invalidSafeReferenceFields(input.targetSafeReferenceBinding, input.targetReferenceName),
    ...invalidManualEvidenceFields(input.operatorMediatedManualEvidence),
    ...invalidApprovalBoundaryFields(input.approvalBoundary)
  ];
}

function buildVcpNativeStartupFailureDiagnosisContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_INVOCATION_SHAPE_FIELDS, input.startupInvocationShape, 'startupInvocationShape'),
    ...missingFields(REQUIRED_PROCESS_LIFECYCLE_FIELDS, input.startupProcessLifecycle, 'startupProcessLifecycle'),
    ...missingFields(REQUIRED_STARTUP_RESULT_FIELDS, input.startupResultCapture, 'startupResultCapture'),
    ...missingFields(REQUIRED_LISTENER_AFTER_START_FIELDS, input.listenerAfterStart, 'listenerAfterStart'),
    ...missingFields(REQUIRED_SAFE_REFERENCE_FIELDS, input.targetSafeReferenceBinding, 'targetSafeReferenceBinding'),
    ...missingFields(REQUIRED_MANUAL_EVIDENCE_FIELDS, input.operatorMediatedManualEvidence, 'operatorMediatedManualEvidence'),
    ...missingFields(REQUIRED_APPROVAL_BOUNDARY_FIELDS, input.approvalBoundary, 'approvalBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_startup_failure_diagnosis_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_startup_failure_diagnosis_material', input, { forbiddenFields });
  }

  const unknownFields = [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input.startupInvocationShape, ALLOWED_INVOCATION_SHAPE_FIELDS, 'startupInvocationShape'),
    ...collectUnknownFields(input.startupProcessLifecycle, ALLOWED_PROCESS_LIFECYCLE_FIELDS, 'startupProcessLifecycle'),
    ...collectUnknownFields(input.startupResultCapture, ALLOWED_STARTUP_RESULT_FIELDS, 'startupResultCapture'),
    ...collectUnknownFields(input.listenerAfterStart, ALLOWED_LISTENER_AFTER_START_FIELDS, 'listenerAfterStart'),
    ...collectUnknownFields(input.targetSafeReferenceBinding, ALLOWED_SAFE_REFERENCE_FIELDS, 'targetSafeReferenceBinding'),
    ...collectUnknownFields(input.operatorMediatedManualEvidence, ALLOWED_MANUAL_EVIDENCE_FIELDS, 'operatorMediatedManualEvidence'),
    ...collectUnknownFields(input.approvalBoundary, ALLOWED_APPROVAL_BOUNDARY_FIELDS, 'approvalBoundary')
  ];
  if (unknownFields.length > 0) {
    return rejected('unknown_startup_failure_diagnosis_fields_not_allowed', input, { unknownFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_startup_failure_diagnosis_counters', input, { forbiddenCounters });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_startup_failure_diagnosis_contract', input, { invalidFields: invalid });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    startupFailureDiagnosisContractLocked: true,
    diagnosis_result: diagnosisResult({
      accepted: true,
      startupInvocationShapeContracted: true,
      startupProcessLifecycleKnown: false,
      processCountBucketDisclosed: false,
      startupResultKnown: false,
      listenerAfterStartKnown: false,
      targetReferenceKnown: true,
      targetLocatorBindingKnown: false,
      operatorManualEvidenceAccepted: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      componentActionStatusProbeUnlocked: false,
      readShapeUnlocked: false,
      nextLiveDiagnosticRequiresExactApproval: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1942_prepare_startup_failure_diagnosis_exact_approval_request_after_cm1941',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeStartupFailureDiagnosisContract
};
