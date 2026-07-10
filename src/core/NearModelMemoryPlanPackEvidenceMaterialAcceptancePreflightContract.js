'use strict';

const {
  CONTRACT_MODE: METADATA_PACKET_CONTRACT_MODE,
  CONTRACT_NAME: METADATA_PACKET_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: METADATA_PACKET_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_acceptance_preflight_only';
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
  'metadataPacketSource',
  'metadataPacketResult',
  'acceptanceBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PACKET_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'metadataPacketValidated',
  'materialMetadataEntries',
  'sourceTaskId',
  'sourceValidationId',
  'nextGate',
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

const REQUIRED_METADATA_ENTRY_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requestedItemCount',
  'lowDisclosureOnly',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow',
  'canApplyNow'
]);

const REQUIRED_ACCEPTANCE_BOUNDARY_FIELDS = Object.freeze([
  'acceptancePreflightPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'metadataPacketOnly',
  'exactAuthorizationRequired',
  'lowDisclosureEvidenceMaterialRequired',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'acceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-acceptance-preflight']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_acceptance_preflight_prepared',
  'plan_pack_evidence_material_acceptance_preflight_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...METADATA_PACKET_FORBIDDEN_FIELD_NAMES,
  'authorizationPacket',
  'authorizationPayload',
  'authorizationValue',
  'authorizationText',
  'exactAuthorizationPacket',
  'exactAuthorizationPayload',
  'exactAuthorizationValue',
  'exactAuthorizationText',
  'evidenceMaterialPacket',
  'evidenceMaterialPayload',
  'evidenceMaterialValue',
  'evidenceMaterialBody',
  'materialReceipt',
  'materialReview',
  'materialTagApproval',
  'approvalReceipt',
  'approvalText',
  'approvalRaw'
]);

const PACKET_STOP_TRUE_FIELDS = Object.freeze([
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

const ACCEPTANCE_BOUNDARY_ALLOWED_TRUE_FIELDS = Object.freeze([
  'acceptancePreflightPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'metadataPacketOnly',
  'exactAuthorizationRequired',
  'lowDisclosureEvidenceMaterialRequired',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'acceptanceDeferred',
  'applicationDeferred',
  'completionAuditPatchDeferred'
]);

const EXPECTED_ENTRY_METADATA = Object.freeze([
  {
    routeId: 'phase2_exact_receipts_before_completion_audit_patch',
    sourceSection: 'phase2ExactReceiptRequests',
    requiredEvidenceKind: 'future_exact_authorized_receipt',
    requiredMetadataKind: 'low_disclosure_phase2_exact_receipt_metadata',
    requiredAuthorizationKind: 'future_phase2_exact_authorization_packet',
    requiredMaterialKind: 'future_low_disclosure_phase2_exact_receipt_material'
  },
  {
    routeId: 'phase8_exact_receipts_before_completion_audit_patch',
    sourceSection: 'phase8ExactReceiptRequests',
    requiredEvidenceKind: 'future_exact_authorized_receipt',
    requiredMetadataKind: 'low_disclosure_phase8_exact_receipt_metadata',
    requiredAuthorizationKind: 'future_phase8_exact_authorization_packet',
    requiredMaterialKind: 'future_low_disclosure_phase8_exact_receipt_material'
  },
  {
    routeId: 'phase9_phase10_external_review_before_completion_audit_patch',
    sourceSection: 'phase9Phase10ExternalReviewRequests',
    requiredEvidenceKind: 'future_external_review_or_tag_approval_packet',
    requiredMetadataKind: 'low_disclosure_external_review_or_tag_approval_metadata',
    requiredAuthorizationKind: 'future_phase9_phase10_review_or_tag_approval_authorization_packet',
    requiredMaterialKind: 'future_low_disclosure_external_review_or_tag_approval_material'
  }
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
  const entries = Array.isArray(input.metadataPacketResult && input.metadataPacketResult.materialMetadataEntries)
    ? input.metadataPacketResult.materialMetadataEntries
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.metadataPacketSource, REQUIRED_SOURCE_FIELDS, 'metadataPacketSource'),
    ...collectUnexpectedKeys(input.metadataPacketResult, REQUIRED_PACKET_RESULT_FIELDS, 'metadataPacketResult'),
    ...entries.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_METADATA_ENTRY_FIELDS, `metadataPacketResult.materialMetadataEntries[${index}]`)),
    ...collectUnexpectedKeys(input.acceptanceBoundary, REQUIRED_ACCEPTANCE_BOUNDARY_FIELDS, 'acceptanceBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2060',
    sourceValidationId: 'CMV-2161',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_metadata_packet_report.md',
    sourceContractName: METADATA_PACKET_CONTRACT_NAME,
    sourceContractMode: METADATA_PACKET_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `metadataPacketSource.${field}`);
}

function validatePacketResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('metadataPacketResult.accepted');
  if (result.contractName !== METADATA_PACKET_CONTRACT_NAME) blockers.push('metadataPacketResult.contractName');
  if (result.contractMode !== METADATA_PACKET_CONTRACT_MODE) blockers.push('metadataPacketResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_metadata_packet_validated') {
    blockers.push('metadataPacketResult.decision');
  }
  if (result.metadataPacketValidated !== true) blockers.push('metadataPacketResult.metadataPacketValidated');
  if (result.sourceTaskId !== 'CM-2059') blockers.push('metadataPacketResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2160') blockers.push('metadataPacketResult.sourceValidationId');
  if (result.nextGate !== 'await_separate_exact_authorization_and_low_disclosure_evidence_material_before_acceptance_or_application') {
    blockers.push('metadataPacketResult.nextGate');
  }
  if (!Array.isArray(result.materialMetadataEntries) ||
    result.materialMetadataEntries.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('metadataPacketResult.materialMetadataEntries');
  }
  return blockers;
}

function validateMaterialMetadataEntries(entries) {
  if (!Array.isArray(entries)) return ['metadataPacketResult.materialMetadataEntries'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = entries[index];
    const prefix = `metadataPacketResult.materialMetadataEntries[${index}]`;
    if (!isPlainObject(entry)) {
      blockers.push(prefix);
      return;
    }
    if (entry.slotId !== expectedSlotId(expected.routeId)) blockers.push(`${prefix}.slotId`);
    if (entry.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (entry.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (entry.requiredEvidenceKind !== expected.requiredEvidenceKind) {
      blockers.push(`${prefix}.requiredEvidenceKind`);
    }
    if (entry.requiredMetadataKind !== expected.requiredMetadataKind) {
      blockers.push(`${prefix}.requiredMetadataKind`);
    }
    if (!Number.isInteger(entry.requestedItemCount) || entry.requestedItemCount < 1) {
      blockers.push(`${prefix}.requestedItemCount`);
    }
    if (entry.lowDisclosureOnly !== true) blockers.push(`${prefix}.lowDisclosureOnly`);
    if (entry.categoryOnly !== true) blockers.push(`${prefix}.categoryOnly`);
    if (entry.bodyFree !== true) blockers.push(`${prefix}.bodyFree`);
    if (entry.valueFree !== true) blockers.push(`${prefix}.valueFree`);
    if (entry.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (entry.acceptedAsCompletionEvidenceNow !== false) {
      blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
    }
    if (entry.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
  });
  return blockers;
}

function validateAcceptanceBoundary(boundary) {
  const requiredFalse = REQUIRED_ACCEPTANCE_BOUNDARY_FIELDS
    .filter(field => !ACCEPTANCE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...ACCEPTANCE_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `acceptanceBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `acceptanceBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const packetStops = PACKET_STOP_TRUE_FIELDS
    .filter(field => input.metadataPacketResult[field] === true)
    .map(field => `metadataPacketResult.${field}`);
  const boundaryStops = REQUIRED_ACCEPTANCE_BOUNDARY_FIELDS
    .filter(field => !ACCEPTANCE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.acceptanceBoundary[field] === true)
    .map(field => `acceptanceBoundary.${field}`);
  return [...packetStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.metadataPacketSource),
    ...validatePacketResult(input.metadataPacketResult),
    ...validateMaterialMetadataEntries(input.metadataPacketResult.materialMetadataEntries),
    ...validateAcceptanceBoundary(input.acceptanceBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_acceptance_preflight_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_acceptance_preflight_prepared', blockers: [] };
}

function buildAcceptanceRequirements(entries) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: expectedSlotId(expected.routeId),
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: entries[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    exactAuthorizationRequired: true,
    lowDisclosureEvidenceMaterialRequired: true,
    materialBodyAllowed: false,
    materialValueAllowed: false,
    canAcceptNow: false,
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
    acceptancePreflightPrepared: false,
    acceptanceRequirements: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_authorization_material_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const entryMissing = Array.isArray(input.metadataPacketResult && input.metadataPacketResult.materialMetadataEntries)
    ? input.metadataPacketResult.materialMetadataEntries.flatMap((entry, index) =>
      missingFields(REQUIRED_METADATA_ENTRY_FIELDS, entry, `metadataPacketResult.materialMetadataEntries[${index}]`))
    : ['metadataPacketResult.materialMetadataEntries'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.metadataPacketSource, 'metadataPacketSource'),
    ...missingFields(REQUIRED_PACKET_RESULT_FIELDS, input.metadataPacketResult, 'metadataPacketResult'),
    ...entryMissing,
    ...missingFields(REQUIRED_ACCEPTANCE_BOUNDARY_FIELDS, input.acceptanceBoundary, 'acceptanceBoundary'),
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
  if (computed.decision !== 'plan_pack_evidence_material_acceptance_preflight_prepared') {
    return {
      ...failure('plan_pack_evidence_material_acceptance_preflight_not_ready'),
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
    acceptancePreflightPrepared: true,
    acceptanceRequirements: buildAcceptanceRequirements(input.metadataPacketResult.materialMetadataEntries),
    sourceTaskId: 'CM-2060',
    sourceValidationId: 'CMV-2161',
    nextGate: 'await_separate_exact_authorization_packet_and_low_disclosure_evidence_material_before_acceptance',
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
  EXPECTED_ENTRY_METADATA,
  FORBIDDEN_FIELD_NAMES,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract
};
