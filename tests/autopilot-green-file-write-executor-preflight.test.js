const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PREFLIGHT_ACCEPTED_NO_WRITE,
  PREFLIGHT_REJECTED_FAIL_CLOSED,
  evaluateAutopilotGreenFileWritePreflight
} = require('../src/core/AutopilotGreenFileWriteExecutorContract');

function validTask(overrides = {}) {
  return {
    task_id: 'CM-0703-preflight-valid-docs',
    goal_id: 'CM-0703',
    lane: 'Green',
    task_kind: 'docs_update_fixture',
    scope: 'docs_only_preflight',
    allowed_files_or_systems: ['docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md'],
    forbidden_files_or_systems: ['package.json', 'package-lock.json', '.env*', 'data/**', 'runs/**', 'reports/**', 'production/**'],
    explicit_write_set: [{ path: 'docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md', operation: 'update_existing_text_file' }],
    expected_write_count: 1,
    max_write_files: 1,
    overwrite_existing_files_allowed: false,
    validation_required: true,
    validation_plan: ['node --test tests/autopilot-green-file-write-executor-preflight.test.js'],
    receipt_required: true,
    receipt_plan_present: true,
    checkpoint_required: true,
    checkpoint_plan_present: true,
    rollback_or_cleanup_plan: 'revert explicit write set only',
    repair_attempt_count: 0,
    stop_conditions: ['validation_failure_requiring_judgment'],
    pre_write_snapshot_available: true,
    ...overrides
  };
}

function evaluate(task, options = {}) {
  return evaluateAutopilotGreenFileWritePreflight({
    task,
    fileLocks: options.fileLocks || ['docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md'],
    userOwnedChangedFiles: options.userOwnedChangedFiles || []
  });
}

test('preflight accepts a complete Green docs task without writing', () => {
  const result = evaluate(validTask());
  assert.equal(result.preflight_status, PREFLIGHT_ACCEPTED_NO_WRITE);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.target_files, ['docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md']);
  assert.equal(result.mutated, false);
  assert.equal(result.writes_files, false);
  assert.equal(result.executes_tasks, false);
  assert.equal(result.validators_run_by_executor, false);
  assert.equal(result.receipts_written_by_executor, false);
  assert.equal(result.checkpoints_written_by_executor, false);
  assert.equal(result.readiness_claim_allowed, false);
});

test('preflight accepts allowed path classes without writing', () => {
  const cases = [
    ['tests/schema_examples/autopilot_green_file_write_executor_contract.example.json', 'update_schema_or_fixture'],
    ['tests/autopilot-green-file-write-executor-preflight.test.js', 'update_existing_text_file'],
    ['schemas/autopilot_green_file_write_executor_contract.schema.yaml', 'update_schema_or_fixture'],
    ['scripts/validate_autopilot_green_file_write_executor_contract.js', 'update_local_validator_contract'],
    ['src/core/AutopilotGreenFileWriteExecutorContract.js', 'update_existing_text_file'],
    ['src/cli/dashboard.js', 'update_dashboard_summary_shape'],
    ['.agent_board/TASK_QUEUE.md', 'append_board_record'],
    ['README.md', 'update_existing_text_file'],
    ['STATUS.md', 'update_existing_text_file']
  ];

  for (const [targetPath, operation] of cases) {
    const result = evaluate(validTask({
      explicit_write_set: [{ path: targetPath, operation }],
      expected_write_count: 1,
      allowed_files_or_systems: [targetPath]
    }), { fileLocks: [targetPath] });
    assert.equal(result.preflight_status, PREFLIGHT_ACCEPTED_NO_WRITE, targetPath);
    assert.equal(result.writes_files, false, targetPath);
  }
});

test('preflight rejects lane and write-set problems fail-closed', () => {
  const cases = [
    [validTask({ lane: 'Amber' }), 'amber_lane_task'],
    [validTask({ lane: 'Red' }), 'red_lane_task'],
    [validTask({ lane: undefined }), 'unknown_lane_task'],
    [validTask({ lane: ['Green', 'Amber'] }), 'mixed_lane_task'],
    [validTask({ explicit_write_set: [] }), 'missing_explicit_write_set'],
    [validTask({ max_write_files: 0 }), 'write_count_exceeds_budget']
  ];

  for (const [task, expectedCase] of cases) {
    const result = evaluate(task);
    assert.equal(result.preflight_status, PREFLIGHT_REJECTED_FAIL_CLOSED, expectedCase);
    assert.equal(result.rejection_case, expectedCase);
    assert.equal(result.writes_files, false);
  }
});

test('preflight rejects path boundary problems fail-closed', () => {
  const cases = [
    [validTask({ explicit_write_set: [{ path: 'A:/codex-memory/README.md', operation: 'update_existing_text_file' }] }), 'absolute_path_requested'],
    [validTask({ explicit_write_set: [{ path: '../README.md', operation: 'update_existing_text_file' }] }), 'outside_workspace_path'],
    [validTask({ explicit_write_set: [{ path: 'src/app.js', operation: 'update_existing_text_file' }] }), 'disallowed_path_class'],
    [validTask({
      explicit_write_set: [{ path: 'docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md', operation: 'update_existing_text_file' }],
      forbidden_files_or_systems: ['docs/**']
    }), 'forbidden_path_requested'],
    [validTask(), 'file_lock_missing', { fileLocks: [] }],
    [validTask(), 'user_owned_diff_conflict', { userOwnedChangedFiles: ['docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md'] }]
  ];

  for (const [task, expectedCase, options] of cases) {
    const result = evaluate(task, options || {});
    assert.equal(result.preflight_status, PREFLIGHT_REJECTED_FAIL_CLOSED, expectedCase);
    assert.equal(result.rejection_case, expectedCase);
    assert.equal(result.writes_files, false);
  }
});

test('preflight rejects evidence and closeout problems fail-closed', () => {
  const cases = [
    [validTask({ pre_write_snapshot_available: false }), 'pre_write_snapshot_missing'],
    [validTask({ validation_plan: [] }), 'validation_plan_missing'],
    [validTask({ receipt_plan_present: false }), 'receipt_plan_missing'],
    [validTask({ checkpoint_plan_present: false }), 'checkpoint_plan_missing'],
    [validTask({ rollback_or_cleanup_plan: '' }), 'rollback_plan_missing'],
    [validTask({ overwrite_existing_file_requested: true }), 'overwrite_without_allowance'],
    [validTask({ repair_attempt_count: 2 }), 'second_repair_attempt'],
    [validTask({ external_side_effect_requested: true }), 'external_side_effect_requested'],
    [validTask({ readiness_claim_requested: true }), 'readiness_claim_requested']
  ];

  for (const [task, expectedCase] of cases) {
    const result = evaluate(task);
    assert.equal(result.preflight_status, PREFLIGHT_REJECTED_FAIL_CLOSED, expectedCase);
    assert.equal(result.rejection_case, expectedCase);
    assert.equal(result.writes_files, false);
  }
});
