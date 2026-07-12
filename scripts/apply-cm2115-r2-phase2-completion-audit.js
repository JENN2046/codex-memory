#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  AUTHORITY_PATH,
  Cm2115R2ApplicationClaimRegistry,
  DECISION_PATH,
  DECISION_REFERENCE,
  EXECUTION_RECEIPT_PATH,
  buildClaimBindingHash,
  evaluateDecision,
  executeExactPatch,
  identityWithoutContent,
  sha256
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitFile,
  resolveGovernanceRegistryRoot,
  resolveParentCommit
} = require('./cm2115-r2-git');

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--decision-commit' || !/^[a-f0-9]{40}$/.test(argv[1])) {
    throw new Error('cm2115_r2_exact_decision_commit_required_no_other_arguments');
  }
  return { decisionCommit: argv[1] };
}

async function main(argv = process.argv.slice(2)) {
  const { decisionCommit } = parseArgs(argv);
  ensureCleanWorktree();
  const head = gitText(['rev-parse', 'HEAD^{commit}']);
  if (head !== decisionCommit) throw new Error('cm2115_r2_head_must_equal_decision_commit');
  if (fs.existsSync(EXECUTION_RECEIPT_PATH) || fs.existsSync(EXECUTION_RECEIPT_PATH.replace(/\.json$/, '.md'))) {
    throw new Error('cm2115_r2_execution_receipt_already_exists');
  }
  const decisionIdentity = resolveGitFile(decisionCommit, DECISION_PATH);
  const decision = JSON.parse(decisionIdentity.content.toString('utf8'));
  const evaluation = evaluateDecision(decision, { resolveGitFile });
  if (!evaluation.accepted) throw new Error(`cm2115_r2_decision_rejected:${evaluation.blockers.join(',')}`);
  const baselineCommit = decision.payload.patchPlan.baselineCommit;
  const baselineTree = decision.payload.patchPlan.baselineTree;
  if (resolveParentCommit(decisionCommit) !== baselineCommit || resolveCommitTree(baselineCommit) !== baselineTree) {
    throw new Error('cm2115_r2_decision_lineage_mismatch');
  }
  const expectedDecisionPaths = [DECISION_PATH, DECISION_PATH.replace(/\.json$/, '.md')].sort();
  const decisionPaths = resolveDiffPaths(baselineCommit, decisionCommit);
  if (JSON.stringify(decisionPaths) !== JSON.stringify(expectedDecisionPaths)) throw new Error('cm2115_r2_decision_commit_diff_not_exact');
  const authorityIdentity = resolveGitFile(decision.payload.authority.sourceCommit, AUTHORITY_PATH);
  const registry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: resolveGovernanceRegistryRoot() });
  const result = await executeExactPatch({
    repoRoot: process.cwd(),
    decision,
    decisionIdentity,
    authorityIdentity,
    resolveGitFile,
    registry
  });
  if (!result.accepted) throw new Error(`cm2115_r2_application_rejected:${result.blockers.join(',')}`);
  const finalClaim = await registry.read(buildClaimBindingHash(identityWithoutContent(decisionIdentity), decision));
  if (finalClaim.state !== 'CONSUMED_SUCCESS' || finalClaim.patchInvocationCount !== 1) {
    throw new Error('cm2115_r2_claim_final_state_invalid');
  }
  process.stdout.write(`${JSON.stringify({status:'PASS_EXACT_PATCH_EXECUTED_AWAITING_GIT_BINDING',decisionCommit,decisionTree:decisionIdentity.sourceTree,patchPayloadSha256:decision.payload.patchPlan.patchPayloadSha256,executionReceiptPath:EXECUTION_RECEIPT_PATH,executionReceiptPayloadSha256:result.receipt.canonicalPayloadSha256,claimId:finalClaim.claimId,claimState:finalClaim.state,patchInvocationCount:finalClaim.patchInvocationCount,applicationCommitBound:false,phase2ReceiptBundleAppliedToCompletionAudit:false,independentReviewPassed:false,fullPlanPackCompleted:false,readinessClaimed:false})}\n`);
}

if (require.main === module) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1); });
}

module.exports = { main, parseArgs };
