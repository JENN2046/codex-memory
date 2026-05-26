#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  EXACT_APPROVAL_LINE,
  REQUEST_SHA256,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_CURRENT_ARTIFACTS,
  REQUIRED_OBSERVATION_SURFACE,
  REQUIRED_PRIOR_RESULTS,
  evaluateSelectedAuditCorrelationObservationPreflight
} = require('../core/SelectedAuditCorrelationObservationPreflight');

const REJECTED_FLAGS = new Set([
  '--execute',
  '--run',
  '--observe',
  '--audit-read',
  '--read-audit',
  '--jsonl',
  '--raw',
  '--record-memory',
  '--search-memory',
  '--memory-overview',
  '--tombstone-memory',
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
    withSatisfiedPriorResults: false,
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
    if (token === '--with-satisfied-prior-results') {
      options.withSatisfiedPriorResults = true;
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

function buildPreflightInput(gitFacts, options = {}) {
  return {
    basisId: 'CM-1120',
    approvalLine: EXACT_APPROVAL_LINE,
    packetId: 'CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001',
    requestSha256: REQUEST_SHA256,
    gitFacts,
    priorResults: options.withSatisfiedPriorResults
      ? REQUIRED_PRIOR_RESULTS.map(item => ({ ...item }))
      : [],
    currentArtifacts: REQUIRED_CURRENT_ARTIFACTS.map(item => ({ ...item })),
    observationSurface: { ...REQUIRED_OBSERVATION_SURFACE },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS }
  };
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREFLIGHT_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    acceptedForExecutionPreflight: false,
    executionStarted: false,
    auditObservationStarted: false,
    callsRecordMemory: false,
    callsSearchMemory: false,
    callsMemoryOverview: false,
    readsTrueAuditLog: false,
    readsRawAudit: false,
    readinessClaimAllowed: false,
    nextStep: 'Re-run without execution, audit-read, mutation, provider, service, or memory-tool flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const { gitFacts, errors } = collectGitFacts(dependencies);
  const preflightInput = buildPreflightInput(gitFacts, options);
  const preflight = evaluateSelectedAuditCorrelationObservationPreflight(preflightInput);

  return {
    status: preflight.acceptedForExecutionPreflight ? 'ok' : 'blocked',
    decision: preflight.status,
    source: 'current_git_facts_readonly',
    basisId: preflight.basisId,
    acceptedForExecutionPreflight: preflight.acceptedForExecutionPreflight,
    executionStarted: false,
    auditObservationStarted: false,
    preflightOnly: preflight.preflightOnly,
    separateExactApprovalRequired: preflight.separateExactApprovalRequired,
    implicitAuditReadAuthorizationGranted: preflight.implicitAuditReadAuthorizationGranted,
    withSatisfiedPriorResults: options.withSatisfiedPriorResults === true,
    blockerReasons: preflight.blockerReasons,
    gitFactErrors: errors,
    exactApprovalLineMatched: preflight.exactApprovalLineMatched,
    requestHashMatched: preflight.requestHashMatched,
    cleanTargetHead: preflight.cleanTargetHead,
    requiredPriorResultsBound: preflight.requiredPriorResultsBound,
    currentArtifactsBound: preflight.currentArtifactsBound,
    observationSurfaceBound: preflight.observationSurfaceBound,
    boundaryFlagsBound: preflight.boundaryFlagsBound,
    normalizedGitFacts: preflight.normalizedGitFacts,
    requiredPriorResults: preflight.requiredPriorResults,
    requiredCurrentArtifacts: preflight.requiredCurrentArtifacts,
    requiredObservationSurface: preflight.requiredObservationSurface,
    requiredBoundaryFlags: preflight.requiredBoundaryFlags,
    collectorSafety: {
      readsCurrentGitFacts: true,
      executesReadOnlyGitCommands: true,
      writesFiles: false,
      startsServices: false,
      readsTrueAuditLog: false,
      readsRawAudit: false,
      readsRawMemory: false,
      readsJsonl: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false,
      callsProvider: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesPackageManifest: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    },
    helperSafety: preflight.safety,
    readinessClaimAllowed: false,
    memoryWriteReliableClaimed: false,
    memoryRecallReliableClaimed: false,
    nextStep: preflight.acceptedForExecutionPreflight
      ? 'Review this current-facts preflight output; selected audit observation still requires separate operator execution and is not performed by this command.'
      : 'Resolve blockers, then rerun this read-only current-facts preflight before any separate selected audit observation step.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `basisId: ${report.basisId || '<none>'}`,
    `acceptedForExecutionPreflight: ${report.acceptedForExecutionPreflight === true}`,
    `executionStarted: ${report.executionStarted === true}`,
    `auditObservationStarted: ${report.auditObservationStarted === true}`,
    `preflightOnly: ${report.preflightOnly === true}`,
    `separateExactApprovalRequired: ${report.separateExactApprovalRequired === true}`,
    `implicitAuditReadAuthorizationGranted: ${report.implicitAuditReadAuthorizationGranted === true}`,
    `withSatisfiedPriorResults: ${report.withSatisfiedPriorResults === true}`,
    `blockerReasons: ${(report.blockerReasons || []).join(', ') || 'none'}`,
    `gitFactErrors: ${(report.gitFactErrors || []).length}`,
    `cleanTargetHead: ${report.cleanTargetHead === true}`,
    `requiredPriorResultsBound: ${report.requiredPriorResultsBound === true}`,
    `currentArtifactsBound: ${report.currentArtifactsBound === true}`,
    `observationSurfaceBound: ${report.observationSurfaceBound === true}`,
    `boundaryFlagsBound: ${report.boundaryFlagsBound === true}`,
    `readsTrueAuditLog: ${report.collectorSafety?.readsTrueAuditLog === true}`,
    `readsRawAudit: ${report.collectorSafety?.readsRawAudit === true}`,
    `callsRecordMemory: ${report.collectorSafety?.callsRecordMemory === true}`,
    `callsSearchMemory: ${report.collectorSafety?.callsSearchMemory === true}`,
    `callsMemoryOverview: ${report.collectorSafety?.callsMemoryOverview === true}`,
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
    'Usage: node src/cli/selected-audit-correlation-current-facts-preflight.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts with read-only git commands and evaluates the CM-1120 selected audit-correlation observation preflight.',
    'This command never reads audit logs, .jsonl, stores, raw memory, or runs memory tools, providers, services, or apply commands.',
    '',
    'By default, required CM-1111/CM-1115 prior results are not assumed and the preflight remains blocked.',
    '',
    'Rejected flags: --execute --run --observe --audit-read --read-audit --jsonl --raw --record-memory --search-memory --memory-overview --tombstone-memory --provider --write --apply --mutate --start-service'
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
  renderHelp,
  renderText,
  runGit
};
