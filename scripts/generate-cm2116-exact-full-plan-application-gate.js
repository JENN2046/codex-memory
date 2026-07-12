#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  GATE_IMPLEMENTATION_ARTIFACT_PATHS,
  GATE_MARKDOWN_PATH,
  GATE_PATH,
  buildGate,
  evaluateFrozenSelfReviewIntake,
  evaluateGate,
  sha256
} = require('../src/core/Cm2116ExactFullPlanApplicationGate');
const { canonicalize } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitFile,
  resolveGitPathState,
  resolveParentCommit
} = require('./cm2115-r2-git');
const { isCommitAncestor } = require('./generate-cm2115-r2-self-review-decision');

function parseArgs(argv) {
  if (argv.length === 0) return { jsonSummary: false };
  if (argv.length === 1 && argv[0] === '--json') return { jsonSummary: true };
  throw new Error('cm2116_gate_no_output_or_other_arguments_allowed');
}

function resolveDiffEntries(parentCommit, commit) {
  const output = gitText([
    'diff-tree', '--no-renames', '--no-commit-id', '--name-status', '-r', parentCommit, commit
  ]);
  if (!output) return [];
  return output.split('\n').filter(Boolean).map(line => {
    const match = line.match(/^([A-Z])\t(.+)$/);
    if (!match) throw new Error('cm2116_diff_entry_invalid');
    return { status: match[1], path: match[2] };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function resolverOptions() {
  return {
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveDiffEntries,
    resolveGitPathState,
    isCommitAncestor
  };
}

function buildGateImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  return {
    commit,
    tree: resolveCommitTree(commit),
    artifacts: GATE_IMPLEMENTATION_ARTIFACT_PATHS.map(artifactPath => ({
      path: artifactPath,
      blobOid: resolveGitFile(commit, artifactPath).blobOid
    }))
  };
}

function renderMarkdown(gate, jsonText) {
  return [
    '# CM-2116 Exact Full-plan Application Gate',
    '',
    `Gate reference: \`${gate.payload.gateReference}\``,
    `Canonical payload SHA-256: \`${gate.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_GATE_PREPARED_ONLY.',
    '',
    'The exact CM-2115-R2 internal self-review intake Git chain was replayed.',
    'This gate prepares only a separate exact application decision boundary.',
    'It does not authorize or execute a patch, complete the plan pack, or claim readiness.',
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
  ensureCleanWorktree();
  if (fs.existsSync(GATE_PATH) || fs.existsSync(GATE_MARKDOWN_PATH)) {
    throw new Error('cm2116_gate_already_exists');
  }
  const intakeEvidence = evaluateFrozenSelfReviewIntake(resolverOptions());
  if (!intakeEvidence.accepted) {
    throw new Error(`cm2116_self_review_intake_rejected:${intakeEvidence.blockers.join(',')}`);
  }
  const gate = buildGate({ gateImplementation: buildGateImplementation(), intakeEvidence });
  const evaluation = evaluateGate(gate, resolverOptions());
  if (!evaluation.accepted) throw new Error(`cm2116_gate_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = `${JSON.stringify(canonicalize(gate), null, 2)}\n`;
  const markdownText = renderMarkdown(gate, jsonText);
  fs.writeFileSync(GATE_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(GATE_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_GATE_PREPARED_ONLY',
    gateReference: gate.payload.gateReference,
    gateImplementationCommit: gate.payload.gateImplementation.commit,
    upstreamReceiptCommit: gate.payload.upstreamSelfReviewIntake.commit,
    upstreamReceiptTree: gate.payload.upstreamSelfReviewIntake.tree,
    upstreamReceiptJsonBlobOid: gate.payload.upstreamSelfReviewIntake.json.blobOid,
    upstreamReceiptMarkdownBlobOid: gate.payload.upstreamSelfReviewIntake.markdown.blobOid,
    upstreamReceiptPayloadSha256: gate.payload.upstreamSelfReviewIntake.canonicalPayloadSha256,
    gatePayloadSha256: gate.canonicalPayloadSha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    gatePrepared: true,
    applicationAuthorized: false,
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
  buildGateImplementation,
  main,
  parseArgs,
  renderMarkdown,
  resolveDiffEntries,
  resolverOptions
};
