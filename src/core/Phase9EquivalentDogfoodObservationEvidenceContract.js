'use strict';

const CONTRACT_NAME = 'Phase9EquivalentDogfoodObservationEvidenceContract';
const CONTRACT_MODE = 'phase9_equivalent_dogfood_observation_evidence_application';
const SCHEMA_VERSION = 1;
const EXPECTED_TOOLS = Object.freeze([
  'audit_memory', 'memory_overview', 'prepare_memory_context',
  'propose_memory_delta', 'search_memory'
]);
const FORBIDDEN_FIELDS = Object.freeze([
  'endpoint', 'locator', 'queryText', 'requestBody', 'responseBody', 'rawOutput',
  'rawMemory', 'memoryContent', 'rawAudit', 'token', 'apiKey', 'secret',
  'credential', 'approvalLine', 'providerPayload', 'runtimeCommand',
  'productionReady', 'releaseReady', 'deployReady', 'cutoverReady', 'rcReady',
  'RC_READY', 'completeV8', 'fullBridgeCompletion'
]);
const COUNTER_FIELDS = Object.freeze([
  'sourceNativeReadCalls', 'sourceWindowsHostSmokeCommands',
  'observationEvidenceApplications', 'memoryWrites', 'nativeWriteAttempts',
  'rawPrivateReads', 'publicMcpExpansions', 'defaultRuntimeExpansions',
  'externalReviewsAccepted', 'tagReleaseDeployCutoverActions', 'readinessClaims'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function forbidden(value, prefix = '') {
  if (Array.isArray(value)) return value.flatMap((v, i) => forbidden(v, `${prefix}[${i}]`));
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return FORBIDDEN_FIELDS.includes(key) ? [path] : forbidden(child, path);
  });
}
function failure(reasonCode, extras = {}) {
  return {
    accepted: false, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode, blockers: [], phase9EquivalentDogfoodObservationApplicationPassed: false,
    observationOrDogfoodReviewPassed: false, externalReviewPassed: false,
    defaultRuntimeExpanded: false, memoryWritten: false, nativeWriteExecuted: false,
    publicMcpExpanded: false, readinessClaimed: false, ...extras
  };
}
function equalTools(actual) {
  return Array.isArray(actual) && actual.length === EXPECTED_TOOLS.length &&
    actual.every((tool, index) => tool === EXPECTED_TOOLS[index]);
}

