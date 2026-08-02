"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  ACTIVE_END,
  ACTIVE_START,
  FACTS_PATH,
  HISTORY_BASELINE_COMMIT,
  HISTORY_INDEX_PATH,
  HISTORY_RESET_CLOSEOUT,
  POINTER_FILES,
  PURE_POINTER_FILES,
  PURE_POINTER_TEMPLATES,
  validateCurrentFactsDrift
} = require("../scripts/validate_current_facts_drift");

const FIXTURE_CLOSEOUT = Object.freeze({
  taskId: "CM-2991",
  validationId: "CMV-2992"
});
const RESET_ACCEPTED_PRODUCT_BASELINE = Object.freeze({
  prNumber: 61,
  reviewedHead: "4680b4c198a71bb9e61d7bc1f21c0b77a1769fd9",
  mergeCommit: HISTORY_BASELINE_COMMIT,
  ciRunId: "30238902177"
});
const FIXTURE_BLOCKERS = Object.freeze([
  Object.freeze({
    id: "canonical_observer_not_wired",
    status: "open",
    summary: "observer not wired"
  }),
  Object.freeze({
    id: "r5_h_matrix_incomplete",
    status: "open",
    summary: "matrix incomplete"
  }),
  Object.freeze({
    id: "r5_o_private_exact_head_runtime_unverified",
    status: "open",
    summary: "runtime unverified"
  }),
  Object.freeze({
    id: "fresh_non_empty_task_context_relevance_unproven",
    status: "open",
    summary: "relevance unproven"
  })
]);

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
    acceptedProductBaseline: { ...RESET_ACCEPTED_PRODUCT_BASELINE },
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
      },
      chatgptEdgeDataResponse: {
        dataResponseSchemaVersion: 2,
        requestEnvelopeSchemaVersion: 2,
        responseEnvelopeSchemaVersion: 2,
        governedReadAttemptProtocol: "governed_read_attempt.v1",
        legacyV1Accepted: false
      }
    },
    blockers: FIXTURE_BLOCKERS.map((blocker) => ({ ...blocker })),
    history: {
      baselineCommit: HISTORY_BASELINE_COMMIT,
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

function currentState(
  activeTask = null,
  lastCompleted = {
    taskId: FIXTURE_CLOSEOUT.taskId,
    validationId: FIXTURE_CLOSEOUT.validationId
  },
  acceptedProductBaseline = RESET_ACCEPTED_PRODUCT_BASELINE,
  blockers = FIXTURE_BLOCKERS,
  activePhase = activeTask === null ? null : "implementation_in_progress"
) {
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
    `activePhase: ${activePhase === null ? "null" : activePhase}`,
    "",
    "## Last Accepted Product Baseline",
    "",
    "| Field | Accepted value |",
    "|---|---|",
    `| Pull request | \`#${acceptedProductBaseline.prNumber}\` |`,
    `| Reviewed head | \`${acceptedProductBaseline.reviewedHead}\` |`,
    `| Merge commit | \`${acceptedProductBaseline.mergeCommit}\` |`,
    `| Main CI run | \`${acceptedProductBaseline.ciRunId}\` |`,
    "| Private dogfood observation schema | `3` |",
    "",
    "## Open Blockers",
    "",
    ...(blockers.length > 0
      ? blockers.map((blocker) =>
        `- \`${blocker.id}\` [${blocker.status}]: ${blocker.summary}`
      )
      : ["No current blockers."]),
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
      `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_CLOSEOUT.validationId} | zero | 0 | COMPLETED_VALIDATED | 2026-07-27 |`
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
    "module.exports={DATA_TOOL_NAMES:Array.from({length:5}),RENDER_TOOL_NAMES:Array.from({length:1}),CHATGPT_EDGE_DATA_SCHEMA_VERSION:2,EDGE_REQUEST_SCHEMA_VERSION:2,EDGE_RESPONSE_SCHEMA_VERSION:2};\n"
  );
  writeFile(
    root,
    "packages/chatgpt-r4-contracts/governed-read-attempt.js",
    "module.exports={GOVERNED_READ_ATTEMPT_PROTOCOL:'governed_read_attempt.v1'};\n"
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

  for (const [relativePath, template] of Object.entries(PURE_POINTER_TEMPLATES)) {
    writeFile(root, relativePath, template);
  }
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
      HISTORY_BASELINE_COMMIT,
      `git show ${HISTORY_BASELINE_COMMIT}:CURRENT_STATE.md`,
      "git log --follow -- CURRENT_STATE.md",
      `git blame ${HISTORY_BASELINE_COMMIT} -- CURRENT_STATE.md`
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

test("current facts validator rejects legacy ChatGPT Edge response dimensions", () => {
  const root = workspace();
  const changed = facts();
  changed.contracts.chatgptEdgeDataResponse.dataResponseSchemaVersion = 1;
  changed.contracts.chatgptEdgeDataResponse.legacyV1Accepted = true;
  writeFacts(root, changed);

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, false);
  assert.match(
    result.failures.join("\n"),
    /chatgptEdgeDataResponse\.dataResponseSchemaVersion must equal 2/
  );
  assert.match(
    result.failures.join("\n"),
    /chatgptEdgeDataResponse\.legacyV1Accepted must equal false/
  );
});

test("current facts validator accepts a rotated product baseline with valid Git relationships", () => {
  const root = workspace();
  const changed = facts();
  changed.acceptedProductBaseline = {
    prNumber: 62,
    reviewedHead: "1".repeat(40),
    mergeCommit: "2".repeat(40),
    ciRunId: "30270000000"
  };
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    return { status: 0, stdout: "" };
  };
  const result = validateCurrentFactsDrift(root, { gitRunner });
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects stale or unrelated accepted product baselines", () => {
  const root = workspace();
  const changed = facts();
  changed.acceptedProductBaseline = {
    prNumber: 62,
    reviewedHead: "1".repeat(40),
    mergeCommit: "2".repeat(40),
    ciRunId: "30270000000"
  };
  writeFacts(root, changed);
  let result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /CURRENT_STATE accepted product baseline must match/);

  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "merge-base") return { status: 1, stdout: "" };
    return { status: 0, stdout: "" };
  };
  result = validateCurrentFactsDrift(root, { gitRunner });
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /accepted product merge must descend/);
  assert.match(result.failures.join("\n"), /accepted product reviewed head must be an ancestor/);
  assert.match(result.failures.join("\n"), /accepted product merge must already be an ancestor of a current main ref/);
});

