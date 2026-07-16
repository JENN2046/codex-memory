'use strict';

const {
  REQUIRED_PREREQUISITE_FIELDS: REQUIRED_BUNDLE_PREREQUISITE_FIELDS
} = require('./PlanPackExternalReviewEvidenceBundleContract');

const CONTRACT_NAME = 'PlanPackExternalReviewEvidenceApplicationPatchPreflightContract';
const CONTRACT_MODE = 'local_phase9_phase10_external_review_evidence_application_patch_preflight_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-external-review-evidence-application-patch-preflight']);
const ALLOWED_DECISIONS = Object.freeze([
  'external_review_evidence_application_patch_preflight_ready_for_future_review',
  'external_review_evidence_application_patch_preflight_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'reviewEvidenceBundleContract',
  'patchPreflight',
  'proposedPatchEvidence',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREREQUISITE_FIELDS = Object.freeze([
  'cm2015DefaultRuntimePolicyGateAccepted',
  'cm2016ReleaseTagReadinessPolicyGateAccepted',
  'cm2026ExternalReviewEvidenceIntakeAccepted',
  'cm2032CompletionAuditRequiresReviewIntake',
  'cm2033ReviewEvidenceBundleContractAccepted',
  'cm2017CompletionAuditRequiresReviewEvidence',
  'cm2024TraceMatrixRequiresExternalReviewEvidence',
  'phase9Phase10StillIncompleteBeforePatch',
  'defaultRuntimeStillRequiresFutureReview'
]);

const REQUIRED_REVIEW_BUNDLE_CONTRACT_FIELDS = Object.freeze([
  'decision',
  'futureReviewEvidenceBundleShapeAccepted',
  'requiredReviewEvidenceCategory',
  'prerequisiteChecksRequired',
  'currentPhase9Completed',
  'currentPhase10Completed',
  'fullPlanPackCompleted',
  'reviewEvidenceAcceptedByThisContract',
  'tagApprovalPacketAcceptedByThisContract',
  'reviewBundleAppliedToCompletionAudit',
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

const REQUIRED_PATCH_PREFLIGHT_FIELDS = Object.freeze([
  'preflightPrepared',
  'categoryOnly',
  'lowDisclosureOnly',
  'externalReviewEvidenceRequiredBeforePatch',
  'reviewBundleApplicationRequired',
  'completionAuditPatchPrepared',
  'reviewBundleAppliedToCompletionAudit',
  'completionAuditPatchApplied',
  'phase9CompletionClaimed',
  'phase10CompletionClaimed',
  'defaultRuntimeExpansionClaimed',
  'tagReleaseActionClaimed',
  'localContractsAllowedToSatisfyExternalReview'
]);

const REVIEW_PATCH_EVIDENCE_FIELDS = Object.freeze([
  'observationOrDogfoodReviewPassed',
  'externalReviewPassed',
  'tagApprovalPacketPassed',
  'externalReviewEvidenceBundleAppliedToCompletionAudit'
]);

const REQUIRED_REVIEW_PATCH_MARKERS = Object.freeze({
  observationOrDogfoodReviewPassed: 'requires_future_observation_or_dogfood_review',
  externalReviewPassed: 'requires_future_external_review',
  tagApprovalPacketPassed: 'requires_future_tag_approval_packet',
  externalReviewEvidenceBundleAppliedToCompletionAudit:
    'requires_future_external_review_bundle_application'
});

const REQUIRED_REVIEW_BUNDLE_DECISION =
  'external_review_evidence_bundle_contract_ready_for_future_review';
const REQUIRED_REVIEW_EVIDENCE_CATEGORY = 'present_low_disclosure_review_category_only';

const COUNTER_FIELDS = Object.freeze([
  'observationWindowsAccepted',
  'externalReviewsAccepted',
  'tagApprovalPacketsAccepted',
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

const STOP_L4_TRUE_FIELDS = Object.freeze([
  ['reviewEvidenceBundleContract', 'currentPhase9Completed'],
  ['reviewEvidenceBundleContract', 'currentPhase10Completed'],
  ['reviewEvidenceBundleContract', 'fullPlanPackCompleted'],
  ['reviewEvidenceBundleContract', 'reviewEvidenceAcceptedByThisContract'],
  ['reviewEvidenceBundleContract', 'tagApprovalPacketAcceptedByThisContract'],
  ['reviewEvidenceBundleContract', 'reviewBundleAppliedToCompletionAudit'],
  ['reviewEvidenceBundleContract', 'defaultRuntimeExpanded'],
  ['reviewEvidenceBundleContract', 'tagCreated'],
  ['reviewEvidenceBundleContract', 'releasePublished'],
  ['reviewEvidenceBundleContract', 'deploymentTriggered'],
  ['reviewEvidenceBundleContract', 'cutoverPerformed'],
  ['reviewEvidenceBundleContract', 'receiptContentRead'],
  ['reviewEvidenceBundleContract', 'realMemoryRead'],
  ['reviewEvidenceBundleContract', 'rawPrivateStateRead'],
  ['reviewEvidenceBundleContract', 'providerApiCalled'],
  ['reviewEvidenceBundleContract', 'durableMutationPerformed'],
  ['reviewEvidenceBundleContract', 'publicMcpExpanded'],
  ['reviewEvidenceBundleContract', 'readinessClaimed'],
  ['patchPreflight', 'reviewBundleAppliedToCompletionAudit'],
  ['patchPreflight', 'completionAuditPatchApplied'],
  ['patchPreflight', 'phase9CompletionClaimed'],
  ['patchPreflight', 'phase10CompletionClaimed'],
  ['patchPreflight', 'defaultRuntimeExpansionClaimed'],
  ['patchPreflight', 'tagReleaseActionClaimed'],
  ['patchPreflight', 'localContractsAllowedToSatisfyExternalReview']
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
      input.reviewEvidenceBundleContract,
      REQUIRED_REVIEW_BUNDLE_CONTRACT_FIELDS,
      'reviewEvidenceBundleContract'
    ),
    ...collectUnexpectedKeys(input.patchPreflight, REQUIRED_PATCH_PREFLIGHT_FIELDS, 'patchPreflight'),
    ...collectUnexpectedKeys(input.proposedPatchEvidence, REVIEW_PATCH_EVIDENCE_FIELDS, 'proposedPatchEvidence'),
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

function enabledStopFields(input) {
  return STOP_L4_TRUE_FIELDS
    .filter(([section, field]) => input[section][field] === true)
    .map(([section, field]) => `${section}.${field}`);
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

function invalidEvidenceMarkers(proposedPatchEvidence) {
  if (!isPlainObject(proposedPatchEvidence)) return [...REVIEW_PATCH_EVIDENCE_FIELDS];
  return REVIEW_PATCH_EVIDENCE_FIELDS
    .filter(field => proposedPatchEvidence[field] !== REQUIRED_REVIEW_PATCH_MARKERS[field])
    .map(field => `proposedPatchEvidence.${field}`);
}

function invalidReviewBundlePrerequisiteSummary(reviewEvidenceBundleContract) {
  const actual = reviewEvidenceBundleContract.prerequisiteChecksRequired;
  if (!Array.isArray(actual)) return true;
  if (actual.length !== REQUIRED_BUNDLE_PREREQUISITE_FIELDS.length) return true;
  return REQUIRED_BUNDLE_PREREQUISITE_FIELDS.some((field, index) => actual[index] !== field);
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.patchPreflight, [
      'preflightPrepared',
      'categoryOnly',
      'lowDisclosureOnly',
      'externalReviewEvidenceRequiredBeforePatch',
      'reviewBundleApplicationRequired',
      'completionAuditPatchPrepared'
    ], 'patchPreflight'),
    ...invalidFalseFields(input.patchPreflight, [
      'reviewBundleAppliedToCompletionAudit',
      'completionAuditPatchApplied',
      'phase9CompletionClaimed',
      'phase10CompletionClaimed',
      'defaultRuntimeExpansionClaimed',
      'tagReleaseActionClaimed',
      'localContractsAllowedToSatisfyExternalReview'
    ], 'patchPreflight'),
    ...invalidEvidenceMarkers(input.proposedPatchEvidence)
  ];

  if (input.reviewEvidenceBundleContract.decision !== REQUIRED_REVIEW_BUNDLE_DECISION) {
    blockers.push('reviewEvidenceBundleContract.decision');
  }
  if (input.reviewEvidenceBundleContract.futureReviewEvidenceBundleShapeAccepted !== true) {
    blockers.push('reviewEvidenceBundleContract.futureReviewEvidenceBundleShapeAccepted');
  }
  if (input.reviewEvidenceBundleContract.requiredReviewEvidenceCategory !== REQUIRED_REVIEW_EVIDENCE_CATEGORY) {
    blockers.push('reviewEvidenceBundleContract.requiredReviewEvidenceCategory');
  }
  if (invalidReviewBundlePrerequisiteSummary(input.reviewEvidenceBundleContract)) {
    blockers.push('reviewEvidenceBundleContract.prerequisiteChecksRequired');
  }

  if (blockers.length > 0) {
    return {
      decision: 'external_review_evidence_application_patch_preflight_blocked',
      blockers
    };
  }

  return {
    decision: 'external_review_evidence_application_patch_preflight_ready_for_future_review',
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
    patchPreflightAccepted: false,
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

function evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(
      REQUIRED_REVIEW_BUNDLE_CONTRACT_FIELDS,
      input.reviewEvidenceBundleContract,
      'reviewEvidenceBundleContract'
    ),
    ...missingFields(REQUIRED_PATCH_PREFLIGHT_FIELDS, input.patchPreflight, 'patchPreflight'),
    ...missingFields(REVIEW_PATCH_EVIDENCE_FIELDS, input.proposedPatchEvidence, 'proposedPatchEvidence'),
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
    'external_review_evidence_application_patch_preflight_ready_for_future_review';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    patchPreflightAccepted: accepted,
    requiredReviewPatchMarkers: { ...REQUIRED_REVIEW_PATCH_MARKERS },
    requiredPatchEvidenceFields: [...REVIEW_PATCH_EVIDENCE_FIELDS],
    proposedCompletionAuditEvidence: accepted
      ? REVIEW_PATCH_EVIDENCE_FIELDS.map(field => ({
        field,
        marker: REQUIRED_REVIEW_PATCH_MARKERS[field],
        acceptedAsCompletionEvidenceNow: false
      }))
      : [],
    reviewBundleAppliedToCompletionAudit: false,
    completionAuditPatchApplied: false,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'await_future_observation_external_review_and_tag_approval_before_review_application_or_completion_audit_patch'
      : 'repair_external_review_evidence_application_patch_preflight',
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
  REQUIRED_REVIEW_BUNDLE_DECISION,
  REQUIRED_REVIEW_EVIDENCE_CATEGORY,
  REQUIRED_REVIEW_PATCH_MARKERS,
  REVIEW_PATCH_EVIDENCE_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceApplicationPatchPreflightContract
};
