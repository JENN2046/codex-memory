const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
  loadBoundedRecallApprovalIssuanceRecordFile,
  validateBoundedRecallApprovalIssuanceRecord,
  buildBoundedRecallApprovalIssuanceRecordInputTrace
} = require('../src/core/BoundedRecallApprovalIssuanceRecordAdapter');

const markdownPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0658-bounded-recall-approval-issuance-record-v1.md'
);

test('bounded-recall approval issuance adapter validates markdown record', () => {
  const loadResult = loadBoundedRecallApprovalIssuanceRecordFile(markdownPath);
  const validation = validateBoundedRecallApprovalIssuanceRecord(loadResult.record);
  assert.equal(validation.valid, true);
  assert.equal(
    validation.normalized.schemaVersion,
    EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION
  );
  assert.equal(
    validation.normalized.decision,
    'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED'
  );
});

test('bounded-recall approval issuance adapter builds workspace-relative input trace', () => {
  const loadResult = loadBoundedRecallApprovalIssuanceRecordFile(markdownPath);
  const validation = validateBoundedRecallApprovalIssuanceRecord(loadResult.record);
  const trace = buildBoundedRecallApprovalIssuanceRecordInputTrace({
    loadResult,
    normalizedBoundedRecallApprovalIssuanceRecord: validation.normalized
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFileName, 'cm0658-bounded-recall-approval-issuance-record-v1.md');
  assert.equal(
    trace.sourceWorkspaceRelativePath,
    '.\\tests\\fixtures\\cm0658-bounded-recall-approval-issuance-record-v1.md'
  );
  assert.equal(trace.exactLineIssued, true);
});

test('bounded-recall approval issuance adapter fails closed on wrong exact line', () => {
  const validation = validateBoundedRecallApprovalIssuanceRecord({
    schemaVersion: EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
    decision: 'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED',
    targetBaseline: '017eda4930c5add4b824c162c46868f75c91ea0f',
    issuanceRoute: 'route',
    cm0595CloseoutRecord: 'closeout',
    boundedRecallPreparationReview: 'prep',
    issuedApprovalText: 'wrong',
    boundedRecallExecutionStarted: false,
    outOfScopeActionsExecuted: 'none'
  });
  assert.equal(validation.valid, false);
  assert.ok(
    validation.failClosedReasons.includes('bounded_recall_issued_approval_text_mismatch')
  );
});
