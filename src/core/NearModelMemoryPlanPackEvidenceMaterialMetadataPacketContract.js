'use strict';

const {
  CONTRACT_MODE: METADATA_GATE_CONTRACT_MODE,
  CONTRACT_NAME: METADATA_GATE_CONTRACT_NAME,
  EXPECTED_ROUTES,
  FORBIDDEN_FIELD_NAMES: METADATA_GATE_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialMetadataGateContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_metadata_packet_only';
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
  'metadataGateSource',
  'metadataGateResult',
  'metadataPacket',
  'expectedDecision',
  'counters'
]);

const REQUIRED_GATE_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'metadataGatePrepared',
  'materialMetadataSlots',
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

const REQUIRED_GATE_SLOT_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'lowDisclosureOnly',
  'categoryOnly',
  'materialBodyAllowed',
  'materialValueAllowed',
  'canAcceptMaterialNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'packetId',
  'sourceTaskId',
  'sourceValidationId',
  'lowDisclosureOnly',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'metadataOnly',
  'exactAuthorizationStillRequired',
  'separateEvidenceMaterialRequired',
  'materialAcceptanceAllowed',
  'evidenceApplicationAllowed',
  'completionAuditPatchAllowed',
  'phaseCompletionAllowed',
  'readinessClaimAllowed',
  'metadataEntries'
]);

const REQUIRED_PACKET_ENTRY_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'metadataFamily',
  'requestedItemCount',
  'lowDisclosureOnly',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'materialBodyPresent',
  'materialValuePresent',
  'canAcceptMaterialNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow',
  'canApplyNow'
]);

const COUNTER_FIELDS = Object.freeze([
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-metadata-packet']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_metadata_packet_validated',
  'plan_pack_evidence_material_metadata_packet_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...METADATA_GATE_FORBIDDEN_FIELD_NAMES,
  'materialBody',
  'materialValue',
  'materialContent',
  'evidenceBody',
  'evidenceValue',
  'evidencePayload',
  'receiptRaw',
  'reviewRaw',
  'tagApprovalRaw',
  'nativeOutput',
  'nativeReceiptValue',
  'externalReviewText',
  'operatorApprovalText'
]);

const GATE_STOP_TRUE_FIELDS = Object.freeze([
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

const PACKET_REQUIRED_TRUE_FIELDS = Object.freeze([
  'lowDisclosureOnly',
  'categoryOnly',
  'bodyFree',
  'valueFree',
  'metadataOnly',
  'exactAuthorizationStillRequired',
  'separateEvidenceMaterialRequired'
]);

const PACKET_REQUIRED_FALSE_FIELDS = Object.freeze([
  'materialAcceptanceAllowed',
  'evidenceApplicationAllowed',
  'completionAuditPatchAllowed',
  'phaseCompletionAllowed',
  'readinessClaimAllowed'
]);

const ENTRY_REQUIRED_TRUE_FIELDS = Object.freeze([
  'lowDisclosureOnly',
  'categoryOnly',
  'bodyFree',
  'valueFree'
]);

const ENTRY_REQUIRED_FALSE_FIELDS = Object.freeze([
  'materialBodyPresent',
  'materialValuePresent',
  'canAcceptMaterialNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow',
  'canApplyNow'
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
  const gateSlots = Array.isArray(input.metadataGateResult && input.metadataGateResult.materialMetadataSlots)
    ? input.metadataGateResult.materialMetadataSlots
    : [];
  const packetEntries = Array.isArray(input.metadataPacket && input.metadataPacket.metadataEntries)
    ? input.metadataPacket.metadataEntries
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.metadataGateSource, REQUIRED_SOURCE_FIELDS, 'metadataGateSource'),
    ...collectUnexpectedKeys(input.metadataGateResult, REQUIRED_GATE_RESULT_FIELDS, 'metadataGateResult'),
    ...gateSlots.flatMap((slot, index) =>
      collectUnexpectedKeys(slot, REQUIRED_GATE_SLOT_FIELDS, `metadataGateResult.materialMetadataSlots[${index}]`)),
    ...collectUnexpectedKeys(input.metadataPacket, REQUIRED_PACKET_FIELDS, 'metadataPacket'),
    ...packetEntries.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_PACKET_ENTRY_FIELDS, `metadataPacket.metadataEntries[${index}]`)),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2059',
    sourceValidationId: 'CMV-2160',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_metadata_gate_report.md',
    sourceContractName: METADATA_GATE_CONTRACT_NAME,
    sourceContractMode: METADATA_GATE_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `metadataGateSource.${field}`);
}

function validateGateResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('metadataGateResult.accepted');
  if (result.contractName !== METADATA_GATE_CONTRACT_NAME) blockers.push('metadataGateResult.contractName');
  if (result.contractMode !== METADATA_GATE_CONTRACT_MODE) blockers.push('metadataGateResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_metadata_gate_prepared') {
    blockers.push('metadataGateResult.decision');
  }
  if (result.metadataGatePrepared !== true) blockers.push('metadataGateResult.metadataGatePrepared');
  if (result.sourceTaskId !== 'CM-2058') blockers.push('metadataGateResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2159') blockers.push('metadataGateResult.sourceValidationId');
  if (result.nextGate !== 'await_separate_low_disclosure_evidence_material_metadata_before_any_acceptance_or_application') {
    blockers.push('metadataGateResult.nextGate');
  }
  if (!Array.isArray(result.materialMetadataSlots) ||
    result.materialMetadataSlots.length !== EXPECTED_ROUTES.length) {
    blockers.push('metadataGateResult.materialMetadataSlots');
  }
  return blockers;
}

function validateGateSlots(slots) {
  if (!Array.isArray(slots)) return ['metadataGateResult.materialMetadataSlots'];
  const blockers = [];
  EXPECTED_ROUTES.forEach((expected, index) => {
    const slot = slots[index];
    const prefix = `metadataGateResult.materialMetadataSlots[${index}]`;
    if (!isPlainObject(slot)) {
      blockers.push(prefix);
      return;
    }
    if (slot.slotId !== expectedSlotId(expected.routeId)) blockers.push(`${prefix}.slotId`);
    if (slot.routeId !== expected.routeId) blockers.push(`${prefix}.routeId`);
    if (slot.sourceSection !== expected.sourceSection) blockers.push(`${prefix}.sourceSection`);
    if (!Number.isInteger(slot.requestedItemCount) || slot.requestedItemCount < 1) {
      blockers.push(`${prefix}.requestedItemCount`);
    }
    if (slot.requiredEvidenceKind !== expected.requiredEvidenceKind) {
      blockers.push(`${prefix}.requiredEvidenceKind`);
    }
    if (slot.requiredMetadataKind !== expected.metadataKind) blockers.push(`${prefix}.requiredMetadataKind`);
    if (slot.lowDisclosureOnly !== true) blockers.push(`${prefix}.lowDisclosureOnly`);
    if (slot.categoryOnly !== true) blockers.push(`${prefix}.categoryOnly`);
    if (slot.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (slot.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
    if (slot.canAcceptMaterialNow !== false) blockers.push(`${prefix}.canAcceptMaterialNow`);
    if (slot.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (slot.acceptedAsCompletionEvidenceNow !== false) {
      blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
    }
  });
  return blockers;
}

function validatePacket(packet) {
  const blockers = [];
  if (packet.packetId !== 'cm-2060-evidence-material-metadata-packet') {
    blockers.push('metadataPacket.packetId');
  }
  if (packet.sourceTaskId !== 'CM-2059') blockers.push('metadataPacket.sourceTaskId');
  if (packet.sourceValidationId !== 'CMV-2160') blockers.push('metadataPacket.sourceValidationId');
  for (const field of PACKET_REQUIRED_TRUE_FIELDS) {
    if (packet[field] !== true) blockers.push(`metadataPacket.${field}`);
  }
  for (const field of PACKET_REQUIRED_FALSE_FIELDS) {
    if (packet[field] !== false) blockers.push(`metadataPacket.${field}`);
  }
  if (!Array.isArray(packet.metadataEntries) ||
    packet.metadataEntries.length !== EXPECTED_ROUTES.length) {
    blockers.push('metadataPacket.metadataEntries');
  }
  return blockers;
}

function validatePacketEntries(entries, gateSlots) {
  if (!Array.isArray(entries)) return ['metadataPacket.metadataEntries'];
  const blockers = [];
  EXPECTED_ROUTES.forEach((expected, index) => {
    const entry = entries[index];
    const gateSlot = Array.isArray(gateSlots) ? gateSlots[index] : null;
    const prefix = `metadataPacket.metadataEntries[${index}]`;
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
    if (entry.requiredMetadataKind !== expected.metadataKind) blockers.push(`${prefix}.requiredMetadataKind`);
    if (entry.metadataFamily !== expected.metadataKind) blockers.push(`${prefix}.metadataFamily`);
    const expectedCount = isPlainObject(gateSlot) ? gateSlot.requestedItemCount : undefined;
    if (entry.requestedItemCount !== expectedCount) blockers.push(`${prefix}.requestedItemCount`);
    for (const field of ENTRY_REQUIRED_TRUE_FIELDS) {
      if (entry[field] !== true) blockers.push(`${prefix}.${field}`);
    }
    for (const field of ENTRY_REQUIRED_FALSE_FIELDS) {
      if (entry[field] !== false) blockers.push(`${prefix}.${field}`);
    }
  });
  return blockers;
}

function enabledStopFields(input) {
  const gateStops = GATE_STOP_TRUE_FIELDS
    .filter(field => input.metadataGateResult[field] === true)
    .map(field => `metadataGateResult.${field}`);
  const packetStops = PACKET_REQUIRED_FALSE_FIELDS
    .filter(field => input.metadataPacket[field] === true)
    .map(field => `metadataPacket.${field}`);
  const entryStops = Array.isArray(input.metadataPacket.metadataEntries)
    ? input.metadataPacket.metadataEntries.flatMap((entry, index) =>
      ENTRY_REQUIRED_FALSE_FIELDS
        .filter(field => entry[field] === true)
        .map(field => `metadataPacket.metadataEntries[${index}].${field}`))
    : [];
  return [...gateStops, ...packetStops, ...entryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.metadataGateSource),
    ...validateGateResult(input.metadataGateResult),
    ...validateGateSlots(input.metadataGateResult.materialMetadataSlots),
    ...validatePacket(input.metadataPacket),
    ...validatePacketEntries(input.metadataPacket.metadataEntries, input.metadataGateResult.materialMetadataSlots)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_metadata_packet_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_metadata_packet_validated', blockers: [] };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    metadataPacketValidated: false,
    materialMetadataEntries: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_material_or_overclaim_fields', { forbiddenFields });
  }

  const gateSlotMissing = Array.isArray(input.metadataGateResult && input.metadataGateResult.materialMetadataSlots)
    ? input.metadataGateResult.materialMetadataSlots.flatMap((slot, index) =>
      missingFields(REQUIRED_GATE_SLOT_FIELDS, slot, `metadataGateResult.materialMetadataSlots[${index}]`))
    : ['metadataGateResult.materialMetadataSlots'];
  const packetEntryMissing = Array.isArray(input.metadataPacket && input.metadataPacket.metadataEntries)
    ? input.metadataPacket.metadataEntries.flatMap((entry, index) =>
      missingFields(REQUIRED_PACKET_ENTRY_FIELDS, entry, `metadataPacket.metadataEntries[${index}]`))
    : ['metadataPacket.metadataEntries'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.metadataGateSource, 'metadataGateSource'),
    ...missingFields(REQUIRED_GATE_RESULT_FIELDS, input.metadataGateResult, 'metadataGateResult'),
    ...gateSlotMissing,
    ...missingFields(REQUIRED_PACKET_FIELDS, input.metadataPacket, 'metadataPacket'),
    ...packetEntryMissing,
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
  if (computed.decision !== 'plan_pack_evidence_material_metadata_packet_validated') {
    return {
      ...failure('plan_pack_evidence_material_metadata_packet_not_ready'),
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
    metadataPacketValidated: true,
    materialMetadataEntries: input.metadataPacket.metadataEntries.map(entry => ({
      slotId: entry.slotId,
      routeId: entry.routeId,
      sourceSection: entry.sourceSection,
      requiredEvidenceKind: entry.requiredEvidenceKind,
      requiredMetadataKind: entry.requiredMetadataKind,
      requestedItemCount: entry.requestedItemCount,
      lowDisclosureOnly: true,
      categoryOnly: true,
      bodyFree: true,
      valueFree: true,
      acceptedAsEvidenceNow: false,
      acceptedAsCompletionEvidenceNow: false,
      canApplyNow: false
    })),
    sourceTaskId: 'CM-2059',
    sourceValidationId: 'CMV-2160',
    nextGate: 'await_separate_exact_authorization_and_low_disclosure_evidence_material_before_acceptance_or_application',
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
  REQUIRED_PACKET_ENTRY_FIELDS,
  REQUIRED_PACKET_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceMaterialMetadataPacketContract
};