test("current facts validator rejects an unmerged feature head as accepted product baseline", () => {
  const root = workspace();
  const changed = facts();
  changed.acceptedProductBaseline = {
    prNumber: 62,
    reviewedHead: "1".repeat(40),
    mergeCommit: "2".repeat(40),
    ciRunId: "30270000000"
  };
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "merge-base" &&
        args[2] === changed.acceptedProductBaseline.mergeCommit) {
      return { status: 1, stdout: "" };
    }
    return { status: 0, stdout: "" };
  };
  const result = validateCurrentFactsDrift(root, { gitRunner });
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /accepted product merge must already be an ancestor of a current main ref/);
});

test("current facts validator accepts local main when no remote tracking ref exists", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "for-each-ref") return { status: 0, stdout: "" };
    return { status: 0, stdout: "" };
  };

  const result = validateCurrentFactsDrift(root, { gitRunner });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator accepts a non-origin remote main ref", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "for-each-ref") {
      return { status: 0, stdout: "refs/remotes/upstream/main\n" };
    }
    return { status: 0, stdout: "" };
  };

  const result = validateCurrentFactsDrift(root, { gitRunner });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator accepts the baseline on one current remote main ref", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "for-each-ref") {
      return {
        status: 0,
        stdout: "refs/remotes/origin/main\nrefs/remotes/upstream/main\n"
      };
    }
    if (args[0] === "merge-base" &&
        args[2] === RESET_ACCEPTED_PRODUCT_BASELINE.mergeCommit &&
        args[3] === "refs/remotes/upstream/main") {
      return { status: 1, stdout: "" };
    }
    return { status: 0, stdout: "" };
  };

  const result = validateCurrentFactsDrift(root, { gitRunner });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects an unreadable remote main instead of falling back local", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "for-each-ref") {
      return { status: 0, stdout: "refs/remotes/origin/main\n" };
    }
    if (args[0] === "cat-file" &&
        String(args[2] || "").startsWith("refs/remotes/origin/main")) {
      return { status: 1, stdout: "", stderr: "unreadable" };
    }
    return { status: 0, stdout: "" };
  };

  const result = validateCurrentFactsDrift(root, { gitRunner });

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /no readable Git ref found for baseBranch main/);
});