function evaluatePhase9EquivalentDogfoodObservationEvidenceContract(input) {
  if (!isObject(input)) return failure('invalid_input');
  const forbiddenFields = forbidden(input);
  if (forbiddenFields.length) return failure('forbidden_raw_secret_or_overclaim_fields', { forbiddenFields });
  const required = ['schemaVersion', 'taskId', 'mode', 'authority', 'defaultRuntimeGate', 'dogfoodEvidence', 'application', 'expectedDecision', 'counters'];
  const missingFields = required.filter(field => !Object.prototype.hasOwnProperty.call(input, field));
  if (missingFields.length) return failure('missing_required_fields', { missingFields });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.taskId !== 'CM-2075') return failure('invalid_task_id');
  if (input.mode !== 'phase9-equivalent-dogfood-observation-evidence') return failure('invalid_mode');

  const blockers = [];
  const authority = input.authority || {};
  for (const field of ['freshCurrentUserPermissionReceiptBound', 'defaultHoldOnly', 'writeAuthorityGranted', 'externalReviewAuthorityGranted']) {
    const expected = field === 'writeAuthorityGranted' || field === 'externalReviewAuthorityGranted' ? false : true;
    if (authority[field] !== expected) blockers.push(`authority.${field}`);
  }
  const gate = input.defaultRuntimeGate || {};
  for (const field of ['accepted', 'observationComplete', 'equivalentDogfoodReviewAccepted']) {
    if (gate[field] !== true) blockers.push(`defaultRuntimeGate.${field}`);
  }
  for (const field of ['externalReviewAccepted', 'defaultExpansionAllowed', 'productionWriteDefaultAllowed', 'durableMutationPerformed', 'readinessClaimed']) {
    if (gate[field] !== false) blockers.push(`defaultRuntimeGate.${field}`);
  }
  if (!equalTools(gate.publicToolNames)) blockers.push('defaultRuntimeGate.publicToolNames');
  if (gate.commitMemoryDeltaPublicRegistered !== false) blockers.push('defaultRuntimeGate.commitMemoryDeltaPublicRegistered');

  const dogfood = input.dogfoodEvidence || {};
  for (const field of [
    'phase2Accepted', 'nativeReadDogfoodObserved', 'windowsWslSmokePassed',
    'prepareMemoryContextContractPassed', 'proposeMemoryDeltaProposalOnlyPassed',
    'testAllPassed', 'gateCiPassed', 'noDefaultWriteObserved', 'lowDisclosureOnly'
  ]) if (dogfood[field] !== true) blockers.push(`dogfoodEvidence.${field}`);
  for (const field of ['memoryWriteObserved', 'nativeWriteObserved', 'rawPrivateReadObserved', 'defaultExpansionObserved']) {
    if (dogfood[field] !== false) blockers.push(`dogfoodEvidence.${field}`);
  }
  const application = input.application || {};
  for (const field of ['categoryOnly', 'applyObservationEvidence', 'completionAuditPatchPrepared']) {
    if (application[field] !== true) blockers.push(`application.${field}`);
  }
  for (const field of ['externalReviewClaimed', 'phase9CompletionClaimed', 'fullPlanPackCompletionClaimed']) {
    if (application[field] !== false) blockers.push(`application.${field}`);
  }

  const counters = input.counters || {};
  const expectedCounters = {
    sourceNativeReadCalls: 3, sourceWindowsHostSmokeCommands: 2,
    observationEvidenceApplications: 1, memoryWrites: 0, nativeWriteAttempts: 0,
    rawPrivateReads: 0, publicMcpExpansions: 0, defaultRuntimeExpansions: 0,
    externalReviewsAccepted: 0, tagReleaseDeployCutoverActions: 0, readinessClaims: 0
  };
  for (const field of COUNTER_FIELDS) {
    if (!Number.isInteger(counters[field]) || counters[field] !== expectedCounters[field]) {
      blockers.push(`counters.${field}`);
    }
  }
  const stop = authority.writeAuthorityGranted === true ||
    authority.externalReviewAuthorityGranted === true ||
    dogfood.memoryWriteObserved === true || dogfood.nativeWriteObserved === true ||
    dogfood.rawPrivateReadObserved === true || dogfood.defaultExpansionObserved === true ||
    application.externalReviewClaimed === true || application.phase9CompletionClaimed === true ||
    application.fullPlanPackCompletionClaimed === true || counters.readinessClaims > 0;
  const decision = stop ? 'stop_l4' : blockers.length
    ? 'phase9_equivalent_dogfood_observation_blocked'
    : 'phase9_equivalent_dogfood_observation_applied';
  if (input.expectedDecision !== decision) return failure('decision_mismatch', { computedDecision: decision, blockers });
  if (decision !== 'phase9_equivalent_dogfood_observation_applied') {
    return failure(decision === 'stop_l4' ? 'stop_l4' : 'application_blocked', { decision, blockers });
  }
  return {
    accepted: true, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    decision, blockers: [],
    phase9EquivalentDogfoodObservationApplicationPassed: true,
    observationOrDogfoodReviewPassed: true,
    evidencePatch: {
      phase9EquivalentDogfoodObservationApplicationPassed: true,
      observationOrDogfoodReviewPassed: true
    },
    externalReviewPassed: false, defaultRuntimeExpanded: false,
    memoryWritten: false, nativeWriteExecuted: false, publicMcpExpanded: false,
    readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE, CONTRACT_NAME, COUNTER_FIELDS, EXPECTED_TOOLS, FORBIDDEN_FIELDS,
  SCHEMA_VERSION, evaluatePhase9EquivalentDogfoodObservationEvidenceContract
};
