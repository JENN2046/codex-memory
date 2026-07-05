'use strict';

const CONTRACT_NAME = 'VcpMemoryGovernedMutationProposalModeContract';
const CONTRACT_MODE = 'local_governed_mutation_proposal_mode_contract_only';
const SCHEMA_VERSION = 1;

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'local-contract-only'
]);

const ALLOWED_PROFILES = Object.freeze([
  'governed-mutation-proposal'
]);

const ALLOWED_REVIEW_DECISIONS = Object.freeze([
  'accept',
  'reject'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'proposal_mode_accept',
  'proposal_mode_reject',
  'proposal_mode_deny',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'evidenceType',
  'profile',
  'entryEvidence',
  'boundary',
  'proposalEnvelope',
  'review',
  'audit',
  'expectedDecision',
  'counters'
]);

const REQUIRED_ENTRY_EVIDENCE_FIELDS = Object.freeze([
  'm8TrustedFullReadWorkflowEvidenceAccepted',
  'mutationProposalEnvelopeSpecified',
  'l4WriteIntentShieldTested'
]);

const REQUIRED_BOUNDARY_FIELDS = Object.freeze([
  'targetReferenceCategory',
  'clientScopeCategory',
  'visibilityCategory',
  'operationFamily',
  'proposalOnly',
  'directWriteRequested',
  'durableWriteRequested',
  'updateRequested',
  'supersedeRequested',
  'tombstoneRequested',
  'irreversibleDeleteRequested',
  'memoryWriteAllowed',
  'durableWriteAllowed',
  'providerApiAllowed',
  'publicMcpExpansionAllowed'
]);

const REQUIRED_PROPOSAL_ENVELOPE_FIELDS = Object.freeze([
  'scopeCategory',
  'intentCategory',
  'diffCategory',
  'rollbackPostureCategory',
  'payloadShapeOnly',
  'rawValuesIncluded'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'generateProposal',
  'reviewDecision',
  'autoAccept',
  'executionAuthorized'
]);

const REQUIRED_AUDIT_FIELDS = Object.freeze([
  'auditReceiptRequested',
  'lowDisclosureReceipt',
  'rawPayloadIncluded'
]);

const PROPOSAL_COUNTER_FIELDS = Object.freeze([
  'proposalsGenerated',
  'proposalAcceptances',
  'proposalRejections',
  'proposalReceiptsAudited'
]);

