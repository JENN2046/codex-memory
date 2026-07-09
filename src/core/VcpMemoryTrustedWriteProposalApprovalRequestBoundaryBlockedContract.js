'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_approval_request_boundary_blocked_only';
const SCHEMA_VERSION = 1;

const APPROVAL_REQUEST_BOUNDARY_CONTRACT_VERSION =
  'vcp_memory_trusted_write_proposal_approval_request_boundary_blocked_v1';
const APPROVAL_REQUEST_BOUNDARY_ID_PREFIX =
  'm9_fixture_trusted_write_proposal_approval_request_boundary_blocked_';

const ALLOWED_DECISIONS = Object.freeze([
  'approval_request_boundary_blocked_missing_exact_request_body_authority',
  'approval_request_boundary_incomplete',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze(['fixture-only', 'schema-only']);
const ALLOWED_PROFILES = Object.freeze(['trusted-write-proposal']);
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_approval_request_boundary',
  'field_names_only',
  'none'
]);
const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1843_fixture_contract',
  'stop_or_supply_exact_boundary_later'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'boundary',
  'missingBoundaryFields',
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
  'approval_request_boundary_blocked_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'accepted_m8_trusted_full_read_workflow_present_for_planning',
  'cm1837_approval_request_readiness_blocked_contract_present',
  'cm1838_approval_request_readiness_closeout_present',
  'cm1839_exact_request_packet_refresh_blocked_preflight_present',
  'cm1840_exact_request_packet_refresh_blocked_contract_present',
  'cm1841_exact_request_packet_refresh_closeout_present',
  'cm1842_approval_request_boundary_blocked_preflight_present',
  'local_exact_request_packet_refresh_blocked_fixture_contract_closed'
]);

const REQUIRED_BOUNDARY_FIELDS = Object.freeze([
  'local_approval_request_boundary_blocked_fixture_present',
  'accepted_planning_evidence_present',
  'approval_request_boundary_ready',
  'approval_request_ready',
  'exact_request_packet_ready',
  'exact_request_packet_present',
  'concrete_values_present',
  'exact_target_bound',
  'exact_transport_bound',
  'exact_client_ids_bound',
  'exact_workspace_scope_bound',
  'exact_owner_scope_bound',
  'exact_visibility_bound',
  'exact_proposal_scope_bound',
  'exact_proposal_operation_bound',
  'exact_payload_shape_bound',
  'exact_review_route_bound',
  'exact_rollback_posture_bound',
  'exact_budgets_bound',
  'l4_write_intent_shield_proven',
  'real_proposal_receipt_audit_bound',
  'approval_request_submission_authority_bound',
  'approval_request_template_created',
  'approval_request_body_prepared',
  'approval_request_body_present',
  'approval_request_submitted',
  'approval_line_value_present',
  'approval_line_generated',
  'approval_granted',
  'missing_boundary_fields_declared'
]);

