'use strict';

const CONTRACT_NAME = 'VcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract';
const CONTRACT_MODE = 'fixture_exact_live_runtime_approval_request_assembly_preflight_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION = 'vcp_memory_exact_live_runtime_approval_request_assembly_preflight_v1';
const PREFLIGHT_ID_PREFIX = 'cm1875_fixture_exact_live_runtime_approval_request_assembly_preflight_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['exact-live-runtime-approval-request-assembly']);
const ALLOWED_DECISIONS = Object.freeze([
  'assembly_preflight_blocked_missing_exact_values_or_authority',
  'assembly_preflight_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'field_gap_and_assembly_blockers_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1875_assembly_preflight_fixture_contract',
  'cm1876_assembly_preflight_closeout_or_boundary_review'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'sources',
  'gapClosure',
  'exactInputs',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'preflight_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'assembly_preflight_only'
]);

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  'cm1872_field_gap_preflight_present',
  'cm1873_gap_fixture_contract_present',
  'cm1874_gap_fixture_closeout_present',
  'validation_cmv1977_present',
  'gap_fixture_slice_closed'
]);

const REQUIRED_GAP_CLOSURE_FIELDS = Object.freeze([
  'gap_classification_guard_present',
  'local_gap_fixture_contract_slice_closed',
  'missing_exact_fields_declared',
  'request_assembly_preflight_may_start',
  'request_assembly_allowed'
]);

const REQUIRED_EXACT_INPUT_FIELDS = Object.freeze([
  'target_alias_bound',
  'transport_family_bound',
  'client_workspace_owner_aliases_bound',
  'operation_family_bound',
  'runtime_budget_bound',
  'output_policy_bound',
  'log_stdout_stderr_policy_bound',
  'memory_policy_bound',
  'cleanup_policy_bound',
  'receipt_path_class_bound',
  'validation_command_list_bound',
  'live_values_bound'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'request_assembly_authorized',
  'request_body_generation_authorized',
  'request_submission_authorized',
  'approval_line_generation_authorized',
  'approval_granted',
  'runtime_execution_authorized',
  'memory_read_authorized',
  'memory_write_authorized',
  'durable_write_authorized',
  'provider_api_authorized',
  'config_startup_watchdog_change_authorized',
  'public_mcp_expansion_authorized',
  'release_deploy_cutover_push_authorized',
  'readiness_claim_authorized'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'raw_private_output_allowed',
  'concrete_values_disclosed',
  'assembled_request_disclosed',
  'request_body_disclosed',
  'approval_line_value_disclosed',
  'runtime_command_disclosed',
  'readiness_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'requestAssemblies',
  'assembledRequests',
  'requestBodiesGenerated',
  'requestSubmissions',
  'approvalLineOperations',
  'approvalGrants',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'mcpMemoryToolCalls',
  'memoryReads',
  'memoryWrites',
  'durableWrites',
  'providerApiCalls',
  'configStartupWatchdogChanges',
  'publicMcpExpansions',
  'releaseDeployCutoverPushActions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'requestPayload',
  'request_payload',
  'assembledRequest',
  'assembled_request',
  'requestObject',
  'request_object',
  'approvalPayload',
  'approval_payload',
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
  'runtimeEndpoint',
  'runtimeTarget',
  'targetValue',
  'transportValue',
  'workspaceId',
  'ownerId',
  'clientId',
  'exactTarget',
  'exactTransport',
  'exactWorkspace',
  'exactOwner',
  'exactClient',
  'rawPath',
  'configEnvPath',
  'requestBody',
  'request_body',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'runtimeCommand',
  'memoryQuery',
  'memoryWritePayload',
  'providerPayload',
  'configChange',
  'startupChange',
  'watchdogChange',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawStoreRow',
  'rawMemory',
  'rawDailyNote',
  'rawDailyNoteContent',
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

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFixtureIdentifier(value, prefix) {
  if (!isNonEmptyString(value) || !value.startsWith(prefix)) return false;
  return /^[a-z0-9][a-z0-9_.-]{0,63}$/.test(value.slice(prefix.length));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => (prefix ? `${prefix}.${field}` : field));
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
    ...collectUnexpectedKeys(input.packet, REQUIRED_PACKET_FIELDS, 'packet'),
    ...collectUnexpectedKeys(input.sources, REQUIRED_SOURCE_FIELDS, 'sources'),
    ...collectUnexpectedKeys(input.gapClosure, REQUIRED_GAP_CLOSURE_FIELDS, 'gapClosure'),
    ...collectUnexpectedKeys(input.exactInputs, REQUIRED_EXACT_INPUT_FIELDS, 'exactInputs'),
    ...collectUnexpectedKeys(input.authorization, REQUIRED_AUTHORIZATION_FIELDS, 'authorization'),
    ...collectUnexpectedKeys(input.output, REQUIRED_OUTPUT_FIELDS, 'output'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function safeExpectedDecision(input) {
  return isPlainObject(input) && ALLOWED_DECISIONS.includes(input.expectedDecision)
    ? input.expectedDecision
    : null;
}

function safePreflightId(input) {
  const preflightId = isPlainObject(input?.packet) ? input.packet.preflight_id : null;
  return isFixtureIdentifier(preflightId, PREFLIGHT_ID_PREFIX) ? preflightId : null;
}

function lowDisclosureProjection(input) {
  const sources = isPlainObject(input) ? input.sources : null;
  const gapClosure = isPlainObject(input) ? input.gapClosure : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    preflightId: safePreflightId(input),
    cm1874GapFixtureCloseoutPresent: isPlainObject(sources)
      ? sources.cm1874_gap_fixture_closeout_present === true
      : false,
    gapFixtureSliceClosed: isPlainObject(sources)
      ? sources.gap_fixture_slice_closed === true
      : false,
    requestAssemblyPreflightMayStart: isPlainObject(gapClosure)
      ? gapClosure.request_assembly_preflight_may_start === true
      : false,
    requestAssemblyAllowed: isPlainObject(gapClosure)
      ? gapClosure.request_assembly_allowed === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    assemblyPreflightBlocked:
      computedDecision === 'assembly_preflight_blocked_missing_exact_values_or_authority',
    nonAuthorizingAssemblyPreflightOnly: true,
    requestAssemblyAllowed: false,
    liveValuesBound: false,
    assembledRequestGenerated: false,
    requestBodyGenerated: false,
    requestSubmitted: false,
    approvalLineGenerated: false,
    approvalGranted: false,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    mcpMemoryToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    configStartupWatchdogChanged: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPushPerformed: false,
    readinessClaimAllowed: false
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
    expectedDecision: safeExpectedDecision(input),
    nextAction: 'fix_fixture_or_stop',
    ...sideEffectPosture(details.computedDecision || null)
  };
}

function validateBooleanFields(value, requiredFields, prefix) {
  const invalid = [];
  for (const field of requiredFields) {
    if (typeof value[field] !== 'boolean') invalid.push(`${prefix}.${field}`);
  }
  return invalid;
}

function validateShape(input) {
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!isFixtureIdentifier(input.packet.preflight_id, PREFLIGHT_ID_PREFIX)) {
    invalid.push('packet.preflight_id');
  }
  if (input.packet.contract_version !== CONTRACT_VERSION) invalid.push('packet.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) invalid.push('packet.evidence_type');
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.assembly_preflight_only !== true) invalid.push('packet.assembly_preflight_only');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.sources, REQUIRED_SOURCE_FIELDS, 'sources'));
  invalid.push(...validateBooleanFields(input.gapClosure, REQUIRED_GAP_CLOSURE_FIELDS, 'gapClosure'));
  invalid.push(...validateBooleanFields(input.exactInputs, REQUIRED_EXACT_INPUT_FIELDS, 'exactInputs'));
  invalid.push(...validateBooleanFields(input.authorization, REQUIRED_AUTHORIZATION_FIELDS, 'authorization'));
  invalid.push(...validateBooleanFields(
    input.output,
    REQUIRED_OUTPUT_FIELDS.filter(field => field !== 'disclosure_level'),
    'output'
  ));

  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }

  return invalid;
}

