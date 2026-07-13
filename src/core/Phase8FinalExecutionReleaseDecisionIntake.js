'use strict';

const crypto = require('node:crypto');

const MACHINE_BOUND_RELEASE_DECISIONS = new WeakSet();

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isMachineBoundPhase8FinalExecutionReleaseDecision(decision) {
  return Boolean(decision && typeof decision === 'object' && MACHINE_BOUND_RELEASE_DECISIONS.has(decision));
}

function evaluatePhase8FinalExecutionReleaseDecisionIntake({ decisionBytes, observedBinding, expectedBinding, now = new Date() } = {}) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes) || !observedBinding || !expectedBinding) {
    return { accepted: false, blockers: ['missing_input'], decision: null };
  }
  const fileSha256 = sha256(decisionBytes);
  for (const field of ['decisionSourceCommit', 'decisionBlobOid', 'decisionPayloadSha256']) {
    if (!observedBinding[field]) blockers.push(`binding.${field}`);
  }
  if (observedBinding.decisionSourceCommit !== expectedBinding.decisionSourceCommit) {
    blockers.push('binding.decisionSourceCommit');
  }
  if (observedBinding.decisionBlobOid !== expectedBinding.decisionBlobOid) {
    blockers.push('binding.decisionBlobOid');
  }
  if (fileSha256 !== observedBinding.decisionPayloadSha256) blockers.push('binding.decisionPayloadSha256');
  let decision = null;
  try { decision = JSON.parse(decisionBytes.toString('utf8')); } catch { blockers.push('decision.invalidJson'); }
  if (decision) {
    const exact = {
      decisionReference: expectedBinding.expectedFinalReleaseDecisionReference,
      executionReleaseAuthorized: true,
      phase8NativeWriteAuthorized: true,
      token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
      allowedAction: 'live_bridge_record_memory_proof',
      authorizationContentDecisionReference: expectedBinding.authorizationContentDecisionReference,
      authorizationContentSourceCommit: expectedBinding.authorizationContentSourceCommit,
      authorizationContentBlobOid: expectedBinding.authorizationContentBlobOid,
      authorizationContentPayloadSha256: expectedBinding.authorizationContentPayloadSha256,
      executionPacketCommit: expectedBinding.executionPacketCommit,
      executionManifestBlobOid: expectedBinding.executionManifestBlobOid,
      executionManifestSha256: expectedBinding.executionManifestSha256,
      expectedContextHash: expectedBinding.expectedContextHash,
      expectedAllowlistHash: expectedBinding.expectedAllowlistHash,
      payloadCanonicalSha256: expectedBinding.payloadCanonicalSha256,
      nonce: expectedBinding.nonce,
      receiptId: expectedBinding.receiptId,
      authorizationUseCount: 1
    };
    for (const [field, expected] of Object.entries(exact)) {
      if (decision[field] !== expected) blockers.push(`decision.${field}`);
    }
    const expiresAtMs = typeof decision.expiresAt === 'string'
      ? Date.parse(decision.expiresAt)
      : Number.NaN;
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs) || expiresAtMs <= nowMs) {
      blockers.push('decision.expiresAt');
    }
  }
  if (blockers.length) return { accepted: false, blockers, decision: null };
  Object.freeze(decision);
  MACHINE_BOUND_RELEASE_DECISIONS.add(decision);
  return { accepted: true, blockers: [], decision, decisionIdentityMachineBound: true, executionAuthorized: true };
}

module.exports = {
  evaluatePhase8FinalExecutionReleaseDecisionIntake,
  isMachineBoundPhase8FinalExecutionReleaseDecision
};
