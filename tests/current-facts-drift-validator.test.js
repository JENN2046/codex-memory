"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  ACCEPTED_BASELINE,
  ACTIVE_END,
  ACTIVE_START,
  FACTS_PATH,
  HISTORY_INDEX_PATH,
  HISTORY_RESET_CLOSEOUT,
  POINTER_FILES,
  validateCurrentFactsDrift
} = require("../scripts/validate_current_facts_drift");

const FIXTURE_CLOSEOUT = Object.freeze({
  taskId: "CM-2991",
  validationId: "CMV-2992"
});

function writeFile(root, relativePath, text) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function facts() {
  return {
    schemaVersion: 5,
    factsMode: "committed_status_snapshot",
    updatedAt: "2026-07-27",
    baseBranch: "main",
    status: {
      project: "NOT_READY_BLOCKED",
      rc: "RC_NOT_READY_BLOCKED",
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      completeV8Claimed: false
    },
    activeTask: null,
    lastCompleted: {
      taskId: FIXTURE_CLOSEOUT.taskId,
      validationId: FIXTURE_CLOSEOUT.validationId,
      completedAt: "2026-07-27",
      scope: "synthetic_closeout"
    },
    acceptedProductBaseline: { ...ACCEPTED_BASELINE },
    contracts: {
      toolSurfaces: {
        vcpCodexMemoryCore: {
          name: "vcp_codex_memory core tool definitions",
          count: 9
        },
        codexDefaultExposed: {
          name: "Codex default exposed tools",
          count: 5
        },
        chatgptEdge: {
          name: "ChatGPT Edge tools",
          count: 6
        }
      },
      dogfoodObservation: {
        schemaVersion: 3
      }
    },
    blockers: [
      {
        id: "canonical_observer_not_wired",
        status: "open",
        summary: "observer not wired"
      },
      {
        id: "r5_h_matrix_incomplete",
        status: "open",
        summary: "matrix incomplete"
      },
      {
        id: "r5_o_private_exact_head_runtime_unverified",
        status: "open",
        summary: "runtime unverified"
      },
      {
        id: "fresh_non_empty_task_context_relevance_unproven",
        status: "open",
        summary: "relevance unproven"
      }
    ],
    history: {
      baselineCommit: ACCEPTED_BASELINE.mergeCommit,
      indexPath: HISTORY_INDEX_PATH,
      recoverablePaths: [
        "CURRENT_STATE.md",
        ".agent_board/TASK_QUEUE.md",
        ".agent_board/CURRENT_FACTS.json",
        "STATUS.md"
      ]
    },
    liveGitFactsPolicy: {
      currentBranchCommitted: false,
      currentHeadCommitted: false,
      aheadBehindCommitted: false,
      currentPullRequestCommitted: false,
      currentCiCommitted: false,
      freshQueryRequired: true
    }
  };
}

function currentState(activeTask = null, lastCompleted = {
  taskId: FIXTURE_CLOSEOUT.taskId,
  validationId: FIXTURE_CLOSEOUT.validationId
}) {
  return [
    "# Current State",
    "",
    ACTIVE_START,
    "",
    "## Project Status",
    "",
    "NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED",
    "",
    "## Active Work",
    "",
    `activeTask: ${activeTask === null ? "null" : activeTask}`,
    "",
    "## Last Accepted Product Baseline",
    "",
    `${ACCEPTED_BASELINE.reviewedHead} ${ACCEPTED_BASELINE.mergeCommit}`,
    "",
    "## Open Blockers",
    "",
    "four blockers",
    "",
    "## Next Safe Action",
    "",
    "Jenn selects the next product goal.",
    "",
    "## Authority Boundaries",
    "",
    "P3 remains unchanged.",
    "",
    "## Evidence And History",
    "",
    `Last completed: \`${lastCompleted.taskId} / ${lastCompleted.validationId}\`.`,
    "",
    ACTIVE_END,
    ""
  ].join("\n");
}

