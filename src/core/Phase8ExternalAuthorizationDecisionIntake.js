'use strict';

const crypto = require('node:crypto');

const MACHINE_BOUND_DECISIONS = new WeakSet();

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isMachineBoundPhase8AuthorizationDecision(decision) {
  return Boolean(decision && typeof decision === 'object' && MACHINE_BOUND_DECISIONS.has(decision));
}

function evaluatePhase8ExternalAuthorizationDecisionIntake({ decisionBytes, observedBinding, expectedBinding, now = new Date() } = {}) {
  const blockers = [];
  if (!Buffer.isBuffer(decisionBytes) || !observedBinding || !expectedBinding) {
    return { accepted: false, blockers: ['missing_input'], decision: null };
  }
  const fileSha256 = sha256(decisionBytes);
  for (const field of ['decisionReference', 'decisionSourceCommit', 'decisionBlobOid', 'decisionPayloadSha256']) {
    if (observedBinding[field] !== expectedBinding[field]) blockers.push(`binding.${field}`);
  }
  if (fileSha256 !== expectedBinding.decisionPayloadSha256) blockers.push('binding.decisionPayloadSha256');
  let decision = null;
  try { decision = JSON.parse(decisionBytes.toString('utf8')); } catch { blockers.push('decision.invalidJson'); }
  if (decision) {
    for (const [field, expected] of Object.entries({
      decisionReference: expectedBinding.decisionReference,
      phase8NativeWriteAuthorized: true,
      token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT',
      allowedAction: 'live_bridge_record_memory_proof',
      expectedContextHash: expectedBinding.expectedContextHash,
      expectedAllowlistHash: expectedBinding.expectedAllowlistHash,
      payloadCanonicalSha256: expectedBinding.payloadCanonicalSha256,
      nonce: expectedBinding.nonce,
      receiptId: expectedBinding.receiptId,
      authorizationUseCount: 1
    })) if (decision[field] !== expected) blockers.push(`decision.${field}`);
    if (!decision.expiresAt || Date.parse(decision.expiresAt) <= new Date(now).getTime()) blockers.push('decision.expiresAt');
  }
  if (blockers.length) return { accepted: false, blockers, decision: null };
  MACHINE_BOUND_DECISIONS.add(decision);
  return { accepted: true, blockers: [], decision, decisionIdentityMachineBound: true };
}

module.exports = {
  evaluatePhase8ExternalAuthorizationDecisionIntake,
  isMachineBoundPhase8AuthorizationDecision
};
