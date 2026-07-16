'use strict';

const {
  CONTRACT_MODE: REFERENCE_INTAKE_CONTRACT_MODE,
  CONTRACT_NAME: REFERENCE_INTAKE_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: REFERENCE_INTAKE_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_only';
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
  'reviewedDecisionPacketReferenceIntakeSource',
  'reviewedDecisionPacketReferenceIntakeResult',
  'reviewedDecisionPacketReferenceReviewBoundary',
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

const REQUIRED_REFERENCE_INTAKE_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'reviewedDecisionPacketReferenceIntakeExecuted',
  'reviewedDecisionPacketReferenceIntakeEntries',
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

const REQUIRED_REFERENCE_INTAKE_ENTRY_FIELDS = Object.freeze([
  'intakeEntryId',
  'sourceReferenceId',
  'sourceRequirementId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'packetReferenceKind',
  'decisionSummaryKind',
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

const REQUIRED_REVIEW_BOUNDARY_FIELDS = Object.freeze([
  'reviewedDecisionPacketReferenceReviewBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'intakeResultConsumed',
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
  'local-plan-pack-evidence-material-reviewed-decision-packet-reference-review-boundary'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_prepared',
  'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...REFERENCE_INTAKE_FORBIDDEN_FIELD_NAMES,
  'reviewedDecisionPacketReviewBody',
  'reviewedDecisionPacketReviewValue',
  'reviewedDecisionPacketReviewTranscript',
  'reviewedDecisionPacketReviewDecision',
  'reviewedDecisionPacketReferenceReviewBody',
  'reviewedDecisionPacketReferenceReviewValue',
  'actualReferenceReviewPacket',
  'actualReferenceReviewPacketBody',
  'actualReferenceReviewPacketValue',
  'rawReferenceReview',
  'rawReferenceReviewBody',
  'rawReferenceReviewValue'
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

const REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'reviewedDecisionPacketReferenceReviewBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'referenceOnly',
  'intakeResultConsumed',
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
  const entries = Array.isArray(input.reviewedDecisionPacketReferenceIntakeResult &&
    input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries)
    ? input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.reviewedDecisionPacketReferenceIntakeSource, REQUIRED_SOURCE_FIELDS, 'reviewedDecisionPacketReferenceIntakeSource'),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReferenceIntakeResult,
      REQUIRED_REFERENCE_INTAKE_RESULT_FIELDS,
      'reviewedDecisionPacketReferenceIntakeResult'
    ),
    ...entries.flatMap((entry, index) =>
      collectUnexpectedKeys(
        entry,
        REQUIRED_REFERENCE_INTAKE_ENTRY_FIELDS,
        `reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[${index}]`
      )),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReferenceReviewBoundary,
      REQUIRED_REVIEW_BOUNDARY_FIELDS,
      'reviewedDecisionPacketReferenceReviewBoundary'
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
    if (field === 'reviewedDecisionPacketReferenceReviewEntries' ||
      field === 'reviewedDecisionPacketReferenceEntries') {
      return counters[field] !== EXPECTED_ENTRY_METADATA.length;
    }
    return counters[field] !== 0;
  });
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2070',
    sourceValidationId: 'CMV-2171',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_reference_intake_execution_report.md',
    sourceContractName: REFERENCE_INTAKE_CONTRACT_NAME,
    sourceContractMode: REFERENCE_INTAKE_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `reviewedDecisionPacketReferenceIntakeSource.${field}`);
}

function validateReferenceIntakeResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('reviewedDecisionPacketReferenceIntakeResult.accepted');
  if (result.contractName !== REFERENCE_INTAKE_CONTRACT_NAME) blockers.push('reviewedDecisionPacketReferenceIntakeResult.contractName');
  if (result.contractMode !== REFERENCE_INTAKE_CONTRACT_MODE) blockers.push('reviewedDecisionPacketReferenceIntakeResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_reference_intake_executed') {
    blockers.push('reviewedDecisionPacketReferenceIntakeResult.decision');
  }
  if (result.reviewedDecisionPacketReferenceIntakeExecuted !== true) {
    blockers.push('reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeExecuted');
  }
  if (result.sourceTaskId !== 'CM-2069') blockers.push('reviewedDecisionPacketReferenceIntakeResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2170') blockers.push('reviewedDecisionPacketReferenceIntakeResult.sourceValidationId');
  if (result.nextGate !== 'await_reviewed_decision_packet_reference_review_boundary_before_acceptance_decision_or_material_acceptance') {
    blockers.push('reviewedDecisionPacketReferenceIntakeResult.nextGate');
  }
  if (!Array.isArray(result.reviewedDecisionPacketReferenceIntakeEntries) ||
    result.reviewedDecisionPacketReferenceIntakeEntries.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries');
  }
  return blockers;
}

