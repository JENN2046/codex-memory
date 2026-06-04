const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-admin-review-schema-hardening-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_PACKS = [
  'memory_lifecycle_proposal_states',
  'query_quality_dry_run_refresh',
  'admin_review_schema_hardening'
];
const REQUIRED_HARD_STOPS = [
  'push',
  'tag',
  'release',
  'deploy',
  'cutover',
  'provider',
  'real_memory_scan',
  'durable_write',
  'config_change',
  'public_mcp_expansion',
  'readiness_claim'
];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f admin review schema fixture keeps local-safe boundary', () => {
  assert.equal(fixture.version, 'phase-f-admin-review-schema-hardening-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
});

test('phase f admin review schema fixture has exact pack status map', () => {
  const packIds = fixture.fixturePackStatus.map((pack) => pack.packId);
  assert.deepEqual(packIds, REQUIRED_PACKS);
  assert.equal(new Set(packIds).size, packIds.length);
});

test('phase f admin review schema snapshot requires reviewable fields', () => {
  const snapshot = fixture.schemaSnapshot;
  for (const field of ['fixturePackStatus', 'localSafeActionMatrix', 'hardStops', 'validation', 'nextSafeAction']) {
    assert.ok(snapshot.requiredTopLevelFields.includes(field), `${field} top-level field missing`);
  }

  for (const field of ['packId', 'area', 'evidenceClass', 'primaryFixture', 'primaryTest', 'status', 'mustNotClaim']) {
    assert.ok(snapshot.requiredFixturePackFields.includes(field), `${field} fixture pack field missing`);
  }
});

test('phase f admin review pack statuses point to local fixtures and tests only', () => {
  for (const pack of fixture.fixturePackStatus) {
    assert.equal(pack.evidenceClass, 'synthetic_fixture_only');
    assert.ok(pack.primaryFixture.startsWith('tests/fixtures/'), `${pack.packId} fixture path must be local fixture`);
    assert.ok(pack.primaryTest.startsWith('tests/'), `${pack.packId} test path must be local test`);
    assert.ok(Array.isArray(pack.mustNotClaim), `${pack.packId} mustNotClaim missing`);
    assert.ok(pack.mustNotClaim.length > 0, `${pack.packId} mustNotClaim empty`);
  }
});

test('phase f admin review schema fixture preserves hard stops and local-safe matrix', () => {
  assert.deepEqual(fixture.hardStops, REQUIRED_HARD_STOPS);
  const matrix = new Map(fixture.localSafeActionMatrix.map((entry) => [entry.action, entry]));
  assert.equal(matrix.get('docs').defaultStatus, 'allowed');
  assert.equal(matrix.get('fixtures').defaultStatus, 'allowed');
  assert.equal(matrix.get('structure_only_tests').defaultStatus, 'allowed');
  assert.equal(matrix.get('real_memory_scan').defaultStatus, 'blocked');
  assert.equal(matrix.get('durable_write').defaultStatus, 'blocked');
});

test('phase f admin review schema fixture rejects readiness overclaims', () => {
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenClaims.includes(claim), `${claim} missing from forbiddenClaims`);
  }

  assert.ok(fixture.forbiddenClaims.includes('production readiness'));
  assert.ok(fixture.forbiddenClaims.includes('cutover readiness'));
  assert.ok(fixture.forbiddenClaims.includes('public MCP expansion approved'));
});
