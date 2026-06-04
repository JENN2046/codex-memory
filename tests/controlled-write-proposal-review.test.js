const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'controlled-write-proposal-review-v1.json');

const CANDIDATES = [
  'audit_memory',
  'checkpoint_memory',
  'forget_memory',
  'handoff_memory',
  'supersede_memory',
  'update_memory',
  'validate_memory'
];

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function decisionByTool(fixture, toolCandidate) {
  const decision = fixture.candidateDecisions.find(candidate => candidate.toolCandidate === toolCandidate);
  assert.ok(decision, `missing decision for ${toolCandidate}`);
  return decision;
}

test('controlled write proposal review fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'controlled-write-proposal-review-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P12.4-MCP-tool-proposal-review');
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.docsAndTestsOnly, true);
});

test('proposal review keeps public MCP tools frozen', () => {
  const fixture = loadFixture();

  assert.equal(fixture.noMcpPublicToolExpansion, true);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);

  for (const decision of fixture.candidateDecisions) {
    assert.equal(decision.approvedAsPublicMcpTool, false, `${decision.toolCandidate} was approved too early`);
    assert.ok(decision.forbiddenActions.includes('public_mcp_expansion_now'));
  }
});

test('proposal review remains docs and tests only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.noRuntimeMutation, true);
  assert.equal(fixture.runtimeMutationAllowedNow, false);
  assert.equal(fixture.noDatabase, true);
  assert.equal(fixture.noDiaryWrite, true);
  assert.equal(fixture.noVectorWrite, true);
  assert.equal(fixture.noAuditLogWrite, true);
  assert.equal(fixture.noDurableMemoryWrite, true);

  for (const decision of fixture.candidateDecisions) {
    assert.equal(decision.runtimeMutationAllowedNow, false, `${decision.toolCandidate} can mutate too early`);
    assert.ok(decision.forbiddenActions.includes('runtime_mutation_now'));
  }
});

test('proposal review covers every controlled write candidate exactly once', () => {
  const fixture = loadFixture();
  const names = fixture.candidateDecisions.map(decision => decision.toolCandidate);

  assert.deepEqual([...names].sort(), CANDIDATES);
  assert.equal(new Set(names).size, names.length);
});

test('proposal review records P12 prerequisites and reviewed artifacts', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.prerequisites, [
    'P12.1-controlled-write-fixture-schemas',
    'P12.2-mutation-audit-shape-tests',
    'P12.3-controlled-write-dry-run-cli-prototypes'
  ]);
  assert.ok(fixture.reviewedArtifacts.includes('tests/fixtures/controlled-write-tools-v1.json'));
  assert.ok(fixture.reviewedArtifacts.includes('tests/fixtures/mutation-audit-shape-v1.json'));
  assert.ok(fixture.reviewedArtifacts.includes('tests/fixtures/controlled-write-dry-run-v1.json'));
  assert.ok(fixture.reviewedArtifacts.includes('src/cli/controlled-write-dry-run.js'));
});

test('validate_memory is the only recommended first runtime mutation candidate', () => {
  const fixture = loadFixture();
  const firstCandidates = fixture.candidateDecisions.filter(
    decision => decision.recommendedFirstRuntimeMutationCandidate === true
  );

  assert.equal(firstCandidates.length, 1);
  assert.equal(firstCandidates[0].toolCandidate, 'validate_memory');
  assert.equal(firstCandidates[0].mayEnterProposalPhase, true);
  assert.equal(firstCandidates[0].runtimeMutationAllowedNow, false);
  assert.ok(firstCandidates[0].blockedUntil.includes('P12.5 explicit approval'));
  assert.ok(firstCandidates[0].forbiddenActions.includes('revive_rejected_by_default'));
  assert.ok(firstCandidates[0].forbiddenActions.includes('revive_tombstoned_by_default'));
});

test('audit_memory may only enter future read-only proposal review', () => {
  const fixture = loadFixture();
  const decision = decisionByTool(fixture, 'audit_memory');

  assert.equal(decision.readOnly, true);
  assert.equal(decision.mayEnterProposalPhase, true);
  assert.equal(decision.approvedAsPublicMcpTool, false);
  assert.equal(decision.runtimeMutationAllowedNow, false);
  assert.ok(decision.forbiddenActions.includes('mutate_from_audit_memory'));
  assert.ok(decision.blockedUntil.includes('explicit public MCP tool expansion approval'));
});

test('destructive or high-risk mutation candidates are deferred', () => {
  const fixture = loadFixture();

  for (const toolCandidate of ['update_memory', 'supersede_memory', 'forget_memory']) {
    const decision = decisionByTool(fixture, toolCandidate);

    assert.equal(decision.decision, 'defer');
    assert.equal(decision.mayEnterProposalPhase, false);
    assert.equal(decision.runtimeMutationAllowedNow, false);
  }

  assert.ok(decisionByTool(fixture, 'update_memory').forbiddenActions.includes('silent_overwrite'));
  assert.ok(decisionByTool(fixture, 'supersede_memory').forbiddenActions.includes('missing_bidirectional_link'));
  assert.ok(decisionByTool(fixture, 'forget_memory').forbiddenActions.includes('hard_delete_by_default'));
});

test('checkpoint and handoff stay deferred until scoped evidence policy exists', () => {
  const fixture = loadFixture();

  for (const toolCandidate of ['checkpoint_memory', 'handoff_memory']) {
    const decision = decisionByTool(fixture, toolCandidate);

    assert.equal(decision.decision, 'defer');
    assert.ok(decision.blockedUntil.some(blocker => blocker.includes('evidence policy')));
    assert.ok(decision.forbiddenActions.includes('bypass_secret_scanner'));
    assert.ok(decision.forbiddenActions.includes('bypass_scope_policy'));
  }
});

test('proposal review forbids raw secret and raw workspace_id output', () => {
  const fixture = loadFixture();

  for (const decision of fixture.candidateDecisions) {
    assert.ok(decision.forbiddenActions.includes('emit_raw_secret'), `${decision.toolCandidate} may emit raw secret`);
    assert.ok(
      decision.forbiddenActions.includes('emit_raw_workspace_id_low_risk_summary'),
      `${decision.toolCandidate} may emit raw workspace_id`
    );
  }
});
