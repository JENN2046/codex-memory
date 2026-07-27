"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  containsExactIdToken,
  parseMarkdownTable,
  validateAutopilotLedgerConsistency
} = require("../scripts/validate_autopilot_ledger_consistency");

const FIXTURE_TASK_ID = "CM-2991";
const FIXTURE_VALIDATION_ID = "CMV-2992";

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
      taskId: FIXTURE_TASK_ID,
      validationId: FIXTURE_VALIDATION_ID
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
      `| ${FIXTURE_VALIDATION_ID} | tests | P6 | ${FIXTURE_TASK_ID} synthetic closeout | COMPLETED_VALIDATED | ok | none | 2026-07-27 |`
    ])
  ].join("\n");
}

function ledger(rows = null) {
  return [
    "| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |",
    "|---|---|---|---|---|---|---|---|---:|---|---|",
    ...(rows || [
      `| ${FIXTURE_TASK_ID} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_VALIDATION_ID} | zero | 0 | completed_validated | 2026-07-27 |`
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
    `| ${FIXTURE_VALIDATION_ID} | \`rg -n "Closeout|任务总结" AGENTS.md\` | ${FIXTURE_TASK_ID} synthetic | COMPLETED_VALIDATED |`
  ].join("\n"));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].ID, FIXTURE_VALIDATION_ID);
  assert.match(rows[0]["Command / Check"], /Closeout\|任务总结/);
});

test("containsExactIdToken rejects prefix and suffix near-collisions", () => {
  assert.equal(containsExactIdToken("scope CM-3001 complete", "CM-3001"), true);
  assert.equal(containsExactIdToken("scope CM-30010 complete", "CM-3001"), false);
  assert.equal(containsExactIdToken("validation CMV-30020", "CMV-3002"), false);
  assert.equal(containsExactIdToken("xCM-3001", "CM-3001"), false);
});

test("ledger validator accepts an empty active queue as a terminal state", () => {
  const root = workspace();
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.activeTask, null);
  assert.equal(result.activeQueueCount, 0);
  assert.equal(result.lastCompletedTask, FIXTURE_TASK_ID);
  assert.equal(result.lastCompletedValidation, FIXTURE_VALIDATION_ID);
});

test("ledger validator accepts a future lastCompleted id pair when receipts rotate together", () => {
  const root = workspace();
  const changed = baseFacts();
  changed.lastCompleted = {
    taskId: "CM-3001",
    validationId: "CMV-3002"
  };
  writeFile(root, ".agent_board/CURRENT_FACTS.json", `${JSON.stringify(changed, null, 2)}\n`);
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation([
    "| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | ok | none | 2026-07-28 |"
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    "| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | completed_validated | 2026-07-28 |"
  ]));

  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.lastCompletedTask, "CM-3001");
  assert.equal(result.lastCompletedValidation, "CMV-3002");
});

test("ledger validator rejects near-collision receipt bindings", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation([
    `| ${FIXTURE_VALIDATION_ID} | tests | P6 | ${FIXTURE_TASK_ID}0 synthetic closeout | COMPLETED_VALIDATED | ok | none | 2026-07-27 |`
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    `| ${FIXTURE_TASK_ID} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_VALIDATION_ID}0 | zero | 0 | completed_validated | 2026-07-27 |`
  ]));

  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), new RegExp(`${FIXTURE_VALIDATION_ID} scope must bind ${FIXTURE_TASK_ID}`));
  assert.match(result.failures.join("\n"), new RegExp(`${FIXTURE_TASK_ID} ledger receipt must reference ${FIXTURE_VALIDATION_ID}`));
});

test("governance kernel delegates rotating receipt binding without pinning the reset id", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "..", "scripts", "validate_autopilot_governance_kernel.js"),
    "utf8"
  );
  assert.match(source, /validateAutopilotLedgerConsistency/);
  assert.doesNotMatch(source, /CM-2155|CMV-2240/);
});

test("ledger validator rejects a missing current validation row", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation([]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), new RegExp(`exactly one ${FIXTURE_VALIDATION_ID} row`));
});

test("ledger validator rejects a missing current ledger receipt", () => {
  const root = workspace();
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), new RegExp(`exactly one ${FIXTURE_TASK_ID} receipt row`));
});

test("ledger validator rejects duplicate current receipts", () => {
  const root = workspace();
  const row = `| ${FIXTURE_TASK_ID} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_VALIDATION_ID} | zero | 0 | completed_validated | 2026-07-27 |`;
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([row, row]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), new RegExp(`exactly one ${FIXTURE_TASK_ID} receipt row`));
  assert.match(result.failures.join("\n"), /retain only the current lastCompleted receipt row/);
});

test("ledger validator rejects duplicate current validation rows", () => {
  const root = workspace();
  const row = `| ${FIXTURE_VALIDATION_ID} | tests | P6 | ${FIXTURE_TASK_ID} synthetic closeout | COMPLETED_VALIDATED | ok | none | 2026-07-27 |`;
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validation([row, row]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), new RegExp(`exactly one ${FIXTURE_VALIDATION_ID} row`));
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

test("ledger validator rejects every queue row when activeTask is null", () => {
  const root = workspace();
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | blocked | P6 | Green | docs | blocked row | tests | none | no | blocked |"
  ]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /activeTask null requires an empty active queue/);
  assert.match(result.failures.join("\n"), /only todo or in_progress status/);
});

test("ledger validator rejects a non-null non-CM activeTask", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/CURRENT_FACTS.json",
    `${JSON.stringify(baseFacts(7), null, 2)}\n`
  );
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /activeTask must be null or a CM id/);
});

test("ledger validator accepts exactly one selected active queue row", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/CURRENT_FACTS.json",
    `${JSON.stringify(baseFacts("CM-3001"), null, 2)}\n`
  );
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | in_progress | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("ledger validator rejects extra queue rows beside activeTask", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/CURRENT_FACTS.json",
    `${JSON.stringify(baseFacts("CM-3001"), null, 2)}\n`
  );
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | todo | P6 | Green | docs | selected row | tests | none | no | active |",
    "| CM-3002 | 3002 | todo | P6 | Green | docs | extra row | tests | none | no | extra |"
  ]));
  const result = validateAutopilotLedgerConsistency(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must match the single active queue row/);
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
