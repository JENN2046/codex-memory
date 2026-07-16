'use strict';

const crypto = require('node:crypto');

const MACHINE_BOUND_DECISIONS = new WeakSet();

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isMachineBoundCm2096TombstoneDecision(decision) {
  return Boolean(decision && typeof decision === 'object' && MACHINE_BOUND_DECISIONS.has(decision));
}

function evaluateCm2096TombstoneExecutionDecisionIntake({ decisionBytes, observedBinding, expectedBinding, now = new Date() } = {}) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes) || !observedBinding || !expectedBinding) return { accepted: false, blockers: ['missing_input'], decision: null };
  for (const field of ['decisionSourceCommit', 'decisionBlobOid', 'decisionPayloadSha256']) if (!observedBinding[field]) blockers.push(`binding.${field}`);
  if (!/^[a-f0-9]{40}$/.test(observedBinding.decisionSourceCommit || '')) blockers.push('binding.decisionSourceCommit');
  if (!/^[a-f0-9]{40}$/.test(observedBinding.decisionBlobOid || '')) blockers.push('binding.decisionBlobOid');
  if (!/^[a-f0-9]{64}$/.test(observedBinding.decisionPayloadSha256 || '')) blockers.push('binding.decisionPayloadSha256');
  if (sha256(decisionBytes) !== observedBinding.decisionPayloadSha256) blockers.push('binding.decisionPayloadSha256');
  let decision = null;
  try { decision = JSON.parse(decisionBytes.toString('utf8')); } catch { blockers.push('decision.invalidJson'); }
  if (decision) {
    const exact = {
      decisionReference: expectedBinding.expectedDecisionReference,
      executionReleaseAuthorized: true,
      tombstoneExecutionAuthorized: true,
      verifyExecutionAuthorized: true,
      token: 'APPROVE_VCP_BRIDGE_LIVE_TOMBSTONE_MEMORY_PROOF_EXACT',
      allowedAction: 'live_bridge_tombstone_memory_proof',
      executionPacketCommit: expectedBinding.executionPacketCommit,
      executionPacketBlobOid: expectedBinding.executionPacketBlobOid,
      executionPacketSha256: expectedBinding.executionPacketSha256,
      implementationCommit: expectedBinding.implementationCommit,
      implementationTree: expectedBinding.implementationTree,
      targetStoreReference: expectedBinding.targetStoreReference,
      targetStoreIdentitySha256: expectedBinding.targetStoreIdentitySha256,
      targetMemoryIdRef: expectedBinding.targetMemoryIdRef,
      targetRecordBytes: expectedBinding.targetRecordBytes,
      targetRecordSha256: expectedBinding.targetRecordSha256,
      payloadCanonicalBytes: expectedBinding.payloadCanonicalBytes,
      payloadCanonicalSha256: expectedBinding.payloadCanonicalSha256,
      durableMarkerBytes: expectedBinding.durableMarkerBytes,
      durableMarkerSha256: expectedBinding.durableMarkerSha256,
      expectedMarkerMemoryIdRef: expectedBinding.expectedMarkerMemoryIdRef,
      expectedContextHash: expectedBinding.expectedContextHash,
      expectedAllowlistHash: expectedBinding.expectedAllowlistHash,
      expectedScopeFingerprint: expectedBinding.expectedScopeFingerprint,
      registryRootIdentitySha256: expectedBinding.registryRootIdentitySha256,
      nonce: expectedBinding.nonce,
      receiptId: expectedBinding.receiptId,
      registryReference: expectedBinding.registryReference,
      authorizationUseCount: 1,
      maxTombstoneWrites: 1,
      maxVerifyOperations: 1,
      maxRetries: 0,
      maxSupersedeOperations: 0,
      maxCompensationOperations: 0,
      localFallbackAllowed: false,
      registryMarkerDeletionAllowed: false,
      registryRebuildAllowed: false
    };
    const exactFields = [...Object.keys(exact), 'expiresAt', 'approvedAt'].sort();
    if (JSON.stringify(Object.keys(decision).sort()) !== JSON.stringify(exactFields)) blockers.push('decision.fields');
    for (const [field, expected] of Object.entries(exact)) if (decision[field] !== expected) blockers.push(`decision.${field}`);
    const approvedAtMs = typeof decision.approvedAt === 'string'
      ? Date.parse(decision.approvedAt)
      : Number.NaN;
    const expiresAtMs = typeof decision.expiresAt === 'string'
      ? Date.parse(decision.expiresAt)
      : Number.NaN;
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(approvedAtMs) || !Number.isFinite(nowMs) || approvedAtMs > nowMs) {
      blockers.push('decision.approvedAt');
    }
    if (!Number.isFinite(expiresAtMs) ||
        !Number.isFinite(nowMs) ||
        !Number.isFinite(approvedAtMs) ||
        nowMs >= expiresAtMs ||
        approvedAtMs >= expiresAtMs) {
      blockers.push('decision.expiresAt');
    }
  }
  if (blockers.length) return { accepted: false, blockers, decision: null };
  deepFreeze(decision);
  MACHINE_BOUND_DECISIONS.add(decision);
  return { accepted: true, blockers: [], decision, decisionIdentityMachineBound: true, executionAuthorized: true };
}

module.exports = { evaluateCm2096TombstoneExecutionDecisionIntake, isMachineBoundCm2096TombstoneDecision };
