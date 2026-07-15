'use strict';

const { sha256Canonical } = require('./Phase8OneShotNativeWriteExecutionGate');
const { isMachineBoundCm2096TombstoneDecision } = require('./Cm2096TombstoneExecutionDecisionIntake');

const INTERNAL_ASSERTION = Symbol('cm2096-tombstone-one-shot-assertion');

function createCm2096TombstoneOneShotGate({ registry, expectedBinding, now = () => new Date() }) {
  if (!registry || !expectedBinding) throw new Error('cm2096_gate_configuration_required');
  const gateOwnedAssertions = new WeakMap();

  async function claim({ decision, preStoreProjection }) {
    const blockers = [];
    if (!isMachineBoundCm2096TombstoneDecision(decision)) blockers.push('decision.machineBoundIntake');
    if (decision?.allowedAction !== 'live_bridge_tombstone_memory_proof' || decision?.tombstoneExecutionAuthorized !== true || decision?.verifyExecutionAuthorized !== true) blockers.push('decision.action');
    if (!decision?.expiresAt || Date.parse(decision.expiresAt) <= now().getTime()) blockers.push('decision.expired');
    if (decision?.nonce !== expectedBinding.nonce ||
        decision?.receiptId !== expectedBinding.receiptId ||
        decision?.registryReference !== expectedBinding.registryReference) blockers.push('decision.oneShotBinding');
    const exactDecisionBinding = {
      decisionReference: expectedBinding.expectedDecisionReference,
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
      registryRootIdentitySha256: expectedBinding.registryRootIdentitySha256
    };
    if (Object.entries(exactDecisionBinding).some(([field, expected]) => decision?.[field] !== expected)) {
      blockers.push('decision.executionBinding');
    }
    if (preStoreProjection?.accepted !== true ||
        preStoreProjection?.stage !== 'pre_rollback' ||
        preStoreProjection?.markerAbsent !== true ||
        preStoreProjection?.identity?.identitySha256 !== expectedBinding.targetStoreIdentitySha256 ||
        preStoreProjection?.targetRecordProjection?.memoryIdRef !== expectedBinding.targetMemoryIdRef ||
        preStoreProjection?.targetRecordProjection?.durableBytes !== expectedBinding.targetRecordBytes ||
        preStoreProjection?.targetRecordProjection?.durableSha256 !== expectedBinding.targetRecordSha256 ||
        preStoreProjection?.otherRealMemoryRead !== false ||
        preStoreProjection?.otherRealMemoryModified !== false ||
        preStoreProjection?.rawMemoryReturned !== false ||
        preStoreProjection?.rawPathDisclosed !== false) blockers.push('store.preflight');
    if (blockers.length) return { accepted: false, blockers, state: 'UNCLAIMED' };
    const bindingHash = sha256Canonical({
      decisionReference: decision.decisionReference,
      targetStoreIdentitySha256: expectedBinding.targetStoreIdentitySha256,
      targetMemoryIdRef: expectedBinding.targetMemoryIdRef,
      targetRecordSha256: expectedBinding.targetRecordSha256,
      payloadCanonicalSha256: expectedBinding.payloadCanonicalSha256,
      durableMarkerSha256: expectedBinding.durableMarkerSha256,
      receiptId: decision.receiptId
    });
    const claimRecord = await registry.claim({ nonce: decision.nonce, receiptId: decision.receiptId, bindingHash });
    const exactApprovalResult = Object.freeze({
      accepted: true,
      allowedAction: 'live_bridge_tombstone_memory_proof',
      allowedScope: Object.freeze({ ...expectedBinding.allowedScope }),
      runtimeTarget: Object.freeze({ ...expectedBinding.runtimeTarget }),
      rollbackPlanRef: expectedBinding.rollbackPlanReference,
      approvalDecisionReference: decision.decisionReference,
      claimBindingHash: bindingHash,
      approvedAt: decision.approvedAt
    });
    const assertion = Object.freeze({
      [INTERNAL_ASSERTION]: true,
      claimId: claimRecord.claimId,
      bindingHash,
      exactApprovalResult
    });
    gateOwnedAssertions.set(assertion, Object.freeze({
      claimId: claimRecord.claimId,
      bindingHash,
      exactApprovalResult
    }));
    return {
      accepted: true,
      blockers: [],
      state: 'CLAIMED',
      claimId: claimRecord.claimId,
      bindingHash,
      assertion
    };
  }

  async function verifyAssertion(assertion) {
    const gateOwnedAssertion = assertion && gateOwnedAssertions.get(assertion);
    if (!gateOwnedAssertion || assertion[INTERNAL_ASSERTION] !== true) return { accepted: false };
    const claimRecord = await registry.consumeWriteInvocation(
      gateOwnedAssertion.claimId,
      gateOwnedAssertion.bindingHash
    ).catch(() => null);
    if (!claimRecord || claimRecord.state !== 'WRITE_INVOCATION_CONSUMED') return { accepted: false };
    return { accepted: true, exactApprovalResult: gateOwnedAssertion.exactApprovalResult };
  }

  async function finalize(claimId, state) {
    return registry.finalize(claimId, state);
  }

  return { claim, verifyAssertion, finalize };
}

module.exports = { createCm2096TombstoneOneShotGate };
