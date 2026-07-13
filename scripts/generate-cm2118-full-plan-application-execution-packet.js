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
  evaluateExecutionPacket,
  intakeContentDecision,
  realResolverOptions: resolverOptions
} = require('../src/core/Cm2118FullPlanApplicationExecution');
const {
  serializeArtifact,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitFile,
  resolveGitPathState,
  resolveParentCommit
} = require('./cm2115-r2-git');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  if (argv.length === 0) return { jsonSummary: false };
  if (argv.length === 1 && argv[0] === '--json') return { jsonSummary: true };
  throw new Error('cm2118_packet_no_output_or_other_arguments_allowed');
}

function ensureRepositoryRoot() {
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(REPOSITORY_ROOT)) {
    throw new Error('cm2118_packet_repository_root_required');
  }
}

function resolveImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const tree = resolveCommitTree(commit);
  const parentCommit = resolveParentCommit(commit);
  if (parentCommit !== IMPLEMENTATION_PARENT_FREEZE.commit ||
      resolveCommitTree(parentCommit) !== IMPLEMENTATION_PARENT_FREEZE.tree) {
    throw new Error('cm2118_packet_implementation_freeze_required');
  }
  const resolvers = resolverOptions();
  const diffPaths = resolveDiffPaths(parentCommit, commit).sort();
  const diffEntries = resolvers.resolveDiffEntries(parentCommit, commit)
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    commit,
    tree,
    parentCommit,
    parentTree: resolveCommitTree(parentCommit),
    diffPaths,
    diffPathsSha256: sha256Canonical(diffPaths),
    diffEntries,
    diffEntriesSha256: sha256Canonical(diffEntries),
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(sourcePath => ({
      path: sourcePath,
      blobOid: resolveGitFile(commit, sourcePath).blobOid
    }))
  };
}

function renderMarkdown(packet, jsonText) {
  return [
    '# CM-2118 Full-plan Application Execution Packet',
    '',
    `Packet reference: \`${packet.payload.packetReference}\``,
    `Canonical payload SHA-256: \`${packet.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_NON_EXECUTING_PACKET_PREPARED_ONLY.',
    '',
    'This packet freezes a one-shot executor, fixed governance registry,',
    'external execution receipts, and exact application-commit binding.',
    'It carries no execution release and creates no claim, patch, or commit.',
    'A separate machine-bound CM-2119 final execution release is required.',
    'Full-plan completion and every readiness state remain false.',
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
  const options = parseArgs(argv);
  ensureRepositoryRoot();
  ensureCleanWorktree();
  if (fs.existsSync(PACKET_PATH) || fs.existsSync(PACKET_MARKDOWN_PATH)) {
    throw new Error('cm2118_packet_already_exists');
  }
  const resolvers = resolverOptions();
  const contentEvidence = intakeContentDecision(resolvers);
  if (!contentEvidence.accepted) {
    throw new Error(`cm2118_content_decision_rejected:${contentEvidence.blockers.join(',')}`);
  }
  const implementation = resolveImplementation();
  const packet = buildExecutionPacket({ implementation, contentEvidence });
  const evaluation = evaluateExecutionPacket(packet, resolvers);
  if (!evaluation.accepted) {
    throw new Error(`cm2118_packet_rejected:${evaluation.blockers.join(',')}`);
  }
  const jsonText = serializeArtifact(packet);
  const markdownText = renderMarkdown(packet, jsonText);
  fs.writeFileSync(PACKET_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(PACKET_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  const summary = {
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
    finalExecutionReleasePresent: false,
    applicationExecutionAuthorized: false,
    claimCreated: false,
    applicationExecuted: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  process.stdout.write(options.jsonSummary ? `${JSON.stringify(summary)}\n` : `${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
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
