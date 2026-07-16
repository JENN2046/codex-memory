'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256 } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const { evaluatePhase8ExternalAuthorizationDecisionIntake } = require('../src/core/Phase8ExternalAuthorizationDecisionIntake');

const decisionBytes = fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_content_decision_cm2093.json'));
const decision = JSON.parse(decisionBytes);
const expectedBinding = {
  decisionReference: 'CM-2093-ER-20260711-CONTENT-ROOT-BOOTSTRAP-PASS-240FD4F7',
  decisionSourceCommit: 'a'.repeat(40),
  decisionBlobOid: 'b'.repeat(40),
  decisionPayloadSha256: sha256(decisionBytes),
  expectedContextHash: 'f1cf912c1609dbf70ac07794c7b691e85f92e4c6daceda168e444d175dc49283',
  expectedAllowlistHash: 'b69cc85dc7b9387425342ffbec7c299317dcf1eaa6948d4042503399a6b33e20',
  payloadCanonicalSha256: '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee',
  nonce: 'cm2093-phase8-record-memory-proof-001',
  receiptId: 'cm2093-phase8-native-write-receipt-001',
  registryRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  expectedFinalReleaseDecisionReference: 'CM-2094-ER-PHASE8-FINAL-EXECUTION-RELEASE-F1CF912C-B69CC85D'
};

test('CM-2093 exact content decision is machine-bound and non-executable', () => {
  const result = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes,
    observedBinding: expectedBinding,
    expectedBinding,
    now: new Date('2026-07-11T12:46:00+08:00')
  });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.decision.phase8NativeWriteAuthorized, false);
  assert.equal(result.decision.registryRootBootstrapAuthorized, true);
});

test('CM-2093 content decision cannot be promoted into native authorization', () => {
  const forged = { ...decision, phase8NativeWriteAuthorized: true, nativeWriteMayExecute: true };
  const forgedBytes = Buffer.from(JSON.stringify(forged));
  const result = evaluatePhase8ExternalAuthorizationDecisionIntake({
    decisionBytes: forgedBytes,
    observedBinding: { ...expectedBinding, decisionPayloadSha256: sha256(forgedBytes) },
    expectedBinding,
    now: new Date('2026-07-11T12:46:00+08:00')
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('decision.phase8NativeWriteAuthorized'));
  assert.ok(result.blockers.includes('decision.nativeWriteMayExecute'));
});
