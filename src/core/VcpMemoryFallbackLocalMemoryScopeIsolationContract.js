'use strict';

const CONTRACT_NAME = 'VcpMemoryFallbackLocalMemoryScopeIsolationContract';
const CONTRACT_MODE = 'fixture_fallback_scope_client_isolation_contract_only';
const SCHEMA_VERSION = 1;

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
  'isolationRequest',
  'fallbackCandidate',
  'isolationPolicy',
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
  'cross_client_private_requested',
  'shared_boundary_present',
  'fallback_reason'
]);

const REQUIRED_CANDIDATE_FIELDS = Object.freeze([
  'memory_source',
  'client_family',
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'visibility',
  'result_can_be_mistaken_for_vcp_native',
  'raw_private_payload_present',
  'secret_value_present'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'same_client_private_required',
  'shared_visibility_requires_explicit_boundary',
  'visibility_widening_allowed',
  'unknown_scope_fails_closed',
  'fallback_must_remain_marked'
]);

const REQUIRED_REQUEST_BOOLEAN_FIELDS = Object.freeze([
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'cross_client_private_requested',
  'shared_boundary_present'
]);

const REQUIRED_CANDIDATE_BOOLEAN_FIELDS = Object.freeze([
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'result_can_be_mistaken_for_vcp_native',
  'raw_private_payload_present',
  'secret_value_present'
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

const VISIBILITY_RANK = Object.freeze({
  unknown: 0,
  private: 1,
  shared: 2,
  public: 3
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !Object.prototype.hasOwnProperty.call(actual, field))
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

function allScopePresent(value) {
  return Boolean(
    value?.workspace_scope_present &&
    value?.project_scope_present &&
    value?.owner_scope_present
  );
}

function lowDisclosureProjection(input) {
  const request = isPlainObject(input) ? input.isolationRequest : null;
  const candidate = isPlainObject(input) ? input.fallbackCandidate : null;

  return {
    requestId: isPlainObject(request) && typeof request.request_id === 'string' ? request.request_id : null,
    requestClientFamily: isPlainObject(request) && typeof request.client_family === 'string'
      ? request.client_family
      : null,
    candidateClientFamily: isPlainObject(candidate) && typeof candidate.client_family === 'string'
      ? candidate.client_family
      : null,
    requestedVisibility: isPlainObject(request) && typeof request.requested_visibility === 'string'
      ? request.requested_visibility
      : null,
    candidateVisibility: isPlainObject(candidate) && typeof candidate.visibility === 'string'
      ? candidate.visibility
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
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    computedDecision: details.computedDecision || null,
    expectedDecision: isPlainObject(input) ? input.expectedDecision || null : null,
    nextAction: 'fix_fixture_or_stop',
    fixtureScopeIsolationOnly: true,
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

function validateShape(input) {
  const request = input.isolationRequest;
  const candidate = input.fallbackCandidate;
  const policy = input.isolationPolicy;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    invalid.push('isolationRequest.request_id');
  }
  if (!ALLOWED_CLIENT_FAMILIES.includes(request.client_family)) {
    invalid.push('isolationRequest.client_family');
  }
  if (!ALLOWED_VISIBILITIES.includes(request.requested_visibility)) {
    invalid.push('isolationRequest.requested_visibility');
  }
  if (!ALLOWED_FALLBACK_REASONS.includes(request.fallback_reason)) {
    invalid.push('isolationRequest.fallback_reason');
  }
  if (!ALLOWED_CLIENT_FAMILIES.includes(candidate.client_family)) {
    invalid.push('fallbackCandidate.client_family');
  }
  if (!ALLOWED_VISIBILITIES.includes(candidate.visibility)) {
    invalid.push('fallbackCandidate.visibility');
  }
  if (candidate.memory_source !== 'local_fallback') invalid.push('fallbackCandidate.memory_source');
  if (candidate.result_can_be_mistaken_for_vcp_native !== false) {
    invalid.push('fallbackCandidate.result_can_be_mistaken_for_vcp_native');
  }
  for (const field of REQUIRED_REQUEST_BOOLEAN_FIELDS) {
    if (typeof request[field] !== 'boolean') invalid.push(`isolationRequest.${field}`);
  }
  for (const field of REQUIRED_CANDIDATE_BOOLEAN_FIELDS) {
    if (typeof candidate[field] !== 'boolean') invalid.push(`fallbackCandidate.${field}`);
  }
  for (const [field, value] of Object.entries(policy)) {
    if (typeof value !== 'boolean') invalid.push(`isolationPolicy.${field}`);
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }
  return invalid;
}

function computeIsolationDecision(request, candidate, policy) {
  if (
    request.cross_client_private_requested === true ||
    candidate.raw_private_payload_present === true ||
    candidate.secret_value_present === true
  ) {
    return 'stop_l4';
  }

  if (
    request.client_id_present !== true ||
    candidate.client_id_present !== true ||
    !allScopePresent(request) ||
    !allScopePresent(candidate) ||
    request.client_family === 'unknown' ||
    candidate.client_family === 'unknown' ||
    request.requested_visibility === 'unknown' ||
    candidate.visibility === 'unknown'
  ) {
    return 'deny';
  }

  if (candidate.memory_source !== 'local_fallback') return 'deny';
  if (candidate.result_can_be_mistaken_for_vcp_native !== false) return 'deny';

  const requestRank = VISIBILITY_RANK[request.requested_visibility] || 0;
  const candidateRank = VISIBILITY_RANK[candidate.visibility] || 0;
  if (candidateRank > requestRank && policy.visibility_widening_allowed !== true) {
    return 'deny';
  }

  if (
    candidate.visibility === 'private' &&
    policy.same_client_private_required === true &&
    request.client_family !== candidate.client_family
  ) {
    return 'deny';
  }

  if (
    candidate.visibility === 'shared' &&
    policy.shared_visibility_requires_explicit_boundary === true &&
    request.shared_boundary_present !== true
  ) {
    return 'deny';
  }

  if (policy.fallback_must_remain_marked !== true) return 'deny';
  if (policy.unknown_scope_fails_closed !== true) return 'deny';

  return 'fallback_allowed';
}

function validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_REQUEST_FIELDS, input.isolationRequest, 'isolationRequest'),
    ...missingFields(REQUIRED_CANDIDATE_FIELDS, input.fallbackCandidate, 'fallbackCandidate'),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.isolationPolicy, 'isolationPolicy'),
    ...(Object.prototype.hasOwnProperty.call(input, 'counters')
      ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters')
      : [])
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

  const invalidFields = validateShape(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_scope_isolation_contract', input, { invalidFields });
  }

  const computedDecision = computeIsolationDecision(
    input.isolationRequest,
    input.fallbackCandidate,
    input.isolationPolicy
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
    requestId: input.isolationRequest.request_id,
    requestClientFamily: input.isolationRequest.client_family,
    candidateClientFamily: input.fallbackCandidate.client_family,
    requestedVisibility: input.isolationRequest.requested_visibility,
    candidateVisibility: input.fallbackCandidate.visibility,
    expectedDecision: input.expectedDecision,
    computedDecision,
    fallbackAllowed: computedDecision === 'fallback_allowed',
    isolationEnforced: true,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_scope_isolation_validated_no_runtime',
    fixtureScopeIsolationOnly: true,
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
  ALLOWED_FALLBACK_REASONS,
  ALLOWED_VISIBILITIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_CANDIDATE_FIELDS,
  REQUIRED_CANDIDATE_BOOLEAN_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryScopeIsolationContract
};
