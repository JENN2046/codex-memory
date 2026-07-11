'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MANIFEST_PATH,
  exactAllowlist,
  runFrozenExecutor
} = require('../src/cli/phase8-frozen-one-shot-executor');

test('frozen executor accepts only an exact packet commit, not injected callbacks or registry paths', async () => {
  await assert.rejects(
    runFrozenExecutor({
      executionPacketCommit: 'a'.repeat(40),
      executeNativeWrite: async () => ({ nativeWritePerformed: true }),
      verifyWrite: async () => ({ accepted: true }),
      registryDirectory: '/tmp/replayable-registry'
    }),
    /execution_packet_commit_required/
  );
  assert.equal(MANIFEST_PATH, 'docs/near-model-memory-plan-pack/phase8_frozen_execution_manifest.json');
});

test('frozen executor allowlist keeps exactly one write, one verify, and zero compensation operations', () => {
  const allowlist = exactAllowlist();
  assert.deepEqual(allowlist.nativeWriteTools, ['record_memory']);
  assert.deepEqual(allowlist.nativeWriteActions, ['live_bridge_record_memory_proof']);
  assert.equal(allowlist.maxNativeWrites, 1);
  assert.equal(allowlist.verifySurface, 'verifyPhase8NativeWriteAuditProjection');
  assert.equal(allowlist.verifyTool, 'audit_memory');
  assert.equal(allowlist.verifyWindow, 10);
  assert.equal(allowlist.maxVerifyOperations, 1);
  assert.equal(allowlist.maxRollbackOrCompensationOperations, 0);
  assert.equal(allowlist.automaticRetryAllowed, false);
  assert.equal(allowlist.automaticRollbackAllowed, false);
  assert.equal(allowlist.existingMemoryModificationAllowed, false);
});
