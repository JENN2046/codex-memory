#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  buildReport: buildBlockerPlanReport
} = require('./memory-reliability-proof-baseline-blocker-plan');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DENIED_ACTIONS,
  summarizeMemoryReliabilityProofBaselineIsolationReview
} = require('../core/MemoryReliabilityProofBaselineIsolationReview');

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
  '--start-service',
  '--stage',
  '--commit',
  '--push'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    rejectedFlag: null
  };

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (REJECTED_FLAGS.has(arg)) {
      options.rejectedFlag = arg;
    }
  }

  return options;
}

function runGitStatusShort(cwd = process.cwd()) {
  const result = spawnSync('git', ['status', '--short'], {
    cwd,
    encoding: 'utf8',
    shell: false
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : ''
  };
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    isolationReviewAccepted: false,
    safeForLiveProof: false,
    safeForCommit: false,
    baselineReadyForLiveProof: false,
    dirtyBaselineBlocked: false,
    unscopedCommitBlocked: true,
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    nextStep: 'Re-run without execution, mutation, provider, service, stage, commit, push, record_memory, search_memory, or live-proof flags.'
  };
}

function buildReviewPacket(blockerPlanReport, gitStatusShort) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'current_git_status_readonly',
    reviewOnly: true,
    blockerPlanSource: 'CM-0968',
    worktreeOwnership: 'mixed_or_unverified',
    commitScopeIsolated: false,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    deniedActions: REQUIRED_DENIED_ACTIONS,
    blockerPlanReport,
    gitStatusShort
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const blockerPlanReportBuilder = dependencies.blockerPlanReportBuilder || buildBlockerPlanReport;
  const gitStatusRunner = dependencies.gitStatusRunner || runGitStatusShort;
  const blockerPlanReport = blockerPlanReportBuilder({}, dependencies.blockerPlanDependencies || dependencies);
  const gitStatus = gitStatusRunner(dependencies.cwd || process.cwd());
  const reviewPacket = buildReviewPacket(blockerPlanReport, gitStatus.stdout || '');
  const review = summarizeMemoryReliabilityProofBaselineIsolationReview(reviewPacket);
  const gitStatusOk = gitStatus.status === 0 && !gitStatus.error;
  const accepted = review.isolationReviewAccepted && gitStatusOk;

  return {
    status: accepted ? 'blocked' : 'incomplete',
    decision: accepted
      ? 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_BLOCKED_NOT_EXECUTED'
      : 'MEMORY_RELIABILITY_PROOF_BASELINE_ISOLATION_REVIEW_INCOMPLETE_NOT_EXECUTED',
    source: 'current_git_status_readonly',
    blockerPlanDecision: blockerPlanReport.decision,
    blockerPlanStatus: blockerPlanReport.status,
    blockerPlanAccepted: blockerPlanReport.blockerPlanAccepted === true,
    isolationReviewAccepted: accepted,
    safeForLiveProof: false,
    safeForCommit: false,
    baselineReadyForLiveProof: false,
    dirtyBaselineBlocked: review.dirtyBaselineBlocked,
    unscopedCommitBlocked: review.unscopedCommitBlocked,
    worktreeOwnership: review.worktreeOwnership,
    commitScopeIsolated: review.commitScopeIsolated,
    dirtySummary: review.dirtySummary,
    deniedActions: review.deniedActions,
    checks: {
      ...review.checks,
      gitStatusOk
    },
    gitStatus: {
      status: gitStatus.status,
      stderr: gitStatus.stderr,
      error: gitStatus.error
    },
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    safety: {
      runsReadOnlyGitStatus: true,
      writesFiles: false,
      startsServices: false,
      stagesFiles: false,
      commits: false,
      pushes: false,
      callsSearchMemory: false,
      callsRecordMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesPackageConfigWatchdogStartup: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    helperSafety: review.safety,
    nextStep: gitStatusOk
      ? review.nextStep
      : 'Git status could not be read. Keep live proof, local commit, and reliability/readiness claims blocked.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `isolationReviewAccepted: ${report.isolationReviewAccepted === true}`,
    `safeForLiveProof: ${report.safeForLiveProof === true}`,
    `safeForCommit: ${report.safeForCommit === true}`,
    `baselineReadyForLiveProof: ${report.baselineReadyForLiveProof === true}`,
    `dirtyBaselineBlocked: ${report.dirtyBaselineBlocked === true}`,
    `unscopedCommitBlocked: ${report.unscopedCommitBlocked === true}`,
    `dirtyStatusLineCount: ${report.dirtySummary ? report.dirtySummary.dirtyStatusLineCount : 0}`,
    `trackedModifiedCount: ${report.dirtySummary ? report.dirtySummary.trackedModifiedCount : 0}`,
    `untrackedCount: ${report.dirtySummary ? report.dirtySummary.untrackedCount : 0}`,
    `sharedStateCount: ${report.dirtySummary ? report.dirtySummary.sharedStateCount : 0}`,
    `runtimeSurfaceCount: ${report.dirtySummary ? report.dirtySummary.runtimeSurfaceCount : 0}`,
    `reliabilityBaselineCount: ${report.dirtySummary ? report.dirtySummary.reliabilityBaselineCount : 0}`,
    `otherCount: ${report.dirtySummary ? report.dirtySummary.otherCount : 0}`,
    `executionStarted: ${report.executionStarted === true}`,
    `liveProofStarted: ${report.liveProofStarted === true}`,
    `recordMemoryStarted: ${report.recordMemoryStarted === true}`,
    `callsSearchMemory: ${report.callsSearchMemory === true}`,
    `callsRecordMemory: ${report.callsRecordMemory === true}`,
    `callsProvider: ${report.callsProvider === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `memoryRecallReliableClaimed: ${report.memoryRecallReliableClaimed === true}`,
    `memoryWriteReliableClaimed: ${report.memoryWriteReliableClaimed === true}`,
    `nextStep: ${report.nextStep}`
  ];

  if (report.rejectedFlag) {
    lines.splice(2, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderHelp() {
  return [
    'Usage: node src/cli/memory-reliability-proof-baseline-isolation-review.js [--json] [--pretty]',
    '',
    'Runs the CM-0968 blocker-plan path and read-only git status, then classifies whether the current dirty baseline is isolated enough for live proof or unscoped local commit.',
    'This command never stages, commits, pushes, runs search_memory, runs record_memory, calls providers, starts services, writes durable memory, or claims readiness.',
    '',
    'Rejected flags: --execute --run --live-proof --search-memory --record-memory --provider --write --apply --mutate --start-service --stage --commit --push'
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
  buildReport,
  buildReviewPacket,
  main,
  parseArgs,
  renderText,
  runGitStatusShort
};
