'use strict';

const {
  REQUIRED_EVIDENCE_MARKER
} = require('./Phase2NativeReadProofReceiptAuditIntakeContract');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'Phase2NativeReadProofReceiptReviewContract';
const CONTRACT_MODE = 'local_phase2_native_read_proof_receipt_review_only';
const SCHEMA_VERSION = 1;

const REQUIRED_PREREQUISITES = Object.freeze([
  'cm2025ReceiptAuditIntakeAccepted',
  'cm2037ReceiptSchemaCompatibilityAccepted',
  'cm2038TargetBindingReceiptReviewAccepted',
  'traceMatrixStillRequiresExactReceiptEvidence',
  'completionAuditStillRequiresNativeReadProofPassed',
  'localReviewDoesNotSatisfyNativeReadProof'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'reviewPrepared',
  'receiptField',
  'requiredReceiptCategory',
  'targetReferenceName',
  'safeReferenceNameCategory',
  'nativeReadObservedCategory',
  'queryBoundaryCategory',
  'resultShapeCategory',
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
  'approvalLineIncluded',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_RECEIPT_FIELD = 'nativeReadProofPassed';
const REQUIRED_RECEIPT_CATEGORY = 'nativeReadProofReceipt';
const REQUIRED_SAFE_REFERENCE_CATEGORY = 'safe_reference_name_only';
const REQUIRED_QUERY_BOUNDARY_CATEGORY = 'category_only_bounded_read_probe';
const REQUIRED_RESULT_SHAPE_CATEGORY = 'category_only_no_field_names';

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
  'responseBodyReads',
  'responseShapeInspections',
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
  'nativeReadProofPassed',
  'responseBodyRead',
  'responseShapeInspected',
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

function invalidNativeReadProofReview(review) {
  if (!isPlainObject(review)) return ['nativeReadProofReview'];
  const blockers = [];

  blockers.push(...missingFields(review, REQUIRED_REVIEW_FIELDS, 'nativeReadProofReview'));

  if (review.reviewPrepared !== true) blockers.push('nativeReadProofReview.reviewPrepared');
  if (review.receiptField !== REQUIRED_RECEIPT_FIELD) blockers.push('nativeReadProofReview.receiptField');
  if (review.requiredReceiptCategory !== REQUIRED_RECEIPT_CATEGORY) {
    blockers.push('nativeReadProofReview.requiredReceiptCategory');
  }
  if (!isSafeReferenceName(review.targetReferenceName)) {
    blockers.push('nativeReadProofReview.targetReferenceName');
  }
  if (review.safeReferenceNameCategory !== REQUIRED_SAFE_REFERENCE_CATEGORY) {
    blockers.push('nativeReadProofReview.safeReferenceNameCategory');
  }
  if (review.nativeReadObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('nativeReadProofReview.nativeReadObservedCategory');
  }
  if (review.queryBoundaryCategory !== REQUIRED_QUERY_BOUNDARY_CATEGORY) {
    blockers.push('nativeReadProofReview.queryBoundaryCategory');
  }
  if (review.resultShapeCategory !== REQUIRED_RESULT_SHAPE_CATEGORY) {
    blockers.push('nativeReadProofReview.resultShapeCategory');
  }
  for (const field of ['categoryOnly', 'lowDisclosureOnly']) {
    if (review[field] !== true) blockers.push(`nativeReadProofReview.${field}`);
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
    'approvalLineIncluded',
    'acceptedAsCompletionEvidenceNow'
  ]) {
    if (review[field] !== false) blockers.push(`nativeReadProofReview.${field}`);
  }

  return blockers;
}

function invalidProposedCompletionEvidence(evidence) {
  if (!isPlainObject(evidence)) return ['proposedCompletionEvidence'];
  const blockers = [];
  if (evidence.nativeReadProofPassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.nativeReadProofPassed');
  }
  if (evidence.phase2NativeReadProofReceiptReviewPassed !== true) {
    blockers.push('proposedCompletionEvidence.phase2NativeReadProofReceiptReviewPassed');
  }
  for (const field of Object.keys(evidence)) {
    if (![
      'nativeReadProofPassed',
      'phase2NativeReadProofReceiptReviewPassed'
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
    phase2NativeReadProofReceiptReviewPassed: false,
    nativeReadProofPassed: false,
    actualReceiptAccepted: false,
    receiptAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformed: false,
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

function evaluatePhase2NativeReadProofReceiptReviewContract(input = {}) {
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
    ...invalidNativeReadProofReview(input.nativeReadProofReview),
    ...invalidProposedCompletionEvidence(input.proposedCompletionEvidence)
  ];
  const accepted = blockers.length === 0;

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'phase2_native_read_proof_receipt_review_accepted'
      : 'phase2_native_read_proof_receipt_review_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    phase2NativeReadProofReceiptReviewPassed: accepted,
    nativeReadProofPassed: false,
    proposedCompletionEvidence: accepted
      ? {
        phase2NativeReadProofReceiptReviewPassed: true,
        nativeReadProofPassed: REQUIRED_EVIDENCE_MARKER,
        nativeReadProofAcceptedAsCompletionEvidenceNow: false
      }
      : null,
    receiptReviewBoundary: {
      safeReferenceNameOnly: true,
      targetReferenceName: isSafeReferenceName(input.nativeReadProofReview?.targetReferenceName)
        ? input.nativeReadProofReview.targetReferenceName
        : null,
      exactAuthorizedReceiptStillRequired: true,
      localReviewSatisfiesNativeReadProofPassed: false,
      queryBoundaryCategory: input.nativeReadProofReview?.queryBoundaryCategory || null,
      resultShapeCategory: input.nativeReadProofReview?.resultShapeCategory || null,
      endpointLocatorDisclosed: false,
      targetValueDisclosed: false,
      queryTextDisclosed: false,
      requestBodyDisclosed: false,
      responseBodyConsumed: false,
      fieldNamesDisclosed: false,
      memoryIdsDisclosed: false,
      approvalLineAccepted: false,
      callsRuntime: false,
      executesNativeRead: false,
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
      ? 'collect_exact_authorized_native_read_proof_receipt_before_marking_nativeReadProofPassed'
      : 'repair_native_read_proof_receipt_review_without_runtime_query_or_response_values'
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_PREREQUISITES,
  REQUIRED_QUERY_BOUNDARY_CATEGORY,
  REQUIRED_RECEIPT_CATEGORY,
  REQUIRED_RECEIPT_FIELD,
  REQUIRED_RESULT_SHAPE_CATEGORY,
  REQUIRED_SAFE_REFERENCE_CATEGORY,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptReviewContract
};
