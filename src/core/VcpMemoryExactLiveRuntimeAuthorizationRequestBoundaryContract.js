'use strict';

const CONTRACT_NAME = 'VcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract';
const CONTRACT_MODE = 'fixture_exact_live_runtime_authorization_request_boundary_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION = 'vcp_memory_exact_live_runtime_authorization_request_boundary_v1';
const BOUNDARY_ID_PREFIX = 'cm1899_fixture_exact_live_runtime_authorization_request_boundary_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze([
  'exact-live-runtime-authorization-request-boundary'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'authorization_request_boundary_accepted_category_only_no_authority',
  'authorization_request_boundary_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'authorization_request_boundary_categories_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1899_authorization_request_boundary_fixture_contract',
  'cm1900_authorization_request_boundary_fixture_closeout_gate_review'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'sources',
  'boundary',
  'fieldFamilies',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'boundary_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'category_only_boundary',
  'authorization_request_not_created',
  'request_packet_not_created'
]);

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  'cm1895_authorization_gate_preflight_boundary_present',
  'cm1896_authorization_gate_preflight_fixture_contract_present',
  'cm1897_authorization_gate_preflight_closeout_present',
  'cm1898_authorization_request_boundary_preflight_present',
  'validation_cmv2001_present'
]);

const REQUIRED_BOUNDARY_FIELDS = Object.freeze([
  'authorization_request_boundary_preflight_reviewed',
  'authorization_request_boundary_category_only',
  'authorization_request_boundary_non_authorizing',
  'source_evidence_references_declared',
  'field_family_classes_declared',
  'authority_family_classes_declared',
  'stop_condition_categories_declared',
  'validation_expectations_declared',
  'output_posture_declared',
  'receipt_posture_declared',
  'approval_line_forbidden_declared',
  'request_body_forbidden_declared',
  'request_packet_artifact_forbidden_declared',
  'runtime_forbidden_declared',
  'future_fixture_contract_allowed',
  'authorization_gate_opened',
  'authorization_requested',
  'approval_granted',
  'dedicated_exact_approval_text_present',
  'approval_request_packet_created',
  'approval_request_packet_ready',
  'approval_request_submitted',
  'authorization_request_ready',
  'authorization_request_submitted',
  'approval_packet_ready',
  'approval_request_ready',
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
  'assembled_request_generated',
  'concrete_exact_values_allowed',
  'live_values_bound',
  'request_body_generated',
  'request_body_submitted',
  'runtime_execution_authorized',
  'runtime_executed'
]);

