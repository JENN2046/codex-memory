const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join('src', 'cli', 'vcp-memory-object-mapping-dry-run.js');
const fixturePath = path.join(__dirname, 'fixtures', 'vcp-memory-object-mapping-dry-run-v1.json');
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

test('mapping dry-run fixture parses', () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  assert.equal(fixture.schemaVersion, 'vcp-memory-object-mapping-dry-run-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.sourceMode, 'fixture');
  assert.equal(fixture.trueDatabaseRead, false);
  assert.equal(fixture.trueDiaryRead, false);
  assert.equal(fixture.noSQLiteWrite, true);
  assert.equal(fixture.noDiaryWrite, true);
  assert.equal(fixture.noAuditLogWrite, true);
  assert.equal(fixture.noVectorWrite, true);
  assert.equal(fixture.noChunkWrite, true);
  assert.equal(fixture.noImportExportFileGeneration, true);
  assert.equal(fixture.noMigration, true);
  assert.equal(fixture.records.length, 3);
});

test('JSON output parses and reports default mutated=false', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.status, 'warn');
  assert.equal(report.phase, 'P13.5-SQLite-diary-mapping-dry-run-CLI');
  assert.equal(report.mutated, false);
  assert.equal(report.sourceMode, 'fixture');
  assert.equal(report.fixtureOnly, true);
  assert.equal(report.noSQLiteWrite, true);
  assert.equal(report.noDiaryWrite, true);
  assert.equal(report.noAuditLogWrite, true);
  assert.equal(report.noVectorWrite, true);
  assert.equal(report.noChunkWrite, true);
  assert.equal(report.noImportExportFileGeneration, true);
  assert.equal(report.noMigration, true);
  assert.deepEqual(report.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
});

test('confirm apply and migrate flags are rejected', () => {
  for (const flag of ['--confirm', '--apply', '--migrate']) {
    const result = runCli(['--json', flag]);

    assert.equal(result.status, 1, `${flag} should fail`);
    const report = parseJsonResult(result);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.equal(report.rejectedFlag, flag);
    assert.match(report.error, /not supported/);
  }
});

test('mapping preview counts are present', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.scannedRecordCount, 3);
  assert.equal(report.mappedRecordCount, 2);
  assert.equal(report.unmappedRecordCount, 1);
  assert.equal(report.importExportSafeCount, 2);
  assert.equal(typeof report.missingRequiredFieldCounts, 'object');
  assert.equal(typeof report.missingOptionalFieldCounts, 'object');
  assert.equal(typeof report.unknownFieldCounts, 'object');
  assert.equal(typeof report.lifecycleStatusCoverage, 'object');
  assert.equal(typeof report.scopeCoverage, 'object');
  assert.equal(typeof report.auditRefCoverage, 'object');
  assert.equal(typeof report.chunkRefCoverage, 'object');
  assert.equal(typeof report.tagRefCoverage, 'object');
});

test('missing required fields are reported, not inferred', () => {
  const report = parseJsonResult(runCli(['--json']));
  const missing = report.mappingPreviews.find(preview => preview.case_id === 'unmapped-missing-required');

  assert.equal(report.missingRequiredFieldCounts.memory_id, 1);
  assert.equal(missing.status, 'unmapped');
  assert.equal(missing.memoryRecordVNext.memory_id, null);
  assert.ok(missing.missingRequiredFields.includes('memory_id'));
});

test('missing lifecycle status becomes unknown, not active', () => {
  const report = parseJsonResult(runCli(['--json']));
  const unknown = report.mappingPreviews.find(preview => preview.case_id === 'mapped-unknown-lifecycle');

  assert.equal(unknown.status, 'mapped');
  assert.equal(unknown.memoryRecordVNext.lifecycle_status, 'unknown');
  assert.equal(unknown.memoryRecordVNext.lifecycle_status === 'active', false);
  assert.equal(report.unknownFieldCounts.lifecycle_status, 1);
  assert.equal(report.lifecycleStatusCoverage.unknown, 1);
});

test('workspace_id appears only in internal mapping object, not low-risk summary', () => {
  const report = parseJsonResult(runCli(['--json']));
  const reportText = JSON.stringify(report);
  const summaryText = JSON.stringify(report.lowRiskSummary);

  assert.equal(report.mappingPreviews[0].memoryRecordVNext.workspace_id, 'workspace-p13-dry-raw');
  assert.equal(reportText.includes('workspace-p13-dry-raw'), true);
  assert.equal(summaryText.includes('workspace-p13-dry-raw'), false);
  assert.equal(report.rawWorkspaceIdExposed, false);
});

test('raw secrets are not emitted', () => {
  const report = parseJsonResult(runCli(['--json']));
  const reportText = JSON.stringify(report);

  assert.equal(report.rawSecretExposed, false);
  assert.equal(reportText.includes('fixture-dry-run-secret-should-not-emit'), false);
});

test('no import/export file is generated', () => {
  const before = new Set(fs.readdirSync(workspaceRoot));
  const result = runCli(['--json']);
  const after = new Set(fs.readdirSync(workspaceRoot));

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.deepEqual(after, before);
  const report = parseJsonResult(result);
  assert.equal(report.noImportExportFileGeneration, true);
});

test('no real DB or diary read occurs in tests', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.sourceMode, 'fixture');
  assert.equal(report.trueDatabaseRead, false);
  assert.equal(report.trueDiaryRead, false);
});

test('no side effects occur', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  runCli(['--json']);
  runCli([]);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
