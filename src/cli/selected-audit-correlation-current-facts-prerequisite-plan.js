#!/usr/bin/env node
'use strict';

const {
  buildReport: buildDowngradeReviewReport,
  parseArgs,
  renderHelp: renderDowngradeReviewHelp
} = require('./selected-audit-correlation-current-facts-downgrade-review');
const {
  summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan
} = require('../core/SelectedAuditCorrelationPrerequisiteBlockerPlan');

function buildRejectedReport(downgradeReport) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREREQUISITE_PLAN_REJECTED_INPUT_FLAG',
    rejectedFlag: downgradeReport.rejectedFlag,
    currentFactsCollected: false,
    downgradeReviewExecuted: false,
    prerequisitePlanExecuted: false,
    downgradeReport: null,
    prerequisitePlan: null,
    blockerDowngradeAllowed: false,
    cm1120ExecutionAllowedNow: false,
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
  const downgradeReport = buildDowngradeReviewReport(options, dependencies);
  if (downgradeReport.status === 'error') {
    return buildRejectedReport(downgradeReport);
  }

  const prerequisitePlan = summarizeSelectedAuditCorrelationPrerequisiteBlockerPlan(downgradeReport);

  return {
    status: 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_PREREQUISITE_PLAN_CLASSIFIED_NOT_EXECUTED',
    source: 'current_git_facts_readonly_plus_cm1129_downgrade_review_plus_cm1130_prerequisite_plan',
    currentFactsCollected: downgradeReport.currentFactsCollected === true,
    currentFactsStatus: downgradeReport.currentFactsStatus,
    currentFactsBlockerReasons: downgradeReport.currentFactsBlockerReasons || [],
    readinessClass: downgradeReport.readinessClass,
    downgradeReviewExecuted: downgradeReport.downgradeReviewExecuted === true,
    reviewClass: downgradeReport.reviewClass,
    prerequisitePlanExecuted: true,
    prerequisitePlan,
    planClass: prerequisitePlan.planClass,
    prerequisiteBlockers: prerequisitePlan.prerequisiteBlockers || [],
    requiredNextActions: prerequisitePlan.requiredNextActions || [],
    deniedActions: prerequisitePlan.deniedActions || [],
    blockerDowngradeAllowed: prerequisitePlan.blockerDowngradeAllowed === true,
    cm1120ExecutionAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    downgradeReport,
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
    nextStep: prerequisitePlan.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `currentFactsStatus: ${report.currentFactsStatus || '<none>'}`,
    `currentFactsBlockerReasons: ${(report.currentFactsBlockerReasons || []).join(', ') || 'none'}`,
    `readinessClass: ${report.readinessClass || '<none>'}`,
    `downgradeReviewExecuted: ${report.downgradeReviewExecuted === true}`,
    `reviewClass: ${report.reviewClass || '<none>'}`,
    `prerequisitePlanExecuted: ${report.prerequisitePlanExecuted === true}`,
    `planClass: ${report.planClass || '<none>'}`,
    `prerequisiteBlockers: ${(report.prerequisiteBlockers || []).join(', ') || 'none'}`,
    `requiredNextActions: ${(report.requiredNextActions || []).join(', ') || 'none'}`,
    `blockerDowngradeAllowed: ${report.blockerDowngradeAllowed === true}`,
    `cm1120ExecutionAllowedNow: ${report.cm1120ExecutionAllowedNow === true}`,
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
    'Usage: node src/cli/selected-audit-correlation-current-facts-prerequisite-plan.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts through CM-1129, then summarizes prerequisite blockers through the CM-1130 no-execution prerequisite plan.',
    'This command never approves or executes CM-1111, CM-1115, or CM-1120, and never reads audit logs, observation input, .jsonl, stores, raw memory, providers, services, memory tools, or apply commands.',
    '',
    renderDowngradeReviewHelp().trim()
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
