'use strict';

const CONTRACT_NAME = 'VcpMemoryFallbackLocalMemoryLifecycleFilterContract';
const CONTRACT_MODE = 'fixture_fallback_lifecycle_filter_contract_only';
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
  'status_summary',
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

const ALLOWED_LIFECYCLE_STATES = Object.freeze([
  'active',
  'tombstoned',
  'superseded',
  'rejected',
  'stale',
  'proposal_only',
  'unknown'
]);

const ALLOWED_VISIBILITIES = Object.freeze([
  'private',
  'shared',
  'public',
  'unknown'
]);

const INACTIVE_LIFECYCLE_STATES = Object.freeze([
  'tombstoned',
  'superseded',
  'rejected',
  'stale',
  'proposal_only'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'lifecycleRequest',
  'fallbackCandidate',
  'lifecyclePolicy',
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
  'lifecycle_summary_requested',
  'lifecycle_store_scan_requested',
  'migration_or_backfill_requested',
  'lifecycle_mutation_requested'
]);

const REQUIRED_CANDIDATE_FIELDS = Object.freeze([
  'memory_source',
  'visibility',
  'lifecycle_state',
  'result_can_be_mistaken_for_vcp_native',
  'raw_private_payload_present',
  'raw_lifecycle_metadata_present',
  'linked_replacement_payload_present',
  'proposal_payload_present'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'active_only_for_fallback_result',
  'low_disclosure_status_summary_allowed',
  'unknown_lifecycle_fails_closed',
  'lifecycle_policy_receipt_required',
  'lifecycle_filter_must_not_mutate',
  'migration_import_export_backfill_stop_l4'
]);

const REQUIRED_REQUEST_BOOLEAN_FIELDS = Object.freeze([
  'client_id_present',
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'lifecycle_summary_requested',
  'lifecycle_store_scan_requested',
  'migration_or_backfill_requested',
  'lifecycle_mutation_requested'
]);

