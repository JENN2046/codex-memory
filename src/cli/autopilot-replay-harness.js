#!/usr/bin/env node
const {
  REPLAY_HARNESS_REJECTED_FLAGS,
  collectAutopilotReplayHarness
} = require('../core/AutopilotReplayHarness');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-replay-harness.js [--json] [--pretty]',
    '',
    'Read-only Checkpoint / Resume / Replay Harness summary.',
    'This command never replays real actions, writes state, probes runtime, or calls external systems.',
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
    if (REPLAY_HARNESS_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-replay-harness]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `harness_id: ${summary.harness_id}`,
    `scenarios: ${summary.scenario_count}/${summary.required_scenario_count}`,
    `fail_closed_scenarios: ${summary.fail_closed_scenario_count}`,
    `read_only: ${summary.read_only}`,
    `replays_real_actions: ${summary.replays_real_actions}`,
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
        ? 'unknown_flag_rejected_by_read_only_replay_harness'
        : 'red_or_side_effect_flag_rejected_by_read_only_replay_harness'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotReplayHarness({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