function queue(extraRows = []) {
  return [
    "# TASK_QUEUE",
    "",
    "> Non-authoritative pointer to CURRENT_STATE.md.",
    "",
    "| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |",
    "|---|---:|---|---|---|---|---|---|---|---|---|",
    ...extraRows
  ].join("\n");
}

function validationLog(rows = null) {
  return [
    "# VALIDATION_LOG",
    "",
    "> Non-authoritative pointer to CURRENT_STATE.md.",
    "",
    "| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |",
    "|---|---|---|---|---|---|---|---|",
    ...(rows || [
      `| ${FIXTURE_CLOSEOUT.validationId} | tests | P6 | ${FIXTURE_CLOSEOUT.taskId} synthetic closeout | COMPLETED_VALIDATED | Green Lane not_required_no_amber_external_or_write_action | none | 2026-07-27 |`
    ])
  ].join("\n");
}

function ledger(rows = null) {
  return [
    "# AUTOPILOT_LEDGER",
    "",
    "> Non-authoritative pointer to CURRENT_STATE.md.",
    "",
    "| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |",
    "|---|---|---|---|---|---|---|---|---:|---|---|",
    ...(rows || [
      `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_CLOSEOUT.validationId} | zero | 0 | completed_validated | 2026-07-27 |`
    ]),
    "",
    "## Blocked Red Lane Items",
    "",
    "- push / PR / tag / release / deploy"
  ].join("\n");
}

function writeSourceContracts(root) {
  writeFile(
    root,
    "src/core/constants.js",
    "module.exports={TOOL_DEFINITIONS:Array.from({length:9},(_,index)=>({name:String(index)}))};\n"
  );
  writeFile(
    root,
    "src/adapters/codex-mcp/server.js",
    "module.exports={getPublicToolDefinitions:()=>Array.from({length:5})};\n"
  );
  writeFile(
    root,
    "packages/chatgpt-r4-contracts/constants.js",
    "module.exports={DATA_TOOL_NAMES:Array.from({length:5}),RENDER_TOOL_NAMES:Array.from({length:1})};\n"
  );
  writeFile(
    root,
    "src/runtime/chatgpt-r4/private-dogfood-observer.js",
    "module.exports={DOGFOOD_OBSERVATION_SCHEMA_VERSION:3};\n"
  );
}

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "current-facts-v5-"));
  writeFile(root, FACTS_PATH, `${JSON.stringify(facts(), null, 2)}\n`);
  writeFile(root, "CURRENT_STATE.md", currentState());
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue());
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog());
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger());

  for (const relativePath of POINTER_FILES) {
    if (fs.existsSync(path.join(root, relativePath))) continue;
    writeFile(root, relativePath, `# Pointer\n\n> Non-authoritative pointer to CURRENT_STATE.md.\n`);
  }
  for (const relativePath of ["README.md", "AGENTS.md", "docs/CONTEXT_INTAKE_CONTRACT.md"]) {
    writeFile(root, relativePath, "# Entry\n\nCURRENT_STATE.md is the only default work entry.\n");
  }
  writeFile(
    root,
    HISTORY_INDEX_PATH,
    [
      "# History",
      "",
      `Governance reset task: \`${HISTORY_RESET_CLOSEOUT.taskId}\``,
      `Governance reset validation: \`${HISTORY_RESET_CLOSEOUT.validationId}\``,
      ACCEPTED_BASELINE.mergeCommit,
      `git show ${ACCEPTED_BASELINE.mergeCommit}:CURRENT_STATE.md`,
      "git log --follow -- CURRENT_STATE.md",
      `git blame ${ACCEPTED_BASELINE.mergeCommit} -- CURRENT_STATE.md`
    ].join("\n")
  );
  writeSourceContracts(root);
  return root;
}

function writeFacts(root, value) {
  writeFile(root, FACTS_PATH, `${JSON.stringify(value, null, 2)}\n`);
}

