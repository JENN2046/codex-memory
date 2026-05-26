#!/usr/bin/env node
'use strict';

const {
  buildReport: buildCurrentFactsPreflightReport,
  parseArgs: parseCurrentFactsArgs,
  renderHelp: renderCurrentFactsHelp
} = require('./selected-audit-correlation-current-facts-preflight');
const {
  classifySelectedAuditCorrelationObservation
} = require('../core/SelectedAuditCorrelationResultClassifier');

const REJECTED_CLASSIFIER_FLAGS = new Set([
  '--observation',
  '--observation-file',
  '--input',
  '--input-file',
  '--audit-json',
  '--audit-log'
]);

function parseArgs(argv = []) {
  const currentFactsOptions = parseCurrentFactsArgs(argv);
  let rejectedFlag = currentFactsOptions.rejectedFlag || null;

  for (const token of argv) {
    if (REJECTED_CLASSIFIER_FLAGS.has(token)) {
      rejectedFlag = token;
    }
  }

  return {
    ...currentFactsOptions,
    rejectedFlag
  };
}

function buildPreflightSummary(currentFactsReport = {}) {
  return {
    acceptedForExecutionPreflight: currentFactsReport.acceptedForExecutionPreflight === true,
    exactApprovalLineMatched: currentFactsReport.exactApprovalLineMatched === true,
    requestHashMatched: currentFactsReport.requestHashMatched === true,
    cleanTargetHead: currentFactsReport.cleanTargetHead === true,
    requiredPriorResultsBound: currentFactsReport.requiredPriorResultsBound === true,
    currentArtifactsBound: currentFactsReport.currentArtifactsBound === true,
    observationSurfaceBound: currentFactsReport.observationSurfaceBound === true,
    boundaryFlagsBound: currentFactsReport.boundaryFlagsBound === true,
    executionStarted: currentFactsReport.executionStarted === true,
    auditObservationStarted: currentFactsReport.auditObservationStarted === true,
    blockerReasons: Array.isArray(currentFactsReport.blockerReasons) ? currentFactsReport.blockerReasons : []
  };
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIER_REJECTED_INPUT_FLAG',
    rejectedFlag,
    currentFactsCollected: false,
    classifierExecuted: false,
    classification: null,
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
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const currentFactsReport = buildCurrentFactsPreflightReport(options, dependencies);
  const classification = classifySelectedAuditCorrelationObservation({
    preflightSummary: buildPreflightSummary(currentFactsReport),
    observation: null,
    followup: {}
  });

  return {
    status: currentFactsReport.status === 'error' ? 'error' : 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIED_NO_OBSERVATION',
    source: 'current_git_facts_readonly_plus_no_observation_classifier',
    currentFactsCollected: true,
    currentFactsStatus: currentFactsReport.status,
    currentFactsDecision: currentFactsReport.decision,
    currentFactsAcceptedForExecutionPreflight: currentFactsReport.acceptedForExecutionPreflight === true,
    currentFactsBlockerReasons: currentFactsReport.blockerReasons || [],
    classifierExecuted: true,
    classification,
    blockerDowngradeAllowed: classification.blockerDowngradeAllowed === true,
    allowedDowngrade: classification.allowedDowngrade,
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
    currentFacts: currentFactsReport,
    nextStep: 'No selected audit observation was supplied or read. Future observation still requires separate exact approval and must remain selected sanitized output only.'
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
    `blockerDowngradeAllowed: ${report.blockerDowngradeAllowed === true}`,
    `allowedDowngrade: ${report.allowedDowngrade || 'none'}`,
    `readsObservationInput: ${report.safety?.readsObservationInput === true}`,
    `readsTrueAuditLog: ${report.safety?.readsTrueAuditLog === true}`,
    `readsRawAudit: ${report.safety?.readsRawAudit === true}`,
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
    'Usage: node src/cli/selected-audit-correlation-current-facts-classifier.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts with read-only git commands, evaluates the CM-1120 preflight, then classifies the current no-observation state through CM-1123.',
    'This command never accepts observation input and never reads audit logs, .jsonl, stores, raw memory, providers, services, memory tools, or apply commands.',
    '',
    renderCurrentFactsHelp().trim(),
    '',
    'Additional rejected flags: --observation --observation-file --input --input-file --audit-json --audit-log'
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
  buildPreflightSummary,
  buildReport,
  main,
  parseArgs,
  renderHelp,
  renderText
};
