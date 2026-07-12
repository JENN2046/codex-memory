#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  assertSafeGitEnvironment,
  buildExecutionPacket,
  evaluateExecutionPacket,
  intakeContentDecision
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  serializeArtifact,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitFile,
  resolveParentCommit
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2122_packet_no_arguments_allowed');
  return {};
}

function ensureRepositoryRoot() {
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(REPOSITORY_ROOT)) {
    throw new Error('cm2122_packet_repository_root_required');
  }
}

function resolveImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const parentCommit = resolveParentCommit(commit);
  if (parentCommit !== IMPLEMENTATION_PARENT_FREEZE.commit ||
      resolveCommitTree(parentCommit) !== IMPLEMENTATION_PARENT_FREEZE.tree) {
    throw new Error('cm2122_packet_implementation_freeze_required');
  }
  const options = resolverOptions();
  const diffPaths = resolveDiffPaths(parentCommit, commit).sort();
  const diffEntries = options.resolveDiffEntries(parentCommit, commit)
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    commit,
    tree: resolveCommitTree(commit),
    parentCommit,
    parentTree: resolveCommitTree(parentCommit),
    diffPaths,
    diffPathsSha256: sha256Canonical(diffPaths),
    diffEntries,
    diffEntriesSha256: sha256Canonical(diffEntries),
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(sourcePath => {
      const identity = resolveGitFile(commit, sourcePath);
      return {
        path: sourcePath,
        blobOid: identity.blobOid,
        bytes: identity.bytes,
        sha256: identity.sha256
      };
    })
  };
}

function renderMarkdown(packet, jsonText) {
  return [
    '# CM-2122-R1 Full-plan Status-sync Execution Packet',
    '',
    `Packet reference: \`${packet.payload.packetReference}\``,
    `Canonical payload SHA-256: \`${packet.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_NON_EXECUTING_PACKET_PREPARED_ONLY.',
    '',
    'This packet freezes the exact detached-commit executor, one-shot claim',
    'registry, external execution/binding receipts, and exact nine-path patch.',
    'It carries no final execution release and creates no claim, patch, commit,',
    'receipt, branch update, remote action, or readiness claim.',
    'The earlier CM-2123 freeze is superseded before execution by this Git',
    'environment-isolation repair and never created a claim or receipt.',
    'A separate CM-2123 final execution release is required. Branch CAS remains',
    'a later independent gate after detached-commit binding review.',
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
  ensureRepositoryRoot();
  ensureCleanWorktree();
  if (fs.existsSync(PACKET_PATH) || fs.existsSync(PACKET_MARKDOWN_PATH)) {
    throw new Error('cm2122_packet_already_exists');
  }
  const options = resolverOptions();
  const contentEvidence = intakeContentDecision(options);
  if (!contentEvidence.accepted) {
    throw new Error(`cm2122_content_decision_rejected:${contentEvidence.blockers.join(',')}`);
  }
  const implementation = resolveImplementation();
  const packet = buildExecutionPacket({ implementation, contentEvidence });
  const evaluation = evaluateExecutionPacket(packet, options);
  if (!evaluation.accepted) throw new Error(`cm2122_packet_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(packet);
  const markdownText = renderMarkdown(packet, jsonText);
  fs.writeFileSync(PACKET_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(PACKET_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_NON_EXECUTING_PACKET_PREPARED_ONLY',
    packetReference: packet.payload.packetReference,
    implementationCommit: implementation.commit,
    implementationTree: implementation.tree,
    contentDecisionCommit: packet.payload.contentDecision.commit,
    contentDecisionPayloadSha256: packet.payload.contentDecision.canonicalPayloadSha256,
    packetPayloadSha256: packet.canonicalPayloadSha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    packetPrepared: true,
    supersededFinalReleaseCommit: packet.payload.supersedes.finalReleaseCommit,
    supersededAuthorizationClaimed: false,
    finalExecutionReleasePresent: false,
    statusSyncExecutionAuthorized: false,
    detachedStatusCommitCreationAuthorized: false,
    branchRefUpdateAuthorized: false,
    claimCreated: false,
    detachedStatusCommitCreated: false,
    statusSyncPerformed: false,
    currentBranchStatusSynchronized: false,
    readinessClaimed: false
  })}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  REPOSITORY_ROOT,
  ensureRepositoryRoot,
  main,
  parseArgs,
  renderMarkdown,
  resolveImplementation
};
