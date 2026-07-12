'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { resolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const review = require('../src/core/Cm2120FullPlanApplicationReceiptReview');
const generator = require('../scripts/generate-cm2120-full-plan-application-receipt-review');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

const durableEvidence = Object.freeze({
  accepted: true,
  blockers: [],
  applicationCommit: review.APPLICATION_COMMIT,
  applicationTree: review.APPLICATION_TREE,
  fullPlanPackCompleted: true,
  readinessClaimed: false,
  statusSyncAuthorized: false
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function prepared() {
  const options = resolverOptions();
  const frozenEvidence = review.evaluateFrozenReceiptSet(options);
  assert.equal(frozenEvidence.accepted, true, frozenEvidence.blockers.join(','));
  const implementation = {
    commit: 'a'.repeat(40),
    tree: 'b'.repeat(40)
  };
  const decision = review.buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  return { options, frozenEvidence, implementation, decision };
}

test('frozen receipt commit is exact, anchored, and low-disclosure', () => {
  const { frozenEvidence } = prepared();
  assert.equal(frozenEvidence.applicationCommitAnchored, true);
  assert.equal(frozenEvidence.fullPlanPackCompletedEvidenceAccepted, true);
  assert.equal(frozenEvidence.statusSyncPerformed, false);
  assert.equal(frozenEvidence.readinessClaimed, false);
  assert.equal(frozenEvidence.identities[0].json.blobOid, review.FROZEN_RECEIPTS[0].blobOid);
  assert.equal(frozenEvidence.identities[1].json.blobOid, review.FROZEN_RECEIPTS[1].blobOid);
});

test('exact internal receipt review decision passes without authorizing status sync', () => {
  const { options, implementation, decision } = prepared();
  const evaluation = review.evaluateReviewDecision(decision, { implementation, durableEvidence, ...options });
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(evaluation.statusSyncApplicationMayBePrepared, true);
  assert.equal(evaluation.statusSyncAuthorized, false);
  assert.equal(evaluation.readinessClaimed, false);
});

test('receipt, application, readiness, and side-effect drift fail closed', () => {
  const { options, implementation, decision } = prepared();
  for (const mutate of [
    value => { value.payload.receipts[0].rawSha256 = '0'.repeat(64); },
    value => { value.payload.application.commit = '0'.repeat(40); },
    value => { value.payload.oneShotResult.authorizationReplayAllowed = true; },
    value => { value.payload.appliedEvidence.statusSyncPerformed = true; },
    value => { value.payload.appliedEvidence.readiness.productionReady = true; },
    value => { value.payload.sideEffects.nativeWrites = 1; }
  ]) {
    const changed = clone(decision);
    mutate(changed);
    changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
    assert.equal(review.evaluateReviewDecision(changed, {
      implementation,
      durableEvidence,
      ...options
    }).accepted, false);
  }
});

test('durable evidence cannot be replaced by an incomplete or readiness-bearing summary', () => {
  const { options, frozenEvidence, implementation } = prepared();
  assert.throws(() => review.buildReviewDecision({
    frozenEvidence,
    durableEvidence: { ...durableEvidence, accepted: false },
    implementation
  }), /exact_evidence/);
  assert.throws(() => review.buildReviewDecision({
    frozenEvidence,
    durableEvidence: { ...durableEvidence, readinessClaimed: true },
    implementation
  }), /exact_evidence/);
  const decision = review.buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  assert.equal(review.evaluateReviewDecision(decision, {
    implementation,
    durableEvidence: { ...durableEvidence, applicationCommit: '0'.repeat(40) },
    ...options
  }).accepted, false);
});

test('review generator accepts no arguments or output path overrides', () => {
  assert.deepEqual(generator.parseArgs([]), {});
  assert.throws(() => generator.parseArgs(['--output', '/tmp/x']), /no_arguments/);
});
