const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION,
  applyWideningReviewOutcomeRecordToAdoptionInput,
  buildWideningReviewRecordInputTrace,
  loadWideningReviewOutcomeRecordFile,
  normalizeWideningReviewOutcomeRecord,
  parseWideningReviewOutcomeRecordMarkdown,
  validateWideningReviewOutcomeRecord
} = require('../src/core/WideningReviewOutcomeRecordAdapter');

const jsonFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0616-widening-review-outcome-record-v1.json'
);
const markdownFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0616-widening-review-outcome-record-v1.md'
);

function loadJsonFixture() {
  return JSON.parse(fs.readFileSync(jsonFixturePath, 'utf8'));
}

test('widening-review outcome record fixture uses expected schema version', () => {
  const fixture = loadJsonFixture();
  assert.equal(fixture.schemaVersion, EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION);
  assert.equal(fixture.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
});

test('markdown widening-review outcome record parses required header fields', () => {
  const markdown = fs.readFileSync(markdownFixturePath, 'utf8');
  const parsed = parseWideningReviewOutcomeRecordMarkdown(markdown, { sourcePath: markdownFixturePath });

  assert.equal(parsed.schemaVersion, EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION);
  assert.equal(parsed.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
  assert.equal(parsed.cm0604Satisfied, true);
  assert.equal(parsed.cm0606BridgeActivated, true);
  assert.equal(parsed.proceedToCm0607AdoptionRecord, true);
});

test('widening-review outcome record validation fails closed on unsupported decision', () => {
  const result = validateWideningReviewOutcomeRecord({
    ...loadJsonFixture(),
    decision: 'BAD_DECISION'
  });

  assert.equal(result.valid, false);
  assert.ok(result.failClosedReasons.includes('unsupported_widening_review_decision'));
});

test('widening-review outcome record adapter builds explicit input trace with workspace-relative path', () => {
  const loadResult = loadWideningReviewOutcomeRecordFile(markdownFixturePath);
  const trace = buildWideningReviewRecordInputTrace({
    loadResult,
    normalizedWideningReviewRecord: normalizeWideningReviewOutcomeRecord(loadResult.record)
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFileName, 'cm0616-widening-review-outcome-record-v1.md');
  assert.equal(trace.sourceWorkspaceRelativePath, '.\\tests\\fixtures\\cm0616-widening-review-outcome-record-v1.md');
  assert.equal(trace.cm0606BridgeActivated, true);
});

test('widening-review outcome record adapter can bridge a CM-0616 record into widening-adoption input', () => {
  const baseInput = {
    targetBaseline: '017eda4930c5add4b824c162c46868f75c91ea0f',
    wideningReviewRecordAvailable: false
  };
  const adapted = applyWideningReviewOutcomeRecordToAdoptionInput(baseInput, loadJsonFixture());

  assert.equal(adapted.ok, true);
  assert.equal(adapted.mergedInput.wideningReviewRecordAvailable, true);
  assert.equal(adapted.mergedInput.wideningReviewDecision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
  assert.equal(adapted.mergedInput.cm0604SatisfiedByWideningReview, true);
  assert.equal(adapted.mergedInput.cm0606BridgeActivatedByWideningReview, true);
  assert.equal(adapted.mergedInput.proceedToCm0607FromWideningReview, true);
});
