#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  INTAKE_IMPLEMENTATION_ARTIFACT_PATHS,
  RECEIPT_PATH,
  SELF_REVIEW_DECISION_FREEZE,
  buildReceipt,
  evaluateFrozenSelfReviewDecision,
  evaluateReceipt,
  sha256
} = require('../src/core/Cm2115R2SelfReviewDecisionIntakeReceiptContract');
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

const MARKDOWN_PATH = RECEIPT_PATH.replace(/\.json$/, '.md');

function parseArgs(argv) {
  if (argv.length === 0) return { jsonSummary: false };
  if (argv.length === 1 && argv[0] === '--json') return { jsonSummary: true };
  throw new Error('cm2115_r2_self_review_intake_no_output_or_other_arguments_allowed');
}

function resolverOptions() {
  return {
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveGitPathState,
    isCommitAncestor
  };
}

function buildIntakeImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  return {
    commit,
    tree: resolveCommitTree(commit),
    artifacts: INTAKE_IMPLEMENTATION_ARTIFACT_PATHS.map(artifactPath => ({
      path: artifactPath,
      blobOid: resolveGitFile(commit, artifactPath).blobOid
    }))
  };
}

function renderMarkdown(receipt, jsonText) {
  return [
    '# CM-2115-R2 Internal Self-review Decision Intake Receipt',
    '',
    `Receipt reference: \`${receipt.payload.receiptReference}\``,
    `Canonical payload SHA-256: \`${receipt.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_INTERNAL_SELF_REVIEW_DECISION_INTAKE_ONLY.',
    '',
    'This receipt machine-binds and replays the frozen repository-internal self-review decision.',
    'It does not claim external review and does not authorize or execute the full-plan application.',
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
  ensureCleanWorktree();
  if (fs.existsSync(RECEIPT_PATH) || fs.existsSync(MARKDOWN_PATH)) {
    throw new Error('cm2115_r2_self_review_intake_receipt_already_exists');
  }
  if (!isCommitAncestor(SELF_REVIEW_DECISION_FREEZE.commit, gitText(['rev-parse', 'HEAD^{commit}']))) {
    throw new Error('cm2115_r2_self_review_decision_not_ancestor_of_head');
  }
  const frozenDecisionEvidence = evaluateFrozenSelfReviewDecision(resolverOptions());
  if (!frozenDecisionEvidence.accepted) {
    throw new Error(`cm2115_r2_frozen_self_review_decision_rejected:${frozenDecisionEvidence.blockers.join(',')}`);
  }
  const receipt = buildReceipt({
    intakeImplementation: buildIntakeImplementation(),
    frozenDecisionEvidence
  });
  const evaluation = evaluateReceipt(receipt, resolverOptions());
  if (!evaluation.accepted) {
    throw new Error(`cm2115_r2_self_review_intake_receipt_rejected:${evaluation.blockers.join(',')}`);
  }
  const jsonText = `${JSON.stringify(canonicalize(receipt), null, 2)}\n`;
  const markdownText = renderMarkdown(receipt, jsonText);
  fs.writeFileSync(RECEIPT_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(MARKDOWN_PATH, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_INTERNAL_SELF_REVIEW_DECISION_INTAKE_ONLY',
    receiptReference: receipt.payload.receiptReference,
    intakeImplementationCommit: receipt.payload.intakeImplementation.commit,
    decisionCommit: SELF_REVIEW_DECISION_FREEZE.commit,
    decisionBlobOid: receipt.payload.selfReviewDecision.json.blobOid,
    decisionCanonicalPayloadSha256: receipt.payload.selfReviewDecision.canonicalPayloadSha256,
    receiptCanonicalPayloadSha256: receipt.canonicalPayloadSha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    independentReviewPassed: true,
    independentReviewMode: 'repository_internal_separate_pass',
    independentExternalReviewPassed: false,
    historicalCm2080ExternalReviewPassedPreserved: true,
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
  buildIntakeImplementation,
  main,
  parseArgs,
  renderMarkdown,
  resolverOptions
};