test("current facts validator rejects a failed remote ref enumeration", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    if (args[0] === "for-each-ref") {
      return { status: 1, stdout: "", stderr: "lookup failed" };
    }
    return { status: 0, stdout: "" };
  };

  const result = validateCurrentFactsDrift(root, { gitRunner });

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /unable to enumerate Git refs for baseBranch main/);
});

for (const fakeRemoteRef of [
  "refs/remotes/origin/archive/main",
  "refs/remotes/main"
]) {
  test(`current facts validator ignores noncanonical remote ref ${fakeRemoteRef}`, () => {
    const root = workspace();
    const gitRunner = (_root, args) => {
      if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
      if (args[0] === "for-each-ref") {
        return { status: 0, stdout: `${fakeRemoteRef}\n` };
      }
      if (args[0] === "merge-base" &&
          args[2] === RESET_ACCEPTED_PRODUCT_BASELINE.mergeCommit &&
          args[3] === "refs/heads/main") {
        return { status: 1, stdout: "" };
      }
      return { status: 0, stdout: "" };
    };

    const result = validateCurrentFactsDrift(root, { gitRunner });

    assert.equal(result.ok, false);
    assert.match(
      result.failures.join("\n"),
      /accepted product merge must already be an ancestor of a current main ref/
    );
  });
}

test("current facts validator rejects malformed accepted product baseline fields", () => {
  const root = workspace();
  const changed = facts();
  changed.acceptedProductBaseline = {
    prNumber: 0,
    reviewedHead: "not-a-sha",
    mergeCommit: "also-not-a-sha",
    ciRunId: "run-3027"
  };
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /prNumber must be a positive integer/);
  assert.match(result.failures.join("\n"), /commit anchors must be 40-char lowercase SHAs/);
  assert.match(result.failures.join("\n"), /ciRunId must contain decimal digits/);
});

test("current facts validator accepts blocker set and status rotation", () => {
  const root = workspace();
  const changed = facts();
  changed.blockers = [
    {
      id: "r5_h_matrix_incomplete",
      status: "resolved",
      summary: "matrix evidence accepted"
    },
    {
      id: "new_product_blocker",
      status: "triaged",
      summary: "new evidence requires a product decision"
    }
  ];
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator accepts an empty current blocker set", () => {
  const root = workspace();
  const changed = facts();
  changed.blockers = [];
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  let result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));

  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
      .replace("No current blockers.", "")
  );
  result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /CURRENT_STATE blockers must exactly match/);
});

test("current facts validator rejects blocker duplication and cross-surface drift", () => {
  const root = workspace();
  const changed = facts();
  changed.blockers = [
    {
      id: "duplicate_blocker",
      status: "open",
      summary: "first"
    },
    {
      id: "duplicate_blocker",
      status: "triaged",
      summary: "second"
    }
  ];
  writeFacts(root, changed);
  let result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /blocker ids must be unique/);
  assert.match(result.failures.join("\n"), /CURRENT_STATE blockers must exactly match/);

  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, changed.acceptedProductBaseline, changed.blockers)
  );
  result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /blocker ids must be unique/);
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
    "| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |"
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
    "| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |"
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /CURRENT_STATE last completed pair must match/);
});

