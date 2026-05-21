#!/usr/bin/env node
const {
  ADAPTER_CONTRACT_REJECTED_FLAGS,
  collectAutopilotActionAdapterContract
} = require('../core/AutopilotActionAdapterContract');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-action-adapter-contract.js [--json] [--pretty]',
    '',
    'Read-only Budget Enforcement / Action Adapter Contract summary.',
    'This command never executes adapters, calls providers/MCP, changes dependencies, probes runtime, or pushes.',
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
    if (ADAPTER_CONTRACT_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-action-adapter-contract]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `contract_id: ${summary.contract_id}`,
    `adapters: ${summary.adapter_count}/${summary.required_adapter_count}`,
    `fail_closed_fixtures: ${summary.fail_closed_fixture_count}/${summary.required_fail_closed_fixture_count}`,
    `executes_adapters: ${summary.executes_adapters}`,
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
        ? 'unknown_flag_rejected_by_read_only_adapter_contract'
        : 'red_or_side_effect_flag_rejected_by_read_only_adapter_contract'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotActionAdapterContract({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
