#!/usr/bin/env node
'use strict';

const {
  buildReport: buildInventoryReport,
  parseArgs,
  renderHelp: renderInventoryHelp
} = require('./selected-audit-correlation-dirty-scope-inventory');
const {
  summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision
} = require('../core/SelectedAuditCorrelationDirtyScopeIsolationDecision');

function buildRejectedReport(inventoryReport) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_ISOLATION_DECISION_REJECTED_MUTATION_FLAG',
    rejectedFlag: inventoryReport.rejectedFlag,
    currentFactsCollected: false,
    inventoryExecuted: false,
    isolationDecisionExecuted: false,
    isolationDecision: null,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: 'Re-run without apply, approve, clean, commit, delete, execute, fix, reset, or restore flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  const inventoryReport = buildInventoryReport(options, dependencies);
  if (inventoryReport.status === 'error') {
    return buildRejectedReport(inventoryReport);
  }

  const isolationDecision = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision(inventoryReport);

  return {
    status: 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_ISOLATION_DECISION_CLASSIFIED_NOT_MUTATED',
    source: 'current_git_status_short_readonly_plus_cm1132_inventory_plus_cm1133_isolation_decision',
    currentFactsCollected: inventoryReport.currentFactsCollected === true,
    inventoryExecuted: inventoryReport.inventoryExecuted === true,
    inventoryClass: inventoryReport.inventoryClass,
    isolationDecisionExecuted: true,
    isolationDecision,
    decisionClass: isolationDecision.decisionClass,
    worktreeClean: isolationDecision.worktreeClean,
    dirtyLineCount: isolationDecision.dirtyLineCount,
    unknownDirtyLineCount: isolationDecision.unknownDirtyLineCount,
    reviewBundles: isolationDecision.reviewBundles,
    humanReviewRequired: isolationDecision.humanReviewRequired === true,
    commitDecisionPrepared: isolationDecision.commitDecisionPrepared === true,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    inventoryReport,
    safety: isolationDecision.safety,
    nextStep: isolationDecision.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `inventoryExecuted: ${report.inventoryExecuted === true}`,
    `inventoryClass: ${report.inventoryClass || '<none>'}`,
    `isolationDecisionExecuted: ${report.isolationDecisionExecuted === true}`,
    `decisionClass: ${report.decisionClass || '<none>'}`,
    `worktreeClean: ${report.worktreeClean === true}`,
    `dirtyLineCount: ${Number.isInteger(report.dirtyLineCount) ? report.dirtyLineCount : 0}`,
    `unknownDirtyLineCount: ${Number.isInteger(report.unknownDirtyLineCount) ? report.unknownDirtyLineCount : 0}`,
    `humanReviewRequired: ${report.humanReviewRequired === true}`,
    `commitDecisionPrepared: ${report.commitDecisionPrepared === true}`,
    `commitAuthorized: ${report.commitAuthorized === true}`,
    `cleanAuthorized: ${report.cleanAuthorized === true}`,
    `approvalRequestsAllowedNow: ${report.approvalRequestsAllowedNow === true}`,
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
    'Usage: node src/cli/selected-audit-correlation-dirty-scope-isolation-decision.js [--json] [--pretty]',
    '',
    'Builds a no-mutation isolation decision packet from the CM-1132 dirty-scope inventory.',
    'This command never stages, commits, cleans, restores, executes approval packets, reads file contents, reads audit logs, calls memory tools, or applies mutations.',
    '',
    renderInventoryHelp().trim()
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
