#!/usr/bin/env node
'use strict';

const {
  buildReport: buildPrerequisitePlanReport,
  parseArgs,
  renderHelp: renderPrerequisitePlanHelp
} = require('./selected-audit-correlation-current-facts-prerequisite-plan');
const {
  evaluateSelectedAuditCorrelationPrerequisiteStageGate
} = require('../core/SelectedAuditCorrelationPrerequisiteStageGate');

function buildRejectedReport(prerequisitePlanReport) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_STAGE_GATE_REJECTED_INPUT_FLAG',
    rejectedFlag: prerequisitePlanReport.rejectedFlag,
    currentFactsCollected: false,
    prerequisitePlanExecuted: false,
    stageGateExecuted: false,
    prerequisitePlanReport: null,
    stageGate: null,
    nextApprovalTarget: 'none',
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAuthorizedNow: false,
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
  const prerequisitePlanReport = buildPrerequisitePlanReport(options, dependencies);
  if (prerequisitePlanReport.status === 'error') {
    return buildRejectedReport(prerequisitePlanReport);
  }

  const stageGate = evaluateSelectedAuditCorrelationPrerequisiteStageGate(prerequisitePlanReport);

  return {
    status: 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_STAGE_GATE_CLASSIFIED_NOT_EXECUTED',
    source: 'current_git_facts_readonly_plus_cm1130_prerequisite_plan_plus_cm1131_stage_gate',
    currentFactsCollected: prerequisitePlanReport.currentFactsCollected === true,
    currentFactsStatus: prerequisitePlanReport.currentFactsStatus,
    currentFactsBlockerReasons: prerequisitePlanReport.currentFactsBlockerReasons || [],
    prerequisitePlanExecuted: prerequisitePlanReport.prerequisitePlanExecuted === true,
    planClass: prerequisitePlanReport.planClass,
    stageGateExecuted: true,
    stageGate,
    stageClass: stageGate.stageClass,
    nextApprovalTarget: stageGate.nextApprovalTarget,
    nextOperatorAction: stageGate.nextOperatorAction,
    cm1111ApprovalRequestAllowed: stageGate.cm1111ApprovalRequestAllowed === true,
    cm1115ApprovalRequestAllowed: stageGate.cm1115ApprovalRequestAllowed === true,
    cm1120ApprovalRequestAllowed: stageGate.cm1120ApprovalRequestAllowed === true,
    blockerDowngradeRecordAllowed: stageGate.blockerDowngradeRecordAllowed === true,
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAuthorizedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    prerequisitePlanReport,
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
    nextStep: stageGate.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `currentFactsStatus: ${report.currentFactsStatus || '<none>'}`,
    `currentFactsBlockerReasons: ${(report.currentFactsBlockerReasons || []).join(', ') || 'none'}`,
    `prerequisitePlanExecuted: ${report.prerequisitePlanExecuted === true}`,
    `planClass: ${report.planClass || '<none>'}`,
    `stageGateExecuted: ${report.stageGateExecuted === true}`,
    `stageClass: ${report.stageClass || '<none>'}`,
    `nextApprovalTarget: ${report.nextApprovalTarget || 'none'}`,
    `nextOperatorAction: ${report.nextOperatorAction || '<none>'}`,
    `cm1111ApprovalRequestAllowed: ${report.cm1111ApprovalRequestAllowed === true}`,
    `cm1115ApprovalRequestAllowed: ${report.cm1115ApprovalRequestAllowed === true}`,
    `cm1120ApprovalRequestAllowed: ${report.cm1120ApprovalRequestAllowed === true}`,
    `blockerDowngradeRecordAllowed: ${report.blockerDowngradeRecordAllowed === true}`,
    `cm1111ExecutionAuthorizedNow: ${report.cm1111ExecutionAuthorizedNow === true}`,
    `cm1115ExecutionAuthorizedNow: ${report.cm1115ExecutionAuthorizedNow === true}`,
    `cm1120ExecutionAuthorizedNow: ${report.cm1120ExecutionAuthorizedNow === true}`,
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
    'Usage: node src/cli/selected-audit-correlation-current-facts-stage-gate.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts through CM-1130, then evaluates the CM-1131 prerequisite stage gate.',
    'This command never approves or executes CM-1111, CM-1115, or CM-1120, and never reads audit logs, observation input, .jsonl, stores, raw memory, providers, services, memory tools, or apply commands.',
    '',
    renderPrerequisitePlanHelp().trim()
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
