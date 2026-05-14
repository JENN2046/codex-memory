const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'mutation-audit-shape-v1.json');

const EVENT_TYPES = [
  'memory_update',
  'memory_supersede',
  'memory_forget',
  'memory_validate',
  'memory_checkpoint',
  'memory_handoff'
];

const REQUIRED_FIELDS = [
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

function eventRule(fixture, eventType) {
  const rule = fixture.eventRules[eventType];
  assert.ok(rule, `missing event rule: ${eventType}`);
  return rule;
}

function mutationEventRules(fixture) {
  return fixture.eventTypes.map(eventType => eventRule(fixture, eventType));
}

test('mutation audit shape fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'mutation-audit-shape-v1');
  assert.equal(fixture.version, 'v1');
  assert.ok(Array.isArray(fixture.eventTypes));
  assert.ok(fixture.eventRules);
});

test('eventTypes are unique and complete', () => {
  const fixture = loadFixture();
  const uniqueEventTypes = new Set(fixture.eventTypes);

  assert.equal(uniqueEventTypes.size, fixture.eventTypes.length);
  assert.deepEqual([...fixture.eventTypes].sort(), [...EVENT_TYPES].sort());
});

test('requiredFields are complete', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredFields, REQUIRED_FIELDS);
});

test('every event type has tool_name', () => {
  const fixture = loadFixture();

  assert.ok(fixture.requiredFields.includes('tool_name'));

  for (const eventType of fixture.eventTypes) {
    const rule = eventRule(fixture, eventType);
    assert.equal(typeof rule.tool_name, 'string', `${eventType} must have tool_name`);
    assert.ok(rule.tool_name.endsWith('_memory'), `${eventType} tool_name should be a memory tool candidate`);
  }
});

test('every mutation event requires reason and evidence', () => {
  const fixture = loadFixture();

  assert.ok(fixture.requiredFields.includes('reason'));
  assert.ok(fixture.requiredFields.includes('evidence'));

  for (const rule of mutationEventRules(fixture)) {
    assert.equal(rule.mutationEvent, true, `${rule.tool_name} must be marked as mutation event`);
    assert.equal(rule.requiresReason, true, `${rule.tool_name} must require reason`);
    assert.equal(rule.requiresEvidence, true, `${rule.tool_name} must require evidence`);
  }
});

test('every mutation event has redaction_applied', () => {
  const fixture = loadFixture();

  assert.ok(fixture.requiredFields.includes('redaction_applied'));

  for (const rule of mutationEventRules(fixture)) {
    assert.equal(rule.requiresRedactionApplied, true, `${rule.tool_name} must require redaction flag`);
  }
});

test('every mutation event has lifecycle_policy_applied', () => {
  const fixture = loadFixture();

  assert.ok(fixture.requiredFields.includes('lifecycle_policy_applied'));

  for (const rule of mutationEventRules(fixture)) {
    assert.equal(rule.requiresLifecyclePolicyApplied, true, `${rule.tool_name} must require lifecycle policy flag`);
  }
});

test('every mutation event has scope_policy_applied', () => {
  const fixture = loadFixture();

  assert.ok(fixture.requiredFields.includes('scope_policy_applied'));

  for (const rule of mutationEventRules(fixture)) {
    assert.equal(rule.requiresScopePolicyApplied, true, `${rule.tool_name} must require scope policy flag`);
  }
});

test('update requires diff_summary and previous_snapshot_ref', () => {
  const fixture = loadFixture();
  const rule = eventRule(fixture, 'memory_update');

  assert.ok(fixture.requiredFields.includes('diff_summary'));
  assert.ok(fixture.requiredFields.includes('previous_snapshot_ref'));
  assert.equal(rule.requiresDiffSummary, true);
  assert.equal(rule.requiresPreviousSnapshotRef, true);
  assert.equal(rule.noSilentOverwrite, true);
});

test('supersede requires bidirectional reference fields', () => {
  const fixture = loadFixture();
  const rule = eventRule(fixture, 'memory_supersede');

  assert.equal(rule.requiresSupersedesMemoryId, true);
  assert.equal(rule.requiresSupersededByMemoryId, true);
  assert.deepEqual(rule.bidirectionalReferenceFields, [
    'supersedes_memory_id',
    'superseded_by_memory_id'
  ]);
  assert.deepEqual(rule.allowedFromStatuses, ['active', 'stale']);
  assert.equal(rule.to_status, 'superseded');
});

test('forget defaults to tombstone and forbids hard delete', () => {
  const fixture = loadFixture();
  const rule = eventRule(fixture, 'memory_forget');

  assert.equal(rule.defaultAction, 'tombstone');
  assert.equal(rule.hardDeleteAllowed, false);
  assert.equal(rule.requiresTombstoneReason, true);
  assert.equal(rule.to_status, 'tombstoned');
});

test('validate cannot revive rejected or tombstoned by default', () => {
  const fixture = loadFixture();
  const rule = eventRule(fixture, 'memory_validate');

  assert.deepEqual(rule.allowedTransitions, [
    { from: 'proposal', to: 'active', requiresEvidence: true },
    { from: 'stale', to: 'active', requiresEvidence: true }
  ]);
  assert.deepEqual(rule.forbiddenDefaultTransitions, [
    { from: 'rejected', to: 'active' },
    { from: 'tombstoned', to: 'active' }
  ]);
});

test('checkpoint and handoff require SecretScanner boundary', () => {
  const fixture = loadFixture();

  for (const eventType of ['memory_checkpoint', 'memory_handoff']) {
    const rule = eventRule(fixture, eventType);

    assert.equal(rule.requiresEvidence, true, `${eventType} must require evidence`);
    assert.equal(rule.requiresScopePolicy, true, `${eventType} must require scope policy`);
    assert.equal(rule.mustPassSecretScanner, true, `${eventType} must pass SecretScanner`);
  }
});

test('no audit shape permits raw secret output', () => {
  const fixture = loadFixture();

  assert.equal(fixture.permitsRawSecretOutput, false);

  for (const rule of mutationEventRules(fixture)) {
    assert.equal(rule.permitsRawSecretOutput, false, `${rule.tool_name} permits raw secret output`);
  }
});

test('no low-risk audit summary permits raw workspace_id', () => {
  const fixture = loadFixture();

  assert.equal(fixture.lowRiskAuditSummaryAllowsRawWorkspaceId, false);

  for (const rule of mutationEventRules(fixture)) {
    assert.equal(
      rule.lowRiskAuditSummaryAllowsRawWorkspaceId,
      false,
      `${rule.tool_name} permits raw workspace_id in low-risk audit summary`
    );
  }
});
