#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  DECISION_PATH,
  IMPLEMENTATION_ARTIFACT_PATHS,
  REVIEW_REQUEST_FREEZE,
  buildDecision,
  evaluateDecision,
  evaluateFrozenReviewRequest,
  sha256
} = require('../src/core/Cm2115R2CanonicalSnapshotSelfReviewDecisionContract');
const { canonicalize } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveDurableClaim,
  resolveGitFile,
  resolveGitPathState,
  resolveParentCommit
} = require('./cm2115-r2-git');

const MARKDOWN_PATH = DECISION_PATH.replace(/\.json$/, '.md');

function parseArgs(argv) {
  if (argv.length === 0) return { jsonSummary: false };
  if (argv.length === 1 && argv[0] === '--json') return { jsonSummary: true };
  throw new Error('cm2115_r2_self_review_no_output_or_other_arguments_allowed');
}

function isCommitAncestor(ancestor, descendant) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}

function resolverOptions() {
  return {
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveGitPathState,
    resolveDurableClaim,
    isCommitAncestor
  };
}

function buildReviewImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  const tree = resolveCommitTree(commit);
  return {
    commit,
    tree,
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(artifactPath => ({
      path: artifactPath,
      blobOid: resolveGitFile(commit, artifactPath).blobOid
    }))
  };
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2115-R2 Internal Snapshot Self-review Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_INTERNAL_SELF_REVIEW_ONLY.',
    '',
    'This is a repository-internal, frozen-object, independent second-pass review.',
    'It is not an external review and does not claim an external reviewer.',
    'It permits only preparation of a separate full-plan application gate;',
    'it does not authorize or apply full-plan completion or any readiness claim.',
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
  if (fs.existsSync(DECISION_PATH) || fs.existsSync(MARKDOWN_PATH)) {
    throw new Error('cm2115_r2_self_review_decision_already_exists');
  }
  const reviewEvidence = evaluateFrozenReviewRequest(resolverOptions());
  if (!reviewEvidence.accepted) {
    throw new Error(`cm2115_r2_self_review_evidence_rejected:${reviewEvidence.blockers.join(',')}`);
  }
  const decision = buildDecision({
    reviewImplementation: buildReviewImplementation(),
    reviewEvidence
  });
  const evaluation = evaluateDecision(decision, resolverOptions());
  if (!evaluation.accepted) {
    throw new Error(`cm2115_r2_self_review_decision_rejected:${evaluation.blockers.join(',')}`);
  }
  const jsonText = `${JSON.stringify(canonicalize(decision), null, 2)}\n`;
  const markdownText = renderMarkdown(decision, jsonText);
  fs.writeFileSync(DECISION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(MARKDOWN_PATH, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_INTERNAL_SELF_REVIEW_ONLY',
    decisionReference: decision.payload.decisionReference,
    implementationCommit: decision.payload.reviewImplementation.commit,
    reviewedSnapshotCommit: decision.payload.reviewedSnapshot.commit,
    reviewedRequestCommit: REVIEW_REQUEST_FREEZE.commit,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    canonicalPayloadSha256: decision.canonicalPayloadSha256,
    internalSelfReviewPassed: true,
    independentReviewPassed: true,
    independentReviewMode: 'repository_internal_separate_pass',
    independentExternalReviewPassed: false,
    externalReviewPassed: false,
    fullPlanApplicationAuthorized: false,
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
  MARKDOWN_PATH,
  buildReviewImplementation,
  isCommitAncestor,
  main,
  parseArgs,
  renderMarkdown,
  resolverOptions
};
