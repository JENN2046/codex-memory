#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  buildHeadBoundApprovalLine,
  CM0814_BASIS_ID,
  EXPECTED_CM0814_QUERY_FAMILY,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_PROOF_SEAM,
  evaluateRecallProofExecutionPreflight
} = require('../core/RecallProofExecutionPreflight');

const REJECTED_FLAGS = new Set([
  '--execute',
  '--run',
  '--live-proof',
  '--search-memory',
  '--record-memory',
  '--provider',
  '--write',
  '--apply',
  '--mutate',
  '--start-service'
]);

const GIT_COMMANDS = Object.freeze([
  Object.freeze(['branch', '--show-current']),
  Object.freeze(['rev-parse', 'HEAD']),
  Object.freeze(['rev-parse', 'origin/main']),
  Object.freeze(['status', '--short'])
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    rejectedFlag: null
  };

  for (const token of argv) {
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    }
  }

  return options;
}

function runGit(args, cwd = process.cwd()) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : ''
  };
}

function normalizeGitOutput(value) {
  return String(value || '').trim();
}

function collectGitFacts({ cwd = process.cwd(), gitRunner = runGit } = {}) {
  const errors = [];
  const outputs = {};

  for (const args of GIT_COMMANDS) {
    const key = args.join(' ');
    const result = gitRunner(args, cwd);
    outputs[key] = normalizeGitOutput(result.stdout);
    if (result.status !== 0 || result.error) {
      errors.push({
        command: `git ${key}`,
        status: result.status,
        stderr: normalizeGitOutput(result.stderr),
        error: normalizeGitOutput(result.error)
      });
    }
  }

  return {
    gitFacts: {
      branch: outputs['branch --show-current'],
      localHead: outputs['rev-parse HEAD'],
      originHead: outputs['rev-parse origin/main'],
      statusShort: outputs['status --short']
    },
    errors
  };
}

function buildPreflightInput(gitFacts) {
  return {
    basisId: CM0814_BASIS_ID,
    approvalLine: buildHeadBoundApprovalLine(gitFacts.localHead),
    gitFacts,
    queries: EXPECTED_CM0814_QUERY_FAMILY.map(query => ({
      slot: query.slot,
      family: query.family,
      text: query.text
    })),
    proofSeam: { ...REQUIRED_PROOF_SEAM },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS }
  };
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'RECALL_PROOF_CURRENT_FACTS_PREFLIGHT_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    acceptedForExecutionPreflight: false,
    executionStarted: false,
    liveProofStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    nextStep: 'Re-run without execution, mutation, provider, or live-proof flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const { gitFacts, errors } = collectGitFacts(dependencies);
  const preflightInput = buildPreflightInput(gitFacts);
  const preflight = evaluateRecallProofExecutionPreflight(preflightInput);

  return {
    status: preflight.acceptedForExecutionPreflight ? 'ok' : 'blocked',
    decision: preflight.status,
    source: 'current_git_facts_readonly',
    basisId: preflight.basisId,
    acceptedForExecutionPreflight: preflight.acceptedForExecutionPreflight,
    executionStarted: false,
    liveProofStarted: false,
    blockerReasons: preflight.blockerReasons,
    gitFactErrors: errors,
    exactApprovalLineMatched: preflight.exactApprovalLineMatched,
    approvalBinding: preflight.approvalBinding,
    cleanSyncedMainHead: preflight.cleanSyncedMainHead,
    exactQueryFamilyBound: preflight.exactQueryFamilyBound,
    internalProofSeamBound: preflight.internalProofSeamBound,
    boundaryFlagsBound: preflight.boundaryFlagsBound,
    normalizedGitFacts: preflight.normalizedGitFacts,
    expectedQueryFamily: preflight.expectedQueryFamily,
    collectorSafety: {
      readsCurrentGitFacts: true,
      executesReadOnlyGitCommands: true,
      writesFiles: false,
      startsServices: false,
      callsSearchMemory: false,
      callsRecordMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesPackageManifest: false,
      changesConfigWatchdogStartup: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    },
    helperSafety: preflight.safety,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    nextStep: preflight.acceptedForExecutionPreflight
      ? 'Review this current-facts preflight output; live proof execution remains separate and is not performed by this command.'
      : 'Resolve blockers, then rerun this read-only current-facts preflight before any separate live proof step.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `basisId: ${report.basisId || '<none>'}`,
    `acceptedForExecutionPreflight: ${report.acceptedForExecutionPreflight === true}`,
    `executionStarted: ${report.executionStarted === true}`,
    `liveProofStarted: ${report.liveProofStarted === true}`,
    `blockerReasons: ${(report.blockerReasons || []).join(', ') || 'none'}`,
    `gitFactErrors: ${(report.gitFactErrors || []).length}`,
    `approvalBinding: ${report.approvalBinding?.type || '<none>'}`,
    `cleanSyncedMainHead: ${report.cleanSyncedMainHead === true}`,
    `exactQueryFamilyBound: ${report.exactQueryFamilyBound === true}`,
    `internalProofSeamBound: ${report.internalProofSeamBound === true}`,
    `boundaryFlagsBound: ${report.boundaryFlagsBound === true}`,
    `callsSearchMemory: ${report.collectorSafety?.callsSearchMemory === true}`,
    `callsRecordMemory: ${report.collectorSafety?.callsRecordMemory === true}`,
    `callsProvider: ${report.collectorSafety?.callsProvider === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `nextStep: ${report.nextStep}`
  ];

  if (report.rejectedFlag) {
    lines.splice(2, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderHelp() {
  return [
    'Usage: node src/cli/recall-proof-current-facts-preflight.js [--json] [--pretty]',
    '',
    'Collects current local Git facts with read-only git commands and evaluates the CM-0814 recall proof execution preflight.',
    'This command never runs search_memory, record_memory, providers, services, or live proof execution.',
    '',
    'Rejected flags: --execute --run --live-proof --search-memory --record-memory --provider --write --apply --mutate --start-service'
  ].join('\n') + '\n';
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(renderHelp());
    return 0;
  }

  const report = buildReport(options);
  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, options.pretty ? 2 : 0));
    process.stdout.write('\n');
  } else {
    process.stdout.write(renderText(report));
  }
  return report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  buildPreflightInput,
  buildReport,
  collectGitFacts,
  main,
  parseArgs,
  renderText,
  runGit
};
