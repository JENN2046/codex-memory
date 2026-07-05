'use strict';

const CONTRACT_NAME = 'VcpMemoryM10ExactWriteBoundaryGateContract';
const CONTRACT_MODE = 'local_m10_exact_write_boundary_gate_contract_only';
const SCHEMA_VERSION = 1;

const ALLOWED_DECISIONS = Object.freeze([
  'm10_blocked_missing_exact_write_boundary',
  'm10_incomplete_missing_m9_proposal_mode',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'local-contract-only'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'evidenceType',
  'evidence',
  'm10Gate',
  'authorization',
  'output',
  'expectedDecision',
  'counters'
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  'cm1966M9ProposalModeContractPassed',
  'proposalGeneratedWithoutDurableWrite',
  'proposalAcceptedWithoutDurableWrite',
  'proposalRejectedWithoutDurableWrite',
  'proposalAuditedWithoutDurableWrite',
  'rollbackPostureAndScopeReceiptShapePresent'
]);

const REQUIRED_M10_GATE_FIELDS = Object.freeze([
  'exactWriteBoundaryPresent',
  'targetBound',
  'clientIdBound',
  'scopeBound',
  'visibilityBound',
  'rollbackPostureBound',
  'auditReceiptPlanBound',
  'mutationFamilySelected',
  'writeExecutionAllowed',
  'updateExecutionAllowed',
  'supersedeExecutionAllowed',
  'tombstoneExecutionAllowed',
  'm10GateBlocked',
  'missingExactWriteBoundaryDeclared',
  'm10Unlocked',
  'm15Unlocked'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'runtimeExecutionAuthorized',
  'memoryReadAuthorized',
  'memoryWriteAuthorized',
  'durableWriteAuthorized',
  'providerApiAuthorized',
  'publicMcpExpansionAuthorized',
  'approvalRequestSubmissionAllowed',
  'approvalLineGenerationAllowed',
  'writeExecutionAuthorized',
  'updateExecutionAuthorized',
  'supersedeExecutionAuthorized',
  'tombstoneExecutionAuthorized',
  'readinessClaimAuthorized'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'disclosureLevel',
  'lowDisclosureReceiptOnly',
  'rawPrivateOutputAllowed',
  'concreteValuesDisclosed',
  'requestBodyDisclosed',
  'approvalLineValueDisclosed',
  'readinessClaimAllowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'requestBodiesPrepared',
  'requestSubmissions',
  'approvalLineOperations',
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
  'locator',
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
    ...collectUnexpectedKeys(input.m10Gate, REQUIRED_M10_GATE_FIELDS, 'm10Gate'),
    ...collectUnexpectedKeys(input.authorization, REQUIRED_AUTHORIZATION_FIELDS, 'authorization'),
    ...collectUnexpectedKeys(input.output, REQUIRED_OUTPUT_FIELDS, 'output'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function allValuesFalse(value, fields) {
  return fields.every(field => value[field] === false);
}

function evidenceComplete(evidence) {
  return REQUIRED_EVIDENCE_FIELDS.every(field => evidence[field] === true);
}

function computeDecision(input) {
  const evidence = input.evidence;
  const gate = input.m10Gate;
  const authorization = input.authorization;
  const output = input.output;

  if (
    gate.exactWriteBoundaryPresent !== false ||
    gate.writeExecutionAllowed !== false ||
    gate.updateExecutionAllowed !== false ||
    gate.supersedeExecutionAllowed !== false ||
    gate.tombstoneExecutionAllowed !== false ||
    gate.m10Unlocked !== false ||
    gate.m15Unlocked !== false ||
    !allValuesFalse(authorization, REQUIRED_AUTHORIZATION_FIELDS) ||
    output.rawPrivateOutputAllowed !== false ||
    output.concreteValuesDisclosed !== false ||
    output.requestBodyDisclosed !== false ||
    output.approvalLineValueDisclosed !== false ||
    output.readinessClaimAllowed !== false ||
    nonZeroCounters(input.counters).length > 0
  ) {
    return 'stop_l4';
  }

  if (!evidenceComplete(evidence)) {
    return 'm10_incomplete_missing_m9_proposal_mode';
  }

  if (
    gate.targetBound !== false ||
    gate.clientIdBound !== false ||
    gate.scopeBound !== false ||
    gate.visibilityBound !== false ||
    gate.rollbackPostureBound !== false ||
    gate.auditReceiptPlanBound !== false ||
    gate.mutationFamilySelected !== false ||
    gate.m10GateBlocked !== true ||
    gate.missingExactWriteBoundaryDeclared !== true ||
    output.lowDisclosureReceiptOnly !== true
  ) {
    return 'm10_incomplete_missing_m9_proposal_mode';
  }

  return 'm10_blocked_missing_exact_write_boundary';
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    m10GateMayOpen: false,
    m10GateBlocked: true,
    m10Unlocked: false,
    m15Unlocked: false,
    memoryRead: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function validateVcpMemoryM10ExactWriteBoundaryGateContract(input) {
  if (!isPlainObject(input)) {
    return failure('invalid_input');
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_m10_or_readiness_fields', {
      forbiddenFields
    });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_EVIDENCE_FIELDS, input.evidence, 'evidence'),
    ...missingFields(REQUIRED_M10_GATE_FIELDS, input.m10Gate, 'm10Gate'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.authorization, 'authorization'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters')
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

  const gateBlocked = computedDecision === 'm10_blocked_missing_exact_write_boundary';

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computedDecision,
    evidenceType: input.evidenceType,
    m9LocalProposalModeEvidenceAccepted: gateBlocked,
    m10GateMayOpen: false,
    m10GateBlocked: true,
    m10GateBlockReason: gateBlocked
      ? 'missing_exact_write_boundary'
      : 'missing_m9_local_proposal_mode_evidence',
    exactWriteBoundaryPresent: false,
    exactWriteBoundaryRequired: true,
    m10Unlocked: false,
    m15Unlocked: false,
    lowDisclosureGateReceipt: {
      taskId: input.taskId,
      phase: 'M10',
      decision: computedDecision,
      m9ProposalModeLocalContractPassed: gateBlocked,
      exactWriteBoundaryPresent: false,
      writeUpdateSupersedeTombstoneExecutionAllowed: false,
      lowDisclosureReceiptOnly: input.output.lowDisclosureReceiptOnly,
      durableWritePerformed: false,
      memoryWritten: false,
      readinessClaimed: false
    },
    memoryRead: false,
    memoryWritten: false,
    memoryUpdated: false,
    memorySuperseded: false,
    memoryTombstoned: false,
    durableAuditWritten: false,
    durableWritePerformed: false,
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
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_M10_GATE_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryM10ExactWriteBoundaryGateContract
};
