'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2093Phase8RegistryRootBootstrapReceipt } = require('../src/core/Cm2093Phase8RegistryRootBootstrapReceiptContract');

const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_registry_root_bootstrap_receipt_cm2093.json'), 'utf8'));

test('CM-2093 bootstrap receipt accepts exact root initialization with zero native effects', () => {
  const result = evaluateCm2093Phase8RegistryRootBootstrapReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.nativeWriteMayExecute, false);
});

test('CM-2093 bootstrap receipt rejects replay, nonce, execution receipt, or native effects', () => {
  for (const drift of [
    { authorizationReplayAllowed: true },
    { nonceFileCount: 1 },
    { nativeExecutionReceiptCreated: true },
    { nativeWritePerformed: true },
    { phase8NativeWriteAuthorizationGranted: true }
  ]) {
    const result = evaluateCm2093Phase8RegistryRootBootstrapReceipt({ ...receipt, ...drift });
    assert.equal(result.accepted, false);
    assert.equal(result.nativeWriteMayExecute, false);
  }
});
