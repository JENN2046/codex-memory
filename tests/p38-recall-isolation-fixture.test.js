const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p38-recall-isolation-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const ISOLATED_KINDS = [
  'governance_record',
  'validation_transcript',
  'redaction_sample',
  'policy_decision',
  'blocked_memory',
  'tombstoned_memory',
  'out_of_scope_memory'
];

test('P38 recall isolation fixture parses and locks blocked fixture-only state', () => {
  assert.equal(fixture.schemaVersion, 'p38-recall-isolation-v1');
  assert.equal(fixture.phase, 'P38-recall-isolation-fixtures');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.sourceMode, 'committed_fixture');
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.mutated, false);
});

test('P38 fixture does not claim recall runtime, candidate, ranking, projection, or audit integration', () => {
  assert.equal(fixture.recallRuntimeIntegrated, false);
  assert.equal(fixture.candidateCacheIntegrated, false);
  assert.equal(fixture.rankingIntegrated, false);
  assert.equal(fixture.projectionIntegrated, false);
  assert.equal(fixture.auditSummaryIntegrated, false);
});

test('P38 isolated record kinds never enter normal recall or recall-adjacent surfaces', () => {
  const rulesByKind = new Map(fixture.isolationRules.map(rule => [rule.record_kind, rule]));

  for (const kind of ISOLATED_KINDS) {
    const rule = rulesByKind.get(kind);
    assert.ok(rule, kind);
    assert.equal(rule.entersNormalRecall, false, kind);
    assert.equal(rule.entersCandidateCache, false, kind);
    assert.equal(rule.entersRanking, false, kind);
    assert.equal(rule.entersProjection, false, kind);
    assert.equal(rule.entersAuditSummary, false, kind);
    assert.match(rule.reasonCode, /^P38_/, kind);
  }
});

test('P38 control case proves only active in-scope user memory is allowed into normal recall surfaces', () => {
  const control = fixture.isolationRules.find(rule => rule.record_kind === 'active_in_scope_user_memory_control');

  assert.equal(control.namespace, 'user_memory');
  assert.equal(control.entersNormalRecall, true);
  assert.equal(control.entersCandidateCache, true);
  assert.equal(control.entersRanking, true);
  assert.equal(control.entersProjection, true);
  assert.equal(control.entersAuditSummary, true);
});

test('P38 governance and isolation namespaces stay separate from normal recall namespaces', () => {
  for (const namespace of fixture.isolatedNamespaces) {
    assert.equal(fixture.normalRecallNamespaces.includes(namespace), false, namespace);
  }

  assert.deepEqual(fixture.normalRecallNamespaces, [
    'user_memory',
    'project_memory',
    'task_memory'
  ]);
});

test('P38 fail-closed cases reject unknown, missing, polluted, and candidate-cache claims', () => {
  for (const entry of fixture.failClosedCases) {
    assert.equal(entry.acceptedForPlanning, false, entry.id);
    assert.equal(entry.decision, 'deny', entry.id);
    assert.match(entry.reasonCode, /^P38_/, entry.id);
  }
});

test('P38 safety flags preserve no real data, no durable write, no public MCP, no provider, and no remote action', () => {
  for (const flag of [
    'noRuntimeRecallIntegration',
    'noCommandExecution',
    'noDurableMemoryWrite',
    'noDurableAuditWrite',
    'noPublicMcpExpansion',
    'noRealMemoryContentRead',
    'noRealMemoryPreview',
    'noRealMemoryExport',
    'noRealMemoryImport',
    'noRealMemoryScan',
    'noMigrationApply',
    'noBackupRestore',
    'noProviderCall',
    'noServiceStart',
    'noConfigMutation',
    'noDependencyChange',
    'noRemoteWrite'
  ]) {
    assert.equal(fixture.safety[flag], true, flag);
  }
});

test('P38 required wording prevents runtime-ready and recall pollution overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic recall isolation fixture only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('do not enter normal recall namespaces')));
  assert.ok(fixture.requiredWording.some(line => line.includes('do not enter candidate cache')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not mean recall runtime isolation')));
  assert.ok(fixture.forbiddenClaims.includes('recall runtime isolation is implemented'));
  assert.ok(fixture.forbiddenClaims.includes('governance records enter normal recall'));
  assert.ok(fixture.forbiddenClaims.includes('P38 makes v1.0 RC ready'));
});

test('P38 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /password\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /token\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /set-cookie/i);
  assert.doesNotMatch(fixtureText, /(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
  assert.doesNotMatch(fixtureText, /https?:\/\//i);
});

test('P38 reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
