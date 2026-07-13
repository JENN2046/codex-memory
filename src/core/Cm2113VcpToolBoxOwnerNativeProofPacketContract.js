'use strict';

const { sha256Canonical } = require('./Cm2113VcpToolBoxOwnerNativeProofGate');

const TOP_LEVEL_KEYS = Object.freeze([
  'allowedScope', 'authorization', 'authorizationRegistryIdentity',
  'bootstrapReceiptGitIdentity', 'contentDecisionReference', 'durableBytes',
  'durableSha256', 'executionContext', 'finalReleaseDecisionReference', 'fixedRecord',
  'governanceRootIdentitySha256', 'implementation', 'lifecycleReference',
  'limits', 'nonClaims', 'ownerRuntime', 'packetPayloadSha256', 'packetType',
  'payloadCanonicalSha256', 'recordArguments', 'rollbackPlanReference',
  'runtimeIdentitySha256', 'runtimeTarget', 'schemaVersion', 'storeIdentitySha256',
  'storeInstanceId', 'storeReference', 'taskId', 'transport'
]);
const FIXED_RECORD = Object.freeze({
  folder: 'cm2113-proof',
  maid: 'codex-memory-phase8-proof',
  date: '2026-07-12',
  fileName: 'cm2113-vcptoolbox-owner-runtime-proof',
  localTime: '08:00',
  tag: 'codex-memory, phase8, synthetic-proof, vcptoolbox-owner-runtime'
});

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function hex(value, length) {
  return new RegExp(`^[a-f0-9]{${length}}$`).test(value || '');
}

function safeReference(value) {
  return /^[A-Za-z0-9._:-]{1,200}$/.test(value || '');
}

function gitIdentityAccepted(value) {
  return exactKeys(value, ['blobOid', 'bytes', 'sha256', 'sourceCommit']) &&
    hex(value.sourceCommit, 40) && hex(value.blobOid, 40) &&
    Number.isInteger(value.bytes) && value.bytes > 0 && hex(value.sha256, 64);
}

