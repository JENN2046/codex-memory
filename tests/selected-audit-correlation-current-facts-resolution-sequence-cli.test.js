'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');
const {
  RESOLUTION_CLASSES
} = require('../src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-current-facts-resolution-sequence');

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

function gitRunnerForDirtyHead(args) {
  if (args.join(' ') === 'status --short') {
    return {
      status: 0,
      stdout: ' M STATUS.md\n',
      stderr: '',
      error: ''
    };
  }
  return gitRunnerForCleanHead(args);
}

function gitRunnerForCurrentPostCm1145Head(args) {
  const key = args.join(' ');
  const outputs = {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': '1a46897cb5792bc84a07a5eeaadb5b1b3c95e075\n',
    'rev-parse origin/main': 'e11fe0bd1da3a08eae8c0e2c405ccfd38a55cd28\n',
    'rev-parse refs/remotes/origin/main': 'e11fe0bd1da3a08eae8c0e2c405ccfd38a55cd28\n',
    'status --short': ''
  };
  return {
    status: 0,
    stdout: outputs[key] || '',
    stderr: '',
    error: ''
  };
}

function cm1145Reader() {
  return [
    'Status: `CM1145_CM1111_PROOF_MEMORY_RETENTION_APPLY_EXECUTED_RECORDED_NOT_READY`',
    'APPLIED_TOMBSTONED_SANITIZED',
    'memoryId=codex-process-50325be15fdb479d805728fe420b4838',
    'decision=tombstoned',
    'mutated=true'
  ].join('\n');
}

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

test('CM-1140 current-facts CLI reports dirty worktree resolution sequence without approvals', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.stageGateExecuted, true);
  assert.equal(report.resolutionSequenceBuilt, true);
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.BLOCKED_DIRTY_WORKTREE_ISOLATION_REQUIRED);
  assert.equal(report.nextAllowedAction, 'local_dirty_scope_isolation_decision_only');
  assert.equal(report.nextApprovalTarget, 'none');
  assert.equal(report.cm1111ApprovalRequestAllowed, false);
  assert.equal(report.cm1120ApprovalRequestAllowed, false);
  assert.equal(report.cm1111ExecutionAuthorizedNow, false);
  assert.equal(report.readinessClaimAllowed, false);
});

test('CM-1140 current-facts CLI reaches CM-1120 approval-packet boundary only with clean satisfied prerequisites', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });

  assert.equal(report.currentFactsStatus, 'ok');
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1120_APPROVAL_PACKET_ONLY_AFTER_PRIOR_RESULTS);
  assert.equal(report.nextApprovalTarget, 'CM-1120');
  assert.equal(report.cm1120ApprovalRequestAllowed, false);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.equal(report.safety.readsTrueAuditLog, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM-1140 current-facts CLI sequences CM-1115 after CM-1145 even when CM-1120 head is stale', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForCurrentPostCm1145Head,
    fileReader: cm1145Reader
  });

  assert.equal(report.stageClass, 'WAIT_CM1115_SEPARATE_EXACT_APPROVAL_AFTER_CM1111');
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.WAIT_CM1115_APPROVAL_PACKET_ONLY_AFTER_CM1111);
  assert.equal(report.nextAllowedAction, 'request_separate_exact_cm1115_approval_only');
  assert.equal(report.nextApprovalTarget, 'CM-1115');
  assert.equal(report.cm1115ExecutionAuthorizedNow, false);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.ok(report.currentFactsBlockerReasons.includes('localHead_target_head_mismatch'));
  assert.ok(!report.currentFactsBlockerReasons.includes('prior_result_CM-1111_missing'));
});

test('CM-1152 current-facts CLI allows only bounded public default recall suppression follow-up after recorded CM-1120', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForCleanHead,
    fileReader: cm1151Reader
  });

  assert.equal(report.stageClass, 'WAIT_PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF');
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.PUBLIC_DEFAULT_RECALL_SUPPRESSION_PROOF_ALLOWED_NOT_READY);
  assert.equal(report.nextAllowedAction, 'execute_one_bounded_public_default_recall_suppression_proof_only');
  assert.equal(report.nextApprovalTarget, 'none');
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.equal(report.blockerDowngradeRecordAllowed, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
});

test('CM-1154 current-facts CLI routes recorded recall suppression proof to narrow downgrade record only', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerForCleanHead,
    fileReader: cm1151AndCm1153Reader
  });

  assert.equal(report.stageClass, 'NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY');
  assert.equal(report.resolutionClass, RESOLUTION_CLASSES.NARROW_DOWNGRADE_RECORD_ONLY_NOT_READY);
  assert.equal(report.nextAllowedAction, 'record_narrow_selected_audit_correlation_blocker_downgrade_only');
  assert.equal(report.nextApprovalTarget, 'none');
  assert.equal(report.blockerDowngradeRecordAllowed, true);
  assert.equal(report.cm1120ExecutionAuthorizedNow, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.reliabilityClaimAllowed, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsProvider, false);
});

test('CM-1140 current-facts CLI rejects audit flags before Git collection', () => {
  const options = parseArgs(['--json', '--audit-log']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected audit flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_REJECTED_INPUT_FLAG'
  );
  assert.equal(report.rejectedFlag, '--audit-log');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.resolutionSequenceBuilt, false);
});

test('CM-1140 current-facts CLI help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-current-facts-resolution-sequence/);
    writes.length = 0;
    assert.equal(main(['--observation-file']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_RESOLUTION_SEQUENCE_REJECTED_INPUT_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
