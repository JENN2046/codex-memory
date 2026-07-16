'use strict';

const {
  EXACT_RECEIPT_REQUIREMENTS
} = require('./NearModelMemoryPlanPackEvidenceTraceMatrix');
const {
  CONTRACT_MODE: ROUTE_CONTRACT_MODE,
  CONTRACT_NAME: ROUTE_CONTRACT_NAME
} = require('./NearModelMemoryPlanPackRemainingEvidenceRouteContract');

const CONTRACT_NAME = 'Phase2ExactReceiptRequestBoundaryContract';
const CONTRACT_MODE = 'local_phase2_exact_receipt_request_boundary_only';
const SCHEMA_VERSION = 1;

const PHASE2_REQUIREMENT_ID = 'phase2_readonly_realtime_native_memory';
const PHASE2_EXACT_RECEIPT_FIELDS = Object.freeze(
  [...EXACT_RECEIPT_REQUIREMENTS[PHASE2_REQUIREMENT_ID]]
);

const ALLOWED_MODES = Object.freeze(['local-phase2-exact-receipt-request-boundary']);
const ALLOWED_DECISIONS = Object.freeze([
  'phase2_exact_receipt_request_boundary_prepared',
  'phase2_exact_receipt_request_boundary_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'routeSource',
  'routeResult',
  'requestBoundary',
  'expectedDecision',
  'counters'
]);

const REQUIRED_ROUTE_SOURCE_FIELDS = Object.freeze([
  'sourceTaskId',
  'sourceValidationId',
  'sourceReport',
  'sourceContractName',
  'sourceContractMode'
]);

const REQUIRED_ROUTE_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'blockers',
  'routeAccepted',
  'routeSummary',
  'routeCounts',
  'totalMissingRequirements',
  'nextGate',
  'fullPlanPackCompleted',
  'readinessClaimed',
  'runtimeCalled',
  'nativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed'
]);

const ROUTE_SUMMARY_BUCKETS = Object.freeze([
  'exact_authorized_receipt_required',
  'external_review_required',
  'local_command_gate_required',
  'local_contract_or_source_evidence_required',
  'objective_invariant_required'
]);

const REQUIRED_ROUTE_COUNT_FIELDS = ROUTE_SUMMARY_BUCKETS;

const REQUIRED_REQUEST_BOUNDARY_FIELDS = Object.freeze([
  'boundaryPrepared',
  'phaseId',
  'exactAuthorizedReceiptsRequired',
  'lowDisclosureOnly',
  'categoryOnly',
  'separateJennApprovalRequired',
  'approvalAcceptedByThisContract',
  'receiptAcceptedByThisContract',
  'receiptAppliedByThisContract',
  'nativeTargetBindingExecuted',
  'liveNativeReadExecuted',
  'fallbackReadExecuted',
  'fallbackNativeComparisonExecuted',
  'auditRowsRead',
  'scopeIdentifiersDisclosed',
  'platformCommandsExecuted',
  'localContractsAllowedToSatisfyExactReceipts',
  'phase2CompletionClaimed'
]);

