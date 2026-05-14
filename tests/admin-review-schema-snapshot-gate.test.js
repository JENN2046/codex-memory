const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'admin-review-schema-snapshot-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function sorted(value) {
  return value.slice().sort();
}

function collectSnapshotKeys(snapshot, keys = []) {
  if (Array.isArray(snapshot)) {
    keys.push(...snapshot);
    return keys;
  }
  if (snapshot && typeof snapshot === 'object') {
    for (const child of Object.values(snapshot)) collectSnapshotKeys(child, keys);
  }
  return keys;
}

test('admin review schema snapshot fixture locks top-level safety', () => {
  const fixture = loadFixture();
  assert.equal(fixture.schemaVersion, 'admin-review-schema-snapshot.v1');
  assert.equal(fixture.mode, 'admin-review-schema-snapshot');
  assert.equal(fixture.destructive, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.durableMemoryTouched, false);
  assert.equal(fixture.realMemoryPreview, false);
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.mcpSchemaChanged, false);
  assert.equal(fixture.safety.publicMcpExpanded, false);
  assert.equal(fixture.safety.migrationApplied, false);
  assert.equal(fixture.safety.importExportApplied, false);
  assert.equal(fixture.safety.dependencyChanged, false);
});

test('admin review schema snapshot covers all required source surfaces', () => {
  const { snapshots } = loadFixture();
  assert.deepEqual(sorted(Object.keys(snapshots)), [
    'adminReview',
    'dashboard',
    'gateCi',
    'governanceReport',
    'httpObserve'
  ]);

  assert.ok(snapshots.adminReview.topLevelKeys.includes('publicMcpTools'));
  assert.ok(snapshots.adminReview.reviewSignalKeys.includes('importExportMigration'));
  assert.ok(snapshots.dashboard.topLevelKeys.includes('readPolicy'));
  assert.ok(snapshots.dashboard.topLevelKeys.includes('governance'));
  assert.ok(snapshots.httpObserve.topLevelKeys.includes('audits'));
  assert.ok(snapshots.governanceReport.topLevelKeys.includes('review'));
  assert.ok(snapshots.gateCi.checkKeys.includes('queries'));
  assert.ok(snapshots.gateCi.checkKeys.includes('lifecyclePolicy'));
});

test('admin review schema snapshot locks non-empty key sets without duplicates', () => {
  const { snapshots } = loadFixture();
  for (const [surfaceName, surface] of Object.entries(snapshots)) {
    for (const [keyName, keys] of Object.entries(surface)) {
      assert.ok(keys.length > 0, `${surfaceName}.${keyName} should not be empty`);
      assert.equal(new Set(keys).size, keys.length, `${surfaceName}.${keyName} should not contain duplicates`);
    }
  }
});

test('admin review schema snapshot keeps review safety fields visible', () => {
  const { snapshots } = loadFixture();
  assert.deepEqual(snapshots.dashboard.readPolicyKeys, sorted([
    'lifecycleColumnAvailable',
    'lifecycleExcludedStatuses',
    'lifecycleIncludedStatuses',
    'lifecyclePolicyEnabled',
    'migrationApplied',
    'mutated',
    'noProvider',
    'rawWorkspaceIdExposed',
    'recentHiddenByLifecycleCount',
    'recentLifecyclePolicyAppliedCount',
    'recentReadPolicyAppliedCount',
    'recentReadPolicyAuditCount',
    'recentStaleResultCount',
    'scopeWorkspacePresent',
    'softReadPolicyEnabled',
    'source',
    'status'
  ]));
  assert.ok(snapshots.httpObserve.summaryKeys.includes('rawWorkspaceIdExposed'));
  assert.ok(snapshots.gateCi.summaryKeys.includes('fixtureOnly'));
  assert.ok(snapshots.gateCi.summaryKeys.includes('noProvider'));
});

test('admin review schema snapshot forbids fake quality and unsafe fields', () => {
  const fixture = loadFixture();
  const allSnapshotKeys = collectSnapshotKeys(fixture.snapshots);
  for (const forbidden of fixture.forbiddenSnapshotKeys) {
    assert.equal(allSnapshotKeys.includes(forbidden), false, `forbidden snapshot key: ${forbidden}`);
  }
});
