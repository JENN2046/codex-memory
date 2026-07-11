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
  evaluateCm2104BootstrapAuthorizationContentDecisionIntake,
  isMachineBoundCm2104BootstrapAuthorizationContentDecision
} = require('../core/Cm2104IdentityBoundStoreBootstrapAuthorizationContentDecisionIntake');
const {
  evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake,
  isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision
} = require('../core/Cm2104IdentityBoundStoreBootstrapFinalExecutionReleaseDecisionIntake');
const {
  Cm2103IdentityBoundStoreBootstrapRegistry,
  REGISTRY_IDENTITY
} = require('../core/Cm2103IdentityBoundStoreBootstrapRegistry');
const {
  executeCm2103BootstrapFilesystem
} = require('../core/Cm2103IdentityBoundStoreBootstrapEngine');
const {
  evaluateCm2103BootstrapExecutionPacket
} = require('../core/Cm2103IdentityBoundStoreBootstrapExecutionPacketContract');
const {
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  evaluateCm2104BootstrapAuthorizationGatePacket
} = require('../core/Cm2104IdentityBoundStoreBootstrapAuthorizationGatePacketContract');
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

function expectedAuthorizationContentDecisionBinding({
  packet,
  authorizationGatePacketCommit,
  authorizationGatePacketBlobOid,
  authorizationGatePacketBytes
}) {
  return {
    expectedContentDecisionReference: packet.expectedAuthorizationContentDecisionReference,
    expectedFinalReleaseDecisionReference: packet.expectedFinalExecutionReleaseDecisionReference,
    foundationDecisionReference: packet.foundationDecisionReference,
    foundationDecisionSourceCommit: packet.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: packet.foundationDecisionBlobOid,
    foundationDecisionSha256: packet.foundationDecisionSha256,
    foundationPacketCommit: packet.foundationPacketCommit,
    foundationPacketBlobOid: packet.foundationPacketBlobOid,
    foundationPacketSha256: packet.foundationPacketSha256,
    bootstrapRequestCommit: packet.bootstrapRequestCommit,
    bootstrapRequestBlobOid: packet.bootstrapRequestBlobOid,
    bootstrapRequestSha256: packet.bootstrapRequestSha256,
    executionPacketCommit: authorizationGatePacketCommit,
    executionPacketBlobOid: authorizationGatePacketBlobOid,
    executionPacketSha256: sha256(authorizationGatePacketBytes),
    implementationCommit: packet.gateImplementationCommit,
    implementationTree: packet.gateImplementationTree,
    lifecycleReference: packet.lifecycleReference,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    storeRole: packet.storeRole,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentityReference: packet.governanceRootIdentityReference,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    identityFilename: packet.identityFilename,
    identityBytes: packet.identityBytes,
    identitySha256: packet.identitySha256,
    authorizationRegistryReference: packet.authorizationRegistryReference,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    expectedExpiresAt: packet.requestedExpiresAt
  };
}

function expectedFinalExecutionReleaseDecisionBinding({
  packet,
  authorizationGatePacketCommit,
  authorizationGatePacketBlobOid,
  authorizationGatePacketBytes,
  authorizationContentDecision,
  authorizationContentDecisionCommit,
  authorizationContentDecisionBlobOid,
  authorizationContentDecisionSha256
}) {
  return {
    expectedFinalReleaseDecisionReference: packet.expectedFinalExecutionReleaseDecisionReference,
    authorizationContentDecisionReference: authorizationContentDecision.decisionReference,
    authorizationContentDecisionSourceCommit: authorizationContentDecisionCommit,
    authorizationContentDecisionBlobOid,
    authorizationContentDecisionSha256,
    executionPacketCommit: authorizationGatePacketCommit,
    executionPacketBlobOid: authorizationGatePacketBlobOid,
    executionPacketSha256: sha256(authorizationGatePacketBytes),
    implementationCommit: packet.gateImplementationCommit,
    implementationTree: packet.gateImplementationTree,
    lifecycleReference: packet.lifecycleReference,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    storeRole: packet.storeRole,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentityReference: packet.governanceRootIdentityReference,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    identityFilename: packet.identityFilename,
    identityBytes: packet.identityBytes,
    identitySha256: packet.identitySha256,
    authorizationRegistryReference: packet.authorizationRegistryReference,
    nonce: packet.nonce,
    receiptId: packet.receiptId,
    expectedExpiresAt: packet.requestedExpiresAt
  };
}

