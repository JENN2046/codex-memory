'use strict';

const CONTRACT_NAME = 'VcpMemoryFallbackLocalMemorySecretRejectionContract';
const CONTRACT_MODE = 'fixture_fallback_secret_rejection_contract_only';
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
  'redact',
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
  'secretRejectionRequest',
  'fallbackCandidate',
  'secretPolicy',
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
  'fallback_reason',
  'synthetic_fixture_marked',
  'requires_secret_or_config_read',
  'requires_provider_auth',
  'config_env_reference_present',
  'endpoint_reference_present',
  'auth_material_present'
]);

const REQUIRED_CANDIDATE_FIELDS = Object.freeze([
  'memory_source',
  'visibility',
  'result_can_be_mistaken_for_vcp_native',
  'raw_private_payload_present',
  'secret_like_value_present',
  'credential_like_value_present',
  'token_like_value_present',
  'provider_payload_present',
  'raw_secret_value_disclosed'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'synthetic_secret_values_allowed',
  'actual_secret_values_allowed',
  'secret_like_input_must_be_rejected_or_redacted',
  'fallback_receipt_must_omit_raw_secret_values',
  'config_env_provider_auth_words_stop_l4',
  'fallback_requires_no_secret_config_env_read'
]);

const REQUIRED_REQUEST_BOOLEAN_FIELDS = Object.freeze([
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'synthetic_fixture_marked',
  'requires_secret_or_config_read',
  'requires_provider_auth',
  'config_env_reference_present',
  'endpoint_reference_present',
  'auth_material_present'
]);

