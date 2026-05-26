#!/usr/bin/env node
'use strict';

const {
  buildReport: buildPreflightReport,
  parseArgs: parsePreflightArgs,
  renderHelp: renderPreflightHelp
} = require('./selected-audit-correlation-local-commit-isolation-preflight');
const {
  buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan
} = require('../core/SelectedAuditCorrelationLocalCommitIsolationDryRunPlan');

function buildReport(options = {}, dependencies = {}) {
  const preflightReport = buildPreflightReport(options, dependencies);
  if (preflightReport.status === 'error') {
    return {
      status: 'error',
      decision: 'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_REJECTED',
      preflightDecision: preflightReport.decision,
      preflightExecuted: false,
      planExecuted: false,
      planPrepared: false,
      stageCommandsPrepared: false,
      commitCommandPrepared: false,
      commitExecutableNow: false,
      pushExecutableNow: false,
      cleanExecutableNow: false,
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false,
      nextStep: preflightReport.nextStep
    };
  }

  const plan = buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan(preflightReport);
  return {
    status: plan.status,
    decision: 'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_EVALUATED_NOT_EXECUTED',
    source: 'cm1136_preflight_report_plus_cm1137_dry_run_plan',
    preflightExecuted: preflightReport.preflightExecuted === true,
    preflightClass: preflightReport.preflightClass,
    branch: preflightReport.branch,
    head: preflightReport.head,
    inventoryClass: preflightReport.inventoryClass,
    dirtyLineCount: preflightReport.dirtyLineCount,
    unknownDirtyLineCount: preflightReport.unknownDirtyLineCount,
    planExecuted: true,
    planClass: plan.planClass,
    planPrepared: plan.planPrepared,
    dryRunOnly: true,
    plannedActions: plan.plannedActions,
    requiredValidation: plan.requiredValidation,
    stageCommandsPrepared: false,
    commitCommandPrepared: false,
    commitExecutableNow: false,
    pushExecutableNow: false,
    cleanExecutableNow: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    preflightReport,
    plan,
    safety: plan.safety,
    nextStep: plan.nextStep
  };
}

function renderText(report) {
  return [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `preflightExecuted: ${report.preflightExecuted === true}`,
    `preflightClass: ${report.preflightClass || '<none>'}`,
    `inventoryClass: ${report.inventoryClass || '<none>'}`,
    `dirtyLineCount: ${Number.isInteger(report.dirtyLineCount) ? report.dirtyLineCount : 0}`,
    `unknownDirtyLineCount: ${Number.isInteger(report.unknownDirtyLineCount) ? report.unknownDirtyLineCount : 0}`,
    `planExecuted: ${report.planExecuted === true}`,
    `planClass: ${report.planClass || '<none>'}`,
    `planPrepared: ${report.planPrepared === true}`,
    `dryRunOnly: ${report.dryRunOnly === true}`,
    `commitExecutableNow: ${report.commitExecutableNow === true}`,
    `pushExecutableNow: ${report.pushExecutableNow === true}`,
    `cleanExecutableNow: ${report.cleanExecutableNow === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `reliabilityClaimAllowed: ${report.reliabilityClaimAllowed === true}`,
    `nextStep: ${report.nextStep}`
  ].join('\n') + '\n';
}

function renderHelp() {
  return [
    'Usage: node src/cli/selected-audit-correlation-local-commit-isolation-dry-run-plan.js [--json] [--pretty] [--approval-line <line>]',
    '',
    'Builds a dry-run-only plan from CM-1136 local commit isolation preflight.',
    'This command never stages, commits, cleans, restores, pushes, executes approval packets, reads file contents, reads audit logs, calls memory tools, or applies mutations.',
    '',
    renderPreflightHelp().trim()
  ].join('\n') + '\n';
}

function main(argv = process.argv.slice(2)) {
  const options = parsePreflightArgs(argv);
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
  parseArgs: parsePreflightArgs,
  renderHelp,
  renderText
};
