#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  DECISION_PATH,
  buildDecision,
  evaluateDecision,
  serializeArtifact,
  sha256
} = require('../src/core/Cm2115R1Phase2CompletionAuditApplication');

const DEFAULT_MARKDOWN_PATH = DECISION_PATH.replace(/\.json$/, '.md');

function git(...args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function parseArgs(argv) {
  const options = { jsonPath: DECISION_PATH, markdownPath: DEFAULT_MARKDOWN_PATH, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-json') options.jsonPath = argv[++index];
    else if (arg === '--output-markdown') options.markdownPath = argv[++index];
    else if (arg === '--json') options.json = true;
    else throw new Error(`cm2115_r1_phase2_decision_unknown_argument:${arg}`);
  }
  return options;
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2115-R1 Phase 2 Completion Audit Application Decision',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    '',
    'This decision authorizes exactly one low-disclosure repository evidence application.',
    'It authorizes no native/runtime/memory/remote action and keeps independent review,',
    'full-plan completion, and readiness false.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (git('status', '--porcelain') !== '') throw new Error('cm2115_r1_phase2_decision_clean_worktree_required');
  if (fs.existsSync(options.jsonPath) || fs.existsSync(options.markdownPath)) {
    throw new Error('cm2115_r1_phase2_decision_output_exists');
  }
  const decision = buildDecision();
  const evaluation = evaluateDecision(decision);
  if (!evaluation.accepted) throw new Error(`cm2115_r1_phase2_decision_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = renderMarkdown(decision, jsonText);
  fs.mkdirSync(path.dirname(options.jsonPath), { recursive: true });
  fs.writeFileSync(options.jsonPath, jsonText, { flag: 'wx' });
  fs.writeFileSync(options.markdownPath, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_DECISION_PREPARED_NOT_APPLIED',
    jsonPath: options.jsonPath,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    canonicalPayloadSha256: decision.canonicalPayloadSha256,
    applicationExecuted: false,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  process.stdout.write(options.json ? `${JSON.stringify(summary)}\n` : `${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { DEFAULT_MARKDOWN_PATH, parseArgs, renderMarkdown };
