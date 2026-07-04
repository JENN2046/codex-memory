'use strict';

const CONTRACT_NAME = 'VcpMemoryExactLiveRuntimeApprovalRequestPacketBoundaryContract';
const CONTRACT_MODE = 'fixture_exact_live_runtime_approval_request_packet_boundary_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION = 'vcp_memory_exact_live_runtime_approval_request_packet_boundary_v1';
const BOUNDARY_ID_PREFIX = 'cm1887_fixture_exact_live_runtime_approval_request_packet_boundary_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['exact-live-runtime-approval-request-packet-boundary']);
const ALLOWED_DECISIONS = Object.freeze([
  'request_packet_boundary_accepted_category_only_non_authorizing',
  'request_packet_boundary_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'request_packet_boundary_categories_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1887_request_packet_boundary_fixture_contract',
  'cm1888_request_packet_boundary_fixture_closeout_or_packet_skeleton_review'
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
  'request_packet_not_created'
]);

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  'cm1883_readiness_gate_review_present',
  'cm1884_readiness_blocked_fixture_contract_present',
  'cm1885_readiness_blocked_fixture_closeout_present',
  'cm1886_request_packet_boundary_review_present',
  'validation_cmv1989_present'
]);

const REQUIRED_BOUNDARY_FIELDS = Object.freeze([
  'request_packet_boundary_reviewed',
  'request_packet_boundary_category_only',
  'request_packet_boundary_non_authorizing',
  'source_evidence_references_declared',
  'field_family_classes_declared',
  'missing_value_classifications_declared',
  'approval_line_forbidden_declared',
  'request_body_forbidden_declared',
  'runtime_forbidden_declared',
  'abort_condition_categories_declared',
  'validation_evidence_references_declared',
  'false_zero_counter_policy_declared',
  'future_fixture_or_skeleton_allowed',
  'request_packet_creation_allowed',
  'request_packet_ready',
  'request_packet_present',
  'request_assembly_allowed'
]);

const REQUIRED_FIELD_FAMILY_FIELDS = Object.freeze([
  'target_alias_value_bound',
  'transport_value_bound',
  'client_workspace_owner_visibility_value_bound',
  'operation_family_value_bound',
  'runtime_budget_value_bound',
  'output_policy_value_bound',
  'log_stdout_stderr_policy_value_bound',
  'memory_policy_value_bound',
  'cleanup_policy_value_bound',
  'receipt_path_class_value_bound',
  'validation_command_list_value_bound',
  'live_values_bound'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'executable_request_preparation_authorized',
  'request_packet_creation_authorized',
  'request_assembly_authorized',
  'request_body_generation_authorized',
  'request_submission_authorized',
  'approval_line_generation_authorized',
  'approval_line_exposure_authorized',
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
  'requestPacketsCreated',
  'requestPreparations',
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
  'requestPacket',
  'request_packet',
  'approvalRequestPacket',
  'approval_request_packet',
  'requestTemplate',
  'request_template',
  'executableApprovalTemplate',
  'executable_approval_template',
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
  'exactOperation',
  'budgetValue',
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
    cm1886RequestPacketBoundaryReviewPresent: isPlainObject(sources)
      ? sources.cm1886_request_packet_boundary_review_present === true
      : false,
    requestPacketBoundaryReviewed: isPlainObject(boundary)
      ? boundary.request_packet_boundary_reviewed === true
      : false,
    requestPacketBoundaryCategoryOnly: isPlainObject(boundary)
      ? boundary.request_packet_boundary_category_only === true
      : false,
    requestPacketBoundaryNonAuthorizing: isPlainObject(boundary)
      ? boundary.request_packet_boundary_non_authorizing === true
      : false,
    requestPacketCreationAllowed: isPlainObject(boundary)
      ? boundary.request_packet_creation_allowed === true
      : false,
    requestPacketReady: isPlainObject(boundary)
      ? boundary.request_packet_ready === true
      : false,
    requestPacketPresent: isPlainObject(boundary)
      ? boundary.request_packet_present === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    requestPacketBoundaryAccepted:
      computedDecision === 'request_packet_boundary_accepted_category_only_non_authorizing',
    nonAuthorizingCategoryBoundaryOnly: true,
    requestPacketCreationAllowed: false,
    requestPacketReady: false,
    requestPacketPresent: false,
    requestAssemblyAllowed: false,
    liveValuesBound: false,
    requestPacketCreated: false,
    assembledRequestGenerated: false,
    requestBodyGenerated: false,
    requestSubmitted: false,
    approvalLineGenerated: false,
    approvalLineExposed: false,
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
  if (!isFixtureIdentifier(input.packet.boundary_id, BOUNDARY_ID_PREFIX)) {
    invalid.push('packet.boundary_id');
  }
  if (input.packet.contract_version !== CONTRACT_VERSION) invalid.push('packet.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) invalid.push('packet.evidence_type');
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.category_only_boundary !== true) invalid.push('packet.category_only_boundary');
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
  invalid.push(...validateBooleanFields(
    input.fieldFamilies,
    REQUIRED_FIELD_FAMILY_FIELDS,
    'fieldFamilies'
  ));
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
    boundary.request_packet_creation_allowed ||
    boundary.request_packet_ready ||
    boundary.request_packet_present ||
    boundary.request_assembly_allowed ||
    Object.values(fieldFamilies).some(value => value === true) ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
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
    boundary.request_packet_boundary_reviewed === true &&
    boundary.request_packet_boundary_category_only === true &&
    boundary.request_packet_boundary_non_authorizing === true &&
    boundary.source_evidence_references_declared === true &&
    boundary.field_family_classes_declared === true &&
    boundary.missing_value_classifications_declared === true &&
    boundary.approval_line_forbidden_declared === true &&
    boundary.request_body_forbidden_declared === true &&
    boundary.runtime_forbidden_declared === true &&
    boundary.abort_condition_categories_declared === true &&
    boundary.validation_evidence_references_declared === true &&
    boundary.false_zero_counter_policy_declared === true &&
    boundary.future_fixture_or_skeleton_allowed === true &&
    boundary.request_packet_creation_allowed === false &&
    boundary.request_packet_ready === false &&
    boundary.request_packet_present === false &&
    boundary.request_assembly_allowed === false
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isSourceChainComplete(input.sources)) return 'request_packet_boundary_incomplete';
  if (!isBoundaryComplete(input.boundary)) return 'request_packet_boundary_incomplete';
  return 'request_packet_boundary_accepted_category_only_non_authorizing';
}

function validateVcpMemoryExactLiveRuntimeApprovalRequestPacketBoundaryContract(input) {
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
    return rejected('invalid_exact_live_runtime_approval_request_packet_boundary_contract', input, {
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
    nextAction: 'request_packet_boundary_validated_category_only_no_authority',
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
  validateVcpMemoryExactLiveRuntimeApprovalRequestPacketBoundaryContract
};
