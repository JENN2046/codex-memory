'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GovernedReadFacade } = require('../src/core/GovernedReadFacade');

test('M4 GovernedReadFacade performs internal subcalls and binds aggregate receipts', async () => {
  const calls = [];
  const times = ['2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.050Z'];
  const facade = new GovernedReadFacade({
    nativeRecall: async () => {
      calls.push('native');
      return { status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED', accepted: true, results: [] };
    },
    governanceOverview: async () => { calls.push('overview'); return { status: 'success' }; },
    governanceAudit: async () => { calls.push('audit'); return { status: 'success' }; },
    clock: () => times.shift()
  });
  const result = await facade.read();
  assert.equal(result.status, 'success');
  assert.deepEqual(calls, ['native', 'overview', 'audit']);
  assert.equal(result.publicMcpReentrancyUsed, false);
  assert.equal(result.sourceTruthReceipt.subReceiptCount, 3);
  assert.match(result.aggregateReceiptDigest, /^sha256:[a-f0-9]{64}$/);
});

test('M4 GovernedReadFacade blocks MCP reentry and strict-profile fallback', async () => {
  assert.throws(() => new GovernedReadFacade({ mcpCall() {} }), /VCP_PUBLIC_TOOL_REENTRANCY_BLOCKED/);
  const facade = new GovernedReadFacade({
    nativeRecall: async () => ({
      status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED',
      accepted: true,
      access: { localMemoryFallbackUsed: true }
    }),
    governanceOverview: async () => { throw new Error('must not run'); },
    governanceAudit: async () => { throw new Error('must not run'); },
    clock: () => '2026-07-17T00:00:00.000Z'
  });
  const result = await facade.read();
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'FALLBACK_NOT_AUTHORIZED');
  assert.equal(result.publicMcpReentrancyUsed, false);
});
