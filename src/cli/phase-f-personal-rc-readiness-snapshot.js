#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildPhaseFPersonalRcReadinessSnapshot
} = require('../core/PhaseFPersonalRcReadinessSnapshot');
const {
  buildPhaseF1SyncApprovalPacket
} = require('../core/PhaseF1SyncApprovalPacket');
const {
  readGitFacts
} = require('./phase-f1-sync-approval-packet');

function parseArgs(argv = []) {
  const options = {
    cwd: process.cwd(),
    branch: 'main',
    remoteRef: 'origin/main',
    json: false,
    pretty: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') { options.json = true; continue; }
    if (token === '--pretty') { options.pretty = true; continue; }
    if (token === '--help' || token === '-h') { options.help = true; continue; }
    if (token === '--cwd') {
      options.cwd = argv[index + 1] || options.cwd;
      index += 1;
      continue;
    }
    if (token === '--branch') {
      options.branch = argv[index + 1] || options.branch;
      index += 1;
      continue;
    }
    if (token === '--remote-ref') {
      options.remoteRef = argv[index + 1] || options.remoteRef;
      index += 1;
      continue;
    }
    if ([
      '--execute',
      '--push',
      '--rerun-f1',
      '--call-mcp',
      '--record-memory',
      '--search-memory',
      '--provider',
      '--readiness-claim',
      '--f1-accepted',
      '--f2-accepted',
      '--f3-accepted',
      '--f4-accepted',
      '--f5-accepted'
    ].includes(token)) {
      throw new Error(`unsupported side-effect flag: ${token}`);
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/phase-f-personal-rc-readiness-snapshot.js [--cwd PATH] [--branch main] [--remote-ref origin/main] [--json] [--pretty]',
    '',
    'Builds a read-only Phase F personal RC evidence readiness snapshot from local Git facts.',
    'This command does not push, rerun F1, call MCP, call providers, or touch runtime/memory state.'
  ].join('\n');
}

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return '';
    throw error;
  }
}

function detectPhaseFEvidence(cwd) {
  const docsDir = path.join(cwd, 'docs');
  const evidence = {};
  const f1Text = readTextIfExists(path.join(docsDir, 'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'));
  if (
    f1Text.includes('Status: `COMPLETED_VALIDATED_F1_ACCEPTED_NOT_READY`') &&
    f1Text.includes('- F1 evidence accepted: `true`') &&
    f1Text.includes('PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY')
  ) {
    evidence.f1LiveNoWriteEvidenceAccepted = true;
  }

  const f2Text = readTextIfExists(path.join(docsDir, 'CM1379_PHASE_F2_A5_GAP6_AGGREGATION_EVIDENCE.md'));
  if (
    f2Text.includes('Status: `COMPLETED_VALIDATED_F2_ACCEPTED_NOT_READY`') &&
    f2Text.includes('- F2 evidence accepted: `true`') &&
    f2Text.includes('phase_f_f1_accepted_f2_aggregation_refresh_not_ready')
  ) {
    evidence.f2A5Gap6AggregationAccepted = true;
  }

  const f3Text = readTextIfExists(path.join(docsDir, 'CM1381_PHASE_F3_TRUE_LIVE_RECALL_NEGATIVE_CONTROL_EVIDENCE.md'));
  if (
    f3Text.includes('Status: `COMPLETED_VALIDATED_F3_ACCEPTED_NOT_READY`') &&
    f3Text.includes('- F3 evidence accepted: `true`') &&
    f3Text.includes('TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY')
  ) {
    evidence.f3TrueLiveRecallNegativeControlAccepted = true;
  }

  const f4Text = readTextIfExists(path.join(docsDir, 'CM1383_PHASE_F4_MINIMAL_DOGFOOD_WRITE_EVIDENCE.md'));
  if (
    f4Text.includes('Status: `COMPLETED_VALIDATED_F4_ACCEPTED_NOT_READY`') &&
    f4Text.includes('- F4 evidence accepted: `true`') &&
    f4Text.includes('PHASE_F4_SINGLE_RECORD_MEMORY_CALL_COMPLETED_SANITIZED_RESULT')
  ) {
    evidence.f4MinimalDogfoodWriteAccepted = true;
  }

  const f5Text = readTextIfExists(path.join(docsDir, 'CM1384_PHASE_F5_PERSONAL_RC_CLOSEOUT_EVIDENCE.md'));
  if (
    f5Text.includes('Status: `COMPLETED_VALIDATED_PERSONAL_DOGFOOD_READY_NOT_RC_READY`') &&
    f5Text.includes('- F5 closeout accepted: `true`') &&
    f5Text.includes('PERSONAL_DOGFOOD_READY_NOT_RC_READY') &&
    f5Text.includes('RC ready: `false`')
  ) {
    evidence.f5CloseoutAccepted = true;
  }

  return evidence;
}

