#!/usr/bin/env node
'use strict';

const {
  buildReport: buildRecallCurrentFactsReport
} = require('./recall-proof-current-facts-preflight');
const {
  buildReport: buildWriteCurrentFactsReport
} = require('./write-proof-current-facts-preflight');
const {
  DENIED_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  summarizeMemoryReliabilityProofBaselineReadinessPolicy
} = require('../core/MemoryReliabilityProofBaselineReadinessPolicy');

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
    decision: 'MEMORY_RELIABILITY_PROOF_BASELINE_READINESS_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    baselineReadinessReviewAccepted: false,
    baselineReadyForLiveProof: false,
    executionStarted: false,
    liveProofStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    nextStep: 'Re-run without execution, mutation, provider, service, record_memory, search_memory, or live-proof flags.'
  };
}

function buildPolicyPacket(recallReport, writeReport) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'explicit_input',
    reviewOnly: true,
    currentFactsOnly: true,
    liveProofAuthorized: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    deniedActions: DENIED_ACTIONS,
    reports: {
      recall: recallReport,
      write: writeReport
    }
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const recallReportBuilder = dependencies.recallReportBuilder || buildRecallCurrentFactsReport;
  const writeReportBuilder = dependencies.writeReportBuilder || buildWriteCurrentFactsReport;
  const recallReport = recallReportBuilder({}, dependencies.recallDependencies || dependencies);
  const writeReport = writeReportBuilder({}, dependencies.writeDependencies || dependencies);
  const policyPacket = buildPolicyPacket(recallReport, writeReport);
  const baseline = summarizeMemoryReliabilityProofBaselineReadinessPolicy(policyPacket);
  const status = baseline.baselineReadyForLiveProof ? 'ok' : 'blocked';

  return {
    status,
    decision: baseline.baselineReadyForLiveProof
      ? 'MEMORY_RELIABILITY_PROOF_BASELINE_READY_NOT_EXECUTED'
      : 'MEMORY_RELIABILITY_PROOF_BASELINE_BLOCKED_NOT_EXECUTED',
    source: 'current_git_facts_readonly',
    baselineReadinessReviewAccepted: baseline.baselineReadinessReviewAccepted,
    baselineReadyForLiveProof: baseline.baselineReadyForLiveProof,
    dirtyBaselineBlocked: baseline.dirtyBaselineBlocked,
    blockerIds: baseline.blockerIds,
    laneReports: baseline.lanes.reports,
    deniedActions: baseline.deniedActions,
    recallDecision: recallReport.decision,
    writeDecision: writeReport.decision,
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
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
      changesPackageManifest: false,
      changesConfigWatchdogStartup: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    helperSafety: baseline.safety,
    nextStep: baseline.baselineReadyForLiveProof
      ? 'Review this combined baseline packet; live recall/write proof execution remains separate and is not performed by this command.'
      : 'Resolve recall/write lane blockers, then rerun this read-only baseline readiness CLI before any separate live proof step.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `baselineReadinessReviewAccepted: ${report.baselineReadinessReviewAccepted === true}`,
    `baselineReadyForLiveProof: ${report.baselineReadyForLiveProof === true}`,
    `dirtyBaselineBlocked: ${report.dirtyBaselineBlocked === true}`,
    `recallDecision: ${report.recallDecision || '<none>'}`,
    `writeDecision: ${report.writeDecision || '<none>'}`,
    `executionStarted: ${report.executionStarted === true}`,
    `liveProofStarted: ${report.liveProofStarted === true}`,
    `recordMemoryStarted: ${report.recordMemoryStarted === true}`,
    `callsSearchMemory: ${report.safety?.callsSearchMemory === true}`,
    `callsRecordMemory: ${report.safety?.callsRecordMemory === true}`,
    `callsProvider: ${report.safety?.callsProvider === true}`,
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
    'Usage: node src/cli/memory-reliability-proof-baseline-readiness.js [--json] [--pretty]',
    '',
    'Runs the recall and write current-facts preflight collectors, then combines them with the CM-0934 baseline readiness policy.',
    'This command never runs search_memory, record_memory, providers, services, live proof execution, durable writes, or readiness claims.',
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
  buildPolicyPacket,
  buildReport,
  main,
  parseArgs,
  renderText
};
