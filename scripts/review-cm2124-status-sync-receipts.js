#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const {
  CONTENT_DECISION_FREEZE,
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
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  serializeArtifact,
  sameJson
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  DETACHED_STATUS_COMMIT,
  DETACHED_STATUS_TREE,
  FINAL_RELEASE_COMMIT,
  OUTPUTS,
  PACKET_COMMIT,
  claimBoundReviewTime
} = require('./freeze-cm2124-status-sync-receipts');
const {
  gitText
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const REVIEW_PATH = 'docs/near-model-memory-plan-pack/cm2124_status_sync_receipt_review.json';
const REVIEW_MARKDOWN_PATH = REVIEW_PATH.replace(/\.json$/, '.md');
const FREEZE_DIFF_PATHS = Object.freeze(Object.values(OUTPUTS).sort());
const FREEZE_DIFF_ENTRIES = Object.freeze(FREEZE_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2124_review_no_arguments_allowed');
}

function assertCm2124ReviewCleanWorktree() {
  if (gitText(['status', '--porcelain', '--untracked-files=all']) !== '') {
    throw new Error('cm2124_review_clean_worktree_required');
  }
}

function renderMarkdown(review, jsonText) {
  return [
    '# CM-2124 Status-sync Receipt Independent Review',
    '',
    `Review reference: \`${review.payload.reviewReference}\``,
    `Canonical payload SHA-256: \`${review.canonicalPayloadSha256}\``,
    '',
    'Result: PASS.',
    '',
    'The two frozen receipts, detached 9M commit, one-shot claim, and target-branch',
    'non-update boundary were independently replayed. This review does not update',
    'the target branch or authorize Branch CAS, remote actions, or readiness.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

async function buildReview() {
  assertSafeGitEnvironment();
  assertCm2124ReviewCleanWorktree();
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2124_review_detached_worktree_required');
  if (fs.existsSync(REVIEW_PATH) || fs.existsSync(REVIEW_MARKDOWN_PATH)) throw new Error('cm2124_review_already_exists');
  const options = resolverOptions();
  const freezeCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const freezeTree = options.resolveCommitTree(freezeCommit);
  const implementationCommit = options.resolveParentCommit(freezeCommit);
  const paths = options.resolveDiffPaths(implementationCommit, freezeCommit).sort();
  const entries = options.resolveDiffEntries(implementationCommit, freezeCommit)
    .sort((left, right) => left.path.localeCompare(right.path));
  if (!sameJson(paths, FREEZE_DIFF_PATHS) || !sameJson(entries, FREEZE_DIFF_ENTRIES)) {
    throw new Error('cm2124_freeze_diff_rejected');
  }
  const manifestIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.manifest);
  const manifest = JSON.parse(manifestIdentity.content.toString('utf8'));
  if (manifest.schemaVersion !== 1 || manifest.taskId !== 'CM-2124' ||
      manifest.artifactType !== 'cm2124_status_sync_receipt_freeze_manifest_v1' ||
      manifest.canonicalPayloadSha256 !== sha256Canonical(manifest.payload || {}) ||
      manifest.payload.detachedStatusCommit !== DETACHED_STATUS_COMMIT ||
      manifest.payload.detachedStatusTree !== DETACHED_STATUS_TREE ||
      manifest.payload.targetBranchObservedOid !== FINAL_RELEASE_COMMIT) {
    throw new Error('cm2124_manifest_rejected');
  }
  const executionIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.execution);
  const bindingIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.binding);
  for (const [identity, expected] of [
    [executionIdentity, manifest.payload.executionReceipt],
    [bindingIdentity, manifest.payload.bindingReceipt]
  ]) {
    if (identity.gitMode !== expected.gitMode || identity.blobOid !== expected.blobOid ||
        identity.bytes !== expected.bytes || identity.sha256 !== expected.sha256) {
      throw new Error('cm2124_frozen_receipt_identity_rejected');
    }
  }
  const executionReceipt = JSON.parse(executionIdentity.content.toString('utf8'));
  const bindingReceipt = JSON.parse(bindingIdentity.content.toString('utf8'));
  const packetEvidence = intakeExecutionPacket({ packetCommit: PACKET_COMMIT, ...options });
  const finalReleaseEvidence = intakeFinalReleaseDecision({
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    packetEvidence,
    now: claimBoundReviewTime(executionReceipt),
    ...options
  });
  if (!packetEvidence.accepted || !finalReleaseEvidence.accepted) throw new Error('cm2124_upstream_intake_rejected');
  const bindingHash = buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const registry = new Cm2122StatusSyncClaimRegistry({ governanceRoot: resolveFixedGovernanceRoot() });
  const claim = await registry.read(bindingHash, finalReleaseEvidence);
  const detachedBinding = verifyDetachedCommitBinding({
    detachedCommit: DETACHED_STATUS_COMMIT,
    packetEvidence,
    finalReleaseEvidence,
    ...options
  });
  const executionEvaluation = evaluateExecutionReceipt(executionReceipt, { packetEvidence, finalReleaseEvidence });
  const preBindingClaim = {
    ...claim,
    state: 'EXECUTION_RECEIPT_WRITTEN',
    bindingReceiptCreated: false,
    bindingReceiptSha256: null,
    reconciliationRequired: true
  };
  const bindingEvaluation = evaluateBindingReceipt(bindingReceipt, {
    detachedBinding,
    executionReceipt,
    claimEnvelope: preBindingClaim,
    packetEvidence,
    finalReleaseEvidence
  });
  const durable = await evaluateDurableDetachedBinding({
    contentDecisionCommit: CONTENT_DECISION_FREEZE.commit,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
  if (!detachedBinding.accepted || !executionEvaluation.accepted || !bindingEvaluation.accepted || !durable.accepted ||
      gitText(['show-ref', '--hash', '--verify', FUTURE_BRANCH_REF]) !== FINAL_RELEASE_COMMIT) {
    throw new Error('cm2124_independent_replay_rejected');
  }
  const payload = {
    reviewReference: `CM-2124-RECEIPT-REVIEW-PASS-${executionIdentity.sha256.slice(0, 8)}-${bindingIdentity.sha256.slice(0, 8)}`.toUpperCase(),
    freezeCommit,
    freezeTree,
    freezeParentCommit: implementationCommit,
    freezeDiffPaths: paths,
    freezeDiffEntries: entries,
    manifest: {
      path: OUTPUTS.manifest,
      blobOid: manifestIdentity.blobOid,
      bytes: manifestIdentity.bytes,
      sha256: manifestIdentity.sha256,
      canonicalPayloadSha256: manifest.canonicalPayloadSha256
    },
    executionReceipt: manifest.payload.executionReceipt,
    bindingReceipt: manifest.payload.bindingReceipt,
    detachedStatusCommit: DETACHED_STATUS_COMMIT,
    detachedStatusTree: DETACHED_STATUS_TREE,
    detachedStatusParent: FINAL_RELEASE_COMMIT,
    verification: {
      packetGitIntakeAccepted: true,
      finalReleaseGitIntakeAccepted: true,
      executionReceiptAccepted: true,
      bindingReceiptAccepted: true,
      detachedCommitBindingAccepted: true,
      durableBindingAccepted: true,
      authorizationConsumed: true,
      authorizationReplayAllowed: false
    },
    currentBoundary: {
      targetBranchRef: FUTURE_BRANCH_REF,
      targetBranchOid: FINAL_RELEASE_COMMIT,
      branchRefUpdateAuthorized: false,
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
  return {
    schemaVersion: 1,
    taskId: 'CM-2124',
    artifactType: 'cm2124_status_sync_receipt_independent_review_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  const review = await buildReview();
  const jsonText = serializeArtifact(review);
  const markdownText = renderMarkdown(review, jsonText);
  fs.writeFileSync(REVIEW_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(REVIEW_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_RECEIPTS_INDEPENDENTLY_REVIEWED',
    reviewReference: review.payload.reviewReference,
    canonicalPayloadSha256: review.canonicalPayloadSha256,
    freezeCommit: review.payload.freezeCommit,
    detachedStatusCommit: DETACHED_STATUS_COMMIT,
    targetBranchOid: FINAL_RELEASE_COMMIT,
    branchRefUpdateAuthorized: false,
    branchRefUpdated: false,
    currentBranchStatusSynchronized: false,
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
  FREEZE_DIFF_ENTRIES,
  FREEZE_DIFF_PATHS,
  REVIEW_MARKDOWN_PATH,
  REVIEW_PATH,
  assertCm2124ReviewCleanWorktree,
  buildReview,
  main,
  parseArgs,
  renderMarkdown
};
