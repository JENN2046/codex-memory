const fs = require('node:fs');
const path = require('node:path');

const GREEN_FILE_WRITE_CONTRACT_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--implement',
  '--activate',
  '--execute',
  '--run-task',
  '--apply',
  '--run-validation',
  '--emit-receipt',
  '--checkpoint',
  '--provider',
  '--api-call',
  '--mcp-call',
  '--record-memory',
  '--search-memory',
  '--memory-overview',
  '--runtime-probe',
  '--dependency-change',
  '--config-change',
  '--push',
  '--pr',
  '--deploy',
  '--release',
  '--tag',
  '--cutover',
  '--readiness-claim'
]));

const REQUIRED_EXECUTION_CYCLE = Object.freeze([
  'intake_task',
  'classify_lane_green_only',
  'resolve_workspace_root',
  'normalize_explicit_write_set',
  'classify_path_classes',
  'check_file_locks',
  'detect_user_owned_diff',
  'capture_pre_write_snapshot',
  'apply_single_write_batch',
  'inspect_post_write_diff',
  'run_required_validation_plan',
  'emit_receipt',
  'update_checkpoint',
  'select_next_safe_task_or_stop'
]);

const REQUIRED_TASK_FIELDS = Object.freeze([
  'task_id',
  'goal_id',
  'lane',
  'task_kind',
  'scope',
  'allowed_files_or_systems',
  'forbidden_files_or_systems',
  'explicit_write_set',
  'expected_write_count',
  'max_write_files',
  'overwrite_existing_files_allowed',
  'validation_required',
  'validation_plan',
  'receipt_required',
  'checkpoint_required',
  'rollback_or_cleanup_plan',
  'repair_attempt_count',
  'stop_conditions'
]);

const REQUIRED_ALLOWED_WRITE_OPERATIONS = Object.freeze([
  'create_new_text_file',
  'update_existing_text_file',
  'append_board_record',
  'update_dashboard_summary_shape',
  'update_local_validator_contract',
  'update_schema_or_fixture'
]);

const REQUIRED_PREFLIGHT_GATES = Object.freeze([
  'green_lane_confirmed',
  'workspace_root_confirmed',
  'explicit_write_set_present',
  'write_count_within_budget',
  'all_paths_workspace_relative',
  'all_paths_allowed_class',
  'forbidden_paths_absent',
  'file_locks_available',
  'user_owned_diff_absent_or_owned_by_task',
  'pre_write_snapshot_available',
  'validation_plan_present',
  'receipt_plan_present',
  'checkpoint_plan_present',
  'rollback_plan_present',
  'readiness_claim_blocked'
]);

const REQUIRED_POST_WRITE_GATES = Object.freeze([
  'post_write_diff_available',
  'diff_matches_explicit_write_set',
  'no_forbidden_path_touched',
  'validation_executed_or_documented_unavailable',
  'validation_passed_before_checkpoint',
  'receipt_emitted_before_completion',
  'checkpoint_updated_after_validation',
  'repair_attempt_count_at_most_one',
  'next_safe_task_selected_or_stop_reason_recorded',
  'readiness_claim_still_blocked'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'amber_lane_task',
  'red_lane_task',
  'unknown_lane_task',
  'mixed_lane_task',
  'missing_explicit_write_set',
  'write_count_exceeds_budget',
  'absolute_path_requested',
  'outside_workspace_path',
  'disallowed_path_class',
  'forbidden_path_requested',
  'file_lock_missing',
  'user_owned_diff_conflict',
  'pre_write_snapshot_missing',
  'validation_plan_missing',
  'receipt_plan_missing',
  'checkpoint_plan_missing',
  'rollback_plan_missing',
  'overwrite_without_allowance',
  'second_repair_attempt',
  'external_side_effect_requested',
  'readiness_claim_requested'
]);

const PREFLIGHT_ACCEPTED_NO_WRITE = 'PREFLIGHT_ACCEPTED_NO_WRITE';
const PREFLIGHT_REJECTED_FAIL_CLOSED = 'REJECTED_FAIL_CLOSED';

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function exists(workspaceRoot, relativePath) {
  return fs.existsSync(path.join(workspaceRoot, relativePath));
}

function missing(required, actual) {
  const actualSet = new Set(Array.isArray(actual) ? actual : []);
  return required.filter(item => !actualSet.has(item));
}

function isPlainRelativePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !path.isAbsolute(value)
    && !/^[A-Za-z]:[\\/]/.test(value)
    && !value.includes('\0')
    && !value.split(/[\\/]+/).includes('..');
}

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function classifyAllowedPath(relativePath) {
  const normalized = normalizeSlash(relativePath);
  if (normalized.startsWith('docs/') && normalized.endsWith('.md')) return 'docs';
  if (normalized.startsWith('tests/schema_examples/') && normalized.endsWith('.json')) return 'fixtures';
  if (normalized.startsWith('tests/') && normalized.endsWith('.test.js')) return 'tests';
  if (normalized.startsWith('schemas/') && normalized.endsWith('.schema.yaml')) return 'schemas';
  if (normalized.startsWith('scripts/validate_') && normalized.endsWith('.js')) return 'local_validators';
  if (normalized.startsWith('src/core/Autopilot') && normalized.endsWith('.js')) return 'read_only_helpers';
  if (normalized === 'src/cli/dashboard.js') return 'dashboard_read_only_summaries';
  if (normalized.startsWith('.agent_board/') && normalized.endsWith('.md')) return '.agent_board';
  if (normalized === 'README.md') return 'README.md';
  if (normalized === 'STATUS.md') return 'STATUS.md';
  return 'disallowed';
}

function forbiddenPathMatches(relativePath, forbidden = []) {
  const normalized = normalizeSlash(relativePath);
  return forbidden.some(item => {
    const candidate = normalizeSlash(item);
    if (!candidate) return false;
    if (candidate.endsWith('/**')) return normalized.startsWith(candidate.slice(0, -3));
    if (candidate.endsWith('/*')) return normalized.startsWith(candidate.slice(0, -1));
    if (candidate.endsWith('*')) return normalized.startsWith(candidate.slice(0, -1));
    return normalized === candidate || normalized.startsWith(`${candidate}/`);
  });
}

function failPreflight(rejectionCase, details = {}) {
  return {
    preflight_status: PREFLIGHT_REJECTED_FAIL_CLOSED,
    rejection_case: rejectionCase,
    accepted: false,
    mutated: false,
    writes_files: false,
    executes_tasks: false,
    validators_run_by_executor: false,
    receipts_written_by_executor: false,
    checkpoints_written_by_executor: false,
    readiness_claim_allowed: false,
    ...details
  };
}

function evaluateAutopilotGreenFileWritePreflight(input = {}) {
  const task = input.task || {};
  const fileLocks = new Set(input.fileLocks || []);
  const userOwnedChangedFiles = new Set(input.userOwnedChangedFiles || []);
  const forbidden = Array.isArray(task.forbidden_files_or_systems) ? task.forbidden_files_or_systems : [];
  const writeSet = Array.isArray(task.explicit_write_set) ? task.explicit_write_set : [];

  if (task.lane === 'Amber') return failPreflight('amber_lane_task');
  if (task.lane === 'Red') return failPreflight('red_lane_task');
  if (!task.lane) return failPreflight('unknown_lane_task');
  if (Array.isArray(task.lane) || task.lane !== 'Green') return failPreflight('mixed_lane_task');
  if (writeSet.length === 0) return failPreflight('missing_explicit_write_set');

  const expectedWriteCount = Number.isInteger(task.expected_write_count) ? task.expected_write_count : writeSet.length;
  const maxWriteFiles = Number.isInteger(task.max_write_files) ? task.max_write_files : -1;
  if (maxWriteFiles < 0 || expectedWriteCount !== writeSet.length || writeSet.length > maxWriteFiles) {
    return failPreflight('write_count_exceeds_budget', { write_count: writeSet.length, max_write_files: maxWriteFiles });
  }

  const targetPaths = [];
  for (const item of writeSet) {
    const relativePath = typeof item === 'string' ? item : item?.path;
    if (path.isAbsolute(String(relativePath || '')) || /^[A-Za-z]:[\\/]/.test(String(relativePath || ''))) {
      return failPreflight('absolute_path_requested', { target_path: relativePath });
    }
    if (!isPlainRelativePath(relativePath)) return failPreflight('outside_workspace_path', { target_path: relativePath });
    const pathClass = classifyAllowedPath(relativePath);
    if (pathClass === 'disallowed') return failPreflight('disallowed_path_class', { target_path: relativePath });
    if (forbiddenPathMatches(relativePath, forbidden)) return failPreflight('forbidden_path_requested', { target_path: relativePath });
    targetPaths.push(normalizeSlash(relativePath));
  }

  for (const targetPath of targetPaths) {
    if (!fileLocks.has(targetPath)) return failPreflight('file_lock_missing', { target_path: targetPath });
    if (userOwnedChangedFiles.has(targetPath)) return failPreflight('user_owned_diff_conflict', { target_path: targetPath });
  }

  if (task.pre_write_snapshot_available !== true) return failPreflight('pre_write_snapshot_missing');
  if (!Array.isArray(task.validation_plan) || task.validation_plan.length === 0) return failPreflight('validation_plan_missing');
  if (task.receipt_required !== true || task.receipt_plan_present !== true) return failPreflight('receipt_plan_missing');
  if (task.checkpoint_required !== true || task.checkpoint_plan_present !== true) return failPreflight('checkpoint_plan_missing');
  if (!task.rollback_or_cleanup_plan) return failPreflight('rollback_plan_missing');
  if (task.overwrite_existing_files_allowed !== true && task.overwrite_existing_file_requested === true) {
    return failPreflight('overwrite_without_allowance');
  }
  if ((Number.isInteger(task.repair_attempt_count) ? task.repair_attempt_count : 0) > 1) return failPreflight('second_repair_attempt');
  if (task.external_side_effect_requested === true) return failPreflight('external_side_effect_requested');
  if (task.readiness_claim_requested === true) return failPreflight('readiness_claim_requested');

  return {
    preflight_status: PREFLIGHT_ACCEPTED_NO_WRITE,
    rejection_case: 'none',
    accepted: true,
    target_files: targetPaths,
    write_count: targetPaths.length,
    mutated: false,
    writes_files: false,
    executes_tasks: false,
    validators_run_by_executor: false,
    receipts_written_by_executor: false,
    checkpoints_written_by_executor: false,
    readiness_claim_allowed: false
  };
}

