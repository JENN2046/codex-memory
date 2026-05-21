const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  parseMarkdownTable,
  validateAutopilotLedgerConsistency
} = require('../scripts/validate_autopilot_ledger_consistency');

function writeBoard(root, { latestLedgerId = 'CM-0705', latestTaskId = 'CM-0705', latestValidationScope = 'CM-0705' } = {}) {
  const board = path.join(root, '.agent_board');
  fs.mkdirSync(board, { recursive: true });
  fs.writeFileSync(path.join(board, 'TASK_QUEUE.md'), [
    '| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |',
    '|---|---:|---|---|---|---|---|---|---|---|---|',
    `| ${latestTaskId} | 705 | done | P6-docs-drift | A1 | \`.agent_board/*\` | latest task | docs validation | none | no | completed |`,
    '| CM-0704 | 704 | done | P0-mainline-health | A2 | `tests/*` | previous task | tests | none | no | completed |'
  ].join('\n'));
  fs.writeFileSync(path.join(board, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    `| CMV-0824 | docs validation | P6-docs-drift | ${latestValidationScope} latest validation | COMPLETED_VALIDATED | ok | none | 2026-05-21 |`,
    '| CMV-0823 | tests | P0-mainline-health | CM-0704 previous validation | COMPLETED_VALIDATED | ok | none | 2026-05-21 |'
  ].join('\n'));
  fs.writeFileSync(path.join(board, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    `| ${latestLedgerId} | latest ledger | Green | \`default_autonomy_envelope\` | action | receipt | \`CMV-0824\` docs validation passed | provider=0 | 0 | completed_validated | 2026-05-21 |`,
    '| CM-0704 | previous ledger | Green | `default_autonomy_envelope` | action | receipt | `CMV-0823` tests passed | provider=0 | 0 | completed_validated | 2026-05-21 |'
  ].join('\n'));
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-ledger-validator-'));
}

test('parseMarkdownTable returns row objects from a simple markdown table', () => {
  const rows = parseMarkdownTable([
    '| ID | Status |',
    '|---|---|',
    '| CM-0705 | done |'
  ].join('\n'));
  assert.deepEqual(rows, [{ ID: 'CM-0705', Status: 'done' }]);
});

test('parseMarkdownTable preserves pipes inside inline code cells', () => {
  const rows = parseMarkdownTable([
    '| ID | Command / Check | Scope | Result |',
    '|---|---|---|---|',
    '| CMV-0827 | `rg -n "Chinese Task Summary Closeout|任务总结" AGENTS.md` | CM-0708 parser validation | COMPLETED_VALIDATED |'
  ].join('\n'));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].ID, 'CMV-0827');
  assert.match(rows[0]['Command / Check'], /Closeout\|任务总结/);
  assert.match(rows[0].Scope, /CM-0708/);
});

test('validator accepts matching latest task, validation scope, and ledger row', () => {
  const root = tempRoot();
  writeBoard(root);
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, true);
  assert.equal(result.latestTask, 'CM-0705');
  assert.equal(result.latestLedger, 'CM-0705');
  assert.equal(result.latestValidationScope, 'CM-0705');
});

test('validator rejects missing latest ledger row', () => {
  const root = tempRoot();
  writeBoard(root, { latestLedgerId: 'CM-0704' });
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join('\n'), /Latest ledger row CM-0704 does not match latest done task CM-0705/);
});

test('validator rejects stale latest validation scope', () => {
  const root = tempRoot();
  writeBoard(root, { latestValidationScope: 'CM-0704' });
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join('\n'), /Latest validation scope CM-0704 does not match latest done task CM-0705/);
});