function hasL4Stop(input) {
  const gapClosure = input.gapClosure;
  const exactInputs = input.exactInputs;
  const authorization = input.authorization;
  const output = input.output;

  return (
    gapClosure.request_assembly_allowed ||
    Object.values(exactInputs).some(value => value === true) ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.assembled_request_disclosed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.runtime_command_disclosed ||
    output.readiness_claim_allowed
  );
}

function isSourceChainComplete(sources) {
  return REQUIRED_SOURCE_FIELDS.every(field => sources[field] === true);
}

function isGapClosureComplete(gapClosure) {
  return (
    gapClosure.gap_classification_guard_present === true &&
    gapClosure.local_gap_fixture_contract_slice_closed === true &&
    gapClosure.missing_exact_fields_declared === true &&
    gapClosure.request_assembly_preflight_may_start === true &&
    gapClosure.request_assembly_allowed === false
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isSourceChainComplete(input.sources)) return 'assembly_preflight_incomplete';
  if (!isGapClosureComplete(input.gapClosure)) return 'assembly_preflight_incomplete';
  return 'assembly_preflight_blocked_missing_exact_values_or_authority';
}

function validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.sources, 'sources'),
    ...missingFields(REQUIRED_GAP_CLOSURE_FIELDS, input.gapClosure, 'gapClosure'),
    ...missingFields(REQUIRED_EXACT_INPUT_FIELDS, input.exactInputs, 'exactInputs'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) return rejected('missing_required_fields', input, { missingFields: missing });

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_exact_value_request_or_overclaim_fields', input, {
      forbiddenFields
    });
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
    return rejected('invalid_exact_live_runtime_approval_request_assembly_preflight_contract', input, {
      invalidFields
    });
  }

  const computedDecision = computeDecision(input);
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
    contractVersion: CONTRACT_VERSION,
    preflightId: input.packet.preflight_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'assembly_preflight_validated_blocked_no_authority',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_NEXT_ACTIONS,
  ALLOWED_PROFILES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  CONTRACT_VERSION,
  FORBIDDEN_FIELD_NAMES,
  PREFLIGHT_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EXACT_INPUT_FIELDS,
  REQUIRED_GAP_CLOSURE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_SOURCE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract
};