const COUNTER_FIELDS = Object.freeze([
  'approvalGrantsAccepted',
  'approvalLineOperations',
  'receiptAcceptances',
  'receiptApplications',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeTargetBindings',
  'nativeReadAttempts',
  'fallbackReadAttempts',
  'fallbackNativeComparisons',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'auditRowReads',
  'scopeIdentifierDisclosures',
  'platformCommandExecutions',
  'serviceStartStopActions',
  'processInspections',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const ROUTE_STOP_TRUE_FIELDS = Object.freeze([
  ['routeResult', 'fullPlanPackCompleted'],
  ['routeResult', 'readinessClaimed'],
  ['routeResult', 'runtimeCalled'],
  ['routeResult', 'nativeReadExecuted'],
  ['routeResult', 'nativeWriteExecuted'],
  ['routeResult', 'durableMutationPerformed'],
  ['routeResult', 'providerApiCalled'],
  ['routeResult', 'publicMcpExpanded'],
  ['routeResult', 'tagCreated'],
  ['routeResult', 'releasePublished'],
  ['routeResult', 'deploymentTriggered'],
  ['routeResult', 'cutoverPerformed']
]);

const REQUEST_STOP_TRUE_FIELDS = Object.freeze([
  ['requestBoundary', 'approvalAcceptedByThisContract'],
  ['requestBoundary', 'receiptAcceptedByThisContract'],
  ['requestBoundary', 'receiptAppliedByThisContract'],
  ['requestBoundary', 'nativeTargetBindingExecuted'],
  ['requestBoundary', 'liveNativeReadExecuted'],
  ['requestBoundary', 'fallbackReadExecuted'],
  ['requestBoundary', 'fallbackNativeComparisonExecuted'],
  ['requestBoundary', 'auditRowsRead'],
  ['requestBoundary', 'scopeIdentifiersDisclosed'],
  ['requestBoundary', 'platformCommandsExecuted'],
  ['requestBoundary', 'localContractsAllowedToSatisfyExactReceipts'],
  ['requestBoundary', 'phase2CompletionClaimed']
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
  'receiptBody',
  'receiptContent',
  'receiptValue',
  'approvalValue',
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
  'commandText',
  'stdout',
  'stderr',
  'environment',
  'processDetails',
  'reviewTranscript',
  'reviewerIdentity',
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

function collectUnexpectedRouteSummary(input) {
  if (!isPlainObject(input.routeResult) || !isPlainObject(input.routeResult.routeSummary)) return [];
  return collectUnexpectedKeys(input.routeResult.routeSummary, ROUTE_SUMMARY_BUCKETS, 'routeResult.routeSummary');
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.routeSource, REQUIRED_ROUTE_SOURCE_FIELDS, 'routeSource'),
    ...collectUnexpectedKeys(input.routeResult, REQUIRED_ROUTE_RESULT_FIELDS, 'routeResult'),
    ...collectUnexpectedKeys(input.routeResult && input.routeResult.routeCounts, REQUIRED_ROUTE_COUNT_FIELDS, 'routeResult.routeCounts'),
    ...collectUnexpectedRouteSummary(input),
    ...collectUnexpectedKeys(input.requestBoundary, REQUIRED_REQUEST_BOUNDARY_FIELDS, 'requestBoundary'),
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
  return [...ROUTE_STOP_TRUE_FIELDS, ...REQUEST_STOP_TRUE_FIELDS]
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

function phase2ExactReceiptFieldsFromRoute(routeResult = {}) {
  const summary = isPlainObject(routeResult.routeSummary) ? routeResult.routeSummary : {};
  const exactRoutes = Array.isArray(summary.exact_authorized_receipt_required)
    ? summary.exact_authorized_receipt_required
    : [];

  return exactRoutes
    .filter(item => isPlainObject(item))
    .filter(item => item.scope === 'phase' && item.requirementId === PHASE2_REQUIREMENT_ID)
    .map(item => item.evidenceField)
    .filter(field => PHASE2_EXACT_RECEIPT_FIELDS.includes(field));
}

function missingPhase2ExactReceiptFields(routeResult) {
  const routed = new Set(phase2ExactReceiptFieldsFromRoute(routeResult));
  return PHASE2_EXACT_RECEIPT_FIELDS.filter(field => !routed.has(field));
}

function validateRouteSource(routeSource) {
  const blockers = [];
  if (routeSource.sourceTaskId !== 'CM-2053') blockers.push('routeSource.sourceTaskId');
  if (routeSource.sourceValidationId !== 'CMV-2154') blockers.push('routeSource.sourceValidationId');
  if (routeSource.sourceReport !== 'docs/near-model-memory-plan-pack/remaining_evidence_route_contract_report.md') {
    blockers.push('routeSource.sourceReport');
  }
  if (routeSource.sourceContractName !== ROUTE_CONTRACT_NAME) blockers.push('routeSource.sourceContractName');
  if (routeSource.sourceContractMode !== ROUTE_CONTRACT_MODE) blockers.push('routeSource.sourceContractMode');
  return blockers;
}

function validateRouteResult(routeResult) {
  const blockers = [];
  if (routeResult.accepted !== true) blockers.push('routeResult.accepted');
  if (routeResult.routeAccepted !== true) blockers.push('routeResult.routeAccepted');
  if (routeResult.contractName !== ROUTE_CONTRACT_NAME) blockers.push('routeResult.contractName');
  if (routeResult.contractMode !== ROUTE_CONTRACT_MODE) blockers.push('routeResult.contractMode');
  if (routeResult.decision !== 'remaining_evidence_route_ready') blockers.push('routeResult.decision');
  if (
    routeResult.nextGate !==
    'collect_exact_authorized_receipts_under_separate_approval_before_completion_claims'
  ) {
    blockers.push('routeResult.nextGate');
  }
  if (!isPlainObject(routeResult.routeSummary)) blockers.push('routeResult.routeSummary');
  if (!isPlainObject(routeResult.routeCounts)) blockers.push('routeResult.routeCounts');
  if (
    !isPlainObject(routeResult.routeCounts) ||
    !Number.isInteger(routeResult.routeCounts.exact_authorized_receipt_required) ||
    routeResult.routeCounts.exact_authorized_receipt_required <= 0
  ) {
    blockers.push('routeResult.routeCounts.exact_authorized_receipt_required');
  }
  if (!Number.isInteger(routeResult.totalMissingRequirements) || routeResult.totalMissingRequirements <= 0) {
    blockers.push('routeResult.totalMissingRequirements');
  }
  return blockers;
}

function validateRequestBoundary(requestBoundary) {
  return [
    ...missingTrueFields(requestBoundary, [
      'boundaryPrepared',
      'exactAuthorizedReceiptsRequired',
      'lowDisclosureOnly',
      'categoryOnly',
      'separateJennApprovalRequired'
    ], 'requestBoundary'),
    ...invalidFalseFields(requestBoundary, [
      'approvalAcceptedByThisContract',
      'receiptAcceptedByThisContract',
      'receiptAppliedByThisContract',
      'nativeTargetBindingExecuted',
      'liveNativeReadExecuted',
      'fallbackReadExecuted',
      'fallbackNativeComparisonExecuted',
      'auditRowsRead',
      'scopeIdentifiersDisclosed',
      'platformCommandsExecuted',
      'localContractsAllowedToSatisfyExactReceipts',
      'phase2CompletionClaimed'
    ], 'requestBoundary'),
    requestBoundary.phaseId === PHASE2_REQUIREMENT_ID ? null : 'requestBoundary.phaseId'
  ].filter(Boolean);
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...validateRouteSource(input.routeSource),
    ...validateRouteResult(input.routeResult),
    ...validateRequestBoundary(input.requestBoundary)
  ];

  const missingPhase2Fields = missingPhase2ExactReceiptFields(input.routeResult);
  for (const field of missingPhase2Fields) {
    blockers.push(`phase2ExactReceiptRoute.${field}`);
  }

  if (blockers.length > 0) {
    return { decision: 'phase2_exact_receipt_request_boundary_blocked', blockers };
  }

  return { decision: 'phase2_exact_receipt_request_boundary_prepared', blockers: [] };
}

function futureReceiptRequestEntries() {
  return PHASE2_EXACT_RECEIPT_FIELDS.map(evidenceField => ({
    phaseId: PHASE2_REQUIREMENT_ID,
    evidenceField,
    requiredEvidenceKind: 'future_exact_authorized_receipt',
    separateJennApprovalRequired: true,
    acceptedAsReceiptNow: false,
    acceptedAsCompletionEvidenceNow: false
  }));
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    requestBoundaryPrepared: false,
    receiptAcceptedByThisContract: false,
    receiptAppliedByThisContract: false,
    currentPhase2Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    ...extras
  };
}

function evaluatePhase2ExactReceiptRequestBoundaryContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_ROUTE_SOURCE_FIELDS, input.routeSource, 'routeSource'),
    ...missingFields(REQUIRED_ROUTE_RESULT_FIELDS, input.routeResult, 'routeResult'),
    ...missingFields(REQUIRED_ROUTE_COUNT_FIELDS, input.routeResult && input.routeResult.routeCounts, 'routeResult.routeCounts'),
    ...missingFields(ROUTE_SUMMARY_BUCKETS, input.routeResult && input.routeResult.routeSummary, 'routeResult.routeSummary'),
    ...missingFields(REQUIRED_REQUEST_BOUNDARY_FIELDS, input.requestBoundary, 'requestBoundary'),
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

  if (computed.decision === 'stop_l4') {
    return {
      ...failure('stop_l4'),
      decision: computed.decision,
      blockers: computed.blockers
    };
  }
  if (computed.decision !== 'phase2_exact_receipt_request_boundary_prepared') {
    return {
      ...failure('phase2_exact_receipt_request_boundary_not_ready'),
      decision: computed.decision,
      blockers: computed.blockers
    };
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: [],
    requestBoundaryPrepared: true,
    phaseId: PHASE2_REQUIREMENT_ID,
    requestedReceiptEvidenceFields: PHASE2_EXACT_RECEIPT_FIELDS,
    futureReceiptRequests: futureReceiptRequestEntries(),
    routeSourceTaskId: input.routeSource.sourceTaskId,
    routeSourceValidationId: input.routeSource.sourceValidationId,
    nextGate: 'await_separate_jenn_exact_authorization_before_phase2_receipt_collection_or_application',
    receiptAcceptedByThisContract: false,
    receiptAppliedByThisContract: false,
    currentPhase2Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  PHASE2_EXACT_RECEIPT_FIELDS,
  PHASE2_REQUIREMENT_ID,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2ExactReceiptRequestBoundaryContract,
  phase2ExactReceiptFieldsFromRoute
};
