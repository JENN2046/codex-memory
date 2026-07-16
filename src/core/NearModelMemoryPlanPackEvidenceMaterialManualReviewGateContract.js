'use strict';

const {
  CONTRACT_MODE: INTAKE_CONTRACT_MODE,
  CONTRACT_NAME: INTAKE_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: INTAKE_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_manual_review_gate_only';
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
  'intakeSource',
  'intakeResult',
  'manualReviewBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_INTAKE_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'materialIntakeBoundaryPrepared',
  'intakeRequirements',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
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

const REQUIRED_INTAKE_REQUIREMENT_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'separateExactAuthorizationPacketRequired',
  'separateLowDisclosureMaterialPacketRequired',
  'intakeMetadataOnly',
  'rawAuthorizationAllowed',
  'rawMaterialAllowed',
  'materialBodyAllowed',
  'materialValueAllowed',
  'canAcceptAuthorizationNow',
  'canAcceptMaterialNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_MANUAL_REVIEW_BOUNDARY_FIELDS = Object.freeze([
  'manualReviewGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'intakeResultOnly',
  'operatorManualReviewRequired',
  'separateExactAuthorizationPacketRequired',
  'separateLowDisclosureMaterialPacketRequired',
  'reviewPacketBodyAbsent',
  'approvalTextAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'manualReviewDeferred',
  'acceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred',
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
  'manualReviewCompletions',
  'intakeAcceptances',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-manual-review-gate']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_manual_review_gate_prepared',
  'plan_pack_evidence_material_manual_review_gate_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...INTAKE_FORBIDDEN_FIELD_NAMES,
  'manualReviewPacket',
  'manualReviewPayload',
  'manualReviewBody',
  'manualReviewValue',
  'reviewPacketBody',
  'reviewPacketValue',
  'reviewDecisionValue',
  'reviewApprovalText',
  'operatorReviewText',
  'authorizationMaterial',
  'authorizationBody',
  'authorizationValue',
  'materialPacket',
  'materialPayload',
  'materialBody',
  'materialValue',
  'evidencePacket',
  'evidencePayload',
  'evidenceBody',
  'evidenceValue'
]);

const INTAKE_STOP_TRUE_FIELDS = Object.freeze([
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

const MANUAL_REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'manualReviewGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'intakeResultOnly',
  'operatorManualReviewRequired',
  'separateExactAuthorizationPacketRequired',
  'separateLowDisclosureMaterialPacketRequired',
  'reviewPacketBodyAbsent',
  'approvalTextAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'manualReviewDeferred',
  'acceptanceDeferred',
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
  const requirements = Array.isArray(input.intakeResult && input.intakeResult.intakeRequirements)
    ? input.intakeResult.intakeRequirements
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.intakeSource, REQUIRED_SOURCE_FIELDS, 'intakeSource'),
    ...collectUnexpectedKeys(input.intakeResult, REQUIRED_INTAKE_RESULT_FIELDS, 'intakeResult'),
    ...requirements.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_INTAKE_REQUIREMENT_FIELDS, `intakeResult.intakeRequirements[${index}]`)),
    ...collectUnexpectedKeys(input.manualReviewBoundary, REQUIRED_MANUAL_REVIEW_BOUNDARY_FIELDS, 'manualReviewBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2062',
    sourceValidationId: 'CMV-2163',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_intake_boundary_report.md',
    sourceContractName: INTAKE_CONTRACT_NAME,
    sourceContractMode: INTAKE_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `intakeSource.${field}`);
}

function validateIntakeResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('intakeResult.accepted');
  if (result.contractName !== INTAKE_CONTRACT_NAME) blockers.push('intakeResult.contractName');
  if (result.contractMode !== INTAKE_CONTRACT_MODE) blockers.push('intakeResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_intake_boundary_prepared') {
    blockers.push('intakeResult.decision');
  }
  if (result.materialIntakeBoundaryPrepared !== true) blockers.push('intakeResult.materialIntakeBoundaryPrepared');
  if (result.sourceTaskId !== 'CM-2061') blockers.push('intakeResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2162') blockers.push('intakeResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_exact_authorization_packet_and_low_disclosure_material_for_manual_review_before_acceptance') {
    blockers.push('intakeResult.nextGate');
  }
  if (!Array.isArray(result.intakeRequirements) ||
    result.intakeRequirements.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('intakeResult.intakeRequirements');
  }
  return blockers;
}

