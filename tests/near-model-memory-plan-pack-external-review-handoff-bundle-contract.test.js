'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const bundle = require('../docs/near-model-memory-plan-pack/external_review_handoff_bundle.json');
const {
  EXPECTED_DECISIONS,
  evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract
} = require('../src/core/NearModelMemoryPlanPackExternalReviewHandoffBundleContract');
const {
  PHASE_REQUIREMENTS, OBJECTIVE_INVARIANTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function allEvidence() {
  const evidence = {};
  for (const group of [...PHASE_REQUIREMENTS, ...OBJECTIVE_INVARIANTS]) {
    for (const field of group.requiredEvidence) evidence[field] = true;
  }
  return evidence;
}

test('CM2076 accepts the hash-bound external review handoff bundle', () => {
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(bundle);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.externalReviewHandoffBundlePreparedPassed, true);
  assert.equal(result.evidenceEntryCount, 3);
  assert.deepEqual(result.pendingDecisionFields, EXPECTED_DECISIONS);
  assert.equal(result.externalReviewPassed, false);
  assert.equal(result.reviewBundleApplied, false);
  assert.equal(result.tagApprovalPacketPassed, false);
  assert.equal(result.phase8WriteAuthorized, false);
});

test('CM2076 bundle requirement does not complete Phase 9 or Phase 10', () => {
  const evidence = allEvidence();
  evidence.externalReviewHandoffBundlePreparedPassed = true;
  evidence.externalReviewPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;
  evidence.tagApprovalPacketPassed = false;
  const audit = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });
  assert.equal(audit.fullPlanPackCompleted, false);
  assert.ok(audit.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(audit.incompletePhaseIds.includes('phase10_tag_release_readiness'));
});

test('CM2076 rejects evidence hash drift', () => {
  const input = clone(bundle);
  input.evidenceEntries[1].sha256 = '0'.repeat(64);
  input.expectedDecision = 'external_review_handoff_bundle_blocked';
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('evidenceEntries[1].sha256'));
});

test('CM2076 rejects evidence source reorder', () => {
  const input = clone(bundle);
  input.evidenceEntries.reverse();
  input.expectedDecision = 'external_review_handoff_bundle_blocked';
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('evidenceEntries[0].sourceRef'));
});

test('CM2076 rejects preaccepted reviewer decision slots', () => {
  const input = clone(bundle);
  input.decisionSlots[0].accepted = true;
  input.expectedDecision = 'stop_l4';
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.blockers.includes('decisionSlots[0].accepted'));
});

test('CM2076 stops L4 on external review or tag approval overclaim', () => {
  const input = clone(bundle);
  input.currentFacts.externalReviewPassed = true;
  input.currentFacts.tagApprovalPacketPassed = true;
  input.expectedDecision = 'stop_l4';
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.externalReviewPassed, false);
  assert.equal(result.tagApprovalPacketPassed, false);
});

test('CM2076 rejects raw review material by path without echo', () => {
  const input = clone(bundle);
  input.reviewTranscript = 'DO_NOT_ECHO';
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_review_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, ['reviewTranscript']);
  assert.equal(JSON.stringify(result).includes('DO_NOT_ECHO'), false);
});

test('CM2076 stops L4 on write remote or readiness counters', () => {
  const input = clone(bundle);
  input.counters.nativeWriteAttempts = 1;
  input.counters.remoteActions = 1;
  input.counters.readinessClaims = 1;
  input.expectedDecision = 'stop_l4';
  const result = evaluateNearModelMemoryPlanPackExternalReviewHandoffBundleContract(input);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.equal(result.memoryWritten, false);
  assert.equal(result.remoteActionPerformed, false);
  assert.equal(result.readinessClaimed, false);
});