const ZERO_SIDE_EFFECT_COUNTER_FIELDS = Object.freeze([
  'proposalSubmissions',
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

const REQUIRED_COUNTER_FIELDS = Object.freeze([
  ...PROPOSAL_COUNTER_FIELDS,
  ...ZERO_SIDE_EFFECT_COUNTER_FIELDS
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
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawError',
  'raw_error',
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
  'locator',
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
    ...collectUnexpectedKeys(input.entryEvidence, REQUIRED_ENTRY_EVIDENCE_FIELDS, 'entryEvidence'),
    ...collectUnexpectedKeys(input.boundary, REQUIRED_BOUNDARY_FIELDS, 'boundary'),
    ...collectUnexpectedKeys(input.proposalEnvelope, REQUIRED_PROPOSAL_ENVELOPE_FIELDS, 'proposalEnvelope'),
    ...collectUnexpectedKeys(input.review, REQUIRED_REVIEW_FIELDS, 'review'),
    ...collectUnexpectedKeys(input.audit, REQUIRED_AUDIT_FIELDS, 'audit'),
    ...collectUnexpectedKeys(input.counters, REQUIRED_COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return REQUIRED_COUNTER_FIELDS;
  return REQUIRED_COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function zeroSideEffectCounterViolations(counters) {
  if (!isPlainObject(counters)) return ZERO_SIDE_EFFECT_COUNTER_FIELDS;
  return ZERO_SIDE_EFFECT_COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function computeDecision(input) {
  const entry = input.entryEvidence;
  const boundary = input.boundary;
  const proposal = input.proposalEnvelope;
  const review = input.review;
  const audit = input.audit;
  const counters = input.counters;

  if (
    boundary.proposalOnly !== true ||
    boundary.directWriteRequested !== false ||
    boundary.durableWriteRequested !== false ||
    boundary.updateRequested !== false ||
    boundary.supersedeRequested !== false ||
    boundary.tombstoneRequested !== false ||
    boundary.irreversibleDeleteRequested !== false ||
    boundary.memoryWriteAllowed !== false ||
    boundary.durableWriteAllowed !== false ||
    boundary.providerApiAllowed !== false ||
    boundary.publicMcpExpansionAllowed !== false ||
    review.autoAccept !== false ||
    review.executionAuthorized !== false ||
    proposal.rawValuesIncluded !== false ||
    audit.rawPayloadIncluded !== false ||
    zeroSideEffectCounterViolations(counters).length > 0
  ) {
    return 'stop_l4';
  }

  if (
    entry.m8TrustedFullReadWorkflowEvidenceAccepted !== true ||
    entry.mutationProposalEnvelopeSpecified !== true ||
    entry.l4WriteIntentShieldTested !== true ||
    proposal.payloadShapeOnly !== true ||
    review.generateProposal !== true ||
    audit.auditReceiptRequested !== true ||
    audit.lowDisclosureReceipt !== true ||
    !ALLOWED_REVIEW_DECISIONS.includes(review.reviewDecision)
  ) {
    return 'proposal_mode_deny';
  }

  if (
    counters.proposalsGenerated !== 1 ||
    counters.proposalReceiptsAudited !== 1 ||
    counters.proposalAcceptances + counters.proposalRejections !== 1
  ) {
    return 'proposal_mode_deny';
  }

  if (review.reviewDecision === 'accept' && counters.proposalAcceptances === 1 && counters.proposalRejections === 0) {
    return 'proposal_mode_accept';
  }

  if (review.reviewDecision === 'reject' && counters.proposalAcceptances === 0 && counters.proposalRejections === 1) {
    return 'proposal_mode_reject';
  }

  return 'proposal_mode_deny';
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    proposalGenerated: false,
    proposalSubmitted: false,
    auditReceiptGenerated: false,
    memoryRead: false,
    memoryWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function validateVcpMemoryGovernedMutationProposalModeContract(input) {
  if (!isPlainObject(input)) {
    return failure('invalid_input');
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_ENTRY_EVIDENCE_FIELDS, input.entryEvidence, 'entryEvidence'),
    ...missingFields(REQUIRED_BOUNDARY_FIELDS, input.boundary, 'boundary'),
    ...missingFields(REQUIRED_PROPOSAL_ENVELOPE_FIELDS, input.proposalEnvelope, 'proposalEnvelope'),
    ...missingFields(REQUIRED_REVIEW_FIELDS, input.review, 'review'),
    ...missingFields(REQUIRED_AUDIT_FIELDS, input.audit, 'audit'),
    ...missingFields(REQUIRED_COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) {
    return failure('missing_required_fields', { missingFields: missing });
  }

  const unexpected = collectUnexpectedFields(input);
  if (unexpected.length > 0) {
    return failure('unexpected_fields', { unexpectedFields: unexpected });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) {
    return failure('invalid_schema_version');
  }

  if (!/^CM-[0-9]{4}$/.test(input.taskId)) {
    return failure('invalid_task_id');
  }

  if (!ALLOWED_EVIDENCE_TYPES.includes(input.evidenceType)) {
    return failure('invalid_evidence_type');
  }

  if (!ALLOWED_PROFILES.includes(input.profile)) {
    return failure('invalid_profile');
  }

  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) {
    return failure('invalid_expected_decision');
  }

  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length > 0) {
    return failure('invalid_counters', { invalidCounterFields });
  }

  const computedDecision = computeDecision(input);
  if (computedDecision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision
    });
  }

  const proposalGenerated = computedDecision === 'proposal_mode_accept' || computedDecision === 'proposal_mode_reject';
  const proposalReviewStatus = computedDecision === 'proposal_mode_accept'
    ? 'accepted'
    : computedDecision === 'proposal_mode_reject'
      ? 'rejected'
      : 'not_accepted';

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computedDecision,
    profile: input.profile,
    evidenceType: input.evidenceType,
    proposalGenerated,
    proposalSubmitted: false,
    proposalReviewStatus,
    auditReceiptGenerated: proposalGenerated,
    proposalReceiptAccepted: computedDecision === 'proposal_mode_accept',
    proposalReceiptRejected: computedDecision === 'proposal_mode_reject',
    lowDisclosureReceipt: {
      taskId: input.taskId,
      phase: 'M9',
      proposalMode: 'governed_mutation_proposal_mode',
      decision: computedDecision,
      reviewStatus: proposalReviewStatus,
      targetReferenceCategory: input.boundary.targetReferenceCategory,
      clientScopeCategory: input.boundary.clientScopeCategory,
      visibilityCategory: input.boundary.visibilityCategory,
      operationFamily: input.boundary.operationFamily,
      scopeCategory: input.proposalEnvelope.scopeCategory,
      intentCategory: input.proposalEnvelope.intentCategory,
      diffCategory: input.proposalEnvelope.diffCategory,
      rollbackPostureCategory: input.proposalEnvelope.rollbackPostureCategory,
      lowDisclosure: true,
      rawValuesIncluded: false,
      memoryWritten: false,
      durableWrite: false,
      readinessClaimed: false
    },
    counters: {
      proposalsGenerated: input.counters.proposalsGenerated,
      proposalAcceptances: input.counters.proposalAcceptances,
      proposalRejections: input.counters.proposalRejections,
      proposalReceiptsAudited: input.counters.proposalReceiptsAudited,
      sideEffectCounterViolations: 0
    },
    memoryRead: false,
    memoryWritten: false,
    memoryUpdated: false,
    memorySuperseded: false,
    memoryTombstoned: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    runtimeWiringExecuted: false,
    approvalLineGenerated: false,
    approvalRequestSubmitted: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_PROFILES,
  ALLOWED_REVIEW_DECISIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  PROPOSAL_COUNTER_FIELDS,
  REQUIRED_AUDIT_FIELDS,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_COUNTER_FIELDS,
  REQUIRED_ENTRY_EVIDENCE_FIELDS,
  REQUIRED_PROPOSAL_ENVELOPE_FIELDS,
  REQUIRED_REVIEW_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_SIDE_EFFECT_COUNTER_FIELDS,
  validateVcpMemoryGovernedMutationProposalModeContract
};
