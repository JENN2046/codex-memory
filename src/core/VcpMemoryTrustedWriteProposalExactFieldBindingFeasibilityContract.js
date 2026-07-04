'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_exact_field_binding_feasibility_only';
const SCHEMA_VERSION = 1;

const EXACT_FIELD_BINDING_CONTRACT_VERSION =
  'vcp_memory_trusted_write_proposal_exact_field_binding_feasibility_v1';
const EXACT_FIELD_BINDING_ID_PREFIX =
  'm9_fixture_trusted_write_proposal_exact_field_binding_feasibility_';

const ALLOWED_DECISIONS = Object.freeze([
  'exact_field_binding_blocked_missing_concrete_values',
  'exact_field_binding_incomplete',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['trusted-write-proposal']);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_exact_field_binding',
  'field_names_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1835_fixture_contract',
  'stop_or_supply_exact_boundary_later'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'feasibility',
  'missingConcreteValues',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'binding_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'exact_field_binding_feasibility_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1832_closeout_gate_review_present',
  'cm1833_request_preparation_boundary_contract_present',
  'cm1834_closeout_gate_review_present',
  'local_request_preparation_boundary_fixture_contract_closed'
]);

const REQUIRED_FEASIBILITY_FIELDS = Object.freeze([
  'local_exact_field_binding_feasibility_fixture_present',
  'exact_field_binding_ready',
  'real_exact_target_value_present',
  'real_exact_transport_value_present',
  'real_client_ids_present',
  'real_workspace_scope_present',
  'real_owner_scope_present',
  'real_visibility_scope_present',
  'real_proposal_scope_present',
  'real_proposal_operation_present',
  'real_payload_shape_present',
  'real_review_route_present',
  'real_rollback_posture_present',
  'real_budgets_present',
  'l4_write_intent_shield_proven',
  'real_proposal_receipt_audit_bound',
  'approval_request_submission_authority_bound',
  'approval_line_value_present',
  'missing_concrete_values_declared'
]);

