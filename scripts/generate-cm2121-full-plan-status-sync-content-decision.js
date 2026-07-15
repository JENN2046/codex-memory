#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  APPLICATION_COMMIT,
  DECISION_MARKDOWN_PATH,
  DECISION_PATH,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  buildDecision,
  evaluateDecision,
  intakeApplication,
  serializeArtifact
} = require('../src/core/Cm2121FullPlanStatusSyncContentDecision');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  assertSafeGitEnvironment,
  sanitizedGitEnvironment
} = require('../src/core/Cm2118FullPlanApplicationExecution');
const { resolverOptions } = require('./generate-cm2116-exact-full-plan-application-gate');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2121_content_decision_no_arguments_allowed');
  return {};
}

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    env: sanitizedGitEnvironment(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function buildImplementationIdentity(options) {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const parentCommit = gitText(['rev-parse', 'HEAD^']);
  return {
    commit,
    tree: gitText(['rev-parse', 'HEAD^{tree}']),
    parentCommit,
    parentTree: gitText(['rev-parse', 'HEAD^^{tree}']),
    diffPaths: options.resolveDiffPaths(parentCommit, commit).sort(),
    diffEntries: options.resolveDiffEntries(parentCommit, commit).sort((left, right) => left.path.localeCompare(right.path)),
    diffPathsSha256: sha256Canonical(IMPLEMENTATION_DIFF_PATHS),
    diffEntriesSha256: sha256Canonical(IMPLEMENTATION_DIFF_ENTRIES),
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(sourcePath => {
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

function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  assertSafeGitEnvironment();
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2121_content_decision_clean_worktree_required');
  if (fs.existsSync(DECISION_PATH) || fs.existsSync(DECISION_MARKDOWN_PATH)) {
    throw new Error('cm2121_content_decision_already_exists');
  }
  gitText(['merge-base', '--is-ancestor', APPLICATION_COMMIT, 'HEAD']);
  const options = resolverOptions();
  const applicationEvidence = intakeApplication(options);
  if (!applicationEvidence.accepted) {
    throw new Error(`cm2121_status_sync_application_rejected:${applicationEvidence.blockers.join(',')}`);
  }
  const implementation = buildImplementationIdentity(options);
  const decision = buildDecision({ applicationEvidence, implementation });
  const evaluation = evaluateDecision(decision, { implementation, ...options });
  if (!evaluation.accepted) throw new Error(`cm2121_content_decision_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = [
    '# CM-2121 Exact Full-plan Status-sync Content Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    `Patch payload SHA-256: \`${decision.payload.exactContent.patchPayloadSha256}\``,
    '',
    'This decision approves only the exact nine-path status-sync content.',
    'It does not authorize execution, detached commit creation, branch ref',
    'update, final release, remote action, or any readiness claim.',
    'Final execution release and post-binding branch CAS remain separate gates.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(DECISION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(DECISION_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_EXACT_STATUS_SYNC_CONTENT_DECISION_PREPARED',
    decisionReference: decision.payload.decisionReference,
    canonicalPayloadSha256: decision.canonicalPayloadSha256,
    patchPayloadSha256: decision.payload.exactContent.patchPayloadSha256,
    targetCount: decision.payload.exactContent.targetCount,
    authorizationContentApproved: true,
    statusSyncExecutionAuthorized: false,
    finalExecutionReleasePresent: false,
    finalExecutionReleaseAuthorized: false,
    branchRefUpdateAuthorized: false,
    statusSyncPerformed: false,
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
  IMPLEMENTATION_ARTIFACT_PATHS,
  buildImplementationIdentity,
  main,
  parseArgs
};
