#!/usr/bin/env node
'use strict';

const {
  buildReport: buildReadinessReport,
  parseArgs,
  renderHelp: renderReadinessHelp
} = require('./selected-audit-correlation-current-facts-readiness');
const {
  reviewSelectedAuditCorrelationBlockerDowngrade
} = require('../core/SelectedAuditCorrelationBlockerDowngradeReview');

function buildRejectedReport(readinessReport) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_DOWNGRADE_REVIEW_REJECTED_INPUT_FLAG',
    rejectedFlag: readinessReport.rejectedFlag,
    currentFactsCollected: false,
    readinessGateExecuted: false,
    downgradeReviewExecuted: false,
    readinessReport: null,
    review: null,
    blockerDowngradeAllowed: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsCurrentGitFacts: false,
      executesReadOnlyGitCommands: false,
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
    nextStep: 'Re-run without execution, observation, audit, raw, file-input, mutation, provider, service, or memory-tool flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  const readinessReport = buildReadinessReport(options, dependencies);
  if (readinessReport.status === 'error') {
    return buildRejectedReport(readinessReport);
  }

  const review = reviewSelectedAuditCorrelationBlockerDowngrade(readinessReport);

  return {
    status: 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_DOWNGRADE_REVIEW_CLASSIFIED_NOT_EXECUTED',
    source: 'current_git_facts_readonly_plus_readiness_cli_plus_explicit_input_downgrade_review',
    currentFactsCollected: readinessReport.currentFactsCollected === true,
    currentFactsStatus: readinessReport.currentFactsStatus,
    currentFactsBlockerReasons: readinessReport.currentFactsBlockerReasons || [],
    readinessGateExecuted: readinessReport.readinessGateExecuted === true,
    readinessClass: readinessReport.readinessClass,
    downgradeReviewExecuted: true,
    review,
    reviewClass: review.reviewClass,
    blockerDowngradeAllowed: review.blockerDowngradeAllowed === true,
    downgradeScope: review.downgradeScope,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    readinessReport,
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
    nextStep: review.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `currentFactsStatus: ${report.currentFactsStatus || '<none>'}`,
    `currentFactsBlockerReasons: ${(report.currentFactsBlockerReasons || []).join(', ') || 'none'}`,
    `readinessGateExecuted: ${report.readinessGateExecuted === true}`,
    `readinessClass: ${report.readinessClass || '<none>'}`,
    `downgradeReviewExecuted: ${report.downgradeReviewExecuted === true}`,
    `reviewClass: ${report.reviewClass || '<none>'}`,
    `blockerDowngradeAllowed: ${report.blockerDowngradeAllowed === true}`,
    `downgradeScope: ${report.downgradeScope || 'none'}`,
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
    'Usage: node src/cli/selected-audit-correlation-current-facts-downgrade-review.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts through CM-1127, then reviews downgrade eligibility through the CM-1128 explicit-input guard.',
    'This command never accepts observation input and never reads audit logs, .jsonl, stores, raw memory, providers, services, memory tools, or apply commands.',
    '',
    renderReadinessHelp().trim()
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
