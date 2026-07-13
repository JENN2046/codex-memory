#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  BINDING_RECEIPT_V2_PATH,
  Cm2115R2ApplicationClaimRegistry,
  DECISION_PATH,
  EXECUTION_RECEIPT_MARKDOWN_PATH,
  EXECUTION_RECEIPT_PATH,
  buildBindingReceiptV2Payload,
  buildClaimBindingHash,
  evaluateBindingReceipt,
  evaluateDecision,
  identityWithoutContent,
  serializeArtifact,
  sha256Canonical,
  wrapPayload
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveDurableClaim,
  resolveGitFile,
  resolveGitPathState,
  resolveGovernanceRegistryRoot,
  resolveParentCommit
} = require('./cm2115-r2-git');

const APPLICATION_COMMIT = '49979a55dcee30c11f2bb13ea07d1cbf1e8024f1';
const MARKDOWN_PATH = BINDING_RECEIPT_V2_PATH.replace(/\.json$/, '.md');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2115_r2_strengthened_binding_receipt_no_arguments_allowed');
  return {};
}

function assertApplicationAncestorOfHead() {
  execFileSync('git', ['merge-base', '--is-ancestor', APPLICATION_COMMIT, 'HEAD'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'ignore', 'pipe']
  });
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  ensureCleanWorktree();
  assertApplicationAncestorOfHead();
  if (fs.existsSync(BINDING_RECEIPT_V2_PATH) || fs.existsSync(MARKDOWN_PATH)) {
    throw new Error('cm2115_r2_strengthened_binding_receipt_exists');
  }

  const applicationTree = resolveCommitTree(APPLICATION_COMMIT);
  const parentCommit = resolveParentCommit(APPLICATION_COMMIT);
  const parentTree = resolveCommitTree(parentCommit);
  const decisionIdentity = resolveGitFile(parentCommit, DECISION_PATH);
  const decision = JSON.parse(decisionIdentity.content.toString('utf8'));
  const decisionEvaluation = evaluateDecision(decision, { resolveGitFile });
  if (!decisionEvaluation.accepted) {
    throw new Error(`cm2115_r2_decision_rejected:${decisionEvaluation.blockers.join(',')}`);
  }
  const executionReceiptIdentity = resolveGitFile(APPLICATION_COMMIT, EXECUTION_RECEIPT_PATH);
  const executionReceiptMarkdownIdentity = resolveGitFile(APPLICATION_COMMIT, EXECUTION_RECEIPT_MARKDOWN_PATH);
  const diffPaths = resolveDiffPaths(parentCommit, APPLICATION_COMMIT);
  const payload = buildBindingReceiptV2Payload({
    applicationCommit: APPLICATION_COMMIT,
    applicationTree,
    applicationParentCommit: parentCommit,
    applicationParentTree: parentTree,
    decisionIdentity,
    executionReceiptIdentity,
    executionReceiptMarkdownIdentity,
    decision,
    diffPathsSha256: sha256Canonical(diffPaths)
  });
  const receipt = wrapPayload(payload, 'phase2_exact_patch_application_git_binding_receipt_v2');
  const evaluation = evaluateBindingReceipt(receipt, {
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveGitPathState,
    resolveDurableClaim
  });
  if (!evaluation.accepted) {
    throw new Error(`cm2115_r2_strengthened_binding_receipt_rejected:${evaluation.blockers.join(',')}`);
  }

  const registry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: resolveGovernanceRegistryRoot() });
  const bindingHash = buildClaimBindingHash(identityWithoutContent(decisionIdentity), decision);
  const claim = await registry.read(bindingHash);
  if (claim.state !== 'CONSUMED_SUCCESS' || claim.patchInvocationCount !== 1) {
    throw new Error('cm2115_r2_claim_not_consumed_success');
  }

  const jsonText = serializeArtifact(receipt);
  const markdownText = [
    '# CM-2115-R2 Strengthened Phase 2 Application Binding Receipt',
    '',
    `Application commit: \`${APPLICATION_COMMIT}\``,
    `Canonical payload SHA-256: \`${receipt.canonicalPayloadSha256}\``,
    '',
    'This v2 receipt additionally binds the exact execution-receipt Markdown',
    'blob and uses typed Git path-state verification for the add-only target.',
    'It performs no patch, native-memory, provider, real-memory, or remote action.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(BINDING_RECEIPT_V2_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_STRENGTHENED_APPLICATION_COMMIT_BOUND',
    applicationCommit: APPLICATION_COMMIT,
    applicationTree,
    parentCommit,
    executionReceiptBlobOid: executionReceiptIdentity.blobOid,
    executionReceiptMarkdownBlobOid: executionReceiptMarkdownIdentity.blobOid,
    bindingReceiptPayloadSha256: receipt.canonicalPayloadSha256,
    claimState: claim.state,
    phase2ReceiptBundleAppliedToCompletionAudit: true,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  })}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  APPLICATION_COMMIT,
  MARKDOWN_PATH,
  main,
  parseArgs
};
