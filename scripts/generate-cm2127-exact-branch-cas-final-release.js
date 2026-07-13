#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  buildFinalReleaseDecision,
  deriveTargetWorktree,
  evaluateFinalReleaseDecision,
  intakeExecutionPacket,
  verifyTargetOldPreflight
} = require('../src/core/Cm2126ExactBranchCasExecution');
const {
  assertSafeGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  serializeArtifact,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  gitText
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const APPROVED_AT = '2026-07-12T00:00:00+08:00';
const EXPIRES_AT = '2026-07-19T23:59:59+08:00';
const VALIDATION_AT = APPROVED_AT;
const REPOSITORY_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2127_release_no_arguments_allowed');
  return {};
}

function ensureRepositoryRoot() {
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(REPOSITORY_ROOT)) {
    throw new Error('cm2127_release_repository_root_required');
  }
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2127 Exact Branch CAS Final Execution Release',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY.',
    '',
    'After exact Git intake, this decision may release one future claim, one exact',
    'expected-old local Branch CAS, one linked-worktree index synchronization, nine',
    'exact file synchronizations, and one low-disclosure execution receipt. Freezing',
    'these bytes does not run the executor or perform any of those effects. Automatic',
    'retry, rollback, cleanup, force, ref deletion, other-ref update, remote action,',
    'and every readiness claim remain forbidden.',
    '',
    'Execution also requires exclusive operator quiescence for the linked',
    'worktree. Non-cooperative concurrent file writers are outside the authorized',
    'threat model; any observed drift must stop in reconciliation.',
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
  if (gitText(['status', '--porcelain', '--untracked-files=all']) !== '') {
    throw new Error('cm2127_release_clean_worktree_required');
  }
  if (gitText(['branch', '--show-current']) !== '') throw new Error('cm2127_release_detached_worktree_required');
  if (fs.existsSync(FINAL_RELEASE_PATH) || fs.existsSync(FINAL_RELEASE_MARKDOWN_PATH)) {
    throw new Error('cm2127_release_already_exists');
  }
  const packetCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const target = deriveTargetWorktree(process.cwd());
  const packetEvidence = intakeExecutionPacket({
    packetCommit,
    targetWorktreeIdentity: target.publicIdentity,
    ...resolverOptions()
  });
  if (!packetEvidence.accepted) {
    throw new Error(`cm2127_packet_intake_rejected:${packetEvidence.blockers.join(',')}`);
  }
  verifyTargetOldPreflight(
    process.cwd(),
    target,
    packetEvidence.packet.payload.exactCasBoundary.targetBindings
  );
  const decision = buildFinalReleaseDecision({
    packetEvidence,
    approvedAt: APPROVED_AT,
    expiresAt: EXPIRES_AT
  });
  const evaluation = evaluateFinalReleaseDecision(decision, {
    packetEvidence,
    now: new Date(VALIDATION_AT)
  });
  if (!evaluation.accepted) throw new Error(`cm2127_release_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(decision);
  const markdownText = renderMarkdown(decision, jsonText);
  fs.writeFileSync(FINAL_RELEASE_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(FINAL_RELEASE_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY',
    decisionReference: decision.payload.decisionReference,
    canonicalPayloadSha256: decision.canonicalPayloadSha256,
    executionPacketCommit: packetEvidence.packetCommit,
    executionPacketTree: packetEvidence.packetTree,
    implementationCommit: decision.payload.implementation.commit,
    approvedAt: APPROVED_AT,
    expiresAt: EXPIRES_AT,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    finalExecutionReleasePrepared: true,
    finalExecutionReleaseGitIntakeCompleted: false,
    executorRun: false,
    claimCreated: false,
    branchRefUpdated: false,
    targetWorktreeIndexSynchronized: false,
    targetWorktreeFilesSynchronized: false,
    executionReceiptCreated: false,
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
  APPROVED_AT,
  EXPIRES_AT,
  VALIDATION_AT,
  REPOSITORY_ROOT,
  ensureRepositoryRoot,
  main,
  parseArgs,
  renderMarkdown
};
