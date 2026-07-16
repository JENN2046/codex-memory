'use strict';

const CONTRACT_NAME = 'Phase2GovernedNativeReadObservationContract';
const CONTRACT_MODE = 'phase2_governed_native_read_low_disclosure_observation_only';
const SCHEMA_VERSION = 1;

const REQUIRED_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'executionAuthority',
  'observations',
  'platform',
  'receiptCoverage',
  'expectedDecision',
  'counters'
]);

const REQUIRED_AUTHORITY_FIELDS = Object.freeze([
  'userPermissionEnvironmentEnabled',
  'trustedExecutionContextBound',
  'defaultReadOnlySurfaceOnly',
  'exactApprovalLinePresent',
  'writeAuthorityGranted'
]);

const REQUIRED_OBSERVATION_FIELDS = Object.freeze([
  'toolName',
  'accepted',
  'delegated',
  'primaryRuntimeCategory',
  'targetReferenceBound',
  'invocationProfileBound',
  'clientIdentityBound',
  'scopeBoundaryBound',
  'visibilityBound',
  'readAllowed',
  'writeAllowed',
  'outputDisclosureBudgetBound',
  'auditReceiptRequired',
  'localAuditReceiptAppended',
  'nativeInvocationAttempted',
  'nativeInvocationSucceeded',
  'nativeRuntimeReceiptPresent',
  'nativeRuntimeCalled',
  'providerApiCalled',
  'memoryReadPerformed',
  'memoryWritePerformed',
  'derivedIndexWritePerformed',
  'primaryMemoryStoreWritePerformed',
  'isolatedRuntimeStoreUsed',
  'localFallbackUsed',
  'rawOutputReturned',
  'rawMemoryReturned',
  'rawAuditReturned',
  'filesystemPathsReturned',
  'tokenMaterialReturned',
  'providerPayloadReturned',
  'memoryContentReturned',
  'memoryIdsReturned',
  'titlesReturned',
  'snippetsReturned',
  'readinessClaimed'
]);

const REQUIRED_PLATFORM_FIELDS = Object.freeze([
  'platformCategory',
  'wslDetected',
  'windowsHostBridgeObserved'
]);

const REQUIRED_COVERAGE_FIELDS = Object.freeze([
  'nativeTargetBindingReceiptObserved',
  'nativeReadAttemptReceiptObserved',
  'nativeReadSuccessReceiptObserved',
  'auditReceiptObserved',
  'scopeVisibilityReceiptObserved',
  'lowDisclosureReceiptObserved',
  'wslLinuxReceiptObserved',
  'freshExactApprovalReceiptObserved',
  'fallbackDistinctionReceiptObserved',
  'windowsWslSmokeReceiptObserved',
  'receiptBundleAppliedToCompletionAudit'
]);

const COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'vcpToolBoxCalls',
  'mcpToolCalls',
  'nativeReadAttempts',
  'memoryReads',
  'providerApiCalls',
  'derivedIndexWrites',
  'localAuditAppends',
  'memoryWrites',
  'primaryMemoryStoreWrites',
  'nativeWriteAttempts',
  'realMemoryContentReturns',
  'rawPrivateReads',
  'localFallbackUses',
  'publicMcpExpansions',
  'defaultRuntimeExpansions',
  'tagReleaseDeployCutoverActions',
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
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

