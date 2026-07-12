#!/usr/bin/env node
'use strict';

const path = require('node:path');
const {
  CONTENT_DECISION_FREEZE,
  executeBranchCasFromCommits
} = require('../core/Cm2126ExactBranchCasExecution');
const {
  assertSafeGitEnvironment
} = require('../core/Cm2122FullPlanStatusSyncExecution');
const {
  gitText
} = require('../../scripts/cm2115-r2-git');

function parseArgs(argv) {
  const expected = new Set([
    '--content-decision-commit',
    '--execution-packet-commit',
    '--final-execution-release-commit'
  ]);
  if (argv.length !== 6) throw new Error('cm2126_exact_three_commit_arguments_required');
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!expected.has(key) || !/^[a-f0-9]{40}$/.test(value || '') || Object.hasOwn(parsed, key)) {
      throw new Error('cm2126_exact_three_commit_arguments_required');
    }
    parsed[key] = value;
  }
  if (Object.keys(parsed).length !== expected.size) throw new Error('cm2126_exact_three_commit_arguments_required');
  return {
    contentDecisionCommit: parsed['--content-decision-commit'],
    packetCommit: parsed['--execution-packet-commit'],
    finalReleaseCommit: parsed['--final-execution-release-commit']
  };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  assertSafeGitEnvironment();
  if (path.resolve(gitText(['rev-parse', '--show-toplevel'])) !== path.resolve(process.cwd())) {
    throw new Error('cm2126_repository_root_required');
  }
  if (args.contentDecisionCommit !== CONTENT_DECISION_FREEZE.commit) {
    throw new Error('cm2126_exact_content_decision_commit_required');
  }
  const result = await executeBranchCasFromCommits(args);
  process.stdout.write(`${JSON.stringify({
    status: result.accepted ? 'PASS_EXACT_BRANCH_CAS_AND_WORKTREE_SYNC' : 'STOPPED',
    state: result.state,
    authorizationConsumed: result.authorizationConsumed === true,
    authorizationReplayAllowed: false,
    branchRefUpdated: result.branchRefUpdated === true,
    targetWorktreeIndexSynchronized: result.targetWorktreeIndexSynchronized === true,
    targetWorktreeFilesSynchronized: result.targetWorktreeFilesSynchronized === true,
    executionReceiptCreated: result.executionReceiptCreated === true,
    statusSyncPerformed: result.statusSyncPerformed === true,
    currentBranchStatusSynchronized: result.currentBranchStatusSynchronized === true,
    fullPlanPackCompleted: result.fullPlanPackCompleted === true,
    reconciliationReceipt: result.reconciliationReceipt || null,
    readinessClaimed: false,
    remoteActions: 0,
    nativeReads: 0,
    nativeWrites: 0,
    providerCalls: 0,
    realMemoryReads: 0
  })}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  parseArgs
};
