'use strict';

const {
  CONTRACT_MODE: PACKET_CONTRACT_MODE,
  CONTRACT_NAME: PACKET_CONTRACT_NAME
} = require('./NearModelMemoryPlanPackEvidenceRequestPacketContract');
const {
  PHASE2_EXACT_RECEIPT_FIELDS
} = require('./Phase2ExactReceiptRequestBoundaryContract');
const {
  PHASE8_EXACT_RECEIPT_FIELDS
} = require('./Phase8ExactReceiptRequestBoundaryContract');
const {
  REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS
} = require('./PlanPackExternalReviewRequestBoundaryContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceApplicationRouterContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_application_router_only';
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
  'packetSource',
  'packetResult',
  'applicationBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PACKET_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'requestPacketPrepared',
  'requestPacket',
  'sourceTaskIds',
  'nextGate',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceAppliedByThisContract',
  'completionAuditPatchApplied',
  'fullPlanPackCompleted',
  'readinessClaimed',
  'runtimeCalled',
  'nativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'defaultRuntimeExpanded',
  'tagCreated',
  'tagPushed',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed'
]);

const REQUIRED_REQUEST_PACKET_FIELDS = Object.freeze([
  'schemaVersion',
  'packetKind',
  'lowDisclosureOnly',
  'categoryOnly',
  'separateJennApprovalRequired',
  'sections',
  'counts',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_PACKET_SECTION_FIELDS = Object.freeze([
  'phase2ExactReceiptRequests',
  'phase8ExactReceiptRequests',
  'phase9Phase10ExternalReviewRequests'
]);

const REQUIRED_PACKET_COUNT_FIELDS = Object.freeze([
  'phase2ExactReceiptRequests',
  'phase8ExactReceiptRequests',
  'phase9Phase10ExternalReviewRequests',
  'totalFutureRequests'
]);

const REQUIRED_APPLICATION_BOUNDARY_FIELDS = Object.freeze([
  'routerPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'sourcePacketOnly',
  'separateEvidenceRequired',
  'separateJennApprovalRequired',
  'applicationOrderPrepared',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-application-router']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_application_router_prepared',
  'plan_pack_evidence_application_router_blocked',
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
  'receiptMaterial',
  'reviewTranscript',
  'reviewBody',
  'reviewContent',
  'reviewMaterial',
  'reviewerIdentity',
  'tagApprovalLine',
  'tagApprovalValue',
  'tagApprovalMaterial',
  'approvalValue',
  'approvalMaterial',
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

const PACKET_RESULT_STOP_TRUE_FIELDS = Object.freeze([
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceAppliedByThisContract',
  'completionAuditPatchApplied',
  'fullPlanPackCompleted',
  'readinessClaimed',
  'runtimeCalled',
  'nativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'defaultRuntimeExpanded',
  'tagCreated',
  'tagPushed',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed'
]);

const APPLICATION_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'routerPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'sourcePacketOnly',
  'separateEvidenceRequired',
  'separateJennApprovalRequired',
  'applicationOrderPrepared'
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

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.packetSource, REQUIRED_SOURCE_FIELDS, 'packetSource'),
    ...collectUnexpectedKeys(input.packetResult, REQUIRED_PACKET_RESULT_FIELDS, 'packetResult'),
    ...collectUnexpectedKeys(input.packetResult.requestPacket, REQUIRED_REQUEST_PACKET_FIELDS, 'packetResult.requestPacket'),
    ...collectUnexpectedKeys(input.packetResult.requestPacket && input.packetResult.requestPacket.sections, REQUIRED_PACKET_SECTION_FIELDS, 'packetResult.requestPacket.sections'),
    ...collectUnexpectedKeys(input.packetResult.requestPacket && input.packetResult.requestPacket.counts, REQUIRED_PACKET_COUNT_FIELDS, 'packetResult.requestPacket.counts'),
    ...collectUnexpectedKeys(input.applicationBoundary, REQUIRED_APPLICATION_BOUNDARY_FIELDS, 'applicationBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2057',
    sourceValidationId: 'CMV-2158',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_request_packet_report.md',
    sourceContractName: PACKET_CONTRACT_NAME,
    sourceContractMode: PACKET_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `packetSource.${field}`);
}

function validatePacketResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('packetResult.accepted');
  if (result.contractName !== PACKET_CONTRACT_NAME) blockers.push('packetResult.contractName');
  if (result.contractMode !== PACKET_CONTRACT_MODE) blockers.push('packetResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_request_packet_prepared') {
    blockers.push('packetResult.decision');
  }
  if (result.requestPacketPrepared !== true) blockers.push('packetResult.requestPacketPrepared');
  if (!Array.isArray(result.sourceTaskIds) ||
    result.sourceTaskIds.join('|') !== 'CM-2054|CM-2055|CM-2056') {
    blockers.push('packetResult.sourceTaskIds');
  }
  if (result.nextGate !== 'await_separate_evidence_authorization_review_or_receipts_before_any_application_or_completion_claim') {
    blockers.push('packetResult.nextGate');
  }
  return blockers;
}

function validateRequestPacket(packet) {
  const blockers = [];
  if (packet.schemaVersion !== 'near_model_memory_plan_pack_evidence_request_packet_v1') {
    blockers.push('packetResult.requestPacket.schemaVersion');
  }
  if (packet.packetKind !== 'future_evidence_requests_only') {
    blockers.push('packetResult.requestPacket.packetKind');
  }
  for (const field of ['lowDisclosureOnly', 'categoryOnly', 'separateJennApprovalRequired']) {
    if (packet[field] !== true) blockers.push(`packetResult.requestPacket.${field}`);
  }
  if (packet.acceptedAsEvidenceNow !== false) {
    blockers.push('packetResult.requestPacket.acceptedAsEvidenceNow');
  }
  if (packet.acceptedAsCompletionEvidenceNow !== false) {
    blockers.push('packetResult.requestPacket.acceptedAsCompletionEvidenceNow');
  }

  const sections = packet.sections || {};
  const counts = packet.counts || {};
  const expectedPhase2 = PHASE2_EXACT_RECEIPT_FIELDS.length;
  const expectedPhase8 = PHASE8_EXACT_RECEIPT_FIELDS.length;
  const expectedExternal = REQUIRED_EXTERNAL_REVIEW_ROUTE_KEYS.length;
  const expectedTotal = expectedPhase2 + expectedPhase8 + expectedExternal;
  if (!Array.isArray(sections.phase2ExactReceiptRequests) ||
    sections.phase2ExactReceiptRequests.length !== expectedPhase2 ||
    counts.phase2ExactReceiptRequests !== expectedPhase2) {
    blockers.push('packetResult.requestPacket.sections.phase2ExactReceiptRequests');
  }
  if (!Array.isArray(sections.phase8ExactReceiptRequests) ||
    sections.phase8ExactReceiptRequests.length !== expectedPhase8 ||
    counts.phase8ExactReceiptRequests !== expectedPhase8) {
    blockers.push('packetResult.requestPacket.sections.phase8ExactReceiptRequests');
  }
  if (!Array.isArray(sections.phase9Phase10ExternalReviewRequests) ||
    sections.phase9Phase10ExternalReviewRequests.length !== expectedExternal ||
    counts.phase9Phase10ExternalReviewRequests !== expectedExternal) {
    blockers.push('packetResult.requestPacket.sections.phase9Phase10ExternalReviewRequests');
  }
  if (counts.totalFutureRequests !== expectedTotal) {
    blockers.push('packetResult.requestPacket.counts.totalFutureRequests');
  }
  return blockers;
}

function validateApplicationBoundary(boundary) {
  const requiredFalse = REQUIRED_APPLICATION_BOUNDARY_FIELDS
    .filter(field => !APPLICATION_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...APPLICATION_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `applicationBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `applicationBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = PACKET_RESULT_STOP_TRUE_FIELDS
    .filter(field => input.packetResult[field] === true)
    .map(field => `packetResult.${field}`);
  const boundaryStops = REQUIRED_APPLICATION_BOUNDARY_FIELDS
    .filter(field => !APPLICATION_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.applicationBoundary[field] === true)
    .map(field => `applicationBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.packetSource),
    ...validatePacketResult(input.packetResult),
    ...validateRequestPacket(input.packetResult.requestPacket),
    ...validateApplicationBoundary(input.applicationBoundary)
  ];

  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_application_router_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_application_router_prepared', blockers: [] };
}

function buildApplicationRoutes(packet) {
  return [
    {
      routeId: 'phase2_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase2ExactReceiptRequests',
      requestedItemCount: packet.counts.phase2ExactReceiptRequests,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      canApplyNow: false,
      requiredBeforeApplication: 'separate_phase2_exact_receipts_and_receipt_bundle_application_evidence'
    },
    {
      routeId: 'phase8_exact_receipts_before_completion_audit_patch',
      sourceSection: 'phase8ExactReceiptRequests',
      requestedItemCount: packet.counts.phase8ExactReceiptRequests,
      requiredEvidenceKind: 'future_exact_authorized_receipt',
      canApplyNow: false,
      requiredBeforeApplication: 'separate_phase8_exact_native_write_receipts_and_receipt_bundle_application_evidence'
    },
    {
      routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
      sourceSection: 'phase9Phase10ExternalReviewRequests',
      requestedItemCount: packet.counts.phase9Phase10ExternalReviewRequests,
      requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
      canApplyNow: false,
      requiredBeforeApplication: 'separate_observation_external_review_tag_approval_and_review_bundle_application_evidence'
    }
  ];
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    applicationRouterPrepared: false,
    applicationRoutes: [],
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

function evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.packetSource, 'packetSource'),
    ...missingFields(REQUIRED_PACKET_RESULT_FIELDS, input.packetResult, 'packetResult'),
    ...missingFields(REQUIRED_REQUEST_PACKET_FIELDS, input.packetResult && input.packetResult.requestPacket, 'packetResult.requestPacket'),
    ...missingFields(REQUIRED_PACKET_SECTION_FIELDS, input.packetResult && input.packetResult.requestPacket && input.packetResult.requestPacket.sections, 'packetResult.requestPacket.sections'),
    ...missingFields(REQUIRED_PACKET_COUNT_FIELDS, input.packetResult && input.packetResult.requestPacket && input.packetResult.requestPacket.counts, 'packetResult.requestPacket.counts'),
    ...missingFields(REQUIRED_APPLICATION_BOUNDARY_FIELDS, input.applicationBoundary, 'applicationBoundary'),
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
  if (computed.decision !== 'plan_pack_evidence_application_router_prepared') {
    return {
      ...failure('plan_pack_evidence_application_router_not_ready'),
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
    applicationRouterPrepared: true,
    applicationRoutes: buildApplicationRoutes(input.packetResult.requestPacket),
    sourceTaskId: 'CM-2057',
    sourceValidationId: 'CMV-2158',
    nextGate: 'await_separate_evidence_material_before_application_or_completion_audit_patch',
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
  evaluateNearModelMemoryPlanPackEvidenceApplicationRouterContract
};
