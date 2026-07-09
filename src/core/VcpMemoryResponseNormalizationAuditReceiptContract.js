'use strict';

const CONTRACT_NAME = 'VcpMemoryResponseNormalizationAuditReceiptContract';
const CONTRACT_MODE = 'fixture_schema_contract_only';
const SCHEMA_VERSION = 1;

const RESULT_CONTRACT_VERSION = 'vcp_memory_result_normalization_v1';
const RECEIPT_CONTRACT_VERSION = 'vcp_memory_invocation_contract_v1';

const ALLOWED_STATUSES = Object.freeze([
  'success',
  'fallback_success',
  'denied',
  'stopped_l4',
  'unknown_target',
  'partial',
  'error'
]);

const ALLOWED_SOURCE_RUNTIMES = Object.freeze([
  'vcp_toolbox',
  'local_fallback',
  'none'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'schema-only',
  'fixture-only'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'normalizedResult',
  'receipt',
  'counters'
]);

const REQUIRED_RESULT_FIELDS = Object.freeze([
  'result_id',
  'request_id',
  'receipt_id',
  'contract_version',
  'status',
  'source_runtime',
  'source_component',
  'source_capability',
  'profile',
  'confidence',
  'evidence',
  'scope',
  'fallback',
  'output',
  'warnings',
  'next_action_allowed'
]);

const REQUIRED_CONFIDENCE_FIELDS = Object.freeze([
  'level',
  'basis',
  'live_runtime_claimed'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'evidence_type',
  'evidence_refs',
  'raw_payload_included',
  'raw_payload_required_for_client'
]);

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'client_id_present',
  'workspace_scope_present',
  'owner_scope_present',
  'visibility',
  'cross_client_checked'
]);

const REQUIRED_FALLBACK_FIELDS = Object.freeze([
  'used',
  'reason',
  'vcp_native_result'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'items_count',
  'items'
]);

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'receipt_id',
  'timestamp',
  'request_id',
  'contract_version',
  'profile',
  'target_alias',
  'target_kind',
  'client_id_present',
  'workspace_scope_present',
  'owner_scope_present',
  'visibility_present',
  'operation_type',
  'components_requested_count',
  'actions_requested_count',
  'decision',
  'result_status',
  'fallback_used',
  'vcp_native_result',
  'runtime_calls_used',
  'provider_api_calls_used',
  'durable_write_count',
  'raw_private_payload_disclosed',
  'secret_value_disclosed',
  'approval_line_value_disclosed',
  'public_mcp_expansion',
  'readiness_claimed',
  'rollback_or_cleanup_available',
  'next_action_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'fallbackExecutions',
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
  'debugPayload',
  'debug_payload',
  'rawPrivatePayload',
  'raw_private_payload',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'privateKey',
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

