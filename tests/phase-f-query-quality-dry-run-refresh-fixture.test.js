const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-query-quality-dry-run-refresh-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_AREAS = ['lifecycle-proposal-state', 'forget-flow-boundary', 'admin-review-schema'];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f query quality refresh fixture keeps dry-run no-runtime boundary', () => {
  assert.equal(fixture.version, 'phase-f-query-quality-dry-run-refresh-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableMemoryWritten, false);
});

test('phase f query quality refresh fixture has exact assertion areas', () => {
  assert.deepEqual(fixture.queryAssertions.map((assertion) => assertion.area), REQUIRED_AREAS);
  assert.equal(new Set(fixture.queryAssertions.map((assertion) => assertion.id)).size, fixture.queryAssertions.length);
});

test('phase f query quality assertions are fixture-only and bounded', () => {
  for (const assertion of fixture.queryAssertions) {
    assert.ok(assertion.query, `${assertion.id} query missing`);
    assert.ok(assertion.target, `${assertion.id} target missing`);
    assert.ok(Array.isArray(assertion.mustContain), `${assertion.id} mustContain missing`);
    assert.ok(assertion.mustContain.length > 0, `${assertion.id} mustContain empty`);
    assert.ok(Array.isArray(assertion.mustNotContain), `${assertion.id} mustNotContain missing`);
    assert.ok(assertion.mustNotContain.length > 0, `${assertion.id} mustNotContain empty`);
  }
});

test('phase f query quality report shape keeps dry-run counters and forbids fake scores', () => {
  const shape = fixture.dryRunReportShape;
  for (const field of ['mutated', 'providerCalls', 'durableMemoryTouched']) {
    assert.ok(shape.requiredTopLevelFields.includes(field), `${field} required field missing`);
  }
  for (const field of ['hitRate', 'qualityScore', 'providerLatency', 'realMemorySample']) {
    assert.ok(shape.forbiddenTopLevelFields.includes(field), `${field} forbidden field missing`);
  }
});

test('phase f query quality refresh fixture rejects readiness and provider overclaims', () => {
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenDefaults.includes(claim), `${claim} missing from forbiddenDefaults`);
  }

  assert.ok(fixture.forbiddenDefaults.includes('provider call executed'));
  assert.ok(fixture.forbiddenDefaults.includes('real memory store read'));
  assert.ok(fixture.forbiddenDefaults.includes('durable memory already written'));
});
