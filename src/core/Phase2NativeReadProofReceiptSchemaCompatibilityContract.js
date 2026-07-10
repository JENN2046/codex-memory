'use strict';

const {
  ALLOWED_RECEIPT_OUTPUT_FIELDS,
  CONTRACT_MODE: READONLY_RECEIPT_CONTRACT_MODE,
  CONTRACT_NAME: READONLY_RECEIPT_CONTRACT_NAME,
  ZERO_WRITE_COUNTER_FIELDS
} = require('./VcpNativeReadOnlyExecutionReceipt');

const CONTRACT_NAME = 'Phase2NativeReadProofReceiptSchemaCompatibilityContract';
const CONTRACT_MODE = 'local_phase2_native_read_proof_receipt_schema_compatibility_only';
const SCHEMA_VERSION = 1;

const REQUIRED_PREREQUISITES = Object.freeze([
  'phase2ReceiptBundleContractAccepted',
  'nativeReadResponseShapeCompatibilityAccepted',
  'vcpNativeReadOnlyExecutionReceiptSchemaPresent',
  'completionAuditStillRequiresExactReceipts'
]);

const REQUIRED_RECEIPT_SCHEMA_FLAGS = Object.freeze([
  'allowedFieldsLocked',
  'rawBodyExcluded',
  'responseBodyExcluded',
  'memoryContentExcluded',
  'endpointLocatorExcluded',
  'approvalLineExcluded',
  'zeroWriteCountersRequired'
]);

const REQUIRED_CATEGORY_COMPATIBILITY = Object.freeze({
  nativeReadAttemptReceipt: 'schema_compatible_requires_future_exact_receipt',
  nativeReadSuccessReceipt: 'schema_compatible_requires_future_exact_success_receipt',
  lowDisclosureReceipt: 'schema_compatible_requires_future_exact_receipt',
  nativeTargetBindingReceipt: 'requires_separate_exact_receipt',
  auditReceipt: 'requires_separate_exact_receipt',
  fallbackDistinctionReceipt: 'requires_separate_exact_receipt',
  wslLinuxReceipt: 'requires_separate_exact_receipt',
  windowsWslSmokeReceipt: 'requires_separate_exact_receipt'
});

const STOP_L4_FLAG_KEYS = Object.freeze([
  'actualReceiptApplied',
  'approvalAccepted',
  'approvalLineGenerated',
  'runtimeCalled',
  'liveVcpToolBoxCalled',
  'nativeReadExecuted',
  'nativeReadProofClaimed',
  'memoryRead',
  'realMemoryRead',
  'rawPrivateRead',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'completionAuditPatched',
  'phase2Completed',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'fullPlanPackCompletedClaimed'
]);

const COUNTER_FIELDS = Object.freeze([
  'approvalLineOperations',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeReadAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'receiptApplications',
  'completionAuditPatches',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'queryText',
  'query_text',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawResponse',
  'raw_response',
  'rawOutput',
  'raw_output',
  'rawMemory',
  'raw_memory',
  'memoryContent',
  'memory_content',
  'rawAudit',
  'raw_audit',
  'rawJsonlRow',
  'rawSqliteRow',
  'providerPayload',
  'runtimeCommand',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'credential',
  'approvalLine',
  'approvalLineValue',
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function sortedUnique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))].sort();
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

function collectStopFlags(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStopFlags(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (STOP_L4_FLAG_KEYS.includes(key) && nested === true) {
      found.push(path);
      continue;
    }
    found.push(...collectStopFlags(nested, path));
  }
  return found;
}

function buildCounterBlockers(counters) {
  if (!isPlainObject(counters)) return COUNTER_FIELDS.map(field => `counters.${field}`);
  return COUNTER_FIELDS
    .filter(field => !Number.isInteger(counters[field]) || counters[field] !== 0)
    .map(field => `counters.${field}`);
}

function missingTrueFlags(value, fields, prefix) {
  const object = isPlainObject(value) ? value : {};
  return fields
    .filter(field => object[field] !== true)
    .map(field => `${prefix}.${field}`);
}

function expectedAllowedFields() {
  return [...ALLOWED_RECEIPT_OUTPUT_FIELDS].sort();
}

