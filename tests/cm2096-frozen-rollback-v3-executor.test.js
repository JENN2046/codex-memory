'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DECISION_PATH,
  PACKET_PATH,
  cm2096RuntimeRouteAccepted,
  exactCm2096Allowlist,
  resolveCm2096RegistryGovernanceRoot,
  runFrozenCm2096RollbackV3
} = require('../src/cli/cm2096-frozen-rollback-v3');

test('CM-2096 v3 frozen executor accepts only two immutable Git commit arguments', async () => {
  assert.equal(runFrozenCm2096RollbackV3.length, 2);
  await assert.rejects(
    runFrozenCm2096RollbackV3({ packet: 'caller-object', writeCallback: () => {} }, '1'.repeat(40)),
    /cm2096_execution_packet_commit_required/
  );
  await assert.rejects(
    runFrozenCm2096RollbackV3('1'.repeat(40), { decision: 'caller-object', verifyCallback: () => {} }),
    /cm2096_future_tombstone_decision_commit_required/
  );
  assert.equal(PACKET_PATH, 'docs/near-model-memory-plan-pack/phase8_rollback_execution_packet_cm2096_v3.json');
  assert.equal(DECISION_PATH, 'docs/near-model-memory-plan-pack/cm2096_tombstone_execution_decision.json');
});

test('CM-2096 v3 allowlist permits one tombstone and one verify with no retry or compensation', () => {
  const allowlist = exactCm2096Allowlist();
  assert.deepEqual(allowlist.nativeWriteTools, ['tombstone_memory']);
  assert.deepEqual(allowlist.nativeReadTools, []);
  assert.equal(allowlist.nativeReadAllowed, false);
  assert.equal(allowlist.maxTombstoneWrites, 1);
  assert.equal(allowlist.maxVerifyOperations, 1);
  assert.equal(allowlist.recordMemoryAllowed, false);
  assert.equal(allowlist.supersedeMemoryAllowed, false);
  assert.equal(allowlist.maxRetries, 0);
  assert.equal(allowlist.automaticRetryAllowed, false);
  assert.equal(allowlist.maxSupersedeOperations, 0);
  assert.equal(allowlist.maxCompensationOperations, 0);
  assert.equal(allowlist.registryMarkerDeletionAllowed, false);
  assert.equal(allowlist.registryRebuildAllowed, false);
});

test('CM-2096 registry root remains under the Git common-dir governance root', () => {
  const root = resolveCm2096RegistryGovernanceRoot('/safe/git-common-dir');
  assert.ok(root.endsWith('/safe/git-common-dir/codex-memory-governance/phase8-one-shot-authorization-registries'));
});

test('CM-2096 route preflight requires tombstone write primary and native reads off', () => {
  const expectedTarget = { targetReferenceName: 'cm2096-target', targetKind: 'mcp_server' };
  const config = {
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeReadDelegationMode: 'off',
    governedMcpVcpNativeRuntimeTarget: { accepted: true, ...expectedTarget },
    governedMcpVcpNativeHttpMcpTarget: {
      accepted: true,
      configured: true,
      bearerTokenConfigured: true,
      mcpToolNameByAction: { tombstone_memory: 'knowledge_base.tombstone' }
    }
  };
  assert.equal(cm2096RuntimeRouteAccepted(config, expectedTarget), true);
  assert.equal(cm2096RuntimeRouteAccepted({ ...config, governedMcpVcpNativeReadDelegationMode: 'primary' }, expectedTarget), false);
  assert.equal(cm2096RuntimeRouteAccepted({ ...config, governedMcpVcpNativeWriteDelegationMode: 'off' }, expectedTarget), false);
});
