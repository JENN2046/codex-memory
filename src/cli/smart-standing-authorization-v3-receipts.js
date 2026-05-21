#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  parseReceiptMarkdown
} = require('../core/SmartStandingAuthorizationV3ReceiptParser');

const REJECTED_FLAGS = new Set([
  '--write',
  '--append',
  '--record-memory',
  '--search-memory',
  '--mcp-call',
  '--provider',
  '--api-call',
  '--runtime-probe',
  '--push',
  '--deploy',
  '--release',
  '--tag',
  '--readiness-claim'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    validationLogPath: path.join('.agent_board', 'VALIDATION_LOG.md'),
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--validation-log') {
      options.validationLogPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/smart-standing-authorization-v3-receipts.js [--json] [--pretty] [--validation-log <path>]',
    '',
    'Read-only parser for local Smart Standing Authorization v3 receipt rows.',
    'Default input: .agent_board/VALIDATION_LOG.md',
    '',
    'This command does not call providers, MCP tools, runtime probes, or memory stores, and it does not write files.'
  ].join('\n');
}

function resolveWorkspacePath(inputPath, workspaceRoot = process.cwd()) {
  const absolute = path.resolve(workspaceRoot, inputPath || '');
  const relative = path.relative(workspaceRoot, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('validation log path must stay inside workspace');
    error.code = 'PATH_OUTSIDE_WORKSPACE';
    throw error;
  }
  return absolute;
}

function formatText(summary) {
  return [
    '[smart-standing-authorization-v3-receipts]',
    `decision: ${summary.decision}`,
    `source: ${summary.source_surface}`,
    `latest_task: ${summary.latest_v3_task_id}`,
    `latest_validation: ${summary.latest_validation_id}`,
    `latest_lane: ${summary.latest_lane}`,
    `receipt_status: ${summary.latest_receipt_status}`,
    `validation_result: ${summary.latest_validation_result}`,
    `budget_used: provider=${summary.budget_used.provider}, api=${summary.budget_used.api}, mcp_tool=${summary.budget_used.mcp_tool}, memory_writes=${summary.budget_used.memory_writes}, dependency_actions=${summary.budget_used.dependency_actions}`,
    `red_stop_count: ${summary.red_stop_count}`,
    `next_auto_step_allowed: ${summary.next_auto_step_allowed}`,
    `stop_reason: ${summary.stop_reason}`
  ].join('\n');
}

function run(argv = [], io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
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
      reason: 'red_or_side_effect_flag_rejected_by_read_only_parser'
    }, null, 2)}\n`);
    return 2;
  }

  try {
    const validationLogPath = resolveWorkspacePath(options.validationLogPath, workspaceRoot);
    const markdown = fs.readFileSync(validationLogPath, 'utf8');
    const summary = parseReceiptMarkdown(markdown, {
      sourcePath: validationLogPath,
      workspaceRoot
    });

    if (options.json) {
      stdout.write(`${JSON.stringify(summary, null, options.pretty ? 2 : 0)}\n`);
    } else {
      stdout.write(`${formatText(summary)}\n`);
    }
    return 0;
  } catch (error) {
    const payload = {
      status: 'error',
      decision: 'NOT_READY_BLOCKED',
      code: error.code || 'RECEIPT_PARSE_FAILED',
      message: error.message
    };
    if (options.json) {
      stdout.write(`${JSON.stringify(payload, null, options.pretty ? 2 : 0)}\n`);
    } else {
      stderr.write(`${payload.code}: ${payload.message}\n`);
    }
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = {
  parseArgs,
  resolveWorkspacePath,
  run,
  usage
};
