const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  getExitCode,
  parseArgs
} = require('../src/cli/schema-compatibility-dry-run');

const cliPath = path.join('src', 'cli', 'schema-compatibility-dry-run.js');
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

test('schema compatibility dry-run CLI emits fixture-only JSON and exits successfully', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.schema, 'codex-memory.schema-compatibility-dry-run.v1');
  assert.equal(report.phase, 'P25.6-schema-compatibility-dry-run-cli-fixture-only');
  assert.equal(report.decision, 'DRY_RUN_BLOCKED');
  assert.equal(report.source.mode, 'fixture');
  assert.equal(report.source.realMemoryScanned, false);
  assert.equal(report.compatibility.runtimeEnforcementImplemented, false);
  assert.equal(report.compatibility.migrationRequired, false);
  assert.equal(report.compatibility.importExportApplyRequired, false);
});

test('schema compatibility dry-run CLI preserves current bounded public MCP surface', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.publicMcpTools.frozen, true);
  assert.deepEqual(report.publicMcpTools.tools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(report.safety.publicMcpExpanded, false);
});

test('schema compatibility dry-run CLI keeps safety flags non-mutating', () => {
  const report = parseJsonResult(runCli(['--json']));

  assert.equal(report.safety.dryRun, true);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.durableMemoryTouched, false);
  assert.equal(report.safety.realMemoryScanned, false);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.migrationApplied, false);
  assert.equal(report.safety.importExportApplied, false);
  assert.equal(report.safety.backupCreated, false);
  assert.equal(report.safety.runtimeEnforcementChanged, false);
  assert.equal(report.safety.packageChanged, false);
  assert.equal(report.safety.configChanged, false);
  assert.equal(report.safety.pushed, false);
  assert.equal(report.safety.tagged, false);
  assert.equal(report.safety.released, false);
  assert.equal(report.safety.deployed, false);
});

test('schema compatibility dry-run CLI strict mode exits non-zero for blocked report while emitting JSON', () => {
  const result = runCli(['--json', '--strict']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.decision, 'DRY_RUN_BLOCKED');
  assert.equal(report.safety.mutated, false);
  assert.equal(report.compatibility.runtimeEnforcementImplemented, false);
});

test('schema compatibility dry-run CLI rejects unsafe flags with invalid input JSON', () => {
  for (const flag of ['--apply', '--confirm', '--migrate', '--import', '--export', '--real-memory', '--provider', '--start-service', '--push']) {
    const result = runCli(['--json', flag]);

    assert.equal(result.status, 1, flag);
    const report = parseJsonResult(result);
    assert.equal(report.decision, 'DRY_RUN_INVALID_INPUT', flag);
    assert.equal(report.blockers.length, 1, flag);
    assert.equal(report.blockers[0].id, 'rejected-unsafe-flag', flag);
    assert.equal(report.blockers[0].rejectedFlag, flag);
    assert.equal(report.safety.mutated, false, flag);
    assert.equal(report.safety.providerCalls, 0, flag);
    assert.equal(report.safety.realMemoryScanned, false, flag);
    assert.equal(report.safety.serviceStarted, false, flag);
    assert.equal(report.safety.migrationApplied, false, flag);
    assert.equal(report.safety.importExportApplied, false, flag);
  }
});

test('schema compatibility dry-run CLI rejects non-fixture source modes', () => {
  const result = runCli(['--json', '--source-mode', 'real-memory-preview']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.decision, 'DRY_RUN_INVALID_INPUT');
  assert.equal(report.blockers[0].id, 'invalid-source-mode');
  assert.equal(report.safety.realMemoryScanned, false);
  assert.equal(report.safety.mutated, false);
});

test('schema compatibility dry-run CLI rejects fixture paths outside tests fixtures', () => {
  const result = runCli(['--json', '--fixture', 'package.json']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.decision, 'DRY_RUN_INVALID_INPUT');
  assert.match(report.blockers[0].reason, /tests\/fixtures/);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.realMemoryScanned, false);
});

test('schema compatibility dry-run CLI help exits without JSON report', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /Usage: node src\/cli\/schema-compatibility-dry-run\.js/);
  assert.match(result.stdout, /fixture/);
  assert.match(result.stdout, /never scans real memory/);
  assert.throws(() => JSON.parse(result.stdout), SyntaxError);
});

test('schema compatibility dry-run CLI emits readable text output', () => {
  const result = runCli([]);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /decision: DRY_RUN_BLOCKED/);
  assert.match(result.stdout, /source.mode: fixture/);
  assert.match(result.stdout, /mutated: false/);
  assert.match(result.stdout, /runtimeEnforcementImplemented: false/);
});

test('schema compatibility dry-run CLI output does not expose raw secrets or raw workspace ids', () => {
  const output = runCli(['--json']).stdout;

  assert.equal(/password\s*[=:]/i.test(output), false);
  assert.equal(/bearer\s+[a-z0-9._-]+/i.test(output), false);
  assert.equal(/api[_-]?key\s*[=:]/i.test(output), false);
  assert.equal(/authorization\s*:/i.test(output), false);
  assert.equal(/raw_workspace_id/i.test(output), false);
  assert.equal(/workspace-[a-z0-9-]{8,}/i.test(output), false);
  assert.equal(/"workspace_id"\s*:/i.test(output), false);
});

test('schema compatibility dry-run CLI parses supported flags without implying live execution', () => {
  assert.deepEqual(parseArgs(['--json', '--strict', '--source-mode', 'fixture']), {
    json: true,
    strict: true,
    help: false,
    fixturePath: path.join(workspaceRoot, 'tests', 'fixtures', 'schema-compatibility-dry-run-v1.json'),
    sourceMode: 'fixture',
    rejectedFlag: null,
    invalidInput: null
  });
});

test('schema compatibility dry-run CLI exit-code helper fails closed only for strict blocked and invalid input', () => {
  assert.equal(getExitCode({ decision: 'DRY_RUN_BLOCKED' }), 0);
  assert.equal(getExitCode({ decision: 'DRY_RUN_BLOCKED' }, { strict: true }), 1);
  assert.equal(getExitCode({ decision: 'DRY_RUN_INVALID_INPUT' }), 1);
  assert.equal(getExitCode({ decision: 'DRY_RUN_COMPATIBLE' }, { strict: true }), 0);
});

test('schema compatibility dry-run CLI package manifests remain untouched', () => {
  const result = spawnSync('git', ['diff', '--name-only', '--', 'package.json', 'package-lock.json'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '');
});
