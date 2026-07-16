'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2092Phase8AuthorizationDecisionIssuanceRequest } = require('../src/core/Cm2092Phase8AuthorizationDecisionIssuanceRequestContract');

const docs = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack');
const request = JSON.parse(fs.readFileSync(path.join(docs, 'phase8_authorization_decision_issuance_request_cm2092.json'), 'utf8'));
const contextBytes = fs.readFileSync(path.join(docs, 'phase8_execution_context_cm2092.json'));
const allowlistBytes = fs.readFileSync(path.join(docs, 'phase8_execution_allowlist_cm2092.json'));
const payloadBytes = fs.readFileSync(path.join(docs, 'phase8_native_write_proof_record_cm2089.json'));

test('CM-2092 accepts exact issuance request but keeps execution and fourth slot false', () => {
  const result = evaluateCm2092Phase8AuthorizationDecisionIssuanceRequest({ request, contextBytes, allowlistBytes, payloadBytes });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.nativeWriteMayExecute, false);
  assert.equal(result.finalExecutionReleaseReviewRequired, true);
});

test('CM-2092 fails closed for binding drift, execution counters, or premature authorization', () => {
  for (const drift of [
    { contextCanonicalSha256: '0'.repeat(64) },
    { authorizationContentIssuanceRequested: false },
    { phase8NativeWriteAuthorizationGranted: true },
    { nativeWriteMayExecuteFromThisRequest: true },
    { executionCounters: { ...request.executionCounters, nativeWrites: 1 } }
  ]) {
    const result = evaluateCm2092Phase8AuthorizationDecisionIssuanceRequest({ request: { ...request, ...drift }, contextBytes, allowlistBytes, payloadBytes });
    assert.equal(result.accepted, false);
    assert.equal(result.nativeWriteMayExecute, false);
  }
});
