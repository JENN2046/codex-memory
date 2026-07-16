'use strict';

const CONTRACT_NAME = 'NativeReadResponseShapeCompatibilityContract';
const CONTRACT_MODE = 'local_native_read_response_shape_compatibility_only';
const SCHEMA_VERSION = 1;

const REQUIRED_READONLY_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const ALLOWED_TOOL_NAMES = Object.freeze([
  ...REQUIRED_READONLY_TOOLS,
  'prepare_memory_context'
]);

const ALLOWED_RESPONSE_SHAPE_CATEGORIES = Object.freeze([
  'array_item_count_bucket_only',
  'array_top_level_kind_only',
  'object_top_level_kind_only_no_field_names',
  'null_top_level_kind_only',
  'primitive_top_level_kind_only'
]);

const ALLOWED_TOP_LEVEL_KIND_CATEGORIES = Object.freeze([
  'array',
  'object',
  'null',
  'string',
  'number',
  'boolean'
]);

const ALLOWED_ITEM_COUNT_BUCKETS = Object.freeze([
  'zero',
  'one',
  'bounded_many',
  'many',
  'object_not_counted',
  'not_applicable'
]);

const ALLOWED_BYTE_COUNT_BUCKETS = Object.freeze([
  'zero',
  'bounded'
]);

const REQUIRED_TOOL_SHAPE_FIELDS = Object.freeze([
  'toolName',
  'surface',
  'direction',
  'responseShapeCategory',
  'topLevelKindCategory',
  'itemCountBucket',
  'byteCountBucket',
  'projectionKind',
  'lowDisclosureOnly',
  'fieldNamesDisclosed',
  'contentIncluded',
  'endpointDisclosed',
  'locatorDisclosed',
  'compatible'
]);

const EXPECTED_PROJECTION_BY_TOOL = Object.freeze({
  search_memory: 'bounded_results_package',
  memory_overview: 'overview_counts_status',
  audit_memory: 'audit_receipt_index',
  prepare_memory_context: 'task_context_package'
});

const ALLOWED_TOP_LEVEL_BY_TOOL = Object.freeze({
  search_memory: Object.freeze(['array', 'object']),
  memory_overview: Object.freeze(['object']),
  audit_memory: Object.freeze(['array', 'object']),
  prepare_memory_context: Object.freeze(['object'])
});

const ALLOWED_SHAPE_BY_TOOL = Object.freeze({
  search_memory: Object.freeze([
    'array_item_count_bucket_only',
    'array_top_level_kind_only',
    'object_top_level_kind_only_no_field_names'
  ]),
  memory_overview: Object.freeze([
    'object_top_level_kind_only_no_field_names'
  ]),
  audit_memory: Object.freeze([
    'array_item_count_bucket_only',
    'array_top_level_kind_only',
    'object_top_level_kind_only_no_field_names'
  ]),
  prepare_memory_context: Object.freeze([
    'object_top_level_kind_only_no_field_names'
  ])
});

const COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeReadAttempts',
  'responseShapeInspections',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'runtimeCalled',
  'liveVcpToolBoxCalled',
  'nativeReadExecuted',
  'responseShapeInspected',
  'memoryRead',
  'realMemoryRead',
  'rawPrivateRead',
  'providerApiCalled',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'publicMcpExpanded',
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

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function sortedUnique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))].sort();
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
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

function missingFields(shape, index) {
  const value = isPlainObject(shape) ? shape : {};
  return REQUIRED_TOOL_SHAPE_FIELDS
    .filter(field => !hasOwn(value, field))
    .map(field => `toolShapes[${index}].${field}`);
}

