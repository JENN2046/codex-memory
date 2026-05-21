#!/usr/bin/env node
const {
  GREEN_FILE_WRITE_BOUNDARY_REJECTED_FLAGS,
  collectAutopilotGreenFileWriteBoundary
} = require('../core/AutopilotGreenFileWriteBoundary');

function parseArgs(argv) {
  const options = { json: false, pretty: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--pretty') { options.pretty = true; continue; }
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (GREEN_FILE_WRITE_BOUNDARY_REJECTED_FLAGS.has(arg)) return { ...options, rejectedFlag: arg };
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-green-file-write-boundary]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `boundary_id: ${summary.boundary_id}`,
    `boundary_decision: ${summary.boundary_decision}`,
    `design_allowed: ${summary.design_allowed}`,
    `implementation_allowed: ${summary.implementation_allowed}`,
    `executor_activation_allowed: ${summary.executor_activation_allowed}`,
    `design_gates: ${summary.required_design_gate_count}`,
    `allowed_paths: ${summary.allowed_path_class_count}`,
    `hard_stops: ${summary.hard_stop_count}`,
    `readiness_claim_allowed: ${summary.readiness_claim_allowed}`,
    `next_safe_action: ${summary.next_safe_action}`,
    ''
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node src/cli/autopilot-green-file-write-boundary.js [--json] [--pretty]\n');
    return;
  }
  if (options.rejectedFlag) {
    process.stdout.write(`${JSON.stringify({
      status: 'error',
      rejectedFlag: options.rejectedFlag,
      reason: options.unknown
        ? 'unknown_flag_rejected_by_read_only_green_file_write_boundary'
        : 'red_or_side_effect_flag_rejected_by_read_only_green_file_write_boundary'
    })}\n`);
    process.exitCode = 2;
    return;
  }
  const summary = collectAutopilotGreenFileWriteBoundary({ workspaceRoot: process.cwd() });
  process.stdout.write(`${options.json ? JSON.stringify(summary, null, options.pretty ? 2 : 0) : renderText(summary)}\n`);
}

main();
