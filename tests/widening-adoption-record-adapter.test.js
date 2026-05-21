const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION,
  applyWideningAdoptionRecordToAdoptionInput,
  buildWideningAdoptionRecordInputTrace,
  loadWideningAdoptionRecordFile,
  normalizeWideningAdoptionRecord,
  parseWideningAdoptionRecordMarkdown,
  validateWideningAdoptionRecord
} = require('../src/core/WideningAdoptionRecordAdapter');

const jsonFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0607-widening-adoption-record-v1.json'
);
const markdownFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0607-widening-adoption-record-v1.md'
);

function loadJsonFixture() {
  return JSON.parse(fs.readFileSync(jsonFixturePath, 'utf8'));
}

test('widening-adoption record fixture uses expected schema version', () => {
  const fixture = loadJsonFixture();
  assert.equal(fixture.schemaVersion, EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION);
  assert.equal(fixture.decision, 'WIDENING_ADOPTION_GRANTED');
});

test('markdown widening-adoption record parses required template sections', () => {
  const markdown = fs.readFileSync(markdownFixturePath, 'utf8');
  const parsed = parseWideningAdoptionRecordMarkdown(markdown, { sourcePath: markdownFixturePath });

  assert.equal(parsed.schemaVersion, EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION);
  assert.equal(parsed.decision, 'WIDENING_ADOPTION_GRANTED');
  assert.equal(parsed.sameBaselineEndpointStartupEvidenceResult, 'accepted');
  assert.equal(parsed.sameBaselineTokenPresenceEvidenceResult, 'accepted');
  assert.equal(parsed.cm0605RoutedOutcome, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(parsed.futureAutoAuthorizationWideningAdopted, true);
});

test('widening-adoption record validation fails closed on unsupported decision', () => {
  const result = validateWideningAdoptionRecord({
    ...loadJsonFixture(),
    decision: 'BAD_DECISION'
  });

  assert.equal(result.valid, false);
  assert.ok(result.failClosedReasons.includes('unsupported_widening_adoption_decision'));
});

test('widening-adoption record adapter builds explicit input trace with workspace-relative path', () => {
  const loadResult = loadWideningAdoptionRecordFile(markdownFixturePath);
  const trace = buildWideningAdoptionRecordInputTrace({
    loadResult,
    normalizedWideningAdoptionRecord: normalizeWideningAdoptionRecord(loadResult.record)
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFileName, 'cm0607-widening-adoption-record-v1.md');
  assert.equal(trace.sourceWorkspaceRelativePath, '.\\tests\\fixtures\\cm0607-widening-adoption-record-v1.md');
  assert.equal(trace.futureAutoAuthorizationWideningAdopted, true);
});

test('widening-adoption record adapter can bridge a CM-0607 record into widening-adoption input', () => {
  const baseInput = {
    targetBaseline: '017eda4930c5add4b824c162c46868f75c91ea0f',
    futureAutoAuthorizationWideningAdopted: false
  };
  const adapted = applyWideningAdoptionRecordToAdoptionInput(baseInput, loadJsonFixture());

  assert.equal(adapted.ok, true);
  assert.equal(adapted.mergedInput.sameBaselineEndpointStartupEvidenceAvailable, true);
  assert.equal(adapted.mergedInput.sameBaselineTokenPresentEvidenceAvailable, true);
  assert.equal(adapted.mergedInput.tokenPresentEvidenceSameBaseline, true);
  assert.equal(adapted.mergedInput.futureAutoAuthorizationWideningAdopted, true);
  assert.equal(adapted.mergedInput.scopeStillLimitedToCm0595, true);
});
