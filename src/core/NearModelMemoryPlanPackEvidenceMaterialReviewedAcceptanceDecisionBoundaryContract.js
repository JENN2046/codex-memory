'use strict';

const {
  CONTRACT_MODE: REFERENCE_REVIEW_CONTRACT_MODE,
  CONTRACT_NAME: REFERENCE_REVIEW_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: REFERENCE_REVIEW_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_reviewed_acceptance_decision_boundary_only';
const SCHEMA_VERSION = 1;

const EXPECTED_REQUESTED_ITEM_COUNTS_BY_ROUTE = Object.freeze({
  phase2_exact_receipts_before_completion_audit_patch: 9,
  phase8_exact_receipts_before_completion_audit_patch: 9,
  phase9_phase10_external_review_before_completion_audit_patch: 6
});

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'reviewedDecisionPacketReferenceReviewSource',
  'reviewedDecisionPacketReferenceReviewResult',
  'reviewedAcceptanceDecisionBoundary',
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

const SIDE_EFFECT_FIELDS = Object.freeze([
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

const REQUIRED_REFERENCE_REVIEW_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'reviewedDecisionPacketReferenceReviewBoundaryPrepared',
  'reviewedDecisionPacketReferenceReviewChecklist',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
  ...SIDE_EFFECT_FIELDS
]);

const REQUIRED_REFERENCE_REVIEW_CHECKLIST_FIELDS = Object.freeze([
  'reviewChecklistId',
  'sourceIntakeEntryId',
  'sourceReferenceId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'packetReferenceKind',
  'decisionSummaryKind',
  'reviewBoundaryKind',
  'referenceOnly',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'actualReviewedDecisionPacketPresent',
  'reviewedDecisionPacketBodyPresent',
  'reviewedDecisionPacketValuePresent',
  'canAcceptDecisionPacketNow',
  'canSubmitAcceptanceDecisionNow',
  'canMakeAcceptanceDecisionNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_DECISION_BOUNDARY_FIELDS = Object.freeze([
  'reviewedAcceptanceDecisionBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'referenceReviewResultConsumed',
  'actualReviewedDecisionPacketStillAbsent',
  'reviewedDecisionPacketBodyAbsent',
  'reviewedDecisionPacketValueAbsent',
  'rawDecisionAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'packetAcceptanceDeferred',
  'acceptanceDecisionSubmissionDeferred',
  'acceptanceDecisionExecutionDeferred',
  'evidenceAcceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred',
  ...SIDE_EFFECT_FIELDS.filter(field => field !== 'fullPlanPackCompleted'),
  'phase2CompletionClaimed',
  'phase8CompletionClaimed',
  'phase9CompletionClaimed',
  'phase10CompletionClaimed',
  'fullPlanPackCompletionClaimed'
]);

const DECISION_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'reviewedAcceptanceDecisionBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'referenceReviewResultConsumed',
  'actualReviewedDecisionPacketStillAbsent',
  'reviewedDecisionPacketBodyAbsent',
  'reviewedDecisionPacketValueAbsent',
  'rawDecisionAbsent',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'packetAcceptanceDeferred',
  'acceptanceDecisionSubmissionDeferred',
  'acceptanceDecisionExecutionDeferred',
  'evidenceAcceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred'
]);

const COUNTER_FIELDS = Object.freeze([
  'reviewedAcceptanceDecisionBoundaryEntries',
  'reviewedDecisionPacketReferenceReviewEntries',
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
  'local-plan-pack-evidence-material-reviewed-acceptance-decision-boundary'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_prepared',
  'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...REFERENCE_REVIEW_FORBIDDEN_FIELD_NAMES,
  'reviewedAcceptanceDecisionBody',
  'reviewedAcceptanceDecisionValue',
  'reviewedAcceptanceDecisionTranscript',
  'actualAcceptanceDecisionPacket',
  'actualAcceptanceDecisionPacketBody',
  'actualAcceptanceDecisionPacketValue',
  'rawAcceptanceDecision',
  'rawAcceptanceDecisionBody',
  'rawAcceptanceDecisionValue'
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
  return required.filter(field => !hasOwn(actual, field)).map(field => pathJoin(prefix, field));
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
  const result = input.reviewedDecisionPacketReferenceReviewResult;
  const checklist = Array.isArray(result && result.reviewedDecisionPacketReferenceReviewChecklist)
    ? result.reviewedDecisionPacketReferenceReviewChecklist
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReferenceReviewSource,
      REQUIRED_SOURCE_FIELDS,
      'reviewedDecisionPacketReferenceReviewSource'
    ),
    ...collectUnexpectedKeys(
      result,
      REQUIRED_REFERENCE_REVIEW_RESULT_FIELDS,
      'reviewedDecisionPacketReferenceReviewResult'
    ),
    ...checklist.flatMap((entry, index) => collectUnexpectedKeys(
      entry,
      REQUIRED_REFERENCE_REVIEW_CHECKLIST_FIELDS,
      `reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[${index}]`
    )),
    ...collectUnexpectedKeys(
      input.reviewedAcceptanceDecisionBoundary,
      REQUIRED_DECISION_BOUNDARY_FIELDS,
      'reviewedAcceptanceDecisionBoundary'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2071',
    sourceValidationId: 'CMV-2172',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_reference_review_boundary_report.md',
    sourceContractName: REFERENCE_REVIEW_CONTRACT_NAME,
    sourceContractMode: REFERENCE_REVIEW_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `reviewedDecisionPacketReferenceReviewSource.${field}`);
}

function validateReferenceReviewResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('reviewedDecisionPacketReferenceReviewResult.accepted');
  if (result.contractName !== REFERENCE_REVIEW_CONTRACT_NAME) {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.contractName');
  }
  if (result.contractMode !== REFERENCE_REVIEW_CONTRACT_MODE) {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.contractMode');
  }
  if (result.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_prepared') {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.decision');
  }
  if (!Array.isArray(result.blockers) || result.blockers.length !== 0) {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.blockers');
  }
  if (result.reviewedDecisionPacketReferenceReviewBoundaryPrepared !== true) {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewBoundaryPrepared');
  }
  if (result.sourceTaskId !== 'CM-2070') blockers.push('reviewedDecisionPacketReferenceReviewResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2171') {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.sourceValidationId');
  }
  if (result.nextGate !== 'await_reference_reviewed_acceptance_decision_boundary_before_packet_or_material_acceptance') {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.nextGate');
  }
  if (!Array.isArray(result.reviewedDecisionPacketReferenceReviewChecklist) ||
    result.reviewedDecisionPacketReferenceReviewChecklist.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist');
  }
  SIDE_EFFECT_FIELDS.forEach(field => {
    if (result[field] !== false) blockers.push(`reviewedDecisionPacketReferenceReviewResult.${field}`);
  });
  return blockers;
}

