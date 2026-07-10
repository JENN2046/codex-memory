'use strict';

const {
  CONTRACT_MODE: PHASE2_CONTRACT_MODE,
  CONTRACT_NAME: PHASE2_CONTRACT_NAME,
  PHASE2_EXACT_RECEIPT_FIELDS,
  PHASE2_REQUIREMENT_ID
} = require('./Phase2ExactReceiptRequestBoundaryContract');
const {
  CONTRACT_MODE: PHASE8_CONTRACT_MODE,
  CONTRACT_NAME: PHASE8_CONTRACT_NAME,
  PHASE8_EXACT_RECEIPT_FIELDS,
  PHASE8_REQUIREMENT_ID
} = require('./Phase8ExactReceiptRequestBoundaryContract');
const {
  CONTRACT_MODE: EXTERNAL_REVIEW_CONTRACT_MODE,
  CONTRACT_NAME: EXTERNAL_REVIEW_CONTRACT_NAME,
  REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS
} = require('./PlanPackExternalReviewRequestBoundaryContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceRequestPacketContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_request_packet_only';
const SCHEMA_VERSION = 1;

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  'sourceTaskId',
  'sourceValidationId',
  'sourceReport',
  'sourceContractName',
  'sourceContractMode'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'phase2Source',
  'phase8Source',
  'externalReviewSource',
  'phase2RequestResult',
  'phase8RequestResult',
  'externalReviewRequestResult',
  'packetBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_REQUEST_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'requestBoundaryPrepared',
  'fullPlanPackCompleted',
  'readinessClaimed',
  'runtimeCalled',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed'
]);

const REQUIRED_PHASE2_FIELDS = Object.freeze([
  ...REQUIRED_REQUEST_RESULT_FIELDS,
  'phaseId',
  'requestedReceiptEvidenceFields',
  'futureReceiptRequests',
  'routeSourceTaskId',
  'routeSourceValidationId',
  'receiptAcceptedByThisContract',
  'receiptAppliedByThisContract',
  'currentPhase2Completed',
  'nativeReadExecuted'
]);

const REQUIRED_PHASE8_FIELDS = Object.freeze([
  ...REQUIRED_REQUEST_RESULT_FIELDS,
  'phaseId',
  'requestedReceiptEvidenceFields',
  'futureReceiptRequests',
  'routeSourceTaskId',
  'routeSourceValidationId',
  'receiptAcceptedByThisContract',
  'receiptAppliedByThisContract',
  'currentPhase8Completed',
  'productionWriteProven',
  'realRootDurableWriteProven',
  'verifyWriteExecuted',
  'rollbackDrillExecuted',
  'failureRecoveryExecuted'
]);

const REQUIRED_EXTERNAL_REVIEW_FIELDS = Object.freeze([
  ...REQUIRED_REQUEST_RESULT_FIELDS,
  'requestedReviewEvidenceFields',
  'futureReviewRequests',
  'routeSourceTaskId',
  'routeSourceValidationId',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'reviewAppliedByThisContract',
  'completionAuditPatchApplied',
  'currentPhase9Completed',
  'currentPhase10Completed',
  'defaultRuntimeExpanded',
  'nativeReadExecuted',
  'tagPushed'
]);

const REQUIRED_PACKET_BOUNDARY_FIELDS = Object.freeze([
  'packetPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'sourceRequestBoundariesOnly',
  'separateJennApprovalRequired',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceAppliedByThisContract',
  'completionAuditPatchApplied',
  'runtimeCalled',
  'nativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'defaultRuntimeExpanded',
  'tagCreated',
  'tagPushed',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'phase2CompletionClaimed',
  'phase8CompletionClaimed',
  'phase9CompletionClaimed',
  'phase10CompletionClaimed',
  'fullPlanPackCompletionClaimed',
  'readinessClaimed'
]);

const COUNTER_FIELDS = Object.freeze([
  'approvalAcceptances',
  'receiptAcceptances',
  'reviewAcceptances',
  'tagApprovalAcceptances',
  'evidenceApplications',
  'completionAuditPatchApplications',
  'runtimeCalls',
  'nativeReadAttempts',
  'nativeWriteAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'durableMutations',
  'publicMcpExpansions',
  'defaultRuntimeExpansions',
  'tagCreateActions',
  'tagPushActions',
  'releasePublishActions',
  'deployActions',
  'cutoverActions',
  'readinessClaims'
]);

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-request-packet']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_request_packet_prepared',
  'plan_pack_evidence_request_packet_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'queryText',
  'query_text',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawRequest',
  'rawResponse',
  'rawOutput',
  'rawMemory',
  'memoryContent',
  'rawAudit',
  'rawJsonlRow',
  'rawSqliteRow',
  'receiptBody',
  'receiptContent',
  'receiptValue',
  'reviewTranscript',
  'reviewBody',
  'reviewContent',
  'reviewerIdentity',
  'tagApprovalLine',
  'tagApprovalValue',
  'approvalValue',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'credential',
  'approvalLine',
  'approvalLineValue',
  'providerPayload',
  'runtimeCommand',
  'commandText',
  'stdout',
  'stderr',
  'environment',
  'processDetails',
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

