'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalM11BlockedRouteContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_m11_blocked_route_only';
const SCHEMA_VERSION = 1;

const M11_BLOCKED_ROUTE_CONTRACT_VERSION =
  'vcp_memory_trusted_write_proposal_m11_blocked_route_v1';
const M11_BLOCKED_ROUTE_ID_PREFIX =
  'm11_fixture_trusted_write_proposal_blocked_route_';

const ALLOWED_DECISIONS = Object.freeze([
  'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority',
  'm11_route_incomplete',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['trusted-write-proposal']);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_m11_blocked_route',
  'field_names_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1850_fixture_contract',
  'cm1851_m11_blocked_route_closeout_gate_review',
  'stop_or_supply_exact_live_boundary_later'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'm11Route',
  'blockers',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'gate_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'm11_blocked_route_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1848_m10_blocked_state_closeout_present',
  'cm1849_m11_blocked_precondition_refresh_present',
  'm10_blocked_state_fixture_closed_for_planning',
  'm11_preconditions_refreshed',
  'm9_local_planning_chain_present'
]);

const REQUIRED_M11_ROUTE_FIELDS = Object.freeze([
  'local_m11_blocked_route_fixture_present',
  'accepted_planning_evidence_present',
  'm10_gate_blocked',
  'm10_runtime_or_write_authorized',
  'm10_unlocked',
  'm11_gate_may_open',
  'm11_gate_blocked',
  'm11_unlocked',
  'm15_unlocked',
  'exact_runtime_boundary_bound',
  'exact_memory_read_boundary_bound',
  'exact_memory_write_boundary_bound',
  'exact_request_body_generation_authorized',
  'exact_request_submission_authorized',
  'approval_line_handling_authorized',
  'config_startup_change_authorized',
  'proposal_receipt_accepted',
  'runtime_attempt_performed',
  'memory_read_performed',
  'memory_write_performed',
  'readiness_claimed',
  'missing_m11_prerequisites_declared'
]);

