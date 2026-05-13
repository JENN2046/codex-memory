const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'lifecycle-policy-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('lifecycle policy fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'lifecycle-policy-v1');
  assert.ok(Array.isArray(fixture.statuses));
  assert.ok(Array.isArray(fixture.transitions));
  assert.ok(fixture.defaultReadPolicy);
  assert.ok(fixture.auditEvent);
});

test('lifecycle statuses are unique', () => {
  const fixture = loadFixture();
  const uniqueStatuses = new Set(fixture.statuses);

  assert.equal(uniqueStatuses.size, fixture.statuses.length);
  assert.deepEqual([...uniqueStatuses].sort(), [
    'active',
    'proposal',
    'rejected',
    'stale',
    'superseded',
    'tombstoned'
  ]);
});

test('all lifecycle transitions point to known statuses', () => {
  const fixture = loadFixture();
  const statuses = new Set(fixture.statuses);

  for (const transition of fixture.transitions) {
    assert.ok(statuses.has(transition.from), `unknown from status: ${transition.from}`);
    assert.ok(statuses.has(transition.to), `unknown to status: ${transition.to}`);
  }
});

test('tombstoned has no default outgoing transition', () => {
  const fixture = loadFixture();
  const outgoing = fixture.transitions.filter(transition => transition.from === 'tombstoned');

  assert.deepEqual(outgoing, []);
});

test('default read policy include and exclude sets do not overlap', () => {
  const fixture = loadFixture();
  const include = new Set(fixture.defaultReadPolicy.include);
  const exclude = new Set(fixture.defaultReadPolicy.exclude);
  const overlap = [...include].filter(status => exclude.has(status));

  assert.deepEqual(overlap, []);
  assert.deepEqual([...include].sort(), ['active', 'stale']);
  assert.deepEqual([...exclude].sort(), ['proposal', 'rejected', 'superseded', 'tombstoned']);
});

test('lifecycle audit event shape contains required fields', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.auditEvent.requiredFields, [
    'event_id',
    'memory_id',
    'event_type',
    'from_status',
    'to_status',
    'reason',
    'actor_client_id',
    'request_source',
    'evidence',
    'created_at',
    'reversible'
  ]);
});

test('lifecycle event types include lifecycle_transition', () => {
  const fixture = loadFixture();

  assert.ok(fixture.auditEvent.eventTypes.includes('lifecycle_transition'));
  for (const transition of fixture.transitions) {
    assert.equal(transition.event_type, 'lifecycle_transition');
  }
});
