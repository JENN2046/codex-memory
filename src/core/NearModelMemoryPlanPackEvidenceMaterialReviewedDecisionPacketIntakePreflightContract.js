'use strict';

const {
  CONTRACT_MODE: READINESS_GATE_CONTRACT_MODE,
  CONTRACT_NAME: READINESS_GATE_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: READINESS_GATE_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReadinessGateContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_only';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'reviewedDecisionPacketReadinessSource',
  'reviewedDecisionPacketReadinessResult',
  'reviewedDecisionPacketIntakeBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_SOURCE_FIELDS = Object.freeze([
  'sourceTaskId',
  'sourceValidationId',
  'sourceReport',
  'sourceContractName',
  'sourceContractMode'
]);

const REQUIRED_READINESS_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'reviewedDecisionPacketReadinessGatePrepared',
  'reviewedDecisionPacketReadinessChecklist',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
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

const REQUIRED_READINESS_CHECKLIST_FIELDS = Object.freeze([
  'slotId',
  'sourceMetadataSlotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'actualReviewedDecisionPacketRequired',
  'lowDisclosureDecisionPacketRequired',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'actualReviewedDecisionPacketPresent',
  'canAcceptDecisionPacketNow',
  'canSubmitAcceptanceDecisionNow',
  'canMakeAcceptanceDecisionNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_INTAKE_BOUNDARY_FIELDS = Object.freeze([
  'reviewedDecisionPacketIntakePreflightPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'readinessGateResultOnly',
  'actualReviewedDecisionPacketStillRequired',
  'actualReviewedDecisionPacketAbsent',
  'reviewedDecisionPacketBodyAbsent',
  'reviewedDecisionPacketValueAbsent',
  'packetReferenceOnly',
  'packetBodyAllowed',
  'packetValueAllowed',
  'decisionBodyAllowed',
  'decisionValueAllowed',
  'rawDecisionAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'packetAcceptanceDeferred',
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
  'reviewedDecisionPacketReceipts',
  'reviewedDecisionPacketAcceptances',
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

const ALLOWED_MODES = Object.freeze([
  'local-plan-pack-evidence-material-reviewed-decision-packet-intake-preflight'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_prepared',
  'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...READINESS_GATE_FORBIDDEN_FIELD_NAMES,
  'reviewedDecisionPacket',
  'reviewedDecisionPacketPayload',
  'reviewedDecisionPacketBody',
  'reviewedDecisionPacketValue',
  'reviewedDecisionPacketText',
  'reviewedDecisionPacketDecision',
  'actualDecisionPacket',
  'actualDecisionPacketPayload',
  'actualDecisionPacketBody',
  'actualDecisionPacketValue',
  'packetPayload',
  'packetBody',
  'packetValue',
  'rawDecisionPacket',
  'rawDecisionPacketPayload',
  'rawDecisionPacketBody',
  'rawDecisionPacketValue'
]);

const RESULT_STOP_TRUE_FIELDS = Object.freeze([
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

const INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'reviewedDecisionPacketIntakePreflightPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'readinessGateResultOnly',
  'actualReviewedDecisionPacketStillRequired',
  'actualReviewedDecisionPacketAbsent',
  'reviewedDecisionPacketBodyAbsent',
  'reviewedDecisionPacketValueAbsent',
  'packetReferenceOnly',
  'rawDecisionAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'packetAcceptanceDeferred',
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

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  const checklist = Array.isArray(input.reviewedDecisionPacketReadinessResult &&
    input.reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist)
    ? input.reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.reviewedDecisionPacketReadinessSource, REQUIRED_SOURCE_FIELDS, 'reviewedDecisionPacketReadinessSource'),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReadinessResult,
      REQUIRED_READINESS_RESULT_FIELDS,
      'reviewedDecisionPacketReadinessResult'
    ),
    ...checklist.flatMap((entry, index) =>
      collectUnexpectedKeys(
        entry,
        REQUIRED_READINESS_CHECKLIST_FIELDS,
        `reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist[${index}]`
      )),
    ...collectUnexpectedKeys(input.reviewedDecisionPacketIntakeBoundary, REQUIRED_INTAKE_BOUNDARY_FIELDS, 'reviewedDecisionPacketIntakeBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2068',
    sourceValidationId: 'CMV-2169',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_readiness_gate_report.md',
    sourceContractName: READINESS_GATE_CONTRACT_NAME,
    sourceContractMode: READINESS_GATE_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `reviewedDecisionPacketReadinessSource.${field}`);
}

function validateReadinessResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('reviewedDecisionPacketReadinessResult.accepted');
  if (result.contractName !== READINESS_GATE_CONTRACT_NAME) blockers.push('reviewedDecisionPacketReadinessResult.contractName');
  if (result.contractMode !== READINESS_GATE_CONTRACT_MODE) blockers.push('reviewedDecisionPacketReadinessResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_prepared') {
    blockers.push('reviewedDecisionPacketReadinessResult.decision');
  }
  if (result.reviewedDecisionPacketReadinessGatePrepared !== true) {
    blockers.push('reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessGatePrepared');
  }
  if (result.sourceTaskId !== 'CM-2066') blockers.push('reviewedDecisionPacketReadinessResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2167') blockers.push('reviewedDecisionPacketReadinessResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_packet_acceptance_or_evidence_acceptance') {
    blockers.push('reviewedDecisionPacketReadinessResult.nextGate');
  }
  if (!Array.isArray(result.reviewedDecisionPacketReadinessChecklist) ||
    result.reviewedDecisionPacketReadinessChecklist.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist');
  }
  return blockers;
}

