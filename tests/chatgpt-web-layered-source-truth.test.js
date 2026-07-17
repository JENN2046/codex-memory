'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildLayeredSourceTruthReceipt,
  digestLayeredSourceTruthValue
} = require('../src/core/ChatGptWebLayeredSourceTruthReceipt');

test('M3-T5 binds every source layer without collapsing ownership into sourceRuntime', () => {
  const receipt = buildLayeredSourceTruthReceipt({
    memoryIntelligenceSource: 'vcp_native',
    fallbackStatus: 'not_used',
    observedFrom: '2026-07-17T00:00:00.000Z',
    observedTo: '2026-07-17T00:00:00.100Z',
    subReceiptDigests: [digestLayeredSourceTruthValue({ synthetic: true })]
  });
  assert.equal(receipt.status, 'candidate');
  assert.deepEqual(receipt.provenance, {
    memoryIntelligenceSource: 'vcp_native',
    governanceSource: 'codex_memory',
    packagingSource: 'codex_memory',
    transportSource: 'secure_mcp_tunnel',
    fallbackStatus: 'not_used',
    resultCanBeMistakenForVcpNative: false,
    consistency: {
      model: 'non_atomic_read_bundle',
      observedFrom: '2026-07-17T00:00:00.000Z',
      observedTo: '2026-07-17T00:00:00.100Z'
    }
  });
  assert.equal(Object.hasOwn(receipt, 'sourceRuntime'), false);
  assert.equal(receipt.rawMemoryReturned, false);
});

test('M3-T5 blocks unlabeled fallback, invalid windows, and external-call counters', () => {
  const receipt = buildLayeredSourceTruthReceipt({
    memoryIntelligenceSource: 'local_fallback',
    fallbackStatus: 'not_used',
    observedFrom: '2026-07-17T00:00:01.000Z',
    observedTo: '2026-07-17T00:00:00.000Z',
    subReceiptDigests: ['invalid'],
    providerApiCalls: 1
  });
  assert.equal(receipt.status, 'blocked');
  assert.ok(receipt.blockers.includes('fallback_unlabeled'));
  assert.ok(receipt.blockers.includes('observation_window_invalid'));
  assert.ok(receipt.blockers.includes('sub_receipt_digest_invalid'));
  assert.ok(receipt.blockers.includes('external_call_counter_nonzero'));
});

test('M3-T5 receipt digests are canonical and tolerate unserializable input', () => {
  assert.equal(
    digestLayeredSourceTruthValue({ b: 2, a: 1 }),
    digestLayeredSourceTruthValue({ a: 1, b: 2 })
  );
  const cyclic = {};
  cyclic.self = cyclic;
  assert.match(digestLayeredSourceTruthValue(cyclic), /^sha256:[a-f0-9]{64}$/);
});
