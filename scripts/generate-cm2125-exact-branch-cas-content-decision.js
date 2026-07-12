#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  APPLICATION_COMMIT,
  DECISION_MARKDOWN_PATH,
  DECISION_PATH,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  buildDecision,
  evaluateDecision,
  intakeApplication,
  serializeArtifact
} = require('../src/core/Cm2125ExactBranchCasContentDecision');
const {
  EXPECTED_OLD,
  TARGET_REF
} = require('../src/core/Cm2125ExactBranchCasApplication');
const {
  assertSafeGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');
const {
  verifyTargetWorktree
} = require('./generate-cm2125-exact-branch-cas-application');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2125_content_decision_no_arguments_allowed');
  return {};
}

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function buildImplementationIdentity(options) {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const parentCommit = gitText(['rev-parse', 'HEAD^']);
  const diffPaths = options.resolveDiffPaths(parentCommit, commit).sort();
  const diffEntries = options.resolveDiffEntries(parentCommit, commit)
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    commit,
    tree: gitText(['rev-parse', 'HEAD^{tree}']),
    parentCommit,
    parentTree: gitText(['rev-parse', `${parentCommit}^{tree}`]),
    diffPaths,
    diffEntries,
    diffPathsSha256: sha256Canonical(diffPaths),
    diffEntriesSha256: sha256Canonical(diffEntries),
    artifacts: IMPLEMENTATION_DIFF_PATHS.map(sourcePath => {
      const identity = options.resolveGitFile(commit, sourcePath);
      return {
        path: sourcePath,
        blobOid: identity.blobOid,
        bytes: identity.bytes,
        sha256: identity.sha256
      };
    })
  };
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2125 Exact Branch CAS Content Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_EXACT_BRANCH_CAS_CONTENT_DECISION_PREPARED_ONLY.',
    '',
    'This decision approves only the static content of a future exact local',
    'branch compare-and-swap. It does not authorize execution, claim creation,',
    'branch ref update, linked-worktree index or file synchronization, remote',
    'action, or current-branch status synchronization. A frozen executor,',
    'non-executing packet, and separate final execution release remain required.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  assertSafeGitEnvironment();
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2125_content_decision_clean_worktree_required');
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2125_content_decision_detached_worktree_required');
  if (gitText(['show-ref', '--hash', '--verify', TARGET_REF]) !== EXPECTED_OLD) {
    throw new Error('cm2125_content_decision_target_ref_expected_old_required');
  }
  verifyTargetWorktree();
  if (fs.existsSync(DECISION_PATH) || fs.existsSync(DECISION_MARKDOWN_PATH)) {
    throw new Error('cm2125_content_decision_already_exists');
  }
  execFileSync('git', ['merge-base', '--is-ancestor', APPLICATION_COMMIT, 'HEAD'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'ignore', 'pipe']
  });
  const options = resolverOptions();
  const applicationEvidence = intakeApplication(options);
  if (!applicationEvidence.accepted) {
    throw new Error(`cm2125_branch_cas_application_rejected:${applicationEvidence.blockers.join(',')}`);
  }
  const implementation = buildImplementationIdentity(options);
  if (JSON.stringify(implementation.diffPaths) !== JSON.stringify(IMPLEMENTATION_DIFF_PATHS) ||
      JSON.stringify(implementation.diffEntries) !== JSON.stringify(IMPLEMENTATION_DIFF_ENTRIES)) {
    throw new Error('cm2125_content_decision_exact_implementation_diff_required');
  }
  const decision = buildDecision({ applicationEvidence, implementation });
  const evaluation = evaluateDecision(decision, { implementation, ...options });
  if (!evaluation.accepted) throw new Error(`cm2125_content_decision_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = renderMarkdown(decision, jsonText);
  fs.writeFileSync(DECISION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(DECISION_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_EXACT_BRANCH_CAS_CONTENT_DECISION_PREPARED_ONLY',
    decisionReference: decision.payload.decisionReference,
    canonicalPayloadSha256: decision.canonicalPayloadSha256,
    applicationCommit: APPLICATION_COMMIT,
    targetRef: TARGET_REF,
    expectedOld: EXPECTED_OLD,
    newCommit: decision.payload.exactCasContent.target.newCommit,
    authorizationContentApproved: true,
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    targetWorktreeIndexSynchronizationAuthorized: false,
    targetWorktreeFileSynchronizationAuthorized: false,
    branchRefUpdated: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false,
    remoteActions: 0,
    nativeReads: 0,
    nativeWrites: 0,
    providerCalls: 0,
    realMemoryReads: 0
  })}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  buildImplementationIdentity,
  gitText,
  main,
  parseArgs,
  renderMarkdown
};
