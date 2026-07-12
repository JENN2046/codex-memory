'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256Canonical } = require('../src/core/Cm2113VcpToolBoxOwnerNativeProofGate');
const {
  contentDecisionTemplateFromPacket,
  validateCm2113VcpToolBoxOwnerNativeProofPacket
} = require('../src/core/Cm2113VcpToolBoxOwnerNativeProofPacketContract');

function packetFixture() {
  const packet = {
    schemaVersion: 1,
    taskId: 'CM-2113',
    packetType: 'vcptoolbox_owner_native_proof_execution_packet',
    implementation: { commit: '1'.repeat(40), tree: '2'.repeat(40) },
    ownerRuntime: {
      owner: 'VCPToolBox', component: 'DailyNote', communication: 'stdio',
      runtimeSourceCommit: '3'.repeat(40), runtimeSourceTree: '4'.repeat(40),
      pluginBlobOid: '5'.repeat(40), manifestBlobOid: '6'.repeat(40), dependencyLockBlobOid: '7'.repeat(40),
      pluginSha256: '8'.repeat(64), manifestSha256: '9'.repeat(64), dependencyLockSha256: 'a'.repeat(64),
      preloadSha256: '1'.repeat(64),
      dotenvVersion: '16.6.1', dotenvPackageSha256: 'b'.repeat(64), dotenvMainSha256: 'c'.repeat(64)
    },
    transport: {
      outer: 'stdio_mcp_process', inner: 'local_http_mcp', ownerRuntime: 'stdio',
      contentLengthFramingRequired: true, processBoundaryRequired: true, innerAuthorizationRequired: true
    },
    storeReference: 'cm2113-store',
    storeInstanceId: 'cm2113-store-instance',
    lifecycleReference: 'cm2113-lifecycle',
    runtimeIdentitySha256: 'd'.repeat(64),
    storeIdentitySha256: 'e'.repeat(64),
    fixedRecord: { folder: 'cm2113', maid: 'codex', date: '2026-07-12', fileName: 'proof', localTime: '08:00', tag: 'synthetic' },
    recordArguments: {
      target: 'knowledge', title: 'synthetic', content: 'Synthetic proof.', evidence: 'CM-2113.',
      validated: true, reusable: false, sensitivity: 'internal'
    },
    payloadCanonicalSha256: '',
    durableBytes: 123,
    durableSha256: 'f'.repeat(64),
    authorization: {
      action: 'live_bridge_record_memory_proof', nonce: 'cm2113-nonce', receiptId: 'cm2113-receipt',
      useCount: 1, replayAllowed: false, approvedAt: '2026-07-12T08:00:00+08:00', expiresAt: '2099-07-12T18:00:00+08:00'
    },
    limits: { nativeWrites: 1, verifyOperations: 1, retries: 0, rollbackOrCompensation: 0 },
    nonClaims: { productionReady: false, releaseReady: false, rcReady: false, fullPlanPackCompleted: false },
    contentDecisionReference: 'CM-2113-CONTENT',
    finalReleaseDecisionReference: 'CM-2113-FINAL',
    allowedScope: { project_id: 'codex-memory', workspace_id: 'cm2113', scope_id: 'owner-proof', client_id: 'Codex', visibility: 'project' },
    executionContext: { agentAlias: 'Codex', clientId: 'Codex', projectId: 'codex-memory', workspaceId: 'cm2113', scopeId: 'owner-proof', visibility: 'project' },
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory', targetKind: 'mcp_server', targetReferenceName: 'cm2113-owner-runtime',
      storeReference: 'cm2113-store', storeInstanceId: 'cm2113-store-instance', storeIdentitySha256: 'e'.repeat(64)
    },
    rollbackPlanReference: 'cm2113-no-auto-rollback',
    authorizationRegistryIdentity: {
      authorizationRegistryReference: 'cm2113-owner-proof-registry',
      registryReinitializationAllowed: false,
      registryDeletionAllowed: false
    },
    governanceRootIdentitySha256: '0'.repeat(64),
    bootstrapReceiptGitIdentity: { sourceCommit: 'a'.repeat(40), blobOid: 'b'.repeat(40), bytes: 500, sha256: 'c'.repeat(64) },
    packetPayloadSha256: ''
  };
  packet.payloadCanonicalSha256 = sha256Canonical(packet.recordArguments);
  const { packetPayloadSha256, ...payload } = packet;
  packet.packetPayloadSha256 = sha256Canonical(payload);
  return packet;
}

test('CM-2113 packet is acyclic and binds exact owner runtime, transport, and stable store', () => {
  const packet = packetFixture();
  const result = validateCm2113VcpToolBoxOwnerNativeProofPacket(packet);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(Object.hasOwn(packet, 'executionPacket'), false);
  const template = contentDecisionTemplateFromPacket(packet);
  assert.equal(template.ownerRuntime.owner, 'VCPToolBox');
  assert.equal(template.transport.outer, 'stdio_mcp_process');
  assert.equal(template.store.identityPresentBeforeFirstNativeWrite, true);
});

test('CM-2113 packet rejects self identity, transport drift, and store replacement authority', () => {
  for (const mutate of [
    packet => { packet.executionPacket = { commit: '1'.repeat(40) }; },
    packet => { packet.transport.outer = 'direct_app_call'; },
    packet => { packet.runtimeTarget.storeInstanceId = 'clone-store'; }
  ]) {
    const packet = packetFixture();
    mutate(packet);
    const { packetPayloadSha256, ...payload } = packet;
    packet.packetPayloadSha256 = sha256Canonical(payload);
    assert.equal(validateCm2113VcpToolBoxOwnerNativeProofPacket(packet).accepted, false);
  }
});
