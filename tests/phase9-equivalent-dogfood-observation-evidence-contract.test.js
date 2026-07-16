'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXPECTED_TOOLS,
  evaluatePhase9EquivalentDogfoodObservationEvidenceContract
} = require('../src/core/Phase9EquivalentDogfoodObservationEvidenceContract');
const {
  PHASE_REQUIREMENTS, OBJECTIVE_INVARIANTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function validInput(overrides = {}) {
  const base = {
    schemaVersion: 1, taskId: 'CM-2075',
    mode: 'phase9-equivalent-dogfood-observation-evidence',
    authority: {
      freshCurrentUserPermissionReceiptBound: true, defaultHoldOnly: true,
      writeAuthorityGranted: false, externalReviewAuthorityGranted: false
    },
    defaultRuntimeGate: {
      accepted: true, publicToolNames: [...EXPECTED_TOOLS], observationComplete: true,
      equivalentDogfoodReviewAccepted: true, externalReviewAccepted: false,
      commitMemoryDeltaPublicRegistered: false, defaultExpansionAllowed: false,
      productionWriteDefaultAllowed: false, durableMutationPerformed: false,
      readinessClaimed: false
    },
    dogfoodEvidence: {
      phase2Accepted: true, nativeReadDogfoodObserved: true,
      windowsWslSmokePassed: true, prepareMemoryContextContractPassed: true,
      proposeMemoryDeltaProposalOnlyPassed: true, testAllPassed: true,
      gateCiPassed: true, noDefaultWriteObserved: true, lowDisclosureOnly: true,
      memoryWriteObserved: false, nativeWriteObserved: false,
      rawPrivateReadObserved: false, defaultExpansionObserved: false
    },
    application: {
      categoryOnly: true, applyObservationEvidence: true,
      completionAuditPatchPrepared: true, externalReviewClaimed: false,
      phase9CompletionClaimed: false, fullPlanPackCompletionClaimed: false
    },
    expectedDecision: 'phase9_equivalent_dogfood_observation_applied',
    counters: {
      sourceNativeReadCalls: 3, sourceWindowsHostSmokeCommands: 2,
      observationEvidenceApplications: 1, memoryWrites: 0,
      nativeWriteAttempts: 0, rawPrivateReads: 0, publicMcpExpansions: 0,
      defaultRuntimeExpansions: 0, externalReviewsAccepted: 0,
      tagReleaseDeployCutoverActions: 0, readinessClaims: 0
    }
  };
  return {
    ...base, ...overrides,
    authority: { ...base.authority, ...(overrides.authority || {}) },
    defaultRuntimeGate: { ...base.defaultRuntimeGate, ...(overrides.defaultRuntimeGate || {}) },
    dogfoodEvidence: { ...base.dogfoodEvidence, ...(overrides.dogfoodEvidence || {}) },
    application: { ...base.application, ...(overrides.application || {}) },
    counters: { ...base.counters, ...(overrides.counters || {}) }
  };
}
function allEvidence() {
  const evidence = {};
  for (const group of [...PHASE_REQUIREMENTS, ...OBJECTIVE_INVARIANTS]) {
    for (const field of group.requiredEvidence) evidence[field] = true;
  }
  return evidence;
}

test('CM2075 applies equivalent dogfood observation without external review or expansion', () => {
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(result.evidencePatch, {
    phase9EquivalentDogfoodObservationApplicationPassed: true,
    observationOrDogfoodReviewPassed: true
  });
  assert.equal(result.externalReviewPassed, false);
  assert.equal(result.defaultRuntimeExpanded, false);
  assert.equal(result.memoryWritten, false);
});

test('CM2075 keeps Phase 9 incomplete until external review and bundle application', () => {
  const application = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput());
  const evidence = { ...allEvidence(), ...application.evidencePatch };
  evidence.externalReviewPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;
  evidence.tagApprovalPacketPassed = false;
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  const phase9 = audit.phaseResults.find(item => item.id === 'phase9_default_runtime_policy');
  assert.equal(phase9.accepted, false);
  assert.deepEqual(phase9.missingEvidence.sort(), [
    'externalReviewEvidenceBundleAppliedToCompletionAudit', 'externalReviewPassed'
  ].sort());
  assert.equal(audit.fullPlanPackCompleted, false);
});

test('CM2075 rejects default tool surface drift', () => {
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput({
    defaultRuntimeGate: { publicToolNames: [...EXPECTED_TOOLS, 'record_memory'] },
    expectedDecision: 'phase9_equivalent_dogfood_observation_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('defaultRuntimeGate.publicToolNames'));
});

test('CM2075 rejects incomplete dogfood evidence', () => {
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput({
    dogfoodEvidence: { gateCiPassed: false },
    expectedDecision: 'phase9_equivalent_dogfood_observation_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('dogfoodEvidence.gateCiPassed'));
});

test('CM2075 rejects counter drift', () => {
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput({
    counters: { sourceNativeReadCalls: 2 },
    expectedDecision: 'phase9_equivalent_dogfood_observation_blocked'
  }));
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('counters.sourceNativeReadCalls'));
});

test('CM2075 rejects raw evidence fields without echo', () => {
  const input = validInput();
  input.dogfoodEvidence.responseBody = 'DO_NOT_ECHO';
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(input);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, ['dogfoodEvidence.responseBody']);
  assert.equal(JSON.stringify(result).includes('DO_NOT_ECHO'), false);
});

test('CM2075 stops L4 on external review overclaim', () => {
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput({
    application: { externalReviewClaimed: true }, expectedDecision: 'stop_l4'
  }));
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.externalReviewPassed, false);
});

test('CM2075 stops L4 on write or default expansion', () => {
  const result = evaluatePhase9EquivalentDogfoodObservationEvidenceContract(validInput({
    dogfoodEvidence: { memoryWriteObserved: true, defaultExpansionObserved: true },
    expectedDecision: 'stop_l4'
  }));
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.memoryWritten, false);
  assert.equal(result.defaultRuntimeExpanded, false);
});
