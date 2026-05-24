#!/usr/bin/env node
'use strict';

const {
  buildReport: buildBaselineReadinessReport
} = require('./memory-reliability-proof-baseline-readiness');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_DENIED_ACTIONS,
  REQUIRED_NEXT_ACTIONS,
  summarizeMemoryReliabilityProofBaselineBlockerPlan
} = require('../core/MemoryReliabilityProofBaselineBlockerPlan');

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

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    blockerPlanAccepted: false,
    baselineReadyForLiveProof: false,
    liveProofAuthorized: false,
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    nextStep: 'Re-run without execution, mutation, provider, service, commit, push, record_memory, search_memory, or live-proof flags.'
  };
}

function buildPlanPacket(baselineReport) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    baselineReportSource: 'CM-0967',
    worktreeOwnership: 'mixed_or_unverified',
    commitScopeIsolated: false,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    deniedActions: REQUIRED_DENIED_ACTIONS,
    requiredNextActions: REQUIRED_NEXT_ACTIONS,
    baselineReport
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const baselineReportBuilder = dependencies.baselineReportBuilder || buildBaselineReadinessReport;
  const baselineReport = baselineReportBuilder({}, dependencies.baselineDependencies || dependencies);
  const planPacket = buildPlanPacket(baselineReport);
  const plan = summarizeMemoryReliabilityProofBaselineBlockerPlan(planPacket);
  const status = plan.blockerPlanAccepted ? 'blocked' : 'incomplete';

  return {
    status,
    decision: plan.blockerPlanAccepted
      ? 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_ACCEPTED_NOT_EXECUTED'
      : 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKER_PLAN_INCOMPLETE_NOT_EXECUTED',
    source: 'current_baseline_readiness_cli',
    blockerPlanAccepted: plan.blockerPlanAccepted,
    baselineDecision: baselineReport.decision,
    baselineStatus: baselineReport.status,
    baselineReadyForLiveProof: false,
    dirtyBaselineBlocked: plan.dirtyBaselineBlocked,
    unscopedCommitBlocked: plan.unscopedCommitBlocked,
    commitScopeIsolated: plan.commitScopeIsolated,
    worktreeOwnership: plan.worktreeOwnership,
    blockerIds: plan.blockerIds,
    requiredNextActions: plan.requiredNextActions,
    deniedActions: plan.deniedActions,
    checks: plan.checks,
    laneDirtyCounts: Array.isArray(baselineReport.laneReports)
      ? baselineReport.laneReports.map(report => report.dirtyStatusLineCount)
      : [],
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
      changesPackageConfigWatchdogStartup: false,
      commits: false,
      pushes: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    helperSafety: plan.safety,
    nextStep: plan.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `blockerPlanAccepted: ${report.blockerPlanAccepted === true}`,
    `baselineDecision: ${report.baselineDecision || '<none>'}`,
    `baselineReadyForLiveProof: ${report.baselineReadyForLiveProof === true}`,
    `dirtyBaselineBlocked: ${report.dirtyBaselineBlocked === true}`,
    `unscopedCommitBlocked: ${report.unscopedCommitBlocked === true}`,
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
    'Usage: node src/cli/memory-reliability-proof-baseline-blocker-plan.js [--json] [--pretty]',
    '',
    'Runs the CM-0967 read-only baseline readiness CLI, then consumes that report through the CM-0968 blocker-plan helper.',
    'This command never runs search_memory, record_memory, providers, services, live proof execution, durable writes, commit, push, or readiness claims.',
    '',
    'Rejected flags: --execute --run --live-proof --search-memory --record-memory --provider --write --apply --mutate --start-service --commit --push'
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
  buildPlanPacket,
  buildReport,
  main,
  parseArgs,
  renderText
};
