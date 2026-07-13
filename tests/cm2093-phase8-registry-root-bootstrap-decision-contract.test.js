'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DECISION_BLOB_OID,
  DECISION_BYTES,
  DECISION_SHA256,
  DECISION_SOURCE_COMMIT,
  evaluateCm2093Phase8RegistryRootBootstrapDecision
} = require('../src/core/Cm2093Phase8RegistryRootBootstrapDecisionContract');

const decisionBytes = fs.readFileSync(path.join(
  __dirname,
  '..',
  'docs',
  'near-model-memory-plan-pack',
  'phase8_content_decision_cm2093.json'
));

function evaluate(overrides = {}) {
  return evaluateCm2093Phase8RegistryRootBootstrapDecision({
    decisionBytes,
    decisionSourceCommit: DECISION_SOURCE_COMMIT,
    decisionBlobOid: DECISION_BLOB_OID,
    now: new Date('2026-07-12T00:00:00+08:00'),
    ...overrides
  });
}

test('CM-2093 registry bootstrap decision binds exact Git artifact and active window', () => {
  const result = evaluate();

  assert.equal(DECISION_BYTES, 1062);
  assert.equal(DECISION_SHA256, '9fb37b29e18ee65225e8e2fcb9628260ba93afb5ced6c195388e390570daa5dc');
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.bootstrapMayExecute, true);
});

test('CM-2093 registry bootstrap decision rejects copied, changed, or expired artifacts', () => {
  for (const result of [
    evaluate({ decisionSourceCommit: '0'.repeat(40) }),
    evaluate({ decisionBlobOid: '0'.repeat(40) }),
    evaluate({ decisionBytes: Buffer.from(decisionBytes.toString('utf8').replace(
      '"authorizationUseCount": 1',
      '"authorizationUseCount": 2'
    )) }),
    evaluate({ now: new Date('2026-07-15T18:00:00+08:00') })
  ]) {
    assert.equal(result.accepted, false);
    assert.equal(result.bootstrapMayExecute, false);
  }
});
