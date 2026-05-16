const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join('src', 'cli', 'v1-rc-validation-aggregator.js');
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

test('minimal validation aggregator CLI emits valid JSON and exits successfully', () => {
  const result = runCli(['--generated-at', '2026-05-16T00:00:00.000Z']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.schemaVersion, 'v1-rc-validation-aggregator-v1');
  assert.equal(report.phase, 'P24.3-validation-aggregator-cli-wiring-minimal-implementation');
  assert.equal(report.generated_at, '2026-05-16T00:00:00.000Z');
  assert.equal(report.mode, 'read-only');
  assert.equal(report.evidence.p24Aggregator.minimalCliWiring, true);
});

test('minimal validation aggregator CLI preserves honest blocked decision', () => {
  const report = parseJsonResult(runCli());

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.notEqual(report.decision, 'READY_FOR_V1_0_RC');
  assert.equal(report.summary.validationAggregatorImplemented, true);
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
});

test('minimal validation aggregator CLI preserves public MCP three-tool freeze', () => {
  const report = parseJsonResult(runCli());

  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('minimal validation aggregator CLI keeps runtime blockers visible', () => {
  const report = parseJsonResult(runCli());

  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, false);
  assert.equal(report.summary.fullFinalRcMatrixExecuted, false);
  assert.equal(report.summary.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(report.checks.schemaVersionRuntimeEnforcement.status, 'planned_not_implemented');
  assert.equal(report.checks.conditionalLiveMcpHttp.status, 'not_executed_service_not_running');
});

test('minimal validation aggregator CLI keeps A5-gated items blocked', () => {
  const report = parseJsonResult(runCli());

  for (const key of [
    'migrationImportExportApply',
    'providerExecution',
    'startupWatchdog',
    'clientConfigSwitch',
    'productionDeploy',
    'pushTagReleaseDeploy'
  ]) {
    assert.equal(report.checks[key].status, 'blocked_pending_a5', key);
    assert.equal(report.checks[key].a5Gated, true, key);
  }

  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.durableMemoryTouched, false);
});

test('minimal validation aggregator CLI rejects live or side-effect flags', () => {
  for (const flag of ['--live', '--refresh-live', '--provider', '--migrate', '--deploy', '--push']) {
    const result = runCli([flag]);
    assert.equal(result.status, 1, flag);
    const report = parseJsonResult(result);
    assert.equal(report.decision, 'NOT_READY_BLOCKED', flag);
    assert.equal(report.rejectedFlag, flag);
    assert.equal(report.mutated, false, flag);
    assert.equal(report.providerCalls, 0, flag);
    assert.equal(report.serviceStarted, false, flag);
    assert.equal(report.durableMemoryTouched, false, flag);
  }
});
