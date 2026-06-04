const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-tagmemo-semantic-association-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_SCENARIOS = [
  'tagmemo-association-strength-basic',
  'semantic-grouping-topic-cluster',
  'query-expansion-controlled',
  'blocked-over-expansion-negative',
  'epa-residual-explicit-input',
  'ordering-tie-breaker-deterministic',
  'donor-difference-documented',
  'readiness-overclaim-rejected',
  'query-expansion-tag-collision-negative',
  'query-expansion-topic-neighbor-negative',
  'query-expansion-provider-score-negative',
  'ordering-tie-breaker-recency-stable',
  'ordering-tie-breaker-topic-specificity',
  'ordering-tie-breaker-no-randomness-negative'
];

test('phase f tagmemo semantic association fixture keeps a no-runtime boundary', () => {
  assert.equal(fixture.version, 'phase-f-tagmemo-semantic-association-v1');
  assert.deepEqual(fixture.publicMcpToolsFrozen, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.runtimeExecution, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.providerCall, false);
  assert.equal(fixture.durableMutation, false);
  assert.equal(fixture.readinessClaimsAllowed, false);
});

test('phase f tagmemo semantic association fixture has exact required scenarios', () => {
  const ids = fixture.scenarios.map((scenario) => scenario.scenarioId);
  assert.deepEqual(ids, REQUIRED_SCENARIOS);
  assert.equal(new Set(ids).size, ids.length);
});

test('phase f tagmemo semantic association scenarios define expected and blocked associations', () => {
  for (const scenario of fixture.scenarios) {
    assert.ok(scenario.coverage, `${scenario.scenarioId} coverage missing`);
    assert.ok(scenario.query, `${scenario.scenarioId} query missing`);
    assert.ok(Array.isArray(scenario.expectedAssociations), `${scenario.scenarioId} expectedAssociations missing`);
    assert.ok(Array.isArray(scenario.blockedAssociations), `${scenario.scenarioId} blockedAssociations missing`);
    assert.ok(scenario.orderingExpectation, `${scenario.scenarioId} orderingExpectation missing`);
    assert.ok(scenario.donorCompatibilityNote, `${scenario.scenarioId} donorCompatibilityNote missing`);
  }
});

test('phase f tagmemo semantic association fixture rejects readiness overclaims', () => {
  const safetyScenario = fixture.scenarios.find((scenario) => scenario.scenarioId === 'readiness-overclaim-rejected');
  assert.ok(safetyScenario);
  assert.deepEqual(safetyScenario.forbiddenClaims, [
    'RC_READY',
    'runtimeReady=true',
    'finalRcMatrixReady=true',
    'rcReady=true',
    'publicMcpExpansionApproved',
    'providerCallExecuted',
    'realMemoryStoreRead'
  ]);
});
test('phase f tagmemo controlled query expansion negatives stay blocked', () => {
  const negativeScenarioIds = [
    'query-expansion-tag-collision-negative',
    'query-expansion-topic-neighbor-negative',
    'query-expansion-provider-score-negative'
  ];

  for (const scenarioId of negativeScenarioIds) {
    const scenario = fixture.scenarios.find((candidate) => candidate.scenarioId === scenarioId);
    assert.ok(scenario, `${scenarioId} missing`);
    assert.ok(scenario.expectedAssociations.length > 0, `${scenarioId} expectedAssociations empty`);
    assert.ok(scenario.blockedAssociations.length > 0, `${scenarioId} blockedAssociations empty`);
    assert.notDeepEqual(scenario.expectedAssociations, scenario.blockedAssociations, `${scenarioId} expected and blocked overlap`);
  }
});
test('phase f tagmemo ordering tie-breaker scenarios are deterministic', () => {
  const orderingScenarioIds = [
    'ordering-tie-breaker-deterministic',
    'ordering-tie-breaker-recency-stable',
    'ordering-tie-breaker-topic-specificity',
    'ordering-tie-breaker-no-randomness-negative'
  ];

  for (const scenarioId of orderingScenarioIds) {
    const scenario = fixture.scenarios.find((candidate) => candidate.scenarioId === scenarioId);
    assert.ok(scenario, `${scenarioId} missing`);
    assert.ok(scenario.orderingExpectation, `${scenarioId} orderingExpectation missing`);
    assert.notEqual(scenario.orderingExpectation, 'random_ordering_allowed', 'ordering must not allow random ordering');
    assert.notEqual(scenario.orderingExpectation, 'provider_score_required', 'ordering must not require provider scores');
  }
});
