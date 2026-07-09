'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  READ_ONLY_PROFILES
} = require('./VcpNativeInvocationAdapterSkeleton');

const CONTRACT_NAME = 'VcpNativeReadOnlyExecutionReceipt';
const CONTRACT_MODE = 'low_disclosure_readonly_execution_receipt_schema_no_runtime_no_raw_body';
const SCHEMA_VERSION = 1;

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceName',
  'profile',
  'component',
  'action',
  'statusCategory',
  'shapeKeys',
  'itemCount',
  'durationBucket',
  'normalizedResultStatus',
  'zeroWriteCounters'
]);

const ALLOWED_RECEIPT_OUTPUT_FIELDS = Object.freeze([
  'targetReferenceName',
  'profile',
  'component',
  'action',
  'statusCategory',
  'shapeKeys',
  'itemCount',
  'durationBucket',
  'normalizedResultStatus',
  'zeroWriteCounters'
]);

const ALLOWED_STATUS_CATEGORIES = Object.freeze([
  'not_executed',
  'http_2xx',
  'http_non_2xx',
  'transport_error',
  'boundary_rejected',
  'runtime_unreachable',
  'parse_error',
  'unknown'
]);

const ALLOWED_DURATION_BUCKETS = Object.freeze([
  'not_measured',
  'lt_100ms',
  '100_999ms',
  '1_5s',
  'gt_5s'
]);

const ALLOWED_NORMALIZED_RESULT_STATUSES = Object.freeze([
  'not_executed',
  'shape_only',
  'success',
  'partial',
  'denied',
  'error'
]);

const ZERO_WRITE_COUNTERS = Object.freeze({
  memoryWrites: 0,
  memoryWritten: 0,
  durableMemoryWrites: 0,
  durableAuditWrites: 0,
  durableWritePerformed: 0,
  requestBodiesGenerated: 0,
  approvalLinesGenerated: 0,
  rawBodiesPersisted: 0,
  logsPersisted: 0,
  configWrites: 0
});

const ZERO_WRITE_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_WRITE_COUNTERS));

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'approvalLine',
  'approvalLineText',
  'approvalLineValue',
  'approval_line_value',
  'approvalRequestBody',
  'requestBody',
  'requestPayload',
  'responseBody',
  'rawResponseBody',
  'responsePayload',
  'rawPayload',
  'rawOutput',
  'rawMemoryText',
  'rawText',
  'memoryId',
  'memoryIds',
  'memory_id',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'config',
  'configEnv',
  'env',
  'stdout',
  'stderr',
  'log',
  'logs',
  'rawLog',
  'providerPayload'
]);

const RECEIPT_ALLOWED_TOP_LEVEL_FIELDS = Object.freeze(REQUIRED_RECEIPT_FIELDS);

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

function collectUnknownTopLevelFields(input) {
  if (!isPlainObject(input)) return [];
  return Object.keys(input).filter(field => !RECEIPT_ALLOWED_TOP_LEVEL_FIELDS.includes(field));
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      targetReferenceName: null,
      profile: null,
      action: null
    };
  }

  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null,
    profile: READ_ONLY_PROFILES.includes(input.profile) ? input.profile : null,
    action: READ_ACTIONS.includes(input.action) ? input.action : null
  };
}

function isSafeShapeKey(value) {
  return typeof value === 'string' &&
    /^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(value) &&
    !FORBIDDEN_FIELD_NAMES.includes(value);
}

function invalidZeroWriteCounters(counters) {
  if (!isPlainObject(counters)) return ['zeroWriteCounters'];
  const invalid = [];
  for (const field of ZERO_WRITE_COUNTER_FIELDS) {
    if (counters[field] !== 0) invalid.push(`zeroWriteCounters.${field}`);
  }
  for (const field of Object.keys(counters)) {
    if (!ZERO_WRITE_COUNTER_FIELDS.includes(field)) invalid.push(`zeroWriteCounters.${field}`);
  }
  return invalid;
}

