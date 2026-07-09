'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeStartupLocatorDiagnosisReceiptCaptureContract';
const CONTRACT_MODE = 'startup_locator_diagnosis_receipt_capture_hardening_contract_no_live_call';
const SCHEMA_VERSION = 1;

const PURPOSE = 'runtime_startup_or_target_locator_diagnosis';

const OUTCOME_CATEGORIES = Object.freeze([
  'connect_success',
  'transport_error',
  'timeout',
  'receipt_capture_error'
]);

const ALLOWED_DURATION_BUCKETS = Object.freeze([
  'not_measured',
  'lt_100ms',
  'lt_500ms',
  'lt_1s',
  'lt_3s',
  'gte_3s',
  'unknown'
]);

const ALLOWED_PROCESS_COUNT_BUCKETS = Object.freeze([
  'not_checked'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'purpose',
  'injectedOutcome',
  'receiptPolicy',
  'counters'
]);

const REQUIRED_INJECTED_OUTCOME_FIELDS = Object.freeze([
  'outcomeCategory',
  'durationBucket',
  'processCountBucket',
  'transportWrapperShapeCategory',
  'requestBodyGenerated',
  'responseBodyRead',
  'rawErrorPayloadRead',
  'logRead',
  'stdoutStderrRead',
  'configEnvRead',
  'secretRead',
  'endpointDisclosed',
  'locatorValueDisclosed',
  'memoryRead',
  'memoryWritten'
]);

const REQUIRED_RECEIPT_POLICY_FIELDS = Object.freeze([
  'resultProjection',
  'responseBodyByteBudget',
  'rawErrorPayloadBudget',
  'logReadBudget',
  'requestBodyGeneration',
  'endpointDisclosure',
  'locatorValueDisclosure',
  'memoryWrite',
  'durableWrite',
  'readinessClaim'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  liveVcpToolBoxCalls: 0,
  networkCalls: 0,
  liveProcessInspections: 0,
  endpointDisclosures: 0,
  locatorValueDisclosures: 0,
  responseBodiesRead: 0,
  rawErrorPayloadsRead: 0,
  logReads: 0,
  stdoutStderrReads: 0,
  configEnvReads: 0,
  secretReads: 0,
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
  'curl'
]);

const ALLOWED_TOP_LEVEL_FIELDS = Object.freeze(REQUIRED_TOP_LEVEL_FIELDS);
const ALLOWED_INJECTED_OUTCOME_FIELDS = Object.freeze(REQUIRED_INJECTED_OUTCOME_FIELDS);
const ALLOWED_RECEIPT_POLICY_FIELDS = Object.freeze(REQUIRED_RECEIPT_POLICY_FIELDS);

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
      targetReferenceName: null,
      purpose: null
    };
  }
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null,
    purpose: input.purpose === PURPOSE ? input.purpose : null
  };
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    liveProcessInspected: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    logRead: false,
    stdoutStderrRead: false,
    configEnvRead: false,
    secretRead: false,
    requestBodyGenerated: false,
    approvalLineGenerated: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    runtimeBindingChanged: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

function captureResult(overrides = {}) {
  return {
    accepted: false,
    receiptCaptureDeterministic: false,
    injectedOutcomeOnly: true,
    liveRuntimeFactsKnown: false,
    diagnosisResultUsableForLiveRoute: false,
    runtimeStartupStateKnown: false,
    processCountKnown: false,
    targetLocatorBindingSuccessKnown: false,
    serviceListenerReachabilityKnown: false,
    componentActionStatusProbeUnlocked: false,
    readShapeUnlocked: false,
    nextLiveAttemptRequiresExactApproval: true,
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
    receipt: null,
    capture_result: captureResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1928_startup_locator_receipt_capture_contract_before_live_request',
    ...zeroSideEffectFlags()
  };
}

function invalidReceiptPolicyFields(policy) {
  const invalidFields = [];
  if (!isPlainObject(policy)) return ['receiptPolicy'];
  if (policy.resultProjection !== 'low_disclosure_categories_only') invalidFields.push('receiptPolicy.resultProjection');
  if (policy.responseBodyByteBudget !== 0) invalidFields.push('receiptPolicy.responseBodyByteBudget');
  if (policy.rawErrorPayloadBudget !== 0) invalidFields.push('receiptPolicy.rawErrorPayloadBudget');
  if (policy.logReadBudget !== 0) invalidFields.push('receiptPolicy.logReadBudget');
  if (policy.requestBodyGeneration !== false) invalidFields.push('receiptPolicy.requestBodyGeneration');
  if (policy.endpointDisclosure !== false) invalidFields.push('receiptPolicy.endpointDisclosure');
  if (policy.locatorValueDisclosure !== false) invalidFields.push('receiptPolicy.locatorValueDisclosure');
  if (policy.memoryWrite !== false) invalidFields.push('receiptPolicy.memoryWrite');
  if (policy.durableWrite !== false) invalidFields.push('receiptPolicy.durableWrite');
  if (policy.readinessClaim !== false) invalidFields.push('receiptPolicy.readinessClaim');
  return invalidFields;
}

