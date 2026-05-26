'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  RESULT_CLASSES
} = require('../src/core/SelectedAuditCorrelationResultClassifier');
const {
  buildPreflightSummary,
  buildReport,
  collectRecordedRecallSuppressionProofResult,
  collectRecordedSelectedObservationResult,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-classifier');

function gitRunnerForCleanHead(args) {
  const key = args.join(' ');
  const outputs = {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': `${TARGET_HEAD}\n`,
    'rev-parse origin/main': `${TARGET_HEAD}\n`,
    'rev-parse refs/remotes/origin/main': `${TARGET_HEAD}\n`,
    'status --short': ''
  };
  return {
    status: 0,
    stdout: outputs[key] || '',
    stderr: '',
    error: ''
  };
}

test('CM-1124 classifier current-facts wrapper defaults to blocked no-observation classification', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.classifierExecuted, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
  assert.equal(report.safety.readsObservationInput, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1124 current facts can be preflight-ready but still no-observation classified', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(report.currentFactsAcceptedForExecutionPreflight, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.DRAFT_ONLY_NO_EVIDENCE);
  assert.equal(report.classification.reason, 'audit_observation_not_started');
  assert.equal(report.blockerDowngradeAllowed, false);
});

function cm1151Reader(filePath) {
  if (String(filePath).includes('CM1151_CM1120_SELECTED_AUDIT_CORRELATION_EXECUTION_RECORD.md')) {
    return [
      'Status: `CM1151_CM1120_SELECTED_AUDIT_CORRELATION_EXECUTED_RECORDED_NOT_READY`',
      'resultClass=AUDIT_SELECTED_CORRELATION_OBSERVED',
      'found=true',
      'reason=null',
      'selectedFieldsOnly=true',
      'rawAuditReturned=false',
      'inspectedEntryCount=500',
      'matchedEventCount=2',
      'memoryId=codex-process-50325be15fdb479d805728fe420b4838',
      'eventType=memory_tombstone',
      'toolName=memory_tombstone',
      'requestSource=CM-1111-proof-memory-retention-apply',
      'pending.eventId=b1e084b1-bef9-4af9-8708-8ba47f9c21d9',
      'pending.correlationId=null',
      'pending.auditPhase=pending',
      'pending.mutationApplied=false',
      'pending.memoryId=codex-process-50325be15fdb479d805728fe420b4838',
      'pending.eventType=memory_tombstone',
      'pending.toolName=memory_tombstone',
      'pending.actorClientId=codex',
      'pending.requestSource=CM-1111-proof-memory-retention-apply',
      'pending.fromStatus=active',
      'pending.toStatus=tombstoned',
      'pending.tombstoneReason=proof-memory-retention-expired-after-validation',
      'committed.eventId=b1e084b1-bef9-4af9-8708-8ba47f9c21d9',
      'committed.correlationId=b1e084b1-bef9-4af9-8708-8ba47f9c21d9',
      'committed.auditPhase=committed',
      'committed.mutationApplied=true',
      'committed.memoryId=codex-process-50325be15fdb479d805728fe420b4838',
      'committed.eventType=memory_tombstone',
      'committed.toolName=memory_tombstone',
      'committed.actorClientId=codex',
      'committed.requestSource=CM-1111-proof-memory-retention-apply',
      'committed.fromStatus=active',
      'committed.toStatus=tombstoned',
      'committed.tombstoneReason=proof-memory-retention-expired-after-validation'
    ].join('\n');
  }
  throw new Error('missing');
}

function cm1151AndCm1153Reader(filePath) {
  if (String(filePath).includes('CM1153_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF.md')) {
    return [
      'Status: `CM1153_PUBLIC_DEFAULT_RECALL_SUPPRESSION_OBSERVED_NOT_READY`',
      'resultClass=PUBLIC_DEFAULT_RECALL_SUPPRESSION_OBSERVED_NOT_READY',
      'targetMemoryId=codex-process-50325be15fdb479d805728fe420b4838',
      'querySha256=c1f1a54db6af1556f8e7027ef7c9ce87a9941814fdf83e200ffce0c8494ad2af',
      'searchMemoryCallCount=1',
      'target=process',
      'limit=5',
      'includeContent=false',
      'scopeProvided=false',
      'noRawContentRead=true',
      'readOnly=true',
      'resultCount=3',
      'targetCurrentChunkCount=2',
      'defaultFilterTargetChunkCount=0',
      'targetReturned=false',
      'forbiddenResultFieldCount=0',
      'providerFetchAttempts=0',
      'recordMemoryCallCount=0',
      'memoryOverviewCallCount=0',
      'durableMemoryWrites=0',
      'publicMcpExpansion=false',
      'configWatchdogStartupPackageChange=false',
      'readinessClaimAllowed=false',
      'reliabilityClaimAllowed=false'
    ].join('\n');
  }
  return cm1151Reader(filePath);
}

test('CM-1152 current-facts classifier ingests recorded CM-1151 selected observation follow-up gap', () => {
  const recorded = collectRecordedSelectedObservationResult({ fileReader: cm1151Reader });
  assert.equal(recorded.resultClass, RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED);
  assert.equal(recorded.observation.found, true);
  assert.equal(recorded.observation.rawAuditReturned, false);
  assert.equal(recorded.followup.metadataLifecycleObserved, true);
  assert.equal(recorded.followup.recallSuppressionObserved, false);

  const report = buildReport({}, {
    gitRunner: gitRunnerForCleanHead,
    fileReader: cm1151Reader
  });

  assert.equal(report.decision, 'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIED_RECORDED_OBSERVATION_FOLLOWUP_MISSING');
  assert.equal(report.currentFactsStatus, 'recorded_observation');
  assert.equal(report.currentFactsAcceptedForExecutionPreflight, true);
  assert.deepEqual(report.currentFactsBlockerReasons, []);
  assert.equal(report.recordedSelectedObservationIngested, true);
  assert.equal(report.classification.resultClass, RESULT_CLASSES.AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING);
  assert.equal(report.blockerDowngradeAllowed, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1154 current-facts classifier ingests recorded CM-1153 recall suppression follow-up', () => {
  const proof = collectRecordedRecallSuppressionProofResult({ fileReader: cm1151AndCm1153Reader });
  assert.equal(proof.resultClass, 'PUBLIC_DEFAULT_RECALL_SUPPRESSION_OBSERVED_NOT_READY');
  assert.equal(proof.targetReturned, false);
  assert.equal(proof.defaultFilterTargetChunkCount, 0);
  assert.equal(proof.providerFetchAttempts, 0);

  const recorded = collectRecordedSelectedObservationResult({ fileReader: cm1151AndCm1153Reader });
  assert.equal(recorded.followup.metadataLifecycleObserved, true);
  assert.equal(recorded.followup.recallSuppressionObserved, true);

  const report = buildReport({}, {
    gitRunner: gitRunnerForCleanHead,
    fileReader: cm1151AndCm1153Reader
  });

  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIED_RECORDED_OBSERVATION_AND_RECALL_SUPPRESSION'
  );
  assert.equal(report.recordedRecallSuppressionProofIngested, true);
  assert.equal(report.recordedRecallSuppressionProofResultClass, 'PUBLIC_DEFAULT_RECALL_SUPPRESSION_OBSERVED_NOT_READY');
  assert.equal(report.classification.resultClass, RESULT_CLASSES.AUDIT_SELECTED_CORRELATION_OBSERVED);
  assert.equal(report.blockerDowngradeAllowed, true);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsProvider, false);
});

