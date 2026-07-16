'use strict';

const CONTRACT_NAME = 'PlanPackExternalReviewEvidenceBundleContract';
const CONTRACT_MODE = 'local_phase9_phase10_external_review_evidence_bundle_contract_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-external-review-evidence-bundle-contract']);
const ALLOWED_DECISIONS = Object.freeze([
  'external_review_evidence_bundle_contract_ready_for_future_review',
  'external_review_evidence_bundle_contract_blocked_missing_review_evidence',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'bundle',
  'reviewEvidenceCategories',
  'sequence',
  'disclosure',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREREQUISITE_FIELDS = Object.freeze([
  'cm2015DefaultRuntimePolicyGateAccepted',
  'cm2016ReleaseTagReadinessPolicyGateAccepted',
  'cm2026ExternalReviewEvidenceIntakeAccepted',
  'cm2032CompletionAuditRequiresReviewIntake',
  'cm2024TraceMatrixRequiresExternalReviewEvidence',
  'completionAuditStillRequiresExternalReview',
  'phase9Phase10StillIncompleteBeforeBundle'
]);

const REQUIRED_BUNDLE_FIELDS = Object.freeze([
  'bundlePrepared',
  'futureExternalReviewRequired',
  'futureTagApprovalPacketRequired',
  'reviewBundleAppliedToCompletionAudit',
  'phase9CompletionClaimed',
  'phase10CompletionClaimed',
  'defaultRuntimeExpansionClaimed',
  'tagReleaseActionClaimed',
  'nonAuthorizingContractOnly'
]);

const REQUIRED_REVIEW_EVIDENCE_FIELDS = Object.freeze([
  'phase9ObservationOrDogfoodReviewEvidence',
  'phase9ExternalReviewEvidence',
  'phase10ExternalReviewEvidence',
  'phase10TagApprovalPacketEvidence'
]);

const REQUIRED_SEQUENCE_FIELDS = Object.freeze([
  'observationBeforeDefaultRuntimeExpansion',
  'externalReviewBeforePhase9Completion',
  'externalReviewBeforePhase10Completion',
  'tagApprovalPacketBeforeTagAction',
  'reviewBeforeCompletionAuditPatch',
  'tagApprovalSeparateFromReview',
  'releaseActionRequiresSeparateApproval'
]);

const REQUIRED_DISCLOSURE_FIELDS = Object.freeze([
  'categoryOnly',
  'lowDisclosureOnly',
  'rawValuesIncluded',
  'endpointLocatorIncluded',
  'requestBodyIncluded',
  'responseBodyIncluded',
  'memoryContentIncluded',
  'approvalLineIncluded',
  'readinessClaimIncluded'
]);

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

const REQUIRED_REVIEW_EVIDENCE_CATEGORY = 'present_low_disclosure_review_category_only';

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
  'fullBridgeCompletion',
  'fullPlanPackCompleted'
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
    ...collectUnexpectedKeys(input.bundle, REQUIRED_BUNDLE_FIELDS, 'bundle'),
    ...collectUnexpectedKeys(input.reviewEvidenceCategories, REQUIRED_REVIEW_EVIDENCE_FIELDS, 'reviewEvidenceCategories'),
    ...collectUnexpectedKeys(input.sequence, REQUIRED_SEQUENCE_FIELDS, 'sequence'),
    ...collectUnexpectedKeys(input.disclosure, REQUIRED_DISCLOSURE_FIELDS, 'disclosure'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
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
  return fields.filter(field => value[field] !== true).map(field => pathJoin(prefix, field));
}

function trueFields(value, fields, prefix) {
  return fields.filter(field => value[field] === true).map(field => pathJoin(prefix, field));
}

function buildStopBlockers(input) {
  return [
    ...trueFields(input.bundle, [
      'reviewBundleAppliedToCompletionAudit',
      'phase9CompletionClaimed',
      'phase10CompletionClaimed',
      'defaultRuntimeExpansionClaimed',
      'tagReleaseActionClaimed'
    ], 'bundle'),
    ...trueFields(input.disclosure, [
      'rawValuesIncluded',
      'endpointLocatorIncluded',
      'requestBodyIncluded',
      'responseBodyIncluded',
      'memoryContentIncluded',
      'approvalLineIncluded',
      'readinessClaimIncluded'
    ], 'disclosure'),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
}

function buildReviewEvidenceBlockers(input) {
  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.sequence, REQUIRED_SEQUENCE_FIELDS, 'sequence')
  ];

  for (const field of [
    'bundlePrepared',
    'futureExternalReviewRequired',
    'futureTagApprovalPacketRequired',
    'nonAuthorizingContractOnly'
  ]) {
    if (input.bundle[field] !== true) blockers.push(`bundle.${field}`);
  }

  for (const field of REQUIRED_REVIEW_EVIDENCE_FIELDS) {
    if (input.reviewEvidenceCategories[field] !== REQUIRED_REVIEW_EVIDENCE_CATEGORY) {
      blockers.push(`reviewEvidenceCategories.${field}`);
    }
  }

  if (input.disclosure.categoryOnly !== true) blockers.push('disclosure.categoryOnly');
  if (input.disclosure.lowDisclosureOnly !== true) blockers.push('disclosure.lowDisclosureOnly');

  return blockers;
}

function computeDecision(input) {
  const stopBlockers = buildStopBlockers(input);
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const reviewEvidenceBlockers = buildReviewEvidenceBlockers(input);
  if (reviewEvidenceBlockers.length > 0) {
    return {
      decision: 'external_review_evidence_bundle_contract_blocked_missing_review_evidence',
      blockers: reviewEvidenceBlockers
    };
  }

  return {
    decision: 'external_review_evidence_bundle_contract_ready_for_future_review',
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
    futureReviewEvidenceBundleShapeAccepted: false,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    reviewEvidenceAcceptedByThisContract: false,
    tagApprovalPacketAcceptedByThisContract: false,
    reviewBundleAppliedToCompletionAudit: false,
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

function evaluatePlanPackExternalReviewEvidenceBundleContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(REQUIRED_BUNDLE_FIELDS, input.bundle, 'bundle'),
    ...missingFields(REQUIRED_REVIEW_EVIDENCE_FIELDS, input.reviewEvidenceCategories, 'reviewEvidenceCategories'),
    ...missingFields(REQUIRED_SEQUENCE_FIELDS, input.sequence, 'sequence'),
    ...missingFields(REQUIRED_DISCLOSURE_FIELDS, input.disclosure, 'disclosure'),
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
    'external_review_evidence_bundle_contract_ready_for_future_review';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    requiredReviewEvidenceCategory: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
    prerequisiteChecksRequired: [...REQUIRED_PREREQUISITE_FIELDS],
    futureReviewEvidenceBundleShapeAccepted: accepted,
    currentPhase9Completed: false,
    currentPhase10Completed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'collect_or_review_future_observation_external_review_and_tag_approval_evidence_without_completion_claim'
      : 'complete_missing_external_review_evidence_bundle_contract_fields',
    lowDisclosureReviewEvidenceSummary: {
      taskId: input.taskId,
      phases: ['Phase 9', 'Phase 10'],
      prerequisiteChecksRequired: [...REQUIRED_PREREQUISITE_FIELDS],
      reviewEvidenceCategoriesRequired: [...REQUIRED_REVIEW_EVIDENCE_FIELDS],
      reviewEvidenceCategory: REQUIRED_REVIEW_EVIDENCE_CATEGORY,
      sequenceChecksRequired: [...REQUIRED_SEQUENCE_FIELDS],
      categoryOnly: true,
      lowDisclosureOnly: true,
      reviewEvidenceAcceptedByThisContract: false,
      tagApprovalPacketAcceptedByThisContract: false,
      reviewBundleAppliedToCompletionAudit: false,
      currentPhase9Completed: false,
      currentPhase10Completed: false,
      fullPlanPackCompleted: false,
      endpointLocatorIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      approvalLineIncluded: false,
      readinessClaimed: false
    },
    reviewEvidenceAcceptedByThisContract: false,
    tagApprovalPacketAcceptedByThisContract: false,
    reviewBundleAppliedToCompletionAudit: false,
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
  REQUIRED_PREREQUISITE_FIELDS,
  REQUIRED_REVIEW_EVIDENCE_CATEGORY,
  REQUIRED_REVIEW_EVIDENCE_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceBundleContract
};
