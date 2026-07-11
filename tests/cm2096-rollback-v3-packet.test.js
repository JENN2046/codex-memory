'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256Canonical } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');
const { exactCm2096Allowlist } = require('../src/cli/cm2096-frozen-rollback-v3');

const root = path.join(__dirname, '..');
const packet = JSON.parse(fs.readFileSync(path.join(root, 'docs/near-model-memory-plan-pack/phase8_rollback_execution_packet_cm2096_v3.json'), 'utf8'));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim();
}

function packetPayloadHash(value) {
  const { packetPayloadSha256, ...payload } = value;
  return sha256Canonical(payload);
}

function expectedRuntimeContext() {
  return {
    schemaVersion: 1,
    taskId: 'CM-2096',
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree,
    cleanDetachedCheckoutRequired: true,
    outerTransport: 'isolated_stdio_mcp',
    innerNativeTransport: 'local_http_mcp',
    primaryRuntime: 'VCPToolBox native memory',
    nativeWriteDelegationMode: 'primary',
    nativeReadDelegationMode: 'off',
    innerHttpTargetAccepted: true,
    innerHttpTargetConfigured: true,
    innerHttpAuthConfigured: true,
    innerTombstoneToolName: 'knowledge_base.tombstone',
    runtimeTargetReferenceName: packet.runtimeTarget.targetReferenceName,
    runtimeTargetKind: packet.runtimeTarget.targetKind,
    runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
    targetStoreReference: packet.targetStoreReference,
    targetStoreRole: packet.targetStoreRole,
    targetStoreIdentityBytes: packet.targetStoreIdentityCanonicalBytes,
    targetStoreIdentitySha256: packet.targetStoreIdentitySha256,
    targetStoreSyntheticOnly: true,
    targetMemoryIdRef: packet.targetMemoryIdRef,
    targetRecordBytes: packet.targetRecordBytes,
    targetRecordSha256: packet.targetRecordSha256,
    tombstonePayloadCanonicalBytes: packet.tombstonePayloadCanonicalBytes,
    tombstonePayloadCanonicalSha256: packet.tombstonePayloadCanonicalSha256,
    durableMarkerBytes: packet.durableMarkerBytes,
    durableMarkerSha256: packet.durableMarkerSha256,
    expectedMarkerMemoryIdRef: packet.expectedMarkerMemoryIdRef,
    authorizationRegistryReference: packet.registryIdentity.authorizationRegistryReference,
    authorizationRegistryStorageRole: packet.registryIdentity.registryStorageRole,
    authorizationRegistryRootReference: packet.registryRootIdentity.registryRootReference,
    authorizationRegistryRootIdentitySha256: packet.registryRootIdentitySha256,
    scope: packet.allowedScope,
    expectedScopeFingerprint: packet.expectedScopeFingerprint
  };
}

test('CM-2096 v3 packet binds the accepted v2 baseline and frozen implementation Git objects', () => {
  assert.equal(packet.packetPayloadSha256, packetPayloadHash(packet));
  assert.equal(git(['rev-parse', `${packet.implementationCommit}^{tree}`]), packet.implementationTree);
  for (const artifact of Object.values(packet.implementationArtifacts)) {
    assert.equal(git(['rev-parse', `${packet.implementationCommit}:${artifact.path}`]), artifact.blobOid);
  }
  assert.equal(git(['rev-parse', `${packet.v2ReviewDecisionCommit}:docs/near-model-memory-plan-pack/phase8_rollback_execution_packet_cm2096_v2_review_decision.json`]), packet.v2ReviewDecisionBlobOid);
  assert.equal(git(['rev-parse', `${packet.v2PacketCommit}:docs/near-model-memory-plan-pack/phase8_rollback_execution_packet_cm2096_v2.json`]), packet.v2PacketBlobOid);
});

test('CM-2096 v3 packet independently recomputes context, allowlist, store, target, and marker bindings', () => {
  assert.equal(sha256Canonical(expectedRuntimeContext()), packet.contextCanonicalSha256);
  assert.equal(sha256Canonical(exactCm2096Allowlist()), packet.allowlistCanonicalSha256);
  const identityBytes = fs.readFileSync(path.join(root, packet.targetStoreIdentityPath));
  assert.equal(identityBytes.length, packet.targetStoreIdentityFileBytes);
  assert.equal(sha256(identityBytes), packet.targetStoreIdentityFileSha256);
  assert.equal(packet.targetStoreIdentityCanonicalBytes, 576);
  assert.equal(packet.targetStoreIdentitySha256, 'e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13');
  assert.equal(packet.targetMemoryIdRef, `vcp-kb-${packet.targetRecordSha256.slice(0, 16)}`);
  assert.equal(packet.expectedMarkerMemoryIdRef, `vcp-kb-${packet.durableMarkerSha256.slice(0, 16)}`);
});

test('CM-2096 v3 packet remains non-executing and truthfully records unresolved execution blockers', () => {
  assert.equal(packet.executionAuthorizedAtPacketFreeze, false);
  assert.equal(packet.tombstoneExecutionAuthorizedAtPacketFreeze, false);
  assert.equal(packet.verifyAuthorizedAtPacketFreeze, false);
  assert.equal(packet.authorizationDecisionPresentAtPacketFreeze, false);
  assert.equal(packet.targetStoreIdentityBootstrapReceiptPresent, false);
  assert.equal(packet.targetStorePreflightExecutedAtPacketFreeze, false);
  assert.equal(packet.readyForActionSpecificExecutionAuthorization, false);
  assert.equal(packet.nativeActionCount, 0);
  assert.equal(packet.verifyOperationCount, 0);
  assert.equal(packet.rollbackDrillPassed, false);
  assert.equal(packet.phase8Completed, false);
  assert.ok(packet.executionReadinessBlockers.includes('future_exact_tombstone_decision_absent'));
});

test('CM-2096 v3 packet rejects any authority, target, marker, implementation, or hash drift by binding', () => {
  for (const candidate of [
    { ...packet, executionAuthorizedAtPacketFreeze: true },
    { ...packet, targetMemoryIdRef: 'vcp-kb-0000000000000000' },
    { ...packet, durableMarkerSha256: '0'.repeat(64) },
    { ...packet, implementationCommit: '0'.repeat(40) },
    { ...packet, maxRetries: 1 }
  ]) assert.notEqual(packetPayloadHash(candidate), packet.packetPayloadSha256);
});
