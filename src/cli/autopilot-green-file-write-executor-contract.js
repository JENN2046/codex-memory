#!/usr/bin/env node
const {
  GREEN_FILE_WRITE_CONTRACT_REJECTED_FLAGS,
  collectAutopilotGreenFileWriteExecutorContract
} = require('../core/AutopilotGreenFileWriteExecutorContract');

function parseArgs(argv) {
  const options = { json: false, pretty: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--pretty') { options.pretty = true; continue; }
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (GREEN_FILE_WRITE_CONTRACT_REJECTED_FLAGS.has(arg)) return { ...options, rejectedFlag: arg };
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-green-file-write-executor-contract]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `contract_id: ${summary.contract_id}`,
    `contract_decision: ${summary.contract_decision}`,
    `implementation_allowed: ${summary.implementation_allowed}`,
    `executor_activation_allowed: ${summary.executor_activation_allowed}`,
    `real_writes_allowed: ${summary.real_writes_allowed}`,
    `execution_cycle: ${summary.execution_cycle_count}`,
    `preflight_gates: ${summary.preflight_gate_count}`,
    `post_write_gates: ${summary.post_write_gate_count}`,
    `fail_closed_cases: ${summary.fail_closed_case_count}`,
    `readiness_claim_allowed: ${summary.readiness_claim_allowed}`,
    `next_safe_action: ${summary.next_safe_action}`,
    ''
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node src/cli/autopilot-green-file-write-executor-contract.js [--json] [--pretty]\n');
    return;
  }
  if (options.rejectedFlag) {
    process.stdout.write(`${JSON.stringify({
      status: 'error',
      rejectedFlag: options.rejectedFlag,
      reason: options.unknown
        ? 'unknown_flag_rejected_by_read_only_green_file_write_executor_contract'
        : 'red_or_side_effect_flag_rejected_by_read_only_green_file_write_executor_contract'
    })}\n`);
    process.exitCode = 2;
    return;
  }
  const summary = collectAutopilotGreenFileWriteExecutorContract({ workspaceRoot: process.cwd() });
  process.stdout.write(`${options.json ? JSON.stringify(summary, null, options.pretty ? 2 : 0) : renderText(summary)}\n`);
}

main();
