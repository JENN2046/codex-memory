'use strict';

const CONTRACT_NAME = 'Phase2GovernedNativeReadEvidenceApplicationContract';
const CONTRACT_MODE = 'phase2_governed_native_read_exact_receipt_application';
const SCHEMA_VERSION = 1;
const EVIDENCE_FIELDS = Object.freeze([
  'nativeTargetBindingPassed', 'nativeReadProofPassed',
  'fallbackDistinctionPassed', 'lowDisclosureProofPassed',
  'auditReceiptPassed', 'scopeVisibilityIsolationPassed',
  'wslLinuxProofPassed', 'windowsWslSmokePassed',
  'phase2ReceiptBundleAppliedToCompletionAudit'
]);
const REQUIRED_FIELDS = Object.freeze([
  'schemaVersion', 'taskId', 'mode', 'authority', 'nativeObservation',
  'windowsWslSmoke', 'application', 'expectedDecision', 'counters'
]);
const AUTHORITY_FIELDS = Object.freeze([
  'freshCurrentUserPermissionReceiptBound', 'readOnlyPhase2ScopeBound',
  'trustedExecutionContextBound', 'writeAuthorityGranted', 'rawApprovalMaterialAbsent'
]);
const OBSERVATION_FIELDS = Object.freeze([
  'sourceTaskId', 'sourceContractAccepted', 'sourceObservationPassed',
  'observedToolCount', 'nativeTargetBound', 'nativeReadSucceeded',
  'fallbackRouteExplicitlyDistinguished', 'lowDisclosurePassed',
  'auditReceiptPassed', 'scopeVisibilityIsolationPassed', 'wslLinuxPassed',
  'primaryMemoryStoreWritten', 'nativeWriteExecuted', 'rawPrivateStateReturned'
]);
const WINDOWS_FIELDS = Object.freeze([
  'wslDetected', 'cmdBridgePresent', 'cmdBridgeSmokePassed',
  'powershellBridgePresent', 'powershellBridgeSmokePassed', 'rawOutputCaptured'
]);
const APPLICATION_FIELDS = Object.freeze([
  'categoryOnly', 'lowDisclosureOnly', 'applyExactObservedReceipts',
  'completionAuditEvidencePatchPrepared', 'receiptBundleAppliedToCompletionAudit',
  'phase2CompletionClaimedByContract', 'fullPlanPackCompletionClaimed'
]);
const COUNTER_FIELDS = Object.freeze([
  'sourceMcpCalls', 'sourceNativeReadAttempts', 'sourceMemoryReads',
  'sourceProviderApiCalls', 'sourceDerivedIndexWrites', 'sourceLocalAuditAppends',
  'windowsHostSmokeCommands', 'completionAuditEvidenceApplications',
  'memoryWrites', 'primaryMemoryStoreWrites', 'nativeWriteAttempts',
  'rawPrivateReads', 'publicMcpExpansions', 'defaultRuntimeExpansions',
  'tagReleaseDeployCutoverActions', 'readinessClaims'
]);
const FORBIDDEN_FIELDS = Object.freeze([
  'endpoint', 'locator', 'targetValue', 'queryText', 'requestBody', 'responseBody',
  'rawOutput', 'rawMemory', 'memoryContent', 'rawAudit', 'token', 'bearerToken',
  'apiKey', 'secret', 'credential', 'approvalLine', 'approvalLineValue',
  'providerPayload', 'runtimeCommand', 'productionReady', 'releaseReady',
  'deployReady', 'cutoverReady', 'rcReady', 'RC_READY', 'completeV8',
  'fullBridgeCompletion'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}
function missing(fields, value, prefix = '') {
  const actual = isObject(value) ? value : {};
  return fields.filter(field => !hasOwn(actual, field))
    .map(field => prefix ? `${prefix}.${field}` : field);
}
function unexpected(fields, value, prefix = '') {
  if (!isObject(value)) return [];
  return Object.keys(value).filter(field => !fields.includes(field))
    .map(field => prefix ? `${prefix}.${field}` : field);
}
function forbidden(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbidden(item, `${prefix}[${index}]`));
  }
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([field, child]) => {
    const path = prefix ? `${prefix}.${field}` : field;
    return FORBIDDEN_FIELDS.includes(field) ? [path] : forbidden(child, path);
  });
}
function invalidCounters(counters) {
  if (!isObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}
function failure(reasonCode, extras = {}) {
  return {
    accepted: false, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode, blockers: [],
    phase2GovernedNativeReadEvidenceApplicationPassed: false,
    receiptBundleAppliedToCompletionAudit: false,
    memoryWritten: false, primaryMemoryStoreWritten: false,
    nativeWriteExecuted: false, rawPrivateStateRead: false,
    publicMcpExpanded: false, readinessClaimed: false, ...extras
  };
}

function evaluatePhase2GovernedNativeReadEvidenceApplicationContract(input) {
  if (!isObject(input)) return failure('invalid_input');
  const forbiddenFields = forbidden(input);
  if (forbiddenFields.length) return failure('forbidden_raw_secret_or_overclaim_fields', { forbiddenFields });
  const missingFields = [
    ...missing(REQUIRED_FIELDS, input),
    ...missing(AUTHORITY_FIELDS, input.authority, 'authority'),
    ...missing(OBSERVATION_FIELDS, input.nativeObservation, 'nativeObservation'),
    ...missing(WINDOWS_FIELDS, input.windowsWslSmoke, 'windowsWslSmoke'),
    ...missing(APPLICATION_FIELDS, input.application, 'application'),
    ...missing(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missingFields.length) return failure('missing_required_fields', { missingFields });
  const unexpectedFields = [
    ...unexpected(REQUIRED_FIELDS, input),
    ...unexpected(AUTHORITY_FIELDS, input.authority, 'authority'),
    ...unexpected(OBSERVATION_FIELDS, input.nativeObservation, 'nativeObservation'),
    ...unexpected(WINDOWS_FIELDS, input.windowsWslSmoke, 'windowsWslSmoke'),
    ...unexpected(APPLICATION_FIELDS, input.application, 'application'),
    ...unexpected(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (unexpectedFields.length) return failure('unexpected_fields', { unexpectedFields });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.taskId !== 'CM-2074') return failure('invalid_task_id');
  if (input.mode !== 'phase2-governed-native-read-evidence-application') return failure('invalid_mode');
  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length) return failure('invalid_counters', { invalidCounterFields });

  const blockers = [];
  for (const field of [
    'freshCurrentUserPermissionReceiptBound', 'readOnlyPhase2ScopeBound',
    'trustedExecutionContextBound', 'rawApprovalMaterialAbsent'
  ]) if (input.authority[field] !== true) blockers.push(`authority.${field}`);
  if (input.authority.writeAuthorityGranted !== false) blockers.push('authority.writeAuthorityGranted');
  if (input.nativeObservation.sourceTaskId !== 'CM-2073') blockers.push('nativeObservation.sourceTaskId');
  if (input.nativeObservation.observedToolCount !== 3) blockers.push('nativeObservation.observedToolCount');
  for (const field of [
    'sourceContractAccepted', 'sourceObservationPassed', 'nativeTargetBound',
    'nativeReadSucceeded', 'fallbackRouteExplicitlyDistinguished',
    'lowDisclosurePassed', 'auditReceiptPassed', 'scopeVisibilityIsolationPassed',
    'wslLinuxPassed'
  ]) if (input.nativeObservation[field] !== true) blockers.push(`nativeObservation.${field}`);
  for (const field of ['primaryMemoryStoreWritten', 'nativeWriteExecuted', 'rawPrivateStateReturned']) {
    if (input.nativeObservation[field] !== false) blockers.push(`nativeObservation.${field}`);
  }
  for (const field of [
    'wslDetected', 'cmdBridgePresent', 'cmdBridgeSmokePassed',
    'powershellBridgePresent', 'powershellBridgeSmokePassed'
  ]) if (input.windowsWslSmoke[field] !== true) blockers.push(`windowsWslSmoke.${field}`);
  if (input.windowsWslSmoke.rawOutputCaptured !== false) blockers.push('windowsWslSmoke.rawOutputCaptured');
  for (const field of [
    'categoryOnly', 'lowDisclosureOnly', 'applyExactObservedReceipts',
    'completionAuditEvidencePatchPrepared', 'receiptBundleAppliedToCompletionAudit'
  ]) if (input.application[field] !== true) blockers.push(`application.${field}`);
  for (const field of ['phase2CompletionClaimedByContract', 'fullPlanPackCompletionClaimed']) {
    if (input.application[field] !== false) blockers.push(`application.${field}`);
  }
  const expectedCounters = {
    sourceMcpCalls: 3, sourceNativeReadAttempts: 3, sourceMemoryReads: 3,
    sourceProviderApiCalls: 3, sourceDerivedIndexWrites: 3,
    sourceLocalAuditAppends: 3, windowsHostSmokeCommands: 2,
    completionAuditEvidenceApplications: 1, memoryWrites: 0,
    primaryMemoryStoreWrites: 0, nativeWriteAttempts: 0, rawPrivateReads: 0,
    publicMcpExpansions: 0, defaultRuntimeExpansions: 0,
    tagReleaseDeployCutoverActions: 0, readinessClaims: 0
  };
  for (const [field, expected] of Object.entries(expectedCounters)) {
    if (input.counters[field] !== expected) blockers.push(`counters.${field}`);
  }
  const stop = input.authority.writeAuthorityGranted === true ||
    input.nativeObservation.primaryMemoryStoreWritten === true ||
    input.nativeObservation.nativeWriteExecuted === true ||
    input.nativeObservation.rawPrivateStateReturned === true ||
    input.windowsWslSmoke.rawOutputCaptured === true ||
    input.application.phase2CompletionClaimedByContract === true ||
    input.application.fullPlanPackCompletionClaimed === true ||
    input.counters.memoryWrites > 0 || input.counters.nativeWriteAttempts > 0 ||
    input.counters.rawPrivateReads > 0 || input.counters.readinessClaims > 0;
  const computedDecision = stop ? 'stop_l4' : blockers.length
    ? 'phase2_governed_native_read_evidence_application_blocked'
    : 'phase2_governed_native_read_evidence_applied';
  if (input.expectedDecision !== computedDecision) {
    return failure('decision_mismatch', { computedDecision, blockers });
  }
  if (computedDecision !== 'phase2_governed_native_read_evidence_applied') {
    return failure(computedDecision === 'stop_l4' ? 'stop_l4' : 'application_blocked', {
      decision: computedDecision, blockers
    });
  }
  const evidencePatch = { phase2GovernedNativeReadEvidenceApplicationPassed: true };
  for (const field of EVIDENCE_FIELDS) evidencePatch[field] = true;
  return {
    accepted: true, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    decision: computedDecision, blockers: [],
    phase2GovernedNativeReadEvidenceApplicationPassed: true, evidencePatch,
    receiptBundleAppliedToCompletionAudit: true,
    sourceNativeReadCount: 3, windowsHostSmokeCommandCount: 2,
    memoryWritten: false, primaryMemoryStoreWritten: false,
    nativeWriteExecuted: false, rawPrivateStateRead: false,
    publicMcpExpanded: false, readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE, CONTRACT_NAME, COUNTER_FIELDS, EVIDENCE_FIELDS,
  FORBIDDEN_FIELDS, SCHEMA_VERSION,
  evaluatePhase2GovernedNativeReadEvidenceApplicationContract
};
