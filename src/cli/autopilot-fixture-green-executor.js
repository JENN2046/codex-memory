#!/usr/bin/env node
const {
  FIXTURE_GREEN_EXECUTOR_REJECTED_FLAGS,
  collectAutopilotFixtureGreenExecutor
} = require('../core/AutopilotFixtureGreenExecutor');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-fixture-green-executor.js [--json] [--pretty]',
    '',
    'Read-only fixture-backed Green executor skeleton summary.',
    'This command never executes tasks, writes files, runs validators, writes receipts, probes runtime, or calls external systems.',
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
    if (FIXTURE_GREEN_EXECUTOR_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-fixture-green-executor]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `executor_id: ${summary.executor_id}`,
    `skeleton_decision: ${summary.skeleton_decision}`,
    `task_kinds: ${summary.allowed_task_kind_count}/${summary.required_task_kind_count}`,
    `adapter_kinds: ${summary.allowed_adapter_kind_count}/${summary.required_adapter_kind_count}`,
    `noop_plans: ${summary.noop_execution_plan_count}/${summary.executable_task_fixture_count}`,
    `fail_closed: ${summary.fail_closed_fixture_count}/${summary.required_fail_closed_fixture_count}`,
    `executor_activated: ${summary.executor_activated}`,
    `executes_tasks: ${summary.executes_tasks}`,
    `writes_files: ${summary.writes_files}`,
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
        ? 'unknown_flag_rejected_by_read_only_fixture_green_executor'
        : 'red_or_side_effect_flag_rejected_by_read_only_fixture_green_executor'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotFixtureGreenExecutor({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
