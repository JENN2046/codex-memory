#!/usr/bin/env node
const {
  STATE_STORE_REJECTED_FLAGS,
  collectAutopilotStateStoreDraft
} = require('../core/AutopilotStateStoreDraft');

function printHelp() {
  process.stdout.write([
    'Usage: node src/cli/autopilot-state-store-draft.js [--json] [--pretty]',
    '',
    'Read-only structured state store draft summary for Smart Standing Authorization v3.',
    'This command never creates a database, migrates board state, writes durable state, or executes tasks.',
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
    if (STATE_STORE_REJECTED_FLAGS.has(arg)) {
      return { ...options, rejectedFlag: arg };
    }
    return { ...options, rejectedFlag: arg, unknown: true };
  }
  return options;
}

function renderText(summary) {
  return [
    '[autopilot-state-store-draft]',
    `decision: ${summary.decision}`,
    `status: ${summary.status}`,
    `model_id: ${summary.model_id}`,
    `append_only: ${summary.append_only}`,
    `no_migration: ${summary.no_migration}`,
    `record_types: ${summary.record_type_count}/${summary.required_record_type_count}`,
    `records: ${summary.record_count}`,
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
        ? 'unknown_flag_rejected_by_read_only_state_store_draft'
        : 'red_or_side_effect_flag_rejected_by_read_only_state_store_draft'
    })}\n`);
    process.exitCode = 2;
    return;
  }

  const summary = collectAutopilotStateStoreDraft({ workspaceRoot: process.cwd() });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    return;
  }
  process.stdout.write(renderText(summary));
}

main();
