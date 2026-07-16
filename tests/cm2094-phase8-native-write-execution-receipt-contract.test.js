'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2094Phase8NativeWriteExecutionReceipt } = require('../src/core/Cm2094Phase8NativeWriteExecutionReceiptContract');

const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_native_write_execution_receipt_cm2094.json'), 'utf8'));

test('CM-2094 execution receipt accepts one consumed write, one verify, and exact durable bytes', () => {
  const result = evaluateCm2094Phase8NativeWriteExecutionReceipt(receipt);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.additionalNativeWriteMayExecute, false);
  assert.equal(result.phase8CompletionAccepted, false);
});

test('CM-2094 execution receipt fails closed on replay, count, durable, fallback, or overclaim drift', () => {
  for (const drift of [
    { authorizationReplayAllowed: true },
    { nativeWriteCalls: 2 },
    { verifyOperations: 2 },
    { durableRecordSha256: '0'.repeat(64) },
    { localFallbackUsed: true },
    { rollbackOrCompensationPerformed: true },
    { rawMemoryReturned: true },
    { phase8Completed: true }
  ]) {
    const result = evaluateCm2094Phase8NativeWriteExecutionReceipt({ ...receipt, ...drift });
    assert.equal(result.accepted, false);
    assert.equal(result.additionalNativeWriteMayExecute, false);
    assert.equal(result.phase8CompletionAccepted, false);
  }
});
