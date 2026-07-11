'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FINAL_RELEASE_DECISION_PATH,
  MANIFEST_PATH,
  exactAllowlist,
  resolvePhase8RegistryGovernanceRoot,
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
  assert.equal(FINAL_RELEASE_DECISION_PATH, 'docs/near-model-memory-plan-pack/phase8_final_execution_release_decision.json');
});

test('frozen executor requires a separate final release commit before any Git or runtime action', async () => {
  await assert.rejects(runFrozenExecutor('a'.repeat(40)), /final_release_decision_commit_required/);
});

test('registry governance root is derived from Git common-dir and ignores switchable dataDir values', () => {
  const first = resolvePhase8RegistryGovernanceRoot('/repo/.git');
  const second = resolvePhase8RegistryGovernanceRoot('/repo/.git');
  assert.equal(first, second);
  assert.doesNotMatch(first, /data-A|data-B/);
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
