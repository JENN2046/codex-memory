#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  BINDING_RECEIPT_PATH,
  Cm2115R2ApplicationClaimRegistry,
  DECISION_PATH,
  EXECUTION_RECEIPT_PATH,
  buildBindingReceiptPayload,
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

const MARKDOWN_PATH = BINDING_RECEIPT_PATH.replace(/\.json$/, '.md');

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--application-commit' || !/^[a-f0-9]{40}$/.test(argv[1])) {
    throw new Error('cm2115_r2_exact_application_commit_required_no_other_arguments');
  }
  return { applicationCommit: argv[1] };
}

async function main(argv = process.argv.slice(2)) {
  const { applicationCommit } = parseArgs(argv);
  ensureCleanWorktree();
  if (gitText(['rev-parse', 'HEAD^{commit}']) !== applicationCommit) throw new Error('cm2115_r2_head_must_equal_application_commit');
  if (fs.existsSync(BINDING_RECEIPT_PATH) || fs.existsSync(MARKDOWN_PATH)) throw new Error('cm2115_r2_binding_receipt_exists');
  const applicationTree = resolveCommitTree(applicationCommit);
  const parentCommit = resolveParentCommit(applicationCommit);
  const parentTree = resolveCommitTree(parentCommit);
  const decisionIdentity = resolveGitFile(parentCommit, DECISION_PATH);
  const decision = JSON.parse(decisionIdentity.content.toString('utf8'));
  const decisionEvaluation = evaluateDecision(decision, { resolveGitFile });
  if (!decisionEvaluation.accepted) throw new Error(`cm2115_r2_decision_rejected:${decisionEvaluation.blockers.join(',')}`);
  const executionReceiptIdentity = resolveGitFile(applicationCommit, EXECUTION_RECEIPT_PATH);
  const diffPaths = resolveDiffPaths(parentCommit, applicationCommit);
  const payload = buildBindingReceiptPayload({
    applicationCommit,
    applicationTree,
    applicationParentCommit: parentCommit,
    applicationParentTree: parentTree,
    decisionIdentity,
    executionReceiptIdentity,
    decision,
    diffPathsSha256: sha256Canonical(diffPaths)
  });
  const receipt = wrapPayload(payload, 'phase2_exact_patch_application_git_binding_receipt_v1');
  const evaluation = evaluateBindingReceipt(receipt, {
    resolveGitFile,
    resolveGitPathState,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveDurableClaim
  });
  if (!evaluation.accepted) throw new Error(`cm2115_r2_binding_receipt_rejected:${evaluation.blockers.join(',')}`);
  const registry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: resolveGovernanceRegistryRoot() });
  const bindingHash = buildClaimBindingHash(identityWithoutContent(decisionIdentity), decision);
  const claim = await registry.read(bindingHash);
  if (claim.state !== 'CONSUMED_SUCCESS' || claim.patchInvocationCount !== 1) throw new Error('cm2115_r2_claim_not_consumed_success');
  const jsonText = serializeArtifact(receipt);
  const markdownText = [
    '# CM-2115-R2 Phase 2 Application Git Binding Receipt',
    '',
    `Application commit: \`${applicationCommit}\``,
    `Canonical payload SHA-256: \`${receipt.canonicalPayloadSha256}\``,
    '',
    'This receipt binds the exact application commit, direct parent, changed-path',
    'allowlist, target pre/post blobs, execution receipt, durable claim, CM-2080,',
    'Phase 2 manifest, and Windows/WSL receipt. It authorizes no later application.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(BINDING_RECEIPT_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({status:'PASS_APPLICATION_COMMIT_BOUND',applicationCommit,applicationTree,parentCommit,patchPayloadSha256:decision.payload.patchPlan.patchPayloadSha256,executionReceiptBlobOid:executionReceiptIdentity.blobOid,bindingReceiptPayloadSha256:receipt.canonicalPayloadSha256,claimState:claim.state,phase2ReceiptBundleAppliedToCompletionAudit:true,independentReviewPassed:false,fullPlanPackCompleted:false,readinessClaimed:false})}\n`);
}

if (require.main === module) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1); });
}

module.exports = { MARKDOWN_PATH, main, parseArgs };
