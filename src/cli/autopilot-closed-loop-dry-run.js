#!/usr/bin/env node
const {
  REJECTED_FLAGS,
  collectAutopilotClosedLoopSummary
} = require('../core/AutopilotClosedLoopDryRun');

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
    } else if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/autopilot-closed-loop-dry-run.js [--json] [--pretty]',
    '',
    'Read-only dry-run summary for the local Smart Standing Authorization v3 autopilot loop.',
    '',
    'This command does not write files, execute tasks, call providers, call MCP tools, read real memory stores, change dependencies, change config, push, deploy, or claim readiness.'
  ].join('\n');
}

function formatText(summary) {
  return [
    '[autopilot-closed-loop-dry-run]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `latest_goal: ${summary.latest_goal}`,
    `latest_task: ${summary.latest_task}`,
    `next_safe_task: ${summary.next_safe_task}`,
    `blocked_red_count: ${summary.blocked_red_count}`,
    `receipt_coverage: ${summary.receipt_coverage.covered_tasks}/${summary.receipt_coverage.completed_tasks}`,
    `validation_coverage: ${summary.validation_coverage.covered_tasks}/${summary.validation_coverage.completed_tasks}`,
    `repair_once_remaining: ${summary.repair_once_remaining}`,
    `readiness_claim_allowed: ${summary.readiness_claim_allowed}`,
    `dry_run_only: ${summary.dry_run_only}`,
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
      reason: 'red_or_side_effect_flag_rejected_by_read_only_dry_run'
    }, null, 2)}\n`);
    return 2;
  }

  const summary = collectAutopilotClosedLoopSummary({ workspaceRoot });
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
