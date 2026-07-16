'use strict';

const {
  REQUIRED_EVIDENCE_MARKER
} = require('./Phase2NativeReadProofReceiptAuditIntakeContract');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'Phase2FallbackDistinctionReceiptReviewContract';
const CONTRACT_MODE = 'local_phase2_fallback_distinction_receipt_review_only';
const SCHEMA_VERSION = 1;

const REQUIRED_PREREQUISITES = Object.freeze([
  'cm2025ReceiptAuditIntakeAccepted',
  'cm2037ReceiptSchemaCompatibilityAccepted',
  'cm2038TargetBindingReceiptReviewAccepted',
  'cm2039NativeReadProofReceiptReviewAccepted',
  'traceMatrixStillRequiresExactReceiptEvidence',
  'completionAuditStillRequiresFallbackDistinctionPassed',
  'localReviewDoesNotSatisfyFallbackDistinction'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'reviewPrepared',
  'receiptField',
  'requiredReceiptCategory',
  'targetReferenceName',
  'safeReferenceNameCategory',
  'fallbackDistinctionObservedCategory',
  'nativeRouteCategory',
  'fallbackRouteCategory',
  'fallbackPolicyCategory',
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
  'fallbackResultIncluded',
  'nativeResultIncluded',
  'approvalLineIncluded',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_RECEIPT_FIELD = 'fallbackDistinctionPassed';
const REQUIRED_RECEIPT_CATEGORY = 'fallbackDistinctionReceipt';
const REQUIRED_SAFE_REFERENCE_CATEGORY = 'safe_reference_name_only';
const REQUIRED_NATIVE_ROUTE_CATEGORY = 'native_route_category_only';
const REQUIRED_FALLBACK_ROUTE_CATEGORY = 'fallback_route_category_only';
const REQUIRED_FALLBACK_POLICY_CATEGORY = 'fallback_distinction_policy_category_only';

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
  'fallbackDistinctionPassed',
  'responseBodyRead',
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
  'rawAudit',
  'raw_audit',
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

function invalidFallbackDistinctionReview(review) {
  if (!isPlainObject(review)) return ['fallbackDistinctionReview'];
  const blockers = [];

  blockers.push(...missingFields(review, REQUIRED_REVIEW_FIELDS, 'fallbackDistinctionReview'));

  if (review.reviewPrepared !== true) blockers.push('fallbackDistinctionReview.reviewPrepared');
  if (review.receiptField !== REQUIRED_RECEIPT_FIELD) blockers.push('fallbackDistinctionReview.receiptField');
  if (review.requiredReceiptCategory !== REQUIRED_RECEIPT_CATEGORY) {
    blockers.push('fallbackDistinctionReview.requiredReceiptCategory');
  }
  if (!isSafeReferenceName(review.targetReferenceName)) {
    blockers.push('fallbackDistinctionReview.targetReferenceName');
  }
  if (review.safeReferenceNameCategory !== REQUIRED_SAFE_REFERENCE_CATEGORY) {
    blockers.push('fallbackDistinctionReview.safeReferenceNameCategory');
  }
  if (review.fallbackDistinctionObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('fallbackDistinctionReview.fallbackDistinctionObservedCategory');
  }
  if (review.nativeRouteCategory !== REQUIRED_NATIVE_ROUTE_CATEGORY) {
    blockers.push('fallbackDistinctionReview.nativeRouteCategory');
  }
  if (review.fallbackRouteCategory !== REQUIRED_FALLBACK_ROUTE_CATEGORY) {
    blockers.push('fallbackDistinctionReview.fallbackRouteCategory');
  }
  if (review.fallbackPolicyCategory !== REQUIRED_FALLBACK_POLICY_CATEGORY) {
    blockers.push('fallbackDistinctionReview.fallbackPolicyCategory');
  }
  for (const field of ['categoryOnly', 'lowDisclosureOnly']) {
    if (review[field] !== true) blockers.push(`fallbackDistinctionReview.${field}`);
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
    'fallbackResultIncluded',
    'nativeResultIncluded',
    'approvalLineIncluded',
    'acceptedAsCompletionEvidenceNow'
  ]) {
    if (review[field] !== false) blockers.push(`fallbackDistinctionReview.${field}`);
  }

  return blockers;
}

function invalidProposedCompletionEvidence(evidence) {
  if (!isPlainObject(evidence)) return ['proposedCompletionEvidence'];
  const blockers = [];
  if (evidence.fallbackDistinctionPassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.fallbackDistinctionPassed');
  }
  if (evidence.phase2FallbackDistinctionReceiptReviewPassed !== true) {
    blockers.push('proposedCompletionEvidence.phase2FallbackDistinctionReceiptReviewPassed');
  }
  for (const field of Object.keys(evidence)) {
    if (![
      'fallbackDistinctionPassed',
      'phase2FallbackDistinctionReceiptReviewPassed'
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
    phase2FallbackDistinctionReceiptReviewPassed: false,
    fallbackDistinctionPassed: false,
    actualReceiptAccepted: false,
    receiptAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformed: false,
    fallbackReadExecuted: false,
    fallbackComparisonExecuted: false,
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

function evaluatePhase2FallbackDistinctionReceiptReviewContract(input = {}) {
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
    ...invalidFallbackDistinctionReview(input.fallbackDistinctionReview),
    ...invalidProposedCompletionEvidence(input.proposedCompletionEvidence)
  ];
  const accepted = blockers.length === 0;

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'phase2_fallback_distinction_receipt_review_accepted'
      : 'phase2_fallback_distinction_receipt_review_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    phase2FallbackDistinctionReceiptReviewPassed: accepted,
    fallbackDistinctionPassed: false,
    proposedCompletionEvidence: accepted
      ? {
        phase2FallbackDistinctionReceiptReviewPassed: true,
        fallbackDistinctionPassed: REQUIRED_EVIDENCE_MARKER,
        fallbackDistinctionAcceptedAsCompletionEvidenceNow: false
      }
      : null,
    receiptReviewBoundary: {
      safeReferenceNameOnly: true,
      targetReferenceName: isSafeReferenceName(input.fallbackDistinctionReview?.targetReferenceName)
        ? input.fallbackDistinctionReview.targetReferenceName
        : null,
      exactAuthorizedReceiptStillRequired: true,
      localReviewSatisfiesFallbackDistinctionPassed: false,
      nativeRouteCategory: input.fallbackDistinctionReview?.nativeRouteCategory || null,
      fallbackRouteCategory: input.fallbackDistinctionReview?.fallbackRouteCategory || null,
      fallbackPolicyCategory: input.fallbackDistinctionReview?.fallbackPolicyCategory || null,
      endpointLocatorDisclosed: false,
      targetValueDisclosed: false,
      queryTextDisclosed: false,
      requestBodyDisclosed: false,
      responseBodyConsumed: false,
      fieldNamesDisclosed: false,
      memoryIdsDisclosed: false,
      fallbackResultDisclosed: false,
      nativeResultDisclosed: false,
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
      ? 'collect_exact_authorized_fallback_distinction_receipt_before_marking_fallbackDistinctionPassed'
      : 'repair_fallback_distinction_receipt_review_without_runtime_or_result_values'
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_FALLBACK_POLICY_CATEGORY,
  REQUIRED_FALLBACK_ROUTE_CATEGORY,
  REQUIRED_NATIVE_ROUTE_CATEGORY,
  REQUIRED_PREREQUISITES,
  REQUIRED_RECEIPT_CATEGORY,
  REQUIRED_RECEIPT_FIELD,
  REQUIRED_SAFE_REFERENCE_CATEGORY,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2FallbackDistinctionReceiptReviewContract
};