function invalidToolShape(shape, index) {
  if (!isPlainObject(shape)) return [`toolShapes[${index}]`];
  const blockers = [];
  const prefix = `toolShapes[${index}]`;
  const toolName = shape.toolName;
  const allowedTopLevel = ALLOWED_TOP_LEVEL_BY_TOOL[toolName] || [];
  const allowedShapes = ALLOWED_SHAPE_BY_TOOL[toolName] || [];

  if (!ALLOWED_TOOL_NAMES.includes(toolName)) blockers.push(`${prefix}.toolName`);
  if (shape.surface !== 'default_read_only') blockers.push(`${prefix}.surface`);
  if (shape.direction !== 'native_read_response_projection') blockers.push(`${prefix}.direction`);
  if (!ALLOWED_RESPONSE_SHAPE_CATEGORIES.includes(shape.responseShapeCategory)) {
    blockers.push(`${prefix}.responseShapeCategory`);
  }
  if (!allowedShapes.includes(shape.responseShapeCategory)) {
    blockers.push(`${prefix}.responseShapeCategoryForTool`);
  }
  if (!ALLOWED_TOP_LEVEL_KIND_CATEGORIES.includes(shape.topLevelKindCategory)) {
    blockers.push(`${prefix}.topLevelKindCategory`);
  }
  if (!allowedTopLevel.includes(shape.topLevelKindCategory)) {
    blockers.push(`${prefix}.topLevelKindCategoryForTool`);
  }
  if (!ALLOWED_ITEM_COUNT_BUCKETS.includes(shape.itemCountBucket)) {
    blockers.push(`${prefix}.itemCountBucket`);
  }
  if (!ALLOWED_BYTE_COUNT_BUCKETS.includes(shape.byteCountBucket)) {
    blockers.push(`${prefix}.byteCountBucket`);
  }
  if (shape.projectionKind !== EXPECTED_PROJECTION_BY_TOOL[toolName]) {
    blockers.push(`${prefix}.projectionKind`);
  }
  for (const field of ['lowDisclosureOnly', 'compatible']) {
    if (shape[field] !== true) blockers.push(`${prefix}.${field}`);
  }
  for (const field of ['fieldNamesDisclosed', 'contentIncluded', 'endpointDisclosed', 'locatorDisclosed']) {
    if (shape[field] !== false) blockers.push(`${prefix}.${field}`);
  }

  return blockers;
}

function sanitizedToolShape(shape) {
  if (!isPlainObject(shape)) {
    return {
      toolName: null,
      compatible: false
    };
  }
  return {
    toolName: ALLOWED_TOOL_NAMES.includes(shape.toolName) ? shape.toolName : null,
    responseShapeCategory: ALLOWED_RESPONSE_SHAPE_CATEGORIES.includes(shape.responseShapeCategory)
      ? shape.responseShapeCategory
      : 'invalid',
    topLevelKindCategory: ALLOWED_TOP_LEVEL_KIND_CATEGORIES.includes(shape.topLevelKindCategory)
      ? shape.topLevelKindCategory
      : 'invalid',
    itemCountBucket: ALLOWED_ITEM_COUNT_BUCKETS.includes(shape.itemCountBucket)
      ? shape.itemCountBucket
      : 'invalid',
    byteCountBucket: ALLOWED_BYTE_COUNT_BUCKETS.includes(shape.byteCountBucket)
      ? shape.byteCountBucket
      : 'invalid',
    projectionKind: typeof shape.projectionKind === 'string' ? shape.projectionKind : null,
    lowDisclosureOnly: shape.lowDisclosureOnly === true,
    compatible: shape.compatible === true
  };
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
    nativeReadResponseShapeCompatibilityPassed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    responseShapeInspected: false,
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

function evaluateNativeReadResponseShapeCompatibilityContract(input = {}) {
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
  if (!Array.isArray(input.toolShapes)) return failure('invalid_tool_shapes');

  const toolShapes = input.toolShapes;
  const toolNames = sortedUnique(toolShapes
    .filter(isPlainObject)
    .map(shape => shape.toolName)
    .filter(name => ALLOWED_TOOL_NAMES.includes(name)));
  const blockers = [];

  REQUIRED_READONLY_TOOLS
    .filter(toolName => !toolNames.includes(toolName))
    .forEach(toolName => blockers.push(`missing_required_readonly_tool_shape_${toolName}`));

  toolShapes.forEach((shape, index) => {
    blockers.push(...missingFields(shape, index));
    blockers.push(...invalidToolShape(shape, index));
  });

  const accepted = blockers.length === 0;
  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'native_read_response_shape_compatibility_accepted'
      : 'native_read_response_shape_compatibility_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    requiredReadOnlyTools: [...REQUIRED_READONLY_TOOLS],
    toolShapeSummary: toolShapes.map(sanitizedToolShape),
    nativeReadResponseShapeCompatibilityPassed: accepted,
    fullPlanPackCompleted: false,
    compatibilityBoundary: {
      consumesCategoryOnlyShapeMetadata: true,
      consumesResponseBody: false,
      disclosesFieldNames: false,
      disclosesMemoryContent: false,
      callsRuntime: false,
      executesNativeRead: false,
      performsDurableMutation: false,
      expandsPublicMcp: false,
      claimsReadiness: false
    },
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    responseShapeInspected: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    nextGate: accepted
      ? 'feed_local_shape_compatibility_into_phase2_completion_audit_without_native_read_claim'
      : 'close_shape_projection_gaps_without_consuming_raw_native_response'
  };
}

module.exports = {
  ALLOWED_RESPONSE_SHAPE_CATEGORIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_READONLY_TOOLS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNativeReadResponseShapeCompatibilityContract
};