const REQUIRED_MISSING_BOUNDARY_FIELDS = Object.freeze([
  'exact_target_value_missing',
  'exact_transport_value_missing',
  'exact_client_ids_missing',
  'exact_workspace_scope_missing',
  'exact_owner_scope_missing',
  'exact_visibility_scope_missing',
  'exact_proposal_scope_missing',
  'exact_proposal_operation_missing',
  'exact_payload_shape_missing',
  'exact_review_route_missing',
  'exact_rollback_posture_missing',
  'exact_budgets_missing',
  'l4_write_intent_shield_missing',
  'real_proposal_receipt_audit_missing',
  'approval_request_submission_authority_missing',
  'approval_request_template_missing',
  'approval_request_body_missing',
  'approval_line_value_missing',
  'exact_request_packet_missing',
  'approval_request_boundary_authority_missing'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'approval_request_boundary_authorized',
  'approval_request_template_creation_allowed',
  'approval_request_body_preparation_allowed',
  'approval_request_submission_allowed',
  'approval_line_generation_allowed',
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
  'request_template_disclosed',
  'request_body_disclosed',
  'approval_line_value_disclosed',
  'readiness_claim_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'approvalBoundaryAuthorizations',
  'requestTemplatesCreated',
  'requestBodiesPrepared',
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
  'approvalRequestTemplate',
  'approval_request_template',
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
  'approvalRequestReady',
  'approvalRequestBoundaryReady',
  'approval_request_boundary_ready_claim',
  'exactRequestPacketReady',
  'approvalRequestSubmitted',
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
    ...collectUnexpectedKeys(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'),
    ...collectUnexpectedKeys(
      input.missingBoundaryFields,
      REQUIRED_MISSING_BOUNDARY_FIELDS,
      'missingBoundaryFields'
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

function safeBoundaryId(input) {
  const boundaryId = isPlainObject(input?.packet) ? input.packet.boundary_id : null;
  return isFixtureIdentifier(boundaryId, APPROVAL_REQUEST_BOUNDARY_ID_PREFIX) ? boundaryId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const boundary = isPlainObject(input) ? input.boundary : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    boundaryId: safeBoundaryId(input),
    cm1842ApprovalRequestBoundaryBlockedPreflightPresent: isPlainObject(evidence)
      ? evidence.cm1842_approval_request_boundary_blocked_preflight_present === true
      : false,
    localExactRequestPacketRefreshBlockedFixtureContractClosed: isPlainObject(evidence)
      ? evidence.local_exact_request_packet_refresh_blocked_fixture_contract_closed === true
      : false,
    localApprovalRequestBoundaryBlockedFixturePresent: isPlainObject(boundary)
      ? boundary.local_approval_request_boundary_blocked_fixture_present === true
      : false,
    approvalRequestBoundaryReady: isPlainObject(boundary)
      ? boundary.approval_request_boundary_ready === true
      : false,
    approvalRequestReady: isPlainObject(boundary)
      ? boundary.approval_request_ready === true
      : false,
    approvalRequestBodyPrepared: isPlainObject(boundary)
      ? boundary.approval_request_body_prepared === true
      : false,
    approvalRequestSubmitted: isPlainObject(boundary)
      ? boundary.approval_request_submitted === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    approvalRequestBoundaryAccepted:
      computedDecision === 'approval_request_boundary_blocked_missing_exact_request_body_authority',
    nonAuthorizingApprovalRequestBoundaryBlockedOnly: true,
    approvalRequestBoundaryReady: false,
    approvalRequestReady: false,
    exactRequestPacketReady: false,
    exactRequestPacketPresent: false,
    concreteValuesPresent: false,
    approvalRequestTemplateCreated: false,
    approvalRequestBodyPrepared: false,
    approvalRequestBodyPresent: false,
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
  if (!isFixtureIdentifier(input.packet.boundary_id, APPROVAL_REQUEST_BOUNDARY_ID_PREFIX)) {
    invalid.push('packet.boundary_id');
  }
  if (input.packet.contract_version !== APPROVAL_REQUEST_BOUNDARY_CONTRACT_VERSION) {
    invalid.push('packet.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.approval_request_boundary_blocked_only !== true) {
    invalid.push('packet.approval_request_boundary_blocked_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'));
  invalid.push(...validateBooleanFields(
    input.missingBoundaryFields,
    REQUIRED_MISSING_BOUNDARY_FIELDS,
    'missingBoundaryFields'
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
  const authorization = input.authorization;
  const output = input.output;

  return (
    boundary.approval_request_boundary_ready ||
    boundary.approval_request_ready ||
    boundary.exact_request_packet_ready ||
    boundary.exact_request_packet_present ||
    boundary.concrete_values_present ||
    boundary.exact_target_bound ||
    boundary.exact_transport_bound ||
    boundary.exact_client_ids_bound ||
    boundary.exact_workspace_scope_bound ||
    boundary.exact_owner_scope_bound ||
    boundary.exact_visibility_bound ||
    boundary.exact_proposal_scope_bound ||
    boundary.exact_proposal_operation_bound ||
    boundary.exact_payload_shape_bound ||
    boundary.exact_review_route_bound ||
    boundary.exact_rollback_posture_bound ||
    boundary.exact_budgets_bound ||
    boundary.l4_write_intent_shield_proven ||
    boundary.real_proposal_receipt_audit_bound ||
    boundary.approval_request_submission_authority_bound ||
    boundary.approval_request_template_created ||
    boundary.approval_request_body_prepared ||
    boundary.approval_request_body_present ||
    boundary.approval_request_submitted ||
    boundary.approval_line_value_present ||
    boundary.approval_line_generated ||
    boundary.approval_granted ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.concrete_values_disclosed ||
    output.request_template_disclosed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.readiness_claim_allowed
  );
}

function isEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function areMissingBoundaryFieldsDeclared(missing) {
  return REQUIRED_MISSING_BOUNDARY_FIELDS.every(field => missing[field] === true);
}

function isBlockedApprovalRequestBoundaryStateDeclared(boundary, missing) {
  return (
    boundary.local_approval_request_boundary_blocked_fixture_present === true &&
    boundary.accepted_planning_evidence_present === true &&
    boundary.approval_request_boundary_ready === false &&
    boundary.approval_request_ready === false &&
    boundary.exact_request_packet_ready === false &&
    boundary.exact_request_packet_present === false &&
    boundary.concrete_values_present === false &&
    boundary.approval_request_template_created === false &&
    boundary.approval_request_body_prepared === false &&
    boundary.approval_request_body_present === false &&
    boundary.approval_request_submitted === false &&
    boundary.approval_line_value_present === false &&
    boundary.approval_line_generated === false &&
    boundary.approval_granted === false &&
    boundary.missing_boundary_fields_declared === true &&
    areMissingBoundaryFieldsDeclared(missing)
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isEvidenceComplete(input.evidence)) return 'approval_request_boundary_incomplete';
  if (!isBlockedApprovalRequestBoundaryStateDeclared(input.boundary, input.missingBoundaryFields)) {
    return 'approval_request_boundary_incomplete';
  }
  return 'approval_request_boundary_blocked_missing_exact_request_body_authority';
}

function validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_BOUNDARY_FIELDS, input.boundary, 'boundary'),
    ...missingFields(
      REQUIRED_MISSING_BOUNDARY_FIELDS,
      input.missingBoundaryFields,
      'missingBoundaryFields'
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
    return rejected('forbidden_raw_secret_request_approval_or_overclaim_fields', input, {
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
    return rejected('invalid_trusted_write_proposal_approval_request_boundary_blocked_contract', input, {
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
    approvalRequestBoundaryContractVersion: APPROVAL_REQUEST_BOUNDARY_CONTRACT_VERSION,
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
    nextAction: 'approval_request_boundary_validated_blocked_no_authority',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_NEXT_ACTIONS,
  ALLOWED_PROFILES,
  APPROVAL_REQUEST_BOUNDARY_CONTRACT_VERSION,
  APPROVAL_REQUEST_BOUNDARY_ID_PREFIX,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MISSING_BOUNDARY_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract
};
