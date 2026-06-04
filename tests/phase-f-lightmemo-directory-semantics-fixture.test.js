const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-lightmemo-directory-semantics-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_SCENARIOS = [
  'maid-basic-directory-scope',
  'folder-basic-directory-scope',
  'maid-and-folder-or-scope',
  'search-all-knowledge-bases-explicit',
  'excluded-folder-respected',
  'directory-alias-map-explicit',
  'cross-directory-overreach-negative',
  'readiness-overclaim-rejected'
];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f lightmemo directory fixture keeps synthetic no-runtime boundary', () => {
  assert.equal(fixture.version, 'phase-f-lightmemo-directory-semantics-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
});

test('phase f lightmemo directory fixture has exact required scenarios', () => {
  const ids = fixture.scenarios.map((scenario) => scenario.scenarioId);
  assert.deepEqual(ids, REQUIRED_SCENARIOS);
  assert.equal(new Set(ids).size, ids.length);
});

test('phase f lightmemo directory scenarios declare expected and blocked scopes', () => {
  for (const scenario of fixture.scenarios) {
    assert.ok(scenario.queryShape, `${scenario.scenarioId} queryShape missing`);
    assert.ok(scenario.directoryIntent, `${scenario.scenarioId} directoryIntent missing`);
    assert.ok(Array.isArray(scenario.expectedScopes), `${scenario.scenarioId} expectedScopes missing`);
    assert.ok(Array.isArray(scenario.blockedScopes), `${scenario.scenarioId} blockedScopes missing`);
    assert.ok(scenario.expectedScopes.length > 0, `${scenario.scenarioId} expectedScopes empty`);
    assert.ok(scenario.blockedScopes.length > 0, `${scenario.scenarioId} blockedScopes empty`);
    assert.equal(typeof scenario.aliasMap, 'object', `${scenario.scenarioId} aliasMap missing`);
    assert.ok(Array.isArray(scenario.excludedFolders), `${scenario.scenarioId} excludedFolders missing`);
    assert.equal(typeof scenario.searchAllKnowledgeBases, 'boolean', `${scenario.scenarioId} searchAllKnowledgeBases missing`);
    assert.ok(scenario.donorCompatibilityNote, `${scenario.scenarioId} donorCompatibilityNote missing`);
    assert.ok(Array.isArray(scenario.mustNotClaim), `${scenario.scenarioId} mustNotClaim missing`);
  }
});

test('phase f lightmemo all-KB behavior is explicit only', () => {
  const allKbScenarios = fixture.scenarios.filter((scenario) => scenario.searchAllKnowledgeBases === true);
  assert.deepEqual(allKbScenarios.map((scenario) => scenario.scenarioId), ['search-all-knowledge-bases-explicit']);
  assert.deepEqual(allKbScenarios[0].expectedScopes, ['all_knowledge_bases']);
  assert.ok(allKbScenarios[0].blockedScopes.includes('implicit_all_kb_from_broad_query'));
});

test('phase f lightmemo excluded folders and alias map are explicit', () => {
  const excluded = fixture.scenarios.find((scenario) => scenario.scenarioId === 'excluded-folder-respected');
  assert.ok(excluded);
  assert.deepEqual(excluded.excludedFolders, ['private', 'archive']);
  assert.ok(excluded.blockedScopes.includes('folder:project-alpha-notes/private'));
  assert.ok(excluded.blockedScopes.includes('folder:project-alpha-notes/archive'));

  const alias = fixture.scenarios.find((scenario) => scenario.scenarioId === 'directory-alias-map-explicit');
  assert.ok(alias);
  assert.deepEqual(alias.aliasMap, { research: 'folder:canonical-research-notes' });
  assert.deepEqual(alias.expectedScopes, ['folder:canonical-research-notes']);
  assert.ok(alias.blockedScopes.includes('fuzzy_alias_expansion'));
});

test('phase f lightmemo fixture rejects readiness and runtime parity overclaims', () => {
  const safety = fixture.scenarios.find((scenario) => scenario.scenarioId === 'readiness-overclaim-rejected');
  assert.ok(safety);
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(safety.mustNotClaim.includes(claim), `${claim} missing from safety mustNotClaim`);
  }
  assert.ok(safety.blockedScopes.includes('runtime VCP parity'));
  assert.ok(safety.blockedScopes.includes('real LightMemo recall validated'));
});
