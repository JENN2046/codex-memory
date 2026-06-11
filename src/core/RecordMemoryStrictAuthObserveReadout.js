'use strict';

const READOUT_SCOPE = 'record_memory_principal_scope_observe';
const READOUT_MODE = 'fixture_only';

const ALLOWED_FIELD_NAMES = Object.freeze([
  'agentAlias',
  'agentId',
  'requestSource',
  'projectId',
  'workspaceId',
  'clientId'
]);

const COUNTER_KEYS = Object.freeze([
  'observedRecordMemoryCalls',
  'acceptedForPrincipalScopeAuthorizationPreflight',
  'rejectedForPrincipalScopeAuthorizationPreflight',
  'missingRequiredContextFieldCount',
  'mismatchedFieldCount',
  'payloadScopeAuthorityUsedCount',
  'strictRuntimeRejectionCount',
  'publicMcpExpansionCount',
  'providerApiCallCount',
  'rawScanCount',
  'broadScanCount'
]);

const FORBIDDEN_RAW_KEYS = Object.freeze([
  'agentAlias',
  'agentId',
  'requestSource',
  'projectId',
  'workspaceId',
  'clientId',
  'agent_alias',
  'agent_id',
  'request_source',
  'project_id',
  'workspace_id',
  'client_id',
  'agentAliasValue',
  'agentIdValue',
  'requestSourceValue',
  'projectIdValue',
  'workspaceIdValue',
  'clientIdValue',
  'rawAgentAlias',
  'rawAgentId',
  'rawRequestSource',
  'rawProjectId',
  'rawWorkspaceId',
  'rawClientId',
  'bearerToken',
  'tokenMaterial',
  'providerApiKey',
  'apiKey',
  'privateKey',
  'filePath',
  'rawPath',
  'title',
  'content',
  'evidence',
  'writePayload'
]);

const ZERO_BOUNDARY_COUNTERS = Object.freeze([
  'payloadScopeAuthorityUsedCount',
  'strictRuntimeRejectionCount',
  'publicMcpExpansionCount',
  'providerApiCallCount',
  'rawScanCount',
  'broadScanCount'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeFieldNameArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeString).filter(Boolean))]
    .filter(field => ALLOWED_FIELD_NAMES.includes(field));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function collectForbiddenRawFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenRawFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_RAW_KEYS.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenRawFields(nested, path));
  }
  return found;
}

function emptyCounters() {
  return Object.fromEntries(COUNTER_KEYS.map(key => [key, 0]));
}

function makeRejected(reason, details = {}) {
  return {
    accepted: false,
    scope: READOUT_SCOPE,
    mode: READOUT_MODE,
    reasonCode: reason,
    lowDisclosure: true,
    counters: emptyCounters(),
    fieldNamesOnly: {
      missingRequiredContextFields: [],
      mismatchedFields: []
    },
    forbiddenFields: details.forbiddenFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    rawPrincipalScopeValuesReturned: false,
    providerApiCalled: false,
    rawScanPerformed: false,
    broadScanPerformed: false,
    runtimeWiringChanged: false,
    productionReadinessClaimed: false,
    releaseReadinessClaimed: false,
    cutoverReadinessClaimed: false,
    completeV8Claimed: false,
    nextAllowedStep: 'fix_fixture_or_stop'
  };
}

function normalizeObservation(observation) {
  if (!isPlainObject(observation)) {
    return { accepted: false, missing: [], mismatched: [] };
  }
  return {
    accepted: observation.acceptedForPrincipalScopeAuthorizationPreflight === true,
    missing: normalizeFieldNameArray(observation.missingRequiredContextFields),
    mismatched: normalizeFieldNameArray(observation.mismatchedFields)
  };
}

function buildRecordMemoryStrictAuthObserveReadout(input = {}) {
  if (!isPlainObject(input)) {
    return makeRejected('input_not_plain_object');
  }

  const forbiddenFields = collectForbiddenRawFields(input);
  if (forbiddenFields.length > 0) {
    return makeRejected('raw_or_secret_fields_not_allowed', { forbiddenFields });
  }

  if (normalizeString(input.mode) !== 'observe') {
    return makeRejected('observe_mode_required', { forbiddenFields: ['mode'] });
  }

  if (input.strictEnforcementEnabled === true) {
    return makeRejected('strict_enforcement_not_allowed_in_stage1_readout', {
      forbiddenFields: ['strictEnforcementEnabled']
    });
  }

  const observations = Array.isArray(input.observations) ? input.observations : [];
  const counters = emptyCounters();
  const missingFieldNames = new Set();
  const mismatchedFieldNames = new Set();

  for (const observation of observations) {
    const normalized = normalizeObservation(observation);
    counters.observedRecordMemoryCalls += 1;
    if (normalized.accepted) {
      counters.acceptedForPrincipalScopeAuthorizationPreflight += 1;
    } else {
      counters.rejectedForPrincipalScopeAuthorizationPreflight += 1;
    }
    counters.missingRequiredContextFieldCount += normalized.missing.length;
    counters.mismatchedFieldCount += normalized.mismatched.length;
    normalized.missing.forEach(field => missingFieldNames.add(field));
    normalized.mismatched.forEach(field => mismatchedFieldNames.add(field));
  }

  const inputCounters = isPlainObject(input.counters) ? input.counters : {};
  const forbiddenCounters = ZERO_BOUNDARY_COUNTERS
    .filter(key => Number(inputCounters[key] || 0) > 0);
  if (forbiddenCounters.length > 0) {
    return makeRejected('forbidden_boundary_counters_must_be_zero', { forbiddenCounters });
  }

  return {
    accepted: true,
    scope: READOUT_SCOPE,
    mode: 'observe',
    readoutMode: READOUT_MODE,
    strictEnforcementEnabled: false,
    lowDisclosure: true,
    counters,
    fieldNamesOnly: {
      missingRequiredContextFields: [...missingFieldNames],
      mismatchedFields: [...mismatchedFieldNames]
    },
    forbiddenFields: [],
    forbiddenCounters: [],
    rawPrincipalScopeValuesReturned: false,
    payloadScopeAuthorityUsed: false,
    providerApiCalled: false,
    rawScanPerformed: false,
    broadScanPerformed: false,
    runtimeWiringChanged: false,
    productionReadinessClaimed: false,
    releaseReadinessClaimed: false,
    cutoverReadinessClaimed: false,
    completeV8Claimed: false,
    nextAllowedStep: 'fixture_contract_only'
  };
}

module.exports = {
  ALLOWED_FIELD_NAMES,
  COUNTER_KEYS,
  READOUT_MODE,
  READOUT_SCOPE,
  buildRecordMemoryStrictAuthObserveReadout
};
