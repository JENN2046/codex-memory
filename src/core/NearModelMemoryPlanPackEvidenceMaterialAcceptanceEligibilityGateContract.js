'use strict';

const {
  CONTRACT_MODE: MANUAL_REVIEW_CONTRACT_MODE,
  CONTRACT_NAME: MANUAL_REVIEW_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: MANUAL_REVIEW_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_acceptance_eligibility_gate_only';
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
  'manualReviewSource',
  'manualReviewResult',
  'acceptanceEligibilityBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_MANUAL_REVIEW_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'manualReviewGatePrepared',
  'manualReviewChecklist',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
  'exactAuthorizationAcceptedByThisContract',
  'lowDisclosureEvidenceMaterialAcceptedByThisContract',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'manualReviewCompletedByThisContract',
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

const REQUIRED_MANUAL_REVIEW_CHECKLIST_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'exactAuthorizationPacketRequiredForReview',
  'lowDisclosureMaterialRequiredForReview',
  'operatorManualReviewRequired',
  'reviewPacketBodyAllowed',
  'rawAuthorizationAllowed',
  'rawMaterialAllowed',
  'materialBodyAllowed',
  'materialValueAllowed',
  'canCompleteManualReviewNow',
  'canAcceptAuthorizationNow',
  'canAcceptMaterialNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'manualReviewCompletedNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_ACCEPTANCE_ELIGIBILITY_BOUNDARY_FIELDS = Object.freeze([
  'acceptanceEligibilityGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'manualReviewResultOnly',
  'reviewedAuthorizationStillRequired',
  'reviewedLowDisclosureMaterialStillRequired',
  'separateAcceptanceDecisionRequired',
  'reviewCompletionStillRequired',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-acceptance-eligibility-gate']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_acceptance_eligibility_gate_prepared',
  'plan_pack_evidence_material_acceptance_eligibility_gate_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...MANUAL_REVIEW_FORBIDDEN_FIELD_NAMES,
  'acceptanceDecision',
  'acceptanceDecisionPayload',
  'acceptanceDecisionValue',
  'acceptancePayload',
  'acceptanceBody',
  'acceptanceValue',
  'exactAuthorizationReviewedPayload',
  'reviewedAuthorizationPayload',
  'reviewedAuthorizationBody',
  'reviewedAuthorizationValue',
  'reviewedMaterialPacket',
  'reviewedMaterialPayload',
  'reviewedMaterialBody',
  'reviewedMaterialValue',
  'materialAcceptedPayload',
  'evidenceAcceptedPayload',
  'acceptedEvidenceBody',
  'acceptedEvidenceValue'
]);

const MANUAL_REVIEW_RESULT_STOP_TRUE_FIELDS = Object.freeze([
  'exactAuthorizationAcceptedByThisContract',
  'lowDisclosureEvidenceMaterialAcceptedByThisContract',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'reviewAcceptedByThisContract',
  'tagApprovalAcceptedByThisContract',
  'manualReviewCompletedByThisContract',
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

const ACCEPTANCE_ELIGIBILITY_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'acceptanceEligibilityGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'manualReviewResultOnly',
  'reviewedAuthorizationStillRequired',
  'reviewedLowDisclosureMaterialStillRequired',
  'separateAcceptanceDecisionRequired',
  'reviewCompletionStillRequired',
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
  const checklist = Array.isArray(input.manualReviewResult && input.manualReviewResult.manualReviewChecklist)
    ? input.manualReviewResult.manualReviewChecklist
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.manualReviewSource, REQUIRED_SOURCE_FIELDS, 'manualReviewSource'),
    ...collectUnexpectedKeys(input.manualReviewResult, REQUIRED_MANUAL_REVIEW_RESULT_FIELDS, 'manualReviewResult'),
    ...checklist.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_MANUAL_REVIEW_CHECKLIST_FIELDS, `manualReviewResult.manualReviewChecklist[${index}]`)),
    ...collectUnexpectedKeys(
      input.acceptanceEligibilityBoundary,
      REQUIRED_ACCEPTANCE_ELIGIBILITY_BOUNDARY_FIELDS,
      'acceptanceEligibilityBoundary'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2063',
    sourceValidationId: 'CMV-2164',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_manual_review_gate_report.md',
    sourceContractName: MANUAL_REVIEW_CONTRACT_NAME,
    sourceContractMode: MANUAL_REVIEW_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `manualReviewSource.${field}`);
}

function validateManualReviewResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('manualReviewResult.accepted');
  if (result.contractName !== MANUAL_REVIEW_CONTRACT_NAME) blockers.push('manualReviewResult.contractName');
  if (result.contractMode !== MANUAL_REVIEW_CONTRACT_MODE) blockers.push('manualReviewResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_manual_review_gate_prepared') {
    blockers.push('manualReviewResult.decision');
  }
  if (result.manualReviewGatePrepared !== true) blockers.push('manualReviewResult.manualReviewGatePrepared');
  if (result.sourceTaskId !== 'CM-2062') blockers.push('manualReviewResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2163') blockers.push('manualReviewResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_reviewed_exact_authorization_and_low_disclosure_material_before_any_acceptance') {
    blockers.push('manualReviewResult.nextGate');
  }
  if (!Array.isArray(result.manualReviewChecklist) ||
    result.manualReviewChecklist.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('manualReviewResult.manualReviewChecklist');
  }
  return blockers;
}