function validateReferenceIntakeEntries(entries) {
  if (!Array.isArray(entries)) {
    return ['reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries'];
  }
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = entries[index];
    const prefix = `reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    if (entry.intakeEntryId !== `${expected.routeId}_reviewed_decision_packet_reference_intake_entry`) blockers.push(`${prefix}.intakeEntryId`);
    if (entry.sourceReferenceId !== `${expected.routeId}_reviewed_decision_packet_reference`) blockers.push(`${prefix}.sourceReferenceId`);
    if (entry.sourceRequirementId !== `${expected.routeId}_reviewed_decision_packet_intake_requirement`) blockers.push(`${prefix}.sourceRequirementId`);
    if (entry.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (entry.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (entry.requestedItemCount !== EXPECTED_REQUESTED_ITEM_COUNTS_BY_ROUTE[expected.routeId]) {
      blockers.push(`${prefix}.requestedItemCount`);
    }
    if (entry.packetReferenceKind !== 'low_disclosure_reviewed_acceptance_decision_packet_reference') {
      blockers.push(`${prefix}.packetReferenceKind`);
    }
    if (entry.decisionSummaryKind !== 'low_disclosure_acceptance_decision_summary_reference') {
      blockers.push(`${prefix}.decisionSummaryKind`);
    }
    if (entry.referenceOnly !== true) blockers.push(`${prefix}.referenceOnly`);
    if (entry.categoryOnly !== true) blockers.push(`${prefix}.categoryOnly`);
    if (entry.bodyFree !== true) blockers.push(`${prefix}.bodyFree`);
    if (entry.valueFree !== true) blockers.push(`${prefix}.valueFree`);
    [
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
    ].forEach(field => {
      if (entry[field] !== false) blockers.push(`${prefix}.${field}`);
    });
  });
  return blockers;
}

function validateReviewBoundary(boundary) {
  const requiredFalse = REQUIRED_REVIEW_BOUNDARY_FIELDS
    .filter(field => !REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `reviewedDecisionPacketReferenceReviewBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `reviewedDecisionPacketReferenceReviewBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = RESULT_STOP_TRUE_FIELDS
    .filter(field => input.reviewedDecisionPacketReferenceIntakeResult[field] === true)
    .map(field => `reviewedDecisionPacketReferenceIntakeResult.${field}`);
  const boundaryStops = REQUIRED_REVIEW_BOUNDARY_FIELDS
    .filter(field => !REVIEW_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.reviewedDecisionPacketReferenceReviewBoundary[field] === true)
    .map(field => `reviewedDecisionPacketReferenceReviewBoundary.${field}`);
  const entryStops = Array.isArray(input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries)
    ? input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries.flatMap((entry, index) =>
      [
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
      ]
        .filter(field => entry[field] === true)
        .map(field => `reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[${index}].${field}`))
    : [];
  return [...resultStops, ...boundaryStops, ...entryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...invalidCounterValues(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.reviewedDecisionPacketReferenceIntakeSource),
    ...validateReferenceIntakeResult(input.reviewedDecisionPacketReferenceIntakeResult),
    ...validateReferenceIntakeEntries(input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries),
    ...validateReviewBoundary(input.reviewedDecisionPacketReferenceReviewBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_blocked', blockers };
  }
  return {
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_prepared',
    blockers: []
  };
}

function buildReferenceReviewChecklist(entries) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    reviewChecklistId: `${expected.routeId}_reviewed_decision_packet_reference_review_checklist`,
    sourceIntakeEntryId: entries[index].intakeEntryId,
    sourceReferenceId: entries[index].sourceReferenceId,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: entries[index].requestedItemCount,
    packetReferenceKind: 'low_disclosure_reviewed_acceptance_decision_packet_reference',
    decisionSummaryKind: 'low_disclosure_acceptance_decision_summary_reference',
    reviewBoundaryKind: 'reference_review_boundary_before_acceptance_decision',
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
    reviewedDecisionPacketReferenceReviewBoundaryPrepared: false,
    reviewedDecisionPacketReferenceReviewChecklist: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_reference_review_packet_authorization_material_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const entriesMissing = Array.isArray(input.reviewedDecisionPacketReferenceIntakeResult &&
    input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries)
    ? input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries.flatMap((entry, index) =>
      missingFields(
        REQUIRED_REFERENCE_INTAKE_ENTRY_FIELDS,
        entry,
        `reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries[${index}]`
      ))
    : ['reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.reviewedDecisionPacketReferenceIntakeSource, 'reviewedDecisionPacketReferenceIntakeSource'),
    ...missingFields(REQUIRED_REFERENCE_INTAKE_RESULT_FIELDS, input.reviewedDecisionPacketReferenceIntakeResult, 'reviewedDecisionPacketReferenceIntakeResult'),
    ...entriesMissing,
    ...missingFields(
      REQUIRED_REVIEW_BOUNDARY_FIELDS,
      input.reviewedDecisionPacketReferenceReviewBoundary,
      'reviewedDecisionPacketReferenceReviewBoundary'
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
  if (computed.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_prepared') {
    return {
      ...failure('plan_pack_evidence_material_reviewed_decision_packet_reference_review_boundary_not_ready'),
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
    reviewedDecisionPacketReferenceReviewBoundaryPrepared: true,
    reviewedDecisionPacketReferenceReviewChecklist: buildReferenceReviewChecklist(
      input.reviewedDecisionPacketReferenceIntakeResult.reviewedDecisionPacketReferenceIntakeEntries
    ),
    sourceTaskId: 'CM-2070',
    sourceValidationId: 'CMV-2171',
    nextGate: 'await_reference_reviewed_acceptance_decision_boundary_before_packet_or_material_acceptance',
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryContract
};
