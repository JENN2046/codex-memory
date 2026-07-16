#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync, spawnSync } = require('node:child_process');
const {
  ARTIFACT_MARKDOWN_PATH,
  ARTIFACT_PATH,
  BASELINE_COMMIT,
  buildRevalidation,
  evaluateRevalidation,
  serializeArtifact
} = require('../src/core/Cm2130FinalMainFullPlanRevalidation');
const { resolverOptions } = require('./generate-cm2116-exact-full-plan-application-gate');
const {
  assertSafeGitEnvironment,
  sanitizedGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2130_final_main_revalidation_no_arguments_allowed');
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

function gitResolver() {
  return {
    ...resolverOptions(),
    resolveCommit(commit) {
      const output = gitText(['show', '-s', '--format=%H%x00%T%x00%P%x00%s', commit]);
      const [resolvedCommit, tree, parents, subject] = output.split('\0');
      return { commit: resolvedCommit, tree, parents: parents.split(' ').filter(Boolean), subject };
    },
    isCommitAncestor(ancestor, descendant) {
      const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
        cwd: process.cwd(),
        env: sanitizedGitEnvironment(),
        stdio: 'ignore'
      });
      if (result.status === 0) return true;
      if (result.status === 1) return false;
      throw new Error(`cm2130_merge_base_failed:${ancestor}:${descendant}`);
    }
  };
}

function renderMarkdown(revalidation, jsonText) {
  return [
    '# CM-2130 Final-main Full-plan Revalidation',
    '',
    `Revalidation reference: \`${revalidation.payload.revalidationReference}\``,
    `Baseline commit: \`${revalidation.payload.baseline.commit}\``,
    `Baseline tree: \`${revalidation.payload.baseline.tree}\``,
    `Canonical payload SHA-256: \`${revalidation.canonicalPayloadSha256}\``,
    `Verdict: \`${revalidation.payload.verdict}\``,
    '',
    'This is a read-only Git-object and tracked-evidence revalidation of the',
    'final main baseline after regular merge commits #14 through #19.',
    'It does not replay any consumed authorization, execute status sync,',
    'update a branch ref, call a provider, access real memory, or claim readiness.',
    '',
    'The historical full-plan evidence is accepted. Current',
    '`fullPlanPackCompleted=false` and `fullPlanStatusSyncPerformed=false` remain',
    'unchanged; any exact status synchronization is a separate decision.',
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
  assertSafeGitEnvironment(process.env);
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2130_clean_worktree_required');
  if (fs.existsSync(ARTIFACT_PATH) || fs.existsSync(ARTIFACT_MARKDOWN_PATH)) {
    throw new Error('cm2130_revalidation_artifact_already_exists');
  }
  gitText(['merge-base', '--is-ancestor', BASELINE_COMMIT, 'HEAD']);
  const options = gitResolver();
  const revalidation = buildRevalidation(options);
  const evaluation = evaluateRevalidation(revalidation, options);
  if (!evaluation.accepted) throw new Error(`cm2130_revalidation_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(revalidation);
  const markdownText = renderMarkdown(revalidation, jsonText);
  fs.writeFileSync(ARTIFACT_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(ARTIFACT_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: evaluation.verdict,
    baselineCommit: revalidation.payload.baseline.commit,
    baselineTree: revalidation.payload.baseline.tree,
    mergeCount: revalidation.payload.mergeProof.length,
    evidenceArtifactCount: revalidation.payload.evidenceArtifacts.length,
    statusSurfaceCount: revalidation.payload.statusSurfaceArtifacts.length,
    fullPlanStatusSyncPerformed: false,
    fullPlanPackCompleted: false,
    statusSyncStillSeparate: true,
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

module.exports = { gitResolver, main, parseArgs, renderMarkdown };
