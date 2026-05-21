const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_EVAL_CASES,
  REQUIRED_OPERATOR_SURFACES,
  collectAutopilotOperatorConsole
} = require('../src/core/AutopilotOperatorConsole');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-operator-console.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('operator console core emits read-only fixture summary', () => {
  const summary = collectAutopilotOperatorConsole({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-operator-console-eval-read-only');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(summary.surface_count, REQUIRED_OPERATOR_SURFACES.length);
  assert.equal(summary.missing_surfaces.length, 0);
  assert.equal(summary.eval_case_count, REQUIRED_EVAL_CASES.length);
  assert.equal(summary.missing_eval_cases.length, 0);
  assert.equal(summary.rejection_eval_count, 9);
  assert.equal(summary.next_safe_action, 'review_controlled_green_executor_entry_packet_before_separate_skeleton_task');
  assert.equal(summary.approval_packet_template_ready, true);
  assert.equal(summary.read_only, true);
  assert.equal(summary.executes_eval, false);
  assert.equal(summary.writes_state, false);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
});

test('operator console CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-operator-console-eval-read-only');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.surface_count, REQUIRED_OPERATOR_SURFACES.length);
  assert.equal(payload.eval_case_count, REQUIRED_EVAL_CASES.length);
  assert.equal(payload.executes_eval, false);
  assert.equal(payload.writes_state, false);
  assert.equal(payload.readiness_claim_allowed, false);
});

test('operator console CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-operator-console\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /surfaces: 8\/8/);
  assert.match(result.stdout, /eval_cases: 10\/10/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('operator console CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--execute', '--run-eval', '--provider', '--mcp-call', '--runtime-probe', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_operator_console');
  }
});

test('operator console CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-operator-console\.js/);
});
