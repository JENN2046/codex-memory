const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  parseReceiptMarkdown
} = require('../src/core/SmartStandingAuthorizationV3ReceiptParser');

const cliPath = path.resolve(
  __dirname,
  '..',
  'src',
  'cli',
  'smart-standing-authorization-v3-receipts.js'
);
const sampleLogPath = path.resolve(
  __dirname,
  'fixtures',
  'smart-standing-authorization-v3-validation-log-sample.md'
);

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('v3 receipt parser core extracts latest local receipt summary', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0801 | `cmd` | P6 | CM-0677 Smart Standing Authorization v3 receipt rollup | COMPLETED_VALIDATED | Green Lane receipt rollup only; no provider, MCP call, real memory evidence, or readiness claim occurred. | Next local-safe step. | 2026-05-21 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.latest_v3_task_id, 'CM-0677');
  assert.equal(summary.latest_validation_id, 'CMV-0801');
  assert.equal(summary.latest_lane, 'Green');
  assert.equal(summary.latest_receipt_status, 'receipt_rollup_only');
  assert.equal(summary.latest_validation_result, 'COMPLETED_VALIDATED');
  assert.equal(summary.budget_used.provider, 0);
  assert.equal(summary.budget_used.mcp_tool, 0);
  assert.equal(summary.budget_used.memory_writes, 0);
  assert.equal(summary.next_auto_step_allowed, true);
});

test('v3 receipt parser core does not treat no-Amber or Red hard-stop wording as actions', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0797 | `cmd` | P6 | CM-0673 Phase F public MCP freeze rollup and first v3 Green Lane trial | COMPLETED_VALIDATED | v3 trial lane was Green with no Amber external/write action, so no Amber receipt was required. | Next local-safe candidate. | 2026-05-21 |',
    '| CMV-0796 | `cmd` | P6 | CM-0672 Smart Standing Authorization v3 policy/status upgrade | COMPLETED_VALIDATED | Policy preserves Red hard-stop constraints and zero Red stop count. | Continue local-safe work. | 2026-05-21 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.row_statuses[0].lane, 'Green');
  assert.equal(summary.row_statuses[0].receipt_status, 'not_required_no_amber_external_or_write_action');
  assert.equal(summary.row_statuses[1].lane, 'not_recorded_in_validation_log');
  assert.equal(summary.red_stop_count, 0);
});

test('v3 receipt parser CLI reads an explicit in-workspace validation log as json', () => {
  const relativeSamplePath = path.relative(path.resolve(__dirname, '..'), sampleLogPath);
  const result = runCli(['--json', '--validation-log', relativeSamplePath]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.mode, 'smart-standing-authorization-v3-receipt-parser');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.evidenceClass, 'read_only_local_markdown_parse');
  assert.equal(payload.source_surface, 'tests/fixtures/smart-standing-authorization-v3-validation-log-sample.md');
  assert.equal(payload.latest_v3_task_id, 'CM-0677');
  assert.equal(payload.latest_validation_id, 'CMV-0801');
  assert.equal(payload.latest_lane, 'Green');
  assert.equal(payload.latest_receipt_status, 'receipt_rollup_only');
  assert.equal(payload.budget_used.provider, 0);
  assert.equal(payload.budget_used.memory_writes, 0);
});

test('v3 receipt parser CLI renders text summary', () => {
  const relativeSamplePath = path.relative(path.resolve(__dirname, '..'), sampleLogPath);
  const result = runCli(['--validation-log', relativeSamplePath]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[smart-standing-authorization-v3-receipts\]/);
  assert.match(result.stdout, /latest_task: CM-0677/);
  assert.match(result.stdout, /receipt_status: receipt_rollup_only/);
});

test('v3 receipt parser CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--provider', '--mcp-call', '--record-memory', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
  }
});

test('v3 receipt parser CLI rejects paths outside workspace', () => {
  const result = runCli(['--json', '--validation-log', '..\\outside.md']);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'error');
  assert.equal(payload.code, 'PATH_OUTSIDE_WORKSPACE');
});

test('v3 receipt parser CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/smart-standing-authorization-v3-receipts\.js/);
});