const REQUIRED_MISSING_CONCRETE_VALUE_FIELDS = Object.freeze([
  'exact_target_value_missing',
  'exact_transport_value_missing',
  'client_ids_missing',
  'workspace_scope_missing',
  'owner_scope_missing',
  'visibility_scope_missing',
  'proposal_scope_missing',
  'proposal_operation_missing',
  'payload_shape_missing',
  'review_route_missing',
  'rollback_posture_missing',
  'budgets_missing',
  'l4_write_intent_shield_missing',
  'real_proposal_receipt_audit_missing',
  'approval_request_submission_authority_missing',
  'approval_line_value_missing'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'exact_request_submission_allowed',
  'approval_line_value_present',
  'approval_granted',
  'proposal_generation_authorized',
  'proposal_submission_authorized',
  'proposal_acceptance_authorized',
  'runtime_execution_authorized',
  'memory_read_authorized',
  'memory_write_authorized',
  'durable_write_authorized',
  'provider_api_authorized',
  'public_mcp_expansion_authorized',
  'm9_completion_claimed',
  'm10_unlocked',
  'm15_unlocked'
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
  'requestSubmissions',
  'approvalLineOperations',
  'approvalGrants',
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
  'm9CompletionClaims',
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
  'proposalPayload',
  'proposal_payload',
  'requestPayload',
  'request_payload',
  'requestBody',
  'request_body',
  'approvalPayload',
  'approval_payload',
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
  'exactFieldBindingReady',
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
    ...collectUnexpectedKeys(input.feasibility, REQUIRED_FEASIBILITY_FIELDS, 'feasibility'),
    ...collectUnexpectedKeys(
      input.missingConcreteValues,
      REQUIRED_MISSING_CONCRETE_VALUE_FIELDS,
      'missingConcreteValues'
    ),
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

function safeBindingId(input) {
  const bindingId = isPlainObject(input?.packet) ? input.packet.binding_id : null;
  return isFixtureIdentifier(bindingId, EXACT_FIELD_BINDING_ID_PREFIX) ? bindingId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const feasibility = isPlainObject(input) ? input.feasibility : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    bindingId: safeBindingId(input),
    cm1834CloseoutGateReviewPresent: isPlainObject(evidence)
      ? evidence.cm1834_closeout_gate_review_present === true
      : false,
    localRequestPreparationBoundaryFixtureContractClosed: isPlainObject(evidence)
      ? evidence.local_request_preparation_boundary_fixture_contract_closed === true
      : false,
    localExactFieldBindingFeasibilityFixturePresent: isPlainObject(feasibility)
      ? feasibility.local_exact_field_binding_feasibility_fixture_present === true
      : false,
    exactFieldBindingReady: isPlainObject(feasibility)
      ? feasibility.exact_field_binding_ready === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    exactFieldBindingFeasibilityAccepted:
      computedDecision === 'exact_field_binding_blocked_missing_concrete_values',
    nonAuthorizingExactFieldBindingOnly: true,
    exactFieldBindingReady: false,
    concreteValuesPresent: false,
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
    m9ProposalModePassed: false,
    m9CompletionClaimed: false,
    m10Unlocked: false,
    m15Unlocked: false,
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
  if (!isFixtureIdentifier(input.packet.binding_id, EXACT_FIELD_BINDING_ID_PREFIX)) {
    invalid.push('packet.binding_id');
  }
  if (input.packet.contract_version !== EXACT_FIELD_BINDING_CONTRACT_VERSION) {
    invalid.push('packet.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.exact_field_binding_feasibility_only !== true) {
    invalid.push('packet.exact_field_binding_feasibility_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(input.feasibility, REQUIRED_FEASIBILITY_FIELDS, 'feasibility'));
  invalid.push(...validateBooleanFields(
    input.missingConcreteValues,
    REQUIRED_MISSING_CONCRETE_VALUE_FIELDS,
    'missingConcreteValues'
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
  const feasibility = input.feasibility;
  const authorization = input.authorization;
  const output = input.output;

  return (
    feasibility.exact_field_binding_ready ||
    feasibility.real_exact_target_value_present ||
    feasibility.real_exact_transport_value_present ||
    feasibility.real_client_ids_present ||
    feasibility.real_workspace_scope_present ||
    feasibility.real_owner_scope_present ||
    feasibility.real_visibility_scope_present ||
    feasibility.real_proposal_scope_present ||
    feasibility.real_proposal_operation_present ||
    feasibility.real_payload_shape_present ||
    feasibility.real_review_route_present ||
    feasibility.real_rollback_posture_present ||
    feasibility.real_budgets_present ||
    feasibility.l4_write_intent_shield_proven ||
    feasibility.real_proposal_receipt_audit_bound ||
    feasibility.approval_request_submission_authority_bound ||
    feasibility.approval_line_value_present ||
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

function areMissingConcreteValuesDeclared(missing) {
  return REQUIRED_MISSING_CONCRETE_VALUE_FIELDS.every(field => missing[field] === true);
}

function isBlockedExactFieldBindingStateDeclared(feasibility, missing) {
  return (
    feasibility.local_exact_field_binding_feasibility_fixture_present === true &&
    feasibility.exact_field_binding_ready === false &&
    feasibility.missing_concrete_values_declared === true &&
    areMissingConcreteValuesDeclared(missing)
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'exact_field_binding_incomplete';
  if (!isBlockedExactFieldBindingStateDeclared(input.feasibility, input.missingConcreteValues)) {
    return 'exact_field_binding_incomplete';
  }
  return 'exact_field_binding_blocked_missing_concrete_values';
}

function validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_FEASIBILITY_FIELDS, input.feasibility, 'feasibility'),
    ...missingFields(
      REQUIRED_MISSING_CONCRETE_VALUE_FIELDS,
      input.missingConcreteValues,
      'missingConcreteValues'
    ),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_exact_value_or_overclaim_fields', input, { forbiddenFields });
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
    return rejected('invalid_trusted_write_proposal_exact_field_binding_feasibility_contract', input, {
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
    exactFieldBindingContractVersion: EXACT_FIELD_BINDING_CONTRACT_VERSION,
    bindingId: input.packet.binding_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'exact_field_binding_feasibility_validated_blocked_no_authority',
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
  EXACT_FIELD_BINDING_CONTRACT_VERSION,
  EXACT_FIELD_BINDING_ID_PREFIX,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_FEASIBILITY_FIELDS,
  REQUIRED_MISSING_CONCRETE_VALUE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract
};
