'use strict';

const CONTRACT_NAME = 'VcpMemoryExactLiveRuntimeAuthorizationGatePreflightContract';
const CONTRACT_MODE = 'fixture_exact_live_runtime_authorization_gate_preflight_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION = 'vcp_memory_exact_live_runtime_authorization_gate_preflight_v1';
const PREFLIGHT_ID_PREFIX = 'cm1896_fixture_exact_live_runtime_authorization_gate_preflight_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze([
  'exact-live-runtime-authorization-gate-preflight'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'authorization_gate_preflight_boundary_accepted_no_authority',
  'authorization_gate_preflight_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'authorization_gate_preflight_categories_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1896_authorization_gate_preflight_fixture_contract',
  'cm1897_authorization_gate_preflight_fixture_closeout_gate_review'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'boundary',
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
  'authorization_gate_preflight_fixture_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1892_readiness_blocked_precondition_refresh_present',
  'cm1893_readiness_blocked_fixture_contract_present',
  'cm1894_readiness_blocked_fixture_closeout_present',
  'cm1895_authorization_gate_preflight_boundary_present',
  'validation_cmv1998_present'
]);

const REQUIRED_BOUNDARY_FIELDS = Object.freeze([
  'cm1895_preflight_boundary_reviewed',
  'authorization_gate_preflight_boundary_defined',
  'authorization_gate_fixture_contract_may_start_next',
  'authorization_gate_opened',
  'authorization_requested',
  'approval_granted',
  'dedicated_exact_approval_text_present',
  'approval_request_packet_created',
  'approval_request_packet_ready',
  'approval_request_ready',
  'approval_request_submitted',
  'approval_line_present',
  'approval_line_generated',
  'approval_line_exposed',
  'approval_line_submitted',
  'request_packet_readiness_may_open',
  'request_packet_readiness_blocked',
  'exact_request_packet_ready',
  'exact_request_packet_present',
  'request_packet_created',
  'request_packet_rendered',
  'request_packet_stored',
  'request_packet_submitted',
  'request_assembly_allowed',
  'request_assembly_authorized',
  'concrete_exact_values_allowed',
  'live_values_bound',
  'exact_target_family_declared_for_future_gate',
  'exact_target_value_bound',
  'exact_operation_family_declared_for_future_gate',
  'exact_operation_value_bound',
  'exact_memory_policy_declared_for_future_gate',
  'memory_read_authorized',
  'memory_write_authorized',
  'exact_log_stdout_stderr_policy_declared_for_future_gate',
  'response_body_read_authorized',
  'runtime_log_read_authorized',
  'stdout_stderr_read_authorized',
  'exact_config_policy_declared_for_future_gate',
  'config_change_authorized',
  'exact_provider_policy_declared_for_future_gate',
  'provider_api_authorized',
  'exact_output_policy_declared_for_future_gate',
  'raw_private_output_allowed',
  'exact_budget_window_cleanup_policy_declared_for_future_gate',
  'exact_validation_command_class_declared_for_future_gate',
  'exact_abort_conditions_declared_for_future_gate',
  'exact_evidence_receipt_path_class_declared_for_future_gate',
  'request_body_generated',
  'request_body_submitted',
  'missing_authorities_declared'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'authorization_gate_open_authorized',
  'approval_request_packet_creation_authorized',
  'approval_request_submission_authorized',
  'request_packet_creation_authorized',
  'request_packet_submission_authorized',
  'request_assembly_authorized',
  'request_body_generation_authorized',
  'request_body_submission_authorized',
  'approval_line_generation_authorized',
  'approval_line_exposure_authorized',
  'approval_line_submission_authorized',
  'approval_grant_authorized',
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
  'approval_request_packet_disclosed',
  'request_packet_disclosed',
  'assembled_request_disclosed',
  'request_body_disclosed',
  'approval_line_value_disclosed',
  'runtime_command_disclosed',
  'memory_payload_disclosed',
  'config_value_disclosed',
  'readiness_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'approvalRequestPacketsCreated',
  'approvalRequestSubmissions',
  'approvalLineOperations',
  'requestPacketsCreated',
  'requestPacketRenders',
  'requestPacketStores',
  'requestPacketSubmissions',
  'requestPreparations',
  'requestAssemblies',
  'assembledRequests',
  'requestBodiesGenerated',
  'requestSubmissions',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'mcpMemoryToolCalls',
  'responseBodyReads',
  'runtimeLogReads',
  'stdoutReads',
  'stderrReads',
  'configEnvReads',
  'rawPrivateReads',
  'rawStoreReads',
  'rawAuditRowReads',
  'realQueries',
  'memoryReads',
  'memoryWrites',
  'durableAuditWrites',
  'durableMemoryWrites',
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
  'operationValue',
  'workspaceId',
  'ownerId',
  'clientId',
  'exactTarget',
  'exactOperation',
  'exactTransport',
  'exactWorkspace',
  'exactOwner',
  'exactClient',
  'approvalRequestPacket',
  'approval_request_packet',
  'approvalRequest',
  'approval_request',
  'approvalPayload',
  'approval_payload',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'requestPacket',
  'request_packet',
  'requestPayload',
  'request_payload',
  'assembledRequest',
  'assembled_request',
  'requestBody',
  'request_body',
  'runtimeCommand',
  'memoryQuery',
  'memoryWritePayload',
  'providerPayload',
  'configChange',
  'startupChange',
  'watchdogChange',
  'rawPath',
  'configEnvPath',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawStoreRow',
  'rawMemory',
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
    ...collectUnexpectedKeys(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'),
    ...collectUnexpectedKeys(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'),
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
  const evidence = isPlainObject(input) ? input.evidence : null;
  const boundary = isPlainObject(input) ? input.boundary : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    preflightId: safePreflightId(input),
    cm1895AuthorizationGatePreflightBoundaryPresent: isPlainObject(evidence)
      ? evidence.cm1895_authorization_gate_preflight_boundary_present === true
      : false,
    authorizationGatePreflightBoundaryDefined: isPlainObject(boundary)
      ? boundary.authorization_gate_preflight_boundary_defined === true
      : false,
    authorizationGateOpened: isPlainObject(boundary)
      ? boundary.authorization_gate_opened === true
      : false,
    approvalRequestReady: isPlainObject(boundary)
      ? boundary.approval_request_ready === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    authorizationGatePreflightFixtureAccepted:
      computedDecision === 'authorization_gate_preflight_boundary_accepted_no_authority',
    authorizationGateOpened: false,
    authorizationRequested: false,
    approvalGranted: false,
    approvalRequestPacketCreated: false,
    approvalRequestReady: false,
    approvalRequestSubmitted: false,
    requestPacketReadinessMayOpen: false,
    requestPacketReadinessBlocked: true,
    exactRequestPacketReady: false,
    exactRequestPacketPresent: false,
    requestPacketCreated: false,
    requestPacketSubmitted: false,
    requestAssemblyAllowed: false,
    liveValuesBound: false,
    requestBodyGenerated: false,
    requestSubmitted: false,
    approvalLineGenerated: false,
    approvalLineExposed: false,
    approvalLineSubmitted: false,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    mcpMemoryToolCalled: false,
    responseBodyRead: false,
    runtimeLogRead: false,
    stdoutRead: false,
    stderrRead: false,
    configEnvRead: false,
    realQueryPerformed: false,
    memoryRead: false,
    memoryWritten: false,
    durableAuditWritePerformed: false,
    durableMemoryWritePerformed: false,
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
  if (input.packet.authorization_gate_preflight_fixture_only !== true) {
    invalid.push('packet.authorization_gate_preflight_fixture_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'));
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
  const boundary = input.boundary;
  const authorization = input.authorization;
  const output = input.output;

  return (
    boundary.authorization_gate_opened ||
    boundary.authorization_requested ||
    boundary.approval_granted ||
    boundary.dedicated_exact_approval_text_present ||
    boundary.approval_request_packet_created ||
    boundary.approval_request_packet_ready ||
    boundary.approval_request_ready ||
    boundary.approval_request_submitted ||
    boundary.approval_line_present ||
    boundary.approval_line_generated ||
    boundary.approval_line_exposed ||
    boundary.approval_line_submitted ||
    boundary.request_packet_readiness_may_open ||
    !boundary.request_packet_readiness_blocked ||
    boundary.exact_request_packet_ready ||
    boundary.exact_request_packet_present ||
    boundary.request_packet_created ||
    boundary.request_packet_rendered ||
    boundary.request_packet_stored ||
    boundary.request_packet_submitted ||
    boundary.request_assembly_allowed ||
    boundary.request_assembly_authorized ||
    boundary.concrete_exact_values_allowed ||
    boundary.live_values_bound ||
    boundary.exact_target_value_bound ||
    boundary.exact_operation_value_bound ||
    boundary.memory_read_authorized ||
    boundary.memory_write_authorized ||
    boundary.response_body_read_authorized ||
    boundary.runtime_log_read_authorized ||
    boundary.stdout_stderr_read_authorized ||
    boundary.config_change_authorized ||
    boundary.provider_api_authorized ||
    boundary.raw_private_output_allowed ||
    boundary.request_body_generated ||
    boundary.request_body_submitted ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.approval_request_packet_disclosed ||
    output.request_packet_disclosed ||
    output.assembled_request_disclosed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.runtime_command_disclosed ||
    output.memory_payload_disclosed ||
    output.config_value_disclosed ||
    output.readiness_claim_allowed
  );
}

function isEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function isBoundaryComplete(boundary) {
  return (
    boundary.cm1895_preflight_boundary_reviewed === true &&
    boundary.authorization_gate_preflight_boundary_defined === true &&
    boundary.authorization_gate_fixture_contract_may_start_next === true &&
    boundary.exact_target_family_declared_for_future_gate === true &&
    boundary.exact_operation_family_declared_for_future_gate === true &&
    boundary.exact_memory_policy_declared_for_future_gate === true &&
    boundary.exact_log_stdout_stderr_policy_declared_for_future_gate === true &&
    boundary.exact_config_policy_declared_for_future_gate === true &&
    boundary.exact_provider_policy_declared_for_future_gate === true &&
    boundary.exact_output_policy_declared_for_future_gate === true &&
    boundary.exact_budget_window_cleanup_policy_declared_for_future_gate === true &&
    boundary.exact_validation_command_class_declared_for_future_gate === true &&
    boundary.exact_abort_conditions_declared_for_future_gate === true &&
    boundary.exact_evidence_receipt_path_class_declared_for_future_gate === true &&
    boundary.missing_authorities_declared === true
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'authorization_gate_preflight_incomplete';
  if (!isBoundaryComplete(input.boundary)) return 'authorization_gate_preflight_incomplete';
  return 'authorization_gate_preflight_boundary_accepted_no_authority';
}

function validateVcpMemoryExactLiveRuntimeAuthorizationGatePreflightContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_BOUNDARY_FIELDS, input.boundary, 'boundary'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) return rejected('missing_required_fields', input, { missingFields: missing });

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_exact_value_request_approval_or_overclaim_fields', input, {
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
    return rejected('invalid_exact_live_runtime_authorization_gate_preflight_contract', input, {
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
    nextAction: 'authorization_gate_preflight_validated_no_authority',
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
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationGatePreflightContract
};
