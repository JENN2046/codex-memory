const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
  buildCm0595ExecutionEvidenceInputTrace,
  loadCm0595ExecutionEvidenceRecordFile,
  parseCm0595ExecutionEvidenceRecordMarkdown,
  validateCm0595ExecutionEvidenceRecord
} = require('../src/core/Cm0595ExecutionEvidenceRecordAdapter');

const jsonFixturePath = path.resolve(
  __dirname,
  'fixtures',
  'cm0650-cm0595-execution-evidence-record-v1.json'
);
const markdownFixturePath = path.resolve(
  __dirname,
  'fixtures',
  'cm0650-cm0595-execution-evidence-record-v1.md'
);

test('cm0595 execution evidence adapter validates json fixture', () => {
  const loadResult = loadCm0595ExecutionEvidenceRecordFile(jsonFixturePath);
  const validation = validateCm0595ExecutionEvidenceRecord(loadResult.record);

  assert.equal(loadResult.sourceFormat, 'json_cm0595_execution_evidence_record_v1');
  assert.equal(validation.valid, true);
  assert.equal(
    validation.normalized.schemaVersion,
    EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION
  );
  assert.equal(validation.normalized.durableMemoryWriteCount, 1);
});

test('cm0595 execution evidence adapter parses markdown fixture', () => {
  const loadResult = loadCm0595ExecutionEvidenceRecordFile(markdownFixturePath);
  const validation = validateCm0595ExecutionEvidenceRecord(loadResult.record);

  assert.equal(loadResult.sourceFormat, 'cm0650_markdown_record_v1');
  assert.equal(validation.valid, true);
  assert.equal(validation.normalized.observedWriteOutcome, 'exactly_one_sanitized_write_only');
  assert.equal(validation.normalized.writePathAuditSideEffectCount, 1);
});

test('cm0595 execution evidence adapter rejects unsupported decision', () => {
  const validation = validateCm0595ExecutionEvidenceRecord({
    schemaVersion: EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
    decision: 'BAD_DECISION'
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.failClosedReasons.includes('unsupported_cm0595_execution_evidence_decision')
  );
});

test('cm0595 execution evidence adapter enforces write-count contract', () => {
  const loadResult = loadCm0595ExecutionEvidenceRecordFile(jsonFixturePath);
  const validation = validateCm0595ExecutionEvidenceRecord({
    ...loadResult.record,
    durableMemoryWriteCount: 0
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.failClosedReasons.includes('cm0595_execution_expected_exactly_one_write')
  );
});

test('cm0595 execution evidence adapter builds workspace-relative provenance trace', () => {
  const loadResult = loadCm0595ExecutionEvidenceRecordFile(markdownFixturePath);
  const validation = validateCm0595ExecutionEvidenceRecord(loadResult.record);
  const trace = buildCm0595ExecutionEvidenceInputTrace({
    loadResult,
    normalizedCm0595ExecutionEvidenceRecord: validation.normalized
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFileName, 'cm0650-cm0595-execution-evidence-record-v1.md');
  assert.equal(
    trace.sourceWorkspaceRelativePath,
    '.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1.md'
  );
  assert.equal(trace.durableMemoryWriteCount, 1);
  assert.equal(trace.executedExactlyOneWrite, true);
  assert.equal(trace.failedClosedWithZeroWrites, false);
});

test('cm0595 execution evidence adapter parses markdown payload directly', () => {
  const record = parseCm0595ExecutionEvidenceRecordMarkdown(
    'Status: CM0595_EXECUTED_FAIL_CLOSED_ZERO_WRITES\nDecision: CM0595_EXECUTED_FAIL_CLOSED_ZERO_WRITES\nDurable memory write count: 0\nWrite-path audit side-effect count: 0\nTarget baseline: 017eda4930c5add4b824c162c46868f75c91ea0f\nExecution route: sample\nIssuance record: sample\nObserved branch head: sample\nObserved token-presence evidence source: sample\nObserved write outcome: none\nOut-of-scope actions executed: none\n'
  );

  assert.equal(record.schemaVersion, EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION);
  assert.equal(record.decision, 'CM0595_EXECUTED_FAIL_CLOSED_ZERO_WRITES');
});
