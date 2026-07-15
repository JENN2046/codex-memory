#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  BINDING_RECEIPT_FILENAME,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  FUTURE_BRANCH_REF,
  Cm2122StatusSyncClaimRegistry,
  assertSafeGitEnvironment,
  buildClaimBindingHash,
  evaluateBindingReceipt,
  evaluateDurableDetachedBinding,
  evaluateExecutionReceipt,
  intakeExecutionPacket,
  intakeFinalReleaseDecision,
  resolveFixedGovernanceRoot,
  verifyDetachedCommitBinding
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  canonicalize,
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  gitBlobOid,
  serializeArtifact
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  gitText
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const PACKET_COMMIT = 'd9f5f8c1cbfb17ac013846006f466c1b0c3ae67f';
const FINAL_RELEASE_COMMIT = '869d9d6e62eebd7ce1c04cfe9e7a3b394355937f';
const DETACHED_STATUS_COMMIT = 'eb016872c834a8a8b36ed8edd8ce1aeb0db599c8';
const DETACHED_STATUS_TREE = 'c129ecfaa134a47f30ed98f17d74151989c1a547';
const OUTPUTS = Object.freeze({
  execution: 'docs/near-model-memory-plan-pack/cm2124_status_sync_execution_receipt.json',
  binding: 'docs/near-model-memory-plan-pack/cm2124_status_sync_binding_receipt.json',
  manifest: 'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.json',
  markdown: 'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_freeze_manifest.md'
});
const EXPECTED = Object.freeze({
  execution: Object.freeze({
    bytes: 12435,
    sha256: '8d3aefd3a335f4b850dfc07369d23c411bd0bd49028c597455c28d5d8f518120',
    canonicalPayloadSha256: 'a040c6e948fe1ac740fa5bf22a7f29d95e901b1a64102599384221204ddf5e2d'
  }),
  binding: Object.freeze({
    bytes: 12174,
    sha256: '5ce9d65ab6e2c6d3a957c30ce65c7195dce0619cb88312fb18bb52ecd982f28f',
    canonicalPayloadSha256: 'f03cb5d8a78d17c5f9b90005edc7a45d32b2113c39a29b0f403ffe268e01d023'
  })
});

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2124_freeze_no_arguments_allowed');
}

function assertCm2124FreezeCleanWorktree() {
  if (gitText(['status', '--porcelain', '--untracked-files=all']) !== '') {
    throw new Error('cm2124_clean_worktree_required');
  }
}

function governanceDescriptorPath(rootHandle, filename) {
  if (process.platform !== 'linux' || !rootHandle || !Number.isInteger(rootHandle.fd) ||
      path.basename(filename) !== filename || filename === '.' || filename === '..') {
    throw new Error('cm2124_descriptor_relative_governance_access_unsupported');
  }
  return `/proc/self/fd/${rootHandle.fd}/${filename}`;
}

async function openVerifiedRootHandle(registry) {
  if (process.platform !== 'linux' || !Number.isInteger(fs.constants.O_DIRECTORY) ||
      !Number.isInteger(fs.constants.O_NOFOLLOW)) {
    throw new Error('cm2124_descriptor_relative_governance_access_unsupported');
  }
  const rootIdentity = await registry.verifyRoot();
  const rootHandle = await fs.promises.open(
    registry.governanceRoot,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
  );
  try {
    const descriptorStat = await rootHandle.stat();
    if (!descriptorStat.isDirectory() || descriptorStat.dev !== rootIdentity.dev ||
        descriptorStat.ino !== rootIdentity.ino) {
      throw new Error('cm2124_governance_root_descriptor_identity_mismatch');
    }
    return rootHandle;
  } catch (error) {
    await rootHandle.close().catch(() => {});
    throw error;
  }
}

function readExactReceipt(rootHandle, filename, expected, fileSystem = fs) {
  let descriptor;
  try {
    const source = governanceDescriptorPath(rootHandle, filename);
    const pathStat = fileSystem.lstatSync(source);
    if (!pathStat.isFile() || pathStat.isSymbolicLink()) throw new Error('invalid');
    descriptor = fileSystem.openSync(source, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const descriptorStat = fileSystem.fstatSync(descriptor);
    if (!descriptorStat.isFile() || descriptorStat.dev !== pathStat.dev || descriptorStat.ino !== pathStat.ino) {
      throw new Error('invalid');
    }
    const bytes = fileSystem.readFileSync(descriptor);
    const receipt = JSON.parse(bytes.toString('utf8'));
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256 ||
        receipt.canonicalPayloadSha256 !== expected.canonicalPayloadSha256) {
      throw new Error('identity');
    }
    return { bytes, receipt };
  } catch (error) {
    if (error.message === 'identity') throw new Error(`cm2124_receipt_identity_mismatch:${filename}`);
    throw new Error(`cm2124_receipt_source_invalid:${filename}`);
  } finally {
    if (descriptor !== undefined) fileSystem.closeSync(descriptor);
  }
}

