const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_REPAIR_RULES,
  REQUIRED_VALIDATION_CASES,
  collectAutopilotValidationPlanner
} = require('../src/core/AutopilotValidationPlanner');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-validation-planner.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('validation planner core emits read-only fixture summary', () => {
  const summary = collectAutopilotValidationPlanner({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-validation-planner-repair-once-read-only');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(summary.validation_case_count, REQUIRED_VALIDATION_CASES.length);
  assert.equal(summary.missing_validation_cases.length, 0);
  assert.equal(summary.repair_rule_count, REQUIRED_REPAIR_RULES.length);
  assert.equal(summary.missing_repair_rules.length, 0);
  assert.equal(summary.executes_validation, false);
  assert.equal(summary.applies_repair, false);
  assert.equal(summary.repair_attempt_limit, 1);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.provider_calls_performed, false);
  assert.equal(summary.mcp_calls_performed, false);
  assert.equal(summary.real_memory_access_performed, false);
});

test('validation planner CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-validation-planner-repair-once-read-only');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.validation_case_count, REQUIRED_VALIDATION_CASES.length);
  assert.equal(payload.repair_rule_count, REQUIRED_REPAIR_RULES.length);
  assert.equal(payload.executes_validation, false);
  assert.equal(payload.applies_repair, false);
  assert.equal(payload.readiness_claim_allowed, false);
});

test('validation planner CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-validation-planner\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /validation_cases: 7\/7/);
  assert.match(result.stdout, /repair_rules: 6\/6/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('validation planner CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--run-validation', '--repair', '--apply-repair', '--provider', '--mcp-call', '--runtime-probe', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_validation_planner');
  }
});

test('validation planner CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-validation-planner\.js/);
});
