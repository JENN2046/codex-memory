const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const {
  collectAutopilotGreenFileWriteExecutorContract
} = require('../src/core/AutopilotGreenFileWriteExecutorContract');

function runCli(args = []) {
  return spawnSync(process.execPath, ['src/cli/autopilot-green-file-write-executor-contract.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
}

test('green file-write executor contract is ready but blocks implementation', () => {
  const summary = collectAutopilotGreenFileWriteExecutorContract({ workspaceRoot: process.cwd() });
  assert.equal(summary.status, 'ok');
  assert.equal(summary.contract_decision, 'GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED');
  assert.equal(summary.implementation_allowed, false);
  assert.equal(summary.executor_activation_allowed, false);
  assert.equal(summary.real_writes_allowed, false);
  assert.equal(summary.writes_files, false);
  assert.equal(summary.executes_tasks, false);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.execution_cycle_count, 14);
  assert.equal(summary.preflight_gate_count, 15);
  assert.equal(summary.post_write_gate_count, 10);
  assert.equal(summary.fail_closed_case_count, 21);
});

test('green file-write executor contract CLI outputs json', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.contract_decision, 'GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED');
  assert.equal(payload.implementation_allowed, false);
  assert.equal(payload.real_writes_allowed, false);
});

test('green file-write executor contract CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--execute', '--run-validation', '--emit-receipt', '--checkpoint', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_green_file_write_executor_contract');
  }
});

test('green file-write executor contract CLI rejects unknown flags', () => {
  const result = runCli(['--surprise']);
  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.rejectedFlag, '--surprise');
  assert.equal(payload.reason, 'unknown_flag_rejected_by_read_only_green_file_write_executor_contract');
});