function validateCm2113VcpToolBoxOwnerNativeProofPacket(packet = {}) {
  const blockers = [];
  if (!exactKeys(packet, TOP_LEVEL_KEYS)) blockers.push('packet.fields');
  if (packet.schemaVersion !== 1 || packet.taskId !== 'CM-2113' || packet.packetType !== 'vcptoolbox_owner_native_proof_execution_packet') {
    blockers.push('packet.identity');
  }
  const { packetPayloadSha256, ...payload } = packet;
  if (!hex(packetPayloadSha256, 64) || sha256Canonical(payload) !== packetPayloadSha256) blockers.push('packet.payloadSha256');
  if (!hex(packet.implementation?.commit, 40) || !hex(packet.implementation?.tree, 40)) blockers.push('implementation.git');
  const owner = packet.ownerRuntime || {};
  if (
    owner.owner !== 'VCPToolBox' || owner.component !== 'DailyNote' || owner.communication !== 'stdio' ||
    !hex(owner.runtimeSourceCommit, 40) || !hex(owner.runtimeSourceTree, 40) ||
    !hex(owner.pluginBlobOid, 40) || !hex(owner.manifestBlobOid, 40) || !hex(owner.dependencyLockBlobOid, 40) ||
    !hex(owner.pluginSha256, 64) || !hex(owner.manifestSha256, 64) || !hex(owner.dependencyLockSha256, 64) ||
    !hex(owner.preloadSha256, 64) ||
    owner.dotenvVersion !== '16.6.1' || !hex(owner.dotenvPackageSha256, 64) || !hex(owner.dotenvMainSha256, 64)
  ) blockers.push('ownerRuntime.binding');
  if (!hex(packet.runtimeIdentitySha256, 64) || !hex(packet.storeIdentitySha256, 64)) blockers.push('identity.sha256');
  if (!safeReference(packet.storeReference) || !safeReference(packet.storeInstanceId) || !safeReference(packet.lifecycleReference)) blockers.push('store.references');
  if (
    packet.transport?.outer !== 'stdio_mcp_process' ||
    packet.transport?.inner !== 'local_http_mcp' ||
    packet.transport?.ownerRuntime !== 'stdio' ||
    packet.transport?.contentLengthFramingRequired !== true ||
    packet.transport?.processBoundaryRequired !== true ||
    packet.transport?.innerAuthorizationRequired !== true
  ) blockers.push('transport.binding');
  if (
    packet.authorization?.action !== 'live_bridge_record_memory_proof' ||
    !safeReference(packet.authorization?.nonce) || !safeReference(packet.authorization?.receiptId) ||
    packet.authorization?.useCount !== 1 || packet.authorization?.replayAllowed !== false ||
    !packet.authorization?.expiresAt || Number.isNaN(Date.parse(packet.authorization.expiresAt)) ||
    !packet.authorization?.approvedAt || Number.isNaN(Date.parse(packet.authorization.approvedAt))
  ) blockers.push('authorization.binding');
  if (
    packet.limits?.nativeWrites !== 1 || packet.limits?.verifyOperations !== 1 ||
    packet.limits?.retries !== 0 || packet.limits?.rollbackOrCompensation !== 0
  ) blockers.push('limits');
  if (
    packet.nonClaims?.productionReady !== false || packet.nonClaims?.releaseReady !== false ||
    packet.nonClaims?.rcReady !== false || packet.nonClaims?.fullPlanPackCompleted !== false
  ) blockers.push('nonClaims');
  if (!hex(packet.payloadCanonicalSha256, 64) || !hex(packet.durableSha256, 64) || !Number.isInteger(packet.durableBytes) || packet.durableBytes <= 0) {
    blockers.push('payload.binding');
  }
  if (!packet.recordArguments || !exactKeys(packet.fixedRecord, Object.keys(FIXED_RECORD)) ||
      Object.entries(FIXED_RECORD).some(([key, value]) => packet.fixedRecord[key] !== value) ||
      sha256Canonical(packet.recordArguments) !== packet.payloadCanonicalSha256) {
    blockers.push('payload.canonical');
  }
  if (!gitIdentityAccepted(packet.bootstrapReceiptGitIdentity)) blockers.push('bootstrapReceipt.gitIdentity');
  if (!hex(packet.governanceRootIdentitySha256, 64)) blockers.push('governanceRootIdentity.sha256');
  if (!safeReference(packet.contentDecisionReference) || !safeReference(packet.finalReleaseDecisionReference)) blockers.push('decision.references');
  if (
    !safeReference(packet.allowedScope?.project_id) || !safeReference(packet.allowedScope?.workspace_id) ||
    !safeReference(packet.allowedScope?.scope_id) || !safeReference(packet.allowedScope?.client_id) ||
    packet.allowedScope?.visibility !== 'project'
  ) blockers.push('allowedScope');
  if (
    packet.executionContext?.agentAlias !== 'Codex' || packet.executionContext?.clientId !== 'Codex' ||
    packet.executionContext?.projectId !== packet.allowedScope?.project_id ||
    packet.executionContext?.workspaceId !== packet.allowedScope?.workspace_id ||
    packet.executionContext?.scopeId !== packet.allowedScope?.scope_id ||
    packet.executionContext?.clientId !== packet.allowedScope?.client_id ||
    packet.executionContext?.visibility !== packet.allowedScope?.visibility
  ) blockers.push('executionContext.scopeBinding');
  if (
    packet.runtimeTarget?.primaryRuntime !== 'VCPToolBox native memory' ||
    packet.runtimeTarget?.targetKind !== 'mcp_server' ||
    !safeReference(packet.runtimeTarget?.targetReferenceName) ||
    !safeReference(packet.rollbackPlanReference)
  ) blockers.push('runtimeTarget');
  if (
    packet.storeReference !== packet.runtimeTarget?.storeReference ||
    packet.storeInstanceId !== packet.runtimeTarget?.storeInstanceId ||
    packet.storeIdentitySha256 !== packet.runtimeTarget?.storeIdentitySha256
  ) blockers.push('runtimeTarget.storeBinding');
  if (!safeReference(packet.authorizationRegistryIdentity?.authorizationRegistryReference) ||
      packet.authorizationRegistryIdentity?.registryReinitializationAllowed !== false ||
      packet.authorizationRegistryIdentity?.registryDeletionAllowed !== false) blockers.push('registry.identity');
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function contentDecisionTemplateFromPacket(packet) {
  return {
    implementation: packet.implementation,
    ownerRuntime: packet.ownerRuntime,
    transport: packet.transport,
    store: {
      reference: packet.storeReference,
      instanceId: packet.storeInstanceId,
      lifecycleReference: packet.lifecycleReference,
      identitySha256: packet.storeIdentitySha256,
      syntheticOnly: true,
      identityPresentBeforeFirstNativeWrite: true,
      replacementAllowed: false,
      reinitializationAllowed: false
    },
    payload: {
      canonicalSha256: packet.payloadCanonicalSha256,
      durableSha256: packet.durableSha256,
      durableBytes: packet.durableBytes
    },
    authorization: packet.authorization,
    limits: packet.limits,
    nonClaims: packet.nonClaims
  };
}

module.exports = {
  contentDecisionTemplateFromPacket,
  gitIdentityAccepted,
  validateCm2113VcpToolBoxOwnerNativeProofPacket
};