const REQUIRED_CANDIDATE_BOOLEAN_FIELDS = Object.freeze([
  'result_can_be_mistaken_for_vcp_native',
  'raw_private_payload_present',
  'secret_like_value_present',
  'credential_like_value_present',
  'token_like_value_present',
  'provider_payload_present',
  'raw_secret_value_disclosed'
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
  'secretConfigReads',
  'envReads',
  'endpointReads',
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
  'rawSecretValue',
  'raw_secret_value',
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
  'endpointValue',
  'configEnv',
  'configEnvPath',
  'envValue',
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
    ...collectUnexpectedKeys(
      input.secretRejectionRequest,
      REQUIRED_REQUEST_FIELDS,
      'secretRejectionRequest'
    ),
    ...collectUnexpectedKeys(
      input.fallbackCandidate,
      REQUIRED_CANDIDATE_FIELDS,
      'fallbackCandidate'
    ),
    ...collectUnexpectedKeys(input.secretPolicy, REQUIRED_POLICY_FIELDS, 'secretPolicy'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  const request = isPlainObject(input) ? input.secretRejectionRequest : null;
  const candidate = isPlainObject(input) ? input.fallbackCandidate : null;

  return {
    requestId: isPlainObject(request) && typeof request.request_id === 'string' ? request.request_id : null,
    clientFamily: isPlainObject(request) && typeof request.client_family === 'string'
      ? request.client_family
      : null,
    fallbackReason: isPlainObject(request) && typeof request.fallback_reason === 'string'
      ? request.fallback_reason
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
    unexpectedFields: details.unexpectedFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    computedDecision: details.computedDecision || null,
    expectedDecision: isPlainObject(input) ? input.expectedDecision || null : null,
    nextAction: 'fix_fixture_or_stop',
    fixtureSecretRejectionOnly: true,
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
    secretConfigRead: false,
    envRead: false,
    endpointRead: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function anySecretLikeCandidateFlag(candidate) {
  return Boolean(
    candidate.secret_like_value_present ||
    candidate.credential_like_value_present ||
    candidate.token_like_value_present
  );
}

function allScopePresent(request) {
  return Boolean(
    request.client_id_present &&
    request.workspace_scope_present &&
    request.project_scope_present &&
    request.owner_scope_present
  );
}

function validateShape(input) {
  const request = input.secretRejectionRequest;
  const candidate = input.fallbackCandidate;
  const policy = input.secretPolicy;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    invalid.push('secretRejectionRequest.request_id');
  }
  if (!ALLOWED_CLIENT_FAMILIES.includes(request.client_family)) {
    invalid.push('secretRejectionRequest.client_family');
  }
  if (!ALLOWED_FALLBACK_REASONS.includes(request.fallback_reason)) {
    invalid.push('secretRejectionRequest.fallback_reason');
  }
  if (!ALLOWED_VISIBILITIES.includes(candidate.visibility)) {
    invalid.push('fallbackCandidate.visibility');
  }
  if (candidate.memory_source !== 'local_fallback') invalid.push('fallbackCandidate.memory_source');
  if (candidate.result_can_be_mistaken_for_vcp_native !== false) {
    invalid.push('fallbackCandidate.result_can_be_mistaken_for_vcp_native');
  }
  for (const field of REQUIRED_REQUEST_BOOLEAN_FIELDS) {
    if (typeof request[field] !== 'boolean') invalid.push(`secretRejectionRequest.${field}`);
  }
  for (const field of REQUIRED_CANDIDATE_BOOLEAN_FIELDS) {
    if (typeof candidate[field] !== 'boolean') invalid.push(`fallbackCandidate.${field}`);
  }
  for (const [field, value] of Object.entries(policy)) {
    if (typeof value !== 'boolean') invalid.push(`secretPolicy.${field}`);
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }
  return invalid;
}

function computeSecretDecision(request, candidate, policy) {
  if (
    request.requires_secret_or_config_read === true ||
    request.requires_provider_auth === true ||
    request.config_env_reference_present === true ||
    request.endpoint_reference_present === true ||
    request.auth_material_present === true ||
    candidate.raw_private_payload_present === true ||
    candidate.provider_payload_present === true ||
    candidate.raw_secret_value_disclosed === true ||
    policy.actual_secret_values_allowed === true
  ) {
    return 'stop_l4';
  }

  if (
    request.client_family === 'unknown' ||
    candidate.visibility === 'unknown' ||
    !allScopePresent(request) ||
    candidate.memory_source !== 'local_fallback' ||
    candidate.result_can_be_mistaken_for_vcp_native !== false
  ) {
    return 'deny';
  }

  if (
    policy.secret_like_input_must_be_rejected_or_redacted !== true ||
    policy.fallback_receipt_must_omit_raw_secret_values !== true ||
    policy.config_env_provider_auth_words_stop_l4 !== true ||
    policy.fallback_requires_no_secret_config_env_read !== true
  ) {
    return 'deny';
  }

  if (anySecretLikeCandidateFlag(candidate)) {
    if (
      request.synthetic_fixture_marked !== true ||
      policy.synthetic_secret_values_allowed !== true
    ) {
      return 'stop_l4';
    }
    return 'redact';
  }

  return 'fallback_allowed';
}

function validateVcpMemoryFallbackLocalMemorySecretRejectionContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_REQUEST_FIELDS, input.secretRejectionRequest, 'secretRejectionRequest'),
    ...missingFields(REQUIRED_CANDIDATE_FIELDS, input.fallbackCandidate, 'fallbackCandidate'),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.secretPolicy, 'secretPolicy'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_runtime_or_overclaim_fields', input, { forbiddenFields });
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
    return rejected('invalid_secret_rejection_contract', input, { invalidFields });
  }

  const computedDecision = computeSecretDecision(
    input.secretRejectionRequest,
    input.fallbackCandidate,
    input.secretPolicy
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
    requestId: input.secretRejectionRequest.request_id,
    clientFamily: input.secretRejectionRequest.client_family,
    fallbackReason: input.secretRejectionRequest.fallback_reason,
    expectedDecision: input.expectedDecision,
    computedDecision,
    fallbackAllowed: computedDecision === 'fallback_allowed',
    secretRejectedOrRedacted: computedDecision === 'redact' || computedDecision === 'stop_l4',
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_secret_rejection_validated_no_runtime',
    fixtureSecretRejectionOnly: true,
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
    secretConfigRead: false,
    envRead: false,
    endpointRead: false,
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
  REQUIRED_CANDIDATE_BOOLEAN_FIELDS,
  REQUIRED_CANDIDATE_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemorySecretRejectionContract
};
