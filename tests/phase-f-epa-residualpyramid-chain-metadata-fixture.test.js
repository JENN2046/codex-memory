const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-epa-residualpyramid-chain-metadata-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_SCENARIOS = [
  'epa-expansion-bounded-scope',
  'epa-pruning-deterministic-stage',
  'residual-layer-ordering-signal',
  'chain-handoff-linkage-required',
  'metadata-omission-negative',
  'readiness-overclaim-rejected'
];
const FORBIDDEN_READY_CLAIMS = ['runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true', 'RC_READY'];

test('phase f EPA/ResidualPyramid fixture keeps synthetic no-runtime boundary', () => {
  assert.equal(fixture.fixtureId, 'phase-f-epa-residualpyramid-chain-metadata-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.status, 'synthetic_fixture_only');
  assert.equal(fixture.evidenceClass, 'fixture_contract_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeParityClaimed, false);
  assert.equal(fixture.realRecallObserved, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.durableStateMutated, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryStoreRead, false);
});

test('phase f EPA/ResidualPyramid fixture has exact required scenarios', () => {
  const ids = fixture.scenarios.map((scenario) => scenario.id);
  assert.deepEqual(ids, REQUIRED_SCENARIOS);
  assert.equal(new Set(ids).size, ids.length);
});

test('phase f EPA/ResidualPyramid scenarios declare chain metadata contract', () => {
  for (const scenario of fixture.scenarios) {
    assert.ok(scenario.id, 'scenario id missing');
    assert.ok(scenario.chainFamily, `${scenario.id} chainFamily missing`);
    assert.ok(scenario.stage, `${scenario.id} stage missing`);
    assert.equal(typeof scenario.inputMetadata, 'object', `${scenario.id} inputMetadata missing`);
    assert.equal(typeof scenario.expectedMetadata, 'object', `${scenario.id} expectedMetadata missing`);
    assert.ok(scenario.expectedMetadata.stageId, `${scenario.id} expected stageId missing`);
    assert.ok(Array.isArray(scenario.blockedClaims), `${scenario.id} blockedClaims missing`);
    assert.ok(scenario.blockedClaims.length > 0, `${scenario.id} blockedClaims empty`);
    assert.ok(scenario.failureMode, `${scenario.id} failureMode missing`);
  }
});

test('phase f EPA expansion and pruning scenarios require bounded deterministic metadata', () => {
  const expansion = fixture.scenarios.find((scenario) => scenario.id === 'epa-expansion-bounded-scope');
  assert.ok(expansion);
  assert.equal(expansion.expectedMetadata.sourceCandidateId, expansion.inputMetadata.sourceCandidateId);
  assert.deepEqual(expansion.expectedMetadata.boundedExpansionScope, ['axis:governance', 'axis:checkpoint']);
  assert.ok(expansion.blockedClaims.includes('implicit_global_expansion'));

  const pruning = fixture.scenarios.find((scenario) => scenario.id === 'epa-pruning-deterministic-stage');
  assert.ok(pruning);
  assert.equal(pruning.expectedMetadata.providerDependency, false);
  assert.equal(pruning.expectedMetadata.candidateCountAfter, pruning.inputMetadata.candidateCountBefore - 1);
  assert.ok(pruning.blockedClaims.includes('hidden_provider_dependency'));
});

test('phase f residual layer and handoff scenarios require linkage and count metadata', () => {
  const residual = fixture.scenarios.find((scenario) => scenario.id === 'residual-layer-ordering-signal');
  assert.ok(residual);
  assert.equal(residual.expectedMetadata.parentCandidateId, residual.inputMetadata.parentCandidateId);
  assert.equal(residual.expectedMetadata.orderingTieBreakSignal, 'higher_specificity_then_stable_id');
  assert.ok(residual.blockedClaims.includes('random_ordering'));

  const handoff = fixture.scenarios.find((scenario) => scenario.id === 'chain-handoff-linkage-required');
  assert.ok(handoff);
  assert.equal(handoff.expectedMetadata.priorStageId, handoff.inputMetadata.priorStageId);
  assert.equal(handoff.expectedMetadata.nextStageId, handoff.inputMetadata.nextStageId);
  assert.equal(handoff.expectedMetadata.candidateCountAfter, handoff.expectedMetadata.candidateCountBefore);
});

test('phase f EPA/ResidualPyramid fixture rejects missing metadata and readiness overclaims', () => {
  const omission = fixture.scenarios.find((scenario) => scenario.id === 'metadata-omission-negative');
  assert.ok(omission);
  assert.equal(omission.expectedMetadata.accepted, false);
  assert.deepEqual(omission.expectedMetadata.missingFields, [
    'priorStageId',
    'candidateCountBefore',
    'candidateCountAfter'
  ]);

  const safety = fixture.scenarios.find((scenario) => scenario.id === 'readiness-overclaim-rejected');
  assert.ok(safety);
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(safety.blockedClaims.includes(claim), `${claim} missing from safety blockedClaims`);
  }
  assert.equal(safety.expectedMetadata.runtimeParityClaimed, false);
  assert.equal(safety.expectedMetadata.realRecallObserved, false);
  assert.equal(safety.expectedMetadata.rcReady, false);
});
