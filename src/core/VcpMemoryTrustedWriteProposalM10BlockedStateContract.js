'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalM10BlockedStateContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_m10_blocked_state_only';
const SCHEMA_VERSION = 1;

const M10_BLOCKED_STATE_CONTRACT_VERSION =
  'vcp_memory_trusted_write_proposal_m10_blocked_state_v1';
const M10_BLOCKED_STATE_ID_PREFIX =
  'm10_fixture_trusted_write_proposal_blocked_state_';

const ALLOWED_DECISIONS = Object.freeze([
  'm10_gate_blocked_missing_m9_completion',
  'm10_gate_incomplete',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['trusted-write-proposal']);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_m10_blocked_state',
  'field_names_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1847_fixture_contract',
  'stop_or_supply_exact_boundary_later'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'm10Gate',
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
  'm10_blocked_state_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'accepted_m8_trusted_full_read_workflow_present_for_planning',
  'cm1844_proposal_mode_gate_review_present',
  'cm1845_proposal_mode_blocked_closeout_present',
  'cm1846_m9_final_blocked_closeout_present',
  'cm1846_m10_gate_preflight_present',
  'm9_local_planning_chain_present'
]);

const REQUIRED_M10_GATE_FIELDS = Object.freeze([
  'local_m10_blocked_state_fixture_present',
  'accepted_planning_evidence_present',
  'm9_final_blocked_closeout_present',
  'm9_completed',
  'm9_completion_claimed',
  'm9_proposal_mode_complete',
  'proposal_mode_blocked',
  'm10_gate_preflight_present',
  'm10_gate_may_open',
  'm10_gate_blocked',
  'm10_runtime_or_write_authorized',
  'm10_unlocked',
  'm15_unlocked',
  'exact_boundary_supplied',
  'request_body_prepared',
  'approval_line_generated',
  'proposal_receipt_accepted',
  'runtime_attempt_performed',
  'readiness_claimed',
  'missing_m10_prerequisites_declared'
]);

