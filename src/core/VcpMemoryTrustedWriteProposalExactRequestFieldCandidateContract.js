'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_exact_request_field_candidate_only';
const SCHEMA_VERSION = 1;

const FIELD_CANDIDATE_CONTRACT_VERSION =
  'vcp_memory_trusted_write_proposal_exact_request_field_candidate_v1';
const FIELD_CANDIDATE_ID_PREFIX =
  'm9_fixture_trusted_write_proposal_exact_request_field_candidate_';

const ALLOWED_DECISIONS = Object.freeze([
  'field_candidate_accept_non_authorizing',
  'field_candidate_incomplete',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
]);

const ALLOWED_PROFILES = Object.freeze([
  'trusted-write-proposal'
]);

const ALLOWED_TRANSPORT_FAMILIES = Object.freeze([
  'human_tool_http_transport_family'
]);

const ALLOWED_ROUTE_FAMILIES = Object.freeze([
  '/v1/human/tool'
]);

const ALLOWED_COMPONENT_ACTIONS = Object.freeze([
  'DailyNoteSearcher.SearchDailyNote'
]);

const ALLOWED_OPERATION_VOCABULARY = Object.freeze([
  'render_redacted_intent',
  'render_rollback_posture'
]);

const ALLOWED_REVIEW_STATUS_VOCABULARY = Object.freeze([
  'accept',
  'reject'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_candidate_matrix',
  'field_names_only',
  'none'
]);

const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1829_fixture_contract',
  'stop_or_supply_exact_boundary_later'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'candidate',
  'evidence',
  'candidateFields',
  'missingExactFields',
  'authorization',
  'output',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_CANDIDATE_FIELDS = Object.freeze([
  'candidate_id',
  'contract_version',
  'evidence_type',
  'profile',
  'non_authorizing',
  'field_candidates_only'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1828_candidate_selection_preflight_present',
  'accepted_m8_trusted_full_read_workflow_present_for_planning',
  'cm1826_packet_skeleton_contract_present',
  'cm1821_envelope_fixture_contract_present',
  'cm1822_receipt_shape_fixture_contract_present',
  'cm1827_closeout_gate_review_present'
]);

const REQUIRED_CANDIDATE_FIELD_KEYS = Object.freeze([
  'profile_candidate',
  'target_alias_candidate_present',
  'transport_family_candidate',
  'route_family_candidate',
  'component_action_candidate',
  'client_alias_candidates_present',
  'runtime_client_isolation_claimed',
  'visibility_boundary_candidate_present',
  'workspace_scope_candidate_present',
  'owner_scope_candidate_present',
  'proposal_operation_vocabulary_candidates',
  'proposal_scope_candidate_selected',
  'proposal_payload_shape_candidate_present',
  'review_route_candidate_present',
  'review_status_vocabulary_candidates',
  'rollback_posture_candidate_present',
  'current_runtime_call_budget',
  'current_provider_api_call_budget',
  'current_mcp_memory_tool_call_budget',
  'current_memory_write_budget',
  'current_durable_write_budget',
  'future_proposal_count_candidate',
  'future_runtime_call_budget_selected',
  'future_duration_budget_selected',
  'future_output_budget_candidate_present',
  'receipt_rules_candidate_present',
  'abort_receipt_rules_candidate_present'
]);

