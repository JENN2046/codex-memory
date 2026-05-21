const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES,
  EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION,
  EXPECTED_UNIT,
  applyAssertionRecordToPreflightInput,
  loadAssertionRecordFile,
  normalizeAssertionRecord,
  parseAssertionRecordMarkdown,
  validateAssertionRecord
} = require('../src/core/ExternalTokenMaterialAssertionRecordAdapter');

const preflightFixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-auto-authorization-preflight-v1.json'
);
const assertionFixturePath = path.join(
  __dirname,
  'fixtures',
  'external-token-material-assertion-record-v1.json'
);
const assertionMarkdownFixturePath = path.join(
  __dirname,
  'fixtures',
  'external-token-material-assertion-record-v1.md'
);

function loadPreflightFixture() {
  return JSON.parse(fs.readFileSync(preflightFixturePath, 'utf8'));
}

function loadAssertionFixture() {
  return JSON.parse(fs.readFileSync(assertionFixturePath, 'utf8'));
}

function loadAssertionMarkdownFixture() {
  return fs.readFileSync(assertionMarkdownFixturePath, 'utf8');
}

test('external token assertion adapter fixture parses', () => {
  const fixture = loadAssertionFixture();

  assert.equal(fixture.schemaVersion, EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION);
  assert.equal(fixture.unit, EXPECTED_UNIT);
  assert.equal(fixture.contractVerdict, 'accepted');
  assert.equal(fixture.assertedNoStartupHealthWriteRecallRequested, true);
});

test('external token assertion adapter parses a filled CM-0611 markdown record', () => {
  const parsed = parseAssertionRecordMarkdown(loadAssertionMarkdownFixture(), {
    sourcePath: assertionMarkdownFixturePath
  });

  assert.equal(parsed.schemaVersion, EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION);
  assert.equal(parsed.unit, EXPECTED_UNIT);
  assert.equal(parsed.decision, 'EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW');
  assert.equal(parsed.contractVerdict, 'accepted');
  assert.equal(parsed.assertedNoStartupHealthWriteRecallRequested, true);
});

test('external token assertion adapter validates accepted fixture and merges it into preflight input', () => {
  const validation = validateAssertionRecord(loadAssertionFixture());
  assert.equal(validation.valid, true);

  const applied = applyAssertionRecordToPreflightInput(
    loadPreflightFixture(),
    loadAssertionFixture()
  );

  assert.equal(applied.ok, true);
  assert.equal(applied.assertionAcceptedForC6, true);
  assert.equal(applied.mergedInput.externalAssertion.asserted, true);
  assert.equal(applied.mergedInput.externalAssertion.assertionClass, 'OPERATOR_EXPLICIT_CURRENT_SESSION_ASSERTION');
  assert.equal(applied.mergedInput.externalAssertion.assertedAt, '2026-05-20T12:00:00.000Z');
});

test('external token assertion adapter can override latest rebound outcome class for future widening evaluation', () => {
  const applied = applyAssertionRecordToPreflightInput(
    loadPreflightFixture(),
    loadAssertionFixture(),
    { latestReboundOutcomeClass: 'token_present' }
  );

  assert.equal(applied.ok, true);
  assert.equal(applied.mergedInput.latestReboundOutcomeClass, 'token_present');
});

test('external token assertion adapter can load json and markdown assertion files through one loader', () => {
  const jsonLoaded = loadAssertionRecordFile(assertionFixturePath);
  const markdownLoaded = loadAssertionRecordFile(assertionMarkdownFixturePath);

  assert.equal(jsonLoaded.sourceFormat, 'json_assertion_record_v1');
  assert.equal(markdownLoaded.sourceFormat, 'cm0611_markdown_record_v1');
  assert.equal(markdownLoaded.record.decision, 'EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW');
  assert.equal(markdownLoaded.record.assertedNoStartupHealthWriteRecallRequested, true);
});

test('external token assertion adapter fails closed for malformed record or unsupported override', () => {
  const malformed = applyAssertionRecordToPreflightInput(loadPreflightFixture(), {
    schemaVersion: 'bad',
    unit: EXPECTED_UNIT
  });
  assert.equal(malformed.ok, false);
  assert.ok(malformed.failClosedReasons.includes('assertion_record_schema_version_mismatch'));

  const badOverride = applyAssertionRecordToPreflightInput(
    loadPreflightFixture(),
    loadAssertionFixture(),
    { latestReboundOutcomeClass: 'not-allowed' }
  );
  assert.equal(badOverride.ok, false);
  assert.ok(badOverride.failClosedReasons.includes('unsupported_latest_rebound_outcome_override'));
});

test('external token assertion adapter normalizes and redacts allowlisted fields only', () => {
  const normalized = normalizeAssertionRecord({
    ...loadAssertionFixture(),
    assertedAt: 'authorization: Bearer SHOULD_NOT_PASS',
    injected: 'unexpected'
  });

  assert.equal(normalized.assertedAt, '<redacted>');
  assert.equal(Object.hasOwn(normalized, 'injected'), false);
  assert.deepEqual(ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES, [
    '',
    'token_missing',
    'stale_for_current_token_state',
    'token_present'
  ]);
});
