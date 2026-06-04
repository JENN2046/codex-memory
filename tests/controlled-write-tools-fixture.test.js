const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'controlled-write-tools-v1.json');

const REQUIRED_AUDIT_FIELDS = [
  'event_id',
  'memory_id',
  'event_type',
  'tool_name',
  'actor_client_id',
  'request_source',
  'from_status',
  'to_status',
  'reason',
  'evidence',
  'created_at',
  'reversible',
  'diff_summary',
  'previous_snapshot_ref',
  'redaction_applied',
  'lifecycle_policy_applied',
  'scope_policy_applied'
];

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function toolByName(fixture, name) {
  const tool = fixture.candidateTools.find(candidate => candidate.name === name);
  assert.ok(tool, `missing candidate tool: ${name}`);
  return tool;
}

test('controlled write tools fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'controlled-write-tools-v1');
  assert.equal(fixture.version, 'v1');
  assert.ok(Array.isArray(fixture.candidateTools));
  assert.equal(fixture.candidateTools.length, 7);
});

test('candidate tool names are unique and complete', () => {
  const fixture = loadFixture();
  const names = fixture.candidateTools.map(tool => tool.name);
  const uniqueNames = new Set(names);

  assert.equal(uniqueNames.size, names.length);
  assert.deepEqual(names.sort(), [
    'audit_memory',
    'checkpoint_memory',
    'forget_memory',
    'handoff_memory',
    'supersede_memory',
    'update_memory',
    'validate_memory'
  ]);
});

test('public MCP tools remain frozen and dry-run first is required', () => {
  const fixture = loadFixture();

  assert.equal(fixture.publicToolsFrozen, true);
  assert.equal(fixture.dryRunFirst, true);
  assert.equal(fixture.mutationDefault, false);
  assert.equal(fixture.hardDeleteAllowed, false);
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
});

test('tool candidates do not mutate by default', () => {
  const fixture = loadFixture();

  for (const tool of fixture.candidateTools) {
    if (tool.defaultMutates === true) {
      assert.equal(tool.futureRuntimeOnly, true, `${tool.name} mutates without future-runtime-only marker`);
      continue;
    }

    assert.equal(tool.defaultMutates, false, `${tool.name} should default to non-mutating`);
    assert.equal(tool.requiresDryRunFirst, true, `${tool.name} must require dry-run first`);
  }
});

test('mutation-capable candidates require audit event, reason, and evidence', () => {
  const fixture = loadFixture();
  const mutationCapable = fixture.candidateTools.filter(tool => tool.mutationCapable);

  assert.ok(mutationCapable.length > 0);

  for (const tool of mutationCapable) {
    assert.equal(tool.requiresAuditEvent, true, `${tool.name} must require audit event`);
    assert.equal(tool.requiresReason, true, `${tool.name} must require reason`);
    assert.equal(tool.requiresEvidence, true, `${tool.name} must require evidence`);
  }
});

test('update_memory forbids silent overwrite', () => {
  const fixture = loadFixture();
  const tool = toolByName(fixture, 'update_memory');

  assert.equal(tool.defaultMutates, false);
  assert.equal(tool.noSilentOverwrite, true);
  assert.equal(tool.requiresPreviousSnapshot, true);
  assert.equal(tool.requiresDiffSummary, true);
  assert.equal(tool.requiresAuditEvent, true);
  assert.ok(tool.forbiddenActions.includes('direct_content_overwrite_without_snapshot'));
  assert.ok(tool.forbiddenActions.includes('bypass_secret_scanner'));
  assert.ok(tool.forbiddenActions.includes('bypass_tool_argument_validator'));
});

test('supersede_memory requires bidirectional links', () => {
  const fixture = loadFixture();
  const tool = toolByName(fixture, 'supersede_memory');

  assert.equal(tool.requiresOldMemoryId, true);
  assert.equal(tool.requiresNewMemoryId, true);
  assert.equal(tool.oldStatusAfter, 'superseded');
  assert.equal(tool.requiresSupersedesLink, true);
  assert.equal(tool.requiresSupersededByLink, true);
  assert.equal(tool.requiresReason, true);
  assert.equal(tool.requiresEvidence, true);
});

test('forget_memory defaults to tombstone and forbids hard delete', () => {
  const fixture = loadFixture();
  const tool = toolByName(fixture, 'forget_memory');

  assert.equal(tool.defaultAction, 'tombstone');
  assert.equal(tool.hardDeleteAllowed, false);
  assert.equal(tool.requiresTombstoneReason, true);
  assert.equal(tool.tombstonedVisibleByDefault, false);
  assert.equal(tool.recoveryMode, 'future_admin_only');
  assert.ok(tool.forbiddenActions.includes('hard_delete_by_default'));
});

test('audit_memory is read-only', () => {
  const fixture = loadFixture();
  const tool = toolByName(fixture, 'audit_memory');

  assert.equal(tool.readOnly, true);
  assert.equal(tool.mutationCapable, false);
  assert.equal(tool.defaultMutates, false);
  assert.equal(tool.mayReadAuditTrail, true);
  assert.equal(tool.mustNotExposeRawSecrets, true);
  assert.equal(tool.mustNotExposeRawWorkspaceId, true);
});

test('validate_memory cannot revive rejected or tombstoned by default', () => {
  const fixture = loadFixture();
  const tool = toolByName(fixture, 'validate_memory');

  assert.deepEqual(tool.allowedLifecycleTransitions, [
    { from: 'proposal', to: 'active', requiresEvidence: true },
    { from: 'stale', to: 'active', requiresEvidence: true }
  ]);
  assert.deepEqual(tool.forbiddenLifecycleTransitions, [
    { from: 'rejected', to: 'active' },
    { from: 'tombstoned', to: 'active' }
  ]);
  assert.ok(tool.forbiddenActions.includes('auto_promote_without_evidence'));
});

test('checkpoint and handoff are convenience candidates that do not bypass policies', () => {
  const fixture = loadFixture();

  for (const name of ['checkpoint_memory', 'handoff_memory']) {
    const tool = toolByName(fixture, name);

    assert.equal(tool.convenienceToolOnly, true);
    assert.equal(tool.mustPassSecretScanner, true);
    assert.equal(tool.mustPassToolArgumentValidator, true);
    assert.equal(tool.mustWriteAudit, true);
    assert.equal(tool.mustNotBypassLifecyclePolicy, true);
    assert.ok(tool.forbiddenActions.includes('bypass_lifecycle_policy'));
  }
});

test('required audit fields include controlled mutation event shape', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredAuditFields, REQUIRED_AUDIT_FIELDS);

  for (const tool of fixture.candidateTools) {
    assert.deepEqual(tool.requiredAuditFields, REQUIRED_AUDIT_FIELDS, `${tool.name} audit fields drifted`);
  }
});

test('no tool permits raw secret output or raw workspace_id in low-risk summaries', () => {
  const fixture = loadFixture();

  for (const tool of fixture.candidateTools) {
    assert.equal(tool.permitsRawSecretOutput, false, `${tool.name} permits raw secret output`);
    assert.equal(
      tool.lowRiskSummaryAllowsRawWorkspaceId,
      false,
      `${tool.name} permits raw workspace_id in low-risk summary`
    );
    assert.ok(tool.forbiddenActions.includes('emit_raw_secret'), `${tool.name} must forbid raw secret output`);
    assert.ok(
      tool.forbiddenActions.includes('emit_raw_workspace_id_low_risk_summary'),
      `${tool.name} must forbid raw workspace_id in low-risk summary`
    );
  }
});
