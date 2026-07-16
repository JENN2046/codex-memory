'use strict';

const {
  CONTRACT_MODE: ROUTER_CONTRACT_MODE,
  CONTRACT_NAME: ROUTER_CONTRACT_NAME
} = require('./NearModelMemoryPlanPackEvidenceApplicationRouterContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialMetadataGateContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_metadata_gate_only';
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
  'routerSource',
  'routerResult',
  'metadataBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_ROUTER_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'applicationRouterPrepared',
  'applicationRoutes',
  'sourceTaskId',
  'sourceValidationId',
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

const REQUIRED_ROUTE_FIELDS = Object.freeze([
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'canApplyNow',
  'requiredBeforeApplication'
]);

const REQUIRED_METADATA_BOUNDARY_FIELDS = Object.freeze([
  'metadataGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'routerResultOnly',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'metadataSlotsPrepared',
  'separateEvidenceMaterialRequired',
  'separateJennApprovalRequired',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceMaterialAcceptedByThisContract',
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
  'evidenceMaterialAcceptances',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-metadata-gate']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_metadata_gate_prepared',
  'plan_pack_evidence_material_metadata_gate_blocked',
  'stop_l4'
]);

const EXPECTED_ROUTES = Object.freeze([
  {
    routeId: 'phase2_exact_receipts_before_completion_audit_patch',
    sourceSection: 'phase2ExactReceiptRequests',
    requiredEvidenceKind: 'future_exact_authorized_receipt',
    metadataKind: 'low_disclosure_phase2_exact_receipt_metadata'
  },
  {
    routeId: 'phase8_exact_receipts_before_completion_audit_patch',
    sourceSection: 'phase8ExactReceiptRequests',
    requiredEvidenceKind: 'future_exact_authorized_receipt',
    metadataKind: 'low_disclosure_phase8_exact_receipt_metadata'
  },
  {
    routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
    sourceSection: 'phase9Phase10ExternalReviewRequests',
    requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
    metadataKind: 'low_disclosure_external_review_or_tag_approval_metadata'
  }
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
  'receiptPayload',
  'reviewTranscript',
  'reviewBody',
  'reviewContent',
  'reviewMaterial',
  'reviewPayload',
  'reviewerIdentity',
  'tagApprovalLine',
  'tagApprovalValue',
  'tagApprovalMaterial',
  'approvalValue',
  'approvalMaterial',
  'approvalPayload',
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

const ROUTER_STOP_TRUE_FIELDS = Object.freeze([
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

const METADATA_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'metadataGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'routerResultOnly',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'metadataSlotsPrepared',
  'separateEvidenceMaterialRequired',
  'separateJennApprovalRequired'
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
  const routes = Array.isArray(input.routerResult && input.routerResult.applicationRoutes)
    ? input.routerResult.applicationRoutes
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.routerSource, REQUIRED_SOURCE_FIELDS, 'routerSource'),
    ...collectUnexpectedKeys(input.routerResult, REQUIRED_ROUTER_RESULT_FIELDS, 'routerResult'),
    ...routes.flatMap((route, index) =>
      collectUnexpectedKeys(route, REQUIRED_ROUTE_FIELDS, `routerResult.applicationRoutes[${index}]`)),
    ...collectUnexpectedKeys(input.metadataBoundary, REQUIRED_METADATA_BOUNDARY_FIELDS, 'metadataBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2058',
    sourceValidationId: 'CMV-2159',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_application_router_report.md',
    sourceContractName: ROUTER_CONTRACT_NAME,
    sourceContractMode: ROUTER_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `routerSource.${field}`);
}

function validateRouterResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('routerResult.accepted');
  if (result.contractName !== ROUTER_CONTRACT_NAME) blockers.push('routerResult.contractName');
  if (result.contractMode !== ROUTER_CONTRACT_MODE) blockers.push('routerResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_application_router_prepared') {
    blockers.push('routerResult.decision');
  }
  if (result.applicationRouterPrepared !== true) blockers.push('routerResult.applicationRouterPrepared');
  if (result.sourceTaskId !== 'CM-2057') blockers.push('routerResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2158') blockers.push('routerResult.sourceValidationId');
  if (result.nextGate !== 'await_separate_evidence_material_before_application_or_completion_audit_patch') {
    blockers.push('routerResult.nextGate');
  }
  if (!Array.isArray(result.applicationRoutes) ||
    result.applicationRoutes.length !== EXPECTED_ROUTES.length) {
    blockers.push('routerResult.applicationRoutes');
  }
  return blockers;
}

function validateRoutes(routes) {
  if (!Array.isArray(routes)) return ['routerResult.applicationRoutes'];
  const blockers = [];
  EXPECTED_ROUTES.forEach((expected, index) => {
    const actual = routes[index];
    const prefix = `routerResult.applicationRoutes[${index}]`;
    if (!isPlainObject(actual)) {
      blockers.push(prefix);
      return;
    }
    if (actual.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (actual.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (!Number.isInteger(actual.requestedItemCount) || actual.requestedItemCount < 1) {
      blockers.push(`${prefix}.requestedItemCount`);
    }
    if (actual.requiredEvidenceKind !== expected.requiredEvidenceKind) {
      blockers.push(`${prefix}.requiredEvidenceKind`);
    }
    if (actual.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
    if (typeof actual.requiredBeforeApplication !== 'string' ||
      actual.requiredBeforeApplication.length === 0) {
      blockers.push(`${prefix}.requiredBeforeApplication`);
    }
  });
  return blockers;
}

function validateMetadataBoundary(boundary) {
  const requiredFalse = REQUIRED_METADATA_BOUNDARY_FIELDS
    .filter(field => !METADATA_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...METADATA_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `metadataBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `metadataBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = ROUTER_STOP_TRUE_FIELDS
    .filter(field => input.routerResult[field] === true)
    .map(field => `routerResult.${field}`);
  const boundaryStops = REQUIRED_METADATA_BOUNDARY_FIELDS
    .filter(field => !METADATA_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.metadataBoundary[field] === true)
    .map(field => `metadataBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.routerSource),
    ...validateRouterResult(input.routerResult),
    ...validateRoutes(input.routerResult.applicationRoutes),
    ...validateMetadataBoundary(input.metadataBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_metadata_gate_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_metadata_gate_prepared', blockers: [] };
}

function buildMetadataSlots(routes) {
  return EXPECTED_ROUTES.map((expected, index) => ({
    slotId: `${expected.routeId}_metadata_slot`,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: routes[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.metadataKind,
    lowDisclosureOnly: true,
    categoryOnly: true,
    materialBodyAllowed: false,
    materialValueAllowed: false,
    canAcceptMaterialNow: false,
    acceptedAsEvidenceNow: false,
    acceptedAsCompletionEvidenceNow: false
  }));
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    metadataGatePrepared: false,
    materialMetadataSlots: [],
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    evidenceMaterialAcceptedByThisContract: false,
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const routeMissing = Array.isArray(input.routerResult && input.routerResult.applicationRoutes)
    ? input.routerResult.applicationRoutes.flatMap((route, index) =>
      missingFields(REQUIRED_ROUTE_FIELDS, route, `routerResult.applicationRoutes[${index}]`))
    : ['routerResult.applicationRoutes'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.routerSource, 'routerSource'),
    ...missingFields(REQUIRED_ROUTER_RESULT_FIELDS, input.routerResult, 'routerResult'),
    ...routeMissing,
    ...missingFields(REQUIRED_METADATA_BOUNDARY_FIELDS, input.metadataBoundary, 'metadataBoundary'),
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
  if (computed.decision !== 'plan_pack_evidence_material_metadata_gate_prepared') {
    return {
      ...failure('plan_pack_evidence_material_metadata_gate_not_ready'),
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
    metadataGatePrepared: true,
    materialMetadataSlots: buildMetadataSlots(input.routerResult.applicationRoutes),
    sourceTaskId: 'CM-2058',
    sourceValidationId: 'CMV-2159',
    nextGate: 'await_separate_low_disclosure_evidence_material_metadata_before_any_acceptance_or_application',
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    evidenceMaterialAcceptedByThisContract: false,
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
  EXPECTED_ROUTES,
  FORBIDDEN_FIELD_NAMES,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataGateContract
};