const REQUIRED_MISSING_EXACT_FIELDS = Object.freeze([
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
  'approval_line_value_missing',
  'missing_exact_fields_declared',
  'exact_request_packet_ready'
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
  'rawProposalPayload',
  'raw_proposal_payload',
  'proposalPayload',
  'proposal_payload',
  'requestPayload',
  'request_payload',
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
    ...collectUnexpectedKeys(input.candidate, REQUIRED_CANDIDATE_FIELDS, 'candidate'),
    ...collectUnexpectedKeys(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'),
    ...collectUnexpectedKeys(input.candidateFields, REQUIRED_CANDIDATE_FIELD_KEYS, 'candidateFields'),
    ...collectUnexpectedKeys(input.missingExactFields, REQUIRED_MISSING_EXACT_FIELDS, 'missingExactFields'),
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

function safeCandidateId(input) {
  const candidateId = isPlainObject(input?.candidate) ? input.candidate.candidate_id : null;
  return isFixtureIdentifier(candidateId, FIELD_CANDIDATE_ID_PREFIX) ? candidateId : null;
}

function lowDisclosureProjection(input) {
  const candidateFields = isPlainObject(input) ? input.candidateFields : null;
  const evidence = isPlainObject(input) ? input.evidence : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    candidateId: safeCandidateId(input),
    cm1828CandidateSelectionPreflightPresent: isPlainObject(evidence)
      ? evidence.cm1828_candidate_selection_preflight_present === true
      : false,
    profileCandidate: isPlainObject(candidateFields) &&
      ALLOWED_PROFILES.includes(candidateFields.profile_candidate)
      ? candidateFields.profile_candidate
      : null,
    targetAliasCandidatePresent: isPlainObject(candidateFields)
      ? candidateFields.target_alias_candidate_present === true
      : false,
    transportFamilyCandidate: isPlainObject(candidateFields) &&
      ALLOWED_TRANSPORT_FAMILIES.includes(candidateFields.transport_family_candidate)
      ? candidateFields.transport_family_candidate
      : null
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    exactRequestFieldCandidateAccepted:
      computedDecision === 'field_candidate_accept_non_authorizing',
    nonAuthorizingFieldCandidatesOnly: true,
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

function validateOperationVocabulary(values) {
  if (!Array.isArray(values)) return false;
  return values.every(operation => ALLOWED_OPERATION_VOCABULARY.includes(operation));
}

function validateReviewStatusVocabulary(values) {
  if (!Array.isArray(values)) return false;
  return values.every(status => ALLOWED_REVIEW_STATUS_VOCABULARY.includes(status));
}

function validateCompleteOperationVocabulary(values) {
  return Array.isArray(values) &&
    values.length === ALLOWED_OPERATION_VOCABULARY.length &&
    ALLOWED_OPERATION_VOCABULARY.every(operation => values.includes(operation)) &&
    values.every(operation => ALLOWED_OPERATION_VOCABULARY.includes(operation));
}

function validateCompleteReviewStatusVocabulary(values) {
  return Array.isArray(values) &&
    values.length === ALLOWED_REVIEW_STATUS_VOCABULARY.length &&
    ALLOWED_REVIEW_STATUS_VOCABULARY.every(status => values.includes(status)) &&
    values.every(status => ALLOWED_REVIEW_STATUS_VOCABULARY.includes(status));
}

function validateShape(input) {
  const invalid = [];
  const fields = input.candidateFields;

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!isFixtureIdentifier(input.candidate.candidate_id, FIELD_CANDIDATE_ID_PREFIX)) {
    invalid.push('candidate.candidate_id');
  }
  if (input.candidate.contract_version !== FIELD_CANDIDATE_CONTRACT_VERSION) {
    invalid.push('candidate.contract_version');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(input.candidate.evidence_type)) {
    invalid.push('candidate.evidence_type');
  }
  if (!ALLOWED_PROFILES.includes(input.candidate.profile)) invalid.push('candidate.profile');
  if (input.candidate.non_authorizing !== true) invalid.push('candidate.non_authorizing');
  if (input.candidate.field_candidates_only !== true) {
    invalid.push('candidate.field_candidates_only');
  }
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(input.output.disclosure_level)) {
    invalid.push('output.disclosure_level');
  }

  invalid.push(...validateBooleanFields(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'));
  invalid.push(...validateBooleanFields(
    input.missingExactFields,
    REQUIRED_MISSING_EXACT_FIELDS,
    'missingExactFields'
  ));
  invalid.push(...validateBooleanFields(input.authorization, REQUIRED_AUTHORIZATION_FIELDS, 'authorization'));
  invalid.push(...validateBooleanFields(
    input.output,
    REQUIRED_OUTPUT_FIELDS.filter(field => field !== 'disclosure_level'),
    'output'
  ));

  if (fields.profile_candidate !== 'trusted-write-proposal') {
    invalid.push('candidateFields.profile_candidate');
  }
  if (!ALLOWED_TRANSPORT_FAMILIES.includes(fields.transport_family_candidate)) {
    invalid.push('candidateFields.transport_family_candidate');
  }
  if (!ALLOWED_ROUTE_FAMILIES.includes(fields.route_family_candidate)) {
    invalid.push('candidateFields.route_family_candidate');
  }
  if (!ALLOWED_COMPONENT_ACTIONS.includes(fields.component_action_candidate)) {
    invalid.push('candidateFields.component_action_candidate');
  }
  for (const field of [
    'target_alias_candidate_present',
    'client_alias_candidates_present',
    'runtime_client_isolation_claimed',
    'visibility_boundary_candidate_present',
    'workspace_scope_candidate_present',
    'owner_scope_candidate_present',
    'proposal_scope_candidate_selected',
    'proposal_payload_shape_candidate_present',
    'review_route_candidate_present',
    'rollback_posture_candidate_present',
    'future_runtime_call_budget_selected',
    'future_duration_budget_selected',
    'future_output_budget_candidate_present',
    'receipt_rules_candidate_present',
    'abort_receipt_rules_candidate_present'
  ]) {
    if (typeof fields[field] !== 'boolean') invalid.push(`candidateFields.${field}`);
  }
  if (!validateOperationVocabulary(fields.proposal_operation_vocabulary_candidates)) {
    invalid.push('candidateFields.proposal_operation_vocabulary_candidates');
  }
  if (!validateReviewStatusVocabulary(fields.review_status_vocabulary_candidates)) {
    invalid.push('candidateFields.review_status_vocabulary_candidates');
  }
  for (const field of [
    'current_runtime_call_budget',
    'current_provider_api_call_budget',
    'current_mcp_memory_tool_call_budget',
    'current_memory_write_budget',
    'current_durable_write_budget'
  ]) {
    if (fields[field] !== 0) invalid.push(`candidateFields.${field}`);
  }
  if (fields.future_proposal_count_candidate !== 1) {
    invalid.push('candidateFields.future_proposal_count_candidate');
  }

  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }

  return invalid;
}

function hasL4Stop(input) {
  const fields = input.candidateFields;
  const missing = input.missingExactFields;
  const authorization = input.authorization;
  const output = input.output;

  return (
    fields.runtime_client_isolation_claimed ||
    fields.proposal_scope_candidate_selected ||
    fields.future_runtime_call_budget_selected ||
    fields.future_duration_budget_selected ||
    missing.exact_request_packet_ready ||
    Object.values(authorization).some(value => value === true) ||
    output.raw_private_output_allowed ||
    output.approval_line_value_disclosed ||
    output.readiness_claim_allowed
  );
}

function isPreparationEvidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function isCandidateFieldMatrixComplete(fields) {
  return (
    fields.profile_candidate === 'trusted-write-proposal' &&
    fields.target_alias_candidate_present === true &&
    ALLOWED_TRANSPORT_FAMILIES.includes(fields.transport_family_candidate) &&
    ALLOWED_ROUTE_FAMILIES.includes(fields.route_family_candidate) &&
    ALLOWED_COMPONENT_ACTIONS.includes(fields.component_action_candidate) &&
    fields.client_alias_candidates_present === true &&
    fields.runtime_client_isolation_claimed === false &&
    fields.visibility_boundary_candidate_present === true &&
    fields.workspace_scope_candidate_present === true &&
    fields.owner_scope_candidate_present === true &&
    validateCompleteOperationVocabulary(fields.proposal_operation_vocabulary_candidates) &&
    fields.proposal_scope_candidate_selected === false &&
    fields.proposal_payload_shape_candidate_present === true &&
    fields.review_route_candidate_present === true &&
    validateCompleteReviewStatusVocabulary(fields.review_status_vocabulary_candidates) &&
    fields.rollback_posture_candidate_present === true &&
    fields.current_runtime_call_budget === 0 &&
    fields.current_provider_api_call_budget === 0 &&
    fields.current_mcp_memory_tool_call_budget === 0 &&
    fields.current_memory_write_budget === 0 &&
    fields.current_durable_write_budget === 0 &&
    fields.future_proposal_count_candidate === 1 &&
    fields.future_runtime_call_budget_selected === false &&
    fields.future_duration_budget_selected === false &&
    fields.future_output_budget_candidate_present === true &&
    fields.receipt_rules_candidate_present === true &&
    fields.abort_receipt_rules_candidate_present === true
  );
}

function areMissingExactFieldsDeclared(missing) {
  return REQUIRED_MISSING_EXACT_FIELDS
    .filter(field => field !== 'exact_request_packet_ready')
    .every(field => missing[field] === true) &&
    missing.exact_request_packet_ready === false;
}

function computeDecision(input) {
  if (hasL4Stop(input)) return 'stop_l4';
  if (!isPreparationEvidenceComplete(input.evidence)) return 'field_candidate_incomplete';
  if (!isCandidateFieldMatrixComplete(input.candidateFields)) return 'field_candidate_incomplete';
  if (!areMissingExactFieldsDeclared(input.missingExactFields)) return 'field_candidate_incomplete';
  return 'field_candidate_accept_non_authorizing';
}

function validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_CANDIDATE_FIELDS, input.candidate, 'candidate'),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_CANDIDATE_FIELD_KEYS, input.candidateFields, 'candidateFields'),
    ...missingFields(REQUIRED_MISSING_EXACT_FIELDS, input.missingExactFields, 'missingExactFields'),
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
    return rejected('invalid_trusted_write_proposal_exact_request_field_candidate_contract', input, {
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
    fieldCandidateContractVersion: FIELD_CANDIDATE_CONTRACT_VERSION,
    candidateId: input.candidate.candidate_id,
    profile: input.candidate.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'field_candidate_validated_no_authority',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_COMPONENT_ACTIONS,
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_NEXT_ACTIONS,
  ALLOWED_OPERATION_VOCABULARY,
  ALLOWED_PROFILES,
  ALLOWED_REVIEW_STATUS_VOCABULARY,
  ALLOWED_ROUTE_FAMILIES,
  ALLOWED_TRANSPORT_FAMILIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FIELD_CANDIDATE_CONTRACT_VERSION,
  FIELD_CANDIDATE_ID_PREFIX,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_CANDIDATE_FIELDS,
  REQUIRED_CANDIDATE_FIELD_KEYS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MISSING_EXACT_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract
};
