'use strict';

const {
  REQUIRED_REVIEW_EVIDENCE_FIELDS
} = require('./PlanPackExternalReviewEvidenceBundleApplicationGate');

const CONTRACT_NAME = 'PlanPackExternalReviewEvidenceBundleApplicationReceiptContract';
const CONTRACT_MODE = 'local_phase9_phase10_external_review_bundle_application_receipt_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-external-review-bundle-application-receipt']);
const ALLOWED_DECISIONS = Object.freeze([
  'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch',
  'external_review_bundle_application_receipt_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'applicationGateResult',
  'applicationReceipt',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREREQUISITE_FIELDS = Object.freeze([
  'cm2026ExternalReviewEvidenceIntakeAccepted',
  'cm2033ReviewEvidenceBundleContractAccepted',
  'cm2034ApplicationPatchPreflightAccepted',
  'cm2047PatchHardenedBundleBindingPassed',
  'cm2048ReleaseTagExternalReviewChainBindingPassed',
  'cm2049ApplicationGateAccepted',
  'cm2024TraceMatrixRequiresExternalReviewEvidence',
  'phase9Phase10StillIncompleteBeforeReceipt'
]);

const REQUIRED_APPLICATION_GATE_RESULT_FIELDS = Object.freeze([
  'decision',
  'applicationGateAccepted',
  'requiredReviewEvidenceFields',
  'proposedCompletionAuditEvidence',
  'reviewBundleAppliedToCompletionAudit',
  'completionAuditPatchApplied',
  'currentPhase9Completed',
  'currentPhase10Completed',
  'fullPlanPackCompleted',
  'reviewEvidenceAcceptedByThisContract',
  'tagApprovalPacketAcceptedByThisContract',
  'defaultRuntimeExpanded',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'receiptContentRead',
  'realMemoryRead',
  'rawPrivateStateRead',
  'providerApiCalled',
  'durableMutationPerformed',
  'publicMcpExpanded',
  'readinessClaimed'
]);

const REQUIRED_APPLICATION_RECEIPT_FIELDS = Object.freeze([
  'receiptPrepared',
  'categoryOnly',
  'lowDisclosureOnly',
  'completionAuditPatchStillSeparate',
  'applicationReceiptAcceptedAsLocalContractOnly',
  'reviewBundleAppliedToCompletionAudit',
  'completionAuditPatchApplied',
  'phase9CompletionClaimed',
  'phase10CompletionClaimed',
  'defaultRuntimeExpansionClaimed',
  'tagReleaseActionClaimed',
  'localContractsAllowedToSatisfyExternalReview'
]);

const COUNTER_FIELDS = Object.freeze([
  'observationWindowsAccepted',
  'externalReviewsAccepted',
  'tagApprovalPacketsAccepted',
  'applicationReceiptsAccepted',
  'reviewBundleApplications',
  'completionAuditPatchApplications',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'defaultRuntimeExpansions',
  'providerApiCalls',
  'nativeReadAttempts',
  'nativeWriteAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'durableMutations',
  'publicMcpExpansions',
  'tagCreateActions',
  'tagPushActions',
  'releasePublishActions',
  'deployActions',
  'cutoverActions',
  'readinessClaims'
]);

const REQUIRED_GATE_DECISION =
  'external_review_bundle_application_gate_ready_for_future_completion_audit_patch';

const REQUIRED_COMPLETION_AUDIT_MARKER = Object.freeze({
  field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
  marker: 'requires_future_completion_audit_patch_application',
  acceptedAsCompletionEvidenceNow: false
});

const STOP_L4_TRUE_FIELDS = Object.freeze([
  ['applicationGateResult', 'reviewBundleAppliedToCompletionAudit'],
  ['applicationGateResult', 'completionAuditPatchApplied'],
  ['applicationGateResult', 'currentPhase9Completed'],
  ['applicationGateResult', 'currentPhase10Completed'],
  ['applicationGateResult', 'fullPlanPackCompleted'],
  ['applicationGateResult', 'reviewEvidenceAcceptedByThisContract'],
  ['applicationGateResult', 'tagApprovalPacketAcceptedByThisContract'],
  ['applicationGateResult', 'defaultRuntimeExpanded'],
  ['applicationGateResult', 'tagCreated'],
  ['applicationGateResult', 'releasePublished'],
  ['applicationGateResult', 'deploymentTriggered'],
  ['applicationGateResult', 'cutoverPerformed'],
  ['applicationGateResult', 'receiptContentRead'],
  ['applicationGateResult', 'realMemoryRead'],
  ['applicationGateResult', 'rawPrivateStateRead'],
  ['applicationGateResult', 'providerApiCalled'],
  ['applicationGateResult', 'durableMutationPerformed'],
  ['applicationGateResult', 'publicMcpExpanded'],
  ['applicationGateResult', 'readinessClaimed'],
  ['applicationReceipt', 'reviewBundleAppliedToCompletionAudit'],
  ['applicationReceipt', 'completionAuditPatchApplied'],
  ['applicationReceipt', 'phase9CompletionClaimed'],
  ['applicationReceipt', 'phase10CompletionClaimed'],
  ['applicationReceipt', 'defaultRuntimeExpansionClaimed'],
  ['applicationReceipt', 'tagReleaseActionClaimed'],
  ['applicationReceipt', 'localContractsAllowedToSatisfyExternalReview']
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'queryText',
  'query_text',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawRequest',
  'rawResponse',
  'rawOutput',
  'rawMemory',
  'memoryContent',
  'rawAudit',
  'rawJsonlRow',
  'rawSqliteRow',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'credential',
  'approvalLine',
  'approvalLineValue',
  'providerPayload',
  'runtimeCommand',
  'reviewTranscript',
  'reviewerIdentity',
  'tagApprovalLine',
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
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

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...collectUnexpectedKeys(
      input.applicationGateResult,
      REQUIRED_APPLICATION_GATE_RESULT_FIELDS,
      'applicationGateResult'
    ),
    ...collectUnexpectedKeys(input.applicationReceipt, REQUIRED_APPLICATION_RECEIPT_FIELDS, 'applicationReceipt'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
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

function missingTrueFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] !== true)
    .map(field => pathJoin(prefix, field));
}

function invalidFalseFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] !== false)
    .map(field => pathJoin(prefix, field));
}

