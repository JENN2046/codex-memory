'use strict';

const {
  CONTRACT_MODE: INTAKE_PREFLIGHT_CONTRACT_MODE,
  CONTRACT_NAME: INTAKE_PREFLIGHT_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: INTAKE_PREFLIGHT_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketIntakePreflightContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_reviewed_decision_packet_reference_intake_execution_only';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'reviewedDecisionPacketIntakePreflightSource',
  'reviewedDecisionPacketIntakePreflightResult',
  'reviewedDecisionPacketReferenceEnvelope',
  'reviewedDecisionPacketReferenceIntakeBoundary',
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

const REQUIRED_PREFLIGHT_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'reviewedDecisionPacketIntakePreflightPrepared',
  'reviewedDecisionPacketIntakeRequirements',
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

const REQUIRED_INTAKE_REQUIREMENT_FIELDS = Object.freeze([
  'requirementId',
  'sourceReadinessSlotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'expectedPacketReferenceKind',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'packetReferenceRequired',
  'packetReferenceOnly',
  'lowDisclosureDecisionSummaryRequired',
  'reviewedDecisionPacketBodyAllowed',
  'reviewedDecisionPacketValueAllowed',
  'rawDecisionAllowed',
  'rawAuthorizationAllowed',
  'rawMaterialAllowed',
  'canReceiveActualPacketNow',
  'canAcceptDecisionPacketNow',
  'canSubmitAcceptanceDecisionNow',
  'canMakeAcceptanceDecisionNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_REFERENCE_ENVELOPE_FIELDS = Object.freeze([
  'envelopeId',
  'sourcePreflightTaskId',
  'sourcePreflightValidationId',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'references'
]);

const REQUIRED_REFERENCE_FIELDS = Object.freeze([
  'referenceId',
  'sourceRequirementId',
  'routeId',
  'sourceSection',
  'packetReferenceKind',
  'decisionSummaryKind',
  'reviewOutcomeCategory',
  'requestedItemCount',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'actualReviewedDecisionPacketPresent',
  'reviewedDecisionPacketBodyPresent',
  'reviewedDecisionPacketValuePresent',
  'rawDecisionPresent',
  'rawAuthorizationPresent',
  'rawMaterialPresent',
  'packetAcceptanceRequested',
  'acceptanceDecisionRequested',
  'evidenceAcceptanceRequested',
  'applicationRequested',
  'completionPatchRequested'
]);

const REQUIRED_REFERENCE_INTAKE_BOUNDARY_FIELDS = Object.freeze([
  'reviewedDecisionPacketReferenceIntakeExecuted',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'preflightResultConsumed',
  'actualReviewedDecisionPacketStillAbsent',
  'reviewedDecisionPacketBodyAbsent',
  'reviewedDecisionPacketValueAbsent',
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
  'reviewedDecisionPacketReferenceEntries',
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
  'local-plan-pack-evidence-material-reviewed-decision-packet-reference-intake-execution'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_executed',
  'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...INTAKE_PREFLIGHT_FORBIDDEN_FIELD_NAMES,
  'reviewedDecisionPacketEnvelope',
  'reviewedDecisionPacketPayload',
  'reviewedDecisionPacketBody',
  'reviewedDecisionPacketValue',
  'actualReviewedDecisionPacket',
  'actualReviewedDecisionPacketPayload',
  'actualReviewedDecisionPacketBody',
  'actualReviewedDecisionPacketValue',
  'acceptanceDecisionPacket',
  'acceptanceDecisionPacketPayload',
  'acceptanceDecisionPacketBody',
  'acceptanceDecisionPacketValue',
  'rawReviewedDecisionPacketReference',
  'rawReviewedDecisionPacketReferenceBody',
  'rawReviewedDecisionPacketReferenceValue'
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

const REFERENCE_INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'reviewedDecisionPacketReferenceIntakeExecuted',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'preflightResultConsumed',
  'actualReviewedDecisionPacketStillAbsent',
  'reviewedDecisionPacketBodyAbsent',
  'reviewedDecisionPacketValueAbsent',
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
  const requirements = Array.isArray(input.reviewedDecisionPacketIntakePreflightResult &&
    input.reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements)
    ? input.reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements
    : [];
  const references = Array.isArray(input.reviewedDecisionPacketReferenceEnvelope &&
    input.reviewedDecisionPacketReferenceEnvelope.references)
    ? input.reviewedDecisionPacketReferenceEnvelope.references
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.reviewedDecisionPacketIntakePreflightSource, REQUIRED_SOURCE_FIELDS, 'reviewedDecisionPacketIntakePreflightSource'),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketIntakePreflightResult,
      REQUIRED_PREFLIGHT_RESULT_FIELDS,
      'reviewedDecisionPacketIntakePreflightResult'
    ),
    ...requirements.flatMap((entry, index) =>
      collectUnexpectedKeys(
        entry,
        REQUIRED_INTAKE_REQUIREMENT_FIELDS,
        `reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements[${index}]`
      )),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReferenceEnvelope,
      REQUIRED_REFERENCE_ENVELOPE_FIELDS,
      'reviewedDecisionPacketReferenceEnvelope'
    ),
    ...references.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_REFERENCE_FIELDS, `reviewedDecisionPacketReferenceEnvelope.references[${index}]`)),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReferenceIntakeBoundary,
      REQUIRED_REFERENCE_INTAKE_BOUNDARY_FIELDS,
      'reviewedDecisionPacketReferenceIntakeBoundary'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function invalidCounterValues(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => {
    if (field === 'reviewedDecisionPacketReferenceEntries') {
      return counters[field] !== EXPECTED_ENTRY_METADATA.length;
    }
    return counters[field] !== 0;
  });
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2069',
    sourceValidationId: 'CMV-2170',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_intake_preflight_report.md',
    sourceContractName: INTAKE_PREFLIGHT_CONTRACT_NAME,
    sourceContractMode: INTAKE_PREFLIGHT_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `reviewedDecisionPacketIntakePreflightSource.${field}`);
}

function validatePreflightResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('reviewedDecisionPacketIntakePreflightResult.accepted');
  if (result.contractName !== INTAKE_PREFLIGHT_CONTRACT_NAME) blockers.push('reviewedDecisionPacketIntakePreflightResult.contractName');
  if (result.contractMode !== INTAKE_PREFLIGHT_CONTRACT_MODE) blockers.push('reviewedDecisionPacketIntakePreflightResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_intake_preflight_prepared') {
    blockers.push('reviewedDecisionPacketIntakePreflightResult.decision');
  }
  if (result.reviewedDecisionPacketIntakePreflightPrepared !== true) {
    blockers.push('reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakePreflightPrepared');
  }
  if (result.sourceTaskId !== 'CM-2068') blockers.push('reviewedDecisionPacketIntakePreflightResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2169') blockers.push('reviewedDecisionPacketIntakePreflightResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_reference_before_packet_intake_execution') {
    blockers.push('reviewedDecisionPacketIntakePreflightResult.nextGate');
  }
  if (!Array.isArray(result.reviewedDecisionPacketIntakeRequirements) ||
    result.reviewedDecisionPacketIntakeRequirements.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements');
  }
  return blockers;
}

function validateIntakeRequirements(requirements) {
  if (!Array.isArray(requirements)) {
    return ['reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements'];
  }
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = requirements[index];
    const prefix = `reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    if (entry.requirementId !== `${expected.routeId}_reviewed_decision_packet_intake_requirement`) blockers.push(`${prefix}.requirementId`);
    if (entry.sourceReadinessSlotId !== `${expected.routeId}_reviewed_decision_packet_readiness`) blockers.push(`${prefix}.sourceReadinessSlotId`);
    if (entry.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (entry.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (entry.expectedPacketReferenceKind !== 'future_low_disclosure_reviewed_acceptance_decision_packet_reference') {
      blockers.push(`${prefix}.expectedPacketReferenceKind`);
    }
    if (entry.requiredEvidenceKind !== expected.requiredEvidenceKind) blockers.push(`${prefix}.requiredEvidenceKind`);
    if (entry.requiredMetadataKind !== expected.requiredMetadataKind) blockers.push(`${prefix}.requiredMetadataKind`);
    if (entry.requiredAuthorizationKind !== expected.requiredAuthorizationKind) blockers.push(`${prefix}.requiredAuthorizationKind`);
    if (entry.requiredMaterialKind !== expected.requiredMaterialKind) blockers.push(`${prefix}.requiredMaterialKind`);
    if (!Number.isInteger(entry.requestedItemCount) || entry.requestedItemCount < 1) blockers.push(`${prefix}.requestedItemCount`);
    if (entry.packetReferenceRequired !== true) blockers.push(`${prefix}.packetReferenceRequired`);
    if (entry.packetReferenceOnly !== true) blockers.push(`${prefix}.packetReferenceOnly`);
    if (entry.lowDisclosureDecisionSummaryRequired !== true) blockers.push(`${prefix}.lowDisclosureDecisionSummaryRequired`);
    [
      'reviewedDecisionPacketBodyAllowed',
      'reviewedDecisionPacketValueAllowed',
      'rawDecisionAllowed',
      'rawAuthorizationAllowed',
      'rawMaterialAllowed',
      'canReceiveActualPacketNow',
      'canAcceptDecisionPacketNow',
      'canSubmitAcceptanceDecisionNow',
      'canMakeAcceptanceDecisionNow',
      'canAcceptEvidenceNow',
      'canApplyNow',
      'acceptedAsEvidenceNow',
      'acceptedAsCompletionEvidenceNow'
    ].forEach(field => {
      if (entry[field] !== false) blockers.push(`${prefix}.${field}`);
    });
  });
  return blockers;
}

function validateReferenceEnvelope(envelope) {
  const blockers = [];
  if (envelope.envelopeId !== 'CM-2070_reviewed_decision_packet_reference_envelope') {
    blockers.push('reviewedDecisionPacketReferenceEnvelope.envelopeId');
  }
  if (envelope.sourcePreflightTaskId !== 'CM-2069') blockers.push('reviewedDecisionPacketReferenceEnvelope.sourcePreflightTaskId');
  if (envelope.sourcePreflightValidationId !== 'CMV-2170') {
    blockers.push('reviewedDecisionPacketReferenceEnvelope.sourcePreflightValidationId');
  }
  if (envelope.lowDisclosureOnly !== true) blockers.push('reviewedDecisionPacketReferenceEnvelope.lowDisclosureOnly');
  if (envelope.categoryOnly !== true) blockers.push('reviewedDecisionPacketReferenceEnvelope.categoryOnly');
  if (envelope.referenceOnly !== true) blockers.push('reviewedDecisionPacketReferenceEnvelope.referenceOnly');
  if (!Array.isArray(envelope.references) || envelope.references.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('reviewedDecisionPacketReferenceEnvelope.references');
  }
  return blockers;
}

function validateReferences(references) {
  if (!Array.isArray(references)) return ['reviewedDecisionPacketReferenceEnvelope.references'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = references[index];
    const prefix = `reviewedDecisionPacketReferenceEnvelope.references[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    if (entry.referenceId !== `${expected.routeId}_reviewed_decision_packet_reference`) blockers.push(`${prefix}.referenceId`);
    if (entry.sourceRequirementId !== `${expected.routeId}_reviewed_decision_packet_intake_requirement`) {
      blockers.push(`${prefix}.sourceRequirementId`);
    }
    if (entry.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (entry.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (entry.packetReferenceKind !== 'low_disclosure_reviewed_acceptance_decision_packet_reference') {
      blockers.push(`${prefix}.packetReferenceKind`);
    }
    if (entry.decisionSummaryKind !== 'low_disclosure_acceptance_decision_summary_reference') {
      blockers.push(`${prefix}.decisionSummaryKind`);
    }
    if (entry.reviewOutcomeCategory !== 'reference_intake_only_requires_future_acceptance_boundary') {
      blockers.push(`${prefix}.reviewOutcomeCategory`);
    }
    if (!Number.isInteger(entry.requestedItemCount) || entry.requestedItemCount < 1) blockers.push(`${prefix}.requestedItemCount`);
    if (entry.categoryOnly !== true) blockers.push(`${prefix}.categoryOnly`);
    if (entry.bodyFree !== true) blockers.push(`${prefix}.bodyFree`);
    if (entry.valueFree !== true) blockers.push(`${prefix}.valueFree`);
    [
      'actualReviewedDecisionPacketPresent',
      'reviewedDecisionPacketBodyPresent',
      'reviewedDecisionPacketValuePresent',
      'rawDecisionPresent',
      'rawAuthorizationPresent',
      'rawMaterialPresent',
      'packetAcceptanceRequested',
      'acceptanceDecisionRequested',
      'evidenceAcceptanceRequested',
      'applicationRequested',
      'completionPatchRequested'
    ].forEach(field => {
      if (entry[field] !== false) blockers.push(`${prefix}.${field}`);
    });
  });
  return blockers;
}

function validateReferenceIntakeBoundary(boundary) {
  const requiredFalse = REQUIRED_REFERENCE_INTAKE_BOUNDARY_FIELDS
    .filter(field => !REFERENCE_INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...REFERENCE_INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `reviewedDecisionPacketReferenceIntakeBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `reviewedDecisionPacketReferenceIntakeBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = RESULT_STOP_TRUE_FIELDS
    .filter(field => input.reviewedDecisionPacketIntakePreflightResult[field] === true)
    .map(field => `reviewedDecisionPacketIntakePreflightResult.${field}`);
  const boundaryStops = REQUIRED_REFERENCE_INTAKE_BOUNDARY_FIELDS
    .filter(field => !REFERENCE_INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.reviewedDecisionPacketReferenceIntakeBoundary[field] === true)
    .map(field => `reviewedDecisionPacketReferenceIntakeBoundary.${field}`);
  const referenceStops = Array.isArray(input.reviewedDecisionPacketReferenceEnvelope.references)
    ? input.reviewedDecisionPacketReferenceEnvelope.references.flatMap((entry, index) =>
      [
        'actualReviewedDecisionPacketPresent',
        'reviewedDecisionPacketBodyPresent',
        'reviewedDecisionPacketValuePresent',
        'rawDecisionPresent',
        'rawAuthorizationPresent',
        'rawMaterialPresent',
        'packetAcceptanceRequested',
        'acceptanceDecisionRequested',
        'evidenceAcceptanceRequested',
        'applicationRequested',
        'completionPatchRequested'
      ]
        .filter(field => entry[field] === true)
        .map(field => `reviewedDecisionPacketReferenceEnvelope.references[${index}].${field}`))
    : [];
  return [...resultStops, ...boundaryStops, ...referenceStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...invalidCounterValues(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.reviewedDecisionPacketIntakePreflightSource),
    ...validatePreflightResult(input.reviewedDecisionPacketIntakePreflightResult),
    ...validateIntakeRequirements(input.reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements),
    ...validateReferenceEnvelope(input.reviewedDecisionPacketReferenceEnvelope),
    ...validateReferences(input.reviewedDecisionPacketReferenceEnvelope.references),
    ...validateReferenceIntakeBoundary(input.reviewedDecisionPacketReferenceIntakeBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_blocked', blockers };
  }
  return {
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_executed',
    blockers: []
  };
}

function buildReferenceIntakeEntries(references) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    intakeEntryId: `${expected.routeId}_reviewed_decision_packet_reference_intake_entry`,
    sourceReferenceId: references[index].referenceId,
    sourceRequirementId: references[index].sourceRequirementId,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: references[index].requestedItemCount,
    packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
    decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
    referenceOnly: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    actualReviewedDecisionPacketPresent: false,
    reviewedDecisionPacketBodyPresent: false,
    reviewedDecisionPacketValuePresent: false,
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
    reviewedDecisionPacketReferenceIntakeExecuted: false,
    reviewedDecisionPacketReferenceIntakeEntries: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_decision_packet_reference_packet_authorization_material_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const requirementsMissing = Array.isArray(input.reviewedDecisionPacketIntakePreflightResult &&
    input.reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements)
    ? input.reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements.flatMap((entry, index) =>
      missingFields(
        REQUIRED_INTAKE_REQUIREMENT_FIELDS,
        entry,
        `reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements[${index}]`
      ))
    : ['reviewedDecisionPacketIntakePreflightResult.reviewedDecisionPacketIntakeRequirements'];
  const referencesMissing = Array.isArray(input.reviewedDecisionPacketReferenceEnvelope &&
    input.reviewedDecisionPacketReferenceEnvelope.references)
    ? input.reviewedDecisionPacketReferenceEnvelope.references.flatMap((entry, index) =>
      missingFields(REQUIRED_REFERENCE_FIELDS, entry, `reviewedDecisionPacketReferenceEnvelope.references[${index}]`))
    : ['reviewedDecisionPacketReferenceEnvelope.references'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.reviewedDecisionPacketIntakePreflightSource, 'reviewedDecisionPacketIntakePreflightSource'),
    ...missingFields(REQUIRED_PREFLIGHT_RESULT_FIELDS, input.reviewedDecisionPacketIntakePreflightResult, 'reviewedDecisionPacketIntakePreflightResult'),
    ...requirementsMissing,
    ...missingFields(REQUIRED_REFERENCE_ENVELOPE_FIELDS, input.reviewedDecisionPacketReferenceEnvelope, 'reviewedDecisionPacketReferenceEnvelope'),
    ...referencesMissing,
    ...missingFields(
      REQUIRED_REFERENCE_INTAKE_BOUNDARY_FIELDS,
      input.reviewedDecisionPacketReferenceIntakeBoundary,
      'reviewedDecisionPacketReferenceIntakeBoundary'
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
  if (computed.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_executed') {
    return {
      ...failure('plan_pack_evidence_material_reviewed_decision_packet_reference_intake_not_ready'),
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
    reviewedDecisionPacketReferenceIntakeExecuted: true,
    reviewedDecisionPacketReferenceIntakeEntries: buildReferenceIntakeEntries(
      input.reviewedDecisionPacketReferenceEnvelope.references
    ),
    sourceTaskId: 'CM-2069',
    sourceValidationId: 'CMV-2170',
    nextGate: 'await_reviewed_decision_packet_reference_review_boundary_before_acceptance_decision_or_material_acceptance',
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract
};
