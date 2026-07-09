'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalEnvelopeContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_envelope_contract_only';
const SCHEMA_VERSION = 1;

const ENVELOPE_CONTRACT_VERSION = 'vcp_memory_trusted_write_proposal_envelope_v1';
const RECEIPT_PLAN_CONTRACT_VERSION = 'vcp_memory_trusted_write_proposal_receipt_plan_v1';
const ENVELOPE_ID_PREFIX = 'm9_fixture_trusted_write_proposal_envelope_';
const RECEIPT_PLAN_ID_PREFIX = 'm9_fixture_trusted_write_proposal_receipt_plan_';

const ALLOWED_DECISIONS = Object.freeze([
  'fixture_accept',
  'deny',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
]);

const ALLOWED_PROFILES = Object.freeze([
  'trusted-write-proposal'
]);

const ALLOWED_PROPOSAL_OPERATIONS = Object.freeze([
  'render_redacted_intent',
  'render_rollback_posture'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_proposal_shape',
  'none'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'proposalEnvelope',
  'reviewRoute',
  'receiptPlan',
  'expectedDecision',
  'counters'
]);

const REQUIRED_ENVELOPE_FIELDS = Object.freeze([
  'envelope_id',
  'contract_version',
  'evidence_type',
  'profile',
  'decision',
  'boundary',
  'proposal',
  'policy',
  'output',
  'next_action_allowed'
]);

const REQUIRED_BOUNDARY_FIELDS = Object.freeze([
  'accepted_m8_receipt_present',
  'exact_boundary_complete',
  'proposal_scope_present',
  'operations_present',
  'payload_shape_present',
  'review_route_present',
  'rollback_posture_present',
  'budgets_present',
  'l4_write_intent_shield_evidenced'
]);

const REQUIRED_PROPOSAL_FIELDS = Object.freeze([
  'proposal_mode',
  'scope_id_present',
  'operations',
  'payload_shape_only',
  'proposal_generation_requested',
  'proposal_submission_requested',
  'direct_write_requested',
  'durable_write_requested',
  'update_requested',
  'supersede_requested',
  'tombstone_requested',
  'irreversible_delete_requested'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'memory_write_allowed',
  'durable_write_allowed',
  'provider_api_allowed',
  'public_mcp_expansion_allowed',
  'raw_private_payload_allowed'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'raw_private_output_allowed',
  'approval_line_value_disclosed',
  'readiness_claim_allowed'
]);

const REQUIRED_REVIEW_ROUTE_FIELDS = Object.freeze([
  'route_present',
  'accept_reject_semantics_present',
  'auto_accept_allowed',
  'rollback_posture_present'
]);

