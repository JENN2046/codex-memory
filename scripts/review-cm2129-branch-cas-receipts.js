#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const execution = require('../src/core/Cm2126ExactBranchCasExecution');
const constants = require('../src/core/Cm2126ExactBranchCasConstants');
const {
  Cm2126ExactBranchCasClaimRegistry,
  SUCCESS_STATE,
  claimFileName
} = require('../src/core/Cm2126ExactBranchCasClaimRegistry');
const {
  evaluateExecutionReceipt
} = require('../src/core/Cm2126ExactBranchCasReceiptContract');
const {
  assertSafeGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  sameJson,
  serializeArtifact
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  CONTENT_COMMIT,
  CURRENT_BOUNDARY,
  EXPECTED,
  FINAL_RELEASE_COMMIT,
  FREEZE_VERIFICATION,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  OUTPUTS,
  PACKET_COMMIT,
  assertCleanDetachedWorktree,
  assertLowDisclosure,
  gitIdentityWithoutContent,
  projectClaim,
  projectExecutionReceipt,
  receiptIdentity,
  renderMarkdown: renderFreezeMarkdown,
  sha256
} = require('./freeze-cm2128-branch-cas-receipts');
const {
  gitText
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const REVIEW_PATH = 'docs/near-model-memory-plan-pack/cm2129_branch_cas_receipt_review.json';
const REVIEW_MARKDOWN_PATH = REVIEW_PATH.replace(/\.json$/, '.md');
const FREEZE_DIFF_PATHS = Object.freeze(Object.values(OUTPUTS).sort());
const FREEZE_DIFF_ENTRIES = Object.freeze(FREEZE_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2129_review_no_arguments_allowed');
}

function assertPathAbsent(entryPath) {
  try {
    fs.lstatSync(entryPath);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`cm2129_review_output_already_exists:${entryPath}`);
}

function renderMarkdown(review, jsonText) {
  return [
    '# CM-2129 Branch CAS Receipt Independent Review',
    '',
    `Review reference: \`${review.payload.reviewReference}\``,
    `Canonical payload SHA-256: \`${review.canonicalPayloadSha256}\``,
    '',
    'Result: PASS.',
    '',
    'The Git-frozen claim and execution receipt were independently revalidated against',
    'their exact upstream decisions, durable one-shot registry, and current target',
    'postconditions. This review grants no replay, ref, remote, native-memory,',
    'release/deploy/cutover, or readiness authority.',
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
  try {
    assertCleanDetachedWorktree();
  } catch (error) {
    if (error.message === 'cm2128_clean_detached_worktree_required') {
      throw new Error('cm2129_clean_detached_worktree_required');
    }
    throw error;
  }
  assertPathAbsent(REVIEW_PATH);
  assertPathAbsent(REVIEW_MARKDOWN_PATH);
  const options = resolverOptions();
  const freezeCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const freezeTree = options.resolveCommitTree(freezeCommit);
  const implementationCommit = options.resolveParentCommit(freezeCommit);
  const implementationParent = options.resolveParentCommit(implementationCommit);
  const implementationPaths = options.resolveDiffPaths(implementationParent, implementationCommit).sort();
  const implementationEntries = options.resolveDiffEntries(implementationParent, implementationCommit)
    .sort((left, right) => left.path.localeCompare(right.path));
  const freezePaths = options.resolveDiffPaths(implementationCommit, freezeCommit).sort();
  const freezeEntries = options.resolveDiffEntries(implementationCommit, freezeCommit)
    .sort((left, right) => left.path.localeCompare(right.path));
  if (implementationParent !== FINAL_RELEASE_COMMIT || !sameJson(implementationPaths, IMPLEMENTATION_DIFF_PATHS) ||
      !sameJson(implementationEntries, IMPLEMENTATION_DIFF_ENTRIES) ||
      !sameJson(freezePaths, FREEZE_DIFF_PATHS) || !sameJson(freezeEntries, FREEZE_DIFF_ENTRIES)) {
    throw new Error('cm2129_freeze_lineage_or_diff_rejected');
  }
  const manifestIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.manifest);
  const markdownIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.markdown);
  const claimIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.claim);
  const executionIdentity = options.resolveGitFile(freezeCommit, OUTPUTS.execution);
  const manifest = JSON.parse(manifestIdentity.content.toString('utf8'));
  const frozenClaim = JSON.parse(claimIdentity.content.toString('utf8'));
  const frozenReceipt = JSON.parse(executionIdentity.content.toString('utf8'));
  if (manifest.schemaVersion !== 1 || manifest.taskId !== 'CM-2128' ||
      manifest.artifactType !== 'cm2128_branch_cas_receipt_freeze_manifest_v1' ||
      manifest.canonicalPayloadSha256 !== sha256Canonical(manifest.payload || {}) ||
      manifest.payload.freezeImplementationCommit !== implementationCommit ||
      manifest.payload.freezeImplementationParent !== FINAL_RELEASE_COMMIT ||
      manifest.payload.freezeImplementationTree !== options.resolveCommitTree(implementationCommit) ||
      !sameJson(manifest.payload.freezeImplementationDiffPaths, implementationPaths) ||
      !sameJson(manifest.payload.freezeImplementationDiffEntries, implementationEntries) ||
      !sameJson(manifest.payload.freezeImplementationArtifacts,
        IMPLEMENTATION_DIFF_PATHS.map(sourcePath =>
          gitIdentityWithoutContent(options.resolveGitFile(implementationCommit, sourcePath)))) ||
      manifest.payload.contentDecisionCommit !== CONTENT_COMMIT ||
      manifest.payload.executionPacketCommit !== PACKET_COMMIT ||
      manifest.payload.finalReleaseCommit !== FINAL_RELEASE_COMMIT ||
      manifest.payload.targetRef !== constants.TARGET_REF ||
      manifest.payload.targetCommit !== constants.NEW_COMMIT || manifest.payload.targetTree !== constants.NEW_TREE) {
    throw new Error('cm2129_manifest_rejected');
  }
  const expectedFreezeMarkdown = renderFreezeMarkdown(manifest, manifestIdentity.content.toString('utf8'));
  if (!markdownIdentity.content.equals(Buffer.from(expectedFreezeMarkdown, 'utf8'))) {
    throw new Error('cm2129_freeze_markdown_mirror_rejected');
  }
  for (const [identity, expected] of [
    [claimIdentity, manifest.payload.claimReceipt],
    [executionIdentity, manifest.payload.executionReceipt]
  ]) {
    if (identity.gitMode !== expected.gitMode || identity.gitObjectType !== 'blob' ||
        identity.blobOid !== expected.blobOid || identity.bytes !== expected.bytes ||
        identity.sha256 !== expected.sha256) {
      throw new Error('cm2129_frozen_receipt_identity_rejected');
    }
  }
  if (!sameJson(manifest.payload.claimReceipt, receiptIdentity(
    OUTPUTS.claim,
    manifest.payload.claimReceipt.sourceFilename,
    { bytes: claimIdentity.content, value: frozenClaim }
  )) || !sameJson(manifest.payload.executionReceipt, receiptIdentity(
    OUTPUTS.execution,
    manifest.payload.executionReceipt.sourceFilename,
    { bytes: executionIdentity.content, value: frozenReceipt }
  ))) {
    throw new Error('cm2129_manifest_receipt_projection_rejected');
  }
  if (claimIdentity.bytes !== EXPECTED.claim.bytes || claimIdentity.sha256 !== EXPECTED.claim.sha256 ||
      executionIdentity.bytes !== EXPECTED.execution.bytes || executionIdentity.sha256 !== EXPECTED.execution.sha256 ||
      frozenReceipt.canonicalPayloadSha256 !== EXPECTED.execution.canonicalPayloadSha256) {
    throw new Error('cm2129_expected_receipt_identity_rejected');
  }
  assertLowDisclosure(manifest);
  assertLowDisclosure(frozenClaim);
  assertLowDisclosure(frozenReceipt);

  const target = execution.deriveTargetWorktree(process.cwd());
  const packetEvidence = execution.intakeExecutionPacket({
    packetCommit: PACKET_COMMIT,
    targetWorktreeIdentity: target.publicIdentity,
    ...options
  });
  const releaseJson = JSON.parse(options.resolveGitFile(
    FINAL_RELEASE_COMMIT,
    execution.FINAL_RELEASE_PATH
  ).content.toString('utf8'));
  const finalReleaseEvidence = execution.intakeFinalReleaseDecision({
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    packetEvidence,
    now: new Date(Date.parse(releaseJson.payload.authorization.approvedAt) + 1),
    ...options
  });
  const contentEvidence = execution.intakeContentDecision(options);
  if (!contentEvidence.accepted || !packetEvidence.accepted || !finalReleaseEvidence.accepted) {
    throw new Error('cm2129_upstream_intake_rejected');
  }
  const bindingHash = execution.buildClaimBindingHash({ packetEvidence, finalReleaseEvidence });
  const release = execution.releaseBinding(packetEvidence, finalReleaseEvidence, bindingHash);
  const governanceRoot = execution.resolveFixedGovernanceRoot(process.cwd());
  const registry = new Cm2126ExactBranchCasClaimRegistry({ governanceRoot });
  const liveClaim = await registry.read(bindingHash, release);
  const liveClaimBytes = fs.readFileSync(path.join(governanceRoot, claimFileName()));
  const liveReceiptBytes = fs.readFileSync(path.join(governanceRoot, execution.EXECUTION_RECEIPT_FILENAME));
  if (!sameJson(liveClaim, frozenClaim) || !liveClaimBytes.equals(claimIdentity.content) ||
      !liveReceiptBytes.equals(executionIdentity.content) || liveClaim.state !== SUCCESS_STATE ||
      liveClaim.authorizationReplayAllowed !== false || liveClaim.executionReceiptSha256 !== executionIdentity.sha256) {
    throw new Error('cm2129_live_governance_binding_rejected');
  }
  if (manifest.payload.bindingHash !== bindingHash ||
      !sameJson(manifest.payload.claimProjection, projectClaim(liveClaim)) ||
      !sameJson(manifest.payload.executionProjection, projectExecutionReceipt(frozenReceipt)) ||
      !sameJson(manifest.payload.verification, FREEZE_VERIFICATION) ||
      !sameJson(manifest.payload.currentBoundary, CURRENT_BOUNDARY)) {
    throw new Error('cm2129_manifest_evidence_projection_rejected');
  }
  const runtimeResult = {
    targetWorktreeIdentitySha256: frozenReceipt.payload.exactTarget.targetWorktreeIdentitySha256,
    ...frozenReceipt.payload.executionResult
  };
  const preReceiptClaim = {
    ...liveClaim,
    state: 'EXECUTION_RECEIPT_WRITE_CONSUMED',
    executionReceiptWrites: null,
    executionReceiptSha256: null,
    terminalStateDurablyRecorded: false,
    reconciliationRequired: true
  };
  const receiptEvaluation = evaluateExecutionReceipt(frozenReceipt, {
    packetEvidence,
    finalReleaseEvidence,
    claimEnvelope: preReceiptClaim,
    bindingHash,
    runtimeResult
  });
  const durable = await execution.evaluateDurableBranchCas({
    contentDecisionCommit: CONTENT_COMMIT,
    packetCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT
  });
  const after = execution.targetSnapshot(
    process.cwd(),
    target,
    packetEvidence.packet.payload.exactCasBoundary.targetBindings,
    'after'
  );
  if (!receiptEvaluation.accepted || !durable.accepted || after.ref !== constants.NEW_COMMIT ||
      after.head !== constants.NEW_COMMIT || after.symbolicRef !== constants.TARGET_REF ||
      after.indexTree !== constants.NEW_TREE || !after.indexPolicyMatched || !after.indexLockAbsent ||
      after.matchedFiles !== 9 || !after.clean ||
      frozenReceipt.payload.executionResult.otherRefUpdates !== 0 ||
      Object.values(frozenReceipt.payload.prohibitedSideEffects).some(value => value !== 0) ||
      Object.values(frozenReceipt.payload.currentBranchOutcome.readiness).some(value => value !== false)) {
    throw new Error('cm2129_independent_revalidation_rejected');
  }

  const freezeArtifacts = Object.fromEntries([
    [OUTPUTS.claim, claimIdentity],
    [OUTPUTS.execution, executionIdentity],
    [OUTPUTS.manifest, manifestIdentity],
    [OUTPUTS.markdown, markdownIdentity]
  ].map(([sourcePath, identity]) => [sourcePath, {
    gitMode: identity.gitMode,
    gitObjectType: identity.gitObjectType,
    blobOid: identity.blobOid,
    bytes: identity.bytes,
    sha256: identity.sha256
  }]));

  const payload = {
    reviewReference: `CM-2129-BRANCH-CAS-RECEIPT-REVIEW-PASS-${executionIdentity.sha256.slice(0, 8)}-${claimIdentity.sha256.slice(0, 8)}`.toUpperCase(),
    freezeCommit,
    freezeTree,
    freezeParentCommit: implementationCommit,
    freezeDiffPaths: freezePaths,
    freezeDiffEntries: freezeEntries,
    implementationCommit,
    implementationParent,
    implementationDiffPaths: implementationPaths,
    implementationDiffEntries: implementationEntries,
    freezeArtifacts,
    manifest: {
      path: OUTPUTS.manifest,
      blobOid: manifestIdentity.blobOid,
      bytes: manifestIdentity.bytes,
      sha256: manifestIdentity.sha256,
      canonicalPayloadSha256: manifest.canonicalPayloadSha256
    },
    claimReceipt: manifest.payload.claimReceipt,
    executionReceipt: manifest.payload.executionReceipt,
    contentDecisionCommit: CONTENT_COMMIT,
    executionPacketCommit: PACKET_COMMIT,
    finalReleaseCommit: FINAL_RELEASE_COMMIT,
    targetRef: constants.TARGET_REF,
    targetCommit: constants.NEW_COMMIT,
    targetTree: constants.NEW_TREE,
    bindingHash,
    verification: {
      contentGitIntakeAccepted: true,
      packetGitIntakeAccepted: true,
      finalReleaseGitIntakeAccepted: true,
      frozenClaimGitIdentityAccepted: true,
      frozenExecutionReceiptGitIdentityAccepted: true,
      liveClaimMatchesFrozenBytes: true,
      liveExecutionReceiptMatchesFrozenBytes: true,
      executionReceiptContractAccepted: true,
      durableExecutionAccepted: true,
      exactTargetPostconditionsAccepted: true,
      authorizationConsumed: true,
      authorizationReplayAllowed: false,
      otherRefUpdates: 0
    },
    currentBoundary: {
      branchRefUpdated: true,
      currentBranchStatusSynchronized: true,
      fullPlanPackCompleted: true,
      receiptFreezePerformed: true,
      additionalExecutionAttempts: 0,
      additionalBranchRefUpdates: 0,
      additionalReceiptWritesToGovernanceState: 0,
      replayAuthorized: false,
      remoteActions: 0,
      nativeReads: 0,
      nativeWrites: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      readinessClaimed: false
    }
  };
  const review = {
    schemaVersion: 1,
    taskId: 'CM-2129',
    artifactType: 'cm2129_branch_cas_receipt_independent_review_v1',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
  assertLowDisclosure(review);
  return review;
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  const review = await buildReview();
  const jsonText = serializeArtifact(review);
  const markdownText = renderMarkdown(review, jsonText);
  fs.writeFileSync(REVIEW_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(REVIEW_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_BRANCH_CAS_RECEIPTS_INDEPENDENTLY_REVIEWED',
    reviewReference: review.payload.reviewReference,
    canonicalPayloadSha256: review.canonicalPayloadSha256,
    freezeCommit: review.payload.freezeCommit,
    targetCommit: constants.NEW_COMMIT,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    additionalExecutionAttempts: 0,
    additionalBranchRefUpdates: 0,
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
  buildReview,
  main,
  parseArgs,
  renderMarkdown
};