function validateChecklist(checklist) {
  if (!Array.isArray(checklist)) return ['reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = checklist[index];
    const prefix = `reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    if (entry.slotId !== `${expected.routeId}_reviewed_decision_packet_readiness`) blockers.push(`${prefix}.slotId`);
    if (entry.sourceMetadataSlotId !== `${expected.routeId}_metadata_slot`) blockers.push(`${prefix}.sourceMetadataSlotId`);
    if (entry.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (entry.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (entry.requiredEvidenceKind !== expected.requiredEvidenceKind) blockers.push(`${prefix}.requiredEvidenceKind`);
    if (entry.requiredMetadataKind !== expected.requiredMetadataKind) blockers.push(`${prefix}.requiredMetadataKind`);
    if (entry.requiredAuthorizationKind !== expected.requiredAuthorizationKind) blockers.push(`${prefix}.requiredAuthorizationKind`);
    if (entry.requiredMaterialKind !== expected.requiredMaterialKind) blockers.push(`${prefix}.requiredMaterialKind`);
    if (!Number.isInteger(entry.requestedItemCount) || entry.requestedItemCount < 1) blockers.push(`${prefix}.requestedItemCount`);
    if (entry.actualReviewedDecisionPacketRequired !== true) blockers.push(`${prefix}.actualReviewedDecisionPacketRequired`);
    if (entry.lowDisclosureDecisionPacketRequired !== true) blockers.push(`${prefix}.lowDisclosureDecisionPacketRequired`);
    if (entry.categoryOnly !== true) blockers.push(`${prefix}.categoryOnly`);
    if (entry.bodyFree !== true) blockers.push(`${prefix}.bodyFree`);
    if (entry.valueFree !== true) blockers.push(`${prefix}.valueFree`);
    if (entry.actualReviewedDecisionPacketPresent !== false) blockers.push(`${prefix}.actualReviewedDecisionPacketPresent`);
    if (entry.canAcceptDecisionPacketNow !== false) blockers.push(`${prefix}.canAcceptDecisionPacketNow`);
    if (entry.canSubmitAcceptanceDecisionNow !== false) blockers.push(`${prefix}.canSubmitAcceptanceDecisionNow`);
    if (entry.canMakeAcceptanceDecisionNow !== false) blockers.push(`${prefix}.canMakeAcceptanceDecisionNow`);
    if (entry.canAcceptEvidenceNow !== false) blockers.push(`${prefix}.canAcceptEvidenceNow`);
    if (entry.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
    if (entry.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (entry.acceptedAsCompletionEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
  });
  return blockers;
}

function validateIntakeBoundary(boundary) {
  const requiredFalse = REQUIRED_INTAKE_BOUNDARY_FIELDS
    .filter(field => !INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `reviewedDecisionPacketIntakeBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `reviewedDecisionPacketIntakeBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = RESULT_STOP_TRUE_FIELDS
    .filter(field => input.reviewedDecisionPacketReadinessResult[field] === true)
    .map(field => `reviewedDecisionPacketReadinessResult.${field}`);
  const boundaryStops = REQUIRED_INTAKE_BOUNDARY_FIELDS
    .filter(field => !INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.reviewedDecisionPacketIntakeBoundary[field] === true)
    .map(field => `reviewedDecisionPacketIntakeBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.reviewedDecisionPacketReadinessSource),
    ...validateReadinessResult(input.reviewedDecisionPacketReadinessResult),
    ...validateChecklist(input.reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist),
    ...validateIntakeBoundary(input.reviewedDecisionPacketIntakeBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_blocked', blockers };
  }
  return {
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_prepared',
    blockers: []
  };
}

