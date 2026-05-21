const fs = require('node:fs');
const path = require('node:path');

const REPLAY_HARNESS_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--execute',
  '--apply',
  '--replay-actions',
  '--resume',
  '--mutate-state',
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

const REQUIRED_REPLAY_SCENARIOS = Object.freeze([
  'cycle_checkpoint_ok',
  'attempt_replay_noop',
  'receipt_reconciliation_missing_receipt',
  'dirty_worktree_protection',
  'partial_attempt_recovery',
  'stale_board_detection',
  'resume_token_ok',
  'stop_reason_replay'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'dirty_worktree_detected',
  'missing_receipt_evidence',
  'stale_board_snapshot',
  'partial_attempt_without_checkpoint',
  'red_gate_event_replayed',
  'second_repair_attempt_replayed'
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

function collectAutopilotReplayHarness(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_replay_harness.example.json');
  const example = readJsonSafe(examplePath) || {};
  const harness = example.replay_harness || {};
  const scenarios = Array.isArray(harness.replay_scenarios) ? harness.replay_scenarios : [];
  const scenarioIds = new Set(scenarios.map(item => item.scenario_id));
  const missingScenarios = REQUIRED_REPLAY_SCENARIOS.filter(item => !scenarioIds.has(item));
  const failClosedReasons = new Set();
  for (const scenario of scenarios) {
    if (scenario.fail_closed_reason) failClosedReasons.add(scenario.fail_closed_reason);
  }
  const missingFailClosedReasons = REQUIRED_FAIL_CLOSED_REASONS.filter(item => !failClosedReasons.has(item));
  const coveredScenarios = scenarios.filter(item =>
    item.scenario_id
    && item.input_surface
    && item.replay_mode
    && item.expected_result
    && item.resume_token
    && item.mutated === false
    && item.readiness_claim_allowed === false
  );
  const failClosedScenarioCount = scenarios.filter(item => item.expected_result === 'FAIL_CLOSED').length;
  const recoveryScenarioCount = scenarios.filter(item => item.expected_result === 'RECOVERABLE_READ_ONLY').length;
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_replay_harness.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_replay_harness.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_CHECKPOINT_RESUME_REPLAY_HARNESS.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_replay_harness.js');
  const status = filesPresent
    && harness.read_only === true
    && harness.replays_real_actions === false
    && harness.writes_state === false
    && harness.readiness_claim_allowed === false
    && missingScenarios.length === 0
    && missingFailClosedReasons.length === 0
    && coveredScenarios.length === scenarios.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-checkpoint-resume-replay-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_local_filesystem_summary',
    harness_id: harness.harness_id || 'not_recorded',
    scenario_count: scenarios.length,
    required_scenario_count: REQUIRED_REPLAY_SCENARIOS.length,
    missing_scenarios: missingScenarios,
    covered_scenario_count: coveredScenarios.length,
    fail_closed_scenario_count: failClosedScenarioCount,
    recovery_scenario_count: recoveryScenarioCount,
    required_fail_closed_reason_count: REQUIRED_FAIL_CLOSED_REASONS.length,
    missing_fail_closed_reasons: missingFailClosedReasons,
    read_only: harness.read_only === true,
    replays_real_actions: harness.replays_real_actions === true,
    writes_state: harness.writes_state === true,
    dashboard_summary_only: harness.dashboard_summary_only === true,
    resume_token_supported: scenarios.some(item => item.scenario_id === 'resume_token_ok'),
    receipt_reconciliation_supported: scenarios.some(item => item.scenario_id === 'receipt_reconciliation_missing_receipt'),
    dirty_worktree_protection_supported: scenarios.some(item => item.scenario_id === 'dirty_worktree_protection'),
    readiness_claim_allowed: false,
    mutated: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'replay_harness_surface_incomplete'
  };
}

module.exports = {
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_REPLAY_SCENARIOS,
  REPLAY_HARNESS_REJECTED_FLAGS,
  collectAutopilotReplayHarness
};
