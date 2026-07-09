'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalReceiptShapeContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_receipt_shape_contract_only';
const SCHEMA_VERSION = 1;

const RECEIPT_CONTRACT_VERSION = 'vcp_memory_trusted_write_proposal_receipt_shape_v1';
const ENVELOPE_CONTRACT_VERSION = 'vcp_memory_trusted_write_proposal_envelope_v1';
const RECEIPT_ID_PREFIX = 'm9_fixture_trusted_write_proposal_receipt_';
const ENVELOPE_ID_PREFIX = 'm9_fixture_trusted_write_proposal_envelope_';

const ALLOWED_DECISIONS = Object.freeze([
  'receipt_shape_accept',
  'receipt_shape_reject',
  'stop_l4'
]);

const ALLOWED_ENVELOPE_DECISIONS = Object.freeze([
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

const ALLOWED_PROPOSAL_REVIEW_STATUS = Object.freeze([
  'accept',
  'reject'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'redacted_receipt_shape',
  'none'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceEnvelope',
  'proposalReceipt',
  'redaction',
  'expectedDecision',
  'counters'
]);

const REQUIRED_SOURCE_ENVELOPE_FIELDS = Object.freeze([
  'envelope_id',
  'contract_version',
  'evidence_type',
  'profile',
  'envelope_decision',
  'envelope_validated',
  'proposal_generation_performed',
  'proposal_submission_performed',
  'memory_write_performed',
  'durable_write_performed'
]);

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'receipt_id',
  'contract_version',
  'evidence_type',
  'profile',
  'decision',
  'scope',
  'intent',
  'review',
  'rollback',
  'output',
  'policy',
  'next_action_allowed'
]);

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'scope_id_present',
  'client_scope_present',
  'visibility_present',
  'operation_scope_present'
]);

const REQUIRED_INTENT_FIELDS = Object.freeze([
  'redacted_intent_present',
  'mutation_intent_shape_only',
  'proposal_generation_requested',
  'proposal_submission_requested',
  'direct_write_requested',
  'durable_write_requested',
  'update_requested',
  'supersede_requested',
  'tombstone_requested',
  'irreversible_delete_requested'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'accept_reject_status_present',
  'proposal_review_status',
  'auto_accept_allowed',
  'execution_authorized'
]);

const REQUIRED_ROLLBACK_FIELDS = Object.freeze([
  'rollback_posture_present',
  'rollback_plan_shape_only',
  'rollback_execution_requested'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosure_level',
  'redacted_output_present',
  'raw_private_output_allowed',
  'approval_line_value_disclosed',
  'readiness_claim_allowed'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'memory_write_allowed',
  'durable_write_allowed',
  'provider_api_allowed',
  'public_mcp_expansion_allowed',
  'raw_private_payload_allowed'
]);

