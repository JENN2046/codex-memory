#!/usr/bin/env node
const {
  OPERATOR_CONSOLE_REJECTED_FLAGS,
  collectAutopilotOperatorConsole
} = require('../core/AutopilotOperatorConsole');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-operator-console.js [--json] [--pretty]',
    '',
    'Read-only Operator Console Readiness Surface + Eval Matrix summary.',
    'This command never runs evals, writes state, probes runtime, or calls external systems.',
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
    if (OPERATOR_CONSOLE_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-operator-console]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `console_id: ${summary.console_id}`,
    `surfaces: ${summary.surface_count}/${summary.required_surface_count}`,
    `eval_cases: ${summary.eval_case_count}/${summary.required_eval_case_count}`,
    `next_safe_action: ${summary.next_safe_action}`,
    `read_only: ${summary.read_only}`,
    `executes_eval: ${summary.executes_eval}`,
    `writes_state: ${summary.writes_state}`,
    `readiness_claim_allowed: ${summary.readiness_claim_allowed}`,
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
        ? 'unknown_flag_rejected_by_read_only_operator_console'
        : 'red_or_side_effect_flag_rejected_by_read_only_operator_console'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotOperatorConsole({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
