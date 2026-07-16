'use strict';

const {
  CONTRACT_MODE: METADATA_GATE_CONTRACT_MODE,
  CONTRACT_NAME: METADATA_GATE_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: METADATA_GATE_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptanceDecisionPacketMetadataGateContract');
const {
  EXPECTED_ENTRY_METADATA
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReadinessGateContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_only';
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
  'decisionPacketMetadataSource',
  'decisionPacketMetadataResult',
  'reviewedDecisionPacketReadinessBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_METADATA_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'acceptanceDecisionPacketMetadataGatePrepared',
  'acceptanceDecisionPacketMetadataSlots',
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

const REQUIRED_METADATA_SLOT_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'acceptanceDecisionPacketRequired',
  'lowDisclosureDecisionMetadataRequired',
  'reviewedDecisionPacketRequired',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'decisionBodyAllowed',
  'decisionValueAllowed',
  'rawAuthorizationAllowed',
  'rawMaterialAllowed',
  'materialBodyAllowed',
  'materialValueAllowed',
  'canAcceptDecisionPacketNow',
  'canSubmitAcceptanceDecisionNow',
  'canMakeAcceptanceDecisionNow',
  'canAcceptEvidenceNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_READINESS_BOUNDARY_FIELDS = Object.freeze([
  'reviewedDecisionPacketReadinessGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'metadataGateResultOnly',
  'actualReviewedDecisionPacketStillRequired',
  'actualReviewedDecisionPacketAbsent',
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
  'local-plan-pack-evidence-material-reviewed-decision-packet-readiness-gate'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_prepared',
  'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...METADATA_GATE_FORBIDDEN_FIELD_NAMES,
  'reviewedAcceptanceDecisionPacket',
  'reviewedAcceptanceDecisionPacketPayload',
  'reviewedAcceptanceDecisionPacketBody',
  'reviewedAcceptanceDecisionPacketValue',
  'actualReviewedDecisionPacket',
  'actualReviewedDecisionPacketPayload',
  'actualReviewedDecisionPacketBody',
  'actualReviewedDecisionPacketValue',
  'decisionPacketPayload',
  'decisionPacketBody',
  'decisionPacketValue',
  'decisionText',
  'decisionValue',
  'acceptedDecisionPacket',
  'acceptedDecisionPacketPayload',
  'acceptedDecisionPacketBody',
  'acceptedDecisionPacketValue'
]);

const METADATA_RESULT_STOP_TRUE_FIELDS = Object.freeze([
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

const READINESS_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'reviewedDecisionPacketReadinessGatePrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'metadataGateResultOnly',
  'actualReviewedDecisionPacketStillRequired',
  'actualReviewedDecisionPacketAbsent',
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
  const slots = Array.isArray(input.decisionPacketMetadataResult &&
    input.decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots)
    ? input.decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.decisionPacketMetadataSource, REQUIRED_SOURCE_FIELDS, 'decisionPacketMetadataSource'),
    ...collectUnexpectedKeys(input.decisionPacketMetadataResult, REQUIRED_METADATA_RESULT_FIELDS, 'decisionPacketMetadataResult'),
    ...slots.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_METADATA_SLOT_FIELDS, `decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots[${index}]`)),
    ...collectUnexpectedKeys(
      input.reviewedDecisionPacketReadinessBoundary,
      REQUIRED_READINESS_BOUNDARY_FIELDS,
      'reviewedDecisionPacketReadinessBoundary'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2066',
    sourceValidationId: 'CMV-2167',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_decision_packet_metadata_gate_report.md',
    sourceContractName: METADATA_GATE_CONTRACT_NAME,
    sourceContractMode: METADATA_GATE_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `decisionPacketMetadataSource.${field}`);
}

function validateMetadataResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('decisionPacketMetadataResult.accepted');
  if (result.contractName !== METADATA_GATE_CONTRACT_NAME) blockers.push('decisionPacketMetadataResult.contractName');
  if (result.contractMode !== METADATA_GATE_CONTRACT_MODE) blockers.push('decisionPacketMetadataResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_acceptance_decision_packet_metadata_gate_prepared') {
    blockers.push('decisionPacketMetadataResult.decision');
  }
  if (result.acceptanceDecisionPacketMetadataGatePrepared !== true) {
    blockers.push('decisionPacketMetadataResult.acceptanceDecisionPacketMetadataGatePrepared');
  }
  if (result.sourceTaskId !== 'CM-2065') blockers.push('decisionPacketMetadataResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2166') blockers.push('decisionPacketMetadataResult.sourceValidationId');
  if (result.nextGate !== 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_any_acceptance') {
    blockers.push('decisionPacketMetadataResult.nextGate');
  }
  if (!Array.isArray(result.acceptanceDecisionPacketMetadataSlots) ||
    result.acceptanceDecisionPacketMetadataSlots.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots');
  }
  return blockers;
}

