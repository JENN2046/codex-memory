'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { DECISION_BYTES, DECISION_SHA256, evaluateCm2094Phase8FinalExecutionReleaseDecision } = require('../src/core/Cm2094Phase8FinalExecutionReleaseDecisionContract');

const decisionBytes = fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_final_execution_release_decision.json'));

test('CM-2094 final release decision freezes the exact authorized bytes without executing', () => {
  const result = evaluateCm2094Phase8FinalExecutionReleaseDecision(decisionBytes);
  assert.equal(DECISION_BYTES, 1325);
  assert.equal(DECISION_SHA256, 'db9dd1cc6f884806e8ea0337e3d09765608fa0892ad7f29011d822805c1c0ccf');
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.phase8NativeWriteAuthorizationGranted, true);
  assert.equal(result.nativeWriteMayExecute, false);
  assert.equal(result.machineIntakeStillRequired, true);
});

test('CM-2094 final release decision rejects byte, hash, or authority drift', () => {
  for (const drift of [
    Buffer.concat([decisionBytes, Buffer.from('\n')]),
    Buffer.from(decisionBytes.toString('utf8').replace('"authorizationUseCount":1', '"authorizationUseCount":2')),
    Buffer.from(decisionBytes.toString('utf8').replace('"phase8NativeWriteAuthorized":true', '"phase8NativeWriteAuthorized":false'))
  ]) {
    const result = evaluateCm2094Phase8FinalExecutionReleaseDecision(drift);
    assert.equal(result.accepted, false);
    assert.equal(result.nativeWriteMayExecute, false);
  }
});
