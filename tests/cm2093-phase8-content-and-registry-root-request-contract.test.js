'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2093Phase8ContentAndRegistryRootRequest } = require('../src/core/Cm2093Phase8ContentAndRegistryRootRequestContract');

const docs = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack');
const request = JSON.parse(fs.readFileSync(path.join(docs, 'phase8_content_and_registry_root_request_cm2093.json'), 'utf8'));
const input = {
  request,
  contextBytes: fs.readFileSync(path.join(docs, 'phase8_execution_context_cm2093.json')),
  allowlistBytes: fs.readFileSync(path.join(docs, 'phase8_execution_allowlist_cm2093.json')),
  rootIdentityBytes: fs.readFileSync(path.join(docs, 'phase8_registry_root_identity_cm2093.json')),
  payloadBytes: fs.readFileSync(path.join(docs, 'phase8_native_write_proof_record_cm2089.json'))
};

test('CM-2093 accepts review preparation while keeping native execution false', () => {
  const result = evaluateCm2093Phase8ContentAndRegistryRootRequest(input);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.nativeWriteMayExecute, false);
  assert.equal(result.nonceMayBeClaimed, false);
  assert.equal(result.finalExecutionReleaseReviewRequired, true);
});

test('CM-2093 fails closed for root drift, premature write authority, or nonzero counters', () => {
  for (const drift of [
    { registryRootIdentityCanonicalSha256: '0'.repeat(64) },
    { registryRootInitialized: true },
    { phase8NativeWriteAuthorizationGranted: true },
    { nativeWriteMayExecuteFromThisRequest: true },
    { executionCounters: { ...request.executionCounters, authorizationClaims: 1 } }
  ]) {
    const result = evaluateCm2093Phase8ContentAndRegistryRootRequest({ ...input, request: { ...request, ...drift } });
    assert.equal(result.accepted, false);
    assert.equal(result.nativeWriteMayExecute, false);
  }
});
