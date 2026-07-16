#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  APPLICATION_MARKDOWN_PATH,
  APPLICATION_PATH,
  EXPECTED_OLD,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT,
  TARGET_REF,
  buildApplication,
  evaluateApplication,
  intakeUpstreamEvidence,
  serializeArtifact
} = require('../src/core/Cm2125ExactBranchCasApplication');
const {
  assertSafeGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitFile,
  resolveParentCommit
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2125_application_no_arguments_allowed');
}

function verifyTargetWorktree() {
  const blocks = gitText(['worktree', 'list', '--porcelain']).split(/\n\n+/).filter(Boolean);
  const matches = blocks.map(block => Object.fromEntries(block.split('\n').map(line => {
    const separator = line.indexOf(' ');
    return separator === -1 ? [line, true] : [line.slice(0, separator), line.slice(separator + 1)];
  }))).filter(item => item.branch === TARGET_REF);
  if (matches.length !== 1 || matches[0].HEAD !== EXPECTED_OLD || typeof matches[0].worktree !== 'string') {
    throw new Error('cm2125_exact_checked_out_target_worktree_required');
  }
  if (gitText(['-C', matches[0].worktree, 'status', '--porcelain', '--untracked-files=all']) !== '') {
    throw new Error('cm2125_clean_target_worktree_required');
  }
  return true;
}

function implementationIdentity() {
  const options = resolverOptions();
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const parentCommit = resolveParentCommit(commit);
  const diffPaths = resolveDiffPaths(parentCommit, commit).sort();
  const diffEntries = options.resolveDiffEntries(parentCommit, commit)
    .sort((left, right) => left.path.localeCompare(right.path));
  if (parentCommit !== IMPLEMENTATION_PARENT.commit || resolveCommitTree(parentCommit) !== IMPLEMENTATION_PARENT.tree ||
      JSON.stringify(diffPaths) !== JSON.stringify(IMPLEMENTATION_DIFF_PATHS)) {
    throw new Error('cm2125_exact_implementation_freeze_required');
  }
  return {
    commit,
    tree: resolveCommitTree(commit),
    parentCommit,
    parentTree: resolveCommitTree(parentCommit),
    diffPaths,
    diffPathsSha256: sha256Canonical(diffPaths),
    diffEntries,
    diffEntriesSha256: sha256Canonical(diffEntries),
    artifacts: IMPLEMENTATION_DIFF_PATHS.map(sourcePath => {
      const identity = resolveGitFile(commit, sourcePath);
      return { path: sourcePath, blobOid: identity.blobOid, bytes: identity.bytes, sha256: identity.sha256 };
    })
  };
}

function renderMarkdown(application, jsonText) {
  return [
    '# CM-2125 Exact Branch CAS Application',
    '',
    `Application reference: \`${application.payload.applicationReference}\``,
    `Canonical payload SHA-256: \`${application.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_APPLICATION_PREPARED_ONLY.',
    '',
    'This application requests a future exact local branch compare-and-swap from',
    '`869d9d6e...` to `eb016872...`. It does not authorize or execute the ref',
    'update. A separate content decision, non-executing packet, and final execution',
    'release remain required. Remote actions and readiness remain unauthorized.',
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
  if (gitText(['status', '--porcelain', '--untracked-files=all']) !== '') {
    throw new Error('cm2125_clean_worktree_required');
  }
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2125_detached_worktree_required');
  if (gitText(['show-ref', '--hash', '--verify', TARGET_REF]) !== EXPECTED_OLD) {
    throw new Error('cm2125_target_ref_expected_old_required');
  }
  verifyTargetWorktree();
  if (fs.existsSync(APPLICATION_PATH) || fs.existsSync(APPLICATION_MARKDOWN_PATH)) {
    throw new Error('cm2125_application_already_exists');
  }
  const options = resolverOptions();
  const upstreamEvidence = intakeUpstreamEvidence(options);
  if (!upstreamEvidence.accepted) throw new Error(`cm2125_upstream_rejected:${upstreamEvidence.blockers.join(',')}`);
  const implementation = implementationIdentity();
  const application = buildApplication({ implementation, upstreamEvidence });
  const evaluation = evaluateApplication(application, options);
  if (!evaluation.accepted) throw new Error(`cm2125_application_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(application);
  const markdownText = renderMarkdown(application, jsonText);
  fs.writeFileSync(APPLICATION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(APPLICATION_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_APPLICATION_PREPARED_ONLY',
    applicationReference: application.payload.applicationReference,
    canonicalPayloadSha256: application.canonicalPayloadSha256,
    implementationCommit: implementation.commit,
    targetRef: TARGET_REF,
    expectedOld: application.payload.target.expectedOld,
    newCommit: application.payload.target.newCommit,
    freezeCommit: application.payload.receiptEvidence.freezeCommit,
    reviewCommit: application.payload.receiptEvidence.reviewCommit,
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    branchRefUpdated: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false,
    remoteActions: 0
  })}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  implementationIdentity,
  main,
  parseArgs,
  renderMarkdown,
  verifyTargetWorktree
};
