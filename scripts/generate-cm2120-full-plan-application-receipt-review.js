#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  REVIEW_MARKDOWN_PATH,
  REVIEW_PATH,
  buildReviewDecision,
  evaluateCurrentDurableEvidence,
  evaluateFrozenReceiptSet,
  evaluateReviewDecision,
  serializeArtifact
} = require('../src/core/Cm2120FullPlanApplicationReceiptReview');
const { resolverOptions } = require('./generate-cm2116-exact-full-plan-application-gate');

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2120_receipt_review_no_arguments_allowed');
  return {};
}

async function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2120_receipt_review_clean_worktree_required');
  if (fs.existsSync(REVIEW_PATH) || fs.existsSync(REVIEW_MARKDOWN_PATH)) {
    throw new Error('cm2120_receipt_review_already_exists');
  }
  const options = resolverOptions();
  const frozenEvidence = evaluateFrozenReceiptSet(options);
  if (!frozenEvidence.accepted) throw new Error(`cm2120_frozen_receipts_rejected:${frozenEvidence.blockers.join(',')}`);
  const durableEvidence = await evaluateCurrentDurableEvidence();
  if (!durableEvidence.accepted) throw new Error(`cm2120_durable_evidence_rejected:${durableEvidence.blockers.join(',')}`);
  const implementation = {
    commit: gitText(['rev-parse', 'HEAD^{commit}']),
    tree: gitText(['rev-parse', 'HEAD^{tree}'])
  };
  const decision = buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  const evaluation = evaluateReviewDecision(decision, { implementation, durableEvidence, ...options });
  if (!evaluation.accepted) throw new Error(`cm2120_review_decision_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = [
    '# CM-2120 Full-plan Application Receipt Internal Review Decision',
    '',
    `Result: \`${decision.payload.result}\``,
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'This review accepts only the exact frozen execution and commit-binding',
    'receipts. It does not execute or authorize status synchronization and',
    'does not authorize readiness, native memory, provider, remote, release,',
    'deployment, or cutover actions.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(REVIEW_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(REVIEW_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_RECEIPT_REVIEW_DECISION_PREPARED',
    decisionReference: decision.payload.decisionReference,
    canonicalPayloadSha256: decision.canonicalPayloadSha256,
    receiptReviewPassed: true,
    applicationCommitAnchored: true,
    fullPlanPackCompletedEvidenceAccepted: true,
    statusSyncApplicationMayBePrepared: true,
    statusSyncAuthorized: false,
    readinessClaimed: false
  })}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