test("current facts validator rejects duplicate last completed declarations", () => {
  const root = workspace();
  const canonical = `Last completed: \`${FIXTURE_CLOSEOUT.taskId} / ${FIXTURE_CLOSEOUT.validationId}\`.`;
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState().replace(
      canonical,
      `${canonical}\nLast completed: \`CM-3001 / CMV-3002\`.`
    )
  );

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one canonical last completed/);
});

test("current facts validator rejects a canonical closeout beside an unpaired declaration", () => {
  const root = workspace();
  const canonical = `Last completed: \`${FIXTURE_CLOSEOUT.taskId} / ${FIXTURE_CLOSEOUT.validationId}\`.`;
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState().replace(
      canonical,
      `${canonical}\nLast completed: \`CM-3001 / CMV-3002.`
    )
  );

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one canonical last completed/);
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
    "| CM-3002 | 3002 | todo | P6 | Green | docs | missing notes | tests | none | no |",
    "CM-3006X | 3006 | todo | P6 | Green | docs | missing boundaries | tests | none | no | stale"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not contain malformed CM data rows/);
});

test("current facts validator rejects malformed validation and ledger rows beside current receipts", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([
    `| ${FIXTURE_CLOSEOUT.validationId} | tests | P6 | ${FIXTURE_CLOSEOUT.taskId} synthetic closeout | COMPLETED_VALIDATED | Green Lane | none | 2026-07-27 |`,
    "| CMV-3003 | tests | P6 | CM-3004 unescaped | scope | COMPLETED_VALIDATED | extra | none | 2026-07-28 |",
    "CMV-3003X | tests | P6 | CM-3004X missing boundaries | COMPLETED_VALIDATED | extra | none | 2026-07-28"
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_CLOSEOUT.validationId} | zero | 0 | COMPLETED_VALIDATED | 2026-07-27 |`,
    "| CM-3004 | extra | Yellow | closeout | complete | receipt | with | pipe | CMV-3003 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |",
    "CM-3004X | extra | Yellow | closeout | complete | receipt | CMV-3003X | zero | 0 | COMPLETED_VALIDATED | 2026-07-28"
  ]));
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /VALIDATION_LOG must not contain malformed CM\/CMV data rows/);
  assert.match(result.failures.join("\n"), /AUTOPILOT_LEDGER must not contain malformed CM\/CMV data rows/);
});

test("current facts validator rejects changed active-table headers", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/TASK_QUEUE.md",
    queue().replace("| ID | Priority | Status |", "| ID | Priority | State |")
  );
  writeFile(
    root,
    ".agent_board/VALIDATION_LOG.md",
    validationLog().replace("| ID | Command / Check | Area | Scope |", "| ID | Command / Check | Area | Target |")
  );
  writeFile(
    root,
    ".agent_board/AUTOPILOT_LEDGER.md",
    ledger().replace("| ID | Goal | Lane |", "| ID | Objective | Lane |")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /TASK_QUEUE must retain its exact table header and separator/);
  assert.match(result.failures.join("\n"), /VALIDATION_LOG must retain its exact table header and separator/);
  assert.match(result.failures.join("\n"), /AUTOPILOT_LEDGER must retain its exact table header and separator/);
});

test("current facts validator rejects duplicate active-table separators", () => {
  const root = workspace();
  const queueSeparator = "|---|---:|---|---|---|---|---|---|---|---|---|";
  const validationSeparator = "|---|---|---|---|---|---|---|---|";
  const ledgerSeparator = "|---|---|---|---|---|---|---|---|---:|---|---|";
  writeFile(
    root,
    ".agent_board/TASK_QUEUE.md",
    queue().replace(queueSeparator, `${queueSeparator}\n${queueSeparator}`)
  );
  writeFile(
    root,
    ".agent_board/VALIDATION_LOG.md",
    validationLog().replace(
      validationSeparator,
      `${validationSeparator}\n${validationSeparator}`
    )
  );
  writeFile(
    root,
    ".agent_board/AUTOPILOT_LEDGER.md",
    ledger().replace(ledgerSeparator, `${ledgerSeparator}\n${ledgerSeparator}`)
  );

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /TASK_QUEUE must retain its exact table header and separator/);
  assert.match(result.failures.join("\n"), /VALIDATION_LOG must retain its exact table header and separator/);
  assert.match(result.failures.join("\n"), /AUTOPILOT_LEDGER must retain its exact table header and separator/);
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

test("current facts validator rejects an inline-code active queue ID", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(root, "CURRENT_STATE.md", currentState("CM-3001"));
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| `CM-3001` | 3001 | todo | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /TASK_QUEUE IDs must use raw canonical CM format/);
  assert.match(result.failures.join("\n"), /activeTask must match the single active queue row/);
});

test("current facts validator rejects noncanonical active status casing", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(root, "CURRENT_STATE.md", currentState("CM-3001"));
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | TODO | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /only todo or in_progress status/);
  assert.match(result.failures.join("\n"), /activeTask must match the single active queue row/);
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

test("current facts validator accepts one canonical active phase for a selected task", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(
      "CM-3001",
      undefined,
      changed.acceptedProductBaseline,
      changed.blockers,
      "runtime_transition_authorization_pending"
    )
  );
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | in_progress | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, true, result.failures.join("\n"));
});

for (const [name, replacement, expected] of [
  [
    "missing",
    "",
    /exactly one canonical activePhase/
  ],
  [
    "duplicate",
    "activePhase: implementation_in_progress\nactivePhase: second_phase",
    /exactly one canonical activePhase/
  ],
  [
    "malformed",
    "activePhase: Runtime Transition",
    /exactly one canonical activePhase/
  ]
]) {
  test(`current facts validator rejects ${name} activePhase declarations`, () => {
    const root = workspace();
    writeFile(
      root,
      "CURRENT_STATE.md",
      currentState().replace("activePhase: null", replacement)
    );

    const result = validateCurrentFactsDrift(root);

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), expected);
  });
}

test("current facts validator binds activePhase nullability to activeTask", () => {
  const root = workspace();
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState(null, undefined, undefined, undefined, "unexpected_phase")
  );
  let result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /activePhase must be null when activeTask is null/);

  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState("CM-3001", undefined, undefined, undefined, null)
  );
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | in_progress | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));
  result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /activePhase must be non-null when activeTask is selected/);
});

test("current facts validator rejects an activeTask prefix near-collision", () => {
  const root = workspace();
  const changed = facts();
  changed.activeTask = "CM-3001";
  writeFacts(root, changed);
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState("CM-3001").replace("activeTask: CM-3001", "activeTask: CM-30010")
  );
  writeFile(root, ".agent_board/TASK_QUEUE.md", queue([
    "| CM-3001 | 3001 | in_progress | P6 | Green | docs | selected row | tests | none | no | active |"
  ]));

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one canonical activeTask/);
});

test("current facts validator rejects a canonical activeTask beside a prefix declaration", () => {
  const root = workspace();
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState().replace(
      "activeTask: null",
      "activeTask: null\nactiveTask: CM-30010"
    )
  );

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one canonical activeTask/);
});

test("current facts validator rejects a canonical activeTask beside an unpaired declaration", () => {
  const root = workspace();
  writeFile(
    root,
    "CURRENT_STATE.md",
    currentState().replace(
      "activeTask: null",
      "activeTask: null\n`activeTask: CM-3001"
    )
  );

  const result = validateCurrentFactsDrift(root);

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /exactly one canonical activeTask/);
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