function claimBoundReviewTime(receipt) {
  const registry = receipt?.payload?.registry;
  const claimedAt = Date.parse(registry?.claimedAt || '');
  const approvedAt = Date.parse(registry?.finalReleaseApprovedAt || '');
  const expiresAt = Date.parse(registry?.finalReleaseExpiresAt || '');
  if (!Number.isFinite(claimedAt) || !Number.isFinite(approvedAt) ||
      !Number.isFinite(expiresAt) || claimedAt < approvedAt || claimedAt >= expiresAt) {
    throw new Error('cm2124_receipt_claim_time_invalid');
  }
  return new Date(claimedAt);
}

function receiptIdentity(outputPath, sourceFilename, value) {
  return {
    sourceFilename,
    outputPath,
    gitMode: '100644',
    blobOid: gitBlobOid(value.bytes),
    bytes: value.bytes.length,
    sha256: sha256(value.bytes),
    canonicalPayloadSha256: value.receipt.canonicalPayloadSha256,
    artifactType: value.receipt.artifactType
  };
}

function renderMarkdown(manifest, jsonText) {
  return [
    '# CM-2124 Status-sync Receipt Freeze Manifest',
    '',
    `Canonical payload SHA-256: \`${manifest.canonicalPayloadSha256}\``,
    '',
    'This manifest freezes the exact CM-2122-R2 execution and binding receipts',
    'after one successful detached status-sync commit. It does not update the',
    'target branch, authorize Branch CAS, perform a remote action, or claim readiness.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

async function buildFreezeArtifacts() {
  assertSafeGitEnvironment();
  assertCm2124FreezeCleanWorktree();
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2124_detached_worktree_required');
  const freezeImplementationCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const freezeImplementationTree = gitText(['rev-parse', 'HEAD^{tree}']);
  const freezeImplementationBase = gitText(['merge-base', DETACHED_STATUS_COMMIT, freezeImplementationCommit]);
  const freezeImplementationDiffPaths = gitText([
    'diff', '--name-only', DETACHED_STATUS_COMMIT, freezeImplementationCommit
  ]).split('\n').filter(Boolean).sort();
  if (freezeImplementationBase !== DETACHED_STATUS_COMMIT ||
      JSON.stringify(freezeImplementationDiffPaths) !== JSON.stringify([
        'scripts/freeze-cm2124-status-sync-receipts.js',
        'scripts/review-cm2124-status-sync-receipts.js'
      ]) ||
      gitText(['show-ref', '--hash', '--verify', FUTURE_BRANCH_REF]) !== FINAL_RELEASE_COMMIT) {
    throw new Error('cm2124_exact_implementation_status_parent_and_target_branch_required');
  }
  for (const output of Object.values(OUTPUTS)) {
    if (fs.existsSync(output)) throw new Error(`cm2124_output_already_exists:${output}`);
  }
  const options = resolverOptions();
  const packetEvidence = intakeExecutionPacket({ packetCommit: PACKET_COMMIT, ...options });
  if (!packetEvidence.accepted) throw new Error(`cm2124_packet_rejected:${packetEvidence.blockers.join(',')}`);
  const root = resolveFixedGovernanceRoot();
  const registry = new Cm2122StatusSyncClaimRegistry({ governanceRoot: root });
  const rootHandle = await openVerifiedRootHandle(registry);
  let execution;
  let finalReleaseEvidence;
  let claim;
  let binding;
  try {
    execution = readExactReceipt(rootHandle, EXECUTION_RECEIPT_FILENAME, EXPECTED.execution);
    finalReleaseEvidence = intakeFinalReleaseDecision({
      finalReleaseCommit: FINAL_RELEASE_COMMIT,
      packetEvidence,
      now: claimBoundReviewTime(execution.receipt),
      ...options
    });
    if (!finalReleaseEvidence.accepted) throw new Error(`cm2124_final_release_rejected:${finalReleaseEvidence.blockers.join(',')}`);
    const bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
    claim = await registry.readFromRootHandle(rootHandle, bindingHash, finalReleaseEvidence);
    binding = readExactReceipt(rootHandle, BINDING_RECEIPT_FILENAME, EXPECTED.binding);
  } finally {
    await rootHandle.close().catch(() => {});
  }
  if (claim.state !== 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION' ||
      claim.detachedStatusCommit !== DETACHED_STATUS_COMMIT || claim.detachedStatusTree !== DETACHED_STATUS_TREE ||
      claim.branchRefUpdateCount !== 0 || claim.authorizationReplayAllowed !== false) {
    throw new Error('cm2124_claim_state_rejected');
  }
  const executionEvaluation = evaluateExecutionReceipt(execution.receipt, { packetEvidence, finalReleaseEvidence });
  if (!executionEvaluation.accepted) throw new Error(`cm2124_execution_receipt_rejected:${executionEvaluation.blockers.join(',')}`);
  const detachedBinding = verifyDetachedCommitBinding({
    detachedCommit: DETACHED_STATUS_COMMIT,
    packetEvidence,
    finalReleaseEvidence,
    ...options
  });
  if (!detachedBinding.accepted) throw new Error(`cm2124_detached_binding_rejected:${detachedBinding.blockers.join(',')}`);
  const preBindingClaim = {
    ...claim,
    state: 'EXECUTION_RECEIPT_WRITTEN',
    bindingReceiptCreated: false,
    bindingReceiptSha256: null,
    reconciliationRequired: true
  };
  const bindingEvaluation = evaluateBindingReceipt(binding.receipt, {
    detachedBinding,
    executionReceipt: execution.receipt,
    claimEnvelope: preBindingClaim,
    packetEvidence,
    finalReleaseEvidence
  });
  if (!bindingEvaluation.accepted) throw new Error(`cm2124_binding_receipt_rejected:${bindingEvaluation.blockers.join(',')}`);
  const durable = await evaluateDurableDetachedBinding({
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
  if (!durable.accepted || durable.detachedStatusCommit !== DETACHED_STATUS_COMMIT) {
    throw new Error(`cm2124_durable_binding_rejected:${durable.blockers.join(',')}`);
  }
  const payload = {
    freezeReference: 'CM-2124-STATUS-SYNC-RECEIPT-FREEZE-EB016872-8D3AEFD3-5CE9D65A',
    freezeImplementationCommit,
    freezeImplementationTree,
    freezeImplementationBase: DETACHED_STATUS_COMMIT,
    freezeImplementationDiffPaths,
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    executionPacketCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    detachedStatusCommit: DETACHED_STATUS_COMMIT,
    detachedStatusTree: DETACHED_STATUS_TREE,
    detachedStatusParent: FINAL_RELEASE_COMMIT,
    targetBranchRef: FUTURE_BRANCH_REF,
    targetBranchObservedOid: FINAL_RELEASE_COMMIT,
    executionReceipt: receiptIdentity(OUTPUTS.execution, EXECUTION_RECEIPT_FILENAME, execution),
    bindingReceipt: receiptIdentity(OUTPUTS.binding, BINDING_RECEIPT_FILENAME, binding),
    claim: {
      claimId: claim.claimId,
      bindingHash: claim.bindingHash,
      finalState: claim.state,
      authorizationUseCount: claim.authorizationUseCount,
      authorizationConsumed: claim.authorizationConsumed,
      authorizationReplayAllowed: claim.authorizationReplayAllowed,
      detachedCommitInvocationCount: claim.detachedCommitInvocationCount,
      branchRefUpdateCount: claim.branchRefUpdateCount
    },
    verification: {
      executionReceiptAccepted: true,
      bindingReceiptAccepted: true,
      durableDetachedBindingAccepted: true,
      exactNineModifiedPaths: true
    },
    currentState: {
      detachedStatusCommitBound: true,
      branchRefUpdated: false,
      statusSyncPerformed: false,
      currentBranchStatusSynchronized: false,
      readinessClaimed: false,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0
    }
  };
  const manifest = {
    schemaVersion: 1,
    taskId: 'CM-2124',
    artifactType: 'cm2124_status_sync_receipt_freeze_manifest_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
  return { execution, binding, manifest };
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  const artifacts = await buildFreezeArtifacts();
  const manifestText = serializeArtifact(artifacts.manifest);
  const markdownText = renderMarkdown(artifacts.manifest, manifestText);
  fs.writeFileSync(OUTPUTS.execution, artifacts.execution.bytes, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.binding, artifacts.binding.bytes, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.manifest, manifestText, { flag: 'wx' });
  fs.writeFileSync(OUTPUTS.markdown, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_RECEIPTS_FROZEN',
    freezeReference: artifacts.manifest.payload.freezeReference,
    manifestPayloadSha256: artifacts.manifest.canonicalPayloadSha256,
    executionReceipt: artifacts.manifest.payload.executionReceipt,
    bindingReceipt: artifacts.manifest.payload.bindingReceipt,
    detachedStatusCommit: DETACHED_STATUS_COMMIT,
    targetBranchOid: FINAL_RELEASE_COMMIT,
    branchRefUpdated: false,
    readinessClaimed: false
  })}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  DETACHED_STATUS_COMMIT,
  DETACHED_STATUS_TREE,
  EXPECTED,
  FINAL_RELEASE_COMMIT,
  OUTPUTS,
  PACKET_COMMIT,
  assertCm2124FreezeCleanWorktree,
  buildFreezeArtifacts,
  claimBoundReviewTime,
  governanceDescriptorPath,
  main,
  openVerifiedRootHandle,
  parseArgs,
  readExactReceipt,
  receiptIdentity,
  renderMarkdown
};