const PACKET_STOP_TRUE_FIELDS = Object.freeze(REQUIRED_PACKET_BOUNDARY_FIELDS
  .filter(field => ![
    'packetPrepared',
    'lowDisclosureOnly',
    'categoryOnly',
    'sourceRequestBoundariesOnly',
    'separateJennApprovalRequired'
  ].includes(field))
  .map(field => ['packetBoundary', field]));

const RESULT_STOP_TRUE_FIELDS = Object.freeze([
  ['fullPlanPackCompleted'],
  ['readinessClaimed'],
  ['runtimeCalled'],
  ['nativeReadExecuted'],
  ['nativeWriteExecuted'],
  ['durableMutationPerformed'],
  ['providerApiCalled'],
  ['publicMcpExpanded'],
  ['tagCreated'],
  ['releasePublished'],
  ['deploymentTriggered'],
  ['cutoverPerformed'],
  ['receiptAcceptedByThisContract'],
  ['receiptAppliedByThisContract'],
  ['reviewAcceptedByThisContract'],
  ['tagApprovalAcceptedByThisContract'],
  ['reviewAppliedByThisContract'],
  ['completionAuditPatchApplied'],
  ['currentPhase2Completed'],
  ['currentPhase8Completed'],
  ['currentPhase9Completed'],
  ['currentPhase10Completed'],
  ['defaultRuntimeExpanded'],
  ['tagPushed']
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => pathJoin(prefix, field));
}

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
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

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function enabledStopFields(input) {
  const packetStops = PACKET_STOP_TRUE_FIELDS
    .filter(([section, field]) => input[section][field] === true)
    .map(([section, field]) => `${section}.${field}`);

  const resultStops = [
    ['phase2RequestResult', input.phase2RequestResult],
    ['phase8RequestResult', input.phase8RequestResult],
    ['externalReviewRequestResult', input.externalReviewRequestResult]
  ].flatMap(([prefix, result]) => RESULT_STOP_TRUE_FIELDS
    .filter(([field]) => result[field] === true)
    .map(([field]) => `${prefix}.${field}`));

  return [...packetStops, ...resultStops];
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.phase2Source, REQUIRED_SOURCE_FIELDS, 'phase2Source'),
    ...collectUnexpectedKeys(input.phase8Source, REQUIRED_SOURCE_FIELDS, 'phase8Source'),
    ...collectUnexpectedKeys(input.externalReviewSource, REQUIRED_SOURCE_FIELDS, 'externalReviewSource'),
    ...collectUnexpectedKeys(input.phase2RequestResult, REQUIRED_PHASE2_FIELDS, 'phase2RequestResult'),
    ...collectUnexpectedKeys(input.phase8RequestResult, REQUIRED_PHASE8_FIELDS, 'phase8RequestResult'),
    ...collectUnexpectedKeys(
      input.externalReviewRequestResult,
      REQUIRED_EXTERNAL_REVIEW_FIELDS,
      'externalReviewRequestResult'
    ),
    ...collectUnexpectedKeys(input.packetBoundary, REQUIRED_PACKET_BOUNDARY_FIELDS, 'packetBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source, expected, prefix) {
  const blockers = [];
  for (const [field, value] of Object.entries(expected)) {
    if (source[field] !== value) blockers.push(`${prefix}.${field}`);
  }
  return blockers;
}

function fieldsEqual(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((field, index) => field === expected[index]);
}

function reviewKeysEqual(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((item, index) =>
      isPlainObject(item) &&
      item.scope === expected[index].scope &&
      item.requirementId === expected[index].requirementId &&
      item.evidenceField === expected[index].evidenceField);
}

