'use strict';

const {
  CONTRACT_MODE: ELIGIBILITY_CONTRACT_MODE,
  CONTRACT_NAME: ELIGIBILITY_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: ELIGIBILITY_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_acceptance_decision_request_boundary_only';
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
  'acceptanceEligibilitySource',
  'acceptanceEligibilityResult',
  'acceptanceDecisionRequestBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_ELIGIBILITY_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'acceptanceEligibilityGatePrepared',
  'acceptanceEligibilityChecklist',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
  'manualReviewCompletedByThisContract',
  'acceptanceDecisionMadeByThisContract',
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

const REQUIRED_ELIGIBILITY_CHECKLIST_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'exactAuthorizationReviewedRequired',
  'lowDisclosureMaterialReviewedRequired',
  'separateAcceptanceDecisionRequired',
  'reviewCompletionRequiredBeforeAcceptance',
  'materialBodyAllowed',
  'materialValueAllowed',
  'rawAuthorizationAllowed',
  'rawMaterialAllowed',
  'canCompleteManualReviewNow',
  'canMakeAcceptanceDecisionNow',
  'canAcceptAuthorizationNow',
  'canAcceptMaterialNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_DECISION_REQUEST_BOUNDARY_FIELDS = Object.freeze([
  'acceptanceDecisionRequestBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'acceptanceEligibilityResultOnly',
  'actualAcceptanceDecisionStillRequired',
  'reviewedAuthorizationStillRequired',
  'reviewedLowDisclosureMaterialStillRequired',
  'separateAcceptanceDecisionRequired',
  'reviewCompletionStillRequired',
  'decisionPacketBodyAbsent',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-acceptance-decision-request-boundary']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_acceptance_decision_request_boundary_prepared',
  'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...ELIGIBILITY_FORBIDDEN_FIELD_NAMES,
  'acceptanceDecisionPacket',
  'acceptanceDecisionBody',
  'acceptanceDecisionText',
  'decisionPacket',
  'decisionPayload',
  'decisionBody',
  'decisionValue',
  'operatorDecisionText',
  'reviewedAcceptanceDecisionPacket',
  'reviewedAcceptanceDecisionPayload',
  'reviewedAcceptanceDecisionBody',
  'reviewedAcceptanceDecisionValue',
  'decisionReceiptPayload',
  'decisionReceiptBody',
  'decisionReceiptValue'
]);

const ELIGIBILITY_RESULT_STOP_TRUE_FIELDS = Object.freeze([
  'manualReviewCompletedByThisContract',
  'acceptanceDecisionMadeByThisContract',
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

const DECISION_REQUEST_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'acceptanceDecisionRequestBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'acceptanceEligibilityResultOnly',
  'actualAcceptanceDecisionStillRequired',
  'reviewedAuthorizationStillRequired',
  'reviewedLowDisclosureMaterialStillRequired',
  'separateAcceptanceDecisionRequired',
  'reviewCompletionStillRequired',
  'decisionPacketBodyAbsent',
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
  const checklist = Array.isArray(input.acceptanceEligibilityResult &&
    input.acceptanceEligibilityResult.acceptanceEligibilityChecklist)
    ? input.acceptanceEligibilityResult.acceptanceEligibilityChecklist
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.acceptanceEligibilitySource, REQUIRED_SOURCE_FIELDS, 'acceptanceEligibilitySource'),
    ...collectUnexpectedKeys(input.acceptanceEligibilityResult, REQUIRED_ELIGIBILITY_RESULT_FIELDS, 'acceptanceEligibilityResult'),
    ...checklist.flatMap((entry, index) =>
      collectUnexpectedKeys(
        entry,
        REQUIRED_ELIGIBILITY_CHECKLIST_FIELDS,
        `acceptanceEligibilityResult.acceptanceEligibilityChecklist[${index}]`
      )),
    ...collectUnexpectedKeys(
      input.acceptanceDecisionRequestBoundary,
      REQUIRED_DECISION_REQUEST_BOUNDARY_FIELDS,
      'acceptanceDecisionRequestBoundary'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2064',
    sourceValidationId: 'CMV-2165',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_eligibility_gate_report.md',
    sourceContractName: ELIGIBILITY_CONTRACT_NAME,
    sourceContractMode: ELIGIBILITY_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `acceptanceEligibilitySource.${field}`);
}

function validateEligibilityResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('acceptanceEligibilityResult.accepted');
  if (result.contractName !== ELIGIBILITY_CONTRACT_NAME) blockers.push('acceptanceEligibilityResult.contractName');
  if (result.contractMode !== ELIGIBILITY_CONTRACT_MODE) blockers.push('acceptanceEligibilityResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_acceptance_eligibility_gate_prepared') {
    blockers.push('acceptanceEligibilityResult.decision');
  }
  if (result.acceptanceEligibilityGatePrepared !== true) {
    blockers.push('acceptanceEligibilityResult.acceptanceEligibilityGatePrepared');
  }
  if (result.sourceTaskId !== 'CM-2063') blockers.push('acceptanceEligibilityResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2164') blockers.push('acceptanceEligibilityResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_acceptance_decision_after_reviewed_authorization_and_low_disclosure_material') {
    blockers.push('acceptanceEligibilityResult.nextGate');
  }
  if (!Array.isArray(result.acceptanceEligibilityChecklist) ||
    result.acceptanceEligibilityChecklist.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('acceptanceEligibilityResult.acceptanceEligibilityChecklist');
  }
  return blockers;
}

