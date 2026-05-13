const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'lifecycle-read-policy-runtime-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function findExample(fixture, id) {
  const example = fixture.runtimeExamples.find(item => item.id === id);
  assert.ok(example, `missing runtime example: ${id}`);
  return example;
}

function evaluateRuntimeFixture(record, fixture) {
  let visible = true;
  let hiddenByLifecycle = false;

  if (
    record.lifecyclePolicyEnabled &&
    !fixture.enabledLifecyclePolicy.include.includes(record.status)
  ) {
    visible = false;
    hiddenByLifecycle = true;
  }

  if (
    visible &&
    record.softReadPolicyEnabled &&
    record.visibility === 'private' &&
    fixture.visibilityRules.private.requiresSameClientId &&
    record.client_id !== record.requestClientId
  ) {
    visible = false;
  }

  return {
    visible,
    hiddenByLifecycle,
    staleCounted: visible && record.status === 'stale'
  };
}

test('lifecycle read policy runtime fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'lifecycle-read-policy-runtime-v1');
  assert.ok(fixture.flags);
  assert.ok(Array.isArray(fixture.statuses));
  assert.ok(fixture.enabledLifecyclePolicy);
  assert.ok(fixture.staleBehavior);
  assert.ok(fixture.visibilityRules);
  assert.ok(fixture.missingColumnBehavior);
  assert.ok(fixture.auditSummary);
});

test('default runtime flags are false', () => {
  const fixture = loadFixture();

  assert.equal(fixture.flags.CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY, false);
  assert.equal(fixture.flags.CODEX_MEMORY_ENABLE_SOFT_READ_POLICY, false);
});

test('active and stale are included when lifecycle policy is enabled', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.enabledLifecyclePolicy.include, ['active', 'stale']);

  for (const id of [
    'active-visible-when-enabled',
    'stale-visible-and-counted-when-enabled'
  ]) {
    const record = findExample(fixture, id);
    const result = evaluateRuntimeFixture(record, fixture);

    assert.equal(result.visible, true);
    assert.equal(result.hiddenByLifecycle, false);
    assert.equal(record.expectedVisible, true);
  }
});

test('proposal, rejected, superseded, and tombstoned are excluded when lifecycle policy is enabled', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.enabledLifecyclePolicy.exclude, [
    'proposal',
    'rejected',
    'superseded',
    'tombstoned'
  ]);

  for (const id of [
    'proposal-hidden-when-enabled',
    'rejected-hidden-when-enabled',
    'superseded-hidden-when-enabled',
    'tombstoned-hidden-when-enabled'
  ]) {
    const record = findExample(fixture, id);
    const result = evaluateRuntimeFixture(record, fixture);

    assert.equal(result.visible, false);
    assert.equal(result.hiddenByLifecycle, true);
    assert.equal(record.expectedVisible, false);
    assert.equal(record.expectedHiddenByLifecycle, true);
  }
});

test('stale results remain visible but are counted separately', () => {
  const fixture = loadFixture();
  const record = findExample(fixture, 'stale-visible-and-counted-when-enabled');
  const result = evaluateRuntimeFixture(record, fixture);

  assert.equal(fixture.staleBehavior.visible, true);
  assert.equal(fixture.staleBehavior.countField, 'staleResultCount');
  assert.equal(result.visible, true);
  assert.equal(result.staleCounted, true);
  assert.equal(record.expectedStaleCounted, true);
});

test('same-client private record remains visible under soft read policy', () => {
  const fixture = loadFixture();
  const record = findExample(fixture, 'private-same-client-visible-under-soft-policy');
  const result = evaluateRuntimeFixture(record, fixture);

  assert.equal(record.softReadPolicyEnabled, true);
  assert.equal(result.visible, true);
  assert.equal(record.expectedVisible, true);
});

test('cross-client private record is hidden under soft read policy', () => {
  const fixture = loadFixture();
  const record = findExample(fixture, 'private-cross-client-hidden-under-soft-policy');
  const result = evaluateRuntimeFixture(record, fixture);

  assert.equal(record.softReadPolicyEnabled, true);
  assert.equal(result.visible, false);
  assert.equal(record.expectedVisible, false);
});

test('missing lifecycle columns require warn or fail-safe behavior', () => {
  const fixture = loadFixture();

  assert.equal(fixture.missingColumnBehavior.lifecycleColumnAvailable, false);
  assert.equal(fixture.missingColumnBehavior.whenLifecyclePolicyEnabled, 'warn-or-fail-safe');
  assert.equal(fixture.missingColumnBehavior.mustNotTreatUnknownAsActive, true);
  assert.equal(fixture.missingColumnBehavior.automaticMigrationAllowed, false);
});

test('audit summary shape includes required runtime fields', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.auditSummary.requiredFields, [
    'readPolicyApplied',
    'lifecyclePolicyApplied',
    'lifecycleIncludedStatuses',
    'lifecycleExcludedStatuses',
    'hiddenByLifecycleCount',
    'staleResultCount',
    'lifecycleColumnAvailable',
    'scopeWorkspacePresent'
  ]);
});

test('raw workspace_id is not allowed in audit summary shape', () => {
  const fixture = loadFixture();

  assert.equal(fixture.auditSummary.rawWorkspaceIdAllowed, false);
  assert.ok(fixture.auditSummary.requiredFields.includes('scopeWorkspacePresent'));
  assert.ok(!fixture.auditSummary.requiredFields.includes('workspace_id'));
});