function enabledStopFields(input) {
  return STOP_L4_TRUE_FIELDS
    .filter(([section, field]) => input[section][field] === true)
    .map(([section, field]) => `${section}.${field}`);
}

function markerMatches(actual) {
  return isPlainObject(actual) &&
    actual.field === REQUIRED_COMPLETION_AUDIT_MARKER.field &&
    actual.marker === REQUIRED_COMPLETION_AUDIT_MARKER.marker &&
    actual.acceptedAsCompletionEvidenceNow === false;
}

function hasRequiredCompletionAuditMarker(applicationGateResult) {
  return Array.isArray(applicationGateResult.proposedCompletionAuditEvidence) &&
    applicationGateResult.proposedCompletionAuditEvidence.length === 1 &&
    markerMatches(applicationGateResult.proposedCompletionAuditEvidence[0]);
}

function hasRequiredReviewEvidenceFields(applicationGateResult) {
  if (!Array.isArray(applicationGateResult.requiredReviewEvidenceFields)) return false;
  if (applicationGateResult.requiredReviewEvidenceFields.length !== REQUIRED_REVIEW_EVIDENCE_FIELDS.length) {
    return false;
  }
  return REQUIRED_REVIEW_EVIDENCE_FIELDS.every((field, index) =>
    applicationGateResult.requiredReviewEvidenceFields[index] === field
  );
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.applicationReceipt, [
      'receiptPrepared',
      'categoryOnly',
      'lowDisclosureOnly',
      'completionAuditPatchStillSeparate',
      'applicationReceiptAcceptedAsLocalContractOnly'
    ], 'applicationReceipt'),
    ...invalidFalseFields(input.applicationReceipt, [
      'reviewBundleAppliedToCompletionAudit',
      'completionAuditPatchApplied',
      'phase9CompletionClaimed',
      'phase10CompletionClaimed',
      'defaultRuntimeExpansionClaimed',
      'tagReleaseActionClaimed',
      'localContractsAllowedToSatisfyExternalReview'
    ], 'applicationReceipt')
  ];

  if (input.applicationGateResult.decision !== REQUIRED_GATE_DECISION) {
    blockers.push('applicationGateResult.decision');
  }
  if (input.applicationGateResult.applicationGateAccepted !== true) {
    blockers.push('applicationGateResult.applicationGateAccepted');
  }
  if (!hasRequiredReviewEvidenceFields(input.applicationGateResult)) {
    blockers.push('applicationGateResult.requiredReviewEvidenceFields');
  }
  if (!hasRequiredCompletionAuditMarker(input.applicationGateResult)) {
    blockers.push('applicationGateResult.proposedCompletionAuditEvidence');
  }

  if (blockers.length > 0) {
    return {
      decision: 'external_review_bundle_application_receipt_blocked',
      blockers
    };
  }

  return {
    decision: 'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch',
    blockers: []
  };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    applicationReceiptAccepted: false,
    reviewBundleAppliedToCompletionAudit: false,
    completionAuditPatchApplied: false,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    reviewEvidenceAcceptedByThisContract: false,
    tagApprovalPacketAcceptedByThisContract: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(REQUIRED_APPLICATION_GATE_RESULT_FIELDS, input.applicationGateResult, 'applicationGateResult'),
    ...missingFields(REQUIRED_APPLICATION_RECEIPT_FIELDS, input.applicationReceipt, 'applicationReceipt'),
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

  const accepted = computed.decision ===
    'external_review_bundle_application_receipt_ready_for_future_completion_audit_patch';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    applicationReceiptAccepted: accepted,
    localEvidenceField: accepted ? 'externalReviewEvidenceBundleApplicationReceiptPassed' : null,
    proposedCompletionAuditEvidence: accepted
      ? [{
        field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
        marker: 'requires_separate_future_completion_audit_patch_application',
        acceptedAsCompletionEvidenceNow: false
      }]
      : [],
    reviewBundleAppliedToCompletionAudit: false,
    completionAuditPatchApplied: false,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'await_exact_completion_audit_patch_application_before_phase9_phase10_completion'
      : 'repair_external_review_bundle_application_receipt',
    reviewEvidenceAcceptedByThisContract: false,
    tagApprovalPacketAcceptedByThisContract: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_APPLICATION_GATE_RESULT_FIELDS,
  REQUIRED_APPLICATION_RECEIPT_FIELDS,
  REQUIRED_PREREQUISITE_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceBundleApplicationReceipt
};
