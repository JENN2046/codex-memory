'use strict';

const {
  CONTRACT_MODE: REQUEST_BOUNDARY_CONTRACT_MODE,
  CONTRACT_NAME: REQUEST_BOUNDARY_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: REQUEST_BOUNDARY_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_only';
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
  'acceptanceDecisionRequestSource',
  'acceptanceDecisionRequestResult',
  'acceptanceDecisionPacketMetadataBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_REQUEST_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'acceptanceDecisionRequestBoundaryPrepared',
  'acceptanceDecisionRequests',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
  'manualReviewCompletedByThisContract',
  'acceptanceDecisionMadeByThisContract',
  'acceptanceDecisionSubmittedByThisContract',
  'exactAuthorizationAcceptedByThisContract',
  'lowDisclosureEvidenceMaterialAcceptedByThisContract',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceMaterialAcceptedByThisContract',
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

const REQUIRED_DECISION_REQUEST_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'acceptanceDecisionPacketRequired',
  'reviewedExactAuthorizationRequired',
  'reviewedLowDisclosureMaterialRequired',
  'operatorDecisionRequired',
  'decisionBodyAllowed',
  'decisionValueAllowed',
  'rawAuthorizationAllowed',
  'rawMaterialAllowed',
  'materialBodyAllowed',
  'materialValueAllowed',
  'canSubmitAcceptanceDecisionNow',
  'canMakeAcceptanceDecisionNow',
  'canAcceptAuthorizationNow',
  'canAcceptMaterialNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_METADATA_BOUNDARY_FIELDS = Object.freeze([
  'acceptanceDecisionPacketMetadataGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'decisionRequestResultOnly',
  'acceptanceDecisionPacketStillRequired',
  'reviewedDecisionPacketStillRequired',
  'rawDecisionAbsent',
  'decisionBodyAbsent',
  'decisionValueAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'acceptanceDecisionDeferred',
  'evidenceAcceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred',
  'manualReviewCompletedByThisContract',
  'acceptanceDecisionMadeByThisContract',
  'acceptanceDecisionSubmittedByThisContract',
  'acceptanceDecisionPacketAcceptedByThisContract',
  'exactAuthorizationAcceptedByThisContract',
  'lowDisclosureEvidenceMaterialAcceptedByThisContract',
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
  'acceptanceDecisionPacketAcceptances',
  'acceptanceDecisionSubmissions',
  'acceptanceDecisions',
  'manualReviewCompletions',
  'exactAuthorizationAcceptances',
  'lowDisclosureEvidenceMaterialAcceptances',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-acceptance-decision-packet-metadata-gate']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_prepared',
  'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...REQUEST_BOUNDARY_FORBIDDEN_FIELD_NAMES,
  'acceptanceDecisionPacketBody',
  'acceptanceDecisionPacketValue',
  'acceptanceDecisionPacketText',
  'decisionPacketBody',
  'decisionPacketValue',
  'decisionMetadataPayload',
  'decisionMetadataBody',
  'decisionMetadataValue',
  'reviewedDecisionPacketPayload',
  'reviewedDecisionPacketBody',
  'reviewedDecisionPacketValue',
  'acceptedDecisionPacketPayload',
  'acceptedDecisionPacketBody',
  'acceptedDecisionPacketValue'
]);

const REQUEST_RESULT_STOP_TRUE_FIELDS = Object.freeze([
  'manualReviewCompletedByThisContract',
  'acceptanceDecisionMadeByThisContract',
  'acceptanceDecisionSubmittedByThisContract',
  'exactAuthorizationAcceptedByThisContract',
  'lowDisclosureEvidenceMaterialAcceptedByThisContract',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'evidenceMaterialAcceptedByThisContract',
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
  'acceptanceDecisionPacketMetadataGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'decisionRequestResultOnly',
  'acceptanceDecisionPacketStillRequired',
  'reviewedDecisionPacketStillRequired',
  'rawDecisionAbsent',
  'decisionBodyAbsent',
  'decisionValueAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'acceptanceDecisionDeferred',
  'evidenceAcceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred'
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

function expectedSlotId(routeId) {
  return `${routeId}_metadata_slot`;
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  const requests = Array.isArray(input.acceptanceDecisionRequestResult &&
    input.acceptanceDecisionRequestResult.acceptanceDecisionRequests)
    ? input.acceptanceDecisionRequestResult.acceptanceDecisionRequests
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.acceptanceDecisionRequestSource, REQUIRED_SOURCE_FIELDS, 'acceptanceDecisionRequestSource'),
    ...collectUnexpectedKeys(input.acceptanceDecisionRequestResult, REQUIRED_REQUEST_RESULT_FIELDS, 'acceptanceDecisionRequestResult'),
    ...requests.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_DECISION_REQUEST_FIELDS, `acceptanceDecisionRequestResult.acceptanceDecisionRequests[${index}]`)),
    ...collectUnexpectedKeys(
      input.acceptanceDecisionPacketMetadataBoundary,
      REQUIRED_METADATA_BOUNDARY_FIELDS,
      'acceptanceDecisionPacketMetadataBoundary'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2065',
    sourceValidationId: 'CMV-2166',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_decision_request_boundary_report.md',
    sourceContractName: REQUEST_BOUNDARY_CONTRACT_NAME,
    sourceContractMode: REQUEST_BOUNDARY_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `acceptanceDecisionRequestSource.${field}`);
}

function validateRequestResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('acceptanceDecisionRequestResult.accepted');
  if (result.contractName !== REQUEST_BOUNDARY_CONTRACT_NAME) blockers.push('acceptanceDecisionRequestResult.contractName');
  if (result.contractMode !== REQUEST_BOUNDARY_CONTRACT_MODE) blockers.push('acceptanceDecisionRequestResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_acceptance_decision_request_boundary_prepared') {
    blockers.push('acceptanceDecisionRequestResult.decision');
  }
  if (result.acceptanceDecisionRequestBoundaryPrepared !== true) {
    blockers.push('acceptanceDecisionRequestResult.acceptanceDecisionRequestBoundaryPrepared');
  }
  if (result.sourceTaskId !== 'CM-2064') blockers.push('acceptanceDecisionRequestResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2165') blockers.push('acceptanceDecisionRequestResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_reviewed_acceptance_decision_packet_before_any_evidence_acceptance_or_application') {
    blockers.push('acceptanceDecisionRequestResult.nextGate');
  }
  if (!Array.isArray(result.acceptanceDecisionRequests) ||
    result.acceptanceDecisionRequests.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('acceptanceDecisionRequestResult.acceptanceDecisionRequests');
  }
  return blockers;
}

function validateDecisionRequests(requests) {
  if (!Array.isArray(requests)) return ['acceptanceDecisionRequestResult.acceptanceDecisionRequests'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = requests[index];
    const prefix = `acceptanceDecisionRequestResult.acceptanceDecisionRequests[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    if (entry.slotId !== expectedSlotId(expected.routeId)) blockers.push(`${prefix}.slotId`);
    if (entry.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (entry.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (entry.requiredEvidenceKind !== expected.requiredEvidenceKind) blockers.push(`${prefix}.requiredEvidenceKind`);
    if (entry.requiredMetadataKind !== expected.requiredMetadataKind) blockers.push(`${prefix}.requiredMetadataKind`);
    if (entry.requiredAuthorizationKind !== expected.requiredAuthorizationKind) {
      blockers.push(`${prefix}.requiredAuthorizationKind`);
    }
    if (entry.requiredMaterialKind !== expected.requiredMaterialKind) blockers.push(`${prefix}.requiredMaterialKind`);
    if (!Number.isInteger(entry.requestedItemCount) || entry.requestedItemCount < 1) {
      blockers.push(`${prefix}.requestedItemCount`);
    }
    if (entry.acceptanceDecisionPacketRequired !== true) blockers.push(`${prefix}.acceptanceDecisionPacketRequired`);
    if (entry.reviewedExactAuthorizationRequired !== true) blockers.push(`${prefix}.reviewedExactAuthorizationRequired`);
    if (entry.reviewedLowDisclosureMaterialRequired !== true) {
      blockers.push(`${prefix}.reviewedLowDisclosureMaterialRequired`);
    }
    if (entry.operatorDecisionRequired !== true) blockers.push(`${prefix}.operatorDecisionRequired`);
    if (entry.decisionBodyAllowed !== false) blockers.push(`${prefix}.decisionBodyAllowed`);
    if (entry.decisionValueAllowed !== false) blockers.push(`${prefix}.decisionValueAllowed`);
    if (entry.rawAuthorizationAllowed !== false) blockers.push(`${prefix}.rawAuthorizationAllowed`);
    if (entry.rawMaterialAllowed !== false) blockers.push(`${prefix}.rawMaterialAllowed`);
    if (entry.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (entry.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
    if (entry.canSubmitAcceptanceDecisionNow !== false) blockers.push(`${prefix}.canSubmitAcceptanceDecisionNow`);
    if (entry.canMakeAcceptanceDecisionNow !== false) blockers.push(`${prefix}.canMakeAcceptanceDecisionNow`);
    if (entry.canAcceptAuthorizationNow !== false) blockers.push(`${prefix}.canAcceptAuthorizationNow`);
    if (entry.canAcceptMaterialNow !== false) blockers.push(`${prefix}.canAcceptMaterialNow`);
    if (entry.canAcceptEvidenceNow !== false) blockers.push(`${prefix}.canAcceptEvidenceNow`);
    if (entry.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
    if (entry.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (entry.acceptedAsCompletionEvidenceNow !== false) {
      blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
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
      .map(field => `acceptanceDecisionPacketMetadataBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `acceptanceDecisionPacketMetadataBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = REQUEST_RESULT_STOP_TRUE_FIELDS
    .filter(field => input.acceptanceDecisionRequestResult[field] === true)
    .map(field => `acceptanceDecisionRequestResult.${field}`);
  const boundaryStops = REQUIRED_METADATA_BOUNDARY_FIELDS
    .filter(field => !METADATA_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.acceptanceDecisionPacketMetadataBoundary[field] === true)
    .map(field => `acceptanceDecisionPacketMetadataBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.acceptanceDecisionRequestSource),
    ...validateRequestResult(input.acceptanceDecisionRequestResult),
    ...validateDecisionRequests(input.acceptanceDecisionRequestResult.acceptanceDecisionRequests),
    ...validateMetadataBoundary(input.acceptanceDecisionPacketMetadataBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_prepared', blockers: [] };
}

function buildDecisionPacketMetadataSlots(requests) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: expectedSlotId(expected.routeId),
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: requests[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    acceptanceDecisionPacketRequired: true,
    lowDisclosureDecisionMetadataRequired: true,
    reviewedDecisionPacketRequired: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    decisionBodyAllowed: false,
    decisionValueAllowed: false,
    rawAuthorizationAllowed: false,
    rawMaterialAllowed: false,
    materialBodyAllowed: false,
    materialValueAllowed: false,
    canAcceptDecisionPacketNow: false,
    canSubmitAcceptanceDecisionNow: false,
    canMakeAcceptanceDecisionNow: false,
    canAcceptEvidenceNow: false,
    canApplyNow: false,
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
    acceptanceDecisionPacketMetadataGatePrepared: false,
    acceptanceDecisionPacketMetadataSlots: [],
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
    acceptanceDecisionPacketAcceptedByThisContract: false,
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_authorization_material_decision_packet_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const requestMissing = Array.isArray(input.acceptanceDecisionRequestResult &&
    input.acceptanceDecisionRequestResult.acceptanceDecisionRequests)
    ? input.acceptanceDecisionRequestResult.acceptanceDecisionRequests.flatMap((entry, index) =>
      missingFields(REQUIRED_DECISION_REQUEST_FIELDS, entry, `acceptanceDecisionRequestResult.acceptanceDecisionRequests[${index}]`))
    : ['acceptanceDecisionRequestResult.acceptanceDecisionRequests'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.acceptanceDecisionRequestSource, 'acceptanceDecisionRequestSource'),
    ...missingFields(REQUIRED_REQUEST_RESULT_FIELDS, input.acceptanceDecisionRequestResult, 'acceptanceDecisionRequestResult'),
    ...requestMissing,
    ...missingFields(
      REQUIRED_METADATA_BOUNDARY_FIELDS,
      input.acceptanceDecisionPacketMetadataBoundary,
      'acceptanceDecisionPacketMetadataBoundary'
    ),
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
  if (computed.decision !== 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_prepared') {
    return {
      ...failure('plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_not_ready'),
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
    acceptanceDecisionPacketMetadataGatePrepared: true,
    acceptanceDecisionPacketMetadataSlots: buildDecisionPacketMetadataSlots(
      input.acceptanceDecisionRequestResult.acceptanceDecisionRequests
    ),
    sourceTaskId: 'CM-2065',
    sourceValidationId: 'CMV-2166',
    nextGate: 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_any_acceptance',
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
    acceptanceDecisionPacketAcceptedByThisContract: false,
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
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
  FORBIDDEN_FIELD_NAMES,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract
};
