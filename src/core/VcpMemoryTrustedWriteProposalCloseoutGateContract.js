'use strict';

const CONTRACT_NAME = 'VcpMemoryTrustedWriteProposalCloseoutGateContract';
const CONTRACT_MODE = 'fixture_trusted_write_proposal_closeout_gate_contract_only';
const SCHEMA_VERSION = 1;

const ALLOWED_DECISIONS = Object.freeze([
  'fixture_preparation_closed_m9_blocked',
  'fixture_preparation_incomplete',
  'stop_l4'
]);

const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1824_fixture_contract',
  'stop_or_supply_exact_proposal_boundary'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'evidence',
  'blockers',
  'expectedDecision',
  'nextActionAllowed',
  'counters'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'm8TrustedFullReadAcceptedForPlanning',
  'cm1821EnvelopeFixtureContractAccepted',
  'cm1822ReceiptShapeFixtureContractAccepted',
  'cm1823GateReviewAccepted',
  'localFixtureContractPreparationSliceClosed',
  'm9ProposalModePassed',
  'm9CompletionClaimed',
  'm10Unlocked',
  'm15Unlocked'
]);

const REQUIRED_BLOCKER_FIELDS = Object.freeze([
  'exactTrustedWriteProposalBoundaryPresent',
  'generatedProposalPresent',
  'reviewRouteAcceptedReceiptPresent',
  'realProposalAuditReceiptPresent',
  'l4WriteIntentWorkflowEvidencePresent',
  'runtimeExecutionAuthorized',
  'durableWriteAuthorized'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'mcpToolCalls',
  'memoryReads',
  'memoryWrites',
  'durableWrites',
  'proposalGenerations',
  'proposalSubmissions',
  'acceptedRealProposalReceipts',
  'providerApiCalls',
  'publicMcpExpansions',
  'approvalRequestSubmissions',
  'approvalLineOperations',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawPrivatePayload',
  'raw_private_payload',
  'rawOutput',
  'raw_output',
  'rawProposalPayload',
  'raw_proposal_payload',
  'proposalPayload',
  'proposal_payload',
  'proposalContent',
  'proposal_content',
  'memoryContent',
  'memory_content',
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
  'configEnvPath',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'rawAuditRow',
  'rawJsonlRow',
  'rawRuntimePayload',
  'rawStorePayload',
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
    ...collectUnexpectedKeys(input.evidence, REQUIRED_EVIDENCE_FIELDS, 'evidence'),
    ...collectUnexpectedKeys(input.blockers, REQUIRED_BLOCKER_FIELDS, 'blockers'),
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

function lowDisclosureProjection(input) {
  const evidence = isPlainObject(input) ? input.evidence : null;
  return {
    expectedDecision: safeExpectedDecision(input),
    m8TrustedFullReadAcceptedForPlanning: isPlainObject(evidence)
      ? evidence.m8TrustedFullReadAcceptedForPlanning === true
      : false,
    cm1821EnvelopeFixtureContractAccepted: isPlainObject(evidence)
      ? evidence.cm1821EnvelopeFixtureContractAccepted === true
      : false,
    cm1822ReceiptShapeFixtureContractAccepted: isPlainObject(evidence)
      ? evidence.cm1822ReceiptShapeFixtureContractAccepted === true
      : false,
    cm1823GateReviewAccepted: isPlainObject(evidence)
      ? evidence.cm1823GateReviewAccepted === true
      : false,
    localFixtureContractPreparationSliceClosed: isPlainObject(evidence)
      ? evidence.localFixtureContractPreparationSliceClosed === true
      : false
  };
}

function sideEffectPosture(computedDecision = null) {
  return {
    fixtureTrustedWriteProposalCloseoutGateOnly: true,
    localFixtureContractPreparationSliceClosed:
      computedDecision === 'fixture_preparation_closed_m9_blocked',
    m9ProposalModePassed: false,
    m9CompletionClaimed: false,
    m10Unlocked: false,
    m15Unlocked: false,
    runtimeWiringExecuted: false,
    proposalGenerated: false,
    proposalSubmitted: false,
    realProposalReceiptAccepted: false,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableWritePerformed: false,
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
  const invalid = [];
  const evidence = input.evidence;
  const blockers = input.blockers;

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (!ALLOWED_NEXT_ACTIONS.includes(input.nextActionAllowed)) invalid.push('nextActionAllowed');

  for (const field of REQUIRED_EVIDENCE_FIELDS) {
    if (typeof evidence[field] !== 'boolean') invalid.push(`evidence.${field}`);
  }
  for (const field of REQUIRED_BLOCKER_FIELDS) {
    if (typeof blockers[field] !== 'boolean') invalid.push(`blockers.${field}`);
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }

  return invalid;
}

function computeDecision(input) {
  const evidence = input.evidence;
  const blockers = input.blockers;

  if (
    evidence.m9ProposalModePassed ||
    evidence.m9CompletionClaimed ||
    evidence.m10Unlocked ||
    evidence.m15Unlocked ||
    Object.values(blockers).some(value => value === true)
  ) {
    return 'stop_l4';
  }

  if (
    !evidence.m8TrustedFullReadAcceptedForPlanning ||
    !evidence.cm1821EnvelopeFixtureContractAccepted ||
    !evidence.cm1822ReceiptShapeFixtureContractAccepted ||
    !evidence.cm1823GateReviewAccepted ||
    !evidence.localFixtureContractPreparationSliceClosed
  ) {
    return 'fixture_preparation_incomplete';
  }

  return 'fixture_preparation_closed_m9_blocked';
}

function validateVcpMemoryTrustedWriteProposalCloseoutGateContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_BLOCKER_FIELDS, input.blockers, 'blockers'),
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
    return rejected('invalid_trusted_write_proposal_closeout_gate_contract', input, { invalidFields });
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
    decision: computedDecision,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    unexpectedFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_closeout_gate_validated_no_runtime',
    ...sideEffectPosture(computedDecision)
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_BLOCKER_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalCloseoutGateContract
};
