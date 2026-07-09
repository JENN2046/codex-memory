'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalExactRequestPreparationBoundaryContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_exact_request_preparation_boundary_only';
const SCHEMA_VERSION = 1;

const REQUEST_PREPARATION_CONTRACT_VERSION =
  'vcp_memory_trusted_write_proposal_exact_request_preparation_boundary_v1';
const REQUEST_PREPARATION_ID_PREFIX =
  'm9_fixture_trusted_write_proposal_exact_request_preparation_boundary_';

const ALLOWED_DECISIONS = Object.freeze([
  'request_preparation_blocked_missing_exact_boundary',
  'request_preparation_incomplete',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
]);

const ALLOWED_PROFILES = Object.freeze([
  'trusted-write-proposal'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_request_preparation',
  'field_names_only',
  'none'
]);

const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1833_fixture_contract',
  'stop_or_supply_exact_boundary_later'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'packet',
  'evidence',
  'preparation',
  'missingExactBoundary',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'preparation_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'request_preparation_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1830_closeout_gate_review_present',
  'cm1831_packet_readiness_fixture_contract_present',
  'cm1832_closeout_gate_review_present',
  'local_packet_readiness_fixture_contract_closed'
]);

const REQUIRED_PREPARATION_FIELDS = Object.freeze([
  'local_request_preparation_boundary_fixture_present',
  'real_exact_request_packet_present',
  'exact_request_submission_ready',
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
  'approval_line_value_present',
  'missing_exact_boundary_declared'
]);

const REQUIRED_MISSING_EXACT_BOUNDARY_FIELDS = Object.freeze([
  'exact_target_binding_missing',
  'exact_transport_binding_missing',
  'exact_client_ids_missing',
  'exact_workspace_scope_missing',
  'exact_owner_scope_missing',
  'exact_visibility_missing',
  'exact_proposal_scope_missing',
  'exact_proposal_operation_binding_missing',
  'exact_payload_shape_missing',
  'exact_review_route_missing',
  'exact_rollback_posture_missing',
  'exact_budgets_missing',
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
  'exactRequestSubmissionReady',
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
    ...collectUnexpectedKeys(input.preparation, REQUIRED_PREPARATION_FIELDS, 'preparation'),
    ...collectUnexpectedKeys(
      input.missingExactBoundary,
      REQUIRED_MISSING_EXACT_BOUNDARY_FIELDS,
      'missingExactBoundary'
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

function safePreparationId(input) {
  const preparationId = isPlainObject(input?.packet) ? input.packet.preparation_id : null;
  return isFixtureIdentifier(preparationId, REQUEST_PREPARATION_ID_PREFIX) ? preparationId : null;
}

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  const preparation = isPlainObject(input) ? input.preparation : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    preparationId: safePreparationId(input),
    cm1832CloseoutGateReviewPresent: isPlainObject(evidence)
      ? evidence.cm1832_closeout_gate_review_present === true
      : false,
    localPacketReadinessFixtureContractClosed: isPlainObject(evidence)
      ? evidence.local_packet_readiness_fixture_contract_closed === true
      : false,
    localRequestPreparationBoundaryFixturePresent: isPlainObject(preparation)
      ? preparation.local_request_preparation_boundary_fixture_present === true
      : false,
    exactRequestSubmissionReady: isPlainObject(preparation)
      ? preparation.exact_request_submission_ready === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    exactRequestPreparationBoundaryAccepted:
      computedDecision === 'request_preparation_blocked_missing_exact_boundary',
    nonAuthorizingRequestPreparationOnly: true,
    realExactRequestPacketPresent: false,
    exactRequestSubmissionReady: false,
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
  if (!isFixtureIdentifier(input.packet.preparation_id, REQUEST_PREPARATION_ID_PREFIX)) {
    invalid.push('packet.preparation_id');
  }
  if (input.packet.contract_version !== REQUEST_PREPARATION_CONTRACT_VERSION) {
    invalid.push('packet.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.packet.evidence_type)) {
    invalid.push('packet.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.packet.profile)) invalid.push('packet.profile');
  if (input.packet.non_authorizing !== true) invalid.push('packet.non_authorizing');
  if (input.packet.request_preparation_only !== true) {
    invalid.push('packet.request_preparation_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(input.preparation, REQUIRED_PREPARATION_FIELDS, 'preparation'));
  invalid.push(...validateBooleanFields(
    input.missingExactBoundary,
    REQUIRED_MISSING_EXACT_BOUNDARY_FIELDS,
    'missingExactBoundary'
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
  const preparation = input.preparation;
  const authorization = input.authorization;
  const output = input.output;

  return (
    preparation.real_exact_request_packet_present ||
    preparation.exact_request_submission_ready ||
    preparation.exact_target_bound ||
    preparation.exact_transport_bound ||
    preparation.exact_client_ids_bound ||
    preparation.exact_workspace_scope_bound ||
    preparation.exact_owner_scope_bound ||
    preparation.exact_visibility_bound ||
    preparation.exact_proposal_scope_bound ||
    preparation.exact_proposal_operation_bound ||
    preparation.exact_payload_shape_bound ||
    preparation.exact_review_route_bound ||
    preparation.exact_rollback_posture_bound ||
    preparation.exact_budgets_bound ||
    preparation.l4_write_intent_shield_proven ||
    preparation.real_proposal_receipt_audit_bound ||
    preparation.approval_request_submission_authority_bound ||
    preparation.approval_line_value_present ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.request_body_disclosed ||
    output.approval_line_value_disclosed ||
    output.readiness_claim_allowed
  );
}

function isPreparationEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function areMissingExactBoundaryFieldsDeclared(missing) {
  return REQUIRED_MISSING_EXACT_BOUNDARY_FIELDS.every(field => missing[field] === true);
}

function isBlockedRequestPreparationStateDeclared(preparation, missing) {
  return (
    preparation.local_request_preparation_boundary_fixture_present === true &&
    preparation.real_exact_request_packet_present === false &&
    preparation.exact_request_submission_ready === false &&
    preparation.missing_exact_boundary_declared === true &&
    areMissingExactBoundaryFieldsDeclared(missing)
  );
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isPreparationEvidenceComplete(input.evidence)) return 'request_preparation_incomplete';
  if (!isBlockedRequestPreparationStateDeclared(input.preparation, input.missingExactBoundary)) {
    return 'request_preparation_incomplete';
  }
  return 'request_preparation_blocked_missing_exact_boundary';
}

function validateVcpMemoryTrustedWriteProposalExactRequestPreparationBoundaryContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_PREPARATION_FIELDS, input.preparation, 'preparation'),
    ...missingFields(
      REQUIRED_MISSING_EXACT_BOUNDARY_FIELDS,
      input.missingExactBoundary,
      'missingExactBoundary'
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
    return rejected('forbidden_raw_secret_request_or_overclaim_fields', input, { forbiddenFields });
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
    return rejected('invalid_trusted_write_proposal_exact_request_preparation_boundary_contract', input, {
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
    requestPreparationContractVersion: REQUEST_PREPARATION_CONTRACT_VERSION,
    preparationId: input.packet.preparation_id,
    profile: input.packet.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'request_preparation_validated_blocked_no_authority',
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
  REQUEST_PREPARATION_CONTRACT_VERSION,
  REQUEST_PREPARATION_ID_PREFIX,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MISSING_EXACT_BOUNDARY_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_PREPARATION_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalExactRequestPreparationBoundaryContract
};