const REQUIRED_CANDIDATE_BOOLEAN_FIELDS = Object.freeze([
  'result_can_be_mistaken_for_vcp_native',
  'raw_private_payload_present',
  'raw_lifecycle_metadata_present',
  'linked_replacement_payload_present',
  'proposal_payload_present'
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
  'lifecycleStoreScans',
  'lifecycleMutations',
  'migrationImportExportBackfills',
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
  'rawLifecycleMetadata',
  'raw_lifecycle_metadata',
  'rawTombstoneReason',
  'rawSupersessionLink',
  'replacementMemoryId',
  'supersedesMemoryId',
  'supersededByMemoryId',
  'proposalPayload',
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
    ...collectUnexpectedKeys(input.lifecycleRequest, REQUIRED_REQUEST_FIELDS, 'lifecycleRequest'),
    ...collectUnexpectedKeys(input.fallbackCandidate, REQUIRED_CANDIDATE_FIELDS, 'fallbackCandidate'),
    ...collectUnexpectedKeys(input.lifecyclePolicy, REQUIRED_POLICY_FIELDS, 'lifecyclePolicy'),
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
  const request = isPlainObject(input) ? input.lifecycleRequest : null;
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
    lifecycleState: isPlainObject(candidate) && typeof candidate.lifecycle_state === 'string'
      ? candidate.lifecycle_state
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
    fixtureLifecycleFilterOnly: true,
    runtimeWiringExecuted: false,
    localFallbackExecuted: false,
    privateRuntimeRead: false,
    realQueryExecuted: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    memoryUpdated: false,
    memorySuperseded: false,
    memoryTombstoned: false,
    lifecycleStoreScanned: false,
    lifecycleMutated: false,
    migrationImportExportBackfillExecuted: false,
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
  const request = input.lifecycleRequest;
  const candidate = input.fallbackCandidate;
  const policy = input.lifecyclePolicy;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (typeof request.request_id !== 'string' || request.request_id.trim().length === 0) {
    invalid.push('lifecycleRequest.request_id');
  }
  if (!ALLOWED_CLIENT_FAMILIES.includes(request.client_family)) {
    invalid.push('lifecycleRequest.client_family');
  }
  if (!ALLOWED_VISIBILITIES.includes(request.requested_visibility)) {
    invalid.push('lifecycleRequest.requested_visibility');
  }
  if (!ALLOWED_FALLBACK_REASONS.includes(request.fallback_reason)) {
    invalid.push('lifecycleRequest.fallback_reason');
  }
  if (!ALLOWED_VISIBILITIES.includes(candidate.visibility)) {
    invalid.push('fallbackCandidate.visibility');
  }
  if (!ALLOWED_LIFECYCLE_STATES.includes(candidate.lifecycle_state)) {
    invalid.push('fallbackCandidate.lifecycle_state');
  }
  if (candidate.memory_source !== 'local_fallback') invalid.push('fallbackCandidate.memory_source');
  if (candidate.result_can_be_mistaken_for_vcp_native !== false) {
    invalid.push('fallbackCandidate.result_can_be_mistaken_for_vcp_native');
  }
  for (const field of REQUIRED_REQUEST_BOOLEAN_FIELDS) {
    if (typeof request[field] !== 'boolean') invalid.push(`lifecycleRequest.${field}`);
  }
  for (const field of REQUIRED_CANDIDATE_BOOLEAN_FIELDS) {
    if (typeof candidate[field] !== 'boolean') invalid.push(`fallbackCandidate.${field}`);
  }
  for (const [field, value] of Object.entries(policy)) {
    if (typeof value !== 'boolean') invalid.push(`lifecyclePolicy.${field}`);
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }
  return invalid;
}

function computeLifecycleDecision(request, candidate, policy) {
  if (
    request.lifecycle_store_scan_requested === true ||
    request.migration_or_backfill_requested === true ||
    request.lifecycle_mutation_requested === true ||
    policy.lifecycle_filter_must_not_mutate !== true ||
    policy.migration_import_export_backfill_stop_l4 !== true
  ) {
    return 'stop_l4';
  }

  if (
    candidate.raw_private_payload_present === true ||
    candidate.raw_lifecycle_metadata_present === true ||
    candidate.linked_replacement_payload_present === true ||
    candidate.proposal_payload_present === true
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
    policy.active_only_for_fallback_result !== true ||
    policy.unknown_lifecycle_fails_closed !== true ||
    policy.lifecycle_policy_receipt_required !== true
  ) {
    return 'deny';
  }

  if (candidate.lifecycle_state === 'unknown') {
    return 'deny';
  }

  if (candidate.lifecycle_state === 'active') {
    return 'fallback_allowed';
  }

  if (INACTIVE_LIFECYCLE_STATES.includes(candidate.lifecycle_state)) {
    if (
      request.lifecycle_summary_requested === true &&
      policy.low_disclosure_status_summary_allowed === true
    ) {
      return 'status_summary';
    }
    return 'deny';
  }

  return 'deny';
}

function validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_REQUEST_FIELDS, input.lifecycleRequest, 'lifecycleRequest'),
    ...missingFields(REQUIRED_CANDIDATE_FIELDS, input.fallbackCandidate, 'fallbackCandidate'),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.lifecyclePolicy, 'lifecyclePolicy'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_lifecycle_secret_runtime_or_overclaim_fields', input, { forbiddenFields });
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
    return rejected('invalid_lifecycle_filter_contract', input, { invalidFields });
  }

  const computedDecision = computeLifecycleDecision(
    input.lifecycleRequest,
    input.fallbackCandidate,
    input.lifecyclePolicy
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
    requestId: input.lifecycleRequest.request_id,
    clientFamily: input.lifecycleRequest.client_family,
    fallbackReason: input.lifecycleRequest.fallback_reason,
    lifecycleState: input.fallbackCandidate.lifecycle_state,
    expectedDecision: input.expectedDecision,
    computedDecision,
    fallbackAllowed: computedDecision === 'fallback_allowed',
    lowDisclosureStatusSummary: computedDecision === 'status_summary',
    lifecyclePolicyApplied: true,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_lifecycle_filter_validated_no_runtime',
    fixtureLifecycleFilterOnly: true,
    runtimeWiringExecuted: false,
    localFallbackExecuted: false,
    privateRuntimeRead: false,
    realQueryExecuted: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    memoryUpdated: false,
    memorySuperseded: false,
    memoryTombstoned: false,
    lifecycleStoreScanned: false,
    lifecycleMutated: false,
    migrationImportExportBackfillExecuted: false,
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
  ALLOWED_LIFECYCLE_STATES,
  ALLOWED_VISIBILITIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  INACTIVE_LIFECYCLE_STATES,
  REQUIRED_CANDIDATE_BOOLEAN_FIELDS,
  REQUIRED_CANDIDATE_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract
};
