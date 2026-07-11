'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const INTERNAL_ASSERTION = Symbol('phase8-one-shot-native-write-assertion');
const FINAL_STATES = new Set([
  'CONSUMED_SUCCESS',
  'CONSUMED_FAILED_PRE_COMMIT',
  'CONSUMED_AMBIGUOUS_POST_COMMIT'
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function safeKey(value) {
  return sha256(String(value || ''));
}

class Phase8OneShotAuthorizationRegistry {
  constructor({ directory }) {
    this.directory = directory;
  }

  async claim({ nonce, receiptId, bindingHash }) {
    await fs.mkdir(this.directory, { recursive: true });
    const lock = path.join(this.directory, '.claim.lock');
    let lockHandle;
    try {
      lockHandle = await fs.open(lock, 'wx');
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('authorization_registry_busy');
      throw error;
    }
    const noncePath = path.join(this.directory, `nonce-${safeKey(nonce)}.json`);
    const receiptPath = path.join(this.directory, `receipt-${safeKey(receiptId)}.json`);
    const claimId = sha256Canonical({ nonce, receiptId, bindingHash });
    const statePath = path.join(this.directory, `claim-${claimId}.json`);
    const record = { claimId, nonceHash: safeKey(nonce), receiptIdHash: safeKey(receiptId), bindingHash, state: 'CLAIMED' };
    try {
      await Promise.all([fs.access(noncePath), fs.access(receiptPath)]).then(
        () => { throw new Error('authorization_already_claimed'); },
        async () => {
          try {
            await fs.writeFile(noncePath, JSON.stringify({ claimId }), { flag: 'wx' });
            await fs.writeFile(receiptPath, JSON.stringify({ claimId }), { flag: 'wx' });
            await fs.writeFile(statePath, JSON.stringify(record), { flag: 'wx' });
          } catch (error) {
            if (error.code === 'EEXIST') throw new Error('authorization_already_claimed');
            throw error;
          }
        }
      );
    } finally {
      await lockHandle.close();
      await fs.unlink(lock).catch(() => {});
    }
    return record;
  }

  async readClaim(claimId) {
    const raw = await fs.readFile(path.join(this.directory, `claim-${claimId}.json`), 'utf8');
    return JSON.parse(raw);
  }

  async finalize(claimId, state) {
    if (!FINAL_STATES.has(state)) throw new Error('invalid_final_state');
    const current = await this.readClaim(claimId);
    if (current.state !== 'CLAIMED') throw new Error('authorization_not_claimed');
    const statePath = path.join(this.directory, `claim-${claimId}.json`);
    const tempPath = `${statePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify({ ...current, state }), { flag: 'wx' });
    await fs.rename(tempPath, statePath);
    return { ...current, state };
  }
}

function createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding, now = () => new Date() }) {
  if (!registry || !expectedBinding) throw new Error('missing_gate_configuration');

  async function verifyAssertion(assertion) {
    if (!assertion || assertion[INTERNAL_ASSERTION] !== true) return { accepted: false };
    const claim = await registry.readClaim(assertion.claimId).catch(() => null);
    if (!claim || claim.state !== 'CLAIMED' || claim.bindingHash !== assertion.bindingHash) {
      return { accepted: false };
    }
    return { accepted: true, exactApprovalResult: assertion.exactApprovalResult };
  }

  async function execute({ decision, runtimeFacts, payloadBytes, payloadBlobOid, executeNativeWrite, verifyWrite }) {
    if (typeof executeNativeWrite !== 'function') throw new Error('missing_native_write_executor');
    if (typeof verifyWrite !== 'function') throw new Error('missing_verify_executor');
    const payloadFileSha256 = sha256(payloadBytes);
    const payload = JSON.parse(payloadBytes.toString('utf8'));
    const payloadCanonicalSha256 = sha256Canonical(payload);
    const context = expectedBinding.buildContext(runtimeFacts, { payloadBlobOid, payloadFileSha256, payloadCanonicalSha256 });
    const allowlist = expectedBinding.buildAllowlist();
    const contextHash = sha256Canonical(context);
    const allowlistHash = sha256Canonical(allowlist);
    const blockers = [];
    if (decision?.phase8NativeWriteAuthorized !== true) blockers.push('decision.authorization');
    if (decision?.token !== 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT') blockers.push('decision.token');
    if (decision?.allowedAction !== 'live_bridge_record_memory_proof') blockers.push('decision.allowedAction');
    if (!decision?.expiresAt || Date.parse(decision.expiresAt) <= now().getTime()) blockers.push('decision.expired');
    if (decision?.authorizationUseCount !== 1) blockers.push('decision.authorizationUseCount');
    if (decision?.expectedContextHash !== contextHash) blockers.push('decision.expectedContextHash');
    if (decision?.expectedAllowlistHash !== allowlistHash) blockers.push('decision.expectedAllowlistHash');
    if (payloadFileSha256 !== expectedBinding.payloadFileSha256) blockers.push('payload.fileSha256');
    if (payloadCanonicalSha256 !== expectedBinding.payloadCanonicalSha256) blockers.push('payload.canonicalSha256');
    if (runtimeFacts?.clean !== true || runtimeFacts?.commit !== expectedBinding.runtimeSourceCommit || runtimeFacts?.tree !== expectedBinding.runtimeSourceTree) blockers.push('runtime.binding');
    if (payloadBlobOid !== expectedBinding.payloadBlobOid) blockers.push('payload.blobOid');
    if (blockers.length) return { accepted: false, blockers, nativeWriteCalls: 0, state: 'UNCLAIMED' };

    const bindingHash = sha256Canonical({ context, allowlist, payloadBlobOid });
    const claim = await registry.claim({ nonce: decision.nonce, receiptId: decision.receiptId, bindingHash });
    const exactApprovalResult = {
      accepted: true,
      allowedAction: 'live_bridge_record_memory_proof',
      allowedScope: expectedBinding.allowedScope,
      runtimeTarget: expectedBinding.runtimeTarget,
      rollbackPlanRef: expectedBinding.rollbackPlanReference,
      approvalId: decision.decisionReference,
      approvedAt: decision.approvedAt
    };
    const assertion = { [INTERNAL_ASSERTION]: true, claimId: claim.claimId, bindingHash, exactApprovalResult };
    try {
      const result = await executeNativeWrite({ payload, assertion });
      const nativeSuccess = result?.nativeWritePerformed === true && result?.durableWritePerformed === true;
      const verifyResult = nativeSuccess
        ? await verifyWrite({ claimId: claim.claimId, receiptId: decision.receiptId, nativeResult: result })
        : { accepted: false };
      const success = nativeSuccess && verifyResult?.accepted === true;
      const state = success ? 'CONSUMED_SUCCESS' : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await registry.finalize(claim.claimId, state);
      return { accepted: success, blockers: success ? [] : ['native_write_or_verify_result_ambiguous'], nativeWriteCalls: 1, verifyOperations: nativeSuccess ? 1 : 0, state, result, verifyResult };
    } catch (error) {
      const state = error?.commitState === 'pre_commit'
        ? 'CONSUMED_FAILED_PRE_COMMIT'
        : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await registry.finalize(claim.claimId, state);
      return { accepted: false, blockers: [state], nativeWriteCalls: 1, state };
    }
  }

  return { execute, verifyAssertion };
}

async function verifyPhase8NativeWriteAuditProjection({ callAuditMemory, scope, registry, claimId, receiptId }) {
  if (typeof callAuditMemory !== 'function' || !registry) return { accepted: false, reasonCode: 'verify_configuration_missing' };
  const claim = await registry.readClaim(claimId).catch(() => null);
  if (!claim || claim.state !== 'CLAIMED' || claim.receiptIdHash !== safeKey(receiptId)) {
    return { accepted: false, reasonCode: 'verify_claim_binding_invalid' };
  }
  const report = await callAuditMemory({
    audit_family: 'governance',
    window: 1,
    scope: {
      project_id: scope.project_id,
      scope_id: scope.scope_id,
      workspace_id: scope.workspace_id,
      workspace_id_present: true,
      client_id: 'codex',
      visibility: scope.visibility,
      task_id: 'CM-2091'
    },
    include_raw: false
  });
  const receipt = report?.findings?.[0]?.governedNativeBridgeReceipt;
  const accepted = report?.accepted === true &&
    report?.access?.rawMemoryReturned === false &&
    report?.access?.rawAuditReturned === false &&
    report?.access?.contentReturned === false &&
    receipt?.toolName === 'record_memory' &&
    receipt?.writeAllowed === true &&
    receipt?.exactApprovalAction === 'live_bridge_record_memory_proof' &&
    receipt?.exactApprovalActionMatched === true &&
    receipt?.nativeInvocationAttempted === true &&
    receipt?.memoryWritePerformed === true &&
    receipt?.rawRequestBodyPersisted === false &&
    receipt?.rawResponseBodyPersisted === false;
  return {
    accepted,
    reasonCode: accepted ? 'phase8_native_write_low_disclosure_verify_passed' : 'phase8_native_write_low_disclosure_verify_failed',
    selectedFieldsOnly: true,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    maxOperations: 1
  };
}

module.exports = {
  FINAL_STATES,
  Phase8OneShotAuthorizationRegistry,
  canonicalize,
  createPhase8OneShotNativeWriteExecutionGate,
  verifyPhase8NativeWriteAuditProjection,
  sha256,
  sha256Canonical
};