function collectAutopilotGreenFileWriteExecutorContract(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const example = readJsonSafe(path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_green_file_write_executor_contract.example.json')) || {};
  const contract = example.green_file_write_executor_contract || {};
  const missingExecutionCycle = missing(REQUIRED_EXECUTION_CYCLE, contract.execution_cycle);
  const missingTaskFields = missing(REQUIRED_TASK_FIELDS, contract.required_task_fields);
  const missingWriteOperations = missing(REQUIRED_ALLOWED_WRITE_OPERATIONS, contract.allowed_write_operations);
  const missingPreflightGates = missing(REQUIRED_PREFLIGHT_GATES, contract.required_preflight_gates);
  const missingPostWriteGates = missing(REQUIRED_POST_WRITE_GATES, contract.required_post_write_gates);
  const missingFailClosedCases = missing(REQUIRED_FAIL_CLOSED_CASES, contract.fail_closed_rejection_cases);
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_green_file_write_executor_contract.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_green_file_write_executor_contract.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_green_file_write_executor_contract.js');
  const status = filesPresent
    && contract.contract_decision === 'GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED'
    && contract.implementation_allowed === false
    && contract.executor_activation_allowed === false
    && contract.real_writes_allowed === false
    && contract.read_only === true
    && contract.readiness_claim_allowed === false
    && missingExecutionCycle.length === 0
    && missingTaskFields.length === 0
    && missingWriteOperations.length === 0
    && missingPreflightGates.length === 0
    && missingPostWriteGates.length === 0
    && missingFailClosedCases.length === 0
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-green-file-write-executor-contract-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'design_contract_fixture_only_read_only_summary',
    contract_id: contract.contract_id || 'not_recorded',
    contract_decision: contract.contract_decision || 'not_recorded',
    implementation_allowed: contract.implementation_allowed === true,
    executor_activation_allowed: contract.executor_activation_allowed === true,
    real_writes_allowed: contract.real_writes_allowed === true,
    read_only: contract.read_only === true,
    readiness_claim_allowed: false,
    execution_cycle_count: Array.isArray(contract.execution_cycle) ? contract.execution_cycle.length : 0,
    missing_execution_cycle: missingExecutionCycle,
    required_task_field_count: Array.isArray(contract.required_task_fields) ? contract.required_task_fields.length : 0,
    missing_task_fields: missingTaskFields,
    allowed_write_operation_count: Array.isArray(contract.allowed_write_operations) ? contract.allowed_write_operations.length : 0,
    missing_write_operations: missingWriteOperations,
    preflight_gate_count: Array.isArray(contract.required_preflight_gates) ? contract.required_preflight_gates.length : 0,
    missing_preflight_gates: missingPreflightGates,
    post_write_gate_count: Array.isArray(contract.required_post_write_gates) ? contract.required_post_write_gates.length : 0,
    missing_post_write_gates: missingPostWriteGates,
    fail_closed_case_count: Array.isArray(contract.fail_closed_rejection_cases) ? contract.fail_closed_rejection_cases.length : 0,
    missing_fail_closed_cases: missingFailClosedCases,
    next_safe_action: contract.next_safe_action || 'not_recorded',
    writes_files: false,
    executes_tasks: false,
    validators_run_by_executor: false,
    receipts_written_by_executor: false,
    checkpoints_written_by_executor: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'green_file_write_executor_contract_incomplete'
  };
}

module.exports = {
  GREEN_FILE_WRITE_CONTRACT_REJECTED_FLAGS,
  PREFLIGHT_ACCEPTED_NO_WRITE,
  PREFLIGHT_REJECTED_FAIL_CLOSED,
  REQUIRED_ALLOWED_WRITE_OPERATIONS,
  REQUIRED_EXECUTION_CYCLE,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_POST_WRITE_GATES,
  REQUIRED_PREFLIGHT_GATES,
  REQUIRED_TASK_FIELDS,
  collectAutopilotGreenFileWriteExecutorContract,
  evaluateAutopilotGreenFileWritePreflight
};
