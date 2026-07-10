const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'admin-review-surface-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function assertKeySet(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), expected.slice().sort(), `${label} keys`);
}

function walkKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      walkKeys(child, keys);
    }
  }
  return keys;
}

function walkStringValues(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStringValues(item, strings);
    return strings;
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) walkStringValues(child, strings);
  }
  return strings;
}

test('admin review surface fixture parses and locks top-level shape', () => {
  const fixture = loadFixture();
  assertKeySet(fixture, [
    'destructive',
    'durableMemoryTouched',
    'forbiddenClaims',
    'generatedAt',
    'mode',
    'mutated',
    'nextRecommendedPhase',
    'providerCalls',
    'publicMcpTools',
    'realMemoryPreview',
    'review',
    'safety',
    'schemaVersion',
    'sources',
    'unavailableSourceShape'
  ], 'admin review top-level');

  assert.equal(fixture.schemaVersion, 'admin-review-surface.v1');
  assert.equal(fixture.mode, 'admin-review');
  assert.equal(fixture.destructive, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.durableMemoryTouched, false);
  assert.equal(fixture.realMemoryPreview, false);
  assert.deepEqual(fixture.publicMcpTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
});

test('admin review sources represent existing read-only review surfaces', () => {
  const { sources } = loadFixture();
  assertKeySet(sources, [
    'ciGate',
    'dashboard',
    'governanceReport',
    'httpObserve',
    'mainlineGate'
  ], 'admin review sources');

  assert.equal(sources.dashboard.mode, 'memory-dashboard');
  assert.ok(sources.dashboard.requiredSections.includes('governance'));
  assert.ok(sources.dashboard.requiredSections.includes('readPolicy'));
  assert.ok(sources.httpObserve.requiredSections.includes('audits'));
  assert.equal(sources.governanceReport.mode, 'governance-report');
  assert.equal(sources.ciGate.mode, 'ci');
  assert.equal(sources.ciGate.fixtureOnly, true);
  assert.deepEqual(sources.mainlineGate.requiredSignals, ['health', 'compare', 'rollback']);
});

test('admin review signals include governance, audit, lifecycle, scope, and blocked migration slots', () => {
  const { review } = loadFixture();
  assertKeySet(review, ['hints', 'level', 'signals', 'status'], 'admin review');
  assert.equal(review.status, 'warn');
  assert.equal(review.level, 'needs-review');
  assert.ok(Array.isArray(review.hints));

  assertKeySet(review.signals, [
    'audit',
    'governance',
    'importExportMigration',
    'lifecycle',
    'scope',
    'service',
    'store'
  ], 'admin review signals');

  assert.equal(review.signals.governance.proposalCount, 2);
  assert.equal(review.signals.audit.writeAuditVisible, true);
  assert.deepEqual(review.signals.lifecycle.includedStatuses, ['active', 'stale']);
  assert.deepEqual(review.signals.lifecycle.excludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
  assert.equal(review.signals.scope.scopeWorkspacePresenceOnly, true);
  assert.equal(review.signals.scope.rawWorkspaceIdExposed, false);
  assert.equal(review.signals.importExportMigration.status, 'blocked');
  assert.equal(review.signals.importExportMigration.applyBlocked, true);
  assert.equal(review.signals.importExportMigration.migrationBlocked, true);
  assert.equal(review.signals.importExportMigration.a5ApprovalRequired, true);
});

test('admin review safety flags forbid side effects and unsafe exposure', () => {
  const fixture = loadFixture();
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.authorizationHeaderExposed, false);
  assert.equal(fixture.safety.cookieExposed, false);
  assert.equal(fixture.safety.envValueExposed, false);
  assert.equal(fixture.safety.mcpSchemaChanged, false);
  assert.equal(fixture.safety.publicMcpExpanded, false);
  assert.equal(fixture.safety.migrationApplied, false);
  assert.equal(fixture.safety.importExportApplied, false);
  assert.equal(fixture.safety.dependencyChanged, false);
  assert.equal(fixture.safety.releaseAction, false);

  assert.equal(fixture.unavailableSourceShape.status, 'unavailable');
  assert.equal(fixture.unavailableSourceShape.mutated, false);
  assert.equal(fixture.unavailableSourceShape.providerCalls, 0);
});

test('admin review fixture avoids fake quality claims, raw secrets, and raw workspace ids', () => {
  const fixture = loadFixture();
  const keys = walkKeys(fixture);
  assert.equal(keys.includes('hitRate'), false);
  assert.equal(keys.includes('qualityScore'), false);
  assert.equal(keys.includes('providerLatency'), false);
  assert.equal(fixture.forbiddenClaims.hitRatePresent, false);
  assert.equal(fixture.forbiddenClaims.qualityScorePresent, false);
  assert.equal(fixture.forbiddenClaims.providerLatencyPresent, false);
  assert.equal(fixture.forbiddenClaims.productionMemorySnippetPresent, false);

  const textValues = walkStringValues(fixture).join('\n');
  assert.equal(/workspace_id/i.test(textValues), false);
  assert.equal(/authorization\s*:/i.test(textValues), false);
  assert.equal(/bearer\s+[a-z0-9._-]+/i.test(textValues), false);
  assert.equal(/cookie\s*:/i.test(textValues), false);
  assert.equal(/api[_-]?key\s*[:=]/i.test(textValues), false);
  assert.equal(/BEGIN [A-Z ]*PRIVATE KEY/i.test(textValues), false);
});
