#!/usr/bin/env node
'use strict';

const path = require('node:path');

const {
  assertSafeGitEnvironment,
  CONTENT_DECISION_FREEZE,
  executeFullPlanApplicationFromCommits
} = require('../core/Cm2118FullPlanApplicationExecution');
const {
  gitText
} = require('../../scripts/cm2115-r2-git');

function parseArgs(argv) {
  const expected = new Set([
    '--authorization-content-decision-commit',
    '--execution-packet-commit',
    '--final-execution-release-decision-commit'
  ]);
  if (argv.length !== 6) throw new Error('cm2118_exact_three_commit_arguments_required');
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!expected.has(key) || !/^[a-f0-9]{40}$/.test(value || '') || Object.hasOwn(result, key)) {
      throw new Error('cm2118_exact_three_commit_arguments_required');
    }
    result[key] = value;
  }
  if (Object.keys(result).length !== expected.size) throw new Error('cm2118_exact_three_commit_arguments_required');
  return {
    authorizationContentDecisionCommit: result['--authorization-content-decision-commit'],
    executionPacketCommit: result['--execution-packet-commit'],
    finalExecutionReleaseDecisionCommit: result['--final-execution-release-decision-commit']
  };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  assertSafeGitEnvironment();
  if (path.resolve(gitText(['rev-parse', '--show-toplevel'])) !== path.resolve(process.cwd())) {
    throw new Error('cm2118_application_repository_root_required');
  }
  if (args.authorizationContentDecisionCommit !== CONTENT_DECISION_FREEZE.commit) {
    throw new Error('cm2118_exact_content_decision_commit_required');
  }
  const result = await executeFullPlanApplicationFromCommits({
    authorizationContentDecisionCommit: args.authorizationContentDecisionCommit,
    packetCommit: args.executionPacketCommit,
    finalReleaseCommit: args.finalExecutionReleaseDecisionCommit
  });
  process.stdout.write(`${JSON.stringify({
    status: result.accepted ? 'PASS_APPLICATION_COMMIT_BOUND' : 'STOPPED',
    state: result.state,
    applicationCommit: result.application?.commit || null,
    applicationTree: result.application?.tree || null,
    authorizationConsumed: result.authorizationConsumed === true,
    authorizationReplayAllowed: false,
    fullPlanPackCompleted: result.fullPlanPackCompleted === true,
    statusSyncAuthorized: false,
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
