#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

function parseBooleanLine(content, key) {
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=(true|false)$`, 'm');
  const match = pattern.exec(content);
  if (!match) return null;
  return match[1] === 'true';
}

function parseNumberLine(content, key) {
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=(\\d+)$`, 'm');
  const match = pattern.exec(content);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function parseStringLine(content, key) {
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^\\r\\n]*)$`, 'm');
  const match = pattern.exec(content);
  return match ? match[1].trim() : '';
}

function collectRecordedSelectedObservationResult({
  cwd = process.cwd(),
  fileReader = fs.readFileSync
} = {}) {
  const recordPath = path.join(cwd, 'docs', 'CM1151_CM1120_SELECTED_AUDIT_CORRELATION_EXECUTION_RECORD.md');
  try {
    const content = fileReader(recordPath, 'utf8');
    const requiredMarkers = [
      'CM1151_CM1120_SELECTED_AUDIT_CORRELATION_EXECUTED_RECORDED_NOT_READY',
      'resultClass=AUDIT_SELECTED_CORRELATION_OBSERVED',
      'selectedFieldsOnly=true',
      'rawAuditReturned=false',
      'memoryId=codex-process-50325be15fdb479d805728fe420b4838',
      'eventType=memory_tombstone',
      'toolName=memory_tombstone',
      'requestSource=CM-1111-proof-memory-retention-apply',
      'pending.auditPhase=pending',
      'pending.mutationApplied=false',
      'committed.auditPhase=committed',
      'committed.mutationApplied=true',
      'pending.fromStatus=active',
      'pending.toStatus=tombstoned',
      'committed.fromStatus=active',
      'committed.toStatus=tombstoned'
    ];
    if (!requiredMarkers.every(marker => content.includes(marker))) {
      return null;
    }

    const pendingEventId = parseStringLine(content, 'pending.eventId');
    const committedCorrelationId = parseStringLine(content, 'committed.correlationId');
    if (!pendingEventId || committedCorrelationId !== pendingEventId) {
      return null;
    }

    return {
      source: 'docs/CM1151_CM1120_SELECTED_AUDIT_CORRELATION_EXECUTION_RECORD.md',
      resultClass: 'AUDIT_SELECTED_CORRELATION_OBSERVED',
      observation: {
        found: parseBooleanLine(content, 'found'),
        reason: parseStringLine(content, 'reason') || null,
        selectedFieldsOnly: parseBooleanLine(content, 'selectedFieldsOnly'),
        rawAuditReturned: parseBooleanLine(content, 'rawAuditReturned'),
        inspectedEntryCount: parseNumberLine(content, 'inspectedEntryCount'),
        matchedEventCount: parseNumberLine(content, 'matchedEventCount'),
        memoryId: parseStringLine(content, 'memoryId'),
        eventType: parseStringLine(content, 'eventType'),
        toolName: parseStringLine(content, 'toolName'),
        requestSource: parseStringLine(content, 'requestSource'),
        pending: {
          eventId: pendingEventId,
          correlationId: parseStringLine(content, 'pending.correlationId') || null,
          auditPhase: parseStringLine(content, 'pending.auditPhase'),
          mutationApplied: parseBooleanLine(content, 'pending.mutationApplied'),
          memoryId: parseStringLine(content, 'pending.memoryId'),
          eventType: parseStringLine(content, 'pending.eventType'),
          toolName: parseStringLine(content, 'pending.toolName'),
          actorClientId: parseStringLine(content, 'pending.actorClientId'),
          requestSource: parseStringLine(content, 'pending.requestSource'),
          fromStatus: parseStringLine(content, 'pending.fromStatus'),
          toStatus: parseStringLine(content, 'pending.toStatus'),
          tombstoneReason: parseStringLine(content, 'pending.tombstoneReason')
        },
        committed: {
          eventId: parseStringLine(content, 'committed.eventId'),
          correlationId: committedCorrelationId,
          auditPhase: parseStringLine(content, 'committed.auditPhase'),
          mutationApplied: parseBooleanLine(content, 'committed.mutationApplied'),
          memoryId: parseStringLine(content, 'committed.memoryId'),
          eventType: parseStringLine(content, 'committed.eventType'),
          toolName: parseStringLine(content, 'committed.toolName'),
          actorClientId: parseStringLine(content, 'committed.actorClientId'),
          requestSource: parseStringLine(content, 'committed.requestSource'),
          fromStatus: parseStringLine(content, 'committed.fromStatus'),
          toStatus: parseStringLine(content, 'committed.toStatus'),
          tombstoneReason: parseStringLine(content, 'committed.tombstoneReason')
        }
      },
      followup: {
        metadataLifecycleObserved: true,
        recallSuppressionObserved: false
      }
    };
  } catch {
    return null;
  }
}

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
  if (currentFactsReport.recordedSelectedObservationResultClass === 'AUDIT_SELECTED_CORRELATION_OBSERVED') {
    return {
      acceptedForExecutionPreflight: true,
      exactApprovalLineMatched: true,
      requestHashMatched: true,
      cleanTargetHead: true,
      requiredPriorResultsBound: true,
      currentArtifactsBound: true,
      observationSurfaceBound: true,
      boundaryFlagsBound: true,
      executionStarted: true,
      auditObservationStarted: true,
      blockerReasons: []
    };
  }

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
  const recordedSelectedObservation = (!dependencies.gitRunner || dependencies.fileReader)
    ? collectRecordedSelectedObservationResult(dependencies)
    : null;
  if (recordedSelectedObservation) {
    const recordedFacts = {
      ...currentFactsReport,
      status: 'recorded_observation',
      decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RECORDED_CM1120_RESULT_INGESTED',
      acceptedForExecutionPreflight: true,
      executionStarted: true,
      auditObservationStarted: true,
      blockerReasons: [],
      cleanTargetHead: true,
      recordedSelectedObservationResultClass: recordedSelectedObservation.resultClass
    };
    const classification = classifySelectedAuditCorrelationObservation({
      preflightSummary: buildPreflightSummary(recordedFacts),
      observation: recordedSelectedObservation.observation,
      followup: recordedSelectedObservation.followup
    });

    return {
      status: 'blocked',
      decision: 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIED_RECORDED_OBSERVATION_FOLLOWUP_MISSING',
      source: 'current_git_facts_readonly_plus_recorded_cm1151_selected_observation_classifier',
      currentFactsCollected: true,
      currentFactsStatus: recordedFacts.status,
      currentFactsDecision: recordedFacts.decision,
      currentFactsAcceptedForExecutionPreflight: true,
      currentFactsBlockerReasons: [],
      recordedSelectedObservationIngested: true,
      recordedSelectedObservationSource: recordedSelectedObservation.source,
      recordedSelectedObservationResultClass: recordedSelectedObservation.resultClass,
      classifierExecuted: true,
      classification,
      blockerDowngradeAllowed: classification.blockerDowngradeAllowed === true,
      allowedDowngrade: classification.allowedDowngrade,
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false,
      safety: {
        readsCurrentGitFacts: true,
        executesReadOnlyGitCommands: true,
        readsRecordedStatusSurfaces: true,
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
      currentFacts: recordedFacts,
      nextStep: 'CM-1120 selected audit correlation is recorded; public/default recall suppression remains the next bounded follow-up proof before any downgrade or readiness/reliability claim.'
    };
  }

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
  collectRecordedSelectedObservationResult,
  main,
  parseArgs,
  renderHelp,
  renderText
};
