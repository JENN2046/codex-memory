const fs = require('node:fs');
const path = require('node:path');

const OPERATOR_CONSOLE_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--execute',
  '--run-eval',
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

const REQUIRED_OPERATOR_SURFACES = Object.freeze([
  'controller',
  'state_store_draft',
  'adapter_contract',
  'validation_planner',
  'resume_replay',
  'red_gate_inbox',
  'next_safe_action',
  'coverage_gaps'
]);

const REQUIRED_EVAL_CASES = Object.freeze([
  'golden_trace',
  'failure_injection',
  'budget_exhaustion',
  'red_gate_bypass_rejection',
  'missing_evidence',
  'unknown_cost',
  'secret_access',
  'broad_memory_scan',
  'push_attempt',
  'readiness_overclaim_rejection'
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

function collectAutopilotOperatorConsole(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_operator_console.example.json');
  const example = readJsonSafe(examplePath) || {};
  const consoleSurface = example.operator_console || {};
  const surfaces = Array.isArray(consoleSurface.surfaces) ? consoleSurface.surfaces : [];
  const evalCases = Array.isArray(consoleSurface.eval_matrix) ? consoleSurface.eval_matrix : [];
  const surfaceIds = new Set(surfaces.map(item => item.surface_id));
  const evalIds = new Set(evalCases.map(item => item.case_id));
  const missingSurfaces = REQUIRED_OPERATOR_SURFACES.filter(item => !surfaceIds.has(item));
  const missingEvalCases = REQUIRED_EVAL_CASES.filter(item => !evalIds.has(item));
  const coveredSurfaces = surfaces.filter(item =>
    item.surface_id
    && item.source
    && item.status
    && item.read_only === true
    && item.mutated === false
    && item.readiness_claim_allowed === false
  );
  const coveredEvalCases = evalCases.filter(item =>
    item.case_id
    && item.injects_failure
    && item.expected_result
    && item.evidence_required
    && item.executes_live_action === false
    && item.readiness_claim_allowed === false
  );
  const rejectionEvalCount = evalCases.filter(item => item.expected_result === 'REJECTED_FAIL_CLOSED').length;
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_operator_console.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_operator_console.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_OPERATOR_CONSOLE_EVAL_MATRIX.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_operator_console.js');
  const status = filesPresent
    && consoleSurface.read_only === true
    && consoleSurface.executes_eval === false
    && consoleSurface.writes_state === false
    && consoleSurface.readiness_claim_allowed === false
    && missingSurfaces.length === 0
    && missingEvalCases.length === 0
    && coveredSurfaces.length === surfaces.length
    && coveredEvalCases.length === evalCases.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-operator-console-eval-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_local_filesystem_summary',
    console_id: consoleSurface.console_id || 'not_recorded',
    surface_count: surfaces.length,
    required_surface_count: REQUIRED_OPERATOR_SURFACES.length,
    missing_surfaces: missingSurfaces,
    covered_surface_count: coveredSurfaces.length,
    eval_case_count: evalCases.length,
    required_eval_case_count: REQUIRED_EVAL_CASES.length,
    missing_eval_cases: missingEvalCases,
    covered_eval_case_count: coveredEvalCases.length,
    rejection_eval_count: rejectionEvalCount,
    next_safe_action: consoleSurface.next_safe_action || 'not_recorded',
    red_gate_inbox_count: Number.isInteger(consoleSurface.red_gate_inbox_count) ? consoleSurface.red_gate_inbox_count : 0,
    coverage_gap_count: Number.isInteger(consoleSurface.coverage_gap_count) ? consoleSurface.coverage_gap_count : 0,
    controlled_green_executor_entry_conditions_count: Array.isArray(consoleSurface.controlled_green_executor_entry_conditions)
      ? consoleSurface.controlled_green_executor_entry_conditions.length
      : 0,
    approval_packet_template_ready: consoleSurface.approval_packet_template_ready === true,
    read_only: consoleSurface.read_only === true,
    executes_eval: consoleSurface.executes_eval === true,
    writes_state: consoleSurface.writes_state === true,
    readiness_claim_allowed: false,
    mutated: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'operator_console_surface_incomplete'
  };
}

module.exports = {
  OPERATOR_CONSOLE_REJECTED_FLAGS,
  REQUIRED_EVAL_CASES,
  REQUIRED_OPERATOR_SURFACES,
  collectAutopilotOperatorConsole
};