const REQUIRED_RECEIPT_PLAN_FIELDS = Object.freeze([
  'receipt_plan_id',
  'contract_version',
  'proposal_envelope_id',
  'low_disclosure',
  'proposal_receipt_shape_only',
  'rollback_posture_included',
  'raw_private_payload_disclosed',
  'memory_write_planned',
  'durable_write_planned',
  'runtime_calls_planned',
  'provider_api_calls_planned',
  'approval_line_value_disclosed',
  'public_mcp_expansion',
  'readiness_claimed',
  'next_action_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'proposalEnvelopesRendered',
  'proposalsGenerated',
  'proposalsSubmitted',
  'proposalReceiptsAccepted',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'mcpToolCalls',
  'memoryReads',
  'memoryWrites',
  'memoryUpdates',
  'memorySupersedes',
  'memoryTombstones',
  'durableAuditWrites',
  'durableMemoryWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'approvalLineOperations',
  'approvalRequestSubmissions',
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

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => (prefix ? `${prefix}.${field}` : field));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
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
    ...collectUnexpectedKeys(input.proposalEnvelope, REQUIRED_ENVELOPE_FIELDS, 'proposalEnvelope'),
    ...collectUnexpectedKeys(input.proposalEnvelope?.boundary, REQUIRED_BOUNDARY_FIELDS, 'proposalEnvelope.boundary'),
    ...collectUnexpectedKeys(input.proposalEnvelope?.proposal, REQUIRED_PROPOSAL_FIELDS, 'proposalEnvelope.proposal'),
    ...collectUnexpectedKeys(input.proposalEnvelope?.policy, REQUIRED_POLICY_FIELDS, 'proposalEnvelope.policy'),
    ...collectUnexpectedKeys(input.proposalEnvelope?.output, REQUIRED_OUTPUT_FIELDS, 'proposalEnvelope.output'),
    ...collectUnexpectedKeys(input.reviewRoute, REQUIRED_REVIEW_ROUTE_FIELDS, 'reviewRoute'),
    ...collectUnexpectedKeys(input.receiptPlan, REQUIRED_RECEIPT_PLAN_FIELDS, 'receiptPlan'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  const envelope = isPlainObject(input) ? input.proposalEnvelope : null;
  const proposal = isPlainObject(envelope?.proposal) ? envelope.proposal : null;

  return {
    envelopeId: isPlainObject(envelope) && isFixtureIdentifier(envelope.envelope_id, ENVELOPE_ID_PREFIX)
      ? envelope.envelope_id
      : null,
    profile: isPlainObject(envelope) && typeof envelope.profile === 'string' ? envelope.profile : null,
    decision: isPlainObject(envelope) && typeof envelope.decision === 'string' ? envelope.decision : null,
    proposalMode: isPlainObject(proposal) && typeof proposal.proposal_mode === 'string'
      ? proposal.proposal_mode
      : null,
    expectedDecision: isPlainObject(input) && typeof input.expectedDecision === 'string'
      ? input.expectedDecision
      : null
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
    expectedDecision: isPlainObject(input) ? input.expectedDecision || null : null,
    nextAction: 'fix_fixture_or_stop',
    fixtureTrustedWriteProposalOnly: true,
    runtimeWiringExecuted: false,
    proposalGenerated: false,
    proposalSubmitted: false,
    proposalReceiptAccepted: false,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    memoryUpdated: false,
    memorySuperseded: false,
    memoryTombstoned: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    readinessClaimAllowed: false
  };
}

function validateShape(input) {
  const envelope = input.proposalEnvelope;
  const boundary = envelope.boundary;
  const proposal = envelope.proposal;
  const policy = envelope.policy;
  const output = envelope.output;
  const receiptPlan = input.receiptPlan;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!isFixtureIdentifier(envelope.envelope_id, ENVELOPE_ID_PREFIX)) invalid.push('proposalEnvelope.envelope_id');
  if (envelope.contract_version !== ENVELOPE_CONTRACT_VERSION) invalid.push('proposalEnvelope.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(envelope.evidence_type)) invalid.push('proposalEnvelope.evidence_type');
  if (!ALLOWED_PROFILES.includes(envelope.profile)) invalid.push('proposalEnvelope.profile');
  if (!ALLOWED_DECISIONS.includes(envelope.decision)) invalid.push('proposalEnvelope.decision');
  if (!['cm1821_fixture_contract', 'stop_or_supply_exact_boundary'].includes(envelope.next_action_allowed)) {
    invalid.push('proposalEnvelope.next_action_allowed');
  }

  for (const field of REQUIRED_BOUNDARY_FIELDS) {
    if (typeof boundary[field] !== 'boolean') invalid.push(`proposalEnvelope.boundary.${field}`);
  }
  if (proposal.proposal_mode !== 'fixture_envelope_only') invalid.push('proposalEnvelope.proposal.proposal_mode');
  if (!Array.isArray(proposal.operations)) invalid.push('proposalEnvelope.proposal.operations');
  if (Array.isArray(proposal.operations)) {
    proposal.operations.forEach((operation, index) => {
      if (!ALLOWED_PROPOSAL_OPERATIONS.includes(operation)) {
        invalid.push(`proposalEnvelope.proposal.operations[${index}]`);
      }
    });
  }
  for (const field of REQUIRED_PROPOSAL_FIELDS.filter(field => field !== 'proposal_mode' && field !== 'operations')) {
    if (typeof proposal[field] !== 'boolean') invalid.push(`proposalEnvelope.proposal.${field}`);
  }
  for (const field of REQUIRED_POLICY_FIELDS) {
    if (typeof policy[field] !== 'boolean') invalid.push(`proposalEnvelope.policy.${field}`);
  }
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(output.disclosure_level)) {
    invalid.push('proposalEnvelope.output.disclosure_level');
  }
  for (const field of REQUIRED_OUTPUT_FIELDS.filter(field => field !== 'disclosure_level')) {
    if (typeof output[field] !== 'boolean') invalid.push(`proposalEnvelope.output.${field}`);
  }

  for (const field of REQUIRED_REVIEW_ROUTE_FIELDS.filter(field => field !== 'auto_accept_allowed')) {
    if (typeof input.reviewRoute[field] !== 'boolean') invalid.push(`reviewRoute.${field}`);
  }
  if (typeof input.reviewRoute.auto_accept_allowed !== 'boolean') invalid.push('reviewRoute.auto_accept_allowed');

  if (!isFixtureIdentifier(receiptPlan.receipt_plan_id, RECEIPT_PLAN_ID_PREFIX)) {
    invalid.push('receiptPlan.receipt_plan_id');
  }
  if (receiptPlan.contract_version !== RECEIPT_PLAN_CONTRACT_VERSION) invalid.push('receiptPlan.contract_version');
  if (!isFixtureIdentifier(receiptPlan.proposal_envelope_id, ENVELOPE_ID_PREFIX)) {
    invalid.push('receiptPlan.proposal_envelope_id');
  }
  if (receiptPlan.proposal_envelope_id !== envelope.envelope_id) invalid.push('receiptPlan.proposal_envelope_id');
  if (receiptPlan.low_disclosure !== true) invalid.push('receiptPlan.low_disclosure');
  if (receiptPlan.proposal_receipt_shape_only !== true) invalid.push('receiptPlan.proposal_receipt_shape_only');
  if (receiptPlan.rollback_posture_included !== true) invalid.push('receiptPlan.rollback_posture_included');
  if (receiptPlan.next_action_allowed !== envelope.next_action_allowed) invalid.push('receiptPlan.next_action_allowed');
  for (const field of [
    'raw_private_payload_disclosed',
    'memory_write_planned',
    'durable_write_planned',
    'approval_line_value_disclosed',
    'public_mcp_expansion',
    'readiness_claimed'
  ]) {
    if (typeof receiptPlan[field] !== 'boolean') invalid.push(`receiptPlan.${field}`);
  }
  if (!Number.isInteger(receiptPlan.runtime_calls_planned) || receiptPlan.runtime_calls_planned < 0) {
    invalid.push('receiptPlan.runtime_calls_planned');
  }
  if (!Number.isInteger(receiptPlan.provider_api_calls_planned) || receiptPlan.provider_api_calls_planned < 0) {
    invalid.push('receiptPlan.provider_api_calls_planned');
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }

  return invalid;
}

