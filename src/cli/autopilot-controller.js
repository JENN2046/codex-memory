#!/usr/bin/env node
const {
  CONTROLLER_REJECTED_FLAGS,
  collectAutopilotControllerSummary
} = require('../core/AutopilotControllerReadOnly');

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    rejectedFlag: null
  };

  for (const token of argv) {
    if (token === '--json') {
      options.json = true;
    } else if (token === '--pretty') {
      options.pretty = true;
    } else if (token === '--help' || token === '-h') {
      options.help = true;
    } else if (CONTROLLER_REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    } else {
      options.rejectedFlag = token;
      options.unknown = true;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/autopilot-controller.js [--json] [--pretty]',
    '',
    'Read-only/no-op AutopilotController v0 cycle summary for Smart Standing Authorization v3.',
    '',
    'This command does not execute tasks, write runtime state, call providers, call MCP tools, read real memory stores, change dependencies, change config, push, deploy, cut over, or claim readiness.'
  ].join('\n');
}

function formatText(summary) {
  return [
    '[autopilot-controller-v0]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `goal_id: ${summary.goal_id}`,
    `controller_cycle_id: ${summary.controller_cycle_id}`,
    `current_state: ${summary.current_state}`,
    `next_safe_task: ${summary.next_safe_task}`,
    `lane_decision: ${summary.lane_decision.decision}`,
    `execution_boundary: ${summary.execution_boundary.mode}`,
    `validation_plan_source: ${summary.validation_plan.source}`,
    `repair_once_available: ${summary.repair_once_available}`,
    `receipt_required: ${summary.receipt_requirement.required}`,
    `checkpoint_required: ${summary.checkpoint_requirement.required}`,
    `red_gate_status: ${summary.red_gate_status.status}`,
    `readiness_claim_allowed: ${summary.readiness_claim_allowed}`,
    `stop_reason: ${summary.stop_reason}`
  ].join('\n');
}

function run(argv = [], io = {}) {
  const stdout = io.stdout || process.stdout;
  const workspaceRoot = io.workspaceRoot || process.cwd();
  const options = parseArgs(argv);

  if (options.help) {
    stdout.write(`${usage()}\n`);
    return 0;
  }

  if (options.rejectedFlag) {
    stdout.write(`${JSON.stringify({
      status: 'error',
      decision: 'NOT_READY_BLOCKED',
      rejectedFlag: options.rejectedFlag,
      reason: options.unknown
        ? 'unknown_flag_rejected_by_read_only_noop_controller'
        : 'red_or_side_effect_flag_rejected_by_read_only_noop_controller'
    }, null, 2)}\n`);
    return 2;
  }

  const summary = collectAutopilotControllerSummary({ workspaceRoot });
  if (options.json) {
    stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
  } else {
    stdout.write(`${formatText(summary)}\n`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = {
  formatText,
  parseArgs,
  run,
  usage
};
