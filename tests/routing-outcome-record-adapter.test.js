const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  ALLOWED_ROUTING_OUTCOME_VALUES,
  DECISION_TO_ROUTING_OUTCOME,
  EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION,
  applyRoutingOutcomeRecordToWideningReviewInput,
  buildRoutingOutcomeRecordInputTrace,
  loadRoutingOutcomeRecordFile,
  parseRoutingOutcomeRecordMarkdown,
  validateRoutingOutcomeRecord
} = require('../src/core/RoutingOutcomeRecordAdapter');

const jsonFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0605-routing-outcome-record-v1.json'
);
const markdownFixturePath = path.join(
  __dirname,
  'fixtures',
  'cm0605-routing-outcome-record-v1.md'
);
const wideningFixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-widening-review-v1.json'
);

function loadJsonFixture() {
  return JSON.parse(fs.readFileSync(jsonFixturePath, 'utf8'));
}

function loadWideningFixture() {
  return JSON.parse(fs.readFileSync(wideningFixturePath, 'utf8'));
}

test('routing outcome record fixtures use expected schema and allowed outcomes', () => {
  const fixture = loadJsonFixture();

  assert.equal(fixture.schemaVersion, EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION);
  assert.equal(
    fixture.routingOutcome,
    DECISION_TO_ROUTING_OUTCOME[fixture.decision]
  );
  assert.ok(ALLOWED_ROUTING_OUTCOME_VALUES.includes(fixture.routingOutcome));
});

test('markdown routing outcome record can be parsed into normalized record fields', () => {
  const markdown = fs.readFileSync(markdownFixturePath, 'utf8');
  const parsed = parseRoutingOutcomeRecordMarkdown(markdown, { sourcePath: markdownFixturePath });

  assert.equal(parsed.schemaVersion, EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION);
  assert.equal(parsed.decision, 'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(parsed.routingOutcome, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(parsed.targetBaseline, '017eda4930c5add4b824c162c46868f75c91ea0f');
});

test('routing outcome record validation fails closed on mismatched decision/outcome pairs', () => {
  const validation = validateRoutingOutcomeRecord({
    ...loadJsonFixture(),
    routingOutcome: 'AUTO_REUSE_CM0601_LINE_ONLY'
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.failClosedReasons.includes('routing_decision_outcome_mismatch'));
});

test('routing outcome record file loader supports json and markdown inputs', () => {
  const jsonLoad = loadRoutingOutcomeRecordFile(jsonFixturePath);
  const markdownLoad = loadRoutingOutcomeRecordFile(markdownFixturePath);

  assert.equal(jsonLoad.sourceFormat, 'json_routing_outcome_record_v1');
  assert.equal(markdownLoad.sourceFormat, 'cm0615_markdown_record_v1');
  assert.equal(markdownLoad.record.decision, 'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
});

test('routing outcome record can be applied to widening-review input in a fail-closed way', () => {
  const baseInput = loadWideningFixture();
  const adapted = applyRoutingOutcomeRecordToWideningReviewInput(baseInput, loadJsonFixture());

  assert.equal(adapted.ok, true);
  assert.equal(adapted.mergedInput.routingOutcomeRecordAvailable, true);
  assert.equal(
    adapted.mergedInput.routingOutcomeDecision,
    'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
  );
  assert.equal(adapted.mergedInput.sameBaselineTokenPresentEvidenceAvailable, false);
  assert.equal(adapted.mergedInput.governanceMayCrossIntoOneBoundedDurableWriteProof, false);
});

test('routing outcome record input trace preserves source provenance without exposing arbitrary absolute-path requirements', () => {
  const loadResult = loadRoutingOutcomeRecordFile(markdownFixturePath);
  const trace = buildRoutingOutcomeRecordInputTrace({
    loadResult,
    normalizedRoutingOutcomeRecord: loadResult.record
  });

  assert.equal(trace.traceAvailable, true);
  assert.equal(trace.sourceFormat, 'cm0615_markdown_record_v1');
  assert.equal(trace.sourceFileName, 'cm0605-routing-outcome-record-v1.md');
  assert.equal(trace.sourceArtifactRef.includes('CM-0615'), true);
  assert.equal(trace.sourceWorkspaceRelativePath.startsWith('.\\tests\\fixtures\\'), true);
});
