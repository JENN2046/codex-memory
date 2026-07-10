'use strict';

const {
  REQUIRED_EVIDENCE_MARKER
} = require('./Phase2NativeReadProofReceiptAuditIntakeContract');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'Phase2LowDisclosureProofReceiptReviewContract';
const CONTRACT_MODE = 'local_phase2_low_disclosure_proof_receipt_review_only';
const SCHEMA_VERSION = 1;

const REQUIRED_PREREQUISITES = Object.freeze([
  'cm2025ReceiptAuditIntakeAccepted',
  'cm2037ReceiptSchemaCompatibilityAccepted',
  'cm2038TargetBindingReceiptReviewAccepted',
  'cm2039NativeReadProofReceiptReviewAccepted',
  'cm2040FallbackDistinctionReceiptReviewAccepted',
  'traceMatrixStillRequiresExactReceiptEvidence',
  'completionAuditStillRequiresLowDisclosureProofPassed',
  'localReviewDoesNotSatisfyLowDisclosureProof'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'reviewPrepared',
  'receiptField',
  'requiredReceiptCategory',
  'targetReferenceName',
  'safeReferenceNameCategory',
  'lowDisclosureObservedCategory',
  'disclosureBudgetCategory',
  'redactionPolicyCategory',
  'outputProjectionCategory',
  'categoryOnly',
  'lowDisclosureOnly',
  'endpointLocatorIncluded',
  'targetValueIncluded',
  'queryTextIncluded',
  'requestBodyIncluded',
  'responseBodyIncluded',
  'memoryContentIncluded',
  'fieldNamesIncluded',
  'memoryIdsIncluded',
  'rawOutputIncluded',
  'rawAuditIncluded',
  'approvalLineIncluded',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_RECEIPT_FIELD = 'lowDisclosureProofPassed';
const REQUIRED_RECEIPT_CATEGORY = 'lowDisclosureProofReceipt';
const REQUIRED_SAFE_REFERENCE_CATEGORY = 'safe_reference_name_only';
const REQUIRED_DISCLOSURE_BUDGET_CATEGORY = 'low_disclosure_budget_category_only';
const REQUIRED_REDACTION_POLICY_CATEGORY = 'redaction_policy_category_only';
const REQUIRED_OUTPUT_PROJECTION_CATEGORY = 'output_projection_category_only';

const COUNTER_FIELDS = Object.freeze([
  'approvalGrantsAccepted',
  'approvalLineOperations',
  'receiptReviews',
  'receiptApplications',
  'completionAuditPatchApplications',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeTargetBindings',
  'nativeReadAttempts',
  'fallbackReads',
  'fallbackComparisons',
  'responseBodyReads',
  'rawOutputReads',
  'rawAuditReads',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'actualReceiptAccepted',
  'actualReceiptApplied',
  'approvalAccepted',
  'approvalLineGenerated',
  'runtimeCalled',
  'liveVcpToolBoxCalled',
  'nativeTargetBindingPerformed',
  'nativeReadExecuted',
  'fallbackReadExecuted',
  'fallbackComparisonExecuted',
  'lowDisclosureProofPassed',
  'responseBodyRead',
  'rawOutputRead',
  'rawAuditRead',
  'memoryRead',
  'realMemoryRead',
  'rawPrivateRead',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'completionAuditPatched',
  'phase2Completed',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'fullPlanPackCompletedClaimed'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'target_value',
  'queryText',
  'query_text',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawResponse',
  'raw_response',
  'rawOutput',
  'raw_output',
  'rawAudit',
  'raw_audit',
  'rawMemory',
  'raw_memory',
  'memoryContent',
  'memory_content',
  'fieldNames',
  'field_names',
  'memoryIds',
  'memory_ids',
  'fallbackResult',
  'fallback_result',
  'nativeResult',
  'native_result',
  'rawJsonlRow',
  'rawSqliteRow',
  'providerPayload',
  'runtimeCommand',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'credential',
  'approvalLine',
  'approvalLineValue',
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

function sortedUnique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))].sort();
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

function collectStopFlags(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStopFlags(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (STOP_L4_FLAG_KEYS.includes(key) && nested === true) {
      found.push(path);
      continue;
    }
    found.push(...collectStopFlags(nested, path));
  }
  return found;
}

function missingTrueFlags(value, fields, prefix) {
  const actual = isPlainObject(value) ? value : {};
  return fields
    .filter(field => actual[field] !== true)
    .map(field => `${prefix}.${field}`);
}

function missingFields(value, fields, prefix) {
  const actual = isPlainObject(value) ? value : {};
  return fields
    .filter(field => !hasOwn(actual, field))
    .map(field => `${prefix}.${field}`);
}

function buildCounterBlockers(counters) {
  if (!isPlainObject(counters)) return COUNTER_FIELDS.map(field => `counters.${field}`);
  return COUNTER_FIELDS
    .filter(field => !Number.isInteger(counters[field]) || counters[field] !== 0)
    .map(field => `counters.${field}`);
}

function invalidLowDisclosureReview(review) {
  if (!isPlainObject(review)) return ['lowDisclosureReview'];
  const blockers = [];

  blockers.push(...missingFields(review, REQUIRED_REVIEW_FIELDS, 'lowDisclosureReview'));

  if (review.reviewPrepared !== true) blockers.push('lowDisclosureReview.reviewPrepared');
  if (review.receiptField !== REQUIRED_RECEIPT_FIELD) blockers.push('lowDisclosureReview.receiptField');
  if (review.requiredReceiptCategory !== REQUIRED_RECEIPT_CATEGORY) {
    blockers.push('lowDisclosureReview.requiredReceiptCategory');
  }
  if (!isSafeReferenceName(review.targetReferenceName)) {
    blockers.push('lowDisclosureReview.targetReferenceName');
  }
  if (review.safeReferenceNameCategory !== REQUIRED_SAFE_REFERENCE_CATEGORY) {
    blockers.push('lowDisclosureReview.safeReferenceNameCategory');
  }
  if (review.lowDisclosureObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('lowDisclosureReview.lowDisclosureObservedCategory');
  }
  if (review.disclosureBudgetCategory !== REQUIRED_DISCLOSURE_BUDGET_CATEGORY) {
    blockers.push('lowDisclosureReview.disclosureBudgetCategory');
  }
  if (review.redactionPolicyCategory !== REQUIRED_REDACTION_POLICY_CATEGORY) {
    blockers.push('lowDisclosureReview.redactionPolicyCategory');
  }
  if (review.outputProjectionCategory !== REQUIRED_OUTPUT_PROJECTION_CATEGORY) {
    blockers.push('lowDisclosureReview.outputProjectionCategory');
  }
  for (const field of ['categoryOnly', 'lowDisclosureOnly']) {
    if (review[field] !== true) blockers.push(`lowDisclosureReview.${field}`);
  }
  for (const field of [
    'endpointLocatorIncluded',
    'targetValueIncluded',
    'queryTextIncluded',
    'requestBodyIncluded',
    'responseBodyIncluded',
    'memoryContentIncluded',
    'fieldNamesIncluded',
    'memoryIdsIncluded',
    'rawOutputIncluded',
    'rawAuditIncluded',
    'approvalLineIncluded',
    'acceptedAsCompletionEvidenceNow'
  ]) {
    if (review[field] !== false) blockers.push(`lowDisclosureReview.${field}`);
  }

  return blockers;
}

function invalidProposedCompletionEvidence(evidence) {
  if (!isPlainObject(evidence)) return ['proposedCompletionEvidence'];
  const blockers = [];
  if (evidence.lowDisclosureProofPassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.lowDisclosureProofPassed');
  }
  if (evidence.phase2LowDisclosureProofReceiptReviewPassed !== true) {
    blockers.push('proposedCompletionEvidence.phase2LowDisclosureProofReceiptReviewPassed');
  }
  for (const field of Object.keys(evidence)) {
    if (![
      'lowDisclosureProofPassed',
      'phase2LowDisclosureProofReceiptReviewPassed'
    ].includes(field)) {
      blockers.push(`proposedCompletionEvidence.${field}`);
    }
  }
  return blockers;
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    forbiddenFields: [],
    stopReasons: [],
    phase2LowDisclosureProofReceiptReviewPassed: false,
    lowDisclosureProofPassed: false,
    actualReceiptAccepted: false,
    receiptAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformed: false,
    fallbackReadExecuted: false,
    fallbackComparisonExecuted: false,
    responseBodyRead: false,
    rawOutputRead: false,
    rawAuditRead: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    fullPlanPackCompleted: false,
    ...extras
  };
}

