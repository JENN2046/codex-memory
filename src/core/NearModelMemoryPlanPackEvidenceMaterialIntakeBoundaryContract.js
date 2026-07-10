'use strict';

const {
  CONTRACT_MODE: PREFLIGHT_CONTRACT_MODE,
  CONTRACT_NAME: PREFLIGHT_CONTRACT_NAME,
  EXPECTED_ENTRY_METADATA,
  FORBIDDEN_FIELD_NAMES: PREFLIGHT_FORBIDDEN_FIELD_NAMES
} = require('./NearModelMemoryPlanPackEvidenceMaterialAcceptancePreflightContract');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract';
const CONTRACT_MODE = 'local_plan_pack_evidence_material_intake_boundary_only';
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
  'preflightSource',
  'preflightResult',
  'intakeBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREFLIGHT_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'acceptancePreflightPrepared',
  'acceptanceRequirements',
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

const REQUIRED_ACCEPTANCE_REQUIREMENT_FIELDS = Object.freeze([
  'slotId',
  'routeId',
  'sourceSection',
  'requestedItemCount',
  'requiredEvidenceKind',
  'requiredMetadataKind',
  'requiredAuthorizationKind',
  'requiredMaterialKind',
  'exactAuthorizationRequired',
  'lowDisclosureEvidenceMaterialRequired',
  'materialBodyAllowed',
  'materialValueAllowed',
  'canAcceptNow',
  'canApplyNow',
  'acceptedAsEvidenceNow',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_INTAKE_BOUNDARY_FIELDS = Object.freeze([
  'intakeBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'preflightResultOnly',
  'exactAuthorizationStillRequired',
  'lowDisclosureEvidenceMaterialStillRequired',
  'separateExactAuthorizationPacketRequired',
  'separateLowDisclosureMaterialPacketRequired',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'intakeAcceptanceDeferred',
  'evidenceAcceptanceDeferred',
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

const ALLOWED_MODES = Object.freeze(['local-plan-pack-evidence-material-intake-boundary']);
const ALLOWED_DECISIONS = Object.freeze([
  'plan_pack_evidence_material_intake_boundary_prepared',
  'plan_pack_evidence_material_intake_boundary_blocked',
  'stop_l4'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...PREFLIGHT_FORBIDDEN_FIELD_NAMES,
  'intakePayload',
  'intakeValue',
  'intakeBody',
  'authorizationPacket',
  'authorizationPayload',
  'authorizationValue',
  'authorizationText',
  'exactAuthorizationPacket',
  'exactAuthorizationPayload',
  'exactAuthorizationValue',
  'exactAuthorizationText',
  'lowDisclosureMaterialPayload',
  'lowDisclosureMaterialValue',
  'lowDisclosureMaterialBody',
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

const PREFLIGHT_STOP_TRUE_FIELDS = Object.freeze([
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
  'intakeBoundaryPrepared',
  'lowDisclosureOnly',
  'categoryOnly',
  'preflightResultOnly',
  'exactAuthorizationStillRequired',
  'lowDisclosureEvidenceMaterialStillRequired',
  'separateExactAuthorizationPacketRequired',
  'separateLowDisclosureMaterialPacketRequired',
  'rawAuthorizationAbsent',
  'rawMaterialAbsent',
  'materialBodyAbsent',
  'materialValuesAbsent',
  'intakeAcceptanceDeferred',
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
  const requirements = Array.isArray(input.preflightResult && input.preflightResult.acceptanceRequirements)
    ? input.preflightResult.acceptanceRequirements
    : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.preflightSource, REQUIRED_SOURCE_FIELDS, 'preflightSource'),
    ...collectUnexpectedKeys(input.preflightResult, REQUIRED_PREFLIGHT_RESULT_FIELDS, 'preflightResult'),
    ...requirements.flatMap((entry, index) =>
      collectUnexpectedKeys(entry, REQUIRED_ACCEPTANCE_REQUIREMENT_FIELDS, `preflightResult.acceptanceRequirements[${index}]`)),
    ...collectUnexpectedKeys(input.intakeBoundary, REQUIRED_INTAKE_BOUNDARY_FIELDS, 'intakeBoundary'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function validateSource(source) {
  const expected = {
    sourceTaskId: 'CM-2061',
    sourceValidationId: 'CMV-2162',
    sourceReport: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_preflight_report.md',
    sourceContractName: PREFLIGHT_CONTRACT_NAME,
    sourceContractMode: PREFLIGHT_CONTRACT_MODE
  };
  return Object.entries(expected)
    .filter(([field, value]) => source[field] !== value)
    .map(([field]) => `preflightSource.${field}`);
}

function validatePreflightResult(result) {
  const blockers = [];
  if (result.accepted !== true) blockers.push('preflightResult.accepted');
  if (result.contractName !== PREFLIGHT_CONTRACT_NAME) blockers.push('preflightResult.contractName');
  if (result.contractMode !== PREFLIGHT_CONTRACT_MODE) blockers.push('preflightResult.contractMode');
  if (result.decision !== 'plan_pack_evidence_material_acceptance_preflight_prepared') {
    blockers.push('preflightResult.decision');
  }
  if (result.acceptancePreflightPrepared !== true) blockers.push('preflightResult.acceptancePreflightPrepared');
  if (result.sourceTaskId !== 'CM-2060') blockers.push('preflightResult.sourceTaskId');
  if (result.sourceValidationId !== 'CMV-2161') blockers.push('preflightResult.sourceValidationId');
  if (result.nextGate !== 'await_separate_exact_authorization_packet_and_low_disclosure_evidence_material_before_acceptance') {
    blockers.push('preflightResult.nextGate');
  }
  if (!Array.isArray(result.acceptanceRequirements) ||
    result.acceptanceRequirements.length !== EXPECTED_ENTRY_METADATA.length) {
    blockers.push('preflightResult.acceptanceRequirements');
  }
  return blockers;
}

function validateAcceptanceRequirements(requirements) {
  if (!Array.isArray(requirements)) return ['preflightResult.acceptanceRequirements'];
  const blockers = [];
  EXPECTED_ENTRY_METADATA.forEach((expected, index) => {
    const entry = requirements[index];
    const prefix = `preflightResult.acceptanceRequirements[${index}]`;
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
    if (entry.exactAuthorizationRequired !== true) blockers.push(`${prefix}.exactAuthorizationRequired`);
    if (entry.lowDisclosureEvidenceMaterialRequired !== true) {
      blockers.push(`${prefix}.lowDisclosureEvidenceMaterialRequired`);
    }
    if (entry.materialBodyAllowed !== false) blockers.push(`${prefix}.materialBodyAllowed`);
    if (entry.materialValueAllowed !== false) blockers.push(`${prefix}.materialValueAllowed`);
    if (entry.canAcceptNow !== false) blockers.push(`${prefix}.canAcceptNow`);
    if (entry.canApplyNow !== false) blockers.push(`${prefix}.canApplyNow`);
    if (entry.acceptedAsEvidenceNow !== false) blockers.push(`${prefix}.acceptedAsEvidenceNow`);
    if (entry.acceptedAsCompletionEvidenceNow !== false) {
      blockers.push(`${prefix}.acceptedAsCompletionEvidenceNow`);
    }
  });
  return blockers;
}

function validateIntakeBoundary(boundary) {
  const requiredFalse = REQUIRED_INTAKE_BOUNDARY_FIELDS
    .filter(field => !INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field));
  return [
    ...INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS
      .filter(field => boundary[field] !== true)
      .map(field => `intakeBoundary.${field}`),
    ...requiredFalse
      .filter(field => boundary[field] !== false)
      .map(field => `intakeBoundary.${field}`)
  ];
}

function enabledStopFields(input) {
  const preflightStops = PREFLIGHT_STOP_TRUE_FIELDS
    .filter(field => input.preflightResult[field] === true)
    .map(field => `preflightResult.${field}`);
  const boundaryStops = REQUIRED_INTAKE_BOUNDARY_FIELDS
    .filter(field => !INTAKE_BOUNDARY_ALLOWED_TRUE_FIELDS.includes(field))
    .filter(field => input.intakeBoundary[field] === true)
    .map(field => `intakeBoundary.${field}`);
  return [...preflightStops, ...boundaryStops];
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateSource(input.preflightSource),
    ...validatePreflightResult(input.preflightResult),
    ...validateAcceptanceRequirements(input.preflightResult.acceptanceRequirements),
    ...validateIntakeBoundary(input.intakeBoundary)
  ];
  if (blockers.length > 0) {
    return { decision: 'plan_pack_evidence_material_intake_boundary_blocked', blockers };
  }
  return { decision: 'plan_pack_evidence_material_intake_boundary_prepared', blockers: [] };
}

function buildIntakeRequirements(requirements) {
  return EXPECTED_ENTRY_METADATA.map((expected, index) => ({
    slotId: expectedSlotId(expected.routeId),
    routeId: expected.routeId,
    sourceSection: expected.sourceSection,
    requestedItemCount: requirements[index].requestedItemCount,
    requiredEvidenceKind: expected.requiredEvidenceKind,
    requiredMetadataKind: expected.requiredMetadataKind,
    requiredAuthorizationKind: expected.requiredAuthorizationKind,
    requiredMaterialKind: expected.requiredMaterialKind,
    separateExactAuthorizationPacketRequired: true,
    separateLowDisclosureMaterialPacketRequired: true,
    intakeMetadataOnly: true,
    rawAuthorizationAllowed: false,
    rawMaterialAllowed: false,
    materialBodyAllowed: false,
    materialValueAllowed: false,
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
    materialIntakeBoundaryPrepared: false,
    intakeRequirements: [],
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

function evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_authorization_material_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const requirementMissing = Array.isArray(input.preflightResult && input.preflightResult.acceptanceRequirements)
    ? input.preflightResult.acceptanceRequirements.flatMap((entry, index) =>
      missingFields(REQUIRED_ACCEPTANCE_REQUIREMENT_FIELDS, entry, `preflightResult.acceptanceRequirements[${index}]`))
    : ['preflightResult.acceptanceRequirements'];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SOURCE_FIELDS, input.preflightSource, 'preflightSource'),
    ...missingFields(REQUIRED_PREFLIGHT_RESULT_FIELDS, input.preflightResult, 'preflightResult'),
    ...requirementMissing,
    ...missingFields(REQUIRED_INTAKE_BOUNDARY_FIELDS, input.intakeBoundary, 'intakeBoundary'),
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
  if (computed.decision !== 'plan_pack_evidence_material_intake_boundary_prepared') {
    return {
      ...failure('plan_pack_evidence_material_intake_boundary_not_ready'),
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
    materialIntakeBoundaryPrepared: true,
    intakeRequirements: buildIntakeRequirements(input.preflightResult.acceptanceRequirements),
    sourceTaskId: 'CM-2061',
    sourceValidationId: 'CMV-2162',
    nextGate: 'await_actual_exact_authorization_packet_and_low_disclosure_material_for_manual_review_before_acceptance',
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
  evaluateNearModelMemoryPlanPackEvidenceMaterialIntakeBoundaryContract
};
