'use strict';

const CONTRACT_NAME = 'VcpMemoryFallbackLocalMemoryMarkerReceiptContract';
const CONTRACT_MODE = 'fixture_fallback_marker_receipt_contract_only';
const SCHEMA_VERSION = 1;

const FALLBACK_MARKER_CONTRACT_VERSION = 'vcp_memory_fallback_marker_v1';
const FALLBACK_RECEIPT_CONTRACT_VERSION = 'vcp_memory_fallback_receipt_v1';

const ALLOWED_CLIENT_FAMILIES = Object.freeze([
  'codex',
  'claude',
  'shared',
  'unknown'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'fallback_allowed',
  'deny',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
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

const ALLOWED_VISIBILITIES = Object.freeze([
  'private',
  'shared',
  'public',
  'unknown'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'fallbackRequest',
  'fallbackMarker',
  'receipt',
  'counters'
]);

const REQUIRED_REQUEST_FIELDS = Object.freeze([
  'request_id',
  'contract_version',
  'evidence_type',
  'mode',
  'decision',
  'operation_type',
  'client',
  'scope',
  'policy',
  'next_action_allowed'
]);

const REQUIRED_CLIENT_FIELDS = Object.freeze([
  'client_family',
  'client_id_present',
  'cross_client_private_requested',
  'cross_client_private_leakage_allowed'
]);

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'visibility',
  'visibility_expansion_requested'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'vcp_native_required',
  'fallback_policy_present',
  'fallback_reason',
  'private_runtime_read_requested',
  'real_query_requested',
  'mutation_requested'
]);

