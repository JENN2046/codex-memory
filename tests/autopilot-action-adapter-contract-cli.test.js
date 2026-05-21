const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_ADAPTERS,
  REQUIRED_FAIL_CLOSED_FIXTURES,
  collectAutopilotActionAdapterContract
} = require('../src/core/AutopilotActionAdapterContract');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-action-adapter-contract.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('adapter contract core emits fixture-only read-only summary', () => {
  const summary = collectAutopilotActionAdapterContract({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-action-adapter-contract-read-only');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(summary.adapter_count, REQUIRED_ADAPTERS.length);
  assert.equal(summary.required_adapter_count, REQUIRED_ADAPTERS.length);
  assert.equal(summary.missing_adapters.length, 0);
  assert.equal(summary.fail_closed_fixture_count, REQUIRED_FAIL_CLOSED_FIXTURES.length);
  assert.equal(summary.missing_fail_closed_fixtures.length, 0);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.executes_adapters, false);
  assert.equal(summary.provider_calls_performed, false);
  assert.equal(summary.mcp_calls_performed, false);
  assert.equal(summary.real_memory_access_performed, false);
});

test('adapter contract CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-action-adapter-contract-read-only');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.adapter_count, REQUIRED_ADAPTERS.length);
  assert.equal(payload.fail_closed_fixture_count, REQUIRED_FAIL_CLOSED_FIXTURES.length);
  assert.equal(payload.readiness_claim_allowed, false);
  assert.equal(payload.executes_adapters, false);
});

test('adapter contract CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-action-adapter-contract\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /adapters: 10\/10/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('adapter contract CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--run-adapter', '--provider', '--mcp-call', '--record-memory', '--runtime-probe', '--dependency-change', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_adapter_contract');
  }
});

test('adapter contract CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-action-adapter-contract\.js/);
});
