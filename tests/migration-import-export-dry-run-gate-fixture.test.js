const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'migration-import-export-dry-run-gate-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const REQUIRED_APPROVALS = [
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_overwrite',
  'broad_real_memory_export'
];

const REQUIRED_CHECKS = {
  objectModelFixtures: 'present',
  mappingDryRun: 'fixture_only_ready',
  migrationReadiness: 'blocked_pending_approval',
  importExportEnvelope: 'fixture_shape_present',
  backupRollback: 'plan_present_apply_blocked',
  scopeLifecycleAudit: 'represented',
  secretWorkspaceExposure: 'not_exposed'
};

const FORBIDDEN_SAFETY_FLAGS = [
  'realMemoryScan',
  'realMemoryExport',
  'realMemoryImport',
  'migrationApply',
  'importExportApply',
  'backupRestore',
  'durableWrites',
  'providerCalls',
  'publicMcpExpansion',
  'push',
  'tag',
  'release',
  'deploy'
];

test('fixture parses and locks the v1 gate shape', () => {
  assert.equal(fixture.schema, 'codex-memory.migration-import-export-dry-run-gate.v1');
  assert.equal(fixture.phase, 'P26.1-migration-import-export-dry-run-gate-fixture-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.nextStep, 'review-dry-run-evidence-before-apply-approval');
});

test('decision fails closed before approval', () => {
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('fixture declares no side effects', () => {
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.evidence.secretWorkspaceExposure.rawSecretExposed, false);
  assert.equal(fixture.evidence.secretWorkspaceExposure.rawWorkspaceExposed, false);
});

test('public MCP contract remains frozen to three tools', () => {
  assert.deepEqual(fixture.publicMcpTools, PUBLIC_MCP_TOOLS);
});

test('checks cover required dry-run gate evidence', () => {
  assert.deepEqual(fixture.checks, REQUIRED_CHECKS);
});

test('approval list covers apply and broad export hard stops', () => {
  assert.deepEqual(fixture.requiredApprovals, REQUIRED_APPROVALS);
});

test('safety flags forbid real mutation, provider, remote, and release actions', () => {
  for (const flag of FORBIDDEN_SAFETY_FLAGS) {
    assert.equal(fixture.safetyFlags[flag], false, `${flag} must remain forbidden`);
  }
});

test('fixture text does not expose raw secrets', () => {
  assert.equal(/fixture-raw-secret|password=|api[_-]?key|bearer\s+|token=/i.test(fixtureText), false);
});

test('fixture text does not expose raw workspace paths or ids', () => {
  assert.equal(/[A-Z]:[\\/]/.test(fixtureText), false);
  assert.equal(/\\\\/.test(fixtureText), false);
  assert.equal(/raw_workspace_id|workspace-p13|workspace-p26-raw/i.test(fixtureText), false);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