const REQUIRED_BLOCKER_FIELDS = Object.freeze([
  'm10_gate_blocked',
  'runtime_boundary_missing',
  'memory_read_boundary_missing',
  'memory_write_boundary_missing',
  'request_body_authority_missing',
  'request_submission_authority_missing',
  'approval_line_authority_missing',
  'accepted_real_proposal_receipt_missing',
  'config_startup_boundary_missing',
  'm11_route_authority_missing'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'runtime_execution_authorized',
  'memory_read_authorized',
  'memory_write_authorized',
  'durable_write_authorized',
  'provider_api_authorized',
  'public_mcp_expansion_authorized',
  'request_body_generation_allowed',
  'approval_request_submission_allowed',
  'approval_line_generation_allowed',
  'approval_line_submission_allowed',
  'proposal_generation_authorized',
  'proposal_submission_authorized',
  'config_startup_change_authorized',
  'm11_unlocked',
  'm15_unlocked',
  'readiness_claimed'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'raw_private_output_allowed',
  'concrete_values_disclosed',
  'request_body_disclosed',
  'approval_line_value_disclosed',
  'runtime_payload_disclosed',
  'memory_content_disclosed',
  'readiness_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'requestBodiesGenerated',
  'requestSubmissions',
  'approvalLineOperations',
  'proposalGenerations',
  'proposalSubmissions',
  'proposalReceiptsAccepted',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'mcpToolCalls',
  'memoryReads',
  'memoryWrites',
  'durableWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'configStartupWatchdogChanges',
  'm11Unlocks',
  'm15Unlocks',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'rawRequestPacket',
  'raw_request_packet',
  'exactRequestPacket',
  'exact_request_packet',
  'approvalRequestPacket',
  'approval_request_packet',
  'proposalPayload',
  'proposal_payload',
  'requestPayload',
  'request_payload',
  'requestBody',
  'request_body',
  'approvalPayload',
  'approval_payload',
  'approvalRequestBody',
  'approval_request_body',
  'runtimePayload',
  'runtime_payload',
  'memoryContent',
  'memory_content',
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
  'configPath',
  'configEnvPath',
  'startupPath',
  'watchdogPath',
  'targetValue',
  'transportValue',
  'clientId',
  'workspaceId',
  'ownerId',
  'visibilityScope',
  'proposalScope',
  'proposalOperation',
  'payloadShape',
  'reviewRoute',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'm11GateReady',
  'm11Unlocked',
  'm15Unlocked',
  'runtimeAuthorized',
  'readAuthorized',
  'writeAuthorized',
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
    ...collectUnexpectedKeys(input.m11Route, REQUIRED_M11_ROUTE_FIELDS, 'm11Route'),
    ...collectUnexpectedKeys(input.blockers, REQUIRED_BLOCKER_FIELDS, 'blockers'),
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

function safeGateId(input) {
  const gateId = isPlainObject(input?.packet) ? input.packet.gate_id : null;
  return isFixtureIdentifier(gateId, M11_BLOCKED_ROUTE_ID_PREFIX) ? gateId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const route = isPlainObject(input) ? input.m11Route : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    gateId: safeGateId(input),
    cm1849M11BlockedPreconditionRefreshPresent: isPlainObject(evidence)
      ? evidence.cm1849_m11_blocked_precondition_refresh_present === true
      : false,
    m10GateBlocked: isPlainObject(route) ? route.m10_gate_blocked === true : false,
    m10Unlocked: isPlainObject(route) ? route.m10_unlocked === true : false,
    m11GateMayOpen: isPlainObject(route) ? route.m11_gate_may_open === true : false,
    m11Unlocked: isPlainObject(route) ? route.m11_unlocked === true : false,
    m15Unlocked: isPlainObject(route) ? route.m15_unlocked === true : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    m11BlockedRouteAccepted:
      computedDecision ===
      'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority',
    nonAuthorizingM11BlockedRouteOnly: true,
    m9Completed: false,
    m9ProposalModeComplete: false,
    m10GateMayOpen: false,
    m10GateBlocked: true,
    m10RuntimeOrWriteAuthorized: false,
    m10Unlocked: false,
    m11GateMayOpen: false,
    m11GateBlocked: true,
    m11Unlocked: false,
    m15Unlocked: false,
    exactRuntimeBoundaryBound: false,
    exactMemoryReadBoundaryBound: false,
    exactMemoryWriteBoundaryBound: false,
    approvalRequestBodyGenerated: false,
    requestSubmitted: false,
    approvalLineGenerated: false,
    approvalLineSubmitted: false,
    approvalGranted: false,
    proposalGenerated: false,
    proposalSubmitted: false,
    proposalReceiptAccepted: false,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableWritePerformed: false,
    configStartupChanged: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
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
  if (!isFixtureIdentifier(input.packet.gate_id, M11_BLOCKED_ROUTE_ID_PREFIX)) {
    invalid.push('packet.gate_id');
  }
  if (input.packet.contract_version !== M11_BLOCKED_ROUTE_CONTRACT_VERSION) {
    invalid.push('packet.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.m11_blocked_route_only !== true) invalid.push('packet.m11_blocked_route_only');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(input.m11Route, REQUIRED_M11_ROUTE_FIELDS, 'm11Route'));
  invalid.push(...validateBooleanFields(input.blockers, REQUIRED_BLOCKER_FIELDS, 'blockers'));
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
  const route = input.m11Route;
  const authorization = input.authorization;
  const output = input.output;

  return (
    route.m10_runtime_or_write_authorized ||
    route.m10_unlocked ||
    route.m11_gate_may_open ||
    route.m11_unlocked ||
    route.m15_unlocked ||
    route.exact_runtime_boundary_bound ||
    route.exact_memory_read_boundary_bound ||
    route.exact_memory_write_boundary_bound ||
    route.exact_request_body_generation_authorized ||
    route.exact_request_submission_authorized ||
    route.approval_line_handling_authorized ||
    route.config_startup_change_authorized ||
    route.proposal_receipt_accepted ||
    route.runtime_attempt_performed ||
    route.memory_read_performed ||
    route.memory_write_performed ||
    route.readiness_claimed ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.runtime_payload_disclosed ||
    output.memory_content_disclosed ||
    output.readiness_claim_allowed
  );
}

function isEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function areBlockersDeclared(blockers) {
  return REQUIRED_BLOCKER_FIELDS.every(field => blockers[field] === true);
}

function isBlockedM11RouteStateDeclared(route, blockers) {
  return (
    route.local_m11_blocked_route_fixture_present === true &&
    route.accepted_planning_evidence_present === true &&
    route.m10_gate_blocked === true &&
    route.m10_runtime_or_write_authorized === false &&
    route.m10_unlocked === false &&
    route.m11_gate_may_open === false &&
    route.m11_gate_blocked === true &&
    route.m11_unlocked === false &&
    route.m15_unlocked === false &&
    route.exact_runtime_boundary_bound === false &&
    route.exact_memory_read_boundary_bound === false &&
    route.exact_memory_write_boundary_bound === false &&
    route.exact_request_body_generation_authorized === false &&
    route.exact_request_submission_authorized === false &&
    route.approval_line_handling_authorized === false &&
    route.config_startup_change_authorized === false &&
    route.proposal_receipt_accepted === false &&
    route.runtime_attempt_performed === false &&
    route.memory_read_performed === false &&
    route.memory_write_performed === false &&
    route.readiness_claimed === false &&
    route.missing_m11_prerequisites_declared === true &&
    areBlockersDeclared(blockers)
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'm11_route_incomplete';
  if (!isBlockedM11RouteStateDeclared(input.m11Route, input.blockers)) {
    return 'm11_route_incomplete';
  }
  return 'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority';
}

function validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_M11_ROUTE_FIELDS, input.m11Route, 'm11Route'),
    ...missingFields(REQUIRED_BLOCKER_FIELDS, input.blockers, 'blockers'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_runtime_memory_approval_config_or_readiness_fields', input, {
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
    return rejected('invalid_trusted_write_proposal_m11_blocked_route_contract', input, {
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
    m11BlockedRouteContractVersion: M11_BLOCKED_ROUTE_CONTRACT_VERSION,
    gateId: input.packet.gate_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'm11_route_validated_blocked_no_authority',
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
  FORBIDDEN_FIELD_NAMES,
  M11_BLOCKED_ROUTE_CONTRACT_VERSION,
  M11_BLOCKED_ROUTE_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKER_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_M11_ROUTE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract
};