function validateMetadataSlots(slots) {
  if (!Array.isArray(slots)) return ['decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = slots[index];
    const prefix = `decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots[${index}]`;
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
    if (entry.lowDisclosureDecisionMetadataRequired !== true) {
      blockers.push(`${prefix}.lowDisclosureDecisionMetadataRequired`);
    }
    if (entry.reviewedDecisionPacketRequired !== true) blockers.push(`${prefix}.reviewedDecisionPacketRequired`);
    if (entry.categoryOnly !== true) blockers.push(`${prefix}.categoryOnly`);
    if (entry.bodyFree !== true) blockers.push(`${prefix}.bodyFree`);
    if (entry.valueFree !== true) blockers.push(`${prefix}.valueFree`);
    if (entry.decisionBodyAllowed !== false) blockers.push(`${prefix}.decisionBodyAllowed`);
    if (entry.decisionValueAllowed !== false) blockers.push(`${prefix}.decisionValueAllowed`);
    if (entry.rawAuthorizationAllowed !== false) blockers.push(`${prefix}.rawAuthorizationAllowed`);
    if (entry.rawMaterialAllowed !== false) blockers.push(`${prefix}.rawMaterialAllowed`);
    if (entry.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (entry.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
    if (entry.canAcceptDecisionPacketNow !== false) blockers.push(`${prefix}.canAcceptDecisionPacketNow`);
    if (entry.canSubmitAcceptanceDecisionNow !== false) blockers.push(`${prefix}.canSubmitAcceptanceDecisionNow`);
    if (entry.canMakeAcceptanceDecisionNow !== false) blockers.push(`${prefix}.canMakeAcceptanceDecisionNow`);
    if (entry.canAcceptEvidenceNow !== false) blockers.push(`${prefix}.canAcceptEvidenceNow`);
    if (entry.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
    if (entry.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (entry.acceptedAsCompletionEvidenceNow !== false) {
      blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
    }
  });
  return blockers;
}

function validateReadinessBoundary(boundary) {
  const requiredFalse = REQUIRED_READINESS_BOUNDARY_FIELDS
    .filter(field => !READINESS_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...READINESS_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `reviewedDecisionPacketReadinessBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `reviewedDecisionPacketReadinessBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const resultStops = METADATA_RESULT_STOP_TRUE_FIELDS
    .filter(field => input.decisionPacketMetadataResult[field] === true)
    .map(field => `decisionPacketMetadataResult.${field}`);
  const boundaryStops = REQUIRED_READINESS_BOUNDARY_FIELDS
    .filter(field => !READINESS_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.reviewedDecisionPacketReadinessBoundary[field] === true)
    .map(field => `reviewedDecisionPacketReadinessBoundary.${field}`);
  return [...resultStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.decisionPacketMetadataSource),
    ...validateMetadataResult(input.decisionPacketMetadataResult),
    ...validateMetadataSlots(input.decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots),
    ...validateReadinessBoundary(input.reviewedDecisionPacketReadinessBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_blocked', blockers };
  }
  return {
    decision: 'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_prepared',
    blockers: []
  };
}

function buildReviewedDecisionPacketReadinessChecklist(slots) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: `${expected.routeId}_reviewed_decision_packet_readiness`,
    sourceMetadataSlotId: slots[index].slotId,
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: slots[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    actualReviewedDecisionPacketRequired: true,
    lowDisclosureDecisionPacketRequired: true,
    categoryOnly: true,
    bodyFree: true,
    valueFree: true,
    actualReviewedDecisionPacketPresent: false,
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
    reviewedDecisionPacketReadinessGatePrepared: false,
    reviewedDecisionPacketReadinessChecklist: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReadinessGateContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_decision_packet_authorization_material_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const slotMissing = Array.isArray(input.decisionPacketMetadataResult &&
    input.decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots)
    ? input.decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots.flatMap((entry, index) =>
      missingFields(REQUIRED_METADATA_SLOT_FIELDS, entry, `decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots[${index}]`))
    : ['decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.decisionPacketMetadataSource, 'decisionPacketMetadataSource'),
    ...missingFields(REQUIRED_METADATA_RESULT_FIELDS, input.decisionPacketMetadataResult, 'decisionPacketMetadataResult'),
    ...slotMissing,
    ...missingFields(
      REQUIRED_READINESS_BOUNDARY_FIELDS,
      input.reviewedDecisionPacketReadinessBoundary,
      'reviewedDecisionPacketReadinessBoundary'
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
  if (computed.decision !== 'plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_prepared') {
    return {
      ...failure('plan_pack_evidence_material_reviewed_decision_packet_readiness_gate_not_ready'),
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
    reviewedDecisionPacketReadinessGatePrepared: true,
    reviewedDecisionPacketReadinessChecklist: buildReviewedDecisionPacketReadinessChecklist(
      input.decisionPacketMetadataResult.acceptanceDecisionPacketMetadataSlots
    ),
    sourceTaskId: 'CM-2066',
    sourceValidationId: 'CMV-2167',
    nextGate: 'await_actual_low_disclosure_reviewed_acceptance_decision_packet_before_packet_acceptance_or_evidence_acceptance',
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialReviewedDecisionPacketReadinessGateContract
};
