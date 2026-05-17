const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p39-synthetic-migration-dry-run-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P39 synthetic migration dry-run fixture parses and locks blocked state', () => {
  assert.equal(fixture.schemaVersion, 'p39-synthetic-migration-dry-run-v1');
  assert.equal(fixture.phase, 'P39-synthetic-migration-dry-run-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.mutated, false);
});

test('P39 dry-run scope accepts only synthetic fixtures or sanitized metadata', () => {
  assert.deepEqual(fixture.dryRunScope.allowedSources, [
    'synthetic_fixture',
    'sanitized_metadata'
  ]);
  assert.equal(fixture.dryRunScope.dryRunRepresentsRealMemory, false);
  assert.equal(fixture.dryRunScope.dryRunAuthorizesApply, false);
  assert.ok(fixture.dryRunScope.deniedSources.includes('real_memory_content'));
  assert.ok(fixture.dryRunScope.deniedSources.includes('real_sqlite'));
  assert.ok(fixture.dryRunScope.deniedSources.includes('provider_output'));
});

test('P39 plan contract requires source, mapping, parity, rollback, blocked actions, and failure path', () => {
  for (const section of [
    'source_summary',
    'mapping_plan',
    'parity_checks',
    'rollback_readiness',
    'blocked_actions',
    'failure_path'
  ]) {
    assert.ok(fixture.planContract.requiredSections.includes(section), section);
  }
  assert.equal(fixture.planContract.failurePathExitCode, 1);
  assert.equal(fixture.planContract.criticalUnknownEqualsFailure, true);
  assert.equal(fixture.planContract.criticalSkippedEqualsFailure, true);
  assert.equal(fixture.planContract.warningOnlyEqualsFailure, true);
});

test('P39 accepted plan cases never read real memory content or mutate state', () => {
  for (const entry of fixture.planCases.filter(item => item.acceptedForPlanning)) {
    assert.equal(entry.mutated, false, entry.id);
    assert.equal(entry.readsRealMemoryContent, false, entry.id);
    assert.match(entry.machineStatus, /^PLAN_ACCEPTED_FOR_/, entry.id);
    for (const reasonCode of entry.reasonCodes) {
      assert.match(reasonCode, /^P39_/, reasonCode);
    }
  }
});

test('P39 real memory source, apply request, unknown parity, and skipped rollback fail closed', () => {
  for (const entry of fixture.planCases.filter(item => !item.acceptedForPlanning)) {
    assert.equal(entry.acceptedForPlanning, false, entry.id);
    assert.equal(entry.mutated, false, entry.id);
    assert.equal(entry.failurePath.nonzeroOnFailure, true, entry.id);
    assert.equal(entry.failurePath.exitCodeOnFailure, 1, entry.id);
    for (const reasonCode of entry.reasonCodes) {
      assert.match(reasonCode, /^P39_/, reasonCode);
    }
  }
});

test('P39 blocked actions preserve real memory, apply, backup, restore, provider, MCP, durable write, and remote stops', () => {
  for (const action of [
    'real_memory_content_read',
    'real_memory_preview',
    'real_memory_export',
    'real_memory_import',
    'real_memory_scan',
    'sqlite_migration_apply',
    'backup',
    'restore',
    'provider_call',
    'public_mcp_expansion',
    'durable_memory_write',
    'durable_audit_write',
    'push_tag_release_deploy'
  ]) {
    assert.ok(fixture.blockedActions.includes(action), action);
  }
});

test('P39 safety flags preserve no side effects or sensitive output', () => {
  for (const flag of [
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
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});

test('P39 required wording prevents real-memory and migration-ready overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic migration dry-run contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic fixtures or sanitized metadata only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not authorize real memory content')));
  assert.ok(fixture.requiredWording.some(line => line.includes('fail closed')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not mean migration readiness')));
  assert.ok(fixture.forbiddenClaims.includes('dry-run previews real memory'));
  assert.ok(fixture.forbiddenClaims.includes('synthetic migration dry-run authorizes apply'));
  assert.ok(fixture.forbiddenClaims.includes('P39 makes v1.0 RC ready'));
});

test('P39 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
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

test('P39 reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
