'use strict';

const CONTRACT_NAME = 'VcpMemoryFallbackLocalMemoryQueryQualityDryRunContract';
const CONTRACT_MODE = 'fixture_fallback_query_quality_dry_run_contract_only';
const SCHEMA_VERSION = 1;

const ALLOWED_CLIENT_FAMILIES = Object.freeze([
  'codex',
  'claude',
  'shared',
  'unknown'
]);

const ALLOWED_DATASET_SOURCES = Object.freeze([
  'fixture',
  'temp_local_db',
  'unknown'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'dry_run_pass',
  'dry_run_fail_local_fallback',
  'deny',
  'stop_l4'
]);

const ALLOWED_FALLBACK_REASONS = Object.freeze([
  'vcp_target_unapproved',
  'vcp_target_unavailable',
  'offline_continuity',
  'test_or_dry_run',
  'differential_comparison',
  'vcp_failure_policy_bound',
  'none'
]);

const ALLOWED_RESULT_SOURCES = Object.freeze([
  'local_fallback',
  'vcp_native',
  'unknown'
]);

const ALLOWED_VISIBILITIES = Object.freeze([
  'private',
  'shared',
  'public',
  'unknown'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'queryRequest',
  'dryRunFixture',
  'qualityExpectations',
  'expectedDecision',
  'counters'
]);

const REQUIRED_REQUEST_FIELDS = Object.freeze([
  'request_id',
  'client_family',
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'requested_visibility',
  'fallback_reason',
  'query_fixture_only',
  'temp_local_data_only',
  'bounded_scope_present',
  'broad_or_ambiguous_query',
  'low_disclosure_output_required',
  'real_query_requested',
  'private_runtime_read_requested',
  'mcp_memory_tool_requested',
  'provider_rerank_or_embedding_requested',
  'broad_memory_scan_requested'
]);

const REQUIRED_DRY_RUN_FIELDS = Object.freeze([
  'dataset_source',
  'result_source',
  'fallback_result_marked',
  'vcp_native_result_marked',
  'synthetic_quality_failure_present',
  'failure_marked_local_fallback',
  'raw_private_content_present',
  'raw_result_payload_present',
  'provider_result_present',
  'mcp_tool_result_present',
  'real_memory_result_present'
]);

const REQUIRED_EXPECTATION_FIELDS = Object.freeze([
  'must_contain_present',
  'must_not_contain_present',
  'top_k_order_present',
  'tombstoned_suppression_required',
  'cross_client_private_suppression_required',
  'query_failure_marked_local_fallback',
  'low_disclosure_projection_required',
  'quality_score_claim_allowed',
  'provider_quality_claim_allowed',
  'readiness_or_reliability_claim_allowed'
]);

const REQUIRED_REQUEST_BOOLEAN_FIELDS = Object.freeze([
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'query_fixture_only',
  'temp_local_data_only',
  'bounded_scope_present',
  'broad_or_ambiguous_query',
  'low_disclosure_output_required',
  'real_query_requested',
  'private_runtime_read_requested',
  'mcp_memory_tool_requested',
  'provider_rerank_or_embedding_requested',
  'broad_memory_scan_requested'
]);

const REQUIRED_DRY_RUN_BOOLEAN_FIELDS = Object.freeze([
  'fallback_result_marked',
  'vcp_native_result_marked',
  'synthetic_quality_failure_present',
  'failure_marked_local_fallback',
  'raw_private_content_present',
  'raw_result_payload_present',
  'provider_result_present',
  'mcp_tool_result_present',
  'real_memory_result_present'
]);

