#!/usr/bin/env node
'use strict';

const {
  buildPreflightSummary,
  buildReport: buildClassifierReport,
  parseArgs: parseClassifierArgs,
  renderHelp: renderClassifierHelp
} = require('./selected-audit-correlation-current-facts-classifier');
const {
  evaluateSelectedAuditCorrelationExecutionReadiness
} = require('../core/SelectedAuditCorrelationExecutionReadiness');

function parseArgs(argv = []) {
  return parseClassifierArgs(argv);
}

function buildRejectedReport(classifierReport) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_READINESS_REJECTED_INPUT_FLAG',
    rejectedFlag: classifierReport.rejectedFlag,
    currentFactsCollected: false,
    classifierExecuted: false,
    readinessGateExecuted: false,
    readiness: null,
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
    appliesMutation: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: 'Re-run without execution, observation, audit, raw, file-input, mutation, provider, service, or memory-tool flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  const classifierReport = buildClassifierReport(options, dependencies);
  if (classifierReport.status === 'error') {
    return buildRejectedReport(classifierReport);
  }

  const readiness = evaluateSelectedAuditCorrelationExecutionReadiness({
    preflightSummary: buildPreflightSummary(classifierReport.currentFacts),
    classification: classifierReport.classification
  });

  return {
    status: 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_READINESS_CLASSIFIED_NOT_EXECUTED',
    source: 'current_git_facts_readonly_plus_no_observation_classifier_plus_execution_readiness_gate',
    currentFactsCollected: classifierReport.currentFactsCollected === true,
    currentFactsStatus: classifierReport.currentFactsStatus,
    currentFactsDecision: classifierReport.currentFactsDecision,
    currentFactsAcceptedForExecutionPreflight: classifierReport.currentFactsAcceptedForExecutionPreflight === true,
    currentFactsBlockerReasons: classifierReport.currentFactsBlockerReasons || [],
    classifierExecuted: classifierReport.classifierExecuted === true,
    classification: classifierReport.classification,
    readinessGateExecuted: true,
    readiness,
    readinessClass: readiness.readinessClass,
    blockerDowngradeAllowed: readiness.blockerDowngradeAllowed === true,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsCurrentGitFacts: true,
      executesReadOnlyGitCommands: true,
      readsObservationInput: false,
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
      appliesMutation: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    },
    classifierReport,
    nextStep: readiness.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `currentFactsStatus: ${report.currentFactsStatus || '<none>'}`,
    `currentFactsAcceptedForExecutionPreflight: ${report.currentFactsAcceptedForExecutionPreflight === true}`,
    `currentFactsBlockerReasons: ${(report.currentFactsBlockerReasons || []).join(', ') || 'none'}`,
    `classifierExecuted: ${report.classifierExecuted === true}`,
    `resultClass: ${report.classification?.resultClass || '<none>'}`,
    `readinessGateExecuted: ${report.readinessGateExecuted === true}`,
    `readinessClass: ${report.readinessClass || '<none>'}`,
    `blockerDowngradeAllowed: ${report.blockerDowngradeAllowed === true}`,
    `readsObservationInput: ${report.safety?.readsObservationInput === true}`,
    `readsTrueAuditLog: ${report.safety?.readsTrueAuditLog === true}`,
    `callsRecordMemory: ${report.safety?.callsRecordMemory === true}`,
    `callsSearchMemory: ${report.safety?.callsSearchMemory === true}`,
    `callsMemoryOverview: ${report.safety?.callsMemoryOverview === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `reliabilityClaimAllowed: ${report.reliabilityClaimAllowed === true}`,
    `nextStep: ${report.nextStep}`
  ];

  if (report.rejectedFlag) {
    lines.splice(2, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderHelp() {
  return [
    'Usage: node src/cli/selected-audit-correlation-current-facts-readiness.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts with read-only git commands, classifies the no-observation state, then runs the CM-1126 execution-readiness gate.',
    'This command never accepts observation input and never reads audit logs, .jsonl, stores, raw memory, providers, services, memory tools, or apply commands.',
    '',
    renderClassifierHelp().trim()
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
  main,
  parseArgs,
  renderHelp,
  renderText
};
