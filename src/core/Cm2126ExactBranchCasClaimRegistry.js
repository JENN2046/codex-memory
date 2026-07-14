'use strict';

const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const {
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  NEW_COMMIT,
  NEW_TREE,
  NONCE,
  RECEIPT_ID,
  REGISTRY_REFERENCE
} = require('./Cm2126ExactBranchCasConstants');
const {
  canonicalize,
  sha256Canonical
} = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  sameJson,
  sha256
} = require('./Cm2117ExactFullPlanApplicationDecision');

const SUCCESS_STATE = 'CONSUMED_SUCCESS_BRANCH_CAS_AND_WORKTREE_SYNCHRONIZED_AWAITING_RECEIPT_REVIEW';
const TERMINAL_FAILURE_STATES = Object.freeze([
  'CONSUMED_FAILED_PRE_CAS',
  'CONSUMED_AMBIGUOUS_CAS',
  'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
  'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS',
  'CONSUMED_EXECUTION_RECEIPT_AMBIGUOUS'
]);
const NONTERMINAL_STATES = Object.freeze([
  'CLAIMED',
  'BRANCH_REF_CAS_CONSUMED',
  'BRANCH_REF_UPDATED',
  'TARGET_INDEX_SYNC_CONSUMED',
  'TARGET_INDEX_SYNCHRONIZED',
  'TARGET_FILES_SYNC_CONSUMED',
  'TARGET_FILES_SYNCHRONIZED',
  'VERIFICATION_CONSUMED',
  'EXECUTION_RECEIPT_WRITE_CONSUMED'
]);
const ALL_STATES = new Set([...NONTERMINAL_STATES, ...TERMINAL_FAILURE_STATES, SUCCESS_STATE]);
const CLAIM_ENVELOPE_KEYS = Object.freeze([
  'schemaVersion', 'registryReference', 'claimId', 'nonceHash', 'receiptIdHash', 'bindingHash',
  'finalReleaseDecisionReference', 'finalReleaseSourceCommit', 'finalReleaseApprovedAt',
  'finalReleaseExpiresAt', 'claimedAt', 'state', 'authorizationUseCount', 'authorizationConsumed',
  'authorizationReplayAllowed', 'branchCasInvocationCount', 'branchRefCasAttempts', 'branchRefUpdates',
  'targetIndexSyncAttempts', 'targetIndexSynchronizations', 'targetFileSyncAttempts',
  'targetFileWriteSlotsConsumed', 'targetFileSynchronizations', 'verificationAttempts', 'executionReceiptWriteAttempts',
  'executionReceiptWrites', 'targetWorktreeIdentitySha256', 'targetRefObserved',
  'targetIndexTreeObserved', 'targetFilesMatchedCount', 'targetWorktreeCleanObserved',
  'executionReceiptSha256', 'terminalStateDurablyRecorded', 'reconciliationRequired'
].sort());

function injectIsolatedTransitionFault(state) {
  if (process.env.NODE_ENV === 'test' && process.env.CM2126_ISOLATED_TEST_FIXTURE === '1' &&
      process.cwd().includes('cm2126-cas-e2e-') &&
      process.env.CM2126_TEST_FAULT_POINT === `transition_after_rename:${state}`) {
    throw new Error(`cm2126_isolated_test_fault:transition_after_rename:${state}`);
  }
}

function claimId() {
  return sha256Canonical({ registryReference: REGISTRY_REFERENCE, nonce: NONCE, receiptId: RECEIPT_ID });
}

function claimFileName() {
  return `.cm2125-exact-branch-cas-claim-${claimId()}.json`;
}

function governanceDescriptorPath(rootHandle, filename) {
  return `/proc/self/fd/${rootHandle.fd}/${filename}`;
}

