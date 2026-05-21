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

test('v3 receipt parser core keeps pipes inside inline code cells', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0827 | `rg -n "Chinese Task Summary Closeout|任务总结" AGENTS.md` | P10 | CM-0708 Smart Standing Authorization v3 parser normalization | COMPLETED_VALIDATED | Green Lane not_required_no_amber_external_or_write_action; no readiness claim occurred. | Next local-safe step. | 2026-05-21 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.source_row_count, 1);
  assert.equal(summary.latest_v3_task_id, 'CM-0708');
  assert.equal(summary.latest_validation_id, 'CMV-0827');
  assert.equal(summary.latest_lane, 'Green');
  assert.equal(summary.latest_receipt_status, 'not_required_no_amber_external_or_write_action');
});

test('v3 receipt parser treats latest Amber receipts as current v3 rows', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0835 | `node src\\cli\\scoped-recall-evidence-probe.js --json --execute --allow-local-state-writes --limit 1` | P9 | CM-0716 scoped recall evidence probe and bounded evidence collection | COMPLETED_VALIDATED | Added a fail-closed probe. Current workspace execution used `realMemoryReadQueryCount=1`, wrote one local recall-audit append, kept `memoryWrites=0`, provider/API/MCP=0, and returned no raw memory content. | Push remains blocked; continue governance fail-closed hardening. | 2026-05-21 |',
    '| CMV-0831 | `node --check src\\cli\\read-policy-evidence-probe.js` | P8 | CM-0712 read-policy evidence probe CLI | COMPLETED_VALIDATED | Green Lane not_required_no_amber_external_or_write_action; no readiness claim occurred. | Next local-safe step. | 2026-05-21 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.latest_v3_task_id, 'CM-0716');
  assert.equal(summary.latest_validation_id, 'CMV-0835');
  assert.equal(summary.latest_lane, 'Amber');
  assert.equal(summary.latest_receipt_status, 'amber_receipt_recorded');
  assert.equal(summary.budget_used.memory_queries, 1);
  assert.equal(summary.budget_used.memory_writes, 0);
  assert.equal(summary.budget_used.provider, 0);
  assert.equal(summary.budget_used.api, 0);
  assert.equal(summary.budget_used.mcp_tool, 0);
  assert.equal(summary.latest_parser_status, 'parser_ok');
});

test('v3 receipt parser recognizes local dashboard text hardening rows as Green local review shape', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0841 | `node src\\cli\\dashboard.js --summary-only` | P10 | CM-0722 dashboard governance blocker text summary | COMPLETED_VALIDATED | Dashboard text output now emits `GovBlk1..GovBlk5`; targeted dashboard tests passed `19/19`; full `npm test` passed `1961/1961`; `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` is preserved. | Push remains blocked pending explicit user authorization; continue governance fail-closed hardening, not readiness claim. | 2026-05-21 |',
    '| CMV-0840 | `node src\\cli\\dashboard.js --json --summary-only` | P10 | CM-0721 dashboard governance blocker input placeholders | COMPLETED_VALIDATED | Dashboard readiness governance blocker details now include `inputResolutionMode` and `requiredInputPlaceholders`. | Continue governance fail-closed hardening. | 2026-05-21 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.latest_v3_task_id, 'CM-0722');
  assert.equal(summary.latest_validation_id, 'CMV-0841');
  assert.equal(summary.latest_lane, 'Green');
  assert.equal(summary.latest_receipt_status, 'local_review_shape_only');
  assert.equal(summary.latest_parser_status, 'parser_ok');
  assert.equal(summary.next_auto_step_allowed, true);
});

test('v3 receipt parser keeps local dashboard rows Green when zero Red stops are reported', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0843 | `node src\\cli\\dashboard.js --json --summary-only` | P10 | CM-0724 dashboard v3 receipt latest lane passthrough | COMPLETED_VALIDATED | Dashboard compact `smartStandingAuthorizationV3` summary now includes `latest_lane`, and text `V3Receipt` includes `lane=...`. Real dashboard summary reports latest `CM-0723 / CMV-0842`, `latest_lane=Green`, `latest_receipt_status=local_review_shape_only`, zero budget use, zero Red stops, and `next_auto_step_allowed=true`, while preserving `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`. Targeted dashboard tests passed `19/19`; full `npm test` passed `1962/1962`. | Push remains blocked pending explicit user authorization; continue governance fail-closed hardening, not readiness claim. | 2026-05-21 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.latest_v3_task_id, 'CM-0724');
  assert.equal(summary.latest_validation_id, 'CMV-0843');
  assert.equal(summary.latest_lane, 'Green');
  assert.equal(summary.latest_receipt_status, 'local_review_shape_only');
  assert.equal(summary.latest_parser_status, 'parser_ok');
  assert.equal(summary.red_stop_count, 0);
  assert.equal(summary.next_auto_step_allowed, true);
});

test('v3 receipt parser recognizes local preflight rows with zero writes as Green local review shape', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0850 | `node src\\cli\\store-freshness-write-preflight.js --json` | P10 | CM-0731 Store freshness write-evidence preflight | COMPLETED_VALIDATED | Added a read-only store freshness write-evidence preflight. Real output reports `STORE_FRESHNESS_EVIDENCE_PREPARED_EXACT_ONLY`, `memoryWrites=0`, `proposedMemoryWrites=1`, sanitized `record_memory` args, and `readinessClaimAllowed=false`; targeted preflight tests passed `3/3`. | If exact write-path freshness evidence is still needed, request explicit approval for one sanitized `record_memory` write using the preflight payload. | 2026-05-22 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.latest_v3_task_id, 'CM-0731');
  assert.equal(summary.latest_validation_id, 'CMV-0850');
  assert.equal(summary.latest_lane, 'Green');
  assert.equal(summary.latest_receipt_status, 'local_review_shape_only');
  assert.equal(summary.latest_parser_status, 'parser_ok');
  assert.equal(summary.next_auto_step_allowed, true);
});

test('v3 receipt parser recognizes not-approved approval packet preflight rows as Green local review shape', () => {
  const markdown = [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0851 | `node src\\cli\\store-freshness-write-preflight.js --json` | P10 | CM-0732 Store freshness approval packet surface | COMPLETED_VALIDATED | Store freshness preflight now emits `approvalPacket` with `approvalState=NOT_APPROVED`, exact one-write action, budget `maxMemoryWrites=1`, real output still reports `memoryWrites=0`, `proposedMemoryWrites=1`, and `readinessClaimAllowed=false`. | If exact write-path freshness evidence is still needed, the user can explicitly approve the operator approval line. | 2026-05-22 |'
  ].join('\n');
  const summary = parseReceiptMarkdown(markdown, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot: process.cwd()
  });

  assert.equal(summary.latest_v3_task_id, 'CM-0732');
  assert.equal(summary.latest_validation_id, 'CMV-0851');
  assert.equal(summary.latest_lane, 'Green');
  assert.equal(summary.latest_receipt_status, 'local_review_shape_only');
  assert.equal(summary.latest_parser_status, 'parser_ok');
  assert.equal(summary.budget_used.memory_writes, 0);
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
