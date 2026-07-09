'use strict';

const CONTRACT_NAME = 'VcpMemoryExactLiveRuntimeApprovalRequestReadinessBlockedContract';
const CONTRACT_MODE = 'fixture_exact_live_runtime_approval_request_readiness_blocked_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION = 'vcp_memory_exact_live_runtime_approval_request_readiness_blocked_v1';
const READINESS_ID_PREFIX = 'cm1884_fixture_exact_live_runtime_approval_request_readiness_blocked_';

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['exact-live-runtime-approval-request-readiness-blocked']);
const ALLOWED_DECISIONS = Object.freeze([
  'approval_request_readiness_blocked_missing_exact_values_request_packet_request_body_approval_line_runtime_authority',
  'approval_request_readiness_incomplete',
  'stop_l4'
]);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'blocked_readiness_categories_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1884_readiness_blocked_fixture_contract',
  'cm1885_readiness_blocked_fixture_closeout_or_request_packet_boundary_review'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'blockedReadiness',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'readiness_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'readiness_blocked_fixture_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1880_preparation_boundary_review_present',
  'cm1881_preparation_boundary_fixture_contract_present',
  'cm1882_preparation_boundary_fixture_closeout_present',
  'cm1883_readiness_gate_review_present',
  'validation_cmv1986_present'
]);

const REQUIRED_BLOCKED_READINESS_FIELDS = Object.freeze([
  'approval_request_readiness_gate_reviewed',
  'approval_request_readiness_gate_passed',
  'approval_request_readiness_blocked',
  'exact_request_packet_ready',
  'exact_request_packet_present',
  'approval_packet_ready',
  'approval_request_ready',
  'live_values_bound',
  'exact_target_alias_bound',
  'exact_transport_family_bound',
  'exact_client_workspace_owner_aliases_bound',
  'exact_operation_family_bound',
  'exact_runtime_budget_bound',
  'exact_output_policy_bound',
  'exact_log_stdout_stderr_policy_bound',
  'exact_memory_policy_bound',
  'exact_cleanup_policy_bound',
  'exact_receipt_path_class_bound',
  'exact_validation_command_list_bound',
  'exact_request_body_authority_bound',
  'exact_request_submission_authority_bound',
  'approval_line_handling_authority_bound',
  'runtime_authority_bound',
  'memory_authority_bound',
  'config_authority_bound',
  'dedicated_exact_approval_text_present',
  'missing_authorities_declared',
  'next_fixture_contract_allowed'
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
    ...collectUnexpectedKeys(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'),
    ...collectUnexpectedKeys(input.blockedReadiness, REQUIRED_BLOCKED_READINESS_FIELDS, 'blockedReadiness'),
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

function safeReadinessId(input) {
  const readinessId = isPlainObject(input?.packet) ? input.packet.readiness_id : null;
  return isFixtureIdentifier(readinessId, READINESS_ID_PREFIX) ? readinessId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const blockedReadiness = isPlainObject(input) ? input.blockedReadiness : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    readinessId: safeReadinessId(input),
    cm1883ReadinessGateReviewPresent: isPlainObject(evidence)
      ? evidence.cm1883_readiness_gate_review_present === true
      : false,
    approvalRequestReadinessBlocked: isPlainObject(blockedReadiness)
      ? blockedReadiness.approval_request_readiness_blocked === true
      : false,
    approvalRequestReadinessGatePassed: isPlainObject(blockedReadiness)
      ? blockedReadiness.approval_request_readiness_gate_passed === true
      : false,
    exactRequestPacketReady: isPlainObject(blockedReadiness)
      ? blockedReadiness.exact_request_packet_ready === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    approvalRequestReadinessBlockedFixtureAccepted:
      computedDecision ===
      'approval_request_readiness_blocked_missing_exact_values_request_packet_request_body_approval_line_runtime_authority',
    approvalRequestReadinessGatePassed: false,
    approvalRequestReadinessBlocked: true,
    exactRequestPacketReady: false,
    exactRequestPacketPresent: false,
    approvalPacketReady: false,
    approvalRequestReady: false,
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
  if (!isFixtureIdentifier(input.packet.readiness_id, READINESS_ID_PREFIX)) {
    invalid.push('packet.readiness_id');
  }
  if (input.packet.contract_version !== CONTRACT_VERSION) invalid.push('packet.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) invalid.push('packet.evidence_type');
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.readiness_blocked_fixture_only !== true) {
    invalid.push('packet.readiness_blocked_fixture_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(
    input.blockedReadiness,
    REQUIRED_BLOCKED_READINESS_FIELDS,
    'blockedReadiness'
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
  const readiness = input.blockedReadiness;
  const authorization = input.authorization;
  const output = input.output;

  return (
    readiness.approval_request_readiness_gate_passed ||
    !readiness.approval_request_readiness_blocked ||
    readiness.exact_request_packet_ready ||
    readiness.exact_request_packet_present ||
    readiness.approval_packet_ready ||
    readiness.approval_request_ready ||
    readiness.live_values_bound ||
    readiness.exact_target_alias_bound ||
    readiness.exact_transport_family_bound ||
    readiness.exact_client_workspace_owner_aliases_bound ||
    readiness.exact_operation_family_bound ||
    readiness.exact_runtime_budget_bound ||
    readiness.exact_output_policy_bound ||
    readiness.exact_log_stdout_stderr_policy_bound ||
    readiness.exact_memory_policy_bound ||
    readiness.exact_cleanup_policy_bound ||
    readiness.exact_receipt_path_class_bound ||
    readiness.exact_validation_command_list_bound ||
    readiness.exact_request_body_authority_bound ||
    readiness.exact_request_submission_authority_bound ||
    readiness.approval_line_handling_authority_bound ||
    readiness.runtime_authority_bound ||
    readiness.memory_authority_bound ||
    readiness.config_authority_bound ||
    readiness.dedicated_exact_approval_text_present ||
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

function isEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function isBlockedReadinessComplete(blockedReadiness) {
  return (
    blockedReadiness.approval_request_readiness_gate_reviewed === true &&
    blockedReadiness.approval_request_readiness_gate_passed === false &&
    blockedReadiness.approval_request_readiness_blocked === true &&
    blockedReadiness.missing_authorities_declared === true &&
    blockedReadiness.next_fixture_contract_allowed === true &&
    !hasL4Stop({
      blockedReadiness,
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])),
      output: {
        raw_private_output_allowed: false,
        concrete_values_disclosed: false,
        request_packet_disclosed: false,
        assembled_request_disclosed: false,
        request_body_disclosed: false,
        approval_line_value_disclosed: false,
        runtime_command_disclosed: false,
        memory_payload_disclosed: false,
        config_value_disclosed: false,
        readiness_claim_allowed: false
      }
    })
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'approval_request_readiness_incomplete';
  if (!isBlockedReadinessComplete(input.blockedReadiness)) {
    return 'approval_request_readiness_incomplete';
  }
  return 'approval_request_readiness_blocked_missing_exact_values_request_packet_request_body_approval_line_runtime_authority';
}

function validateVcpMemoryExactLiveRuntimeApprovalRequestReadinessBlockedContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_BLOCKED_READINESS_FIELDS, input.blockedReadiness, 'blockedReadiness'),
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
    return rejected('invalid_exact_live_runtime_approval_request_readiness_blocked_contract', input, {
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
    readinessId: input.packet.readiness_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'approval_request_readiness_blocked_validated_no_authority',
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
  READINESS_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKED_READINESS_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestReadinessBlockedContract
};
