"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  parseMarkdownTable,
  validateAutopilotLedgerConsistency
} = require("../scripts/validate_autopilot_ledger_consistency");

function writeFile(root, relativePath, text) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function baseFacts(activeTask = null) {
  return {
    schemaVersion: 5,
    activeTask,
    lastCompleted: {
      taskId: "CM-2155",
      validationId: "CMV-2240"
    }
  };
}

function queue(rows = []) {
  return [
    "| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |",
    "|---|---:|---|---|---|---|---|---|---|---|---|",
    ...rows
  ].join("\n");
}

function validation(rows = null) {
  return [
    "| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |",
    "|---|---|---|---|---|---|---|---|",
    ...(rows || [
      "| CMV-2240 | tests | P6 | CM-2155 governance reset | COMPLETED_VALIDATED | ok | none | 2026-07-27 |"
    ])
  ].join("\n");
}

function ledger(rows = null) {
  return [
    "| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |",
    "|---|---|---|---|---|---|---|---|---:|---|---|",
    ...(rows || [
      "| CM-2155 | reset | Yellow | reset | compact | receipt | CMV-2240 | zero | 0 | completed_validated | 2026-07-27 |"
    ])
  ].join("\n");
}

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-v5-"));
  writeFile(root, ".agent_board/CURRENT_FACTS.json", `${JSON.stringify(baseFacts(), null, 2)}\n`);
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue());
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation());
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger());
  return root;
}

test("parseMarkdownTable preserves pipes inside inline code cells", () => {
  const rows = parseMarkdownTable([
    "| ID | Command / Check | Scope | Result |",
    "|---|---|---|---|",
    "| CMV-2240 | `rg -n \"Closeout|任务总结\" AGENTS.md` | CM-2155 reset | COMPLETED_VALIDATED |"
  ].join("\n"));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].ID, "CMV-2240");
  assert.match(rows[0]["Command / Check"], /Closeout\|任务总结/);
});

test("ledger validator accepts an empty active queue as a terminal state", () => {
  const root = workspace();
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.activeTask, null);
  assert.equal(result.activeQueueCount, 0);
  assert.equal(result.lastCompletedTask, "CM-2155");
  assert.equal(result.lastCompletedValidation, "CMV-2240");
});

test("ledger validator rejects a missing CMV-2240 row", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation([]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one CMV-2240 row/);
});

test("ledger validator rejects a missing CM-2155 receipt", () => {
  const root = workspace();
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one CM-2155 receipt row/);
});

test("ledger validator rejects duplicate current receipts", () => {
  const root = workspace();
  const row = "| CM-2155 | reset | Yellow | reset | compact | receipt | CMV-2240 | zero | 0 | completed_validated | 2026-07-27 |";
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([row, row]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one CM-2155 receipt row/);
  assert.match(result.failures.join("\n"), /retain only the current lastCompleted receipt row/);
});

test("ledger validator rejects duplicate current validation rows", () => {
  const root = workspace();
  const row = "| CMV-2240 | tests | P6 | CM-2155 governance reset | COMPLETED_VALIDATED | ok | none | 2026-07-27 |";
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation([row, row]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one CMV-2240 row/);
  assert.match(result.failures.join("\n"), /retain only the current lastCompleted validation row/);
});

test("ledger validator rejects reintroduced historical done rows", () => {
  const root = workspace();
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-2154 | 2154 | done | P6 | Green | docs | historical | tests | none | no | stale |"
  ]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not contain historical done rows/);
});

test("ledger validator rejects active task and queue disagreement", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/CURRENT_FACTS.json",
    `${JSON.stringify(baseFacts("CM-9999"), null, 2)}\n`
  );
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-9998 | 9998 | todo | P6 | Green | docs | wrong task | tests | none | no | active |"
  ]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must match the single active queue row/);
});
