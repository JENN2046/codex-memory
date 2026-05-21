const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
  loadBoundedRecallExecutionEvidenceRecordFile,
  validateBoundedRecallExecutionEvidenceRecord,
  buildBoundedRecallExecutionEvidenceInputTrace
} = require('../src/core/BoundedRecallExecutionEvidenceRecordAdapter');

const markdownPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0659-bounded-recall-execution-evidence-record-v1.md'
);

test('bounded-recall execution evidence adapter validates markdown record', () => {
  const loadResult = loadBoundedRecallExecutionEvidenceRecordFile(markdownPath);
  const validation = validateBoundedRecallExecutionEvidenceRecord(loadResult.record);
  assert.equal(validation.valid, true);
  assert.equal(
    validation.normalized.schemaVersion,
    EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION
  );
  assert.equal(
    validation.normalized.decision,
    'BOUNDED_RECALL_PREPARATION_EXECUTED_APPROVAL_LINE_ONLY'
  );
});

test('bounded-recall execution evidence adapter builds workspace-relative input trace', () => {
  const loadResult = loadBoundedRecallExecutionEvidenceRecordFile(markdownPath);
  const validation = validateBoundedRecallExecutionEvidenceRecord(loadResult.record);
  const trace = buildBoundedRecallExecutionEvidenceInputTrace({
    loadResult,
    normalizedBoundedRecallExecutionEvidenceRecord: validation.normalized
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFileName, 'cm0659-bounded-recall-execution-evidence-record-v1.md');
  assert.equal(
    trace.sourceWorkspaceRelativePath,
    '.\\tests\\fixtures\\cm0659-bounded-recall-execution-evidence-record-v1.md'
  );
  assert.equal(trace.preparedExactlyOneLaterApproval, true);
  assert.equal(trace.boundedRecallRuntimeStayedZero, true);
});

test('bounded-recall execution evidence adapter fails closed when execution count is not zero', () => {
  const validation = validateBoundedRecallExecutionEvidenceRecord({
    schemaVersion: EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
    decision: 'BOUNDED_RECALL_PREPARATION_EXECUTED_APPROVAL_LINE_ONLY',
    targetBaseline: '017eda4930c5add4b824c162c46868f75c91ea0f',
    executionRoute: 'route',
    issuanceRecord: 'issuance',
    observedBranchHead: 'head',
    preparedLaterApprovalLineCount: 1,
    boundedRecallExecutionCount: 1,
    observedPreparationOutcome: 'bad',
    outOfScopeActionsExecuted: 'none'
  });
  assert.equal(validation.valid, false);
  assert.ok(validation.failClosedReasons.includes('bounded_recall_execution_count_not_zero'));
});
