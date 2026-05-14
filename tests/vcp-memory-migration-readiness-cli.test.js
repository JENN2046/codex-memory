const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join('src', 'cli', 'vcp-memory-migration-readiness.js');
const fixturePath = path.join(__dirname, 'fixtures', 'vcp-memory-migration-readiness-v1.json');
const workspaceRoot = path.resolve(__dirname, '..');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('JSON output parses', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.phase, 'P13.7-migration-readiness-report');
  assert.equal(report.schemaVersion, 'vcp-memory-migration-readiness-v1');
  assert.equal(report.status, 'blocked');
});

test('mutated=false', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.mutated, false);
  assert.equal(report.fixtureOnly, true);
});

test('migrationBlocked=true', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.migrationBlocked, true);
  assert.ok(report.migrationBlockers.length > 0);
});

test('reports known fixture readiness', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.objectModelFixtureReady, true);
  assert.equal(report.roundTripFixtureReady, true);
  assert.equal(report.mappingFixtureReady, true);
  assert.equal(report.mappingDryRunCliReady, true);
  assert.equal(report.importExportShapeReady, true);
  assert.deepEqual(report.missingPrerequisites, []);
});

test('reports missing approvals', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.ok(report.requiredApprovals.includes('approve real migration scope'));
  assert.ok(report.requiredApprovals.includes('approve SQLite backup and rollback procedure'));
});

test('reports no real migration', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.noMigration, true);
  assert.equal(report.noSQLiteWrite, true);
  assert.equal(report.noDiaryWrite, true);
  assert.equal(report.noImportExportApply, true);
  assert.equal(report.noRealDbMemoryWrite, true);
  assert.equal(report.noMcpPublicToolExpansion, true);
});

test('no raw secrets', () => {
  const report = parseJsonResult(runCli(['--json']));
  const text = JSON.stringify(report);

  assert.equal(report.rawSecretExposed, false);
  assert.equal(/fixture-raw-secret|password=|api[_-]?key|bearer\s+/i.test(text), false);
});

test('no raw workspace_id', () => {
  const report = parseJsonResult(runCli(['--json']));
  const text = JSON.stringify(report);

  assert.equal(report.rawWorkspaceIdExposed, false);
  assert.equal(text.includes('workspace-p13'), false);
});

test('rejects --apply', () => {
  const result = runCli(['--json', '--apply']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.status, 'error');
  assert.equal(report.mutated, false);
  assert.equal(report.migrationBlocked, true);
  assert.equal(report.rejectedFlag, '--apply');
});

test('rejects --migrate', () => {
  const result = runCli(['--json', '--migrate']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.status, 'error');
  assert.equal(report.mutated, false);
  assert.equal(report.migrationBlocked, true);
  assert.equal(report.rejectedFlag, '--migrate');
});

test('no side effects', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  runCli(['--json']);
  runCli([]);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