function validateEligibilityChecklist(checklist) {
  if (!Array.isArray(checklist)) return ['acceptanceEligibilityResult.acceptanceEligibilityChecklist'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = checklist[index];
    const prefix = `acceptanceEligibilityResult.acceptanceEligibilityChecklist[${index}]`;
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
    if (entry.exactAuthorizationReviewedRequired !== true) {
      blockers.push(`${prefix}.exactAuthorizationReviewedRequired`);
    }
    if (entry.lowDisclosureMaterialReviewedRequired !== true) {
      blockers.push(`${prefix}.lowDisclosureMaterialReviewedRequired`);
    }
    if (entry.separateAcceptanceDecisionRequired !== true) {
      blockers.push(`${prefix}.separateAcceptanceDecisionRequired`);
    }
    if (entry.reviewCompletionRequiredBeforeAcceptance !== true) {
      blockers.push(`${prefix}.reviewCompletionRequiredBeforeAcceptance`);
    }
    if (entry.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (entry.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
    if (entry.rawAuthorizationAllowed !== false) blockers.push(`${prefix}.rawAuthorizationAllowed`);
    if (entry.rawMaterialAllowed !== false) blockers.push(`${prefix}.rawMaterialAllowed`);
    if (entry.canCompleteManualReviewNow !== false) blockers.push(`${prefix}.canCompleteManualReviewNow`);
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

function validateDecisionRequestBoundary(boundary) {
  const requiredFalse = REQUIRED_DECISION_REQUEST_BOUNDARY_FIELDS
    .filter(field => !DECISION_REQUEST_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...DECISION_REQUEST_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `acceptanceDecisionRequestBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `acceptanceDecisionRequestBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = ELIGIBILITY_RESULT_STOP_TRUE_FIELDS
    .filter(field => input.acceptanceEligibilityResult[field] === true)
    .map(field => `acceptanceEligibilityResult.${field}`);
  const boundaryStops = REQUIRED_DECISION_REQUEST_BOUNDARY_FIELDS
    .filter(field => !DECISION_REQUEST_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.acceptanceDecisionRequestBoundary[field] === true)
    .map(field => `acceptanceDecisionRequestBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.acceptanceEligibilitySource),
    ...validateEligibilityResult(input.acceptanceEligibilityResult),
    ...validateEligibilityChecklist(input.acceptanceEligibilityResult.acceptanceEligibilityChecklist),
    ...validateDecisionRequestBoundary(input.acceptanceDecisionRequestBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_acceptance_decision_request_boundary_prepared', blockers: [] };
}

function buildAcceptanceDecisionRequests(checklist) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: expectedSlotId(expected.routeId),
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: checklist[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    acceptanceDecisionPacketRequired: true,
    reviewedExactAuthorizationRequired: true,
    reviewedLowDisclosureMaterialRequired: true,
    operatorDecisionRequired: true,
    decisionBodyAllowed: false,
    decisionValueAllowed: false,
    rawAuthorizationAllowed: false,
    rawMaterialAllowed: false,
    materialBodyAllowed: false,
    materialValueAllowed: false,
    canSubmitAcceptanceDecisionNow: false,
    canMakeAcceptanceDecisionNow: false,
    canAcceptAuthorizationNow: false,
    canAcceptMaterialNow: false,
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
    acceptanceDecisionRequestBoundaryPrepared: false,
    acceptanceDecisionRequests: [],
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_authorization_material_decision_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const checklistMissing = Array.isArray(input.acceptanceEligibilityResult &&
    input.acceptanceEligibilityResult.acceptanceEligibilityChecklist)
    ? input.acceptanceEligibilityResult.acceptanceEligibilityChecklist.flatMap((entry, index) =>
      missingFields(
        REQUIRED_ELIGIBILITY_CHECKLIST_FIELDS,
        entry,
        `acceptanceEligibilityResult.acceptanceEligibilityChecklist[${index}]`
      ))
    : ['acceptanceEligibilityResult.acceptanceEligibilityChecklist'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.acceptanceEligibilitySource, 'acceptanceEligibilitySource'),
    ...missingFields(REQUIRED_ELIGIBILITY_RESULT_FIELDS, input.acceptanceEligibilityResult, 'acceptanceEligibilityResult'),
    ...checklistMissing,
    ...missingFields(
      REQUIRED_DECISION_REQUEST_BOUNDARY_FIELDS,
      input.acceptanceDecisionRequestBoundary,
      'acceptanceDecisionRequestBoundary'
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
  if (computed.decision !== 'plan_pack_evidence_material_acceptance_decision_request_boundary_prepared') {
    return {
      ...failure('plan_pack_evidence_material_acceptance_decision_request_boundary_not_ready'),
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
    acceptanceDecisionRequestBoundaryPrepared: true,
    acceptanceDecisionRequests: buildAcceptanceDecisionRequests(
      input.acceptanceEligibilityResult.acceptanceEligibilityChecklist
    ),
    sourceTaskId: 'CM-2064',
    sourceValidationId: 'CMV-2165',
    nextGate: 'await_actual_reviewed_acceptance_decision_packet_before_any_evidence_acceptance_or_application',
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
    acceptanceDecisionSubmittedByThisContract: false,
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionRequestBoundaryContract
};