test("current facts validator rejects noncanonical closeout results", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([
    `| ${FIXTURE_CLOSEOUT.validationId} | tests | P6 | ${FIXTURE_CLOSEOUT.taskId} synthetic closeout | COMPLETED_VALIDATED_EXTRA | Green Lane | none | 2026-07-27 |`
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Yellow | closeout | complete | receipt | ${FIXTURE_CLOSEOUT.validationId} | zero | 0 | completed_validated_suffix | 2026-07-27 |`
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(
    result.failures.join("\n"),
    new RegExp(`${FIXTURE_CLOSEOUT.validationId} result must be exactly COMPLETED_VALIDATED`)
  );
  assert.match(
    result.failures.join("\n"),
    new RegExp(`${FIXTURE_CLOSEOUT.taskId} ledger result must be exactly COMPLETED_VALIDATED`)
  );
});

test("current facts validator rejects an empty current ledger receipt", () => {
  const root = workspace();
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Yellow | closeout | complete |  | ${FIXTURE_CLOSEOUT.validationId} | zero | 0 | COMPLETED_VALIDATED | 2026-07-27 |`
  ]));

  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(
    result.failures.join("\n"),
    new RegExp(`${FIXTURE_CLOSEOUT.taskId} ledger receipt must be non-empty`)
  );
});

