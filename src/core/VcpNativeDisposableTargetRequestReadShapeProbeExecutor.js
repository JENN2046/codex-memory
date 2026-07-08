'use strict';

const {
  ALLOWED_QUERY_BOUNDARIES,
  ALLOWED_REQUEST_BODY_SHAPES,
  FORBIDDEN_RAW_VALUE_FIELD_NAMES,
  ZERO_COUNTERS,
  buildVcpNativeDisposableTargetResolverTransportBoundaryContract
} = require('./VcpNativeDisposableTargetResolverTransportBoundaryContract');

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');
const {
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal
} = require('./CurrentProductGoalContract');

const EXECUTOR_NAME = 'VcpNativeDisposableTargetRequestReadShapeProbeExecutor';
const EXECUTOR_MODE = 'disposable_target_request_read_shape_probe_low_disclosure_executor';
const SCHEMA_VERSION = 1;
const PURPOSE = 'component_action_request_read_shape_probe';
const FIELD_NAME_DISCLOSURE_POLICY = 'no_field_names_disclosed_category_bucket_shape_only';
const GOVERNANCE_METADATA_PATH = 'params._meta.codexMemoryGovernance';

const ALLOWED_TASK_IDS = Object.freeze([
  'CM-1964',
  'CM-2001',
  'CM-2004'
]);

const ALLOWED_RESOLVER_CATEGORIES = Object.freeze([
  'target_reference_to_disposable_component_action_invoker',
  'injected_test_resolver'
]);

const ALLOWED_TRANSPORT_CATEGORIES = Object.freeze([
  'local_direct_component_action_invoker',
  'local_http_transport',
  'injected_test_transport'
]);

const ALLOWED_ERROR_STATUS_CLASSES = Object.freeze([
  'transport_error',
  'client_error',
  'server_error'
]);

const SIDE_EFFECT_COUNTERS = Object.freeze({
  memoryWrites: 0,
  durableWrites: 0,
  providerApiCalls: 0,
  dependencyChanges: 0,
  publicMcpExpansions: 0,
  vcpToolBoxCoreCodeModifications: 0,
  releaseDeployCutoverPushTagActions: 0,
  readinessClaims: 0
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function collectForbiddenRawValueFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenRawValueFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_RAW_VALUE_FIELD_NAMES.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenRawValueFields(nested, path));
  }
  return found;
}

function normalizeDurationBucket(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 'unknown';
  if (durationMs < 100) return 'lt_100ms';
  if (durationMs < 1000) return 'lt_1000ms';
  if (durationMs < 5000) return 'lt_5000ms';
  return 'gte_5000ms';
}

function topLevelKindCategory(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  const kind = typeof value;
  if (kind === 'object') return 'object';
  if (kind === 'string') return 'string';
  if (kind === 'number') return 'number';
  if (kind === 'boolean') return 'boolean';
  return 'unknown';
}

function itemCountBucket(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'zero';
    if (value.length === 1) return 'one';
    return 'many';
  }
  if (isPlainObject(value)) return 'object_not_counted';
  return 'not_applicable';
}

function responseShapeCategory(value) {
  const kind = topLevelKindCategory(value);
  if (kind === 'array') return 'array_item_count_bucket_only';
  if (kind === 'object') return 'object_top_level_kind_only_no_field_names';
  if (kind === 'null') return 'null_top_level_kind_only';
  if (['string', 'number', 'boolean'].includes(kind)) return 'primitive_top_level_kind_only';
  return 'unknown_shape';
}

function statusClassFromError(error) {
  if (error && typeof error.statusClass === 'string') {
    return ALLOWED_ERROR_STATUS_CLASSES.includes(error.statusClass)
      ? error.statusClass
      : 'transport_error';
  }
  const status = Number(error?.status || error?.statusCode || error?.httpStatus);
  if (Number.isInteger(status) && status >= 400 && status < 500) return 'client_error';
  if (Number.isInteger(status) && status >= 500 && status < 600) return 'server_error';
  return 'transport_error';
}

function routeStatusCategory(statusClass) {
  if (statusClass === 'success') return 'action_success_response_shape_projected';
  if (statusClass === 'client_error') return 'client_error_no_shape_unlock';
  if (statusClass === 'server_error') return 'server_error_no_shape_unlock';
  return 'transport_error_no_shape_unlock';
}

function probeCategory(statusClass) {
  if (statusClass === 'success') return 'request_read_shape_probe_executed_shape_projected';
  return 'request_read_shape_probe_attempted_no_shape_unlock';
}