test("current facts validator accepts the compact schema v5 authority surfaces", () => {
  const root = workspace();
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator accepts a future lastCompleted closeout without validator changes", () => {
  const root = workspace();
  const nextCloseout = {
    taskId: "CM-3001",
    validationId: "CMV-3002",
    completedAt: "2026-07-28",
    scope: "selected_product_goal_closeout"
  };
  const changed = facts();
  changed.lastCompleted = nextCloseout;
  writeFacts(root, changed);
  writeFile(root, "CURRENT_STATE.md", currentState(null, nextCloseout));
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([
    "| CMV-3002 | tests | P6 | CM-3001 selected product goal | COMPLETED_VALIDATED | Green Lane local closeout | none | 2026-07-28 |"
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    "| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | completed_validated | 2026-07-28 |"
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects a stale CURRENT_STATE last completed pair", () => {
  const root = workspace();
  const changed = facts();
  changed.lastCompleted = {
    taskId: "CM-3001",
    validationId: "CMV-3002",
    completedAt: "2026-07-28",
    scope: "selected_product_goal_closeout"
  };
  writeFacts(root, changed);
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([
    "| CMV-3002 | tests | P6 | CM-3001 selected product goal | COMPLETED_VALIDATED | Green Lane local closeout | none | 2026-07-28 |"
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    "| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | completed_validated | 2026-07-28 |"
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /CURRENT_STATE last completed pair must match/);
});

test("current facts validator rejects malformed lastCompleted ids and empty scope", () => {
  const root = workspace();
  const changed = facts();
  changed.lastCompleted.taskId = "TASK-3001";
  changed.lastCompleted.validationId = "VALIDATION-3002";
  changed.lastCompleted.scope = "";
  writeFacts(root, changed);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /lastCompleted\.taskId must be a CM id/);
  assert.match(result.failures.join("\n"), /lastCompleted\.validationId must be a CMV id/);
  assert.match(result.failures.join("\n"), /lastCompleted\.scope must be a non-empty string/);
});

test("current facts validator rejects observation schema v2", () => {
  const root = workspace();
  const changed = facts();
  changed.contracts.dogfoodObservation.schemaVersion = 2;
  writeFacts(root, changed);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /dogfoodObservation\.schemaVersion must be 3/);
  assert.match(result.failures.join("\n"), /source dogfood observation schema version must match/);
});

test("current facts validator rejects mixed tool surface counts", () => {
  const root = workspace();
  const changed = facts();
  changed.contracts.toolSurfaces.vcpCodexMemoryCore.count = 5;
  changed.contracts.toolSurfaces.codexDefaultExposed.count = 9;
  writeFacts(root, changed);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /vcpCodexMemoryCore.*count 9/);
  assert.match(result.failures.join("\n"), /codexDefaultExposed.*count 5/);
});

test("current facts validator rejects done rows and stale CM-1422", () => {
  const root = workspace();
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-1422 | 1422 | done | P4 | Red | runtime | stale task | none | none | exact | stale |"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not contain done rows/);
  assert.match(result.failures.join("\n"), /must not restore stale CM-1422/);
});

test("current facts validator rejects every queue row when activeTask is null", () => {
  const root = workspace();
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | blocked | P6 | Green | docs | blocked row | tests | none | no | blocked |",
    "| CM-3002 | 3002 | skipped | P6 | Green | docs | skipped row | tests | none | no | skipped |",
    "| CM-3003 | 3003 | typo | P6 | Green | docs | malformed row | tests | none | no | malformed |"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /activeTask null requires an empty active queue/);
  assert.match(result.failures.join("\n"), /only todo or in_progress status/);
});

test("current facts validator rejects malformed CM queue rows before empty-queue selection", () => {
  const root = workspace();
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | todo | P6 | Green | docs | unescaped | pipe | tests | none | no | active |",
    "| CM-3002 | 3002 | todo | P6 | Green | docs | missing notes | tests | none | no |"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not contain malformed CM data rows/);
});

