'use strict';

const crypto = require('node:crypto');

const INTERNAL_ASSERTION = Symbol('cm2113-vcptoolbox-owner-native-proof-assertion');
const CONTENT_DECISIONS = new WeakMap();
const RELEASE_DECISIONS = new WeakMap();
const CONTENT_DECISION_KEYS = Object.freeze([
  'authorization', 'authorizationContentApproved', 'decisionReference',
  'executionPacketGitIdentity', 'finalExecutionReleaseRequired', 'implementation',
  'limits', 'nativeWriteAuthorized', 'nativeWriteMayExecute', 'nonClaims',
  'ownerRuntime', 'payload', 'schemaVersion', 'store', 'taskId', 'transport'
]);
const FINAL_DECISION_KEYS = Object.freeze([
  'approvedAt', 'authorization', 'authorizationUseCount', 'automaticRetryAllowed',
  'contentDecisionGitIdentity', 'decisionReference', 'executionPacketGitIdentity',
  'executionReleaseAuthorized', 'expiresAt', 'implementation', 'limits',
  'nativeWriteAuthorized', 'nonClaims', 'ownerRuntime', 'payload',
  'rollbackOrCompensationAllowed', 'schemaVersion', 'store', 'taskId', 'transport'
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

function exactObject(actual, expected) {
  return JSON.stringify(canonicalize(actual)) === JSON.stringify(canonicalize(expected));
}

function exactKeys(actual, expectedKeys) {
  return actual && typeof actual === 'object' && !Array.isArray(actual) &&
    JSON.stringify(Object.keys(actual).sort()) === JSON.stringify([...expectedKeys].sort());
}

function validGitIdentity(identity) {
  return /^[a-f0-9]{40}$/.test(identity?.sourceCommit || '') &&
    /^[a-f0-9]{40}$/.test(identity?.blobOid || '') &&
    Number.isInteger(identity?.bytes) && identity.bytes > 0 &&
    /^[a-f0-9]{64}$/.test(identity?.sha256 || '');
}

function publicGitIdentity(identity) {
  return {
    sourceCommit: identity.sourceCommit,
    blobOid: identity.blobOid,
    bytes: identity.bytes,
    sha256: identity.sha256
  };
}

function exactProofSemantics(decision) {
  return decision?.ownerRuntime?.owner === 'VCPToolBox' &&
    decision?.ownerRuntime?.component === 'DailyNote' &&
    decision?.ownerRuntime?.communication === 'stdio' &&
    decision?.transport?.outer === 'stdio_mcp_process' &&
    decision?.transport?.inner === 'local_http_mcp' &&
    decision?.transport?.ownerRuntime === 'stdio' &&
    decision?.store?.syntheticOnly === true &&
    decision?.store?.identityPresentBeforeFirstNativeWrite === true &&
    decision?.store?.replacementAllowed === false &&
    decision?.store?.reinitializationAllowed === false &&
    decision?.authorization?.action === 'live_bridge_record_memory_proof' &&
    decision?.authorization?.useCount === 1 &&
    decision?.authorization?.replayAllowed === false &&
    decision?.limits?.nativeWrites === 1 &&
    decision?.limits?.verifyOperations === 1 &&
    decision?.limits?.retries === 0 &&
    decision?.limits?.rollbackOrCompensation === 0 &&
    decision?.nonClaims?.productionReady === false &&
    decision?.nonClaims?.releaseReady === false &&
    decision?.nonClaims?.rcReady === false &&
    decision?.nonClaims?.fullPlanPackCompleted === false;
}

function intakeCm2113AuthorizationContentDecision(input = {}) {
  const blockers = [];
  const decision = input.decision;
  const expected = input.expected;
  const gitIdentity = input.gitIdentity;
  if (!decision || !expected || !gitIdentity) blockers.push('intake.configuration');
  if (!exactKeys(decision, CONTENT_DECISION_KEYS)) blockers.push('decision.fields');
  if (decision?.schemaVersion !== 1 || decision?.taskId !== 'CM-2113') blockers.push('decision.identity');
  if (decision?.decisionReference !== expected?.contentDecisionReference) blockers.push('decision.reference');
  if (
    decision?.authorizationContentApproved !== true ||
    decision?.nativeWriteAuthorized !== false ||
    decision?.nativeWriteMayExecute !== false ||
    decision?.finalExecutionReleaseRequired !== true
  ) blockers.push('decision.nonExecutableContent');
  for (const field of ['implementation', 'ownerRuntime', 'transport', 'store', 'payload', 'authorization', 'limits', 'nonClaims']) {
    if (!exactObject(decision?.[field], expected?.contentDecision?.[field])) blockers.push(`decision.${field}`);
  }
  if (!exactObject(decision?.executionPacketGitIdentity, expected?.executionPacketGitIdentity)) blockers.push('decision.executionPacketGitIdentity');
  if (!validGitIdentity(gitIdentity)) blockers.push('decision.gitIdentity');
  if (!exactProofSemantics(decision)) blockers.push('decision.proofSemantics');
  if (blockers.length) return { accepted: false, blockers: [...new Set(blockers)], decision: null };
  const identity = publicGitIdentity(gitIdentity);
  CONTENT_DECISIONS.set(decision, identity);
  return { accepted: true, blockers: [], decision, gitIdentity: identity };
}

function intakeCm2113FinalExecutionReleaseDecision(input = {}) {
  const blockers = [];
  const decision = input.decision;
  const expected = input.expected;
  const gitIdentity = input.gitIdentity;
  if (!decision || !expected || !gitIdentity) blockers.push('intake.configuration');
  if (!exactKeys(decision, FINAL_DECISION_KEYS)) blockers.push('decision.fields');
  if (decision?.schemaVersion !== 1 || decision?.taskId !== 'CM-2113') blockers.push('decision.identity');
  if (decision?.decisionReference !== expected?.finalReleaseDecisionReference) blockers.push('decision.reference');
  if (
    decision?.executionReleaseAuthorized !== true ||
    decision?.nativeWriteAuthorized !== true ||
    decision?.authorizationUseCount !== 1 ||
    decision?.automaticRetryAllowed !== false ||
    decision?.rollbackOrCompensationAllowed !== false
  ) blockers.push('decision.executionAuthority');
  if (!exactObject(decision?.contentDecisionGitIdentity, expected?.contentDecisionGitIdentity)) blockers.push('decision.contentDecisionGitIdentity');
  if (!exactObject(decision?.executionPacketGitIdentity, expected?.executionPacketGitIdentity)) blockers.push('decision.executionPacketGitIdentity');
  for (const field of ['implementation', 'ownerRuntime', 'transport', 'store', 'payload', 'authorization', 'limits', 'nonClaims']) {
    if (!exactObject(decision?.[field], expected?.contentDecision?.[field])) blockers.push(`decision.${field}`);
  }
  if (!validGitIdentity(gitIdentity)) blockers.push('decision.gitIdentity');
  if (!exactProofSemantics(decision)) blockers.push('decision.proofSemantics');
  if (decision?.expiresAt !== decision?.authorization?.expiresAt || decision?.approvedAt !== decision?.authorization?.approvedAt) {
    blockers.push('decision.authorizationTimeBinding');
  }
  if (blockers.length) return { accepted: false, blockers: [...new Set(blockers)], decision: null };
  const identity = publicGitIdentity(gitIdentity);
  RELEASE_DECISIONS.set(decision, identity);
  return { accepted: true, blockers: [], decision, gitIdentity: identity };
}

function ownerRuntimeReceiptAccepted(result, expected) {
  const receipt = result?.receipt?.nativeInvocationReceipt;
  const native = receipt?.nativeRuntimeReceipt;
  return result?.status === 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED' &&
    result?.access?.memoryWritePerformed === true &&
    result?.access?.localMemoryFallbackUsed === false &&
    receipt?.invocationBindingMatched === true &&
    receipt?.transportCategory === 'local_http_transport' &&
    receipt?.statusClass === 'success' &&
    native?.memoryIntelligenceOwner === 'VCPToolBox' &&
    native?.ownerRuntimeComponent === 'DailyNote' &&
    native?.ownerRuntimeCommunication === 'stdio' &&
    native?.ownerRuntimeSourceCommitMatched === true &&
    native?.ownerRuntimeSourceTreeMatched === true &&
    native?.ownerRuntimePluginBlobMatched === true &&
    native?.ownerRuntimeManifestBlobMatched === true &&
    native?.stableStoreIdentityMatched === true &&
    native?.nativeRuntimeCalled === true &&
    native?.nativeRuntimeInitialized === true &&
    native?.memoryWritePerformed === true &&
    native?.durableWritePerformed === true &&
    native?.isolatedRuntimeStoreUsed === true &&
    native?.durableBytes === expected.durableBytes &&
    native?.durableSha256 === expected.durableSha256 &&
    native?.providerApiCalled === false &&
    native?.primaryMemoryStoreWritePerformed === true &&
    native?.derivedIndexWritePerformed === false &&
    native?.memoryReadPerformed === false &&
    native?.rawRuntimeOutputDisclosed === false &&
    native?.rawMemoryContentDisclosed === false &&
    native?.runtimeLocatorDisclosed === false &&
    native?.tokenMaterialDisclosed === false &&
    native?.readinessClaimed === false;
}

function createCm2113VcpToolBoxOwnerNativeProofGate({ registry, expected, now = () => new Date() }) {
  if (!registry || !expected) throw new Error('cm2113_gate_configuration_required');

  async function verifyAssertion(assertion) {
    if (!assertion || assertion[INTERNAL_ASSERTION] !== true) return { accepted: false };
    const claim = await registry.consumeWriteInvocation(assertion.claimId, assertion.bindingHash).catch(() => null);
    if (!claim || claim.state !== 'WRITE_INVOCATION_CONSUMED') return { accepted: false };
    return { accepted: true, exactApprovalResult: assertion.exactApprovalResult };
  }

  async function execute({ contentDecision, releaseDecision, executeNativeWrite, verifyWrite }) {
    if (typeof executeNativeWrite !== 'function' || typeof verifyWrite !== 'function') {
      throw new Error('cm2113_execution_callbacks_required');
    }
    const blockers = [];
    const contentGitIdentity = CONTENT_DECISIONS.get(contentDecision);
    const releaseGitIdentity = RELEASE_DECISIONS.get(releaseDecision);
    if (!contentGitIdentity) blockers.push('contentDecision.machineIntake');
    if (!releaseGitIdentity) blockers.push('releaseDecision.machineIntake');
    if (!exactObject(releaseDecision?.contentDecisionGitIdentity, contentGitIdentity)) blockers.push('releaseDecision.contentBinding');
    if (!exactObject(releaseDecision?.executionPacketGitIdentity, expected.executionPacketGitIdentity)) blockers.push('releaseDecision.packetBinding');
    const nowMs = now().getTime();
    const approvedAt = Date.parse(releaseDecision?.approvedAt || '');
    const expiresAt = Date.parse(releaseDecision?.expiresAt || '');
    if (!Number.isFinite(approvedAt) || approvedAt > nowMs) blockers.push('releaseDecision.notYetApproved');
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) blockers.push('releaseDecision.expired');
    if (Number.isFinite(approvedAt) && Number.isFinite(expiresAt) && expiresAt <= approvedAt) blockers.push('releaseDecision.approvalWindow');
    if (blockers.length) return failure('UNCLAIMED', blockers, 0, 0);

    const bindingHash = sha256Canonical({
      ...expected.executionBinding,
      executionPacketGitIdentity: expected.executionPacketGitIdentity,
      contentDecisionGitIdentity: contentGitIdentity,
      finalReleaseDecisionGitIdentity: releaseGitIdentity
    });
    let claim;
    try {
      claim = await registry.claim({
        nonce: releaseDecision.authorization.nonce,
        receiptId: releaseDecision.authorization.receiptId,
        bindingHash
      });
    } catch {
      return failure('UNCLAIMED', ['authorization.claimFailed'], 0, 0);
    }
    const exactApprovalResult = {
      accepted: true,
      allowedAction: 'live_bridge_record_memory_proof',
      allowedScope: expected.allowedScope,
      runtimeTarget: expected.runtimeTarget,
      rollbackPlanRef: expected.rollbackPlanReference,
      approvalDecisionReference: releaseDecision.decisionReference,
      claimBindingHash: bindingHash,
      approvedAt: releaseDecision.approvedAt
    };
    const assertion = { [INTERNAL_ASSERTION]: true, claimId: claim.claimId, bindingHash, exactApprovalResult };
    try {
      const result = await executeNativeWrite({ assertion });
      const consumed = await registry.readClaim(claim.claimId);
      if (consumed.state !== 'WRITE_INVOCATION_CONSUMED') {
        await registry.finalize(claim.claimId, 'CONSUMED_FAILED_PRE_COMMIT');
        return failure('CONSUMED_FAILED_PRE_COMMIT', ['writeInvocation.notConsumed'], 0, 0);
      }
      const nativeAccepted = ownerRuntimeReceiptAccepted(result, expected);
      const verifyResult = nativeAccepted
        ? await verifyWrite({ claimId: claim.claimId, bindingHash, nativeResult: result })
        : { accepted: false };
      const accepted = nativeAccepted && verifyResult?.accepted === true;
      const state = accepted ? 'CONSUMED_SUCCESS' : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await registry.finalize(claim.claimId, state);
      return {
        accepted,
        blockers: accepted ? [] : ['ownerRuntimeOrVerify.notAccepted'],
        state,
        claimId: claim.claimId,
        bindingHash,
        nativeWriteCalls: 1,
        verifyOperations: nativeAccepted ? 1 : 0,
        nativeResult: result,
        verifyResult,
        authorizationConsumed: true,
        authorizationReplayAllowed: false
      };
    } catch (error) {
      const current = await registry.readClaim(claim.claimId).catch(() => null);
      const state = current?.state === 'CLAIMED'
        ? 'CONSUMED_FAILED_PRE_COMMIT'
        : 'CONSUMED_AMBIGUOUS_POST_COMMIT';
      await registry.finalize(claim.claimId, state).catch(() => {});
      return failure(state, [state], current?.state === 'WRITE_INVOCATION_CONSUMED' ? 1 : 0, 0);
    }
  }

  return { execute, verifyAssertion };
}

function failure(state, blockers, nativeWriteCalls, verifyOperations) {
  return {
    accepted: false,
    blockers: [...new Set(blockers)],
    state,
    nativeWriteCalls,
    verifyOperations,
    authorizationConsumed: state !== 'UNCLAIMED',
    authorizationReplayAllowed: false
  };
}

module.exports = {
  createCm2113VcpToolBoxOwnerNativeProofGate,
  intakeCm2113AuthorizationContentDecision,
  intakeCm2113FinalExecutionReleaseDecision,
  ownerRuntimeReceiptAccepted,
  sha256Canonical
};