async function openVerifiedGovernanceRoot(registry) {
  const rootIdentity = await registry.verifyRoot();
  if (registry.rootIdentity &&
      (registry.rootIdentity.dev !== rootIdentity.dev || registry.rootIdentity.ino !== rootIdentity.ino)) {
    throw new Error('cm2126_governance_root_instance_replaced');
  }
  if (process.platform !== 'linux' || !Number.isInteger(fs.constants.O_DIRECTORY) ||
      !Number.isInteger(fs.constants.O_NOFOLLOW)) {
    throw new Error('cm2126_descriptor_relative_governance_access_unsupported');
  }
  const rootHandle = await registry.fs.open(
    registry.governanceRoot,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
  );
  try {
    const descriptorStat = await rootHandle.stat();
    if (!descriptorStat.isDirectory() || descriptorStat.dev !== rootIdentity.dev || descriptorStat.ino !== rootIdentity.ino) {
      throw new Error('cm2126_governance_root_descriptor_identity_mismatch');
    }
    if (!registry.rootIdentity) registry.rootIdentity = Object.freeze({ dev: descriptorStat.dev, ino: descriptorStat.ino });
    return rootHandle;
  } catch (error) {
    await rootHandle.close().catch(() => {});
    throw error;
  }
}

function validCount(value, maximum, nullable = true) {
  return (nullable && value === null) || (Number.isInteger(value) && value >= 0 && value <= maximum);
}

function validObservedOid(value) {
  return value === null || /^[a-f0-9]{40}$/.test(value || '');
}

function machineReleaseBindingAccepted(releaseBinding, bindingHash) {
  try {
    const execution = require('./Cm2126ExactBranchCasExecution');
    const packetEvidence = releaseBinding?.packetEvidence;
    const finalReleaseEvidence = releaseBinding?.finalReleaseEvidence;
    const expectedBindingHash = execution.buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
    const expectedDecision = finalReleaseEvidence?.decision?.payload;
    const expectedTargetIdentity = packetEvidence?.packet?.payload?.linkedWorktreeBoundary
      ?.targetWorktreeIdentity?.identitySha256;
    return execution.isMachineBoundReleaseBinding(releaseBinding) &&
      releaseBinding.machineBound === true && releaseBinding.bindingHash === bindingHash &&
      expectedBindingHash === bindingHash &&
      releaseBinding.packetEvidence?.accepted === true && releaseBinding.finalReleaseEvidence?.accepted === true &&
      execution.isMachineBoundExecutionPacket(releaseBinding.packetEvidence.packet) &&
      execution.isMachineBoundFinalReleaseDecision(releaseBinding.finalReleaseEvidence.decision) &&
      releaseBinding.finalReleaseEvidence.finalReleaseCommit === releaseBinding.sourceCommit &&
      expectedDecision?.decisionReference === releaseBinding.decisionReference &&
      expectedDecision?.authorization?.approvedAt === releaseBinding.approvedAt &&
      expectedDecision?.authorization?.expiresAt === releaseBinding.expiresAt &&
      expectedTargetIdentity === releaseBinding.targetWorktreeIdentitySha256 &&
      releaseBinding.expectedOld === EXPECTED_OLD && releaseBinding.expectedOldTree === EXPECTED_OLD_TREE;
  } catch {
    return false;
  }
}

class Cm2126ExactBranchCasClaimRegistry {
  constructor({ governanceRoot, fsApi = fsPromises } = {}) {
    if (!governanceRoot || !path.isAbsolute(governanceRoot)) throw new Error('cm2126_fixed_governance_root_required');
    this.governanceRoot = governanceRoot;
    this.fs = fsApi;
    this.claimPath = path.join(governanceRoot, claimFileName());
    this.rootIdentity = null;
  }

