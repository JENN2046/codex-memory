'use strict';

const CONTRACT_NAME = 'PlanPackExternalReviewEvidenceIntakeContract';
const CONTRACT_MODE = 'local_phase9_phase10_external_review_evidence_intake_preflight_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-external-review-evidence-intake-preflight']);
const ALLOWED_DECISIONS = Object.freeze([
  'external_review_evidence_intake_ready_for_future_review',
  'external_review_evidence_intake_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'reviewIntake',
  'proposedReviewEvidence',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREREQUISITE_FIELDS = Object.freeze([
  'cm2015DefaultRuntimePolicyGateImplemented',
  'cm2016ReleaseTagReadinessPolicyGateImplemented',
  'cm2017CompletionAuditRequiresReviewEvidence',
  'cm2024TraceMatrixRequiresExternalReviewEvidence',
  'defaultRuntimeStillReadContextProposal',
  'releaseTagActionStillSeparateApproval'
]);

const REQUIRED_REVIEW_INTAKE_FIELDS = Object.freeze([
  'intakePrepared',
  'categoryOnly',
  'lowDisclosureOnly',
  'observationOrDogfoodReviewRequiredBeforeDefaultExpansion',
  'externalReviewRequiredBeforeCompletion',
  'tagApprovalPacketRequiredBeforeTagAction',
  'localPolicyGatesAllowedToSatisfyExternalReview',
  'completionAuditPatchApplied',
  'defaultRuntimeExpanded',
  'tagApprovalPacketAccepted',
  'tagCreated',
  'releasePublished',
  'readinessClaimed'
]);

const REVIEW_EVIDENCE_FIELDS = Object.freeze([
  'phase9ObservationOrDogfoodReviewPassed',
  'phase9ExternalReviewPassed',
  'phase10ExternalReviewPassed',
  'phase10TagApprovalPacketPassed'
]);

const REQUIRED_REVIEW_MARKERS = Object.freeze({
  phase9ObservationOrDogfoodReviewPassed: 'requires_future_observation_or_dogfood_review',
  phase9ExternalReviewPassed: 'requires_future_external_review',
  phase10ExternalReviewPassed: 'requires_future_external_review',
  phase10TagApprovalPacketPassed: 'requires_future_tag_approval_packet'
});

const COUNTER_FIELDS = Object.freeze([
  'observationWindowsAccepted',
  'externalReviewsAccepted',
  'tagApprovalPacketsAccepted',
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
  ['reviewIntake', 'localPolicyGatesAllowedToSatisfyExternalReview'],
  ['reviewIntake', 'completionAuditPatchApplied'],
  ['reviewIntake', 'defaultRuntimeExpanded'],
  ['reviewIntake', 'tagApprovalPacketAccepted'],
  ['reviewIntake', 'tagCreated'],
  ['reviewIntake', 'releasePublished'],
  ['reviewIntake', 'readinessClaimed']
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
    ...collectUnexpectedKeys(input.reviewIntake, REQUIRED_REVIEW_INTAKE_FIELDS, 'reviewIntake'),
    ...collectUnexpectedKeys(input.proposedReviewEvidence, REVIEW_EVIDENCE_FIELDS, 'proposedReviewEvidence'),
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

function invalidReviewMarkers(proposedReviewEvidence) {
  if (!isPlainObject(proposedReviewEvidence)) return [...REVIEW_EVIDENCE_FIELDS];
  return REVIEW_EVIDENCE_FIELDS
    .filter(field => proposedReviewEvidence[field] !== REQUIRED_REVIEW_MARKERS[field])
    .map(field => `proposedReviewEvidence.${field}`);
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.reviewIntake, [
      'intakePrepared',
      'categoryOnly',
      'lowDisclosureOnly',
      'observationOrDogfoodReviewRequiredBeforeDefaultExpansion',
      'externalReviewRequiredBeforeCompletion',
      'tagApprovalPacketRequiredBeforeTagAction'
    ], 'reviewIntake'),
    ...invalidFalseFields(input.reviewIntake, [
      'localPolicyGatesAllowedToSatisfyExternalReview',
      'completionAuditPatchApplied',
      'defaultRuntimeExpanded',
      'tagApprovalPacketAccepted',
      'tagCreated',
      'releasePublished',
      'readinessClaimed'
    ], 'reviewIntake'),
    ...invalidReviewMarkers(input.proposedReviewEvidence)
  ];

  if (blockers.length > 0) {
    return {
      decision: 'external_review_evidence_intake_blocked',
      blockers
    };
  }

  return {
    decision: 'external_review_evidence_intake_ready_for_future_review',
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
    reviewEvidenceIntakeAccepted: false,
    completionAuditPatchApplied: false,
    observationOrDogfoodReviewAccepted: false,
    externalReviewAccepted: false,
    tagApprovalPacketAccepted: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    fullPlanPackCompleted: false,
    providerApiCalled: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function buildProposedReviewEvidence() {
  return REVIEW_EVIDENCE_FIELDS.map(field => ({
    field,
    marker: REQUIRED_REVIEW_MARKERS[field],
    acceptedAsCompletionEvidenceNow: false
  }));
}

function evaluatePlanPackExternalReviewEvidenceIntakeContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(REQUIRED_REVIEW_INTAKE_FIELDS, input.reviewIntake, 'reviewIntake'),
    ...missingFields(REVIEW_EVIDENCE_FIELDS, input.proposedReviewEvidence, 'proposedReviewEvidence'),
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

  const accepted = computed.decision === 'external_review_evidence_intake_ready_for_future_review';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    reviewEvidenceIntakeAccepted: accepted,
    requiredReviewMarkers: { ...REQUIRED_REVIEW_MARKERS },
    requiredReviewEvidenceFields: [...REVIEW_EVIDENCE_FIELDS],
    proposedCompletionAuditReviewEvidence: accepted ? buildProposedReviewEvidence() : [],
    completionAuditPatchApplied: false,
    observationOrDogfoodReviewAccepted: false,
    externalReviewAccepted: false,
    tagApprovalPacketAccepted: false,
    defaultRuntimeExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'await_future_observation_external_review_and_tag_approval_before_completion_audit_patch'
      : 'repair_external_review_evidence_intake_preflight',
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
  REQUIRED_REVIEW_MARKERS,
  REVIEW_EVIDENCE_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePlanPackExternalReviewEvidenceIntakeContract
};