function invalidInjectedOutcomeFields(outcome) {
  const invalidFields = [];
  if (!isPlainObject(outcome)) return ['injectedOutcome'];
  if (!OUTCOME_CATEGORIES.includes(outcome.outcomeCategory)) invalidFields.push('injectedOutcome.outcomeCategory');
  if (!ALLOWED_DURATION_BUCKETS.includes(outcome.durationBucket)) invalidFields.push('injectedOutcome.durationBucket');
  if (!ALLOWED_PROCESS_COUNT_BUCKETS.includes(outcome.processCountBucket)) {
    invalidFields.push('injectedOutcome.processCountBucket');
  }
  if (outcome.transportWrapperShapeCategory !== 'tcp_connect_no_body_no_request') {
    invalidFields.push('injectedOutcome.transportWrapperShapeCategory');
  }
  for (const field of [
    'requestBodyGenerated',
    'responseBodyRead',
    'rawErrorPayloadRead',
    'logRead',
    'stdoutStderrRead',
    'configEnvRead',
    'secretRead',
    'endpointDisclosed',
    'locatorValueDisclosed',
    'memoryRead',
    'memoryWritten'
  ]) {
    if (outcome[field] !== false) invalidFields.push(`injectedOutcome.${field}`);
  }
  return invalidFields;
}

function invalidTopLevelFields(input) {
  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (!isSafeReferenceName(input.taskId)) invalidFields.push('taskId');
  if (!isSafeReferenceName(input.targetReferenceName)) invalidFields.push('targetReferenceName');
  if (input.purpose !== PURPOSE) invalidFields.push('purpose');
  return invalidFields;
}

function receiptCategoriesForOutcome(outcomeCategory) {
  if (outcomeCategory === 'connect_success') {
    return {
      statusCategory: 'startup_locator_diagnosis_observed',
      runtimeStartupStateCategory: 'listener_reachable_startup_state_unproven',
      targetLocatorBindingCategory: 'binding_used_category_only',
      serviceListenerStatusCategory: 'reachable',
      statusClass: 'tcp_connect_ok'
    };
  }
  if (outcomeCategory === 'transport_error') {
    return {
      statusCategory: 'transport_error',
      runtimeStartupStateCategory: 'unknown',
      targetLocatorBindingCategory: 'not_proven_by_transport_error',
      serviceListenerStatusCategory: 'not_reachable',
      statusClass: 'tcp_connect_failed'
    };
  }
  if (outcomeCategory === 'timeout') {
    return {
      statusCategory: 'transport_timeout',
      runtimeStartupStateCategory: 'unknown',
      targetLocatorBindingCategory: 'not_proven_by_timeout',
      serviceListenerStatusCategory: 'timeout',
      statusClass: 'tcp_connect_timeout'
    };
  }
  return {
    statusCategory: 'receipt_capture_error_after_single_approved_attempt',
    runtimeStartupStateCategory: 'unknown',
    targetLocatorBindingCategory: 'not_proven_by_receipt_capture_error',
    serviceListenerStatusCategory: 'unknown',
    statusClass: 'diagnosis_result_unknown'
  };
}

function buildReceipt(input) {
  const outcome = input.injectedOutcome;
  const categories = receiptCategoriesForOutcome(outcome.outcomeCategory);
  return {
    targetReferenceName: input.targetReferenceName,
    purpose: input.purpose,
    ...categories,
    processCountBucket: outcome.processCountBucket,
    transportWrapperShapeCategory: outcome.transportWrapperShapeCategory,
    durationBucket: outcome.durationBucket,
    zeroWriteCounters: true,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    logRead: false,
    stdoutStderrRead: false,
    configEnvRead: false,
    secretRead: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    memoryRead: false,
    memoryWritten: false
  };
}

function buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_INJECTED_OUTCOME_FIELDS, input.injectedOutcome, 'injectedOutcome'),
    ...missingFields(REQUIRED_RECEIPT_POLICY_FIELDS, input.receiptPolicy, 'receiptPolicy')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_receipt_capture_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_receipt_capture_material', input, { forbiddenFields });
  }

  const unknownFields = [
    ...collectUnknownFields(input, ALLOWED_TOP_LEVEL_FIELDS),
    ...collectUnknownFields(input.injectedOutcome, ALLOWED_INJECTED_OUTCOME_FIELDS, 'injectedOutcome'),
    ...collectUnknownFields(input.receiptPolicy, ALLOWED_RECEIPT_POLICY_FIELDS, 'receiptPolicy')
  ];
  if (unknownFields.length > 0) {
    return rejected('unknown_receipt_capture_fields_not_allowed', input, { unknownFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_receipt_capture_counters', input, { forbiddenCounters });
  }

  const invalidFields = [
    ...invalidTopLevelFields(input),
    ...invalidInjectedOutcomeFields(input.injectedOutcome),
    ...invalidReceiptPolicyFields(input.receiptPolicy)
  ];
  if (invalidFields.length > 0) {
    return rejected('invalid_startup_locator_receipt_capture_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    receiptCaptureContractLocked: true,
    receipt: buildReceipt(input),
    capture_result: captureResult({
      accepted: true,
      receiptCaptureDeterministic: true,
      diagnosisResultUsableForLiveRoute: false
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1929_receipt_capture_hardening_closeout_before_future_live_request',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  ALLOWED_DURATION_BUCKETS,
  ALLOWED_PROCESS_COUNT_BUCKETS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  OUTCOME_CATEGORIES,
  PURPOSE,
  REQUIRED_INJECTED_OUTCOME_FIELDS,
  REQUIRED_RECEIPT_POLICY_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeStartupLocatorDiagnosisReceiptCaptureContract
};
