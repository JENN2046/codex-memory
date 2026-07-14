#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  DECISION_MARKDOWN_PATH,
  DECISION_PATH,
  IMPLEMENTATION_ARTIFACT_PATHS,
  buildDecision,
  buildDecisionReference,
  buildPatchTargets,
  evaluateDecision,
  evaluateFrozenGate,
  serializeArtifact,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  assertSafeGitEnvironment
} = require('../src/core/Cm2118FullPlanApplicationExecution');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveGitFile,
  resolveGitPathState
} = require('./cm2115-r2-git');
const { resolverOptions } = require('./generate-cm2116-exact-full-plan-application-gate');

function parseArgs(argv) {
  if (argv.length === 0) return { jsonSummary: false };
  if (argv.length === 1 && argv[0] === '--json') return { jsonSummary: true };
  throw new Error('cm2117_decision_no_output_or_other_arguments_allowed');
}

function buildDecisionImplementation() {
  const commit = gitText(['rev-parse', 'HEAD^{commit}']);
  return {
    commit,
    tree: resolveCommitTree(commit),
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(sourcePath => ({
      path: sourcePath,
      blobOid: resolveGitFile(commit, sourcePath).blobOid
    }))
  };
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2117 Exact Full-plan Application Content Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_CONTENT_DECISION_ONLY.',
    '',
    'The exact five-path application content is approved and frozen.',
    'Execution remains unauthorized until a separate final execution release',
    'binds this decision Git identity and a frozen executor implementation.',
    'No claim, patch, application commit, completion, or readiness state changed.',
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
  assertSafeGitEnvironment();
  ensureCleanWorktree();
  if (fs.existsSync(DECISION_PATH) || fs.existsSync(DECISION_MARKDOWN_PATH)) {
    throw new Error('cm2117_decision_already_exists');
  }
  const resolvers = resolverOptions();
  const gateEvidence = evaluateFrozenGate(resolvers);
  if (!gateEvidence.accepted) {
    throw new Error(`cm2117_gate_rejected:${gateEvidence.blockers.join(',')}`);
  }
  const implementation = buildDecisionImplementation();
  const decisionReference = buildDecisionReference(implementation);
  const targets = buildPatchTargets({
    baselineCommit: implementation.commit,
    baselineTree: implementation.tree,
    decisionReference,
    resolveGitFile,
    resolveGitPathState
  });
  const decision = buildDecision({
    decisionImplementation: implementation,
    gateEvidence,
    baselineCommit: implementation.commit,
    baselineTree: implementation.tree,
    targets
  });
  const evaluation = evaluateDecision(decision, resolvers);
  if (!evaluation.accepted) throw new Error(`cm2117_decision_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = renderMarkdown(decision, jsonText);
  fs.writeFileSync(DECISION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(DECISION_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_CONTENT_DECISION_ONLY',
    decisionReference: decision.payload.decisionReference,
    decisionImplementationCommit: implementation.commit,
    gateCommit: decision.payload.gateBinding.commit,
    gatePayloadSha256: decision.payload.gateBinding.canonicalPayloadSha256,
    patchPayloadSha256: decision.payload.patchPlan.patchPayloadSha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    authorizationContentApproved: true,
    applicationExecutionAuthorized: false,
    finalExecutionReleaseRequired: true,
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
  buildDecisionImplementation,
  main,
  parseArgs,
  renderMarkdown
};