const REQUIRED_MARKER_FIELDS = Object.freeze([
  'memory_source',
  'contract_version',
  'vcp_native_result',
  'fallback_used',
  'fallback_reason',
  'scope_checked',
  'visibility_checked',
  'result_can_be_mistaken_for_vcp_native'
]);

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'receipt_id',
  'request_id',
  'contract_version',
  'fallback_source',
  'vcp_native_result',
  'fallback_used',
  'fallback_reason',
  'client_id_present',
  'scope_present',
  'visibility_present',
  'mutation_attempted',
  'durable_write_count',
  'output_disclosure',
  'raw_private_payload_disclosed',
  'secret_value_disclosed',
  'approval_line_value_disclosed',
  'public_mcp_expansion',
  'readiness_claimed',
  'next_action_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'fallbackExecutions',
  'privateRuntimeReads',
  'realQueries',
  'mcpToolCalls',
  'memoryReads',
  'memoryWrites',
  'memoryUpdates',
  'memorySupersedes',
  'memoryTombstones',
  'durableAuditWrites',
  'durableMemoryWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'approvalLineOperations',
  'approvalRequestSubmissions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'debugPayload',
  'debug_payload',
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

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !(field in actual))
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

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  const request = isPlainObject(input) ? input.fallbackRequest : null;
  const marker = isPlainObject(input) ? input.fallbackMarker : null;
  const receipt = isPlainObject(input) ? input.receipt : null;
  const client = isPlainObject(request?.client) ? request.client : null;
  const scope = isPlainObject(request?.scope) ? request.scope : null;

  return {
    requestId: isPlainObject(request) && typeof request.request_id === 'string' ? request.request_id : null,
    receiptId: isPlainObject(receipt) && typeof receipt.receipt_id === 'string' ? receipt.receipt_id : null,
    decision: isPlainObject(request) && typeof request.decision === 'string' ? request.decision : null,
    clientFamily: isPlainObject(client) && typeof client.client_family === 'string' ? client.client_family : null,
    visibility: isPlainObject(scope) && typeof scope.visibility === 'string' ? scope.visibility : null,
    fallbackReason: isPlainObject(marker) && typeof marker.fallback_reason === 'string'
      ? marker.fallback_reason
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
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    nextAction: 'fix_fixture_or_stop',
    fixtureFallbackMarkerReceiptOnly: true,
    runtimeWiringExecuted: false,
    localFallbackExecuted: false,
    privateRuntimeRead: false,
    realQueryExecuted: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function allScopePresent(scope) {
  return Boolean(
    scope?.workspace_scope_present &&
    scope?.project_scope_present &&
    scope?.owner_scope_present
  );
}

function validateRequestShape(request) {
  const invalid = [];
  if (request.contract_version !== FALLBACK_MARKER_CONTRACT_VERSION) {
    invalid.push('fallbackRequest.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(request.evidence_type)) {
    invalid.push('fallbackRequest.evidence_type');
  }
  if (request.mode !== 'fixture-only') {
    invalid.push('fallbackRequest.mode');
  }
  if (!ALLOWED_DECISIONS.includes(request.decision)) {
    invalid.push('fallbackRequest.decision');
  }
  if (!ALLOWED_CLIENT_FAMILIES.includes(request.client.client_family)) {
    invalid.push('fallbackRequest.client.client_family');
  }
  if (!ALLOWED_VISIBILITIES.includes(request.scope.visibility)) {
    invalid.push('fallbackRequest.scope.visibility');
  }
  if (!ALLOWED_FALLBACK_REASONS.includes(request.policy.fallback_reason)) {
    invalid.push('fallbackRequest.policy.fallback_reason');
  }

  if (request.decision === 'fallback_allowed') {
    if (request.client.client_id_present !== true) invalid.push('fallbackRequest.client.client_id_present');
    if (request.client.cross_client_private_requested !== false) {
      invalid.push('fallbackRequest.client.cross_client_private_requested');
    }
    if (request.client.cross_client_private_leakage_allowed !== false) {
      invalid.push('fallbackRequest.client.cross_client_private_leakage_allowed');
    }
    if (!allScopePresent(request.scope)) invalid.push('fallbackRequest.scope');
    if (request.scope.visibility === 'unknown') invalid.push('fallbackRequest.scope.visibility');
    if (request.scope.visibility_expansion_requested !== false) {
      invalid.push('fallbackRequest.scope.visibility_expansion_requested');
    }
    if (request.policy.vcp_native_required !== false) invalid.push('fallbackRequest.policy.vcp_native_required');
    if (request.policy.fallback_policy_present !== true) {
      invalid.push('fallbackRequest.policy.fallback_policy_present');
    }
    if (request.policy.fallback_reason === 'none') invalid.push('fallbackRequest.policy.fallback_reason');
    if (request.policy.private_runtime_read_requested !== false) {
      invalid.push('fallbackRequest.policy.private_runtime_read_requested');
    }
    if (request.policy.real_query_requested !== false) {
      invalid.push('fallbackRequest.policy.real_query_requested');
    }
    if (request.policy.mutation_requested !== false) {
      invalid.push('fallbackRequest.policy.mutation_requested');
    }
  }

  return invalid;
}

function validateMarkerShape(request, marker) {
  const invalid = [];
  if (marker.contract_version !== FALLBACK_MARKER_CONTRACT_VERSION) {
    invalid.push('fallbackMarker.contract_version');
  }
  if (marker.memory_source !== 'local_fallback') invalid.push('fallbackMarker.memory_source');
  if (marker.vcp_native_result !== false) invalid.push('fallbackMarker.vcp_native_result');
  if (marker.fallback_reason !== request.policy.fallback_reason) invalid.push('fallbackMarker.fallback_reason');
  if (marker.result_can_be_mistaken_for_vcp_native !== false) {
    invalid.push('fallbackMarker.result_can_be_mistaken_for_vcp_native');
  }
  if (request.decision === 'fallback_allowed') {
    if (marker.fallback_used !== true) invalid.push('fallbackMarker.fallback_used');
    if (marker.scope_checked !== true) invalid.push('fallbackMarker.scope_checked');
    if (marker.visibility_checked !== true) invalid.push('fallbackMarker.visibility_checked');
  } else if (marker.fallback_used !== false) {
    invalid.push('fallbackMarker.fallback_used');
  }
  return invalid;
}

function validateReceiptShape(request, marker, receipt) {
  const invalid = [];
  if (receipt.contract_version !== FALLBACK_RECEIPT_CONTRACT_VERSION) {
    invalid.push('receipt.contract_version');
  }
  if (receipt.fallback_source !== 'local_fallback') invalid.push('receipt.fallback_source');
  if (receipt.vcp_native_result !== false) invalid.push('receipt.vcp_native_result');
  if (receipt.fallback_used !== marker.fallback_used) invalid.push('receipt.fallback_used');
  if (receipt.fallback_reason !== marker.fallback_reason) invalid.push('receipt.fallback_reason');
  if (receipt.client_id_present !== request.client.client_id_present) {
    invalid.push('receipt.client_id_present');
  }
  if (receipt.scope_present !== allScopePresent(request.scope)) invalid.push('receipt.scope_present');
  if (receipt.visibility_present !== (request.scope.visibility !== 'unknown')) {
    invalid.push('receipt.visibility_present');
  }
  if (receipt.mutation_attempted !== false) invalid.push('receipt.mutation_attempted');
  if (receipt.durable_write_count !== 0) invalid.push('receipt.durable_write_count');
  if (!['summary', 'none', 'low_disclosure'].includes(receipt.output_disclosure)) {
    invalid.push('receipt.output_disclosure');
  }
  if (receipt.raw_private_payload_disclosed !== false) {
    invalid.push('receipt.raw_private_payload_disclosed');
  }
  if (receipt.secret_value_disclosed !== false) invalid.push('receipt.secret_value_disclosed');
  if (receipt.approval_line_value_disclosed !== false) {
    invalid.push('receipt.approval_line_value_disclosed');
  }
  if (receipt.public_mcp_expansion !== false) invalid.push('receipt.public_mcp_expansion');
  if (receipt.readiness_claimed !== false) invalid.push('receipt.readiness_claimed');
  return invalid;
}

function validateCrossFieldConsistency(request, receipt) {
  const invalid = [];
  if (receipt.request_id !== request.request_id) invalid.push('receipt.request_id');
  if (receipt.next_action_allowed !== request.next_action_allowed) invalid.push('receipt.next_action_allowed');
  if (request.decision === 'stop_l4') {
    const stopReasonPresent = Boolean(
      request.policy.private_runtime_read_requested ||
      request.policy.real_query_requested ||
      request.policy.mutation_requested ||
      request.client.cross_client_private_requested ||
      request.scope.visibility_expansion_requested
    );
    if (!stopReasonPresent) invalid.push('fallbackRequest.decision.stop_l4_reason');
  }
  return invalid;
}

function validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_REQUEST_FIELDS, input.fallbackRequest, 'fallbackRequest'),
    ...missingFields(REQUIRED_CLIENT_FIELDS, input.fallbackRequest?.client, 'fallbackRequest.client'),
    ...missingFields(REQUIRED_SCOPE_FIELDS, input.fallbackRequest?.scope, 'fallbackRequest.scope'),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.fallbackRequest?.policy, 'fallbackRequest.policy'),
    ...missingFields(REQUIRED_MARKER_FIELDS, input.fallbackMarker, 'fallbackMarker'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.receipt, 'receipt'),
    ...('counters' in input ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_runtime_or_overclaim_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  invalidFields.push(...validateRequestShape(input.fallbackRequest));
  invalidFields.push(...validateMarkerShape(input.fallbackRequest, input.fallbackMarker));
  invalidFields.push(...validateReceiptShape(input.fallbackRequest, input.fallbackMarker, input.receipt));
  invalidFields.push(...validateCrossFieldConsistency(input.fallbackRequest, input.receipt));

  if (invalidFields.length > 0) {
    return rejected('invalid_fallback_marker_receipt_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    requestId: input.fallbackRequest.request_id,
    receiptId: input.receipt.receipt_id,
    decision: input.fallbackRequest.decision,
    clientFamily: input.fallbackRequest.client.client_family,
    visibility: input.fallbackRequest.scope.visibility,
    fallbackReason: input.fallbackMarker.fallback_reason,
    fallbackUsed: input.fallbackMarker.fallback_used,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_fallback_marker_receipt_validated_no_runtime',
    fixtureFallbackMarkerReceiptOnly: true,
    runtimeWiringExecuted: false,
    localFallbackExecuted: false,
    privateRuntimeRead: false,
    realQueryExecuted: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  ALLOWED_CLIENT_FAMILIES,
  ALLOWED_DECISIONS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_FALLBACK_REASONS,
  ALLOWED_VISIBILITIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_MARKER_FIELDS,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract
};