const REQUIRED_BLOCKER_FIELDS = Object.freeze([
  'm9_completion_missing',
  'm9_proposal_mode_complete_missing',
  'exact_boundary_missing',
  'request_body_missing',
  'approval_line_missing',
  'accepted_real_proposal_receipt_missing',
  'runtime_write_authority_missing',
  'm10_gate_authority_missing'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'm10_gate_authorized',
  'runtime_execution_authorized',
  'memory_read_authorized',
  'memory_write_authorized',
  'durable_write_authorized',
  'provider_api_authorized',
  'public_mcp_expansion_authorized',
  'approval_request_submission_allowed',
  'approval_line_generation_allowed',
  'proposal_generation_authorized',
  'proposal_submission_authorized',
  'm10_unlocked',
  'm15_unlocked',
  'readiness_claimed'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'raw_private_output_allowed',
  'concrete_values_disclosed',
  'request_body_disclosed',
  'approval_line_value_disclosed',
  'readiness_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'requestBodiesPrepared',
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
  'm10Unlocks',
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
  'configEnvPath',
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
  'm10GateReady',
  'm10Unlocked',
  'm15Unlocked',
  'runtimeAuthorized',
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
    ...collectUnexpectedKeys(input.m10Gate, REQUIRED_M10_GATE_FIELDS, 'm10Gate'),
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
  return isFixtureIdentifier(gateId, M10_BLOCKED_STATE_ID_PREFIX) ? gateId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const gate = isPlainObject(input) ? input.m10Gate : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    gateId: safeGateId(input),
    cm1846M10GatePreflightPresent: isPlainObject(evidence)
      ? evidence.cm1846_m10_gate_preflight_present === true
      : false,
    m9FinalBlockedCloseoutPresent: isPlainObject(gate)
      ? gate.m9_final_blocked_closeout_present === true
      : false,
    m9Completed: isPlainObject(gate) ? gate.m9_completed === true : false,
    m10GateMayOpen: isPlainObject(gate) ? gate.m10_gate_may_open === true : false,
    m10Unlocked: isPlainObject(gate) ? gate.m10_unlocked === true : false,
    m15Unlocked: isPlainObject(gate) ? gate.m15_unlocked === true : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    m10BlockedStateAccepted: computedDecision === 'm10_gate_blocked_missing_m9_completion',
    nonAuthorizingM10BlockedStateOnly: true,
    m9Completed: false,
    m9CompletionClaimed: false,
    m9ProposalModeComplete: false,
    m10GateMayOpen: false,
    m10GateBlocked: true,
    m10RuntimeOrWriteAuthorized: false,
    m10Unlocked: false,
    m15Unlocked: false,
    exactBoundarySupplied: false,
    approvalRequestBodyPrepared: false,
    requestSubmitted: false,
    approvalLineGenerated: false,
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
  if (!isFixtureIdentifier(input.packet.gate_id, M10_BLOCKED_STATE_ID_PREFIX)) {
    invalid.push('packet.gate_id');
  }
  if (input.packet.contract_version !== M10_BLOCKED_STATE_CONTRACT_VERSION) {
    invalid.push('packet.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.m10_blocked_state_only !== true) invalid.push('packet.m10_blocked_state_only');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(input.m10Gate, REQUIRED_M10_GATE_FIELDS, 'm10Gate'));
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
  const gate = input.m10Gate;
  const authorization = input.authorization;
  const output = input.output;

  return (
    gate.m9_completed ||
    gate.m9_completion_claimed ||
    gate.m9_proposal_mode_complete ||
    gate.m10_gate_may_open ||
    gate.m10_runtime_or_write_authorized ||
    gate.m10_unlocked ||
    gate.m15_unlocked ||
    gate.exact_boundary_supplied ||
    gate.request_body_prepared ||
    gate.approval_line_generated ||
    gate.proposal_receipt_accepted ||
    gate.runtime_attempt_performed ||
    gate.readiness_claimed ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.readiness_claim_allowed
  );
}

function isEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function areBlockersDeclared(blockers) {
  return REQUIRED_BLOCKER_FIELDS.every(field => blockers[field] === true);
}

function isBlockedM10GateStateDeclared(gate, blockers) {
  return (
    gate.local_m10_blocked_state_fixture_present === true &&
    gate.accepted_planning_evidence_present === true &&
    gate.m9_final_blocked_closeout_present === true &&
    gate.m9_completed === false &&
    gate.m9_completion_claimed === false &&
    gate.m9_proposal_mode_complete === false &&
    gate.proposal_mode_blocked === true &&
    gate.m10_gate_preflight_present === true &&
    gate.m10_gate_may_open === false &&
    gate.m10_gate_blocked === true &&
    gate.m10_runtime_or_write_authorized === false &&
    gate.m10_unlocked === false &&
    gate.m15_unlocked === false &&
    gate.exact_boundary_supplied === false &&
    gate.request_body_prepared === false &&
    gate.approval_line_generated === false &&
    gate.proposal_receipt_accepted === false &&
    gate.runtime_attempt_performed === false &&
    gate.readiness_claimed === false &&
    gate.missing_m10_prerequisites_declared === true &&
    areBlockersDeclared(blockers)
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'm10_gate_incomplete';
  if (!isBlockedM10GateStateDeclared(input.m10Gate, input.blockers)) {
    return 'm10_gate_incomplete';
  }
  return 'm10_gate_blocked_missing_m9_completion';
}

function validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_M10_GATE_FIELDS, input.m10Gate, 'm10Gate'),
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
    return rejected('forbidden_raw_secret_runtime_m10_or_readiness_fields', input, {
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
    return rejected('invalid_trusted_write_proposal_m10_blocked_state_contract', input, {
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
    m10BlockedStateContractVersion: M10_BLOCKED_STATE_CONTRACT_VERSION,
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
    nextAction: 'm10_gate_validated_blocked_no_authority',
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
  M10_BLOCKED_STATE_CONTRACT_VERSION,
  M10_BLOCKED_STATE_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKER_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_M10_GATE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalM10BlockedStateContract
};