const REQUIRED_REDACTION_FIELDS = Object.freeze([
  'low_disclosure',
  'values_redacted',
  'field_names_only_on_rejection',
  'safe_fixture_ids_only',
  'raw_private_payload_disclosed',
  'secret_values_disclosed',
  'approval_line_value_disclosed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'proposalReceiptsRendered',
  'proposalReceiptsAccepted',
  'proposalsGenerated',
  'proposalsSubmitted',
  'approvalRequestSubmissions',
  'approvalLineOperations',
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
  'rawReceiptPayload',
  'raw_receipt_payload',
  'proposalPayload',
  'proposal_payload',
  'receiptPayload',
  'receipt_payload',
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
    ...collectUnexpectedKeys(input.sourceEnvelope, REQUIRED_SOURCE_ENVELOPE_FIELDS, 'sourceEnvelope'),
    ...collectUnexpectedKeys(input.proposalReceipt, REQUIRED_RECEIPT_FIELDS, 'proposalReceipt'),
    ...collectUnexpectedKeys(input.proposalReceipt?.scope, REQUIRED_SCOPE_FIELDS, 'proposalReceipt.scope'),
    ...collectUnexpectedKeys(input.proposalReceipt?.intent, REQUIRED_INTENT_FIELDS, 'proposalReceipt.intent'),
    ...collectUnexpectedKeys(input.proposalReceipt?.review, REQUIRED_REVIEW_FIELDS, 'proposalReceipt.review'),
    ...collectUnexpectedKeys(input.proposalReceipt?.rollback, REQUIRED_ROLLBACK_FIELDS, 'proposalReceipt.rollback'),
    ...collectUnexpectedKeys(input.proposalReceipt?.output, REQUIRED_OUTPUT_FIELDS, 'proposalReceipt.output'),
    ...collectUnexpectedKeys(input.proposalReceipt?.policy, REQUIRED_POLICY_FIELDS, 'proposalReceipt.policy'),
    ...collectUnexpectedKeys(input.redaction, REQUIRED_REDACTION_FIELDS, 'redaction'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  const sourceEnvelope = isPlainObject(input) ? input.sourceEnvelope : null;
  const proposalReceipt = isPlainObject(input) ? input.proposalReceipt : null;
  const review = isPlainObject(proposalReceipt?.review) ? proposalReceipt.review : null;

  return {
    receiptId: isPlainObject(proposalReceipt) && isFixtureIdentifier(proposalReceipt.receipt_id, RECEIPT_ID_PREFIX)
      ? proposalReceipt.receipt_id
      : null,
    sourceEnvelopeId: isPlainObject(sourceEnvelope) && isFixtureIdentifier(sourceEnvelope.envelope_id, ENVELOPE_ID_PREFIX)
      ? sourceEnvelope.envelope_id
      : null,
    profile: isPlainObject(proposalReceipt) && ALLOWED_PROFILES.includes(proposalReceipt.profile)
      ? proposalReceipt.profile
      : null,
    decision: isPlainObject(proposalReceipt) && ALLOWED_DECISIONS.includes(proposalReceipt.decision)
      ? proposalReceipt.decision
      : null,
    proposalReviewStatus: isPlainObject(review) && ALLOWED_PROPOSAL_REVIEW_STATUS.includes(review.proposal_review_status)
      ? review.proposal_review_status
      : null,
    expectedDecision: isPlainObject(input) && ALLOWED_DECISIONS.includes(input.expectedDecision)
      ? input.expectedDecision
      : null
  };
}

function safeExpectedDecision(input) {
  return isPlainObject(input) && ALLOWED_DECISIONS.includes(input.expectedDecision)
    ? input.expectedDecision
    : null;
}

function sideEffectPosture(computedDecision = null) {
  return {
    fixtureTrustedWriteProposalReceiptOnly: true,
    receiptShapeAccepted: computedDecision === 'receipt_shape_accept',
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

function validateShape(input) {
  const sourceEnvelope = input.sourceEnvelope;
  const receipt = input.proposalReceipt;
  const scope = receipt.scope;
  const intent = receipt.intent;
  const review = receipt.review;
  const rollback = receipt.rollback;
  const output = receipt.output;
  const policy = receipt.policy;
  const redaction = input.redaction;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');

  if (!isFixtureIdentifier(sourceEnvelope.envelope_id, ENVELOPE_ID_PREFIX)) invalid.push('sourceEnvelope.envelope_id');
  if (sourceEnvelope.contract_version !== ENVELOPE_CONTRACT_VERSION) invalid.push('sourceEnvelope.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(sourceEnvelope.evidence_type)) invalid.push('sourceEnvelope.evidence_type');
  if (!ALLOWED_PROFILES.includes(sourceEnvelope.profile)) invalid.push('sourceEnvelope.profile');
  if (!ALLOWED_ENVELOPE_DECISIONS.includes(sourceEnvelope.envelope_decision)) {
    invalid.push('sourceEnvelope.envelope_decision');
  }
  for (const field of REQUIRED_SOURCE_ENVELOPE_FIELDS.filter(field => ![
    'envelope_id',
    'contract_version',
    'evidence_type',
    'profile',
    'envelope_decision'
  ].includes(field))) {
    if (typeof sourceEnvelope[field] !== 'boolean') invalid.push(`sourceEnvelope.${field}`);
  }

  if (!isFixtureIdentifier(receipt.receipt_id, RECEIPT_ID_PREFIX)) invalid.push('proposalReceipt.receipt_id');
  if (receipt.contract_version !== RECEIPT_CONTRACT_VERSION) invalid.push('proposalReceipt.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(receipt.evidence_type)) invalid.push('proposalReceipt.evidence_type');
  if (!ALLOWED_PROFILES.includes(receipt.profile)) invalid.push('proposalReceipt.profile');
  if (!ALLOWED_DECISIONS.includes(receipt.decision)) invalid.push('proposalReceipt.decision');
  if (!['cm1822_fixture_contract', 'stop_or_supply_exact_boundary'].includes(receipt.next_action_allowed)) {
    invalid.push('proposalReceipt.next_action_allowed');
  }

  for (const field of REQUIRED_SCOPE_FIELDS) {
    if (typeof scope[field] !== 'boolean') invalid.push(`proposalReceipt.scope.${field}`);
  }
  for (const field of REQUIRED_INTENT_FIELDS) {
    if (typeof intent[field] !== 'boolean') invalid.push(`proposalReceipt.intent.${field}`);
  }
  if (typeof review.accept_reject_status_present !== 'boolean') {
    invalid.push('proposalReceipt.review.accept_reject_status_present');
  }
  if (!ALLOWED_PROPOSAL_REVIEW_STATUS.includes(review.proposal_review_status)) {
    invalid.push('proposalReceipt.review.proposal_review_status');
  }
  if (typeof review.auto_accept_allowed !== 'boolean') invalid.push('proposalReceipt.review.auto_accept_allowed');
  if (typeof review.execution_authorized !== 'boolean') invalid.push('proposalReceipt.review.execution_authorized');

  for (const field of REQUIRED_ROLLBACK_FIELDS) {
    if (typeof rollback[field] !== 'boolean') invalid.push(`proposalReceipt.rollback.${field}`);
  }

  if (!ALLOWED_DISCLOSURE_LEVELS.includes(output.disclosure_level)) {
    invalid.push('proposalReceipt.output.disclosure_level');
  }
  for (const field of REQUIRED_OUTPUT_FIELDS.filter(field => field !== 'disclosure_level')) {
    if (typeof output[field] !== 'boolean') invalid.push(`proposalReceipt.output.${field}`);
  }

  for (const field of REQUIRED_POLICY_FIELDS) {
    if (typeof policy[field] !== 'boolean') invalid.push(`proposalReceipt.policy.${field}`);
  }

  for (const field of REQUIRED_REDACTION_FIELDS) {
    if (typeof redaction[field] !== 'boolean') invalid.push(`redaction.${field}`);
  }

  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }

  return invalid;
}

function computeDecision(input) {
  const sourceEnvelope = input.sourceEnvelope;
  const receipt = input.proposalReceipt;
  const scope = receipt.scope;
  const intent = receipt.intent;
  const review = receipt.review;
  const rollback = receipt.rollback;
  const output = receipt.output;
  const policy = receipt.policy;
  const redaction = input.redaction;

  if (
    sourceEnvelope.envelope_decision === 'stop_l4' ||
    sourceEnvelope.proposal_generation_performed ||
    sourceEnvelope.proposal_submission_performed ||
    sourceEnvelope.memory_write_performed ||
    sourceEnvelope.durable_write_performed ||
    intent.proposal_generation_requested ||
    intent.proposal_submission_requested ||
    intent.direct_write_requested ||
    intent.durable_write_requested ||
    intent.update_requested ||
    intent.supersede_requested ||
    intent.tombstone_requested ||
    intent.irreversible_delete_requested ||
    review.auto_accept_allowed ||
    review.execution_authorized ||
    rollback.rollback_execution_requested ||
    output.raw_private_output_allowed ||
    output.approval_line_value_disclosed ||
    output.readiness_claim_allowed ||
    policy.memory_write_allowed ||
    policy.durable_write_allowed ||
    policy.provider_api_allowed ||
    policy.public_mcp_expansion_allowed ||
    policy.raw_private_payload_allowed ||
    redaction.raw_private_payload_disclosed ||
    redaction.secret_values_disclosed ||
    redaction.approval_line_value_disclosed
  ) {
    return 'stop_l4';
  }

  if (
    !sourceEnvelope.envelope_validated ||
    sourceEnvelope.envelope_decision === 'deny' ||
    !scope.scope_id_present ||
    !scope.client_scope_present ||
    !scope.visibility_present ||
    !scope.operation_scope_present ||
    !intent.redacted_intent_present ||
    !intent.mutation_intent_shape_only ||
    !review.accept_reject_status_present ||
    !rollback.rollback_posture_present ||
    !rollback.rollback_plan_shape_only ||
    !output.redacted_output_present ||
    !redaction.low_disclosure ||
    !redaction.values_redacted ||
    !redaction.field_names_only_on_rejection ||
    !redaction.safe_fixture_ids_only
  ) {
    return 'receipt_shape_reject';
  }

  return 'receipt_shape_accept';
}

function validateVcpMemoryTrustedWriteProposalReceiptShapeContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_ENVELOPE_FIELDS, input.sourceEnvelope, 'sourceEnvelope'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.proposalReceipt, 'proposalReceipt'),
    ...missingFields(REQUIRED_SCOPE_FIELDS, input.proposalReceipt?.scope, 'proposalReceipt.scope'),
    ...missingFields(REQUIRED_INTENT_FIELDS, input.proposalReceipt?.intent, 'proposalReceipt.intent'),
    ...missingFields(REQUIRED_REVIEW_FIELDS, input.proposalReceipt?.review, 'proposalReceipt.review'),
    ...missingFields(REQUIRED_ROLLBACK_FIELDS, input.proposalReceipt?.rollback, 'proposalReceipt.rollback'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.proposalReceipt?.output, 'proposalReceipt.output'),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.proposalReceipt?.policy, 'proposalReceipt.policy'),
    ...missingFields(REQUIRED_REDACTION_FIELDS, input.redaction, 'redaction'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_receipt_or_overclaim_fields', input, { forbiddenFields });
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
    return rejected('invalid_trusted_write_proposal_receipt_shape_contract', input, { invalidFields });
  }

  const computedDecision = computeDecision(input);
  if (input.expectedDecision !== computedDecision || input.proposalReceipt.decision !== computedDecision) {
    return rejected('decision_mismatch', input, {
      computedDecision,
      invalidFields: ['expectedDecision', 'proposalReceipt.decision']
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    receiptId: input.proposalReceipt.receipt_id,
    sourceEnvelopeId: input.sourceEnvelope.envelope_id,
    profile: input.proposalReceipt.profile,
    decision: computedDecision,
    proposalReviewStatus: input.proposalReceipt.review.proposal_review_status,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_trusted_write_proposal_receipt_shape_validated_no_runtime',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_ENVELOPE_DECISIONS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_PROFILES,
  ALLOWED_PROPOSAL_REVIEW_STATUS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_INTENT_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_REDACTION_FIELDS,
  REQUIRED_REVIEW_FIELDS,
  REQUIRED_ROLLBACK_FIELDS,
  REQUIRED_SCOPE_FIELDS,
  REQUIRED_SOURCE_ENVELOPE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalReceiptShapeContract
};