function zeroExecutionCounters(overrides = {}) {
  return {
    resolverAttemptsUsed: 0,
    componentActionRequestReadShapeAttemptsUsed: 0,
    networkCallsUsed: 0,
    runtimeCallsUsed: 0,
    processStateInspectionsUsed: 0,
    listenerRechecksUsed: 0,
    serviceStartEnsureAttemptsUsed: 0,
    serviceStopAttemptsUsed: 0,
    serviceRestartAttemptsUsed: 0,
    localRepairFilesChanged: 0,
    validationRunsUsed: 0,
    retriesAfterTransientFailureUsed: 0,
    endpointLocatorDisclosures: 0,
    rawRequestBodiesPersisted: 0,
    rawResponseBodiesPersisted: 0,
    rawErrorPayloadsPersisted: 0,
    rawLogsPersisted: 0,
    secretOutputs: 0,
    nonTargetPrivateOutputs: 0,
    ...SIDE_EFFECT_COUNTERS,
    ...overrides
  };
}

function buildLowDisclosureReceipt({
  boundary,
  resolverCategory,
  transportCategory,
  statusClass,
  responseValue,
  durationMs,
  consumedResponseForShapeProjection,
  governanceMetadataCoverage
}) {
  const readShapeUnlocked = statusClass === 'success' && consumedResponseForShapeProjection === true;
  const governanceMetadataSent = governanceMetadataCoverage?.accepted === true;
  return {
    targetReferenceName: boundary.targetReferenceName,
    purpose: PURPOSE,
    component: boundary.component,
    action: boundary.action,
    requestBodyShapeCategory: boundary.executionWindow.requestBodyShapeCategory,
    componentActionRequestReadShapeProbeCategory: probeCategory(statusClass),
    resolverCategory,
    transportCategory,
    routeStatusCategory: routeStatusCategory(statusClass),
    statusClass,
    responseShapeCategory: consumedResponseForShapeProjection ? responseShapeCategory(responseValue) : 'not_consumed',
    topLevelKindCategory: consumedResponseForShapeProjection ? topLevelKindCategory(responseValue) : 'not_consumed',
    itemCountBucket: consumedResponseForShapeProjection ? itemCountBucket(responseValue) : 'not_consumed',
    fieldNameDisclosurePolicy: FIELD_NAME_DISCLOSURE_POLICY,
    durationBucket: normalizeDurationBucket(durationMs),
    zeroWriteCounters: { ...SIDE_EFFECT_COUNTERS },
    requestBodyGeneratedByHarness: true,
    concreteRequestBodyOutput: false,
    requestBodyPersisted: false,
    responseBodyConsumedForShapeProjection: consumedResponseForShapeProjection,
    rawResponseBodyPrinted: false,
    rawResponseBodyPersisted: false,
    rawErrorPayloadPrinted: false,
    rawErrorPayloadPersisted: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    configEnvRead: false,
    secretRead: false,
    logRead: false,
    stdoutStderrRead: false,
    privateMemoryContentDisclosed: false,
    memoryIdsDisclosed: false,
    memoryWritten: false,
    governanceMetadataSent,
    governanceMetadataPath: governanceMetadataSent ? GOVERNANCE_METADATA_PATH : null,
    governanceMetadataRawValueDisclosed: false,
    readShapeUnlocked,
    readinessClaimed: false
  };
}

function buildBoundaryProjection(boundaryContractInput) {
  const boundary = buildVcpNativeDisposableTargetResolverTransportBoundaryContract(boundaryContractInput);
  if (!boundary.accepted) return boundary;
  return {
    ...boundary,
    executionWindow: {
      ...boundary.executionWindow,
      requestBodyShapeCategory: boundaryContractInput.resolverTransportBoundary.requestBodyShapeCategory,
      queryBoundaryCategory: boundaryContractInput.resolverTransportBoundary.queryBoundaryCategory
    }
  };
}

function rejected(reasonCode, input = {}, details = {}) {
  return {
    accepted: false,
    executorName: EXECUTOR_NAME,
    executorMode: EXECUTOR_MODE,
    schemaVersion: SCHEMA_VERSION,
    reasonCode,
    lowDisclosureProjection: {
      taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
      targetReferenceName: isSafeReferenceName(input.targetReferenceName) ? input.targetReferenceName : null,
      purpose: PURPOSE
    },
    forbiddenFields: details.forbiddenFields || [],
    invalidFields: details.invalidFields || [],
    boundaryReasonCode: details.boundaryReasonCode || null,
    receipt: null,
    counters: zeroExecutionCounters(),
    requestBodyGeneratedByHarness: false,
    requestBodyPersisted: false,
    responseBodyConsumedForShapeProjection: false,
    rawResponseBodyPrinted: false,
    rawResponseBodyPersisted: false,
    rawErrorPayloadPrinted: false,
    rawErrorPayloadPersisted: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    memoryWritten: false,
    readShapeUnlocked: false,
    readinessClaimed: false
  };
}