function buildIntakeRequirements(checklist) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    requirementId: `${expected.routeId}_reviewed_decision_packet_intake_requirement`,
    sourceReadinessSlotId: checklist[index].slotId,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: checklist[index].requestedItemCount,
    expectedPacketReferenceKind: 'future_low_disclosure_reviewed_acceptance_decision_packet_reference',
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    packetReferenceRequired: true,
    packetReferenceOnly: true,
    lowDisclosureDecisionSummaryRequired: true,
    reviewedDecisionPacketBodyAllowed: false,
    reviewedDecisionPacketValueAllowed: false,
    rawDecisionAllowed: false,
    rawAuthorizationAllowed: false,
    rawMaterialAllowed: false,
    canReceiveActualPacketNow: false,
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
    reviewedDecisionPacketIntakePreflightPrepared: false,
    reviewedDecisionPacketIntakeRequirements: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_decision_packet_authorization_material_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const checklistMissing = Array.isArray(input.reviewedDecisionPacketReadinessResult &&
    input.reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist)
    ? input.reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist.flatMap((entry, index) =>
      missingFields(
        REQUIRED_READINESS_CHECKLIST_FIELDS,
        entry,
        `reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist[${index}]`
      ))
    : ['reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.reviewedDecisionPacketReadinessSource, 'reviewedDecisionPacketReadinessSource'),
    ...missingFields(REQUIRED_READINESS_RESULT_FIELDS, input.reviewedDecisionPacketReadinessResult, 'reviewedDecisionPacketReadinessResult'),
    ...checklistMissing,
    ...missingFields(REQUIRED_INTAKE_BOUNDARY_FIELDS, input.reviewedDecisionPacketIntakeBoundary, 'reviewedDecisionPacketIntakeBoundary'),
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
  if (invalidCounterFields.length > 0) return failure('invalid_counters', { invalidCounterFields });

  const computed = computeDecision(input);
  if (computed.decision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision: computed.decision,
      blockers: computed.blockers
    });
  }
  if (computed.decision === 'stop_l4') {
    return { ...failure('stop_l4'), decision: computed.decision, blockers: computed.blockers };
  }
  if (computed.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_prepared') {
    return {
      ...failure('plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_not_ready'),
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
    reviewedDecisionPacketIntakePreflightPrepared: true,
    reviewedDecisionPacketIntakeRequirements: buildIntakeRequirements(
      input.reviewedDecisionPacketReadinessResult.reviewedDecisionPacketReadinessChecklist
    ),
    sourceTaskId: 'CM-2068',
    sourceValidationId: 'CMV-2169',
    nextGate: 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_reference_before_packet_intake_execution',
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract
};
