'use strict';

const CONTRACT_NAME = 'NearModelMemoryPlanPackExternalReviewHandoffBundleContract';
const CONTRACT_MODE = 'low_disclosure_external_review_handoff_bundle_only';
const SCHEMA_VERSION = 1;

const EXPECTED_EVIDENCE = Object.freeze([
  Object.freeze({
    sourceRef: 'docs/near-model-memory-plan-pack/phase2_governed_native_read_observation_report.md',
    sha256: 'fba72d91ab33897e579a4d2378405382868aa65d335e13a363a7b3864eb60664',
    evidenceClass: 'governed_native_read_observation'
  }),
  Object.freeze({
    sourceRef: 'docs/near-model-memory-plan-pack/phase2_governed_native_read_evidence_application_report.md',
    sha256: 'bedadb401214a949171a078484bcb5533b2e7af8cca7846d9b7e81136d6d2a7e',
    evidenceClass: 'phase2_exact_receipt_application'
  }),
  Object.freeze({
    sourceRef: 'docs/near-model-memory-plan-pack/phase9_equivalent_dogfood_observation_evidence_report.md',
    sha256: 'f18fe2de18714be67968ba86c391f379e8f10df2bf621437229f6712f5d85a25',
    evidenceClass: 'phase9_equivalent_dogfood_observation'
  })
]);
const EXPECTED_DECISIONS = Object.freeze([
  'externalReviewPassed',
  'externalReviewEvidenceBundleAppliedToCompletionAudit',
  'tagApprovalPacketPassed',
  'phase8NativeWriteAuthorizationGranted'
]);
const FORBIDDEN_FIELDS = Object.freeze([
  'endpoint', 'locator', 'queryText', 'requestBody', 'responseBody', 'rawOutput',
  'rawMemory', 'memoryContent', 'rawAudit', 'token', 'apiKey', 'secret',
  'credential', 'approvalLine', 'providerPayload', 'reviewTranscript',
  'reviewerIdentity', 'productionReady', 'releaseReady', 'deployReady',
  'cutoverReady', 'rcReady', 'RC_READY', 'completeV8', 'fullBridgeCompletion'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function forbidden(value, prefix = '') {
  if (Array.isArray(value)) return value.flatMap((item, index) => forbidden(item, `${prefix}[${index}]`));
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return FORBIDDEN_FIELDS.includes(key) ? [path] : forbidden(child, path);
  });
}
function failure(reasonCode, extras = {}) {
  return {
    accepted: false, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode, blockers: [], externalReviewHandoffBundlePreparedPassed: false,
    externalReviewPassed: false, reviewBundleApplied: false,
    tagApprovalPacketPassed: false, phase8WriteAuthorized: false,
    memoryWritten: false, nativeWriteExecuted: false, remoteActionPerformed: false,
    readinessClaimed: false, ...extras
  };
}

function evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input) {
  if (!isObject(input)) return failure('invalid_input');
  const forbiddenFields = forbidden(input);
  if (forbiddenFields.length) return failure('forbidden_raw_secret_review_or_overclaim_fields', { forbiddenFields });
  const required = ['schemaVersion', 'taskId', 'mode', 'evidenceEntries', 'currentFacts', 'decisionSlots', 'outputPolicy', 'expectedDecision', 'counters'];
  const missingFields = required.filter(field => !Object.prototype.hasOwnProperty.call(input, field));
  if (missingFields.length) return failure('missing_required_fields', { missingFields });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.taskId !== 'CM-2076') return failure('invalid_task_id');
  if (input.mode !== 'external-review-handoff-bundle') return failure('invalid_mode');

  const blockers = [];
  if (!Array.isArray(input.evidenceEntries) || input.evidenceEntries.length !== EXPECTED_EVIDENCE.length) {
    blockers.push('evidenceEntries');
  } else {
    EXPECTED_EVIDENCE.forEach((expected, index) => {
      const actual = input.evidenceEntries[index] || {};
      for (const field of ['sourceRef', 'sha256', 'evidenceClass']) {
        if (actual[field] !== expected[field]) blockers.push(`evidenceEntries[${index}].${field}`);
      }
      if (actual.lowDisclosureOnly !== true) blockers.push(`evidenceEntries[${index}].lowDisclosureOnly`);
    });
  }
  const facts = input.currentFacts || {};
  for (const field of ['defaultRuntimeHeld', 'vcpToolBoxFinalOwnerPreserved', 'machineReplayRequired']) {
    if (facts[field] !== true) blockers.push(`currentFacts.${field}`);
  }
  for (const field of ['phase2Accepted', 'phase9DogfoodObservationApplied', 'externalReviewPassed', 'externalReviewBundleApplied', 'tagApprovalPacketPassed', 'phase8NativeWriteProofPassed', 'fullPlanPackCompleted']) {
    if (facts[field] !== false) blockers.push(`currentFacts.${field}`);
  }
  if (input.supersededBy !== 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_v2.json') blockers.push('supersededBy');
  if (!Array.isArray(input.decisionSlots) || input.decisionSlots.length !== EXPECTED_DECISIONS.length) {
    blockers.push('decisionSlots');
  } else {
    EXPECTED_DECISIONS.forEach((field, index) => {
      const slot = input.decisionSlots[index] || {};
      if (slot.field !== field) blockers.push(`decisionSlots[${index}].field`);
      if (slot.status !== 'pending_external_or_exact_authority') blockers.push(`decisionSlots[${index}].status`);
      if (slot.accepted !== false) blockers.push(`decisionSlots[${index}].accepted`);
    });
  }
  const output = input.outputPolicy || {};
  for (const field of ['categoryOnly', 'hashBound', 'rawValuesAbsent', 'reviewerDecisionRequired']) {
    if (output[field] !== true) blockers.push(`outputPolicy.${field}`);
  }
  for (const field of ['externalReviewAcceptedByBundle', 'tagApprovalAcceptedByBundle', 'phase8WriteAuthorizedByBundle', 'readinessClaimed']) {
    if (output[field] !== false) blockers.push(`outputPolicy.${field}`);
  }
  const counters = input.counters || {};
  for (const field of ['externalReviewsAccepted', 'tagApprovalsAccepted', 'phase8WriteAuthorizationsAccepted', 'memoryWrites', 'nativeWriteAttempts', 'remoteActions', 'readinessClaims']) {
    if (!Number.isInteger(counters[field]) || counters[field] !== 0) blockers.push(`counters.${field}`);
  }
  const stop = facts.externalReviewPassed === true || facts.externalReviewBundleApplied === true ||
    facts.tagApprovalPacketPassed === true || facts.phase8NativeWriteProofPassed === true ||
    facts.fullPlanPackCompleted === true || output.externalReviewAcceptedByBundle === true ||
    output.tagApprovalAcceptedByBundle === true || output.phase8WriteAuthorizedByBundle === true ||
    output.readinessClaimed === true ||
    (Array.isArray(input.decisionSlots) && input.decisionSlots.some(slot => slot && slot.accepted === true)) ||
    Object.values(counters).some(value => value > 0);
  const decision = stop ? 'stop_l4' : blockers.length
    ? 'external_review_handoff_bundle_blocked'
    : 'external_review_handoff_bundle_prepared';
  if (input.expectedDecision !== decision) return failure('decision_mismatch', { computedDecision: decision, blockers });
  if (decision !== 'external_review_handoff_bundle_prepared') {
    return failure(decision === 'stop_l4' ? 'stop_l4' : 'bundle_blocked', { decision, blockers });
  }
  return {
    accepted: true, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    decision, blockers: [], externalReviewHandoffBundlePreparedPassed: true,
    evidenceEntryCount: EXPECTED_EVIDENCE.length,
    pendingDecisionFields: [...EXPECTED_DECISIONS],
    externalReviewPassed: false, reviewBundleApplied: false,
    tagApprovalPacketPassed: false, phase8WriteAuthorized: false,
    memoryWritten: false, nativeWriteExecuted: false, remoteActionPerformed: false,
    readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE, CONTRACT_NAME, EXPECTED_DECISIONS, EXPECTED_EVIDENCE,
  FORBIDDEN_FIELDS, SCHEMA_VERSION,
  evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract
};