function evaluatePhase2LowDisclosureProofReceiptReviewContract(input = {}) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = sortedUnique(collectForbiddenFields(input));
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const stopReasons = sortedUnique([
    ...collectStopFlags(input),
    ...buildCounterBlockers(input.counters)
  ]);
  if (stopReasons.length > 0) {
    return failure('stop_l4', { stopReasons });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.mode !== CONTRACT_MODE) return failure('invalid_mode');

  const blockers = [
    ...missingTrueFlags(input.prerequisites, REQUIRED_PREREQUISITES, 'prerequisites'),
    ...invalidLowDisclosureReview(input.lowDisclosureReview),
    ...invalidProposedCompletionEvidence(input.proposedCompletionEvidence)
  ];
  const accepted = blockers.length === 0;

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'phase2_low_disclosure_proof_receipt_review_accepted'
      : 'phase2_low_disclosure_proof_receipt_review_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    phase2LowDisclosureProofReceiptReviewPassed: accepted,
    lowDisclosureProofPassed: false,
    proposedCompletionEvidence: accepted
      ? {
        phase2LowDisclosureProofReceiptReviewPassed: true,
        lowDisclosureProofPassed: REQUIRED_EVIDENCE_MARKER,
        lowDisclosureAcceptedAsCompletionEvidenceNow: false
      }
      : null,
    receiptReviewBoundary: {
      safeReferenceNameOnly: true,
      targetReferenceName: isSafeReferenceName(input.lowDisclosureReview?.targetReferenceName)
        ? input.lowDisclosureReview.targetReferenceName
        : null,
      exactAuthorizedReceiptStillRequired: true,
      localReviewSatisfiesLowDisclosureProofPassed: false,
      disclosureBudgetCategory: input.lowDisclosureReview?.disclosureBudgetCategory || null,
      redactionPolicyCategory: input.lowDisclosureReview?.redactionPolicyCategory || null,
      outputProjectionCategory: input.lowDisclosureReview?.outputProjectionCategory || null,
      endpointLocatorDisclosed: false,
      targetValueDisclosed: false,
      queryTextDisclosed: false,
      requestBodyDisclosed: false,
      responseBodyConsumed: false,
      rawOutputConsumed: false,
      rawAuditConsumed: false,
      fieldNamesDisclosed: false,
      memoryIdsDisclosed: false,
      memoryContentDisclosed: false,
      approvalLineAccepted: false,
      callsRuntime: false,
      executesNativeRead: false,
      executesFallbackRead: false,
      comparesFallbackWithNative: false,
      appliesReceiptToCompletionAudit: false,
      completesPhase2: false,
      claimsReadiness: false
    },
    actualReceiptAccepted: false,
    receiptAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformed: false,
    fallbackReadExecuted: false,
    fallbackComparisonExecuted: false,
    responseBodyRead: false,
    rawOutputRead: false,
    rawAuditRead: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'collect_exact_authorized_low_disclosure_proof_receipt_before_marking_lowDisclosureProofPassed'
      : 'repair_low_disclosure_proof_receipt_review_without_raw_output_or_runtime_values'
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_DISCLOSURE_BUDGET_CATEGORY,
  REQUIRED_OUTPUT_PROJECTION_CATEGORY,
  REQUIRED_PREREQUISITES,
  REQUIRED_RECEIPT_CATEGORY,
  REQUIRED_RECEIPT_FIELD,
  REQUIRED_REDACTION_POLICY_CATEGORY,
  REQUIRED_SAFE_REFERENCE_CATEGORY,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2LowDisclosureProofReceiptReviewContract
};