function validateManualReviewChecklist(checklist) {
  if (!Array.isArray(checklist)) return ['manualReviewResult.manualReviewChecklist'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = checklist[index];
    const prefix = `manualReviewResult.manualReviewChecklist[${index}]`;
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
    if (entry.exactAuthorizationPacketRequiredForReview !== true) {
      blockers.push(`${prefix}.exactAuthorizationPacketRequiredForReview`);
    }
    if (entry.lowDisclosureMaterialRequiredForReview !== true) {
      blockers.push(`${prefix}.lowDisclosureMaterialRequiredForReview`);
    }
    if (entry.operatorManualReviewRequired !== true) blockers.push(`${prefix}.operatorManualReviewRequired`);
    if (entry.reviewPacketBodyAllowed !== false) blockers.push(`${prefix}.reviewPacketBodyAllowed`);
    if (entry.rawAuthorizationAllowed !== false) blockers.push(`${prefix}.rawAuthorizationAllowed`);
    if (entry.rawMaterialAllowed !== false) blockers.push(`${prefix}.rawMaterialAllowed`);
    if (entry.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (entry.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
    if (entry.canCompleteManualReviewNow !== false) blockers.push(`${prefix}.canCompleteManualReviewNow`);
    if (entry.canAcceptAuthorizationNow !== false) blockers.push(`${prefix}.canAcceptAuthorizationNow`);
    if (entry.canAcceptMaterialNow !== false) blockers.push(`${prefix}.canAcceptMaterialNow`);
    if (entry.canAcceptEvidenceNow !== false) blockers.push(`${prefix}.canAcceptEvidenceNow`);
    if (entry.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
    if (entry.manualReviewCompletedNow !== false) blockers.push(`${prefix}.manualReviewCompletedNow`);
    if (entry.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (entry.acceptedAsCompletionEvidenceNow !== false) {
      blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
    }
  });
  return blockers;
}

function validateAcceptanceEligibilityBoundary(boundary) {
  const requiredFalse = REQUIRED_ACCEPTANCE_ELIGIBILITY_BOUNDARY_FIELDS
    .filter(field => !ACCEPTANCE_ELIGIBILITY_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...ACCEPTANCE_ELIGIBILITY_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `acceptanceEligibilityBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `acceptanceEligibilityBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = MANUAL_REVIEW_RESULT_STOP_TRUE_FIELDS
    .filter(field => input.manualReviewResult[field] === true)
    .map(field => `manualReviewResult.${field}`);
  const boundaryStops = REQUIRED_ACCEPTANCE_ELIGIBILITY_BOUNDARY_FIELDS
    .filter(field => !ACCEPTANCE_ELIGIBILITY_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.acceptanceEligibilityBoundary[field] === true)
    .map(field => `acceptanceEligibilityBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.manualReviewSource),
    ...validateManualReviewResult(input.manualReviewResult),
    ...validateManualReviewChecklist(input.manualReviewResult.manualReviewChecklist),
    ...validateAcceptanceEligibilityBoundary(input.acceptanceEligibilityBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_acceptance_eligibility_gate_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_acceptance_eligibility_gate_prepared', blockers: [] };
}

function buildAcceptanceEligibilityChecklist(checklist) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: expectedSlotId(expected.routeId),
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: checklist[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    exactAuthorizationReviewedRequired: true,
    lowDisclosureMaterialReviewedRequired: true,
    separateAcceptanceDecisionRequired: true,
    reviewCompletionRequiredBeforeAcceptance: true,
    materialBodyAllowed: false,
    materialValueAllowed: false,
    rawAuthorizationAllowed: false,
    rawMaterialAllowed: false,
    canCompleteManualReviewNow: false,
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
    acceptanceEligibilityGatePrepared: false,
    acceptanceEligibilityChecklist: [],
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_authorization_material_acceptance_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const checklistMissing = Array.isArray(input.manualReviewResult && input.manualReviewResult.manualReviewChecklist)
    ? input.manualReviewResult.manualReviewChecklist.flatMap((entry, index) =>
      missingFields(REQUIRED_MANUAL_REVIEW_CHECKLIST_FIELDS, entry, `manualReviewResult.manualReviewChecklist[${index}]`))
    : ['manualReviewResult.manualReviewChecklist'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.manualReviewSource, 'manualReviewSource'),
    ...missingFields(REQUIRED_MANUAL_REVIEW_RESULT_FIELDS, input.manualReviewResult, 'manualReviewResult'),
    ...checklistMissing,
    ...missingFields(
      REQUIRED_ACCEPTANCE_ELIGIBILITY_BOUNDARY_FIELDS,
      input.acceptanceEligibilityBoundary,
      'acceptanceEligibilityBoundary'
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
  if (computed.decision !== 'plan_pack_evidence_material_acceptance_eligibility_gate_prepared') {
    return {
      ...failure('plan_pack_evidence_material_acceptance_eligibility_gate_not_ready'),
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
    acceptanceEligibilityGatePrepared: true,
    acceptanceEligibilityChecklist: buildAcceptanceEligibilityChecklist(input.manualReviewResult.manualReviewChecklist),
    sourceTaskId: 'CM-2063',
    sourceValidationId: 'CMV-2164',
    nextGate: 'await_actual_acceptance_decision_after_reviewed_authorization_and_low_disclosure_material',
    manualReviewCompletedByThisContract: false,
    acceptanceDecisionMadeByThisContract: false,
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptanceEligibilityGateContract
};
