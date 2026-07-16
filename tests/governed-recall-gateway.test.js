'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  GovernedRecallGateway,
  bindSourceRuntime
} = require('../src/core/GovernedRecallGateway');

test('governed recall gateway marks delegated native search explicitly', async () => {
  const gateway = new GovernedRecallGateway({
    callSearchMemory: async () => ({
      status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED',
      accepted: true,
      results: []
    })
  });

  const result = await gateway.search({ query: 'native context' });

  assert.equal(result.source_runtime, 'vcp_native');
  assert.equal(result.access.sourceRuntime, 'vcp_native');
  assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
});

test('governed recall gateway never labels rejected native delegation as native success', async () => {
  const gateway = new GovernedRecallGateway({
    callSearchMemory: async () => ({
      status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED',
      accepted: false,
      decision: 'rejected',
      access: {
        memoryReadPerformed: false,
        localMemoryFallbackUsed: false
      }
    })
  });

  const result = await gateway.search({ query: 'rejected native context' });

  assert.equal(result.source_runtime, 'vcp_native_unavailable');
  assert.equal(result.access.sourceRuntime, 'vcp_native_unavailable');
  assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
});

test('governed recall gateway requires accepted=true for native delegated status', () => {
  const result = bindSourceRuntime({
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED',
    results: []
  });

  assert.equal(result.source_runtime, 'vcp_native_unavailable');
  assert.equal(result.access.sourceRuntime, 'vcp_native_unavailable');
});

test('governed recall gateway marks audited local fallback without native masquerade', () => {
  const result = bindSourceRuntime({
    access: { localMemoryFallbackUsed: true },
    governedNativeReadFallback: { used: true },
    results: []
  });

  assert.equal(result.source_runtime, 'local_fallback');
  assert.equal(result.access.sourceRuntime, 'local_fallback');
  assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
});

test('governed recall gateway marks bridge-off reads as local compatibility', async () => {
  const gateway = new GovernedRecallGateway({
    callSearchMemory: async () => ({ results: [] })
  });

  const result = await gateway.search({ query: 'compatibility context' });

  assert.equal(result.source_runtime, 'local_compatibility');
  assert.equal(result.access.sourceRuntime, 'local_compatibility');
  assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
});
