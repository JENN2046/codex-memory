#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  AUTHORITY_PATH,
  DECISION_PATH,
  buildDecision,
  buildPatchTargets,
  evaluateDecision,
  identityWithoutContent,
  serializeArtifact,
  sha256
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const {
  ensureCleanWorktree,
  gitText,
  resolveCommitTree,
  resolveGitFile
} = require('./cm2115-r2-git');

const MARKDOWN_PATH = DECISION_PATH.replace(/\.json$/, '.md');

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 0) throw new Error('cm2115_r2_application_decision_arguments_forbidden');
  ensureCleanWorktree();
  if (fs.existsSync(DECISION_PATH) || fs.existsSync(MARKDOWN_PATH)) throw new Error('cm2115_r2_application_decision_exists');
  const baselineCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const baselineTree = resolveCommitTree(baselineCommit);
  const authority = resolveGitFile(baselineCommit, AUTHORITY_PATH);
  const targets = buildPatchTargets(sourcePath => resolveGitFile(baselineCommit, sourcePath));
  const decision = buildDecision({
    authorityGitIdentity: identityWithoutContent(authority),
    baselineCommit,
    baselineTree,
    targets
  });
  const evaluation = evaluateDecision(decision, { resolveGitFile });
  if (!evaluation.accepted) throw new Error(`cm2115_r2_application_decision_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = [
    '# CM-2115-R2 Exact Phase 2 Patch Application Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    '',
    'This decision authorizes one durable-claim-protected exact repository patch.',
    'The execution receipt cannot complete the application until a separate Git',
    'application binding receipt validates the direct child commit and exact diff.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(DECISION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({status:'PASS_EXACT_PATCH_DECISION_PREPARED',baselineCommit,baselineTree,patchPayloadSha256:decision.payload.patchPlan.patchPayloadSha256,jsonBytes:Buffer.byteLength(jsonText),jsonSha256:sha256(jsonText),applicationExecuted:false,fullPlanPackCompleted:false,readinessClaimed:false})}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exit(1); }
}

module.exports = { MARKDOWN_PATH, main };
