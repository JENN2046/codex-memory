#!/usr/bin/env node
const {
  VALIDATION_PLANNER_REJECTED_FLAGS,
  collectAutopilotValidationPlanner
} = require('../core/AutopilotValidationPlanner');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-validation-planner.js [--json] [--pretty]',
    '',
    'Read-only ValidationPlanner / RepairOnce Orchestrator summary.',
    'This command never runs validation, applies repair, probes runtime, or calls external systems.',
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
    if (VALIDATION_PLANNER_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-validation-planner]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `planner_id: ${summary.planner_id}`,
    `validation_cases: ${summary.validation_case_count}/${summary.required_validation_case_count}`,
    `repair_rules: ${summary.repair_rule_count}/${summary.required_repair_rule_count}`,
    `executes_validation: ${summary.executes_validation}`,
    `applies_repair: ${summary.applies_repair}`,
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
        ? 'unknown_flag_rejected_by_read_only_validation_planner'
        : 'red_or_side_effect_flag_rejected_by_read_only_validation_planner'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotValidationPlanner({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
