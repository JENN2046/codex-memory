const fs = require('node:fs');
const path = require('node:path');

const VALIDATION_PLANNER_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--execute',
  '--repair',
  '--apply-repair',
  '--run-validation',
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

const REQUIRED_VALIDATION_CASES = Object.freeze([
  'docs_only_green',
  'schema_fixture_green',
  'dashboard_readonly_green',
  'source_helper_green',
  'adapter_contract_fixture',
  'amber_provider_planned_only',
  'red_git_remote_blocked'
]);

const REQUIRED_REPAIR_RULES = Object.freeze([
  'obvious_local_reversible_once',
  'second_failure_stop',
  'non_obvious_repair_stop',
  'design_judgment_stop',
  'red_gate_stop',
  'user_owned_change_stop'
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

function collectAutopilotValidationPlanner(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_validation_planner.example.json');
  const example = readJsonSafe(examplePath) || {};
  const planner = example.validation_planner || {};
  const cases = Array.isArray(planner.validation_cases) ? planner.validation_cases : [];
  const repairRules = Array.isArray(planner.repair_once_rules) ? planner.repair_once_rules : [];
  const caseIds = new Set(cases.map(item => item.case_id));
  const ruleIds = new Set(repairRules.map(item => item.rule_id));
  const missingCases = REQUIRED_VALIDATION_CASES.filter(item => !caseIds.has(item));
  const missingRepairRules = REQUIRED_REPAIR_RULES.filter(item => !ruleIds.has(item));
  const coveredCases = cases.filter(item =>
    item.task_area
    && item.changed_path_class
    && item.risk
    && item.lane
    && item.adapter_type
    && Array.isArray(item.minimum_validation)
    && item.minimum_validation.length > 0
    && Array.isArray(item.escalate_when)
    && item.readiness_claim_allowed === false
  );
  const stopRules = repairRules.filter(item =>
    item.repair_attempt_limit === 1
    && item.auto_apply_repair === false
    && item.readiness_claim_allowed === false
    && item.stop_reason
  );
  const blockedCases = cases.filter(item => item.expected_decision === 'BLOCKED_RED_OR_FAIL_CLOSED').length;
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_validation_planner.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_validation_planner.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_VALIDATION_PLANNER_REPAIR_ONCE.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_validation_planner.js');
  const status = filesPresent
    && planner.readiness_claim_allowed === false
    && planner.executes_validation === false
    && planner.applies_repair === false
    && missingCases.length === 0
    && missingRepairRules.length === 0
    && coveredCases.length === cases.length
    && stopRules.length === repairRules.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-validation-planner-repair-once-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_local_filesystem_summary',
    planner_id: planner.planner_id || 'not_recorded',
    validation_case_count: cases.length,
    required_validation_case_count: REQUIRED_VALIDATION_CASES.length,
    missing_validation_cases: missingCases,
    covered_validation_case_count: coveredCases.length,
    repair_rule_count: repairRules.length,
    required_repair_rule_count: REQUIRED_REPAIR_RULES.length,
    missing_repair_rules: missingRepairRules,
    stop_rule_count: stopRules.length,
    blocked_case_count: blockedCases,
    executes_validation: planner.executes_validation === true,
    applies_repair: planner.applies_repair === true,
    repair_attempt_limit: planner.repair_attempt_limit === 1 ? 1 : 0,
    readiness_claim_allowed: false,
    mutated: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'validation_planner_surface_incomplete'
  };
}

module.exports = {
  REQUIRED_REPAIR_RULES,
  REQUIRED_VALIDATION_CASES,
  VALIDATION_PLANNER_REJECTED_FLAGS,
  collectAutopilotValidationPlanner
};