function invalidReceiptSchema(schema) {
  if (!isPlainObject(schema)) return ['receiptSchema'];
  const blockers = [];

  if (schema.contractName !== READONLY_RECEIPT_CONTRACT_NAME) {
    blockers.push('receiptSchema.contractName');
  }
  if (schema.contractMode !== READONLY_RECEIPT_CONTRACT_MODE) {
    blockers.push('receiptSchema.contractMode');
  }

  blockers.push(...missingTrueFlags(
    schema,
    REQUIRED_RECEIPT_SCHEMA_FLAGS,
    'receiptSchema'
  ));

  const allowedFields = Array.isArray(schema.allowedReceiptOutputFields)
    ? [...schema.allowedReceiptOutputFields].sort()
    : [];
  if (JSON.stringify(allowedFields) !== JSON.stringify(expectedAllowedFields())) {
    blockers.push('receiptSchema.allowedReceiptOutputFields');
  }

  const zeroWriteFields = Array.isArray(schema.zeroWriteCounterFields)
    ? [...schema.zeroWriteCounterFields].sort()
    : [];
  if (JSON.stringify(zeroWriteFields) !== JSON.stringify([...ZERO_WRITE_COUNTER_FIELDS].sort())) {
    blockers.push('receiptSchema.zeroWriteCounterFields');
  }

  return blockers;
}

function invalidCategoryCompatibility(categoryCompatibility) {
  if (!isPlainObject(categoryCompatibility)) return ['categoryCompatibility'];
  const blockers = [];

  for (const [category, expectedStatus] of Object.entries(REQUIRED_CATEGORY_COMPATIBILITY)) {
    if (categoryCompatibility[category] !== expectedStatus) {
      blockers.push(`categoryCompatibility.${category}`);
    }
  }

  for (const category of Object.keys(categoryCompatibility)) {
    if (!hasOwn(REQUIRED_CATEGORY_COMPATIBILITY, category)) {
      blockers.push(`categoryCompatibility.${category}`);
    }
  }

  return blockers;
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    forbiddenFields: [],
    stopReasons: [],
    nativeReadReceiptSchemaCompatibilityPassed: false,
    receiptAppliedByThisContract: false,
    phase2ReceiptBundleApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    fullPlanPackCompleted: false,
    ...extras
  };
}

function evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(input = {}) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = sortedUnique(collectForbiddenFields(input));
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const stopReasons = sortedUnique([
    ...collectStopFlags(input),
    ...buildCounterBlockers(input.counters)
  ]);
  if (stopReasons.length > 0) {
    return failure('stop_l4', { stopReasons });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.mode !== CONTRACT_MODE) return failure('invalid_mode');

  const blockers = [
    ...missingTrueFlags(input.prerequisites, REQUIRED_PREREQUISITES, 'prerequisites'),
    ...invalidReceiptSchema(input.receiptSchema),
    ...invalidCategoryCompatibility(input.categoryCompatibility)
  ];
  const accepted = blockers.length === 0;

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'phase2_native_read_receipt_schema_compatibility_accepted'
      : 'phase2_native_read_receipt_schema_compatibility_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    nativeReadReceiptSchemaCompatibilityPassed: accepted,
    schemaCompatibilityStatus: accepted
      ? 'partial_compatible_requires_separate_exact_receipts'
      : 'incomplete',
    mappedByReadonlyExecutionReceiptSchema: Object.freeze([
      'nativeReadAttemptReceipt',
      'nativeReadSuccessReceipt',
      'lowDisclosureReceipt'
    ]),
    stillRequiresSeparateExactReceipts: Object.freeze([
      'nativeTargetBindingReceipt',
      'auditReceipt',
      'fallbackDistinctionReceipt',
      'wslLinuxReceipt',
      'windowsWslSmokeReceipt'
    ]),
    categoryCompatibility: {
      ...REQUIRED_CATEGORY_COMPATIBILITY
    },
    compatibilityBoundary: {
      consumesReceiptSchemaOnly: true,
      consumesRuntimeReceiptInstance: false,
      consumesResponseBody: false,
      disclosesEndpointOrLocator: false,
      acceptsApprovalLine: false,
      appliesReceiptToCompletionAudit: false,
      completesPhase2: false,
      callsRuntime: false,
      executesNativeRead: false,
      readsMemory: false,
      performsDurableMutation: false,
      expandsPublicMcp: false,
      claimsReadiness: false
    },
    receiptAppliedByThisContract: false,
    phase2ReceiptBundleApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'collect_separate_exact_authorized_phase2_receipts_before_bundle_application'
      : 'repair_receipt_schema_mapping_without_runtime_or_raw_native_material'
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_CATEGORY_COMPATIBILITY,
  REQUIRED_PREREQUISITES,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract
};