function validatePhase2Result(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('phase2RequestResult.accepted');
  if (result.contractName !== PHASE2_CONTRACT_NAME) blockers.push('phase2RequestResult.contractName');
  if (result.contractMode !== PHASE2_CONTRACT_MODE) blockers.push('phase2RequestResult.contractMode');
  if (result.decision !== 'phase2_exact_receipt_request_boundary_prepared') {
    blockers.push('phase2RequestResult.decision');
  }
  if (result.requestBoundaryPrepared !== true) blockers.push('phase2RequestResult.requestBoundaryPrepared');
  if (result.phaseId !== PHASE2_REQUIREMENT_ID) blockers.push('phase2RequestResult.phaseId');
  if (!fieldsEqual(result.requestedReceiptEvidenceFields, PHASE2_EXACT_RECEIPT_FIELDS)) {
    blockers.push('phase2RequestResult.requestedReceiptEvidenceFields');
  }
  if (!Array.isArray(result.futureReceiptRequests) ||
    result.futureReceiptRequests.length !== PHASE2_EXACT_RECEIPT_FIELDS.length) {
    blockers.push('phase2RequestResult.futureReceiptRequests');
  }
  return blockers;
}

function validatePhase8Result(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('phase8RequestResult.accepted');
  if (result.contractName !== PHASE8_CONTRACT_NAME) blockers.push('phase8RequestResult.contractName');
  if (result.contractMode !== PHASE8_CONTRACT_MODE) blockers.push('phase8RequestResult.contractMode');
  if (result.decision !== 'phase8_exact_receipt_request_boundary_prepared') {
    blockers.push('phase8RequestResult.decision');
  }
  if (result.requestBoundaryPrepared !== true) blockers.push('phase8RequestResult.requestBoundaryPrepared');
  if (result.phaseId !== PHASE8_REQUIREMENT_ID) blockers.push('phase8RequestResult.phaseId');
  if (!fieldsEqual(result.requestedReceiptEvidenceFields, PHASE8_EXACT_RECEIPT_FIELDS)) {
    blockers.push('phase8RequestResult.requestedReceiptEvidenceFields');
  }
  if (!Array.isArray(result.futureReceiptRequests) ||
    result.futureReceiptRequests.length !== PHASE8_EXACT_RECEIPT_FIELDS.length) {
    blockers.push('phase8RequestResult.futureReceiptRequests');
  }
  return blockers;
}

function validateExternalReviewResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('externalReviewRequestResult.accepted');
  if (result.contractName !== EXTERNAL_REVIEW_CONTRACT_NAME) {
    blockers.push('externalReviewRequestResult.contractName');
  }
  if (result.contractMode !== EXTERNAL_REVIEW_CONTRACT_MODE) {
    blockers.push('externalReviewRequestResult.contractMode');
  }
  if (result.decision !== 'plan_pack_external_review_request_boundary_prepared') {
    blockers.push('externalReviewRequestResult.decision');
  }
  if (result.requestBoundaryPrepared !== true) {
    blockers.push('externalReviewRequestResult.requestBoundaryPrepared');
  }
  if (!reviewKeysEqual(result.requestedReviewEvidenceFields, REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS)) {
    blockers.push('externalReviewRequestResult.requestedReviewEvidenceFields');
  }
  if (!Array.isArray(result.futureReviewRequests) ||
    result.futureReviewRequests.length !== REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.length) {
    blockers.push('externalReviewRequestResult.futureReviewRequests');
  }
  return blockers;
}

function validatePacketBoundary(packetBoundary) {
  const requiredTrue = [
    'packetPrepared',
    'lowDisclosureOnly',
    'categoryOnly',
    'sourceRequestBoundariesOnly',
    'separateJennApprovalRequired'
  ];
  const requiredFalse = REQUIRED_PACKET_BOUNDARY_FIELDS.filter(field => !requiredTrue.includes(field));
  return [
    ...requiredTrue
      .filter(field => packetBoundary[field] !== true)
      .map(field => `packetBoundary.${field}`),
    ...requiredFalse
      .filter(field => packetBoundary[field] !== false)
      .map(field => `packetBoundary.${field}`)
  ];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.phase2Source, {
      sourceTaskId: 'CM-2054',
      sourceValidationId: 'CMV-2155',
      sourceReport: 'docs/near-model-memory-plan-pack/phase2_exact_receipt_request_boundary_report.md',
      sourceContractName: PHASE2_CONTRACT_NAME,
      sourceContractMode: PHASE2_CONTRACT_MODE
    }, 'phase2Source'),
    ...validateSource(input.phase8Source, {
      sourceTaskId: 'CM-2055',
      sourceValidationId: 'CMV-2156',
      sourceReport: 'docs/near-model-memory-plan-pack/phase8_exact_receipt_request_boundary_report.md',
      sourceContractName: PHASE8_CONTRACT_NAME,
      sourceContractMode: PHASE8_CONTRACT_MODE
    }, 'phase8Source'),
    ...validateSource(input.externalReviewSource, {
      sourceTaskId: 'CM-2056',
      sourceValidationId: 'CMV-2157',
      sourceReport: 'docs/near-model-memory-plan-pack/external_review_request_boundary_report.md',
      sourceContractName: EXTERNAL_REVIEW_CONTRACT_NAME,
      sourceContractMode: EXTERNAL_REVIEW_CONTRACT_MODE
    }, 'externalReviewSource'),
    ...validatePhase2Result(input.phase2RequestResult),
    ...validatePhase8Result(input.phase8RequestResult),
    ...validateExternalReviewResult(input.externalReviewRequestResult),
    ...validatePacketBoundary(input.packetBoundary)
  ];

  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_request_packet_blocked', blockers };
  }

  return { decision: 'plan_pack_evidence_request_packet_prepared', blockers: [] };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    requestPacketPrepared: false,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    evidenceAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    nativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    tagPushed: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    ...extras
  };
}

