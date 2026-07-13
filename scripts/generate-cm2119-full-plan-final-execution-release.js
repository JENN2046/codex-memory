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
} = require('../src/core/Cm2118FullPlanApplicationExecution');
const {
  serializeArtifact,
  sha256
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');
const {
  ensureCleanWorktree,
  gitText
} = require('./cm2115-r2-git');
const { resolverOptions } = require('./generate-cm2116-exact-full-plan-application-gate');

const APPROVED_AT = '2026-07-12T18:00:00+08:00';
const EXPIRES_AT = '2026-07-19T18:00:00+08:00';
const VALIDATION_AT = APPROVED_AT;
const REPOSITORY_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  if (argv.length === 0) return { jsonSummary: false };
  if (argv.length === 1 && argv[0] === '--json') return { jsonSummary: true };
  throw new Error('cm2119_release_no_output_or_other_arguments_allowed');
}

function ensureRepositoryRoot() {
  if (fs.realpathSync(process.cwd()) !== fs.realpathSync(REPOSITORY_ROOT)) {
    throw new Error('cm2119_release_repository_root_required');
  }
}

function renderMarkdown(decision, jsonText) {
  return [
    '# CM-2119 Full-plan Final Execution Release',
    '',
    `Decision reference: \`${decision.payload.decisionReference}\``,
    `Canonical payload SHA-256: \`${decision.canonicalPayloadSha256}\``,
    '',
    'Result: PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY.',
    '',
    'This exact decision releases one future CM-2118 claim and one exact',
    'five-path Git-plumbing application commit after machine Git intake.',
    'Preparing these bytes does not run the executor, create a claim, apply',
    'the patch, create the application commit, or synchronize status.',
    'No remote, native-memory, provider, real-memory, or readiness action is authorized.',
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
  ensureRepositoryRoot();
  ensureCleanWorktree();
  if (fs.existsSync(FINAL_RELEASE_PATH) || fs.existsSync(FINAL_RELEASE_MARKDOWN_PATH)) {
    throw new Error('cm2119_release_already_exists');
  }
  const packetCommit = gitText(['rev-parse', 'HEAD^{commit}']);
  const packetEvidence = intakeExecutionPacket({ packetCommit, ...resolverOptions() });
  if (!packetEvidence.accepted) {
    throw new Error(`cm2119_packet_intake_rejected:${packetEvidence.blockers.join(',')}`);
  }
  const decision = buildFinalReleaseDecision({
    packetEvidence,
    approvedAt: APPROVED_AT,
    expiresAt: EXPIRES_AT
  });
  const evaluation = evaluateFinalReleaseDecision(decision, {
    packetEvidence,
    now: new Date(VALIDATION_AT)
  });
  if (!evaluation.accepted) {
    throw new Error(`cm2119_release_rejected:${evaluation.blockers.join(',')}`);
  }
  const jsonText = serializeArtifact(decision);
  const markdownText = renderMarkdown(decision, jsonText);
  fs.writeFileSync(FINAL_RELEASE_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(FINAL_RELEASE_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY',
    decisionReference: decision.payload.decisionReference,
    executionPacketCommit: packetEvidence.packetCommit,
    executionPacketTree: packetEvidence.packetTree,
    executionPacketPayloadSha256: packetEvidence.packet.canonicalPayloadSha256,
    implementationCommit: decision.payload.implementation.commit,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    finalExecutionReleaseContentPrepared: true,
    finalExecutionReleaseGitIntakeCompleted: false,
    executorRun: false,
    claimCreated: false,
    applicationExecuted: false,
    applicationCommitCreated: false,
    applicationCommitBound: false,
    statusSyncAuthorized: false,
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
  APPROVED_AT,
  EXPIRES_AT,
  VALIDATION_AT,
  REPOSITORY_ROOT,
  ensureRepositoryRoot,
  main,
  parseArgs,
  renderMarkdown
};
