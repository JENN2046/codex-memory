const fs = require('node:fs');
const path = require('node:path');

const GREEN_FILE_WRITE_BOUNDARY_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--implement',
  '--activate',
  '--execute',
  '--run-task',
  '--apply',
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

const REQUIRED_DESIGN_GATES = Object.freeze([
  'exact_green_lane_only',
  'workspace_root_write_only',
  'allowed_path_classes_only',
  'explicit_write_set',
  'write_file_count_limit',
  'user_owned_diff_detection',
  'file_lock_check',
  'pre_write_diff_snapshot',
  'post_write_diff_review',
  'validation_before_checkpoint',
  'receipt_before_completion',
  'checkpoint_after_validation',
  'rollback_plan_required',
  'second_repair_stop',
  'readiness_claim_blocked'
]);

const REQUIRED_ALLOWED_PATH_CLASSES = Object.freeze([
  'docs',
  'fixtures',
  'tests',
  'schemas',
  'local_validators',
  'read_only_helpers',
  'dashboard_read_only_summaries',
  '.agent_board',
  'README.md',
  'STATUS.md'
]);

const REQUIRED_HARD_STOPS = Object.freeze([
  'amber_or_red_lane',
  'unknown_target_path',
  'disallowed_target_path',
  'dirty_worktree_ambiguity',
  'user_owned_change_conflict',
  'missing_file_lock_evidence',
  'missing_pre_write_diff_snapshot',
  'missing_validation_plan',
  'validation_failure_requiring_judgment',
  'second_repair_attempt',
  'missing_receipt_or_checkpoint_plan',
  'overwrite_without_explicit_allowance',
  'external_side_effect_requested',
  'readiness_or_cutover_claim'
]);

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

function collectAutopilotGreenFileWriteBoundary(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const example = readJsonSafe(path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_green_file_write_boundary.example.json')) || {};
  const boundary = example.green_file_write_boundary || {};
  const missingDesignGates = missing(REQUIRED_DESIGN_GATES, boundary.required_design_gates);
  const missingAllowedPathClasses = missing(REQUIRED_ALLOWED_PATH_CLASSES, boundary.allowed_path_classes);
  const missingHardStops = missing(REQUIRED_HARD_STOPS, boundary.implementation_hard_stops);
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_green_file_write_boundary.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_green_file_write_boundary.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_BOUNDARY.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_green_file_write_boundary.js');
  const status = filesPresent
    && boundary.boundary_decision === 'GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED'
    && boundary.design_allowed === true
    && boundary.implementation_allowed === false
    && boundary.executor_activation_allowed === false
    && boundary.read_only === true
    && boundary.readiness_claim_allowed === false
    && missingDesignGates.length === 0
    && missingAllowedPathClasses.length === 0
    && missingHardStops.length === 0
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-green-file-write-executor-boundary-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'design_boundary_fixture_only_read_only_summary',
    boundary_id: boundary.boundary_id || 'not_recorded',
    boundary_decision: boundary.boundary_decision || 'not_recorded',
    design_allowed: boundary.design_allowed === true,
    implementation_allowed: boundary.implementation_allowed === true,
    executor_activation_allowed: boundary.executor_activation_allowed === true,
    required_design_gate_count: Array.isArray(boundary.required_design_gates) ? boundary.required_design_gates.length : 0,
    missing_design_gates: missingDesignGates,
    allowed_path_class_count: Array.isArray(boundary.allowed_path_classes) ? boundary.allowed_path_classes.length : 0,
    missing_allowed_path_classes: missingAllowedPathClasses,
    hard_stop_count: Array.isArray(boundary.implementation_hard_stops) ? boundary.implementation_hard_stops.length : 0,
    missing_hard_stops: missingHardStops,
    forbidden_path_class_count: Array.isArray(boundary.forbidden_path_classes) ? boundary.forbidden_path_classes.length : 0,
    next_safe_action: boundary.next_safe_action || 'not_recorded',
    read_only: boundary.read_only === true,
    readiness_claim_allowed: false,
    mutated: false,
    writes_files: false,
    executes_tasks: false,
    validators_run_by_executor: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'green_file_write_boundary_incomplete'
  };
}

module.exports = {
  GREEN_FILE_WRITE_BOUNDARY_REJECTED_FLAGS,
  REQUIRED_ALLOWED_PATH_CLASSES,
  REQUIRED_DESIGN_GATES,
  REQUIRED_HARD_STOPS,
  collectAutopilotGreenFileWriteBoundary
};