function computeDecision(input) {
  const envelope = input.proposalEnvelope;
  const boundary = envelope.boundary;
  const proposal = envelope.proposal;
  const policy = envelope.policy;
  const output = envelope.output;
  const route = input.reviewRoute;
  const receiptPlan = input.receiptPlan;

  if (
    proposal.direct_write_requested ||
    proposal.durable_write_requested ||
    proposal.update_requested ||
    proposal.supersede_requested ||
    proposal.tombstone_requested ||
    proposal.irreversible_delete_requested ||
    proposal.proposal_submission_requested ||
    policy.memory_write_allowed ||
    policy.durable_write_allowed ||
    policy.provider_api_allowed ||
    policy.public_mcp_expansion_allowed ||
    policy.raw_private_payload_allowed ||
    output.raw_private_output_allowed ||
    output.approval_line_value_disclosed ||
    output.readiness_claim_allowed ||
    route.auto_accept_allowed ||
    receiptPlan.memory_write_planned ||
    receiptPlan.durable_write_planned ||
    receiptPlan.runtime_calls_planned > 0 ||
    receiptPlan.provider_api_calls_planned > 0 ||
    receiptPlan.approval_line_value_disclosed ||
    receiptPlan.public_mcp_expansion ||
    receiptPlan.readiness_claimed
  ) {
    return 'stop_l4';
  }

  if (
    !boundary.accepted_m8_receipt_present ||
    !boundary.exact_boundary_complete ||
    !boundary.proposal_scope_present ||
    !boundary.operations_present ||
    !boundary.payload_shape_present ||
    !boundary.review_route_present ||
    !boundary.rollback_posture_present ||
    !boundary.budgets_present ||
    !boundary.l4_write_intent_shield_evidenced ||
    !proposal.scope_id_present ||
    proposal.operations.length < 1 ||
    !proposal.payload_shape_only ||
    !route.route_present ||
    !route.accept_reject_semantics_present ||
    !route.rollback_posture_present
  ) {
    return 'deny';
  }

  return 'fixture_accept';
}

function validateVcpMemoryTrustedWriteProposalEnvelopeContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_ENVELOPE_FIELDS, input.proposalEnvelope, 'proposalEnvelope'),
    ...missingFields(REQUIRED_BOUNDARY_FIELDS, input.proposalEnvelope?.boundary, 'proposalEnvelope.boundary'),
    ...missingFields(REQUIRED_PROPOSAL_FIELDS, input.proposalEnvelope?.proposal, 'proposalEnvelope.proposal'),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.proposalEnvelope?.policy, 'proposalEnvelope.policy'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.proposalEnvelope?.output, 'proposalEnvelope.output'),
    ...missingFields(REQUIRED_REVIEW_ROUTE_FIELDS, input.reviewRoute, 'reviewRoute'),
    ...missingFields(REQUIRED_RECEIPT_PLAN_FIELDS, input.receiptPlan, 'receiptPlan'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_proposal_or_overclaim_fields', input, { forbiddenFields });
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
    return rejected('invalid_trusted_write_proposal_envelope_contract', input, { invalidFields });
  }

  const computedDecision = computeDecision(input);
  if (input.expectedDecision !== computedDecision || input.proposalEnvelope.decision !== computedDecision) {
    return rejected('decision_mismatch', input, {
      computedDecision,
      invalidFields: ['expectedDecision', 'proposalEnvelope.decision']
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    envelopeId: input.proposalEnvelope.envelope_id,
    receiptPlanId: input.receiptPlan.receipt_plan_id,
    profile: input.proposalEnvelope.profile,
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_trusted_write_proposal_envelope_validated_no_runtime',
    fixtureTrustedWriteProposalOnly: true,
    runtimeWiringExecuted: false,
    proposalGenerated: false,
    proposalSubmitted: false,
    proposalReceiptAccepted: false,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    memoryUpdated: false,
    memorySuperseded: false,
    memoryTombstoned: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_PROPOSAL_OPERATIONS,
  ALLOWED_PROFILES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_ENVELOPE_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_PROPOSAL_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_REVIEW_ROUTE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalEnvelopeContract
};
