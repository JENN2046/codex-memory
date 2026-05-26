#!/usr/bin/env node
'use strict';

const {
  buildReport: buildStageGateReport,
  parseArgs,
  renderHelp: renderStageGateHelp
} = require('./selected-audit-correlation-current-facts-stage-gate');
const {
  buildSelectedAuditCorrelationPrerequisiteResolutionSequence
} = require('../core/SelectedAuditCorrelationPrerequisiteResolutionSequence');

function buildRejectedReport(stageGateReport) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_REJECTED_INPUT_FLAG',
    rejectedFlag: stageGateReport.rejectedFlag,
    currentFactsCollected: false,
    stageGateExecuted: false,
    resolutionSequenceBuilt: false,
    nextApprovalTarget: 'none',
    nextAllowedAction: 'none',
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
  const stageGateReport = buildStageGateReport(options, dependencies);
  if (stageGateReport.status === 'error') {
    return buildRejectedReport(stageGateReport);
  }

  const resolutionSequence = buildSelectedAuditCorrelationPrerequisiteResolutionSequence(stageGateReport);

  return {
    status: resolutionSequence.status,
    decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_CLASSIFIED_NOT_EXECUTED',
    source: 'current_git_facts_readonly_plus_cm1131_stage_gate_plus_cm1140_resolution_sequence',
    currentFactsCollected: stageGateReport.currentFactsCollected === true,
    currentFactsStatus: stageGateReport.currentFactsStatus,
    currentFactsBlockerReasons: stageGateReport.currentFactsBlockerReasons || [],
    stageGateExecuted: stageGateReport.stageGateExecuted === true,
    stageClass: stageGateReport.stageClass,
    resolutionSequenceBuilt: true,
    resolutionSequence,
    resolutionClass: resolutionSequence.resolutionClass,
    nextAllowedAction: resolutionSequence.nextAllowedAction,
    nextApprovalTarget: resolutionSequence.nextApprovalTarget,
    approvalRequestCandidate: resolutionSequence.approvalRequestCandidate,
    orderedResolutionSteps: resolutionSequence.orderedResolutionSteps,
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    blockerDowngradeRecordAllowed: resolutionSequence.blockerDowngradeRecordAllowed === true,
    cm1111ExecutionAuthorizedNow: false,
    cm1115ExecutionAuthorizedNow: false,
    cm1120ExecutionAuthorizedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    stageGateReport,
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
    nextStep: resolutionSequence.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `currentFactsStatus: ${report.currentFactsStatus || '<none>'}`,
    `currentFactsBlockerReasons: ${(report.currentFactsBlockerReasons || []).join(', ') || 'none'}`,
    `stageGateExecuted: ${report.stageGateExecuted === true}`,
    `stageClass: ${report.stageClass || '<none>'}`,
    `resolutionSequenceBuilt: ${report.resolutionSequenceBuilt === true}`,
    `resolutionClass: ${report.resolutionClass || '<none>'}`,
    `nextAllowedAction: ${report.nextAllowedAction || 'none'}`,
    `nextApprovalTarget: ${report.nextApprovalTarget || 'none'}`,
    `approvalRequestCandidate: ${report.approvalRequestCandidate || 'none'}`,
    `orderedResolutionSteps: ${(report.orderedResolutionSteps || []).join(', ') || 'none'}`,
    `cm1111ApprovalRequestAllowed: ${report.cm1111ApprovalRequestAllowed === true}`,
    `cm1115ApprovalRequestAllowed: ${report.cm1115ApprovalRequestAllowed === true}`,
    `cm1120ApprovalRequestAllowed: ${report.cm1120ApprovalRequestAllowed === true}`,
    `blockerDowngradeRecordAllowed: ${report.blockerDowngradeRecordAllowed === true}`,
    `cm1111ExecutionAuthorizedNow: ${report.cm1111ExecutionAuthorizedNow === true}`,
    `cm1115ExecutionAuthorizedNow: ${report.cm1115ExecutionAuthorizedNow === true}`,
    `cm1120ExecutionAuthorizedNow: ${report.cm1120ExecutionAuthorizedNow === true}`,
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
    'Usage: node src/cli/selected-audit-correlation-current-facts-resolution-sequence.js [--json] [--pretty] [--with-satisfied-prior-results]',
    '',
    'Collects current local Git facts through CM-1131, then builds the CM-1140 no-execution prerequisite resolution sequence.',
    'This command never requests approvals, executes CM-1111/CM-1115/CM-1120, reads audit logs, reads observation input, reads .jsonl/stores/raw memory, calls providers/services/memory tools, or applies mutations.',
    '',
    renderStageGateHelp().trim()
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
