const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-cross-pack-dependency-map-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview'];
const REQUIRED_PACKS = [
  'tagmemo_semantic_association',
  'observability_admin_review_surface',
  'memory_governance_proposal',
  'lightmemo_directory_semantics',
  'epa_residualpyramid_chain_metadata',
  'memory_lifecycle_proposal_states',
  'query_quality_dry_run_refresh',
  'admin_review_schema_hardening',
  'fixture_pack_validation_surface',
  'readiness_boundary_wording_guard'
];
const REQUIRED_FUTURE_CONTRACTS = [
  'public_mcp_freeze_rollup',
  'fixture_drift_changelog',
  'cross_pack_dependency_map'
];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f cross-pack dependency map keeps synthetic no-runtime boundary', () => {
  assert.equal(fixture.version, 'phase-f-cross-pack-dependency-map-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
});

test('phase f cross-pack dependency map has exact pack ids', () => {
  const ids = fixture.packs.map((pack) => pack.id);
  assert.deepEqual(ids, REQUIRED_PACKS);
  assert.equal(new Set(ids).size, ids.length);
});

test('phase f cross-pack dependencies reference known packs or future docs only', () => {
  const ids = new Set(fixture.packs.map((pack) => pack.id));
  for (const pack of fixture.packs) {
    for (const upstream of pack.upstream) {
      assert.ok(ids.has(upstream), `${pack.id} unknown upstream ${upstream}`);
    }
    for (const downstream of pack.downstream) {
      assert.ok(ids.has(downstream) || downstream === 'future_phase_f_docs', `${pack.id} unknown downstream ${downstream}`);
    }
  }
});

test('phase f cross-pack map records review surfaces after eight fixture packs', () => {
  const byId = new Map(fixture.packs.map((pack) => [pack.id, pack]));
  const validationSurface = byId.get('fixture_pack_validation_surface');
  assert.deepEqual(validationSurface.upstream, REQUIRED_PACKS.slice(0, 8));

  const wordingGuard = byId.get('readiness_boundary_wording_guard');
  assert.ok(wordingGuard.upstream.includes('fixture_pack_validation_surface'));
  assert.ok(wordingGuard.downstream.includes('future_phase_f_docs'));
});

test('phase f cross-pack map records future synthetic contracts and blocked actions', () => {
  assert.deepEqual(fixture.futureSyntheticContracts.map((contract) => contract.id), REQUIRED_FUTURE_CONTRACTS);
  for (const contract of fixture.futureSyntheticContracts) {
    assert.ok(Array.isArray(contract.dependsOn), `${contract.id} dependsOn missing`);
    assert.ok(contract.safeShape, `${contract.id} safeShape missing`);
    assert.ok(Array.isArray(contract.blockedActions), `${contract.id} blockedActions missing`);
    assert.ok(contract.blockedActions.length > 0, `${contract.id} blockedActions empty`);
  }
});

test('phase f cross-pack dependency map rejects readiness and runtime dependency overclaims', () => {
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenDefaults.includes(claim), `${claim} missing from forbiddenDefaults`);
  }

  assert.ok(fixture.forbiddenDefaults.includes('runtime dependency proven'));
  assert.ok(fixture.forbiddenDefaults.includes('provider call executed'));
  assert.ok(fixture.forbiddenDefaults.includes('public MCP expansion approved'));

  for (const pack of fixture.packs) {
    assert.ok(Array.isArray(pack.nonClaims), `${pack.id} nonClaims missing`);
    assert.ok(pack.nonClaims.length > 0, `${pack.id} nonClaims empty`);
  }
});