test("current facts validator accepts exactly one selected active queue row", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(root, "CURRENT_STATE.md", currentState("CM-3001"));
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | todo | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects extra queue rows beside activeTask", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(root, "CURRENT_STATE.md", currentState("CM-3001"));
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | in_progress | P6 | Green | docs | selected row | tests | none | no | active |",
    "| CM-3002 | 3002 | todo | P6 | Green | docs | extra row | tests | none | no | extra |"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must match the single active queue row/);
});

test("current facts validator rejects active task disagreement", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-9999";
  writeFacts(root, changed);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /CURRENT_STATE activeTask must match/);
  assert.match(result.failures.join("\n"), /single active queue row/);
});

test("current facts validator rejects missing lastCompleted validation and ledger receipts", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must have one bound VALIDATION_LOG row/);
  assert.match(result.failures.join("\n"), /must have one bound AUTOPILOT_LEDGER receipt/);
});

test("current facts validator rejects near-collision receipt tokens", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([
    `| ${FIXTURE_CLOSEOUT.validationId} | tests | P6 | ${FIXTURE_CLOSEOUT.taskId}0 synthetic closeout | COMPLETED_VALIDATED | Green Lane local closeout | none | 2026-07-27 |`
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Green | closeout | complete | receipt | ${FIXTURE_CLOSEOUT.validationId}0 | zero | 0 | completed_validated | 2026-07-27 |`
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must have one bound VALIDATION_LOG row/);
  assert.match(result.failures.join("\n"), /must have one bound AUTOPILOT_LEDGER receipt/);
});

test("current facts validator rejects size budget overflow", () => {
  const root = workspace();
  const changed = facts();
  changed.blockers[0].summary = "x".repeat(21 * 1024);
  writeFacts(root, changed);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /CURRENT_FACTS\.json exceeds 20480 bytes/);
});

test("current facts validator rejects pointer line budget overflow", () => {
  const root = workspace();
  writeFile(
    root,
    "STATUS.md",
    [
      "# Status",
      "",
      "> Non-authoritative pointer to CURRENT_STATE.md.",
      ...Array.from({ length: 121 }, (_, index) => `bounded line ${index + 1}`)
    ].join("\n")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /STATUS\.md exceeds 120 lines/);
});

test("current facts validator rejects stale pending PR or CI language", () => {
  const root = workspace();
  writeFile(
    root,
    "STATUS.md",
    "# Status\n\n> Non-authoritative pointer to CURRENT_STATE.md.\n\nNext exact-head CI pending.\n"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /contains stale active phrase/);
});

test("current facts validator fails closed when baseline objects are unreadable", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    return { status: 1, stdout: "", stderr: "unreadable" };
  };
  const result = validateCurrentFactsDrift(root, { gitRunner });
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /history baseline object is not readable/);
});

test("current facts validator keeps the fixed CM-2155 closeout only in the history index", () => {
  const root = workspace();
  const indexPath = path.join(root, HISTORY_INDEX_PATH);
  const index = fs.readFileSync(indexPath, "utf8");
  fs.writeFileSync(
    indexPath,
    index.replace(
      `Governance reset validation: \`${HISTORY_RESET_CLOSEOUT.validationId}\``,
      "Governance reset validation: missing"
    )
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /fixed reset closeout, baseline, and recovery commands/);
});

test("current facts validator rejects an active block on a pointer surface", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/RUN_STATE.md",
    [
      "# Run",
      "",
      "> Non-authoritative pointer to CURRENT_STATE.md.",
      ACTIVE_START,
      "duplicate authority",
      ACTIVE_END
    ].join("\n")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not own a current-facts active block/);
});

test("current facts validator rejects contradictory pointer authority claims", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/RUN_STATE.md",
    [
      "# Run",
      "",
      "> Non-authoritative pointer to CURRENT_STATE.md.",
      "",
      "This file is the current authority."
    ].join("\n")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not claim independent current authority/);
});
