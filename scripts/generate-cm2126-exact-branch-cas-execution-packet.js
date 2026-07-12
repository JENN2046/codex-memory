#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  buildExecutionPacket,
  buildTargetBindings,
  deriveTargetWorktree,
  evaluateExecutionPacket,
  intakeContentDecision,
  verifyTargetOldPreflight
} = require('../src/core/Cm2126ExactBranchCasExecution');
const {
  assertSafeGitEnvironment
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
  if (argv.length !== 0) throw new Error('cm2126_packet_no_arguments_allowed');
  return {};
}

function ensureRepositoryRoot() {
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(REPOSITORY_ROOT)) {
    throw new Error('cm2126_packet_repository_root_required');
  }
}

function resolveImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const parentCommit = resolveParentCommit(commit);
  if (parentCommit !== IMPLEMENTATION_PARENT_FREEZE.commit ||
      resolveCommitTree(parentCommit) !== IMPLEMENTATION_PARENT_FREEZE.tree) {
    throw new Error('cm2126_packet_implementation_freeze_required');
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
    '# CM-2126 Exact Branch CAS Execution Packet',
    '',
    `Packet reference: \`${packet.payload.packetReference}\``,
    `Canonical payload SHA-256: \`${packet.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_NON_EXECUTING_PACKET_PREPARED_ONLY.',
    '',
    'This packet freezes the exact local Branch CAS executor, persistent one-shot',
    'claim registry, linked-worktree index and nine-file synchronization boundary,',
    'execution/reentry receipt contracts, and failure state machine. It does not',
    'create a claim, update a ref, modify an index or file, write a receipt, perform',
    'a remote action, or synchronize current branch status. A separate exact',
    'CM-2127 final execution release remains required.',
    '',
    'Operational boundary: the local target worktree must remain exclusively',
    'quiescent during the nine-file synchronization. The executor repeatedly',
    'checks exact file and parent identities, but ordinary filesystem rename is',
    'an atomic replacement, not an OS-level expected-old content CAS. An',
    'uncooperative concurrent file writer is outside this frozen threat model.',
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
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2126_packet_detached_worktree_required');
  if (fs.existsSync(PACKET_PATH) || fs.existsSync(PACKET_MARKDOWN_PATH)) {
    throw new Error('cm2126_packet_already_exists');
  }
  const options = resolverOptions();
  const contentEvidence = intakeContentDecision(options);
  if (!contentEvidence.accepted) {
    throw new Error(`cm2126_content_decision_rejected:${contentEvidence.blockers.join(',')}`);
  }
  const implementation = resolveImplementation();
  const target = deriveTargetWorktree(process.cwd());
  const targetBindings = buildTargetBindings(options);
  verifyTargetOldPreflight(process.cwd(), target, targetBindings);
  const packet = buildExecutionPacket({
    implementation,
    contentEvidence,
    targetBindings,
    targetWorktreeIdentity: target.publicIdentity
  });
  const evaluation = evaluateExecutionPacket(packet, {
    targetWorktreeIdentity: target.publicIdentity,
    ...options
  });
  if (!evaluation.accepted) throw new Error(`cm2126_packet_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(packet);
  const markdownText = renderMarkdown(packet, jsonText);
  fs.writeFileSync(PACKET_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(PACKET_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_NON_EXECUTING_PACKET_PREPARED_ONLY',
    packetReference: packet.payload.packetReference,
    canonicalPayloadSha256: packet.canonicalPayloadSha256,
    implementationCommit: implementation.commit,
    contentDecisionCommit: packet.payload.contentDecision.commit,
    targetRef: packet.payload.exactCasBoundary.targetRef,
    expectedOld: packet.payload.exactCasBoundary.expectedOld,
    newCommit: packet.payload.exactCasBoundary.newCommit,
    targetWorktreeIdentitySha256: target.publicIdentity.identitySha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    finalExecutionReleasePresent: false,
    branchCasClaimCreationAuthorized: false,
    branchCasExecutionAuthorized: false,
    branchRefUpdateAuthorized: false,
    targetWorktreeIndexSynchronizationAuthorized: false,
    targetWorktreeFileSynchronizationAuthorized: false,
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
  REPOSITORY_ROOT,
  ensureRepositoryRoot,
  main,
  parseArgs,
  renderMarkdown,
  resolveImplementation
};
