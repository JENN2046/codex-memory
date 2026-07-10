'use strict';

const {
  REQUIRED_APPLICATION_RECEIPT_RESULT_FIELDS
} = require('./PlanPackExternalReviewCompletionAuditPatchBoundaryContract');

const CONTRACT_NAME = 'PlanPackExternalReviewCompletionAuditPatchApplicationContract';
const CONTRACT_MODE = 'local_phase9_phase10_external_review_completion_audit_patch_application_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-external-review-completion-audit-patch-application']);
const ALLOWED_DECISIONS = Object.freeze([
  'external_review_completion_audit_patch_application_ready_for_completion_audit_evidence',
  'external_review_completion_audit_patch_application_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'patchBoundaryResult',
  'externalReviewEvidenceBundle',
  'completionAuditPatch',
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
  'cm2050ApplicationReceiptAccepted',
  'cm2051PatchBoundaryAccepted',
  'cm2024TraceMatrixRequiresExternalReviewEvidence',
  'phase9Phase10StillIncompleteBeforeApplication'
]);

const REQUIRED_PATCH_BOUNDARY_RESULT_FIELDS = Object.freeze([
  'decision',
  'patchBoundaryAccepted',
  'localEvidenceField',
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

const REQUIRED_EXTERNAL_REVIEW_EVIDENCE_BUNDLE_FIELDS = Object.freeze([
  'categoryOnly',
  'lowDisclosureOnly',
  'observationOrDogfoodReviewPassed',
  'externalReviewPassed',
  'tagApprovalPacketPassed',
  'externalReviewEvidenceProvidedBySeparateProcess',
  'tagApprovalPacketProvidedBySeparateProcess',
  'reviewTranscriptIncluded',
  'reviewerIdentityIncluded',
  'tagApprovalLineIncluded',
  'localContractAcceptedAsExternalReview'
]);

const REQUIRED_COMPLETION_AUDIT_PATCH_FIELDS = Object.freeze([
  'patchApplicationPrepared',
  'categoryOnly',
  'lowDisclosureOnly',
  'exactExternalReviewEvidenceRequiredBeforeApplication',
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
  'patchBoundariesAccepted',
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

const REQUIRED_BOUNDARY_DECISION =
  'external_review_completion_audit_patch_boundary_ready_for_future_exact_application';
const REQUIRED_BOUNDARY_LOCAL_EVIDENCE_FIELD = 'externalReviewEvidenceCompletionAuditPatchBoundaryPassed';
const REQUIRED_BOUNDARY_MARKER = Object.freeze({
  field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
  marker: 'requires_future_exact_completion_audit_patch_application',
  acceptedAsCompletionEvidenceNow: false
});

const STOP_L4_TRUE_FIELDS = Object.freeze([
  ['patchBoundaryResult', 'reviewBundleAppliedToCompletionAudit'],
  ['patchBoundaryResult', 'completionAuditPatchApplied'],
  ['patchBoundaryResult', 'currentPhase9Completed'],
  ['patchBoundaryResult', 'currentPhase10Completed'],
  ['patchBoundaryResult', 'fullPlanPackCompleted'],
  ['patchBoundaryResult', 'reviewEvidenceAcceptedByThisContract'],
  ['patchBoundaryResult', 'tagApprovalPacketAcceptedByThisContract'],
  ['patchBoundaryResult', 'defaultRuntimeExpanded'],
  ['patchBoundaryResult', 'tagCreated'],
  ['patchBoundaryResult', 'releasePublished'],
  ['patchBoundaryResult', 'deploymentTriggered'],
  ['patchBoundaryResult', 'cutoverPerformed'],
  ['patchBoundaryResult', 'receiptContentRead'],
  ['patchBoundaryResult', 'realMemoryRead'],
  ['patchBoundaryResult', 'rawPrivateStateRead'],
  ['patchBoundaryResult', 'providerApiCalled'],
  ['patchBoundaryResult', 'durableMutationPerformed'],
  ['patchBoundaryResult', 'publicMcpExpanded'],
  ['patchBoundaryResult', 'readinessClaimed'],
  ['externalReviewEvidenceBundle', 'reviewTranscriptIncluded'],
  ['externalReviewEvidenceBundle', 'reviewerIdentityIncluded'],
  ['externalReviewEvidenceBundle', 'tagApprovalLineIncluded'],
  ['externalReviewEvidenceBundle', 'localContractAcceptedAsExternalReview'],
  ['completionAuditPatch', 'phase9CompletionClaimed'],
  ['completionAuditPatch', 'phase10CompletionClaimed'],
  ['completionAuditPatch', 'defaultRuntimeExpansionClaimed'],
  ['completionAuditPatch', 'tagReleaseActionClaimed'],
  ['completionAuditPatch', 'localContractsAllowedToSatisfyExternalReview']
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
      input.patchBoundaryResult,
      REQUIRED_PATCH_BOUNDARY_RESULT_FIELDS,
      'patchBoundaryResult'
    ),
    ...collectUnexpectedKeys(
      input.externalReviewEvidenceBundle,
      REQUIRED_EXTERNAL_REVIEW_EVIDENCE_BUNDLE_FIELDS,
      'externalReviewEvidenceBundle'
    ),
    ...collectUnexpectedKeys(
      input.completionAuditPatch,
      REQUIRED_COMPLETION_AUDIT_PATCH_FIELDS,
      'completionAuditPatch'
    ),
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
    actual.field === REQUIRED_BOUNDARY_MARKER.field &&
    actual.marker === REQUIRED_BOUNDARY_MARKER.marker &&
    actual.acceptedAsCompletionEvidenceNow === false;
}

function hasRequiredBoundaryMarker(boundaryResult) {
  return Array.isArray(boundaryResult.proposedCompletionAuditEvidence) &&
    boundaryResult.proposedCompletionAuditEvidence.length === 1 &&
    markerMatches(boundaryResult.proposedCompletionAuditEvidence[0]);
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.externalReviewEvidenceBundle, [
      'categoryOnly',
      'lowDisclosureOnly',
      'observationOrDogfoodReviewPassed',
      'externalReviewPassed',
      'externalReviewEvidenceProvidedBySeparateProcess'
    ], 'externalReviewEvidenceBundle'),
    ...invalidFalseFields(input.externalReviewEvidenceBundle, [
      'tagApprovalPacketPassed',
      'tagApprovalPacketProvidedBySeparateProcess',
      'reviewTranscriptIncluded',
      'reviewerIdentityIncluded',
      'tagApprovalLineIncluded',
      'localContractAcceptedAsExternalReview'
    ], 'externalReviewEvidenceBundle'),
    ...missingTrueFields(input.completionAuditPatch, [
      'patchApplicationPrepared',
      'categoryOnly',
      'lowDisclosureOnly',
      'exactExternalReviewEvidenceRequiredBeforeApplication',
      'applicationReceiptAcceptedAsLocalContractOnly',
      'reviewBundleAppliedToCompletionAudit',
      'completionAuditPatchApplied'
    ], 'completionAuditPatch'),
    ...invalidFalseFields(input.completionAuditPatch, [
      'phase9CompletionClaimed',
      'phase10CompletionClaimed',
      'defaultRuntimeExpansionClaimed',
      'tagReleaseActionClaimed',
      'localContractsAllowedToSatisfyExternalReview'
    ], 'completionAuditPatch')
  ];

  if (input.patchBoundaryResult.decision !== REQUIRED_BOUNDARY_DECISION) {
    blockers.push('patchBoundaryResult.decision');
  }
  if (input.patchBoundaryResult.patchBoundaryAccepted !== true) {
    blockers.push('patchBoundaryResult.patchBoundaryAccepted');
  }
  if (input.patchBoundaryResult.localEvidenceField !== REQUIRED_BOUNDARY_LOCAL_EVIDENCE_FIELD) {
    blockers.push('patchBoundaryResult.localEvidenceField');
  }
  if (!hasRequiredBoundaryMarker(input.patchBoundaryResult)) {
    blockers.push('patchBoundaryResult.proposedCompletionAuditEvidence');
  }

  if (blockers.length > 0) {
    return {
      decision: 'external_review_completion_audit_patch_application_blocked',
      blockers
    };
  }

  return {
    decision: 'external_review_completion_audit_patch_application_ready_for_completion_audit_evidence',
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
    patchApplicationAccepted: false,
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

function evaluatePlanPackExternalReviewCompletionAuditPatchApplication(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(
      REQUIRED_PATCH_BOUNDARY_RESULT_FIELDS,
      input.patchBoundaryResult,
      'patchBoundaryResult'
    ),
    ...missingFields(
      REQUIRED_EXTERNAL_REVIEW_EVIDENCE_BUNDLE_FIELDS,
      input.externalReviewEvidenceBundle,
      'externalReviewEvidenceBundle'
    ),
    ...missingFields(
      REQUIRED_COMPLETION_AUDIT_PATCH_FIELDS,
      input.completionAuditPatch,
      'completionAuditPatch'
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

  const accepted = computed.decision ===
    'external_review_completion_audit_patch_application_ready_for_completion_audit_evidence';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    patchApplicationAccepted: accepted,
    localEvidenceField: accepted ? 'externalReviewEvidenceBundleAppliedToCompletionAudit' : null,
    appliedCompletionAuditEvidence: accepted
      ? [{
        field: 'externalReviewEvidenceBundleAppliedToCompletionAudit',
        evidenceKindRequired: 'external_review',
        localContractAcceptedAsExternalReview: false
      }]
      : [],
    reviewBundleAppliedToCompletionAudit: accepted,
    completionAuditPatchApplied: accepted,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'feed_completion_audit_evidence_then_review_tag_approval_packet_separately'
      : 'repair_external_review_completion_audit_patch_application',
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
  REQUIRED_APPLICATION_RECEIPT_RESULT_FIELDS,
  REQUIRED_COMPLETION_AUDIT_PATCH_FIELDS,
  REQUIRED_EXTERNAL_REVIEW_EVIDENCE_BUNDLE_FIELDS,
  REQUIRED_PATCH_BOUNDARY_RESULT_FIELDS,
  REQUIRED_PREREQUISITE_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewCompletionAuditPatchApplication
};