function renderText(snapshot) {
  return [
    `status: ${snapshot.status}`,
    `decision: ${snapshot.decision}`,
    `operatorState: ${snapshot.operatorState}`,
    `target: ${snapshot.target}`,
    `targetCurrentlyAchieved: ${snapshot.targetCurrentlyAchieved}`,
    `localEvidenceComplete: ${snapshot.localEvidenceComplete}`,
    `cleanSyncedHead: ${snapshot.cleanSyncedHead}`,
    `branch: ${snapshot.branch}`,
    `HEAD: ${snapshot.currentHead}`,
    `origin: ${snapshot.originHead}`,
    `ahead/behind: ${snapshot.ahead}/${snapshot.behind}`,
    `worktreeClean: ${snapshot.worktreeClean}`,
    '',
    'phases:',
    ...snapshot.phases.map(phase => [
      `- ${phase.id}: ${phase.status}`,
      `  requirement: ${phase.requirement}`,
      `  blocker: ${phase.blocker || 'none'}`,
      `  nextAction: ${phase.nextAction}`
    ].join('\n')),
    '',
    `blockingPhase: ${snapshot.blockingPhase ? snapshot.blockingPhase.id : 'none'}`,
    `nextRequiredAction: ${snapshot.nextRequiredAction}`,
    '',
    'approvalTemplates:',
    `pushApprovalTemplate: ${snapshot.approvalTemplates.pushApprovalTemplate || ''}`,
    `postPushA5Gap4ApprovalTemplate: ${snapshot.approvalTemplates.postPushA5Gap4ApprovalTemplate || ''}`,
    `postPushA5Gap4TemplateCurrentlyUsable: ${snapshot.approvalTemplates.postPushA5Gap4TemplateCurrentlyUsable}`,
    `postPushA5UsabilityStatus: ${snapshot.approvalTemplates.postPushA5UsabilityStatus || ''}`,
    `f2A5Gap6ApprovalTemplate: ${snapshot.approvalTemplates.f2A5Gap6ApprovalTemplate || ''}`,
    `f2A5Gap6TemplateCurrentlyUsable: ${snapshot.approvalTemplates.f2A5Gap6TemplateCurrentlyUsable}`,
    `f3TrueLiveRecallApprovalTemplate: ${snapshot.approvalTemplates.f3TrueLiveRecallApprovalTemplate || ''}`,
    `f3TrueLiveRecallTemplateCurrentlyUsable: ${snapshot.approvalTemplates.f3TrueLiveRecallTemplateCurrentlyUsable}`,
    `f4MinimalDogfoodWriteApprovalTemplate: ${snapshot.approvalTemplates.f4MinimalDogfoodWriteApprovalTemplate || ''}`,
    `f4MinimalDogfoodWriteTemplateCurrentlyUsable: ${snapshot.approvalTemplates.f4MinimalDogfoodWriteTemplateCurrentlyUsable}`,
    '',
    `readinessClaimAllowed: ${snapshot.readinessClaimAllowed}`,
    `rcReady: ${snapshot.rcReady}`
  ].join('\n') + '\n';
}

function run(argv = process.argv.slice(2), stdout = process.stdout) {
  const options = parseArgs(argv);
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return 0;
  }

  const facts = readGitFacts(options);
  const syncPacket = buildPhaseF1SyncApprovalPacket(facts);
  const detectedEvidence = detectPhaseFEvidence(options.cwd);
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket,
    evidence: detectedEvidence
  });

  if (options.json) {
    stdout.write(`${JSON.stringify(snapshot, null, options.pretty ? 2 : 0)}\n`);
  } else {
    stdout.write(renderText(snapshot));
  }

  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  detectPhaseFEvidence,
  parseArgs,
  renderText,
  run
};