function buildCm2103BootstrapReceipt({
  packet,
  observedContentDecision,
  observedFinalReleaseDecision,
  executionPacketCommit,
  executionPacketBlobOid,
  executionPacketBytes,
  bindingHash,
  claim,
  outcomeStage
}) {
  const success = claim.state === 'CONSUMED_SUCCESS';
  return {
    schemaVersion: 4,
    taskId: 'CM-2104',
    receiptType: 'identity_bound_synthetic_store_bootstrap_two_stage_authorized_receipt_union',
    result: success ? 'PASS' : 'STOPPED',
    finalState: claim.state,
    outcomeStage,
    authorizationContentDecisionReference: observedContentDecision.decision.decisionReference,
    authorizationContentDecisionSourceCommit: observedContentDecision.sourceCommit,
    authorizationContentDecisionBlobOid: observedContentDecision.blobOid,
    authorizationContentDecisionSha256: observedContentDecision.sha256,
    finalExecutionReleaseDecisionReference: observedFinalReleaseDecision.decision.decisionReference,
    finalExecutionReleaseDecisionSourceCommit: observedFinalReleaseDecision.sourceCommit,
    finalExecutionReleaseDecisionBlobOid: observedFinalReleaseDecision.blobOid,
    finalExecutionReleaseDecisionSha256: observedFinalReleaseDecision.sha256,
    executionPacketCommit,
    executionPacketBlobOid,
    executionPacketSha256: sha256(executionPacketBytes),
    foundationDecisionReference: packet.foundationDecisionReference,
    foundationDecisionSourceCommit: packet.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: packet.foundationDecisionBlobOid,
    foundationDecisionSha256: packet.foundationDecisionSha256,
    bootstrapRequestCommit: packet.bootstrapRequestCommit,
    bootstrapRequestBlobOid: packet.bootstrapRequestBlobOid,
    bootstrapRequestSha256: packet.bootstrapRequestSha256,
    implementationCommit: packet.gateImplementationCommit,
    implementationTree: packet.gateImplementationTree,
    action: packet.action,
    lifecycleReference: packet.lifecycleReference,
    storeReference: packet.storeReference,
    storeInstanceId: packet.storeInstanceId,
    storeRole: packet.storeRole,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentityReference: packet.governanceRootIdentityReference,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    authorizationRegistryReference: packet.authorizationRegistryReference,
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

async function runFrozenCm2103Bootstrap(
  authorizationGatePacketCommit,
  authorizationContentDecisionCommit,
  finalExecutionReleaseDecisionCommit
) {
  if (!hash40(authorizationGatePacketCommit)) {
    throw new Error('cm2103_authorization_gate_packet_commit_required');
  }
  if (!hash40(authorizationContentDecisionCommit)) {
    throw new Error('cm2103_authorization_content_decision_commit_required');
  }
  if (!hash40(finalExecutionReleaseDecisionCommit)) {
    throw new Error('cm2103_final_execution_release_decision_commit_required');
  }

  const packetBytes = readGitBytes(authorizationGatePacketCommit, AUTHORIZATION_GATE_PACKET_PATH);
  const packetBlobOid = git([
    'rev-parse', `${authorizationGatePacketCommit}:${AUTHORIZATION_GATE_PACKET_PATH}`
  ]).trim();
  let packet;
  try { packet = JSON.parse(packetBytes.toString('utf8')); } catch {
    throw new Error('cm2103_authorization_gate_packet_invalid_json');
  }
  const packetResult = evaluateCm2104BootstrapAuthorizationGatePacket(packet);
  if (!packetResult.accepted) {
    throw new Error(`cm2103_authorization_gate_packet_rejected:${packetResult.blockers.join(',')}`);
  }
  for (const artifact of Object.values(packet.gateImplementationArtifacts)) {
    const observedBlobOid = git([
      'rev-parse', `${packet.gateImplementationCommit}:${artifact.path}`
    ]).trim();
    if (observedBlobOid !== artifact.blobOid) {
      throw new Error('cm2103_gate_implementation_artifact_binding_mismatch');
    }
  }

  verifyFrozenGitObject({
    commit: packet.r2PassReviewDecisionSourceCommit,
    file: packet.r2PassReviewDecisionPath,
    blobOid: packet.r2PassReviewDecisionBlobOid,
    bytes: packet.r2PassReviewDecisionBytes,
    sha256: packet.r2PassReviewDecisionSha256
  });
  const r2PacketBytes = verifyFrozenGitObject({
    commit: packet.r2ExecutionPacketCommit,
    file: packet.r2ExecutionPacketPath,
    blobOid: packet.r2ExecutionPacketBlobOid,
    bytes: packet.r2ExecutionPacketBytes,
    sha256: packet.r2ExecutionPacketSha256
  });
  let r2Packet;
  try { r2Packet = JSON.parse(r2PacketBytes.toString('utf8')); } catch {
    throw new Error('cm2103_r2_execution_packet_invalid_json');
  }
  const r2PacketResult = evaluateCm2103BootstrapExecutionPacket(r2Packet);
  if (!r2PacketResult.accepted ||
      r2Packet.implementationCommit !== packet.r2ImplementationCommit ||
      r2Packet.implementationTree !== packet.r2ImplementationTree) {
    throw new Error('cm2103_r2_execution_packet_binding_mismatch');
  }
  verifyFrozenGitObject({
    commit: r2Packet.foundationDecisionSourceCommit,
    file: r2Packet.foundationDecisionPath,
    blobOid: r2Packet.foundationDecisionBlobOid,
    bytes: r2Packet.foundationDecisionBytes,
    sha256: r2Packet.foundationDecisionSha256
  });
  verifyFrozenGitObject({
    commit: r2Packet.foundationPacketSourceCommit,
    file: r2Packet.foundationPacketPath,
    blobOid: r2Packet.foundationPacketBlobOid,
    bytes: r2Packet.foundationPacketBytes,
    sha256: r2Packet.foundationPacketSha256
  });
  verifyFrozenGitObject({
    commit: r2Packet.bootstrapRequestSourceCommit,
    file: r2Packet.bootstrapRequestPath,
    blobOid: r2Packet.bootstrapRequestBlobOid,
    bytes: r2Packet.bootstrapRequestBytes,
    sha256: r2Packet.bootstrapRequestSha256
  });

  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['show', '-s', '--format=%T', 'HEAD']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  let attached = false;
  try { git(['symbolic-ref', '-q', 'HEAD']); attached = true; } catch {}
  if (!clean || attached ||
      head !== packet.gateImplementationCommit || tree !== packet.gateImplementationTree) {
    throw new Error('cm2103_runtime_checkout_binding_mismatch');
  }

  const contentDecisionBytes = readGitBytes(
    authorizationContentDecisionCommit,
    AUTHORIZATION_CONTENT_DECISION_PATH
  );
  const contentDecisionBlobOid = git([
    'rev-parse', `${authorizationContentDecisionCommit}:${AUTHORIZATION_CONTENT_DECISION_PATH}`
  ]).trim();
  const contentDecisionSha256 = sha256(contentDecisionBytes);
  const contentDecisionIntake = evaluateCm2104BootstrapAuthorizationContentDecisionIntake({
    decisionBytes: contentDecisionBytes,
    observedBinding: {
      decisionSourceCommit: authorizationContentDecisionCommit,
      decisionBlobOid: contentDecisionBlobOid,
      decisionSha256: contentDecisionSha256
    },
    expectedBinding: expectedAuthorizationContentDecisionBinding({
      packet,
      authorizationGatePacketCommit,
      authorizationGatePacketBlobOid: packetBlobOid,
      authorizationGatePacketBytes: packetBytes
    }),
    now: new Date()
  });
  if (!contentDecisionIntake.accepted ||
      !isMachineBoundCm2104BootstrapAuthorizationContentDecision(contentDecisionIntake.decision) ||
      contentDecisionIntake.executionAuthorized !== false) {
    throw new Error('cm2103_authorization_content_decision_intake_rejected');
  }

  const finalReleaseDecisionBytes = readGitBytes(
    finalExecutionReleaseDecisionCommit,
    FINAL_EXECUTION_RELEASE_DECISION_PATH
  );
  const finalReleaseDecisionBlobOid = git([
    'rev-parse', `${finalExecutionReleaseDecisionCommit}:${FINAL_EXECUTION_RELEASE_DECISION_PATH}`
  ]).trim();
  const finalReleaseDecisionSha256 = sha256(finalReleaseDecisionBytes);
  const finalReleaseDecisionIntake = evaluateCm2104BootstrapFinalExecutionReleaseDecisionIntake({
    decisionBytes: finalReleaseDecisionBytes,
    observedBinding: {
      decisionSourceCommit: finalExecutionReleaseDecisionCommit,
      decisionBlobOid: finalReleaseDecisionBlobOid,
      decisionSha256: finalReleaseDecisionSha256
    },
    expectedBinding: expectedFinalExecutionReleaseDecisionBinding({
      packet,
      authorizationGatePacketCommit,
      authorizationGatePacketBlobOid: packetBlobOid,
      authorizationGatePacketBytes: packetBytes,
      authorizationContentDecision: contentDecisionIntake.decision,
      authorizationContentDecisionCommit,
      authorizationContentDecisionBlobOid: contentDecisionBlobOid,
      authorizationContentDecisionSha256: contentDecisionSha256
    }),
    now: new Date()
  });
  if (!finalReleaseDecisionIntake.accepted ||
      !isMachineBoundCm2104BootstrapFinalExecutionReleaseDecision(finalReleaseDecisionIntake.decision) ||
      finalReleaseDecisionIntake.executionAuthorized !== true) {
    throw new Error('cm2103_final_execution_release_decision_intake_rejected');
  }

  const gitCommonDir = git(['rev-parse', '--git-common-dir']).trim();
  const governance = await verifyCm2103GovernanceRoot(gitCommonDir);
  if (governance.governanceRootIdentityReference !== GOVERNANCE_ROOT_IDENTITY.registryRootReference ||
      governance.governanceRootIdentitySha256 !== GOVERNANCE_ROOT_IDENTITY_SHA256 ||
      governance.storeRootBindingSha256 !== STORE_ROOT_BINDING_CANONICAL_SHA256) {
    throw new Error('cm2103_governance_binding_mismatch');
  }

  const bindingHash = sha256Canonical({
    authorizationContentDecisionSourceCommit: authorizationContentDecisionCommit,
    authorizationContentDecisionBlobOid: contentDecisionBlobOid,
    authorizationContentDecisionSha256: contentDecisionSha256,
    finalExecutionReleaseDecisionSourceCommit: finalExecutionReleaseDecisionCommit,
    finalExecutionReleaseDecisionBlobOid: finalReleaseDecisionBlobOid,
    finalExecutionReleaseDecisionSha256,
    executionPacketCommit: authorizationGatePacketCommit,
    executionPacketBlobOid: packetBlobOid,
    executionPacketSha256: sha256(packetBytes),
    implementationCommit: packet.gateImplementationCommit,
    implementationTree: packet.gateImplementationTree,
    storeRootBindingSha256: packet.storeRootBindingSha256,
    governanceRootIdentitySha256: packet.governanceRootIdentitySha256,
    identitySha256: packet.identitySha256,
    nonce: packet.nonce,
    receiptId: packet.receiptId
  });
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: governance.internalPaths.authorizationRegistryRoot
  });
  const observedContentDecision = {
    decision: contentDecisionIntake.decision,
    sourceCommit: authorizationContentDecisionCommit,
    blobOid: contentDecisionBlobOid,
    sha256: contentDecisionSha256
  };
  const observedFinalReleaseDecision = {
    decision: finalReleaseDecisionIntake.decision,
    sourceCommit: finalExecutionReleaseDecisionCommit,
    blobOid: finalReleaseDecisionBlobOid,
    sha256: finalReleaseDecisionSha256
  };
  const receiptArgs = {
    packet,
    observedContentDecision,
    observedFinalReleaseDecision,
    executionPacketCommit: authorizationGatePacketCommit,
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
    argumentValue('--authorization-gate-packet-commit'),
    argumentValue('--authorization-content-decision-commit'),
    argumentValue('--final-execution-release-decision-commit')
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
  AUTHORIZATION_CONTENT_DECISION_PATH,
  AUTHORIZATION_GATE_PACKET_PATH,
  FINAL_EXECUTION_RELEASE_DECISION_PATH,
  buildCm2103BootstrapReceipt,
  expectedAuthorizationContentDecisionBinding,
  expectedFinalExecutionReleaseDecisionBinding,
  runFrozenCm2103Bootstrap,
  verifyFrozenGitObject
};
