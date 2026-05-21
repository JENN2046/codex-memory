#!/usr/bin/env node
const {
  CONTROLLED_GREEN_ENTRY_REJECTED_FLAGS,
  collectAutopilotControlledGreenExecutorEntry
} = require('../core/AutopilotControlledGreenExecutorEntry');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-controlled-green-entry.js [--json] [--pretty]',
    '',
    'Read-only controlled Green executor entry packet summary.',
    'This command never activates an executor, executes tasks, writes state, probes runtime, or calls external systems.',
    ''
  ].join('\n'));
}

function parseArgs(argv) {
  const options = { json: false, pretty: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (CONTROLLED_GREEN_ENTRY_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-controlled-green-entry]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `packet_id: ${summary.packet_id}`,
    `entry_decision: ${summary.entry_decision}`,
    `conditions: ${summary.met_admission_condition_count}/${summary.required_admission_condition_count}`,
    `allowed_scope: ${summary.allowed_scope_count}/${summary.required_allowed_scope_count}`,
    `stop_reasons: ${summary.fail_closed_stop_reason_count}/${summary.required_stop_reason_count}`,
    `executor_activated: ${summary.executor_activated}`,
    `executes_tasks: ${summary.executes_tasks}`,
    `readiness_claim_allowed: ${summary.readiness_claim_allowed}`,
    `next_safe_action: ${summary.next_safe_action}`,
    `stop_reason: ${summary.stop_reason}`,
    ''
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.rejectedFlag) {
    process.stdout.write(`${JSON.stringify({
      status: 'error',
      rejectedFlag: options.rejectedFlag,
      reason: options.unknown
        ? 'unknown_flag_rejected_by_read_only_green_entry_packet'
        : 'red_or_side_effect_flag_rejected_by_read_only_green_entry_packet'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotControlledGreenExecutorEntry({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
