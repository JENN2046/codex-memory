#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const {
  IDENTITY_FILENAME,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  expectedIdentityBytes,
  sha256,
  sha256Canonical
} = require('../core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  evaluateCm2103BootstrapDecisionIntake,
  isMachineBoundCm2103BootstrapDecision
} = require('../core/Cm2103IdentityBoundStoreBootstrapDecisionIntake');
const {
  Cm2103IdentityBoundStoreBootstrapRegistry,
  REGISTRY_IDENTITY
} = require('../core/Cm2103IdentityBoundStoreBootstrapRegistry');
const {
  executeCm2103BootstrapFilesystem
} = require('../core/Cm2103IdentityBoundStoreBootstrapEngine');
const {
  EXECUTION_PACKET_PATH,
  FUTURE_DECISION_PATH,
  evaluateCm2103BootstrapExecutionPacket
} = require('../core/Cm2103IdentityBoundStoreBootstrapExecutionPacketContract');
const {
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  verifyCm2103GovernanceRoot
} = require('../core/Cm2103IdentityBoundStoreGovernance');

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: options.encoding || 'utf8',
    maxBuffer: 1024 * 1024,
    stdio: options.encoding === 'buffer' ? ['ignore', 'pipe', 'pipe'] : undefined
  });
}

function readGitBytes(commit, file) {
  return Buffer.from(execFileSync('git', ['show', `${commit}:${file}`], {
    maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  }));
}

function hash40(value) {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
}

function verifyFrozenGitObject({ commit, file, blobOid, bytes, sha256: expectedSha256 }) {
  const observed = readGitBytes(commit, file);
  const observedBlob = git(['rev-parse', `${commit}:${file}`]).trim();
  if (observedBlob !== blobOid || observed.length !== bytes || sha256(observed) !== expectedSha256) {
    throw new Error('cm2103_frozen_git_object_binding_mismatch');
  }
  return observed;
}

function expectedDecisionBinding({ packet, executionPacketCommit, executionPacketBlobOid, executionPacketBytes }) {
  return {
    expectedDecisionReference: packet.expectedFutureDecisionReference,
    foundationDecisionReference: packet.foundationDecisionReference,
    foundationDecisionSourceCommit: packet.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: packet.foundationDecisionBlobOid,
    foundationDecisionSha256: packet.foundationDecisionSha256,
    foundationPacketCommit: packet.foundationPacketSourceCommit,
    foundationPacketBlobOid: packet.foundationPacketBlobOid,
    foundationPacketSha256: packet.foundationPacketSha256,
    bootstrapRequestCommit: packet.bootstrapRequestSourceCommit,
    bootstrapRequestBlobOid: packet.bootstrapRequestBlobOid,
    bootstrapRequestSha256: packet.bootstrapRequestSha256,
    executionPacketCommit,
    executionPacketBlobOid,
    executionPacketSha256: sha256(executionPacketBytes),
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree,
    lifecycleReference: packet.lifecycleReference,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    storeRole: packet.storeRole,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentityReference: packet.governanceRootIdentity.registryRootReference,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    identityFilename: packet.identityFilename,
    identityBytes: packet.identityBytes,
    identitySha256: packet.identitySha256,
    authorizationRegistryReference: packet.authorizationRegistryIdentity.authorizationRegistryReference,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    expectedExpiresAt: packet.requestedExpiresAt
  };
}

