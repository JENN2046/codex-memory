'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_EVIDENCE_REFS,
  evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract,
  renderCanonicalReviewBundleMarkdown,
  sha256,
  stableCanonicalJson
} = require('../src/core/NearModelMemoryPlanPackCanonicalReviewBundleContract');

const root = path.resolve(__dirname, '..');
const bundlePath = path.join(root, 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_v2.json');
const renderedPath = path.join(root, 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_canonical.md');

function load() {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const bodies = Object.fromEntries(EXPECTED_EVIDENCE_REFS.map(ref => [ref, fs.readFileSync(path.join(root, ref), 'utf8')]));
  return { bundle, bodies };
}

test('CM2078 canonical review bundle verifies its payload and four evidence hashes', () => {
  const { bundle, bodies } = load();
  const result = evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract(bundle, bodies);
  assert.equal(result.accepted, true);
  assert.equal(result.canonicalReviewBundlePassed, true);
  assert.equal(result.evidenceHashesVerified, 4);
  assert.equal(result.completionEligible, false);
});

test('CM2078 canonical review bundle hash is stable recursive key-order canonical JSON', () => {
  const { bundle } = load();
  assert.equal(bundle.canonicalPayloadSha256, sha256(stableCanonicalJson(bundle.payload)));
});

test('CM2078 rendered Markdown is content-equivalent to the canonical payload', () => {
  const { bundle } = load();
  assert.equal(fs.readFileSync(renderedPath, 'utf8'), renderCanonicalReviewBundleMarkdown(bundle));
});

test('CM2078 fails closed when any independent decision is promoted', () => {
  const { bundle, bodies } = load();
  bundle.payload.effectiveDecisions.externalReviewPassed = true;
  bundle.canonicalPayloadSha256 = sha256(stableCanonicalJson(bundle.payload));
  const result = evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract(bundle, bodies);
  assert.equal(result.accepted, false);
});

test('CM2078 fails closed when an evidence body drifts', () => {
  const { bundle, bodies } = load();
  bodies[EXPECTED_EVIDENCE_REFS[0]] += '\n';
  const result = evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract(bundle, bodies);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.some(blocker => blocker.endsWith('sha256_mismatch')));
});

test('CM2078 rejects forbidden raw or secret-shaped fields by key', () => {
  const { bundle, bodies } = load();
  bundle.payload.providerPayload = 'not retained';
  const result = evaluateNearModelMemoryPlanPackCanonicalReviewBundleContract(bundle, bodies);
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_or_review_fields');
});