const REQUIRED_EXPECTATION_BOOLEAN_FIELDS = Object.freeze([
  'must_contain_present',
  'must_not_contain_present',
  'top_k_order_present',
  'tombstoned_suppression_required',
  'cross_client_private_suppression_required',
  'query_failure_marked_local_fallback',
  'low_disclosure_projection_required',
  'quality_score_claim_allowed',
  'provider_quality_claim_allowed',
  'readiness_or_reliability_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'fallbackExecutions',
  'queryExecutions',
  'privateRuntimeReads',
  'realQueries',
  'mcpToolCalls',
  'providerApiCalls',
  'realMemoryReads',
  'realMemoryWrites',
  'rawStoreScans',
  'broadMemoryScans',
  'tempLocalWrites',
  'durableAuditWrites',
  'durableMemoryWrites',
  'publicMcpExpansions',
  'approvalLineOperations',
  'approvalRequestSubmissions',
  'readinessClaims',
  'qualityScoreClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'query',
  'queryText',
  'query_text',
  'rawQuery',
  'raw_query',
  'rawResult',
  'raw_result',
  'rawResultPayload',
  'raw_result_payload',
  'rawOutput',
  'raw_output',
  'rawPayload',
  'raw_payload',
  'rawPrivatePayload',
  'raw_private_payload',
  'privateContent',
  'private_content',
  'memoryContent',
  'memory_content',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'privateKey',
  'endpoint',
  'rawPath',
  'configEnvPath',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawCacheRow',
  'rawVectorRow',
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawRag',
  'rawRagInjectedContext',
  'rawPrompt',
  'providerPayload',
  'rerankPayload',
  'embeddingPayload',
  'productionReady',
  'releaseReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => (prefix ? `${prefix}.${field}` : field));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
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

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.queryRequest, REQUIRED_REQUEST_FIELDS, 'queryRequest'),
    ...collectUnexpectedKeys(input.dryRunFixture, REQUIRED_DRY_RUN_FIELDS, 'dryRunFixture'),
    ...collectUnexpectedKeys(input.qualityExpectations, REQUIRED_EXPECTATION_FIELDS, 'qualityExpectations'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function allScopePresent(request) {
  return Boolean(
    request.client_id_present &&
    request.workspace_scope_present &&
    request.project_scope_present &&
    request.owner_scope_present
  );
}

function lowDisclosureProjection(input) {
  const request = isPlainObject(input) ? input.queryRequest : null;
  const fixture = isPlainObject(input) ? input.dryRunFixture : null;

  return {
    requestId: isPlainObject(request) && typeof request.request_id === 'string' ? request.request_id : null,
    clientFamily: isPlainObject(request) && typeof request.client_family === 'string'
      ? request.client_family
      : null,
    fallbackReason: isPlainObject(request) && typeof request.fallback_reason === 'string'
      ? request.fallback_reason
      : null,
    requestedVisibility: isPlainObject(request) && typeof request.requested_visibility === 'string'
      ? request.requested_visibility
      : null,
    datasetSource: isPlainObject(fixture) && typeof fixture.dataset_source === 'string'
      ? fixture.dataset_source
      : null,
    resultSource: isPlainObject(fixture) && typeof fixture.result_source === 'string'
      ? fixture.result_source
      : null,
    expectedDecision: isPlainObject(input) && typeof input.expectedDecision === 'string'
      ? input.expectedDecision
      : null
  };
}

function rejected(reasonCode, input, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    unexpectedFields: details.unexpectedFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    computedDecision: details.computedDecision || null,
    expectedDecision: isPlainObject(input) ? input.expectedDecision || null : null,
    nextAction: 'fix_fixture_or_stop',
    fixtureQueryQualityDryRunOnly: true,
    runtimeWiringExecuted: false,
    localFallbackExecuted: false,
    queryExecuted: false,
    privateRuntimeRead: false,
    realQueryExecuted: false,
    mcpToolCalled: false,
    providerApiCalled: false,
    realMemoryRead: false,
    realMemoryWritten: false,
    rawStoreScanned: false,
    broadMemoryScanned: false,
    tempLocalWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    publicMcpExpanded: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    readinessClaimAllowed: false,
    qualityScoreClaimAllowed: false
  };
}

function validateShape(input) {
  const request = input.queryRequest;
  const fixture = input.dryRunFixture;
  const expectations = input.qualityExpectations;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    invalid.push('queryRequest.request_id');
  }
  if (!ALLOWED_CLIENT_FAMILIES.includes(request.client_family)) {
    invalid.push('queryRequest.client_family');
  }
  if (!ALLOWED_VISIBILITIES.includes(request.requested_visibility)) {
    invalid.push('queryRequest.requested_visibility');
  }
  if (!ALLOWED_FALLBACK_REASONS.includes(request.fallback_reason)) {
    invalid.push('queryRequest.fallback_reason');
  }
  if (!ALLOWED_DATASET_SOURCES.includes(fixture.dataset_source)) {
    invalid.push('dryRunFixture.dataset_source');
  }
  if (!ALLOWED_RESULT_SOURCES.includes(fixture.result_source)) {
    invalid.push('dryRunFixture.result_source');
  }
  for (const field of REQUIRED_REQUEST_BOOLEAN_FIELDS) {
    if (typeof request[field] !== 'boolean') invalid.push(`queryRequest.${field}`);
  }
  for (const field of REQUIRED_DRY_RUN_BOOLEAN_FIELDS) {
    if (typeof fixture[field] !== 'boolean') invalid.push(`dryRunFixture.${field}`);
  }
  for (const field of REQUIRED_EXPECTATION_BOOLEAN_FIELDS) {
    if (typeof expectations[field] !== 'boolean') invalid.push(`qualityExpectations.${field}`);
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }
  return invalid;
}

