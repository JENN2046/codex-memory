const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p40-local-readiness-report-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P40 local readiness report parses and means local evidence only', () => {
  assert.equal(fixture.schemaVersion, 'p40-local-readiness-report-v1');
  assert.equal(fixture.phase, 'P40-local-readiness-report');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.machineStatus, 'LOCAL_EVIDENCE_REPORT_ONLY');
  assert.equal(fixture.localEvidenceReportReady, true);
});

test('P40 report blocks runtime, cutover, remote, release, deploy, config, watchdog, and RC readiness', () => {
  for (const field of [
    'runtimeReady',
    'mainlineCutoverReady',
    'pushReady',
    'releaseReady',
    'deployReady',
    'configSwitchReady',
    'watchdogReady',
    'rcReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P40 report aggregates P36 through P39 local fixture gates', () => {
  const gatesById = new Map(fixture.gates.map(gate => [gate.id, gate]));

  for (const id of [
    'P36-T1-scope-a5-boundary-contract',
    'P36-T2-task-risk-labels-contract',
    'P37-T1-policy-decision-envelope-fixture-matrix',
    'P38-recall-isolation-fixtures',
    'P39-synthetic-migration-dry-run-contract'
  ]) {
    const gate = gatesById.get(id);
    assert.ok(gate, id);
    assert.equal(gate.status, 'pass', id);
    assert.equal(gate.scope, 'fixture_only', id);
    assert.equal(gate.runtimeReady, false, id);
    assert.match(gate.evidence, /^tests\/fixtures\//, id);
    for (const reasonCode of gate.reasonCodes) {
      assert.match(reasonCode, /^P40_/, `${id}:${reasonCode}`);
    }
  }
});

test('P40 critical skipped, unknown, warning-only, and failed gates are failures', () => {
  assert.equal(fixture.criticalGateSemantics.skipped, 'failure');
  assert.equal(fixture.criticalGateSemantics.unknown, 'failure');
  assert.equal(fixture.criticalGateSemantics.warning_only, 'failure');
  assert.equal(fixture.criticalGateSemantics.failed, 'failure');
});

test('P40 hard stops preserve real memory, migration, provider, MCP, durable, remote, config, and watchdog blocks', () => {
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
    'push_tag_release_deploy',
    'config_switch',
    'watchdog_install'
  ]) {
    assert.ok(fixture.hardStops.includes(action), action);
  }
});

test('P40 safety flags preserve no side effects and no sensitive output', () => {
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
});

test('P40 required wording prevents readiness overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('local evidence report only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not mean runtime')));
  assert.ok(fixture.requiredWording.some(line => line.includes('equals failure')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not read')));
  assert.ok(fixture.forbiddenClaims.includes('local evidence report means runtime-ready'));
  assert.ok(fixture.forbiddenClaims.includes('P40 authorizes mainline cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P40 makes v1.0 RC ready'));
});

test('P40 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
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

test('P40 reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