const EXPECTED_DECISION_BY_STATUS = Object.freeze({
  success: Object.freeze(['allow']),
  fallback_success: Object.freeze(['fallback']),
  denied: Object.freeze(['deny']),
  stopped_l4: Object.freeze(['stop']),
  unknown_target: Object.freeze(['deny']),
  partial: Object.freeze(['partial']),
  error: Object.freeze(['stop', 'partial'])
});

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
  const result = isPlainObject(input) ? input.normalizedResult : null;
  const receipt = isPlainObject(input) ? input.receipt : null;

  return {
    resultId: isPlainObject(result) && typeof result.result_id === 'string' ? result.result_id : null,
    requestId: isPlainObject(result) && typeof result.request_id === 'string' ? result.request_id : null,
    receiptId: isPlainObject(receipt) && typeof receipt.receipt_id === 'string' ? receipt.receipt_id : null,
    status: isPlainObject(result) && typeof result.status === 'string' ? result.status : null,
    sourceRuntime: isPlainObject(result) && typeof result.source_runtime === 'string' ? result.source_runtime : null,
    evidenceType: isPlainObject(result?.evidence) && typeof result.evidence.evidence_type === 'string'
      ? result.evidence.evidence_type
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
    fixtureSchemaOnly: true,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    fallbackExecuted: false,
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

function validateResultShape(result) {
  const invalidFields = [];
  if (!isPlainObject(result)) return ['normalizedResult'];

  if (result.contract_version !== RESULT_CONTRACT_VERSION) invalidFields.push('normalizedResult.contract_version');
  if (!ALLOWED_STATUSES.includes(result.status)) invalidFields.push('normalizedResult.status');
  if (!ALLOWED_SOURCE_RUNTIMES.includes(result.source_runtime)) invalidFields.push('normalizedResult.source_runtime');
  if (!Array.isArray(result.warnings)) invalidFields.push('normalizedResult.warnings');

  const confidence = isPlainObject(result.confidence) ? result.confidence : {};
  if (!['none', 'low'].includes(confidence.level)) invalidFields.push('normalizedResult.confidence.level');
  if (!['schema', 'fixture'].includes(confidence.basis)) invalidFields.push('normalizedResult.confidence.basis');
  if (confidence.live_runtime_claimed !== false) invalidFields.push('normalizedResult.confidence.live_runtime_claimed');

  const evidence = isPlainObject(result.evidence) ? result.evidence : {};
  if (!ALLOWED_EVIDENCE_TYPES.includes(evidence.evidence_type)) invalidFields.push('normalizedResult.evidence.evidence_type');
  if (!Array.isArray(evidence.evidence_refs) || evidence.evidence_refs.length === 0) {
    invalidFields.push('normalizedResult.evidence.evidence_refs');
  }
  if (evidence.raw_payload_included !== false) invalidFields.push('normalizedResult.evidence.raw_payload_included');
  if (evidence.raw_payload_required_for_client !== false) {
    invalidFields.push('normalizedResult.evidence.raw_payload_required_for_client');
  }

  const scope = isPlainObject(result.scope) ? result.scope : {};
  if (typeof scope.client_id_present !== 'boolean') invalidFields.push('normalizedResult.scope.client_id_present');
  if (typeof scope.workspace_scope_present !== 'boolean') invalidFields.push('normalizedResult.scope.workspace_scope_present');
  if (typeof scope.owner_scope_present !== 'boolean') invalidFields.push('normalizedResult.scope.owner_scope_present');
  if (!['private', 'shared', 'public', 'unknown'].includes(scope.visibility)) {
    invalidFields.push('normalizedResult.scope.visibility');
  }
  if (typeof scope.cross_client_checked !== 'boolean') invalidFields.push('normalizedResult.scope.cross_client_checked');

  const fallback = isPlainObject(result.fallback) ? result.fallback : {};
  if (typeof fallback.used !== 'boolean') invalidFields.push('normalizedResult.fallback.used');
  if (typeof fallback.reason !== 'string') invalidFields.push('normalizedResult.fallback.reason');
  if (typeof fallback.vcp_native_result !== 'boolean') invalidFields.push('normalizedResult.fallback.vcp_native_result');

  const output = isPlainObject(result.output) ? result.output : {};
  if (!['summary', 'structured', 'none'].includes(output.disclosure_level)) {
    invalidFields.push('normalizedResult.output.disclosure_level');
  }
  if (!Number.isInteger(output.items_count) || output.items_count < 0) {
    invalidFields.push('normalizedResult.output.items_count');
  }
  if (!Array.isArray(output.items)) invalidFields.push('normalizedResult.output.items');

  return invalidFields;
}

function validateReceiptShape(receipt) {
  const invalidFields = [];
  if (!isPlainObject(receipt)) return ['receipt'];

  if (receipt.contract_version !== RECEIPT_CONTRACT_VERSION) invalidFields.push('receipt.contract_version');
  if (!['allow', 'deny', 'stop', 'partial', 'fallback'].includes(receipt.decision)) {
    invalidFields.push('receipt.decision');
  }
  if (!ALLOWED_STATUSES.includes(receipt.result_status)) invalidFields.push('receipt.result_status');
  if (!Number.isInteger(receipt.components_requested_count) || receipt.components_requested_count < 0) {
    invalidFields.push('receipt.components_requested_count');
  }
  if (!Number.isInteger(receipt.actions_requested_count) || receipt.actions_requested_count < 0) {
    invalidFields.push('receipt.actions_requested_count');
  }
  if (receipt.runtime_calls_used !== 0) invalidFields.push('receipt.runtime_calls_used');
  if (receipt.provider_api_calls_used !== 0) invalidFields.push('receipt.provider_api_calls_used');
  if (receipt.durable_write_count !== 0) invalidFields.push('receipt.durable_write_count');
  if (receipt.raw_private_payload_disclosed !== false) invalidFields.push('receipt.raw_private_payload_disclosed');
  if (receipt.secret_value_disclosed !== false) invalidFields.push('receipt.secret_value_disclosed');
  if (receipt.approval_line_value_disclosed !== false) invalidFields.push('receipt.approval_line_value_disclosed');
  if (receipt.public_mcp_expansion !== false) invalidFields.push('receipt.public_mcp_expansion');
  if (receipt.readiness_claimed !== false) invalidFields.push('receipt.readiness_claimed');
  return invalidFields;
}

function validateCrossFieldConsistency(result, receipt) {
  const invalidFields = [];

  if (receipt.request_id !== result.request_id) invalidFields.push('receipt.request_id');
  if (receipt.receipt_id !== result.receipt_id) invalidFields.push('receipt.receipt_id');
  if (receipt.profile !== result.profile) invalidFields.push('receipt.profile');
  if (receipt.result_status !== result.status) invalidFields.push('receipt.result_status');
  if (receipt.next_action_allowed !== result.next_action_allowed) invalidFields.push('receipt.next_action_allowed');

  const expectedDecisions = EXPECTED_DECISION_BY_STATUS[result.status] || [];
  if (!expectedDecisions.includes(receipt.decision)) invalidFields.push('receipt.decision');

  if (result.status === 'success') {
    if (result.source_runtime !== 'vcp_toolbox') invalidFields.push('normalizedResult.source_runtime');
    if (result.fallback.used !== false) invalidFields.push('normalizedResult.fallback.used');
    if (result.fallback.vcp_native_result !== true) invalidFields.push('normalizedResult.fallback.vcp_native_result');
    if (receipt.fallback_used !== false) invalidFields.push('receipt.fallback_used');
    if (receipt.vcp_native_result !== true) invalidFields.push('receipt.vcp_native_result');
  }

  if (result.status === 'fallback_success') {
    if (result.source_runtime !== 'local_fallback') invalidFields.push('normalizedResult.source_runtime');
    if (result.fallback.used !== true) invalidFields.push('normalizedResult.fallback.used');
    if (result.fallback.vcp_native_result !== false) invalidFields.push('normalizedResult.fallback.vcp_native_result');
    if (receipt.fallback_used !== true) invalidFields.push('receipt.fallback_used');
    if (receipt.vcp_native_result !== false) invalidFields.push('receipt.vcp_native_result');
  }

  if (['denied', 'stopped_l4', 'unknown_target'].includes(result.status)) {
    if (result.source_runtime !== 'none') invalidFields.push('normalizedResult.source_runtime');
    if (result.fallback.used !== false) invalidFields.push('normalizedResult.fallback.used');
    if (result.fallback.vcp_native_result !== false) invalidFields.push('normalizedResult.fallback.vcp_native_result');
    if (receipt.fallback_used !== false) invalidFields.push('receipt.fallback_used');
    if (receipt.vcp_native_result !== false) invalidFields.push('receipt.vcp_native_result');
  }

  if (result.status === 'partial' && !['vcp_toolbox', 'local_fallback'].includes(result.source_runtime)) {
    invalidFields.push('normalizedResult.source_runtime');
  }

  if (result.source_runtime === 'local_fallback' && (result.fallback.used !== true || result.fallback.vcp_native_result !== false)) {
    invalidFields.push('normalizedResult.fallback');
  }
  if (result.source_runtime === 'vcp_toolbox' && result.fallback.used !== false) {
    invalidFields.push('normalizedResult.fallback.used');
  }
  if (result.source_runtime === 'none' && (result.fallback.used !== false || result.fallback.vcp_native_result !== false)) {
    invalidFields.push('normalizedResult.fallback');
  }

  const successLike = ['success', 'fallback_success'].includes(result.status);
  if (successLike) {
    if (result.scope.client_id_present !== true) invalidFields.push('normalizedResult.scope.client_id_present');
    if (result.scope.workspace_scope_present !== true) invalidFields.push('normalizedResult.scope.workspace_scope_present');
    if (result.scope.owner_scope_present !== true) invalidFields.push('normalizedResult.scope.owner_scope_present');
    if (result.scope.visibility === 'unknown') invalidFields.push('normalizedResult.scope.visibility');
    if (result.scope.cross_client_checked !== true) invalidFields.push('normalizedResult.scope.cross_client_checked');
  }

  return invalidFields;
}

function validateVcpMemoryResponseNormalizationAuditReceiptContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_RESULT_FIELDS, input.normalizedResult, 'normalizedResult'),
    ...missingFields(REQUIRED_CONFIDENCE_FIELDS, input.normalizedResult?.confidence, 'normalizedResult.confidence'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.normalizedResult?.evidence, 'normalizedResult.evidence'),
    ...missingFields(REQUIRED_SCOPE_FIELDS, input.normalizedResult?.scope, 'normalizedResult.scope'),
    ...missingFields(REQUIRED_FALLBACK_FIELDS, input.normalizedResult?.fallback, 'normalizedResult.fallback'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.normalizedResult?.output, 'normalizedResult.output'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.receipt, 'receipt')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_private_debug_or_overclaim_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  invalidFields.push(...validateResultShape(input.normalizedResult));
  invalidFields.push(...validateReceiptShape(input.receipt));
  invalidFields.push(...validateCrossFieldConsistency(input.normalizedResult, input.receipt));

  if (invalidFields.length > 0) {
    return rejected('invalid_response_normalization_audit_receipt_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    resultId: input.normalizedResult.result_id,
    requestId: input.normalizedResult.request_id,
    receiptId: input.receipt.receipt_id,
    status: input.normalizedResult.status,
    sourceRuntime: input.normalizedResult.source_runtime,
    decision: input.receipt.decision,
    evidenceType: input.normalizedResult.evidence.evidence_type,
    fallbackUsed: input.normalizedResult.fallback.used,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_schema_contract_validated_no_runtime',
    fixtureSchemaOnly: true,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    fallbackExecuted: false,
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
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_SOURCE_RUNTIMES,
  ALLOWED_STATUSES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_RESULT_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryResponseNormalizationAuditReceiptContract
};