const REQUIRED_FIELD_FAMILY_FIELDS = Object.freeze([
  'exact_request_identity_bound',
  'exact_target_alias_bound',
  'exact_transport_family_bound',
  'exact_client_workspace_owner_aliases_bound',
  'exact_operation_family_bound',
  'exact_runtime_budget_bound',
  'exact_call_probe_result_output_limits_bound',
  'exact_output_policy_bound',
  'exact_log_stdout_stderr_policy_bound',
  'exact_memory_policy_bound',
  'exact_config_policy_bound',
  'exact_provider_policy_bound',
  'exact_cleanup_policy_bound',
  'exact_receipt_path_class_bound',
  'exact_validation_command_list_bound',
  'exact_abort_condition_bound',
  'live_values_bound'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'authorization_gate_open_authorized',
  'approval_request_packet_creation_authorized',
  'approval_request_submission_authorized',
  'authorization_request_creation_authorized',
  'authorization_request_submission_authorized',
  'request_packet_creation_authorized',
  'request_packet_rendering_authorized',
  'request_packet_storage_authorized',
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
  'authorization_request_disclosed',
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
  'authorizationRequestsCreated',
  'authorizationRequestSubmissions',
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
  'transportValue',
  'operationValue',
  'budgetValue',
  'workspaceId',
  'ownerId',
  'clientId',
  'exactTarget',
  'exactTransport',
  'exactWorkspace',
  'exactOwner',
  'exactClient',
  'exactOperation',
  'exactRequestIdentity',
  'exactValidationCommand',
  'rawPath',
  'configEnvPath',
  'authorizationRequest',
  'authorization_request',
  'authorizationPayload',
  'authorization_payload',
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
  'requestTemplate',
  'request_template',
  'requestObject',
  'request_object',
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
    ...collectUnexpectedKeys(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'),
    ...collectUnexpectedKeys(input.fieldFamilies, REQUIRED_FIELD_FAMILY_FIELDS, 'fieldFamilies'),
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

function safeBoundaryId(input) {
  const boundaryId = isPlainObject(input?.packet) ? input.packet.boundary_id : null;
  return isFixtureIdentifier(boundaryId, BOUNDARY_ID_PREFIX) ? boundaryId : null;
}

function lowDisclosureProjection(input) {
  const sources = isPlainObject(input) ? input.sources : null;
  const boundary = isPlainObject(input) ? input.boundary : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    boundaryId: safeBoundaryId(input),
    cm1898AuthorizationRequestBoundaryPreflightPresent: isPlainObject(sources)
      ? sources.cm1898_authorization_request_boundary_preflight_present === true
      : false,
    authorizationRequestBoundaryPreflightReviewed: isPlainObject(boundary)
      ? boundary.authorization_request_boundary_preflight_reviewed === true
      : false,
    authorizationRequestBoundaryCategoryOnly: isPlainObject(boundary)
      ? boundary.authorization_request_boundary_category_only === true
      : false,
    authorizationRequestBoundaryNonAuthorizing: isPlainObject(boundary)
      ? boundary.authorization_request_boundary_non_authorizing === true
      : false,
    authorizationGateOpened: isPlainObject(boundary)
      ? boundary.authorization_gate_opened === true
      : false,
    authorizationRequestReady: isPlainObject(boundary)
      ? boundary.authorization_request_ready === true
      : false,
    requestPacketCreated: isPlainObject(boundary)
      ? boundary.request_packet_created === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    authorizationRequestBoundaryAccepted:
      computedDecision === 'authorization_request_boundary_accepted_category_only_no_authority',
    nonAuthorizingCategoryBoundaryOnly: true,
    authorizationGateOpened: false,
    authorizationRequested: false,
    approvalGranted: false,
    approvalRequestPacketCreated: false,
    approvalRequestReady: false,
    approvalRequestSubmitted: false,
    authorizationRequestReady: false,
    authorizationRequestSubmitted: false,
    requestPacketReadinessMayOpen: false,
    requestPacketReadinessBlocked: true,
    exactRequestPacketReady: false,
    exactRequestPacketPresent: false,
    requestPacketCreated: false,
    requestPacketRendered: false,
    requestPacketStored: false,
    requestPacketSubmitted: false,
    requestAssemblyAllowed: false,
    assembledRequestGenerated: false,
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
  if (!isFixtureIdentifier(input.packet.boundary_id, BOUNDARY_ID_PREFIX)) {
    invalid.push('packet.boundary_id');
  }
  if (input.packet.contract_version !== CONTRACT_VERSION) invalid.push('packet.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) invalid.push('packet.evidence_type');
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.category_only_boundary !== true) invalid.push('packet.category_only_boundary');
  if (input.packet.authorization_request_not_created !== true) {
    invalid.push('packet.authorization_request_not_created');
  }
  if (input.packet.request_packet_not_created !== true) {
    invalid.push('packet.request_packet_not_created');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.sources, REQUIRED_SOURCE_FIELDS, 'sources'));
  invalid.push(...validateBooleanFields(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'));
  invalid.push(...validateBooleanFields(input.fieldFamilies, REQUIRED_FIELD_FAMILY_FIELDS, 'fieldFamilies'));
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
  const fieldFamilies = input.fieldFamilies;
  const authorization = input.authorization;
  const output = input.output;

  return (
    boundary.authorization_gate_opened ||
    boundary.authorization_requested ||
    boundary.approval_granted ||
    boundary.dedicated_exact_approval_text_present ||
    boundary.approval_request_packet_created ||
    boundary.approval_request_packet_ready ||
    boundary.approval_request_submitted ||
    boundary.authorization_request_ready ||
    boundary.authorization_request_submitted ||
    boundary.approval_packet_ready ||
    boundary.approval_request_ready ||
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
    boundary.assembled_request_generated ||
    boundary.concrete_exact_values_allowed ||
    boundary.live_values_bound ||
    boundary.request_body_generated ||
    boundary.request_body_submitted ||
    boundary.runtime_execution_authorized ||
    boundary.runtime_executed ||
    Object.values(fieldFamilies).some(value => value === true) ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.authorization_request_disclosed ||
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

function isSourceChainComplete(sources) {
  return REQUIRED_SOURCE_FIELDS.every(field => sources[field] === true);
}

function isBoundaryComplete(boundary) {
  return (
    boundary.authorization_request_boundary_preflight_reviewed === true &&
    boundary.authorization_request_boundary_category_only === true &&
    boundary.authorization_request_boundary_non_authorizing === true &&
    boundary.source_evidence_references_declared === true &&
    boundary.field_family_classes_declared === true &&
    boundary.authority_family_classes_declared === true &&
    boundary.stop_condition_categories_declared === true &&
    boundary.validation_expectations_declared === true &&
    boundary.output_posture_declared === true &&
    boundary.receipt_posture_declared === true &&
    boundary.approval_line_forbidden_declared === true &&
    boundary.request_body_forbidden_declared === true &&
    boundary.request_packet_artifact_forbidden_declared === true &&
    boundary.runtime_forbidden_declared === true &&
    boundary.future_fixture_contract_allowed === true &&
    boundary.authorization_gate_opened === false &&
    boundary.authorization_requested === false &&
    boundary.approval_request_packet_created === false &&
    boundary.approval_request_packet_ready === false &&
    boundary.approval_request_submitted === false &&
    boundary.authorization_request_ready === false &&
    boundary.authorization_request_submitted === false &&
    boundary.approval_packet_ready === false &&
    boundary.approval_request_ready === false &&
    boundary.approval_line_present === false &&
    boundary.approval_line_generated === false &&
    boundary.approval_line_exposed === false &&
    boundary.approval_line_submitted === false &&
    boundary.request_packet_readiness_may_open === false &&
    boundary.request_packet_readiness_blocked === true &&
    boundary.exact_request_packet_ready === false &&
    boundary.exact_request_packet_present === false &&
    boundary.request_packet_created === false &&
    boundary.request_packet_rendered === false &&
    boundary.request_packet_stored === false &&
    boundary.request_packet_submitted === false &&
    boundary.request_assembly_allowed === false &&
    boundary.request_assembly_authorized === false &&
    boundary.assembled_request_generated === false &&
    boundary.concrete_exact_values_allowed === false &&
    boundary.live_values_bound === false &&
    boundary.request_body_generated === false &&
    boundary.request_body_submitted === false &&
    boundary.runtime_execution_authorized === false &&
    boundary.runtime_executed === false
  );
}

function areFieldFamiliesUnbound(fieldFamilies) {
  return REQUIRED_FIELD_FAMILY_FIELDS.every(field => fieldFamilies[field] === false);
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isSourceChainComplete(input.sources)) return 'authorization_request_boundary_incomplete';
  if (!isBoundaryComplete(input.boundary)) return 'authorization_request_boundary_incomplete';
  if (!areFieldFamiliesUnbound(input.fieldFamilies)) return 'stop_l4';
  return 'authorization_request_boundary_accepted_category_only_no_authority';
}

function validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.sources, 'sources'),
    ...missingFields(REQUIRED_BOUNDARY_FIELDS, input.boundary, 'boundary'),
    ...missingFields(REQUIRED_FIELD_FAMILY_FIELDS, input.fieldFamilies, 'fieldFamilies'),
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
    return rejected('invalid_exact_live_runtime_authorization_request_boundary_contract', input, {
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
    boundaryId: input.packet.boundary_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'authorization_request_boundary_validated_category_only_no_authority',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_NEXT_ACTIONS,
  ALLOWED_PROFILES,
  BOUNDARY_ID_PREFIX,
  CONTRACT_MODE,
  CONTRACT_NAME,
  CONTRACT_VERSION,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_FIELD_FAMILY_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_SOURCE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract
};
