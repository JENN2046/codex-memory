const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-observability-admin-review-surface-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_SURFACES = [
  'phase_f_parity_summary',
  'tagmemo_fixture_pack_status',
  'runtime_gap_boundary_status',
  'public_mcp_freeze_status',
  'operator_next_safe_action',
  'readiness_overclaim_guard'
];
const REQUIRED_HARD_STOPS = ['A5', 'push', 'cutover', 'public_mcp_expansion', 'provider', 'real_memory_scan'];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f observability review surface fixture keeps a local-safe boundary', () => {
  assert.equal(fixture.version, 'phase-f-observability-admin-review-surface-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'local_fixture_or_design_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
});

test('phase f observability review surface fixture has exact required surfaces', () => {
  const ids = fixture.surfaces.map((surface) => surface.id);
  assert.deepEqual(ids, REQUIRED_SURFACES);
  assert.equal(new Set(ids).size, ids.length);
});

test('phase f observability review surfaces declare operator-facing boundaries', () => {
  for (const surface of fixture.surfaces) {
    assert.ok(surface.purpose, `${surface.id} purpose missing`);
    assert.ok(surface.artifactType, `${surface.id} artifactType missing`);
    assert.ok(surface.evidenceBoundary, `${surface.id} evidenceBoundary missing`);
    assert.ok(Array.isArray(surface.mustNotClaim), `${surface.id} mustNotClaim missing`);
    assert.ok(Array.isArray(surface.requiresApprovalFor), `${surface.id} requiresApprovalFor missing`);
    assert.ok(surface.mustNotClaim.length > 0, `${surface.id} mustNotClaim empty`);
  }
});

test('phase f observability review surface fixture preserves hard-stop categories', () => {
  assert.deepEqual(fixture.hardStops, REQUIRED_HARD_STOPS);

  for (const hardStop of REQUIRED_HARD_STOPS) {
    const referenced = fixture.surfaces.some((surface) => surface.requiresApprovalFor.includes(hardStop));
    assert.ok(referenced || hardStop === 'A5', `${hardStop} not referenced by any surface`);
  }
});

test('phase f observability review surface fixture rejects readiness overclaims', () => {
  assert.ok(Array.isArray(fixture.forbiddenClaims));
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenClaims.includes(claim), `${claim} missing from forbiddenClaims`);
  }

  const serialized = JSON.stringify(fixture);
  assert.equal(serialized.includes('PRECHECK_PASSED_RC_READY'), true);
  assert.equal(serialized.includes('runtimeExecuted":true'), false);
  assert.equal(serialized.includes('providerCalled":true'), false);
  assert.equal(serialized.includes('realMemoryStoreRead":true'), false);
  assert.equal(serialized.includes('durableStateMutated":true'), false);
});
