'use strict';

const CONTRACT_NAME = 'Phase2NativeReadProofApprovalPacketContract';
const CONTRACT_MODE = 'local_phase2_native_read_proof_approval_packet_boundary_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-approval-packet-boundary']);
const ALLOWED_DECISIONS = Object.freeze([
  'native_read_proof_approval_packet_ready_for_boundary_display',
  'native_read_proof_approval_packet_blocked_missing_prerequisites',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'readinessGateEvidence',
  'packet',
  'targetBoundary',
  'proofBudget',
  'receiptRequirements',
  'output',
  'expectedDecision',
  'counters'
]);

const REQUIRED_READINESS_FIELDS = Object.freeze([
  'cm2019EvidenceGateAccepted',
  'cm2020ReadinessGateAccepted',
  'completionAuditStillRequiresReceipts',
  'phase2StillIncomplete'
]);

const REQUIRED_PACKET_FIELDS = Object.freeze([
  'packetPrepared',
  'packetDisplayed',
  'packetSubmitted',
  'exactApprovalGranted',
  'approvalLineGenerated',
  'approvalLineValueDisclosed',
  'freshCurrentSingleUseApprovalRequired',
  'taskScopeBound',
  'operatorIntentScopeBound',
  'nonAuthorizingBoundaryOnly'
]);

const REQUIRED_TARGET_FIELDS = Object.freeze([
  'safeTargetReferenceName',
  'targetReferenceCategory',
  'nativeTargetBindingRequired',
  'endpointLocatorAbsent',
  'rawRuntimeStateAbsent',
  'providerPayloadAbsent'
]);

const REQUIRED_BUDGET_FIELDS = Object.freeze([
  'maxNativeReadAttempts',
  'maxSearchMemoryCalls',
  'maxMemoryOverviewCalls',
  'maxAuditMemoryCalls',
  'maxServiceStartStopActions',
  'maxProcessInspections',
  'allowProviderApiCalls',
  'allowNativeWrite',
  'allowDurableMutation',
  'allowPublicMcpExpansion'
]);

