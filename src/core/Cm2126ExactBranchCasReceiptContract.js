'use strict';

const {
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  NEW_COMMIT,
  NEW_TREE,
  REGISTRY_REFERENCE,
  TARGET_REF,
  TASK_ID
} = require('./Cm2126ExactBranchCasConstants');
const {
  SUCCESS_STATE,
  claimId
} = require('./Cm2126ExactBranchCasClaimRegistry');
const {
  READINESS_FIELDS
} = require('./Cm2120FullPlanApplicationReceiptReview');
const {
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  sameJson
} = require('./Cm2117ExactFullPlanApplicationDecision');

function wrapPayload(payload, artifactType) {
  return {
    schemaVersion: 1,
    taskId: TASK_ID,
    artifactType,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function identityWithoutContent(value) {
  const { content, ...identity } = value;
  return identity;
}

function exactRuntimeSuccess(runtimeResult) {
  return runtimeResult?.targetRefBefore === EXPECTED_OLD && runtimeResult.targetRefAfter === NEW_COMMIT &&
    runtimeResult.targetHeadBefore === EXPECTED_OLD && runtimeResult.targetHeadAfter === NEW_COMMIT &&
    runtimeResult.targetSymbolicRefBefore === TARGET_REF && runtimeResult.targetSymbolicRefAfter === TARGET_REF &&
    runtimeResult.targetIndexTreeBefore === EXPECTED_OLD_TREE && runtimeResult.targetIndexTreeAfter === NEW_TREE &&
    runtimeResult.targetIndexPolicyMatchedBefore === true && runtimeResult.targetIndexPolicyMatchedAfter === true &&
    runtimeResult.targetIndexLockAbsentBefore === true && runtimeResult.targetIndexLockAbsentAfter === true &&
    runtimeResult.beforeBlobMatches === 9 && runtimeResult.afterBlobMatches === 9 &&
    runtimeResult.targetWorktreeCleanBefore === true && runtimeResult.targetWorktreeCleanAfter === true &&
    runtimeResult.branchRefCasAttempts === 1 && runtimeResult.branchRefUpdates === 1 &&
    runtimeResult.targetIndexSyncAttempts === 1 && runtimeResult.targetIndexSynchronizations === 1 &&
    runtimeResult.targetFileSyncAttempts === 1 && runtimeResult.targetFileWriteSlotsConsumed === 9 &&
    runtimeResult.targetFileSynchronizations === 9 &&
    runtimeResult.verificationAttempts === 1 && runtimeResult.otherRefUpdates === 0 &&
    /^[a-f0-9]{64}$/.test(runtimeResult.targetWorktreeIdentitySha256 || '') &&
    /^[a-f0-9]{64}$/.test(runtimeResult.otherRefsSnapshotBeforeSha256 || '') &&
    runtimeResult.otherRefsSnapshotAfterSha256 === runtimeResult.otherRefsSnapshotBeforeSha256;
}

function exactPreReceiptClaim(claimEnvelope, bindingHash, runtimeResult) {
  return claimEnvelope?.state === 'EXECUTION_RECEIPT_WRITE_CONSUMED' &&
    claimEnvelope.bindingHash === bindingHash && claimEnvelope.branchCasInvocationCount === 1 &&
    claimEnvelope.branchRefCasAttempts === 1 && claimEnvelope.branchRefUpdates === 1 &&
    claimEnvelope.targetIndexSyncAttempts === 1 && claimEnvelope.targetIndexSynchronizations === 1 &&
    claimEnvelope.targetFileSyncAttempts === 1 && claimEnvelope.targetFileWriteSlotsConsumed === 9 &&
    claimEnvelope.targetFileSynchronizations === 9 && claimEnvelope.verificationAttempts === 1 &&
    claimEnvelope.executionReceiptWriteAttempts === 1 && claimEnvelope.executionReceiptWrites === null &&
    claimEnvelope.executionReceiptSha256 === null && claimEnvelope.targetRefObserved === NEW_COMMIT &&
    claimEnvelope.targetIndexTreeObserved === NEW_TREE && claimEnvelope.targetFilesMatchedCount === 9 &&
    claimEnvelope.targetWorktreeCleanObserved === true && claimEnvelope.terminalStateDurablyRecorded === false &&
    claimEnvelope.reconciliationRequired === true &&
    claimEnvelope.targetWorktreeIdentitySha256 === runtimeResult?.targetWorktreeIdentitySha256;
}

function buildExecutionReceipt({ packetEvidence, finalReleaseEvidence, claimEnvelope, bindingHash, runtimeResult }) {
  if (!packetEvidence?.accepted || packetEvidence.packetMachineBound !== true ||
      !finalReleaseEvidence?.accepted || finalReleaseEvidence.finalReleaseMachineBound !== true ||
      !exactPreReceiptClaim(claimEnvelope, bindingHash, runtimeResult) ||
      !exactRuntimeSuccess(runtimeResult)) throw new Error('cm2126_exact_success_receipt_inputs_required');
  const packet = packetEvidence.packet;
  const release = finalReleaseEvidence.decision;
  const payload = {
    receiptType: 'exact_local_branch_cas_and_linked_worktree_sync_execution_receipt',
    contentDecision: packet.payload.contentDecision,
    executionPacket: {
      reference: packet.payload.packetReference,
      commit: packetEvidence.packetCommit,
      tree: packetEvidence.packetTree,
      canonicalPayloadSha256: packet.canonicalPayloadSha256,
      json: identityWithoutContent(packetEvidence.jsonIdentity),
      markdown: identityWithoutContent(packetEvidence.markdownIdentity)
    },
    finalRelease: {
      reference: release.payload.decisionReference,
      commit: finalReleaseEvidence.finalReleaseCommit,
      tree: finalReleaseEvidence.finalReleaseTree,
      canonicalPayloadSha256: release.canonicalPayloadSha256,
      json: identityWithoutContent(finalReleaseEvidence.jsonIdentity),
      markdown: identityWithoutContent(finalReleaseEvidence.markdownIdentity)
    },
    implementation: packet.payload.implementation,
    concurrencyBoundary: packet.payload.concurrencyBoundary,
    exactTarget: {
      targetRef: TARGET_REF,
      expectedOld: EXPECTED_OLD,
      expectedOldTree: EXPECTED_OLD_TREE,
      newCommit: NEW_COMMIT,
      newTree: NEW_TREE,
      exactModifiedPaths: packet.payload.exactCasBoundary.exactModifiedPaths,
      targetBindings: packet.payload.exactCasBoundary.targetBindings,
      targetWorktreeIdentitySha256: runtimeResult.targetWorktreeIdentitySha256,
      rawWorktreePathDisclosed: false
    },
    registry: {
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      bindingHash,
      claimedAt: claimEnvelope.claimedAt,
      stateAtReceipt: claimEnvelope.state,
      requiredFinalState: SUCCESS_STATE,
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false
    },
    executionResult: {
      targetRefBefore: runtimeResult.targetRefBefore,
      targetRefAfter: runtimeResult.targetRefAfter,
      targetHeadBefore: runtimeResult.targetHeadBefore,
      targetHeadAfter: runtimeResult.targetHeadAfter,
      targetSymbolicRefBefore: runtimeResult.targetSymbolicRefBefore,
      targetSymbolicRefAfter: runtimeResult.targetSymbolicRefAfter,
      targetIndexTreeBefore: runtimeResult.targetIndexTreeBefore,
      targetIndexTreeAfter: runtimeResult.targetIndexTreeAfter,
      targetIndexPolicyMatchedBefore: runtimeResult.targetIndexPolicyMatchedBefore,
      targetIndexPolicyMatchedAfter: runtimeResult.targetIndexPolicyMatchedAfter,
      targetIndexLockAbsentBefore: runtimeResult.targetIndexLockAbsentBefore,
      targetIndexLockAbsentAfter: runtimeResult.targetIndexLockAbsentAfter,
      beforeBlobMatches: runtimeResult.beforeBlobMatches,
      afterBlobMatches: runtimeResult.afterBlobMatches,
      targetWorktreeCleanBefore: runtimeResult.targetWorktreeCleanBefore,
      targetWorktreeCleanAfter: runtimeResult.targetWorktreeCleanAfter,
      branchRefCasAttempts: runtimeResult.branchRefCasAttempts,
      branchRefUpdates: runtimeResult.branchRefUpdates,
      targetIndexSyncAttempts: runtimeResult.targetIndexSyncAttempts,
      targetIndexSynchronizations: runtimeResult.targetIndexSynchronizations,
      targetFileSyncAttempts: runtimeResult.targetFileSyncAttempts,
      targetFileWriteSlotsConsumed: runtimeResult.targetFileWriteSlotsConsumed,
      targetFileSynchronizations: runtimeResult.targetFileSynchronizations,
      verificationAttempts: runtimeResult.verificationAttempts,
      otherRefsSnapshotBeforeSha256: runtimeResult.otherRefsSnapshotBeforeSha256,
      otherRefsSnapshotAfterSha256: runtimeResult.otherRefsSnapshotAfterSha256,
      otherRefUpdates: runtimeResult.otherRefUpdates,
      forceUsed: false,
      resetHardUsed: false,
      checkoutUsed: false,
      restoreUsed: false,
      readTreeUsed: false,
      readTreeUpdateWorktreeUsed: false,
      automaticRetryPerformed: false,
      automaticRollbackPerformed: false,
      automaticCleanupPerformed: false
    },
    currentBranchOutcome: {
      fullPlanPackCompleted: true,
      statusSyncPerformed: true,
      currentBranchStatusSynchronized: true,
      readiness: Object.fromEntries(READINESS_FIELDS.map(field => [field, false]))
    },
    prohibitedSideEffects: {
      remoteActions: 0,
      branchPushes: 0,
      tagActions: 0,
      releaseActions: 0,
      deployActions: 0,
      cutoverActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      readinessClaims: 0
    }
  };
  return wrapPayload(payload, 'cm2126_exact_branch_cas_execution_receipt_v1');
}

function evaluateExecutionReceipt(receipt = {}, inputs = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2126_exact_branch_cas_execution_receipt_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('receipt.identityOrHash');
  try {
    if (!sameJson(receipt, buildExecutionReceipt(inputs))) blockers.push('receipt.exactContent');
  } catch {
    blockers.push('receipt.exactContent');
  }
  const result = receipt.payload?.executionResult || {};
  const outcome = receipt.payload?.currentBranchOutcome || {};
  if (result.branchRefCasAttempts !== 1 || result.branchRefUpdates !== 1 ||
      result.targetIndexSynchronizations !== 1 || result.targetFileSyncAttempts !== 1 ||
      result.targetFileWriteSlotsConsumed !== 9 || result.targetFileSynchronizations !== 9 ||
      result.targetSymbolicRefBefore !== TARGET_REF || result.targetSymbolicRefAfter !== TARGET_REF ||
      result.targetIndexPolicyMatchedBefore !== true || result.targetIndexPolicyMatchedAfter !== true ||
      result.targetIndexLockAbsentBefore !== true || result.targetIndexLockAbsentAfter !== true ||
      result.otherRefUpdates !== 0 || result.forceUsed !== false || result.resetHardUsed !== false ||
      result.checkoutUsed !== false || result.restoreUsed !== false ||
      result.readTreeUsed !== false ||
      result.readTreeUpdateWorktreeUsed !== false || result.automaticRetryPerformed !== false ||
      result.automaticRollbackPerformed !== false || result.automaticCleanupPerformed !== false ||
      outcome.fullPlanPackCompleted !== true || outcome.statusSyncPerformed !== true ||
      outcome.currentBranchStatusSynchronized !== true ||
      Object.values(outcome.readiness || {}).some(value => value !== false) ||
      Object.values(receipt.payload?.prohibitedSideEffects || {}).some(value => value !== 0)) {
    blockers.push('receipt.executionBoundary');
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    branchRefUpdated: blockers.length === 0,
    currentBranchStatusSynchronized: blockers.length === 0,
    readinessClaimed: false
  };
}

function effectiveReentryState(existingState) {
  if (existingState === SUCCESS_STATE) return SUCCESS_STATE;
  if (existingState === 'CLAIMED') return 'CONSUMED_FAILED_PRE_CAS';
  if (existingState === 'BRANCH_REF_CAS_CONSUMED') return 'CONSUMED_AMBIGUOUS_CAS';
  if (existingState === 'EXECUTION_RECEIPT_WRITE_CONSUMED') return 'CONSUMED_EXECUTION_RECEIPT_AMBIGUOUS';
  if (typeof existingState === 'string' && existingState.startsWith('CONSUMED_')) return existingState;
  if (typeof existingState === 'string' && existingState !== 'CLAIM_REGISTRY_AMBIGUOUS') {
    return 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS';
  }
  return 'CLAIM_REGISTRY_AMBIGUOUS';
}

function completedCounterOutcome(value, completedValue) {
  if (value === null || value === undefined) return null;
  return value === completedValue;
}

function reentrySideEffectOutcomes(envelope = null) {
  const branchRefUpdated = completedCounterOutcome(envelope?.branchRefUpdates, 1);
  const targetWorktreeIndexSynchronized = completedCounterOutcome(envelope?.targetIndexSynchronizations, 1);
  const targetWorktreeFilesSynchronized = completedCounterOutcome(envelope?.targetFileSynchronizations, 9);
  const executionReceiptCreated = completedCounterOutcome(envelope?.executionReceiptWrites, 1);
  return {
    branchRefUpdated,
    targetWorktreeIndexSynchronized,
    targetWorktreeFilesSynchronized,
    executionReceiptCreated,
    statusSyncPerformed: branchRefUpdated === true && targetWorktreeIndexSynchronized === true &&
      targetWorktreeFilesSynchronized === true
  };
}

function buildReentryReceipt({ existing, bindingHash, runtimeObservation, packetEvidence, finalReleaseEvidence,
  successReceiptAccepted = false }) {
  if (!existing?.claimEnvelopePresent || !/^[a-f0-9]{64}$/.test(bindingHash || '')) {
    throw new Error('cm2126_existing_claim_projection_required');
  }
  const envelope = existing.envelope || null;
  const effectiveState = effectiveReentryState(existing.state);
  const runtimeExactSuccess = exactRuntimeSuccess(runtimeObservation || {});
  const durableSuccess = existing.state === SUCCESS_STATE && existing.claimEnvelopeBindingVerified === true &&
    successReceiptAccepted === true;
  const sideEffects = reentrySideEffectOutcomes(envelope);
  return wrapPayload({
    receiptType: 'exact_branch_cas_claim_readonly_reentry_projection',
    contentDecisionCommit: packetEvidence?.packet?.payload?.contentDecision?.commit || null,
    executionPacketCommit: packetEvidence?.packetCommit || null,
    finalReleaseCommit: finalReleaseEvidence?.finalReleaseCommit || null,
    registryReference: REGISTRY_REFERENCE,
    claimId: claimId(),
    bindingHash,
    claimEnvelopePresent: true,
    claimEnvelopeBindingVerified: existing.claimEnvelopeBindingVerified === true,
    reentrySourceState: envelope?.state || null,
    effectiveState,
    terminalStateDurablyRecorded: envelope?.terminalStateDurablyRecorded === true,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    reconciliationRequired: !(durableSuccess && runtimeExactSuccess),
    targetRefObserved: runtimeObservation?.targetRefAfter || null,
    targetHeadObserved: runtimeObservation?.targetHeadAfter || null,
    targetSymbolicRefMatched: runtimeObservation?.targetSymbolicRefAfter === TARGET_REF,
    targetIndexTreeObserved: runtimeObservation?.targetIndexTreeAfter || null,
    targetIndexPolicyMatched: runtimeObservation?.targetIndexPolicyMatchedAfter === true,
    targetIndexLockAbsent: runtimeObservation?.targetIndexLockAbsentAfter === true,
    targetFilesMatchedCount: runtimeObservation?.afterBlobMatches ?? null,
    targetWorktreeCleanObserved: runtimeObservation?.targetWorktreeCleanAfter ?? null,
    durableSuccessStateObserved: durableSuccess,
    successReceiptAccepted: successReceiptAccepted === true,
    runtimeSuccessPostconditionsObserved: runtimeExactSuccess,
    branchRefUpdated: sideEffects.branchRefUpdated,
    currentBranchStatusSynchronized: durableSuccess && runtimeExactSuccess,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    automaticCleanupAllowed: false,
    branchCasCallsThisReentry: 0,
    targetIndexSyncCallsThisReentry: 0,
    targetFileWritesThisReentry: 0,
    executionReceiptWritesThisReentry: 0,
    remoteActions: 0,
    nativeReads: 0,
    nativeWrites: 0,
    providerCalls: 0,
    realMemoryReads: 0,
    readinessClaims: 0
  }, 'cm2126_exact_branch_cas_claim_readonly_reentry_projection_v1');
}

function evaluateReentryReceipt(receipt = {}, inputs = {}) {
  const blockers = [];
  if (receipt.schemaVersion !== 1 || receipt.taskId !== TASK_ID ||
      receipt.artifactType !== 'cm2126_exact_branch_cas_claim_readonly_reentry_projection_v1' ||
      receipt.canonicalPayloadSha256 !== sha256Canonical(receipt.payload || {})) blockers.push('reentry.identityOrHash');
  try {
    if (!sameJson(receipt, buildReentryReceipt(inputs))) blockers.push('reentry.exactContent');
  } catch {
    blockers.push('reentry.exactContent');
  }
  if (receipt.payload?.authorizationConsumed !== true || receipt.payload?.authorizationReplayAllowed !== false ||
      receipt.payload?.automaticRetryAllowed !== false || receipt.payload?.automaticRollbackAllowed !== false ||
      receipt.payload?.automaticCleanupAllowed !== false ||
      ['branchCasCallsThisReentry', 'targetIndexSyncCallsThisReentry', 'targetFileWritesThisReentry',
        'executionReceiptWritesThisReentry', 'remoteActions', 'nativeReads', 'nativeWrites', 'providerCalls',
        'realMemoryReads', 'readinessClaims'].some(field => receipt.payload?.[field] !== 0)) {
    blockers.push('reentry.failClosedBoundary');
  }
  return { accepted: blockers.length === 0, blockers: [...new Set(blockers)] };
}

module.exports = {
  buildExecutionReceipt,
  buildReentryReceipt,
  effectiveReentryState,
  evaluateExecutionReceipt,
  evaluateReentryReceipt,
  exactPreReceiptClaim,
  exactRuntimeSuccess,
  identityWithoutContent,
  reentrySideEffectOutcomes,
  wrapPayload
};
