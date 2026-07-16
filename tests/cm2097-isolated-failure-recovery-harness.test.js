'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('../src/core/Cm2097IsolatedFailureRecoveryHarness');

const docs = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack');
const files = [
  'phase8_failure_case_pre_claim_cm2097.json',
  'phase8_failure_case_pre_commit_cm2097.json',
  'phase8_failure_case_ambiguous_post_commit_cm2097.json'
];
const manifests = files.map(file => JSON.parse(fs.readFileSync(path.join(docs, file), 'utf8')));

test('CM-2097 compiles exactly three immutable non-executing case manifests', () => {
  assert.deepEqual(harness.CASE_IDS, manifests.map(item => item.caseId));
  for (const manifest of manifests) {
    const compiled = harness.buildCm2097CaseManifest(manifest.caseId);
    assert.deepEqual(compiled, manifest);
    assert.equal(Object.isFrozen(compiled), true);
    assert.equal(compiled.executionAuthorized, false);
  }
  assert.equal(Object.hasOwn(harness, 'execute'), false);
  assert.equal(Object.hasOwn(harness, 'runCase'), false);
});

test('CM-2097 validates coverage and unique nonce receipt and registry identities', () => {
  const summary = harness.summarizeCm2097HarnessDesign(manifests);
  assert.equal(summary.accepted, true, summary.blockers.join(', '));
  assert.equal(summary.caseCount, 3);
  assert.equal(summary.executionAuthorized, false);
  assert.equal(summary.failureRecoveryProofPassed, false);
});

test('CM-2097 fails closed on caller stage drift, retry, CM-2094 reuse, or premature proof', () => {
  const source = manifests[1];
  for (const drift of [
    { failureStage: 'caller_selected_stage' },
    { retryCount: 1 },
    { usesCm2094Nonce: true },
    { arbitraryCallbackInjectionAllowed: true },
    { executionAuthorized: true },
    { failureRecoveryProofPassed: true }
  ]) assert.equal(harness.validateCm2097CaseManifest({ ...source, ...drift }).accepted, false);
  assert.throws(() => harness.buildCm2097CaseManifest('arbitrary_case'), /unsupported_cm2097_case_id/);
});

test('CM-2097 does not infer all-case PASS from partial or duplicated manifests', () => {
  assert.equal(harness.summarizeCm2097HarnessDesign(manifests.slice(0, 2)).accepted, false);
  assert.equal(harness.summarizeCm2097HarnessDesign([manifests[0], manifests[0], manifests[2]]).accepted, false);
});