const REQUIRED_RECEIPT_FIELDS = Object.freeze([
  'nativeTargetBindingReceiptRequired',
  'nativeReadAttemptReceiptRequired',
  'nativeReadSuccessReceiptRequired',
  'auditReceiptRequired',
  'fallbackDistinctionReceiptRequired',
  'wslLinuxReceiptRequired',
  'windowsWslSmokeReceiptRequired',
  'lowDisclosureReceiptRequired',
  'rawResponseForbidden',
  'memoryContentForbidden'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
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
  'packetsSubmitted',
  'approvalLineOperations',
  'approvalGrantsAccepted',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
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
    ...collectUnexpectedKeys(input.readinessGateEvidence, REQUIRED_READINESS_FIELDS, 'readinessGateEvidence'),
    ...collectUnexpectedKeys(input.packet, REQUIRED_PACKET_FIELDS, 'packet'),
    ...collectUnexpectedKeys(input.targetBoundary, REQUIRED_TARGET_FIELDS, 'targetBoundary'),
    ...collectUnexpectedKeys(input.proofBudget, REQUIRED_BUDGET_FIELDS, 'proofBudget'),
    ...collectUnexpectedKeys(input.receiptRequirements, REQUIRED_RECEIPT_FIELDS, 'receiptRequirements'),
    ...collectUnexpectedKeys(input.output, REQUIRED_OUTPUT_FIELDS, 'output'),
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
    ...trueFields(input.packet, [
      'packetSubmitted',
      'exactApprovalGranted',
      'approvalLineGenerated',
      'approvalLineValueDisclosed'
    ], 'packet'),
    ...trueFields(input.output, [
      'rawValuesIncluded',
      'endpointLocatorIncluded',
      'queryTextIncluded',
      'requestBodyIncluded',
      'responseBodyIncluded',
      'memoryContentIncluded',
      'approvalLineIncluded',
      'readinessClaimIncluded'
    ], 'output'),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
}

function buildPrerequisiteBlockers(input) {
  const blockers = [
    ...missingTrueFields(input.readinessGateEvidence, REQUIRED_READINESS_FIELDS, 'readinessGateEvidence'),
    ...missingTrueFields(input.receiptRequirements, REQUIRED_RECEIPT_FIELDS, 'receiptRequirements')
  ];

  for (const field of [
    'packetPrepared',
    'freshCurrentSingleUseApprovalRequired',
    'taskScopeBound',
    'operatorIntentScopeBound',
    'nonAuthorizingBoundaryOnly'
  ]) {
    if (input.packet[field] !== true) blockers.push(`packet.${field}`);
  }
  for (const field of [
    'safeTargetReferenceName',
    'targetReferenceCategory'
  ]) {
    if (typeof input.targetBoundary[field] !== 'string' || input.targetBoundary[field].trim() === '') {
      blockers.push(`targetBoundary.${field}`);
    }
  }
  for (const field of [
    'nativeTargetBindingRequired',
    'endpointLocatorAbsent',
    'rawRuntimeStateAbsent',
    'providerPayloadAbsent'
  ]) {
    if (input.targetBoundary[field] !== true) blockers.push(`targetBoundary.${field}`);
  }
  if (input.proofBudget.maxNativeReadAttempts !== 1) blockers.push('proofBudget.maxNativeReadAttempts');
  if (input.proofBudget.maxSearchMemoryCalls !== 1) blockers.push('proofBudget.maxSearchMemoryCalls');
  if (input.proofBudget.maxMemoryOverviewCalls !== 1) blockers.push('proofBudget.maxMemoryOverviewCalls');
  if (input.proofBudget.maxAuditMemoryCalls !== 1) blockers.push('proofBudget.maxAuditMemoryCalls');
  if (input.proofBudget.maxServiceStartStopActions !== 0) blockers.push('proofBudget.maxServiceStartStopActions');
  if (input.proofBudget.maxProcessInspections !== 0) blockers.push('proofBudget.maxProcessInspections');
  for (const field of [
    'allowProviderApiCalls',
    'allowNativeWrite',
    'allowDurableMutation',
    'allowPublicMcpExpansion'
  ]) {
    if (input.proofBudget[field] !== false) blockers.push(`proofBudget.${field}`);
  }
  if (input.output.categoryOnly !== true) blockers.push('output.categoryOnly');
  if (input.output.lowDisclosureOnly !== true) blockers.push('output.lowDisclosureOnly');

  return blockers;
}

function computeDecision(input) {
  const stopBlockers = buildStopBlockers(input);
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const prerequisiteBlockers = buildPrerequisiteBlockers(input);
  if (prerequisiteBlockers.length > 0) {
    return {
      decision: 'native_read_proof_approval_packet_blocked_missing_prerequisites',
      blockers: prerequisiteBlockers
    };
  }

  return {
    decision: 'native_read_proof_approval_packet_ready_for_boundary_display',
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
    packetReadyForBoundaryDisplay: false,
    packetSubmitted: false,
    exactApprovalGranted: false,
    approvalLineGenerated: false,
    runtimeCalled: false,
    nativeReadAttempted: false,
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

function evaluatePhase2NativeReadProofApprovalPacketContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_READINESS_FIELDS, input.readinessGateEvidence, 'readinessGateEvidence'),
    ...missingFields(REQUIRED_PACKET_FIELDS, input.packet, 'packet'),
    ...missingFields(REQUIRED_TARGET_FIELDS, input.targetBoundary, 'targetBoundary'),
    ...missingFields(REQUIRED_BUDGET_FIELDS, input.proofBudget, 'proofBudget'),
    ...missingFields(REQUIRED_RECEIPT_FIELDS, input.receiptRequirements, 'receiptRequirements'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
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

  const accepted = computed.decision === 'native_read_proof_approval_packet_ready_for_boundary_display';
  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    packetReadyForBoundaryDisplay: accepted,
    packetSubmitted: false,
    exactApprovalGranted: false,
    approvalLineGenerated: false,
    nextGate: accepted
      ? 'display_non_authorizing_packet_for_jenn_exact_approval_boundary'
      : 'complete_missing_phase2_approval_packet_prerequisites',
    lowDisclosurePacketSummary: {
      taskId: input.taskId,
      phase: 'Phase 2',
      decision: computed.decision,
      safeTargetReferenceName: input.targetBoundary.safeTargetReferenceName,
      targetReferenceCategory: input.targetBoundary.targetReferenceCategory,
      maxNativeReadAttempts: input.proofBudget.maxNativeReadAttempts,
      readOnlyToolCallBudget:
        input.proofBudget.maxSearchMemoryCalls +
        input.proofBudget.maxMemoryOverviewCalls +
        input.proofBudget.maxAuditMemoryCalls,
      nativeTargetBindingReceiptRequired: input.receiptRequirements.nativeTargetBindingReceiptRequired,
      lowDisclosureOnly: true,
      categoryOnly: true,
      packetSubmitted: false,
      exactApprovalGranted: false,
      approvalLineIncluded: false,
      endpointLocatorIncluded: false,
      queryTextIncluded: false,
      responseBodyIncluded: false,
      memoryContentIncluded: false,
      readinessClaimed: false
    },
    runtimeCalled: false,
    nativeReadAttempted: false,
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
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofApprovalPacketContract
};
