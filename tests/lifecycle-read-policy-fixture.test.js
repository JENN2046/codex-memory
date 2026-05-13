const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'lifecycle-read-policy-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function isVisibleByFixturePolicy(record, policy) {
  if (!policy.defaultReadPolicy.include.includes(record.status)) {
    return false;
  }

  if (
    record.visibility === 'private' &&
    policy.visibilityRules.private.requiresSameClientId &&
    record.client_id !== record.requestClientId
  ) {
    return false;
  }

  return true;
}

test('lifecycle read policy fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'lifecycle-read-policy-v1');
  assert.ok(Array.isArray(fixture.statuses));
  assert.ok(fixture.defaultReadPolicy);
  assert.ok(fixture.visibilityRules);
  assert.ok(fixture.auditSummary);
});

test('include and exclude statuses are known statuses', () => {
  const fixture = loadFixture();
  const statuses = new Set(fixture.statuses);
  const policyStatuses = [
    ...fixture.defaultReadPolicy.include,
    ...fixture.defaultReadPolicy.exclude
  ];

  for (const status of policyStatuses) {
    assert.ok(statuses.has(status), `unknown read policy status: ${status}`);
  }
});

test('include and exclude statuses do not overlap', () => {
  const fixture = loadFixture();
  const include = new Set(fixture.defaultReadPolicy.include);
  const exclude = new Set(fixture.defaultReadPolicy.exclude);
  const overlap = [...include].filter(status => exclude.has(status));

  assert.deepEqual(overlap, []);
});

test('active and stale are included by default', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.defaultReadPolicy.include, ['active', 'stale']);
});

test('proposal, rejected, superseded, and tombstoned are excluded by default', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.defaultReadPolicy.exclude, [
    'proposal',
    'rejected',
    'superseded',
    'tombstoned'
  ]);
});

test('private cross-client record should be hidden by policy fixture', () => {
  const fixture = loadFixture();
  const record = fixture.policyExamples.find(example => example.id === 'private-cross-client-hidden');

  assert.ok(record);
  assert.equal(isVisibleByFixturePolicy(record, fixture), false);
  assert.equal(record.expectedVisible, false);
});

test('private same-client record should remain visible by policy fixture', () => {
  const fixture = loadFixture();
  const record = fixture.policyExamples.find(example => example.id === 'private-same-client-visible');

  assert.ok(record);
  assert.equal(isVisibleByFixturePolicy(record, fixture), true);
  assert.equal(record.expectedVisible, true);
});

test('audit summary shape has required fields', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.auditSummary.requiredFields, [
    'readPolicyApplied',
    'lifecyclePolicyApplied',
    'lifecycleIncludedStatuses',
    'lifecycleExcludedStatuses',
    'hiddenByLifecycleCount',
    'staleResultCount',
    'scopeWorkspacePresent'
  ]);
});

test('raw workspace_id should not enter audit summary shape', () => {
  const fixture = loadFixture();

  assert.equal(fixture.auditSummary.rawWorkspaceIdAllowed, false);
  assert.ok(fixture.auditSummary.requiredFields.includes('scopeWorkspacePresent'));
  assert.ok(!fixture.auditSummary.requiredFields.includes('workspace_id'));
});
