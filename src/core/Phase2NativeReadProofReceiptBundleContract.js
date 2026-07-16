'use strict';

const CONTRACT_NAME = 'Phase2NativeReadProofReceiptBundleContract';
const CONTRACT_MODE = 'local_phase2_native_read_proof_receipt_bundle_contract_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-receipt-bundle-contract']);
const ALLOWED_DECISIONS = Object.freeze([
  'native_read_proof_receipt_bundle_contract_ready_for_future_evidence',
  'native_read_proof_receipt_bundle_contract_blocked_missing_receipts',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'bundle',
  'receiptCategories',
  'sequence',
  'disclosure',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREREQUISITE_FIELDS = Object.freeze([
  'cm2019EvidenceGateAccepted',
  'cm2020ReadinessGateAccepted',
  'cm2021ApprovalPacketContractAccepted',
  'nativeReadResponseShapeCompatibilityAccepted',
  'nativeReadReceiptSchemaCompatibilityAccepted',
  'phase2NativeTargetBindingReceiptReviewAccepted',
  'phase2NativeReadProofReceiptReviewAccepted',
  'phase2FallbackDistinctionReceiptReviewAccepted',
  'phase2LowDisclosureProofReceiptReviewAccepted',
  'phase2AuditScopeReceiptReviewAccepted',
  'phase2PlatformProofReceiptReviewAccepted',
  'completionAuditStillRequiresReceipts',
  'phase2StillIncompleteBeforeBundle'
]);

const REQUIRED_BUNDLE_FIELDS = Object.freeze([
  'bundlePrepared',
  'futureExactApprovalRequired',
  'freshSingleUseApprovalReceiptRequired',
  'receiptBundleAppliedToCompletionAudit',
  'phase2CompletionClaimed',
  'nonAuthorizingContractOnly'
]);

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'freshExactApprovalReceipt',
  'nativeTargetBindingReceipt',
  'nativeReadAttemptReceipt',
  'nativeReadSuccessReceipt',
  'auditReceipt',
  'fallbackDistinctionReceipt',
  'wslLinuxReceipt',
  'windowsWslSmokeReceipt',
  'lowDisclosureReceipt'
]);

const REQUIRED_SEQUENCE_FIELDS = Object.freeze([
  'approvalBeforeNativeRead',
  'targetBindingBeforeNativeRead',
  'nativeReadAttemptBeforeSuccess',
  'auditAfterNativeRead',
  'fallbackDistinctionSeparateFromNativeRead',
  'wslLinuxAndWindowsSmokeSeparated'
]);

const REQUIRED_DISCLOSURE_FIELDS = Object.freeze([
  'categoryOnly',
  'lowDisclosureOnly',
  'rawValuesIncluded',
  'endpointLocatorIncluded',
  'queryTextIncluded',
  'requestBodyIncluded',
  'responseBodyIncluded',
  'memoryContentIncluded',
  'approvalLineIncluded',
  'readinessClaimIncluded'
]);

const COUNTER_FIELDS = Object.freeze([
  'approvalGrantsAccepted',
  'approvalLineOperations',
  'receiptBundleApplications',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeTargetBindings',
  'nativeReadAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'serviceStartStopActions',
  'processInspections',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const REQUIRED_RECEIPT_CATEGORY = 'present_low_disclosure_category_only';

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
    ...collectUnexpectedKeys(input.receiptCategories, REQUIRED_RECEIPT_FIELDS, 'receiptCategories'),
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
      'receiptBundleAppliedToCompletionAudit',
      'phase2CompletionClaimed'
    ], 'bundle'),
    ...trueFields(input.disclosure, [
      'rawValuesIncluded',
      'endpointLocatorIncluded',
      'queryTextIncluded',
      'requestBodyIncluded',
      'responseBodyIncluded',
      'memoryContentIncluded',
      'approvalLineIncluded',
      'readinessClaimIncluded'
    ], 'disclosure'),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
}

function buildReceiptBlockers(input) {
  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.sequence, REQUIRED_SEQUENCE_FIELDS, 'sequence')
  ];

  for (const field of [
    'bundlePrepared',
    'futureExactApprovalRequired',
    'freshSingleUseApprovalReceiptRequired',
    'nonAuthorizingContractOnly'
  ]) {
    if (input.bundle[field] !== true) blockers.push(`bundle.${field}`);
  }

  for (const field of REQUIRED_RECEIPT_FIELDS) {
    if (input.receiptCategories[field] !== REQUIRED_RECEIPT_CATEGORY) {
      blockers.push(`receiptCategories.${field}`);
    }
  }

  if (input.disclosure.categoryOnly !== true) blockers.push('disclosure.categoryOnly');
  if (input.disclosure.lowDisclosureOnly !== true) blockers.push('disclosure.lowDisclosureOnly');

  return blockers;
}

function computeDecision(input) {
  const stopBlockers = buildStopBlockers(input);
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const receiptBlockers = buildReceiptBlockers(input);
  if (receiptBlockers.length > 0) {
    return {
      decision: 'native_read_proof_receipt_bundle_contract_blocked_missing_receipts',
      blockers: receiptBlockers
    };
  }

  return {
    decision: 'native_read_proof_receipt_bundle_contract_ready_for_future_evidence',
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
    futureReceiptBundleShapeAccepted: false,
    currentPhase2Completed: false,
    approvalAcceptedByThisContract: false,
    receiptBundleAppliedToCompletionAudit: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformedByThisContract: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluatePhase2NativeReadProofReceiptBundleContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(REQUIRED_BUNDLE_FIELDS, input.bundle, 'bundle'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.receiptCategories, 'receiptCategories'),
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
    'native_read_proof_receipt_bundle_contract_ready_for_future_evidence';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    requiredReceiptCategory: REQUIRED_RECEIPT_CATEGORY,
    prerequisiteChecksRequired: [...REQUIRED_PREREQUISITE_FIELDS],
    futureReceiptBundleShapeAccepted: accepted,
    currentPhase2Completed: false,
    nextGate: accepted
      ? 'collect_or_review_future_exact_authorized_low_disclosure_receipts_without_completion_claim'
      : 'complete_missing_receipt_bundle_contract_fields',
    lowDisclosureReceiptSummary: {
      taskId: input.taskId,
      phase: 'Phase 2',
      prerequisiteChecksRequired: [...REQUIRED_PREREQUISITE_FIELDS],
      receiptCategoriesRequired: [...REQUIRED_RECEIPT_FIELDS],
      receiptCategory: REQUIRED_RECEIPT_CATEGORY,
      sequenceChecksRequired: [...REQUIRED_SEQUENCE_FIELDS],
      categoryOnly: true,
      lowDisclosureOnly: true,
      approvalAcceptedByThisContract: false,
      receiptBundleAppliedToCompletionAudit: false,
      currentPhase2Completed: false,
      endpointLocatorIncluded: false,
      queryTextIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      approvalLineIncluded: false,
      readinessClaimed: false
    },
    approvalAcceptedByThisContract: false,
    receiptBundleAppliedToCompletionAudit: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformedByThisContract: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
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
  REQUIRED_RECEIPT_CATEGORY,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_PREREQUISITE_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptBundleContract
};