test("current facts validator rejects near-collision receipt tokens", () => {
  const root = workspace();
  writeFile(root, ".agent_board/VALIDATION_LOG.md", validationLog([
    `| ${FIXTURE_CLOSEOUT.validationId} | tests | P6 | ${FIXTURE_CLOSEOUT.taskId}-extra synthetic closeout | COMPLETED_VALIDATED | Green Lane local closeout | none | 2026-07-27 |`
  ]));
  writeFile(root, ".agent_board/AUTOPILOT_LEDGER.md", ledger([
    `| ${FIXTURE_CLOSEOUT.taskId} | synthetic | Green | closeout | complete | receipt | ${FIXTURE_CLOSEOUT.validationId}_extra | zero | 0 | COMPLETED_VALIDATED | 2026-07-27 |`
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

test("current facts validator rejects branch-relative current task language", () => {
  const root = workspace();
  writeFile(
    root,
    "STATUS.md",
    "# Status\n\n> Non-authoritative pointer to CURRENT_STATE.md.\n\nCurrent task branch records the active state.\n"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
});

test("current facts validator permits instructions to re-query the current task branch", () => {
  const root = workspace();
  const currentStatePath = path.join(root, "CURRENT_STATE.md");
  fs.appendFileSync(
    currentStatePath,
    [
      "",
      "Do not infer the current task branch; query it fresh before reporting Git state.",
      "Do not claim the current task branch is authoritative; query Git fresh.",
      "Never assert that the current task branch records the active state.",
      "The current task branch is not recorded by this document.",
      "The phrase `current task branch records the active state` is a stale assertion.",
      "The phrase 'current task branch records the active state' is stale.",
      "Jenn's note quotes 'current task branch records the active state' as stale.",
      "😀 Jenn's note quotes 'current task branch records the active state' as stale.",
      "The phrase “current task branch records the active state” is stale.",
      "The phrase ‘current task branch records the active state’ is stale.",
      "Check whether the current task branch is recorded before reporting.",
      "Determine if the current task branch now records state before reporting.",
      "Does the current task branch record the active state?",
      "What does the current task branch currently record?",
      ""
    ].join("\n"),
    "utf8"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects qualified branch-relative assertions", () => {
  const root = workspace();
  const currentStatePath = path.join(root, "CURRENT_STATE.md");
  fs.appendFileSync(
    currentStatePath,
    [
      "",
      "The current task branch currently records the active state.",
      "Jenn's current task branch records state in the owner's note.",
      "The current task branch records the active state. Does anything else?",
      "The current task branch records the active state; why would it change?",
      "The current task branch records the text \"why?\" as metadata.",
      ""
    ].join("\n"),
    "utf8"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
});

test("current facts validator does not let unrelated question marks hide branch assertions", () => {
  for (const staleText of [
    "The current task branch records the text \"why? \" as metadata.",
    "The current task branch records the active state\nDoes anything else?"
  ]) {
    const root = workspace();
    const currentStatePath = path.join(root, "CURRENT_STATE.md");
    fs.appendFileSync(currentStatePath, `\n${staleText}\n`, "utf8");
    const result = validateCurrentFactsDrift(root);
    assert.equal(result.ok, false, staleText);
    assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
  }
});

test("current facts validator does not let unrelated negation hide branch assertions", () => {
  for (const staleText of [
    "Do not query Git because the current task branch records the active state.",
    "Never doubt the current task branch records the active state."
  ]) {
    const root = workspace();
    const currentStatePath = path.join(root, "CURRENT_STATE.md");
    fs.appendFileSync(currentStatePath, `\n${staleText}\n`, "utf8");
    const result = validateCurrentFactsDrift(root);
    assert.equal(result.ok, false, staleText);
    assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
  }
});

test("current facts validator permits bounded negated reporting contexts", () => {
  for (const guidanceText of [
    "This document does not claim that the current task branch records the active state.",
    "Do not explicitly claim that the current task branch records the active state.",
    "Never falsely assert that the current task branch records the active state.",
    "Do not claim the following: the current task branch records the active state."
  ]) {
    const root = workspace();
    const currentStatePath = path.join(root, "CURRENT_STATE.md");
    fs.appendFileSync(currentStatePath, `\n${guidanceText}\n`, "utf8");
    const result = validateCurrentFactsDrift(root);
    assert.equal(result.ok, true, `${guidanceText}\n${result.failures.join("\n")}`);
  }
});

test("current facts validator permits directly negated branch predicates", () => {
  const root = workspace();
  const currentStatePath = path.join(root, "CURRENT_STATE.md");
  fs.appendFileSync(
    currentStatePath,
    [
      "",
      "The current task branch records no active state.",
      "The current task branch contains no current facts.",
      "The current task branch holds neither authority nor status.",
      "The current task branch now points to no canonical state.",
      ""
    ].join("\n"),
    "utf8"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator permits unknown branch-state guidance", () => {
  const root = workspace();
  const currentStatePath = path.join(root, "CURRENT_STATE.md");
  fs.appendFileSync(
    currentStatePath,
    [
      "",
      "The current task branch is unknown until queried fresh.",
      "The current task branch remains unverified until Git is queried.",
      "The current task branch is still unavailable to this document.",
      "The current task branch is yet to be determined.",
      "The current task branch is unknown but does not provide canonical status.",
      "The current task branch is unknown but doesn't provide canonical status.",
      "The current task branch is unresolved yet won't determine active identity.",
      "The current task branch is unknown but shall not provide canonical status.",
      "The current task branch is unresolved yet shan't determine active identity.",
      "The current task branch is unknown but need not provide status.",
      "The current task branch is unresolved; query whether it provides status.",
      ""
    ].join("\n"),
    "utf8"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects authority assertions after unknown-state transitions", () => {
  for (const staleText of [
    "The current task branch is unknown but provides the canonical status.",
    "The current task branch is unresolved, yet serves as the current authority.",
    "The current task branch is still unavailable although it determines the active identity.",
    "The current task branch is unknown but does not doubt it provides canonical status.",
    "The current task branch is unknown but never doubts it provides canonical status.",
    "The current task branch is unknown but does not provide and determines active identity."
  ]) {
    const root = workspace();
    const currentStatePath = path.join(root, "CURRENT_STATE.md");
    fs.appendFileSync(currentStatePath, `\n${staleText}\n`, "utf8");
    const result = validateCurrentFactsDrift(root);
    assert.equal(result.ok, false, staleText);
    assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
  }
});

test("current facts validator rejects equivalent affirmative branch-authority predicates", () => {
  for (const staleText of [
    "The current task branch has the active state.",
    "The current task branch stores the current facts.",
    "The current task branch serves as the current authority.",
    "The current task branch provides the canonical status.",
    "The current task branch determines the active identity."
  ]) {
    const root = workspace();
    const currentStatePath = path.join(root, "CURRENT_STATE.md");
    fs.appendFileSync(currentStatePath, `\n${staleText}\n`, "utf8");
    const result = validateCurrentFactsDrift(root);
    assert.equal(result.ok, false, staleText);
    assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
  }
});

test("current facts validator rejects non-negative not-only branch predicates", () => {
  const root = workspace();
  const currentStatePath = path.join(root, "CURRENT_STATE.md");
  fs.appendFileSync(
    currentStatePath,
    "\nThe current task branch records not only the active state but its authority.\n",
    "utf8"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
});

test("current facts validator permits stale assertion examples in Markdown fences", () => {
  for (const fencedExample of [
    "```text\nThe current task branch records the active state.\n```",
    "~~~\nThe current task branch contains current facts.\n~~~"
  ]) {
    const root = workspace();
    const currentStatePath = path.join(root, "CURRENT_STATE.md");
    fs.appendFileSync(currentStatePath, `\n${fencedExample}\n`, "utf8");
    const result = validateCurrentFactsDrift(root);
    assert.equal(result.ok, true, `${fencedExample}\n${result.failures.join("\n")}`);
  }
});

test("current facts validator rejects assertions after an invalid backtick fence", () => {
  const root = workspace();
  const currentStatePath = path.join(root, "CURRENT_STATE.md");
  fs.appendFileSync(
    currentStatePath,
    "\n```bad`info\nThe current task branch records the active state.\n```\n",
    "utf8"
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /contains stale active phrase: current task branch/);
});

test("current facts validator fails closed when baseline objects are unreadable", () => {
  const root = workspace();
  const gitRunner = (_root, args) => {
    if (args[0] === "rev-parse") return { status: 0, stdout: "true\n" };
    return { status: 1, stdout: "", stderr: "unreadable" };
  };
  const result = validateCurrentFactsDrift(root, { gitRunner });
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /required Git object is not readable/);
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

for (const [name, declaration] of [
  ["active phase", "activePhase: implementation_in_progress"],
  ["task identity", "Current work is CM-3001."],
  ["status", "NOT_READY_BLOCKED"],
  ["receipt", "Last completed: CM-2991 / CMV-2992."],
  ["pull request", "PR #67 is merged."],
  ["owned section", "## Next Safe Action\n\nContinue."],
  ["natural-language phase", "Current phase: runtime transition pending."],
  ["natural-language work", "Current work is the runtime profile transition."],
  ["natural-language receipt", "The latest transition receipt is complete."],
  ["natural-language PR", "The implementation pull request has merged."],
  ["natural-language action", "Next action: execute the controller transition."],
  ["natural-language CI", "CI passed."],
  ["natural-language health", "The runtime is healthy."],
  ["natural-language instruction", "Proceed with the transition."]
]) {
  test(`current facts validator rejects ${name} ownership on pure pointers`, () => {
    const root = workspace();
    writeFile(
      root,
      PURE_POINTER_FILES[0],
      `# Pointer\n\n> Non-authoritative pointer to CURRENT_STATE.md.\n\n${declaration}\n`
    );

    const result = validateCurrentFactsDrift(root);

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /must match its canonical pure-pointer template/);
  });
}

for (const relativePath of PURE_POINTER_FILES) {
  test(`current facts validator binds ${relativePath} to its canonical template`, () => {
    const root = workspace();
    writeFile(
      root,
      relativePath,
      PURE_POINTER_TEMPLATES[relativePath].replace(
        "CURRENT_STATE.md",
        "CURRENT_STATUS.md"
      )
    );

    const result = validateCurrentFactsDrift(root);

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /must match its canonical pure-pointer template/);
  });
}