function buildCm2103BootstrapReceipt({ packet, observedDecision, executionPacketCommit, executionPacketBlobOid, executionPacketBytes, bindingHash, claim, outcomeStage }) {
  const success = claim.state === 'CONSUMED_SUCCESS';
  return {
    schemaVersion: 3,
    taskId: 'CM-2103-R2',
    receiptType: 'identity_bound_synthetic_store_bootstrap_receipt_union',
    result: success ? 'PASS' : 'STOPPED',
    finalState: claim.state,
    outcomeStage,
    decisionReference: observedDecision.decision.decisionReference,
    decisionSourceCommit: observedDecision.sourceCommit,
    decisionBlobOid: observedDecision.blobOid,
    decisionSha256: observedDecision.sha256,
    executionPacketCommit,
    executionPacketBlobOid,
    executionPacketSha256: sha256(executionPacketBytes),
    foundationDecisionReference: packet.foundationDecisionReference,
    foundationDecisionSourceCommit: packet.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: packet.foundationDecisionBlobOid,
    foundationDecisionSha256: packet.foundationDecisionSha256,
    bootstrapRequestCommit: packet.bootstrapRequestSourceCommit,
    bootstrapRequestBlobOid: packet.bootstrapRequestBlobOid,
    bootstrapRequestSha256: packet.bootstrapRequestSha256,
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree,
    action: packet.action,
    lifecycleReference: packet.lifecycleReference,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    storeRole: packet.storeRole,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentityReference: packet.governanceRootIdentity.registryRootReference,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    authorizationRegistryReference: packet.authorizationRegistryIdentity.authorizationRegistryReference,
    bindingHash,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    claimEnvelopePresent: claim.claimEnvelopePresent,
    claimEnvelopeBindingVerified: claim.claimEnvelopeBindingVerified,
    receiptReconstructedFromExistingEnvelope: claim.reentryProjection === true,
    reentrySourceState: claim.reentrySourceState,
    storeFilesystemAccessesDuringReentry: 0,
    storeFilesystemWritesDuringReentry: 0,
    storeDirectoryExistenceCheckedBeforeClaim: claim.storeDirectoryExistenceCheckedBeforeClaim,
    storeDirectoryAbsentBeforeClaim: claim.storeDirectoryAbsentBeforeClaim,
    existingStoreDirectoryRead: claim.existingStoreDirectoryRead,
    storeDirectoryCreateAttempts: claim.directoryCreateAttempts,
    storeDirectoryCreates: claim.directoryCreates,
    storeDirectoryCreated: claim.storeDirectoryCreated,
    identityFilename: IDENTITY_FILENAME,
    identityWriteAttempts: claim.identityWriteAttempts,
    identityWrites: claim.identityWrites,
    identityWriteAttempted: claim.identityWriteAttempted,
    identityCreated: claim.identityCreated,
    identityBytes: claim.identityBytes,
    identitySha256: claim.identitySha256,
    identityReadbackAttempts: claim.identityReadbackAttempts,
    identityReadbackVerifications: claim.identityReadbackVerifications,
    identityReadbackMatched: claim.identityReadbackMatched,
    governanceRegistryDirectoryCreates: claim.governanceRegistryDirectoryCreates,
    governanceRegistryIdentityWrites: claim.governanceRegistryIdentityWrites,
    authorizationMarkerWrites: claim.authorizationMarkerWrites,
    governanceFilesystemEffectAttempted: claim.governanceFilesystemEffectAttempted,
    claimEnvelopeCreateAttempts: claim.claimEnvelopeCreateAttempts,
    claimEnvelopeCreates: claim.claimEnvelopeCreates,
    claimStateWriteAttempts: claim.claimStateWriteAttempts,
    claimStateWrites: claim.claimStateWrites,
    terminalStateDurablyRecorded: claim.terminalStateDurablyRecorded,
    governanceFilesystemEffectsPresent: claim.governanceFilesystemEffectsPresent,
    authorizationUseCount: 1,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    automaticRetryPerformed: false,
    automaticCleanupPerformed: false,
    reconciliationRequired: !success,
    directoryEnumerations: 0,
    recordContentReads: 0,
    nativeReads: 0,
    nativeWrites: 0,
    recordMemoryCalls: 0,
    tombstoneMemoryCalls: 0,
    verifyOperations: 0,
    rollbackOrCompensationOperations: 0,
    realMemoryRead: false,
    realMemoryModified: false,
    providerCalled: false,
    embeddingProviderCalled: false,
    remoteActionPerformed: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawPathDisclosed: false,
    emptyStorePreflightExecuted: false,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

async function runFrozenCm2103Bootstrap(executionPacketCommit, futureDecisionCommit) {
  if (!hash40(executionPacketCommit)) throw new Error('cm2103_execution_packet_commit_required');
  if (!hash40(futureDecisionCommit)) throw new Error('cm2103_future_bootstrap_decision_commit_required');

  const packetBytes = readGitBytes(executionPacketCommit, EXECUTION_PACKET_PATH);
  const packetBlobOid = git(['rev-parse', `${executionPacketCommit}:${EXECUTION_PACKET_PATH}`]).trim();
  let packet;
  try { packet = JSON.parse(packetBytes.toString('utf8')); } catch { throw new Error('cm2103_execution_packet_invalid_json'); }
  const packetResult = evaluateCm2103BootstrapExecutionPacket(packet);
  if (!packetResult.accepted) throw new Error(`cm2103_execution_packet_rejected:${packetResult.blockers.join(',')}`);

  verifyFrozenGitObject({
    commit: packet.r2ReviewDecisionSourceCommit,
    file: packet.r2ReviewDecisionPath,
    blobOid: packet.r2ReviewDecisionBlobOid,
    bytes: packet.r2ReviewDecisionBytes,
    sha256: packet.r2ReviewDecisionSha256
  });
  verifyFrozenGitObject({
    commit: packet.foundationDecisionSourceCommit,
    file: packet.foundationDecisionPath,
    blobOid: packet.foundationDecisionBlobOid,
    bytes: packet.foundationDecisionBytes,
    sha256: packet.foundationDecisionSha256
  });
  verifyFrozenGitObject({
    commit: packet.foundationPacketSourceCommit,
    file: packet.foundationPacketPath,
    blobOid: packet.foundationPacketBlobOid,
    bytes: packet.foundationPacketBytes,
    sha256: packet.foundationPacketSha256
  });
  verifyFrozenGitObject({
    commit: packet.bootstrapRequestSourceCommit,
    file: packet.bootstrapRequestPath,
    blobOid: packet.bootstrapRequestBlobOid,
    bytes: packet.bootstrapRequestBytes,
    sha256: packet.bootstrapRequestSha256
  });

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['show', '-s', '--format=%T', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  let attached = false;
  try { git(['symbolic-ref', '-q', 'HEAD']); attached = true; } catch {}
  if (!clean || attached || head !== packet.implementationCommit || tree !== packet.implementationTree) {
    throw new Error('cm2103_runtime_checkout_binding_mismatch');
  }

  const decisionBytes = readGitBytes(futureDecisionCommit, FUTURE_DECISION_PATH);
  const decisionBlobOid = git(['rev-parse', `${futureDecisionCommit}:${FUTURE_DECISION_PATH}`]).trim();
  const decisionSha256 = sha256(decisionBytes);
  const decisionIntake = evaluateCm2103BootstrapDecisionIntake({
    decisionBytes,
    observedBinding: {
      decisionSourceCommit: futureDecisionCommit,
      decisionBlobOid,
      decisionSha256
    },
    expectedBinding: expectedDecisionBinding({
      packet,
      executionPacketCommit,
      executionPacketBlobOid: packetBlobOid,
      executionPacketBytes: packetBytes
    }),
    now: new Date()
  });
  if (!decisionIntake.accepted || !isMachineBoundCm2103BootstrapDecision(decisionIntake.decision)) {
    throw new Error('cm2103_bootstrap_decision_intake_rejected');
  }

  const gitCommonDir = git(['rev-parse', '--git-common-dir']).trim();
  const governance = await verifyCm2103GovernanceRoot(gitCommonDir);
  if (governance.governanceRootIdentityReference !== GOVERNANCE_ROOT_IDENTITY.registryRootReference ||
      governance.governanceRootIdentitySha256 !== GOVERNANCE_ROOT_IDENTITY_SHA256 ||
      governance.storeRootBindingSha256 !== STORE_ROOT_BINDING_CANONICAL_SHA256) {
    throw new Error('cm2103_governance_binding_mismatch');
  }

  const bindingHash = sha256Canonical({
    decisionSourceCommit: futureDecisionCommit,
    decisionBlobOid,
    decisionSha256,
    executionPacketCommit,
    executionPacketBlobOid: packetBlobOid,
    executionPacketSha256: sha256(packetBytes),
    implementationCommit: packet.implementationCommit,
    implementationTree: packet.implementationTree,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    identitySha256: packet.identitySha256,
    nonce: packet.nonce,
    receiptId: packet.receiptId
  });
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: governance.internalPaths.authorizationRegistryRoot
  });
  const observedDecision = {
    decision: decisionIntake.decision,
    sourceCommit: futureDecisionCommit,
    blobOid: decisionBlobOid,
    sha256: decisionSha256
  };
  const receiptArgs = {
    packet,
    observedDecision,
    executionPacketCommit,
    executionPacketBlobOid: packetBlobOid,
    executionPacketBytes: packetBytes,
    bindingHash
  };
  const execution = await executeCm2103BootstrapFilesystem({
    registry,
    storeRoot: governance.internalPaths.storeRoot,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    bindingHash,
    identityFilename: IDENTITY_FILENAME,
    identityBytes: expectedIdentityBytes()
  });
  const receipt = execution.receiptRequired && execution.claim
    ? buildCm2103BootstrapReceipt({
      ...receiptArgs,
      claim: execution.claim,
      outcomeStage: execution.outcomeStage
    })
    : null;
  return {
    ...execution,
    receipt,
    emptyStorePreflightExecuted: false,
    nativeActions: 0,
    rawPathDisclosed: false
  };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (require.main === module) {
  runFrozenCm2103Bootstrap(
    argumentValue('--execution-packet-commit'),
    argumentValue('--future-bootstrap-decision-commit')
  ).then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch(error => {
      const safeMessage = String(error?.message || '').startsWith('cm2103_')
        ? error.message
        : 'cm2103_bootstrap_execution_failed';
      process.stderr.write(`${safeMessage}\n`);
      process.exitCode = 1;
    });
}

module.exports = {
  EXECUTION_PACKET_PATH,
  FUTURE_DECISION_PATH,
  buildCm2103BootstrapReceipt,
  expectedDecisionBinding,
  runFrozenCm2103Bootstrap,
  verifyFrozenGitObject
};
