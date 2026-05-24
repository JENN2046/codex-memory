#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  EXACT_WRITE_APPROVAL_LINE,
  REQUIRED_BASIS,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_SCOPE_ASSUMPTIONS,
  REQUIRED_WRITE_SEAM,
  evaluateWriteProofExecutionPreflight
} = require('../core/WriteProofExecutionPreflight');

const REJECTED_FLAGS = new Set([
  '--execute',
  '--run',
  '--live-proof',
  '--record-memory',
  '--search-memory',
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
  Object.freeze(['rev-parse', 'refs/remotes/origin/main']),
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
      remoteMainHead: outputs['rev-parse refs/remotes/origin/main'],
      statusShort: outputs['status --short']
    },
    errors
  };
}

function buildPreflightInput(gitFacts) {
  return {
    basisId: REQUIRED_BASIS.basisFamily,
    approvalLine: EXACT_WRITE_APPROVAL_LINE,
    gitFacts,
    basis: { ...REQUIRED_BASIS },
    writeSeam: { ...REQUIRED_WRITE_SEAM },
    scopeAssumptions: { ...REQUIRED_SCOPE_ASSUMPTIONS },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS }
  };
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'WRITE_PROOF_CURRENT_FACTS_PREFLIGHT_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    acceptedForExecutionPreflight: false,
    executionStarted: false,
    recordMemoryStarted: false,
    callsRecordMemory: false,
    callsSearchMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    nextStep: 'Re-run without execution, mutation, provider, service, record_memory, or search_memory flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const { gitFacts, errors } = collectGitFacts(dependencies);
  const preflightInput = buildPreflightInput(gitFacts);
  const preflight = evaluateWriteProofExecutionPreflight(preflightInput);

  return {
    status: preflight.acceptedForExecutionPreflight ? 'ok' : 'blocked',
    decision: preflight.status,
    source: 'current_git_facts_readonly',
    basisId: preflight.basisId,
    acceptedForExecutionPreflight: preflight.acceptedForExecutionPreflight,
    executionStarted: false,
    recordMemoryStarted: false,
    blockerReasons: preflight.blockerReasons,
    gitFactErrors: errors,
    exactApprovalLineMatched: preflight.exactApprovalLineMatched,
    cleanSyncedMainHead: preflight.cleanSyncedMainHead,
    exactBasisBound: preflight.exactBasisBound,
    optInAppSeamBound: preflight.optInAppSeamBound,
    scopeAssumptionsBound: preflight.scopeAssumptionsBound,
    boundaryFlagsBound: preflight.boundaryFlagsBound,
    normalizedGitFacts: preflight.normalizedGitFacts,
    requiredBasis: preflight.requiredBasis,
    requiredWriteSeam: preflight.requiredWriteSeam,
    requiredScopeAssumptions: preflight.requiredScopeAssumptions,
    requiredBoundaryFlags: preflight.requiredBoundaryFlags,
    collectorSafety: {
      readsCurrentGitFacts: true,
      executesReadOnlyGitCommands: true,
      writesFiles: false,
      startsServices: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesPackageManifest: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    helperSafety: preflight.safety,
    readinessClaimAllowed: false,
    memoryWriteReliableClaimed: false,
    nextStep: preflight.acceptedForExecutionPreflight
      ? 'Review this current-facts preflight output; live record_memory execution remains separate and is not performed by this command.'
      : 'Resolve blockers, then rerun this read-only current-facts preflight before any separate live write proof step.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `basisId: ${report.basisId || '<none>'}`,
    `acceptedForExecutionPreflight: ${report.acceptedForExecutionPreflight === true}`,
    `executionStarted: ${report.executionStarted === true}`,
    `recordMemoryStarted: ${report.recordMemoryStarted === true}`,
    `blockerReasons: ${(report.blockerReasons || []).join(', ') || 'none'}`,
    `gitFactErrors: ${(report.gitFactErrors || []).length}`,
    `cleanSyncedMainHead: ${report.cleanSyncedMainHead === true}`,
    `exactBasisBound: ${report.exactBasisBound === true}`,
    `optInAppSeamBound: ${report.optInAppSeamBound === true}`,
    `scopeAssumptionsBound: ${report.scopeAssumptionsBound === true}`,
    `boundaryFlagsBound: ${report.boundaryFlagsBound === true}`,
    `callsRecordMemory: ${report.collectorSafety?.callsRecordMemory === true}`,
    `callsSearchMemory: ${report.collectorSafety?.callsSearchMemory === true}`,
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
    'Usage: node src/cli/write-proof-current-facts-preflight.js [--json] [--pretty]',
    '',
    'Collects current local Git facts with read-only git commands and evaluates the CM-0737 write proof execution preflight.',
    'This command never runs record_memory, search_memory, providers, services, or live proof execution.',
    '',
    'Rejected flags: --execute --run --live-proof --record-memory --search-memory --provider --write --apply --mutate --start-service'
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
