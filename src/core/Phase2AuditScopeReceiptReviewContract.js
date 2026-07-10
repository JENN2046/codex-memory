'use strict';

const {
  REQUIRED_EVIDENCE_MARKER
} = require('./Phase2NativeReadProofReceiptAuditIntakeContract');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'Phase2AuditScopeReceiptReviewContract';
const CONTRACT_MODE = 'local_phase2_audit_scope_receipt_review_only';
const SCHEMA_VERSION = 1;

const REQUIRED_PREREQUISITES = Object.freeze([
  'cm2025ReceiptAuditIntakeAccepted',
  'cm2037ReceiptSchemaCompatibilityAccepted',
  'cm2038TargetBindingReceiptReviewAccepted',
  'cm2039NativeReadProofReceiptReviewAccepted',
  'cm2040FallbackDistinctionReceiptReviewAccepted',
  'cm2041LowDisclosureProofReceiptReviewAccepted',
  'traceMatrixStillRequiresExactReceiptEvidence',
  'completionAuditStillRequiresAuditReceiptPassed',
  'completionAuditStillRequiresScopeVisibilityIsolationPassed',
  'localReviewDoesNotSatisfyAuditOrScopeProof'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'reviewPrepared',
  'targetReferenceName',
  'safeReferenceNameCategory',
  'auditReceiptField',
  'auditReceiptCategory',
  'auditReceiptObservedCategory',
  'scopeVisibilityReceiptField',
  'scopeVisibilityReceiptCategory',
  'scopeVisibilityObservedCategory',
  'auditProjectionCategory',
  'scopeVisibilityCategory',
  'isolationBoundaryCategory',
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
  'auditRowsIncluded',
  'scopeIdentifiersIncluded',
  'approvalLineIncluded',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_AUDIT_RECEIPT_FIELD = 'auditReceiptPassed';
const REQUIRED_SCOPE_RECEIPT_FIELD = 'scopeVisibilityIsolationPassed';
const REQUIRED_AUDIT_RECEIPT_CATEGORY = 'auditReceipt';
const REQUIRED_SCOPE_RECEIPT_CATEGORY = 'scopeVisibilityIsolationReceipt';
const REQUIRED_SAFE_REFERENCE_CATEGORY = 'safe_reference_name_only';
const REQUIRED_AUDIT_PROJECTION_CATEGORY = 'audit_projection_category_only';
const REQUIRED_SCOPE_VISIBILITY_CATEGORY = 'scope_visibility_category_only';
const REQUIRED_ISOLATION_BOUNDARY_CATEGORY = 'isolation_boundary_category_only';

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
  'auditRowReads',
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
  'auditReceiptPassed',
  'scopeVisibilityIsolationPassed',
  'responseBodyRead',
  'rawOutputRead',
  'rawAuditRead',
  'auditRowsRead',
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
  'auditRows',
  'audit_rows',
  'rawMemory',
  'raw_memory',
  'memoryContent',
  'memory_content',
  'fieldNames',
  'field_names',
  'memoryIds',
  'memory_ids',
  'scopeIdentifiers',
  'scope_identifiers',
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

function invalidAuditScopeReview(review) {
  if (!isPlainObject(review)) return ['auditScopeReview'];
  const blockers = [];

  blockers.push(...missingFields(review, REQUIRED_REVIEW_FIELDS, 'auditScopeReview'));

  if (review.reviewPrepared !== true) blockers.push('auditScopeReview.reviewPrepared');
  if (!isSafeReferenceName(review.targetReferenceName)) blockers.push('auditScopeReview.targetReferenceName');
  if (review.safeReferenceNameCategory !== REQUIRED_SAFE_REFERENCE_CATEGORY) {
    blockers.push('auditScopeReview.safeReferenceNameCategory');
  }
  if (review.auditReceiptField !== REQUIRED_AUDIT_RECEIPT_FIELD) {
    blockers.push('auditScopeReview.auditReceiptField');
  }
  if (review.auditReceiptCategory !== REQUIRED_AUDIT_RECEIPT_CATEGORY) {
    blockers.push('auditScopeReview.auditReceiptCategory');
  }
  if (review.auditReceiptObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('auditScopeReview.auditReceiptObservedCategory');
  }
  if (review.scopeVisibilityReceiptField !== REQUIRED_SCOPE_RECEIPT_FIELD) {
    blockers.push('auditScopeReview.scopeVisibilityReceiptField');
  }
  if (review.scopeVisibilityReceiptCategory !== REQUIRED_SCOPE_RECEIPT_CATEGORY) {
    blockers.push('auditScopeReview.scopeVisibilityReceiptCategory');
  }
  if (review.scopeVisibilityObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('auditScopeReview.scopeVisibilityObservedCategory');
  }
  if (review.auditProjectionCategory !== REQUIRED_AUDIT_PROJECTION_CATEGORY) {
    blockers.push('auditScopeReview.auditProjectionCategory');
  }
  if (review.scopeVisibilityCategory !== REQUIRED_SCOPE_VISIBILITY_CATEGORY) {
    blockers.push('auditScopeReview.scopeVisibilityCategory');
  }
  if (review.isolationBoundaryCategory !== REQUIRED_ISOLATION_BOUNDARY_CATEGORY) {
    blockers.push('auditScopeReview.isolationBoundaryCategory');
  }
  for (const field of ['categoryOnly', 'lowDisclosureOnly']) {
    if (review[field] !== true) blockers.push(`auditScopeReview.${field}`);
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
    'auditRowsIncluded',
    'scopeIdentifiersIncluded',
    'approvalLineIncluded',
    'acceptedAsCompletionEvidenceNow'
  ]) {
    if (review[field] !== false) blockers.push(`auditScopeReview.${field}`);
  }

  return blockers;
}

function invalidProposedCompletionEvidence(evidence) {
  if (!isPlainObject(evidence)) return ['proposedCompletionEvidence'];
  const blockers = [];
  if (evidence.phase2AuditScopeReceiptReviewPassed !== true) {
    blockers.push('proposedCompletionEvidence.phase2AuditScopeReceiptReviewPassed');
  }
  if (evidence.auditReceiptPassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.auditReceiptPassed');
  }
  if (evidence.scopeVisibilityIsolationPassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.scopeVisibilityIsolationPassed');
  }
  for (const field of Object.keys(evidence)) {
    if (![
      'phase2AuditScopeReceiptReviewPassed',
      'auditReceiptPassed',
      'scopeVisibilityIsolationPassed'
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
    phase2AuditScopeReceiptReviewPassed: false,
    auditReceiptPassed: false,
    scopeVisibilityIsolationPassed: false,
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
    auditRowsRead: false,
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

function evaluatePhase2AuditScopeReceiptReviewContract(input = {}) {
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
    ...invalidAuditScopeReview(input.auditScopeReview),
    ...invalidProposedCompletionEvidence(input.proposedCompletionEvidence)
  ];
  const accepted = blockers.length === 0;

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'phase2_audit_scope_receipt_review_accepted'
      : 'phase2_audit_scope_receipt_review_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    phase2AuditScopeReceiptReviewPassed: accepted,
    auditReceiptPassed: false,
    scopeVisibilityIsolationPassed: false,
    proposedCompletionEvidence: accepted
      ? {
        phase2AuditScopeReceiptReviewPassed: true,
        auditReceiptPassed: REQUIRED_EVIDENCE_MARKER,
        scopeVisibilityIsolationPassed: REQUIRED_EVIDENCE_MARKER,
        auditScopeAcceptedAsCompletionEvidenceNow: false
      }
      : null,
    receiptReviewBoundary: {
      safeReferenceNameOnly: true,
      targetReferenceName: isSafeReferenceName(input.auditScopeReview?.targetReferenceName)
        ? input.auditScopeReview.targetReferenceName
        : null,
      exactAuthorizedAuditReceiptStillRequired: true,
      exactAuthorizedScopeVisibilityReceiptStillRequired: true,
      localReviewSatisfiesAuditReceiptPassed: false,
      localReviewSatisfiesScopeVisibilityIsolationPassed: false,
      auditProjectionCategory: input.auditScopeReview?.auditProjectionCategory || null,
      scopeVisibilityCategory: input.auditScopeReview?.scopeVisibilityCategory || null,
      isolationBoundaryCategory: input.auditScopeReview?.isolationBoundaryCategory || null,
      endpointLocatorDisclosed: false,
      targetValueDisclosed: false,
      queryTextDisclosed: false,
      requestBodyDisclosed: false,
      responseBodyConsumed: false,
      rawOutputConsumed: false,
      rawAuditConsumed: false,
      auditRowsConsumed: false,
      fieldNamesDisclosed: false,
      memoryIdsDisclosed: false,
      memoryContentDisclosed: false,
      scopeIdentifiersDisclosed: false,
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
    auditRowsRead: false,
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
      ? 'collect_exact_authorized_audit_and_scope_visibility_receipts_before_marking_auditReceiptPassed_or_scopeVisibilityIsolationPassed'
      : 'repair_audit_scope_receipt_review_without_raw_audit_scope_or_runtime_values'
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_AUDIT_PROJECTION_CATEGORY,
  REQUIRED_AUDIT_RECEIPT_CATEGORY,
  REQUIRED_AUDIT_RECEIPT_FIELD,
  REQUIRED_ISOLATION_BOUNDARY_CATEGORY,
  REQUIRED_PREREQUISITES,
  REQUIRED_SAFE_REFERENCE_CATEGORY,
  REQUIRED_SCOPE_RECEIPT_CATEGORY,
  REQUIRED_SCOPE_RECEIPT_FIELD,
  REQUIRED_SCOPE_VISIBILITY_CATEGORY,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2AuditScopeReceiptReviewContract
};