function validateIntakeRequirements(requirements) {
  if (!Array.isArray(requirements)) return ['intakeResult.intakeRequirements'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = requirements[index];
    const prefix = `intakeResult.intakeRequirements[${index}]`;
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
    if (entry.separateExactAuthorizationPacketRequired !== true) {
      blockers.push(`${prefix}.separateExactAuthorizationPacketRequired`);
    }
    if (entry.separateLowDisclosureMaterialPacketRequired !== true) {
      blockers.push(`${prefix}.separateLowDisclosureMaterialPacketRequired`);
    }
    if (entry.intakeMetadataOnly !== true) blockers.push(`${prefix}.intakeMetadataOnly`);
    if (entry.rawAuthorizationAllowed !== false) blockers.push(`${prefix}.rawAuthorizationAllowed`);
    if (entry.rawMaterialAllowed !== false) blockers.push(`${prefix}.rawMaterialAllowed`);
    if (entry.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (entry.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
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

function validateManualReviewBoundary(boundary) {
  const requiredFalse = REQUIRED_MANUAL_REVIEW_BOUNDARY_FIELDS
    .filter(field => !MANUAL_REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...MANUAL_REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `manualReviewBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `manualReviewBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const intakeStops = INTAKE_STOP_TRUE_FIELDS
    .filter(field => input.intakeResult[field] === true)
    .map(field => `intakeResult.${field}`);
  const boundaryStops = REQUIRED_MANUAL_REVIEW_BOUNDARY_FIELDS
    .filter(field => !MANUAL_REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.manualReviewBoundary[field] === true)
    .map(field => `manualReviewBoundary.${field}`);
  return [...intakeStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.intakeSource),
    ...validateIntakeResult(input.intakeResult),
    ...validateIntakeRequirements(input.intakeResult.intakeRequirements),
    ...validateManualReviewBoundary(input.manualReviewBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_manual_review_gate_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_manual_review_gate_prepared', blockers: [] };
}

function buildManualReviewChecklist(requirements) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: expectedSlotId(expected.routeId),
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: requirements[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    exactAuthorizationPacketRequiredForReview: true,
    lowDisclosureMaterialRequiredForReview: true,
    operatorManualReviewRequired: true,
    reviewPacketBodyAllowed: false,
    rawAuthorizationAllowed: false,
    rawMaterialAllowed: false,
    materialBodyAllowed: false,
    materialValueAllowed: false,
    canCompleteManualReviewNow: false,
    canAcceptAuthorizationNow: false,
    canAcceptMaterialNow: false,
    canAcceptEvidenceNow: false,
    canApplyNow: false,
    manualReviewCompletedNow: false,
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
    manualReviewGatePrepared: false,
    manualReviewChecklist: [],
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    manualReviewCompletedByThisContract: false,
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_authorization_material_review_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const requirementMissing = Array.isArray(input.intakeResult && input.intakeResult.intakeRequirements)
    ? input.intakeResult.intakeRequirements.flatMap((entry, index) =>
      missingFields(REQUIRED_INTAKE_REQUIREMENT_FIELDS, entry, `intakeResult.intakeRequirements[${index}]`))
    : ['intakeResult.intakeRequirements'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.intakeSource, 'intakeSource'),
    ...missingFields(REQUIRED_INTAKE_RESULT_FIELDS, input.intakeResult, 'intakeResult'),
    ...requirementMissing,
    ...missingFields(REQUIRED_MANUAL_REVIEW_BOUNDARY_FIELDS, input.manualReviewBoundary, 'manualReviewBoundary'),
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
  if (computed.decision !== 'plan_pack_evidence_material_manual_review_gate_prepared') {
    return {
      ...failure('plan_pack_evidence_material_manual_review_gate_not_ready'),
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
    manualReviewGatePrepared: true,
    manualReviewChecklist: buildManualReviewChecklist(input.intakeResult.intakeRequirements),
    sourceTaskId: 'CM-2062',
    sourceValidationId: 'CMV-2163',
    nextGate: 'await_actual_reviewed_exact_authorization_and_low_disclosure_material_before_any_acceptance',
    exactAuthorizationAcceptedByThisContract: false,
    lowDisclosureEvidenceMaterialAcceptedByThisContract: false,
    approvalAcceptedByThisContract: false,
    receiptAcceptedByThisContract: false,
    reviewAcceptedByThisContract: false,
    tagApprovalAcceptedByThisContract: false,
    manualReviewCompletedByThisContract: false,
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialManualReviewGateContract
};
