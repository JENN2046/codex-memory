const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'validate-memory-runtime-v1.json');

const REQUIRED_FIELDS = [
  'memory_id',
  'reason',
  'evidence',
  'actor_client_id',
  'request_source',
  'lifecycle_policy_applied',
  'scope_policy_applied',
  'redaction_applied',
  'audit_event'
];

const AUDIT_FIELDS = [
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
  'previous_snapshot_ref',
  'redaction_applied',
  'lifecycle_policy_applied',
  'scope_policy_applied'
];

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('validate memory runtime fixture parses', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'validate-memory-runtime-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P12.5-validate-memory-runtime-fixture-tests');
  assert.equal(fixture.toolCandidate, 'validate_memory');
});

test('allowed transitions include only proposal/stale to active', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.allowedTransitions, [
    { from: 'proposal', to: 'active', requiresEvidence: true },
    { from: 'stale', to: 'active', requiresEvidence: true }
  ]);

  assert.equal(fixture.allowedTransitions.every(transition => transition.to === 'active'), true);
  assert.deepEqual(fixture.allowedTransitions.map(transition => transition.from), ['proposal', 'stale']);
});

test('rejected tombstoned and superseded to active are forbidden', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.forbiddenTransitions, [
    { from: 'rejected', to: 'active' },
    { from: 'tombstoned', to: 'active' },
    { from: 'superseded', to: 'active' }
  ]);
});

test('required fields are complete', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requires, REQUIRED_FIELDS);
});

test('audit fields are complete', () => {
  const fixture = loadFixture();

  assert.equal(fixture.auditEvent.event_type, 'memory_validate');
  assert.equal(fixture.auditEvent.tool_name, 'validate_memory');
  assert.deepEqual(fixture.auditEvent.requiredFields, AUDIT_FIELDS);
});

test('validate memory does not mutate by default', () => {
  const fixture = loadFixture();

  assert.equal(fixture.defaultMutates, false);
  assert.equal(fixture.dryRunBehavior.mutated, false);
  assert.equal(fixture.dryRunBehavior.dryRunFirst, true);
});

test('runtime approval is required', () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeApprovalRequired, true);
  assert.equal(fixture.noRuntimeMutation, true);
  assert.equal(fixture.noMcpPublicToolExpansion, true);
  assert.equal(fixture.publicToolsFrozen, true);
});

test('cross-client private mutation is forbidden by default', () => {
  const fixture = loadFixture();

  assert.equal(fixture.policyRequirements.crossClientPrivateMutationAllowedByDefault, false);
  assert.ok(fixture.mustNot.includes('mutate cross-client private memory'));
});

test('raw secrets are forbidden', () => {
  const fixture = loadFixture();

  assert.equal(fixture.policyRequirements.permitsRawSecretOutput, false);
  assert.ok(fixture.mustNot.includes('expose raw secrets'));
});

test('raw workspace_id is forbidden', () => {
  const fixture = loadFixture();

  assert.equal(fixture.policyRequirements.lowRiskSummaryAllowsRawWorkspaceId, false);
  assert.ok(fixture.mustNot.includes('expose raw workspace_id'));
});

test('SecretScanner and ToolArgumentValidator boundaries are required', () => {
  const fixture = loadFixture();

  assert.equal(fixture.policyRequirements.secretScannerRequired, true);
  assert.equal(fixture.policyRequirements.toolArgumentValidatorRequired, true);
  assert.ok(fixture.mustNot.includes('bypass SecretScanner'));
  assert.ok(fixture.mustNot.includes('bypass ToolArgumentValidator'));
});
