const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeMemorySupersedeShadowSeamContract,
  summarizeMemorySupersedeShadowSeamContract
} = require('../src/core/MemorySupersedeShadowSeamContract');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-shadow-seam-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('CM-0989 fixture locks top-level blocked state', () => {
  assert.equal(fixture.schemaVersion, 'memory-supersede-shadow-seam-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
});

test('CM-0989 summary accepts the fixture for planning only', () => {
  const summary = summarizeMemorySupersedeShadowSeamContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.realMemoryScanned, false);
});

test('CM-0989 fixture requires exact pair fields and link columns', () => {
  const summary = summarizeMemorySupersedeShadowSeamContract(fixture);

  assert.equal(summary.requiredPairFields.requiredPresent, true);
  assert.equal(summary.requiredPairFields.exact, true);
  assert.equal(summary.supportedLinkColumns.requiredPresent, true);
  assert.equal(summary.supportedLinkColumns.exact, true);
  assert.deepEqual(summary.supportedLinkColumns.ids, [
    'supersedes_memory_id',
    'superseded_by_memory_id'
  ]);
});

test('CM-0989 fixture rejects single-record reuse and requires guarded pair semantics', () => {
  const summary = summarizeMemorySupersedeShadowSeamContract(fixture);

  assert.equal(summary.seamProperties.requiresTwoRecordGuard, true);
  assert.equal(summary.seamProperties.singleRecordReuseAllowed, false);
  assert.equal(summary.seamProperties.bidirectionalLinkWriteRequired, true);
  assert.equal(summary.seamProperties.atomicPairOutcomeRequired, true);
  assert.equal(summary.seamProperties.blocked, true);
});

test('CM-0989 helper fails closed when single-record reuse is marked sufficient', () => {
  const summary = summarizeMemorySupersedeShadowSeamContract({
    ...fixture,
    seamProperties: {
      ...fixture.seamProperties,
      singleRecordReuseAllowed: true
    }
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.seamProperties.blocked, false);
});

test('CM-0989 helper fails closed when a required pair field is missing', () => {
  const summary = summarizeMemorySupersedeShadowSeamContract({
    ...fixture,
    requiredPairFields: fixture.requiredPairFields.filter(field => field !== 'pairCorrelationId')
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.requiredPairFields.requiredPresent, false);
  assert.equal(summary.requiredPairFields.missingRequired.includes('pairCorrelationId'), true);
});

test('CM-0989 helper normalizes malformed input to a blocked non-ready summary', () => {
  const normalized = normalizeMemorySupersedeShadowSeamContract({
    schemaVersion: ' memory-supersede-shadow-seam-v1 ',
    version: ' v1 ',
    acceptedSourceTypes: ['explicit_input', null, 'committed_test'],
    requiredPairFields: ['oldMemoryId', '', null, 'newMemoryId'],
    supportedLinkColumns: ['supersedes_memory_id', 'superseded_by_memory_id', ''],
    seamProperties: {
      requiresTwoRecordGuard: true,
      singleRecordReuseAllowed: false
    }
  });

  assert.equal(normalized.schemaVersion, 'memory-supersede-shadow-seam-v1');
  assert.equal(normalized.version, 'v1');
  assert.deepEqual(normalized.acceptedSourceTypes, ['explicit_input', 'committed_test']);
  assert.deepEqual(normalized.requiredPairFields, ['oldMemoryId', 'newMemoryId']);
  assert.deepEqual(normalized.supportedLinkColumns, ['supersedes_memory_id', 'superseded_by_memory_id']);
  assert.equal(normalized.seamProperties.requiresTwoRecordGuard, true);
  assert.equal(normalized.seamProperties.singleRecordReuseAllowed, false);
});

test('CM-0989 fixture text does not expose raw secrets or Windows paths', () => {
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
});