function validateStaticInput(input) {
  const invalidFields = [];
  if (!isPlainObject(input)) return ['input'];
  if (!ALLOWED_TASK_IDS.includes(input.taskId)) invalidFields.push('taskId');
  if (!isSafeReferenceName(input.targetReferenceName)) invalidFields.push('targetReferenceName');
  if (!ALLOWED_RESOLVER_CATEGORIES.includes(input.resolverCategory)) invalidFields.push('resolverCategory');
  if (!ALLOWED_TRANSPORT_CATEGORIES.includes(input.transportCategory)) invalidFields.push('transportCategory');
  if (!ALLOWED_REQUEST_BODY_SHAPES.includes(input.requestBodyShapeCategory)) {
    invalidFields.push('requestBodyShapeCategory');
  }
  if (!ALLOWED_QUERY_BOUNDARIES.includes(input.queryBoundaryCategory)) {
    invalidFields.push('queryBoundaryCategory');
  }
  if (typeof input.invokeComponentAction !== 'function') invalidFields.push('invokeComponentAction');
  const governanceMetadataCoverage =
    validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(input.governanceMeta);
  if (governanceMetadataCoverage.accepted !== true) invalidFields.push('governanceMeta');
  return invalidFields;
}

function buildInMemoryProbeRequestBody() {
  return Object.freeze({
    query: 'neutral route read shape probe',
    max_results: 1,
    search_all_knowledge_bases: false
  });
}

async function executeVcpNativeDisposableTargetRequestReadShapeProbe(input = {}) {
  const forbiddenFields = collectForbiddenRawValueFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_values_must_not_enter_low_disclosure_probe_executor', input, {
      forbiddenFields
    });
  }

  const invalidFields = validateStaticInput(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_disposable_target_read_shape_probe_executor_input', input, {
      invalidFields
    });
  }

  const boundary = buildBoundaryProjection(input.boundaryContractInput);
  if (!boundary.accepted) {
    return rejected('cm1963_disposable_boundary_not_accepted', input, {
      boundaryReasonCode: boundary.reasonCode || 'unknown_boundary_rejection'
    });
  }

  if (boundary.targetReferenceName !== input.targetReferenceName) {
    return rejected('target_reference_mismatch_between_executor_and_boundary', input, {
      invalidFields: ['targetReferenceName']
    });
  }
  if (boundary.executionWindow.requestBodyShapeCategory !== input.requestBodyShapeCategory) {
    return rejected('request_body_shape_category_mismatch_between_executor_and_boundary', input, {
      invalidFields: ['requestBodyShapeCategory']
    });
  }
  if (boundary.executionWindow.queryBoundaryCategory !== input.queryBoundaryCategory) {
    return rejected('query_boundary_category_mismatch_between_executor_and_boundary', input, {
      invalidFields: ['queryBoundaryCategory']
    });
  }

  const startedAt = Date.now();
  const requestBody = buildInMemoryProbeRequestBody();
  const governanceMetadataCoverage =
    validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(input.governanceMeta);
  let statusClass = 'success';
  let responseValue = null;
  let consumedResponseForShapeProjection = false;

  try {
    responseValue = await input.invokeComponentAction({
      targetReferenceName: boundary.targetReferenceName,
      component: boundary.component,
      action: boundary.action,
      requestBody,
      governanceMeta: input.governanceMeta,
      maxResultCount: 1
    });
    consumedResponseForShapeProjection = true;
  } catch (error) {
    statusClass = statusClassFromError(error);
    responseValue = null;
    consumedResponseForShapeProjection = false;
  }

  const durationMs = Date.now() - startedAt;
  const networkCallsUsed = input.transportCategory === 'local_http_transport' ? 1 : 0;
  const receipt = buildLowDisclosureReceipt({
    boundary,
    resolverCategory: input.resolverCategory,
    transportCategory: input.transportCategory,
    statusClass,
    responseValue,
    durationMs,
    consumedResponseForShapeProjection,
    governanceMetadataCoverage
  });

  return {
    accepted: true,
    executorName: EXECUTOR_NAME,
    executorMode: EXECUTOR_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    receipt,
    counters: zeroExecutionCounters({
      resolverAttemptsUsed: 1,
      componentActionRequestReadShapeAttemptsUsed: 1,
      networkCallsUsed,
      runtimeCallsUsed: 1
    }),
    requestBodyGeneratedByHarness: true,
    concreteRequestBodyOutput: false,
    requestBodyPersisted: false,
    responseBodyConsumedForShapeProjection: receipt.responseBodyConsumedForShapeProjection,
    rawResponseBodyPrinted: false,
    rawResponseBodyPersisted: false,
    rawErrorPayloadPrinted: false,
    rawErrorPayloadPersisted: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    memoryWritten: false,
    readShapeUnlocked: receipt.readShapeUnlocked,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_TASK_IDS,
  ALLOWED_RESOLVER_CATEGORIES,
  ALLOWED_TRANSPORT_CATEGORIES,
  EXECUTOR_MODE,
  EXECUTOR_NAME,
  FIELD_NAME_DISCLOSURE_POLICY,
  GOVERNANCE_METADATA_PATH,
  PURPOSE,
  SCHEMA_VERSION,
  SIDE_EFFECT_COUNTERS,
  buildInMemoryProbeRequestBody,
  executeVcpNativeDisposableTargetRequestReadShapeProbe
};