const ALLOWED_MODES = Object.freeze([
  'phase2-governed-native-read-low-disclosure-observation'
]);
const ALLOWED_DECISIONS = Object.freeze([
  'phase2_governed_native_read_partial_observation_accepted',
  'phase2_governed_native_read_observation_blocked',
  'stop_l4'
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
  return required.filter(field => !hasOwn(actual, field)).map(field => pathJoin(prefix, field));
}

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
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

function collectUnexpectedFields(input) {
  const observations = Array.isArray(input.observations) ? input.observations : [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.executionAuthority, REQUIRED_AUTHORITY_FIELDS, 'executionAuthority'),
    ...observations.flatMap((item, index) => collectUnexpectedKeys(
      item,
      REQUIRED_OBSERVATION_FIELDS,
      `observations[${index}]`
    )),
    ...collectUnexpectedKeys(input.platform, REQUIRED_PLATFORM_FIELDS, 'platform'),
    ...collectUnexpectedKeys(input.receiptCoverage, REQUIRED_COVERAGE_FIELDS, 'receiptCoverage'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function validateAuthority(authority) {
  const blockers = [];
  for (const field of [
    'userPermissionEnvironmentEnabled',
    'trustedExecutionContextBound',
    'defaultReadOnlySurfaceOnly'
  ]) {
    if (authority[field] !== true) blockers.push(`executionAuthority.${field}`);
  }
  for (const field of ['exactApprovalLinePresent', 'writeAuthorityGranted']) {
    if (authority[field] !== false) blockers.push(`executionAuthority.${field}`);
  }
  return blockers;
}

function validateObservation(observation, index) {
  const prefix = `observations[${index}]`;
  const expectedTrue = [
    'accepted',
    'delegated',
    'targetReferenceBound',
    'invocationProfileBound',
    'clientIdentityBound',
    'scopeBoundaryBound',
    'visibilityBound',
    'readAllowed',
    'outputDisclosureBudgetBound',
    'auditReceiptRequired',
    'localAuditReceiptAppended',
    'nativeInvocationAttempted',
    'nativeInvocationSucceeded',
    'nativeRuntimeReceiptPresent',
    'nativeRuntimeCalled',
    'providerApiCalled',
    'memoryReadPerformed',
    'derivedIndexWritePerformed',
    'isolatedRuntimeStoreUsed'
  ];
  const expectedFalse = [
    'writeAllowed',
    'memoryWritePerformed',
    'primaryMemoryStoreWritePerformed',
    'localFallbackUsed',
    'rawOutputReturned',
    'rawMemoryReturned',
    'rawAuditReturned',
    'filesystemPathsReturned',
    'tokenMaterialReturned',
    'providerPayloadReturned',
    'memoryContentReturned',
    'memoryIdsReturned',
    'titlesReturned',
    'snippetsReturned',
    'readinessClaimed'
  ];
  const blockers = [];
  if (observation.toolName !== REQUIRED_TOOLS[index]) blockers.push(`${prefix}.toolName`);
  if (observation.primaryRuntimeCategory !== 'vcp_toolbox_native_memory') {
    blockers.push(`${prefix}.primaryRuntimeCategory`);
  }
  expectedTrue.forEach(field => {
    if (observation[field] !== true) blockers.push(`${prefix}.${field}`);
  });
  expectedFalse.forEach(field => {
    if (observation[field] !== false) blockers.push(`${prefix}.${field}`);
  });
  return blockers;
}

function validatePlatform(platform) {
  const blockers = [];
  if (platform.platformCategory !== 'linux') blockers.push('platform.platformCategory');
  if (platform.wslDetected !== true) blockers.push('platform.wslDetected');
  if (platform.windowsHostBridgeObserved !== false) blockers.push('platform.windowsHostBridgeObserved');
  return blockers;
}

function validateCoverage(coverage) {
  const blockers = [];
  for (const field of [
    'nativeTargetBindingReceiptObserved',
    'nativeReadAttemptReceiptObserved',
    'nativeReadSuccessReceiptObserved',
    'auditReceiptObserved',
    'scopeVisibilityReceiptObserved',
    'lowDisclosureReceiptObserved',
    'wslLinuxReceiptObserved'
  ]) {
    if (coverage[field] !== true) blockers.push(`receiptCoverage.${field}`);
  }
  for (const field of [
    'freshExactApprovalReceiptObserved',
    'fallbackDistinctionReceiptObserved',
    'windowsWslSmokeReceiptObserved',
    'receiptBundleAppliedToCompletionAudit'
  ]) {
    if (coverage[field] !== false) blockers.push(`receiptCoverage.${field}`);
  }
  return blockers;
}

function invalidCounterValues(counters) {
  const expected = {
    runtimeCalls: 3,
    vcpToolBoxCalls: 3,
    mcpToolCalls: 3,
    nativeReadAttempts: 3,
    memoryReads: 3,
    providerApiCalls: 3,
    derivedIndexWrites: 3,
    localAuditAppends: 3,
    memoryWrites: 0,
    primaryMemoryStoreWrites: 0,
    nativeWriteAttempts: 0,
    realMemoryContentReturns: 0,
    rawPrivateReads: 0,
    localFallbackUses: 0,
    publicMcpExpansions: 0,
    defaultRuntimeExpansions: 0,
    tagReleaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
  return Object.entries(expected)
    .filter(([field, value]) => counters[field] !== value)
    .map(([field]) => `counters.${field}`);
}

function stopBlockers(input) {
  const blockers = [];
  if (input.executionAuthority?.writeAuthorityGranted === true) {
    blockers.push('executionAuthority.writeAuthorityGranted');
  }
  if (input.platform?.windowsHostBridgeObserved === true) {
    blockers.push('platform.windowsHostBridgeObserved');
  }
  for (const field of [
    'freshExactApprovalReceiptObserved',
    'fallbackDistinctionReceiptObserved',
    'windowsWslSmokeReceiptObserved',
    'receiptBundleAppliedToCompletionAudit'
  ]) {
    if (input.receiptCoverage?.[field] === true) blockers.push(`receiptCoverage.${field}`);
  }
  const dangerousCounterFields = [
    'memoryWrites',
    'primaryMemoryStoreWrites',
    'nativeWriteAttempts',
    'realMemoryContentReturns',
    'rawPrivateReads',
    'localFallbackUses',
    'publicMcpExpansions',
    'defaultRuntimeExpansions',
    'tagReleaseDeployCutoverActions',
    'readinessClaims'
  ];
  dangerousCounterFields.forEach(field => {
    if (input.counters?.[field] > 0) blockers.push(`counters.${field}`);
  });
  return blockers;
}

function computeDecision(input) {
  const stops = stopBlockers(input);
  if (stops.length > 0) return { decision: 'stop_l4', blockers: stops };
  const blockers = [
    ...validateAuthority(input.executionAuthority),
    ...input.observations.flatMap(validateObservation),
    ...validatePlatform(input.platform),
    ...validateCoverage(input.receiptCoverage),
    ...invalidCounterValues(input.counters)
  ];
  if (blockers.length > 0) {
    return { decision: 'phase2_governed_native_read_observation_blocked', blockers };
  }
  return { decision: 'phase2_governed_native_read_partial_observation_accepted', blockers: [] };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    phase2GovernedNativeReadObservationPassed: false,
    phase2Completed: false,
    receiptBundleAppliedToCompletionAudit: false,
    memoryWritten: false,
    primaryMemoryStoreWritten: false,
    nativeWriteExecuted: false,
    rawPrivateStateRead: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluatePhase2GovernedNativeReadObservationContract(input) {
  if (!isPlainObject(input)) return failure('input_must_be_object');
  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_locator_or_overclaim_fields', { forbiddenFields });
  }
  const observations = Array.isArray(input.observations) ? input.observations : [];
  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_AUTHORITY_FIELDS, input.executionAuthority, 'executionAuthority'),
    ...(observations.length === REQUIRED_TOOLS.length
      ? observations.flatMap((item, index) => missingFields(REQUIRED_OBSERVATION_FIELDS, item, `observations[${index}]`))
      : ['observations']),
    ...missingFields(REQUIRED_PLATFORM_FIELDS, input.platform, 'platform'),
    ...missingFields(REQUIRED_COVERAGE_FIELDS, input.receiptCoverage, 'receiptCoverage'),
    ...missingFields(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) return failure('missing_required_fields', { missingFields: missing });
  const unexpectedFields = collectUnexpectedFields(input);
  if (unexpectedFields.length > 0) return failure('unexpected_fields', { unexpectedFields });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.taskId !== 'CM-2073') return failure('invalid_task_id');
  if (!ALLOWED_MODES.includes(input.mode)) return failure('invalid_mode');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) return failure('invalid_expected_decision');
  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length > 0) return failure('invalid_counters', { invalidCounterFields });

  const computed = computeDecision(input);
  if (computed.decision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision: computed.decision,
      blockers: computed.blockers
    });
  }
  if (computed.decision === 'stop_l4') {
    return { ...failure('stop_l4'), decision: computed.decision, blockers: computed.blockers };
  }
  if (computed.decision !== 'phase2_governed_native_read_partial_observation_accepted') {
    return {
      ...failure('phase2_governed_native_read_observation_not_accepted'),
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
    phase2GovernedNativeReadObservationPassed: true,
    observedToolCount: REQUIRED_TOOLS.length,
    observedTools: [...REQUIRED_TOOLS],
    candidateCompletionEvidence: {
      nativeTargetBindingPassed: true,
      nativeReadProofPassed: true,
      lowDisclosureProofPassed: true,
      auditReceiptPassed: true,
      scopeVisibilityIsolationPassed: true,
      wslLinuxProofPassed: true,
      fallbackDistinctionPassed: false,
      windowsWslSmokePassed: false,
      phase2ReceiptBundleAppliedToCompletionAudit: false
    },
    remainingReceiptCategories: [
      'freshExactApprovalReceipt',
      'fallbackDistinctionReceipt',
      'windowsWslSmokeReceipt',
      'receiptBundleApplicationEvidence'
    ],
    nextGate: 'collect_missing_phase2_receipts_before_completion_audit_application',
    phase2Completed: false,
    receiptBundleAppliedToCompletionAudit: false,
    runtimeCallsObserved: 3,
    providerApiCallsObserved: 3,
    derivedIndexWritesObserved: 3,
    memoryWritten: false,
    primaryMemoryStoreWritten: false,
    nativeWriteExecuted: false,
    rawPrivateStateRead: false,
    rawMemoryContentReturned: false,
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
  REQUIRED_TOOLS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2GovernedNativeReadObservationContract
};
