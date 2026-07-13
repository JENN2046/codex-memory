'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { isMachineBoundPhase8AuthorizationDecision } = require('./Phase8ExternalAuthorizationDecisionIntake');
const { isMachineBoundPhase8FinalExecutionReleaseDecision } = require('./Phase8FinalExecutionReleaseDecisionIntake');
const { buildRequestedScopeAuditFilter } = require('./GovernedNativeBridgeAuditMemoryProjection');

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

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

class Phase8OneShotAuthorizationRegistry {
  constructor({ governanceRoot, rootIdentity, identity }) {
    if (typeof governanceRoot !== 'string' || governanceRoot.trim() === '') {
      throw new Error('authorization_registry_governance_root_required');
    }
    if (!identity?.authorizationRegistryReference) {
      throw new Error('authorization_registry_reference_required');
    }
    this.governanceRoot = governanceRoot;
    this.directory = path.join(governanceRoot, safeKey(identity.authorizationRegistryReference));
    this.rootIdentity = rootIdentity;
    this.identity = identity;
  }

  async ensureRootIdentity() {
    if (!this.rootIdentity ||
        this.rootIdentity.registryRootReinitializationAllowed !== false ||
        this.rootIdentity.registryRootReplacementAllowed !== false) {
      throw new Error('authorization_registry_root_identity_required');
    }
    const identityPath = path.join(this.governanceRoot, '.phase8-registry-root-identity.json');
    const serialized = JSON.stringify(canonicalize(this.rootIdentity));
    let existing;
    try {
      existing = await fs.readFile(identityPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('authorization_registry_root_identity_missing');
      throw error;
    }
    if (existing !== serialized) throw new Error('authorization_registry_root_identity_mismatch');
    return { reference: this.rootIdentity.registryRootReference, identityHash: sha256(serialized) };
  }

  async ensureIdentity() {
    await this.ensureRootIdentity();
    if (!this.identity || this.identity.registryReinitializationAllowed !== false || this.identity.registryDeletionAllowed !== false) {
      throw new Error('authorization_registry_identity_required');
    }
    await fs.mkdir(this.directory, { recursive: true });
    const identityPath = path.join(this.directory, '.registry-identity.json');
    const serialized = JSON.stringify(canonicalize(this.identity));
    try {
      await fs.writeFile(identityPath, serialized, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await fs.readFile(identityPath, 'utf8');
      if (existing !== serialized) throw new Error('authorization_registry_identity_mismatch');
    }
    return { reference: this.identity.authorizationRegistryReference, identityHash: sha256(serialized) };
  }

  async claim({ nonce, receiptId, bindingHash }) {
    await this.ensureIdentity();
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
      const existingReservations = await Promise.all([
        pathExists(noncePath),
        pathExists(receiptPath),
        pathExists(statePath)
      ]);
      if (existingReservations.some(Boolean)) throw new Error('authorization_already_claimed');
      try {
        await fs.writeFile(noncePath, JSON.stringify({ claimId }), { flag: 'wx' });
        await fs.writeFile(receiptPath, JSON.stringify({ claimId }), { flag: 'wx' });
        await fs.writeFile(statePath, JSON.stringify(record), { flag: 'wx' });
      } catch (error) {
        if (error.code === 'EEXIST') throw new Error('authorization_already_claimed');
        throw error;
      }
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
    const validTransition = current.state === 'WRITE_INVOCATION_CONSUMED' ||
      (current.state === 'CLAIMED' && state === 'CONSUMED_FAILED_PRE_COMMIT');
    if (!validTransition) throw new Error('write_invocation_not_consumed');
    const statePath = path.join(this.directory, `claim-${claimId}.json`);
    const tempPath = `${statePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify({ ...current, state }), { flag: 'wx' });
    await fs.rename(tempPath, statePath);
    return { ...current, state };
  }

  async consumeWriteInvocation(claimId, bindingHash) {
    const markerPath = path.join(this.directory, `write-invocation-${claimId}.json`);
    try {
      await fs.writeFile(markerPath, JSON.stringify({ claimId, invocationCount: 1 }), { flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('write_invocation_already_consumed');
      throw error;
    }
    const current = await this.readClaim(claimId);
    if (current.state !== 'CLAIMED' || current.bindingHash !== bindingHash) {
      throw new Error('authorization_claim_not_consumable');
    }
    const statePath = path.join(this.directory, `claim-${claimId}.json`);
    const tempPath = `${statePath}.write-consumed.tmp`;
    const next = { ...current, state: 'WRITE_INVOCATION_CONSUMED', writeInvocationCount: 1 };
    await fs.writeFile(tempPath, JSON.stringify(next), { flag: 'wx' });
    await fs.rename(tempPath, statePath);
    return next;
  }
}

function createPhase8OneShotNativeWriteExecutionGate({ registry, expectedBinding, now = () => new Date() }) {
  if (!registry || !expectedBinding) throw new Error('missing_gate_configuration');

  async function verifyAssertion(assertion) {
    if (!assertion || assertion[INTERNAL_ASSERTION] !== true) return { accepted: false };
    const claim = await registry.consumeWriteInvocation(
      assertion.claimId,
      assertion.bindingHash
    ).catch(() => null);
    if (!claim || claim.state !== 'WRITE_INVOCATION_CONSUMED') {
      return { accepted: false };
    }
    return { accepted: true, exactApprovalResult: assertion.exactApprovalResult };
  }

  async function execute({ authorizationContentDecision, executionReleaseDecision, runtimeFacts, payloadBytes, payloadBlobOid, executeNativeWrite, verifyWrite }) {
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
    if (!isMachineBoundPhase8AuthorizationDecision(authorizationContentDecision)) blockers.push('contentDecision.machineBoundIntake');
    if (authorizationContentDecision?.authorizationContentApproved !== true ||
        authorizationContentDecision?.phase8NativeWriteAuthorized !== false ||
        authorizationContentDecision?.nativeWriteMayExecute !== false) blockers.push('contentDecision.nonExecutable');
    if (!isMachineBoundPhase8FinalExecutionReleaseDecision(executionReleaseDecision)) blockers.push('releaseDecision.machineBoundIntake');
    if (executionReleaseDecision?.executionReleaseAuthorized !== true || executionReleaseDecision?.phase8NativeWriteAuthorized !== true) blockers.push('releaseDecision.authorization');
    if (executionReleaseDecision?.token !== 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT') blockers.push('releaseDecision.token');
    if (executionReleaseDecision?.allowedAction !== 'live_bridge_record_memory_proof') blockers.push('releaseDecision.allowedAction');
    const releaseExpiresAtMs = typeof executionReleaseDecision?.expiresAt === 'string'
      ? Date.parse(executionReleaseDecision.expiresAt)
      : Number.NaN;
    const executionNowMs = now().getTime();
    if (!Number.isFinite(releaseExpiresAtMs) ||
        !Number.isFinite(executionNowMs) ||
        releaseExpiresAtMs <= executionNowMs) {
      blockers.push('releaseDecision.expired');
    }
    if (executionReleaseDecision?.authorizationUseCount !== 1) blockers.push('releaseDecision.authorizationUseCount');
    if (executionReleaseDecision?.expectedContextHash !== contextHash) blockers.push('releaseDecision.expectedContextHash');
    if (executionReleaseDecision?.expectedAllowlistHash !== allowlistHash) blockers.push('releaseDecision.expectedAllowlistHash');
    if (executionReleaseDecision?.authorizationContentDecisionReference !== authorizationContentDecision?.decisionReference) blockers.push('releaseDecision.contentReference');
    if (payloadFileSha256 !== expectedBinding.payloadFileSha256) blockers.push('payload.fileSha256');
    if (payloadCanonicalSha256 !== expectedBinding.payloadCanonicalSha256) blockers.push('payload.canonicalSha256');
    if (runtimeFacts?.clean !== true || runtimeFacts?.commit !== expectedBinding.runtimeSourceCommit || runtimeFacts?.tree !== expectedBinding.runtimeSourceTree) blockers.push('runtime.binding');
    if (payloadBlobOid !== expectedBinding.payloadBlobOid) blockers.push('payload.blobOid');
    if (blockers.length) return { accepted: false, blockers, nativeWriteCalls: 0, state: 'UNCLAIMED' };

    const bindingHash = sha256Canonical({ context, allowlist, payloadBlobOid });
    const claim = await registry.claim({ nonce: executionReleaseDecision.nonce, receiptId: executionReleaseDecision.receiptId, bindingHash });
    const exactApprovalResult = {
      accepted: true,
      allowedAction: 'live_bridge_record_memory_proof',
      allowedScope: expectedBinding.allowedScope,
      runtimeTarget: expectedBinding.runtimeTarget,
      rollbackPlanRef: expectedBinding.rollbackPlanReference,
      approvalDecisionReference: executionReleaseDecision.decisionReference,
      claimBindingHash: bindingHash,
      approvedAt: executionReleaseDecision.approvedAt
    };
    const assertion = { [INTERNAL_ASSERTION]: true, claimId: claim.claimId, bindingHash, exactApprovalResult };
    try {
      const result = await executeNativeWrite({ payload, assertion });
      const postCallbackClaim = await registry.readClaim(claim.claimId);
      if (postCallbackClaim.state !== 'WRITE_INVOCATION_CONSUMED') {
        const state = 'CONSUMED_FAILED_PRE_COMMIT';
        await registry.finalize(claim.claimId, state);
        return { accepted: false, blockers: ['write_invocation_not_consumed'], nativeWriteCalls: 0, verifyOperations: 0, state };
      }
      const nativeSuccess = (
        result?.nativeWritePerformed === true && result?.durableWritePerformed === true
      ) || (
        result?.status === 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED' &&
        result?.access?.memoryWritePerformed === true &&
        result?.access?.localMemoryFallbackUsed === false &&
        result?.receipt?.nativeInvocationReceipt?.invocationBindingMatched === true &&
        result?.receipt?.nativeInvocationReceipt?.statusClass === 'success' &&
        result?.receipt?.localAuditReceipt?.status === 'appended'
      );
      const verifyResult = nativeSuccess
        ? await verifyWrite({ claimId: claim.claimId, receiptId: executionReleaseDecision.receiptId, nativeResult: result })
        : { accepted: false };
      const success = nativeSuccess && verifyResult?.accepted === true;
      const state = success ? 'CONSUMED_SUCCESS' : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await registry.finalize(claim.claimId, state);
      return { accepted: success, blockers: success ? [] : ['native_write_or_verify_result_ambiguous'], nativeWriteCalls: 1, verifyOperations: nativeSuccess ? 1 : 0, state, result, verifyResult };
    } catch (error) {
      const currentClaim = await registry.readClaim(claim.claimId).catch(() => null);
      const state = currentClaim?.state === 'CLAIMED' || error?.commitState === 'pre_commit'
        ? 'CONSUMED_FAILED_PRE_COMMIT'
        : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await registry.finalize(claim.claimId, state);
      return { accepted: false, blockers: [state], nativeWriteCalls: 1, state };
    }
  }

  return { execute, verifyAssertion };
}

async function verifyPhase8NativeWriteAuditProjection({ callAuditMemory, scope, registry, claimId, receiptId, approvalDecisionReference, claimBindingHash, targetReferenceName, expectedScopeFingerprint }) {
  if (typeof callAuditMemory !== 'function' || !registry) return { accepted: false, reasonCode: 'verify_configuration_missing' };
  const claim = await registry.readClaim(claimId).catch(() => null);
  if (!claim || claim.state !== 'WRITE_INVOCATION_CONSUMED' || claim.receiptIdHash !== safeKey(receiptId)) {
    return { accepted: false, reasonCode: 'verify_claim_binding_invalid' };
  }
  const auditScope = {
    project_id: scope?.project_id,
    scope_id: scope?.scope_id,
    workspace_id: scope?.workspace_id,
    client_id: scope?.client_id,
    visibility: scope?.visibility
  };
  const requestedScopeFilter = buildRequestedScopeAuditFilter(auditScope);
  if (typeof expectedScopeFingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(expectedScopeFingerprint) ||
      requestedScopeFilter?.scopeFingerprint !== expectedScopeFingerprint) {
    return {
      accepted: false,
      reasonCode: 'phase8_native_write_scope_fingerprint_invalid',
      selectedFieldsOnly: true,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      maxOperations: 1,
      observedCandidateCount: 0,
      observedSelectedBinding: null
    };
  }
  const report = await callAuditMemory({
    audit_family: 'governance',
    window: 10,
    scope: {
      ...auditScope,
      workspace_id_present: true,
      task_id: 'CM-2091'
    },
    include_raw: false
  });
  const candidates = Array.isArray(report?.findings)
    ? report.findings.map(item => item?.governedNativeBridgeReceipt).filter(Boolean)
    : [];
  const receipt = candidates.length
    ? candidates
      .find(item => item?.toolName === 'record_memory' &&
        item?.auditReceiptReferenceName === receiptId &&
        item?.exactApprovalDecisionReference === approvalDecisionReference &&
        item?.exactApprovalClaimBindingHash === claimBindingHash &&
        item?.targetReferenceName === targetReferenceName &&
        item?.scopeFingerprintPresent === true &&
        item?.scopeFingerprintMatched === true)
    : null;
  const accepted = report?.accepted === true &&
    report?.access?.rawMemoryReturned === false &&
    report?.access?.rawAuditReturned === false &&
    report?.access?.contentReturned === false &&
    receipt?.toolName === 'record_memory' &&
    receipt?.writeAllowed === true &&
    receipt?.exactApprovalAction === 'live_bridge_record_memory_proof' &&
    receipt?.exactApprovalActionMatched === true &&
    receipt?.nativeInvocationAttempted === true &&
    receipt?.nativeInvocationReceiptBindingMatched === true &&
    receipt?.memoryWritePerformed === true &&
    receipt?.rawRequestBodyPersisted === false &&
    receipt?.rawResponseBodyPersisted === false;
  return {
    accepted,
    reasonCode: accepted ? 'phase8_native_write_low_disclosure_verify_passed' : 'phase8_native_write_low_disclosure_verify_failed',
    selectedFieldsOnly: true,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    maxOperations: 1,
    observedCandidateCount: candidates.length,
    observedSelectedBinding: receipt ? {
      auditReceiptReferenceName: receipt.auditReceiptReferenceName || null,
      exactApprovalDecisionReference: receipt.exactApprovalDecisionReference || null,
      exactApprovalClaimBindingHash: receipt.exactApprovalClaimBindingHash || null,
      targetReferenceName: receipt.targetReferenceName || null,
      scopeFingerprintPresent: receipt.scopeFingerprintPresent === true,
      scopeFingerprintMatched: receipt.scopeFingerprintMatched === true,
      nativeInvocationReceiptBindingMatched: receipt.nativeInvocationReceiptBindingMatched === true
    } : null
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