function computeQueryQualityDecision(request, fixture, expectations) {
  if (
    request.query_fixture_only !== true ||
    request.temp_local_data_only !== true ||
    request.real_query_requested === true ||
    request.private_runtime_read_requested === true ||
    request.mcp_memory_tool_requested === true ||
    request.provider_rerank_or_embedding_requested === true ||
    request.broad_memory_scan_requested === true
  ) {
    return 'stop_l4';
  }

  if (
    fixture.raw_private_content_present === true ||
    fixture.raw_result_payload_present === true ||
    fixture.provider_result_present === true ||
    fixture.mcp_tool_result_present === true ||
    fixture.real_memory_result_present === true
  ) {
    return 'stop_l4';
  }

  if (
    request.client_family === 'unknown' ||
    request.requested_visibility === 'unknown' ||
    !allScopePresent(request) ||
    fixture.dataset_source === 'unknown' ||
    fixture.result_source !== 'local_fallback' ||
    fixture.fallback_result_marked !== true ||
    fixture.vcp_native_result_marked !== false
  ) {
    return 'deny';
  }

  if (request.broad_or_ambiguous_query === true && request.bounded_scope_present !== true) {
    return 'deny';
  }

  if (
    request.low_disclosure_output_required !== true ||
    expectations.must_contain_present !== true ||
    expectations.must_not_contain_present !== true ||
    expectations.top_k_order_present !== true ||
    expectations.tombstoned_suppression_required !== true ||
    expectations.cross_client_private_suppression_required !== true ||
    expectations.low_disclosure_projection_required !== true ||
    expectations.quality_score_claim_allowed !== false ||
    expectations.provider_quality_claim_allowed !== false ||
    expectations.readiness_or_reliability_claim_allowed !== false
  ) {
    return 'deny';
  }

  if (fixture.synthetic_quality_failure_present === true) {
    if (
      fixture.failure_marked_local_fallback === true &&
      expectations.query_failure_marked_local_fallback === true
    ) {
      return 'dry_run_fail_local_fallback';
    }
    return 'deny';
  }

  return 'dry_run_pass';
}

function validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_REQUEST_FIELDS, input.queryRequest, 'queryRequest'),
    ...missingFields(REQUIRED_DRY_RUN_FIELDS, input.dryRunFixture, 'dryRunFixture'),
    ...missingFields(REQUIRED_EXPECTATION_FIELDS, input.qualityExpectations, 'qualityExpectations'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_query_secret_runtime_or_overclaim_fields', input, { forbiddenFields });
  }

  const unexpectedFields = collectUnexpectedFields(input);
  if (unexpectedFields.length > 0) {
    return rejected('unexpected_fields', input, { unexpectedFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = validateShape(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_query_quality_dry_run_contract', input, { invalidFields });
  }

  const computedDecision = computeQueryQualityDecision(
    input.queryRequest,
    input.dryRunFixture,
    input.qualityExpectations
  );
  if (input.expectedDecision !== computedDecision) {
    return rejected('decision_mismatch', input, {
      computedDecision,
      invalidFields: ['expectedDecision']
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    requestId: input.queryRequest.request_id,
    clientFamily: input.queryRequest.client_family,
    fallbackReason: input.queryRequest.fallback_reason,
    datasetSource: input.dryRunFixture.dataset_source,
    resultSource: input.dryRunFixture.result_source,
    expectedDecision: input.expectedDecision,
    computedDecision,
    dryRunPassed: computedDecision === 'dry_run_pass',
    dryRunFailedAsLocalFallback: computedDecision === 'dry_run_fail_local_fallback',
    fallbackResultMarked: input.dryRunFixture.fallback_result_marked,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_query_quality_dry_run_validated_no_runtime',
    fixtureQueryQualityDryRunOnly: true,
    runtimeWiringExecuted: false,
    localFallbackExecuted: false,
    queryExecuted: false,
    privateRuntimeRead: false,
    realQueryExecuted: false,
    mcpToolCalled: false,
    providerApiCalled: false,
    realMemoryRead: false,
    realMemoryWritten: false,
    rawStoreScanned: false,
    broadMemoryScanned: false,
    tempLocalWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    publicMcpExpanded: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    readinessClaimAllowed: false,
    qualityScoreClaimAllowed: false
  };
}

module.exports = {
  ALLOWED_CLIENT_FAMILIES,
  ALLOWED_DATASET_SOURCES,
  ALLOWED_DECISIONS,
  ALLOWED_FALLBACK_REASONS,
  ALLOWED_RESULT_SOURCES,
  ALLOWED_VISIBILITIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_DRY_RUN_BOOLEAN_FIELDS,
  REQUIRED_DRY_RUN_FIELDS,
  REQUIRED_EXPECTATION_BOOLEAN_FIELDS,
  REQUIRED_EXPECTATION_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract
};
