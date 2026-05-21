const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
  buildCm0595ApprovalIssuanceRecordInputTrace,
  loadCm0595ApprovalIssuanceRecordFile,
  normalizeCm0595ApprovalIssuanceRecord,
  parseCm0595ApprovalIssuanceRecordMarkdown,
  validateCm0595ApprovalIssuanceRecord
} = require('../src/core/Cm0595ApprovalIssuanceRecordAdapter');

const jsonFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0649-cm0595-approval-issuance-record-v1.json'
);
const markdownFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0649-cm0595-approval-issuance-record-v1.md'
);

function loadJsonFixture() {
  return JSON.parse(fs.readFileSync(jsonFixturePath, 'utf8'));
}

test('cm0595 approval issuance fixture uses expected schema version', () => {
  const fixture = loadJsonFixture();
  assert.equal(fixture.schemaVersion, EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION);
  assert.equal(fixture.decision, 'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED');
});

test('markdown cm0595 approval issuance record parses required template sections', () => {
  const markdown = fs.readFileSync(markdownFixturePath, 'utf8');
  const parsed = parseCm0595ApprovalIssuanceRecordMarkdown(markdown, { sourcePath: markdownFixturePath });

  assert.equal(parsed.schemaVersion, EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION);
  assert.equal(parsed.decision, 'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED');
  assert.equal(parsed.runtimeExecutionStarted, false);
  assert.equal(parsed.outOfScopeActionsExecuted, 'none');
  assert.match(parsed.issuedApprovalText, /授权执行 CM-0595/);
});

test('cm0595 approval issuance validation fails closed on unsupported decision', () => {
  const result = validateCm0595ApprovalIssuanceRecord({
    ...loadJsonFixture(),
    decision: 'BAD_DECISION'
  });

  assert.equal(result.valid, false);
  assert.ok(result.failClosedReasons.includes('unsupported_cm0595_approval_issuance_decision'));
});

test('cm0595 approval issuance adapter builds explicit input trace with workspace-relative path', () => {
  const loadResult = loadCm0595ApprovalIssuanceRecordFile(markdownFixturePath);
  const trace = buildCm0595ApprovalIssuanceRecordInputTrace({
    loadResult,
    normalizedCm0595ApprovalIssuanceRecord: normalizeCm0595ApprovalIssuanceRecord(loadResult.record)
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFileName, 'cm0649-cm0595-approval-issuance-record-v1.md');
  assert.equal(trace.sourceWorkspaceRelativePath, '.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1.md');
  assert.equal(trace.exactLineIssued, true);
  assert.equal(trace.runtimeExecutionStarted, false);
});