function buildRequestPacket(input) {
  return {
    schemaVersion: 'near_model_memory_plan_pack_evidence_request_packet_v1',
    packetKind: 'future_evidence_requests_only',
    lowDisclosureOnly: true,
    categoryOnly: true,
    separateJennApprovalRequired: true,
    sections: {
      phase2ExactReceiptRequests: input.phase2RequestResult.futureReceiptRequests,
      phase8ExactReceiptRequests: input.phase8RequestResult.futureReceiptRequests,
      phase9Phase10ExternalReviewRequests: input.externalReviewRequestResult.futureReviewRequests
    },
    counts: {
      phase2ExactReceiptRequests: input.phase2RequestResult.futureReceiptRequests.length,
      phase8ExactReceiptRequests: input.phase8RequestResult.futureReceiptRequests.length,
      phase9Phase10ExternalReviewRequests: input.externalReviewRequestResult.futureReviewRequests.length,
      totalFutureRequests: input.phase2RequestResult.futureReceiptRequests.length +
        input.phase8RequestResult.futureReceiptRequests.length +
        input.externalReviewRequestResult.futureReviewRequests.length
    },
    acceptedAsEvidenceNow: false,
    acceptedAsCompletionEvidenceNow: false
  };
}

function evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.phase2Source, 'phase2Source'),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.phase8Source, 'phase8Source'),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.externalReviewSource, 'externalReviewSource'),
    ...missingFields(REQUIRED_PHASE2_FIELDS, input.phase2RequestResult, 'phase2RequestResult'),
    ...missingFields(REQUIRED_PHASE8_FIELDS, input.phase8RequestResult, 'phase8RequestResult'),
    ...missingFields(REQUIRED_EXTERNAL_REVIEW_FIELDS, input.externalReviewRequestResult, 'externalReviewRequestResult'),
    ...missingFields(REQUIRED_PACKET_BOUNDARY_FIELDS, input.packetBoundary, 'packetBoundary'),
    ...missingFields(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) return failure('missing_required_fields', { missingFields: missing });

  const unexpected = collectUnexpectedFields(input);
  if (unexpected.length > 0) return failure('unexpected_fields', { unexpectedFields: unexpected });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (!/^CM-[0-9]{4}$/.test(input.taskId)) return failure('invalid_task_id');
  if (!ALLOWED_MODES.includes(input.mode)) return failure('invalid_mode');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) return failure('invalid_expected_decision');

  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length > 0) {
    return failure('invalid_counters', { invalidCounterFields });
  }

  const computed = computeDecision(input);
  if (computed.decision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision: computed.decision,
      blockers: computed.blockers
    });
  }

  if (computed.decision === 'stop_l4') {
    return {
      ...failure('stop_l4'),
      decision: computed.decision,
      blockers: computed.blockers
    };
  }
  if (computed.decision !== 'plan_pack_evidence_request_packet_prepared') {
    return {
      ...failure('plan_pack_evidence_request_packet_not_ready'),
      decision: computed.decision,
      blockers: computed.blockers
    };
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: [],
    requestPacketPrepared: true,
    requestPacket: buildRequestPacket(input),
    sourceTaskIds: ['CM-2054', 'CM-2055', 'CM-2056'],
    nextGate: 'await_separate_evidence_authorization_review_or_receipts_before_any_application_or_completion_claim',
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    evidenceAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    nativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    tagPushed: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceRequestPacketContract
};