function invalidReceiptFields(input) {
  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (!isSafeReferenceName(input.taskId)) invalidFields.push('taskId');
  if (!isSafeReferenceName(input.targetReferenceName)) invalidFields.push('targetReferenceName');
  if (!READ_ONLY_PROFILES.includes(input.profile)) invalidFields.push('profile');
  if (!SOURCE_COMPONENTS.includes(input.component)) invalidFields.push('component');
  if (!READ_ACTIONS.includes(input.action)) invalidFields.push('action');
  if (!ALLOWED_STATUS_CATEGORIES.includes(input.statusCategory)) invalidFields.push('statusCategory');
  if (!ALLOWED_DURATION_BUCKETS.includes(input.durationBucket)) invalidFields.push('durationBucket');
  if (!ALLOWED_NORMALIZED_RESULT_STATUSES.includes(input.normalizedResultStatus)) {
    invalidFields.push('normalizedResultStatus');
  }
  if (!Number.isInteger(input.itemCount) || input.itemCount < 0 || input.itemCount > 5) {
    invalidFields.push('itemCount');
  }
  if (!Array.isArray(input.shapeKeys) || input.shapeKeys.length > 20 || input.shapeKeys.some(key => !isSafeShapeKey(key))) {
    invalidFields.push('shapeKeys');
  }
  invalidFields.push(...invalidZeroWriteCounters(input.zeroWriteCounters));
  return invalidFields;
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    responseBodyPersisted: false,
    rawBodyPersisted: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    receiptWritten: false,
    endpointUrlRecorded: false,
    approvalLineRecorded: false,
    tokenRecorded: false,
    configEnvRecorded: false,
    stdoutStderrLogRecorded: false,
    providerPayloadRecorded: false,
    publicMcpExpanded: false,
    readinessClaimed: false
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
    invalidFields: details.invalidFields || [],
    receipt: null,
    allowedReceiptOutputFields: ALLOWED_RECEIPT_OUTPUT_FIELDS,
    forbiddenReceiptMaterial: FORBIDDEN_FIELD_NAMES,
    nextAction: 'fix_low_disclosure_receipt_or_stop_before_live_proof',
    ...zeroSideEffectFlags()
  };
}

function buildReceipt(input) {
  const shapeKeys = [...input.shapeKeys].sort();
  return {
    targetReferenceName: input.targetReferenceName,
    profile: input.profile,
    component: input.component,
    action: input.action,
    statusCategory: input.statusCategory,
    shapeKeys,
    itemCount: input.itemCount,
    durationBucket: input.durationBucket,
    normalizedResultStatus: input.normalizedResultStatus,
    zeroWriteCounters: { ...ZERO_WRITE_COUNTERS }
  };
}

function buildVcpNativeReadOnlyExecutionReceipt(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = missingFields(REQUIRED_RECEIPT_FIELDS, input);
  if (missing.length > 0) {
    return rejected('missing_required_receipt_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_or_sensitive_receipt_material', input, { forbiddenFields });
  }

  const unknownFields = collectUnknownTopLevelFields(input);
  if (unknownFields.length > 0) {
    return rejected('unknown_receipt_fields_not_allowed', input, { unknownFields });
  }

  const invalidFields = invalidReceiptFields(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_low_disclosure_readonly_execution_receipt', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    receipt: buildReceipt(input),
    receiptSchemaLocked: true,
    allowedReceiptOutputFields: ALLOWED_RECEIPT_OUTPUT_FIELDS,
    forbiddenReceiptMaterial: FORBIDDEN_FIELD_NAMES,
    nextAction: 'cm1914_prepare_exact_approved_live_readonly_proof_request_packet_without_authorization_line',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  ALLOWED_DURATION_BUCKETS,
  ALLOWED_NORMALIZED_RESULT_STATUSES,
  ALLOWED_RECEIPT_OUTPUT_FIELDS,
  ALLOWED_STATUS_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_RECEIPT_FIELDS,
  SCHEMA_VERSION,
  ZERO_WRITE_COUNTERS,
  ZERO_WRITE_COUNTER_FIELDS,
  buildVcpNativeReadOnlyExecutionReceipt
};
