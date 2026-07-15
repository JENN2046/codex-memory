#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  APPLICATION_MARKDOWN_PATH,
  APPLICATION_PATH,
  buildApplication,
  evaluateApplication,
  serializeArtifact
} = require('../src/core/Cm2121FullPlanStatusSyncApplication');
const { resolverOptions } = require('./generate-cm2116-exact-full-plan-application-gate');
const {
  assertSafeGitEnvironment,
  sanitizedGitEnvironment
} = require('../src/core/Cm2122FullPlanStatusSyncExecution');

function parseArgs(argv) {
  if (argv.length !== 0) throw new Error('cm2121_status_sync_application_no_arguments_allowed');
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

function main(argv = process.argv.slice(2)) {
  parseArgs(argv);
  assertSafeGitEnvironment(process.env);
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2121_clean_worktree_required');
  if (fs.existsSync(APPLICATION_PATH) || fs.existsSync(APPLICATION_MARKDOWN_PATH)) {
    throw new Error('cm2121_status_sync_application_already_exists');
  }
  const options = resolverOptions();
  const application = buildApplication(options);
  const evaluation = evaluateApplication(application, options);
  if (!evaluation.accepted) throw new Error(`cm2121_status_sync_application_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(application);
  const markdownText = [
    '# CM-2121 Exact Full-plan Status-sync Application',
    '',
    `Application reference: \`${application.payload.applicationReference}\``,
    `Canonical payload SHA-256: \`${application.canonicalPayloadSha256}\``,
    `Exact target count: \`${application.payload.patchPlan.targets.length}\``,
    `Patch payload SHA-256: \`${application.payload.patchPlan.patchPayloadSha256}\``,
    '',
    'This artifact prepares, but does not authorize or execute, one exact',
    'nine-path status synchronization. The bound evidence supports',
    '`fullPlanPackCompleted=true`; every readiness field remains false.',
    'A separate content decision, final execution release, one-shot executor,',
    'receipt, and exact branch-ref update boundary are still required.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(APPLICATION_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(APPLICATION_MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: 'PASS_EXACT_STATUS_SYNC_APPLICATION_PREPARED',
    applicationReference: application.payload.applicationReference,
    canonicalPayloadSha256: application.canonicalPayloadSha256,
    patchPayloadSha256: application.payload.patchPlan.patchPayloadSha256,
    targetCount: application.payload.patchPlan.targets.length,
    fullPlanPackCompletedInBoundEvidence: true,
    statusSyncAuthorized: false,
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

module.exports = { main, parseArgs };