  async readVerifiedFile(filePath, invalidCode) {
    let handle = null;
    try {
      const pathStat = await this.fs.lstat(filePath);
      if (!pathStat.isFile() || pathStat.isSymbolicLink()) throw new Error('invalid');
      handle = await this.fs.open(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      const descriptorStat = await handle.stat();
      if (!descriptorStat.isFile() || descriptorStat.dev !== pathStat.dev || descriptorStat.ino !== pathStat.ino) {
        throw new Error('invalid');
      }
      return Buffer.from(await handle.readFile());
    } catch (error) {
      const wrapped = new Error(invalidCode);
      if (error?.code) wrapped.code = error.code;
      throw wrapped;
    } finally {
      if (handle) await handle.close().catch(() => {});
    }
  }

  async openVerifiedRootHandle() {
    return openVerifiedGovernanceRoot(this);
  }

  async verifyRoot() {
    let verifiedRootStat = null;
    for (const directory of [path.dirname(this.governanceRoot), this.governanceRoot]) {
      const stat = await this.fs.lstat(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('cm2126_governance_root_directory_invalid');
      if (path.resolve(directory) === path.resolve(this.governanceRoot)) verifiedRootStat = stat;
    }
    const observedRoot = await this.fs.realpath(this.governanceRoot);
    if (path.resolve(observedRoot) !== path.resolve(this.governanceRoot)) {
      throw new Error('cm2126_governance_root_symlink_forbidden');
    }
    const identityPath = path.join(this.governanceRoot, '.phase8-registry-root-identity.json');
    const identityBytes = await this.readVerifiedFile(identityPath, 'cm2126_governance_root_identity_invalid');
    if (sha256(identityBytes) !== GOVERNANCE_ROOT_IDENTITY_SHA256 ||
        !sameJson(JSON.parse(identityBytes.toString('utf8')), GOVERNANCE_ROOT_IDENTITY)) {
      throw new Error('cm2126_governance_root_identity_mismatch');
    }
    return { dev: verifiedRootStat.dev, ino: verifiedRootStat.ino };
  }

  async syncFileAndDirectory(targetPath) {
    if (typeof this.fs.open !== 'function') return;
    const file = await this.fs.open(targetPath, 'r');
    try { await file.sync(); } finally { await file.close(); }
    const directory = await this.fs.open(path.dirname(targetPath), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  }

  validateEnvelope(envelope, bindingHash, releaseBinding = null) {
    const keys = envelope && typeof envelope === 'object' ? Object.keys(envelope).sort() : [];
    const claimedAt = Date.parse(envelope?.claimedAt || '');
    const approvedAt = Date.parse(envelope?.finalReleaseApprovedAt || '');
    const expiresAt = Date.parse(envelope?.finalReleaseExpiresAt || '');
    if (!envelope || !sameJson(keys, CLAIM_ENVELOPE_KEYS) || envelope.schemaVersion !== 1 ||
        envelope.registryReference !== REGISTRY_REFERENCE || envelope.claimId !== claimId() ||
        envelope.nonceHash !== sha256(NONCE) || envelope.receiptIdHash !== sha256(RECEIPT_ID) ||
        envelope.bindingHash !== bindingHash || !ALL_STATES.has(envelope.state) ||
        envelope.authorizationUseCount !== 1 || envelope.authorizationConsumed !== true ||
        envelope.authorizationReplayAllowed !== false || !Number.isFinite(claimedAt) ||
        !Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || claimedAt < approvedAt ||
        claimedAt >= expiresAt || !/^[a-f0-9]{40}$/.test(envelope.finalReleaseSourceCommit || '') ||
        !/^[a-f0-9]{64}$/.test(envelope.targetWorktreeIdentitySha256 || '') ||
        !validCount(envelope.branchCasInvocationCount, 1) ||
        !validCount(envelope.branchRefCasAttempts, 1) || !validCount(envelope.branchRefUpdates, 1) ||
        !validCount(envelope.targetIndexSyncAttempts, 1) || !validCount(envelope.targetIndexSynchronizations, 1) ||
        !validCount(envelope.targetFileSyncAttempts, 1) ||
        !validCount(envelope.targetFileWriteSlotsConsumed, 9) ||
        !validCount(envelope.targetFileSynchronizations, 9) ||
        !validCount(envelope.verificationAttempts, 1) || !validCount(envelope.executionReceiptWriteAttempts, 1) ||
        !validCount(envelope.executionReceiptWrites, 1) || !validObservedOid(envelope.targetRefObserved) ||
        !validObservedOid(envelope.targetIndexTreeObserved) || !validCount(envelope.targetFilesMatchedCount, 9) ||
        ![true, false, null].includes(envelope.targetWorktreeCleanObserved) ||
        !(envelope.executionReceiptSha256 === null || /^[a-f0-9]{64}$/.test(envelope.executionReceiptSha256)) ||
        typeof envelope.terminalStateDurablyRecorded !== 'boolean' || typeof envelope.reconciliationRequired !== 'boolean') {
      throw new Error('cm2126_claim_envelope_invalid');
    }
    if (releaseBinding && (!machineReleaseBindingAccepted(releaseBinding, bindingHash) ||
        envelope.finalReleaseDecisionReference !== releaseBinding.decisionReference ||
        envelope.finalReleaseSourceCommit !== releaseBinding.sourceCommit ||
        envelope.finalReleaseApprovedAt !== releaseBinding.approvedAt ||
        envelope.finalReleaseExpiresAt !== releaseBinding.expiresAt ||
        envelope.targetWorktreeIdentitySha256 !== releaseBinding.targetWorktreeIdentitySha256)) {
      throw new Error('cm2126_claim_final_release_binding_mismatch');
    }
    const observed = (ref, indexTree, files, clean) => envelope.targetRefObserved === ref &&
      envelope.targetIndexTreeObserved === indexTree && envelope.targetFilesMatchedCount === files &&
      envelope.targetWorktreeCleanObserved === clean;
    const receiptAbsent = envelope.executionReceiptWrites === 0 && envelope.executionReceiptSha256 === null;
    const receiptIdentityCoherent = envelope.executionReceiptWrites === 1 ?
      /^[a-f0-9]{64}$/.test(envelope.executionReceiptSha256 || '') : envelope.executionReceiptSha256 === null;
    const noIndexOrLater = envelope.targetIndexSyncAttempts === 0 && envelope.targetIndexSynchronizations === 0 &&
      envelope.targetFileSyncAttempts === 0 && envelope.targetFileWriteSlotsConsumed === 0 &&
      envelope.targetFileSynchronizations === 0 && envelope.verificationAttempts === 0 &&
      envelope.executionReceiptWriteAttempts === 0 && receiptAbsent;
    const noFilesOrLater = envelope.targetFileSyncAttempts === 0 && envelope.targetFileWriteSlotsConsumed === 0 &&
      envelope.targetFileSynchronizations === 0 && envelope.verificationAttempts === 0 &&
      envelope.executionReceiptWriteAttempts === 0 && receiptAbsent;
    const noVerifyOrReceipt = envelope.verificationAttempts === 0 &&
      envelope.executionReceiptWriteAttempts === 0 && receiptAbsent;
    const initial = envelope.branchCasInvocationCount === 0 &&
      envelope.branchRefCasAttempts === 0 && envelope.branchRefUpdates === 0 &&
      noIndexOrLater && observed(EXPECTED_OLD, EXPECTED_OLD_TREE, 9, true);
    const afterCasAttempt = envelope.branchCasInvocationCount === null && envelope.branchRefCasAttempts === 1 &&
      envelope.branchRefUpdates === null && noIndexOrLater &&
      observed(EXPECTED_OLD, EXPECTED_OLD_TREE, 9, true);
    const afterRef = envelope.branchCasInvocationCount === 1 && envelope.branchRefCasAttempts === 1 &&
      envelope.branchRefUpdates === 1 && envelope.targetRefObserved === NEW_COMMIT;
    const beforeIndex = afterRef && noIndexOrLater &&
      observed(NEW_COMMIT, EXPECTED_OLD_TREE, 0, false);
    const indexAttempted = afterRef && envelope.targetIndexSyncAttempts === 1 &&
      envelope.targetIndexSynchronizations === null && noFilesOrLater &&
      observed(NEW_COMMIT, EXPECTED_OLD_TREE, 0, false);
    const indexDone = afterRef && envelope.targetIndexSyncAttempts === 1 &&
      envelope.targetIndexSynchronizations === 1 && envelope.targetIndexTreeObserved === NEW_TREE;
    const beforeFiles = indexDone && envelope.targetFileSyncAttempts === 0 &&
      envelope.targetFileWriteSlotsConsumed === 0 && envelope.targetFileSynchronizations === 0 &&
      noVerifyOrReceipt && observed(NEW_COMMIT, NEW_TREE, 0, false);
    const filesAttempted = indexDone && envelope.targetFileSyncAttempts === 1 &&
      envelope.targetFileWriteSlotsConsumed === 9 &&
      envelope.targetFileSynchronizations === null && noVerifyOrReceipt &&
      observed(NEW_COMMIT, NEW_TREE, 0, false);
    const filesDone = indexDone && envelope.targetFileSyncAttempts === 1 &&
      envelope.targetFileWriteSlotsConsumed === 9 &&
      envelope.targetFileSynchronizations === 9 && envelope.targetFilesMatchedCount === 9;
    const verified = filesDone && envelope.verificationAttempts === 1 &&
      envelope.targetWorktreeCleanObserved === true &&
      observed(NEW_COMMIT, NEW_TREE, 9, true);
    const receiptAttempted = verified && envelope.executionReceiptWriteAttempts === 1 &&
      envelope.executionReceiptWrites === null && envelope.executionReceiptSha256 === null;
    const nonterminalShape = {
      CLAIMED: initial,
      BRANCH_REF_CAS_CONSUMED: afterCasAttempt,
      BRANCH_REF_UPDATED: beforeIndex,
      TARGET_INDEX_SYNC_CONSUMED: indexAttempted,
      TARGET_INDEX_SYNCHRONIZED: beforeFiles,
      TARGET_FILES_SYNC_CONSUMED: filesAttempted,
      TARGET_FILES_SYNCHRONIZED: filesDone && noVerifyOrReceipt &&
        observed(NEW_COMMIT, NEW_TREE, 9, false),
      VERIFICATION_CONSUMED: verified && envelope.executionReceiptWriteAttempts === 0,
      EXECUTION_RECEIPT_WRITE_CONSUMED: receiptAttempted
    }[envelope.state];
    const success = envelope.state === SUCCESS_STATE && envelope.branchCasInvocationCount === 1 &&
      envelope.branchRefCasAttempts === 1 && envelope.branchRefUpdates === 1 &&
      envelope.targetIndexSyncAttempts === 1 && envelope.targetIndexSynchronizations === 1 &&
      envelope.targetFileSyncAttempts === 1 && envelope.targetFileWriteSlotsConsumed === 9 &&
      envelope.targetFileSynchronizations === 9 &&
      envelope.verificationAttempts === 1 && envelope.executionReceiptWriteAttempts === 1 &&
      envelope.executionReceiptWrites === 1 && /^[a-f0-9]{64}$/.test(envelope.executionReceiptSha256 || '') &&
      envelope.targetRefObserved === NEW_COMMIT && envelope.targetIndexTreeObserved === NEW_TREE &&
      envelope.targetFilesMatchedCount === 9 && envelope.targetWorktreeCleanObserved === true &&
      envelope.terminalStateDurablyRecorded === true && envelope.reconciliationRequired === false;
    const preCasAttemptCausal = envelope.branchCasInvocationCount === 0 &&
      [0, 1].includes(envelope.branchRefCasAttempts);
    const partialEffectCausal = (() => {
      if (envelope.targetIndexSyncAttempts === 0) return noIndexOrLater;
      if (envelope.targetIndexSyncAttempts !== 1) return false;
      if (envelope.targetIndexSynchronizations !== 1) {
        return [0, null].includes(envelope.targetIndexSynchronizations) && noFilesOrLater;
      }
      if (envelope.targetFileSyncAttempts === 0) return noFilesOrLater;
      if (envelope.targetFileSyncAttempts !== 1 || envelope.targetFileWriteSlotsConsumed !== 9) return false;
      if (envelope.targetFileSynchronizations !== 9) {
        return (envelope.targetFileSynchronizations === null ||
          (Number.isInteger(envelope.targetFileSynchronizations) && envelope.targetFileSynchronizations >= 0 &&
            envelope.targetFileSynchronizations < 9)) && noVerifyOrReceipt;
      }
      return [0, 1].includes(envelope.verificationAttempts) &&
        envelope.executionReceiptWriteAttempts === 0 && receiptAbsent;
    })();
    const failureShape = {
      CONSUMED_FAILED_PRE_CAS: preCasAttemptCausal &&
        envelope.branchRefUpdates === 0 && noIndexOrLater,
      CONSUMED_AMBIGUOUS_CAS: envelope.branchCasInvocationCount === 1 &&
        envelope.branchRefCasAttempts === 1 && envelope.branchRefUpdates === null && noIndexOrLater,
      CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL: envelope.branchCasInvocationCount === 1 &&
        envelope.branchRefCasAttempts === 1 && envelope.branchRefUpdates === 1 &&
        envelope.targetRefObserved === NEW_COMMIT && partialEffectCausal && receiptIdentityCoherent,
      CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS: envelope.branchCasInvocationCount === 1 &&
        envelope.branchRefCasAttempts === 1 && [1, null].includes(envelope.branchRefUpdates) &&
        partialEffectCausal && receiptIdentityCoherent,
      CONSUMED_EXECUTION_RECEIPT_AMBIGUOUS: envelope.branchCasInvocationCount === 1 &&
        envelope.branchRefCasAttempts === 1 && envelope.branchRefUpdates === 1 &&
        envelope.targetIndexSyncAttempts === 1 && envelope.targetIndexSynchronizations === 1 &&
        envelope.targetFileSynchronizations === 9 &&
        envelope.targetFileSyncAttempts === 1 && envelope.targetFileWriteSlotsConsumed === 9 &&
        envelope.verificationAttempts === 1 && envelope.executionReceiptWriteAttempts === 1 &&
        [0, 1, null].includes(envelope.executionReceiptWrites) && receiptIdentityCoherent
    }[envelope.state];
    const failure = failureShape === true && envelope.terminalStateDurablyRecorded === true &&
      envelope.reconciliationRequired === true;
    const nonterminal = nonterminalShape === true && envelope.terminalStateDurablyRecorded === false &&
      envelope.reconciliationRequired === true;
    if (!(success || failure || nonterminal)) throw new Error('cm2126_claim_state_effect_mismatch');
  }

  async read(bindingHash, releaseBinding = null) {
    const rootHandle = await openVerifiedGovernanceRoot(this);
    try {
      return await this.readFromRootHandle(rootHandle, bindingHash, releaseBinding);
    } finally {
      await rootHandle.close().catch(() => {});
    }
  }

  async readFromRootHandle(rootHandle, bindingHash, releaseBinding = null) {
    let claimHandle = null;
    try {
      claimHandle = await this.fs.open(
        governanceDescriptorPath(rootHandle, claimFileName()),
        fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
      );
      const stat = await claimHandle.stat();
      if (!stat.isFile()) throw new Error('cm2126_claim_invalid');
      const envelope = JSON.parse((await claimHandle.readFile()).toString('utf8'));
      this.validateEnvelope(envelope, bindingHash || envelope.bindingHash, releaseBinding);
      return envelope;
    } finally {
      if (claimHandle) await claimHandle.close().catch(() => {});
    }
  }

  async inspectExisting(bindingHash, releaseBinding) {
    const rootHandle = await openVerifiedGovernanceRoot(this);
    try {
      const envelope = await this.readFromRootHandle(rootHandle, bindingHash, releaseBinding);
      return { claimEnvelopePresent: true, state: envelope.state, authorizationConsumed: true,
        replayAllowed: false, reconciliationRequired: envelope.reconciliationRequired,
        claimEnvelopeBindingVerified: true, envelope };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { claimEnvelopePresent: false, authorizationConsumed: false, replayAllowed: false };
      }
      return { claimEnvelopePresent: true, state: 'CLAIM_REGISTRY_AMBIGUOUS', authorizationConsumed: true,
        replayAllowed: false, reconciliationRequired: true, claimEnvelopeBindingVerified: false, envelope: null };
    } finally {
      await rootHandle.close().catch(() => {});
    }
  }

  async claim(bindingHash, releaseBinding, observedAt) {
    if (!/^[a-f0-9]{64}$/.test(bindingHash || '') ||
        !machineReleaseBindingAccepted(releaseBinding, bindingHash)) {
      throw new Error('cm2126_machine_bound_final_release_required');
    }
    const claimDate = observedAt instanceof Date ? observedAt : new Date(observedAt);
    const claimedAt = claimDate.toISOString();
    const claimedAtMs = claimDate.getTime();
    const approvedAt = Date.parse(releaseBinding.approvedAt || '');
    const expiresAt = Date.parse(releaseBinding.expiresAt || '');
    if (!Number.isFinite(claimedAtMs) || claimedAtMs < approvedAt || claimedAtMs >= expiresAt) {
      throw new Error('cm2126_claim_outside_final_release_window');
    }
    const envelope = {
      schemaVersion: 1,
      registryReference: REGISTRY_REFERENCE,
      claimId: claimId(),
      nonceHash: sha256(NONCE),
      receiptIdHash: sha256(RECEIPT_ID),
      bindingHash,
      finalReleaseDecisionReference: releaseBinding.decisionReference,
      finalReleaseSourceCommit: releaseBinding.sourceCommit,
      finalReleaseApprovedAt: releaseBinding.approvedAt,
      finalReleaseExpiresAt: releaseBinding.expiresAt,
      claimedAt,
      state: 'CLAIMED',
      authorizationUseCount: 1,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      branchCasInvocationCount: 0,
      branchRefCasAttempts: 0,
      branchRefUpdates: 0,
      targetIndexSyncAttempts: 0,
      targetIndexSynchronizations: 0,
      targetFileSyncAttempts: 0,
      targetFileWriteSlotsConsumed: 0,
      targetFileSynchronizations: 0,
      verificationAttempts: 0,
      executionReceiptWriteAttempts: 0,
      executionReceiptWrites: 0,
      targetWorktreeIdentitySha256: releaseBinding.targetWorktreeIdentitySha256,
      targetRefObserved: releaseBinding.expectedOld,
      targetIndexTreeObserved: releaseBinding.expectedOldTree,
      targetFilesMatchedCount: 9,
      targetWorktreeCleanObserved: true,
      executionReceiptSha256: null,
      terminalStateDurablyRecorded: false,
      reconciliationRequired: true
    };
    this.validateEnvelope(envelope, bindingHash, releaseBinding);
    const bytes = Buffer.from(JSON.stringify(canonicalize(envelope)));
    const rootHandle = await openVerifiedGovernanceRoot(this);
    let claimHandle = null;
    try {
      claimHandle = await this.fs.open(
        governanceDescriptorPath(rootHandle, claimFileName()),
        fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
        0o600
      );
      await claimHandle.writeFile(bytes);
      await claimHandle.sync();
      const observedBytes = Buffer.alloc(bytes.length);
      const readback = await claimHandle.read(observedBytes, 0, bytes.length, 0);
      if (readback.bytesRead !== bytes.length || !observedBytes.equals(bytes)) {
        throw new Error('cm2126_claim_readback_mismatch');
      }
      await rootHandle.sync();
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('cm2126_authorization_already_claimed');
      throw error;
    } finally {
      if (claimHandle) await claimHandle.close().catch(() => {});
      await rootHandle.close().catch(() => {});
    }
    return envelope;
  }

  async transition(bindingHash, expectedState, state, details = {}, releaseBinding = null) {
    if (!machineReleaseBindingAccepted(releaseBinding, bindingHash)) {
      throw new Error('cm2126_machine_bound_final_release_required');
    }
    const allowed = {
      CLAIMED: ['BRANCH_REF_CAS_CONSUMED', 'CONSUMED_FAILED_PRE_CAS'],
      BRANCH_REF_CAS_CONSUMED: ['BRANCH_REF_UPDATED', 'CONSUMED_FAILED_PRE_CAS', 'CONSUMED_AMBIGUOUS_CAS',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      BRANCH_REF_UPDATED: ['TARGET_INDEX_SYNC_CONSUMED', 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      TARGET_INDEX_SYNC_CONSUMED: ['TARGET_INDEX_SYNCHRONIZED', 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      TARGET_INDEX_SYNCHRONIZED: ['TARGET_FILES_SYNC_CONSUMED', 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      TARGET_FILES_SYNC_CONSUMED: ['TARGET_FILES_SYNCHRONIZED', 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      TARGET_FILES_SYNCHRONIZED: ['VERIFICATION_CONSUMED', 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      VERIFICATION_CONSUMED: ['EXECUTION_RECEIPT_WRITE_CONSUMED', 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL',
        'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS'],
      EXECUTION_RECEIPT_WRITE_CONSUMED: [SUCCESS_STATE, 'CONSUMED_EXECUTION_RECEIPT_AMBIGUOUS']
    };
    if (!allowed[expectedState]?.includes(state)) throw new Error('cm2126_claim_transition_invalid');
    const rootHandle = await openVerifiedGovernanceRoot(this);
    let temporaryHandle = null;
    try {
      const current = await this.readFromRootHandle(rootHandle, bindingHash, releaseBinding);
      if (current.state !== expectedState) throw new Error('cm2126_claim_state_mismatch');
      const next = {
        ...current,
        ...details,
        state,
        terminalStateDurablyRecorded: TERMINAL_FAILURE_STATES.includes(state) || state === SUCCESS_STATE,
        reconciliationRequired: state !== SUCCESS_STATE
      };
      this.validateEnvelope(next, bindingHash, releaseBinding);
      const temporaryName = `${claimFileName()}.${state}.tmp`;
      const temporary = governanceDescriptorPath(rootHandle, temporaryName);
      const destination = governanceDescriptorPath(rootHandle, claimFileName());
      temporaryHandle = await this.fs.open(
        temporary,
        fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,
        0o600
      );
      await temporaryHandle.writeFile(Buffer.from(JSON.stringify(canonicalize(next))));
      await temporaryHandle.sync();
      await temporaryHandle.close();
      temporaryHandle = null;
      await this.fs.rename(temporary, destination);
      await rootHandle.sync();
      injectIsolatedTransitionFault(state);
      return await this.readFromRootHandle(rootHandle, bindingHash, releaseBinding);
    } finally {
      if (temporaryHandle) await temporaryHandle.close().catch(() => {});
      await rootHandle.close().catch(() => {});
    }
  }
}

module.exports = {
  ALL_STATES,
  CLAIM_ENVELOPE_KEYS,
  Cm2126ExactBranchCasClaimRegistry,
  NONTERMINAL_STATES,
  SUCCESS_STATE,
  TERMINAL_FAILURE_STATES,
  claimFileName,
  claimId,
  machineReleaseBindingAccepted
};
