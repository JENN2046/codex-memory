#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  assertSafeGitEnvironment,
  buildFinalReleaseDecision,
  evaluateFinalReleaseDecision,
  intakeExecutionPacket
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const {
  serializeArtifact,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  ensureCleanWorktree,
  gitText
} = require('./cm2115-r2-git');
const {
  resolverOptions
} = require('./generate-cm2116-exact-full-plan-application-gate');

const APPROVED_AT = '2026-07-12T00:00:00+08:00';
const EXPIRES_AT = '2026-07-19T23:59:59+08:00';
const REPOSITORY_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2123_release_no_arguments_allowed');
  return {};
}

function ensureRepositoryRoot() {
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(REPOSITORY_ROOT)) {
    throw new Error('cm2123_release_repository_root_required');
  }
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2123-R2 Full-plan Status-sync Final Execution Release',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY.',
    '',
    'This exact decision releases one future CM-2122 claim and one detached',
    'nine-path status-sync commit in a clean detached worktree. Preparing and',
    'freezing these bytes does not run the executor, create a claim, patch files,',
    'create a detached commit, or write execution/binding receipts.',
    'Branch-ref CAS remains explicitly unauthorized and requires a later independent',
    'decision after detached-commit binding review. No remote or readiness action',
    'is authorized.',
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
  ensureCleanWorktree();
  if (fs.existsSync(FINAL_RELEASE_PATH) || fs.existsSync(FINAL_RELEASE_MARKDOWN_PATH)) {
    throw new Error('cm2123_release_already_exists');
  }
  const packetCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const packetEvidence = intakeExecutionPacket({ packetCommit, ...resolverOptions() });
  if (!packetEvidence.accepted) {
    throw new Error(`cm2123_packet_intake_rejected:${packetEvidence.blockers.join(',')}`);
  }
  const decision = buildFinalReleaseDecision({
    packetEvidence,
    approvedAt: APPROVED_AT,
    expiresAt: EXPIRES_AT
  });
  const evaluation = evaluateFinalReleaseDecision(decision, {
    packetEvidence,
    now: new Date()
  });
  if (!evaluation.accepted) {
    throw new Error(`cm2123_release_rejected:${evaluation.blockers.join(',')}`);
  }
  const jsonText = serializeArtifact(decision);
  const markdownText = renderMarkdown(decision, jsonText);
  fs.writeFileSync(FINAL_RELEASE_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(FINAL_RELEASE_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY',
    decisionReference: decision.payload.decisionReference,
    executionPacketCommit: packetEvidence.packetCommit,
    executionPacketTree: packetEvidence.packetTree,
    executionPacketPayloadSha256: packetEvidence.packet.canonicalPayloadSha256,
    implementationCommit: decision.payload.implementation.commit,
    supersededFinalReleaseCommit: decision.payload.supersedes.finalReleaseCommit,
    supersededAuthorizationClaimed: false,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    finalExecutionReleasePrepared: true,
    finalExecutionReleaseGitIntakeCompleted: false,
    statusSyncExecutionAuthorizedAfterGitIntake: true,
    detachedStatusCommitCreationAuthorizedAfterGitIntake: true,
    branchRefUpdateAuthorized: false,
    executorRun: false,
    claimCreated: false,
    detachedStatusCommitCreated: false,
    executionReceiptCreated: false,
    bindingReceiptCreated: false,
    branchRefUpdated: false,
    statusSyncPerformed: false,
    currentBranchStatusSynchronized: false,
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

module.exports = {
  APPROVED_AT,
  EXPIRES_AT,
  REPOSITORY_ROOT,
  ensureRepositoryRoot,
  main,
  parseArgs,
  renderMarkdown
};