test('CM-1124 rejects observation and raw input flags before collecting current facts', () => {
  const options = parseArgs(['--json', '--observation-file']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected observation input flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--observation-file');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.classifierExecuted, false);
  assert.equal(report.readsTrueAuditLog, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1124 rejected inherited execution flags also stop before current facts collection', () => {
  const options = parseArgs(['--audit-read']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected audit-read flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--audit-read');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.classifierExecuted, false);
});

test('CM-1124 preflight summary builder passes only classifier-relevant booleans', () => {
  const summary = buildPreflightSummary({
    acceptedForExecutionPreflight: true,
    exactApprovalLineMatched: true,
    requestHashMatched: true,
    cleanTargetHead: true,
    requiredPriorResultsBound: true,
    currentArtifactsBound: true,
    observationSurfaceBound: true,
    boundaryFlagsBound: true,
    executionStarted: false,
    auditObservationStarted: false,
    blockerReasons: ['dirty_worktree'],
    ignored: 'not copied'
  });

  assert.deepEqual(Object.keys(summary).sort(), [
    'acceptedForExecutionPreflight',
    'auditObservationStarted',
    'blockerReasons',
    'boundaryFlagsBound',
    'cleanTargetHead',
    'currentArtifactsBound',
    'exactApprovalLineMatched',
    'executionStarted',
    'observationSurfaceBound',
    'requestHashMatched',
    'requiredPriorResultsBound'
  ].sort());
  assert.equal(summary.acceptedForExecutionPreflight, true);
  assert.deepEqual(summary.blockerReasons, ['dirty_worktree']);
});

test('CM-1124 CLI help and rejected flag behavior', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-classifier/);
    writes.length = 0;
    assert.equal(main(['--input-file']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIER_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