function validateReferenceReviewChecklist(entries) {
  if (!Array.isArray(entries)) {
    return ['reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist'];
  }
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = entries[index];
    const prefix = `reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    const expectedValues = {
      reviewChecklistId: `${expected.routeId}_reviewed_decision_packet_reference_review_checklist`,
      sourceIntakeEntryId: `${expected.routeId}_reviewed_decision_packet_reference_intake_entry`,
      sourceReferenceId: `${expected.routeId}_reviewed_decision_packet_reference`,
      routeId: expected.routeId,
      sourceSection: expected.sourceSection,
      requestedItemCount: EXPECTED_REQUESTED_ITEM_COUNTS_BY_ROUTE[expected.routeId],
      packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
      decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
      reviewBoundaryKind: 'reference_review_boundary_before_acceptance_decision',
      referenceOnly: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true
    };
    Object.entries(expectedValues).forEach(([field, value]) => {
      if (entry[field] !== value) blockers.push(`${prefix}.${field}`);
    });
    REQUIRED_REFERENCE_REVIEW_CHECKLIST_FIELDS
      .filter(field => !Object.prototype.hasOwnProperty.call(expectedValues, field))
      .forEach(field => {
        if (entry[field] !== false) blockers.push(`${prefix}.${field}`);
      });
  });
  return blockers;
}

function validateDecisionBoundary(boundary) {
  const falseFields = REQUIRED_DECISION_BOUNDARY_FIELDS
    .filter(field => !DECISION_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...DECISION_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `reviewedAcceptanceDecisionBoundary.${field}`),
    ...falseFields
      .filter(field => boundary[field] !== false)
      .map(field => `reviewedAcceptanceDecisionBoundary.${field}`)
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function invalidCounterValues(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => {
    if (['reviewedAcceptanceDecisionBoundaryEntries', 'reviewedDecisionPacketReferenceReviewEntries',
      'reviewedDecisionPacketReferenceEntries'].includes(field)) {
      return counters[field] !== EXPECTED_ENTRY_METADATA.length;
    }
    return counters[field] !== 0;
  });
}

function enabledStopFields(input) {
  const result = input.reviewedDecisionPacketReferenceReviewResult;
  const resultStops = SIDE_EFFECT_FIELDS
    .filter(field => result[field] === true)
    .map(field => `reviewedDecisionPacketReferenceReviewResult.${field}`);
  const checklistStops = Array.isArray(result.reviewedDecisionPacketReferenceReviewChecklist)
    ? result.reviewedDecisionPacketReferenceReviewChecklist.flatMap((entry, index) => [
      'actualReviewedDecisionPacketPresent',
      'reviewedDecisionPacketBodyPresent',
      'reviewedDecisionPacketValuePresent',
      'canAcceptDecisionPacketNow',
      'canSubmitAcceptanceDecisionNow',
      'canMakeAcceptanceDecisionNow',
      'canAcceptEvidenceNow',
      'canApplyNow',
      'acceptedAsEvidenceNow',
      'acceptedAsCompletionEvidenceNow'
    ].filter(field => entry[field] === true).map(field =>
      `reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[${index}].${field}`))
    : [];
  const boundaryStops = REQUIRED_DECISION_BOUNDARY_FIELDS
    .filter(field => !DECISION_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.reviewedAcceptanceDecisionBoundary[field] === true)
    .map(field => `reviewedAcceptanceDecisionBoundary.${field}`);
  return [...resultStops, ...checklistStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...invalidCounterValues(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };
  const blockers = [
    ...validateSource(input.reviewedDecisionPacketReferenceReviewSource),
    ...validateReferenceReviewResult(input.reviewedDecisionPacketReferenceReviewResult),
    ...validateReferenceReviewChecklist(
      input.reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist
    ),
    ...validateDecisionBoundary(input.reviewedAcceptanceDecisionBoundary)
  ];
  if (blockers.length > 0) {
    return {
      decision: 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_blocked',
      blockers
    };
  }
  return {
    decision: 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_prepared',
    blockers: []
  };
}

function buildDecisionBoundaryChecklist(entries) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    decisionBoundaryChecklistId: `${expected.routeId}_reviewed_acceptance_decision_boundary_checklist`,
    sourceReviewChecklistId: entries[index].reviewChecklistId,
    sourceReferenceId: entries[index].sourceReferenceId,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: entries[index].requestedItemCount,
    decisionBoundaryKind: 'reviewed_acceptance_decision_boundary_before_packet_or_material_acceptance',
    referenceOnly: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    packetAcceptanceDeferred: true,
    acceptanceDecisionSubmissionDeferred: true,
    acceptanceDecisionExecutionDeferred: true,
    evidenceAcceptanceDeferred: true,
    applicationDeferred: true,
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
    reviewedAcceptanceDecisionBoundaryPrepared: false,
    reviewedAcceptanceDecisionBoundaryChecklist: [],
    ...Object.fromEntries(SIDE_EFFECT_FIELDS.map(field => [field, false])),
    ...extras
  };
}

function evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_acceptance_decision_packet_authorization_material_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const result = input.reviewedDecisionPacketReferenceReviewResult;
  const entriesMissing = Array.isArray(result && result.reviewedDecisionPacketReferenceReviewChecklist)
    ? result.reviewedDecisionPacketReferenceReviewChecklist.flatMap((entry, index) => missingFields(
      REQUIRED_REFERENCE_REVIEW_CHECKLIST_FIELDS,
      entry,
      `reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist[${index}]`
    ))
    : ['reviewedDecisionPacketReferenceReviewResult.reviewedDecisionPacketReferenceReviewChecklist'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(
      REQUIRED_SOURCE_FIELDS,
      input.reviewedDecisionPacketReferenceReviewSource,
      'reviewedDecisionPacketReferenceReviewSource'
    ),
    ...missingFields(
      REQUIRED_REFERENCE_REVIEW_RESULT_FIELDS,
      result,
      'reviewedDecisionPacketReferenceReviewResult'
    ),
    ...entriesMissing,
    ...missingFields(
      REQUIRED_DECISION_BOUNDARY_FIELDS,
      input.reviewedAcceptanceDecisionBoundary,
      'reviewedAcceptanceDecisionBoundary'
    ),
    ...missingFields(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) return failure('missing_required_fields', { missingFields: missing });

  const unexpectedFields = collectUnexpectedFields(input);
  if (unexpectedFields.length > 0) return failure('unexpected_fields', { unexpectedFields });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.taskId !== 'CM-2072') return failure('invalid_task_id');
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
  if (computed.decision !== 'plan_pack_evidence_material_reviewed_acceptance_decision_boundary_prepared') {
    return {
      ...failure('plan_pack_evidence_material_reviewed_acceptance_decision_boundary_not_ready'),
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
    reviewedAcceptanceDecisionBoundaryPrepared: true,
    reviewedAcceptanceDecisionBoundaryChecklist: buildDecisionBoundaryChecklist(
      result.reviewedDecisionPacketReferenceReviewChecklist
    ),
    sourceTaskId: 'CM-2071',
    sourceValidationId: 'CMV-2172',
    nextGate: 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_packet_or_material_acceptance',
    ...Object.fromEntries(SIDE_EFFECT_FIELDS.map(field => [field, false]))
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedAcceptanceDecisionBoundaryContract
};
